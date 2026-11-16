import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseBlocklist } from './blocklist';
import type { BuildInput, TextFile } from './build';
import { buildBank, countQuestions, serialise } from './build';
import type { BankIndex, Chunk, PictureFile } from './schema';
import { utf8Length } from './text';

const hash = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

interface Draft {
  id: string;
  type?: string;
  prompt: string;
  options?: string[];
  answer?: string;
  difficulty?: string;
  region?: string;
  picture?: Record<string, string>;
  source?: Record<string, string>;
}

/** The same four options, for the tests that need two questions to share them. */
const SAME = ['Alpha', 'Bravo', 'Charlie', 'Delta'];

/** A question whose fourth option is its own id, so no two share an option set by accident. */
function question(draft: Draft): Record<string, unknown> {
  return {
    type: 'multiple-choice',
    options: ['Alpha', 'Bravo', 'Charlie', draft.id],
    answer: 'Bravo',
    difficulty: 'easy',
    region: 'general',
    source: { kind: 'original', note: 'Check: the test fixture itself.' },
    ...draft,
  };
}

function source(category: string, title: string, questions: unknown[]): TextFile {
  return { name: `${category}.json`, text: JSON.stringify({ category, title, questions }) };
}

const OTDB = { kind: 'dataset', dataset: 'Open Trivia Database', licence: 'CC BY-SA 4.0' };

function picture(file: string): Record<string, string> {
  return {
    file,
    alt: 'A landmark by the water',
    credit: 'Photo: A. Tan',
    licence: 'CC BY 4.0',
    sourceUrl: 'https://example.org/photo',
  };
}

const geography = source('geography', 'Geography', [
  question({ id: 'geo-2', prompt: 'Which city is second?', difficulty: 'hard' }),
  question({ id: 'geo-10', prompt: 'Which city is tenth?', region: 'singapore' }),
  question({ id: 'geo-1', prompt: 'Which city is first?', source: OTDB }),
]);
const pictures = source('pictures', 'Pictures', [
  question({
    id: 'pic-1',
    type: 'picture',
    prompt: 'Which landmark is this?',
    difficulty: 'medium',
    picture: picture('statue.jpg'),
  }),
  question({
    id: 'pic-2',
    type: 'picture',
    prompt: 'Which landmark is this?',
    picture: picture('hall.webp'),
  }),
  question({
    id: 'tf-1',
    type: 'true-false',
    prompt: 'The sea is wet.',
    options: ['True', 'False'],
    answer: 'True',
    source: OTDB,
  }),
]);

const jpeg = (bytes: number): PictureFile => ({ bytes, format: 'jpeg' });

const PHOTOGRAPHS = new Map<string, PictureFile>([
  ['statue.jpg', jpeg(90_000)],
  ['hall.webp', { bytes: 70_000, format: 'webp' }],
]);

function input(files: TextFile[], overrides: Partial<BuildInput> = {}): BuildInput {
  return {
    files,
    blocklist: parseBlocklist(''),
    // The two photographs exist only when the file that uses them is in the build.
    pictures: files.includes(pictures) ? PHOTOGRAPHS : new Map<string, PictureFile>(),
    hash,
    ...overrides,
  };
}

function rules(files: TextFile[], overrides: Partial<BuildInput> = {}): string[] {
  return buildBank(input(files, overrides)).problems.map(
    (problem) => `${problem.severity}:${problem.rule}`,
  );
}

describe('buildBank: output', () => {
  const result = buildBank(input([pictures, geography]));
  const output = result.output;

  it('builds with no problems', () => {
    expect(result.problems).toEqual([]);
    expect(output).not.toBeNull();
  });

  it('writes one chunk per category, sorted by name, then the index', () => {
    const names = output?.files.map((file) => file.name) ?? [];
    expect(names).toHaveLength(3);
    expect(names[0]).toMatch(/^geography\.[0-9a-f]{12}\.json$/);
    expect(names[1]).toMatch(/^pictures\.[0-9a-f]{12}\.json$/);
    expect(names[2]).toBe('index.json');
    expect(names[0]).toBe(`geography.${hash(output?.files[0]?.text ?? '').slice(0, 12)}.json`);
  });

  it('sorts questions by id and turns the answer into an index', () => {
    const chunk = JSON.parse(output?.files[0]?.text ?? '') as Chunk;
    expect(chunk.format).toBe(1);
    expect(chunk.category).toBe('geography');
    expect(chunk.title).toBe('Geography');
    expect(chunk.questions.map((item) => item.id)).toEqual(['geo-1', 'geo-10', 'geo-2']);
    expect(chunk.questions[0]).toEqual({
      id: 'geo-1',
      type: 'multiple-choice',
      category: 'geography',
      difficulty: 'easy',
      region: 'general',
      prompt: 'Which city is first?',
      options: ['Alpha', 'Bravo', 'Charlie', 'geo-1'],
      correct: 1,
    });
  });

  it('carries the picture with its size and keeps the source out of the chunk', () => {
    const chunk = JSON.parse(output?.files[1]?.text ?? '') as Chunk;
    expect(chunk.questions[0]?.picture).toEqual({ ...picture('statue.jpg'), bytes: 90_000 });
    expect(output?.files[1]?.text).not.toContain('test fixture');
    expect(output?.pictures).toEqual(['hall.webp', 'statue.jpg']);
  });

  it('indexes counts per category, difficulty, region and type, with a hash per chunk', () => {
    const index = JSON.parse(output?.files[2]?.text ?? '') as BankIndex;
    expect(index).toEqual(output?.index);
    expect(index.format).toBe(1);
    expect(index.totals).toEqual({
      total: 6,
      byDifficulty: { easy: 4, medium: 1, hard: 1 },
      byRegion: { general: 5, singapore: 1 },
      byType: { 'multiple-choice': 3, 'true-false': 1, picture: 2 },
      byDifficultyAndRegion: {
        easy: { general: 3, singapore: 1 },
        medium: { general: 1, singapore: 0 },
        hard: { general: 1, singapore: 0 },
      },
      picturesByDifficultyAndRegion: {
        easy: { general: 1, singapore: 0 },
        medium: { general: 1, singapore: 0 },
        hard: { general: 0, singapore: 0 },
      },
    });
    expect(index.answers).toEqual({
      trueFalse: { true: 1, false: 0 },
      sourcePositions: [0, 5, 0, 0],
    });
    expect(index.categories[0]?.pictures).toEqual([]);
    expect(index.categories[1]?.pictures).toEqual([
      { file: 'hall.webp', bytes: 70_000 },
      { file: 'statue.jpg', bytes: 90_000 },
    ]);
    expect(index.categories.map((category) => category.id)).toEqual(['geography', 'pictures']);
    for (const [position, category] of index.categories.entries()) {
      const text = output?.files[position]?.text ?? '';
      expect(category.file).toBe(output?.files[position]?.name);
      expect(category.hash).toBe(hash(text));
      expect(category.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(category.bytes).toBe(Buffer.byteLength(text, 'utf8'));
      expect(category.counts.total).toBe(3);
    }
    expect(index.categories[0]?.counts.byRegion).toEqual({ general: 2, singapore: 1 });
  });

  it('lists the datasets to credit and counts our own questions', () => {
    expect(output?.index.credits).toEqual([
      { dataset: 'Open Trivia Database', licence: 'CC BY-SA 4.0', questions: 2 },
    ]);
    expect(output?.index.originalQuestions).toBe(4);
  });
});

describe('buildBank: deterministic', () => {
  it('gives the same bytes whatever order the files and questions arrive in', () => {
    const forwards = buildBank(input([geography, pictures]));
    const backwards = buildBank(input([pictures, geography]));
    expect(backwards.output?.files).toEqual(forwards.output?.files);

    const parsed = JSON.parse(geography.text) as { questions: unknown[] };
    const reversed = source('geography', 'Geography', [...parsed.questions].reverse());
    const shuffled = buildBank(input([reversed, pictures]));
    expect(shuffled.output?.files).toEqual(forwards.output?.files);
  });

  it('gives the same bytes on a second run and changes only the edited chunk', () => {
    const first = buildBank(input([geography, pictures]));
    const second = buildBank(input([geography, pictures]));
    expect(second.output?.files).toEqual(first.output?.files);

    const parsed = JSON.parse(geography.text) as { questions: Record<string, unknown>[] };
    const edited = source(
      'geography',
      'Geography',
      parsed.questions.map((item) =>
        item.id === 'geo-2' ? { ...item, prompt: 'Which city is the second?' } : item,
      ),
    );
    const third = buildBank(input([edited, pictures]));
    const hashes = (index: BankIndex | undefined): (string | undefined)[] =>
      (index?.categories ?? []).map((category) => category.hash);
    expect(hashes(third.output?.index)[0]).not.toBe(hashes(first.output?.index)[0]);
    expect(hashes(third.output?.index)[1]).toBe(hashes(first.output?.index)[1]);
  });

  it('writes compact JSON with one final line break and no timestamp', () => {
    const text = buildBank(input([geography, pictures])).output?.files[2]?.text ?? '';
    expect(text.endsWith('}\n')).toBe(true);
    expect(text.trimEnd()).not.toContain('\n');
    expect(serialise({ b: 1, a: [2] })).toBe('{"b":1,"a":[2]}\n');
  });
});

describe('buildBank: duplicates', () => {
  const twin = (id: string, prompt: string, options: string[] = SAME): TextFile =>
    source('history', 'History', [question({ id, prompt, options })]);
  const first = source('geography', 'Geography', [
    question({ id: 'geo-1', prompt: 'Which city is first?', options: SAME }),
  ]);

  it('rejects the same prompt with the same options, ignoring case, accents and punctuation', () => {
    for (const prompt of ['Which city is first?', 'which CITY is first', 'Which city is fírst??']) {
      const result = buildBank(input([first, twin('his-1', prompt)]));
      expect(result.output).toBeNull();
      expect(result.problems).toEqual([
        {
          severity: 'error',
          rule: 'duplicate-question',
          file: 'history.json',
          question: 'his-1',
          message:
            'the same prompt with the same options is already in the bank as geography.json geo-1',
        },
      ]);
    }
  });

  it('rejects it whatever order the options are in', () => {
    const reordered = twin('his-1', 'Which city is first?', ['Delta', 'charlie', 'Bravo', 'ALPHA']);
    expect(rules([first, reordered])).toEqual(['error:duplicate-question']);
  });

  it('rejects the same question twice in one file', () => {
    const file = source('history', 'History', [
      question({ id: 'his-1', prompt: 'Who was first?', options: SAME }),
      question({ id: 'his-2', prompt: "Who was first?", options: SAME }),
    ]);
    expect(rules([file])).toEqual(['error:duplicate-question']);
  });

  it('lets one prompt be asked again with different options', () => {
    const file = source('maths', 'Maths', [
      question({ id: 'm-1', prompt: 'Which of these is a prime number?', options: ['4', '6', '7', '9'], answer: '7' }),
      question({ id: 'm-2', prompt: 'Which of these is a prime number?', options: ['8', '11', '12', '15'], answer: '11' }),
    ]);
    expect(buildBank(input([file])).problems).toEqual([]);
  });

  it('tells apart prompts that differ only by a sign or a symbol', () => {
    const options = ['2', '8', '15', '1'];
    const file = source('maths', 'Maths', [
      question({ id: 'm-1', prompt: 'What is 5 + 3?', options, answer: '8' }),
      question({ id: 'm-2', prompt: 'What is 5 - 3?', options, answer: '2' }),
      question({ id: 'm-3', prompt: 'What is 5 × 3?', options, answer: '15' }),
      question({ id: 'm-4', prompt: 'What is 50% of 2?', options, answer: '1' }),
      question({ id: 'm-5', prompt: 'What is 50 of 2?', options: ['100', '8', '15', '1'], answer: '100' }),
    ]);
    expect(buildBank(input([file])).problems).toEqual([]);
  });

  it('tells apart true-or-false statements by their prompt alone', () => {
    const statement = (id: string, prompt: string): Record<string, unknown> =>
      question({ id, type: 'true-false', prompt, options: ['True', 'False'], answer: 'True' });
    const file = source('science', 'Science', [
      statement('s-1', 'The sea is wet.'),
      statement('s-2', 'The sea is salty.'),
    ]);
    expect(buildBank(input([file])).problems).toEqual([]);
    const twice = source('science', 'Science', [
      statement('s-1', 'The sea is wet.'),
      statement('s-2', 'the sea is wet'),
    ]);
    expect(rules([twice])).toEqual(['error:duplicate-question']);
  });

  it('lets picture questions share a prompt and options but not the photograph too', () => {
    const shot = (id: string, file: string): Record<string, unknown> =>
      question({ id, type: 'picture', prompt: 'Which landmark is this?', options: SAME, picture: picture(file), answer: id === 'pic-1' ? 'Alpha' : 'Bravo' });
    const two = source('pictures', 'Pictures', [shot('pic-1', 'statue.jpg'), shot('pic-2', 'hall.webp')]);
    expect(rules([two], { pictures: PHOTOGRAPHS })).toEqual([]);
    const again = source('pictures', 'Pictures', [shot('pic-1', 'statue.jpg'), shot('pic-2', 'statue.jpg')]);
    expect(rules([again], { pictures: new Map([['statue.jpg', jpeg(1)]]) })).toEqual([
      'error:duplicate-question',
    ]);
  });

  it('warns when two questions share their options and their correct answer', () => {
    const file = source('history', 'History', [
      question({ id: 'his-1', prompt: 'In which year did the war end?', options: ['1943', '1944', '1945', '1946'], answer: '1945' }),
      question({ id: 'his-2', prompt: 'When was the peace signed?', options: ['1946', '1945', '1944', '1943'], answer: '1945' }),
      question({ id: 'his-3', prompt: 'When did the war turn?', options: ['1943', '1944', '1945', '1946'], answer: '1943' }),
    ]);
    const result = buildBank(input([file]));
    expect(result.problems).toEqual([
      {
        severity: 'warning',
        rule: 'same-options',
        file: 'history.json',
        question: 'his-2',
        message:
          'has the same options and the same correct answer as history.json his-1; check it is not the same question reworded',
      },
    ]);
    expect(result.output?.index.totals.total).toBe(3);
  });

  it('rejects an id used twice, in one file or across files', () => {
    const result = buildBank(input([geography, twin('geo-1', 'Who was first?')]));
    expect(result.output).toBeNull();
    expect(result.problems.map((problem) => problem.rule)).toEqual(['duplicate-id']);
    expect(result.problems[0]?.message).toBe('the id is already used in geography.json');
    const file = source('history', 'History', [
      question({ id: 'his-1', prompt: 'Who was first?' }),
      question({ id: 'his-1', prompt: 'Who was second?' }),
    ]);
    expect(rules([file])).toEqual(['error:duplicate-id']);
  });

  it('reports a repeated id and a repeated question on the same question', () => {
    const file = source('history', 'History', [
      question({ id: 'geo-1', prompt: 'Which city is first?', options: SAME }),
    ]);
    expect(rules([first, file])).toEqual(['error:duplicate-id', 'error:duplicate-question']);
  });
});

describe('buildBank: answer balance', () => {
  const statements = (trueOnes: number, falseOnes: number): TextFile =>
    source(
      'facts',
      'Facts',
      Array.from({ length: trueOnes + falseOnes }, (_, n) =>
        question({
          id: `f-${String(n)}`,
          type: 'true-false',
          prompt: `Statement number ${String(n)} is so.`,
          options: ['True', 'False'],
          answer: n < trueOnes ? 'True' : 'False',
        }),
      ),
    );

  it('warns when true-or-false answers lean heavily one way', () => {
    const result = buildBank(input([statements(14, 6)]));
    expect(result.problems).toEqual([
      {
        severity: 'warning',
        rule: 'answer-balance',
        file: 'src/questions',
        message:
          '14 of 20 true-or-false questions have the answer True; players will learn to guess it',
      },
    ]);
    expect(result.output?.index.answers.trueFalse).toEqual({ true: 14, false: 6 });
    expect(rules([statements(3, 17)])).toEqual(['warning:answer-balance']);
  });

  it('does not warn on a fair split or on a handful of questions', () => {
    expect(rules([statements(13, 7)])).toEqual([]);
    expect(rules([statements(19, 0)])).toEqual([]);
  });

  it('reports where four-option answers sit in the source without warning about it', () => {
    const file = source(
      'facts',
      'Facts',
      Array.from({ length: 30 }, (_, n) =>
        question({ id: `q-${String(n)}`, prompt: `What is fact number ${String(n)}?`, answer: 'Alpha' }),
      ),
    );
    const result = buildBank(input([file]));
    expect(result.problems).toEqual([]);
    expect(result.output?.index.answers.sourcePositions).toEqual([30, 0, 0, 0]);
  });
});

describe('buildBank: failures', () => {
  it('writes nothing when any question has an error, and reports every one', () => {
    const bad = source('history', 'History', [
      question({ id: 'his-1', prompt: 'Who?' }),
      question({ id: 'his-2', prompt: 'Who was second?', answer: 'Echo' }),
    ]);
    const result = buildBank(input([geography, bad]));
    expect(result.output).toBeNull();
    expect(result.problems.map((problem) => [problem.question, problem.rule])).toEqual([
      ['his-1', 'prompt'],
      ['his-2', 'answer'],
    ]);
  });

  it('reports a file that is not JSON', () => {
    const result = buildBank(input([geography, { name: 'history.json', text: '{ "category": ' }]));
    expect(result.output).toBeNull();
    expect(result.problems.map((problem) => [problem.file, problem.rule])).toEqual([
      ['history.json', 'json'],
    ]);
  });

  it('fails when there are no source files', () => {
    expect(rules([])).toEqual(['error:file']);
  });

  it('fails when a picture file is missing', () => {
    expect(rules([pictures], { pictures: new Map([['statue.jpg', jpeg(1)]]) })).toEqual([
      'error:picture',
    ]);
  });

  it('fails when a key appears twice in one object, naming it', () => {
    const text = geography.text.replace('"difficulty":"hard"', '"difficulty":"hard","difficulty":"easy"');
    expect(text).not.toBe(geography.text);
    const result = buildBank(input([{ name: 'geography.json', text }]));
    expect(result.output).toBeNull();
    expect(result.problems).toEqual([
      {
        severity: 'error',
        rule: 'json',
        file: 'geography.json',
        message: 'the key "difficulty" appears twice in one object',
      },
    ]);
  });

  it('fails when one chunk alone is over the 2 MB match budget', () => {
    const many = source(
      'huge',
      'Huge',
      Array.from({ length: 9000 }, (_, n) =>
        question({
          id: `huge-${String(n)}`,
          prompt: `What is the answer to question number ${String(n)}, counting from nought, in this very long list?`,
        }),
      ),
    );
    const result = buildBank(input([many]));
    expect(result.output).toBeNull();
    expect(result.problems.map((problem) => `${problem.rule}:${problem.file}`)).toEqual([
      'budget:huge.json',
    ]);
    expect(result.problems[0]?.message).toMatch(
      /^the chunk is \d{7} bytes; a match may transfer at most 2000000 \(RZ-020\)/,
    );
  });

  it('fails on a blocklisted word', () => {
    expect(rules([geography], { blocklist: parseBlocklist('tenth') })).toEqual(['error:blocklist']);
  });

  it('builds despite warnings: a giveaway answer and an unused picture', () => {
    const options = ['Red', 'Blue', 'A mixture of red, green and blue light', 'Green'];
    const file = source('science', 'Science', [
      question({ id: 'sci-1', prompt: 'What is white light?', options, answer: options[2] ?? '' }),
    ]);
    const result = buildBank(input([file], { pictures: new Map([['spare.jpg', jpeg(5)]]) }));
    expect(result.problems.map((problem) => `${problem.severity}:${problem.rule}:${problem.file}`)).toEqual([
      'warning:length-giveaway:science.json',
      'warning:picture:pictures/spare.jpg',
    ]);
    expect(result.output?.index.totals.total).toBe(1);
  });
});

describe('helpers', () => {
  it('countQuestions of nothing is all zeroes', () => {
    expect(countQuestions([]).total).toBe(0);
    expect(countQuestions([]).byType).toEqual({ 'multiple-choice': 0, 'true-false': 0, picture: 0 });
  });

  it('utf8Length matches Node for ASCII, accents, CJK and emoji', () => {
    for (const text of ['', 'kopi', 'Perú', '新加坡', 'laksa 🍜', '𝒳']) {
      expect(utf8Length(text)).toBe(Buffer.byteLength(text, 'utf8'));
    }
  });
});
