"""TR-009/010/062 pure authoring bounds and seamless-loop checks."""
import math
import unittest
import effect_geometry as E


class EffectGeometryTests(unittest.TestCase):
    def test_loop_and_bounds(self):
        for name, (size, count, _, anchor) in E.EFFECTS.items():
            self.assertEqual(E.particles(name, 0), E.particles(name, count))
            for f in range(count*16):
                for x, y, rx, ry, alpha, _ in E.particles(name, f/16):
                    self.assertTrue(all(math.isfinite(v) for v in (x,y,rx,ry,alpha)))
                    self.assertTrue(0 <= alpha <= 1)
                    self.assertTrue(0 < anchor[0]+x-rx < anchor[0]+x+rx < size)
                    self.assertTrue(0 < anchor[1]-y-ry < anchor[1]-y+ry < size)

    def test_metadata(self):
        for name, (_, count, fps, anchor) in E.EFFECTS.items():
            frames = E.frame_specs(name)
            self.assertEqual(len(frames), count)
            self.assertEqual(E.animation(name)['fps'], fps)
            self.assertEqual(E.animation(name)['frames'], [f['id'] for f in frames])
            for frame in frames:
                self.assertEqual(frame['anchor'], list(anchor))
                self.assertEqual(frame['blendMode'], 'source-over')
                self.assertEqual(frame['reducedMotionFrame'], name+'-0')
        self.assertTrue(any(layer[1] == 1 for layer in E.fire_tongues(0)))

    def test_fire_tips_palette_and_fixed_foot(self):
        self.assertEqual(E.EFFECTS['fire'], (96, 4, 8, (48, 77)))
        first = E.fire_tongues(0)
        self.assertEqual({c for _, _, c in first}, {'#E0A63A', '#F07C2A', '#B5371F'})
        self.assertTrue(any(0 < alpha < 1 for _, alpha, _ in first))
        for frame in range(64):
            layers = E.fire_tongues(frame/16)
            self.assertEqual(len(layers), 12)
            for index, (outline, alpha, colour) in enumerate(layers):
                self.assertEqual(outline[0], first[index][0][0])
                self.assertEqual(outline[32:], first[index][0][32:])
                tip = outline[16]
                self.assertEqual(tip[1], max(y for _, y in outline))
                self.assertEqual(sum(y == tip[1] for _, y in outline), 1)
                for x, y in outline:
                    self.assertTrue(math.isfinite(x) and math.isfinite(y))
                    self.assertTrue(1 < 48+x < 95 and 1 < 77-y < 95)
            # All three outside tongues overlap at their shared horizontal base.
            self.assertLess(layers[0][0][32][0], layers[8][0][32][0])
        self.assertGreater(first[8][0][16][1], 55)  # meaningful static tall flame
        self.assertLess(first[0][0][16][0], -13)  # static left tip leans outward
        self.assertGreater(first[4][0][16][0], 13)  # static right tip leans outward
        self.assertNotEqual(first, E.fire_tongues(1))

    def test_fire_smooth_periodic_seam(self):
        self.assertEqual(E.fire_tongues(0), E.fire_tongues(4))
        def coordinates(t):
            return [v for outline, _, _ in E.fire_tongues(t) for point in outline for v in point]
        epsilon = .0001
        before, at, after = coordinates(-epsilon), coordinates(0), coordinates(epsilon)
        for left, centre, right in zip(before, at, after):
            self.assertAlmostEqual((centre-left)/epsilon, (right-centre)/epsilon, places=2)
        # Every sampled transition, including 3 -> 0, deforms within the same bound.
        for frame in range(4):
            self.assertLess(max(abs(a-b) for a,b in zip(coordinates(frame), coordinates(frame+1))), 8.1)
