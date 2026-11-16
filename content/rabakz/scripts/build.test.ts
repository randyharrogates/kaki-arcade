import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { BankIndex } from '../src/index';
import { checkChunks, selectQuestions } from '../src/index';
import type { Paths } from './io';
import {
  buildFromDisk,
  outFolderFault,
  packagePaths,
  parseArguments,
  previousOutput,
  runBuild,
  runBuildCommand,
  sha256,
} from './io';

const temporary: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rabakz-bank-'));
  temporary.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function readAll(dir: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const name of readdirSync(dir, { recursive: true, encoding: 'utf8' }).sort()) {
    try {
      files[name] = readFileSync(join(dir, name), 'utf8');
    } catch {
      // A folder.
    }
  }
  return files;
}

function question(id: string, prompt: string, extra: Record<string, unknown> = {}): unknown {
  return {
    id,
    type: 'multiple-choice',
    prompt,
    options: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
    answer: 'Alpha',
    difficulty: 'easy',
    region: 'general',
    source: { kind: 'original', note: 'Check: the test fixture itself.' },
    ...extra,
  };
}

/** A throwaway bank on disk. */
function fixture(files: Record<string, unknown[]>, blocklist = ''): Paths {
  const root = tempDir();
  const paths: Paths = {
    sources: join(root, 'questions'),
    pictures: join(root, 'pictures'),
    blocklist: join(root, 'blocklist.txt'),
    out: join(root, 'generated'),
  };
  mkdirSync(paths.sources);
  for (const [category, questions] of Object.entries(files)) {
    writeFileSync(
      join(paths.sources, `${category}.json`),
      JSON.stringify({ category, title: category, questions }),
    );
  }
  writeFileSync(paths.blocklist, blocklist);
  return paths;
}

/** File names with the content hash taken out: `food.3f2a….json` becomes `food.#.json`. */
function unhashed(names: string[]): string[] {
  return names.map((name) => name.replace(/\.[0-9a-f]{12}\.json$/, '.#.json'));
}

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

describe('the bank in this package', () => {
  const result = buildFromDisk(packagePaths());

  // Warnings are allowed (an imported bank can raise them); `stats` prints them (R-11).
  it('validates with no errors', () => {
    expect(result.problems.filter((problem) => problem.severity === 'error')).toEqual([]);
    expect(result.output).not.toBeNull();
  });

  it('covers at least three categories and all three difficulties', () => {
    const index = result.output?.index;
    expect(index?.categories.length).toBeGreaterThanOrEqual(3);
    expect(index?.totals.total).toBeGreaterThanOrEqual(12);
    expect(index?.totals.byDifficulty.easy).toBeGreaterThan(0);
    expect(index?.totals.byDifficulty.medium).toBeGreaterThan(0);
    expect(index?.totals.byDifficulty.hard).toBeGreaterThan(0);
  });
});

describe('the build command', () => {
  it('builds this package end to end: files written, then loaded and a match selected', () => {
    const out = tempDir();
    const run = runBuild({ ...packagePaths(), out });
    expect(run.code).toBe(0);
    expect(run.text).toContain('0 error(s), ');

    const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')) as BankIndex;
    const chunks = index.categories.map((category) => {
      const text = readFileSync(join(out, category.file), 'utf8');
      expect(sha256(text)).toBe(category.hash);
      expect(Buffer.byteLength(text)).toBe(category.bytes);
      return { category: category.id, data: JSON.parse(text) as unknown, hash: sha256(text) };
    });
    const settings = { count: 10, difficulty: 'mixed', categories: 'mixed' } as const;
    expect(checkChunks(index, settings, chunks).ready).toBe(true);
    let state = 42;
    const random = (): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const selection = selectQuestions({ index, settings, chunks, random });
    expect(selection.ok).toBe(true);
    if (selection.ok) {
      expect(new Set(selection.questions.map((item) => item.id)).size).toBe(10);
      expect(selection.transferBytes).toBeLessThan(2_000_000);
    }
  });

  it('writes the same bytes on every run', () => {
    const first = tempDir();
    const second = tempDir();
    runBuild({ ...packagePaths(), out: first });
    runBuild({ ...packagePaths(), out: second });
    runBuild({ ...packagePaths(), out: second });
    expect(Object.keys(readAll(first)).length).toBeGreaterThanOrEqual(4);
    expect(readAll(second)).toEqual(readAll(first));
  });

  it('removes a chunk whose source file has gone', () => {
    const paths = fixture({
      food: [question('food-1', 'Which dish is first?')],
      sport: [question('sport-1', 'Which sport is first?')],
    });
    expect(runBuild(paths).code).toBe(0);
    expect(unhashed(Object.keys(readAll(paths.out)))).toEqual([
      'food.#.json',
      'index.json',
      'sport.#.json',
    ]);
    rmSync(join(paths.sources, 'sport.json'));
    expect(runBuild(paths).code).toBe(0);
    expect(unhashed(Object.keys(readAll(paths.out)))).toEqual(['food.#.json', 'index.json']);
  });

  it('names a chunk after its content, and removes the old file when the content changes', () => {
    const paths = fixture({ food: [question('food-1', 'Which dish is first?')] });
    runBuild(paths);
    const [before] = Object.keys(readAll(paths.out));
    writeFileSync(
      join(paths.sources, 'food.json'),
      JSON.stringify({
        category: 'food',
        title: 'food',
        questions: [question('food-1', 'Which dish is the first?')],
      }),
    );
    runBuild(paths);
    const after = Object.keys(readAll(paths.out));
    expect(unhashed(after)).toEqual(['food.#.json', 'index.json']);
    expect(after[0]).not.toBe(before);
    const index = JSON.parse(readFileSync(join(paths.out, 'index.json'), 'utf8')) as BankIndex;
    expect(index.categories[0]?.file).toBe(after[0]);
  });

  it('fails on a duplicate, prints where, and leaves the last good build alone', () => {
    const paths = fixture({ food: [question('food-1', 'Which dish is first?')] });
    expect(runBuild(paths).code).toBe(0);
    const before = readAll(paths.out);
    writeFileSync(
      join(paths.sources, 'sport.json'),
      JSON.stringify({
        category: 'sport',
        title: 'Sport',
        questions: [question('food-1x', 'which dish is FIRST', { id: 'sport-1' })],
      }),
    );
    const run = runBuild(paths);
    expect(run.code).toBe(1);
    expect(run.text).toBe(
      'error  sport.json sport-1  [duplicate-question] the same prompt with the same options is already in the bank as food.json food-1\n' +
        'Rabakz bank not built: 1 error(s), 0 warning(s)\n',
    );
    expect(readAll(paths.out)).toEqual(before);
  });

  it('reads the blocklist file', () => {
    const paths = fixture({ food: [question('food-1', 'Which dish is first?')] }, '# list\ndish\n');
    const run = runBuild(paths);
    expect(run.code).toBe(1);
    expect(run.text).toContain('[blocklist] contains a term on the all-ages blocklist: dish');
  });

  it('builds with a warning, and fails on it when strict', () => {
    const options = ['Red', 'Blue', 'A mixture of red, green and blue light', 'Green'];
    const paths = fixture({
      science: [question('sci-1', 'What is white light?', { options, answer: options[2] })],
    });
    const run = runBuild(paths);
    expect(run.code).toBe(0);
    expect(run.text).toContain('warning  science.json sci-1  [length-giveaway]');
    rmSync(paths.out, { recursive: true });
    expect(runBuild(paths, { strict: true }).code).toBe(1);
    expect(() => readdirSync(paths.out)).toThrow();
  });

  it('checks picture files and copies the ones in use', () => {
    const picture = {
      file: 'statue.jpg',
      alt: 'A white statue beside a bay',
      credit: 'Photo: A. Tan',
      licence: 'CC BY 4.0',
      sourceUrl: 'https://example.org/photo',
    };
    const paths = fixture({
      sights: [question('pic-1', 'Which landmark is this?', { type: 'picture', picture })],
    });
    const missing = runBuild(paths);
    expect(missing.code).toBe(1);
    expect(missing.text).toContain('picture file pictures/statue.jpg does not exist');

    mkdirSync(paths.pictures);
    const cases: [Buffer, string][] = [
      [Buffer.alloc(0), 'pictures/statue.jpg is empty'],
      [Buffer.from('not a photograph'), 'pictures/statue.jpg is not a JPEG, PNG or WebP image'],
      [Buffer.concat([JPEG, Buffer.alloc(150_000)]), 'is 150004 bytes; the limit is 150000'],
    ];
    for (const [content, message] of cases) {
      writeFileSync(join(paths.pictures, 'statue.jpg'), content);
      const run = runBuild(paths);
      expect(run.code).toBe(1);
      expect(run.text).toContain(message);
    }

    writeFileSync(join(paths.pictures, 'statue.jpg'), Buffer.concat([JPEG, Buffer.alloc(1230)]));
    writeFileSync(join(paths.pictures, 'spare.jpg'), Buffer.concat([JPEG, Buffer.alloc(10)]));
    const run = runBuild(paths);
    expect(run.code).toBe(0);
    expect(run.text).toContain('warning  pictures/spare.jpg  [picture] no question uses this picture');
    expect(unhashed(Object.keys(readAll(paths.out)))).toEqual([
      'index.json',
      join('pictures', 'statue.jpg'),
      'sights.#.json',
    ]);
    const index = JSON.parse(readFileSync(join(paths.out, 'index.json'), 'utf8')) as BankIndex;
    expect(index.categories[0]?.pictures).toEqual([{ file: 'statue.jpg', bytes: 1234 }]);

    // The picture question goes; so does its copied picture, and the empty folder.
    writeFileSync(
      join(paths.sources, 'sights.json'),
      JSON.stringify({
        category: 'sights',
        title: 'sights',
        questions: [question('s-1', 'Which sight is first?')],
      }),
    );
    rmSync(paths.pictures, { recursive: true });
    expect(runBuild(paths).code).toBe(0);
    expect(unhashed(Object.keys(readAll(paths.out)))).toEqual(['index.json', 'sights.#.json']);
  });

  it('fails when there is no source folder', () => {
    const root = tempDir();
    const run = runBuild({
      sources: join(root, 'none'),
      pictures: join(root, 'none'),
      blocklist: join(root, 'none.txt'),
      out: join(root, 'generated'),
    });
    expect(run.code).toBe(1);
    expect(run.text).toContain('there are no source files');
  });
});

describe('where the build may write (--out)', () => {
  const one = { food: [question('food-1', 'Which dish is first?')] };

  it('refuses a folder that is not empty and not an earlier build, and deletes nothing', () => {
    const paths = fixture(one);
    mkdirSync(paths.out);
    writeFileSync(join(paths.out, 'thesis.txt'), 'three years of work');
    mkdirSync(join(paths.out, 'pictures'));
    writeFileSync(join(paths.out, 'pictures', 'wedding.jpg'), 'irreplaceable');
    const before = readAll(paths.out);
    const run = runBuild(paths);
    expect(run.code).toBe(1);
    expect(run.text).toContain('is not empty and is not the output of an earlier build');
    expect(run.text).toContain('nothing was written');
    expect(readAll(paths.out)).toEqual(before);
  });

  it('refuses the source folder, the package folder and a file', () => {
    const paths = fixture(one);
    const sources = readAll(paths.sources);
    for (const out of [paths.sources, resolve(paths.sources, '..'), paths.blocklist]) {
      const run = runBuild({ ...paths, out });
      expect(run.code).toBe(1);
      expect(run.text).toContain('Rabakz bank not built');
    }
    expect(readAll(paths.sources)).toEqual(sources);
    expect(readFileSync(paths.blocklist, 'utf8')).toBe('');
    expect(outFolderFault(paths.blocklist)).toContain('is a file, not a folder');
  });

  it('refuses the real source folder of this package through the command line', () => {
    const real = packagePaths();
    const before = readAll(real.sources);
    for (const out of [real.sources, resolve(real.sources, '..'), resolve(real.sources, '..', '..')]) {
      const run = runBuildCommand(['--out', out]);
      expect(run.code).toBe(1);
      expect(run.text).toContain('is not empty and is not the output of an earlier build');
    }
    expect(readAll(real.sources)).toEqual(before);
  });

  it('does not take a folder for its own because it holds some other index.json', () => {
    const paths = fixture(one);
    mkdirSync(paths.out);
    for (const text of ['{"format":2,"categories":[]}', '{"name":"my-app"}', 'not json', '[]']) {
      writeFileSync(join(paths.out, 'index.json'), text);
      expect(previousOutput(paths.out)).toBeNull();
      expect(runBuild(paths).code).toBe(1);
      expect(readFileSync(join(paths.out, 'index.json'), 'utf8')).toBe(text);
    }
  });

  it('writes into a new folder, an empty folder and its own earlier output', () => {
    const paths = fixture(one);
    expect(outFolderFault(paths.out)).toBeNull();
    mkdirSync(paths.out);
    expect(outFolderFault(paths.out)).toBeNull();
    expect(runBuild(paths).code).toBe(0);
    expect(outFolderFault(paths.out)).toBeNull();
    expect(runBuild(paths).code).toBe(0);
  });

  it('replaces only the files the earlier build wrote; anything else in the folder stays', () => {
    const paths = fixture({ ...one, sport: [question('sport-1', 'Which sport is first?')] });
    expect(runBuild(paths).code).toBe(0);
    writeFileSync(join(paths.out, 'notes.txt'), 'mine');
    writeFileSync(join(paths.out, 'sport.json'), 'also mine');
    mkdirSync(join(paths.out, 'pictures'));
    writeFileSync(join(paths.out, 'pictures', 'holiday.jpg'), 'mine too');
    rmSync(join(paths.sources, 'sport.json'));
    expect(runBuild(paths).code).toBe(0);
    expect(unhashed(Object.keys(readAll(paths.out)))).toEqual([
      'food.#.json',
      'index.json',
      'notes.txt',
      join('pictures', 'holiday.jpg'),
      'sport.json',
    ]);
    expect(readFileSync(join(paths.out, 'notes.txt'), 'utf8')).toBe('mine');
  });

  it('never follows a path out of the folder from a doctored index', () => {
    const paths = fixture(one);
    const outside = join(paths.out, '..', 'precious.txt');
    writeFileSync(outside, 'keep');
    mkdirSync(paths.out);
    writeFileSync(
      join(paths.out, 'index.json'),
      JSON.stringify({
        format: 1,
        categories: [
          { file: '../precious.txt', pictures: [{ file: '../../precious.txt' }, { file: '/etc/hosts' }] },
          { file: 'blocklist.txt/../../precious.txt' },
        ],
      }),
    );
    expect(previousOutput(paths.out)).toEqual(['index.json']);
    expect(runBuild(paths).code).toBe(0);
    expect(readFileSync(outside, 'utf8')).toBe('keep');
  });
});

describe('what the build removes from its own output', () => {
  const one = { food: [question('food-1', 'Which dish is first?')] };

  it('leaves a file a forged index lists when the name is not of a shape the build writes', () => {
    const paths = fixture(one);
    mkdirSync(join(paths.out, 'pictures'), { recursive: true });
    const mine = ['geography.json', 'notes.txt', 'food.json', join('pictures', 'README.md')];
    for (const name of mine) writeFileSync(join(paths.out, name), 'mine');
    const stale = 'food.0123456789ab.json';
    writeFileSync(join(paths.out, stale), 'an old chunk');
    writeFileSync(join(paths.out, 'pictures', 'old.jpg'), 'an old picture');
    writeFileSync(
      join(paths.out, 'index.json'),
      JSON.stringify({
        format: 1,
        categories: [
          { file: 'geography.json', pictures: [{ file: 'README.md' }, { file: 'old.jpg' }] },
          { file: 'notes.txt' },
          { file: 'food.json' },
          { file: stale },
          { file: 'FOOD.0123456789AB.json' },
          { file: 'food.0123456789ab.json.bak' },
        ],
      }),
    );
    expect([...(previousOutput(paths.out) ?? [])].sort()).toEqual(
      [stale, join('pictures', 'old.jpg'), 'index.json'].sort(),
    );
    expect(runBuild(paths).code).toBe(0);
    const after = readAll(paths.out);
    for (const name of mine) expect(after[name]).toBe('mine');
    expect(Object.keys(after)).not.toContain(stale);
    expect(Object.keys(after)).not.toContain(join('pictures', 'old.jpg'));
    expect(unhashed(Object.keys(after))).toContain('food.#.json');
  });

  it('refuses when the pictures folder in the output is a link, and touches nothing behind it', () => {
    const paths = fixture(one);
    expect(runBuild(paths).code).toBe(0);
    const elsewhere = tempDir();
    writeFileSync(join(elsewhere, 'holiday.jpg'), 'irreplaceable');
    symlinkSync(elsewhere, join(paths.out, 'pictures'));
    const before = readAll(elsewhere);
    const run = runBuild(paths);
    expect(run.code).toBe(1);
    expect(run.text).toContain('pictures is a link to another place; nothing was written');
    expect(readAll(elsewhere)).toEqual(before);
  });

  it('refuses when the output pictures folder is the folder the pictures are read from', () => {
    const paths = fixture(one);
    mkdirSync(paths.pictures);
    writeFileSync(join(paths.pictures, 'statue.jpg'), Buffer.concat([JPEG, Buffer.alloc(8)]));
    const out = resolve(paths.pictures, '..');
    // Make the parent look like an earlier build so only the pictures rule can stop it.
    writeFileSync(join(out, 'index.json'), JSON.stringify({ format: 1, categories: [] }));
    const run = runBuild({ ...paths, out });
    expect(run.code).toBe(1);
    expect(run.text).toContain('is the folder the pictures are read from; nothing was written');
    expect(readFileSync(join(paths.pictures, 'statue.jpg')).length).toBe(12);
  });

  it('writes the index last and removes old files only after the new ones exist', () => {
    const paths = fixture(one);
    expect(runBuild(paths).code).toBe(0);
    const [old] = Object.keys(readAll(paths.out));
    writeFileSync(
      join(paths.sources, 'food.json'),
      JSON.stringify({ category: 'food', title: 'food', questions: [question('food-1', 'Which dish is the first?')] }),
    );
    // A chunk that cannot be written: its name is taken by a folder. The build must stop with
    // the old chunk and the old index still in place.
    const next = buildFromDisk(paths).output?.files[0]?.name ?? '';
    mkdirSync(join(paths.out, next));
    const before = readFileSync(join(paths.out, 'index.json'), 'utf8');
    const run = runBuild(paths);
    expect(run.code).toBe(1);
    expect(run.text.trimEnd().split('\n')).toHaveLength(1);
    expect(run.text).toMatch(/^Rabakz bank not built: EISDIR/);
    expect(run.text).not.toMatch(/\n\s+at /);
    expect(readFileSync(join(paths.out, 'index.json'), 'utf8')).toBe(before);
    expect(readFileSync(join(paths.out, old ?? ''), 'utf8')).toContain('Which dish is first?');
  });
});

describe('the build command line', () => {
  const base = packagePaths();

  it('rejects --out with no value or with another option as its value', () => {
    for (const args of [['--out'], ['--out', '--strict'], ['--strict', '--out'], ['--out', '']]) {
      expect(parseArguments(args, base)).toBe('--out needs a path after it');
      const run = runBuildCommand(args);
      expect(run.code).toBe(1);
      expect(run.text).toContain('Rabakz bank not built: --out needs a path after it');
      expect(run.text).toContain('Usage: build');
    }
    expect(parseArguments(['--sources'], base)).toBe('--sources needs a path after it');
    expect(parseArguments(['--pictures', '--blocklist', 'x'], base)).toBe(
      '--pictures needs a path after it',
    );
  });

  it('rejects an argument it does not know', () => {
    expect(parseArguments(['--strct'], base)).toBe('unknown argument "--strct"');
    expect(parseArguments(['generated'], base)).toBe('unknown argument "generated"');
    expect(runBuildCommand(['--output', 'x']).code).toBe(1);
  });

  it('reads the options it knows', () => {
    expect(parseArguments([], base)).toEqual({ paths: base, strict: false });
    expect(parseArguments(['--', '--strict'], base)).toEqual({ paths: base, strict: true });
    const out = tempDir();
    expect(parseArguments(['--out', out, '--strict', '--blocklist', 'list.txt'], base)).toEqual({
      paths: { ...base, out, blocklist: resolve('list.txt') },
      strict: true,
    });
  });

  it('builds this package into a folder given with --out', () => {
    const out = join(tempDir(), 'fresh');
    const run = runBuildCommand(['--out', out]);
    expect(run.code).toBe(0);
    expect(Object.keys(readAll(out))).toContain('index.json');
  });
});

describe('the bad-bank fixture', () => {
  it('fails with one finding for every rule, and writes nothing', () => {
    const root = resolve(import.meta.dirname, '..', 'fixtures', 'bad-bank');
    const out = join(tempDir(), 'generated');
    const run = runBuildCommand([
      '--sources',
      join(root, 'questions'),
      '--pictures',
      join(root, 'pictures'),
      '--blocklist',
      join(root, 'blocklist.txt'),
      '--out',
      out,
    ]);
    expect(run.code).toBe(1);
    expect(() => readdirSync(out)).toThrow();
    const found = new Set([...run.text.matchAll(/\[([a-z-]+)\]/g)].map((match) => match[1]));
    expect([...found].sort()).toEqual([
      'answer',
      'blocklist',
      'difficulty',
      'duplicate-id',
      'duplicate-question',
      'id',
      'json',
      'length-giveaway',
      'options',
      'picture',
      'prompt',
      'region',
      'same-options',
      'source',
      'type',
      'unknown-field',
    ]);
    // Every question in wrong.json is reported, and nothing in good.json is.
    const wrong = JSON.parse(readFileSync(join(root, 'questions', 'wrong.json'), 'utf8')) as {
      questions: { id: string }[];
    };
    wrong.questions.forEach((item, position) => {
      const label = /^[a-z0-9-]+$/.test(item.id) ? item.id : `#${String(position + 1)}`;
      expect(run.text).toContain(`wrong.json ${label}  [`);
    });
    expect(run.text).not.toMatch(/^(?:error|warning) {2}good\.json/m);
    expect(run.text).toContain('Rabakz bank not built: 36 error(s), 2 warning(s)');
  });
});

