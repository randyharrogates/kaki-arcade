import { describe, expect, it } from 'vitest';

import {
  cloneRng,
  createRng,
  forkRng,
  nextChance,
  nextFloat,
  nextFloatBetween,
  nextInt,
  nextU32,
  pick,
  shuffle,
  shuffled,
  splitRng,
} from './rng';
import type { RngState } from './rng';

function take(rng: RngState, count: number): number[] {
  return Array.from({ length: count }, () => nextU32(rng));
}

describe('known answers (these numbers must never change)', () => {
  // If one of these fails, the generator's output has changed: every game's shuffles change
  // and every recorded replay breaks. Do not update the numbers; undo the change.
  it.each([
    [0, { a: 916968965, b: 977073674, c: 299604947, d: 13 }, [1894042652, 3671745258, 3865537132, 2029266383, 2438533549]],
    [1, { a: 4067496034, b: 624776685, c: 3769837062, d: 13 }, [397305436, 192684427, 2199769836, 1558239147, 2452969025]],
    [42, { a: 1751682489, b: 2979890817, c: 4072938909, d: 13 }, [436606023, 984240853, 3297332009, 2954790773, 740334924]],
    [4294967296, { a: 3899716576, b: 3519809449, c: 695642421, d: 13 }, [3124558742, 1188091029, 1560601846, 506788919, 1908543702]],
    [9007199254740991, { a: 1525035950, b: 1996949443, c: 1068765146, d: 13 }, [3521985406, 3029406456, 1948837619, 3483776309, 2163224952]],
    ['kaki', { a: 2944121314, b: 2386340687, c: 2464481982, d: 13 }, [1035494718, 3095973334, 1811476223, 3640105300, 2014327057]],
    ['', { a: 1785348402, b: 4179946869, c: 761449697, d: 13 }, [1670327988, 2446439162, 2509292276, 2370049273, 2602555336]],
  ] as const)('seed %j', (seed, state, first) => {
    const rng = createRng(seed);
    expect(rng).toEqual(state);
    expect(take(rng, 5)).toEqual(first);
  });

  it('helpers drawn in a fixed order from seed 2026', () => {
    const rng = createRng(2026);
    expect([nextFloat(rng), nextFloat(rng), nextFloat(rng)]).toEqual([
      0.5529852616600692, 0.28898951248265803, 0.5078458804637194,
    ]);
    expect(Array.from({ length: 12 }, () => nextInt(rng, 1, 6))).toEqual([2, 5, 3, 1, 6, 4, 5, 1, 3, 4, 1, 3]);
    expect(shuffled(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([9, 4, 5, 6, 1, 8, 3, 0, 7, 2]);
    expect(pick(rng, ['a', 'b', 'c', 'd'])).toBe('c');
    expect(rng).toEqual({ a: 80567516, b: 706152998, c: 3474798288, d: 38 });
  });

  it('forks from seed 7', () => {
    const root = createRng(7);
    expect(take(forkRng(root, 'deck'), 3)).toEqual([1437119476, 3777906724, 1774150306]);
    expect(take(forkRng(root, 'orders'), 3)).toEqual([672991020, 2747687649, 3878843723]);
    expect(take(forkRng(root, 3), 3)).toEqual([308725153, 1737499970, 1831180575]);
    expect(take(forkRng(root, '3'), 3)).toEqual([282485718, 3614755917, 437885339]);
  });
});

describe('the generator', () => {
  it('matches sfc32 written out independently with big integers', () => {
    const rng = createRng(42);
    const mask = 0xffffffffn;
    let a = BigInt(rng.a);
    let b = BigInt(rng.b);
    let c = BigInt(rng.c);
    let d = BigInt(rng.d);
    for (let i = 0; i < 2000; i += 1) {
      const t = (a + b + d) & mask;
      d = (d + 1n) & mask;
      a = b ^ (b >> 9n);
      b = (c + (c << 3n)) & mask;
      c = ((((c << 21n) | (c >> 11n)) & mask) + t) & mask;
      expect(nextU32(rng)).toBe(Number(t));
    }
  });

  it('keeps its state as four unsigned 32-bit integers that survive JSON', () => {
    const rng = createRng(123);
    for (let i = 0; i < 5000; i += 1) {
      nextU32(rng);
      for (const word of [rng.a, rng.b, rng.c, rng.d]) {
        expect(Number.isInteger(word) && word >= 0 && word <= 0xffffffff).toBe(true);
      }
    }
    const restored = JSON.parse(JSON.stringify(rng)) as RngState;
    expect(take(restored, 50)).toEqual(take(rng, 50));
  });

  it('gives the same stream for the same seed and a different one for a different seed', () => {
    expect(take(createRng(99), 100)).toEqual(take(createRng(99), 100));
    expect(take(createRng(99), 100)).not.toEqual(take(createRng(100), 100));
    expect(take(createRng('a'), 8)).not.toEqual(take(createRng('b'), 8));
  });

  it('uses the high bits of a seed above 2^32', () => {
    expect(take(createRng(5), 4)).not.toEqual(take(createRng(5 + 4294967296), 4));
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])('refuses the seed %s', (seed) => {
    expect(() => createRng(seed)).toThrow(RangeError);
  });

  it('throws when drawn from inside a frozen state, and cloneRng is the way round', () => {
    const state = Object.freeze({ tick: 0, rng: Object.freeze(createRng(5)) });
    expect(() => nextU32(state.rng)).toThrow(TypeError);
    expect(() => nextInt(state.rng, 1, 6)).toThrow(TypeError);
    expect(() => shuffle(state.rng, [1, 2, 3])).toThrow(TypeError);
    expect(() => splitRng(state.rng, 'deck')).toThrow(TypeError);
    const before = { ...state.rng };
    const rng = cloneRng(state.rng);
    expect(nextInt(rng, 1, 6)).toBe(nextInt(createRng(5), 1, 6));
    expect(state.rng).toEqual(before);
    // forkRng does not draw from the parent, so it works on a frozen one.
    expect(take(forkRng(state.rng, 'deck'), 3)).toEqual(take(forkRng(createRng(5), 'deck'), 3));
  });

  it('clones independently', () => {
    const rng = createRng(5);
    const copy = cloneRng(rng);
    expect(copy).toEqual(rng);
    expect(copy).not.toBe(rng);
    nextU32(copy);
    expect(copy).not.toEqual(rng);
  });
});

describe('splitRng', () => {
  it('known answers from seed 7 (these numbers must never change)', () => {
    const root = createRng(7);
    expect(take(splitRng(root, 'deck'), 3)).toEqual([4086612520, 1735949963, 954296291]);
    expect(take(splitRng(root, 'deck'), 3)).toEqual([3130797847, 2018667297, 2047419637]);
    expect(take(splitRng(root, 3), 3)).toEqual([2304111308, 3203498302, 140194483]);
    expect(take(splitRng(root), 3)).toEqual([1968482465, 2441598572, 3381704998]);
    expect(root).toEqual({ a: 423760089, b: 1662231894, c: 2344714173, d: 21 });
  });

  it('advances the parent, so the same label gives a new stream each time', () => {
    const rng = createRng(11);
    const before = cloneRng(rng);
    const round1 = take(splitRng(rng, 'deck'), 10);
    expect(rng).not.toEqual(before);
    const round2 = take(splitRng(rng, 'deck'), 10);
    const round3 = take(splitRng(rng, 'deck'), 10);
    expect(round2).not.toEqual(round1);
    expect(round3).not.toEqual(round2);
    expect(round3).not.toEqual(round1);
  });

  it('is repeatable, takes exactly two draws from the parent, and separates labels', () => {
    const one = createRng(11);
    const two = createRng(11);
    expect(take(splitRng(one, 'deck'), 10)).toEqual(take(splitRng(two, 'deck'), 10));
    expect(one).toEqual(two);
    const drawn = createRng(11);
    nextU32(drawn);
    nextU32(drawn);
    expect(one).toEqual(drawn);
    expect(take(splitRng(createRng(11), 'deck'), 10)).not.toEqual(take(splitRng(createRng(11), 'orders'), 10));
    // The child is its own stream, not a copy of the parent's.
    const parent = createRng(11);
    const child = splitRng(parent, 'deck');
    expect(take(child, 10)).not.toEqual(take(parent, 10));
  });

  it('where forkRng would deal the same deck every round, splitRng deals a new one', () => {
    const cards = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const rng = createRng(2026);
    const forked = [1, 2, 3].map(() => shuffled(forkRng(rng, 'deck'), cards).join());
    expect(new Set(forked).size).toBe(1);
    const split = [1, 2, 3].map(() => shuffled(splitRng(rng, 'deck'), cards).join());
    expect(new Set(split).size).toBe(3);
  });
});

describe('forkRng', () => {
  it('does not advance the parent and does not depend on fork order', () => {
    const root = createRng(11);
    const before = cloneRng(root);
    const deckFirst = take(forkRng(root, 'deck'), 10);
    forkRng(root, 'orders');
    forkRng(root, 'spawns');
    expect(root).toEqual(before);
    expect(take(forkRng(root, 'deck'), 10)).toEqual(deckFirst);
  });

  it('gives different streams for different labels, parents and parent positions', () => {
    const root = createRng(11);
    const deck = take(forkRng(root, 'deck'), 10);
    expect(take(forkRng(root, 'deck2'), 10)).not.toEqual(deck);
    expect(take(forkRng(createRng(12), 'deck'), 10)).not.toEqual(deck);
    expect(deck).not.toEqual(take(cloneRng(root), 10));
    nextU32(root);
    expect(take(forkRng(root, 'deck'), 10)).not.toEqual(deck);
  });
});

describe('helpers', () => {
  it('nextFloat stays in 0 (inclusive) to 1 (exclusive) and averages one half', () => {
    const rng = createRng(1);
    let sum = 0;
    for (let i = 0; i < 100_000; i += 1) {
      const value = nextFloat(rng);
      expect(value >= 0 && value < 1).toBe(true);
      sum += value;
    }
    expect(sum / 100_000).toBeGreaterThan(0.49);
    expect(sum / 100_000).toBeLessThan(0.51);
  });

  it('nextFloatBetween stays in range', () => {
    const rng = createRng(2);
    for (let i = 0; i < 1000; i += 1) {
      const value = nextFloatBetween(rng, -3, 7);
      expect(value >= -3 && value < 7).toBe(true);
    }
  });

  it('nextInt includes both ends and is even', () => {
    const rng = createRng(3);
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 60_000; i += 1) {
      const value = nextInt(rng, 1, 6);
      expect(Number.isInteger(value) && value >= 1 && value <= 6).toBe(true);
      counts[value - 1] = (counts[value - 1] ?? 0) + 1;
    }
    // Fixed seed, so this is not a matter of luck: each face is within 5% of 10,000.
    for (const count of counts) {
      expect(count).toBeGreaterThan(9500);
      expect(count).toBeLessThan(10_500);
    }
  });

  it('nextInt handles one value, negatives and the full 32-bit span', () => {
    const rng = createRng(4);
    const before = cloneRng(rng);
    expect(nextInt(rng, 5, 5)).toBe(5);
    expect(rng).toEqual(before);
    for (let i = 0; i < 1000; i += 1) {
      const value = nextInt(rng, -2, 2);
      expect(value >= -2 && value <= 2).toBe(true);
    }
    const wide = nextInt(rng, 0, 4294967295);
    expect(wide >= 0 && wide <= 4294967295).toBe(true);
  });

  it('nextInt refuses bad ranges', () => {
    const rng = createRng(4);
    expect(() => nextInt(rng, 2, 1)).toThrow(RangeError);
    expect(() => nextInt(rng, 0.5, 3)).toThrow(RangeError);
    expect(() => nextInt(rng, 0, 4294967296)).toThrow(RangeError);
  });

  it('nextChance is never at 0, always at 1, and about right in between', () => {
    const rng = createRng(6);
    let hits = 0;
    for (let i = 0; i < 20_000; i += 1) {
      expect(nextChance(rng, 0)).toBe(false);
      expect(nextChance(rng, 1)).toBe(true);
      if (nextChance(rng, 0.25)) hits += 1;
    }
    expect(hits).toBeGreaterThan(4700);
    expect(hits).toBeLessThan(5300);
  });

  it('pick returns items from the list, all of them eventually, and refuses an empty list', () => {
    const rng = createRng(8);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(pick(rng, ['a', 'b', 'c']));
    expect([...seen].sort()).toEqual(['a', 'b', 'c']);
    expect(() => pick(rng, [])).toThrow(RangeError);
  });

  it('shuffle keeps every item, works in place, and reaches every order of three evenly', () => {
    const rng = createRng(9);
    const deck = Array.from({ length: 52 }, (_, i) => i);
    const result = shuffle(rng, deck);
    expect(result).toBe(deck);
    expect([...deck].sort((x, y) => x - y)).toEqual(Array.from({ length: 52 }, (_, i) => i));
    expect(deck).not.toEqual(Array.from({ length: 52 }, (_, i) => i));

    const orders = new Map<string, number>();
    for (let i = 0; i < 60_000; i += 1) {
      const key = shuffled(rng, [1, 2, 3]).join('');
      orders.set(key, (orders.get(key) ?? 0) + 1);
    }
    expect(orders.size).toBe(6);
    for (const count of orders.values()) {
      expect(count).toBeGreaterThan(9500);
      expect(count).toBeLessThan(10_500);
    }
  });

  it('shuffled leaves the original alone', () => {
    const rng = createRng(10);
    const original = Object.freeze([1, 2, 3, 4, 5]);
    const copy = shuffled(rng, original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect([...copy].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
