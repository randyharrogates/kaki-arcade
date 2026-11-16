// The network half of the Open Trivia Database import (RZ-021): downloads every verified
// question, category by category, into a local cache folder, and reads the cache back.
//
// - One request every 5.5 seconds (the API allows one per 5 seconds per address).
// - Multiple-choice questions only (`type=multiple`): Rabakz has no true-or-false (D-049).
// - A session token, so no question is returned twice.
// - `encode=url3986`, so text arrives percent-encoded and is decoded here, not as HTML.
// - Resumable: every page is written to the cache as it arrives, and a later run carries on
//   from the pages already there. A category is refetched from its start only when the
//   session token it was being read with has expired.
// - Sends nothing but a generic User-Agent.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OtdbCategory, OtdbRawQuestion } from './otdb-map';

export const API = 'https://opentdb.com';
const USER_AGENT = 'trivia-import/1.0';
const REQUEST_GAP_MS = 5500;
const PAGE = 50;
const TIMEOUT_MS = 30_000;
const NETWORK_TRIES = 4;
const RATE_LIMIT_TRIES = 6;

/** The API's response codes. */
const CODE = { ok: 0, noResults: 1, badParameter: 2, noToken: 3, tokenEmpty: 4, rateLimit: 5 };

/** The API cannot be reached, or answered in a way the import does not understand. */
export class OtdbUnavailable extends Error {}

interface State {
  token: string | null;
  /** Verified questions the API says each category has. */
  expected: Record<string, number>;
  /** Categories read to their end. */
  done: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 1)}\n`);
}

const pagesDir = (cache: string): string => join(cache, 'pages');
const pageName = (category: number, page: number): string =>
  `${String(category).padStart(3, '0')}-${String(page).padStart(3, '0')}.json`;

function pagesOf(cache: string, category: number): string[] {
  const prefix = `${String(category).padStart(3, '0')}-`;
  if (!existsSync(pagesDir(cache))) return [];
  return readdirSync(pagesDir(cache))
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .sort();
}

function resultsOf(body: unknown): unknown[] {
  return isRecord(body) && Array.isArray(body.results) ? (body.results as unknown[]) : [];
}

function countCached(cache: string, category: number): number {
  return pagesOf(cache, category).reduce(
    (sum, name) => sum + resultsOf(readJson(join(pagesDir(cache), name))).length,
    0,
  );
}

/** Percent-decodes one field. Null when it is not a string or not valid percent-encoding. */
function decode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export interface Fetcher {
  /** Fetches one address and returns the parsed JSON body. */
  readonly get: (url: string) => Promise<unknown>;
  readonly log: (line: string) => void;
  /** Waits before asking again after the API says "rate limit". */
  readonly wait: (ms: number) => Promise<void>;
}

/** A polite fetcher: spaced requests, a timeout, retries on a network fault or HTTP 429. */
export function politeFetcher(log: (line: string) => void): Fetcher {
  let last = 0;
  const get = async (url: string): Promise<unknown> => {
    let fault = 'no attempt made';
    for (let attempt = 1; attempt <= NETWORK_TRIES; attempt += 1) {
      const wait = last + REQUEST_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.status === 429) {
          fault = 'HTTP 429 (too many requests)';
          log(`The API asked us to slow down (HTTP 429); waiting ${String((REQUEST_GAP_MS * attempt) / 1000)} s.`);
          await sleep(REQUEST_GAP_MS * attempt);
          continue;
        }
        if (!response.ok) {
          fault = `HTTP ${String(response.status)}`;
          continue;
        }
        const body: unknown = await response.json();
        return body;
      } catch (error) {
        fault = error instanceof Error ? error.message : String(error);
      }
    }
    throw new OtdbUnavailable(`${url.split('?')[0] ?? url} could not be read: ${fault}`);
  };
  return { get, log, wait: sleep };
}

async function requestToken(fetcher: Fetcher): Promise<string> {
  const body = await fetcher.get(`${API}/api_token.php?command=request`);
  if (isRecord(body) && body.response_code === CODE.ok && typeof body.token === 'string') {
    return body.token;
  }
  throw new OtdbUnavailable('the API did not give a session token');
}

/**
 * Downloads every verified question into `cache`, carrying on from what is already there.
 * Throws `OtdbUnavailable` when the API cannot be reached; the cache keeps what was read.
 */
export async function fetchAll(cache: string, fetcher: Fetcher): Promise<void> {
  mkdirSync(pagesDir(cache), { recursive: true });
  const statePath = join(cache, 'state.json');
  const state: State = existsSync(statePath)
    ? (readJson(statePath) as State)
    : { token: null, expected: {}, done: [] };
  const save = (): void => {
    writeJson(statePath, state);
  };

  const categoriesPath = join(cache, 'categories.json');
  if (!existsSync(categoriesPath)) {
    const body = await fetcher.get(`${API}/api_category.php`);
    if (!isRecord(body) || !Array.isArray(body.trivia_categories)) {
      throw new OtdbUnavailable('the API did not list its categories');
    }
    writeJson(categoriesPath, body);
  }
  const categories = readCategories(cache);

  if (Object.keys(state.expected).length === 0) {
    const body = await fetcher.get(`${API}/api_count_global.php`);
    if (!isRecord(body) || !isRecord(body.categories)) {
      throw new OtdbUnavailable('the API did not give its question counts');
    }
    for (const [id, counts] of Object.entries(body.categories)) {
      if (isRecord(counts) && typeof counts.total_num_of_verified_questions === 'number') {
        state.expected[id] = counts.total_num_of_verified_questions;
      }
    }
    save();
  }

  /** A new token cannot carry on a half-read category: its pages are dropped. */
  const renewToken = async (): Promise<string> => {
    for (const category of categories) {
      if (state.done.includes(String(category.id))) continue;
      for (const name of pagesOf(cache, category.id)) rmSync(join(pagesDir(cache), name));
    }
    state.token = await requestToken(fetcher);
    save();
    return state.token;
  };

  let token = state.token ?? (await renewToken());
  for (const category of categories) {
    const key = String(category.id);
    if (state.done.includes(key)) continue;
    const expected = state.expected[key] ?? PAGE;
    let have = countCached(cache, category.id);
    let amount = Math.min(PAGE, Math.max(1, expected - have));
    let limited = 0;
    for (;;) {
      const url = `${API}/api.php?amount=${String(amount)}&category=${key}&type=multiple&encode=url3986&token=${token}`;
      const body = await fetcher.get(url);
      const code = isRecord(body) ? body.response_code : undefined;
      if (code === CODE.ok) {
        const results = resultsOf(body);
        if (results.length === 0) break;
        writeJson(join(pagesDir(cache), pageName(category.id, pagesOf(cache, category.id).length)), body);
        have += results.length;
        limited = 0;
        fetcher.log(`${category.name}: ${String(have)} of ${String(expected)}`);
        amount = Math.min(PAGE, Math.max(1, expected - have));
        // The count can lag behind the data: keep asking, one at a time, until the API says
        // the session has seen everything.
        continue;
      }
      if (code === CODE.noResults || code === CODE.tokenEmpty) {
        // Fewer are left than were asked for.
        if (amount === 1) break;
        amount = Math.max(1, Math.floor(amount / 2));
        continue;
      }
      if (code === CODE.noToken) {
        fetcher.log('The session token expired; half-read categories start again.');
        token = await renewToken();
        have = 0;
        amount = Math.min(PAGE, expected);
        continue;
      }
      if (code === CODE.rateLimit) {
        limited += 1;
        if (limited > RATE_LIMIT_TRIES) {
          throw new OtdbUnavailable('the API kept answering "rate limit" (code 5)');
        }
        await fetcher.wait(REQUEST_GAP_MS * limited);
        continue;
      }
      throw new OtdbUnavailable(
        `the API answered with code ${String(code)} for category ${key} (2 means a bad parameter)`,
      );
    }
    state.done.push(key);
    save();
  }
}

export function readCategories(cache: string): OtdbCategory[] {
  const body = readJson(join(cache, 'categories.json'));
  const list = isRecord(body) && Array.isArray(body.trivia_categories) ? body.trivia_categories : [];
  const categories: OtdbCategory[] = [];
  for (const item of list as unknown[]) {
    if (isRecord(item) && typeof item.id === 'number' && typeof item.name === 'string') {
      categories.push({ id: item.id, name: item.name });
    }
  }
  return categories.sort((a, b) => a.id - b.id);
}

export interface CacheContents {
  readonly categories: readonly OtdbCategory[];
  /** Every cached question, percent-decoded, in category then page order. */
  readonly questions: readonly OtdbRawQuestion[];
  /** Records that were not a question or could not be decoded. */
  readonly undecodable: number;
  /** True when every category was read to its end. */
  readonly complete: boolean;
}

/** Reads the cache. Throws when there is none. */
export function readCache(cache: string): CacheContents {
  if (!existsSync(join(cache, 'categories.json'))) {
    throw new OtdbUnavailable(`there is no download in ${cache}; run the import without --offline`);
  }
  const categories = readCategories(cache);
  const statePath = join(cache, 'state.json');
  const state = existsSync(statePath) ? (readJson(statePath) as State) : null;
  const questions: OtdbRawQuestion[] = [];
  let undecodable = 0;
  for (const category of categories) {
    for (const name of pagesOf(cache, category.id)) {
      for (const item of resultsOf(readJson(join(pagesDir(cache), name)))) {
        const record = isRecord(item) ? item : {};
        const type = decode(record.type);
        const difficulty = decode(record.difficulty);
        const question = decode(record.question);
        const correct = decode(record.correct_answer);
        const incorrect = Array.isArray(record.incorrect_answers)
          ? (record.incorrect_answers as unknown[]).map(decode)
          : [null];
        if (
          type === null ||
          difficulty === null ||
          question === null ||
          correct === null ||
          incorrect.includes(null)
        ) {
          undecodable += 1;
          continue;
        }
        questions.push({
          categoryId: category.id,
          type,
          difficulty,
          question,
          correct,
          incorrect: incorrect.filter((text) => text !== null),
        });
      }
    }
  }
  const complete =
    state !== null && categories.every((category) => state.done.includes(String(category.id)));
  return { categories, questions, undecodable, complete };
}
