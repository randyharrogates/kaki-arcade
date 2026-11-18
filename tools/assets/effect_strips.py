"""A-07 review artifacts; requires rendered source PNGs. Never renders or packs."""
import argparse
import json
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageOps
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'blender'))
import effect_geometry as E

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    # Read every source before creating evidence; incomplete jobs fail explicitly.
    sources = {name: [Image.open(ROOT/'assets/src'/f['file']).convert('RGBA')
                      for f in E.frame_specs(name)] for name in E.EFFECTS}
    args.out.mkdir(parents=True, exist_ok=True)
    for name, frames in sources.items():
        size = E.EFFECTS[name][0]
        for scale in (1, 4):
            for theme, colour in [('light', '#EFEAE2'), ('dark', '#6B4426')]:
                sequence = frames+[frames[-1], frames[0]]
                cell = size*scale
                panel_w, panel_h = 233*scale, 144*scale
                columns = [(str(i) if i < len(frames) else ('last' if i == len(frames) else 'first'), frame)
                           for i, frame in enumerate(sequence)]
                half = frames[0].resize((size//2, size//2), Image.Resampling.LANCZOS)
                half = half.resize((size, size), Image.Resampling.BILINEAR)
                columns += [('half detail (frame 0)', half), ('greyscale (frame 0)', frames[0])]
                sheet = Image.new('RGB', (len(columns)*panel_w, panel_h), colour)
                draw = ImageDraw.Draw(sheet)
                # One faint speckle treatment, deterministic on both backgrounds.
                for y in range(0, sheet.height, 13):
                    for x in range(0, sheet.width, 21):
                        draw.point((x+(y%5), y), fill='#D8CDBB' if theme == 'light' else '#706151')
                for i, (label, frame) in enumerate(columns):
                    sprite = frame.resize((frame.width*scale, frame.height*scale), Image.Resampling.NEAREST)
                    left = i*panel_w
                    sheet.paste(sprite, (left+(panel_w-sprite.width)//2,
                                         (panel_h-sprite.height)//2), sprite)
                    if label.startswith('greyscale'):
                        panel = sheet.crop((left, 0, left+panel_w, panel_h))
                        sheet.paste(ImageOps.grayscale(panel).convert('RGB'), (left, 0))
                    draw.text((left+13, 8), label,
                              fill='#2B2118' if theme == 'light' else '#EFEAE2')
                sheet.save(args.out/f'{name}-{scale}x-{theme}.png')
        # Live versus static frame-zero option, golden-ratio width:height.
        previews = []
        for frame in frames:
            canvas = Image.new('RGB', (233, 144), '#6B4426')
            draw = ImageDraw.Draw(canvas)
            for y in range(0, 144, 13):
                for x in range(0, 233, 21):
                    draw.point((x+(y%5), y), fill='#706151')
            canvas.paste(frame, (89, 34), frame)
            previews.append(canvas)
        previews[0].save(args.out/f'{name}-animated.gif', save_all=True,
                         append_images=previews[1:], duration=round(1000/E.EFFECTS[name][2]), loop=0)
        previews[0].save(args.out/f'{name}-static.png')
    if (args.out/'review.json').exists():
        return
    (args.out/'review.json').write_text(json.dumps(dict(visualReview='pending',
        instructions='Review all 1x/4x sheets including half-detail and greyscale columns, last/first seams and GIFs; compare static options at 3 m. Panel proportions 233:144.',
        effects=list(E.EFFECTS)), indent=2)+'\n')


if __name__ == '__main__':
    main()
