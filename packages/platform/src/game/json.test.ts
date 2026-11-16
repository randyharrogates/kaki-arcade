import { describe, expect, it } from 'vitest';
import { findSecret, firstDifference, jsonEqual, jsonProblem, jsonSize, utf8Length } from './kit';
import type { Secret } from './kit';
describe('jsonProblem', () => {
  it('passes plain JSON, including -0, null and empty things', () => {
    expect(jsonProblem({ a: [1, 'two', null, true, { b: {} }], c: -0, d: [] })).toBeNull();
    expect(jsonProblem(Object.create(null))).toBeNull();
  });
  it('names where JSON would lose or change something', () => {
    expect(jsonProblem({ a: { b: [1, undefined] } }, 'view')).toBe(
      'view.a.b[1] is undefined, which JSON cannot carry',
    );
    expect(jsonProblem({ score: Number.NaN }, 'view')).toBe(
      'view.score is NaN, which JSON cannot carry',
    );
    expect(jsonProblem({ t: Number.POSITIVE_INFINITY }, 'view')).toBe(
      'view.t is Infinity, which JSON cannot carry',
    );
    expect(jsonProblem({ big: 10n }, 'view')).toBe('view.big is a bigint, which JSON cannot carry');
    expect(jsonProblem({ go: () => 1 }, 'view')).toBe(
      'view.go is a function, which JSON cannot carry',
    );
    expect(jsonProblem({ m: new Map() }, 'view')).toBe(
      'view.m is [object Map], not a plain object or array',
    );
    expect(jsonProblem({ s: new Set() }, 'view')).toBe(
      'view.s is [object Set], not a plain object or array',
    );
    expect(jsonProblem({ t: new Float32Array(2) }, 'view')).toBe(
      'view.t is [object Float32Array], not a plain object or array',
    );
    expect(jsonProblem({ 'odd key': undefined }, 'view')).toBe(
      'view["odd key"] is undefined, which JSON cannot carry',
    );
    // eslint-disable-next-line no-sparse-arrays -- the hole is the point
    expect(jsonProblem([1, , 3], 'view')).toBe('view[1] is a hole in an array');
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(jsonProblem(loop, 'view')).toBe('view.self contains itself');
    class Card {
      rank = 'Q';
    }
    expect(jsonProblem({ card: new Card() }, 'view')).toBe(
      'view.card is [object Object], not a plain object or array',
    );
  });
  it('lets the same object appear twice when nothing contains itself', () => {
    const shared = { x: 1 };
    expect(jsonProblem({ a: shared, b: shared })).toBeNull();
  });
});
describe('sizes', () => {
  it('counts UTF-8 bytes', () => {
    expect(utf8Length('abc')).toBe(3);
    expect(utf8Length('é')).toBe(2);
    expect(utf8Length('நன்றி')).toBe(15);
    expect(utf8Length('🤷')).toBe(4);
    expect(utf8Length('€')).toBe(3);
    expect(jsonSize({ a: 'é' })).toBe(10);
    expect(jsonSize(undefined)).toBe(4);
  });
});
describe('jsonEqual and firstDifference', () => {
  it('ignores key order and respects everything else', () => {
    expect(jsonEqual({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
    expect(jsonEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(jsonEqual([1, 2], [2, 1])).toBe(false);
    expect(jsonEqual([], {})).toBe(false);
    expect(jsonEqual(null, {})).toBe(false);
    expect(jsonEqual(1, '1')).toBe(false);
  });
  it('says where two views first differ', () => {
    expect(firstDifference({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe('view.a[1].b');
    expect(firstDifference({ a: [1] }, { a: [1, 2] })).toBe('view.a (length 1 against 2)');
    expect(firstDifference({ a: 1 }, { a: 1, c: 2 })).toBe('view.c');
    expect(firstDifference({ a: 1 }, { a: 1 })).toBeNull();
    expect(firstDifference(1, [1])).toBe('view');
  });
});
describe('findSecret', () => {
  const view = {
    phase: 'pick',
    players: [
      { id: 'p1', seat: 5, note: 'holds QS and 7H' },
      { id: 'p2', seat: 2, hand: ['QS', '7H'] },
    ],
    byCard: { KD: 'p2' },
    12: true,
  };
  const value = (
    wanted: Secret extends infer S
      ? S extends {
          value: infer V;
        }
        ? V
        : never
      : never,
    owner: string | null = null,
  ): Secret => ({ owner, label: 'x', value: wanted });
  it('finds a string as a whole value, inside a longer string, and as a key', () => {
    expect(findSecret(value('7H'), view)).toBe('view.players[0].note');
    expect(findSecret(value('KD'), view)).toBe('view.byCard.KD (the key)');
    expect(findSecret(value('AS'), view)).toBeNull();
  });
  it('matches a one-character string only as a whole value', () => {
    expect(findSecret(value('Q'), view)).toBeNull();
    expect(findSecret(value('Q'), { rank: 'Q' })).toBe('view.rank');
  });
  it('finds numbers exactly, as values and as keys, and so also finds innocent ones', () => {
    expect(findSecret(value(5), view)).toBe('view.players[0].seat');
    expect(findSecret(value(12), view)).toBe('view["12"] (the key)');
    expect(findSecret(value(6), view)).toBeNull();
  });
  it('compares arrays and objects whole', () => {
    expect(findSecret(value(['QS', '7H']), view)).toBe('view.players[1].hand');
    expect(findSecret(value(['7H', 'QS']), view)).toBeNull();
    expect(findSecret(value({ id: 'p2', seat: 2, hand: ['QS', '7H'] }), view)).toBe(
      'view.players[1]',
    );
    expect(findSecret(value(true), view)).toBe('view["12"]');
    expect(findSecret(value(null), { a: null })).toBe('view.a');
  });
  it('gives a predicate every value with its path', () => {
    const seen: string[] = [];
    const secret: Secret = {
      owner: 'p1',
      label: 'seat',
      value: 2,
      match: (found, path) => (seen.push(path), path.endsWith('seat') && found === 2),
    };
    expect(findSecret(secret, view, 'publicView')).toBe('publicView.players[1].seat');
    expect(seen).toContain('publicView');
    expect(seen).toContain('publicView.players[0].id');
  });
});
