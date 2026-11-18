"""A-05 pipeline integration: source fingerprints, metadata and bounded atlas sizes.
Synthetic pixels validate plumbing only; integrator measures real rendered bytes.
"""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from PIL import Image
import pipeline as P
import station_strips as S

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'blender'))
import station_geometry as G


class StationPipelineTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((P.ROOT/'assets/src/pipeline.json').read_text())
        self.group = next(g for g in self.config['sets'] if g['id']=='tabao-rush-stations')
        self.jobs = [j for j in self.config['renders'] if j['id'].startswith('station-')]

    def test_jobs_and_fingerprints(self):
        self.assertEqual(len(self.jobs),15)
        for job in self.jobs:
            record = P.render_job(job,P.ROOT/'assets/src')
            self.assertIn('station_geometry.py', ' '.join(job['extraInputs']))
            for dependency in ['tools/blender/'+job['script']] + job['extraInputs']:
                def changed(path):
                    return path.read_bytes()+(b'\n' if path == (P.ROOT/dependency).resolve() else b'')
                self.assertNotEqual(record[3],P.render_job(job,P.ROOT/'assets/src',read_bytes=changed)[3],dependency)
            altered=copy.deepcopy(job); altered['args'] += ['changed']
            self.assertNotEqual(record[3],P.render_job(altered,P.ROOT/'assets/src')[3])
        for members in self.config['rounds'].values():
            members = members if isinstance(members,list) else members['sets']
            if 'tabao-rush-items' in members:
                self.assertIn('tabao-rush-stations',members)

    def test_phi_is_never_packed(self):
        phi = next(j for j in self.jobs if j['id'] == 'station-phi')
        self.assertNotIn('boardOnly', phi)
        for group in self.config['sets']:
            self.assertFalse(set(phi['outputs']) & set(group.get('frameFiles', [])))
            self.assertFalse(any('/stations/phi/' in f for f in group.get('frameFiles', [])))

    def test_pack_metadata_half_detail_and_budget(self):
        with tempfile.TemporaryDirectory() as temp:
            source=Path(temp)/'source'; output=Path(temp)/'output'
            for job in self.jobs:
                kind=job['args'][1]
                if '--plaque' in job['args']:
                    continue  # Review-only replacement, never added to runtime atlas.
                folder='tabao-rush/stations/'+kind
                ids=G.overlay_ids() if kind=='overlays' else [kind]
                (source/folder).mkdir(parents=True)
                frames=[]
                for i,ident in enumerate(ids):
                    frame=G.specification(ident,folder); frames.append(frame)
                    # Vary colour to avoid canonical sharing of fixture frames.
                    Image.new('RGBA',(192,192),(80+i*5,40,20,255)).save(source/frame['file'])
                P.write_json(source/folder/'frames.json',frames)
            config=dict(sets=[self.group],rounds={'stations':['tabao-rush-stations']},powerOfTwo=False)
            manifest=P.pack(config,source,output)
            records={k:v for a in manifest['atlases'] for k,v in a['frames'].items()}
            self.assertEqual(len(records),31)
            self.assertEqual(records['station-wok']['metadata']['footprint'],[-.5,-.5,1,1])
            self.assertEqual(records['station-wok']['metadata']['layerOrder'], ['body','food','fire','effect','progress','cue'])
            self.assertEqual(records['station-smoke-0']['metadata']['reducedMotionFrame'], 'station-smoke-2')
            self.assertIn('fire', self.group['anchors'])
            for atlas in manifest['atlases']:
                for dimension in ('width','height'):
                    self.assertLessEqual(atlas['full'][dimension],2048)
                    self.assertEqual(atlas['half'][dimension]*2,atlas['full'][dimension])
            full=sum(a['full']['width']*a['full']['height']*4 for a in manifest['atlases'])
            self.assertLess(full,16*1024*1024)
            self.assertEqual(manifest['sets']['tabao-rush-stations']['encoding'],'lossless')

    def test_rendered_overlay_anchor_pixels(self):
        folder = P.ROOT/'assets/src/tabao-rush/stations/overlays'
        if not (folder/'frames.json').exists():
            self.skipTest('Integrator must render station-overlays first')
        frames = json.loads((folder/'frames.json').read_text())
        for frame in frames:
            ident = frame['overlay']
            if not (ident.startswith('cue-') or ident == 'progress-track'):
                continue
            with self.subTest(overlay=ident), Image.open(P.ROOT/'assets/src'/frame['file']) as image:
                bounds = image.convert('RGBA').getchannel('A').getbbox()
                self.assertIsNotNone(bounds)
                left, top, right, bottom = bounds
                anchor = frame['anchors']['cue' if ident.startswith('cue-') else 'progress']
                self.assertLessEqual(abs((left+right-1)/2-anchor[0]), 2)
                self.assertLessEqual(abs((top+bottom-1)/2-anchor[1]), 2)
                self.assertGreaterEqual(min(left, top, image.width-right, image.height-bottom), 1)

    def test_food_loaded_choices_and_fire_ownership(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp)
            for folder, ident, colour in [('wok','wok',(0,0,0,0)),
                    ('overlays','cue-working',(0,0,0,0)),
                    ('overlays','cue-on-fire',(0,0,0,0)),
                    ('overlays','progress-track',(0,0,0,0))]:
                path = source/'tabao-rush/stations'/folder
                path.mkdir(parents=True, exist_ok=True)
                Image.new('RGBA',(192,192),colour).save(path/(ident+'.png'))
            items = source/'tabao-rush/items'
            items.mkdir(parents=True)
            Image.new('RGBA',(8,8),(255,0,0,255)).save(items/'item-kway-teow-chopped.png')
            (source/'pipeline.json').write_text(json.dumps({'sets': [{'frames': [
                {'id': 'item-kway-teow-chopped', 'anchor': [1,2]}]}]}))
            image = S.compose(source,'wok','working',fraction=0,food=True)
            self.assertEqual(image.getpixel((95,75)), (255,0,0,255))
            self.assertEqual(image.getpixel((94,75)), (0,0,0,0))
            # No A-05 flame file exists: on-fire must still compose successfully.
            S.compose(source,'wok','on-fire')


class StationReviewTests(unittest.TestCase):
    def test_food_follows_vessel_and_state(self):
        for kind in ('pot','rice'):
            for state in G.STATES:
                self.assertIsNone(S.food_id(kind,state))
        self.assertEqual(S.food_id('wok','burning'),'item-kway-teow-burnt')
        self.assertEqual(S.food_id('grill','done'),'item-satay-cooked')
        self.assertEqual(S.food_id('chop','working'),'item-cucumber-raw')
        self.assertEqual(S.food_id('plating','done'),'dish-chicken-rice-plated')
        self.assertEqual(S.food_id('sink','working'),'container-plate-dirty')
        self.assertEqual(S.food_id('drinks','done'),'item-kopi-cooked')
        self.assertEqual(S.food_id('drinks','working'),'item-kopi-raw')
        self.assertEqual(S.food_id('grill','working'),'item-satay-raw')
        self.assertEqual(S.food_id('wok','working'),'item-kway-teow-chopped')
        self.assertEqual(G.specification('drinks','')['anchors']['item'],[96,101])

    def test_board_publishes_adjacent_options_and_manifest_costs(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            out, board, dist = (root/name for name in ('out','board','dist'))
            out.mkdir(); dist.mkdir()
            for theme in ('light','dark'):
                Image.new('RGB',(1100,2420)).save(out/f'choices-{theme}-1x.png')
                Image.new('RGB',(192,192)).save(out/f'smoke-still-{theme}.png')
                Image.new('RGB',(192,192)).save(out/f'smoke-loop-{theme}.gif')
            manifest = {'atlases':[{'set':'tabao-rush-stations','frames':{
                'station-smoke-1':{'rect':[0,0,20,20]}}}]}
            (dist/'manifest.json').write_text(json.dumps(manifest))
            S.publish_board(board,out,{'full':{'bytes':1000,'gpuBytes':10000}},
                            {'bytes':12345,'gpuBytes':67890},dist)
            html = (board/'index.html').read_text()
            self.assertIn('12,345/8,000,000',html)
            self.assertIn('67,890/256,000,000',html)
            self.assertIn('φ plaque',html)
            self.assertIn('A / gold (shipped): No φ proportions; 89 px track. Current pack baseline: shipped render.',html)
            self.assertNotIn('B gold',html)
            self.assertIn('<picture><source media="(prefers-reduced-motion: reduce)"',html)
            self.assertIn('φ: 89 px track / 55 px separation.',html)
            self.assertIn('φ: outer 68:42 and inner 55:34.',html)
            self.assertIn('±1 KB',html)
            for file in ('light-choice-1-5.png','dark-choice-2-2.png',
                         'smoke-loop-light.gif','smoke-still-dark.png'):
                self.assertTrue((board/file).exists(),file)


class StationCommittedPixelTests(unittest.TestCase):
    """Render-dependent regressions: always run on committed files, including stale renders."""
    def test_committed_progress_palette(self):
        folder = P.ROOT/'assets/src/tabao-rush/stations/overlays'
        for file, point, expected, tolerance in (
                ('progress-0', (59,58), (224,166,58), 6),
                ('progress-track', (52,58), (43,33,24), 8),
                ('progress-track', (59,58), (43,33,24), 8)):
            with self.subTest(file=file, point=point), Image.open(folder/(file+'.png')) as image:
                actual = image.convert('RGBA').getpixel(point)
                self.assertEqual(actual[3], 255)
                for got, want in zip(actual[:3], expected):
                    self.assertLessEqual(abs(got-want), tolerance,
                                         'Integrator must rerender station-overlays')

    def test_committed_plaque_ink_at_all_four_edge_midpoints(self):
        for folder in ('overlays', 'phi'):
            for state in G.STATES:
                path = P.ROOT/'assets/src/tabao-rush/stations'/folder/f'cue-{state}.png'
                with Image.open(path) as image:
                    image = image.convert('RGBA')
                    half = 34 if folder == 'phi' else 21
                    for x,y in ((96-half+2,24),(96+half-2,24),(96,5),(96,43)):
                        with self.subTest(file=str(path),edge=(x,y)):
                            r,g,b,a = image.getpixel((x,y))
                            self.assertGreater(a,200)
                            self.assertLess(max(r,g,b),100,'Ink border missing; rerender station-overlays and station-phi')

    def test_committed_working_sheets_retain_visible_unclipped_steam(self):
        source = P.ROOT/'assets/src'
        steam = source/'tabao-rush/effects/steam/steam-3.png'
        with Image.open(steam) as effect:
            alpha = Image.new('L',(192,192))
            alpha.paste(effect.getchannel('A'),(64,24))
        # Current merged A-07 steam-3: 114 / 170 / 150 / 179 pixels
        # at >=8 levels in both themes; allow 4–5 pixels of raster tolerance.
        floors = dict(wok=110, pot=165, grill=145, rice=175)
        for theme,bg in (('light','#FBF7F0'),('dark','#2B2118')):
            with Image.open(P.ROOT/f'uat/evidence/A-05-stations/rendered/stations-{theme}-1x.png') as sheet:
                for kind in G.AUTOMATIC:
                    base = Image.new('RGBA',(192,192),bg)
                    base.alpha_composite(S.compose(source,kind,'working',food=True))
                    expected = Image.new('RGBA',(192,192),bg)
                    expected.alpha_composite(S.compose(source,kind,'working',food=True,steam=steam))
                    cell = sheet.crop((192,G.FIXTURES.index(kind)*226+34,384,G.FIXTURES.index(kind)*226+226)).convert('RGB')
                    visible = 0
                    for y in range(192):
                        for x in range(192):
                            # Bar and plaque occlude steam in painter order.
                            covered = (G.BAR_COLUMNS[0] <= x < G.BAR_COLUMNS[1] and G.BAR_ROWS[0] <= y <= G.BAR_ROWS[1]) or (G.PLAQUE_COLUMNS[0] <= x < G.PLAQUE_COLUMNS[1] and G.PLAQUE_ROWS[0] <= y <= G.PLAQUE_ROWS[1])
                            if not covered and alpha.getpixel((x,y)) > 8:
                                differs = max(abs(a-b) for a,b in zip(expected.getpixel((x,y))[:3],base.getpixel((x,y))[:3])) >= 8
                                matches = max(abs(a-b) for a,b in zip(cell.getpixel((x,y)),expected.getpixel((x,y))[:3])) <= 2
                                if differs and matches:
                                    visible += 1
                    with self.subTest(kind=kind,theme=theme):
                        self.assertGreaterEqual(visible,floors[kind],'Regenerate working sheets after rendering: visible steam pixels')

    def test_committed_smoke_rises_grows_and_changes_visibly(self):
        masks=[]
        for i in range(4):
            with Image.open(P.ROOT/f'assets/src/tabao-rush/stations/overlays/smoke-{i}.png') as image:
                masks.append(image.getchannel('A').point(lambda a: 255 if a > 8 else 0))
        bounds=[m.getbbox() for m in masks]
        self.assertGreaterEqual(min(b[1] for b in bounds),G.SMOKE_MIN_Y)
        self.assertGreaterEqual(bounds[0][1]-bounds[3][1],13,'Rerender smoke: needs 13 px upward travel')
        from PIL import ImageChops
        changed=ImageChops.difference(masks[0],masks[3])
        self.assertGreaterEqual(sum(a > 0 for a in changed.getdata()),150)
