// The file-system half of the build: reads the sources, the blocklist and the picture folder,
// runs the pure builder, and writes the generated folder.

import { createHash } from 'node:crypto';
import {
  closeSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import type { BuildInput, BuildResult, PictureFile, Problem } from '../src/tools';
import {
  BANK_FORMAT,
  INDEX_FILE,
  PICTURE_FILE_PATTERN,
  buildBank,
  imageFormat,
  parseBlocklist,
} from '../src/tools';

export interface Paths {
  /** Folder of `<category>.json` source files. */
  readonly sources: string;
  /** Folder of picture files. May be absent. */
  readonly pictures: string;
  /** The all-ages word list. May be absent. */
  readonly blocklist: string;
  /** Where the chunks, the index and the used pictures are written. */
  readonly out: string;
}

const PICTURES_FOLDER = 'pictures';

/** The package's own folders. */
export function packagePaths(root: string = resolve(import.meta.dirname, '..')): Paths {
  return {
    sources: join(root, 'src', 'questions'),
    pictures: join(root, PICTURES_FOLDER),
    blocklist: join(root, 'blocklist.txt'),
    out: join(root, 'generated'),
  };
}

export interface Arguments {
  readonly paths: Paths;
  readonly strict: boolean;
}

const PATH_OPTIONS = ['--out', '--sources', '--pictures', '--blocklist'] as const;

/**
 * Reads the command line of the build. Each of `--out`, `--sources`, `--pictures` and
 * `--blocklist` takes a path; `--strict` takes none. Returns a message instead when an option
 * is unknown or has no value, so a slip never turns into a path.
 */
export function parseArguments(args: readonly string[], base: Paths): Arguments | string {
  const paths = { ...base };
  let strict = false;
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at] ?? '';
    if (arg === '--') continue;
    if (arg === '--strict') {
      strict = true;
      continue;
    }
    const option = PATH_OPTIONS.find((name) => name === arg);
    if (option === undefined) return `unknown argument "${arg}"`;
    const value = args[at + 1];
    if (value === undefined || value.length === 0 || value.startsWith('--')) {
      return `${option} needs a path after it`;
    }
    paths[option.slice(2) as keyof Paths] = resolve(value);
    at += 1;
  }
  return { paths, strict };
}

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function inspectPicture(path: string): PictureFile {
  const head = new Uint8Array(12);
  const file = openSync(path, 'r');
  try {
    readSync(file, head, 0, head.length, 0);
  } finally {
    closeSync(file);
  }
  return { bytes: statSync(path).size, format: imageFormat(head) };
}

export function readInput(paths: Paths): BuildInput {
  const files = existsSync(paths.sources)
    ? readdirSync(paths.sources)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => ({ name, text: readFileSync(join(paths.sources, name), 'utf8') }))
    : [];
  const pictures = new Map<string, PictureFile>();
  if (existsSync(paths.pictures)) {
    for (const name of readdirSync(paths.pictures).sort()) {
      const path = join(paths.pictures, name);
      if (statSync(path).isFile() && !name.startsWith('.')) {
        pictures.set(name, inspectPicture(path));
      }
    }
  }
  const blocklist = parseBlocklist(
    existsSync(paths.blocklist) ? readFileSync(paths.blocklist, 'utf8') : '',
  );
  return { files, blocklist, pictures, hash: sha256 };
}

/** Validates and builds in memory. Nothing is written. */
export function buildFromDisk(paths: Paths): BuildResult {
  return buildBank(readInput(paths));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The only shapes of file the build writes, and so the only ones it will ever remove. */
const CHUNK_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[0-9a-f]{12}\.json$/;
const isChunkName = (value: unknown): value is string =>
  typeof value === 'string' && CHUNK_NAME.test(value);
const isPictureName = (value: unknown): value is string =>
  typeof value === 'string' && PICTURE_FILE_PATTERN.test(value);

/**
 * The files an earlier build wrote into `out`, read from its index: the chunk files, the
 * pictures and the index itself. A name in the index that is not of a shape the build writes
 * (`<category>.<12 hex>.json`, `pictures/<picture file>`) is ignored, so a forged or damaged
 * index cannot point the build at anything else. Null when `out` holds no index of this
 * format, which means the folder is not a build's output.
 */
export function previousOutput(out: string): string[] | null {
  let index: unknown;
  try {
    index = JSON.parse(readFileSync(join(out, INDEX_FILE), 'utf8'));
  } catch {
    return null;
  }
  if (!isRecord(index) || index.format !== BANK_FORMAT || !Array.isArray(index.categories)) {
    return null;
  }
  const files = new Set<string>();
  for (const category of index.categories as unknown[]) {
    if (!isRecord(category)) continue;
    if (isChunkName(category.file)) files.add(category.file);
    if (!Array.isArray(category.pictures)) continue;
    for (const picture of category.pictures as unknown[]) {
      if (isRecord(picture) && isPictureName(picture.file)) {
        files.add(join(PICTURES_FOLDER, picture.file));
      }
    }
  }
  return [...files, INDEX_FILE];
}

/**
 * Why the build must not write into `out`, or null. A folder that does not exist or is empty
 * is fine; so is the output of an earlier build. Any other folder is refused, so `--out .` or
 * `--out src/questions` cannot destroy anything. A `pictures` entry inside it that is a link,
 * or that is the folder the pictures are read from, is refused too: copying and removing
 * pictures there would act on files that are not the build's.
 */
export function outFolderFault(out: string, picturesSource?: string): string | null {
  if (!existsSync(out)) return null;
  if (!statSync(out).isDirectory()) return `${out} is a file, not a folder`;
  const pictures = join(out, PICTURES_FOLDER);
  const entry = lstatSync(pictures, { throwIfNoEntry: false });
  if (entry?.isSymbolicLink() === true) {
    return `${pictures} is a link to another place; nothing was written. Remove the link or choose another folder`;
  }
  if (entry !== undefined && !entry.isDirectory()) {
    return `${pictures} is a file, not a folder; nothing was written`;
  }
  if (
    entry !== undefined &&
    picturesSource !== undefined &&
    existsSync(picturesSource) &&
    realpathSync(pictures) === realpathSync(picturesSource)
  ) {
    return `${pictures} is the folder the pictures are read from; nothing was written. Choose another folder`;
  }
  if (readdirSync(out).length === 0 || previousOutput(out) !== null) return null;
  return `${out} is not empty and is not the output of an earlier build (it has no ${INDEX_FILE} of format ${String(BANK_FORMAT)}); nothing was written. Choose an empty or new folder`;
}

/**
 * Writes the build's files and the pictures it uses into `out`: the chunks and pictures first,
 * the index last, so an index never describes files that are not there yet. Then the files the
 * earlier build listed and this one did not write are removed. Nothing else is touched.
 */
export function writeOutput(paths: Paths, result: BuildResult): void {
  if (result.output === null) return;
  const fault = outFolderFault(paths.out, paths.pictures);
  if (fault !== null) throw new Error(fault);
  const before = previousOutput(paths.out) ?? [];
  mkdirSync(paths.out, { recursive: true });
  const pictures = join(paths.out, PICTURES_FOLDER);
  const written = new Set<string>();
  if (result.output.pictures.length > 0) mkdirSync(pictures, { recursive: true });
  for (const picture of result.output.pictures) {
    copyFileSync(join(paths.pictures, picture), join(pictures, picture));
    written.add(join(PICTURES_FOLDER, picture));
  }
  const index = result.output.files.filter((file) => file.name === INDEX_FILE);
  const chunks = result.output.files.filter((file) => file.name !== INDEX_FILE);
  for (const file of [...chunks, ...index]) {
    writeFileSync(join(paths.out, file.name), file.text);
    written.add(file.name);
  }
  for (const file of before) {
    if (!written.has(file)) rmSync(join(paths.out, file), { force: true });
  }
  if (existsSync(pictures) && readdirSync(pictures).length === 0) rmdirSync(pictures);
}

export function formatProblem(problem: Problem): string {
  const where =
    problem.question === undefined ? problem.file : `${problem.file} ${problem.question}`;
  return `${problem.severity}  ${where}  [${problem.rule}] ${problem.message}`;
}

export interface RunResult {
  readonly code: 0 | 1;
  /** What to print. */
  readonly text: string;
}

/**
 * The build command. Fails, writing nothing, on any error, and on a folder it must not write
 * into; with `strict`, on any warning too.
 */
export function runBuild(paths: Paths, options: { readonly strict?: boolean } = {}): RunResult {
  let result: BuildResult;
  try {
    result = buildFromDisk(paths);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { code: 1, text: `Rabakz bank not built: ${reason}\n` };
  }
  const lines = result.problems.map(formatProblem);
  const errors = result.problems.filter((problem) => problem.severity === 'error').length;
  const warnings = result.problems.length - errors;
  const tally = `${String(errors)} error(s), ${String(warnings)} warning(s)`;
  if (result.output === null || (options.strict === true && warnings > 0)) {
    lines.push(`Rabakz bank not built: ${tally}`);
    return { code: 1, text: `${lines.join('\n')}\n` };
  }
  try {
    const fault = outFolderFault(paths.out, paths.pictures);
    if (fault !== null) throw new Error(fault);
    writeOutput(paths, result);
  } catch (error) {
    // One line, not a stack trace: a full disk or a folder without permission is not a bug.
    const reason = error instanceof Error ? error.message : String(error);
    lines.push(`Rabakz bank not built: ${reason}`);
    return { code: 1, text: `${lines.join('\n')}\n` };
  }
  const { index } = result.output;
  lines.push(
    `Rabakz bank built: ${String(index.totals.total)} question(s) in ${String(index.categories.length)} chunk(s), ${String(result.output.pictures.length)} picture(s), ${tally}`,
    `Written to ${paths.out}`,
  );
  return { code: 0, text: `${lines.join('\n')}\n` };
}

/** The whole build command, from its arguments to what it prints and its exit code. */
export function runBuildCommand(args: readonly string[], base: Paths = packagePaths()): RunResult {
  const parsed = parseArguments(args, base);
  if (typeof parsed === 'string') {
    return {
      code: 1,
      text: `Rabakz bank not built: ${parsed}\nUsage: build [--strict] [--out <folder>] [--sources <folder>] [--pictures <folder>] [--blocklist <file>]\n`,
    };
  }
  return runBuild(parsed.paths, { strict: parsed.strict });
}
