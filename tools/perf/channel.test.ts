import type * as Core from '../uat/core.js';
import { EventEmitter } from 'node:events';
import { it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ servers: [] as string[][], headless: undefined as boolean | undefined, refuse: '', events: [] as string[], launches: [] as string[], closes: [] as string[], failLaunch: '', saved: [] as string[], engines: { host: { engine: '', version: '' }, phone: { engine: '', version: '' } }, exitServer: false, children: [] as EventEmitter[] }));
vi.mock('node:fs/promises', () => ({
  access: (path: string) => path.endsWith('.wrangler') && state.refuse === 'wrangler' ? Promise.resolve() : path.endsWith('.wrangler') ? Promise.reject(Object.assign(new Error('missing'), { code: 'ENOENT' })) : Promise.resolve(),
  mkdtemp: () => Promise.resolve('/tmp/fake-uat'), readFile: () => Promise.resolve('"main": "src/worker.ts"'),
  writeFile: () => Promise.resolve(), rm: () => Promise.resolve(),
}));
vi.mock('node:child_process', () => ({ execFileSync: vi.fn(() => 'commit') }));
vi.mock('playwright', () => {
  const launch = (engine: string, options: { headless: boolean; channel?: string }) => {
    const name = options.channel ?? engine; state.launches.push(name); state.headless = options.headless;
    if (state.failLaunch === name) return Promise.reject(new Error('launch failed'));
    return Promise.resolve({ version: () => name + '-version', close: () => { state.closes.push(name); return Promise.resolve(); } });
  };
  return { chromium: { launch: (options: { headless: boolean; channel?: string }) => launch('chromium', options) },
    webkit: { launch: (options: { headless: boolean }) => launch('webkit', options) } };
});
vi.mock('../uat/core.js', async importOriginal => {
  const original = await importOriginal<typeof Core>();
  return { ...original,
    memoryGate: () => { state.events.push('memory'); if (state.refuse === 'memory') throw new Error('memory refusal'); },
    assertPortFree: () => { state.events.push('port'); return state.refuse === 'port' ? Promise.reject(new Error('port refusal')) : Promise.resolve(); },
    prepareEvidence: () => { state.events.push('prepare'); return Promise.resolve('/tmp/fake-evidence'); },
    startGroup: (_command: string, args: string[]) => { state.servers.push(args); const child = Object.assign(new EventEmitter(), { pid: 999999 }); state.children.push(child); return { child, check() { /* Mock server alive. */ } }; },
    stopGroup: () => { state.events.push('stop'); return Promise.resolve(); }, ready: () => Promise.resolve(),
  };
});
vi.mock('../uat/harness.js', () => ({ Harness: class {
  activeStep = undefined;
  set engines(value: { host: { engine: string; version: string }; phone: { engine: string; version: string } }) { state.engines = value; }
  init() { return Promise.resolve(); }
  abort() { /* Fake harness. */ }
  failureShots() { return Promise.resolve(); }
  assertNoUnexpectedErrors() { /* Fake harness. */ }
  assertSize(status: string) { state.saved.push(status); return Promise.resolve(); }
  save(status: string) { state.saved.push(status); return Promise.resolve(); }
} }));
vi.mock('../uat/slices.js', () => ({ builtInSlices: { 'F-07': () => { if (state.exitServer) state.children.at(-1)?.emit('exit', 1); return Promise.resolve(); } } }));
import { main } from './cli.js';
vi.mock('./memory.js', () => ({ memoryGate: () => ({}) }));
vi.mock('./registry.js', () => ({ loadScenario: () => Promise.resolve({ name: 'test' }) }));
vi.mock('./browser.js', () => ({ browserScenario: () => Promise.resolve() }));
beforeEach(() => { state.launches = []; state.closes = []; state.failLaunch = ''; state.refuse = ''; state.exitServer = false; state.children = []; state.events = []; state.saved = []; process.exitCode = 0; });

it.each(['chrome', 'chromium'])('passes %s launch options through the perf command (PERF-001)', async engine => {
  await main(['test', '--host-browser', engine, '--headless']);
  expect(state.launches).toEqual(engine === 'chrome' ? ['chrome', 'chromium'] : ['chromium']);
  expect(state.headless).toBe(true);
  expect(state.engines.host).toEqual({ engine, version: engine + '-version' });
});

it('fails the perf command when branded Chrome cannot launch (PERF-001)', async () => {
  state.failLaunch = 'chrome';
  const error = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  try {
    await main(['test', '--host-browser', 'chrome', '--headless']);
    expect(process.exitCode).toBe(1);
  } finally { error.mockRestore(); process.exitCode = 0; }
  expect(state.launches).toEqual(['chrome']);
  expect(state.closes).toEqual([]);
});
