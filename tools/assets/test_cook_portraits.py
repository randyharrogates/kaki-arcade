import tempfile
import unittest
from pathlib import Path
from PIL import Image
from cook_portraits import HEADS, SIZE, BUDGET, pack_portraits
from pipeline import file_gpu_bytes


class CookPortraitTests(unittest.TestCase):
    def test_portraits_and_apron_masks_are_small_reproducible_webp(self):
        with tempfile.TemporaryDirectory() as temporary:
            source, output = Path(temporary) / 'src', Path(temporary) / 'out'
            output.mkdir()
            for name in ['idle-s-0', 'idle-s-0-mask']:
                path = source / f'tabao-rush/cook-body/idle/{name}.png'
                path.parent.mkdir(parents=True, exist_ok=True)
                Image.new('RGBA', (256, 256), (100, 90, 80, 255)).save(path)
            for head in HEADS:
                path = source / f'tabao-rush/cook-heads/{head}/head-{head}-s.png'
                path.parent.mkdir(parents=True)
                Image.new('RGBA', (256, 256), (100, 90, 80, 255)).save(path)
                Image.new('RGBA', (256, 256)).save(path.with_name(f'head-{head}-s-mask.png'))
            files = pack_portraits(source, output)
            self.assertEqual(len(files), 16)
            self.assertLessEqual(sum(f['bytes'] for f in files), BUDGET)
            self.assertEqual(pack_portraits(source, output), files)
            decoded = 0
            for file in files:
                with Image.open(output / file['file']) as image:
                    self.assertEqual(image.format, 'WEBP')
                    self.assertLessEqual(image.width, SIZE[0])
                    self.assertLessEqual(image.height, SIZE[1])
                    decoded += image.width * image.height * 4
            self.assertEqual(file_gpu_bytes(output, files), decoded)

    def test_cap_mask_includes_head_pixels_above_body(self):
        with tempfile.TemporaryDirectory() as temporary:
            source, output = Path(temporary) / 'src', Path(temporary) / 'out'
            output.mkdir()
            body = source / 'tabao-rush/cook-body/idle'
            body.mkdir(parents=True)
            Image.new('RGBA', SIZE, (100, 90, 80, 255)).save(body / 'idle-s-0.png')
            Image.new('RGBA', SIZE).save(body / 'idle-s-0-mask.png')
            for head in HEADS:
                folder = source / f'tabao-rush/cook-heads/{head}'
                folder.mkdir(parents=True)
                Image.new('RGBA', SIZE).save(folder / f'head-{head}-s.png')
                mask = Image.new('RGBA', SIZE)
                if head == 'cap':
                    mask.paste((255, 255, 255, 255), (50, 20, 100, 50))
                mask.save(folder / f'head-{head}-s-mask.png')
            files = pack_portraits(source, output)
            for head in HEADS:
                file = next(f for f in files if f['file'].startswith(f'portrait-{head}-mask.'))
                with Image.open(output / file['file']) as mask:
                    self.assertEqual(mask.convert('RGBA').getpixel((75, 35))[3], 255 if head == 'cap' else 0)
