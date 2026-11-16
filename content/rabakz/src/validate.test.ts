import { describe, expect, it } from 'vitest';
import { parseBlocklist } from './blocklist';
import type { PictureFile } from './schema';
import { LIMITS } from './schema';
import type { Problem, ValidationContext } from './validate';
import { imageFormat, lengthGiveaway, validateSourceFile } from './validate';

const context: ValidationContext = {
  pictures: new Map<string, PictureFile>([
    ['statue-01.jpg', { bytes: 90_000, format: 'jpeg' }],
    ['statue-02.png', { bytes: 150_000, format: 'png' }],
    ['statue-03.webp', { bytes: 1, format: 'webp' }],
    ['empty.jpg', { bytes: 0, format: null }],
    ['notes.jpg', { bytes: 40, format: null }],
    ['renamed.jpg', { bytes: 4000, format: 'png' }],
    ['huge.jpg', { bytes: 150_001, format: 'jpeg' }],
    ['merlion.jpg', { bytes: 90_000, format: 'jpeg' }],
  ]),
  blocklist: parseBlocklist('# test list\nbadword\nvery rude phrase\n'),
};

const NOTE = { kind: 'original', note: 'Check: any atlas published this century.' };

function multipleChoice(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'geo-0001',
    type: 'multiple-choice',
    prompt: 'What is the capital city of Australia?',
    options: ['Sydney', 'Canberra', 'Melbourne', 'Perth'],
    answer: 'Canberra',
    difficulty: 'easy',
    region: 'general',
    source: NOTE,
    ...overrides,
  };
}

function trueFalse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return multipleChoice({
    id: 'geo-0002',
    type: 'true-false',
    prompt: 'The Pacific is the largest ocean on Earth.',
    options: ['True', 'False'],
    answer: 'True',
    ...overrides,
  });
}

const PICTURE = {
  file: 'statue-01.jpg',
  alt: 'A white statue spouting water beside a bay',
  credit: 'Photo: A. Tan, Wikimedia Commons',
  licence: 'CC BY-SA 4.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
};

function picture(
  pictureOverrides: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return multipleChoice({
    id: 'pic-0001',
    type: 'picture',
    prompt: 'Which Singapore landmark is this?',
    options: ['The Merlion', 'Raffles Hotel', 'The Esplanade', 'Marina Barrage'],
    answer: 'The Merlion',
    region: 'singapore',
    picture: { ...PICTURE, ...pictureOverrides },
    ...overrides,
  });
}

function file(
  questions: unknown,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return { category: 'geography', title: 'Geography', questions, ...overrides };
}

function validate(data: unknown, name = 'geography.json'): ReturnType<typeof validateSourceFile> {
  return validateSourceFile(name, data, context);
}

/** Validates one question and returns the problems it raised. */
function problemsOf(question: unknown): readonly Problem[] {
  return validate(file([question])).problems;
}

function errorRules(question: unknown): string[] {
  return problemsOf(question)
    .filter((problem) => problem.severity === 'error')
    .map((problem) => problem.rule);
}

function without(question: Record<string, unknown>, field: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(question).filter(([key]) => key !== field));
}

describe('validateSourceFile: good questions', () => {
  it('accepts a multiple-choice, a true-false and a picture question', () => {
    const result = validate(file([multipleChoice(), trueFalse(), picture()]));
    expect(result.problems).toEqual([]);
    expect(result.category).toEqual({ id: 'geography', title: 'Geography' });
    expect(result.questions.map((question) => question.id)).toEqual([
      'geo-0001',
      'geo-0002',
      'pic-0001',
    ]);
    expect(result.questions[2]?.picture).toEqual(PICTURE);
  });

  it('accepts a prompt of exactly 120 characters and an option of exactly 40', () => {
    const prompt = `${'Why '.repeat(29)}why?`;
    const option = 'Twelve words of four make up forty chars';
    expect(prompt).toHaveLength(LIMITS.prompt);
    expect(option).toHaveLength(LIMITS.option);
    const question = multipleChoice({
      prompt,
      options: ['Sydney', option, 'Melbourne', 'Perth'],
      answer: 'Sydney',
    });
    expect(problemsOf(question)).toEqual([]);
  });

  it('counts characters, not UTF-16 units', () => {
    const prompt = `Is ${'𝄞 '.repeat(56)}ok?`;
    expect(prompt.length).toBeGreaterThan(LIMITS.prompt);
    expect(errorRules(multipleChoice({ prompt }))).toEqual([]);
  });

  it('accepts a dataset source, with and without a url', () => {
    const dataset = {
      kind: 'dataset',
      dataset: 'Open Trivia Database',
      licence: 'CC BY-SA 4.0',
      notice: 'Adapted for Kaki Arcade. The adapted questions are offered under the same licence.',
    };
    expect(errorRules(multipleChoice({ source: dataset }))).toEqual([]);
    const withUrl = { ...dataset, url: 'https://opentdb.com' };
    const result = validate(file([multipleChoice({ source: withUrl })]));
    expect(result.problems).toEqual([]);
    expect(result.questions[0]?.source).toEqual(withUrl);
  });

  it('accepts a dataset source with the notice its licence asks for, and keeps it', () => {
    const source = {
      kind: 'dataset',
      dataset: 'Open Trivia Database',
      licence: 'CC BY-SA 4.0',
      url: 'https://opentdb.com',
      notice: 'Adapted for Kaki Arcade. The adapted questions are offered under the same licence.',
    };
    const result = validate(file([multipleChoice({ source })]));
    expect(result.problems).toEqual([]);
    expect(result.questions[0]?.source).toEqual(source);
    expect(errorRules(multipleChoice({ source: { ...source, notice: 'Too short' } }))).toEqual([
      'source',
    ]);
    expect(errorRules(multipleChoice({ source: { ...source, notice: 7 } }))).toEqual(['source']);
    expect(
      errorRules(multipleChoice({ source: { ...source, notice: 'x'.repeat(241) } })),
    ).toEqual(['source']);
  });

  it('requires the notice when the licence is share-alike, and only then', () => {
    const shareAlike = { kind: 'dataset', dataset: 'A dataset', licence: 'CC BY-SA 4.0' };
    expect(errorRules(multipleChoice({ source: shareAlike }))).toEqual(['source']);
    expect(validate(file([multipleChoice({ source: shareAlike })])).problems[0]?.message).toMatch(
      /needs a notice: "CC BY-SA 4.0" is a share-alike licence/,
    );
    expect(errorRules(multipleChoice({ source: { ...shareAlike, licence: 'CC BY 4.0' } }))).toEqual(
      [],
    );
    expect(errorRules(multipleChoice({ source: { ...shareAlike, licence: 'CC0 1.0' } }))).toEqual(
      [],
    );
  });

  it('accepts the address of the licence text, https only, and keeps it', () => {
    const source = {
      kind: 'dataset',
      dataset: 'A dataset',
      licence: 'CC BY 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    };
    const result = validate(file([multipleChoice({ source })]));
    expect(result.problems).toEqual([]);
    expect(result.questions[0]?.source).toEqual(source);
    expect(
      errorRules(multipleChoice({ source: { ...source, licenceUrl: 'http://example.org/l' } })),
    ).toEqual(['source']);
    expect(errorRules(multipleChoice({ source: { ...source, licenceUrl: 4 } }))).toEqual([
      'source',
    ]);
  });

  it('fills a missing source from the file default', () => {
    const defaultSource = {
      kind: 'dataset',
      dataset: 'Open Trivia Database',
      licence: 'CC BY-SA 4.0',
      notice: 'Adapted for Kaki Arcade. The adapted questions are offered under the same licence.',
    };
    const result = validate(file([without(multipleChoice(), 'source')], { defaultSource }));
    expect(result.problems).toEqual([]);
    expect(result.questions[0]?.source).toEqual(defaultSource);
  });
});

describe('validateSourceFile: the file', () => {
  it('rejects something that is not an object', () => {
    for (const data of [null, [], 'text', 3]) {
      const result = validate(data);
      expect(result.problems.map((problem) => problem.rule)).toEqual(['file']);
      expect(result.category).toBeNull();
    }
  });

  it('rejects a category that is not a slug or does not match the file name', () => {
    expect(validate(file([multipleChoice()], { category: 'Geography' })).category).toBeNull();
    const mismatch = validate(file([multipleChoice()], { category: 'history' }));
    expect(mismatch.problems[0]?.message).toContain('must match the file name "geography"');
    expect(mismatch.category).toBeNull();
  });

  it('rejects a missing, long or blocklisted title', () => {
    expect(validate(without(file([multipleChoice()]), 'title')).category).toBeNull();
    const long = validate(file([multipleChoice()], { title: 'A'.repeat(LIMITS.categoryTitle + 1) }));
    expect(long.problems[0]?.message).toContain('the limit is 24');
    const rude = validate(file([multipleChoice()], { title: 'Badword facts' }));
    expect(rude.problems.map((problem) => problem.rule)).toEqual(['blocklist']);
  });

  it('rejects an empty or missing question list', () => {
    expect(validate(file([])).problems.map((problem) => problem.rule)).toEqual(['file']);
    expect(validate(file('none')).problems.map((problem) => problem.rule)).toEqual(['file']);
  });

  it('rejects an unknown field in the file', () => {
    const result = validate(file([multipleChoice()], { titel: 'Geography' }));
    expect(result.problems.map((problem) => problem.rule)).toEqual(['unknown-field']);
  });

  it('rejects a bad default source and the questions that lean on it', () => {
    const result = validate(
      file([without(multipleChoice(), 'source')], { defaultSource: { kind: 'guess' } }),
    );
    expect(result.problems.map((problem) => problem.rule)).toEqual(['source']);
    expect(result.questions).toEqual([]);
  });
});

describe('validateSourceFile: each question rule', () => {
  it('rejects a question that is not an object', () => {
    expect(errorRules('What?')).toEqual(['file']);
  });

  it('names a question by its position until it has a usable id', () => {
    const problems = validate(file([multipleChoice(), multipleChoice({ id: 'Geo 2' })])).problems;
    expect(problems.map((problem) => [problem.rule, problem.question])).toEqual([['id', '#2']]);
  });

  it('id: must be a slug of at most 48 characters', () => {
    for (const id of ['', 'Geo-1', 'geo_1', 'geo--1', '-geo', 'geo 1', 'g'.repeat(49), 7, undefined]) {
      expect(errorRules(multipleChoice({ id }))).toEqual(['id']);
    }
  });

  it('unknown-field: catches a misspelt field', () => {
    expect(errorRules(multipleChoice({ dificulty: 'easy' }))).toEqual(['unknown-field']);
  });

  it('type: only the three kinds; no type-the-answer', () => {
    for (const type of ['type-the-answer', 'text', 'multiple', undefined]) {
      expect(errorRules(multipleChoice({ type }))).toContain('type');
    }
  });

  it('prompt: must be a string within 8 to 120 characters', () => {
    expect(errorRules(multipleChoice({ prompt: 12 }))).toEqual(['prompt']);
    expect(errorRules(multipleChoice({ prompt: 'Why so?' }))).toEqual(['prompt']);
    const long = `${'Why '.repeat(29)}why??`;
    expect(long).toHaveLength(121);
    const problems = problemsOf(multipleChoice({ prompt: long }));
    expect(problems.map((problem) => problem.rule)).toEqual(['prompt']);
    expect(problems[0]?.message).toBe('prompt is 121 characters; the limit is 120');
  });

  it('prompt: must be clean text', () => {
    const faults: [string, string][] = [
      [' What is the capital of Australia?', 'space at the start'],
      ['What is the capital of Australia? ', 'space at the start or the end'],
      ['What is the  capital of Australia?', 'two spaces'],
      ['What is the capital\nof Australia?', 'line break or a tab'],
      ['What is the capital\tof Australia?', 'line break or a tab'],
      ['What is the capital of Australia\u200b?', 'invisible control or format character (U+200B)'],
      ['What is the capital\u2060of Australia?', 'invisible control or format character (U+2060)'],
      ['What is the capital of\u00a0Australia?', 'special space (U+00A0); use an ordinary space'],
      ['What is the capital of\u202fAustralia?', 'special space (U+202F)'],
      ['Which family is this: 👨\u200d👩\u200d👧?', 'zero-width joiner (U+200D), as a joined emoji does'],
      ['What is the &quot;capital&quot; of Australia?', 'HTML entity'],
      ['What is the capital of Australia&#039;s north?', 'HTML entity'],
      ['What is the capital of Australia&apos s north?', 'HTML entity'],
      ['Which dish is fish &amp chips?', 'HTML entity'],
      ['Which letter is &eacute; in French?', 'HTML entity'],
      ['Which mark is &#x27; in a web page?', 'HTML entity'],
      ['What does a bare &nbsp do?', 'HTML entity'],
      ['Which is it: a &#39 b?', 'HTML entity'],
      ['Which word is Whаt in disguise?', 'mixes Latin and Cyrillic letters in the word "Whаt"'],
      ['Which letter hides in the word ΑΒC?', 'mixes Greek and Latin letters'],
      ['What is the <b>capital</b> of Australia?', 'HTML tag'],
      ['What is the <br capital of Australia?', 'HTML tag'],
      ['What is the capital </of Australia?', 'HTML tag'],
      ['What is the capital of Peru\u0301?', 'NFC'],
      ['What is the capital of Frаnce?', 'mixes Latin and Cyrillic letters in the word "Frаnce"'],
      ['Which city is Москва in English?', 'has "М" (Cyrillic); only Latin and Greek letters'],
      ['What does 谢谢 mean in English?', 'has "谢" (Chinese)'],
      ['What does நன்றி mean in English?', 'has "ந" (Tamil)'],
      ['Which letter is the Greek αlpha?', 'mixes Greek and Latin letters in the word "αlpha"'],
    ];
    for (const [prompt, reason] of faults) {
      const problems = problemsOf(multipleChoice({ prompt }));
      expect(problems.map((problem) => problem.rule)).toEqual(['prompt']);
      expect(problems[0]?.message).toContain(reason);
    }
    for (const prompt of [
      'Is 5 < 7 and 9 > 3 at Marks & Spencer?',
      'Which is bigger: π or the number 3?',
      'Is AT&T older than R&B, M&M\'s, Q&A, D&D, S&P 500 or H&M?',
      'Who founded Ben & Jerry\'s ice cream?',
      'Is the area of a circle πr² and its edge 2πr?',
      'Is 1 kΩ a thousandth of 1 MΩ, and 1 µm tiny?',
      'Which ocean is Hawaiʻi in?',
      'Which city was once called (Constantinopolitanisches-Reich)?',
      'What is the capital of Perú, said naïvely?',
      'Which fruit is this: 🍎?',
      'What is 5 + 3 − 2 × 4 ÷ 1 = ?',
    ]) {
      expect(problemsOf(multipleChoice({ prompt }))).toEqual([]);
    }
  });

  it('prompt: no unbroken word over 30 characters', () => {
    const word = 'Llanfairpwllgwyngyllgogerychwyrndrobwll';
    const problems = problemsOf(multipleChoice({ prompt: `Where is ${word}?` }));
    expect(problems.map((problem) => problem.rule)).toEqual(['prompt']);
    expect(problems[0]?.message).toContain('"Llanfairpwllgwyngyllgogerychwyrndrobwll" (39 characters); the limit is 30');
    expect(errorRules(multipleChoice({ prompt: `Where is ${'a'.repeat(31)}?` }))).toEqual(['prompt']);
    expect(errorRules(multipleChoice({ prompt: `Where is (${'a'.repeat(30)})?` }))).toEqual([]);
    expect(errorRules(multipleChoice({ prompt: `Is it ${'a'.repeat(20)}-${'b'.repeat(20)}?` }))).toEqual([]);
    // A non-breaking hyphen keeps the two halves on one line.
    expect(errorRules(multipleChoice({ prompt: `Is it ${'a'.repeat(20)}\u2011${'b'.repeat(20)}?` }))).toEqual(['prompt']);
  });

  it('an emoji counts as two characters', () => {
    const fits = `${'🍎'.repeat(7)} ok`;
    expect(errorRules(multipleChoice({ options: ['Sydney', 'Canberra', fits, 'Perth'] }))).toEqual([]);
    const over = `${'🍎 '.repeat(13)}🍎 x`;
    const problems = problemsOf(multipleChoice({ options: ['Sydney', 'Canberra', over, 'Perth'] }));
    expect(problems[0]?.message).toBe('option 3 is 43 characters; the limit is 40');
  });

  it('options: four for multiple choice and picture, two for true or false', () => {
    const three = ['Sydney', 'Canberra', 'Perth'];
    const five = ['Sydney', 'Canberra', 'Melbourne', 'Perth', 'Darwin'];
    expect(errorRules(multipleChoice({ options: three }))).toEqual(['options']);
    expect(errorRules(multipleChoice({ options: five }))).toEqual(['options']);
    expect(errorRules(multipleChoice({ options: ['Canberra', 'Perth'] }))).toEqual(['options']);
    expect(errorRules(multipleChoice({ options: 'Canberra' }))).toEqual(['options']);
    expect(errorRules(picture({}, { options: ['The Merlion', 'Raffles Hotel'] }))).toEqual([
      'options',
    ]);
    expect(
      errorRules(trueFalse({ options: ['True', 'False', 'Maybe', 'Never'] })),
    ).toEqual(['options']);
  });

  it('options: 2 to 4 when the type is unknown, so one mistake is one report', () => {
    const rules = errorRules(multipleChoice({ type: 'quiz', options: ['Canberra'] }));
    expect(rules).toEqual(['type', 'options']);
    expect(errorRules(multipleChoice({ type: 'quiz' }))).toEqual(['type']);
  });

  it('options: each at most 40 characters and clean', () => {
    const long = 'Twelve words of four make up forty chars!';
    expect(long).toHaveLength(41);
    const problems = problemsOf(multipleChoice({ options: ['Sydney', 'Canberra', long, 'Perth'] }));
    expect(problems.map((problem) => problem.rule)).toEqual(['options']);
    expect(problems[0]?.message).toBe('option 3 is 41 characters; the limit is 40');
    expect(errorRules(multipleChoice({ options: ['Sydney', 'Canberra', '', 'Perth'] }))).toEqual([
      'options',
    ]);
    expect(errorRules(multipleChoice({ options: ['Sydney', 'Canberra', 4, 'Perth'] }))).toEqual([
      'options',
    ]);
    expect(
      errorRules(multipleChoice({ options: ['Sydney', 'Canberra', 'Alice  Springs', 'Perth'] })),
    ).toEqual(['options']);
  });

  it('options: no unbroken word over 15 characters; hyphens and slashes break a word', () => {
    const word = 'Pneumonoultramicroscopic';
    const problems = problemsOf(multipleChoice({ options: ['Sydney', 'Canberra', word, 'Perth'] }));
    expect(problems.map((problem) => problem.rule)).toEqual(['options']);
    expect(problems[0]?.message).toContain('the unbroken word "Pneumonoultramicroscopic"');
    expect(problems[0]?.message).toContain('the limit is 15');
    const sixteen = 'Electromagnetism';
    expect(sixteen).toHaveLength(16);
    expect(errorRules(multipleChoice({ options: ['Sydney', 'Canberra', sixteen, 'Perth'] }))).toEqual([
      'options',
    ]);
    for (const fine of ['Electromagnetic', '(Constantinople)', '"Constantinople".', 'Electro-encephalography/imaging', 'Photosynthesis']) {
      expect(errorRules(multipleChoice({ options: ['Sydney', 'Canberra', fine, 'Perth'] }))).toEqual(
        [],
      );
    }
  });

  it('options: must differ, ignoring only case, width and spacing', () => {
    for (const twin of ['Sydney', 'sydney', 'SYDNEY', 'ＳＹＤＮＥＹ']) {
      const problems = problemsOf(
        multipleChoice({ options: ['Sydney', 'Canberra', twin, 'Perth'] }),
      );
      expect(problems.map((problem) => problem.rule)).toEqual(['options']);
      expect(problems[0]?.message).toContain('options 1 and 3 are the same');
    }
  });

  it('options: sets that differ only by a symbol, a sign or an accent are accepted', () => {
    const sets: [string[], string][] = [
      [['C', 'C++', 'C#', 'Java'], 'C#'],
      [['+', '-', '×', '÷'], '×'],
      [['-5', '5', '0', '10'], '-5'],
      [['🍎', '🍌', '🍇', '🍉'], '🍌'],
      [['Resume', 'Résumé', 'Rose', 'Rosé'], 'Rosé'],
      [['1/2', '1/4', '12', '14'], '1/4'],
      [['α', 'β', 'γ', 'δ'], 'γ'],
      [['Sydney', 'Sydney!', 'Sydney?', 'Sydney.'], 'Sydney!'],
    ];
    for (const [options, answer] of sets) {
      expect(problemsOf(multipleChoice({ options, answer }))).toEqual([]);
    }
  });

  it('options: true or false is spelt "True" then "False"', () => {
    expect(errorRules(trueFalse({ options: ['False', 'True'] }))).toEqual(['options']);
    expect(errorRules(trueFalse({ options: ['Yes', 'No'], answer: 'Yes' }))).toEqual(['options']);
    expect(errorRules(trueFalse({ options: ['true', 'false'], answer: 'true' }))).toEqual([
      'options',
    ]);
    expect(errorRules(trueFalse({ answer: 'False' }))).toEqual([]);
  });

  it('answer: must be the exact text of one option', () => {
    expect(errorRules(multipleChoice({ answer: 'Darwin' }))).toEqual(['answer']);
    expect(errorRules(multipleChoice({ answer: 'canberra' }))).toEqual(['answer']);
    expect(errorRules(multipleChoice({ answer: 1 }))).toEqual(['answer']);
    expect(errorRules(without(multipleChoice(), 'answer'))).toEqual(['answer']);
  });

  it('difficulty: easy, medium or hard', () => {
    for (const difficulty of ['Easy', 'mixed', 'impossible', 2, undefined]) {
      expect(errorRules(multipleChoice({ difficulty }))).toEqual(['difficulty']);
    }
    for (const difficulty of ['easy', 'medium', 'hard']) {
      expect(errorRules(multipleChoice({ difficulty }))).toEqual([]);
    }
  });

  it('region: general or singapore', () => {
    for (const region of ['Singapore', 'sg', 'asia', undefined]) {
      expect(errorRules(multipleChoice({ region }))).toEqual(['region']);
    }
    expect(errorRules(multipleChoice({ region: 'singapore' }))).toEqual([]);
  });

  it('source: every question needs one', () => {
    expect(errorRules(without(multipleChoice(), 'source'))).toEqual(['source']);
    expect(errorRules(multipleChoice({ source: 'Wikipedia' }))).toEqual(['source']);
    expect(errorRules(multipleChoice({ source: { kind: 'web' } }))).toEqual(['source']);
  });

  it('source: an original question carries a real note', () => {
    expect(errorRules(multipleChoice({ source: { kind: 'original' } }))).toEqual(['source']);
    expect(errorRules(multipleChoice({ source: { kind: 'original', note: 'Trust me' } }))).toEqual([
      'source',
    ]);
    const long = { kind: 'original', note: 'n'.repeat(LIMITS.sourceNote + 1) };
    expect(errorRules(multipleChoice({ source: long }))).toEqual(['source']);
    const extra = { ...NOTE, author: 'me' };
    expect(errorRules(multipleChoice({ source: extra }))).toEqual(['unknown-field']);
  });

  it('source: a dataset needs its name and licence, and an https url if any', () => {
    const dataset = {
      kind: 'dataset',
      dataset: 'Open Trivia Database',
      licence: 'CC BY-SA 4.0',
      notice: 'Adapted for Kaki Arcade. The adapted questions are offered under the same licence.',
    };
    expect(errorRules(multipleChoice({ source: without(dataset, 'licence') }))).toEqual(['source']);
    expect(errorRules(multipleChoice({ source: without(dataset, 'dataset') }))).toEqual(['source']);
    expect(
      errorRules(multipleChoice({ source: { ...dataset, url: 'http://opentdb.com' } })),
    ).toEqual(['source']);
    expect(errorRules(multipleChoice({ source: { ...dataset, note: 'x' } }))).toEqual([
      'unknown-field',
    ]);
  });
});

describe('validateSourceFile: pictures', () => {
  it('a picture question needs a picture, and no other type may have one', () => {
    expect(errorRules(without(picture(), 'picture'))).toEqual(['picture']);
    expect(errorRules(multipleChoice({ picture: PICTURE }))).toEqual(['picture']);
    expect(errorRules(picture({}, { picture: 'merlion.jpg' }))).toEqual(['picture']);
  });

  it('the file must exist in pictures/', () => {
    const problems = problemsOf(picture({ file: 'esplanade.jpg' }));
    expect(problems.map((problem) => problem.rule)).toEqual(['picture']);
    expect(problems[0]?.message).toBe('picture file pictures/esplanade.jpg does not exist');
  });

  it('the file must be a real image of at most 150 KB, under its own extension', () => {
    const faults: [string, string][] = [
      ['empty.jpg', 'picture file pictures/empty.jpg is empty'],
      ['notes.jpg', 'picture file pictures/notes.jpg is not a JPEG, PNG or WebP image'],
      ['renamed.jpg', 'picture file pictures/renamed.jpg is a png image under another extension'],
      ['huge.jpg', 'picture file pictures/huge.jpg is 150001 bytes; the limit is 150000'],
    ];
    for (const [name, message] of faults) {
      const problems = problemsOf(picture({ file: name }));
      expect(problems.map((problem) => problem.message)).toEqual([message]);
    }
    expect(problemsOf(picture({ file: 'statue-02.png' }))).toEqual([]);
    expect(problemsOf(picture({ file: 'statue-03.webp' }))).toEqual([]);
  });

  it('reads the JPEG, PNG and WebP signatures', () => {
    expect(imageFormat([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe('jpeg');
    expect(imageFormat([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])).toBe('png');
    expect(imageFormat([...Buffer.from('RIFF'), 1, 2, 3, 4, ...Buffer.from('WEBP')])).toBe('webp');
    expect(imageFormat([...Buffer.from('RIFF'), 1, 2, 3, 4, ...Buffer.from('WAVE')])).toBeNull();
    expect(imageFormat([...Buffer.from('<svg xmlns=')])).toBeNull();
    expect(imageFormat([])).toBeNull();
  });

  it('the alt text, the credit and the file name must not contain the answer', () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ alt: 'The Merlion spouting water' }, 'picture alt text contains the correct answer "The Merlion"'],
      [{ alt: 'A merlion, seen from the bay' }, 'picture alt text contains the correct answer "The Merlion"'],
      [{ credit: 'Photo: Merlion Park Trust' }, 'picture credit contains the correct answer "The Merlion"'],
      [{ file: 'merlion.jpg' }, 'picture file name contains the correct answer "The Merlion"'],
    ];
    for (const [change, message] of cases) {
      const problems = problemsOf(picture(change));
      expect(problems.map((problem) => [problem.rule, problem.message])).toEqual([
        ['picture', message],
      ]);
    }
    // A wrong option may appear, and so may part of a word.
    expect(problemsOf(picture({ alt: 'Not Raffles Hotel; merlions galore' }))).toEqual([]);
  });

  it('the file must be a plain photograph file name', () => {
    for (const name of ['Statue.jpg', '../statue-01.jpg', 'statue-01.gif', 'statue.svg', 'statue', 5]) {
      expect(errorRules(picture({ file: name }))).toEqual(['picture']);
    }
  });

  it('needs alt text and a credit', () => {
    expect(errorRules(picture({ alt: '' }))).toEqual(['picture']);
    expect(errorRules(picture({ alt: undefined }))).toEqual(['picture']);
    expect(errorRules(picture({ credit: '' }))).toEqual(['picture']);
    expect(errorRules(picture({ credit: undefined }))).toEqual(['picture']);
    expect(errorRules(picture({ credit: 'c'.repeat(LIMITS.pictureCredit + 1) }))).toEqual([
      'picture',
    ]);
    expect(errorRules(picture({ alt: 'a'.repeat(LIMITS.pictureAlt + 1) }))).toEqual(['picture']);
  });

  it('needs a free licence', () => {
    for (const licence of ['Public domain', 'CC0 1.0', 'CC BY 1.0', 'CC BY 2.0', 'CC BY 2.5', 'CC BY 4.0', 'CC BY-SA 3.0']) {
      expect(errorRules(picture({ licence }))).toEqual([]);
    }
    for (const licence of ['', undefined, 'CC BY-NC 4.0', 'CC BY-ND 4.0', 'All rights reserved', 'free', 'CC BY 3.5', 'CC BY 4.5', 'CC BY-SA 1.5', 'CC BY 5.0', 'CC0 2.0']) {
      expect(errorRules(picture({ licence }))).toEqual(['picture']);
    }
  });

  it('needs an https source address', () => {
    for (const sourceUrl of [undefined, '', 'commons.wikimedia.org', 'http://example.org/a.jpg', 'https://nodot']) {
      expect(errorRules(picture({ sourceUrl }))).toEqual(['picture']);
    }
  });

  it('rejects an unknown picture field', () => {
    expect(errorRules(picture({ author: 'A. Tan' }))).toEqual(['unknown-field']);
  });
});

describe('validateSourceFile: the all-ages blocklist', () => {
  it('rejects a listed word in the prompt, an option or the alt text', () => {
    expect(errorRules(multipleChoice({ prompt: 'Which city is a BADWORD?' }))).toEqual([
      'blocklist',
    ]);
    expect(
      errorRules(multipleChoice({ options: ['Sydney', 'Canberra', 'Bádword!', 'Perth'] })),
    ).toEqual(['blocklist']);
    expect(errorRules(picture({ alt: 'A badword beside a bay' }))).toEqual(['blocklist']);
  });

  it('matches a phrase and reports the term', () => {
    const problems = problemsOf(multipleChoice({ prompt: 'What is a Very, rude phrase called?' }));
    expect(problems[0]?.message).toBe(
      'contains a term on the all-ages blocklist: very rude phrase',
    );
  });

  it('matches whole words only', () => {
    expect(errorRules(multipleChoice({ prompt: 'Which city is badwordish?' }))).toEqual([]);
    expect(errorRules(multipleChoice({ prompt: 'Which very rude phrases exist?' }))).toEqual([]);
  });

  it('passes everything when the list is empty', () => {
    const empty = { ...context, blocklist: parseBlocklist('# nothing yet\n\n') };
    const result = validateSourceFile(
      'geography.json',
      file([multipleChoice({ prompt: 'Which city is a badword?' })]),
      empty,
    );
    expect(result.problems).toEqual([]);
  });
});

describe('answers given away by length', () => {
  it('flags a correct option far longer than the rest, as a warning that keeps the question', () => {
    const options = ['Red', 'Blue', 'A mixture of red, green and blue light', 'Green'];
    const result = validate(file([multipleChoice({ options, answer: options[2] })]));
    expect(result.problems).toEqual([
      {
        severity: 'warning',
        rule: 'length-giveaway',
        file: 'geography.json',
        question: 'geo-0001',
        message: 'the correct option (38 characters) is much longer than every other (longest 5)',
      },
    ]);
    expect(result.questions).toHaveLength(1);
  });

  it('flags a correct option far shorter than the rest', () => {
    const options = ['The river Thames', 'The river Severn', 'Avon', 'The river Mersey'];
    expect(lengthGiveaway(options, 'Avon')).toContain('much shorter');
  });

  it('does not flag ordinary differences, a wrong long option, or true or false', () => {
    expect(lengthGiveaway(['Ag', 'Gd', 'Au', 'Pt'], 'Au')).toBeNull();
    expect(lengthGiveaway(['Au', 'Gold', 'Ag', 'Tin'], 'Gold')).toBeNull();
    expect(lengthGiveaway(['Sydney', 'Canberra', 'Alice Springs', 'Perth'], 'Canberra')).toBeNull();
    expect(
      lengthGiveaway(['Red', 'Blue', 'A mixture of red, green and blue light', 'Green'], 'Red'),
    ).toBeNull();
    expect(lengthGiveaway(['True', 'False'], 'True')).toBeNull();
    // One other option of similar length is enough cover.
    expect(
      lengthGiveaway(['Red', 'A mix of red, green and blue', 'A mix of every colour there is', 'Blue'], 'A mix of every colour there is'),
    ).toBeNull();
  });
});
