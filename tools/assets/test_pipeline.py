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

    def test_refresh_metadata_preserves_base_with_extension(self):
        path = self.source/'pipeline.json'
        base = dict(renders=[], sets=[dict(id='tabao-rush-items', frames=[])])
        p.write_json(path, base)
        extension = dict(renders=[dict(id='head', script='cook_heads.py')],
                         sets=[dict(id='heads', frames=[])])
        p.write_json(self.source/'pipeline.heads.json', extension)
        def refresh(config, source):
            self.assertEqual(config, base)
            self.assertEqual(source, self.source)
            config['sets'][0]['containmentFootprints'] = {}
        with patch('sys.argv', ['pipeline.py', '--config', str(path), '--refresh-item-metadata']), \
                patch.object(p, 'refresh_item_metadata', side_effect=refresh):
            p.main()
        expected = copy.deepcopy(base)
        expected['sets'][0]['containmentFootprints'] = {}
        self.assertEqual(p.read_json(path), expected)
        self.assertEqual(p.read_json(self.source/'pipeline.heads.json'), extension)
        self.assertEqual(len(p.load_config(path)['renders']), 1)

    def test_frame_files(self):
        group = self.config['sets'][0]
        original = group['frames']
        group['frames'], external = original[:1], original[1:]
        p.write_json(self.source/'frames.json', external)
        group['frameFiles'] = ['frames.json']
        self.assertEqual(p.merged_frames(group,self.source),original)
        manifest = p.pack(self.config,self.source,self.out)
        self.assertEqual(manifest,self.manifest)
        del group['frames']
        p.write_json(self.source/'frames.json',original)
        self.assertEqual(p.merged_frames(group,self.source),original)
        for file,value in [('missing.json',None),('bad.json',{}),('duplicate.json',[original[0]]) ,('../outside.json',[])]:
            group['frames'] = original[:1]
            group['frameFiles'] = [file]
            if value is not None:
                (self.source/file).write_text(__import__('json').dumps(value))
            with self.assertRaisesRegex(ValueError, 'duplicate frame' if file=='duplicate.json' else group['id']+'.*'+file.replace('.', r'\.')):
                p.pack(self.config,self.source,self.out)

    def test_animation_fields(self):
        group = self.config['sets'][0]
        group['animations'] = [dict(action='move',fps=8,frames=[group['frames'][0]['id']],loop=True,strideTiles=.72,releaseFrame=0)]
        manifest = p.pack(self.config,self.source,self.out)
        self.assertEqual(manifest['sets'][group['id']]['animations'],group['animations'])
        for field,values in [('loop',[0,1,None,'yes']),('strideTiles',[True,0,-1,float('inf'),float('nan'),'1']),('releaseFrame',[True,-1,1,0.5,'0'])]:
            for value in values:
                animation = dict(group['animations'][0],**{field:value})
                with self.assertRaisesRegex(ValueError,group['id']+'.*'+field):
                    p.validate_animations([animation],group['id'])

    def test_duplicate_tiles_and_animation_references(self):
        image = Image.new('RGBA',(16,16),(200,80,40,255))
        image.save(self.source/'repeat.png')
        frames = [dict(id=ident,file='repeat.png',anchors={'hands':[4,6]})
                  for ident in ('a','b','c')]
        frames[2]['anchors']['hands'] = [5,6]  # same art, different semantics
        config = dict(sets=[dict(id='repeat',frames=frames,animations=[dict(
            action='idle',fps=4,loop=True,frames=['a','b','c','b'])])],
            rounds={'test':['repeat']})
        for maximum in (2048,24):  # complete-action and direction fallback paths
            with patch.object(p,'MAX_SIZE',maximum):
                manifest = p.pack(config,self.source,self.out)
            sequence = manifest['sets']['repeat']['animations'][0]['frames']
            self.assertEqual(sequence,['a','a','c','a'])
            records = {ident:(atlas['id'],record['rect'])
                       for atlas in manifest['atlases'] for ident,record in atlas['frames'].items()}
            self.assertEqual(records['a'],records['b'])
            self.assertNotEqual(records['a'],records['c'])
            self.assertEqual(len({(page,tuple(rect)) for page,rect in records.values()}),2)
        self.assertEqual(config['sets'][0]['animations'][0]['frames'],['a','b','c','b'])

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
        with self.assertRaisesRegex(ValueError, 'single-frame page'):
            p.pack(cfg,self.source,self.out)
        cfg['sets'][0]['frames'] = cfg['sets'][0]['frames'][:1]
        cfg['sets'][0]['animations'] = []
        result=p.pack(cfg,self.source,self.out)
        self.assertEqual(result['sets']['diagnostic-walk']['encoding'],'lossy')
        self.assertFalse((self.out/'old-0-full.0123456789abcdef.webp').exists())
        self.assertTrue((self.out/'keep.txt').exists())

    def test_render_refusal_and_timeout(self):
        inp=self.source/'input.blend'
        inp.write_bytes(b'x')
        cfg={'renders':[dict(id='sample', script='sample_stall.py',inputs=[str(inp)],outputs=[str(self.source/'missing.png')])]}
        with patch.object(p.subprocess,'run',return_value=p.subprocess.CompletedProcess([],1)) as run:
            with self.assertRaisesRegex(ValueError,'wait'):
                p.render(cfg)
            self.assertEqual(run.call_count,1)
        with patch.object(p.subprocess, 'run', return_value=p.subprocess.CompletedProcess([], 0)), patch.object(p, 'run_blender', side_effect=p.subprocess.TimeoutExpired('blender', 300)):
            with self.assertRaisesRegex(ValueError, r'\(sample_stall\.py\).*300 seconds'):
                p.render(cfg)

    def test_interrupt_kills_process_group(self):
        from unittest.mock import MagicMock
        process = MagicMock()
        process.pid = 123
        process.wait.side_effect = [KeyboardInterrupt(), 0]
        process.__enter__.return_value = process
        with patch.object(p.subprocess, 'Popen', return_value=process) as launch, patch.object(p.os, 'killpg') as kill:
            with self.assertRaises(KeyboardInterrupt):
                p.run_blender(['blender'], cwd=self.source, check=True, timeout=1)
            kill.assert_called_once_with(123, p.signal.SIGKILL)
            self.assertEqual(process.wait.call_count, 2)
            self.assertTrue(launch.call_args.kwargs['start_new_session'])

    def test_render_stamp_regressions(self):
        inp = self.source / 'input.txt'
        output = self.source / 'output.png'
        inp.write_bytes(b'initial')
        job = dict(id='sample', script='sample_stall.py', inputs=[str(inp)], outputs=[str(output)])
        config = {'renders': [job]}
        def publish(*args, **kwargs):
            output.write_bytes(b'output')
            inp.write_bytes(inp.read_bytes() + b'published metadata')
        with patch.object(p.subprocess, 'run', return_value=p.subprocess.CompletedProcess([], 0)), patch.object(p, 'run_blender', side_effect=publish):
            p.render(config)
            _, outputs, stamp, digest, _ = p.render_job(job, self.source)
            self.assertIsNone(p.stale_reason(outputs, stamp, digest))
            renamed = inp.with_name('renamed.txt')
            renamed.write_bytes(inp.read_bytes())
            job['inputs'] = [str(renamed)]
            self.assertIsNotNone(p.stale_reason(*p.render_job(job, self.source)[1:4]))
            job['inputs'] = [str(inp)]
        for error in (p.subprocess.CalledProcessError(1, 'blender'), p.subprocess.TimeoutExpired('blender', 300)):
            with self.subTest(error=type(error).__name__), patch.object(p.subprocess, 'run', return_value=p.subprocess.CompletedProcess([], 0)):
                with patch.object(p, 'run_blender', side_effect=publish):
                    p.render(config)
                self.assertTrue(stamp.is_file())
                inp.write_bytes(inp.read_bytes() + b'changed')
                with patch.object(p, 'run_blender', side_effect=error):
                    with self.assertRaises((ValueError, p.subprocess.CalledProcessError)):
                        p.render(config)
                self.assertFalse(stamp.exists())

    def test_job_ids_and_stale_exit(self):
        inp = self.source / 'input.txt'
        inp.write_bytes(b'input')
        job = dict(id='one', script='sample_stall.py', inputs=[str(inp)], outputs=[str(self.source / 'out.png')])
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            p.render({'renders': [job, job]}, self.source, check_stale=True)
        missing = dict(job)
        del missing['id']
        with self.assertRaises(KeyError):
            p.render({'renders': [missing]}, self.source, check_stale=True)
        with self.assertRaisesRegex(ValueError, 'valid jobs: one'):
            p.render({'renders': [job]}, self.source, only='nope', check_stale=True)
        other = dict(job, id='two')
        record = p.render_job(job, self.source)
        with patch.object(p, 'render_job', return_value=record):
            with self.assertRaisesRegex(ValueError, 'stamps collide'):
                p.render({'renders': [job, other]}, self.source, check_stale=True)
        # Distinct jobs using the same script and directory have separate stamps.
        self.assertNotEqual(record[2], p.render_job(other, self.source)[2])
        config = self.source / 'jobs.json'
        p.write_json(config, {'renders': [job]})
        command = ['python3', str(p.ROOT / 'tools/assets/pipeline.py'), '--config', str(config), '--check-stale']
        result = p.subprocess.run(command, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('one: stale:', result.stdout)
        result = p.subprocess.run(command + ['--render'], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('not allowed with argument', result.stderr)
        self.assertNotIn('Traceback', result.stderr)

    def test_items_staging_and_guards(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('items', p.ROOT/'tools/blender/items.py')
        items = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(items)
        items.coverage()
        destination = self.root/'items'
        destination.mkdir()
        (destination/'sprite.png').write_bytes(b'previous')
        (destination/'render-validation.json').write_bytes(b'previous report')
        with self.assertRaisesRegex(RuntimeError, 'failed validation'):
            with items.staged_output(destination) as staged:
                (staged/'sprite.png').write_bytes(b'broken')
                (staged/'render-validation.json').write_bytes(b'broken report')
                raise RuntimeError('failed validation')
        self.assertEqual((destination/'sprite.png').read_bytes(), b'previous')
        self.assertEqual((destination/'render-validation.json').read_bytes(), b'previous report')
        with items.staged_output(destination) as staged:
            (staged/'sprite.png').write_bytes(b'validated')
            (staged/'render-validation.json').write_bytes(b'validated report')
        self.assertEqual((destination/'sprite.png').read_bytes(), b'validated')
        self.assertEqual((destination/'render-validation.json').read_bytes(), b'validated report')
        self.assertEqual(items.png_mask({0, 88}, 89), {88*89, 89*89-1})
        self.assertEqual(items.compose_masks({0}, [({44*89+44}, [45.5,46.5])]), {0,46*89+45})
        previous = {}
        items.check_unique_item('item-noodles-raw', b'a', (1,2), previous)
        for encoded, pixels in [(b'a', (3,4)), (b'b', (1,2))]:
            with self.assertRaisesRegex(RuntimeError, 'identical item states'):
                items.check_unique_item('item-noodles-cooked', encoded, pixels, previous)
        items.check_unique_item('item-noodles-cooked', b'b', (3,4), previous)
        # Execute the pure Python self-check examples embedded in the TS coverage test.
        import re
        from contextlib import chdir
        source = (p.ROOT/'tools/items.test.ts').read_text()
        for example in re.findall(r"execFileSync\('python3', \['-c', `([\s\S]*?)`\]", source):
            # The embedded examples use repo-relative paths, like the TS runner.
            with chdir(p.ROOT), patch('sys.stdout'):
                exec(example, {})

    def test_items_publish_listing_and_rim_bytes(self):
        import importlib.util
        from types import SimpleNamespace
        spec = importlib.util.spec_from_file_location('items', p.ROOT/'tools/blender/items.py')
        items = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(items)
        destination = self.root/'items-listing'
        destination.mkdir()
        (destination/'icon-stale.png').write_bytes(b'stale')
        (destination/'portion-stale.png').write_bytes(b'stale')
        with items.staged_output(destination) as staged:
            for name, *_ in items.specifications():
                (staged/(name+'.png')).write_bytes(b'valid')
            (staged/'render-validation.json').write_text('{}')
        self.assertEqual({f.name for f in destination.iterdir()},
                         {name+'.png' for name, *_ in items.specifications()} | {'render-validation.json'})
        # Byte-image adapter exercises the actual add_rim write path and PNG decoder.
        path = self.root/'rim.png'
        image = Image.new('RGBA', (5,5))
        image.putpixel((2,2), (255,255,255,255))
        image.save(path)
        class ByteImage:
            size = (5,5)
            pixels = [value/255 for pixel in image.getdata() for value in pixel]
            def save(self):
                stored = Image.new('RGBA', self.size)
                stored.putdata([tuple(round(v*255) for v in self.pixels[i:i+4])
                                for i in range(0,len(self.pixels),4)])
                stored.save(self.filepath_raw)
        adapter = ByteImage()
        items.bpy = SimpleNamespace(data=SimpleNamespace(images=SimpleNamespace(
            load=lambda *args, **kwargs: adapter, remove=lambda image: None)))
        items.add_rim(path, 5)
        self.assertEqual(items.png_rgba(path)[6], (43,33,24,255))

    def test_items_colour_validation_reads_saved_frames(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('items', p.ROOT/'tools/blender/items.py')
        items = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(items)
        output = self.root/'colour'
        output.mkdir()
        blank = [(0,0,0,0)]*89**2
        config = p.json.loads((p.ROOT/'assets/src/pipeline.json').read_text())
        frames = {f['id']: f for g in config['sets'] if g['id'] == 'tabao-rush-items' for f in g['frames']}
        for kind in ('plate', 'bowl', 'cup'):
            items.write_rgba(output/f'container-{kind}-clean.png', blank)
        for index, (food, (states, _, _)) in enumerate(items.PORTIONS.items()):
            pixels = list(blank)
            extent = 30 if food == 'laksa-broth' else 20
            for y in range(30,30+extent):
                for x in range(30,30+extent):
                    pixels[y*89+x] = (50+index*10,90,180,255)
            for state in states:
                items.write_rgba(output/f'portion-{food}-{state}.png', pixels)
        for dish, (container, _) in items.DISH_PARTS.items():
            anchors = frames[f'container-{container}-clean']['anchors']
            layers = [(items.png_rgba(output/(layer['frame']+'.png')), anchors[layer['slot']])
                      for layer in items.dish_layers(dish)]
            items.write_rgba(output/f'dish-{dish}-plated.png', items.rim_rgba(items.compose_rgba(blank, layers)))
        self.assertTrue(all(score['passes'] for score in items.check_colour_compositions(output).values()))
        # Change the independently saved portion, leaving its completed dish intact.
        items.write_rgba(output/'portion-kopi-cooked.png', blank)
        with self.assertRaisesRegex(RuntimeError, 'kopi-teh: colour composition failed'):
            items.check_colour_compositions(output)

    def test_item_composition_metadata_survives_packing(self):
        config = p.json.loads((p.ROOT/'assets/src/pipeline.json').read_text())
        group = next(g for g in config['sets'] if g['id'] == 'tabao-rush-items')
        selected = [f for f in group['frames'] if f['id'] in
                    ('dish-kopi-teh-plated', 'container-plate-clean', 'container-cup-clean')]
        by_id = {frame['id']: frame for frame in group['frames']}
        selected_ids = {frame['id'] for frame in selected}
        # Include the transitive references carried by the selected metadata.
        for frame in selected:
            layers = list(frame.get('composition', []))
            for override in frame.get('contentCompositions', {}).values():
                layers.extend(override)
            for variant in frame.get('servedComposition', {}).get('variants', {}).values():
                layers.extend(variant)
            for layer in layers:
                if layer['frame'] not in selected_ids:
                    selected.append(by_id[layer['frame']])
                    selected_ids.add(layer['frame'])
        # Use isolated synthetic pixels; metadata comes from the real manifest.
        frames = []
        for frame in selected:
            local = copy.deepcopy(frame)
            local['file'] = local['id']+'.png'
            Image.new('RGBA',(89,89),(100,80,50,255)).save(self.source/local['file'])
            frames.append(local)
        packed = p.pack({'sets':[dict(id='items',frames=frames,metadata=group['metadata'])],
                         'rounds':{'test':['items']}}, self.source, self.out)
        recovered = {key:value for atlas in packed['atlases'] for key,value in atlas['frames'].items()}
        for frame in selected:
            self.assertEqual(recovered[frame['id']]['metadata'],
                             {key:frame[key] for key in group['metadata'] if key in frame})
        served = recovered['dish-kopi-teh-plated']['metadata']['servedComposition']
        self.assertEqual(served['variants']['teh'][0]['frame'], 'portion-teh-cooked')
        self.assertEqual(served['variants']['kopi'][0]['frame'], 'portion-kopi-cooked')

    def test_every_portion_must_be_visible_and_essential(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('items', p.ROOT/'tools/blender/items.py')
        items = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(items)
        blank = [(0,0,0,0)]*89**2
        def patch_pixels(left, top, width, colour):
            pixels = list(blank)
            for y in range(top, top+width):
                for x in range(left, left+width):
                    pixels[y*89+x] = (*colour,255)
            return pixels
        first = patch_pixels(15,25,20,(210,100,30))
        second = patch_pixels(50,25,20,(40,190,70))
        layers = [(first,[44.5,44.5]),(second,[44.5,44.5])]
        actual = items.rim_rgba(items.compose_rgba(blank,layers))
        result = items.check_portion_visibility(actual,blank,layers,'test')
        self.assertTrue(result['shiftPortionRejected'])
        self.assertTrue(all(v >= .04 for v in result['visiblePortionShares']))
        # A second, fully hidden portion cannot be excused by an essential first.
        hidden = [(first,[44.5,44.5]),(second,[44.5,44.5]),(second,[44.5,44.5])]
        with self.assertRaisesRegex(RuntimeError, 'visible share'):
            items.check_portion_visibility(actual,blank,hidden,'test')
        tiny = patch_pixels(70,60,3,(200,180,70))
        with self.assertRaisesRegex(RuntimeError, 'visible share'):
            items.check_portion_visibility(items.rim_rgba(items.compose_rgba(blank,layers+[(tiny,[44.5,44.5])])),
                                           blank,layers+[(tiny,[44.5,44.5])],'test')

    def test_items_render_contract(self):
        import json
        config = json.loads((p.ROOT/'assets/src/pipeline.json').read_text())
        job = next(j for j in config['renders'] if j['script'] == 'items.py')
        self.assertEqual(job['inputs'], ['tools/blender/items.py', 'tools/blender/kalib.py', 'pipeline.json'])
        frames = next(g for g in config['sets'] if g['id'] == 'tabao-rush-items')['frames']
        self.assertEqual(set(job['outputs']), {f['file'] for f in frames} | {'tabao-rush/items/render-validation.json'})
        self.assertEqual(job['args'], ['--out', 'tabao-rush/items'])
        # Isolated source + stub: never invoke Blender or touch committed frames.
        p.write_json(self.source/'pipeline.json', {
            'renders': [job],
            'sets': [next(g for g in config['sets'] if g['id'] == 'tabao-rush-items')],
        })
        calls = []
        def stub(args, **kwargs):
            if args[0] == 'blender':
                calls.append((args, kwargs))
                for output in job['outputs']:
                    target = self.source/output
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(b'validated')
            return p.subprocess.CompletedProcess(args, 0)
        # A-01b: Blender runs through run_blender (own process group); memcheck still uses subprocess.run.
        with patch.object(p.subprocess, 'run', side_effect=stub), patch.object(p, 'run_blender', side_effect=stub):
            p.render({'renders': [job]}, self.source)
        self.assertEqual(len(calls), 1)
        args, kwargs = calls[0]
        self.assertEqual(Path(args[args.index('-P')+1]), p.ROOT/'tools/blender/items.py')
        self.assertEqual(kwargs['cwd'], self.source)
        self.assertEqual((kwargs['cwd']/args[args.index('--out')+1]).resolve(),
                         (self.source/'tabao-rush/items').resolve())
        # Repo inputs remain bounded, and missing inputs fail before subprocess.
        broken = copy.deepcopy(job)
        broken['inputs'] = ['tools/blender/missing.py']
        with patch.object(p.subprocess, 'run') as run:
            with self.assertRaisesRegex(ValueError, 'existing inputs'):
                p.render({'renders': [broken]}, self.source)
            run.assert_not_called()
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
        with patch.object(p, 'ROOT', root), patch.object(p, 'run_blender', side_effect=lambda *a, **kw: p.subprocess.run(*a, **kw)), patch.object(p.subprocess, 'run', side_effect=stub) as run:
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
                item.write_text(item.read_text() + 'changed')
                before = run.call_count
                p.render(config, source)
                self.assertEqual(run.call_count, before+2)
                os.utime(item, ns=(100, 100))

    def test_render_incremental(self):
        script_input = self.source / 'input.blend'
        script_input.write_bytes(b'diagnostic')
        output = self.source / 'render.png'
        job = dict(id='sample', script='sample_stall.py', inputs=[str(script_input)], outputs=[str(output)])
        config = {'renders': [job]}
        # No rendering is run: test the orchestration with a stub process.
        def stub(args, **kwargs):
            if 'blender' == args[0]:
                output.write_bytes(b'ok')
            return p.subprocess.CompletedProcess(args, 0)
        with patch.object(p, 'run_blender', side_effect=lambda *a, **kw: p.subprocess.run(*a, **kw)), patch.object(p.subprocess, 'run', side_effect=stub) as run:
            p.render(config)
            p.render(config)
            self.assertEqual(run.call_count, 2)



class ItemContainmentTests(unittest.TestCase):
    def test_all_container_layers_and_served_drinks_stay_inside(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('items', p.ROOT/'tools/blender/items.py')
        items = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(items)
        config = p.read_json(p.ROOT/'assets/src/pipeline.json')
        group = next(g for g in config['sets'] if g['id'] == 'tabao-rush-items')
        frames = {f['id']: f for f in group['frames']}
        # Recorded data must describe committed pixels before containment uses it.
        for ident, recorded in group['containmentFootprints'].items():
            with self.subTest(frame=ident):
                self.assertEqual(recorded, items.footprint(items.png_rgba(
                    p.ROOT/'assets/src/tabao-rush/items'/(ident+'.png'))))
        self.assertGreater(items.check_containment(frames, group['containmentFootprints']), 40)
        for drink in ('kopi', 'teh'):
            variant = frames['dish-kaya-toast-plated']['servedComposition']['variants'][drink]
            self.assertEqual(variant[-1]['frame'], f'portion-side-{drink}-cooked')
            self.assertEqual(variant[1:], [dict(layer, order=layer['order']+10)
                                          for layer in frames['container-plate-clean']['contentCompositions'][drink]])
        # Check new placements against the real portion colours, without rendering.
        root = p.ROOT/'assets/src/tabao-rush/items'
        plate = items.png_rgba(root/'container-plate-clean.png')
        for dish in ('satay', 'kaya-toast'):
            if dish == 'kaya-toast':
                layers = [(items.png_rgba(root/'portion-bread-spread.png'), items.slot_anchor('bread'))]
                side_layers = [(items.scaled_rgba(items.png_rgba(root/(ident+'.png')), scale), anchor)
                               for ident, anchor, scale in items.composition_layers(items.plate_drinks()['kopi'], frames['container-plate-clean'])]
                side = items.compose_rgba([(0,0,0,0)]*89**2, side_layers)
                layers.append((side, [44.5,44.5]))
            else:
                layers = [(items.png_rgba(root/(layer['frame']+'.png')), items.slot_anchor(layer['slot']))
                          for layer in items.dish_layers(dish)]
            actual = items.rim_rgba(items.compose_rgba(plate, layers), container=plate)
            items.check_portion_visibility(actual, plate, layers, dish)
        # Final reference and legacy side portion use the exact published cup layers.
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary)
            for ident in ('container-plate-clean', 'portion-side-cup-clean', 'portion-side-kopi-cooked', 'portion-bread-spread'):
                (output/(ident+'.png')).write_bytes((root/(ident+'.png')).read_bytes())
            items.finish_side_cup(output)
            layers = [(items.png_rgba(root/'portion-bread-spread.png'), items.slot_anchor('bread'))]
            layers += [(items.scaled_rgba(items.png_rgba(root/(ident+'.png')), scale), anchor)
                       for ident, anchor, scale in items.composition_layers(items.plate_drinks()['kopi'], frames['container-plate-clean'])]
            expected = items.rim_rgba(items.compose_rgba(plate, layers), container=plate)
            self.assertEqual(items.png_rgba(output/'dish-kaya-toast-plated.png'), expected)
            legacy = items.png_rgba(output/'portion-drink-side-clean.png')
            self.assertEqual(items.footprint(legacy), group['containmentFootprints']['portion-drink-side-clean'])
        # The tolerance is an offending-pixel count, not a relaxed spatial margin.
        blank = [(0,0,0,0)]*89**2
        base_pixels = list(blank)
        base_pixels[4000] = (255,255,255,255)
        trial = {'container-test-clean': {'id': 'container-test-clean', 'anchors': {'food': [44.5,44.5]}, 'portionScales': {'food': 1}}}
        for count in (2, 3):
            food = list(blank)
            for i in range(count):
                food[4000+i] = (255,255,255,255)
            # One of the three pixels lies on ink; another is outside alpha.
            ink_base = list(base_pixels)
            ink_base[4001] = (43,33,24,255)
            records = {'container-test-clean': items.footprint(ink_base), 'portion-food-cooked': items.footprint(food)}
            if count == 2:
                items.check_containment(trial, records)
            else:
                # Add one more outside pixel to exceed the two-pixel allowance.
                food[4003] = (255,255,255,255)
                records['portion-food-cooked'] = items.footprint(food)
                with self.assertRaisesRegex(RuntimeError, '3 pixels'):
                    items.check_containment(trial, records)
        broken = copy.deepcopy(frames)
        broken['container-plate-clean']['contentCompositions']['kopi'][0]['anchor'][0] += 20
        with self.assertRaisesRegex(RuntimeError, 'outside opaque interior or on rim ink > 2'):
            items.check_containment(broken, group['containmentFootprints'])


class BakedOutlineTests(unittest.TestCase):
    def test_committed_frame_flags_match_outline_ink(self):
        group = next(g for g in p.read_json(p.ROOT/'assets/src/pipeline.json')['sets']
                     if g['id'] == 'tabao-rush-items')
        for frame in group['frames']:
            with self.subTest(frame=frame['id']):
                with Image.open(p.ROOT/'assets/src'/frame['file']) as image:
                    ink = any(a >= 128 and max(abs(c-v) for c, v in
                              zip((r, g, b), (43, 33, 24))) <= 2
                              for r, g, b, a in image.convert('RGBA').getdata())
                self.assertEqual(frame.get('bakedOutline', False), ink)

    def test_missing_composition_frame_has_clear_error(self):
        layer = {'frame': 'portion-side-cup-clean', 'scale': 1}
        for metadata in (
            {'composition': [layer]},
            {'contentCompositions': {'kopi': [layer]}},
            {'servedComposition': {'variants': {'teh': [layer]}}},
        ):
            with self.subTest(metadata=metadata):
                with self.assertRaisesRegex(
                    ValueError, 'dish-test: missing composition frame portion-side-cup-clean'
                ):
                    p.validate_outline_scales([{'id': 'dish-test', **metadata}])

    def test_outline_scale_guard_covers_every_composition_path(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('items', p.ROOT/'tools/blender/items.py')
        items = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(items)
        group = next(g for g in p.read_json(p.ROOT/'assets/src/pipeline.json')['sets']
                     if g['id'] == 'tabao-rush-items')
        frames = {f['id']: f for f in group['frames']}
        items.check_outline_scales(frames)
        p.validate_outline_scales(list(frames.values()))
        for scale in (.68, 1.2):
            for path in ('content', 'served', 'fixed', 'generic'):
                broken = copy.deepcopy(frames)
                if path == 'content':
                    broken['container-plate-clean']['contentCompositions']['kopi'][0]['scale'] = scale
                elif path == 'served':
                    broken['dish-kaya-toast-plated']['servedComposition']['variants']['teh'][1]['scale'] = scale
                elif path == 'fixed':
                    broken['dish-kaya-toast-plated']['composition'][1]['scale'] = scale
                else:
                    broken['container-plate-clean']['portionScales']['drink-side'] = scale
                with self.assertRaisesRegex(ValueError, 'baked outline requires scale 1'):
                    items.check_outline_scales(broken)
                with self.assertRaisesRegex(ValueError, 'baked outline requires scale 1'):
                    p.validate_outline_scales(list(broken.values()))


if __name__ == '__main__':
    unittest.main()
