import { spawnSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, writeFile, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { summary, evaluate, timing, resolution, machine } from './metrics.js';
import { parse } from './cli.js';
import { writeReport } from './report.js';
import type { Report } from './report.js';
import { registry, loadScenario } from './registry.js';
import { measureGame, runMatch, allocationSources } from './headless.js';
import { phasedFixture } from '../../packages/platform/src/harness/fixture';
describe('F-08 NFR-PERF measurement contracts', () => {
  it('uses nearest-rank percentiles including empty and tiny samples', () => {
    expect(summary([])).toMatchObject({ count: 0, median: null, p95: null, max: null });
    expect(summary([3])).toMatchObject({ median: 3, p95: 3, p99: 3 });
    expect(summary([4, 1, 3, 2])).toMatchObject({ median: 2, p95: 4 });
    expect(summary(Array.from({ length: 100 }, (_, i) => i + 1))).toMatchObject({ median: 50, p95: 95, p99: 99, over50: 50 });
    expect(() => summary([NaN])).toThrow();
  });
  it('evaluates budgets without turning missing evidence into a pass', () => {
    expect(evaluate('PERF-001', [16.7, 50], { minimum: 2, headed: true, seconds: 180 }).status).toBe('fail');
    expect(evaluate('PERF-001', Array.from({ length: 100 }, () => 16.7), { minimum: 100, headed: true, seconds: 180 }).status).toBe('pass');
    expect(evaluate('PERF-001', [51], { minimum: 1, headed: true, seconds: 180 }).status).toBe('fail');
    expect(evaluate('PERF-001', [1], { minimum: 1, headed: false, seconds: 180 }).status).toBe('not assessed');
    expect(evaluate('PERF-001', [1], { minimum: 1, headed: true, seconds: 179 }).status).toBe('insufficient samples');
    expect(evaluate('PERF-010', [], { minimum: 100 }).status).toBe('insufficient samples');
    expect(evaluate('PERF-010', [50], { minimum: 1 }).status).toBe('pass');
    expect(evaluate('PERF-010', [50.01], { minimum: 1 }).status).toBe('fail');
    expect(evaluate('PERF-010', [], { minimum: 100, reason: 'No controller' }).status).toBe('not assessed');
    expect(evaluate('PERF-012', [1], { minimum: 1 }).status).toBe('pass');
    expect(evaluate('PERF-012', [2], { minimum: 1 }).status).toBe('fail');
  });
  it('correlates epoch-based touch, receipt, application and feedback frames', () => {
    expect(timing({ touch: 1000, receipt: 1010, applied: 1016, frame: 8, touchFrame: 3, feedbackFrame: 4 })).toEqual({ inputMs: 16, transportMs: 10, applyWaitMs: 6, feedbackFrames: 1 });
    expect(() => timing({ touch: 5, receipt: 2, applied: 6, frame: 1 })).toThrow();
    expect(() => timing({ touch: 5, receipt: 6, applied: 7, frame: 1, touchFrame: 2, feedbackFrame: 1 })).toThrow();
  });
  it('parses only supported flags, defaults to headed and accepts pnpm separator', () => {
    expect(parse([])).toEqual({ scenario: 'simulation', hostBrowser: 'chromium', headed: true, phones: 8, slice: 'simulation', out: 'perf', build: 'development' });
    expect(parse(['--', 'lobby-8', '--headless', '--phones', '4'])).toEqual({ scenario: 'lobby-8', hostBrowser: 'chromium', headed: false, phones: 4, slice: 'lobby-8', out: 'perf-4', build: 'development' });
    for (const args of [['../escape'], ['--phones', '2'], ['--phones'], ['--wat']]) expect(() => parse(args)).toThrow();
  });
  it('discovers and validates scenarios and marks the picker slot unavailable', async () => {
    expect(await registry(process.cwd())).toContain('lobby-8');
    expect((await loadScenario(process.cwd(), 'lobby-8')).frameReason).toContain('Lobby');
    await expect(loadScenario(process.cwd(), 'picker')).rejects.toThrow('pending');
    await expect(loadScenario(process.cwd(), '../escape')).rejects.toThrow();
  });
  it('writes versioned reports with the UAT ownership guard and never replaces human evidence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kaki-perf-test-'));
    const report: Report = { schemaVersion: 1, layer: 'simulation', scenario: 'fixture', machine: {}, assessments: [{ id: 'PERF-001', status: 'not assessed', reason: 'Node' }], measurements: [], notes: [] };
    try {
      expect(await writeReport(root, 'fixture', report)).toBe(0);
      const folder = join(root, 'uat/evidence/fixture/perf');
      expect(JSON.parse(await readFile(join(folder, 'perf.json'), 'utf8')) as unknown).toEqual(report);
      expect(await readFile(join(folder, 'PERF.md'), 'utf8')).toContain('not assessed');
      const browserReport = { ...report, layer: 'browser' as const, requiredAssessments: ['PERF-012'], machine: { memoryGate: { freePercent: 60, pressureLevel: 1, source: 'test' } }, measurements: [{ framesMs: summary([16]), clockTickMs: 0.1 }], assessments: [{ id: 'PERF-012', status: 'not assessed' as const, reason: 'missing feedback' }] };
      expect(await writeReport(root, 'fixture', browserReport)).toBe(1);
      const markdown = await readFile(join(folder, 'PERF.md'), 'utf8');
      expect(markdown).toContain('Memory gate:');
      expect(markdown).toContain('not branded Chrome');
      expect(markdown).not.toContain('Allocation includes the bot/driver harness');
      expect(markdown).not.toContain('undefined');
      expect(await readFile(join(folder, '.uat-run'), 'utf8')).toContain('kaki-uat-v1');
      expect(await writeReport(root, 'fixture', { ...report, assessments: [{ id: 'PERF-001', status: 'fail', reason: 'slow' }] })).toBe(1);
      await rm(join(folder, '.uat-run')); await writeFile(join(folder, 'human.txt'), 'keep');
      await expect(writeReport(root, 'fixture', report)).rejects.toThrow('unmarked');
      expect(await readFile(join(folder, 'human.txt'), 'utf8')).toBe('keep');
      await mkdir(join(root, 'outside')); await symlink(join(root, 'outside'), join(root, 'uat/evidence/link'));
      await expect(writeReport(root, 'link', report)).rejects.toThrow('symlink');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('short allocation smoke reports method, uncertainty and deterministic state', async () => {
    const result = await measureGame(phasedFixture, 1);
    expect(result).toMatchObject({ steps: 12, complete: true, allocation: { deterministic: true }, gc: { method: expect.any(String) as unknown } });
  });
  it('cheap fixture smoke has deterministic structure and state without machine thresholds', () => {
    const first = runMatch(phasedFixture, 4), second = runMatch(phasedFixture, 4);
    expect(first).toMatchObject({ steps: 12, complete: true, simulatedSeconds: 0.2, stepMs: { count: 12 }, driverMs: { count: 12 } });
    expect(first.hash).toBe(second.hash);
    expect(Object.keys(first)).toEqual(Object.keys(second));
    expect(runMatch(phasedFixture, 1, 3).complete).toBe(false);
  });
});

it('production scan checks built bytes, rejects hook markers and empty output', async () => {
  const { scanProduction } = await import('./production.js');
  const folder = await mkdtemp(join(tmpdir(), 'kaki-perf-scan-'));
  try {
    await expect(scanProduction(folder)).rejects.toThrow('Empty');
    await writeFile(join(folder, 'app.js'), 'export {};');
    expect(await scanProduction(folder)).toBe(10);
    await writeFile(join(folder, 'app.js'), 'kaki-perf-timing-v1');
    await expect(scanProduction(folder)).rejects.toThrow('shipped');
  } finally { await rm(folder, { recursive: true, force: true }); }
});

it('reports measured-resolution boundaries, privacy and nearest-JS allocation ownership (NFR-PERF)', () => {
  expect(machine()).not.toHaveProperty('hostname');
  expect(resolution(summary([0.1, 0.4]), 0.1)).toMatchObject({ median: 'below resolution', max: 'resolved' });
  expect(timing({ touch: 5, receipt: 4, applied: 5, frame: 1 })).toMatchObject({ transportMs: 0 });
  expect(allocationSources({ selfSize: 0, callFrame: { functionName: 'step', url: 'file:///games/example/src/step.ts' }, children: [{ selfSize: 4096, callFrame: { functionName: 'Array.map', url: '' }, children: [] }] })).toEqual({ 'file:///games/example/src/step.ts': 4096 });
});

it('source import hook leaves Playwright package imports alone (NFR-PERF)', () => {
  const child = spawnSync(process.execPath, ['--import', './tools/perf/hooks.mjs', '-e', "await import('./tools/uat/runner.ts'); await import('./tools/perf/browser.ts')"], { encoding: 'utf8' });
  expect(child.stderr).toBe('');
  expect(child.status).toBe(0);
});
