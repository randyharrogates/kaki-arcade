import copy
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image
import pipeline as p
from synthetic import generate


class PipelineTests(unittest.TestCase):
    def setUp(self):
        (p.ROOT / 'assets/dist').mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=p.ROOT / 'assets/dist')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'source'
        self.config = generate(self.source)
        self.out = self.root / 'dist'
        self.manifest = p.pack(self.config, self.source, self.out)

    def test_determinism(self):
        before = {f.name: f.read_bytes() for f in self.out.iterdir()}
        self.config['sets'][0]['frames'].reverse()
        p.pack(self.config, self.source, self.out)
        self.assertEqual(before, {f.name: f.read_bytes() for f in self.out.iterdir()})

    def test_reconstruct_and_anchor(self):
        for atlas in self.manifest['atlases']:
            with Image.open(self.out / atlas['full']['file']) as image:
                for ident, frame in atlas['frames'].items():
                    x, y, w, h = frame['rect']
                    recovered = Image.new('RGBA', frame['sourceSize'])
                    recovered.paste(image.crop((x, y, x + w, y + h)), tuple(frame['trim']))
                    original = Image.open(self.source / f'{ident}.png').convert('RGBA')
                    self.assertEqual(original.getchannel('A').tobytes(), recovered.getchannel('A').tobytes())
                    self.assertEqual(original.convert('RGBa').tobytes(), recovered.convert('RGBa').tobytes())
                    self.assertEqual(frame['anchor'], [16, 6])
                    self.assertNotIn('halfFrames', atlas)

    def test_half_no_fringe_or_neighbour_bleed(self):
        # Opposing colours, opaque + translucent edges + hidden RGB in transparent pixels.
        frames = []
        for name, colour in [('red', (240, 0, 0)), ('blue', (0, 0, 240))]:
            image = Image.new('RGBA', (8, 8), (0, 255, 0, 0))
            for x in range(2, 6):
                for y in range(2, 6):
                    image.putpixel((x, y), (*colour, 100 if x == 2 else 255))
            image.save(self.source / f'{name}.png')
            frames.append(dict(id=name, file=f'{name}.png'))
        config = dict(sets=[dict(id='edges', frames=frames)], rounds={'test': ['edges']})
        atlas = p.pack(config, self.source, self.out)['atlases'][0]
        half = Image.open(self.out / atlas['half']['file']).convert('RGBA')
        for ident, frame in atlas['frames'].items():
            x, y, w, h = [v // 2 for v in frame['rect']]
            pixels = half.crop((x, y, x+w, y+h)).getdata()
            for r, g, b, a in pixels:
                if a:
                    self.assertEqual(g, 0)
                    self.assertEqual(b if ident == 'red' else r, 0)
                    self.assertGreaterEqual(r if ident == 'red' else b, 238)

    def test_extrusion_at_both_details(self):
        image = Image.new('RGBA', (8, 8), (220, 80, 40, 255))
        image.save(self.source / 'solid.png')
        config = dict(sets=[dict(id='solid', frames=[dict(id='solid', file='solid.png')])],
                      rounds={'test': ['solid']})
        atlas = p.pack(config, self.source, self.out)['atlases'][0]
        for detail, frames, pad in [('full', 'frames', 2), ('half', 'halfFrames', 1)]:
            with Image.open(self.out / atlas[detail]['file']) as stored:
                packed = stored.convert('RGBA')
                x, y, w, h = [int(v / (2 if detail == 'half' else 1)) for v in atlas['frames']['solid']['rect']]
                for px, py in [(x-pad, y-pad), (x+w, y+h), (x-pad, y), (x, y+h)]:
                    self.assertEqual(packed.getpixel((px, py)), (220, 80, 40, 255))

    def test_budget_pass_and_fail(self):
        path = self.out / 'manifest.json'
        p.check(path)
        with patch.object(p, 'DOWNLOAD', path.stat().st_size + 1):
            with self.assertRaisesRegex(ValueError, 'PERF-023 round diagnostic.*exceeds by'):
                p.check(path)
        with patch.object(p, 'DECODED', self.manifest['atlases'][0]['full']['gpuBytes'] - 1):
            with self.assertRaisesRegex(ValueError, 'PERF-024 atlas.*exceeds by 1'):
                p.check(path)
        with patch.object(p, 'DOWNLOAD', 1):
            with self.assertRaisesRegex(ValueError, 'PERF-023 manifest.json'):
                p.check(path)
        # Exercise aggregate decoded memory separately from the individual atlas guard.
        with patch.object(p, 'MAX_SIZE', 64):
            multi = p.pack(self.config, self.source, self.root / 'multi')
        largest = max(a['full']['gpuBytes'] for a in multi['atlases'])
        with patch.object(p, 'DECODED', largest):
            with self.assertRaisesRegex(ValueError, 'PERF-024 round'):
                p.check(self.root / 'multi/manifest.json')

    def test_schema_and_tampering(self):
        manifest = copy.deepcopy(self.manifest)
        self.assertEqual(manifest['version'], 1)
        self.assertEqual(len(manifest['sets']['diagnostic-walk']['animations'][0]['directions']), 8)
        for mutation in ['totals', 'preload', 'file', 'version', 'frame', 'animation']:
            value = copy.deepcopy(manifest)
            if mutation == 'totals':
                value['totals']['full']['bytes'] += 1
            elif mutation == 'preload':
                value['rounds']['diagnostic']['atlases'] = []
            elif mutation == 'file':
                value['atlases'][0]['full']['bytes'] += 1
            elif mutation == 'frame':
                next(iter(value['atlases'][0]['frames'].values()))['rect'][0] = -1
            elif mutation == 'animation':
                value['sets']['diagnostic-walk']['animations'][0]['fps'] = 0
            else:
                value['version'] = 2
            p.write_json(self.out / 'manifest.json', value)
            with self.assertRaises(ValueError):
                p.check(self.out / 'manifest.json')

    def test_invalid_inputs_and_paging(self):
        bad = copy.deepcopy(self.config)
        del bad['sets'][0]['animations'][0]['directions']['n']
        with self.assertRaisesRegex(ValueError, 'eight directions'):
            p.pack(bad, self.source, self.out)
        with patch.object(p, 'MAX_SIZE', 64):
            manifest = p.pack(self.config, self.source, self.root / 'paged')
        self.assertGreater(len(manifest['atlases']), 1)
        for atlas in manifest['atlases']:
            self.assertLessEqual(atlas['full']['width'], 64)
            self.assertLessEqual(atlas['full']['height'], 64)
        bad = copy.deepcopy(self.config)
        bad['sets'][0]['frames'][0]['file'] = '../escape.png'
        with self.assertRaisesRegex(ValueError, 'outside source'):
            p.pack(bad, self.source, self.out)

    def test_verify_budget_hook(self):
        # Execute the actual build hook in an isolated test-runner temporary tree.
        (self.root / 'tools').symlink_to(p.ROOT / 'tools', target_is_directory=True)
        command = ['node', str(p.ROOT / 'tools/check_budgets.mjs')]
        result = p.subprocess.run(command, cwd=self.root, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0)
        self.assertIn('no bundles yet', result.stdout)
        assets = self.root / 'assets'
        assets.mkdir()
        (assets / 'src').symlink_to(self.source, target_is_directory=True)
        result = p.subprocess.run(command, cwd=self.root, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('PERF-023/024 passed', result.stdout)
        # Clean checkout: no prebuilt atlas, over-budget non-texture source must fail.
        import shutil
        shutil.rmtree(assets / 'dist')
        (self.source / 'large.bin').write_bytes(b'0' * (p.DOWNLOAD + 1))
        self.config['rounds']['diagnostic'] = dict(sets=['diagnostic-walk'], files=['large.bin'])
        p.write_json(self.source / 'pipeline.json', self.config)
        result = p.subprocess.run(command, cwd=self.root, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('PERF-023 round', result.stderr)

    def test_odd_edges(self):
        for size in [(33, 33), (1921, 1081)]:
            image = Image.new('RGBA', size, (190, 80, 30, 255))
            image.save(self.source / 'odd.png')
            cfg = dict(sets=[dict(id='odd', frames=[dict(id='odd', file='odd.png')])], rounds={'test': ['odd']})
            atlas = p.pack(cfg, self.source, self.out)['atlases'][0]
            for detail, scale in [('full', 1), ('half', 2)]:
                x,y,w,h = [v//scale for v in atlas['frames']['odd']['rect']]
                stored = Image.open(self.out / atlas[detail]['file']).convert('RGBA')
                tile = stored.crop((x,y,x+w,y+h))
                self.assertEqual(tile.getchannel('A').getextrema(), (255,255))
                if scale == 1:
                    self.assertEqual(tile.crop((0,0,*size)).tobytes(), image.tobytes())

    def test_layers_anchors_metadata_and_sequences(self):
        frames=[]
        for i in range(20):
            for layer, box in [('body',(4,4,19,19)), ('mask',(22,22,29,29))]:
                image=Image.new('RGBA',(34,34))
                from PIL import ImageDraw
                ImageDraw.Draw(image).rectangle(box, fill='white')
                image.save(self.source / f'{layer}-{i}.png')
            frames.append(dict(id=f'f-{i}', layers={l:f'{l}-{i}.png' for l in ['body','mask']}, anchors={'foot':[17,30]}, event='step'))
        cfg=dict(sets=[dict(id='cook',layers=['body','mask'],anchors=['foot'],metadata=['event'],frames=frames,animations=[dict(action='flip',fps=10,frames=[f'f-{i}' for i in range(20)])])],rounds={'test':['cook']})
        result=p.pack(cfg,self.source,self.out)
        a,b=result['atlases']
        self.assertEqual(a['frames'],b['frames'])
        self.assertEqual(a['frames']['f-0']['rect'][2:],[26,26])
        self.assertEqual(a['frames']['f-0']['metadata'],{'event':'step'})
        del frames[0]['anchors']['foot']
        with self.assertRaisesRegex(ValueError,'missing declared anchor'):
            p.pack(cfg,self.source,self.out)

    def test_shelf_efficiency_and_sequence_locality(self):
        for count,size in [(64,80),(12,300)]:
            Image.new('RGBA',(size,size),'white').save(self.source/'tile.png')
            frames=[dict(id=f'f-{i}',file='tile.png') for i in range(count)]
            cfg=dict(sets=[dict(id='tiles',frames=frames)],rounds={'test':['tiles']})
            result=p.pack(cfg,self.source,self.out)
            self.assertTrue(all(a['wastedArea'] < .12 for a in result['atlases']))
        # Multiple animations fit individually: each sequence must stay on one page.
        cfg['sets'][0]['animations']=[dict(action=f'a-{i}',fps=12,frames=[f'f-{j}' for j in range(i*4,i*4+4)]) for i in range(3)]
        with patch.object(p,'MAX_SIZE',1024):
            result=p.pack(cfg,self.source,self.out)
        for a in cfg['sets'][0]['animations']:
            self.assertEqual(sum(any(f in page['frames'] for f in a['frames']) for page in result['atlases']),1)

    def test_encoding_stale_and_validation(self):
        for fps in ['12',True,0,None]:
            cfg=copy.deepcopy(self.config)
            cfg['sets'][0]['animations'][0]['fps']=fps
            with self.assertRaisesRegex(ValueError,'fps'):
                p.pack(cfg,self.source,self.out)
        missing=copy.deepcopy(self.config)
        del missing['sets'][0]['animations'][0]['action']
        p.write_json(self.source/'missing.json',missing)
        result=p.subprocess.run(['python3',str(p.ROOT/'tools/assets/pipeline.py'),'--config',str(self.source/'missing.json'),'--output',str(self.out)],capture_output=True,text=True)
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(len(result.stderr.splitlines()),1)
        self.assertIn('missing required field',result.stderr)
        cfg=copy.deepcopy(self.config)
        cfg['sets'][0]['animations'] *= 2
        with self.assertRaisesRegex(ValueError,'duplicate action'):
            p.pack(cfg,self.source,self.out)
        cfg=copy.deepcopy(self.config)
        cfg['sets'][0]['encoding']='lossy'
        cfg['sets'][0]['quality']=75
        (self.out/'old-0-full.0123456789abcdef.webp').write_bytes(b'old')
        (self.out/'keep.txt').write_text('keep')
        result=p.pack(cfg,self.source,self.out)
        self.assertEqual(result['sets']['diagnostic-walk']['encoding'],'lossy')
        self.assertFalse((self.out/'old-0-full.0123456789abcdef.webp').exists())
        self.assertTrue((self.out/'keep.txt').exists())

    def test_render_refusal_and_timeout(self):
        inp=self.source/'input.blend'
        inp.write_bytes(b'x')
        cfg={'renders':[dict(script='sample_stall.py',inputs=[str(inp)],outputs=[str(self.source/'missing.png')])]}
        with patch.object(p.subprocess,'run',return_value=p.subprocess.CompletedProcess([],1)) as run:
            with self.assertRaisesRegex(ValueError,'wait'):
                p.render(cfg)
            self.assertEqual(run.call_count,1)
        with patch.object(p.subprocess,'run',side_effect=[p.subprocess.CompletedProcess([],0),p.subprocess.TimeoutExpired('blender',300)]):
            with self.assertRaises(p.subprocess.TimeoutExpired):
                p.render(cfg)

    def test_production_card_job(self):
        import os
        config = p.read_json(p.ROOT / 'assets/src/pipeline.json')
        frames = next(group['frames'] for group in config['sets']
                      if group['id'] == 'peek-poker-cards')
        expected = {frame['file'] for frame in frames} | {'peek-poker/cards/render_validation.json'}
        self.assertEqual(len(frames), 58)
        config['renders'] = [job for job in config['renders'] if job['script'] == 'cards.py']
        root = self.root / 'repo'
        source = root / 'assets/src'
        scripts = root / 'tools/blender'
        scripts.mkdir(parents=True)
        source.mkdir(parents=True)
        inputs = [scripts / 'cards.py'] + [root / name for name in config['renders'][0]['extraInputs']]
        for item in inputs:
            item.parent.mkdir(parents=True, exist_ok=True)
            item.write_text('stub')
        def stub(args, **kwargs):
            if args[0] == 'blender':
                self.assertEqual(Path(args[args.index('-P')+1]), scripts / 'cards.py')
                self.assertEqual((kwargs['cwd'] / args[args.index('--out')+1]).resolve(),
                                 (source / 'peek-poker/cards').resolve())
                for name in expected:
                    output = source / name
                    output.parent.mkdir(parents=True, exist_ok=True)
                    output.write_bytes(b'stub')
                # Deterministic timestamps avoid filesystem resolution races.
                for output in source.rglob('*'):
                    if output.is_file():
                        os.utime(output, ns=(200, 200))
            return p.subprocess.CompletedProcess(args, 0)
        for item in inputs:
            os.utime(item, ns=(100, 100))
        with patch.object(p, 'ROOT', root), patch.object(p.subprocess, 'run', side_effect=stub) as run:
            p.render(config, source)
            p.render(config, source)
            self.assertEqual(run.call_count, 2)
            # Each declared output is necessary, including the validation pass.
            for name in expected:
                (source / name).unlink()
                before = run.call_count
                p.render(config, source)
                self.assertEqual(run.call_count, before+2)
            # Each shared source must invalidate an otherwise current job.
            for item in inputs:
                os.utime(item, ns=(300, 300))
                before = run.call_count
                p.render(config, source)
                self.assertEqual(run.call_count, before+2)
                os.utime(item, ns=(100, 100))

    def test_render_incremental(self):
        script_input = self.source / 'input.blend'
        script_input.write_bytes(b'diagnostic')
        output = self.source / 'render.png'
        job = dict(script='sample_stall.py', inputs=[str(script_input)], outputs=[str(output)])
        config = {'renders': [job]}
        # No rendering is run: test the orchestration with a stub process.
        def stub(args, **kwargs):
            if 'blender' == args[0]:
                output.write_bytes(b'ok')
            return p.subprocess.CompletedProcess(args, 0)
        with patch.object(p.subprocess, 'run', side_effect=stub) as run:
            p.render(config)
            p.render(config)
            self.assertEqual(run.call_count, 2)

        # S-02: exercise the actual cook job, without launching Blender. Source-relative
        # outputs and cwd must work from assets/src, and every PNG must be declared.
        import json
        config = json.loads((p.ROOT / 'assets/src/pipeline.json').read_text())
        cook = next(job for job in config['renders'] if job['script'] == 'cook.py')
        self.assertEqual(cook['args'], ['--out', 'tabao-rush/cook-spike'])
        self.assertEqual(cook['inputs'], ['pipeline.json'])
        declared = set(cook['outputs'])
        group = next(g for g in config['sets'] if g['id'] == 'tabao-rush-cook-spike')
        self.assertEqual(len(group['frames']), 208)
        self.assertEqual(declared, {f['file'] for f in group['frames']} |
                         {'tabao-rush/cook-spike/render-validation.json'})
        self.assertTrue(all(len(f['anchor']) == 2 for f in group['frames']))
        # Execute the production pose/socket functions without importing Blender.
        import ast
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
        # Recorded render anchors, including masks, are authoritative; no pose formula.
        report = json.loads((p.ROOT / 'assets/src/tabao-rush/cook-spike/render-validation.json').read_text())
        helpers = [n for n in source.body if isinstance(n, ast.FunctionDef)
                   and n.name in ('require', 'update_anchors')]
        helper_ns = {'Path': Path}
        exec(compile(ast.Module(body=helpers, type_ignores=[]), 'cook-anchors', 'exec'), helper_ns)
        expected_config = copy.deepcopy(config)
        helper_ns['update_anchors'](expected_config, report['frames'])
        expected_group = next(g for g in expected_config['sets'] if g['id'] == group['id'])
        self.assertEqual(group['frames'], expected_group['frames'])
        for frame in expected_group['frames']:
            frame['anchor'] = [-1, -1]
        helper_ns['update_anchors'](expected_config, report['frames'])
        self.assertEqual(group['frames'], expected_group['frames'])
        broken = copy.deepcopy(config)
        next(g for g in broken['sets'] if g['id'] == group['id'])['frames'].pop()
        with self.assertRaisesRegex(RuntimeError, 'no frame'):
            helper_ns['update_anchors'](broken, report['frames'])
        # Metadata mutation follows successful frame publication; output timestamps follow it.
        main_node = next(n for n in source.body if isinstance(n, ast.FunctionDef) and n.name == 'main')
        main_source = ast.unparse(main_node)
        self.assertLess(main_source.index('shutil.move'), main_source.index('config.write_text'))
        self.assertLess(main_source.index('config.write_text'), main_source.index('output.touch'))
        p.write_json(self.source / 'pipeline.json', config)
        def cook_stub(args, **kwargs):
            if args[0] == 'blender':
                self.assertEqual(kwargs['cwd'], self.source)
                self.assertEqual(args[4], str(p.ROOT / 'tools/blender/cook.py'))
                self.assertEqual(args[5:], ['--', '--out', 'tabao-rush/cook-spike'])
                self.assertTrue(kwargs['check'])
                for output in declared:
                    path = self.source / output
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(b'stub output')
            return p.subprocess.CompletedProcess(args, 0)
        with patch.object(p.subprocess, 'run', side_effect=cook_stub) as run:
            p.render({'renders': [cook]}, self.source)
            p.render({'renders': [cook]}, self.source)
            self.assertEqual(run.call_count, 2)
            # Missing any declared frame forces a rebuild.
            (self.source / sorted(declared)[0]).unlink()
            p.render({'renders': [cook]}, self.source)
            self.assertEqual(run.call_count, 4)


if __name__ == '__main__':
    unittest.main()
