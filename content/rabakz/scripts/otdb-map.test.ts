import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SourceQuestion } from '../src/tools';
import {
  LIMITS,
  MATCH_TRANSFER_BUDGET_BYTES,
  displayLength,
  parseBlocklist,
  validateSourceFile,
} from '../src/tools';
import { buildFromDisk, packagePaths, sha256 } from './io';
import type { ImportInput, OtdbRawQuestion } from './otdb-map';
import {
  CATEGORY_MAP,
  CATEGORY_TITLES,
  OTDB_SOURCE,
  CATEGORY_CAPS,
  NORTH_AMERICAN_LEAGUE_SHARE,
  cleanText,
  decodeEntities,
  formatReport,
  formatSample,
  importQuestions,
  mergeIntoFile,
  overlap,
  parseRemoved,
  questionId,
  sampleQuestions,
} from './otdb-map';

const CATEGORIES = [
  { id: 9, name: 'General Knowledge' },
  { id: 15, name: 'Entertainment: Video Games' },
  { id: 21, name: 'Sports' },
  { id: 22, name: 'Geography' },
  { id: 25, name: 'Art' },
  { id: 26, name: 'Celebrities' },
];

function multiple(question: string, correct: string, extra: Partial<OtdbRawQuestion> = {}): OtdbRawQuestion {
  return {
    categoryId: 22,
    type: 'multiple',
    difficulty: 'medium',
    question,
    correct,
    incorrect: ['Paris', 'Rome', 'Madrid'],
    ...extra,
  };
}

function boolean(question: string, correct: 'True' | 'False'): OtdbRawQuestion {
  return {
    categoryId: 22,
    type: 'boolean',
    difficulty: 'easy',
    question,
    correct,
    incorrect: [correct === 'True' ? 'False' : 'True'],
  };
}

function run(questions: OtdbRawQuestion[], extra: Partial<ImportInput> = {}): ReturnType<typeof importQuestions> {
  return importQuestions({
    categories: CATEGORIES,
    questions,
    blocklist: parseBlocklist(''),
    hash: sha256,
    existing: [],
    removed: new Map(),
    ...extra,
  });
}

const ART = 25;
const ART_CAP = CATEGORY_CAPS['arts-and-literature'] ?? 0;

/** Distinct four-option questions, in geography unless another dataset category is named. */
function fillers(count: number, categoryId = 22): OtdbRawQuestion[] {
  const numerals = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa'];
  return Array.from({ length: count }, (_, at) =>
    multiple(
      `Which city is the home of the ${numerals[at % 10] ?? ''} ${numerals[Math.floor(at / 10) % 10] ?? ''} ${numerals[Math.floor(at / 100) % 10] ?? ''} museum?`,
      `City ${String(at)}`,
      { categoryId },
    ),
  );
}

describe('tidying text', () => {
  it('decodes entities, named, numbered and encoded twice, and leaves what it does not know', () => {
    expect(decodeEntities('&quot;Caf&eacute;&quot; &amp; &#039;bar&#x27;')).toBe('"Café" & \'bar\'');
    expect(decodeEntities('&amp;quot;x&amp;quot;')).toBe('"x"');
    expect(decodeEntities('AT&T, R&B and &madeup;')).toBe('AT&T, R&B and &madeup;');
  });

  it('strips soft hyphens, zero-width characters and direction marks', () => {
    expect(cleanText('Wa\u00ADter\u200B \u200Eloo\u200F\u202A!\u202C\uFEFF')).toBe('Water loo!');
    expect(cleanText('ex&shy;tra', true)).toBe('extra');
  });

  it('decodes entities only when told the download may hold them', () => {
    // A url3986 download has none: "&amp;" there is what the question is about.
    expect(cleanText('What does &amp; stand for in HTML?')).toBe('What does &amp; stand for in HTML?');
    expect(cleanText('Tom &amp; Jerry', true)).toBe('Tom & Jerry');
  });

  it('makes every space an ordinary one, closes up runs and trims', () => {
    expect(cleanText('  Which\u00A0city \t is  it?\n  ')).toBe('Which city is it?');
    expect(cleanText('Is it true , or not?')).toBe('Is it true, or not?');
    // Only after a letter: "5 : 3" and a French "Qui ?" are left as written.
    expect(cleanText('What is 5 : 3?')).toBe('What is 5 : 3?');
  });

  it('gives NFC form and changes nothing else', () => {
    expect(cleanText('Cafe\u0301')).toBe('Café');
    expect(cleanText('What is 5 - 3? "Quoted" (yes) 50%')).toBe('What is 5 - 3? "Quoted" (yes) 50%');
  });
});

describe('the category table', () => {
  it('maps the 24 dataset categories onto 8 to 12 Rabakz categories with short titles', () => {
    expect(Object.keys(CATEGORY_MAP)).toHaveLength(24);
    const used = new Set(Object.values(CATEGORY_MAP));
    expect(used.size).toBeGreaterThanOrEqual(8);
    expect(used.size).toBeLessThanOrEqual(12);
    for (const category of used) {
      const title = CATEGORY_TITLES[category];
      expect(title, category).toBeDefined();
      expect(displayLength(title ?? '')).toBeLessThanOrEqual(LIMITS.categoryTitle);
    }
    expect(new Set(Object.keys(CATEGORY_TITLES))).toEqual(used);
  });

  it('caps every category but the four everyone can answer, and merges games, comics and anime', () => {
    expect(new Set(Object.keys(CATEGORY_CAPS))).toEqual(new Set(Object.keys(CATEGORY_TITLES)));
    const open = Object.keys(CATEGORY_CAPS).filter((category) => CATEGORY_CAPS[category] === null);
    expect(open.sort()).toEqual(['general-knowledge', 'geography', 'history', 'science-and-nature']);
    for (const id of [15, 16, 29, 31, 32]) expect(CATEGORY_MAP[id]).toBe('games-comics-and-anime');
    expect(CATEGORY_CAPS['games-comics-and-anime']).toBe(240);
    expect(CATEGORY_TITLES['games-comics-and-anime']).toBe('Games, comics and anime');
    expect(Object.values(CATEGORY_MAP)).not.toContain('food-and-drink');
  });

  it('records the dataset, its licence, its address and the share-alike notice', () => {
    expect(OTDB_SOURCE.dataset).toBe('Open Trivia Database');
    expect(OTDB_SOURCE.licence).toBe('CC BY-SA 4.0');
    expect(OTDB_SOURCE.url).toBe('https://opentdb.com');
    expect(OTDB_SOURCE.licenceUrl).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
    expect(OTDB_SOURCE.notice).toMatch(/Adapted/);
    expect(OTDB_SOURCE.notice).toMatch(/selected, screened for an all-ages audience, regrouped and tidied/);
    expect(OTDB_SOURCE.notice).toMatch(/offered under the same licence/);
  });
});

describe('mapping a question', () => {
  it('maps a multiple-choice question: four options, the answer, difficulty, region, a content id', () => {
    const { kept, dropped } = run([
      multiple('Which city is the capital of Germany?', 'Berlin', { difficulty: 'hard' }),
    ]);
    expect(dropped).toEqual([]);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.category).toBe('geography');
    expect(kept[0]?.sourceCategory).toBe('Geography');
    expect(kept[0]?.question).toEqual({
      id: questionId('Which city is the capital of Germany?', 'Berlin', sha256),
      type: 'multiple-choice',
      prompt: 'Which city is the capital of Germany?',
      options: ['Berlin', 'Paris', 'Rome', 'Madrid'],
      answer: 'Berlin',
      difficulty: 'hard',
      region: 'general',
    });
    expect(kept[0]?.question.id).toMatch(/^otdb-[0-9a-f]{12}$/);
  });

  it('never imports a true-or-false question (D-049)', () => {
    const { kept, dropped } = run([
      ...fillers(20),
      boolean('The Pacific is an ocean.', 'False'),
      boolean('Tea is a drink.', 'True'),
    ]);
    expect(kept).toHaveLength(20);
    expect(kept.every((item) => item.question.type === 'multiple-choice')).toBe(true);
    expect(dropped.map((item) => item.rule)).toEqual([
      'true-or-false (not used in Rabakz)',
      'true-or-false (not used in Rabakz)',
    ]);
  });

  it('gives an id that depends on the prompt and the answer only, not on spacing or case', () => {
    const id = questionId('Which city is the capital of Germany?', 'Berlin', sha256);
    expect(questionId('which city is  the capital of germany', 'BERLIN', sha256)).toBe(id);
    expect(questionId('Which city is the capital of Germany?', 'Bonn', sha256)).not.toBe(id);
    expect(questionId('Which city was the capital of Germany?', 'Berlin', sha256)).not.toBe(id);
  });

  it('produces questions the validator accepts as they are written to a file', () => {
    const { kept } = run(
      [
        multiple('Which  city is the capital of&nbsp;Germany?', ' Ber\u00ADlin '),
        multiple('Which river runs through &quot;the Eternal City&quot;?', 'Tiber', {
          incorrect: ['Arno', 'Po', 'Seine'],
        }),
      ],
      { entities: true },
    );
    const file = mergeIntoFile('geography', null, kept.map((item) => item.question), new Set());
    const validated = validateSourceFile('geography.json', file, {
      pictures: new Map(),
      blocklist: parseBlocklist(''),
    });
    expect(validated.problems).toEqual([]);
    expect(validated.questions.map((question) => question.prompt).sort()).toEqual([
      'Which city is the capital of Germany?',
      'Which river runs through "the Eternal City"?',
    ]);
    expect(validated.questions[0]?.source).toEqual(OTDB_SOURCE);
  });
});

describe('what the import drops', () => {
  const rules = (questions: OtdbRawQuestion[], extra: Partial<ImportInput> = {}): string[] =>
    run(questions, extra).dropped.map((item) => item.rule);

  it('a record that is not a four-option or true-or-false question', () => {
    expect(rules([multiple('Which city is it?', 'Berlin', { incorrect: ['Paris'] })])).toEqual(['shape']);
    expect(rules([multiple('Which city is it?', 'Berlin', { type: 'essay' })])).toEqual(['shape']);
    expect(rules([multiple('Which city is it?', 'Berlin', { difficulty: 'fiendish' })])).toEqual(['shape']);
    expect(rules([multiple('Which city is it?', 'Berlin', { categoryId: 99 })])).toEqual([
      'unmapped-category',
    ]);
  });

  it('what the validator rejects, under the rule that rejected it', () => {
    const long = `Which city, ${'very '.repeat(25)}far away, is it?`;
    expect(rules([multiple(long, 'Berlin')])).toEqual(['validator: prompt']);
    expect(
      rules([multiple('Which city is it?', 'A town with a name that goes on for far too long')]),
    ).toEqual(['validator: options']);
    expect(rules([multiple('Which city is it?', 'Paris')])).toEqual(['validator: options']);
    expect(rules([multiple('Which city is written 東京?', 'Tokyo')])).toEqual(['validator: prompt']);
    expect(rules([multiple('Which city has a &madeup; in it?', 'Berlin')])).toEqual(['validator: prompt']);
  });

  it('a question with a blocklisted term, in the prompt or in an option', () => {
    const blocklist = parseBlocklist('rude word\n');
    expect(rules([multiple('Which city has a rude-word in it?', 'Berlin')], { blocklist })).toEqual([
      'validator: blocklist',
    ]);
    expect(rules([multiple('Which city is it?', 'Rude Word')], { blocklist })).toEqual([
      'validator: blocklist',
    ]);
  });

  it('a question the screen rejects, with the rule and the words', () => {
    const { dropped } = run([multiple('Which city is currently the capital?', 'Berlin')]);
    expect(dropped).toEqual([
      {
        rule: 'screen: dated wording',
        sourceCategory: 'Geography',
        prompt: 'Which city is currently the capital?',
        detail: 'currently',
      },
    ]);
    expect(rules([multiple('Who is she?', 'Berlin', { categoryId: 26 })])).toEqual([
      'screen: source category left out',
    ]);
  });

  it('a correct option that stands out by its length', () => {
    expect(
      rules([multiple('Which city is it?', 'The city on the river Spree, of course')]),
    ).toEqual(['answer given away by length']);
  });

  it('the same question twice, and the same question reworded', () => {
    const first = multiple('Which city is the capital of Germany?', 'Berlin');
    expect(rules([first, { ...first, incorrect: ['Bonn', 'Rome', 'Oslo'] }])).toEqual(['duplicate']);
    expect(
      rules([first, multiple('Which city is the capital city of Germany?', 'Berlin')]),
    ).toEqual(['near-duplicate']);
    // The same four options and the same answer need fewer words in common.
    const gas = { incorrect: ['Oxygen', 'Argon', 'Helium'] };
    expect(
      rules([
        multiple("Which gas makes up most of the Earth's atmosphere?", 'Nitrogen', gas),
        multiple("Which gas forms about 78% of the Earth's atmosphere?", 'Nitrogen', gas),
      ]),
    ).toEqual(['near-duplicate']);
    expect(
      rules([
        multiple('Which gas fills most crisp packets?', 'Nitrogen', gas),
        multiple("Which gas forms about 78% of the Earth's atmosphere?", 'Nitrogen', gas),
      ]),
    ).toEqual([]);
    // Another answer, or other words: a different question.
    expect(
      rules([
        first,
        multiple('Which city is the capital of France?', 'Paris', { incorrect: ['Bonn', 'Rome', 'Oslo'] }),
        multiple('Which city did the Wall divide until 1989?', 'Berlin'),
      ]),
    ).toEqual([]);
  });

  it('an id a person removed after reading, with the reason', () => {
    const id = questionId('Which city is the capital of Germany?', 'Berlin', sha256);
    const { dropped } = run([multiple('Which city is the capital of Germany?', 'Berlin')], {
      removed: parseRemoved(`# read-through\n${id}  the answer is disputed\n`),
    });
    expect(dropped.map((item) => [item.rule, item.detail])).toEqual([
      ['removed after reading', 'the answer is disputed'],
    ]);
  });

  it('questions over the cap of a capped category, keeping a third of each difficulty', () => {
    const difficulties = ['easy', 'medium', 'hard'] as const;
    // 2 x cap questions: half of them medium, a quarter easy, a quarter hard.
    const questions = fillers(ART_CAP * 2, ART)
      .map((item, at) => ({ ...item, difficulty: difficulties[[0, 1, 1, 2][at % 4] ?? 0] ?? 'easy' }));
    const { kept, dropped } = run(questions);
    expect(ART_CAP).toBe(240);
    expect(kept).toHaveLength(ART_CAP);
    for (const difficulty of difficulties) {
      expect(kept.filter((item) => item.question.difficulty === difficulty)).toHaveLength(
        ART_CAP / 3,
      );
    }
    expect(dropped.map((item) => item.rule)).toEqual(
      Array.from({ length: ART_CAP }, () => 'category over its cap'),
    );
  });

  it('a short difficulty leaves its room to the others, easier first', () => {
    const questions = fillers(300, ART)
      .map((item, at) => ({ ...item, difficulty: at < 10 ? 'hard' : at < 150 ? 'easy' : 'medium' }));
    const { kept } = run(questions);
    const count = (difficulty: string): number =>
      kept.filter((item) => item.question.difficulty === difficulty).length;
    expect(kept).toHaveLength(ART_CAP);
    expect(count('hard')).toBe(10);
    expect(count('easy')).toBe(140);
    expect(count('medium')).toBe(ART_CAP - 150);
  });

  it('nothing from a category with no cap', () => {
    const { kept, dropped } = run(fillers(600));
    expect(kept).toHaveLength(600);
    expect(dropped).toEqual([]);
  });

  it('in games, comics and anime: reserve hard places and prefer familiar names', () => {
    const GAMES = 15;
    const questions = [
      ...fillers(244, GAMES),
      ...fillers(3, GAMES).map((item, at) => ({
        ...item,
        question: `Which city does Mario visit in level ${String(at + 1)} of the game?`,
        correct: `Mario town ${String(at)}`,
      })),
      ...fillers(3, GAMES).map((item, at) => ({
        ...item,
        question: `Which city is hardest to reach in obscure game number ${String(at + 1)}?`,
        correct: `Far town ${String(at)}`,
        difficulty: 'hard',
      })),
    ];
    const { kept, dropped } = run(questions);
    expect(kept).toHaveLength(240);
    expect(kept.every((item) => item.category === 'games-comics-and-anime')).toBe(true);
    expect(kept.filter((item) => item.question.prompt.includes('Mario'))).toHaveLength(3);
    expect(kept.filter((item) => item.question.difficulty === 'hard')).toHaveLength(3);
    expect(new Set(dropped.map((item) => item.rule))).toEqual(new Set(['category over its cap']));
  });

  it('reserves 80 games places for hard questions even after removals', () => {
    const questions = fillers(400, 15).map((item, at) => ({
      ...item, difficulty: at < 150 ? 'hard' : 'easy',
    }));
    const removed = new Map(questions.slice(0, 10).map((item) =>
      [questionId(item.question, item.correct, sha256), 'reviewed fault']));
    const { kept } = run(questions, { removed });
    expect(kept).toHaveLength(240);
    expect(kept.filter((item) => item.question.difficulty === 'hard')).toHaveLength(80);
  });

  it('does not classify the Mongolian Naadam festival as a North American league', () => {
    const { kept } = run([multiple(
      'Which sport is NOT traditionally played during the Mongolian Naadam festival?',
      'American Football',
      { categoryId: 21, incorrect: ['Wrestling', 'Archery', 'Horse-Racing'] },
    )]);
    expect(kept).toHaveLength(1);
  });

  it('sport questions about the North American leagues beyond a tenth of the category', () => {
    const SPORT = 21;
    const league = fillers(5, SPORT).map((item, at) => ({
      ...item,
      question: `Which city won the NBA title in season ${String(at + 1)}?`,
      correct: `Hoop town ${String(at)}`,
    }));
    const { kept, dropped } = run([...fillers(18, SPORT), ...league]);
    expect(NORTH_AMERICAN_LEAGUE_SHARE).toBe(0.1);
    // 18 other questions leave room for 2: 2 of 20 is a tenth.
    expect(kept).toHaveLength(20);
    expect(kept.filter((item) => item.question.prompt.includes('NBA'))).toHaveLength(2);
    expect(dropped.map((item) => item.rule)).toEqual(
      Array.from({ length: 3 }, () => 'sport: over the share for North American leagues'),
    );
  });

  it('the reverse of a question already kept', () => {
    expect(
      rules([
        multiple('Which city is the capital of Germany?', 'Berlin'),
        multiple('Berlin is the capital of which country?', 'Germany', {
          incorrect: ['France', 'Italy', 'Spain'],
        }),
      ]),
    ).toEqual(['near-duplicate']);
  });

  it('counts every fetched question once: kept or dropped', () => {
    const questions = [
      ...fillers(12),
      multiple('Which city is currently the capital?', 'Berlin'),
      multiple('Which city is it?', 'Berlin', { type: 'essay' }),
      boolean('Tea is a drink.', 'True'),
    ];
    const { kept, dropped } = run(questions);
    expect(kept.length + dropped.length).toBe(questions.length);
  });

  it('gives the same result whatever order the download came in', () => {
    const questions = [
      ...fillers(30),
      multiple('Which city is the capital of Germany?', 'Berlin'),
      multiple('Which city is the capital city of Germany?', 'Berlin'),
      boolean('Tea is a drink.', 'True'),
    ];
    const forwards = run(questions);
    const backwards = run([...questions].reverse());
    expect(backwards.kept).toEqual(forwards.kept);
  });
});

describe('the lists kept by hand', () => {
  const dated = multiple('Which city is currently the capital?', 'Berlin');
  const datedId = questionId('Which city is currently the capital?', 'Berlin', sha256);

  it('an exception lets through a question the word screen would drop', () => {
    expect(run([dated]).kept).toEqual([]);
    const { kept, dropped } = run([dated], { allowed: new Map([[datedId, 'read and clean']]) });
    expect(dropped).toEqual([]);
    expect(kept.map((item) => item.question.id)).toEqual([datedId]);
  });

  it('an id that is not in the download at all is reported, so a removal cannot lapse unseen', () => {
    const gone = 'otdb-0123456789ab';
    expect(run([dated], { removed: new Map([[gone, 'wrong']]) }).unmatched).toEqual([gone]);
    expect(run([dated], { allowed: new Map([[gone, 'clean']]) }).unmatched).toEqual([gone]);
    expect(run([dated]).unmatched).toEqual([]);
  });

  it('a removal the screen already makes is reported as not needed', () => {
    const { redundant, unmatched } = run([dated], { removed: new Map([[datedId, 'dated']]) });
    expect(redundant).toEqual([datedId]);
    expect(unmatched).toEqual([]);
  });
});

describe('spelling fixes', () => {
  it('applies the round 2 text corrections before screening without changing ids (RZ-023)', () => {
    const cases = [
  {
    "id": "otdb-1dfec393c83f",
    "prompt": "In the Mario Kart and Smash Bros. Games, Princess Rosalina is considered what weight class?",
    "answer": "Heavy",
    "incorrect": [
      "Medium",
      "Light",
      "Light-Medium"
    ],
    "from": "In the Mario Kart and Smash Bros. Games, Princess Rosalina is considered what weight class?",
    "to": "In the Mario Kart games, Rosalina is in which weight class?"
  },
  {
    "id": "otdb-7191652df59d",
    "prompt": "Who invented the \"Flying Shuttle\" in 1738; one of the key developments in the industrialization of weaving?",
    "answer": "John Kay",
    "incorrect": [
      "James Hargreaves",
      "Richard Arkwright",
      "John Deere"
    ],
    "from": "1738",
    "to": "1733"
  },
  {
    "id": "otdb-1042a9266c7a",
    "prompt": "Which RAID array type is associated with data mirroring?",
    "answer": "RAID 1",
    "incorrect": [
      "RAID 0",
      "RAID 10",
      "RAID 5"
    ],
    "from": "RAID 10",
    "to": "RAID 6"
  },
  {
    "id": "otdb-248cbb5c2678",
    "prompt": "What does SSD stand for?",
    "answer": "Solid State Drive",
    "incorrect": [
      "Solution Source Disk",
      "Solid State Disk",
      "Source Solution Drive"
    ],
    "from": "Solid State Disk",
    "to": "Super Speed Disk"
  },
  {
    "id": "otdb-6b30f4aadf75",
    "prompt": "What snowy mob was added in Minecraft 1.10?",
    "answer": "Polar bears",
    "incorrect": [
      "Eskimos",
      "Penguins",
      "Walking TNT"
    ],
    "from": "Eskimos",
    "to": "Yetis"
  },
  {
    "id": "otdb-3d0ec7aac84f",
    "prompt": "What does CPR, the emergency procedure to assist someone who has suffered cardiac arrest, stand for?",
    "answer": "Cardiopulmonary resuscitation",
    "incorrect": [
      "Chronic pain relief",
      "Cancer pain release",
      "Contraceptive prevalence rate"
    ],
    "from": "Contraceptive prevalence rate",
    "to": "Cardiac pressure response"
  },
  {
    "id": "otdb-c8d5a331b87a",
    "prompt": "Who sings the rap song \"Secret Wars Part 1\"?",
    "answer": "The Last Emperor",
    "incorrect": [
      "MC Frontalot",
      "Busdriver",
      "Masta Killa"
    ],
    "from": "Masta Killa",
    "to": "MC Lars"
  }
];
    for (const item of cases) {
      const { kept, corrections } = run([multiple(item.prompt, item.answer, { incorrect: item.incorrect })]);
      expect(kept[0]?.question.id).toBe(item.id);
      const text = [kept[0]?.question.prompt, ...(kept[0]?.question.options ?? [])].join(' | ');
      expect(text).toContain(item.to);
      expect(text).not.toContain(item.from);
      expect(corrections.some((correction) => correction.id === item.id)).toBe(true);
    }
  });


  it('correct the prompt and the options, keep the id and are recorded', () => {
    const { kept, corrections } = run([
      multiple('Which city is the largest in Austrailia?', 'Sydney', {
        incorrect: ['Los Angles', 'Rome', 'Madrid'],
      }),
    ]);
    const id = questionId('Which city is the largest in Austrailia?', 'Sydney', sha256);
    expect(kept[0]?.question.id).toBe(id);
    expect(kept[0]?.question.prompt).toBe('Which city is the largest in Australia?');
    expect(kept[0]?.question.options).toEqual(['Sydney', 'Los Angeles', 'Rome', 'Madrid']);
    expect(corrections).toEqual([
      { id, from: 'Which city is the largest in Austrailia?', to: 'Which city is the largest in Australia?' },
      { id, from: 'Los Angles', to: 'Los Angeles' },
    ]);
  });

  it('correct a misspelt answer so that it still matches its option', () => {
    const { kept } = run([
      multiple('Which city wrote the Moonlight Sonata?', 'Ludvig Van Beethoven', {
        incorrect: ['Wolfgang Amadeus Mozart', 'Johannes Brahms', 'Franz Schubert'],
      }),
    ]);
    expect(kept[0]?.question.answer).toBe('Ludwig van Beethoven');
    expect(kept[0]?.question.options[0]).toBe('Ludwig van Beethoven');
  });
});

describe('hand-written questions', () => {
  const sample: SourceQuestion = {
    id: 'geo-0001',
    type: 'multiple-choice',
    prompt: 'What is the capital city of Australia?',
    options: ['Sydney', 'Canberra', 'Melbourne', 'Perth'],
    answer: 'Canberra',
    difficulty: 'easy',
    region: 'general',
    source: { kind: 'original', note: 'Check: any atlas will do.' },
  };
  const other: SourceQuestion = { ...sample, id: 'geo-0002', prompt: 'Which city hosts the Australian parliament and High Court?' };

  it('are replaced by an imported question that asks the same thing, and kept otherwise', () => {
    const imported = multiple('What is the capital of Australia?', 'Canberra');
    const { kept, replaced } = run([imported], { existing: [sample, other] });
    expect(replaced).toEqual([{ existing: 'geo-0001', by: kept[0]?.question.id }]);

    const file = mergeIntoFile(
      'geography',
      { category: 'geography', title: 'Old title', questions: [sample, other] },
      kept.map((item) => item.question),
      new Set(replaced.map((item) => item.existing)),
    );
    expect(file.title).toBe('Geography');
    expect(file.defaultSource).toEqual(OTDB_SOURCE);
    expect(file.questions.map((question) => question.id)).toEqual(['geo-0002', kept[0]?.question.id]);
    // The hand-written question keeps its own source note.
    expect(file.questions[0]?.source).toEqual(sample.source);
  });

  it('are kept, and earlier imported questions replaced, when the import runs again', () => {
    const old: SourceQuestion = { ...sample, id: 'otdb-000000000000', prompt: 'An old import?' };
    const { kept } = run([multiple('Which city is the capital of Germany?', 'Berlin')]);
    const file = mergeIntoFile(
      'geography',
      { category: 'geography', title: 'Geography', questions: [sample, old] },
      kept.map((item) => item.question),
      new Set(),
    );
    expect(file.questions.map((question) => question.id)).toEqual(['geo-0001', kept[0]?.question.id]);
  });
});

describe('the read-through sample and the report', () => {
  const result = run([...fillers(80), multiple('Which city is currently the capital?', 'Berlin')]);

  it('chooses the same questions for the same seed, and others for another', () => {
    const first = sampleQuestions(result.kept, 60, 11, sha256);
    expect(first).toHaveLength(60);
    expect(new Set(first.map((item) => item.question.id)).size).toBe(60);
    expect(sampleQuestions(result.kept, 60, 11, sha256)).toEqual(first);
    expect(sampleQuestions(result.kept, 60, 12, sha256)).not.toEqual(first);
    expect(sampleQuestions(result.kept.slice(0, 5), 60, 11, sha256)).toHaveLength(5);
  });

  it('changes by one question when one question leaves the bank', () => {
    const first = sampleQuestions(result.kept, 60, 11, sha256);
    const gone = first[7];
    const without = sampleQuestions(
      result.kept.filter((item) => item !== gone),
      60,
      11,
      sha256,
    );
    expect(without.filter((item) => !first.includes(item))).toHaveLength(1);
    expect(first.filter((item) => !without.includes(item))).toEqual([gone]);
  });

  it('prints each sampled question with its options and the answer marked', () => {
    const text = formatSample(sampleQuestions(result.kept, 2, 11, sha256), 11, result.kept.length);
    expect(text).toContain('2 of 80 imported questions, chosen with seed 11');
    expect(text).toMatch(/\*\*City \d+\*\* · Paris · Rome · Madrid/);
  });

  it('reports what was fetched, what each rule dropped and what was kept', () => {
    const input = {
      categories: CATEGORIES,
      questions: [...fillers(80), multiple('Which city is currently the capital?', 'Berlin')],
      blocklist: parseBlocklist(''),
      hash: sha256,
      existing: [],
      removed: new Map<string, string>(),
    };
    const text = formatReport(input, result, 0);
    expect(text).toContain('Fetched: **81** verified questions');
    expect(text).toContain('Kept: **80**');
    expect(text).toContain('| Geography → geography | 81 | 0 | 81 |');
    expect(text).toContain('| screen: dated wording | 1 |');
    expect(text).toContain('| geography | 0 | 80 | 0 | 80 |');
    expect(text).toContain('Difficulty split: easy 0%, medium 100%, hard 0%.');
  });
});

describe('small helpers', () => {
  it('measures how far two sets of words overlap', () => {
    expect(overlap(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1);
    expect(overlap(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3);
    expect(overlap(new Set(), new Set(['a']))).toBe(0);
  });

  it('reads the list of removed ids and ignores everything else', () => {
    const removed = parseRemoved(
      '# heading\n\notdb-0123456789ab  wrong answer\nnot-an-id reason\notdb-ffffffffffff\n' +
        'otdb-aaaaaaaaaaaa  [dated] a record ## What is the tallest tower?\n',
    );
    expect([...removed.entries()]).toEqual([
      ['otdb-0123456789ab', 'wrong answer'],
      ['otdb-aaaaaaaaaaaa', '[dated] a record'],
    ]);
  });
});

describe('the imported questions in this package', () => {
  const built = buildFromDisk(packagePaths());
  const index = built.output?.index;
  const imported = (built.output?.chunks ?? [])
    .flatMap((chunk) => chunk.questions)
    .filter((question) => question.id.startsWith('otdb-'));

  it('are at least 1,200, all multiple choice, all general, in the categories of the table', () => {
    expect(imported.length).toBeGreaterThanOrEqual(1200);
    expect(imported.every((question) => question.type === 'multiple-choice')).toBe(true);
    expect(imported.every((question) => question.region === 'general')).toBe(true);
    expect(new Set(imported.map((question) => question.category))).toEqual(
      new Set(Object.keys(CATEGORY_TITLES)),
    );
  });

  it('are credited in the index with the licence and the share-alike notice (RZ-021)', () => {
    expect(index?.credits).toEqual([
      {
        dataset: OTDB_SOURCE.dataset,
        licence: OTDB_SOURCE.licence,
        licenceUrl: OTDB_SOURCE.licenceUrl,
        url: OTDB_SOURCE.url,
        notice: OTDB_SOURCE.notice,
        questions: imported.length,
      },
    ]);
  });

  it('raise no length-giveaway warning, and every chunk is inside the match budget', () => {
    expect(built.problems.filter((problem) => problem.rule === 'length-giveaway')).toEqual([]);
    const sizes = index?.categories.map((category) => category.bytes) ?? [];
    expect(Math.max(...sizes)).toBeLessThan(MATCH_TRANSFER_BUDGET_BYTES);
    expect(sizes.reduce((sum, bytes) => sum + bytes, 0)).toBeLessThan(MATCH_TRANSFER_BUDGET_BYTES);
  });

  it('hold none of the ids removed after reading', () => {
    const removed = parseRemoved(
      readFileSync(resolve(import.meta.dirname, '..', 'otdb-removed.txt'), 'utf8'),
    );
    expect(removed.size).toBeGreaterThan(0);
    expect(imported.filter((question) => removed.has(question.id))).toEqual([]);
  });
});
