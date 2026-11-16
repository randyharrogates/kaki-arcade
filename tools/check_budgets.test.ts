import { randomBytes } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { deployBundleSize, hostBundleSize, withinHostBudget } from './check_budgets.mjs';

describe('PERF-022 host budget', () => {
  it('counts HTML, CSS, assets and transitive chunks once, ignoring unrelated output', () => {
    const output = mkdtempSync(join(tmpdir(), 'kaki-host-budget-'));
    try {
      mkdirSync(join(output, 'assets'));
      const files = ['index.html', 'assets/entry.js', 'assets/style.css', 'assets/shared.js', 'assets/icon.svg'];
      for (const file of [...files, 'unrelated.js']) writeFileSync(join(output, file), file);
      const size = hostBundleSize(output, {
        'index.html': { file: 'assets/entry.js', css: ['assets/style.css'], imports: ['shared'], dynamicImports: ['shared'] },
        shared: { file: 'assets/shared.js', assets: ['assets/icon.svg'], imports: ['index.html'] },
      });
      expect(size.files.sort()).toEqual(files.sort());
      expect(size.raw).toBe(files.reduce((sum, file) => sum + Buffer.byteLength(file), 0));
      expect(size.gzip).toBe(files.reduce((sum, file) => sum + gzipSync(file).length, 0));
      expect(() => hostBundleSize(output, {})).toThrow('Missing host');
      expect(() => hostBundleSize(output, { 'index.html': { file: '../private' } })).toThrow('outside output');
    } finally { rmSync(output, { recursive: true, force: true }); }
  });
  it('accepts the exact budget and rejects one byte over it', () => {
    expect(withinHostBudget(1_500_000)).toBe(true);
    expect(withinHostBudget(1_500_001)).toBe(false);
  });
});

it('counts a large incompressible public asset absent from the manifest (PERF-022)', () => {
  const output = mkdtempSync(join(tmpdir(), 'kaki-public-budget-'));
  try {
    writeFileSync(join(output, 'index.html'), '<link href="style.css">');
    writeFileSync(join(output, 'entry.js'), '');
    writeFileSync(join(output, 'style.css'), 'body { background: url(/large.bin) }');
    writeFileSync(join(output, 'large.bin'), randomBytes(2_000_000));
    const manifest = { 'index.html': { file: 'entry.js', css: ['style.css'] } };
    expect(withinHostBudget(hostBundleSize(output, manifest).gzip)).toBe(true);
    expect(withinHostBudget(deployBundleSize(output).gzip)).toBe(false);
    writeFileSync(join(output, 'entry.js.map'), '{}');
    expect(() => deployBundleSize(output)).toThrow('Non-deployable');
  } finally { rmSync(output, { recursive: true, force: true }); }
});

it.each(['entry.js.map', 'lib.tsbuildinfo', 'fixture.js'])('rejects non-deployable output %s', file => {
  const output = mkdtempSync(join(tmpdir(), 'kaki-clean-deploy-'));
  try {
    writeFileSync(join(output, file), file === 'fixture.js' ? 'Cloud Noodle' : '{}');
    expect(() => deployBundleSize(output)).toThrow();
  } finally { rmSync(output, { recursive: true, force: true }); }
});
