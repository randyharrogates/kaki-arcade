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


class EffectReadabilityTests(unittest.TestCase):
    def test_png_text_removed_without_changing_other_chunks(self):
        # Load only the pure helper; importing effects would require Blender.
        import ast
        import struct
        import tempfile
        import zlib
        source = ast.parse((P.ROOT/'tools/blender/effects.py').read_text())
        helper = next(n for n in source.body if isinstance(n, ast.FunctionDef)
                      and n.name == 'strip_render_metadata')
        namespace = {}
        exec(compile(ast.Module(body=[helper], type_ignores=[]), 'effects.py', 'exec'), namespace)
        def chunk(kind, payload):
            return struct.pack('>I', len(payload))+kind+payload+struct.pack('>I', zlib.crc32(kind+payload))
        from PIL import Image
        import io
        buffer = io.BytesIO()
        Image.new('RGBA', (1, 1), (43, 33, 24, 80)).save(buffer, format='PNG')
        clean = buffer.getvalue()
        timing = b'cycles.ViewLayer.render_time\0' + b'00:00.04'
        fixture = clean[:8]+chunk(b'tEXt', timing)+chunk(b'zTXt', b'time\0\0'+zlib.compress(b'variable'))+chunk(b'iTXt', b'time\0\0\0\0\0variable')+clean[8:]
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'timing.png'
            path.write_bytes(fixture)
            namespace['strip_render_metadata'](path)
            self.assertEqual(path.read_bytes(), clean)
            namespace['strip_render_metadata'](path)
            self.assertEqual(path.read_bytes(), clean)

    def test_shadow_is_constant_colour_with_smooth_alpha(self):
        pixels = E.shadow_pixels()
        self.assertEqual(len(pixels), 64*64*4)
        self.assertEqual(len({tuple(pixels[i:i+3]) for i in range(0, len(pixels), 4)}), 1)
        row = [pixels[(32*64+x)*4+3] for x in range(32)]
        self.assertEqual(row, sorted(row))
        self.assertEqual(row[0], 0)
        self.assertEqual(tuple(pixels[:3]), (43/255, 33/255, 24/255))
        self.assertAlmostEqual(max(pixels[3::4]), .5, delta=1/255)

    def test_written_shadow_palette_and_peak_alpha(self):
        from PIL import Image
        with Image.open(P.ROOT/'assets/src/tabao-rush/effects/shadow/shadow-0.png') as image:
            pixels = list(image.convert('RGBA').getdata())
        self.assertEqual({pixel[:3] for pixel in pixels}, {(43, 33, 24)})
        self.assertAlmostEqual(max(pixel[3] for pixel in pixels)/255, .5, delta=1/255)
