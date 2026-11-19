"""TR-050/TR-057 board: actual lossy previews and measured costs; no placeholder art."""
import argparse
import html
import io
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
CAPTIONS = {
    'terrazzo': 'Terrazzo floor, jade trim; a single subtle speckle treatment.',
    'tile': 'Small square floor tiles, wood trim #C7A16A; tile joints are the floor treatment.',
    'golden': 'Counter front height: cream upper section : jade lower band = 1.618 : 1. No floor border.',
}


def previews(image, quality=90):
    result = []
    for size in ((1920, 1080), (960, 540)):
        pixels = image.convert('RGB').resize(size, Image.Resampling.BOX)
        data = io.BytesIO()
        pixels.save(data, format='WEBP', quality=quality, method=6)
        result.append((data.getvalue(), size[0]*size[1]*4))
    return result


def build(source, out, page):
    out.mkdir(parents=True, exist_ok=True)
    sections = []
    for path in sorted(source.glob('*.json')):
        level = json.loads(path.read_text())
        board = Image.new('RGB', (2880, 629), '#F4F1E8')
        draw = ImageDraw.Draw(board)
        figures = []
        for index, (look, caption) in enumerate(CAPTIONS.items()):
            with Image.open(source/level['id']/look/'background.png') as image:
                costs = previews(image)
            name = level['id']+'-'+look+'.webp'
            (out/name).write_bytes(costs[1][0])
            with Image.open(io.BytesIO(costs[1][0])) as image:
                board.paste(image.convert('RGB'), (index*960, 0))
            label = f'{look}: full {len(costs[0][0]):,} bytes / {costs[0][1]:,} decoded; half {len(costs[1][0]):,} / {costs[1][1]:,}'
            draw.text((index*960+13, 553), label, fill='#2B2118')
            draw.text((index*960+13, 579), caption, fill='#2B2118')
            relative = os.path.relpath(out/name, page.parent)
            figures.append(f'<figure><img src="{html.escape(relative)}" alt="{look}"><figcaption>{html.escape(label)}<p>{caption}</p></figcaption></figure>')
        board.save(out/(level['id']+'-board.png'))
        sections.append(f'<section><h2>{html.escape(level["venue"])} — {level["id"]}</h2><div>'+''.join(figures)+'</div></section>')
    page.parent.mkdir(parents=True, exist_ok=True)
    page.write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>A-06 venues</title><style>body{background:#F4F1E8;color:#2B2118;font:21px Georgia;margin:34px}div{display:flex;gap:13px}figure{margin:0;flex:1;min-width:0}img{width:100%}figcaption{padding:13px}</style><h1>A-06 venue options</h1><p>TR-050 / TR-057. Full transfer budget: 8,000,000 bytes for the whole round; decoded budget: 256,000,000 bytes. Costs below cover the background only. Default shipment: terrazzo, pending venue choice.</p>'+''.join(sections)+'</html>\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=ROOT/'assets/src/tabao-rush/levels')
    parser.add_argument('--out', type=Path, default=ROOT/'assets/src/tabao-rush/level-board')
    parser.add_argument('--page', type=Path, default=ROOT/'docs/design-gate/A-06-venues.html')
    args = parser.parse_args()
    build(args.source, args.out, args.page)
