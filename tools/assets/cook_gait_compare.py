"""TR-060: main's committed renders against proposed renders; no Blender."""
import argparse
import io
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw
import cook_strips as S


def committed(path, revision):
    return subprocess.check_output(['git', 'show', f'{revision}:assets/src/{path}'])


def compare(out, revision='main', source=S.SOURCE):
    current = {}
    for folder in ('cook-body/walk', 'cook-body/carry-walk', 'cook-heads/cap'):
        path = f'tabao-rush/{folder}/frames.json'
        for record in json.loads(committed(path, revision)):
            current[record['id']] = record
    proposed = S.load_frames(source)
    out.mkdir(parents=True, exist_ok=True)
    # Reuse composition/tint and render settings, including actual canvas size.
    original_image = S.image
    def baseline_image(root, record):
        with Image.open(io.BytesIO(committed(record['file'], revision))) as opened:
            return opened.convert('RGBA')
    for action in ('walk', 'carry-walk'):
        count = S.C.ACTIONS[action]['count']
        for direction in tuple(d for d in S.C.DIRECTIONS if d in ('s', 'e', 'ne', 'n')):
            rows = []
            try:
                S.image = baseline_image
                rows.append([S.render_cell(source, current, f'{action}-{direction}-{f}', 'composed')
                             for f in range(count)])
            finally:
                S.image = original_image
            rows.append([S.render_cell(source, proposed, f'{action}-{direction}-{f}', 'composed')
                         for f in range(count)])
            width, height = rows[0][0].size
            sheet = Image.new('RGBA', (width*count, (height+21)*2), S.GROUNDS['light'])
            draw = ImageDraw.Draw(sheet)
            for row, (label, cells) in enumerate(zip(('current: '+revision, 'proposed'), rows)):
                draw.text((5, row*(height+21)+5), f'{label} / {action} / {direction}', fill='#2B2118')
                for f, cell in enumerate(cells):
                    sheet.alpha_composite(cell, (f*width, row*(height+21)+21))
            for scale in (1, 4):
                sheet.convert('RGB').resize((sheet.width*scale, sheet.height*scale),
                    Image.Resampling.NEAREST).save(out/f'{action}-{direction}-{scale}x.png')
    (out/'comparison.json').write_text(json.dumps(dict(baseline=subprocess.check_output(
        ['git', 'rev-parse', revision], text=True).strip(), actions=['walk', 'carry-walk'],
        facings=tuple(d for d in S.C.DIRECTIONS if d in ('s', 'e', 'ne', 'n')), scales=[1, 4]), indent=2)+'\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--current-ref', default='main')
    parser.add_argument('--out', type=Path, default=Path('uat/evidence/A-02d-cook-gait'))
    args = parser.parse_args()
    compare(args.out, args.current_ref)
