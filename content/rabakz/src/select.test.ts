import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseBlocklist } from './blocklist';
import { buildBank } from './build';
import type { BankIndex, Chunk, Difficulty, PictureFile, Question } from './schema';
import { DIFFICULTIES } from './schema';
import type { LoadedChunk, MatchSettings, Selection } from './select';
import {
  checkChunks,
  chunkBytesNeeded,
  chunksNeeded,
  difficultyQuota,
  parseChunk,
  picturesMissing,
  poolSize,
  setupTable,
  selectQuestions,
  settingsFault,
  toPublicQuestion,
} from './select';

/**
 * A small seeded generator for the tests (mulberry32); the game supplies its own. It mixes its
 * seed well, so the seeds 1, 2, 3 ... give unrelated streams, which the fairness tests need.
 */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

type PerDifficulty = Partial<Record<Difficulty, number>>;

interface BankSpec {
  /** Questions per category and difficulty. */
  readonly categories: Record<string, PerDifficulty>;
  /** Every nth question is a Singapore question. 0 for none. */
  readonly singaporeEvery?: number;
  /** Every nth question is a picture question with its own photograph. 0 for none. */
  readonly pictureEvery?: number;
  readonly pictureBytes?: number;
  /** Sizes to give the photographs in turn, instead of one size for all. */
  readonly pictureSizes?: readonly number[];
}

interface Bank {
  readonly index: BankIndex;
  readonly chunks: readonly Chunk[];
  readonly loaded: readonly LoadedChunk[];
}

/** Builds a bank through the real builder, so the loader is tested on real chunks. */
function makeBank(spec: BankSpec): Bank {
  const pictures = new Map<string, PictureFile>();
  const files = Object.entries(spec.categories).map(([category, sizes]) => {
    const questions: unknown[] = [];
    for (const difficulty of DIFFICULTIES) {
      for (let n = 0; n < (sizes[difficulty] ?? 0); n += 1) {
        const id = `${category}-${difficulty}-${String(n).padStart(3, '0')}`;
        const isPicture = (spec.pictureEvery ?? 0) > 0 && n % (spec.pictureEvery ?? 1) === 0;
        const file = `${id}.jpg`;
        if (isPicture) {
          const sizes = spec.pictureSizes;
          const bytes =
            sizes === undefined
              ? (spec.pictureBytes ?? 50_000)
              : (sizes[pictures.size % sizes.length] ?? 0);
          pictures.set(file, { bytes, format: 'jpeg' });
        }
        questions.push({
          id,
          type: isPicture ? 'picture' : 'multiple-choice',
          prompt: `What is the answer to ${id}?`,
          options: ['Alpha', 'Bravo', 'Charlie', id],
          answer: 'Charlie',
          difficulty,
          region:
            (spec.singaporeEvery ?? 0) > 0 && n % (spec.singaporeEvery ?? 1) === 0
              ? 'singapore'
              : 'general',
          source: { kind: 'original', note: 'Check: the test fixture itself.' },
          ...(isPicture
            ? {
                picture: {
                  file,
                  alt: 'A test photograph',
                  credit: 'Photo: nobody',
                  licence: 'CC0 1.0',
                  sourceUrl: 'https://example.org/photo',
                },
              }
            : {}),
        });
      }
    }
    return { name: `${category}.json`, text: JSON.stringify({ category, title: category, questions }) };
  });
  const result = buildBank({
    files,
    blocklist: parseBlocklist(''),
    pictures,
    hash: (text) => createHash('sha256').update(text, 'utf8').digest('hex'),
  });
  if (result.output === null) throw new Error(JSON.stringify(result.problems));
  const { index, chunks } = result.output;
  // What a caller holds after fetching: the parsed JSON of each chunk file.
  const loaded = result.output.files
    .slice(0, -1)
    .map((file, position) => ({
      category: index.categories[position]?.id ?? '',
      data: JSON.parse(file.text) as unknown,
      hash: createHash('sha256').update(file.text, 'utf8').digest('hex'),
    }));
  return { index, chunks, loaded };
}

const AMPLE = makeBank({
  categories: {
    food: { easy: 30, medium: 30, hard: 30 },
    geography: { easy: 30, medium: 30, hard: 30 },
    history: { easy: 30, medium: 30, hard: 30 },
  },
  singaporeEvery: 3,
});

function settings(overrides: Partial<MatchSettings> = {}): MatchSettings {
  return { count: 10, difficulty: 'mixed', categories: 'mixed', ...overrides };
}

function select(
  bank: Bank,
  overrides: Partial<MatchSettings> = {},
  extra: { seed?: number; recentlyUsed?: readonly string[]; transferBudgetBytes?: number } = {},
): Selection {
  return selectQuestions({
    index: bank.index,
    settings: settings(overrides),
    chunks: bank.loaded,
    random: seeded(extra.seed ?? 1),
    ...(extra.recentlyUsed === undefined ? {} : { recentlyUsed: extra.recentlyUsed }),
    ...(extra.transferBudgetBytes === undefined
      ? {}
      : { transferBudgetBytes: extra.transferBudgetBytes }),
  });
}

function questionsOf(selection: Selection): readonly Question[] {
  if (!selection.ok) throw new Error(`selection failed: ${selection.reason}`);
  return selection.questions;
}

function tally<K extends string>(items: readonly K[]): Partial<Record<K, number>> {
  const counts: Partial<Record<K, number>> = {};
  for (const item of items) counts[item] = (counts[item] ?? 0) + 1;
  return counts;
}

const ids = (questions: readonly Question[]): string[] => questions.map((question) => question.id);

describe('chunks: what a match needs and whether it is loaded', () => {
  it('needs every chunk for Mixed and only the chosen ones otherwise', () => {
    expect(chunksNeeded(AMPLE.index, settings()).map((entry) => entry.id)).toEqual([
      'food',
      'geography',
      'history',
    ]);
    expect(
      chunksNeeded(AMPLE.index, settings({ categories: ['history', 'food'] })).map(
        (entry) => entry.file,
      ),
    ).toEqual([AMPLE.index.categories[0]?.file, AMPLE.index.categories[2]?.file]);
    expect(AMPLE.index.categories[0]?.file).toMatch(/^food\.[0-9a-f]{12}\.json$/);
  });

  it('is ready when every needed chunk is loaded', () => {
    const readiness = checkChunks(AMPLE.index, settings(), AMPLE.loaded);
    expect(readiness).toMatchObject({ ready: true, missing: [], invalid: [] });
    expect(readiness.needed).toHaveLength(3);
  });

  it('reports the chunks still missing before a match starts', () => {
    const readiness = checkChunks(AMPLE.index, settings(), AMPLE.loaded.slice(0, 1));
    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toEqual(['geography', 'history']);
    expect(checkChunks(AMPLE.index, settings(), []).missing).toEqual([
      'food',
      'geography',
      'history',
    ]);
  });

  it('does not ask for chunks outside the chosen categories', () => {
    const only = AMPLE.loaded.filter((chunk) => chunk.category === 'food');
    expect(checkChunks(AMPLE.index, settings({ categories: ['food'] }), only).ready).toBe(true);
    expect(questionsOf(selectQuestions({
      index: AMPLE.index,
      settings: settings({ categories: ['food'] }),
      chunks: only,
      random: seeded(1),
    }))).toHaveLength(10);
  });

  it('rejects a loaded chunk that is not the one the index describes', () => {
    const [food, geography, history] = AMPLE.loaded;
    if (food === undefined || geography === undefined || history === undefined) throw new Error();
    const short = { ...(food.data as Chunk), questions: (food.data as Chunk).questions.slice(1) };
    const readiness = checkChunks(AMPLE.index, settings(), [
      { ...food, data: short },
      { ...geography, data: history.data },
      { ...history, data: { format: 1, questions: 'none' } },
    ]);
    expect(readiness.ready).toBe(false);
    expect(readiness.invalid).toEqual([
      { category: 'food', fault: 'wrong-count' },
      { category: 'geography', fault: 'wrong-category' },
      { category: 'history', fault: 'not-a-chunk' },
    ]);
  });

  it('requires the hash of each chunk to be the one in the index', () => {
    const stale = AMPLE.loaded.map((chunk) =>
      chunk.category === 'history' ? { ...chunk, hash: 'an-older-build' } : chunk,
    );
    const readiness = checkChunks(AMPLE.index, settings(), stale);
    expect(readiness.ready).toBe(false);
    expect(readiness.invalid).toEqual([{ category: 'history', fault: 'wrong-hash' }]);
    expect(
      selectQuestions({ index: AMPLE.index, settings: settings(), chunks: stale, random: seeded(1) }),
    ).toMatchObject({ ok: false, reason: 'chunks-not-ready' });
  });

  it('selectQuestions refuses to make a match until the chunks are ready', () => {
    const selection = selectQuestions({
      index: AMPLE.index,
      settings: settings(),
      chunks: AMPLE.loaded.slice(1),
      random: seeded(1),
    });
    expect(selection).toMatchObject({
      ok: false,
      reason: 'chunks-not-ready',
      chunks: { ready: false, missing: ['food'] },
    });
  });
});

describe('parseChunk', () => {
  const good = AMPLE.loaded[0]?.data as Chunk;
  const first = good.questions[0];

  it('accepts a built chunk unchanged', () => {
    expect(parseChunk(good)).toEqual(good);
    expect(parseChunk(JSON.parse(JSON.stringify(AMPLE.chunks[1])))).toEqual(AMPLE.chunks[1]);
  });

  it('rejects another format, a missing field or a bad question', () => {
    const withQuestion = (change: Record<string, unknown>): unknown => ({
      ...good,
      questions: [{ ...first, ...change }],
    });
    const bad: unknown[] = [
      null,
      [],
      'chunk',
      { ...good, format: 2 },
      { ...good, title: undefined },
      { ...good, questions: {} },
      { ...good, questions: [null] },
      withQuestion({ id: 7 }),
      withQuestion({ category: 'other' }),
      withQuestion({ type: 'type-the-answer' }),
      withQuestion({ difficulty: 'mixed' }),
      withQuestion({ region: 'asia' }),
      withQuestion({ options: ['Alpha', 'Bravo'] }),
      withQuestion({ options: ['Alpha', 'Bravo', 'Charlie', 4] }),
      withQuestion({ correct: 4 }),
      withQuestion({ correct: -1 }),
      withQuestion({ correct: 1.5 }),
      withQuestion({ correct: '2' }),
      withQuestion({ type: 'picture' }),
      withQuestion({ type: 'picture', picture: { file: 'a.jpg' } }),
      withQuestion({ picture: { file: 'a.jpg' } }),
    ];
    for (const data of bad) expect(parseChunk(data)).toBeNull();
    expect(parseChunk(withQuestion({}))).not.toBeNull();
  });
});

describe('selectQuestions: how many', () => {
  it('returns exactly 10, 30 or 50 questions with no repeats, for many seeds', () => {
    for (const count of [10, 30, 50] as const) {
      for (let seed = 1; seed <= 25; seed += 1) {
        const questions = questionsOf(select(AMPLE, { count }, { seed }));
        expect(questions).toHaveLength(count);
        expect(new Set(ids(questions)).size).toBe(count);
      }
    }
  });

  it('gives the same match for the same seed and a different one for another', () => {
    const first = ids(questionsOf(select(AMPLE, { count: 30 }, { seed: 7 })));
    expect(ids(questionsOf(select(AMPLE, { count: 30 }, { seed: 7 })))).toEqual(first);
    expect(ids(questionsOf(select(AMPLE, { count: 30 }, { seed: 8 })))).not.toEqual(first);
  });

  it('does not depend on the order the chunks were fetched in', () => {
    const reversed = { ...AMPLE, loaded: [...AMPLE.loaded].reverse() };
    expect(ids(questionsOf(select(reversed, {}, { seed: 3 })))).toEqual(
      ids(questionsOf(select(AMPLE, {}, { seed: 3 }))),
    );
  });

  it('reaches every part of the pool over many seeds', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const id of ids(questionsOf(select(AMPLE, { count: 50 }, { seed })))) seen.add(id);
    }
    expect(seen.size).toBe(270);
  });

  it('survives a random function that returns its limits', () => {
    for (const value of [0, 0.999999, 1, Number.NaN, -1]) {
      const questions = questionsOf(
        selectQuestions({
          index: AMPLE.index,
          settings: settings({ count: 30 }),
          chunks: AMPLE.loaded,
          random: () => value,
        }),
      );
      expect(new Set(ids(questions)).size).toBe(30);
    }
  });

  it('rejects settings the game does not offer', () => {
    const bad: [Partial<MatchSettings>, string][] = [
      [{ count: 20 as 10 }, 'a match has 10, 30, 50 questions, not 20'],
      [{ difficulty: 'medium' as 'mixed' }, 'difficulty must be easy, mixed or hard'],
      [{ categories: [] }, 'choose at least one category'],
      [{ categories: ['food', 'sport'] }, 'the bank has no category sport'],
      [{ region: { singaporeShare: 1.5 } }, 'singaporeShare must be from 0 to 1'],
      [{ region: { singaporeShare: Number.NaN } }, 'singaporeShare must be from 0 to 1'],
      [{ region: 'asia' as 'general' }, 'region must be mixed, general, singapore or a singaporeShare'],
    ];
    for (const [change, message] of bad) {
      expect(settingsFault(AMPLE.index, settings(change))).toBe(message);
      expect(select(AMPLE, change)).toEqual({ ok: false, reason: 'bad-settings', message });
    }
    expect(settingsFault(AMPLE.index, settings())).toBeNull();
  });
});

describe('selectQuestions: difficulty', () => {
  it('Easy is easy questions only and Hard is hard only', () => {
    for (const difficulty of ['easy', 'hard'] as const) {
      const questions = questionsOf(select(AMPLE, { count: 50, difficulty }));
      expect(tally(questions.map((question) => question.difficulty))).toEqual({ [difficulty]: 50 });
    }
  });

  it('Mixed is a third of each: 3/4/3, 10/10/10 and 17/17/16', () => {
    expect(difficultyQuota(10)).toEqual({ easy: 3, medium: 4, hard: 3 });
    expect(difficultyQuota(30)).toEqual({ easy: 10, medium: 10, hard: 10 });
    expect(difficultyQuota(50)).toEqual({ easy: 17, medium: 17, hard: 16 });
    for (const count of [10, 30, 50] as const) {
      for (let seed = 1; seed <= 10; seed += 1) {
        const questions = questionsOf(select(AMPLE, { count }, { seed }));
        expect(tally(questions.map((question) => question.difficulty))).toEqual(
          difficultyQuota(count),
        );
      }
    }
  });

  it('Mixed does not play the difficulties in blocks', () => {
    const order = questionsOf(select(AMPLE, { count: 30 }, { seed: 5 })).map(
      (question) => question.difficulty,
    );
    const changes = order.filter((difficulty, at) => at > 0 && difficulty !== order[at - 1]);
    expect(changes.length).toBeGreaterThan(8);
  });

  it('Mixed fills from the other difficulties when one runs short', () => {
    const lopsided = makeBank({ categories: { food: { easy: 40, medium: 5, hard: 2 } } });
    const questions = questionsOf(select(lopsided, { count: 30 }));
    expect(tally(questions.map((question) => question.difficulty))).toEqual({
      easy: 23,
      medium: 5,
      hard: 2,
    });
  });
});

describe('selectQuestions: categories and regions', () => {
  it('draws only from the chosen categories', () => {
    const questions = questionsOf(select(AMPLE, { count: 50, categories: ['food', 'history'] }));
    const used = tally(questions.map((question) => question.category));
    expect(Object.keys(used).sort()).toEqual(['food', 'history']);
  });

  it('Mixed categories draws from all of them', () => {
    const used = tally(questionsOf(select(AMPLE, { count: 50 })).map((item) => item.category));
    expect(Object.keys(used).sort()).toEqual(['food', 'geography', 'history']);
  });

  it('a single region is that region only', () => {
    for (const region of ['general', 'singapore'] as const) {
      const questions = questionsOf(select(AMPLE, { count: 30, region }));
      expect(tally(questions.map((question) => question.region))).toEqual({ [region]: 30 });
    }
  });

  it('a Singapore share is met exactly when the bank allows, with the difficulty mix kept', () => {
    for (const [share, singapore] of [[0.3, 9], [0.5, 15], [0, 0], [1, 30]] as const) {
      for (let seed = 1; seed <= 5; seed += 1) {
        const questions = questionsOf(
          select(AMPLE, { count: 30, region: { singaporeShare: share } }, { seed }),
        );
        const regions = tally(questions.map((question) => question.region));
        expect(regions.singapore ?? 0).toBe(singapore);
        expect(regions.general ?? 0).toBe(30 - singapore);
        expect(tally(questions.map((question) => question.difficulty))).toEqual(difficultyQuota(30));
      }
    }
  });

  it('a Singapore share falls back to general questions when the pack is short', () => {
    const few = makeBank({ categories: { food: { easy: 40 } }, singaporeEvery: 10 });
    const questions = questionsOf(
      select(few, { count: 30, difficulty: 'easy', region: { singaporeShare: 0.5 } }),
    );
    expect(tally(questions.map((question) => question.region))).toEqual({
      singapore: 4,
      general: 26,
    });
  });
});

describe('selectQuestions: recently used questions (RZ-015)', () => {
  const small = makeBank({ categories: { food: { easy: 14 } } });
  const all = (small.chunks[0]?.questions ?? []).map((question) => question.id);
  const easy = { count: 10, difficulty: 'easy' } as const;

  it('avoids them while the pool has enough fresh questions', () => {
    const recentlyUsed = all.slice(0, 4);
    for (let seed = 1; seed <= 20; seed += 1) {
      const selection = select(small, easy, { seed, recentlyUsed });
      const chosen = ids(questionsOf(selection));
      expect(chosen.filter((id) => recentlyUsed.includes(id))).toEqual([]);
      expect(selection).toMatchObject({ reusedRecent: 0 });
    }
  });

  it('uses them, oldest first, once the fresh questions run out', () => {
    // Ten seen, oldest first; four fresh. A match of ten needs six of the seen ones.
    const recentlyUsed = [...all.slice(4)].reverse();
    for (let seed = 1; seed <= 20; seed += 1) {
      const selection = select(small, easy, { seed, recentlyUsed });
      const chosen = ids(questionsOf(selection));
      expect(chosen).toHaveLength(10);
      expect(new Set(chosen).size).toBe(10);
      expect(all.slice(0, 4).every((id) => chosen.includes(id))).toBe(true);
      expect(chosen.filter((id) => recentlyUsed.includes(id)).sort()).toEqual(
        recentlyUsed.slice(0, 6).sort(),
      );
      expect(selection).toMatchObject({ reusedRecent: 6 });
    }
  });

  it('takes the later place of an id listed twice', () => {
    const recentlyUsed = [all[0] ?? '', ...all.slice(1), all[0] ?? ''];
    const chosen = ids(questionsOf(select(small, easy, { recentlyUsed })));
    expect(chosen).not.toContain(all[0]);
  });

  it('still makes a match when every question has been seen', () => {
    const selection = select(small, easy, { recentlyUsed: all });
    expect(questionsOf(selection)).toHaveLength(10);
    expect(selection).toMatchObject({ reusedRecent: 10 });
  });

  it('ignores ids that are not in the pool', () => {
    const selection = select(small, easy, { recentlyUsed: ['gone-1', 'gone-2'] });
    expect(selection).toMatchObject({ ok: true, reusedRecent: 0 });
  });

  it('prefers a fresh question over the difficulty mix', () => {
    const bank = makeBank({ categories: { food: { easy: 10, medium: 4, hard: 3 } } });
    const recentlyUsed = (bank.chunks[0]?.questions ?? [])
      .filter((question) => question.difficulty !== 'easy')
      .map((question) => question.id);
    const selection = select(bank, { count: 10 }, { recentlyUsed });
    expect(tally(questionsOf(selection).map((question) => question.difficulty))).toEqual({
      easy: 10,
    });
    expect(selection).toMatchObject({ reusedRecent: 0 });
  });
});

describe('selectQuestions: a bank that is too small', () => {
  const small = makeBank({
    categories: { food: { easy: 6, medium: 9, hard: 2 }, history: { easy: 3 } },
    singaporeEvery: 3,
  });

  it('makes no match and says how many questions there are', () => {
    expect(select(small, { count: 30 })).toEqual({
      ok: false,
      reason: 'bank-too-small',
      wanted: 30,
      available: 20,
    });
    expect(select(small, { count: 10, difficulty: 'hard' })).toEqual({
      ok: false,
      reason: 'bank-too-small',
      wanted: 10,
      available: 2,
    });
    expect(select(small, { count: 10, difficulty: 'easy' })).toMatchObject({ available: 9 });
    expect(select(small, { count: 10, categories: ['history'] })).toMatchObject({ available: 3 });
    expect(select(small, { count: 10, region: 'singapore' })).toMatchObject({ available: 7 });
  });

  it('makes the match when the pool is exactly big enough', () => {
    const exact = makeBank({ categories: { food: { easy: 4, medium: 4, hard: 2 } } });
    expect(questionsOf(select(exact, { count: 10 }))).toHaveLength(10);
  });

  it('does not count recently used questions against the pool', () => {
    const recentlyUsed = (small.chunks[0]?.questions ?? []).map((question) => question.id);
    expect(questionsOf(select(small, { count: 10 }, { recentlyUsed }))).toHaveLength(10);
  });

  it('poolSize gives the same number from the index alone', () => {
    const cases: Partial<MatchSettings>[] = [
      { count: 30 },
      { difficulty: 'hard' },
      { difficulty: 'easy' },
      { categories: ['history'] },
      { region: 'singapore' },
      { region: 'general', difficulty: 'easy', categories: ['food'] },
      { region: { singaporeShare: 0.5 } },
    ];
    for (const change of cases) {
      const selection = select(small, { count: 50, ...change });
      expect(selection).toMatchObject({ reason: 'bank-too-small' });
      if (!selection.ok && selection.reason === 'bank-too-small') {
        expect(poolSize(small.index, settings(change))).toBe(selection.available);
      }
    }
    expect(poolSize(AMPLE.index, settings())).toBe(270);
    expect(poolSize(AMPLE.index, settings({ difficulty: 'easy', categories: ['food'] }))).toBe(30);
  });
});

describe('selectQuestions: pictures and the 2 MB budget (RZ-020)', () => {
  const bank = makeBank({
    categories: { sights: { easy: 40, medium: 40, hard: 40 } },
    pictureEvery: 2,
    pictureBytes: 100_000,
  });
  // Half of these 60 are picture questions, so only 30 can be played with no room for pictures.
  const tight = makeBank({
    categories: { sights: { easy: 20, medium: 20, hard: 20 } },
    pictureEvery: 2,
    pictureBytes: 100_000,
  });
  const chunkBytes = bank.index.categories[0]?.bytes ?? 0;

  it('lists each picture of the match once, with the total to be transferred', () => {
    const selection = select(bank, { count: 30 });
    if (!selection.ok) throw new Error(selection.reason);
    const pictureQuestions = selection.questions.filter((question) => question.type === 'picture');
    expect(pictureQuestions.length).toBeGreaterThan(0);
    expect(selection.pictures.map((picture) => picture.file).sort()).toEqual(
      pictureQuestions.map((question) => question.picture?.file).sort(),
    );
    expect(selection.transferBytes).toBe(chunkBytes + pictureQuestions.length * 100_000);
    expect(selection.transferBytes).toBeLessThanOrEqual(2_000_000);
  });

  it('never goes over the budget: picture questions that do not fit are passed over', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const selection = select(bank, { count: 50 }, { seed, transferBudgetBytes: chunkBytes + 450_000 });
      if (!selection.ok) throw new Error(selection.reason);
      expect(selection.questions).toHaveLength(50);
      expect(selection.pictures.length).toBeLessThanOrEqual(4);
      expect(selection.transferBytes).toBeLessThanOrEqual(chunkBytes + 450_000);
    }
  });

  it('with the default budget a 50-question match stays within 2 MB', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const selection = select(bank, { count: 50 }, { seed });
      if (!selection.ok) throw new Error(selection.reason);
      expect(selection.transferBytes).toBeLessThanOrEqual(2_000_000);
      expect(selection.pictures.length).toBeLessThanOrEqual(19);
    }
  });

  it('is too small when only pictures over the budget are left', () => {
    const noRoom = tight.index.categories[0]?.bytes ?? 0;
    expect(select(tight, { count: 50 }, { transferBudgetBytes: noRoom })).toEqual({
      ok: false,
      reason: 'bank-too-small',
      wanted: 50,
      available: 30,
    });
  });

  it('reports the pictures still to load before the match may start', () => {
    const selection = select(bank, { count: 10 });
    if (!selection.ok) throw new Error(selection.reason);
    const files = selection.pictures.map((picture) => picture.file);
    expect(files.length).toBeGreaterThan(1);
    expect(picturesMissing(selection.pictures, new Set())).toEqual(files);
    expect(picturesMissing(selection.pictures, new Set(files.slice(1)))).toEqual(files.slice(0, 1));
    expect(picturesMissing(selection.pictures, new Set(files))).toEqual([]);
  });
});

describe('selectQuestions: chunks over the budget (RZ-020)', () => {
  it('fails with a clear reason when the chunk files alone are over the budget', () => {
    const chunkBytes = chunkBytesNeeded(AMPLE.index, settings());
    expect(chunkBytes).toBe(AMPLE.index.categories.reduce((sum, entry) => sum + entry.bytes, 0));
    expect(select(AMPLE, {}, { transferBudgetBytes: chunkBytes - 1 })).toEqual({
      ok: false,
      reason: 'over-budget',
      chunkBytes,
      budgetBytes: chunkBytes - 1,
    });
    expect(select(AMPLE, {}, { transferBudgetBytes: chunkBytes })).toMatchObject({ ok: true });
    expect(poolSize(AMPLE.index, settings(), chunkBytes - 1)).toBe(0);
    expect(poolSize(AMPLE.index, settings(), chunkBytes)).toBe(270);
  });

  it('counts only the chunks of the chosen categories', () => {
    const food = AMPLE.index.categories[0]?.bytes ?? 0;
    const only = { categories: ['food'] } as const;
    expect(chunkBytesNeeded(AMPLE.index, settings(only))).toBe(food);
    expect(select(AMPLE, only, { transferBudgetBytes: food })).toMatchObject({ ok: true });
  });
});

describe('poolSize with pictures: a length it allows never fails', () => {
  // 60 questions, 30 of them pictures of mixed sizes up to the 150 KB cap.
  const bank = makeBank({
    categories: { sights: { easy: 20, medium: 20, hard: 20 } },
    pictureEvery: 2,
    pictureSizes: [150_000, 20_000, 90_000, 5_000, 140_000],
  });
  const chunkBytes = bank.index.categories[0]?.bytes ?? 0;

  it('counts picture questions only as far as the budget is sure to hold them', () => {
    expect(poolSize(bank.index, settings())).toBe(30 + 13);
    expect(poolSize(bank.index, settings(), chunkBytes)).toBe(30);
    expect(poolSize(bank.index, settings(), chunkBytes + 449_999)).toBe(32);
    expect(poolSize(bank.index, settings(), chunkBytes + 450_000)).toBe(33);
    expect(poolSize(bank.index, settings(), 100_000_000)).toBe(60);
    expect(poolSize(bank.index, settings({ difficulty: 'easy' }), chunkBytes + 300_000)).toBe(12);
  });

  it('counts every picture question when the bank has no pictures to weigh', () => {
    expect(poolSize(AMPLE.index, settings())).toBe(270);
  });

  it('whenever poolSize reaches the length the selection succeeds, for every seed tried', () => {
    for (const room of [0, 150_000, 449_999, 450_000, 1_000_000, 1_500_000, 3_000_000]) {
      const transferBudgetBytes = chunkBytes + room;
      for (const count of [10, 30, 50] as const) {
        const promised = poolSize(bank.index, settings({ count }), transferBudgetBytes);
        for (let seed = 1; seed <= 40; seed += 1) {
          const selection = select(bank, { count }, { seed, transferBudgetBytes });
          if (promised >= count) expect(selection.ok).toBe(true);
          if (selection.ok) expect(selection.transferBytes).toBeLessThanOrEqual(transferBudgetBytes);
          else if (selection.reason === 'bank-too-small') {
            expect(selection.available).toBeGreaterThanOrEqual(promised);
          }
        }
      }
    }
  });

  it('a 50-question match fits the real 2 MB budget with pictures at the size cap', () => {
    const capped = makeBank({
      categories: { sights: { easy: 40, medium: 40, hard: 40 } },
      pictureEvery: 2,
      pictureBytes: 150_000,
    });
    expect(poolSize(capped.index, settings({ count: 50 }))).toBe(60 + 13);
    for (let seed = 1; seed <= 20; seed += 1) {
      const selection = select(capped, { count: 50 }, { seed });
      if (!selection.ok) throw new Error(selection.reason);
      expect(selection.transferBytes).toBeLessThanOrEqual(2_000_000);
    }
  });
});

describe('toPublicQuestion', () => {
  it('drops the answer and nothing else', () => {
    const bank = makeBank({ categories: { sights: { easy: 2 } }, pictureEvery: 2 });
    const [pictured, plain] = bank.chunks[0]?.questions ?? [];
    if (pictured === undefined || plain === undefined) throw new Error('fixture');
    expect(pictured.picture).toBeDefined();
    for (const question of [pictured, plain]) {
      const shown = toPublicQuestion(question);
      expect(Object.keys(shown)).not.toContain('correct');
      expect(JSON.stringify(shown)).not.toContain('correct');
      const { picture, ...rest } = question;
      const { picture: shownPicture, ...shownRest } = shown;
      expect({ ...shownRest, correct: question.correct }).toEqual(rest);
      expect(shownPicture === undefined).toBe(picture === undefined);
    }
  });

  it('shows of a picture only its file, alt text and credit: the source address names the answer', () => {
    const question: Question = {
      id: 'pic-0001',
      type: 'picture',
      category: 'sights',
      difficulty: 'easy',
      region: 'singapore',
      prompt: 'Which Singapore landmark is this?',
      options: ['The Merlion', 'Raffles Hotel', 'The Esplanade', 'Marina Barrage'],
      correct: 0,
      picture: {
        file: 'statue-01.jpg',
        alt: 'A white statue spouting water beside a bay',
        credit: 'Photo: A. Tan, Wikimedia Commons',
        licence: 'CC BY-SA 4.0',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Merlion_statue,_Merlion_Park.jpg',
        bytes: 90_000,
      },
    };
    const shown = toPublicQuestion(question);
    expect(shown.picture).toEqual({
      file: 'statue-01.jpg',
      alt: 'A white statue spouting water beside a bay',
      credit: 'Photo: A. Tan, Wikimedia Commons',
    });
    expect(JSON.stringify(shown.picture)).not.toMatch(/merlion/i);
    expect(JSON.stringify(shown)).not.toContain('sourceUrl');
  });

  it('copies the options, so shuffling the public copy cannot disturb the answer index', () => {
    const question = AMPLE.chunks[0]?.questions[0];
    if (question === undefined) throw new Error('fixture');
    const shown = toPublicQuestion(question);
    expect(shown.options).toEqual(question.options);
    expect(shown.options).not.toBe(question.options);
  });
});

describe('selectQuestions: fairness', () => {
  // Fixed seeds, so the numbers below are the same on every run; the tolerances are several
  // standard deviations wide and would only be crossed by a real bias.
  const MATCHES = 3000;

  it('picks every question about equally often', () => {
    const picks = new Map<string, number>();
    for (let seed = 1; seed <= MATCHES; seed += 1) {
      for (const id of ids(questionsOf(select(AMPLE, { count: 30 }, { seed })))) {
        picks.set(id, (picks.get(id) ?? 0) + 1);
      }
    }
    // 270 questions, 30 a match: each is expected in 1 match of 9, about 333 of 3000 (sd 17).
    expect(picks.size).toBe(270);
    const expected = (MATCHES * 30) / 270;
    for (const count of picks.values()) {
      expect(count).toBeGreaterThan(expected * 0.75);
      expect(count).toBeLessThan(expected * 1.25);
    }
  });

  it('puts every question in every place of the running order about equally often', () => {
    const small = makeBank({ categories: { food: { easy: 10 } } });
    const places = new Map<string, number[]>();
    for (let seed = 1; seed <= MATCHES; seed += 1) {
      ids(questionsOf(select(small, { count: 10, difficulty: 'easy' }, { seed }))).forEach(
        (id, place) => {
          const row = places.get(id) ?? Array.from({ length: 10 }, () => 0);
          row[place] = (row[place] ?? 0) + 1;
          places.set(id, row);
        },
      );
    }
    // Each of 10 questions is expected in each of 10 places 300 times of 3000 (sd 16).
    expect(places.size).toBe(10);
    for (const row of places.values()) {
      for (const count of row) {
        expect(count).toBeGreaterThan(225);
        expect(count).toBeLessThan(375);
      }
    }
  });

  it('draws from each category in proportion to its size', () => {
    const uneven = makeBank({
      categories: { big: { easy: 60 }, middle: { easy: 30 }, small: { easy: 10 } },
    });
    const drawn: Record<string, number> = { big: 0, middle: 0, small: 0 };
    for (let seed = 1; seed <= MATCHES; seed += 1) {
      for (const question of questionsOf(select(uneven, { count: 10, difficulty: 'easy' }, { seed }))) {
        drawn[question.category] = (drawn[question.category] ?? 0) + 1;
      }
    }
    const total = MATCHES * 10;
    expect((drawn.big ?? 0) / total).toBeGreaterThan(0.57);
    expect((drawn.big ?? 0) / total).toBeLessThan(0.63);
    expect((drawn.middle ?? 0) / total).toBeGreaterThan(0.27);
    expect((drawn.middle ?? 0) / total).toBeLessThan(0.33);
    expect((drawn.small ?? 0) / total).toBeGreaterThan(0.08);
    expect((drawn.small ?? 0) / total).toBeLessThan(0.12);
  });
});

it('RZ-015 oldest recent beats Mixed difficulty quotas after fresh questions run out', () => {
  const bank = makeBank({ categories: { food: { easy: 12, medium: 12, hard: 12 } } });
  const all = bank.chunks.flatMap(chunk => chunk.questions);
  const fresh = all.filter(q => q.difficulty === 'easy').slice(0, 9);
  const oldest = all.find(q => q.difficulty === 'easy' && !fresh.includes(q));
  if (!oldest) throw new Error('Missing oldest fixture');
  const recent = [oldest, ...all.filter(q => q !== oldest && !fresh.includes(q))].map(q => q.id);
  const selected = questionsOf(select(bank, { count: 10, difficulty: 'mixed' }, { recentlyUsed: recent }));
  expect(ids(selected).sort()).toEqual([...fresh.map(q => q.id), oldest.id].sort());
});

it('RZ-010 setupTable aggregates regions and separates picture counts from plain counts', () => {
  const bank = makeBank({ categories: { life: { easy: 8, medium: 4, hard: 2 } }, singaporeEvery: 2, pictureEvery: 2, pictureBytes: 123 });
  const table = setupTable(bank.index);
  const category = table.categories[0];
  expect(category).toMatchObject({ id: 'life', title: 'life', region: 'general',
    plain: { easy: 4, medium: 2, hard: 1 }, pictures: { easy: 4, medium: 2, hard: 1 }, largestPicture: 123 });
  expect(category?.bytes).toBe(bank.index.categories[0]?.bytes);
  expect(table.budgetBytes).toBeGreaterThan(0);
  expect(setupTable(makeBank({ categories: { sg: { easy: 2 } }, singaporeEvery: 1 }).index).categories[0]?.region).toBe('singapore');
});
