"""TR-061: authored sRGB luma predicts head separation, without Blender."""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest


ROOT = Path(__file__).resolve().parent


def assignments(filename):
    tree = ast.parse((ROOT / filename).read_text())
    nodes = [n for n in tree.body if (
        isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Name)
        and n.targets[0].id in ('LOOKS', 'SPECS_HAIR_COLOUR', 'TURBAN_COLOUR')) or (
        isinstance(n, ast.Expr) and isinstance(n.value, ast.Call)
        and isinstance(n.value.func, ast.Attribute)
        and isinstance(n.value.func.value, ast.Name)
        and n.value.func.value.id == 'LOOKS' and n.value.func.attr == 'update')]
    values = {}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), filename, 'exec'), values)
    return values


def luma(colour):
    return sum(weight * int(colour[i:i+2], 16) / 255
               for weight, i in zip((.299, .587, .114), (1, 3, 5)))


class HeadColourTests(unittest.TestCase):
    def test_authored_luma_margins(self):
        heads = assignments('cook_heads.py')
        looks = assignments('kalib.py')['LOOKS']
        specs = luma(heads['SPECS_HAIR_COLOUR'])
        for name, colour, minimum in (
                ('bun', looks['bun']['hair'], 40),
                ('uncle', looks['uncle']['hair'], 30),
                ('turban', heads['TURBAN_COLOUR'], 30)):
            with self.subTest(head=name):
                self.assertGreaterEqual(abs(specs-luma(colour)), minimum/255)

    def test_specs_recolours_only_hair(self):
        tree = ast.parse((ROOT / 'cook_heads.py').read_text())
        function = next(n for n in tree.body
                        if isinstance(n, ast.FunctionDef) and n.name == 'polish_head')
        def rgb(colour):
            return tuple((int(colour[i:i+2], 16)/255)**2.2 for i in (1, 3, 5))
        def material(colour):
            return SimpleNamespace(node_tree=SimpleNamespace(nodes={
                'Principled BSDF': SimpleNamespace(inputs={
                    'Base Color': SimpleNamespace(default_value=(*rgb(colour), 1))})}))
        original = [material(c) for c in ('#1F1A17', '#E3AE84', '#111111')]
        meshes = [SimpleNamespace(data=SimpleNamespace(materials=[m])) for m in original]
        replacement = object()
        calls = []
        def mat(colour, kind):
            calls.append((colour, kind))
            return replacement
        ns = dict(assignments('cook_heads.py'), P={'head_r': 1, 'sink': 0}, TOP=0,
                  K=SimpleNamespace(hexc=rgb, mat=mat))
        exec(compile(ast.Module(body=[function], type_ignores=[]), 'cook_heads.py', 'exec'), ns)
        ns['polish_head']('specs', meshes)
        self.assertEqual(calls, [(ns['SPECS_HAIR_COLOUR'], 'hair')])
        self.assertIs(meshes[0].data.materials[0], replacement)
        for mesh, old in zip(meshes[1:], original[1:]):
            self.assertIs(mesh.data.materials[0], old)
