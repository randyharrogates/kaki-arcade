"""PP-030/031 mutation checks: python3 -m unittest discover -s tools/blender -p test_card_checks.py."""
import unittest
from card_checks import check_pixels
from card_tokens import TOKENS


class CardChecksTests(unittest.TestCase):
    def tile(self, back=False, flat=False, stripes=True, lines=False, reverse=False):
        pixels = []
        for y in range(100):
            for x in range(100):
                rgb, alpha = (0, 0, 0), 0
                if 7 <= x < 93 and 7 <= y < 93:
                    alpha = 1
                    t = (y-7)/85
                    if reverse:
                        t = 1-t
                    rgb = (249, 247, 241) if flat else tuple(round(a+(b-a)*t) for a,b in zip((243,239,228),(254,254,253)))
                    if back:
                        rgb = (181,55,31)
                        phase = (x+y) % 13
                        if stripes and phase < 5:
                            rgb = (193,87,67)
                        if lines and phase == 5:
                            rgb = (100,20,10)
                        if x < 11 or x >= 89 or y < 11 or y >= 89:
                            rgb = (249,247,241)
                pixels.append(tuple(c/255 for c in rgb)+(alpha,))
        return pixels

    def test_paper_gradient(self):
        check_pixels(self.tile(), 100, 100, 'paper.png', face=False, paper=True)
        for reverse, flat in ((True, False), (False, True)):
            pixels = self.tile(flat=flat, reverse=reverse)
            # Pale edge variations must not let uniform interior paper pass.
            if flat:
                for i, value in enumerate((247,248,249,250,251)):
                    pixels[7*100+10+i] = (value/255,)*3+(.96,)
            with self.assertRaisesRegex(RuntimeError, 'paper gradient'):
                check_pixels(pixels, 100, 100, 'paper.png', face=False, paper=True)

    def test_back_mutations(self):
        check_pixels(self.tile(back=True), 100, 100, 'back.png', face=False, back=True)
        for stripes, lines in ((False, False), (True, True)):
            with self.assertRaises(RuntimeError):
                check_pixels(self.tile(back=True, stripes=stripes, lines=lines),
                             100, 100, 'back.png', face=False, back=True)

    def test_runtime_tokens(self):
        self.assertEqual(set(TOKENS), {'colour','stripe','from','to','spades','hearts','diamonds','clubs'})
        self.assertTrue(all(len(value) == 7 and value.startswith('#') for value in TOKENS.values()))


if __name__ == '__main__':
    unittest.main()
