"""TR-001: step-icon registration, packing and rendered acceptance gates.

Missing integrator renders/pack skip acceptance explicitly; partial sets fail.
Synthetic fixture pixels exercise metadata only, never visual acceptance.
"""
import copy
import itertools
import json
from pathlib import Path
import sys
import tempfile
import unittest
from PIL import Image
import pipeline as P
import step_icon_sheets as S

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'blender'))
import step_icon_geometry as G


def aligned(mask, size):
    points = {(i % size, i // size) for i in mask}
    left = min(x for x,y in points)
    top = min(y for x,y in points)
    return {(x-left,y-top) for x,y in points}


class StepIconTests(unittest.TestCase):
    def setUp(self):
        self.source = P.ROOT/'assets/src'
        self.config = P.load_config(self.source/'pipeline.json')
        self.group = next(g for g in self.config['sets'] if g['id'] == S.SET)
        self.job = next(j for j in self.config['renders'] if j['id'] == 'step-icons')

    def test_registration_and_stale_inputs(self):
        self.assertEqual(self.group['encoding'],'lossless')
        self.assertEqual(self.group['anchors'],['centre'])
        self.assertEqual(self.group['frameFiles'],[G.FOLDER+'/frames.json'])
        expected = {G.specification(k)['file'] for k in G.KINDS}|{G.FOLDER+'/frames.json'}
        self.assertEqual(set(self.job['outputs']),expected)
        self.assertIn(S.SET,self.config['rounds']['tabao-rush'])
        digest = P.render_job(self.job,self.source)[3]
        for dep in ['tools/blender/'+self.job['script']]+self.job['extraInputs']:
            def changed(path):
                return path.read_bytes()+(b'\n' if path == (P.ROOT/dep).resolve() else b'')
            self.assertNotEqual(digest,P.render_job(self.job,self.source,read_bytes=changed)[3])
        altered = copy.deepcopy(self.job)
        altered['args'] = ['changed']
        self.assertNotEqual(digest,P.render_job(altered,self.source)[3])

    def test_pack_contract(self):
        with tempfile.TemporaryDirectory() as tmp:
            source,dist = Path(tmp)/'src',Path(tmp)/'dist'
            (source/G.FOLDER).mkdir(parents=True)
            for i,kind in enumerate(G.KINDS):
                image = Image.new('RGBA',(34,34))
                image.putpixel((2+i,10),(142,42,24,255))
                image.save(source/G.specification(kind)['file'])
            P.write_json(source/G.FOLDER/'frames.json',[G.specification(k) for k in G.KINDS])
            manifest = P.pack(dict(sets=[self.group],rounds={'icons':[S.SET]},powerOfTwo=False),source,dist)
            for detail,size in [('full',34),('half',17)]:
                frames = S.packed_frames(dist,manifest,detail)
                self.assertEqual(set(frames),set(G.KINDS))
                self.assertTrue(all(im.size == (size,size) for im in frames.values()))
                if detail == 'half':
                    for image in frames.values():
                        self.assertEqual(image.getchannel('A').getextrema(),(0,255))
                        self.assertTrue(all((r,g,b) == (142,42,24)
                                            for r,g,b,a in image.getdata() if a))
            records = {k:f for a in manifest['atlases'] for k,f in a['frames'].items()}
            for f in records.values():
                self.assertEqual(f['sourceSize'],[34,34])
                self.assertEqual(f['anchor'],[17,17])
                self.assertEqual(f['anchors'],{'centre':[17,17]})

    def assert_pixels(self,frames):
        masks = {}
        for kind,image in frames.items():
            native = image.getchannel('A').resize((34,34),Image.Resampling.NEAREST)
            masks[kind] = {i for i,a in enumerate(native.getdata()) if a > 128}
        for kind,image in frames.items():
            with self.subTest(glyph=kind):
                self.assertIn(image.size,[(34,34),(17,17)])
                alpha = image.getchannel('A')
                self.assertEqual(alpha.getextrema(),(0,255))
                bounds = alpha.getbbox()
                self.assertIsNotNone(bounds)
                l,t,r,b = bounds
                self.assertGreaterEqual(min(l,t,image.width-r,image.height-b),
                                        2 if image.width == 34 else 1,
                                        'Glyph touches required clear margin')
                self.assertTrue(any(a == 255 for *_,a in image.getdata()))
                self.assert_ink(image)
        for a,b in itertools.combinations(G.KINDS,2):
            self.assert_distinct(masks[a],masks[b])

    def assert_ink(self, image):
        for red,green,blue,a in image.getdata():
            if a > 0:
                self.assertTrue(all(abs(c-target) <= 6 for c,target in
                                    zip((red,green,blue),(142,42,24))))

    def assert_distinct(self, a, b):
        self.assertGreaterEqual(len(aligned(a,34)^aligned(b,34))/34**2,
                                G.MIN_DIFFERENCE)

    def test_duplicate_and_shifted_duplicate_fail(self):
        mask = G.silhouette('bowl')
        for shift in (0,2):
            with self.subTest(shift=shift), self.assertRaises(AssertionError):
                self.assert_distinct(mask,{i+shift for i in mask})

    def test_blue_antialiased_pixels_fail(self):
        image = Image.new('RGBA',(34,34),(142,42,24,0))
        image.putpixel((10,10),(142,42,24,255))
        for alpha in (1,128,254):
            image.putpixel((11,10),(0,0,255,alpha))
            with self.subTest(alpha=alpha), self.assertRaises(AssertionError):
                self.assert_ink(image)

    def test_rendered_sources(self):
        folder = self.source/G.FOLDER
        if not any(folder.glob('*.png')):
            self.skipTest('PENDING: integrator renders step-icons')
        self.assertEqual(P.read_json(folder/'frames.json'),[G.specification(k) for k in G.KINDS])
        frames = {}
        for kind in G.KINDS:
            with Image.open(folder/f'{kind}.png') as im:
                self.assertEqual(im.size,(34,34))
                frames[kind] = im.convert('RGBA')
        self.assert_pixels(frames)

    def test_packed_pixels_and_round_budgets(self):
        dist = P.ROOT/'assets/dist'
        if not (dist/'manifest.json').exists():
            self.skipTest('PENDING: integrator packs round')
        manifest = P.read_json(dist/'manifest.json')
        if S.SET not in manifest['sets']:
            self.skipTest('PENDING: integrator packs step-icons with round')
        self.assertIn(S.SET,manifest['rounds']['tabao-rush']['sets'])
        for detail in ('full','half'):
            with self.subTest(detail=detail):
                self.assert_pixels(S.packed_frames(dist,manifest,detail))
                # Pipeline check also recounts files, bytes and GPU totals.
                totals = manifest['rounds']['tabao-rush']['totals'][detail]
                self.assertLessEqual(totals['bytes'],P.DOWNLOAD)
                self.assertLessEqual(totals['gpuBytes'],P.DECODED)
        P.check(dist/'manifest.json')
