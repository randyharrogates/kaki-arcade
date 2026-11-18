// The match loader (RZ-020): which chunks a match needs, whether they are all loaded, and the
// questions for the match. Pure: the caller fetches the files and supplies the random function,
// so the same seed, settings and bank give the same match.

import type {
  BankIndex,
  BuiltPicture,
  CategoryEntry,
  Chunk,
  Difficulty,
  PublicQuestion,
  Question,
  Region,
} from './schema';
import {
  BANK_FORMAT,
  DIFFICULTIES,
  MATCH_TRANSFER_BUDGET_BYTES,
  OPTION_COUNT,
  QUESTION_TYPES,
  REGIONS,
} from './schema';

/** RZ-001. */
export const MATCH_LENGTHS = [10, 30, 50] as const;
export type MatchLength = (typeof MATCH_LENGTHS)[number];

/** RZ-011. Easy is easy questions only, Hard is hard only, Mixed is a third of each. */
export type DifficultySetting = 'easy' | 'mixed' | 'hard';

/**
 * Which regions a match draws from. `mixed` takes them as they come. `singaporeShare` asks for
 * that fraction (0 to 1) of the match to be Singapore questions, as near as the bank allows.
 */
export type RegionSetting = 'mixed' | Region | { readonly singaporeShare: number };

export interface MatchSettings {
  readonly count: MatchLength;
  readonly difficulty: DifficultySetting;
  /** RZ-010: category ids from the index, or `mixed` for all of them. */
  readonly categories: 'mixed' | readonly string[];
  /** Defaults to `mixed`. */
  readonly region?: RegionSetting;
}

/** A chunk file the caller has fetched and parsed. */
export interface LoadedChunk {
  readonly category: string;
  /** The parsed JSON, unchecked. */
  readonly data: unknown;
  /**
   * Hash of the fetched bytes, computed by the caller the way the build did (SHA-256 of the
   * file in lower-case hex; `crypto.subtle.digest` in a browser). It must equal the index's.
   */
  readonly hash: string;
}

export type ChunkFault = 'not-a-chunk' | 'wrong-category' | 'wrong-count' | 'wrong-hash';

export interface ChunkReadiness {
  /** True when every needed chunk is loaded and matches the index. */
  readonly ready: boolean;
  readonly needed: readonly CategoryEntry[];
  /** Needed categories with no loaded chunk. */
  readonly missing: readonly string[];
  /** Needed categories whose loaded chunk cannot be used. */
  readonly invalid: readonly { readonly category: string; readonly fault: ChunkFault }[];
}

export interface SelectInput {
  readonly index: BankIndex;
  readonly settings: MatchSettings;
  readonly chunks: readonly LoadedChunk[];
  /** Seeded random numbers in [0, 1). */
  readonly random: () => number;
  /**
   * Ids of questions recently seen on this device, oldest first (RZ-015). They are used only
   * when the rest of the pool has run out, the oldest first.
   */
  readonly recentlyUsed?: readonly string[];
  /** Defaults to `MATCH_TRANSFER_BUDGET_BYTES`. */
  readonly transferBudgetBytes?: number;
}

export type Selection =
  | {
      readonly ok: true;
      /** Exactly `settings.count` questions, in play order, none twice. */
      readonly questions: readonly Question[];
      /** Every picture the match shows, each once. Load them all before the first question. */
      readonly pictures: readonly BuiltPicture[];
      /** How many of the questions were on the recently-used list. */
      readonly reusedRecent: number;
      /** Chunk files plus pictures, uncompressed: an upper bound on what is transferred. */
      readonly transferBytes: number;
    }
  | { readonly ok: false; readonly reason: 'bad-settings'; readonly message: string }
  | { readonly ok: false; readonly reason: 'chunks-not-ready'; readonly chunks: ChunkReadiness }
  | {
      /** The chunk files alone are over the budget, before any question is chosen. */
      readonly ok: false;
      readonly reason: 'over-budget';
      readonly chunkBytes: number;
      readonly budgetBytes: number;
    }
  | {
      readonly ok: false;
      readonly reason: 'bank-too-small';
      readonly wanted: number;
      /** Questions that fit the settings and the transfer budget. */
      readonly available: number;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

function regionOf(settings: MatchSettings): RegionSetting {
  return settings.region ?? 'mixed';
}

/** Why the settings cannot be used with this bank, or null. */
export function settingsFault(index: BankIndex, settings: MatchSettings): string | null {
  if (!(MATCH_LENGTHS as readonly number[]).includes(settings.count)) {
    return `a match has ${MATCH_LENGTHS.join(', ')} questions, not ${String(settings.count)}`;
  }
  if (!oneOf(['easy', 'mixed', 'hard'], settings.difficulty)) {
    return 'difficulty must be easy, mixed or hard';
  }
  if (settings.categories !== 'mixed') {
    if (settings.categories.length === 0) return 'choose at least one category';
    const known = new Set(index.categories.map((category) => category.id));
    const unknown = settings.categories.filter((id) => !known.has(id));
    if (unknown.length > 0) return `the bank has no category ${unknown.join(', ')}`;
  }
  const region = regionOf(settings);
  if (typeof region === 'object') {
    const share = region.singaporeShare;
    if (!(share >= 0 && share <= 1)) return 'singaporeShare must be from 0 to 1';
  } else if (region !== 'mixed' && !oneOf(REGIONS, region)) {
    return 'region must be mixed, general, singapore or a singaporeShare';
  }
  return null;
}

/** The chunks a match with these settings reads, in index order. Unknown ids are skipped. */
export function chunksNeeded(index: BankIndex, settings: MatchSettings): CategoryEntry[] {
  if (settings.categories === 'mixed') return [...index.categories];
  const wanted = new Set(settings.categories);
  return index.categories.filter((category) => wanted.has(category.id));
}

function difficultiesOf(settings: MatchSettings): readonly Difficulty[] {
  return settings.difficulty === 'mixed' ? DIFFICULTIES : [settings.difficulty];
}

function regionsOf(settings: MatchSettings): readonly Region[] {
  const region = regionOf(settings);
  return typeof region === 'object' || region === 'mixed' ? REGIONS : [region];
}

/** Size of the chunk files a match with these settings loads. */
export function chunkBytesNeeded(index: BankIndex, settings: MatchSettings): number {
  return chunksNeeded(index, settings).reduce((sum, entry) => sum + entry.bytes, 0);
}

/**
 * How many questions a match with these settings can be sure of, from the index alone, so a
 * setup screen can refuse a match length before any chunk is fetched: if `poolSize` is at least
 * the length, `selectQuestions` will succeed whatever the seed.
 *
 * Every question without a picture counts. Picture questions count only as far as the transfer
 * budget is certain to hold them: the budget left after the chunks, divided by the largest
 * picture in those categories. (The selector may fit more when it happens on smaller ones.)
 * Recently used questions are counted: they are avoided, not excluded.
 */
export function poolSize(
  index: BankIndex,
  settings: MatchSettings,
  transferBudgetBytes: number = MATCH_TRANSFER_BUDGET_BYTES,
): number {
  const needed = chunksNeeded(index, settings);
  const left = transferBudgetBytes - needed.reduce((sum, entry) => sum + entry.bytes, 0);
  if (left < 0) return 0;
  let plain = 0;
  let pictured = 0;
  let largest = 0;
  for (const category of needed) {
    for (const picture of category.pictures) largest = Math.max(largest, picture.bytes);
    for (const difficulty of difficultiesOf(settings)) {
      for (const region of regionsOf(settings)) {
        const pictures = category.counts.picturesByDifficultyAndRegion[difficulty][region];
        pictured += pictures;
        plain += category.counts.byDifficultyAndRegion[difficulty][region] - pictures;
      }
    }
  }
  const sure = largest === 0 ? pictured : Math.min(pictured, Math.floor(left / largest));
  return plain + sure;
}

/** RZ-010/011: setup needs counts and byte bounds, never question texts. */
export function setupTable(index: BankIndex) {
  return {
    budgetBytes: MATCH_TRANSFER_BUDGET_BYTES,
    categories: index.categories.map(category => {
      const pictures = { easy: 0, medium: 0, hard: 0 };
      const plain = { easy: 0, medium: 0, hard: 0 };
      for (const difficulty of DIFFICULTIES) {
        for (const region of REGIONS) {
          pictures[difficulty] += category.counts.picturesByDifficultyAndRegion[difficulty][region];
          plain[difficulty] += category.counts.byDifficultyAndRegion[difficulty][region] -
            category.counts.picturesByDifficultyAndRegion[difficulty][region];
        }
      }
      return { id: category.id, title: category.title,
        region: category.counts.byRegion.singapore === category.counts.total ? 'singapore' : 'general',
        plain, pictures, bytes: category.bytes,
        largestPicture: category.pictures.reduce((largest, picture) => Math.max(largest, picture.bytes), 0) };
    }),
  };
}

/**
 * The form of a question that may leave the host's simulation: everything but the answer, and
 * of a picture only its file, alt text and credit (a source address usually names the subject).
 * Only this may be put in a public view or sent to a phone before the reveal.
 */
export function toPublicQuestion(question: Question): PublicQuestion {
  const { id, type, category, difficulty, region, prompt, options, picture } = question;
  const shown = { id, type, category, difficulty, region, prompt, options: [...options] };
  if (picture === undefined) return shown;
  return { ...shown, picture: { file: picture.file, alt: picture.alt, credit: picture.credit } };
}

function parseQuestion(value: unknown, category: string): Question | null {
  if (!isRecord(value)) return null;
  const { id, type, difficulty, region, prompt, options, correct, picture } = value;
  if (typeof id !== 'string' || typeof prompt !== 'string' || value.category !== category) {
    return null;
  }
  if (!oneOf(QUESTION_TYPES, type) || !oneOf(DIFFICULTIES, difficulty) || !oneOf(REGIONS, region)) {
    return null;
  }
  if (!Array.isArray(options) || options.length !== OPTION_COUNT[type]) return null;
  const texts: string[] = [];
  for (const option of options as unknown[]) {
    if (typeof option !== 'string') return null;
    texts.push(option);
  }
  if (typeof correct !== 'number' || !Number.isInteger(correct)) return null;
  if (correct < 0 || correct >= texts.length) return null;
  const base = { id, type, category, difficulty, region, prompt, options: texts, correct };
  if (type !== 'picture') return picture === undefined ? base : null;
  if (!isRecord(picture)) return null;
  const { file, alt, credit, licence, sourceUrl, bytes } = picture;
  if (
    typeof file !== 'string' ||
    typeof alt !== 'string' ||
    typeof credit !== 'string' ||
    typeof licence !== 'string' ||
    typeof sourceUrl !== 'string' ||
    typeof bytes !== 'number'
  ) {
    return null;
  }
  return { ...base, picture: { file, alt, credit, licence, sourceUrl, bytes } };
}

/** Checks fetched JSON is a chunk of this format. Returns it typed, or null. */
export function parseChunk(data: unknown): Chunk | null {
  if (!isRecord(data) || data.format !== BANK_FORMAT) return null;
  const { category, title, questions } = data;
  if (typeof category !== 'string' || typeof title !== 'string' || !Array.isArray(questions)) {
    return null;
  }
  const parsed: Question[] = [];
  for (const raw of questions as unknown[]) {
    const question = parseQuestion(raw, category);
    if (question === null) return null;
    parsed.push(question);
  }
  return { format: BANK_FORMAT, category, title, questions: parsed };
}

interface CheckedChunks {
  readonly readiness: ChunkReadiness;
  readonly chunks: readonly Chunk[];
}

function check(
  index: BankIndex,
  settings: MatchSettings,
  loaded: readonly LoadedChunk[],
): CheckedChunks {
  const needed = chunksNeeded(index, settings);
  const byCategory = new Map(loaded.map((chunk) => [chunk.category, chunk]));
  const missing: string[] = [];
  const invalid: { category: string; fault: ChunkFault }[] = [];
  const chunks: Chunk[] = [];
  for (const entry of needed) {
    const found = byCategory.get(entry.id);
    if (found === undefined) {
      missing.push(entry.id);
      continue;
    }
    const chunk = parseChunk(found.data);
    let fault: ChunkFault | null = null;
    if (chunk === null) fault = 'not-a-chunk';
    else if (chunk.category !== entry.id) fault = 'wrong-category';
    else if (chunk.questions.length !== entry.counts.total) fault = 'wrong-count';
    else if (found.hash !== entry.hash) fault = 'wrong-hash';
    if (fault !== null) invalid.push({ category: entry.id, fault });
    else if (chunk !== null) chunks.push(chunk);
  }
  const ready = missing.length === 0 && invalid.length === 0;
  return { readiness: { ready, needed, missing, invalid }, chunks };
}

/**
 * Reports, before the match starts, whether every chunk the settings need is loaded and is the
 * chunk the index describes (format, category, question count and hash). A match must not start
 * until `ready` is true.
 */
export function checkChunks(
  index: BankIndex,
  settings: MatchSettings,
  loaded: readonly LoadedChunk[],
): ChunkReadiness {
  return check(index, settings, loaded).readiness;
}

/** The pictures of a selection that are not yet loaded. Empty means ready. */
export function picturesMissing(
  pictures: readonly BuiltPicture[],
  loadedFiles: ReadonlySet<string>,
): string[] {
  return pictures.map((picture) => picture.file).filter((file) => !loadedFiles.has(file));
}

function shuffle(items: Question[], random: () => number): void {
  for (let last = items.length - 1; last > 0; last -= 1) {
    const roll = Math.floor(random() * (last + 1));
    const pick = roll >= 0 && roll <= last ? roll : 0;
    const a = items[last];
    const b = items[pick];
    if (a === undefined || b === undefined) continue;
    items[last] = b;
    items[pick] = a;
  }
}

/** Mixed difficulty: a third each; one left over goes to medium, two to easy and medium. */
export function difficultyQuota(count: number): Record<Difficulty, number> {
  const base = Math.floor(count / 3);
  const left = count - base * 3;
  return { easy: base + (left === 2 ? 1 : 0), medium: base + (left >= 1 ? 1 : 0), hard: base };
}

/**
 * Chooses the questions for one match.
 *
 * Order of preference (RZ-015): questions not on the recently-used list first, keeping to the
 * difficulty and region mix; then the rest of the fresh questions whatever the mix; only then
 * recently used questions, oldest first. A picture question that would take the match over the
 * transfer budget is passed over. If the pool cannot fill the match the result is
 * `bank-too-small` and no match is made: a match is always exactly 10, 30 or 50 (RZ-001). If
 * the chunk files alone are over the budget the result is `over-budget`.
 *
 * The questions returned hold their answers: keep them in the host's simulation and show
 * players `toPublicQuestion(question)` only.
 */
export function selectQuestions(input: SelectInput): Selection {
  const { index, settings, random } = input;
  const fault = settingsFault(index, settings);
  if (fault !== null) return { ok: false, reason: 'bad-settings', message: fault };
  const checked = check(index, settings, input.chunks);
  if (!checked.readiness.ready) {
    return { ok: false, reason: 'chunks-not-ready', chunks: checked.readiness };
  }

  const budget = input.transferBudgetBytes ?? MATCH_TRANSFER_BUDGET_BYTES;
  let transferBytes = checked.readiness.needed.reduce((sum, entry) => sum + entry.bytes, 0);
  if (transferBytes > budget) {
    return { ok: false, reason: 'over-budget', chunkBytes: transferBytes, budgetBytes: budget };
  }

  const difficulties = difficultiesOf(settings);
  const regions = regionsOf(settings);
  const byId = new Map<string, Question>();
  for (const chunk of checked.chunks) {
    for (const question of chunk.questions) {
      if (!difficulties.includes(question.difficulty) || !regions.includes(question.region)) {
        continue;
      }
      if (!byId.has(question.id)) byId.set(question.id, question);
    }
  }
  // A fixed starting order, so the result depends on the seed and not on how chunks arrived.
  const pool = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  shuffle(pool, random);

  const lastSeen = new Map<string, number>();
  (input.recentlyUsed ?? []).forEach((id, position) => lastSeen.set(id, position));
  const fresh = pool.filter((question) => !lastSeen.has(question.id));
  const recent = pool
    .filter((question) => lastSeen.has(question.id))
    .sort((a, b) => (lastSeen.get(a.id) ?? 0) - (lastSeen.get(b.id) ?? 0));

  const count = settings.count;
  const difficultyLimit = settings.difficulty === 'mixed' ? difficultyQuota(count) : null;
  const region = regionOf(settings);
  let regionLimit: Record<Region, number> | null = null;
  if (typeof region === 'object') {
    const singapore = Math.round(count * region.singaporeShare);
    regionLimit = { singapore, general: count - singapore };
  }

  const chosen: Question[] = [];
  const chosenIds = new Set<string>();
  const pictures = new Map<string, BuiltPicture>();
  const perDifficulty: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  const perRegion: Record<Region, number> = { general: 0, singapore: 0 };
  let reusedRecent = 0;

  const take = (candidates: readonly Question[], keepMix: boolean, isRecent: boolean): void => {
    for (const question of candidates) {
      if (chosen.length === count) return;
      if (chosenIds.has(question.id)) continue;
      if (keepMix) {
        if (
          difficultyLimit !== null &&
          perDifficulty[question.difficulty] >= difficultyLimit[question.difficulty]
        ) {
          continue;
        }
        if (regionLimit !== null && perRegion[question.region] >= regionLimit[question.region]) {
          continue;
        }
      }
      const picture = question.picture;
      if (picture !== undefined && !pictures.has(picture.file)) {
        if (transferBytes + picture.bytes > budget) continue;
        transferBytes += picture.bytes;
        pictures.set(picture.file, picture);
      }
      chosen.push(question);
      chosenIds.add(question.id);
      perDifficulty[question.difficulty] += 1;
      perRegion[question.region] += 1;
      if (isRecent) reusedRecent += 1;
    }
  };
  take(fresh, true, false);
  take(fresh, false, false);
  take(recent, false, true);

  if (chosen.length < count) {
    return { ok: false, reason: 'bank-too-small', wanted: count, available: chosen.length };
  }
  shuffle(chosen, random);
  return {
    ok: true,
    questions: chosen,
    pictures: [...pictures.values()],
    reusedRecent,
    transferBytes,
  };
}
