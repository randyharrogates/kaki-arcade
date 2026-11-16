import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Fetcher } from './otdb-fetch';
import { OtdbUnavailable, fetchAll, readCache } from './otdb-fetch';

const temporary: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rabakz-otdb-'));
  temporary.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

interface Server {
  readonly fetcher: Fetcher;
  /** Every address asked for, in order. */
  readonly asked: string[];
  readonly waits: number[];
}

/**
 * A stand-in for the API: categories 9 (`first` questions) and 10 (`second` questions), a
 * session token that never repeats a question, and the real response codes. `faults` are
 * answers given instead of the real one, by request number.
 */
function server(first: number, second: number, faults: Record<number, unknown> = {}): Server {
  const sizes: Record<string, number> = { '9': first, '10': second };
  const served = new Map<string, number>();
  const asked: string[] = [];
  const waits: number[] = [];
  let tokens = 0;
  const get = (url: string): Promise<unknown> => {
    asked.push(url);
    const fault = faults[asked.length];
    if (fault instanceof Error) return Promise.reject(fault);
    if (fault !== undefined) return Promise.resolve(fault);
    const address = new URL(url);
    if (address.pathname === '/api_category.php') {
      return Promise.resolve({
        trivia_categories: [
          { id: 10, name: 'Entertainment: Books' },
          { id: 9, name: 'General Knowledge' },
        ],
      });
    }
    if (address.pathname === '/api_count_global.php') {
      return Promise.resolve({
        categories: {
          '9': { total_num_of_verified_questions: first },
          '10': { total_num_of_verified_questions: second },
        },
      });
    }
    if (address.pathname === '/api_token.php') {
      tokens += 1;
      return Promise.resolve({ response_code: 0, token: `token-${String(tokens)}` });
    }
    const category = address.searchParams.get('category') ?? '';
    const token = address.searchParams.get('token') ?? '';
    const amount = Number(address.searchParams.get('amount'));
    if (token !== `token-${String(tokens)}`) return Promise.resolve({ response_code: 3, results: [] });
    const key = `${token} ${category}`;
    const from = served.get(key) ?? 0;
    const left = (sizes[category] ?? 0) - from;
    if (left < amount) return Promise.resolve({ response_code: 4, results: [] });
    served.set(key, from + amount);
    return Promise.resolve({
      response_code: 0,
      results: Array.from({ length: amount }, (_, at) => ({
        type: 'multiple',
        difficulty: 'easy',
        category: 'x',
        question: encodeURIComponent(`Question ${category}/${String(from + at)} “é”?`),
        correct_answer: 'Yes%20%26%20no',
        incorrect_answers: ['A', 'B', 'C'],
      })),
    });
  };
  const fetcher: Fetcher = {
    get,
    log: () => undefined,
    wait: (ms) => {
      waits.push(ms);
      return Promise.resolve();
    },
  };
  return { fetcher, asked, waits };
}

describe('the Open Trivia Database download', () => {
  it('reads every category to its end with one session token, and decodes the text', async () => {
    const cache = tempDir();
    const { fetcher, asked } = server(120, 7);
    await fetchAll(cache, fetcher);
    const contents = readCache(cache);
    expect(contents.complete).toBe(true);
    expect(contents.undecodable).toBe(0);
    expect(contents.questions).toHaveLength(127);
    expect(new Set(contents.questions.map((question) => question.question)).size).toBe(127);
    expect(contents.questions[0]).toEqual({
      categoryId: 9,
      type: 'multiple',
      difficulty: 'easy',
      question: 'Question 9/0 “é”?',
      correct: 'Yes & no',
      incorrect: ['A', 'B', 'C'],
    });
    expect(asked.filter((url) => url.includes('api_token.php'))).toHaveLength(1);
    const questions = asked.filter((url) => url.includes('/api.php'));
    expect(questions.every((url) => url.includes('encode=url3986') && url.includes('type=multiple') && url.includes('token=token-1'))).toBe(true);
    expect(questions.every((url) => Number(new URL(url).searchParams.get('amount')) <= 50)).toBe(true);
  });

  it('asks for nothing more once the cache is complete', async () => {
    const cache = tempDir();
    await fetchAll(cache, server(60, 7).fetcher);
    const again = server(60, 7);
    await fetchAll(cache, again.fetcher);
    expect(again.asked).toEqual([]);
  });

  it('stops when the API cannot be reached, keeps what it has, and carries on next time', async () => {
    const cache = tempDir();
    // Requests 1 to 3 are the categories, the counts and the token; 4 and 5 are pages.
    const broken = server(120, 7, { 6: new OtdbUnavailable('the network is down') });
    await expect(fetchAll(cache, broken.fetcher)).rejects.toThrow(OtdbUnavailable);
    expect(readCache(cache).complete).toBe(false);
    expect(readCache(cache).questions).toHaveLength(100);

    // The same server, back up: the session token still stands, so only the rest is asked for.
    const resumed: Fetcher = { ...broken.fetcher };
    const before = broken.asked.length;
    await fetchAll(cache, resumed);
    expect(broken.asked.slice(before).some((url) => url.includes('api_token.php'))).toBe(false);
    const contents = readCache(cache);
    expect(contents.complete).toBe(true);
    expect(new Set(contents.questions.map((question) => question.question)).size).toBe(127);
  });

  it('starts a half-read category again when its session token has expired', async () => {
    const cache = tempDir();
    const broken = server(120, 7, { 6: new OtdbUnavailable('the network is down') });
    await expect(fetchAll(cache, broken.fetcher)).rejects.toThrow(OtdbUnavailable);
    // A new server knows nothing of the old token: code 3, then a new token.
    const fresh = server(120, 7);
    await fetchAll(cache, fresh.fetcher);
    const contents = readCache(cache);
    expect(contents.complete).toBe(true);
    expect(contents.questions).toHaveLength(127);
    expect(new Set(contents.questions.map((question) => question.question)).size).toBe(127);
    expect(readdirSync(join(cache, 'pages')).length).toBeGreaterThanOrEqual(4);
  });

  it('waits and asks again on "rate limit" (code 5), and gives up if it never ends', async () => {
    const cache = tempDir();
    const limited = server(20, 7, { 4: { response_code: 5, results: [] } });
    await fetchAll(cache, limited.fetcher);
    expect(limited.waits).toEqual([5500]);
    expect(readCache(cache).questions).toHaveLength(27);

    const always: Record<number, unknown> = {};
    for (let at = 4; at < 40; at += 1) always[at] = { response_code: 5, results: [] };
    await expect(fetchAll(tempDir(), server(20, 7, always).fetcher)).rejects.toThrow(/rate limit/);
  });

  it('stops on a bad-parameter answer (code 2) and on an answer that is not the API', async () => {
    await expect(
      fetchAll(tempDir(), server(20, 7, { 4: { response_code: 2, results: [] } }).fetcher),
    ).rejects.toThrow(/code 2/);
    await expect(fetchAll(tempDir(), server(20, 7, { 1: '<html>' }).fetcher)).rejects.toThrow(
      OtdbUnavailable,
    );
  });

  it('says so when there is no download to read', () => {
    expect(() => readCache(tempDir())).toThrow(OtdbUnavailable);
  });
});
