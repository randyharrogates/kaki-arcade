"""TR-064/TR-061: head frame, placement and rendered acceptance contracts."""
import copy
import ast
from array import array
import hashlib
import json
import math
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image
import cook_heads_review as R
import cook_heads_plan as plan


class CookHeadsTests(unittest.TestCase):
    def test_empty_tint_mask_validation(self):
        # Execute the production validators without importing/running Blender.
        root = Path(__file__).resolve().parents[1] / 'blender'
        def load_function(filename, name, namespace):
            tree = ast.parse((root / filename).read_text())
            functions = [n for n in tree.body
                         if isinstance(n, ast.FunctionDef) and n.name == name]
            self.assertEqual(len(functions), 1)
            exec(compile(ast.Module(body=functions, type_ignores=[]), filename, 'exec'), namespace)
        data = array('f', [1, 1, 1, 0] * 81)
        namespace = dict(pixels=lambda path: data, SIZE=9, hashlib=hashlib)
        load_function('cook.py', 'require', namespace)
        load_function('cook.py', 'validate', namespace)
        namespace['validate_nonempty'] = namespace['validate']
        load_function('cook_heads.py', 'validate', namespace)
        validate = namespace['validate']
        path = Path('head-uncle-s-mask.png')
        actual, digest = validate(path, allow_empty=True)
        self.assertEqual(actual, data)
        self.assertEqual(digest, hashlib.sha256(bytes([255, 255, 255, 0] * 81)).hexdigest())
        for allow_empty in (False, True):
            if not allow_empty:
                with self.assertRaisesRegex(RuntimeError, 'mask coverage'):
                    validate(path, allow_empty=allow_empty)
            for coverage in (1e-8, 1 / 255, .5, .98):
                data[(4 * 9 + 4) * 4 + 3] = coverage
                with self.assertRaisesRegex(RuntimeError, 'mask coverage'):
                    validate(path, allow_empty=allow_empty)
            data[(4 * 9 + 4) * 4 + 3] = 0
        with self.assertRaisesRegex(RuntimeError, 'empty frame'):
            validate(Path('head-uncle-s.png'))
        # Valid opaque interiors still pass, and clipping still fails.
        for y in range(2, 7):
            for x in range(2, 7):
                data[(y * 9 + x) * 4 + 3] = 1
        validate(path, allow_empty=True)
        data[3] = 1
        with self.assertRaisesRegex(RuntimeError, 'clipped frame'):
            validate(path, allow_empty=True)

    def test_frames_and_clips(self):
        C = R.C
        self.assertEqual(len(C.HEADS), 8)
        for h in C.HEADS:
            ids = C.head_ids(h)
            self.assertEqual(len(ids), 16)
            self.assertEqual([i.replace(h, 'cap') for i in ids], C.head_ids())
            clips = [a for a in C.head_animations() if a['action'] in (h, h+'-mask')]
            self.assertEqual(len(clips), 2)
            self.assertEqual(set(clips[0]['directions']), set(C.DIRECTIONS))
        config = R.P.read_json(R.S.SOURCE/'pipeline.cook-heads.json')
        self.assertEqual(plan.update(config), plan.update(plan.update(config)))
        merged = R.P.load_config(R.S.SOURCE/'pipeline.json')
        self.assertEqual([j for j in merged['renders'] if j['script'] == 'cook_heads.py'], C.jobs())
        group = next(g for g in merged['sets'] if g['id'] == 'tabao-rush-cook-heads')
        self.assertEqual(len(group['frameFiles']), 8)

    def test_extension_stamp_isolation(self):
        # TR-064: new head declarations must not invalidate existing render inputs.
        P = R.P
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp)
            base = dict(renders=[dict(id='legacy', script='cook.py',
                inputs=['pipeline.json'], args=[], outputs=['items.png'])], sets=[])
            path = source/'pipeline.json'
            P.write_json(path, base)
            extension = source/'pipeline.heads.json'
            head = dict(id='head', script='cook_heads.py', inputs=[],
                extraInputs=['tools/blender/cook_heads_contract.py'],
                args=['--character', 'uncle'], outputs=['head.png'])
            P.write_json(extension, dict(renders=[head]))
            def digests():
                return {j['id']: P.render_job(j, source)[3]
                        for j in P.load_config(path)['renders']}
            before = digests()
            other = copy.deepcopy(head)
            other.update(id='other', outputs=['other.png'])
            P.write_json(extension, dict(renders=[head, other]))
            self.assertEqual(before['legacy'], digests()['legacy'])
            self.assertEqual(before['head'], digests()['head'])
            other['args'] = ['--character', 'bun']
            P.write_json(extension, dict(renders=[head, other]))
            self.assertEqual(before['legacy'], digests()['legacy'])
            self.assertEqual(before['head'], digests()['head'])
            head['args'] = ['--character', 'auntie']
            P.write_json(extension, dict(renders=[head, other]))
            self.assertNotEqual(before['head'], digests()['head'])
            # A generic legacy job still hashes the whole base configuration.
            base['sharedSetting'] = 'changed'
            P.write_json(path, base)
            self.assertNotEqual(before['legacy'], digests()['legacy'])

    def test_registration_every_action_and_facing(self):
        C = R.C
        for h in C.HEADS:
            for d in C.DIRECTIONS:
                rest = C.project(C.head_position('idle', 0), d)
                for a, spec in C.ACTIONS.items():
                    for f in range(spec['count']):
                        target = C.project(C.head_position(a, f), d)
                        placed = [v+round(t-v) for t, v in zip(target, rest)]
                        self.assertLessEqual(math.dist(placed, target), 1, (h,d,a,f))

    def test_difference_bound(self):
        a = Image.new('RGBA', (10, 10), (100, 100, 100, 255))
        b = a.copy()
        for i in range(20):
            b.putpixel((i % 10, i // 10), (125, 125, 125, 255))
        self.assertEqual(R.difference(a, b), .20)
        b.putpixel((0, 0), (124, 124, 124, 255))
        self.assertEqual(R.difference(a, b), .19)
        # Different RGB hues with equal luma cannot pass a greyscale gate.
        self.assertEqual(R.difference(Image.new('RGBA', (1, 1), (255, 0, 0, 255)),
                                      Image.new('RGBA', (1, 1), (0, 130, 0, 255))), 0)
        shifted = Image.new('RGBA', (12, 10))
        shifted.alpha_composite(a, (2, 0))
        self.assertEqual(R.difference(a, shifted, (0, 0), (2, 0)), 0)

    def test_pairwise_validate_passing_and_failing_fixtures(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp)
            frames = {}
            for head, value in (('a', 50), ('b', 150)):
                for d in R.C.DIRECTIONS:
                    ident = f'head-{head}-{d}'
                    Image.new('RGBA', (10, 10), (value, value, value, 255)).save(source/(ident+'.png'))
                    for suffix in ('', '-mask'):
                        frames[ident+suffix] = dict(file=ident+'.png', anchor=[5, 5], anchors={'head': [5, 5]})
            with patch.object(R.C, 'HEADS', ('a', 'b')), patch.object(R.C, 'ACTIONS', {}):
                scores = R.validate(source, frames)
                self.assertEqual(len(scores), 8)
                self.assertTrue(all(v == 1 for v in scores.values()))
                Image.new('RGBA', (10, 10), (50, 50, 50, 255)).save(source/'head-b-n.png')
                with self.assertRaisesRegex(AssertionError, 'a/b/n'):
                    R.validate(source, frames)

    def test_tinted_cap_gate_and_report(self):
        # DESIGN §4.2 labels remain readable on the dark review ground.
        def luminance(colour):
            channels = [int(colour[i:i+2], 16)/255 for i in (1, 3, 5)]
            linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in channels]
            return sum(v*w for v, w in zip(linear, (.2126, .7152, .0722)))
        self.assertGreaterEqual((luminance(R.LINEUP_LABELS['dark'])+.05)/
                                (luminance(R.S.GROUNDS['dark'])+.05), 4.5)
        self.assertEqual(len(R.PLAYER_COLOURS), 8)
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp)
            frames = {}
            for head, value in (('cap', 255), ('other', 0)):
                for d in R.C.DIRECTIONS:
                    ident = f'head-{head}-{d}'
                    Image.new('RGBA', (2, 2), (value, value, value, 255)).save(source/(ident+'.png'))
                    for suffix in ('', '-mask'):
                        frames[ident+suffix] = dict(file=ident+'.png', anchor=[1, 1], anchors={'head': [1, 1]})
            report = source/'scores.json'
            with patch.object(R.C, 'HEADS', ('cap', 'other')), patch.object(R.C, 'ACTIONS', {}):
                R.validate(source, frames, report)
                data = json.loads(report.read_text())
                self.assertEqual(len(data['untinted']), 8)
                self.assertEqual(len(data['tinted_cap']), 64)
                self.assertTrue(all(v == 1 for v in data['tinted_cap'].values()))
                # Untinted white still differs; only a black player tint fails.
                with patch.object(R, 'PLAYER_COLOURS', ('#000000',)):
                    with self.assertRaisesRegex(AssertionError, 'seat-1/cap/other/n'):
                        R.validate(source, frames, report)
                self.assertTrue(all(v == 0 for v in json.loads(report.read_text())['tinted_cap'].values()))

    def test_review_output_inventory_without_published_renders(self):
        frames = {}
        for d in R.C.DIRECTIONS:
            ids = [f'idle-{d}-0'+suffix for suffix in ('', '-mask')]
            ids += [f'head-{h}-{d}'+suffix for h in R.C.HEADS for suffix in ('', '-mask')]
            for ident in ids:
                frames[ident] = dict(anchor=[128, 128], anchors={'head': [128, 128]})
        saved = {}
        def save(image, path, **kwargs):
            saved[Path(path).name] = image.size
        with tempfile.TemporaryDirectory() as temp, \
                patch.object(R.S, 'load_frames', return_value=frames), \
                patch.object(R.S, 'image', return_value=Image.new('RGBA', (256, 256))), \
                patch.object(Image.Image, 'save', new=save), \
                patch.object(R, 'validate', side_effect=AssertionError('fixture fails')):
            with self.assertRaisesRegex(AssertionError, 'fixture fails'):
                R.sheets(Path(temp), Path(temp))
        self.assertEqual(len(saved), 48)
        self.assertEqual(sum(name.endswith('.jpg') for name in saved), 32)
        self.assertEqual(sum(size == (1920, 1080) for size in saved.values()), 16)

    def test_published_heads_and_production_budget(self):
        frames = R.S.load_frames()
        if not all(i in frames for h in R.C.HEADS for i in R.C.head_ids(h)):
            self.skipTest('Integrator must render all eight heads before pixel/budget acceptance')
        R.validate(R.S.SOURCE, frames)
