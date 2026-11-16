#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
/** Sum only the host entry's transitive files, counting shared files once.
 * @param {string} output
 * @param {Record<string, { file: string, css?: string[], assets?: string[], imports?: string[], dynamicImports?: string[] }>} manifest
 */
export function hostBundleSize(output, manifest) {
  const files = new Set(['index.html']);
  const visited = new Set();
  /** @param {string} key */
  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const entry = manifest[key];
    if (!entry) throw new Error(`Missing host manifest entry: ${key}`);
    for (const file of [entry.file, ...(entry.css ?? []), ...(entry.assets ?? [])]) files.add(file);
    for (const imported of [...(entry.imports ?? []), ...(entry.dynamicImports ?? [])]) visit(imported);
  }
  visit('index.html');
  let raw = 0;
  let gzip = 0;
  for (const file of files) {
    const target = resolve(output, file);
    const path = relative(resolve(output), target);
    if (path.startsWith('..') || isAbsolute(path)) throw new Error('Bundle file outside output');
    const bytes = readFileSync(target);
    raw += bytes.length; gzip += gzipSync(bytes).length;
  }
  return { raw, gzip, files: [...files] };
}
/** Every deployed file may be loaded through CSS or a public URL. @param {string} output */
export function deployBundleSize(output) {
  /** @type {string[]} */
  const files = [];
  /** @param {string} directory */
  function walk(directory) {
    for (const entry of readdirSync(resolve(output, directory), { withFileTypes: true })) {
      const file = directory ? `${directory}/${entry.name}` : entry.name;
      if (file === '.vite') continue;
      if (entry.isDirectory()) walk(file); else files.push(file);
    }
  }
  walk('');
  let raw = 0; let gzip = 0;
  for (const file of files) {
    if (/\.map$|\.tsbuildinfo$/.test(file)) throw new Error(`Non-deployable build output: ${file}`);
    const bytes = readFileSync(resolve(output, file));
    if (/Cloud Noodle|Pebble Puff|Mango Moon|Waffle Fern|Velvet Kite|Bumble Bean|Puddle Pip|Comet Crumb|demo-seat-/.test(bytes.toString())) throw new Error(`Demo fixture shipped: ${file}`);
    raw += bytes.length; gzip += gzipSync(bytes).length;
  }
  return { raw, gzip, files };
}
/** PERF-022: decimal MB, as transferred. @param {number} gzip */
export function withinHostBudget(gzip) { return gzip <= 1_500_000; }

export function checkHostBundle() {
  // The existing asset-pipeline harness invokes this script from an isolated asset tree.
  // A real workspace always builds the host; an asset-only fixture has no package manifest.
  if (!existsSync('package.json') && !existsSync('apps/web/package.json')) {
    console.log('no bundles yet (isolated asset fixture has no web workspace)');
    return;
  }
  const build = spawnSync('pnpm', ['--filter', '@kaki/web', 'build'], { stdio: 'inherit' });
  if (build.status !== 0) throw new Error('Host build failed');
  const output = 'apps/web/dist';
  const parsed = /** @type {unknown} */ (JSON.parse(readFileSync(`${output}/.vite/manifest.json`, 'utf8')));
  const manifest = /** @type {Record<string, { file: string, css?: string[], assets?: string[], imports?: string[], dynamicImports?: string[] }>} */ (parsed);
  const size = hostBundleSize(output, manifest);
  console.log(`PERF-022 host: ${String(size.raw)} bytes raw, ${String(size.gzip)} bytes gzip / 1500000`);
  const deployed = deployBundleSize(output);
  console.log(`PERF-022 deploy: ${String(deployed.raw)} bytes raw, ${String(deployed.gzip)} bytes gzip / 1500000`);
  if (!withinHostBudget(deployed.gzip)) throw new Error('PERF-022 host transfer budget exceeded');
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
checkHostBundle();
const config = 'assets/src/pipeline.json';
const sourceConfig = existsSync(config) ? /** @type {{ sets?: unknown[] }} */ (JSON.parse(readFileSync(config, 'utf8'))) : undefined;
if (!sourceConfig || sourceConfig.sets?.length === 0) {
  console.log('no asset sets in assets/src yet');
} else {
  mkdirSync('assets/dist', { recursive: true });
  const output = mkdtempSync(resolve('assets/dist/.verify-'));
  try {
    const result = spawnSync('python3', ['tools/assets/pipeline.py', '--config', config, '--output', output], { stdio: 'inherit' });
    process.exitCode = result.status ?? 1;
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}

}
