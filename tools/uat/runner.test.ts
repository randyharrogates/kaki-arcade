import type * as Core from './core.js';
import { EventEmitter } from 'node:events';
import { it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ refuse: '', events: [] as string[], launchAbort: false, kept: false, closed: 0, saved: [] as string[], exitServer: false, children: [] as EventEmitter[] }));
vi.mock('node:fs/promises', () => ({
  access: (path: string) => path.endsWith('.wrangler') && state.refuse === 'wrangler' ? Promise.resolve() : path.endsWith('.wrangler') ? Promise.reject(Object.assign(new Error('missing'), { code: 'ENOENT' })) : Promise.resolve(),
  mkdtemp: () => Promise.resolve('/tmp/fake-uat'), readFile: () => Promise.resolve('"main": "src/worker.ts"'),
  writeFile: () => Promise.resolve(), rm: () => Promise.resolve(),
}));
vi.mock('node:child_process', () => ({ execFileSync: () => 'commit' }));
vi.mock('playwright', () => ({ chromium: { launch: () => { if (state.launchAbort) process.emit('SIGINT'); return Promise.resolve({ close: () => { state.closed++; return Promise.resolve(); } }); } } }));
vi.mock('./core.js', async importOriginal => {
  const original = await importOriginal<typeof Core>();
  return { ...original,
    memoryGate: () => { state.events.push('memory'); if (state.refuse === 'memory') throw new Error('memory refusal'); },
    assertPortFree: () => { state.events.push('port'); return state.refuse === 'port' ? Promise.reject(new Error('port refusal')) : Promise.resolve(); },
    prepareEvidence: () => { state.events.push('prepare'); return Promise.resolve('/tmp/fake-evidence'); },
    startGroup: () => { const child = Object.assign(new EventEmitter(), { pid: 999999 }); state.children.push(child); return { child, check() { /* Mock server alive. */ } }; },
    stopGroup: () => { state.events.push('stop'); return Promise.resolve(); }, ready: () => Promise.resolve(),
  };
});
vi.mock('./harness.js', () => ({ Harness: class {
  activeStep = undefined;
  init() { return Promise.resolve(); }
  abort() { /* Fake harness. */ }
  failureShots() { return Promise.resolve(); }
  assertNoUnexpectedErrors() { /* Fake harness. */ }
  assertSize(status: string) { state.saved.push(status); if (state.kept) setTimeout(() => process.emit('SIGINT'), 0); return Promise.resolve(); }
  save(status: string) { state.saved.push(status); return Promise.resolve(); }
} }));
vi.mock('./slices.js', () => ({ builtInSlices: { 'F-07': () => { if (state.exitServer) state.children.at(-1)?.emit('exit', 1); return Promise.resolve(); } } }));
import { run } from './runner.js';
beforeEach(() => { state.refuse = ''; state.exitServer = false; state.children = []; state.events = []; state.launchAbort = false; state.kept = false; state.closed = 0; state.saved = []; process.exitCode = 0; });
it('does not prepare evidence on memory or port refusal (NFR-TEST)', async () => {
  for (const refusal of ['wrangler', 'memory', 'port']) {
    state.refuse = refusal; state.events = [];
    await expect(run(['F-07'])).rejects.toThrow();
    expect(state.events).not.toContain('prepare');
  }
});
it('prepares only after checks and keeps successful status after keep interrupt (NFR-TEST)', async () => {
  state.kept = true;
  await run(['F-07', '--keep']);
  expect(state.events.slice(0, 4)).toEqual(['memory', 'port', 'port', 'prepare']);
  expect(state.saved).toEqual(['completed-awaiting-visual-review']);
  expect(process.exitCode).toBe(0); expect(state.events).toContain('stop');
});
it('explicitly closes a browser returned after launch was aborted (NFR-TEST)', async () => {
  state.launchAbort = true;
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  try { await run(['F-07']); await new Promise(resolve => setTimeout(resolve, 0)); expect(state.closed).toBeGreaterThan(0); expect(process.exitCode).toBe(1); }
  finally { stderr.mockRestore(); process.exitCode = 0; }
});

it('keeps completed status when the keep deadline expires (NFR-TEST)', async () => {
  await run(['F-07', '--keep', '--timeout-min', '0.0002']);
  expect(state.saved).toEqual(['completed-awaiting-visual-review']); expect(process.exitCode).toBe(0);
});

it('names a server that exits mid-run and cleans its groups (NFR-TEST)', async () => {
  state.exitServer = true;
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  try {
    await run(['F-07']);
    expect(state.saved).toContain('failed'); expect(process.exitCode).toBe(1);
    expect(stderr.mock.calls.map(call => String(call[0])).join('')).toContain('Web server exited');
    expect(state.events).toContain('stop');
  } finally { stderr.mockRestore(); process.exitCode = 0; }
});
