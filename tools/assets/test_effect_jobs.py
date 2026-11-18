"""A-07 source wiring checks without rendering or packing."""
import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'blender'))
import effect_geometry as E
import pipeline as P


class EffectJobTests(unittest.TestCase):
    def test_definitions(self):
        config = json.loads((P.ROOT/'assets/src/pipeline.json').read_text())
        group = next(g for g in config['sets'] if g['id'] == 'tabao-rush-effects')
        P.validate_animations(group['animations'], group['id'])
        self.assertEqual(group['animations'], [E.animation(n) for n in E.EFFECTS])
        for name in E.EFFECTS:
            job = next(j for j in config['renders'] if j['id'] == 'effect-'+name)
            self.assertEqual(job['outputs'], [f['file'] for f in E.frame_specs(name)]+[f'tabao-rush/effects/{name}/frames.json'])
            self.assertIn('tools/blender/effect_geometry.py', job['extraInputs'])
            self.assertIn('tools/blender/kalib.py', job['extraInputs'])
            for frame in E.frame_specs(name):
                self.assertTrue(set(frame)-{'id','file','anchor','anchors'} <= set(group['metadata']))
        for members in config['rounds'].values():
            if 'tabao-rush-items' in members:
                self.assertIn(group['id'], members)
