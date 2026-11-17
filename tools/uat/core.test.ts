import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { ready, prepareEvidence, parseArgs, selectPorts, memoryGate, evidenceName, reportSkeleton, thumbPath, matchesError, startGroup, stopGroup } from './core.js';

describe('F-07 harness primitives (NFR-TEST)', () => {
  it('parses pnpm separator, flags, environment and rejects unsafe input', () => {
    expect(parseArgs(['--', 'C-07-host-lobby', '--phones', '2', '--keep'], { KAKI_UAT_HEADED: '1' })).toEqual({ slice: 'C-07-host-lobby', phones: 2, keep: true, headed: true, out: 'auto', maxMb: 12, timeoutMin: 10, frames: false });
    expect(parseArgs(['C-07', '--timeout-min', '0.5']).timeoutMin).toBe(0.5);
    for (const value of ['0', '-1', 'NaN', 'Infinity']) expect(() => parseArgs(['C-07', '--timeout-min', value])).toThrow();
    expect(parseArgs(['C-07', '--headed'], {} ).headed).toBe(true);
    for (const args of [[], ['../escape'], ['x', '--phones', '9'], ['x', '--phones'], ['x', '--wat']]) expect(() => parseArgs(args)).toThrow();
  });
  it('uses worktree.sh port arithmetic and explicit ports', () => {
    expect(selectPorts({}, 'F-07')).toEqual({ web: 4880, signal: 4881 });
    expect(selectPorts({}, 'kaki-arcade')).not.toEqual(selectPorts({}, 'F-07'));
    expect(selectPorts({}, 'C-08')).toEqual({ web: 5160, signal: 5161 });
    expect(selectPorts({ KAKI_PORT_WEB: '6000', KAKI_PORT_SIGNAL: '6001' })).toEqual({ web: 6000, signal: 6001 });
    for (const value of ['0', '65536', '12x', '1.5', '']) expect(() => selectPorts({ KAKI_PORT_WEB: value })).toThrow();
    expect(() => selectPorts({ KAKI_PORT_WEB: '6000', KAKI_PORT_SIGNAL: '6000' })).toThrow();
  });
  it('refuses memory wait and unreadable memory before any launch', () => {
    expect(() => memoryGate(() => ({ status: 1, stdout: 'NOT ENOUGH MEMORY: wait', stderr: '' }))).toThrow('wait');
    expect(() => memoryGate(() => ({ status: 2, stdout: '', stderr: 'could not read' }))).toThrow('could not read');
    expect(memoryGate(() => ({ status: 0, stdout: 'ok', stderr: '' }))).toBe('ok');
  });
  it('names evidence stably and leaves visual review columns empty', () => {
    expect(evidenceName(2, 'phone1', 'join')).toBe('02-phone1-join.png');
    expect(() => evidenceName(1, '../bad', 'join')).toThrow();
    const report = reportSkeleton('F-07', ['01-host-room.png', '02-strip-join.png']);
    expect(report).toContain('| ![01-host-room.png](01-host-room.png) | | |');
    expect(report).toContain('Visual review and acceptance decisions are pending');
    expect(report).toContain('02-strip-join.png');
    const detailed = reportSkeleton('F-07', ['01-host-real.png', '02-host-demo-720p-demo-8.png', '03-strip-join.png'], { command: 'pnpm uat -- F-07', commit: 'abc', viewports: ['1280×720'], steps: [{ name: 'Create', ms: 20, status: 'completed' }], joins: [], errors: [1, 2].map(() => ({ page: 'host', kind: 'console', text: 'offline', expected: true })) });
    for (const text of ['## Real server', '## Demo 720p', '## Strips', '2 × host: offline', 'abc', '1280×720', '| Create | 20.0 | completed |']) expect(detailed).toContain(text);
  });
  it('interpolates thumb paths including exact endpoints', () => {
    expect(thumbPath([{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 0, y: 0 }], 2)).toEqual([{ x: 0, y: 0 }, { x: 5, y: 10 }, { x: 10, y: 20 }, { x: 5, y: 10 }, { x: 0, y: 0 }]);
    expect(() => thumbPath([], 2)).toThrow(); expect(() => thumbPath([{ x: NaN, y: 0 }])).toThrow();
    expect(() => thumbPath([{ x: 0, y: 0 }], 0)).toThrow();
  });
  it('matches exact expected errors and repeatable regular expressions', () => {
    expect(matchesError('known', 'known')).toBe(true); expect(matchesError('unknown known', 'known')).toBe(false);
    const pattern = /^known$/g; expect(matchesError('known', pattern)).toBe(true); expect(matchesError('known', pattern)).toBe(true);
    expect(matchesError('new bug', pattern)).toBe(false);
  });
  it('stops a process group including a descendant ignoring SIGTERM', async () => {
    const group = startGroup(process.execPath, ['-e', `const {spawn}=require('node:child_process'); const c=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{}); process.stdout.write('ready'); setInterval(()=>{},1000)"],{stdio:['ignore','pipe','ignore']}); c.stdout.once('data',()=>process.stdout.write(String(c.pid))); setInterval(()=>{},1000)`]);
    // startGroup drains output but data events still reach listeners.
    const [data] = await once(group.child.stdout, 'data') as [Buffer]; const descendant = Number(data.toString());
    const other = startGroup(process.execPath, ['-e', 'setInterval(()=>{},1000)']);
    await once(other.child, 'spawn');
    try {
      await stopGroup(group.child.pid, 100);
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(() => process.kill(descendant, 0)).toThrow();
      expect(() => process.kill(other.child.pid ?? 0, 0)).not.toThrow();
      await stopGroup(group.child.pid, 1); // already-gone cleanup is safe
    } finally { await Promise.all([stopGroup(other.child.pid, 100), stopGroup(group.child.pid, 1)]); }
  }, 10000);
});

it('replaces only its run subfolder and rejects traversal and linked parents (NFR-TEST)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'uat-isolation-'));
  try {
    const parent = join(root, 'uat/evidence/C-07');
    await mkdir(join(parent, 'kept'), { recursive: true });
    await writeFile(join(parent, 'REPORT.md'), 'human review');
    await writeFile(join(parent, 'kept/run.json'), 'kept run');
    await expect(prepareEvidence(root, 'C-07', 'kept')).rejects.toThrow('unmarked');
    expect(await readFile(join(parent, 'kept/run.json'), 'utf8')).toBe('kept run');
    const auto = await prepareEvidence(root, 'C-07', 'auto');
    await writeFile(join(auto, 'old.png'), 'old');
    await prepareEvidence(root, 'C-07', 'auto');
    await expect(readFile(join(auto, 'old.png'))).rejects.toThrow();
    expect(await readFile(join(parent, 'REPORT.md'), 'utf8')).toBe('human review');
    expect(await readFile(join(parent, 'kept/run.json'), 'utf8')).toBe('kept run');
    for (const out of ['../escape', '.', '/tmp', 'a/b', 'a_b', '']) {
      expect(() => parseArgs(['C-07', '--out', out])).toThrow();
      await expect(prepareEvidence(root, 'C-07', out)).rejects.toThrow();
    }
    expect(parseArgs(['C-07', '--out', 'run-2', '--max-mb', '8']).maxMb).toBe(8);
    for (const value of ['0', '-1', 'NaN']) expect(() => parseArgs(['C-07', '--max-mb', value])).toThrow();
    await symlink(parent, join(root, 'uat/evidence/linked'));
    await expect(prepareEvidence(root, 'linked', 'auto')).rejects.toThrow('symlink');
    expect(await readFile(join(parent, 'REPORT.md'), 'utf8')).toBe('human review');
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('readiness requires a live process and an expected response (NFR-TEST)', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response('other service')).mockResolvedValueOnce(new Response('<title>Kaki Arcade</title>'));
  vi.stubGlobal('fetch', fetch);
  let checks = 0;
  try {
    await ready('http://localhost', () => { checks++; }, new AbortController().signal, 1000, async response => (await response.text()).includes('Kaki Arcade'));
    expect(fetch).toHaveBeenCalledTimes(2); expect(checks).toBeGreaterThanOrEqual(4);
    await expect(ready('http://localhost', () => { throw new Error('Web exited'); }, new AbortController().signal)).rejects.toThrow('Web exited');
  } finally { vi.unstubAllGlobals(); }
});
