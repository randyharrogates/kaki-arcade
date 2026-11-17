import { RUDE_WORDS } from '../apps/signal/src/core/codes';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { controllerBundleSize, withinControllerBudget, deployBundleSize, hostBundleSize, withinHostBudget } from './check_budgets.mjs';

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

 it('PERF-020 measures the shared controller graph separately and enforces 300 KB', () => {
  const output = mkdtempSync(join(tmpdir(), 'kaki-controller-budget-'));
  try {
    writeFileSync(join(output, 'index.html'), 'controller');
    writeFileSync(join(output, 'entry.js'), randomBytes(301000));
    const manifest = { 'index.html': { file: 'entry.js' } };
    const size = controllerBundleSize(output, manifest);
    expect(size.files.sort()).toEqual(['entry.js', 'index.html']);
    expect(withinHostBudget(size.gzip)).toBe(true);
    expect(withinControllerBudget(size.gzip)).toBe(false);
    expect(withinControllerBudget(300000)).toBe(true);
    expect(withinControllerBudget(300001)).toBe(false);
  } finally { rmSync(output, { recursive: true, force: true }); }
});

it('counts CSS referenced public files against the 300 KB controller budget', () => {
  const output = mkdtempSync(join(tmpdir(), 'kaki-controller-public-'));
  try {
    writeFileSync(join(output, 'index.html'), ''); writeFileSync(join(output, 'entry.js'), '');
    writeFileSync(join(output, 'public.bin'), randomBytes(301000));
    writeFileSync(join(output, 'style.css'), 'body{background:url(/public.bin)}');
    expect(withinControllerBudget(controllerBundleSize(output, { 'index.html': { file: 'entry.js', css: ['style.css'] } }).gzip)).toBe(false);
  } finally { rmSync(output, { recursive: true, force: true }); }
});
it.each(['overscroll-behaviour', 'background-colour', 'text-centre'])('rejects unknown built CSS property %s', property => {
  const output = mkdtempSync(join(tmpdir(), 'kaki-css-'));
  try {
    writeFileSync(join(output, 'style.css'), `body{${property}:none}`);
    expect(() => deployBundleSize(output)).toThrow('Unknown CSS property');
  } finally { rmSync(output, { recursive: true, force: true }); }
});
it.each(['Ah Boy', 'Ah Boyz', 'H7KQ9MXR'])('rejects phone demo marker %s', marker => {
  const output = mkdtempSync(join(tmpdir(), 'kaki-demo-'));
  try { writeFileSync(join(output, 'entry.js'), marker); expect(() => deployBundleSize(output)).toThrow('Demo fixture'); }
  finally { rmSync(output, { recursive: true, force: true }); }
});

it('permits British spellings in custom properties and CSS values', () => {
  const output = mkdtempSync(join(tmpdir(), 'kaki-css-custom-'));
  try {
    writeFileSync(join(output, 'style.css'), ':root{--ka-panel-edge-colour:red}body{color:var(--ka-panel-edge-colour)}');
    expect(deployBundleSize(output).files).toEqual(['style.css']);
  } finally { rmSync(output, { recursive: true, force: true }); }
});

it.each(['RUDE_WORDS', JSON.stringify(RUDE_WORDS), JSON.stringify(RUDE_WORDS.slice(0, 3))])('rejects server filter literal %s in production output', literal => {
  const output = mkdtempSync(join(tmpdir(), 'kaki-server-filter-'));
  try { writeFileSync(join(output, 'entry.js'), literal); expect(() => deployBundleSize(output)).toThrow('Server code filter shipped'); }
  finally { rmSync(output, { recursive: true, force: true }); }
});

it('PERF-020 includes CSS, fonts and shared chunks exactly once', () => {
  const output = mkdtempSync(join(tmpdir(), 'kaki-controller-assets-'));
  const files = ['index.html', 'entry.js', 'shared.js', 'style.css', 'font.woff2'];
  try {
    for (const file of files) writeFileSync(join(output, file), file);
    const size = controllerBundleSize(output, {
      'index.html': { file: 'entry.js', imports: ['shared'], css: ['style.css'], assets: ['font.woff2'] },
      shared: { file: 'shared.js', css: ['style.css'], assets: ['font.woff2'] },
    });
    expect(size.files.sort()).toEqual([...files].sort());
    expect(size.gzip).toBe(files.reduce((sum, file) => sum + gzipSync(file).length, 0));
  } finally { rmSync(output, { recursive: true, force: true }); }
});
it.each(['"69"', '"Ah Boys to Men"'])('permits legitimate single answer %s', literal => {
  const output = mkdtempSync(join(tmpdir(), 'kaki-answer-'));
  try { writeFileSync(join(output, 'entry.js'), literal); expect(() => deployBundleSize(output)).not.toThrow(); }
  finally { rmSync(output, { recursive: true, force: true }); }
});
it('D-115 walks static cycles, lazy phone routes and CSS public URLs, excluding host dynamic imports', () => {
  const output = mkdtempSync(join(tmpdir(), 'kaki-phone-closure-'));
  try {
    mkdirSync(join(output, 'assets'));
    const files = ['index.html', 'assets/entry.js', 'assets/shared.js', 'assets/phone.js', 'assets/phone-control.js', 'assets/style.css', 'assets/icon.svg', 'font.woff2'];
    for (const file of files) writeFileSync(join(output, file), file.endsWith('.css') ? '@font-face{src:url(/font.woff2)}body{background:url(./icon.svg)}' : file);
    const size = controllerBundleSize(output, {
      'index.html': { file: 'assets/entry.js', imports: ['shared'], dynamicImports: ['host', 'src/phone-route.tsx'] },
      shared: { file: 'assets/shared.js', imports: ['index.html'], css: ['assets/style.css'], assets: ['assets/icon.svg'] },
      'src/phone-route.tsx': { file: 'assets/phone.js', imports: ['shared'], dynamicImports: ['phone-control'] },
      'phone-control': { file: 'assets/phone-control.js', imports: ['shared'] },
      host: { file: 'missing-host-only.js', dynamicImports: ['bank'] },
    });
    expect(size.files.sort()).toEqual(files.sort());
    expect(size.gzip).toBe(files.reduce((sum, file) => sum + gzipSync(file.endsWith('.css') ? '@font-face{src:url(/font.woff2)}body{background:url(./icon.svg)}' : file).length, 0));
  } finally { rmSync(output, { recursive: true, force: true }); }
});
