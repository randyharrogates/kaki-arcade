#!/usr/bin/env node
// Writes packages/ui/tokens.css and packages/ui/specimen.html from the typed tokens.
//
//   node packages/ui/scripts/build.mjs          write both files
//   node packages/ui/scripts/build.mjs --check  exit 1 if either file is out of date
//
// Node runs the TypeScript sources directly (type stripping). The sources import each other
// without a file extension, as the workspace's bundler resolution requires, so a small
// resolve hook adds ".ts" for relative imports. No dependencies.

import { readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} file Source file under src/.
 * @param {string} name Exported function that returns the file's text.
 * @returns {Promise<string>}
 */
async function render(file, name) {
  /** @type {unknown} */
  const loaded = await import(pathToFileURL(join(root, 'src', file)).href);
  if (typeof loaded !== 'object' || loaded === null || !(name in loaded)) {
    throw new Error(`${file} does not export ${name}`);
  }
  /** @type {unknown} */
  const make = Reflect.get(loaded, name);
  if (typeof make !== 'function') throw new Error(`${file}: ${name} is not a function`);
  /** @type {unknown} */
  const text = Reflect.apply(make, undefined, []);
  if (typeof text !== 'string') throw new Error(`${file}: ${name} did not return text`);
  return text;
}

const outputs = [
  { path: join(root, 'tokens.css'), text: await render('css.ts', 'renderTokensCss') },
  { path: join(root, 'specimen.html'), text: await render('specimen.ts', 'renderSpecimenHtml') },
];

/**
 * @param {string} path
 * @returns {string | null} The file's text, or null when it does not exist.
 */
function current(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

const check = process.argv.includes('--check');
let stale = false;
for (const output of outputs) {
  if (!check) {
    writeFileSync(output.path, output.text);
    process.stdout.write(`wrote ${output.path} (${String(output.text.length)} characters)\n`);
  } else if (current(output.path) !== output.text) {
    stale = true;
    process.stderr.write(`out of date: ${output.path}\n`);
  }
}
if (stale) {
  process.stderr.write('run: node packages/ui/scripts/build.mjs\n');
  process.exit(1);
}
