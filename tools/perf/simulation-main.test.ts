import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { main } from './cli.js';
import type * as Metrics from './metrics.js';
import { summary } from './metrics.js';
const state = vi.hoisted(() => ({ slow: false, unsupported: false }));
vi.mock('./memory.js', () => ({ memoryGate: () => ({}) }));
vi.mock('./metrics.js', async original => ({ ...await original<typeof Metrics>(), machine: () => ({ contention: 'unknown' }) }));
vi.mock('./headless.js', () => ({
  installedGames: () => Promise.resolve([{}]),
  measureGame: (_game: object, players: number) => Promise.resolve(state.unsupported ? { game: 'fixture', players, status: 'not assessed' } : {
    game: 'fixture', players, stepMs: summary([0.1]), assessmentSeeds: [808, 809],
    assessmentStepMs: players === 8 ? { count: 17484, median: 0.000100123, p95: state.slow ? 10 : 0.00025, p99: state.slow ? 20 : 0.00092, max: 21.01234, over50: 0 } : undefined,
  }),
}));
it('bare main blocks slow or unsupported games and passes good games, with assessed evidence (PERF-040)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'f10-main-'));
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root);
  const oldExit = process.exitCode;
  try {
    for (const slow of [true, false]) {
      state.slow = slow;
      await main([]);
      expect(process.exitCode).toBe(slow ? 1 : 0);
    }
    const markdown = await readFile(join(root, 'uat/evidence/simulation/perf/PERF.md'), 'utf8');
    expect(markdown).toContain('17,484 steps over 2 matches; p95 0.00025 ms ≤ 1.67; p99 0.00092 ms ≤ 3.34');
    expect(markdown).toContain('| fixture | 2 | 808, 809 | 17484 | 0.0001 | 0.00025 | 0.00092 | 21 |');
    expect(markdown).toContain('Samples (first match)');
    state.unsupported = true;
    await main([]);
    expect(process.exitCode).toBe(1);
    expect(await readFile(join(root, 'uat/evidence/simulation/perf/PERF.md'), 'utf8')).toContain('module does not support eight players');
  } finally { state.unsupported = false; process.exitCode = oldExit; cwd.mockRestore(); await rm(root, { recursive: true, force: true }); }
});
