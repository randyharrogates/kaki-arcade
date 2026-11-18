"""NN-4 / PERF-023/024 orchestration checks; never launch Blender or memcheck."""
import contextlib
import copy
import io
from pathlib import Path
import signal
import subprocess
import tempfile
import unittest
from unittest.mock import MagicMock, patch
import pipeline as p


class RenderJobTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name).resolve()
        self.source = self.root / 'assets/src'
        self.source.mkdir(parents=True)
        (self.root / 'tools/blender').mkdir(parents=True)
        for name in ('cook.py', 'cards.py', 'items.py'):
            (self.root / 'tools/blender' / name).write_text(name)
        (self.source / 'input').write_bytes(b'input')
        (self.root / 'extra').write_bytes(b'extra')
        self.job = dict(id='cook', script='cook.py', inputs=['input'], extraInputs=['extra'],
                        outputs=['frames/cook.png'], args=['--out', 'frames'])
        self.config = {'renders': [self.job]}
        self.addCleanup(patch.stopall)
        patch.object(p, 'ROOT', self.root).start()
        self.guard = patch.object(p.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)).start()
        def render(command, **kwargs):
            for job in self.config['renders']:
                if str(self.root / 'tools/blender' / job['script']) in command:
                    for name in job['outputs']:
                        path = self.source / name
                        path.parent.mkdir(parents=True, exist_ok=True)
                        path.write_bytes(b'rendered')
        self.blender = patch.object(p, 'run_blender', side_effect=render).start()

    def reason(self):
        _, outputs, stamp, digest, _ = p.render_job(self.job, self.source)
        return p.stale_reason(outputs, stamp, digest)

    def test_content_staleness(self):
        self.assertIn('missing output', self.reason())
        output = self.source / self.job['outputs'][0]
        output.parent.mkdir()
        output.write_bytes(b'existing')
        self.assertEqual(self.reason(), 'missing content stamp')
        p.render(self.config, self.source)
        self.assertIsNone(self.reason())
        (self.source / 'input').touch()
        p.render(self.config, self.source)
        self.assertEqual(self.blender.call_count, 1)
        for path in (self.source / 'input', self.root / 'extra', self.root / 'tools/blender/cook.py'):
            path.write_bytes(path.read_bytes() + b'changed')
            self.assertEqual(self.reason(), 'content stamp differs')
            p.render(self.config, self.source)
            self.assertIsNone(self.reason())
        self.job['args'].append('--changed')
        self.assertEqual(self.reason(), 'content stamp differs')
        p.render(self.config, self.source)
        output.unlink()
        self.assertIn('missing output', self.reason())

    def test_items_derived_metadata_and_real_inputs(self):
        self.job.update(id='items', script='items.py', inputs=['pipeline.json', 'input'])
        group = dict(id='tabao-rush-items', containmentFootprints={'a': 'old'},
                     frames=[dict(id='a', bakedOutline=False, scale=1)])
        self.config['sets'] = [group, dict(id='other', containmentFootprints={})]
        path = self.source / 'pipeline.json'
        p.write_json(path, self.config)
        p.render(self.config, self.source)
        group['containmentFootprints'] = {'a': 'new'}
        group['frames'][0]['bakedOutline'] = True
        p.write_json(path, self.config)
        self.assertIsNone(self.reason())
        snapshot = copy.deepcopy(self.config)
        for mutate in (
            lambda: group['frames'][0].update(scale=2),
            lambda: group.update(newRenderSetting=True),
            lambda: self.job['args'].append('--changed'),
        ):
            mutate()
            p.write_json(path, self.config)
            self.assertEqual(self.reason(), 'content stamp differs')
            self.config = copy.deepcopy(snapshot)
            self.job = self.config['renders'][0]
            group = self.config['sets'][0]
            p.write_json(path, self.config)
            self.assertIsNone(self.reason())
        for path in (self.source / 'input', self.root / 'extra', self.root / 'tools/blender/items.py'):
            original = path.read_bytes()
            path.write_bytes(original + b'changed')
            self.assertEqual(self.reason(), 'content stamp differs')
            path.write_bytes(original)
            self.assertIsNone(self.reason())

    def test_unrelated_set_leaves_items_stamp_unchanged(self):
        """TR-041: unrelated sets, jobs and round membership cannot stale items."""
        self.job.update(id='items', script='items.py', inputs=['pipeline.json', 'input'])
        self.config['sets'] = [dict(id='tabao-rush-items', frames=[])]
        path = self.source / 'pipeline.json'
        p.write_json(path, self.config)
        p.render(self.config, self.source)
        stamp = p.render_job(self.job, self.source)[2].read_bytes()
        self.config['sets'].append(dict(id='unrelated', frames=[]))
        self.config['rounds'] = {'tabao-rush': ['tabao-rush-items', 'unrelated']}
        self.config['renders'].append(dict(id='unrelated', script='cook.py'))
        p.write_json(path, self.config)
        self.assertIsNone(self.reason())
        self.assertEqual(p.render_job(self.job, self.source)[2].read_bytes(), stamp)

    def test_verified_legacy_items_migration(self):
        self.job.update(id='items', script='items.py', inputs=['pipeline.json', 'input'])
        self.config['sets'] = [dict(id='tabao-rush-items', containmentFootprints={'a': 'old'})]
        path = self.source / 'pipeline.json'
        p.write_json(path, self.config)
        p.render(self.config, self.source)
        _, outputs, stamp, _, _ = p.render_job(self.job, self.source)
        p.write_json(stamp, {'sha256': p.render_job(self.job, self.source, legacy=True)[3]})
        parent_config = path.read_bytes()
        self.config['sets'][0]['containmentFootprints'] = {'a': 'new'}
        p.write_json(path, self.config)
        saved = {f.relative_to(self.root).as_posix(): f.read_bytes()
                 for f in self.root.rglob('*') if f.is_file()}
        def git_show(command, **kwargs):
            rev, name = command[2].split(':', 1)
            return parent_config if rev.endswith('^') and name == 'assets/src/pipeline.json' else saved[name]
        with patch.object(p.subprocess, 'check_output', side_effect=git_show):
            original = (self.source / 'input').read_bytes()
            (self.source / 'input').write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'Real items inputs differ'):
                p.migrate_items_stamp(self.config, self.source, 'render')
            (self.source / 'input').write_bytes(original)
            outputs[0].write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'outputs differ'):
                p.migrate_items_stamp(self.config, self.source, 'render')
            outputs[0].write_bytes(b'rendered')
            p.migrate_items_stamp(self.config, self.source, 'render')
            self.assertIsNone(self.reason())
        self.assertEqual(self.blender.call_count, 1)

    def test_limits_and_failed_publication(self):
        for invalid in (0, -1, True, 1.5, '300', None):
            self.job['timeoutSeconds'] = invalid
            with self.assertRaisesRegex(ValueError, 'positive integer'):
                p.render(self.config, self.source)
        self.job['timeoutSeconds'] = 1800
        self.blender.side_effect = subprocess.TimeoutExpired('blender', 1800)
        with self.assertRaisesRegex(ValueError, r'cook \(cook\.py\).*1800 seconds'):
            p.render(self.config, self.source)
        self.assertEqual(self.blender.call_args.kwargs['timeout'], 1800)
        self.assertFalse(p.render_job(self.job, self.source)[2].exists())
        self.blender.side_effect = None
        with self.assertRaisesRegex(ValueError, 'declared outputs'):
            p.render(self.config, self.source)
        self.assertFalse(p.render_job(self.job, self.source)[2].exists())

    def test_only_and_cli(self):
        for name in ('cards.py', 'items.py'):
            job = copy.deepcopy(self.job)
            job.update(id=Path(name).stem, script=name, outputs=['frames/' + name + '.png'])
            self.config['renders'].append(job)
        p.render(self.config, self.source, only='cards')
        self.assertEqual(self.blender.call_count, 1)
        self.assertIn('cards.py', self.blender.call_args.args[0][4])
        with self.assertRaisesRegex(ValueError, 'valid jobs: cook, cards, items'):
            p.render(self.config, self.source, only='unknown.py')
        config_path = self.source / 'pipeline.json'
        p.write_json(config_path, self.config)
        with patch('sys.argv', ['pipeline.py', '--config', str(config_path), '--check-stale']), patch.object(p, 'pack') as pack, contextlib.redirect_stdout(io.StringIO()) as out:
            p.main()
            pack.assert_not_called()
        self.assertIn('cook: stale: missing output', out.getvalue())
        self.assertIn('cards: fresh:', out.getvalue())
        self.assertEqual(self.blender.call_count, 1)
        with patch('sys.argv', ['pipeline.py', '--config', str(config_path), '--render', '--only', 'cook']), patch.object(p, 'pack') as pack:
            p.main()
            pack.assert_called_once()
        self.assertEqual(self.blender.call_count, 2)

    def test_no_pack(self):
        config_path = self.source/'pipeline.json'
        p.write_json(config_path,self.config)
        with patch('sys.argv',['pipeline.py','--config',str(config_path),'--render','--only','cook','--no-pack']), patch.object(p,'pack') as pack:
            p.main()
            pack.assert_not_called()
        self.assertEqual(self.blender.call_count,1)
        with patch('sys.argv',['pipeline.py','--no-pack']), contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
            p.main()
        self.assertEqual(error.exception.code,2)

    def test_timeout_kills_process_group_and_reaps(self):
        # Exercise the actual launcher, with every OS/process operation stubbed.
        patch.stopall()
        process = MagicMock(pid=1234)
        process.wait.side_effect = [subprocess.TimeoutExpired('blender', 17), -9]
        process.__enter__.return_value = process
        with patch.object(p.subprocess, 'Popen', return_value=process) as launch, patch.object(p.os, 'killpg') as kill:
            with self.assertRaises(subprocess.TimeoutExpired):
                p.run_blender(['blender'], cwd=self.source, check=True, timeout=17)
            launch.assert_called_once_with(['blender'], cwd=self.source, start_new_session=True)
            kill.assert_called_once_with(1234, signal.SIGKILL)
            self.assertEqual(process.wait.call_count, 2)
