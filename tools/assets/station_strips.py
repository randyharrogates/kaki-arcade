"""A-05 / TR-030, TR-031, TR-010: post-render visual review, never a visual pass.

Run after station jobs. Reconstruct full source canvases, independent of packing.
"""
import argparse
import json
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageOps

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'blender'))
import station_geometry as G

ROOT = Path(__file__).resolve().parents[2]


def food_id(kind, state):
    if kind in ('pot', 'rice') or state not in ('working', 'done', 'burning'):
        return None  # Closed vessels hide contents.
    if kind == 'plating':
        return 'dish-chicken-rice-plated'
    if kind == 'sink':
        return 'container-plate-dirty' if state == 'working' else 'container-plate-clean'
    base = {'wok': 'kway-teow', 'grill': 'satay', 'chop': 'cucumber',
            'drinks': 'kopi', 'plating': 'rice', 'sink': 'rice'}.get(kind)
    if not base:
        return None
    stage = ('burnt' if state == 'burning' else
             ('chopped' if kind == 'wok' else 'raw') if state == 'working' else
             'chopped' if kind == 'chop' else 'cooked')
    return 'item-'+base+'-'+stage


def budget_cost(dist):
    manifest = json.loads((dist/'manifest.json').read_text())
    pages = [a for a in manifest['atlases'] if a['set'] == 'tabao-rush-stations']
    total = manifest['rounds']['tabao-rush']['totals']['full']
    station = {d: {k: sum(a[d][k] for a in pages) for k in ('bytes','gpuBytes')}
               for d in ('full','half')}
    return station, total


def cost_text(total, delta=0, gpu_delta=0):
    return (f"PERF-023: {total['bytes']+delta:,}/8,000,000 B; "
            f"PERF-024: {total['gpuBytes']+gpu_delta:,}/256,000,000 B")



def packed_reader(dist, detail='half'):
    manifest = json.loads((dist/'manifest.json').read_text())
    def read(folder, ident):
        key = 'station-'+ident
        atlas = next(a for a in manifest['atlases'] if key in a['frames'])
        frame = atlas['frames'][key]
        factor = 2 if detail == 'half' else 1
        x,y,w,h = [v//factor for v in frame['rect']]
        with Image.open(dist/atlas[detail]['file']) as page:
            crop = page.convert('RGBA').crop((x,y,x+w,y+h))
        canvas = Image.new('RGBA', tuple(v//factor for v in frame['sourceSize']))
        canvas.alpha_composite(crop, tuple(v//factor for v in frame['trim']))
        return canvas.resize(tuple(v*factor for v in canvas.size), Image.Resampling.NEAREST)
    return read


def compose(source, kind, state, fraction=.5, sample=0, progress_offset=0, food=False,
            polarity=None, cue_variant='drawn', reader=None, fire=None, steam=None):
    def read(folder, ident):
        if reader:
            return reader(folder, ident)
        with Image.open(source/'tabao-rush/stations'/folder/(ident+'.png')) as image:
            return image.convert('RGBA')
    image = read(kind, kind)
    ident = food_id(kind, state) if food else None
    if ident:
        with Image.open(source/'tabao-rush/items'/(ident+'.png')) as item:
            item = item.convert('RGBA')
            config_path = source/'pipeline.json'
            # Tests may use a small synthetic item; production always uses its declared anchor.
            anchor = [item.width/2, item.height/2]
            if config_path.exists():
                config = json.loads(config_path.read_text())
                frame = next(f for g in config['sets'] for f in g.get('frames', [])
                             if f['id'] == ident)
                anchor = frame['anchor']
            x, y = G.specification(kind, '')['anchors']['item']
            image.alpha_composite(item, (round(x-anchor[0]), round(y-anchor[1])))
    if state == 'burning':
        image.alpha_composite(read('overlays', 'smoke-'+str(sample)))
    if state == 'on-fire' and fire:
        with Image.open(fire) as effect:
            x,y = G.specification(kind, '')['anchors']['fire']
            image.alpha_composite(effect.convert('RGBA'), (x-48,y-77))
    if state == 'working' and kind in G.AUTOMATIC and steam:
        with Image.open(steam) as effect:
            x,y = G.specification(kind, '')['anchors']['effect']
            layer = Image.new('RGBA', image.size)
            layer.alpha_composite(effect.convert('RGBA'), (round(x-32),round(y-53)))
            image.alpha_composite(layer)
    if state == 'working':
        track = read('overlays', 'progress-track')
        image.alpha_composite(track, (0,progress_offset))
        for i in range(G.progress_count(fraction)):
            layer = read('overlays', 'progress-'+str(i))
            if polarity:
                colour = Image.new('RGBA', layer.size, G.PALETTE[polarity])
                colour.putalpha(layer.getchannel('A')); layer = colour
            image.alpha_composite(layer, (0,progress_offset))
    if state and not (state == 'on-fire' and cue_variant == 'no-fire'):
        cue = read('overlays','cue-'+state)
        if cue_variant == 'phi':
            cue = read('phi', 'cue-'+state)
        image.alpha_composite(cue)
    return image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT/'assets/src')
    parser.add_argument('--dist', type=Path, default=ROOT/'assets/dist')
    parser.add_argument('--steam', type=Path, required=True,
                        help='A-07 steam-3.png for static working sheets; mostly occluded by cue/bar')
    parser.add_argument('--board', type=Path, default=ROOT/'design-gate/A-05-station-cues')
    parser.add_argument('--fire', type=Path, required=True, help='A-07 fire PNG, 96px with origin [48,77]')
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    # Fail if any layer/frame is absent, before publishing a partial review.
    station_cost, total = budget_cost(args.dist)
    def play(kind, state, **kwargs):
        return compose(args.source, kind, state, food=True, fire=args.fire, steam=args.steam, **kwargs)
    cells = {(k,s): play(k,s) for k in G.FIXTURES for s in G.states(k)}
    effects = [play('wok',s,sample=i) for s in ('burning',) for i in range(4)]
    progress = [play('chop','working',fraction=i/8) for i in range(9)]
    args.out.mkdir(parents=True, exist_ok=True)
    for theme, bg, fg in [('light','#FBF7F0','#2B2118'),('dark','#2B2118','#F4F1E8')]:
        for scale in (1,4):
            sheet = Image.new('RGB', (5*192*scale, len(G.FIXTURES)*226*scale), bg)
            draw = ImageDraw.Draw(sheet)
            for row,k in enumerate(G.FIXTURES):
                for col,s in enumerate(G.STATES):
                    x,y=col*192*scale,row*226*scale
                    draw.text((x+5,y+5),k if k == 'ingredient-crate' else k+' / '+s,fill=fg)
                    if k == 'ingredient-crate' and col == 0:
                        image=compose(args.source,k,None).resize((192*scale,192*scale),Image.Resampling.NEAREST)
                        sheet.paste(image,(x,y+34*scale),image)
                        draw.text((x+5,y+20),'body only',fill=fg)
                    elif (k,s) in cells:
                        image=cells[k,s].resize((192*scale,192*scale),Image.Resampling.NEAREST)
                        sheet.paste(image,(x,y+34*scale),image)
                    else:
                        draw.text((x+5,y+55*scale),'no such state',fill=fg)
            sheet.save(args.out/f'stations-{theme}-{scale}x.png')
        # Native 120 px/tile in a full 1080p frame: display full-screen, view at 3 m.
        for state in G.STATES:
            tv = Image.new('RGB',(1920,1080),bg)
            draw = ImageDraw.Draw(tv)
            draw.text((55,55),'TR-030 / TR-031: '+state+' / 120 px per tile; full-screen at 3 m',fill=fg)
            for row,k in enumerate(G.FIXTURES):
                x=55+(row%6)*300; y=130+(row//6)*270
                draw.text((x,y),k,fill=fg)
                if k == 'ingredient-crate':
                    image=compose(args.source,k,None); tv.paste(image,(x,y+34),image)
                    draw.text((x,y+20),'body only',fill=fg)
                elif (k,state) in cells:
                    image=cells[k,state]; tv.paste(image,(x,y+34),image)
                else:
                    draw.text((x,y+89),'no such state',fill=fg)
            tv.save(args.out/f'tv-3m-{state}-{theme}.png')
            ImageOps.grayscale(tv).save(args.out/f'tv-3m-{state}-{theme}-greyscale.png')
        sheet=Image.new('RGB',(9*192,226*2),bg)
        draw=ImageDraw.Draw(sheet)
        for row,frames in enumerate((progress,effects)):
            for i,image in enumerate(frames):
                draw.text((i*192+5,row*226+5),('progress ' if row==0 else 'effect ')+str(i),fill=fg)
                sheet.paste(image,(i*192,row*226+34),image)
        sheet.save(args.out/f'overlays-{theme}.png')
        ImageOps.grayscale(sheet).save(args.out/f'overlays-{theme}-greyscale.png')
        # Choice 1: four fixtures, both placements, and both positive polarities.
        options=Image.new('RGB',(1100,2450),bg)
        draw=ImageDraw.Draw(options)
        draw.text((5,5),'Choice 1: A covers only the top edge of food; B crosses the middle.',fill=fg)
        variants = [('A / ink',0,'ink'),('B / ink (89:55)',21,'ink'),
                    ('A / cream on ink',0,'cream'),('A / gold (shipped)',0,None),
                    ('B / cream on ink',21,'cream'),('B / ink repeat',21,'ink')]
        for row,(label,offset,polarity) in enumerate(variants):
            draw.text((5,30+row*215),label,fill=fg)
            for col,kind in enumerate(('wok','pot','rice','plating')):
                image=play(kind,'working',fraction=.625,progress_offset=offset, polarity=polarity)
                options.paste(image,(180+col*200,35+row*215),image)
                draw.text((180+col*200,30+row*215),kind,fill=fg)
        draw.text((5,1340),'Choice 2: drawn / no on-fire cue: A-07 flame silhouette is the cue / phi plaque',fill=fg)
        for col,variant in enumerate(('drawn','no-fire','phi')):
            draw.text((5,1360+col*215),variant,fill=fg)
            for i,state in enumerate(G.STATES):
                image=play('wok',state,cue_variant=variant)
                options.paste(image,(i*210,1380+col*215),image)
        captions = [
            'Phi: Blender plaque 68:42 / inner 55:34; light outer edge. Tall fixtures overlap cues.',
            'Exceptions: drawn 42/34px, 4px border; 10.5px cell pitch. B separation 55px.',
            f"Station full {station_cost['full']['bytes']:,} B / {station_cost['full']['gpuBytes']:,} B decoded; half {station_cost['half']['bytes']:,} B / {station_cost['half']['gpuBytes']:,} B.",
            'A/B same pack: '+cost_text(total),
            'Cream/gold/phi replacement estimate +/-1 KB: '+cost_text(total,1000),
            'Choice 3 loop (four packed frames): '+cost_text(total),
            'Still replacement estimate: see HTML; repack needed for exact savings.',
            'A-07: assets/src/tabao-rush/effects/fire/fire-0.png']
        for i,line in enumerate(captions): draw.text((5,2050+i*23),line,fill=fg)
        draw.text((5,2233),'smoke-2 (still)',fill=fg)
        draw.text((220,2233),'smoke-1 (loop)',fill=fg)
        still=play('wok','burning',sample=2)
        options.paste(still,(5,2253),still)
        loop=[]
        for i in range(4):
            frame=Image.new('RGB',(192,192),bg)
            layer=play('wok','burning',sample=i); frame.paste(layer,(0,0),layer); loop.append(frame)
        # GIF stores centiseconds: alternate 120/130 ms for 125 ms average (8 fps).
        loop[0].save(args.out/f'smoke-loop-{theme}.gif',save_all=True,append_images=loop[1:],duration=[120,130,120,130],loop=0)
        still_frame=Image.new('RGB',(192,192),bg)
        still_frame.paste(still,(0,0),still)
        still_frame.save(args.out/f'smoke-still-{theme}.png')
        options.paste(loop[1],(220,2253))
        for scale in (1,4):
            board=options.resize((1100*scale,2450*scale),Image.Resampling.NEAREST)
            board.save(args.out/f'choices-{theme}-{scale}x.png')
            ImageOps.grayscale(board).save(args.out/f'choices-{theme}-{scale}x-greyscale.png')
        half=Image.new('RGB',(9*192,226),bg)
        draw=ImageDraw.Draw(half)
        reader=packed_reader(args.dist)
        for i in range(9):
            draw.text((i*192+5,5),f'{i}/8 packed half at 2x',fill=fg)
            frame=compose(args.source,'chop','working',fraction=i/8,reader=reader)
            half.paste(frame,(i*192,34),frame)
        half.save(args.out/f'progress-half-{theme}.png')
        ImageOps.grayscale(half).save(args.out/f'progress-half-{theme}-greyscale.png')
        # Every kind/state also has a greyscale native-size sheet.
        with Image.open(args.out/f'stations-{theme}-1x.png') as native:
            ImageOps.grayscale(native).save(args.out/f'stations-{theme}-greyscale.png')

    publish_board(args.board, args.out, station_cost, total, args.dist)


def publish_board(board, out, station, total, dist):
    import shutil
    from html import escape
    board.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((dist/'manifest.json').read_text())
    frames = [f for a in manifest['atlases'] if a['set'] == 'tabao-rush-stations'
              for key,f in a['frames'].items() if key in ('station-smoke-1','station-smoke-2','station-smoke-3')]
    removed = sum((f['rect'][2]+4)*(f['rect'][3]+4)*4 for f in frames)
    saving = round(station['full']['bytes'] * removed / station['full']['gpuBytes'])
    rows = []
    for theme in ('light','dark'):
        for name in (f'choices-{theme}-1x.png',f'smoke-still-{theme}.png',f'smoke-loop-{theme}.gif'):
            shutil.copyfile(out/name, board/name)
        sections = []
        with Image.open(out/f'choices-{theme}-1x.png') as sheet:
            for title, labels, start, top in [
                ('Choice 1: bar', ['A / ink','B / ink (89:55)','A / cream','A / gold (shipped)','B / cream','B / ink repeat'], 30, 5),
                ('Choice 2: cue', ['Drawn square','No on-fire cue','φ plaque'], 1360, 20)]:
                cards=[]
                for i,label in enumerate(labels):
                    name=f'{theme}-choice-{1 if top == 5 else 2}-{i}.png'
                    sheet.crop((0,start+i*215,1100,start+(i+1)*215)).save(board/name)
                    replacement = ('shipped' not in label) if top == 5 else label != 'Drawn square'
                    cost = cost_text(total,1000 if replacement else 0)
                    estimate = 'Replacement estimate ±1 KB, same decoded canvas. ' if replacement else 'Current pack baseline: shipped render. '
                    ratio = ('φ: 89 px track / 55 px separation.' if label.startswith('B') else
                             'φ: outer 68:42 and inner 55:34.' if 'φ' in label else
                             'No φ proportions; drawn square cue.' if top == 20 else
                             'No φ proportions; 89 px track.' )
                    cards.append(f'<figure><img class="option" src="{name}" alt="{escape(label)}"><figcaption>{escape(label)}: {ratio} {estimate}{cost}</figcaption></figure>')
                sections.append(f'<h3>{title}</h3><div class="options">'+''.join(cards)+'</div>')
        rows.append(f'<h2>{theme}</h2>'+''.join(sections)+
                    f'<h3>Choice 3: smoke</h3><div class="options"><figure><img src="smoke-still-{theme}.png" alt="Burnt-food smoke, smoke-2 (still)"><figcaption>Still / reduced motion. No φ proportions. Estimated replacement: {cost_text(total,-saving,-removed)}</figcaption></figure>'
                    f'<figure><picture><source media="(prefers-reduced-motion: reduce)" srcset="smoke-still-{theme}.png"><img src="smoke-loop-{theme}.gif" alt="Burnt-food smoke rising over four frames"></picture><figcaption>Four frames at 8 fps. No φ proportions. {cost_text(total)}</figcaption></figure></div>')
    (board/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>A-05 station choices</title>'
        '<style>body{font:16px system-ui;background:#f4f1e8;color:#2b2118;margin:34px;background-image:radial-gradient(#c7a16a33 1px,transparent 1px);background-size:13px 13px}.board{max-width:100%;image-rendering:pixelated}.options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:21px}figure{margin:0}.option{width:100%}img{image-rendering:pixelated}</style>'
        '<h1>A-05 / TR-030, TR-031, TR-010</h1><p>Round 8: selected bar A with gold cells and empty-cell ink marks, drawn cue, four-frame smoke loop (reduced motion: smoke-2). '
        'Alternatives retained as board-only comparisons. '
        'Steam rises behind the bar and plaque, without clipping or fading; tall-fixture scene review required. '
        'All estimates use the current manifest baseline; replacement colours/plaque ±1 KB transfer, same decoded canvas. '
        'Still savings estimate uses removed padded frame area and current page compression; exact costs require repacking. '
        'A-07 fire: assets/src/tabao-rush/effects/fire/fire-0.png.</p>'+''.join(rows))


if __name__ == '__main__':
    main()
