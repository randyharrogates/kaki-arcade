"""TR-050: background packing at exact dimensions and round budget integration."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image
import pipeline as P
import level_board as B


class LevelPipelineTests(unittest.TestCase):
    def test_jobs_hash_only_render_inputs(self):
        source = P.ROOT/'assets/src'
        config = P.load_config(source/'pipeline.json')
        jobs = [j for j in config['renders'] if j['script']=='levels.py']
        self.assertEqual(len(jobs), 6)
        for job in jobs:
            self.assertEqual(len(job['inputs']), 1)
            before = P.render_job(job, source)[3]
            def changed(path):
                return path.read_bytes()+b' ' if path.name.endswith('.json') else path.read_bytes()
            self.assertNotEqual(before, P.render_job(job, source, read_bytes=changed)[3])
            self.assertNotIn('pipeline.json', job['inputs'])
            for filename in ('levels.py', 'kalib.py', 'station_geometry.py'):
                def edited(path):
                    return path.read_bytes() + (b' ' if path.name == filename else b'')
                self.assertNotEqual(before, P.render_job(job, source, read_bytes=edited)[3], filename)

    def test_exact_background_and_manifest(self):
        config = P.load_config(P.ROOT/'assets/src/pipeline.json')
        group = copy.deepcopy(next(g for g in config['sets'] if g.get('type')=='level-background' and 'zi-char' in g['id']))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            folder = root/group['folder']; folder.mkdir(parents=True)
            level = json.loads((P.ROOT/'assets/src'/group['levelSource']).read_text())
            (root/group['levelSource']).write_text(json.dumps(level))
            Image.new('RGB', (1920, 1080), '#EFEAE2').save(folder/'background.png')
            for name in ('anchors.json', 'collision.json'):
                (folder/name).write_bytes((P.ROOT/'assets/src'/group['folder']/name).read_bytes())
            cfg = dict(sets=[group],rounds={level['id']:dict(sets=[group['id']],
                       stationAnchors=group['folder']+'/anchors.json',collisionMap=group['folder']+'/collision.json')})
            manifest = P.pack(cfg, root, root/'dist')
            for key in ('stationAnchors', 'collisionMap'):
                packed = manifest['levelBackgrounds'][level['id']][key]
                self.assertRegex(packed, r'^data-[0-9a-f]{16}\.json$')
                self.assertEqual(packed, manifest['rounds'][level['id']][key])
                self.assertTrue((root/'dist'/packed).is_file())
            self.assertTrue(any(a['kind'] == 'extinguisher' for a in level['stations']))
            self.assertFalse(any(a['id'] in manifest['levelBackgrounds'][level['id']]['bakedBodies'] for a in level['stations'] if a['kind'] == 'extinguisher'))
            atlas = manifest['atlases'][0]
            self.assertEqual((atlas['full']['width'],atlas['full']['height']), (1920,1080))
            self.assertEqual((atlas['half']['width'],atlas['half']['height']), (960,540))
            self.assertEqual(atlas['full']['gpuBytes'], 8294400)
            self.assertEqual(manifest['levelBackgrounds'][level['id']]['bakedBodies'], [a['id'] for a in level['stations'] if P.baked_body(a['kind'])])
            self.assertEqual(manifest['rounds'][level['id']]['totals']['full']['gpuBytes'], 8294400)
            self.assertLess(manifest['rounds'][level['id']]['totals']['full']['bytes'], P.DOWNLOAD)
            with Image.open(folder/'background.png') as image:
                previews = B.previews(image)
            self.assertEqual(len(previews[0][0]), atlas['full']['bytes'])

    def test_shared_round_sets(self):
        config = P.load_config(P.ROOT/'assets/src/pipeline.json')
        base = config['rounds']['tabao-rush']
        required = set(base if isinstance(base, list) else base['sets'])
        self.assertIn('tabao-rush-step-icons', required)
        for group in config['sets']:
            if group.get('type') == 'level-background':
                level = json.loads((P.ROOT/'assets/src'/group['levelSource']).read_text())
                self.assertTrue(required <= set(config['rounds'][level['id']]['sets']))

    def test_floor_measurement(self):
        from level_floor import measure_floor, FLOOR_STDDEV_BAND
        image = Image.new('L', (20, 20), 120)
        flat = measure_floor(image, (0, 0, 20, 20))
        self.assertEqual(flat, 0)
        self.assertLess(flat, FLOOR_STDDEV_BAND[0])
        for y in range(20):
            for x in range(10):
                image.putpixel((x, y), 130)
        value = measure_floor(image, (0, 0, 20, 20))
        self.assertEqual(value, 5)
        self.assertTrue(FLOOR_STDDEV_BAND[0] <= value <= FLOOR_STDDEV_BAND[1])
        with self.assertRaises(ValueError):
            measure_floor(image, (-1, 0, 20, 20))

    def test_committed_speckled_floors(self):
        from level_floor import measure_floor, FLOOR_STDDEV_BAND
        for level in ('kopitiam-first-shift', 'zi-char-test-kitchen'):
            for look in ('terrazzo', 'golden'):
                path = P.ROOT/'assets/src/tabao-rush/levels'/level/look/'background.png'
                with self.subTest(level=level, look=look), Image.open(path) as image:
                    value = measure_floor(image, (800, 450, 1100, 550))
                    self.assertGreaterEqual(value, FLOOR_STDDEV_BAND[0])
                    self.assertLessEqual(value, FLOOR_STDDEV_BAND[1])
