// Seeded random numbers for the simulation (PLAT-032). The generator is sfc32 (Chris
// Doty-Humphrey's "small fast counting" generator): four 32-bit words of state, a period of at
// least 2^32 and about 2^127 on average, and only integer operations that every JavaScript
// engine computes identically.
//
// The state is plain data, so it lives inside a game's state and is cloned, hashed and saved
// with it. Every function that draws a number ADVANCES THE STATE IN PLACE. A step that must
// not touch its input state (the recommended contract) takes `cloneRng(state.rng)` first and
// stores the clone in the new state. Drawing from a generator inside a FROZEN state throws a
// TypeError ("Cannot assign to read only property"): that is the freeze doing its job, and
// the fix is the same `cloneRng`.
//
// The exact output for a seed is pinned by known-answer tests. Changing anything here changes
// every game's shuffles and breaks every recorded replay.

import { absorb, absorbString, createDigest, finish, fmix32 } from './hash';

/** The whole generator. Four unsigned 32-bit integers. Serialisable as JSON. */
export interface RngState {
  a: number;
  b: number;
  c: number;
  d: number;
}

const TWO_POW_32 = 4294967296;
const WARM_UP_ROUNDS = 12;

function seedWords(lo: number, hi: number): RngState {
  // Three well-mixed words from the 64 seed bits; the counter starts at 1.
  const a = fmix32(lo ^ 0x9e3779b9);
  const b = fmix32((hi + 0x7f4a7c15) ^ a);
  const c = fmix32((lo + 0x85ebca6b) ^ Math.imul(b, 0x27d4eb2f));
  const rng: RngState = { a, b, c, d: 1 };
  for (let i = 0; i < WARM_UP_ROUNDS; i += 1) nextU32(rng);
  return rng;
}

/**
 * Makes a generator from a seed. A number must be a whole number from 0 to
 * `Number.MAX_SAFE_INTEGER`; a string may be anything (a room code, a level name).
 * The same seed always gives the same stream.
 */
export function createRng(seed: number | string): RngState {
  if (typeof seed === 'string') {
    const digest = createDigest(0x5eed);
    absorbString(digest, seed);
    const out = { hi: 0, lo: 0 };
    finish(digest, out);
    return seedWords(out.lo, out.hi);
  }
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new RangeError(`rng seed must be a whole number from 0 to 2^53 - 1, got ${String(seed)}`);
  }
  return seedWords(seed >>> 0, Math.floor(seed / TWO_POW_32) >>> 0);
}

/** A separate copy of the generator at the same point in its stream. */
export function cloneRng(rng: Readonly<RngState>): RngState {
  return { a: rng.a, b: rng.b, c: rng.c, d: rng.d };
}

/**
 * A named sub-stream that does not disturb its parent: a new, independent generator derived
 * from this one's current state and a label. The parent is NOT advanced, so the order in
 * which sub-streams are forked does not matter, and adding a new use of randomness to one
 * part of a game does not change the numbers another part gets.
 *
 * Use it at set-up, on a root generator that is never drawn from: `forkRng(root, 'deck')`,
 * `forkRng(root, 'orders')`. Forking twice with the same label from the same parent state
 * gives THE SAME stream, so it is the wrong tool for "a fresh one each round": use
 * `splitRng` for that.
 */
export function forkRng(rng: Readonly<RngState>, label: string | number): RngState {
  const digest = createDigest(0xf02c);
  absorb(digest, rng.a);
  absorb(digest, rng.b);
  absorb(digest, rng.c);
  absorb(digest, rng.d);
  absorbString(digest, typeof label === 'number' ? `#${String(label)}` : `$${label}`);
  const out = { hi: 0, lo: 0 };
  finish(digest, out);
  return seedWords(out.lo, out.hi);
}

/**
 * A fresh generator each time it is called: a new, independent generator taken out of this
 * one. The parent IS advanced (by two draws), so calling it again, even with the same label,
 * gives a different stream.
 *
 * Use it during play for anything that recurs: a new deck each round is
 * `splitRng(state.rng, 'deck')`. The label is optional and only keeps different uses apart.
 * Because it advances the parent, it must be called on a generator the step owns (after
 * `cloneRng`, if the step does not change its input state).
 */
export function splitRng(rng: RngState, label: string | number = ''): RngState {
  const digest = createDigest(0x5b17);
  absorb(digest, nextU32(rng));
  absorb(digest, nextU32(rng));
  absorbString(digest, typeof label === 'number' ? `#${String(label)}` : `$${label}`);
  const out = { hi: 0, lo: 0 };
  finish(digest, out);
  return seedWords(out.lo, out.hi);
}

/** Next unsigned 32-bit integer, 0 to 4294967295. */
export function nextU32(rng: RngState): number {
  const t = (((rng.a + rng.b) | 0) + rng.d) | 0;
  rng.d = (rng.d + 1) >>> 0;
  rng.a = (rng.b ^ (rng.b >>> 9)) >>> 0;
  rng.b = (rng.c + (rng.c << 3)) >>> 0;
  const rotated = (rng.c << 21) | (rng.c >>> 11);
  rng.c = (rotated + t) >>> 0;
  return t >>> 0;
}

/** Next float, 0 (inclusive) to 1 (exclusive), with 32 random bits. */
export function nextFloat(rng: RngState): number {
  return nextU32(rng) / TWO_POW_32;
}

/** Next float from `min` (inclusive) to `max` (exclusive). */
export function nextFloatBetween(rng: RngState, min: number, max: number): number {
  return min + nextFloat(rng) * (max - min);
}

/**
 * Next whole number from `min` to `max`, BOTH ENDS INCLUSIVE, each equally likely (no modulo
 * bias): `nextInt(rng, 1, 6)` is a die. The range may span at most 2^32 values. For an item
 * from a list use `pick(rng, list)`; if you must index by hand it is
 * `nextInt(rng, 0, list.length - 1)`, not `list.length`.
 */
export function nextInt(rng: RngState, min: number, max: number): number {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min) {
    throw new RangeError(`nextInt needs whole numbers with min <= max, got ${String(min)}, ${String(max)}`);
  }
  const span = max - min + 1;
  if (span > TWO_POW_32) {
    throw new RangeError('nextInt range may span at most 2^32 values');
  }
  if (span === 1) return min;
  // Rejection sampling: discard the top sliver of the 32-bit range that would favour low values.
  const limit = TWO_POW_32 - (TWO_POW_32 % span);
  let value = nextU32(rng);
  while (value >= limit) value = nextU32(rng);
  return min + (value % span);
}

/** True with the given probability (0 never, 1 always). Always draws exactly one number. */
export function nextChance(rng: RngState, probability: number): boolean {
  return nextFloat(rng) < probability;
}

/** One item chosen evenly from a non-empty list. */
export function pick<T>(rng: RngState, items: ArrayLike<T>): T {
  if (items.length === 0) throw new RangeError('pick needs at least one item');
  return items[nextInt(rng, 0, items.length - 1)] as T;
}

/** Shuffles the array IN PLACE (Fisher-Yates) and returns it. */
export function shuffle<T>(rng: RngState, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = nextInt(rng, 0, i);
    const held = items[i] as T;
    items[i] = items[j] as T;
    items[j] = held;
  }
  return items;
}

/** A shuffled copy; the list passed in is left alone. */
export function shuffled<T>(rng: RngState, items: ArrayLike<T>): T[] {
  return shuffle(rng, Array.from(items));
}
