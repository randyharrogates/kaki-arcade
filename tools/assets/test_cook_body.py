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
import cook_gait as gait
import cook_poses as c


class CookBodyTests(unittest.TestCase):
    def test_plan(self):
        data = p.read_json(p.ROOT/'assets/src/pipeline.json')
        self.assertEqual([j for j in data['renders'] if j['script'] in ('cook.py', 'cook_walk.py')],gait.jobs())
        body = next(g for g in data['sets'] if g['id']=='tabao-rush-cook-body')
        self.assertEqual(body,dict(id='tabao-rush-cook-body',encoding='lossless',anchors=['root','head','hands'],metadata=['handsInFront'],frameFiles=['tabao-rush/cook-body/'+a+'/frames.json' for a in c.ACTIONS],animations=c.animations()))
        head = next(g for g in data['sets'] if g['id']=='tabao-rush-cook-heads')
        self.assertEqual(head,dict(id='tabao-rush-cook-heads',encoding='lossless',anchors=['head'],frameFiles=['tabao-rush/cook-heads/cap/frames.json'],animations=c.head_animations()))
        self.assertEqual(data['rounds']['tabao-rush'],['tabao-rush-items','tabao-rush-cook-body','tabao-rush-cook-heads','tabao-rush-effects','tabao-rush-stations','tabao-rush-step-icons'])
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


class CookDecisionJobTests(unittest.TestCase):
    def test_gait_input_is_scoped_to_walk_jobs(self):
        source = p.ROOT/'assets/src'
        config = p.render_config(source/'pipeline.json')
        gait_input = (p.ROOT/'tools/blender/cook_gait.py').resolve()
        def changed_bytes(path):
            return path.read_bytes() + (b'\n# gait edit\n' if path == gait_input else b'')
        for job in config['renders']:
            digest = p.render_job(job, source)[3]
            changed = p.render_job(job, source, read_bytes=changed_bytes)[3]
            self.assertEqual(digest != changed,
                             job['id'] in ('cook-body-walk', 'cook-body-carry-walk'), job['id'])

    def test_retired_jobs_and_stamp_changes(self):
        source = p.ROOT/'assets/src'
        config = p.render_config(source/'pipeline.json')
        self.assertFalse(any(j['script'] == 'cook_alt.py' for j in config['renders']))
        self.assertNotIn('cook-body-alt', json.dumps(config['sets']))
        changed_input = (p.ROOT/'tools/blender/cook_poses.py').resolve()
        def changed_bytes(path):
            data = path.read_bytes()
            return data + b'\n# changed cook pose input\n' if path == changed_input else data
        for job in c.jobs():
            _, outputs, stamp, digest, _ = p.render_job(job, source)
            # Cook sources may legitimately await integrator rendering.
            # Simulate a source edit without changing production inputs or stamps.
            changed_digest = p.render_job(job, source, read_bytes=changed_bytes)[3]
            self.assertNotEqual(changed_digest, digest)
            self.assertEqual(p.stale_reason(outputs, stamp, changed_digest), 'content stamp differs')
        for job in config['renders']:
            if job['script'] not in ('cook.py', 'cook_walk.py'):
                _, outputs, stamp, digest, _ = p.render_job(job, source)
                self.assertIsNone(p.stale_reason(outputs, stamp, digest), job['id'])

class CookEncodingTests(unittest.TestCase):
    def test_q90_passes_q50_fails_and_alpha_is_exact(self):
        import io
        from PIL import Image
        # Real lossless render fixture, including opaque outlines and soft alpha.
        path = p.ROOT/'assets/src/tabao-rush/cook-body/chop/chop-s-1.png'
        with Image.open(path) as opened:
            source = p.bleed(opened.convert('RGBA'))
        for quality in (90, 50):
            data = io.BytesIO()
            source.save(data, format='WEBP', lossless=False, quality=quality, method=6, exact=True)
            with Image.open(io.BytesIO(data.getvalue())) as decoded:
                if quality == 90:
                    metric = p.check_cook_difference(source, decoded)
                    print('q90 cook difference:', metric)
                else:
                    with self.assertRaisesRegex(ValueError, 'Cook lossy difference'):
                        p.check_cook_difference(source, decoded)
        changed = source.copy()
        changed.putpixel((0, 0), (0, 0, 0, 1))
        with self.assertRaisesRegex(ValueError, 'alpha max'):
            p.check_cook_difference(source, changed)

    def test_cook_multiframe_pages_use_q90_and_check_both_details(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder)
            for index, colour in enumerate(((100, 90, 80, 255), (80, 90, 100, 255))):
                Image.new('RGBA', (16, 16), colour).save(source/f'{index}.png')
            config = dict(sets=[dict(id=name, encoding='lossless',
                frames=[dict(id=f'f-{i}', file=f'{i}.png') for i in range(2)])
                for name in sorted(p.COOK_SETS)], rounds={'cook':sorted(p.COOK_SETS)})
            with patch.object(p, 'check_cook_difference', wraps=p.check_cook_difference) as check:
                result = p.pack(config, source, source/'out')
            self.assertEqual(check.call_count, 4)
            for group in result['sets'].values():
                self.assertEqual((group['encoding'], group['quality']), ('lossy', 90))
            self.assertEqual(config['sets'][0]['encoding'], 'lossless')


class CookIslandTests(unittest.TestCase):
    def test_connectivity_and_dust(self):
        from PIL import Image
        from cook_strips import opaque_islands
        sprite = Image.new('RGBA', (32, 32))
        # Two 25-pixel islands, diagonal contact joins them under 8-connectivity.
        for x in range(5):
            for y in range(5):
                sprite.putpixel((x,y),(0,0,0,255))
                sprite.putpixel((x+6,y+6),(0,0,0,255))
        self.assertEqual(opaque_islands(sprite),[25,25])
        sprite.putpixel((5,5),(0,0,0,255))
        sprite.putpixel((30,30),(0,0,0,255))  # isolated antialias dust
        sprite.putpixel((20,20),(0,0,0,16))  # excluded alpha tail
        self.assertEqual(opaque_islands(sprite),[51])
        self.assertEqual(opaque_islands(Image.new('RGBA',(8,8))),[])
