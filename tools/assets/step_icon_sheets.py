"""TR-001: compact post-pack review sheets; no render or pack is performed."""
import argparse
import json
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageOps
import pipeline as P

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'blender'))
import step_icon_geometry as G

SET = 'tabao-rush-step-icons'


def packed_frames(dist, manifest, detail):
    factor = 2 if detail == 'half' else 1
    frames = {}
    for atlas in manifest['atlases']:
        if atlas['set'] != SET:
            continue
        with Image.open(dist/atlas[detail]['file']) as page:
            for key,frame in atlas['frames'].items():
                x,y,w,h = [v//factor for v in frame['rect']]
                image = Image.new('RGBA',tuple(v//factor for v in frame['sourceSize']))
                image.alpha_composite(page.convert('RGBA').crop((x,y,x+w,y+h)),
                                      tuple(v//factor for v in frame['trim']))
                frames[key.removeprefix('step-')] = image
    if set(frames) != set(G.KINDS):
        raise ValueError('Pack must contain all eleven step icons')
    return frames


def ground(size, dark=False):
    # One faint paper-speckle treatment, deterministic; dark is a contrast probe.
    base = (43,33,24) if dark else (251,247,240)
    image = Image.new('RGB',size,base)
    draw = ImageDraw.Draw(image)
    colour = tuple(c+3 if dark else c-3 for c in base)
    for y in range(5,size[1],13):
        for x in range(5+(y%3),size[0],13):
            draw.point((x,y),fill=colour)
    return image


def make_sheets(dist, out):
    config = P.load_config(P.ROOT/'assets/src/pipeline.json')
    if P.render(config,P.ROOT/'assets/src',only='step-icons',check_stale=True):
        raise ValueError('Render step-icons before making sheets')
    P.check(dist/'manifest.json')
    manifest = P.read_json(dist/'manifest.json')
    # Refuse an old pack after a new render (or a pack with different source pixels).
    full = packed_frames(dist,manifest,'full')
    for kind,image in full.items():
        with Image.open(P.ROOT/'assets/src'/G.FOLDER/f'{kind}.png') as source:
            if image.tobytes() != source.convert('RGBA').tobytes():
                # Transparent RGB is intentionally changed by atlas bleed.
                from PIL import ImageChops
                diff = ImageChops.difference(image,source.convert('RGBA'))
                if diff.getchannel('A').getbbox() or any(
                        a and rgb != src for (*rgb,a),(*src,_) in
                        zip(image.getdata(),source.convert('RGBA').getdata())):
                    raise ValueError('Repack step-icons before making sheets')
    out.mkdir(parents=True,exist_ok=True)
    for detail in ('full','half'):
        frames = packed_frames(dist,manifest,detail)
        for theme in ('light','dark'):
            dark = theme == 'dark'
            fg = '#F4F1E8' if dark else '#2B2118'
            sheet = ground((11*55,89),dark)
            draw = ImageDraw.Draw(sheet)
            for i,kind in enumerate(G.KINDS):
                draw.text((i*55+5,5),kind,fill=fg)
                image = frames[kind].resize((34,34),Image.Resampling.NEAREST)
                sheet.paste(image,(i*55+8,34),image)
            for scale in (1,4):
                enlarged = sheet.resize((sheet.width*scale,sheet.height*scale),Image.Resampling.NEAREST)
                enlarged.save(out/f'icons-{detail}-{theme}-{scale}x.png')
                ImageOps.grayscale(enlarged).save(out/f'icons-{detail}-{theme}-{scale}x-greyscale.png')
            # Chicken rice: process order then container; 13 px clear edge gap.
            card = ground((233,144),dark)
            draw = ImageDraw.Draw(card)
            draw.text((13,13),'Chicken rice',fill=fg)
            for i,kind in enumerate(('rice','chop','chop','plate')):
                image = frames[kind].resize((34,34),Image.Resampling.NEAREST)
                card.paste(image,(13+i*47,55),image)
            for width in (1920,1280):
                scaled = card.resize((round(233*width/1920),round(144*width/1920)),Image.Resampling.LANCZOS)
                scaled.save(out/f'recipe-{detail}-{theme}-{width}.png')
                ImageOps.grayscale(scaled).save(out/f'recipe-{detail}-{theme}-{width}-greyscale.png')
    P.write_json(out/'measurements.json',dict(
        visualReview='PENDING: integrator must inspect every sheet; physical 3 m check owed',
        recipe=dict(steps=['rice','chop','chop','plate'],glyphPx=34,gapPx=13,
                    widths=[1920,1280],crop=[233,144]),
        icons=manifest['sets'][SET]['totals'],
        round=manifest['rounds']['tabao-rush']['totals']))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist',type=Path,default=P.ROOT/'assets/dist')
    parser.add_argument('--out',type=Path,default=P.ROOT/'uat/evidence/A-11-step-icons/rendered')
    args = parser.parse_args()
    make_sheets(args.dist,args.out)


if __name__ == '__main__':
    main()
