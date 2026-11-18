import { expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessSimulation, refreshGuard, summary } from './metrics.js';
import { parseRefresh } from './display.js';
import { parse } from './cli.js';
import { writeReport } from './report.js';
it('assesses eight-player step tails and refuses contention (PERF-040)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'f10-assess-'));
  try {
    for (const [p95, p99, contention, status, exit] of [
      [1.67, 3.34, false, 'pass', 0], [1.68, 3.34, false, 'fail', 1],
      [1.67, 3.35, false, 'fail', 1], [1, 2, true, 'not assessed', 1],
      [10, 20, true, 'fail', 1],
    ] as const) {
      const assessment = assessSimulation('fixture', { ...summary([]), count: 10000, p95, p99 }, contention);
      expect(assessment.status).toBe(status);
      expect(assessment.reason).toBe(`10,000 steps over 0 matches; p95 ${String(p95)} ms ${p95 > 1.67 ? '>' : '≤'} 1.67; p99 ${String(p99)} ms ${p99 > 3.34 ? '>' : '≤'} 3.34${contention ? '; contention' : ''}`);
      expect(await writeReport(root, 'fixture', { schemaVersion: 1, layer: 'simulation', scenario: 'fixture', machine: {}, assessments: [assessment], measurements: [], notes: [] })).toBe(exit);
      if (status === 'not assessed') expect(await readFile(join(root, 'uat/evidence/fixture/perf/PERF.md'), 'utf8')).toContain('| not assessed (contention) |');
    }
    expect(assessSimulation('fixture', summary([1]), false).status).toBe('insufficient samples');
  } finally { await rm(root, { recursive: true, force: true }); }
});
it.each([59.94, 60, 60.06, 59.93, 60.07, 75, 120, null])('requires OS-reported 60 Hz, got %s (PERF-001)', hz => {
  expect(refreshGuard(hz).passed).toBe(hz !== null && hz >= 59.94 && hz <= 60.06);
  expect(parseRefresh(`Displays:\n  Monitor:\n    Resolution: 1920 x 1080\n    ${hz === null ? '' : `UI Looks like: 1920 x 1080 @ ${String(hz)}Hz`}`)).toBe(hz);
});
it('refuses ambiguous display modes and parses explicit refresh fields (PERF-001)', () => {
  expect(parseRefresh('Displays:\n  Monitor:\n    Refresh Rate: 60 Hz')).toBe(60);
  expect(parseRefresh('@ 60Hz\n@ 120Hz')).toBeNull();
});
it('parses the branded Chrome option and keeps Chromium default (PERF-001)', () => {
  expect(parse([]).hostBrowser).toBe('chromium');
  expect(parse(['lobby-8', '--host-browser', 'chrome']).hostBrowser).toBe('chrome');
  for (const value of [[], ['webkit'], ['firefox']]) expect(() => parse(['--host-browser', ...value])).toThrow();
});

it('supplies Rabakz category validation and collects at least 10000 warmed steps (PERF-040)', async () => {
  const { rabakz } = await import('../../games/rabakz/src/index');
  const { runMatch, measureGame } = await import('./headless.js');
  const { phasedFixture } = await import('../../packages/platform/src/harness/fixture');
  expect(runMatch(rabakz, 8, 12)).toMatchObject({ steps: 12, stepMs: { count: 12 } });
  const result = await measureGame(phasedFixture, 8);
  if (!('assessmentStepMs' in result)) throw new Error('Unsupported fixture');
  expect(result.assessmentStepMs?.count).toBeGreaterThanOrEqual(10000);
  expect(result.stepMs.count).toBe(12);
  expect(result.assessmentSeeds).toEqual(Array.from({ length: result.assessmentSeeds?.length ?? 0 }, (_, i) => 808 + i));
});

it('refuses the dev Mac two-display output, including the built-in panel without Hz (PERF-001)', () => {
  const output = `Graphics/Displays:
    Apple M3:
      Displays:
        Color LCD:
          Display Type: Built-in Liquid Retina Display
          Resolution: 2560 x 1664 Retina
          Main Display: Yes
          Mirror: Off
          Online: Yes
          Automatically Adjust Brightness: Yes
          Connection Type: Internal
        1920 x 1080:
          Resolution: 1920 x 1080 (1080p FHD - Full High Definition)
          UI Looks like: 1920 x 1080 @ 75.00Hz
          Mirror: Off
          Online: Yes
          Rotation: Supported`;
  expect(parseRefresh(output)).toBeNull();
  const two = 'Displays:\n  A:\n    Resolution: 1920 x 1080\n    Refresh Rate: 60 Hz\n  B:\n    Resolution: 2560 x 1440\n    Refresh Rate: 60 Hz';
  expect(parseRefresh(two)).toBe(60);
  expect(parseRefresh(two.replace(/60 Hz$/, '75 Hz'))).toBeNull();
  expect(parseRefresh(two + '\n  Virtual display:\n    Online: Yes')).toBeNull();
  expect(refreshGuard(parseRefresh(two + '\n  Virtual display:\n    Online: Yes')).passed).toBe(false);
  expect(parseRefresh(two + '\n  Offline display:\n    Online: No')).toBe(60);
});

it('rounds reason values to three significant figures and uses singular match (PERF-040)', () => {
  expect(assessSimulation('fixture', { ...summary([]), count: 10000, p95: 0.0007090000001426233, p99: 0.00312345 }, false, 1).reason)
    .toBe('10,000 steps over 1 match; p95 0.000709 ms ≤ 1.67; p99 0.00312 ms ≤ 3.34');
});
