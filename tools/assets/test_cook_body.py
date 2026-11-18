"""TR-060 / NN-4: production config contract and isolated fake render."""
import ast
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import pipeline as p
sys.path.insert(0, str(p.ROOT/'tools/blender'))
import cook_poses as c


class CookBodyTests(unittest.TestCase):
    def test_plan(self):
        data = p.read_json(p.ROOT/'assets/src/pipeline.json')
        self.assertEqual([j for j in data['renders'] if j['script']=='cook.py'],c.jobs())
        body = next(g for g in data['sets'] if g['id']=='tabao-rush-cook-body')
        self.assertEqual(body,dict(id='tabao-rush-cook-body',encoding='lossless',anchors=['root','head','hands'],metadata=['handsInFront'],frameFiles=['tabao-rush/cook-body/'+a+'/frames.json' for a in c.ACTIONS],animations=c.animations()))
        head = next(g for g in data['sets'] if g['id']=='tabao-rush-cook-heads')
        self.assertEqual(head,dict(id='tabao-rush-cook-heads',encoding='lossless',anchors=['head'],frameFiles=['tabao-rush/cook-heads/cap/frames.json'],animations=c.head_animations()))
        self.assertEqual(data['rounds']['tabao-rush'],['tabao-rush-items','tabao-rush-cook-body','tabao-rush-cook-heads'])
        self.assertNotIn('cook-spike',json.dumps(data))
        self.assertFalse((p.ROOT/'assets/src/tabao-rush/cook-spike').exists())

    def test_pose_socket_contract(self):
        text = (p.ROOT/'tools/blender/cook.py').read_text()
        self.assertNotIn('pipeline.json',text)
        tree = ast.parse(text)
        defs = {n.name:n for n in tree.body if isinstance(n,ast.FunctionDef)}
        self.assertEqual([a.arg for a in defs['pose'].args.args],['rig','actions','action','frame','direction'])
        self.assertEqual([a.arg for a in defs['socket'].args.args],['rig'])
        # Execute the production pose/socket functions without importing Blender.
        import types
        source = ast.parse((p.ROOT / 'tools/blender/cook.py').read_text())
        functions = [n for n in source.body if isinstance(n, ast.FunctionDef)
                     and n.name in ('pose', 'bone_world', 'socket')]
        events = []
        graph = types.SimpleNamespace(update=lambda: events.append('depsgraph'))
        scene = types.SimpleNamespace(frame_set=lambda f: events.append(('frame', f)))
        matrix = types.SimpleNamespace(translation=types.SimpleNamespace(copy=lambda: [3, 4, 5]))
        class World:
            def __matmul__(self, other):
                events.append('evaluated-matrix')
                return matrix
        evaluated = types.SimpleNamespace(matrix_world=World(), pose=types.SimpleNamespace(
            bones={'head_socket': types.SimpleNamespace(matrix=object())}))
        rig = types.SimpleNamespace(animation_data=types.SimpleNamespace(),
                                    rotation_euler=types.SimpleNamespace(),
                                    evaluated_get=lambda g: evaluated)
        context = types.SimpleNamespace(scene=scene,
            view_layer=types.SimpleNamespace(update=lambda: events.append('view-layer')),
            evaluated_depsgraph_get=lambda: graph)
        namespace = {'bpy': types.SimpleNamespace(context=context), 'math': __import__('math'),
                     'project': lambda point: point}
        exec(compile(ast.Module(body=functions, type_ignores=[]), 'cook-pose', 'exec'), namespace)
        action = types.SimpleNamespace(slots=['walk-slot'])
        namespace['pose'](rig, {'walk': action}, 'walk', 2, 1)
        self.assertEqual(namespace['socket'](rig), [3, 4, 5])
        self.assertEqual(events, [('frame', 3), 'view-layer', 'depsgraph', 'evaluated-matrix'])
        self.assertEqual(rig.animation_data.action_slot, 'walk-slot')

    def test_fake_job_isolation(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder).resolve()
            sibling = source/'tabao-rush/cook-body/walk/sentinel.png'
            sibling.parent.mkdir(parents=True)
            sibling.write_bytes(b'unchanged')
            job = c.jobs()[0]
            def fake(command, **kwargs):
                self.assertEqual(kwargs['cwd'],source)
                self.assertEqual(command[5:],['--',*job['args']])
                for name in job['outputs']:
                    path = source/name
                    path.parent.mkdir(parents=True,exist_ok=True)
                    path.write_bytes(b'fake pixels')
            with patch.object(p.subprocess,'run',return_value=p.subprocess.CompletedProcess([],0)), patch.object(p,'run_blender',side_effect=fake) as run:
                p.render({'renders':[job]},source)
                p.render({'renders':[job]},source)
                self.assertEqual(run.call_count,1)
            self.assertEqual(sibling.read_bytes(),b'unchanged')
            _,outputs,stamp,digest,_ = p.render_job(job,source)
            self.assertIsNone(p.stale_reason(outputs,stamp,digest))
            self.assertEqual({f.relative_to(source).as_posix() for f in source.rglob('*') if f.is_file()},set(job['outputs'])|{stamp.relative_to(source).as_posix(),sibling.relative_to(source).as_posix()})

    def test_throw_record_uses_throwing_wrist(self):
        import types
        tree = ast.parse((p.ROOT/'tools/blender/cook.py').read_text())
        function = next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name == 'frame_record')
        class Point(tuple):
            def __add__(self, other):
                return Point(a+b for a,b in zip(self,other))
            def __truediv__(self, scale):
                return Point(v/scale for v in self)
            def __matmul__(self, other):
                return other
            def inverted(self):
                return self
            @property
            def z(self):
                return self[2]
        camera = types.SimpleNamespace(matrix_world=Point((0,0,0)))
        namespace = dict(socket=lambda rig:[50,60],Vector=Point,
            HANDS={'l':Point((-10,20,30)),'r':Point((30,40,50))},
            empty_world=lambda obj:obj,project=lambda v:list(v[:2]),
            bone_world=lambda rig,bone:Point((0,0,0)),
            bpy=types.SimpleNamespace(context=types.SimpleNamespace(scene=types.SimpleNamespace(camera=camera))))
        exec(compile(ast.Module(body=[function],type_ignores=[]),'cook-frame-record','exec'),namespace)
        for suffix in ('','-mask'):
            record = namespace['frame_record'](None,'throw-n-3'+suffix,'throw')
            self.assertEqual(record['anchors']['hands'],[30,40])
            self.assertEqual(record['anchors']['throwHand'],[30,40])
            self.assertTrue(record['handsInFront'])
        record = namespace['frame_record'](None,'serve-n-3','serve')
        self.assertEqual(record['anchors']['hands'],[10,30])
