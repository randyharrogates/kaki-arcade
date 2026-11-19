"""TR-060 / NN-4: inspect published cook PNGs without Blender; writes only --out."""
import argparse
import json
import math
from pathlib import Path
import sys
from PIL import Image, ImageChops, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'blender'))
import cook_poses as C
import pipeline as P

SOURCE = Path(__file__).resolve().parents[2]/'assets/src'
SIZE = 256
GROUNDS = {'light': '#E6DCC3', 'dark': '#2B2118'}


def ground_offset(direction, frame, stride=C.STRIDE_TILES):
    theta = C.DIRECTIONS.index(direction)*math.pi/4
    distance = frame*stride/8
    return (C.PPU*math.sin(theta)*distance,
            C.PPU*math.cos(theta)*math.sqrt(3)/2*distance)


# Rest dimensions from the immutable kalib toy input used by cook.py. Keep the
# scale expression identical: nominal 1.5 tiles excludes the cap shell.
TOY_SCALE = 1.5/((.07+.16)+.30*.82+.30+.36*(.62+.92))
HIP_HEIGHT = (.07+.16)*TOY_SCALE


def first_contact(root, direction):
    theta = C.DIRECTIONS.index(direction)*math.pi/4
    x = -.30*.45*TOY_SCALE
    y = -.045*TOY_SCALE-C.STRIDE_TILES/8
    z = (.07+.16+.04-.16-.02-.095*1.3*.72)*TOY_SCALE
    return (root[0]+C.PPU*(x*math.cos(theta)-y*math.sin(theta)),
            root[1]-C.PPU*((x*math.sin(theta)+y*math.cos(theta))*math.sqrt(3)/2+z*.5))


def tinted(mask, colour):
    result = Image.new('RGBA', mask.size, colour)
    result.putalpha(mask.getchannel('A'))
    return result


def multiplied(sprite, mask, colour):
    """Tint as the game does: multiply the colour into the neutral sprite where the mask is."""
    tint = Image.new('RGB', sprite.size, colour)
    product = ImageChops.multiply(sprite.convert('RGB'), tint)
    out = Image.composite(product, sprite.convert('RGB'), mask.getchannel('A'))
    out.putalpha(sprite.getchannel('A'))
    return out


def composite_head(body, head, body_anchor, head_anchor):
    result = body.copy()
    result.alpha_composite(head, tuple(round(a-b) for a, b in zip(body_anchor, head_anchor)))
    return result


def load_frames(source=SOURCE):
    config = P.load_config(source/'pipeline.json')
    frames = {}
    for group in config['sets']:
        if group['id'] not in ('tabao-rush-cook-body', 'tabao-rush-cook-heads'):
            continue
        for file in group['frameFiles']:
            path = source/file
            if not path.exists():
                print(f'Skipping {file}: frames.json does not exist yet')
                continue
            for record in json.loads(path.read_text()):
                frames[record['id']] = record
    return frames


def image(source, record):
    with Image.open(source/record['file']) as opened:
        return opened.convert('RGBA')


def render_cell(source, frames, ident, mode):
    record = frames[ident]
    body = image(source, record)
    if mode in ('tinted', 'composed'):
        body = multiplied(body, image(source, frames[ident+'-mask']), '#D9483B')
    if mode == 'mask':
        return tinted(image(source, frames[ident+'-mask']), '#D9483B')
    if mode == 'composed':
        direction = ident.split('-')[-2]
        hid = 'head-cap-'+direction
        if hid in frames:
            head = image(source, frames[hid])
            head = multiplied(head, image(source, frames[hid+'-mask']), '#2F7FD6')
            body = composite_head(body, head, record['anchors']['head'], frames[hid]['anchor'])
    return body


def annotated(cell, record, frame):
    cell = cell.copy()
    draw = ImageDraw.Draw(cell)
    for key, colour in (('root', '#D9483B'), ('hands', '#2F7FD6')):
        if key in record['anchors']:
            x, y = record['anchors'][key]
            draw.ellipse((x-2, y-2, x+2, y+2), fill=colour)
    draw.text((5, 5), str(frame), fill='#D9483B')
    return cell


def save_variants(sheet, out, stem, output_format='jpg'):
    """D-163: 1× contact sheets; PNG is an explicit diagnostic option."""
    for name, colour in GROUNDS.items():
        ground = Image.new('RGBA', sheet.size, colour)
        ground.alpha_composite(sheet)
        if output_format == 'png':
            ground.save(out/f'{stem}-{name}-1x.png')
        else:
            ground.convert('RGB').save(out/f'{stem}-{name}-1x.jpg', quality=85)


# Idle is deliberately subtle: >=2px chest travel / >=100 changed pixels.
MOTION_THRESHOLDS = {a: (13, 400) for a in (*C.WORK_ACTIONS, 'serve', 'throw')}
MOTION_THRESHOLDS['idle'] = (2, 100)
for _action in ('walk', 'carry-walk'):
    MOTION_THRESHOLDS[_action] = (8, 150)


def ground_cell_size():
    offsets = [ground_offset(d, f) for d in C.DIRECTIONS for f in range(8)]
    return tuple(SIZE+2*math.ceil(max(abs(p[i]) for p in offsets)) for i in range(2))


def motion_metrics(cells, anchors):
    """Diameter in pixels, and greatest RGBA change against sample zero.

    Count a pixel once if any channel differs by strictly more than 24/255.
    Measurements use unannotated renders, including baked tools.
    """
    travel = max((math.dist(a,b) for a in anchors for b in anchors), default=0.)
    baseline = cells[0].convert('RGBA')
    changed = max(sum(max(pixel)>24 for pixel in
                      ImageChops.difference(baseline, cell.convert('RGBA')).getdata())
                  for cell in cells)
    return dict(travelPx=travel, maxChangedPixels=changed)


def walk_metrics(cells, anchors):
    """Published projected rig landmarks plus opposite-phase rendered pixels."""
    result = {}
    for name in ('foot_l', 'foot_r', 'hand_l', 'hand_r'):
        points = [record[name] for record in anchors]
        result[name] = max(math.dist(a, b) for a in points for b in points)
    xs = [record['head'][0] for record in anchors]
    result['headSidewaysPx'] = max(xs)-min(xs)
    half = len(cells)//2
    result['oppositeChangedPixels'] = min(
        motion_metrics([cells[f], cells[f+half]], [(0, 0)]*2)['maxChangedPixels']
        for f in range(half))
    return result


def motion_report(source, frames):
    report = {}
    for action,spec in C.ACTIONS.items():
        directions = {}
        for direction in C.DIRECTIONS:
            samples = [0, spec['releaseFrame']] if 'releaseFrame' in spec else range(spec['count'])
            ids = [f'{action}-{direction}-{f}' for f in samples]
            if not all(ident in frames for ident in ids):
                continue
            anchor = ('nozzle' if action == 'extinguish' else 'head' if action == 'idle'
                      else 'throwHand' if action == 'throw' else 'hands')
            if not all(
                    'head-cap-'+direction+suffix in frames for suffix in ('', '-mask')):
                continue
            if not all(anchor in frames[ident]['anchors'] and
                       'head' in frames[ident]['anchors'] and ident+'-mask' in frames
                       for ident in ids):
                continue
            cells = [render_cell(source, frames, ident, 'composed') for ident in ids]
            directions[direction] = dict(anchor=anchor, **motion_metrics(
                cells, [frames[ident]['anchors'][anchor] for ident in ids]))
            if action in ('walk', 'carry-walk'):
                try:
                    directions[direction].update(walk_metrics(
                        cells, [frames[ident]['anchors'] for ident in ids]))
                except KeyError:
                    directions[direction]['missingLandmarks'] = sorted({
                        name for record in (frames[ident]['anchors'] for ident in ids)
                        for name in ('foot_l', 'foot_r', 'hand_l', 'hand_r', 'head')
                        if name not in record})

        if directions:
            report[action] = directions
    return report


def motion_failures(report):
    failures = []
    for action,(travel,changed) in MOTION_THRESHOLDS.items():
        for direction in C.DIRECTIONS:
            metric = report.get(action,{}).get(direction)
            if metric is None or metric['travelPx'] < travel or metric['maxChangedPixels'] < changed:
                failures.append(f'{action}/{direction}: {metric or "missing frames"}')
            if action in ('walk', 'carry-walk') and metric is not None:
                idle = report.get('idle', {}).get(direction, {}).get('maxChangedPixels')
                limits = dict(foot_l=15, foot_r=15, hand_l=8, hand_r=8, headSidewaysPx=8)
                if (metric.get('missingLandmarks')
                        or any(metric.get(key, -1) < limit for key, limit in limits.items())
                        or idle is None or metric.get('oppositeChangedPixels', -1) < 1.5*idle):
                    failures.append(f'{action}/{direction}: walk gate {metric}, idle={idle}')
    return failures


def generate(out, source=SOURCE, output_format='jpg'):
    def save(sheet, out, stem):
        save_variants(sheet, out, stem, output_format)
    out.mkdir(parents=True, exist_ok=True)
    frames = load_frames(source)
    report = motion_report(source, frames)
    (out/'motion.json').write_text(json.dumps(report, indent=2)+'\n')
    available = [a for a in C.ACTIONS if f'{a}-s-0' in frames]
    turn = Image.new('RGBA', (SIZE*8, SIZE*len(available))) if available else None
    masks = Image.new('RGBA', (SIZE*8, SIZE*sum(C.ACTIONS[a]['count'] for a in available))) if available else None
    mask_row = 0
    for row, action in enumerate(available):
        count = C.ACTIONS[action]['count']
        for mode in ('body', 'tinted', 'composed'):
            sheet = Image.new('RGBA', (SIZE*count, SIZE*8))
            for d, direction in enumerate(C.DIRECTIONS):
                for f in range(count):
                    ident = f'{action}-{direction}-{f}'
                    cell = render_cell(source, frames, ident, mode)
                    sheet.alpha_composite(annotated(cell, frames[ident], f), (SIZE*f, SIZE*d))
            save(sheet, out, action+'-'+mode)
        for d, direction in enumerate(C.DIRECTIONS):
            turn.alpha_composite(render_cell(source, frames, f'{action}-{direction}-0', 'composed'), (SIZE*d, SIZE*row))
            for f in range(count):
                masks.alpha_composite(render_cell(source, frames, f'{action}-{direction}-{f}', 'mask'), (SIZE*d, SIZE*(mask_row+f)))
        mask_row += count
        if action in ('walk', 'carry-walk'):
            # Each sample has its own viewport: the guide is a fixed world contact,
            # while the cook origin advances by the unrounded projected travel.
            cw, ch = ground_cell_size()
            pad = ((cw-SIZE)//2, (ch-SIZE)//2)
            sheet = Image.new('RGBA', (cw*count, ch*4))
            for row, direction in enumerate(('s', 'e', 'ne', 'n')):
                first = frames[f'{action}-{direction}-0']['anchors']['root']
                for f in range(count):
                    ident = f'{action}-{direction}-{f}'
                    dx, dy = ground_offset(direction, f)
                    cell = Image.new('RGBA', (cw, ch))
                    cell.alpha_composite(render_cell(source, frames, ident, 'composed'),
                                         (pad[0]+round(dx), pad[1]+round(dy)))
                    draw = ImageDraw.Draw(cell)
                    # First left shoe contact: root minus its lateral offset and
                    # its authored forward offset. Coordinates share the camera.
                    cx, cy = first_contact(first, direction)
                    cx, cy = cx+pad[0], cy+pad[1]
                    draw.line((cx-8, cy, cx+8, cy), fill='#2F7FD6', width=1)
                    draw.text((5, 5), f'{direction} {f} ({dx:.3f},{dy:.3f})', fill='#D9483B')
                    sheet.alpha_composite(cell, (cw*f, ch*row))
            save(sheet, out, action+'-ground-speed')
    if turn is not None:
        save(turn, out, 'turns')
        save(masks, out, 'masks-only')
    head_masks = Image.new('RGBA', (SIZE*8, SIZE))
    if all('head-cap-'+d+'-mask' in frames for d in C.DIRECTIONS):
        for d, direction in enumerate(C.DIRECTIONS):
            head_masks.alpha_composite(tinted(image(source, frames['head-cap-'+direction+'-mask']), '#2F7FD6'), (SIZE*d, 0))
        save(head_masks, out, 'head-masks-only')
    if all(a in available for a in ('walk', 'carry-walk')):
        sheet = Image.new('RGBA', (SIZE*8, SIZE*8))
        for d, direction in enumerate(C.DIRECTIONS):
            for f in range(8):
                a, b = (image(source, frames[f'{action}-{direction}-{f}']) for action in ('walk', 'carry-walk'))
                diff = ImageChops.difference(a, b)
                # Hips at 0.07 + kalib leg height, scaled into world tiles.
                # Use the recorded root and fixed camera's vertical projection.
                hips_y = round(frames[f'walk-{direction}-{f}']['anchors']['root'][1]-HIP_HEIGHT*C.PPU*.5)
                lower = diff.crop((0, hips_y, SIZE, SIZE))
                lower.putalpha(255)
                sheet.paste(lower, (SIZE*f, SIZE*d+hips_y))
        save(sheet, out, 'carry-minus-walk-lower-half')

    return report

def opaque_islands(sprite):
    """8-connected alpha>16 components; discard <20-pixel antialias dust.

    16/255 excludes faint shadow/edge tails; 20 pixels is smaller than a
    shoulder at 120 px/tile, so detached sleeve/hand geometry cannot hide.
    """
    alpha = sprite.getchannel('A')
    width, _ = alpha.size
    pending = {i for i, value in enumerate(alpha.getdata()) if value > 16}
    sizes = []
    while pending:
        start = pending.pop()
        stack, count = [start], 0
        while stack:
            index = stack.pop()
            count += 1
            x, y = index % width, index // width
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if 0 <= x+dx < width and 0 <= y+dy < alpha.height:
                        neighbour = (y+dy)*width+x+dx
                        if neighbour in pending:
                            pending.remove(neighbour)
                            stack.append(neighbour)
        if count >= 20:
            sizes.append(count)
    return sorted(sizes, reverse=True)


def body_island_failures(source, frames):
    failures = []
    for action, spec in C.ACTIONS.items():
        for direction in C.DIRECTIONS:
            for frame in range(spec['count']):
                ident = f'{action}-{direction}-{frame}'
                if ident not in frames:
                    failures.append(f'{ident}: missing body frame')
                    continue
                sizes = opaque_islands(image(source, frames[ident]))
                if len(sizes) != 1:
                    failures.append(f'{ident}: body opaque islands {sizes}')
    return failures


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path)
    parser.add_argument('--check-motion', action='store_true')
    parser.add_argument('--format', choices=('jpg', 'png'), default='jpg')
    args = parser.parse_args()
    if args.out is None and not args.check_motion:
        parser.error('--out or --check-motion is required')
    frames = load_frames()
    report = (generate(args.out, output_format=args.format) if args.out else
              motion_report(SOURCE, frames))
    if args.check_motion:
        failures = motion_failures(report) + body_island_failures(SOURCE, frames)
        if failures:
            parser.exit(1, '\n'.join(failures)+'\n')


if __name__ == '__main__':
    main()
