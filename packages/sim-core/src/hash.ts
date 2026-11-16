// A small two-lane 32-bit mixer giving a 64-bit digest. Not cryptographic: it exists so two
// simulation states (or two random-number seeds) can be told apart cheaply and identically on
// every device. Its output is pinned by known-answer tests; changing a constant here changes
// every state hash and every forked random stream.

/** Running digest. Plain data. */
export interface Digest {
  h1: number;
  h2: number;
  /** Words absorbed so far. */
  n: number;
}

export function createDigest(seed = 0): Digest {
  return { h1: seed | 0, h2: (seed ^ 0x9e3779b9) | 0, n: 0 };
}

/** Mixes one 32-bit word into the digest. */
export function absorb(d: Digest, word: number): void {
  let k1 = Math.imul(word, 0xcc9e2d51);
  k1 = (k1 << 15) | (k1 >>> 17);
  k1 = Math.imul(k1, 0x1b873593);
  let h1 = d.h1 ^ k1;
  h1 = (h1 << 13) | (h1 >>> 19);
  h1 = (Math.imul(h1, 5) + 0xe6546b64) | 0;

  let k2 = Math.imul(word, 0xab0e9789);
  k2 = (k2 << 16) | (k2 >>> 16);
  k2 = Math.imul(k2, 0x38b34ae5);
  let h2 = d.h2 ^ k2;
  h2 = (h2 << 17) | (h2 >>> 15);
  h2 = (h2 + h1) | 0;
  h2 = (Math.imul(h2, 5) + 0x0bcaa747) | 0;

  d.h1 = h1;
  d.h2 = h2;
  d.n = (d.n + 1) | 0;
}

/** Mixes a string in: its length, then its UTF-16 code units two to a word. */
export function absorbString(d: Digest, text: string): void {
  const length = text.length;
  absorb(d, length);
  let i = 0;
  for (; i + 1 < length; i += 2) {
    absorb(d, text.charCodeAt(i) | (text.charCodeAt(i + 1) << 16));
  }
  if (i < length) absorb(d, text.charCodeAt(i));
}

/** The avalanche step of MurmurHash3: every input bit affects every output bit. */
export function fmix32(value: number): number {
  let h = value | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Finishes the digest into its two unsigned 32-bit halves. Does not change `d`. */
export function finish(d: Digest, out: { hi: number; lo: number }): void {
  let h1 = d.h1 ^ d.n;
  let h2 = d.h2 ^ d.n;
  h1 = (h1 + h2) | 0;
  h2 = (h2 + h1) | 0;
  h1 = fmix32(h1);
  h2 = fmix32(h2);
  h1 = (h1 + h2) >>> 0;
  h2 = (h2 + h1) >>> 0;
  out.hi = h1;
  out.lo = h2;
}

const HEX = '0123456789abcdef';

function hex32(value: number): string {
  let text = '';
  for (let shift = 28; shift >= 0; shift -= 4) {
    text += HEX.charAt((value >>> shift) & 0xf);
  }
  return text;
}

/** Finishes the digest as 16 lower-case hex characters. */
export function finishHex(d: Digest): string {
  const out = { hi: 0, lo: 0 };
  finish(d, out);
  return hex32(out.hi) + hex32(out.lo);
}
