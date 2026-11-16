#!/usr/bin/env node
// Workspace guard: the first step of `pnpm verify`. No dependencies.
//
// TypeScript only checks what a tsconfig reaches, and it says nothing about a folder that no
// tsconfig reaches. This guard fails when a workspace folder could slip through unchecked:
//
//   root-project          tsconfig.build.json does not reference ./tsconfig.json (root config
//                         files, tools/, uat/, spikes/).
//   build-reference       a folder matched by pnpm-workspace.yaml has a tsconfig.json that
//                         tsconfig.build.json does not reference.
//   no-tsconfig           a workspace folder holds .ts or .tsx files but has no tsconfig.json
//                         (folders under tools/ are covered by the root tsconfig.json instead).
//   sibling-reference     a folder has a tsconfig.<name>.json that its own tsconfig.json does
//                         not reference, so `tsc -b` and ESLint never load it.
//   dependency-reference  a package depends on another with `workspace:` but its tsconfig has
//                         no project reference to it.
//
// Every message names the file to edit and the exact line to add.
//
// Usage: node tools/check_workspace.mjs [root]   (root defaults to the repository root)

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {object} WorkspaceDependency
 * @property {string} name Package name, for example `@kaki/protocol`.
 * @property {boolean} dev True when it is listed only under devDependencies.
 */

/**
 * @typedef {object} WorkspaceFolder
 * @property {string} dir Folder relative to the root, forward slashes, for example `packages/ui`.
 * @property {string | null} name The package name, or null when there is no package.json.
 * @property {WorkspaceDependency[]} workspaceDeps Dependencies declared with `workspace:`.
 * @property {Record<string, string[]>} tsconfigs
 *   Each tsconfig file in the folder (`tsconfig.json`, `tsconfig.lib.json`, …) mapped to the
 *   `path` of each of its references, as written.
 * @property {boolean} hasTypeScript True when the folder holds any .ts or .tsx file.
 */

/**
 * @typedef {object} WorkspaceSnapshot
 * @property {string[]} buildReferences The reference paths in tsconfig.build.json, as written.
 * @property {WorkspaceFolder[]} folders
 */

/**
 * @typedef {object} Problem
 * @property {'root-project' | 'build-reference' | 'no-tsconfig' | 'sibling-reference' | 'dependency-reference'} rule
 * @property {string} file The file to edit, relative to the root.
 * @property {string} message
 */

export const BUILD_CONFIG = 'tsconfig.build.json';
const MAIN = 'tsconfig.json';
const LIB = 'tsconfig.lib.json';
const TEST = 'tsconfig.test.json';
const SKIPPED_FOLDERS = new Set(['node_modules', 'dist', 'coverage']);

/**
 * Resolves a reference path against the folder of the tsconfig that holds it. A reference to
 * a folder and a reference to that folder's tsconfig.json mean the same project.
 * @param {string} fromDir
 * @param {string} reference
 * @returns {string}
 */
function target(fromDir, reference) {
  const joined = posix.normalize(posix.join(fromDir, reference.replaceAll('\\', '/')));
  const trimmed = joined.replace(/\/$/, '');
  if (trimmed === MAIN) return '.';
  return trimmed.endsWith(`/${MAIN}`) ? trimmed.slice(0, -(MAIN.length + 1)) : trimmed;
}

/**
 * @param {string} path
 * @returns {string}
 */
const referenceLine = (path) => `{ "path": "${path}" }`;

/**
 * Checks a snapshot of the workspace. Pure: no file system, no process state.
 * @param {WorkspaceSnapshot} snapshot
 * @returns {Problem[]}
 */
export function checkWorkspace(snapshot) {
  /** @type {Problem[]} */
  const problems = [];
  const built = new Set(snapshot.buildReferences.map((reference) => target('.', reference)));
  const byName = new Map(snapshot.folders.flatMap((f) => (f.name === null ? [] : [[f.name, f]])));

  if (!built.has('.')) {
    problems.push({
      rule: 'root-project',
      file: BUILD_CONFIG,
      message: `add ${referenceLine(`./${MAIN}`)} to "references": without it the root config files, tools/, uat/ and spikes/ are never type-checked`,
    });
  }

  for (const folder of snapshot.folders) {
    const main = folder.tsconfigs[MAIN];

    if (main === undefined) {
      if (folder.hasTypeScript && !folder.dir.startsWith('tools/')) {
        problems.push({
          rule: 'no-tsconfig',
          file: `${folder.dir}/${MAIN}`,
          message: `create it (copy the tsconfig*.json files from packages/protocol) and add ${referenceLine(folder.dir)} to "references" in ${BUILD_CONFIG}: ${folder.dir} holds TypeScript that nothing type-checks`,
        });
      }
      continue;
    }

    if (!built.has(folder.dir)) {
      problems.push({
        rule: 'build-reference',
        file: BUILD_CONFIG,
        message: `add ${referenceLine(folder.dir)} to "references": ${folder.dir} has a ${MAIN} but is never type-checked or built`,
      });
    }

    const reached = new Set(main.map((reference) => target(folder.dir, reference)));
    for (const sibling of Object.keys(folder.tsconfigs).sort()) {
      if (sibling === MAIN || reached.has(`${folder.dir}/${sibling}`)) continue;
      problems.push({
        rule: 'sibling-reference',
        file: `${folder.dir}/${MAIN}`,
        message: `add ${referenceLine(`./${sibling}`)} to "references": ${folder.dir}/${sibling} is otherwise never loaded`,
      });
    }

    for (const dependency of folder.workspaceDeps) {
      const provider = byName.get(dependency.name);
      if (provider?.tsconfigs[MAIN] === undefined) continue;

      const providerHasLib = provider.tsconfigs[LIB] !== undefined;
      const wanted = providerHasLib ? `${provider.dir}/${LIB}` : provider.dir;
      const source = folder.tsconfigs[LIB] === undefined ? MAIN : LIB;
      const holders = dependency.dev && folder.tsconfigs[TEST] !== undefined ? [TEST, source] : [source];
      const present = holders.some((holder) =>
        (folder.tsconfigs[holder] ?? []).some((reference) => target(folder.dir, reference) === wanted),
      );
      if (present) continue;

      const holder = holders[0] ?? source;
      const relative = posix.relative(folder.dir, provider.dir);
      problems.push({
        rule: 'dependency-reference',
        file: `${folder.dir}/${holder}`,
        message: `add ${referenceLine(providerHasLib ? `${relative}/${LIB}` : relative)} to "references": ${folder.name ?? folder.dir} depends on ${dependency.name} (workspace:) but has no project reference to it`,
      });
    }
  }

  return problems;
}

/**
 * Parses JSON that may carry comments and trailing commas, as tsconfig files may.
 * @param {string} text
 * @returns {unknown}
 */
export function parseJsonc(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text.charAt(i);
    const next = text.charAt(i + 1);
    if (ch === '"') {
      let end = i + 1;
      while (end < text.length && text.charAt(end) !== '"') end += text.charAt(end) === '\\' ? 2 : 1;
      out += text.slice(i, end + 1);
      i = end + 1;
    } else if (ch === '/' && next === '/') {
      while (i < text.length && text.charAt(i) !== '\n') i += 1;
    } else if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
    } else {
      out += ch;
      i += 1;
    }
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}

/**
 * Reads the `packages:` list from the text of a pnpm-workspace.yaml.
 * @param {string} yaml
 * @returns {string[]}
 */
export function workspacePatterns(yaml) {
  /** @type {string[]} */
  const patterns = [];
  let inList = false;
  for (const line of yaml.split('\n')) {
    if (/^packages\s*:/.test(line)) {
      inList = true;
    } else if (inList) {
      const item = /^\s*-\s*(['"]?)([^'"#]+?)\1\s*(?:#.*)?$/.exec(line);
      if (item?.[2] !== undefined) patterns.push(item[2]);
      else if (/^\S/.test(line) && !line.startsWith('#')) inList = false;
    }
  }
  return patterns;
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function asRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : {};
}

/**
 * @param {string} file
 * @returns {string[]} The `path` of each reference in a tsconfig file.
 */
function readReferences(file) {
  const references = asRecord(parseJsonc(readFileSync(file, 'utf8'))).references;
  if (!Array.isArray(references)) return [];
  return references.flatMap((reference) => {
    const path = asRecord(reference).path;
    return typeof path === 'string' ? [path] : [];
  });
}

/**
 * @param {string} folder
 * @returns {boolean} True when the folder holds a .ts or .tsx file, outside build output.
 */
function holdsTypeScript(folder) {
  return readdirSync(folder, { withFileTypes: true }).some((entry) => {
    if (entry.isDirectory()) {
      const skipped = entry.name.startsWith('.') || SKIPPED_FOLDERS.has(entry.name);
      return !skipped && holdsTypeScript(join(folder, entry.name));
    }
    return entry.isFile() && /\.tsx?$/.test(entry.name);
  });
}

/**
 * Reads the workspace from disk.
 * @param {string} root
 * @returns {WorkspaceSnapshot}
 */
export function readWorkspace(root) {
  /** @param {string} path */
  const isFolder = (path) => statSync(path, { throwIfNoEntry: false })?.isDirectory() === true;
  /** @param {string} path */
  const isFile = (path) => statSync(path, { throwIfNoEntry: false })?.isFile() === true;

  /** @type {string[]} */
  const dirs = [];
  for (const pattern of workspacePatterns(readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8'))) {
    const parent = /^([^*!]+)\/\*$/.exec(pattern)?.[1];
    if (parent !== undefined) {
      if (!isFolder(join(root, parent))) continue;
      for (const entry of readdirSync(join(root, parent), { withFileTypes: true })) {
        const skipped = entry.name.startsWith('.') || SKIPPED_FOLDERS.has(entry.name);
        if (entry.isDirectory() && !skipped) dirs.push(`${parent}/${entry.name}`);
      }
    } else if (/^[^*!]+$/.test(pattern)) {
      if (isFolder(join(root, pattern))) dirs.push(pattern.replace(/\/$/, ''));
    } else {
      throw new Error(
        `pnpm-workspace.yaml: pattern "${pattern}" is not understood by tools/check_workspace.mjs (it reads "folder/*" and plain folders); extend the guard before using it`,
      );
    }
  }

  /** @type {WorkspaceFolder[]} */
  const folders = [];
  for (const dir of [...new Set(dirs)].sort()) {
    const full = join(root, dir);
    const hasPackage = isFile(join(full, 'package.json'));
    if (!hasPackage && !isFile(join(full, MAIN))) continue;

    /** @type {string | null} */
    let name = null;
    /** @type {Map<string, boolean>} */
    const deps = new Map();
    if (hasPackage) {
      const manifest = asRecord(JSON.parse(readFileSync(join(full, 'package.json'), 'utf8')));
      if (typeof manifest.name === 'string') name = manifest.name;
      for (const field of ['devDependencies', 'dependencies', 'peerDependencies', 'optionalDependencies']) {
        for (const [dependency, range] of Object.entries(asRecord(manifest[field]))) {
          if (typeof range !== 'string' || !range.startsWith('workspace:')) continue;
          deps.set(dependency, field === 'devDependencies' && !deps.has(dependency));
        }
      }
    }

    /** @type {Record<string, string[]>} */
    const tsconfigs = {};
    for (const entry of readdirSync(full).sort()) {
      if (/^tsconfig(\.[\w-]+)?\.json$/.test(entry)) tsconfigs[entry] = readReferences(join(full, entry));
    }

    folders.push({
      dir,
      name,
      workspaceDeps: [...deps].map(([dependency, dev]) => ({ name: dependency, dev })),
      tsconfigs,
      hasTypeScript: holdsTypeScript(full),
    });
  }

  return { buildReferences: readReferences(join(root, BUILD_CONFIG)), folders };
}

/**
 * @param {Problem} problem
 * @returns {string}
 */
export function formatProblem(problem) {
  return `${problem.file}  ${problem.rule}  ${problem.message}`;
}

/**
 * Runs the guard and prints the result.
 * @param {string} root
 * @returns {number} The process exit code: 0 when clean, 1 on any problem.
 */
export function run(root) {
  const snapshot = readWorkspace(root);
  const problems = checkWorkspace(snapshot);
  for (const problem of problems) console.error(formatProblem(problem));
  if (problems.length > 0) {
    console.error(`workspace check failed: ${String(problems.length)} problem(s)`);
    return 1;
  }
  console.log(`workspace check passed: ${String(snapshot.folders.length)} folder(s)`);
  return 0;
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] !== undefined && resolve(process.argv[1]) === thisFile) {
  process.exit(run(resolve(process.argv[2] ?? join(dirname(thisFile), '..'))));
}
