"""TR-050/TR-057 independent DESIGN projection and layout checks, no bpy."""
import json
from pathlib import Path
import unittest
import levels as L
import station_geometry as G

SOURCE = Path(__file__).resolve().parents[2]/'assets/src/tabao-rush/levels'


class LevelTests(unittest.TestCase):
    def test_exports_match_design_projection(self):
        for path in SOURCE.glob('*.json'):
            level = json.loads(path.read_text())
            for look in L.LOOKS:
                anchors = json.loads((SOURCE/level['id']/look/'anchors.json').read_text())
                centre = min(540, 881-55-level['height']*.866*120/2)
                for entry in anchors['tiles']+anchors['stations']+anchors['spawns']:
                    t = entry['tile']
                    expected = [960+(t % level['width']+.5-level['width']/2)*120,
                                centre-(level['height']/2-(t//level['width']+.5))*.866*120]
                    for actual, target in zip(entry['screen'], expected):
                        self.assertLess(abs(actual-target), 1)
                self.assertEqual(anchors, L.exports(level)[0])

    def test_collision_and_frame_fit(self):
        for path in SOURCE.glob('*.json'):
            level = json.loads(path.read_text())
            for look in L.LOOKS:
                collision = json.loads((SOURCE/level['id']/look/'collision.json').read_text())
                self.assertEqual(collision, L.exports(level)[1])
                for anchor in level['stations']:
                    self.assertEqual(collision['tiles'][anchor['tile']], 'counter')
                for spawn in level['spawns']:
                    self.assertEqual(collision['tiles'][spawn['tile']], 'floor')
            # Conservative geometry bounds include wall corners and tallest bodies.
            for x in (0, level['width']):
                for y in (0, level['height']):
                    for z in (0, 1.3):
                        px, py = L.project(level, x, y, z)
                        self.assertGreaterEqual(px, 55)
                        self.assertLessEqual(px, 1865)
                        self.assertGreaterEqual(py, 55)
                        self.assertLessEqual(py, 826)
            for a in level['stations']:
                if a['kind'] != 'extinguisher':
                    self.assertTrue(G.geometry('ingredient-crate' if a['kind']=='crate' else a['kind']))

    def test_static_bodies_and_surround_clearance(self):
        self.assertFalse(L.baked_body('extinguisher'))
        self.assertFalse(L.baked_body('future-consumable'))
        self.assertIsNone(L.surround_top('crate'))
        for kind in G.FIXTURES:
            self.assertTrue(L.baked_body(kind))
            top = L.surround_top(kind)
            if top is not None:
                self.assertGreater(L.body_top(kind), top)

    def test_golden_front_split(self):
        band = L.golden_band_height()
        self.assertAlmostEqual((L.COUNTER_HEIGHT-band)/band, L.PHI)
