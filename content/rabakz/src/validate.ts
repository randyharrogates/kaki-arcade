// The hand-written validator for one source file (RZ-022, RZ-023, RZ-025). Pure: the caller
// says which picture files exist and supplies the blocklist. Rules that need the whole bank
// (duplicate ids, duplicate prompts) are in build.ts.

import type { Blocklist } from './blocklist';
import { findBlocked } from './blocklist';
import type {
  Difficulty,
  ImageFormat,
  Picture,
  PictureFile,
  QuestionSource,
  QuestionType,
  Region,
  SourceQuestion,
} from './schema';
import {
  DIFFICULTIES,
  FREE_LICENCE_PATTERN,
  LIMITS,
  OPTION_COUNT,
  PICTURE_FILE_PATTERN,
  QUESTION_TYPES,
  REGIONS,
  SLUG_PATTERN,
  TRUE_FALSE_OPTIONS,
} from './schema';
import { containsPhrase, displayLength, optionKey, textFault, words } from './text';

export type Rule =
  | 'json'
  | 'file'
  | 'unknown-field'
  | 'id'
  | 'type'
  | 'prompt'
  | 'options'
  | 'answer'
  | 'difficulty'
  | 'region'
  | 'picture'
  | 'source'
  | 'blocklist'
  | 'length-giveaway'
  | 'duplicate-id'
  | 'duplicate-question'
  | 'same-options'
  | 'answer-balance'
  | 'budget';

export interface Problem {
  /** An error fails the build. A warning is printed and the question is kept. */
  readonly severity: 'error' | 'warning';
  readonly rule: Rule;
  /** Source file name. */
  readonly file: string;
  /** The question's id, or its position (`#3`) when it has no usable id. */
  readonly question?: string;
  readonly message: string;
}

export interface ValidationContext {
  /** Picture files that exist in `pictures/`: their size and what their first bytes say. */
  readonly pictures: ReadonlyMap<string, PictureFile>;
  readonly blocklist: Blocklist;
}

/** A question that passed every rule, with its source filled in from the file default. */
export interface ValidQuestion extends SourceQuestion {
  readonly source: QuestionSource;
}

export interface ValidatedFile {
  readonly problems: readonly Problem[];
  /** Null when the file itself is unusable. */
  readonly category: { readonly id: string; readonly title: string } | null;
  /** The questions with no error. */
  readonly questions: readonly ValidQuestion[];
}

const FILE_FIELDS = ['category', 'title', 'defaultSource', 'questions'];
const QUESTION_FIELDS = [
  'id',
  'type',
  'prompt',
  'options',
  'answer',
  'difficulty',
  'region',
  'picture',
  'source',
];
const PICTURE_FIELDS = ['file', 'alt', 'credit', 'licence', 'sourceUrl'];
const DATASET_FIELDS = ['kind', 'dataset', 'licence', 'licenceUrl', 'url', 'notice'];
const ORIGINAL_FIELDS = ['kind', 'note'];

const FORMAT_OF_EXTENSION: Readonly<Record<string, ImageFormat>> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
};

/** What a picture file is, from its first bytes: the JPEG, PNG or WebP signature, or null. */
export function imageFormat(head: ArrayLike<number>): ImageFormat | null {
  const starts = (bytes: readonly number[], offset = 0): boolean =>
    bytes.every((byte, at) => head[offset + at] === byte);
  if (starts([0xff, 0xd8, 0xff])) return 'jpeg';
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  return null;
}

const HTTPS_URL = /^https:\/\/[^\s/]+\.[^\s/]+(?:\/\S*)?$/;

/** The correct option stands out when it is this many times the length of the nearest other. */
export const GIVEAWAY_RATIO = 1.5;
/** ... and at least this many characters apart, so "Au" against "Gold" is not flagged. */
export const GIVEAWAY_MIN_DIFFERENCE = 10;

type Report = (rule: Rule, message: string, severity?: Problem['severity']) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function includes<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

function unknownFields(record: Record<string, unknown>, allowed: readonly string[]): string[] {
  return Object.keys(record).filter((key) => !allowed.includes(key));
}

/**
 * Checks one displayed or recorded text: it is a string, it is clean (see `textFault`) and it
 * is within its length limits. Returns the text, or null after reporting.
 */
function checkText(
  value: unknown,
  name: string,
  rule: Rule,
  report: Report,
  max: number,
  min = 1,
): string | null {
  if (typeof value !== 'string') {
    report(rule, `${name} must be a string`);
    return null;
  }
  const fault = textFault(value);
  if (fault !== null) {
    report(rule, `${name} ${fault}`);
    return null;
  }
  const length = displayLength(value);
  if (length > max) {
    report(rule, `${name} is ${String(length)} characters; the limit is ${String(max)}`);
    return null;
  }
  if (length < min) {
    report(rule, `${name} is ${String(length)} characters; it needs at least ${String(min)}`);
    return null;
  }
  return value;
}

function checkSource(value: unknown, name: string, report: Report): QuestionSource | null {
  if (!isRecord(value)) {
    report('source', `${name} must be an object with "kind": "dataset" or "original"`);
    return null;
  }
  if (value.kind === 'original') {
    const extra = unknownFields(value, ORIGINAL_FIELDS);
    if (extra.length > 0) report('unknown-field', `${name} has unknown field ${extra.join(', ')}`);
    const note = checkText(
      value.note,
      `${name} note`,
      'source',
      report,
      LIMITS.sourceNote,
      LIMITS.sourceNoteMin,
    );
    return note === null || extra.length > 0 ? null : { kind: 'original', note };
  }
  if (value.kind === 'dataset') {
    const extra = unknownFields(value, DATASET_FIELDS);
    if (extra.length > 0) report('unknown-field', `${name} has unknown field ${extra.join(', ')}`);
    const dataset = checkText(value.dataset, `${name} dataset`, 'source', report, LIMITS.option);
    const licence = checkText(value.licence, `${name} licence`, 'source', report, LIMITS.option);
    let url: string | undefined;
    let urlBad = false;
    if (value.url !== undefined) {
      if (typeof value.url === 'string' && HTTPS_URL.test(value.url)) url = value.url;
      else {
        urlBad = true;
        report('source', `${name} url must be an https address`);
      }
    }
    let licenceUrl: string | undefined;
    if (value.licenceUrl !== undefined) {
      if (typeof value.licenceUrl === 'string' && HTTPS_URL.test(value.licenceUrl)) {
        licenceUrl = value.licenceUrl;
      } else {
        urlBad = true;
        report('source', `${name} licenceUrl must be an https address`);
      }
    }
    // A share-alike licence obliges us to say that the questions were adapted and under what
    // licence the adaptation is offered (RZ-021).
    if (value.notice === undefined && licence !== null && /\bSA\b/.test(licence)) {
      urlBad = true;
      report(
        'source',
        `${name} needs a notice: "${licence}" is a share-alike licence, so the credit must say the questions were adapted and are offered under the same licence`,
      );
    }
    const notice =
      value.notice === undefined
        ? undefined
        : checkText(
            value.notice,
            `${name} notice`,
            'source',
            report,
            LIMITS.sourceNote,
            LIMITS.sourceNoteMin,
          );
    if (dataset === null || licence === null || notice === null || urlBad || extra.length > 0) {
      return null;
    }
    return {
      kind: 'dataset',
      dataset,
      licence,
      ...(licenceUrl === undefined ? {} : { licenceUrl }),
      ...(url === undefined ? {} : { url }),
      ...(notice === undefined ? {} : { notice }),
    };
  }
  report('source', `${name} kind must be "dataset" or "original"`);
  return null;
}

function checkPicture(value: unknown, context: ValidationContext, report: Report): Picture | null {
  if (!isRecord(value)) {
    report('picture', 'picture must be an object');
    return null;
  }
  let ok = true;
  const extra = unknownFields(value, PICTURE_FIELDS);
  if (extra.length > 0) {
    ok = false;
    report('unknown-field', `picture has unknown field ${extra.join(', ')}`);
  }
  const file = value.file;
  if (typeof file !== 'string' || !PICTURE_FILE_PATTERN.test(file)) {
    ok = false;
    report(
      'picture',
      'picture file must be a lower-case hyphenated name ending in .jpg, .jpeg, .png or .webp',
    );
  } else {
    const found = context.pictures.get(file);
    const expected = FORMAT_OF_EXTENSION[file.slice(file.lastIndexOf('.') + 1)];
    const fault =
      found === undefined
        ? 'does not exist'
        : found.bytes === 0
          ? 'is empty'
          : found.format === null
            ? 'is not a JPEG, PNG or WebP image'
            : found.format !== expected
              ? `is a ${found.format} image under another extension`
              : found.bytes > LIMITS.pictureBytes
                ? `is ${String(found.bytes)} bytes; the limit is ${String(LIMITS.pictureBytes)}`
                : null;
    if (fault !== null) {
      ok = false;
      report('picture', `picture file pictures/${file} ${fault}`);
    }
  }
  const alt = checkText(value.alt, 'picture alt text', 'picture', report, LIMITS.pictureAlt);
  const credit = checkText(value.credit, 'picture credit', 'picture', report, LIMITS.pictureCredit);
  const licence = value.licence;
  if (typeof licence !== 'string' || !FREE_LICENCE_PATTERN.test(licence)) {
    ok = false;
    report(
      'picture',
      'picture licence must be a free licence written as "Public domain", "CC0 1.0", "CC BY 4.0" or "CC BY-SA 4.0" (version 1.0, 2.0, 2.5, 3.0 or 4.0)',
    );
  }
  const sourceUrl = value.sourceUrl;
  if (typeof sourceUrl !== 'string' || !HTTPS_URL.test(sourceUrl)) {
    ok = false;
    report('picture', 'picture sourceUrl must be an https address');
  }
  if (
    !ok ||
    alt === null ||
    credit === null ||
    typeof file !== 'string' ||
    typeof licence !== 'string' ||
    typeof sourceUrl !== 'string'
  ) {
    return null;
  }
  return { file, alt, credit, licence, sourceUrl };
}

function checkOptions(value: unknown, type: QuestionType | null, report: Report): string[] | null {
  if (!Array.isArray(value)) {
    report('options', 'options must be a list');
    return null;
  }
  const items: unknown[] = value;
  let ok = true;
  if (type !== null && items.length !== OPTION_COUNT[type]) {
    ok = false;
    report(
      'options',
      `a ${type} question has exactly ${String(OPTION_COUNT[type])} options; this has ${String(items.length)}`,
    );
  } else if (type === null && (items.length < 2 || items.length > 4)) {
    ok = false;
    report('options', `a question has 2 to 4 options; this has ${String(items.length)}`);
  }
  const options: string[] = [];
  items.forEach((item, index) => {
    const name = `option ${String(index + 1)}`;
    const option = checkText(item, name, 'options', report, LIMITS.option);
    if (option === null) {
      ok = false;
      return;
    }
    const long = words(option).find((word) => displayLength(word) > LIMITS.optionWord);
    if (long !== undefined) {
      ok = false;
      report(
        'options',
        `${name} has the unbroken word "${long}" (${String(displayLength(long))} characters); the limit is ${String(LIMITS.optionWord)}`,
      );
    }
    options.push(option);
  });
  if (!ok) return null;
  const seen = new Map<string, number>();
  for (const [index, option] of options.entries()) {
    const key = optionKey(option);
    const earlier = seen.get(key);
    if (earlier !== undefined) {
      ok = false;
      report(
        'options',
        `options ${String(earlier + 1)} and ${String(index + 1)} are the same ("${option}")`,
      );
    } else seen.set(key, index);
  }
  if (
    type === 'true-false' &&
    ok &&
    (options[0] !== TRUE_FALSE_OPTIONS[0] || options[1] !== TRUE_FALSE_OPTIONS[1])
  ) {
    ok = false;
    report('options', 'a true-false question has the options "True" then "False", spelt so');
  }
  return ok ? options : null;
}

/**
 * Flags a correct option whose length alone gives it away: it is the longest or the shortest
 * option by `GIVEAWAY_RATIO` and by at least `GIVEAWAY_MIN_DIFFERENCE` characters.
 */
export function lengthGiveaway(options: readonly string[], answer: string): string | null {
  const others = options.filter((option) => option !== answer).map(displayLength);
  if (others.length < 2) return null;
  const own = displayLength(answer);
  const longest = Math.max(...others);
  const shortest = Math.min(...others);
  if (own >= longest * GIVEAWAY_RATIO && own - longest >= GIVEAWAY_MIN_DIFFERENCE) {
    return `the correct option (${String(own)} characters) is much longer than every other (longest ${String(longest)})`;
  }
  if (shortest >= own * GIVEAWAY_RATIO && shortest - own >= GIVEAWAY_MIN_DIFFERENCE) {
    return `the correct option (${String(own)} characters) is much shorter than every other (shortest ${String(shortest)})`;
  }
  return null;
}

function validateQuestion(
  raw: unknown,
  position: number,
  file: string,
  defaultSource: QuestionSource | null,
  hasDefaultSource: boolean,
  context: ValidationContext,
  problems: Problem[],
): ValidQuestion | null {
  let label = `#${String(position + 1)}`;
  let errors = 0;
  const report: Report = (rule, message, severity = 'error') => {
    if (severity === 'error') errors += 1;
    problems.push({ severity, rule, file, question: label, message });
  };
  if (!isRecord(raw)) {
    report('file', 'a question must be an object');
    return null;
  }

  const id = raw.id;
  let validId: string | null = null;
  if (typeof id !== 'string' || !SLUG_PATTERN.test(id) || id.length > LIMITS.id) {
    report(
      'id',
      `id must be lower-case words and digits joined by hyphens, at most ${String(LIMITS.id)} characters`,
    );
  } else {
    validId = id;
    label = id;
  }

  const extra = unknownFields(raw, QUESTION_FIELDS);
  if (extra.length > 0) report('unknown-field', `unknown field ${extra.join(', ')}`);

  let type: QuestionType | null = null;
  if (includes(QUESTION_TYPES, raw.type)) type = raw.type;
  else report('type', `type must be one of ${QUESTION_TYPES.join(', ')}`);

  let prompt = checkText(raw.prompt, 'prompt', 'prompt', report, LIMITS.prompt, LIMITS.promptMin);
  const longWord = words(prompt ?? '').find((word) => displayLength(word) > LIMITS.promptWord);
  if (longWord !== undefined) {
    report(
      'prompt',
      `prompt has the unbroken word "${longWord}" (${String(displayLength(longWord))} characters); the limit is ${String(LIMITS.promptWord)}`,
    );
    prompt = null;
  }
  const options = checkOptions(raw.options, type, report);

  let answer: string | null = null;
  if (typeof raw.answer !== 'string') report('answer', 'answer must be the text of one option');
  else if (options !== null) {
    if (options.filter((option) => option === raw.answer).length === 1) answer = raw.answer;
    else report('answer', `answer "${raw.answer}" is not one of the options, letter for letter`);
  }

  let difficulty: Difficulty | null = null;
  if (includes(DIFFICULTIES, raw.difficulty)) difficulty = raw.difficulty;
  else report('difficulty', `difficulty must be one of ${DIFFICULTIES.join(', ')}`);

  let region: Region | null = null;
  if (includes(REGIONS, raw.region)) region = raw.region;
  else report('region', `region must be one of ${REGIONS.join(', ')}`);

  let picture: Picture | null = null;
  if (type === 'picture') {
    if (raw.picture === undefined) report('picture', 'a picture question needs a picture');
    else picture = checkPicture(raw.picture, context, report);
  } else if (raw.picture !== undefined) {
    report('picture', 'only a picture question may have a picture');
  }

  if (picture !== null && answer !== null) {
    // The answer must not be readable off the picture's own details.
    const stem = picture.file.replace(/\.[a-z]+$/, '');
    const places: [string, string][] = [
      ['alt text', picture.alt],
      ['credit', picture.credit],
      ['file name', stem],
    ];
    // "The Merlion" is given away by "merlion" just as well.
    const bare = answer.replace(/^(?:the|a|an) /i, '');
    for (const [name, text] of places) {
      if (containsPhrase(text, bare)) {
        report('picture', `picture ${name} contains the correct answer "${answer}"`);
      }
    }
  }

  let source: QuestionSource | null = null;
  if (raw.source !== undefined) source = checkSource(raw.source, 'source', report);
  else if (hasDefaultSource) source = defaultSource;
  else report('source', 'a question needs a source (or the file a defaultSource)');

  const shown = [prompt, ...(options ?? []), picture?.alt ?? null, picture?.credit ?? null];
  const blocked = new Set<string>();
  for (const text of shown) {
    if (text !== null) for (const term of findBlocked(text, context.blocklist)) blocked.add(term);
  }
  if (blocked.size > 0) {
    report('blocklist', `contains a term on the all-ages blocklist: ${[...blocked].join(', ')}`);
  }

  if (options !== null && answer !== null && type !== 'true-false') {
    const giveaway = lengthGiveaway(options, answer);
    if (giveaway !== null) report('length-giveaway', giveaway, 'warning');
  }

  if (
    errors > 0 ||
    validId === null ||
    type === null ||
    prompt === null ||
    options === null ||
    answer === null ||
    difficulty === null ||
    region === null ||
    source === null
  ) {
    return null;
  }
  const question = { id: validId, type, prompt, options, answer, difficulty, region, source };
  return picture === null ? question : { ...question, picture };
}

/**
 * Validates the parsed contents of `src/questions/<fileName>`.
 * @param fileName for example `geography.json`; the category must match it.
 */
export function validateSourceFile(
  fileName: string,
  data: unknown,
  context: ValidationContext,
): ValidatedFile {
  const problems: Problem[] = [];
  const fileProblem = (rule: Rule, message: string): void => {
    problems.push({ severity: 'error', rule, file: fileName, message });
  };
  if (!isRecord(data)) {
    fileProblem('file', 'the file must hold one object with category, title and questions');
    return { problems, category: null, questions: [] };
  }
  const extra = unknownFields(data, FILE_FIELDS);
  if (extra.length > 0) fileProblem('unknown-field', `unknown field ${extra.join(', ')}`);

  let categoryId: string | null = null;
  const expected = fileName.replace(/\.json$/, '');
  if (typeof data.category !== 'string' || !SLUG_PATTERN.test(data.category)) {
    fileProblem('file', 'category must be lower-case words joined by hyphens');
  } else if (data.category !== expected) {
    fileProblem('file', `category "${data.category}" must match the file name "${expected}"`);
  } else categoryId = data.category;

  const title = checkText(
    data.title,
    'title',
    'file',
    (rule, message) => {
      fileProblem(rule, message);
    },
    LIMITS.categoryTitle,
  );
  if (title !== null) {
    const blocked = findBlocked(title, context.blocklist);
    if (blocked.length > 0) {
      fileProblem('blocklist', `title contains a blocklisted term: ${blocked.join(', ')}`);
    }
  }

  let defaultSource: QuestionSource | null = null;
  const hasDefaultSource = data.defaultSource !== undefined;
  if (hasDefaultSource) {
    defaultSource = checkSource(data.defaultSource, 'defaultSource', (rule, message) => {
      fileProblem(rule, message);
    });
  }

  const questions: ValidQuestion[] = [];
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    fileProblem('file', 'questions must be a list with at least one question');
  } else {
    const items: unknown[] = data.questions;
    items.forEach((raw, position) => {
      const question = validateQuestion(
        raw,
        position,
        fileName,
        defaultSource,
        hasDefaultSource,
        context,
        problems,
      );
      if (question !== null) questions.push(question);
    });
  }

  const category = categoryId !== null && title !== null ? { id: categoryId, title } : null;
  return { problems, category, questions };
}
