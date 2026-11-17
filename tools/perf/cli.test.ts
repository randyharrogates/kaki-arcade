import { expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { phasedFixture } from '../../packages/platform/src/harness/fixture';
import { main } from './cli.js';
import type * as Headless from './headless.js';
import { measureGame } from './headless.js';
vi.mock('./memory.js', () => ({ memoryGate: () => ({ freePercent: 60, pressureLevel: 1, source: 'test' }) }));
vi.mock('./headless.js', async original => {
  const actual = await original<typeof Headless>();
  return { ...actual, installedGames: () => Promise.resolve([phasedFixture]), measureGame: vi.fn(actual.measureGame) };
});
it('fresh checkout defaults avoid reviewed evidence; ownership refusal precedes measurement (NFR-PERF)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kaki-perf-fresh-'));
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root);
  try {
    const reviewed = join(root, 'uat/evidence/F-08-perf-harness/first-run');
    await mkdir(reviewed, { recursive: true }); await writeFile(join(reviewed, 'perf.json'), 'reviewed');
    await main([]);
    expect(await readFile(join(root, 'uat/evidence/simulation/perf/.uat-run'), 'utf8')).toContain('kaki-uat-v1');
    const report = JSON.parse(await readFile(join(root, 'uat/evidence/simulation/perf/perf.json'), 'utf8')) as { machine: { memoryGate: object } };
    expect(report.machine.memoryGate).toEqual({ freePercent: 60, pressureLevel: 1, source: 'test' });
    expect(await readFile(join(reviewed, 'perf.json'), 'utf8')).toBe('reviewed');
    vi.mocked(measureGame).mockClear();
    await expect(main(['--slice', 'F-08-perf-harness', '--out', 'first-run'])).rejects.toThrow('unmarked');
    expect(measureGame).not.toHaveBeenCalled();
  } finally { cwd.mockRestore(); await rm(root, { recursive: true, force: true }); process.exitCode = 0; }
});
