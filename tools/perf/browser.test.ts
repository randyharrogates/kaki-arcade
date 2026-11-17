import type * as Metrics from './metrics.js';
import { machine } from './metrics.js';
import { expect, it, vi } from 'vitest';
import type { Harness } from '../uat/harness.js';
import type { Report } from './report.js';
import { openHost, browserScenario } from './browser.js';
import type { Capture, Scenario } from './browser.js';
vi.mock('./metrics.js', async original => ({ ...await original<typeof Metrics>(), machine: vi.fn(() => ({ contention: 'unknown', loadAverageStart: [0, 0, 0] })) }));
const saved = vi.hoisted(() => ({ report: undefined as Report | undefined }));
vi.mock('./report.js', () => ({ writeReport: (_root: string, _name: string, report: Report) => {
  saved.report = report;
  return Promise.resolve(Number(report.assessments.some(a => a.status === 'fail' || a.status === 'insufficient samples')));
} }));
async function runScenario(run: (h: Harness, c: Capture, advance: (ms: number) => void) => Promise<void>, roundFrames = 600, direct = false, options: Partial<Scenario> = {}) {
  let now = 0, starts = 0;
  const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
  const host = { addInitScript: () => Promise.resolve(), evaluate: (fn: () => unknown) => {
    const code = String(fn);
    if (code.includes('document.addEventListener')) { starts++; return Promise.resolve(); }
    if (code.includes('__kakiPerfStop')) return Promise.resolve({ clockTickMs: 0.1, frames: Array.from({ length: starts > 1 ? roundFrames : 1000 }, () => starts > 1 ? 16 : 100), longTasks: [], hidden: false, longTasksSupported: true });
    if (code.includes('await peer.getStats()')) return Promise.resolve({ verified: direct, paths: direct ? ['direct'] : [] });
    return Promise.resolve();
  } };
  const h = { step: (_name: string, action: () => Promise<unknown>) => action(), host, maxPhones: 8, createRoom: () => Promise.resolve(), browser: { browserType: () => ({ name: () => 'chromium' }), version: () => 'test' } } as unknown as Harness;
  try {
    await browserScenario(h, { name: 'test', busiestRound: true, inputReason: 'no game', feedbackReason: 'no controller', ...options, run: async (h, capture) => {
      now = 200000; // Lobby time must not qualify the round.
      await run(h, capture, ms => { now += ms; }); now += 200000;
    } }, true);
  } finally { clock.mockRestore(); }
  return saved.report;
}
it('excludes lobby frames and lobby duration, and rejects a short round (PERF-001)', async () => {
  await expect(runScenario(async (_h, capture) => { await capture.roundStart(); await capture.roundEnd(); })).rejects.toThrow('Performance');
  expect(saved.report?.assessments[0]?.status).toBe('insufficient samples');
  expect(saved.report?.measurements[0]).toMatchObject({ roundSeconds: 0, frameSampleStatus: 'insufficient samples', framesMs: { count: 600, max: 16 } });
});
it('requires a round window even when lobby capture has enough frames (PERF-001)', async () => {
  await expect(runScenario(() => Promise.resolve())).rejects.toThrow('Performance');
  expect(saved.report?.measurements[0]).toMatchObject({ frameSampleStatus: 'insufficient samples' });
});
it('round frame minimum cannot be supplied by lobby frames (PERF-001)', async () => {
  await expect(runScenario(async (_h, capture, advance) => { await capture.roundStart(); advance(180000); await capture.roundEnd(); }, 599)).rejects.toThrow();
  expect(saved.report?.measurements[0]).toMatchObject({ framesMs: { count: 599 }, frameSampleStatus: 'insufficient samples' });
});

it('a full window qualifies independently of slow lobby frames (PERF-001)', async () => {
  const report = await runScenario(async (_h, capture, advance) => { await capture.roundStart(); advance(180000); await capture.roundEnd(); });
  expect(report?.assessments[0]?.status).toBe('pass');
  expect(report?.measurements[0]).toMatchObject({ roundSeconds: 180, frameSampleStatus: 'sufficient samples', framesMs: { max: 16 } });
});
it('feedback-only pairs still fail when late; missing feedback never passes (PERF-012)', async () => {
  for (const missing of [false, true]) {
    const action = runScenario(async (_h, capture, advance) => {
      await capture.roundStart(); advance(180000); await capture.roundEnd();
      for (let i = 0; i < 100; i++) {
        const touch = { marker: 'kaki-perf-timing-v1' as const, player: 'p', sequence: i, stage: 'touch' as const, epochMs: 10, frame: 1 };
        capture.events.push(touch);
        if (!missing) capture.events.push({ ...touch, stage: 'feedback', frame: 3 });
      }
    }, 600, false, { feedbackReason: '' });
    if (missing) await expect(action).rejects.toThrow(); else await expect(action).rejects.toThrow('Performance');
    expect(saved.report?.assessments[2]?.status).toBe(missing ? 'not assessed' : 'fail');
  }
});
it('input budget requires observed direct stats (PERF-010)', async () => {
  for (const direct of [false, true]) {
    const report = await runScenario(async (_h, capture, advance) => {
      await capture.roundStart(); advance(180000); await capture.roundEnd();
      for (let i = 0; i < 100; i++) capture.applied({ touch: 10, receipt: 11, applied: 12, frame: 1 });
    }, 600, direct, { inputReason: '' });
    expect(report?.assessments[1]?.status).toBe(direct ? 'pass' : 'not assessed');
  }
});

it('correlated feedback cannot pad a manual sample without feedback (PERF-012)', async () => {
  await expect(runScenario(async (_h, capture, advance) => {
    await capture.roundStart(); advance(180000); await capture.roundEnd();
    for (let i = 0; i < 100; i++) {
      const touch = { marker: 'kaki-perf-timing-v1' as const, player: 'p', sequence: i, stage: 'touch' as const, epochMs: 10, frame: 1 };
      capture.events.push(touch, { ...touch, stage: 'feedback', frame: 2 });
    }
    capture.applied({ touch: 10, receipt: 11, applied: 12, frame: 1 });
  }, 600, false, { feedbackReason: '' })).rejects.toThrow('not assessed');
  expect(saved.report?.assessments[2]?.status).toBe('not assessed');
});
it('contention at either endpoint revokes passes but preserves failures (PERF-001)', async () => {
  for (const endpoint of [0, 1]) for (const fail of [false, true]) {
    vi.mocked(machine).mockReturnValueOnce({ contention: endpoint === 0 ? 'detected' : 'unknown', loadAverageStart: [0, 0, 0] } as ReturnType<typeof machine>)
      .mockReturnValueOnce({ contention: endpoint === 1 ? 'detected' : 'unknown', loadAverageStart: [0, 0, 0] } as ReturnType<typeof machine>);
    await expect(runScenario(async (_h, capture, advance) => {
      await capture.roundStart(); advance(180000); await capture.roundEnd();
      if (fail) for (let i = 0; i < 100; i++) capture.applied({ touch: 0, receipt: 60, applied: 70, frame: 1 });
    }, 600, true, fail ? { inputReason: '' } : {})).rejects.toThrow();
    if (fail) expect(saved.report?.assessments[1]?.status).toBe('fail');
    if (!fail) expect(saved.report?.assessments[0]).toMatchObject({ status: 'not assessed', reason: 'contention' });
  }
});

it('custom host pages navigate locally without room creation or phones (NFR-PERF)', async () => {
  const goto = vi.fn(() => Promise.resolve());
  const createRoom = vi.fn(() => Promise.resolve());
  const h = { origin: 'http://127.0.0.1:5150', host: { goto }, createRoom } as unknown as Harness;
  await openHost(h, { name: 'custom', hostPage: '/@fs/work/games/rabakz/dev/index.html', run: () => Promise.resolve() });
  expect(goto).toHaveBeenCalledWith('http://127.0.0.1:5150/@fs/work/games/rabakz/dev/index.html');
  expect(createRoom).not.toHaveBeenCalled();
  await openHost(h, { name: 'lobby', run: () => Promise.resolve() });
  expect(createRoom).toHaveBeenCalledOnce();
  for (const hostPage of ['https://example.com', '//example.com/page', 'relative']) {
    await expect(openHost(h, { name: 'bad', hostPage, run: () => Promise.resolve() })).rejects.toThrow('local absolute path');
  }
});
