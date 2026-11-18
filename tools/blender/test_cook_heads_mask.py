"""TR-064/TR-061: production head mask rules without Blender."""
import ast
from array import array
import hashlib
from pathlib import Path
from types import SimpleNamespace
import unittest


class HeadMaskTests(unittest.TestCase):
    def load(self, filename, name, namespace):
        tree = ast.parse(Path(__file__).with_name(filename).read_text())
        nodes = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name]
        self.assertEqual(len(nodes), 1)
        exec(compile(ast.Module(body=nodes, type_ignores=[]), filename, 'exec'), namespace)

    def test_coverage(self):
        data = array('f', [1, 1, 1, 0] * 81)
        ns = dict(pixels=lambda path: data, SIZE=9, hashlib=hashlib)
        self.load('cook.py', 'require', ns)
        self.load('cook.py', 'validate', ns)
        ns['validate_nonempty'] = ns['validate']
        self.load('cook_heads.py', 'validate', ns)
        path = Path('head-uncle-s-mask.png')
        result, digest = ns['validate'](path, allow_empty=True)
        self.assertEqual(result, data)
        self.assertEqual(digest, hashlib.sha256(bytes([255, 255, 255, 0] * 81)).hexdigest())
        with self.assertRaisesRegex(RuntimeError, 'max alpha=0; non-zero pixels=0; bbox=None'):
            ns['validate'](path)
        for value in (1e-8, 1 / 255, .5, .98):
            data[(4 * 9 + 3) * 4 + 3] = value
            for allowed in (True, False):
                with self.assertRaisesRegex(RuntimeError,
                        r'mask coverage below .99: head-uncle-s-mask.png; max alpha=.*; '
                        r'non-zero pixels=1; bbox=\(3, 4, 3, 4\)'):
                    ns['validate'](path, allow_empty=allowed)
        for y in range(2, 7):
            for x in range(2, 7):
                data[(y * 9 + x) * 4 + 3] = 1
        ns['validate'](path, allow_empty=True)
        ns['validate'](path)

    def test_mask_settings_restored_even_on_failure(self):
        scene = SimpleNamespace(render=SimpleNamespace(dither_intensity=1),
                                cycles=SimpleNamespace(use_denoising=True))
        for fail in (False, True):
            calls = []
            def shared(*args):
                calls.append(args)
                self.assertEqual(scene.render.dither_intensity, 0)
                self.assertFalse(scene.cycles.use_denoising)
                if fail:
                    raise RuntimeError('render failed')
            ns = dict(bpy=SimpleNamespace(context=SimpleNamespace(scene=scene)), mask_shared=shared)
            self.load('cook_heads.py', 'mask', ns)
            if fail:
                with self.assertRaisesRegex(RuntimeError, 'render failed'):
                    ns['mask']('path', [], [], 'floor')
            else:
                ns['mask']('path', [], [], 'floor')
            self.assertEqual(calls, [('path', [], [], 'floor')])
            self.assertEqual(scene.render.dither_intensity, 1)
            self.assertTrue(scene.cycles.use_denoising)
