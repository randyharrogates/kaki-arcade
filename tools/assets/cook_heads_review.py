"""TR-064/TR-061/TR-060: Pillow-only head acceptance and review sheets.

Requires all eight published head jobs and body frames; never renders or stamps.
"""
import argparse
import itertools
import json
import re
from pathlib import Path
import tempfile
import cook_strips as S
import pipeline as P
from PIL import Image, ImageChops, ImageDraw

import cook_heads_contract as C
# TR-061: brightness delta strictly >24/255 over >=20% of occupied union.
MIN_DIFFERENCE = .20
# Read the shared PLAYER_COLOURS declaration rather than maintaining a second palette.
PLAYER_COLOURS = tuple(re.findall(r"colour: '(#[0-9A-Fa-f]{6})'",
    (P.ROOT/'packages/ui/src/colour.ts').read_text().split('export const PLAYER_COLOURS = [', 1)[1].split('] as const', 1)[0]))
LINEUP_LABELS = {'light': '#706151', 'dark': '#EFEAE2'}  # DESIGN §4.2


def difference(a, b, anchor_a=(0, 0), anchor_b=(0, 0)):
    # Align sockets on an expanded canvas, preserving pixels beyond either edge.
    dx, dy = (round(x-y) for x, y in zip(anchor_a, anchor_b))
    left, top = min(0, dx), min(0, dy)
    size = (max(a.width, dx+b.width)-left, max(a.height, dy+b.height)-top)
    aligned = []
    for image, offset in ((a, (-left, -top)), (b, (dx-left, dy-top))):
        canvas = Image.new('RGBA', size)
        canvas.alpha_composite(image, offset)
        aligned.append(canvas)
    # Ignore jointly transparent padding before the per-pixel comparison.
    bounds = ImageChops.lighter(*(im.getchannel('A') for im in aligned)).getbbox()
    if bounds is None:
        return 0
    aligned = [im.crop(bounds) for im in aligned]
    # Premultiply greyscale brightness by alpha: transparent RGB is irrelevant.
    pixels = [list(zip(im.convert('L').getdata(), im.getchannel('A').getdata()))
              for im in aligned]
    union = changed = 0
    for (x, ax), (y, ay) in zip(*pixels):
        if max(ax, ay) > 24:
            union += 1
            changed += abs(x*ax-y*ay) > 24*255
    return changed/max(1, union)


def validate(source, frames, report_path=None):
    for h in C.HEADS:
        expected = C.head_ids(h)
        assert all(i in frames for i in expected), 'Missing head frames: '+h
        for d in C.DIRECTIONS:
            record = frames[f'head-{h}-{d}']
            assert record['anchor'] == record['anchors']['head']
            assert record['anchor'] == frames[f'head-{h}-{d}-mask']['anchor']
            # Socket-relative placement rounds once; Euclidean error <= sqrt(.5).
            for action in C.ACTIONS:
                for f in range(C.ACTIONS[action]['count']):
                    target = frames[f'{action}-{d}-{f}']['anchors']['head']
                    shift = [a-b for a, b in zip(target, record['anchor'])]
                    assert sum((round(v)-v)**2 for v in shift) <= 1, 'Anchor >1 px'
    images = {(h, d): S.image(source, frames[f'head-{h}-{d}'])
              for h in C.HEADS for d in C.DIRECTIONS}
    scores = {}
    for d in C.DIRECTIONS:
        for a, b in itertools.combinations(C.HEADS, 2):
            records = [frames[f'head-{h}-{d}'] for h in (a, b)]
            score = difference(*(images[h, d] for h in (a, b)),
                               *(r['anchor'] for r in records))
            scores[f'{a}/{b}/{d}'] = score
    tinted_scores = {}
    if 'cap' in C.HEADS:
        for d in C.DIRECTIONS:
            cap = frames[f'head-cap-{d}']
            sprite = images['cap', d]
            mask = S.image(source, frames[f'head-cap-{d}-mask'])
            for seat, colour in enumerate(PLAYER_COLOURS, 1):
                tinted = S.multiplied(sprite, mask, colour)
                for head in C.HEADS:
                    if head == 'cap':
                        continue
                    record = frames[f'head-{head}-{d}']
                    tinted_scores[f'seat-{seat}/cap/{head}/{d}'] = difference(
                        tinted, images[head, d], cap['anchor'], record['anchor'])
    if report_path is not None:
        report_path.write_text(json.dumps(dict(untinted=scores, tinted_cap=tinted_scores), indent=2)+'\n')
    failures = {pair: score for pair, score in scores.items() if score < MIN_DIFFERENCE}
    failures.update({pair: score for pair, score in tinted_scores.items() if score < MIN_DIFFERENCE})
    assert not failures, f'Indistinct heads: {failures}'
    return scores


def budget(source):
    # Check actual production encoding (pack selects cook q90 under D-172).
    config = P.load_config(source/'pipeline.json')
    with tempfile.TemporaryDirectory() as temp:
        P.pack(config, source, Path(temp))  # production PERF-023/024 guards


def sheets(source, out):
    frames = S.load_frames(source)
    out.mkdir(parents=True, exist_ok=True)
    play_lineups(source, frames, out)
    # One character per sheet keeps 4x images manageable; eight facing columns.
    for h in C.HEADS:
        sheet = Image.new('RGBA', (S.SIZE*8, S.SIZE))
        for col, d in enumerate(C.DIRECTIONS):
            body = frames[f'idle-{d}-0']
            head = frames[f'head-{h}-{d}']
            cell = S.composite_head(
                S.multiplied(S.image(source, body), S.image(source, frames[f'idle-{d}-0-mask']), '#D9483B'),
                S.multiplied(S.image(source, head), S.image(source, frames[f'head-{h}-{d}-mask']), '#D9483B'),
                body['anchors']['head'], head['anchor'])
            ImageDraw.Draw(cell).text((5, 5), h+' '+d, fill='#D9483B')
            sheet.alpha_composite(cell, (col*S.SIZE, 0))
        for name, colour in S.GROUNDS.items():
            ground = Image.new('RGBA', sheet.size, colour)
            ground.alpha_composite(sheet)
            for scale in (1, 4):
                ground.resize((ground.width*scale, ground.height*scale), Image.Resampling.NEAREST).convert('RGB').save(
                    out/f'{h}-{name}-{scale}x.jpg', quality=95)

    validate(source, frames, out/'head-difference.json')
    budget(source)


def play_lineups(source, frames, out):
    """1080p, 120px/tile: do not scale the 256px source sprites.

    Four 1920x1080 boards cover two facings each; rows are facings, columns
    all eight cooks. 3m proxy: 3:1 area reduction then nearest reconstruction;
    an explicit sampling diagnostic, not a calibrated physical viewing test.
    """
    for page in range(4):
        for name, colour in S.GROUNDS.items():
            board = Image.new('RGBA', (1920, 1080), colour)
            draw = ImageDraw.Draw(board)
            for row, direction in enumerate(C.DIRECTIONS[page*2:page*2+2]):
                for col, head in enumerate(C.HEADS):
                    body = frames[f'idle-{direction}-0']
                    record = frames[f'head-{head}-{direction}']
                    cell = S.composite_head(S.image(source, body), S.image(source, record),
                                            body['anchors']['head'], record['anchor'])
                    board.alpha_composite(cell, (col*233, 144+row*377))
                    draw.text((col*233+55, 144+row*377), head+' '+direction, fill=LINEUP_LABELS[name])
            grey = board.convert('L')
            stem = f'play-grey-{page+1}-{name}'
            grey.save(out/f'{stem}-1x.png')
            grey.resize((640, 360), Image.Resampling.BOX).resize(
                grey.size, Image.Resampling.NEAREST).save(out/f'{stem}-3m.png')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    sheets(S.SOURCE, args.out)
