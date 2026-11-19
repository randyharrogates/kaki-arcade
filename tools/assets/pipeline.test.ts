import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import type { AssetManifest } from './manifest.js';

// Test-runner limits, not budgets (D-259). Loaded Python suite: 39 s at load 10.9, so 4 × 39 s.
const pipelineTimeoutMs = 156_000;
// The test outlives its child by 13 s, so a child killed at its own limit is reported as killed.
const childMarginMs = 13_000;
function childFailure(result: ReturnType<typeof spawnSync>, timeoutMs: number) {
  return `Python child ${result.signal ? 'was killed' : 'exited'}: status=${String(result.status)}, signal=${String(result.signal)}, timeout=${String(timeoutMs)} ms, error=${String(result.error)}\n${String(result.stderr)}`;
}

describe('PERF-023/024 asset pipeline', () => {
  it('packs, reconstructs, downsamples, checks budgets and validates manifests', () => {
    const result = spawnSync('python3', ['-m', 'unittest', 'discover', '-s', 'tools/assets', '-p', 'test_*.py'], { timeout: pipelineTimeoutMs, encoding: 'utf8' });
    expect(result.status, childFailure(result, pipelineTimeoutMs)).toBe(0);
    expect(result.stderr).toMatch(/Ran [1-9]\d* tests/);
    expect(result.stderr).toMatch(/\nOK\b/);
  }, pipelineTimeoutMs + childMarginMs);
  it('validates cook choreography without Blender', () => {
    const result = spawnSync('python3', ['-m', 'unittest', 'discover', '-s', 'tools/blender', '-p', 'test_cook_poses.py'], { timeout: 60_000, encoding: 'utf8' });
    expect(result.status, childFailure(result, 60_000)).toBe(0);
    expect(result.stderr).toMatch(/Ran 16 tests/);
    expect(result.stderr).toMatch(/\nOK\b/);
  }, 90_000);
  it('validates card pixels and palette mutations', () => {
    const result = spawnSync('python3', ['-m', 'unittest', 'discover', '-s', 'tools/blender', '-p', 'test_card_checks.py'], { timeout: 60_000, encoding: 'utf8' });
    expect(result.status, childFailure(result, 60_000)).toBe(0);
    expect(result.stderr).toMatch(/Ran 3 tests/);
    expect(result.stderr).toContain('OK');
  }, 90_000);
  it('validates effect geometry and seamless loops without Blender', () => {
    const result = spawnSync('python3', ['-m', 'unittest', 'discover', '-s', 'tools/blender', '-p', 'test_effect_geometry.py'], { timeout: 60_000, encoding: 'utf8' });
    expect(result.status, childFailure(result, 60_000)).toBe(0);
    expect(result.stderr).toMatch(/Ran 4 tests/);
    expect(result.stderr).toMatch(/\nOK\b/);
  }, 90_000);
  it('validates step icon geometry and mutation gates without Blender', () => {
    const result = spawnSync('python3', ['-m', 'unittest', 'discover', '-s', 'tools/blender', '-p', 'test_step_icon_geometry.py'], { timeout: 60_000, encoding: 'utf8' });
    expect(result.status, childFailure(result, 60_000)).toBe(0);
    expect(result.stderr).toMatch(/Ran [1-9]\d* tests/);
    expect(result.stderr).toMatch(/\nOK\b/);
  }, 90_000);
  it('exports the runtime manifest shape without a workspace package', () => {
    const empty: AssetManifest = {
      version: 1, alphaMode: 'straight', mipmaps: false, halfRule: 'divide geometry by two', atlases: [], sets: {}, rounds: {},
      totals: { full: { bytes: 0, gpuBytes: 0 }, half: { bytes: 0, gpuBytes: 0 } },
    };
    expect(empty.version).toBe(1);
  });
});
