"""TR-010: review refresh preserves the integrator's visual judgement."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image
import effect_strips as S


class EffectStripTests(unittest.TestCase):
    def test_existing_review_is_untouched_and_half_detail_is_full_size(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root/'assets/src/tabao-rush/effects/shadow'
            source.mkdir(parents=True)
            Image.new('RGBA', (64, 64), (181, 55, 31, 255)).save(source/'shadow-0.png')
            out = root/'review'
            out.mkdir()
            review = out/'review.json'
            original = b'{"visualReview": "looked at by integrator"}\n'
            review.write_bytes(original)
            with patch.object(S, 'ROOT', root), patch.dict(S.E.EFFECTS,
                    {'shadow': (64, 1, 1, (32, 32))}, clear=True), patch.object(
                    S.sys, 'argv', ['effect_strips.py', '--out', str(out)]):
                S.main()
            self.assertEqual(review.read_bytes(), original)
            self.assertEqual(len(list(out.glob('*.png'))), 5)
            with Image.open(out/'shadow-1x-light.png') as sheet:
                # Half detail is column 3, centred at full 64 px play size.
                left = 3*233+(233-64)//2
                self.assertEqual(sheet.getpixel((left, 72)), (181, 55, 31))
                self.assertEqual(sheet.getpixel((left+63, 72)), (181, 55, 31))
