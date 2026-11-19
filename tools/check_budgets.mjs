#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
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
  // Read server-only data here; none of it enters the browser dependency graph.
  const source = readFileSync(new URL('../apps/signal/src/core/codes.ts', import.meta.url), 'utf8');
  const words = [...(/RUDE_WORDS = \[([\s\S]*?)\]/.exec(source)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(match => match[1] ?? '');
  /** @type {Set<string>} */
  const atlasFiles = new Set();
  let raw = 0; let gzip = 0;
  for (const file of files) {
    if (/\.map$|\.tsbuildinfo$/.test(file)) throw new Error(`Non-deployable build output: ${file}`);
    const bytes = readFileSync(resolve(output, file));
    if (file.endsWith('.css') && /(?:^|[;{])\s*(?!--)[-a-z]*(?:behaviour|colour|centre)[-a-z]*\s*:/.test(bytes.toString())) throw new Error(`Unknown CSS property: ${file}`);
    if (/unsupportedDemo|unsupported-demo|Cloud Noodle|Pebble Puff|Mango Moon|Waffle Fern|Velvet Kite|Bumble Bean|Puddle Pip|Comet Crumb|demo-seat-|Ah Boy\b|Ah Boyz\b|H7KQ9MXR/.test(bytes.toString())) throw new Error(`Demo fixture shipped: ${file}`);
    const text = bytes.toString();
    if (file.endsWith('.js') && text.includes('__kakiActionTiming')) throw new Error(`Development action timing hook shipped: ${file}`);
    if (/(?:^|\/)manifest-[^/]+\.json$/.test(file)) {
      const parsed = /** @type {unknown} */ (JSON.parse(text));
      if (!parsed || typeof parsed !== 'object' || !('atlases' in parsed) || !Array.isArray(parsed.atlases)) throw new Error('Missing or invalid atlas: ' + file);
      for (const atlas of /** @type {unknown[]} */ (parsed.atlases)) {
        if (!atlas || typeof atlas !== 'object' || !('full' in atlas) || !('half' in atlas)) throw new Error('Missing or invalid atlas: ' + file);
        for (const detail of [atlas.full, atlas.half]) {
          if (!detail || typeof detail !== 'object' || !('file' in detail) || typeof detail.file !== 'string' || !/^[\w./-]+\.webp$/.test(detail.file)) throw new Error('Missing or invalid atlas: ' + file);
          const target = resolve(output, dirname(file), detail.file);
          const path = relative(resolve(output), target);
          if (path.startsWith('..') || isAbsolute(path) || !existsSync(target) || !files.includes(path)) throw new Error(`Missing or invalid atlas: ${file} -> ${detail.file}`);
          atlasFiles.add(path);
        }
      }
    }
    // The filter list, not one word of it: quiz answers can match a single entry (a "69" answer did).
    const quoted = words.filter(word => ['"', "'", '`'].some(quote => text.includes(quote + word + quote)));
    if (text.includes('RUDE_WORDS') || quoted.length >= 3) throw new Error(`Server code filter shipped: ${file}`);
    raw += bytes.length; gzip += gzipSync(bytes).length;
  }
  // PERF-022 covers the shell. Manifest-named atlases are prepared on demand for a round
  // (PERF-023/024); unrelated public assets still count against the shell budget.
  const atlasGzip = [...atlasFiles].reduce((sum, file) => sum + gzipSync(readFileSync(resolve(output, file))).length, 0);
  return { raw, gzip, shellGzip: gzip - atlasGzip, files };
}
/** PERF-020: decimal KB, as transferred. @param {number} gzip */
export function withinControllerBudget(gzip) { return gzip <= 300_000; }

/** D-115: phone entry and static closure, plus explicitly lazy phone routes.
 * @param {string} output
 * @param {Parameters<typeof hostBundleSize>[1]} manifest
 */
export function controllerBundleSize(output, manifest) {
  const files = new Set(['index.html']);
  const visited = new Set();
  /** @param {string} file */
  function add(file) {
    if (files.has(file)) return;
    const target = resolve(output, file);
    const path = relative(resolve(output), target);
    if (path.startsWith('..') || isAbsolute(path)) throw new Error('Bundle file outside output');
    files.add(file);
    if (file.endsWith('.css')) {
      const css = readFileSync(target, 'utf8');
      for (const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g)) {
        const url = match[1] ?? match[2];
        if (!url || /^(?:data:|https?:|#|\/\/)/.test(url)) continue;
        const clean = decodeURIComponent(url.split(/[?#]/)[0] ?? '');
        add(clean.startsWith('/') ? clean.slice(1) : relative(resolve(output), resolve(output, dirname(file), clean)));
      }
    }
  }
  /** @param {string} key @param {boolean} phone */
  function visit(key, phone = false) {
    phone = key !== 'index.html' && (phone || /(?:^|\/)phone-route\.tsx$/.test(key));
    const visitKey = `${String(phone)}:${key}`;
    if (visited.has(visitKey)) return;
    visited.add(visitKey);
    const entry = manifest[key];
    if (!entry) throw new Error(`Missing controller manifest entry: ${key}`);
    for (const file of [entry.file, ...(entry.css ?? []), ...(entry.assets ?? [])]) add(file);
    for (const imported of [...(entry.imports ?? []), ...(phone ? entry.dynamicImports ?? [] : [])]) visit(imported, phone);
  }
  visit('index.html');
  // PhonePage is currently static. If split into a lazy route, include its static graph too.
  for (const key of Object.keys(manifest)) if (/(?:^|\/)phone-route\.tsx$/.test(key)) visit(key, true);
  let raw = 0; let gzip = 0;
  for (const file of files) { const bytes = readFileSync(resolve(output, file)); raw += bytes.length; gzip += gzipSync(bytes).length; }
  return { raw, gzip, files: [...files] };
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
  const controller = controllerBundleSize(output, manifest);
  console.log(`PERF-020 controller (shared entry): ${String(controller.raw)} bytes raw, ${String(controller.gzip)} bytes gzip / 300000`);
  if (!withinControllerBudget(controller.gzip)) throw new Error('PERF-020 controller transfer budget exceeded');
  const deployed = deployBundleSize(output);
  console.log(`Deployment total (including round atlases): ${String(deployed.raw)} bytes raw, ${String(deployed.gzip)} bytes gzip`);
  console.log(`PERF-022 deploy shell excluding round atlases: ${String(deployed.shellGzip)} bytes gzip / 1500000`);
  if (!withinHostBudget(deployed.shellGzip)) throw new Error('PERF-022 host transfer budget exceeded');
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
