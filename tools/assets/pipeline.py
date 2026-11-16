"""PERF-023/024 reproducible atlas build. See requirements.txt for the pinned encoder."""
import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import re
import subprocess
import sys

try:
    import PIL
    from PIL import Image, ImageFilter, features
    if PIL.__version__ != '11.1.0' or features.version('webp') != '1.5.0':
        raise ImportError()
except ImportError:
    sys.exit('Asset pipeline requires Pillow 11.1.0 / libwebp 1.5.0: python3 -m pip install -r tools/assets/requirements.txt')

ROOT = Path(__file__).resolve().parents[2]
# ART-PIPELINE.md §3: atlases no larger than 2048 × 2048 (not a PERF dimension row).
MAX_SIZE = 2048
# PERFORMANCE.md: PERF-023 ≤ 8 MB transferred per level, before play;
# PERF-024 ≤ 256 MB decoded in a round. Decimal MB: conservative versus MiB.
DOWNLOAD = 8_000_000
DECODED = 256_000_000
DIRECTIONS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']


def read_json(path):
    return json.loads(Path(path).read_text())


def write_json(path, value):
    Path(path).write_text(json.dumps(value, sort_keys=True, separators=(',', ':')) + '\n')


def size_record(path, size):
    return dict(file=path.name, width=size[0], height=size[1], bytes=path.stat().st_size,
                gpuBytes=size[0] * size[1] * 4)


def emit(image, output, stem, encoding="lossless", quality=90):
    data = io.BytesIO()
    image.save(data, format='WEBP', lossless=encoding == 'lossless', quality=quality, exact=True, method=6)
    digest = hashlib.sha256(data.getvalue()).hexdigest()[:16]
    path = output / f'{stem}.{digest}.webp'
    path.write_bytes(data.getvalue())
    return size_record(path, image.size)


def total(atlases, detail):
    return {key: sum(a[detail][key] for a in atlases) for key in ('bytes', 'gpuBytes')}


def safe_name(value):
    if not isinstance(value, str) or not re.fullmatch(r'[a-z0-9][a-z0-9_-]*', value):
        raise ValueError(f'Invalid asset identifier: {value!r}')
    return value


def source_path(source, file):
    path = (source / file).resolve()
    if not path.is_relative_to(source.resolve()):
        raise ValueError('Path outside source directory')
    return path


def sequences(animation):
    return list(animation['directions'].values()) if 'directions' in animation else [animation['frames']]


def validate_animations(animations, name):
    actions = set()
    for a in animations:
        action = safe_name(a['action'])
        if action in actions:
            raise ValueError(f'{name}: duplicate action {action}')
        actions.add(action)
        if type(a['fps']) not in (int, float) or not math.isfinite(a['fps']) or a['fps'] <= 0:
            raise ValueError(f'{name}: fps must be a positive number')
        if ('directions' in a) == ('frames' in a):
            raise ValueError(f'{name}: animation needs frames or eight directions')
        if 'directions' in a and set(a['directions']) != set(DIRECTIONS):
            raise ValueError(f'{name}: animation needs eight directions')
        seqs = sequences(a)
        if any(not isinstance(seq, list) or not seq for seq in seqs) or len({len(seq) for seq in seqs}) != 1:
            raise ValueError(f'{name}: inconsistent direction frame counts')


def bleed(image):
    # Propagate edge RGB through transparent texels; alpha stays straight and unchanged.
    alpha = image.getchannel('A')
    rgb = image.convert('RGB')
    known = alpha.point(lambda a: 255 if a else 0)
    for _ in range(4):
        expanded = known.filter(ImageFilter.MaxFilter(3))
        channels = [Image.composite(c, Image.new('L', image.size), known).filter(ImageFilter.MaxFilter(3)) for c in rgb.split()]
        rgb = Image.composite(rgb, Image.merge('RGB', channels), known)
        known = expanded
    result = rgb.convert('RGBA')
    result.putalpha(alpha)
    return result


def layout_page(pending, batches):
    active = {f[0]['id'] for f in pending}
    groups = [[f for f in b if f[0]['id'] in active] for b in batches]
    groups = [b for b in groups if b]
    def fits_empty(batch, width):
        x = y = row = 0
        for f in batch:
            w, h = f[3].width+4, f[3].height+4
            if w > width:
                return False
            if x+w > width:
                x,y,row = 0,y+row,0
            if y+h > MAX_SIZE:
                return False
            x += w
            row = max(row,h)
        return True
    def trial(width):
        if any(fits_empty(batch, MAX_SIZE) and not fits_empty(batch, width) for batch in groups):
            return None
        shelves, placed, remaining = [], [], []
        def add(frame, rows):
            w, h = frame[3].width+4, frame[3].height+4
            for row in rows:
                if h <= row[2] and row[0]+w <= width:
                    x, y = row[0], row[1]
                    row[0] += w
                    return (frame, x+2, y+2)
            y = sum(r[2] for r in rows)
            if w > width or y+h > MAX_SIZE:
                return None
            rows.append([w, y, h])
            return (frame, 2, y+2)
        for batch in groups:
            rows = [r[:] for r in shelves]
            result = [add(f, rows) for f in batch]
            if all(result):
                shelves = rows
                placed.extend(result)
            else:
                empty = []
                fits = all([add(f, empty) is not None for f in batch])
                if fits:
                    remaining.extend(batch)
                else:
                    for f in batch:
                        item = add(f, shelves)
                        if item:
                            placed.append(item)
                        else:
                            remaining.append(f)
        if not placed:
            return None
        w = max(x+f[3].width+2 for f,x,y in placed)
        h = max(y+f[3].height+2 for f,x,y in placed)
        area = sum(f[3].width*f[3].height for f,x,y in placed)
        return placed, remaining, area, w*h
    minimum = max(f[3].width+4 for f in pending)
    candidates = [trial(w) for w in sorted(set([MAX_SIZE, minimum] + list(range(minimum, MAX_SIZE+1, 84))))]
    candidates = [c for c in candidates if c]
    best = max(candidates, key=lambda c: (c[2], -c[3]))
    return best[0], best[1]


def pack(config, source, output):
    output.mkdir(parents=True, exist_ok=True)
    for stale in output.iterdir():
        if re.fullmatch(r'[a-z0-9_-]+-(full|half)\.[0-9a-f]{16}\.webp', stale.name):
            stale.unlink()
    atlases, sets = [], {}
    for group in sorted(config['sets'], key=lambda g: g['id']):
        name = safe_name(group['id'])
        if name in sets:
            raise ValueError(f'Duplicate set {name}')
        sets[name] = []
        frames, ids, animations = [], set(), []
        animations = group.get('animations', [])
        validate_animations(animations, name)
        encoding, quality = group.get('encoding', 'lossless'), group.get('quality', 90)
        if encoding not in ('lossless', 'lossy') or type(quality) not in (int, float) or not 0 <= quality <= 100:
            raise ValueError(f'{name}: invalid encoding/quality')
        layers = group.get('layers', ['default'])
        if not layers or len(set(layers)) != len(layers):
            raise ValueError(f'{name}: invalid layers')
        for layer in layers:
            safe_name(layer)
        for spec in sorted(group['frames'], key=lambda f: f['id']):
            ident = safe_name(spec['id'])
            if ident in ids:
                raise ValueError(f'{name}: duplicate frame {ident}')
            ids.add(ident)
            anchors = spec.get('anchors', {})
            if any(key not in anchors for key in group.get('anchors', [])):
                raise ValueError(f'{name}/{ident}: missing declared anchor')
            for point in anchors.values():
                if not isinstance(point, list) or len(point) != 2 or any(type(v) not in (int, float) or not math.isfinite(v) for v in point):
                    raise ValueError(f'{name}/{ident}: invalid anchor')
            images = {}
            for layer in layers:
                file = spec['file'] if layers == ['default'] else spec['layers'][layer]
                path = source_path(source, file)
                with Image.open(path) as original:
                    images[layer] = original.convert('RGBA')
            sizes = {im.size for im in images.values()}
            if len(sizes) != 1:
                raise ValueError(f'{name}/{ident}: layer source sizes differ')
            original_size = next(iter(sizes))
            boxes = [im.getchannel('A').getbbox() for im in images.values()]
            boxes = [box for box in boxes if box]
            box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)) if boxes else (0, 0, 1, 1)
            box = (box[0] // 2 * 2, box[1] // 2 * 2, math.ceil(box[2] / 2) * 2, math.ceil(box[3] / 2) * 2)
            tiles = {}
            for layer, image in images.items():
                # Extend real odd source edges before aligned cropping, never transparent fill.
                padded = Image.new('RGBA', (math.ceil(image.width/2)*2, math.ceil(image.height/2)*2))
                padded.paste(image)
                if padded.width > image.width:
                    padded.paste(image.crop((image.width-1, 0, image.width, image.height)), (image.width, 0))
                if padded.height > image.height:
                    padded.paste(padded.crop((0, image.height-1, padded.width, image.height)), (0, image.height))
                tiles[layer] = padded.crop(box)
            tile = tiles[layers[0]]
            if tile.width + 4 > MAX_SIZE or tile.height + 4 > MAX_SIZE:
                raise ValueError(f'{name}/{ident}: exceeds atlas maximum {MAX_SIZE}')
            frames.append((spec, original_size, box, tile, tiles))
        for animation in animations:
            for sequence in sequences(animation):
                if any(frame not in ids for frame in sequence):
                    raise ValueError(f'{name}: animation references unknown frame')
        # Atomic sequence groups keep action/direction strips together whenever they fit.
        by_id = {f[0]['id']: f for f in frames}
        batches, assigned = [], set()
        for animation in animations:
            seqs = sequences(animation)
            whole = list(dict.fromkeys(i for seq in seqs for i in seq))
            # Prefer a complete action on one page; fall back to whole directions.
            x = y = row = 0
            fits = True
            for ident in whole:
                tile = by_id[ident][3]
                w,h = tile.width+4,tile.height+4
                if x+w > MAX_SIZE:
                    x,y,row = 0,y+row,0
                if y+h > MAX_SIZE:
                    fits = False
                    break
                x += w
                row = max(row,h)
            for sequence in ([whole] if fits else seqs):
                batch = [by_id[i] for i in sequence if i not in assigned]
                assigned.update(sequence)
                if batch:
                    batches.append(batch)
        batches.extend([[f] for f in frames if f[0]['id'] not in assigned])
        batches.sort(key=lambda batch: (-max(f[3].height for f in batch), batch[0][0]['id']))
        frames = [f for batch in batches for f in batch]
        pending = list(frames)
        page = 0
        while pending:
            placed, remaining = layout_page(pending, batches)
            width = max(px + f[3].width + 2 for f, px, py in placed)
            height = max(py + f[3].height + 2 for f, px, py in placed)
            if config.get('powerOfTwo', False):
                width, height = (2 ** math.ceil(math.log2(v)) for v in (width, height))
            for layer in layers:
                canvas = Image.new('RGBA', (width, height))
                records = {}
                for (spec, original, box, _, tiles), px, py in placed:
                    tile = tiles[layer]
                    # Duplicate the outer two-pixel strip, including corners. Alignment
                    # keeps the half-size guard identical to its neighbouring edge texel.
                    w, h = tile.size
                    for dx, dy, crop, size in [
                        (-2, 0, (0, 0, 2, h), (2, h)),
                        (w, 0, (w-2, 0, w, h), (2, h)),
                        (0, -2, (0, 0, w, 2), (w, 2)),
                        (0, h, (0, h-2, w, h), (w, 2)),
                        (-2, -2, (0, 0, 2, 2), (2, 2)),
                        (w, -2, (w-2, 0, w, 2), (2, 2)),
                        (-2, h, (0, h-2, 2, h), (2, 2)),
                        (w, h, (w-2, h-2, w, h), (2, 2)),
                    ]:
                        # Extrude the nearest edge pixel at full resolution.
                        edge = tile.crop(crop)
                        if dx:
                            edge = edge.crop((0 if dx < 0 else 1, 0,
                                              1 if dx < 0 else 2, edge.height))
                        if dy:
                            edge = edge.crop((0, 0 if dy < 0 else 1,
                                              edge.width, 1 if dy < 0 else 2))
                        canvas.paste(edge.resize(size, Image.Resampling.NEAREST), (px+dx, py+dy))
                    canvas.paste(tile, (px, py))
                    records[spec['id']] = dict(rect=[px, py, tile.width, tile.height],
                        sourceSize=list(original), trim=[box[0], box[1]],
                        anchor=spec.get('anchor', [0, 0]), anchors=spec.get('anchors', {}),
                        metadata={key: spec[key] for key in group.get('metadata', []) if key in spec})
                # RGBa is premultiplied; BOX has a bounded footprint and cannot ring or bleed.
                half = canvas.convert('RGBa').resize((width // 2, height // 2), Image.Resampling.BOX).convert('RGBA')
                ident = f'{name}-{page}' + (f'-{layer}' if layers != ['default'] else '')
                atlas = dict(id=ident, set=name, layer=layer, full=emit(bleed(canvas), output, ident + '-full', encoding, quality),
                    half=emit(bleed(half), output, ident + '-half', encoding, quality), frames=records,
                    wastedArea=1 - sum(f[3].width * f[3].height for f, _, _ in placed) / (width * height))
                atlases.append(atlas)
                sets[name].append(ident)
                print(f'{ident}: {width}×{height}, waste {atlas["wastedArea"]:.1%}, '
                      f'{atlas["full"]["bytes"]} bytes, {atlas["full"]["gpuBytes"]} decoded')
            pending, page = remaining, page + 1
    rounds = {}
    for name, round_spec in sorted(config['rounds'].items()):
        members = round_spec if isinstance(round_spec, list) else round_spec['sets']
        safe_name(name)
        if len(members) != len(set(members)) or any(s not in sets for s in members):
            raise ValueError(f'{name}: duplicate or unknown round set')
        files = []
        declared = [] if isinstance(round_spec, list) else round_spec.get('files', []) + [round_spec[k] for k in ('collisionMap', 'stationAnchors') if k in round_spec]
        for file in dict.fromkeys(declared):
            path = source_path(source, file)
            data = path.read_bytes()
            digest = hashlib.sha256(data).hexdigest()[:16]
            dest = output / f'data-{digest}{path.suffix}'
            dest.write_bytes(data)
            files.append(dict(file=dest.name, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), source=file))
        rounds[name] = dict(sets=members, atlases=[a for s in members for a in sets[s]], files=files,
            **({k: round_spec[k] for k in ('collisionMap', 'stationAnchors') if k in round_spec} if isinstance(round_spec, dict) else {}))
    if not rounds or set(sets) != {s for r in rounds.values() for s in r['sets']}:
        raise ValueError('Every set must belong to a preload round')
    manifest = dict(version=1, alphaMode='straight', mipmaps=False, halfRule='Divide rect, trim, sourceSize, anchor and named anchors coordinates by two; metadata is unchanged', atlases=atlases,
        sets={s: dict(anchors=next(g for g in config['sets'] if g['id'] == s).get('anchors', []), layers=next(g for g in config['sets'] if g['id'] == s).get('layers', ['default']), metadata=next(g for g in config['sets'] if g['id'] == s).get('metadata', []), encoding=next(g for g in config['sets'] if g['id'] == s).get('encoding', 'lossless'), quality=next(g for g in config['sets'] if g['id'] == s).get('quality', 90), atlases=members, animations=next(g for g in config['sets'] if g['id'] == s).get('animations', []),
                     totals={d: total([a for a in atlases if a['set'] == s], d) for d in ('full', 'half')})
              for s, members in sets.items()}, rounds=rounds,
        totals={d: total(atlases, d) for d in ('full', 'half')})
    for r in rounds.values():
        r['totals'] = {d: total([a for a in atlases if a['id'] in r['atlases']], d) for d in ('full', 'half')}
    for r in rounds.values():
        for d in ('full', 'half'):
            r['totals'][d]['bytes'] += sum(f['bytes'] for f in r['files'])
    write_json(output / 'manifest.json', manifest)
    check(output / 'manifest.json')
    return manifest


def check(path):
    manifest = read_json(path)
    if manifest['version'] != 1 or not isinstance(manifest['atlases'], list):
        raise ValueError('Invalid manifest version/atlases')
    atlases = manifest['atlases']
    ids = [a['id'] for a in atlases]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate atlas IDs')
    manifest_bytes = Path(path).stat().st_size
    if manifest_bytes > DOWNLOAD:
        raise ValueError(f'PERF-023 manifest.json exceeds 8 MB by {manifest_bytes - DOWNLOAD} bytes')
    for atlas in atlases:
        for detail in ('full', 'half'):
            record = atlas[detail]
            file = Path(path).parent / record['file']
            if file.parent.resolve() != Path(path).parent.resolve():
                raise ValueError('Atlas path outside output')
            with Image.open(file) as image:
                actual = size_record(file, image.size)
            if actual != record:
                raise ValueError(f'{atlas["id"]}/{detail}: manifest size differs from file')
            digest = hashlib.sha256(file.read_bytes()).hexdigest()[:16]
            if f'.{digest}.webp' not in file.name:
                raise ValueError(f'{atlas["id"]}: invalid content hash')
            if max(record['width'], record['height']) > MAX_SIZE:
                raise ValueError(f'{atlas["id"]}: ART-PIPELINE maximum {MAX_SIZE} exceeded')
            for key, limit, req in [('bytes', DOWNLOAD, 'PERF-023'), ('gpuBytes', DECODED, 'PERF-024')]:
                if record[key] > limit:
                    raise ValueError(f'{req} atlas {atlas["id"]}/{detail} exceeds by {record[key] - limit} bytes')
        for ident, frame in atlas['frames'].items():
            if set(frame) != {'rect', 'sourceSize', 'trim', 'anchor', 'anchors', 'metadata'}:
                raise ValueError(f'{atlas["id"]}/{ident}: invalid frame fields')
            for key, length in [('rect', 4), ('sourceSize', 2), ('trim', 2), ('anchor', 2)]:
                values = frame[key]
                if len(values) != length or any(type(v) not in (int, float) or not math.isfinite(v) for v in values):
                    raise ValueError(f'{atlas["id"]}/{ident}: invalid {key}')
            x, y, w, h = frame['rect']
            if min(x, y) < 0 or min(w, h) <= 0 or x+w > atlas['full']['width'] or y+h > atlas['full']['height']:
                raise ValueError(f'{atlas["id"]}/{ident}: frame outside atlas')
        if any(atlas['full'][k] != atlas['half'][k] * 2 for k in ('width', 'height')):
            raise ValueError(f'{atlas["id"]}: half dimensions mismatch')
    if manifest['totals'] != {d: total(atlases, d) for d in ('full', 'half')}:
        raise ValueError('Overall totals mismatch')
    for name, group in manifest['sets'].items():
        chosen = [a for a in atlases if a['set'] == name]
        if group['encoding'] not in ('lossless', 'lossy') or type(group['quality']) not in (int, float) or not 0 <= group['quality'] <= 100:
            raise ValueError(f'Set {name}: invalid encoding/quality')
        for atlas in chosen:
            for frame in atlas['frames'].values():
                if any(k not in frame['anchors'] for k in group['anchors']):
                    raise ValueError(f'Set {name}: missing declared anchor')
                if any(k not in group['metadata'] for k in frame['metadata']):
                    raise ValueError(f'Set {name}: undeclared metadata')
                for point in frame['anchors'].values():
                    if len(point) != 2 or any(type(v) not in (int,float) or not math.isfinite(v) for v in point):
                        raise ValueError(f'Set {name}: invalid anchor')
            if len(group['layers']) > 1:
                twins = [a for a in chosen if set(a['frames']) == set(atlas['frames'])]
                if {a['layer'] for a in twins} != set(group['layers']) or any(a['frames'] != atlas['frames'] or any(a[d][k] != atlas[d][k] for d in ('full','half') for k in ('width','height')) for a in twins):
                    raise ValueError(f'Set {name}: layer layout mismatch')
        frame_ids = {f for a in chosen for f in a['frames']}
        validate_animations(group['animations'], name)
        if any(f not in frame_ids for a in group['animations'] for seq in sequences(a) for f in seq):
            raise ValueError(f'Set {name}: invalid animation frames')

        if group['atlases'] != [a['id'] for a in chosen] or group['totals'] != {d: total(chosen, d) for d in ('full', 'half')}:
            raise ValueError(f'Set {name}: totals or atlas membership mismatch')
    covered = set()
    for name, group in manifest['rounds'].items():
        expected = [a for s in group['sets'] for a in manifest['sets'][s]['atlases']]
        if group['atlases'] != expected or len(expected) != len(set(expected)):
            raise ValueError(f'Round {name}: invalid preload atlas list')
        covered.update(expected)
        chosen = [a for a in atlases if a['id'] in expected]
        for file in group.get('files', []):
            actual = Path(path).parent / file['file']
            if actual.parent.resolve() != Path(path).parent.resolve() or actual.stat().st_size != file['bytes'] or hashlib.sha256(actual.read_bytes()).hexdigest() != file['sha256']:
                raise ValueError(f'Round {name}: invalid data file')
        for detail in ('full', 'half'):
            amounts = total(chosen, detail)
            amounts['bytes'] += sum(f['bytes'] for f in group.get('files', []))
            if group['totals'][detail] != amounts:
                raise ValueError(f'Round {name}: totals mismatch')
            for key, limit, req, extra in [('bytes', DOWNLOAD, 'PERF-023', manifest_bytes), ('gpuBytes', DECODED, 'PERF-024', 0)]:
                if amounts[key] + extra > limit:
                    raise ValueError(f'{req} round {name}/{detail} atlases {expected}: exceeds by {amounts[key] + extra - limit} bytes')
    if covered != set(ids):
        raise ValueError('Atlases missing from round preload lists')
    print(f'PERF-023/024 passed: {len(atlases)} atlases; manifest {manifest_bytes} bytes')


def render(config, source=ROOT):
    for job in config.get('renders', []):
        script = (ROOT / 'tools/blender' / job['script']).resolve()
        if not script.is_relative_to((ROOT / 'tools/blender').resolve()) or not script.is_file():
            raise ValueError('Render script must exist under tools/blender')
        inputs = [source_path(source, p) for p in job['inputs']] + [script]
        outputs = [source_path(source, p) for p in job['outputs']]
        if not outputs or not all(p.is_file() for p in inputs):
            raise ValueError('Render job needs existing inputs and declared outputs')
        if all(p.exists() for p in outputs) and max(p.stat().st_mtime_ns for p in inputs) <= min(p.stat().st_mtime_ns for p in outputs):
            continue
        guard = subprocess.run([str(ROOT / 'tools/agents/memcheck.sh'), 'render'], capture_output=True, text=True, timeout=30)
        if guard.returncode:
            raise ValueError('Render memory check says wait; retry after running jobs finish')
        subprocess.run(['blender', '-b', '--factory-startup', '-P', str(script), '--', *job.get('args', [])], cwd=source, check=True, timeout=300)
        if not all(p.is_file() for p in outputs):
            raise ValueError('Render script did not produce declared outputs')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', type=Path, default=ROOT / 'assets/src/pipeline.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'assets/dist')
    parser.add_argument('--render', action='store_true')
    parser.add_argument('--check', type=Path)
    args = parser.parse_args()
    if args.check:
        check(args.check)
    else:
        config = read_json(args.config)
        if args.render:
            render(config, args.config.parent)
        pack(config, args.config.parent, args.output)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError, subprocess.SubprocessError) as error:
        message = f'missing required field {error}' if isinstance(error, KeyError) else str(error)
        print('Asset pipeline failed: ' + message.replace('\n', ' '), file=sys.stderr)
        sys.exit(1)
