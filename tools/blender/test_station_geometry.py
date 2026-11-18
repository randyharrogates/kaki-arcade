"""A-05 pure authoring bounds and simulation coverage checks."""
import ast
import math
from pathlib import Path
import re
import unittest
import station_geometry as G


class StationGeometryTests(unittest.TestCase):
    def test_simulation_kinds_and_safety(self):
        root = Path(__file__).resolve().parents[2]
        text = (root/'games/tabao-rush/src/rules/state.ts').read_text()
        union = re.search(r'export type StationType = (.*);', text)[1]
        self.assertEqual(set(re.findall(r"'([^']+)'", union)), set(G.KINDS))
        rules = (root/'games/tabao-rush/src/rules/stations.ts').read_text()
        safe = re.search(r'const SAFE = .*?\[(.*?)\]', rules)[1]
        self.assertEqual(set(re.findall(r"'([^']+)'", safe)), set(G.SAFE)-{'ingredient-crate'})

    def test_shapes_distinct_and_contained(self):
        signatures = set()
        for kind in G.FIXTURES:
            parts = G.geometry(kind)
            signatures.add(repr(parts))
            for part in parts:
                self.assertIn(part['colour'], G.PALETTE)
                self.assertTrue(all(v > 0 for v in part['size']))
                # Check projected extreme corners (sphere sizes are radii).
                radii = [v/(2 if part['shape']=='box' else 1) for v in part['size']]
                for sign in range(8):
                    point = [v+r*(1 if sign & (1<<i) else -1)
                             for i,(v,r) in enumerate(zip(part['at'],radii))]
                    self.assertTrue(all(0 <= c <= G.SIZE for c in G.project(point)), (kind,point))
        self.assertEqual(len(signatures),len(G.FIXTURES))

    def test_layer_references_and_metadata(self):
        ids = {'station-'+i for i in G.overlay_ids()}
        for kind in G.FIXTURES:
            frame = G.specification(kind,'test')
            self.assertEqual(frame['footprint'],[-.5,-.5,1,1])
            self.assertEqual(frame['anchor'],[96,128])
            for layers in frame['stateLayers'].values():
                self.assertTrue(set(layers) <= ids)
            self.assertEqual('on-fire' in frame['supportedStates'], kind not in G.SAFE)
        self.assertEqual(len(ids),18)

    def test_billboard_projection_and_depth(self):
        for x,y in ((96,24),(96,58),(59,58),(132.5,58)):
            for depth in (2,2.025,2.05):
                self.assertEqual(G.project(G.screen_point(x,y,depth)),[x,y])

    def test_progress_and_animation(self):
        self.assertEqual([G.progress_count(i/8) for i in range(9)],list(range(9)))
        self.assertEqual(G.progress_count(-1),0)
        self.assertEqual(G.progress_count(2),8)
        for effect in ('smoke',):
            frames = [G.effect_lobes(effect,i) for i in range(4)]
            self.assertEqual(len({repr(f) for f in frames}),4)
            for frame in frames:
                for point,size in frame:
                    self.assertTrue(all(math.isfinite(v) for v in (*point,*size)))

    def test_passive_states_and_single_fire_owner(self):
        self.assertEqual(G.states('ingredient-crate'), ())
        for kind in ('serving', 'dish-rack', 'return-counter'):
            self.assertEqual(G.states(kind), ('empty',))
        self.assertEqual(G.metadata('wok')['stateLayers']['on-fire'], ['station-cue-on-fire'])
        frames = [G.effect_lobes('smoke', i) for i in range(4)]
        self.assertGreater(frames[3][0][1][0], frames[0][0][1][0])
        self.assertGreaterEqual(G.project(frames[0][0][0])[1]-G.project(frames[3][0][0])[1],13)

    def test_billboard_authoring_and_closed_hourglass(self):
        tree = ast.parse(Path(__file__).with_name('stations.py').read_text())
        paths = next(n.value for n in ast.walk(tree) if isinstance(n, ast.Assign)
                     and any(isinstance(t, ast.Name) and t.id == 'paths' for t in n.targets))
        glyphs = ast.literal_eval(paths)
        for path in glyphs['on-fire']:
            for _, y in path:
                self.assertGreaterEqual(y+10-2, 11)
                self.assertLessEqual(y+10+2, 37)
        working = glyphs['working'][0]
        self.assertEqual(working[0], working[-1])
        self.assertEqual(len(working), 5)
        screen_box = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'screen_box')
        call = next(n for n in ast.walk(screen_box) if isinstance(n, ast.Call)
                    and isinstance(n.func, ast.Attribute) and n.func.attr == 'rbox')
        self.assertIn('rot', [k.arg for k in call.keywords])
        self.assertNotIn('rotation_euler', ast.unparse(screen_box))

    def test_effect_boxes_clear_plaque_for_every_burnable_kind(self):
        from PIL import Image
        root = Path(__file__).resolve().parents[2]/'assets/src/tabao-rush/effects'
        plaque = (G.PLAQUE_COLUMNS[0], G.PLAQUE_ROWS[0],
                  G.PLAQUE_COLUMNS[1], G.PLAQUE_ROWS[1])
        def intersects(a,b):
            return a[0]<b[2] and b[0]<a[2] and a[1]<b[3] and b[1]<a[3]
        for kind in G.KINDS:
            anchors = G.specification(kind,'')['anchors']
            self.assertEqual(anchors['effect'], [96,77])
            if 'on-fire' in G.states(kind):
                files = list((root/'fire').glob('fire-*.png'))
                self.assertEqual(len(files),4)
                for file in files:
                    with Image.open(file) as image:
                        x0,y0,x1,y1 = image.getchannel('A').getbbox()
                    x,y = anchors['fire']
                    bounds = (x+x0-48,y+y0-77,x+x1-48,y+y1-77)
                    self.assertFalse(intersects(bounds,plaque),(kind,file,bounds))
                    # On-fire has no progress bar: fire and progress never coexist.
            if 'working' in G.states(kind):
                for group,origin in [('steam',(32,53)),('sparks',(32,48))]:
                    if group == 'steam' and kind not in G.AUTOMATIC:
                        continue
                    files = list((root/group).glob('*.png'))
                    self.assertEqual(len(files),4)
                    for file in files:
                        with Image.open(file) as image:
                            a,b,c,d = image.getchannel('A').getbbox()
                        x,y = anchors['effect']
                        bounds = (x+a-origin[0],y+b-origin[1],x+c-origin[0],y+d-origin[1])
                        # Exact current merged A-07 nonzero-alpha boxes.
                        expected = {
                            'steam-0': (86,35,113,73), 'steam-1': (81,33,110,76),
                            'steam-2': (80,32,111,75), 'steam-3': (79,30,112,74),
                            'sparks-0': (90,53,116,72), 'sparks-1': (87,52,109,75),
                            'sparks-2': (82,52,106,74), 'sparks-3': (77,52,111,73)}
                        self.assertEqual(bounds, expected[file.stem], (kind,file))
                        self.assertNotIn('effectClip', G.metadata(kind))
                        self.assertNotIn('effectFade', G.metadata(kind))
            if 'burning' in G.states(kind):
                for frame in range(4):
                    points = [G.project([v+r*(1 if sign & (1<<i) else -1)
                              for i,(v,r) in enumerate(zip(at,size))])
                              for at,size in G.effect_lobes('smoke',frame) for sign in range(8)]
                    bounds = (min(p[0] for p in points),min(p[1] for p in points),
                              max(p[0] for p in points),max(p[1] for p in points))
                    self.assertFalse(intersects(bounds,plaque),bounds)
        self.assertEqual(G.states('bin'),('empty','on-fire'))
        for kind in ('chop','drinks','sink','plating'):
            self.assertEqual(G.states(kind),('empty','working','done','on-fire'))
        for kind in G.AUTOMATIC:
            self.assertEqual(G.states(kind),G.STATES)
