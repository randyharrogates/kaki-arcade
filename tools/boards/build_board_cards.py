"""Compose A-08 Stage 1 board; uses the pipeline's existing Pillow 11.1.0.
python3 tools/boards/build_board_cards.py --out tools/boards/out/cards
Outputs stay in the render directory. No final assets are created.
"""
import argparse
import base64
import hashlib
import io
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
SUITS = 'shdc'
RANKS = ('A', '10', 'Q')


def webp(im):
    stream=io.BytesIO(); im.save(stream,format='WEBP',lossless=True,method=4)
    return stream.getvalue()


def uri(im):
    return 'data:image/webp;base64,'+base64.b64encode(webp(im)).decode()


def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--out',required=True)
    out=Path(parser.parse_args().out).resolve()
    if not out.is_relative_to(HERE/'out/cards'): parser.error('outputs must be under tools/boards/out/cards')
    validation=json.loads((out/'render_validation.json').read_text())
    expected={f'{style}_{rank}{suit}.png' for style in 'ABC' for rank in RANKS for suit in SUITS}
    expected.update({'back.png', *(f'flip_{i}.png' for i in range(5))})
    if validation.get('version') != 4 or set(validation.get('sha256', {})) != expected:
        raise ValueError('Missing complete render validation; rerun board_cards.py')
    for name in sorted(expected):
        with Image.open(out/name) as image:
            # Blender image.pixels lists the bottom row first.
            pixels = image.convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()
        if hashlib.sha256(pixels).hexdigest() != validation['sha256'][name]:
            raise ValueError(f'{name} changed since validation; rerun board_cards.py')
    template=(HERE/'board_cards_template.html').read_text()
    back=Image.open(out/'back.png').convert('RGBA')
    manifest={'requirements':['PP-030','PP-031'], 'stage':1, 'options':{},
              'view':{'tv_inches':55,'distance_m':3,'pixels_per_degree':50,
                      'note':'Angular proxy, not a physical readability certification. View board at 100%.'}}
    tv_width=55*.0254*16/math.sqrt(16**2+9**2)
    angle=math.degrees(2*math.atan(tv_width/6))
    proxy_width=round(angle*50)
    options=[]
    for style,name in [('A','Classic'),('B','TV first'),('C','Golden ratio')]:
        faces=[Image.open(out/f'{style}_{rank}{suit}.png').convert('RGBA') for suit in SUITS for rank in RANKS]
        tilew,tileh=faces[0].size
        if any(im.size != (tilew,tileh) for im in faces):
            raise ValueError(f'{style}: inconsistent tile sizes')
        gap=8
        sheet=Image.new('RGBA',(4*tilew+3*gap,3*tileh+2*gap))
        # Rows are ranks, columns are spade / heart / diamond / club.
        for s in range(4):
            for r in range(3): sheet.alpha_composite(faces[s*3+r],(s*(tilew+gap),r*(tileh+gap)))
        (out/f'{style}_faces.webp').write_bytes(webp(sheet))
        grey=ImageOps.grayscale(sheet).convert('RGBA'); grey.putalpha(sheet.getchannel('A'))
        (out/f'{style}_greyscale.webp').write_bytes(webp(grey))
        # Same 205px card height and 21px gaps as board 3 ppB. Golden cards fit
        # by narrowing the card, rather than silently overflowing the 4-row grid.
        cw=127 if style=='C' else 150; ch=205
        tv=Image.new('RGBA',(1920,1080),'#1D5741'); draw=ImageDraw.Draw(tv)
        for x in range(-1080,1920,5): draw.line((x,0,x+1080,1080),fill='#265E49',width=2)
        font=ImageFont.load_default(size=34)
        for seat in range(7):
            y=110+seat*120
            draw.rounded_rectangle((55,y,500,y+89),radius=13,fill='#F6F1E7')
            draw.text((76,y+21),f'{seat+1}  Player   Picked',fill='#17352A',font=font)
        draw.text((1330,144),'Round 3 of 5',fill='#F6EFE2',font=font)
        draw.text((1330,233),'Shared cards',fill='#F6EFE2',font=font)
        draw.text((1330,610),'Memorise',fill='#F6EFE2',font=font)
        draw.text((1330,665),'14 s',fill='#F6EFE2',font=ImageFont.load_default(size=89))
        gx=(1920-(4*150+3*21))//2; gy=(1080-(4*205+3*21))//2
        for i in range(16):
            im=faces[(i%4)*3+i//4] if i<12 else back
            # Crop the render gutter before fitting the card to its true display box.
            im=im.crop(im.getbbox()); im=ImageOps.contain(im,(cw,ch),Image.Resampling.LANCZOS)
            tv.alpha_composite(im,(gx+(i%4)*171+(150-im.width)//2,gy+(i//4)*226+(205-im.height)//2))
        tv.convert('RGB').save(out/f'{style}_tv1080.webp',lossless=True)
        proxy=tv.resize((proxy_width,round(1080*proxy_width/1920)),Image.Resampling.LANCZOS)
        proxy.save(out/f'{style}_3m_full.webp',lossless=True)
        scale=proxy_width/1920
        crop=proxy.crop(tuple(round(v*scale) for v in (gx,gy,gx+663,gy+883)))
        crop.save(out/f'{style}_3m_grid.webp',lossless=True)
        # Estimate complete deck from measured A/10/Q samples, plus conservative 25%
        # packing/other-rank allowance. This is not a measured complete-deck transfer.
        tilew,tileh=faces[0].size
        count=52+1+5
        cellw=max(tilew,back.width); cellh=max(tileh,back.height)
        cells=(2048//(cellw+4))*(2048//(cellh+4))
        pages=math.ceil(count/cells)
        flip_bytes=sum(len(webp(Image.open(out/f'flip_{i}.png'))) for i in range(5))
        estimated=math.ceil((sum(map(lambda f:len(webp(f)),faces))/12*52+len(webp(back))+flip_bytes)*1.25)
        mib=estimated/1_000_000
        fail=estimated>8_000_000 or pages*2048*2048*4>256_000_000
        status='OVER comparison budget' if fail else 'Within comparison budgets (estimate)'
        cost=f'{tilew} × {tileh} px/frame incl. gutter; {cw} × {ch} px on TV. {pages} atlas page × 2048², 4 px padding; {pages*16} MiB decoded. Est. {mib:.2f} MB lossless WebP / 8 MB comparison ceiling.'
        note={'A':'Two-way indices, ace / ten-pip layout, original crown for Q. Small indices may lose at distance.',
              'B':'Large central rank and suit; two small corner indices. Recommended for the TV reading task.',
              'C':'Card width : height = 1 : 1.618. Central rank : suit region heights = 1.618 : 1; narrowed to fit the decided grid.'}[style]
        options.append(f'<section class="option"><h2>{style} · {name}</h2><p>{note}</p><img class="faces" src="{uri(sheet)}" alt="{name}: A, 10, Q in all four suits"><p class="cost">{cost}<br><strong>{status}</strong></p><details><summary>Greyscale shape check</summary><img class="faces" src="{uri(grey)}" alt="Greyscale suit comparison"></details><h3>3 m proxy · scaled preview</h3><img class="distance" width="{crop.width}" height="{crop.height}" src="{uri(crop)}" alt="Twelve faces at TV table size, angular downsample"><p class="small"><a href="{style}_tv1080.webp">Full 1080p table</a> · <a href="{style}_3m_full.webp">Full angular proxy</a> · <a href="{style}_3m_grid.webp">Native grid crop</a></p></section>')
        manifest['options'][style]={'sprite_px':[tilew,tileh], 'tv_card_px':[cw,ch], 'atlas_pages':pages,
            'atlas_cell_padding_px':4,'estimated_lossless_webp_bytes':estimated,'comparison_budget_exceeded':fail,
            'method':'Mean of 12 lossless face samples ×52 + back + five B flip frames; ×1.25 allowance. Full deck not rendered.'}
    strip=Image.new('RGBA',(back.width*5,back.height))
    for i in range(5): strip.alpha_composite(Image.open(out/f'flip_{i}.png').convert('RGBA'),(i*back.width,0))
    strip.save(out/'flip_strip.webp',lossless=True)
    template=template.replace('{{options}}',''.join(options)).replace('{{back}}',uri(back)).replace('{{flip}}',''.join(
        f'<figure><img src="{uri(Image.open(out/f"flip_{i}.png").convert("RGBA"))}" alt="B flip at {i*25}%"><figcaption>{i*25} %</figcaption></figure>'
        for i in range(5)))
    template=template.replace('{{angle}}',f'{angle:.2f}° / {proxy_width} px at 50 px per degree')
    (out/'board_cards.html').write_text(template)
    (out/'costs.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(manifest,indent=2))
    print(out/'board_cards.html')

if __name__=='__main__': main()
