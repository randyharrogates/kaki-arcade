// Turns the source files into the generated chunks and the index (RZ-020, RZ-022). Pure: the
// caller reads the files, lists the pictures and supplies the hash, so the same input always
// gives the same bytes.

import type { Blocklist } from './blocklist';
import type {
  AnswerBalance,
  BankIndex,
  BuiltPicture,
  CategoryEntry,
  Chunk,
  Counts,
  Difficulty,
  PictureFile,
  Question,
  QuestionType,
  Region,
  SourceCredit,
} from './schema';
import { BANK_FORMAT, MATCH_TRANSFER_BUDGET_BYTES } from './schema';
import { duplicateJsonKey, optionKey, promptKey, utf8Length } from './text';
import type { Problem, ValidQuestion } from './validate';
import { validateSourceFile } from './validate';

export interface TextFile {
  readonly name: string;
  readonly text: string;
}

export interface BuildInput {
  /** Every `src/questions/*.json`, in any order. */
  readonly files: readonly TextFile[];
  readonly blocklist: Blocklist;
  /** Files in `pictures/`: their size and what their first bytes say they are. */
  readonly pictures: ReadonlyMap<string, PictureFile>;
  /** Hash of a chunk's text in lower-case hex, for example SHA-256. */
  readonly hash: (text: string) => string;
}

export interface BuildOutput {
  readonly index: BankIndex;
  readonly chunks: readonly Chunk[];
  /** One file per category, sorted by name, then `index.json`. */
  readonly files: readonly TextFile[];
  /** Picture files the bank uses, sorted. The caller copies them beside the chunks. */
  readonly pictures: readonly string[];
}

export interface BuildResult {
  readonly problems: readonly Problem[];
  /** Null when any problem is an error. */
  readonly output: BuildOutput | null;
}

export const INDEX_FILE = 'index.json';

/** Characters of the hash that go into a chunk's file name. */
export const HASH_IN_NAME = 12;

/** True-or-false answers are reported as lopsided from this many questions ... */
export const BALANCE_MIN_QUESTIONS = 20;
/** ... when one answer is at least this share of them. */
export const BALANCE_MAX_SHARE = 0.7;

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

interface MutableCounts {
  total: number;
  byDifficulty: Record<Difficulty, number>;
  byRegion: Record<Region, number>;
  byType: Record<QuestionType, number>;
  byDifficultyAndRegion: Record<Difficulty, Record<Region, number>>;
  picturesByDifficultyAndRegion: Record<Difficulty, Record<Region, number>>;
}

const emptyCross = (): Record<Difficulty, Record<Region, number>> => ({
  easy: { general: 0, singapore: 0 },
  medium: { general: 0, singapore: 0 },
  hard: { general: 0, singapore: 0 },
});

/** Counts a set of questions every way the index reports. */
export function countQuestions(
  questions: readonly Pick<Question, 'difficulty' | 'region' | 'type'>[],
): Counts {
  const counts: MutableCounts = {
    total: 0,
    byDifficulty: { easy: 0, medium: 0, hard: 0 },
    byRegion: { general: 0, singapore: 0 },
    byType: { 'multiple-choice': 0, 'true-false': 0, picture: 0 },
    byDifficultyAndRegion: emptyCross(),
    picturesByDifficultyAndRegion: emptyCross(),
  };
  for (const question of questions) {
    counts.total += 1;
    counts.byDifficulty[question.difficulty] += 1;
    counts.byRegion[question.region] += 1;
    counts.byType[question.type] += 1;
    counts.byDifficultyAndRegion[question.difficulty][question.region] += 1;
    if (question.type === 'picture') {
      counts.picturesByDifficultyAndRegion[question.difficulty][question.region] += 1;
    }
  }
  return counts;
}

/** Where the correct answers fall across a set of questions. */
export function answerBalance(
  questions: readonly Pick<Question, 'type' | 'correct'>[],
): AnswerBalance {
  const trueFalse = { true: 0, false: 0 };
  const sourcePositions: [number, number, number, number] = [0, 0, 0, 0];
  for (const question of questions) {
    if (question.type === 'true-false') {
      if (question.correct === 0) trueFalse.true += 1;
      else trueFalse.false += 1;
    } else if (question.correct >= 0 && question.correct < 4) {
      sourcePositions[question.correct as 0 | 1 | 2 | 3] += 1;
    }
  }
  return { trueFalse, sourcePositions };
}

/** The option set of a question, whatever order it was written in. */
function optionSetKey(question: ValidQuestion): string {
  return question.options.map(optionKey).sort(compare).join('\u0001');
}

/**
 * The key two questions share when they are the same question: the same prompt (see
 * `promptKey`) with the same set of options, and for a picture question the same photograph.
 * "Which of these is a prime number?" may be asked twice with different options, and "Which
 * landmark is this?" of many photographs.
 */
function duplicateKey(question: ValidQuestion): string {
  const key = `${promptKey(question.prompt)}\u0000${optionSetKey(question)}`;
  return question.picture === undefined ? key : `${key}\u0000${question.picture.file}`;
}

function toBuilt(
  question: ValidQuestion,
  category: string,
  pictures: ReadonlyMap<string, PictureFile>,
): Question {
  const base = {
    id: question.id,
    type: question.type,
    category,
    difficulty: question.difficulty,
    region: question.region,
    prompt: question.prompt,
    options: [...question.options],
    correct: question.options.indexOf(question.answer),
  };
  if (question.picture === undefined) return base;
  const picture: BuiltPicture = {
    file: question.picture.file,
    alt: question.picture.alt,
    credit: question.picture.credit,
    licence: question.picture.licence,
    sourceUrl: question.picture.sourceUrl,
    bytes: pictures.get(question.picture.file)?.bytes ?? 0,
  };
  return { ...base, picture };
}

/** The exact text written for a chunk or the index. */
export function serialise(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

export function buildBank(input: BuildInput): BuildResult {
  const problems: Problem[] = [];
  const context = { pictures: input.pictures, blocklist: input.blocklist };
  const files = [...input.files].sort((a, b) => compare(a.name, b.name));

  const seenIds = new Map<string, string>();
  const seenQuestions = new Map<string, string>();
  const seenAnswers = new Map<string, string>();
  const usedPictures = new Set<string>();
  const credits = new Map<string, { credit: SourceCredit; questions: number }>();
  let originalQuestions = 0;
  const chunks: Chunk[] = [];

  for (const file of files) {
    let data: unknown;
    try {
      data = JSON.parse(file.text);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      problems.push({
        severity: 'error',
        rule: 'json',
        file: file.name,
        message: `not valid JSON: ${reason}`,
      });
      continue;
    }
    // JSON.parse keeps the last of two equal keys without a word, so an edit could be lost.
    const twice = duplicateJsonKey(file.text);
    if (twice !== null) {
      problems.push({
        severity: 'error',
        rule: 'json',
        file: file.name,
        message: `the key "${twice}" appears twice in one object`,
      });
      continue;
    }
    const validated = validateSourceFile(file.name, data, context);
    problems.push(...validated.problems);
    const kept: ValidQuestion[] = [];
    for (const question of validated.questions) {
      const where = `${file.name} ${question.id}`;
      // Both checks always run, so one build reports everything wrong with a question.
      const sameId = seenIds.get(question.id);
      if (sameId !== undefined) {
        problems.push({
          severity: 'error',
          rule: 'duplicate-id',
          file: file.name,
          question: question.id,
          message: `the id is already used in ${sameId.split(' ')[0] ?? sameId}`,
        });
      } else seenIds.set(question.id, where);
      const key = duplicateKey(question);
      const sameQuestion = seenQuestions.get(key);
      if (sameQuestion !== undefined) {
        problems.push({
          severity: 'error',
          rule: 'duplicate-question',
          file: file.name,
          question: question.id,
          message: `the same prompt with the same options is already in the bank as ${sameQuestion}`,
        });
      } else seenQuestions.set(key, where);
      if (sameId !== undefined || sameQuestion !== undefined) continue;
      if (question.type !== 'true-false') {
        // Two different prompts over one option set with one answer: often the same fact twice.
        const answerKey = `${optionSetKey(question)}\u0000${optionKey(question.answer)}`;
        const sameAnswer = seenAnswers.get(answerKey);
        if (sameAnswer !== undefined) {
          problems.push({
            severity: 'warning',
            rule: 'same-options',
            file: file.name,
            question: question.id,
            message: `has the same options and the same correct answer as ${sameAnswer}; check it is not the same question reworded`,
          });
        } else seenAnswers.set(answerKey, where);
      }
      kept.push(question);
    }
    if (validated.category === null) continue;
    const category = validated.category;
    for (const question of kept) {
      if (question.picture !== undefined) usedPictures.add(question.picture.file);
      if (question.source.kind === 'original') originalQuestions += 1;
      else {
        const { dataset, licence, url } = question.source;
        const key = `${dataset}\u0000${licence}\u0000${url ?? ''}`;
        const entry = credits.get(key) ?? {
          credit:
            url === undefined
              ? { dataset, licence, questions: 0 }
              : { dataset, licence, url, questions: 0 },
          questions: 0,
        };
        entry.questions += 1;
        credits.set(key, entry);
      }
    }
    chunks.push({
      format: BANK_FORMAT,
      category: category.id,
      title: category.title,
      questions: kept
        .map((question) => toBuilt(question, category.id, input.pictures))
        .sort((a, b) => compare(a.id, b.id)),
    });
  }

  // Only once the questions are sound: a picture whose question was rejected is not "unused".
  const sound = !problems.some((problem) => problem.severity === 'error');
  for (const picture of [...input.pictures.keys()].sort(compare)) {
    if (sound && !usedPictures.has(picture)) {
      problems.push({
        severity: 'warning',
        rule: 'picture',
        file: `pictures/${picture}`,
        message: 'no question uses this picture',
      });
    }
  }
  if (files.length === 0) {
    problems.push({
      severity: 'error',
      rule: 'file',
      file: 'src/questions',
      message: 'there are no source files',
    });
  }

  const outFiles: TextFile[] = [];
  const categories: CategoryEntry[] = [];
  for (const chunk of chunks) {
    const text = serialise(chunk);
    const hash = input.hash(text);
    const name = `${chunk.category}.${hash.slice(0, HASH_IN_NAME)}.json`;
    const bytes = utf8Length(text);
    if (bytes > MATCH_TRANSFER_BUDGET_BYTES) {
      problems.push({
        severity: 'error',
        rule: 'budget',
        file: `${chunk.category}.json`,
        message: `the chunk is ${String(bytes)} bytes; a match may transfer at most ${String(MATCH_TRANSFER_BUDGET_BYTES)} (RZ-020). Split the category`,
      });
    }
    const pictures = new Map<string, number>();
    for (const question of chunk.questions) {
      if (question.picture !== undefined) {
        pictures.set(question.picture.file, question.picture.bytes);
      }
    }
    outFiles.push({ name, text });
    categories.push({
      id: chunk.category,
      title: chunk.title,
      file: name,
      hash,
      bytes,
      counts: countQuestions(chunk.questions),
      pictures: [...pictures.entries()]
        .sort(([a], [b]) => compare(a, b))
        .map(([file, size]) => ({ file, bytes: size })),
    });
  }
  const all = chunks.flatMap((chunk) => chunk.questions);
  const answers = answerBalance(all);
  const trueFalse = answers.trueFalse.true + answers.trueFalse.false;
  const larger = Math.max(answers.trueFalse.true, answers.trueFalse.false);
  if (trueFalse >= BALANCE_MIN_QUESTIONS && larger / trueFalse >= BALANCE_MAX_SHARE) {
    const which = answers.trueFalse.true > answers.trueFalse.false ? 'True' : 'False';
    problems.push({
      severity: 'warning',
      rule: 'answer-balance',
      file: 'src/questions',
      message: `${String(larger)} of ${String(trueFalse)} true-or-false questions have the answer ${which}; players will learn to guess it`,
    });
  }

  if (problems.some((problem) => problem.severity === 'error')) {
    return { problems, output: null };
  }
  const index: BankIndex = {
    format: BANK_FORMAT,
    totals: countQuestions(all),
    answers,
    categories,
    credits: [...credits.entries()]
      .sort(([a], [b]) => compare(a, b))
      .map(([, entry]) => ({ ...entry.credit, questions: entry.questions })),
    originalQuestions,
  };
  outFiles.push({ name: INDEX_FILE, text: serialise(index) });
  return {
    problems,
    output: { index, chunks, files: outFiles, pictures: [...usedPictures].sort(compare) },
  };
}
