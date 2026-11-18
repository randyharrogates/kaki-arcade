"""TR-041: reproducible 1920x1080 review pages, native 1x and nearest-neighbour 4x.

Run after rendering items; refuses stale source pixels. No Blender invocation or
source/atlas mutation. PNGs must be viewed at 100%, not fitted to the window.
"""
import argparse
import hashlib
import importlib.util
import json
import math
import re
from pathlib import Path
import textwrap

from PIL import Image, ImageDraw, ImageFont
import pipeline

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('item_models', ROOT/'tools/blender/items.py')
items = importlib.util.module_from_spec(spec)
spec.loader.exec_module(items)
# DESIGN §4.2 marble / kopi brown; one low-contrast speckle treatment per surface.
BACKGROUNDS = {'light': '#EFEAE2', 'dark': '#6B4426'}
SIZE = (1920, 1080)


def compose(frames, pixels, container, layers):
    base = frames[container]
    return items.compose_rgba(pixels[container], [
        (items.scaled_rgba(pixels[ident], scale), anchor)
        for ident, anchor, scale in items.composition_layers(
            sorted(layers, key=lambda layer: layer['order']), base)])


def review_cases(frames, pixels):
    """Fixed references, selected served variants, all portions and cup contents."""
    cases = []
    for ident, frame in frames.items():
        if ident.startswith(('dish-', 'portion-', 'container-')):
            cases.append((ident, pixels[ident]))
        if 'servedComposition' in frame:
            served = frame['servedComposition']
            for drink, layers in served['variants'].items():
                cases.append((ident+' / '+drink,
                              compose(frames, pixels, served['container'], layers)))
    # Every reachable ready food at its actual cup scale, including bread/spread.
    for ident in frames:
        if any(ident.startswith('portion-'+food+'-') for food in items.INGREDIENTS):
            food = ident[len('portion-'):].rsplit('-', 1)[0]
            for kind in ('plate', 'bowl', 'cup'):
                base_id = 'container-'+kind+'-clean'
                base = frames[base_id]
                layers = base.get('contentCompositions', {}).get(food, [
                    {'frame': ident, 'slot': food,
                     'scale': base['portionScales'][food], 'order': 10}])
                cases.append((kind+' / '+ident, compose(frames, pixels, base_id, layers)))
    return cases


def background(name):
    image = Image.new('RGBA', SIZE, BACKGROUNDS[name])
    # Deterministic sparse speckle, using the same hue at low alpha.
    speckle = Image.new('RGBA', SIZE)
    dots = ImageDraw.Draw(speckle)
    colour = (43,33,24,12) if name == 'light' else (244,235,221,12)
    for y in range(0, SIZE[1], 13):
        for x in range((y*7)%13, SIZE[0], 21):
            dots.point((x,y), fill=colour)
    image.alpha_composite(speckle)
    return image


def pages(cases, name, zoom):
    # Native canvases: items 89px, icons 55px. Zoom is exact, never auto-fitted.
    cell_w, cell_h, columns, rows = (233,144,8,6) if zoom == 1 else (466,445,4,2)
    font = ImageFont.truetype(str(ROOT/'assets/src/fonts/dm-sans/DMSans-Bold.ttf'), 13 if zoom == 1 else 21)
    foreground = '#2B2118' if name == 'light' else '#F4EBDD'
    count = columns*rows
    for start in range(0, len(cases), count):
        page = background(name)
        draw = ImageDraw.Draw(page)
        draw.text((21,21), f'TR-041 | {name} counter | {zoom}x | page {start//count+1} | view at 100%',
                  font=font, fill=foreground)
        for index, (label, pixels) in enumerate(cases[start:start+count]):
            x, y = 21+(index%columns)*cell_w, 89+(index//columns)*cell_h
            side = math.isqrt(len(pixels))
            sprite = Image.new('RGBA', (side,side))
            sprite.putdata(pixels)
            if zoom != 1:
                sprite = sprite.resize((side*zoom,side*zoom), Image.Resampling.NEAREST)
            page.alpha_composite(sprite, (x+(cell_w-sprite.width)//2,y))
            # Use complete labels; three lines fit below the 4x canvas.
            lines = textwrap.wrap(label, width=28 if zoom == 1 else 38,
                                  break_long_words=True, break_on_hyphens=True)
            draw.multiline_text((x,y+sprite.height+5), '\n'.join(lines),
                                font=font, fill=foreground, spacing=0)
        yield start//count+1, page


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run', help='New evidence run name (letters, digits, hyphens)')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]*', args.run):
        parser.error('Invalid run name')
    config = pipeline.read_json(ROOT/'assets/src/pipeline.json')
    job = next(job for job in config['renders'] if job['id'] == 'items')
    _, outputs, stamp, digest, _ = pipeline.render_job(job, ROOT/'assets/src')
    reason = pipeline.stale_reason(outputs, stamp, digest)
    if reason:
        parser.error('Render items first: '+reason)
    frames = {frame['id']: frame for group in config['sets']
              if group['id'] == 'tabao-rush-items' for frame in group['frames']}
    pixels = {ident: items.png_rgba(ROOT/'assets/src'/frame['file'])
              for ident, frame in frames.items()}
    groups = {'servings': review_cases(frames, pixels),
              'loose-items': [(i,p) for i,p in pixels.items() if i.startswith('item-')],
              'icons': [(i,p) for i,p in pixels.items() if i.startswith('icon-')]}
    cases = [case for group in groups.values() for case in group]
    output = ROOT/'uat/evidence/A-10-dish-polish'/args.run
    output.mkdir(parents=True, exist_ok=False)
    files = []
    for name in BACKGROUNDS:
        for zoom in (1,4):
            for category, entries in groups.items():
                for number, page in pages(entries, name, zoom):
                    path = output/f'{category}-{name}-{zoom}x-{number:02}.png'
                    page.convert('RGB').save(path)
                    files.append(path.name)
    hashes = {ident: hashlib.sha256((ROOT/'assets/src'/frames[ident]['file']).read_bytes()).hexdigest()
              for ident in pixels}
    (output/'sheet.json').write_text(json.dumps(dict(
        requirement='TR-041', renderDigest=digest, sourceSHA256=hashes,
        canvas=list(SIZE), sourceCanvas=[89,89], pixelsPerWorldUnit=120,
        zooms=[1,4], backgrounds=BACKGROUNDS, cases=[label for label,_ in cases],
        files=files, visualReview='pending'), indent=2)+'\n')
    print(f'{output}: {len(cases)} cases, {len(files)} pages; visual review pending')


if __name__ == '__main__':
    main()
