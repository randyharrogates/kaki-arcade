import { execFileSync } from 'node:child_process';
import type * as Core from './core.js';
import { EventEmitter } from 'node:events';
import { it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ servers: [] as string[][], headless: undefined as boolean | undefined, refuse: '', events: [] as string[], launchAbort: false, kept: false, closed: 0, launches: [] as string[], closes: [] as string[], failLaunch: '', saved: [] as string[], engines: { host: { engine: '', version: '' }, phone: { engine: '', version: '' } }, exitServer: false, children: [] as EventEmitter[] }));
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
    if (state.launchAbort) process.emit('SIGINT');
    return Promise.resolve({ version: () => name + '-version', close: () => { state.closed++; state.closes.push(name); return Promise.resolve(); } });
  };
  return { chromium: { launch: (options: { headless: boolean; channel?: string }) => launch('chromium', options) },
    webkit: { launch: (options: { headless: boolean }) => launch('webkit', options) } };
});
vi.mock('./core.js', async importOriginal => {
  const original = await importOriginal<typeof Core>();
  return { ...original,
    memoryGate: () => { state.events.push('memory'); if (state.refuse === 'memory') throw new Error('memory refusal'); },
    assertPortFree: () => { state.events.push('port'); return state.refuse === 'port' ? Promise.reject(new Error('port refusal')) : Promise.resolve(); },
    prepareEvidence: () => { state.events.push('prepare'); return Promise.resolve('/tmp/fake-evidence'); },
    startGroup: (_command: string, args: string[]) => { state.servers.push(args); const child = Object.assign(new EventEmitter(), { pid: 999999 }); state.children.push(child); return { child, check() { /* Mock server alive. */ } }; },
    stopGroup: () => { state.events.push('stop'); return Promise.resolve(); }, ready: () => Promise.resolve(),
  };
});
vi.mock('./harness.js', () => ({ Harness: class {
  activeStep = undefined;
  set engines(value: { host: { engine: string; version: string }; phone: { engine: string; version: string } }) { state.engines = value; }
  init() { return Promise.resolve(); }
  abort() { /* Fake harness. */ }
  failureShots() { return Promise.resolve(); }
  assertNoUnexpectedErrors() { /* Fake harness. */ }
  assertSize(status: string) { state.saved.push(status); if (state.kept) setTimeout(() => process.emit('SIGINT'), 0); return Promise.resolve(); }
  save(status: string) { state.saved.push(status); return Promise.resolve(); }
} }));
vi.mock('./slices.js', () => ({ builtInSlices: { 'F-07': () => { if (state.exitServer) state.children.at(-1)?.emit('exit', 1); return Promise.resolve(); } } }));
import { run, parseRunnerArgs } from './runner.js';
beforeEach(() => { state.launches = []; state.closes = []; state.failLaunch = ''; state.refuse = ''; state.exitServer = false; state.children = []; state.events = []; state.launchAbort = false; state.kept = false; state.closed = 0; state.saved = []; process.exitCode = 0; });
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

it('runs an injected scenario through the same lifecycle and cleanup (NFR-PERF)', async () => {
  let executed = false;
  await run(['F-08', '--out', 'perf'], { headed: true, script: '/tmp/perf-scenario.mjs', execute: () => { executed = true; return Promise.resolve(); } });
  expect(executed).toBe(true);
  expect(state.headless).toBe(false);
  expect(state.saved).toEqual(['completed-awaiting-visual-review']);
  expect(state.closed).toBeGreaterThan(0);
  expect(state.events).toContain('stop');
});

it('explicit headless override wins over headed arguments and production uses build then preview (NFR-PERF)', async () => {
  state.servers = [];
  vi.mocked(execFileSync).mockClear();
  await run(['F-08', '--headed'], { headed: false, production: true, command: 'perf real command', script: '/tmp/perf-scenario.mjs', execute: () => Promise.resolve() });
  expect(state.headless).toBe(true);
  expect(vi.mocked(execFileSync).mock.calls[0]?.slice(0, 2)).toEqual(['pnpm', ['--dir', 'apps/web', 'exec', 'vite', 'build']]);
  expect(state.servers.some(args => args.includes('preview'))).toBe(true);
});

 it('passes explicit worker variables to local starts (DATA-003)', async () => {
  state.servers = [];
  await run(['F-07', '--signal-var', 'COUNTS_DEV_READ:true']);
  expect(state.servers[0]).toContain('COUNTS_DEV_READ:true');
  expect(state.servers[1]).not.toContain('COUNTS_DEV_READ:true');
});

it('parses browser defaults and validates choices (REL-004)', () => {
  expect(parseRunnerArgs(['F-07'])).toMatchObject({ hostBrowser: 'chromium', phoneBrowser: 'chromium', phoneBrowserExplicit: false });
  expect(parseRunnerArgs(['--', 'F-07', '--host-browser', 'chrome', '--phone-browser', 'webkit', '--phones', '2'])).toMatchObject({ hostBrowser: 'chrome', phoneBrowser: 'webkit', phoneBrowserExplicit: true, phones: 2 });
  expect(parseRunnerArgs(['F-07', '--phone-browser', 'chromium'])).toMatchObject({ phoneBrowser: 'chromium', phoneBrowserExplicit: true });
  for (const args of [['--host-browser'], ['--phone-browser'], ['--host-browser', 'edge'], ['--phone-browser', 'chrome']]) {
    expect(() => parseRunnerArgs(['F-07', ...args])).toThrow('Invalid');
  }
});

it.each([['chromium', 'chromium'], ['chrome', 'chromium'], ['webkit', 'webkit'], ['chrome', 'webkit']])(
  'launches %s / %s once per distinct browser and closes on success, failure and abort (REL-004)',
  async (host, phone) => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      for (const outcome of ['success', 'failure', 'abort']) {
        state.launches = []; state.closes = [];
        await run(['X-05', '--host-browser', host, '--phone-browser', phone], {
          script: '/tmp/matrix.mjs', execute: () => {
            if (outcome === 'abort') process.emit('SIGINT');
            if (outcome === 'failure') return Promise.reject(new Error('slice failed'));
            return Promise.resolve();
          },
        });
        expect(state.launches).toEqual([...new Set([host, phone])]);
        expect(state.closes.sort()).toEqual([...state.launches].sort());
        expect(process.exitCode).toBe(outcome === 'success' ? 0 : 1);
        process.exitCode = 0;
      }
    } finally { stderr.mockRestore(); process.exitCode = 0; }
  });

it('closes the first engine when the second launch fails (REL-004)', async () => {
  state.failLaunch = 'webkit';
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  try {
    await run(['F-07', '--host-browser', 'chrome', '--phone-browser', 'webkit']);
    expect(state.closes).toContain('chrome'); expect(process.exitCode).toBe(1);
  } finally { stderr.mockRestore(); process.exitCode = 0; }
});

it.each([
  [[], 'chromium (legacy iPhone emulation)'],
  [['--phone-browser', 'chromium'], 'chromium'],
  [['--phone-browser', 'webkit'], 'webkit'],
])('records phone engine metadata for flags %j (REL-004)', async (flags, engine) => {
  await run(['F-07', ...flags]);
  expect(state.engines).toMatchObject({ phone: { engine, version: engine === 'webkit' ? 'webkit-version' : 'chromium-version' } });
});
