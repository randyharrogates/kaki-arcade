import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import type { AssetManifest } from './manifest.js';

describe('PERF-023/024 asset pipeline', () => {
  it('packs, reconstructs, downsamples, checks budgets and validates manifests', () => {
    const result = spawnSync('python3', ['-m', 'unittest', 'discover', '-s', 'tools/assets', '-p', 'test_*.py'], { timeout: 60_000, encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toMatch(/Ran 14 tests/);
    expect(result.stderr).toContain('OK');
  });
  it('exports the runtime manifest shape without a workspace package', () => {
    const empty: AssetManifest = {
      version: 1, alphaMode: 'straight', mipmaps: false, halfRule: 'divide geometry by two', atlases: [], sets: {}, rounds: {},
      totals: { full: { bytes: 0, gpuBytes: 0 }, half: { bytes: 0, gpuBytes: 0 } },
    };
    expect(empty.version).toBe(1);
  });
});
