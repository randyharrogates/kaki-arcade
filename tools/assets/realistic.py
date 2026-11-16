"""PERF-023/024 reproducible diagnostic workload; never Blender or production art."""
from pathlib import Path
import math
import shutil
from PIL import Image, ImageDraw, ImageFilter
from pipeline import ROOT, DIRECTIONS, pack, write_json


def generate(source):
    source.mkdir(parents=True, exist_ok=True)
    frames, animations = [], []
    for action in range(9):
        directions={}
        for d, direction in enumerate(DIRECTIONS):
            sequence=[]
            for t in range(10):
                ident=f'a{action}-{direction}-{t}'
                sequence.append(ident)
                body=Image.new('RGBA',(320,370))
                draw=ImageDraw.Draw(body)
                shift=round(6*math.sin(t*math.pi/5))
                draw.ellipse((35,312,285,355),fill=(40,30,20,65))
                draw.ellipse((75+shift,65,245+shift,290),fill=(70+action*12,100+d*12,170,255))
                draw.rectangle((85+shift,265,130+shift,330),fill=(70,80,100,255))
                draw.rectangle((190-shift,265,235-shift,330),fill=(70,80,100,255))
                angle=d*math.pi/4-math.pi/2
                draw.line((160,160,160+int(65*math.cos(angle)),160+int(65*math.sin(angle))),fill='white',width=9)
                body=body.filter(ImageFilter.GaussianBlur(.7)).resize((160,185),Image.Resampling.LANCZOS)
                mask=Image.new('RGBA',(320,370))
                md=ImageDraw.Draw(mask)
                md.rectangle((105+shift,170,215+shift,270),fill=(255,255,255,255))
                md.ellipse((90+shift,55,230+shift,100),fill=(255,255,255,255))
                mask=mask.resize((160,185),Image.Resampling.LANCZOS)
                body.save(source/f'{ident}-body.png'); mask.save(source/f'{ident}-mask.png')
                frames.append(dict(id=ident,layers={l:f'{ident}-{l}.png' for l in ['body','mask']},anchors={'foot':[80,165],'head':[80,45],'carry':[110,100]},event='step' if t in (0,5) else None))
            directions[direction]=sequence
        animations.append(dict(action=f'action-{action}',fps=12,directions=directions))
    sets=[dict(id='cook',layers=['body','mask'],anchors=['foot','head','carry'],metadata=['event'],frames=frames,animations=animations)]
    for name,count,size in [('heads',64,80),('stations',12,300)]:
        frames=[]
        for i in range(count):
            ident=f'{name}-{i}'
            im=Image.new('RGBA',(size,size))
            draw=ImageDraw.Draw(im)
            # Touch every edge: dense but rounded diagnostic silhouettes.
            draw.rounded_rectangle((0,0,size-1,size-1),radius=size//6,fill=(90+i*7%160,140,180,255))
            draw.text((size//3,size//3),str(i),fill='white')
            im.save(source/f'{ident}.png')
            frames.append(dict(id=ident,file=f'{ident}.png',anchors={'foot':[size/2,size]}))
        sets.append(dict(id=name,frames=frames,anchors=['foot']))
    # Detailed deterministic opaque background with ramps, tiles and fine texture.
    for width,height in [(1921,1081),(1920,1080)]:
        im=Image.new('RGB',(width,height))
        im.putdata([(int(90+50*x/width)+(x*17+y*13)%13,int(100+50*y/height)+(x+y)%11,125+(x//96+y//96)%2*24) for y in range(height) for x in range(width)])
        im.save(source/f'background-{width}.png')
    sets.append(dict(id='background',encoding='lossy',quality=85,frames=[dict(id='background',file='background-1921.png')]))
    (source/'collision.json').write_text('{"cells":[0,1,0,1]}')
    (source/'stations.json').write_text('{"stove":[300,400]}')
    (source/'sound.bin').write_bytes(bytes(range(256))*32)
    cfg=dict(sets=sets,rounds={'level-01':dict(sets=[g['id'] for g in sets],collisionMap='collision.json',stationAnchors='stations.json',files=['sound.bin'])})
    write_json(source/'pipeline.json',cfg)
    return cfg


def run():
    evidence=ROOT/'uat/evidence/A-01-asset-pipeline'
    work=ROOT/'assets/dist/realistic'
    cfg=generate(work/'source')
    manifest=pack(cfg,work/'source',work/'packed')
    evidence.mkdir(parents=True,exist_ok=True)
    for file in evidence.iterdir():
        if file.suffix in ('.png','.webp') or file.name in ('manifest.json',):
            file.unlink()
    shutil.copy(work/'packed/manifest.json',evidence/'manifest.json')
    previews=[]
    for a in manifest['atlases']:
        for detail in ['full','half']:
            with Image.open(work/'packed'/a[detail]['file']) as im:
                im=im.convert('RGBA')
                im.thumbnail((760,560))
                bg=Image.new('RGBA',im.size,(205,205,205,255)); bg.alpha_composite(im)
                path=evidence/f'{a["id"]}-{detail}.png'
                bg.convert('RGB').save(path,optimize=True)
                assert path.stat().st_size < 300_000
                previews.append(path.name)
    comparison={}
    for encoding in ['lossless','lossy']:
        c=dict(sets=[dict(id='comparison',encoding=encoding,quality=85,frames=[dict(id='bg',file='background-1920.png')])],rounds={'test':['comparison']})
        m=pack(c,work/'source',work/encoding)
        comparison[encoding]=m['totals']
    seam=[]
    for size in [(33,33),(1921,1081)]:
        Image.new('RGBA',size,(190,80,30,255)).save(work/'source/odd.png')
        m=pack(dict(sets=[dict(id='odd',frames=[dict(id='odd',file='odd.png')])],rounds={'test':['odd']}),work/'source',work/'odd')
        a=m['atlases'][0]
        checks={}
        for detail,scale in [('full',1),('half',2)]:
            x,y,w,h=[v//scale for v in a['frames']['odd']['rect']]
            im=Image.open(work/'odd'/a[detail]['file']).convert('RGBA')
            tile=im.crop((x,y,x+w,y+h))
            checks[detail]=dict(alphaExtrema=tile.getchannel('A').getextrema(),lastColumn=tile.getchannel('A').crop((w-1,0,w,h)).getextrema(),lastRow=tile.getchannel('A').crop((0,h-1,w,h)).getextrema())
            assert checks[detail]['alphaExtrema']==(255,255)
            if scale==1:
                assert tile.crop((0,0,*size)).tobytes()==Image.new('RGBA',size,(190,80,30,255)).tobytes()
        seam.append(dict(size=size,exactFullReconstruction=True,checks=checks))
    summary=dict(previews=previews,background1920=comparison,seams=seam,
        waste={s:sum(a['wastedArea']*a['full']['width']*a['full']['height'] for a in manifest['atlases'] if a['set']==s)/sum(a['full']['width']*a['full']['height'] for a in manifest['atlases'] if a['set']==s) for s in manifest['sets']},
        rounds={r:{d:dict(transferBytes=v['bytes']+(evidence/'manifest.json').stat().st_size,transferLimit=8_000_000,gpuBytes=v['gpuBytes'],gpuLimit=256_000_000) for d,v in g['totals'].items()} for r,g in manifest['rounds'].items()})
    write_json(evidence/'summary.json',summary)
    print(summary)

if __name__=='__main__':
    run()
