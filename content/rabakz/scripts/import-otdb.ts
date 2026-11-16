// pnpm --filter @kaki/content-rabakz import:otdb [-- --offline] [--dry-run]
//        [--cache <folder>] [--report <file>] [--sample <file>] [--seed <number>]
//
// Imports the Open Trivia Database (https://opentdb.com, CC BY-SA 4.0) into the bank (RZ-021).
//
// 1. Downloads every verified question into the cache folder (.otdb-cache/, git-ignored),
//    carrying on from an earlier run. --offline skips this and uses the cache as it is.
// 2. Maps, screens and filters them (scripts/otdb-map.ts, scripts/otdb-screen.ts,
//    blocklist.txt, otdb-removed.txt, otdb-allowed.txt) and rewrites src/questions/<category>.json: the
//    questions the import wrote before are replaced, hand-written ones are kept.
//    --dry-run writes no question file.
// 3. --report writes the import report, --sample a seeded read-through sample of 60.
//
// Files named singapore-*.json are never read or written. If the API cannot be reached the
// import stops and writes nothing: it never makes a question up.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { SourceFile, SourceQuestion } from '../src/tools';
import { parseBlocklist } from '../src/tools';
import { buildFromDisk, packagePaths, sha256 } from './io';
import { OtdbUnavailable, fetchAll, politeFetcher, readCache } from './otdb-fetch';
import {
  CATEGORY_TITLES,
  ID_PREFIX,
  formatReport,
  formatSample,
  importQuestions,
  mergeIntoFile,
  parseRemoved,
  sampleQuestions,
} from './otdb-map';

const SAMPLE_SIZE = 60;
const VALUE_OPTIONS = ['--cache', '--report', '--sample', '--seed'] as const;

const say = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

function parse(args: readonly string[]): Map<string, string> | string {
  const options = new Map<string, string>();
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at] ?? '';
    if (arg === '--') continue;
    if (arg === '--offline' || arg === '--dry-run') {
      options.set(arg, 'yes');
      continue;
    }
    if (!(VALUE_OPTIONS as readonly string[]).includes(arg)) return `unknown argument "${arg}"`;
    const value = args[at + 1];
    if (value === undefined || value.startsWith('--')) return `${arg} needs a value after it`;
    options.set(arg, value);
    at += 1;
  }
  return options;
}

async function main(): Promise<number> {
  const options = parse(process.argv.slice(2));
  if (typeof options === 'string') {
    say(`Import not run: ${options}`);
    return 1;
  }
  const root = resolve(import.meta.dirname, '..');
  const paths = packagePaths(root);
  const cache = resolve(options.get('--cache') ?? join(root, '.otdb-cache'));
  const seed = Number.parseInt(options.get('--seed') ?? '11', 10);
  if (!Number.isInteger(seed)) {
    say('Import not run: --seed needs a whole number');
    return 1;
  }

  try {
    if (!options.has('--offline')) await fetchAll(cache, politeFetcher(say));
  } catch (error) {
    if (!(error instanceof OtdbUnavailable)) throw error;
    say(`Import stopped: ${error.message}`);
    say('Nothing was written. Run the command again to carry on from the cache.');
    return 1;
  }
  let contents;
  try {
    contents = readCache(cache);
  } catch (error) {
    if (!(error instanceof OtdbUnavailable)) throw error;
    say(`Import stopped: ${error.message}`);
    return 1;
  }
  if (!contents.complete) {
    say('Import stopped: the download in the cache is not complete. Nothing was written.');
    return 1;
  }

  // The bank as it stands, without the Singapore pack (another issue's files).
  const current = new Map<string, SourceFile>();
  for (const name of readdirSync(paths.sources).sort()) {
    if (!name.endsWith('.json') || name.startsWith('singapore-')) continue;
    current.set(
      name.replace(/\.json$/, ''),
      JSON.parse(readFileSync(join(paths.sources, name), 'utf8')) as SourceFile,
    );
  }
  const existing: SourceQuestion[] = [...current.values()].flatMap((file) =>
    file.questions.filter((question) => !question.id.startsWith(ID_PREFIX)),
  );
  const removedPath = join(root, 'otdb-removed.txt');
  const allowedPath = join(root, 'otdb-allowed.txt');
  const input = {
    categories: contents.categories,
    questions: contents.questions,
    blocklist: parseBlocklist(readFileSync(paths.blocklist, 'utf8')),
    hash: sha256,
    existing,
    removed: parseRemoved(existsSync(removedPath) ? readFileSync(removedPath, 'utf8') : ''),
    allowed: parseRemoved(existsSync(allowedPath) ? readFileSync(allowedPath, 'utf8') : ''),
    // The download is always asked for as url3986, which carries no HTML entities.
    entities: false,
  };
  const result = importQuestions(input);
  if (result.unmatched.length > 0) {
    say(
      `Import stopped: ${String(result.unmatched.length)} id(s) in otdb-removed.txt or otdb-allowed.txt are not in the download: ${result.unmatched.join(', ')}`,
    );
    say('The dataset may have edited those questions, which changes their ids. Find them again');
    say('by the prompt text written beside each id, and correct the list. Nothing was written.');
    return 1;
  }
  if (result.redundant.length > 0) {
    say(`Removal entries an earlier rule already covers: ${result.redundant.join(', ')}`);
  }

  if (!options.has('--dry-run')) {
    const replaced = new Set(result.replaced.map((item) => item.existing));
    const write = (category: string, file: SourceFile): void => {
      writeFileSync(join(paths.sources, `${category}.json`), `${JSON.stringify(file, null, 2)}\n`);
    };
    for (const category of Object.keys(CATEGORY_TITLES)) {
      const imported = result.kept
        .filter((item) => item.category === category)
        .map((item) => item.question);
      const file = mergeIntoFile(category, current.get(category) ?? null, imported, replaced);
      if (file.questions.length > 0) write(category, file);
    }
    // A hand-written question that was replaced may sit in a category the import does not fill.
    for (const [category, file] of current) {
      if (category in CATEGORY_TITLES) continue;
      if (file.questions.some((question) => replaced.has(question.id))) {
        write(category, {
          ...file,
          questions: file.questions.filter((question) => !replaced.has(question.id)),
        });
      }
    }
  }

  const report = options.get('--report');
  if (report !== undefined) {
    writeFileSync(resolve(report), formatReport(input, result, contents.undecodable));
  }
  const sample = options.get('--sample');
  if (sample !== undefined) {
    writeFileSync(
      resolve(sample),
      formatSample(
        sampleQuestions(result.kept, SAMPLE_SIZE, seed, sha256),
        seed,
        result.kept.length,
      ),
    );
  }

  say(
    `Fetched ${String(contents.questions.length)}, kept ${String(result.kept.length)}, dropped ${String(result.dropped.length)}.`,
  );
  if (options.has('--dry-run')) return 0;
  const built = buildFromDisk(paths);
  const errors = built.problems.filter((problem) => problem.severity === 'error').length;
  say(
    `The bank now validates with ${String(errors)} error(s) and ${String(built.problems.length - errors)} warning(s).`,
  );
  return errors === 0 ? 0 : 1;
}

process.exitCode = await main();
