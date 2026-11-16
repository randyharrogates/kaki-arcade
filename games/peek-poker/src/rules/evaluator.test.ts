import { must } from './invariant';
import { describe, expect, it } from 'vitest';
import { createRng, shuffle } from '@kaki/sim-core';
import { compareHands, evaluate, HAND_NAMES, HAND_POINTS } from './evaluator';

export function cards(text: string): number[] {
  return text.split(' ').map((code) =>
    'CDHS'.indexOf(code.charAt(1)) * 13 + '23456789TJQKA'.indexOf(code.charAt(0)));
}

// Independent reference: count every rank and enumerate straights, without production helpers.
function reference(hand: number[]): number[] {
  const counts = Array.from({ length: 15 }, (_, rank) =>
    hand.filter((card) => card % 13 + 2 === rank).length);
  const ranks = counts.flatMap((count, rank) => count > 0 ? [rank] : []);
  let straight = 0;
  for (let high = 5; high <= 14; high += 1) {
    const run = Array.from({ length: 5 }, (_, i) => high - i);
    if (run.every((r) => must(counts[r === 1 ? 14 : r]) > 0)) straight = high;
  }
  const flush = new Set(hand.map((card) => Math.floor(card / 13))).size === 1;
  const byCount = (count: number) => ranks.filter((r) => counts[r] === count).reverse();
  const quads = byCount(4);
  const trips = byCount(3);
  const pairs = byCount(2);
  const singles = byCount(1);
  if (straight && flush) return [8, straight];
  if (quads.length) return [7, ...quads, ...singles];
  if (trips.length && pairs.length) return [6, ...trips, ...pairs];
  if (flush) return [5, ...ranks.reverse()];
  if (straight) return [4, straight];
  if (trips.length) return [3, ...trips, ...singles];
  if (pairs.length) return [pairs.length === 2 ? 2 : 1, ...pairs, ...singles];
  return [0, ...singles];
}

const examples = [
  'AC JD 9H 6S 3C', 'AC AD 9H 6S 3C', 'AC AD 9H 9S 3C',
  'AC AD AH 6S 3C', '9C TD JH QS KC', 'AC JC 9C 6C 3C',
  'AC AD AH 6S 6C', 'AC AD AH AS 3C', '9C TC JC QC KC',
];
describe('PP-007 standard five-card poker', () => {
  it.each(examples.map((text, category) => ({ text, category })))(
    'PP-007 PP-009 $text ranks as $category with table points', ({ text, category }) => {
    const hand = evaluate(cards(text));
    expect(hand.category).toBe(category);
    expect([hand.category, ...hand.kickers]).toEqual(reference(cards(text)));
    expect(HAND_NAMES[category]).toBeTruthy();
    expect(HAND_POINTS[category]).toBe([1, 2, 3, 4, 5, 6, 8, 10, 13][category]);
  });
  it('PP-007 every category outranks the previous category', () => {
    for (let i = 1; i < examples.length; i += 1) {
      expect(compareHands(evaluate(cards(must(examples[i]))),
        evaluate(cards(must(examples[i - 1]))))).toBe(1);
    }
  });
  it.each([
    ['AC KD 9H 6S 3C', 'AC QD 9H 6S 3C'],
    ['AC KD 9H 6S 4C', 'AC KD 9H 6S 3C'],
    ['AC AD KH 6S 3C', 'AC AD QH 6S 3C'],
    ['AC AD KH 7S 3C', 'AC AD KH 6S 3C'],
    ['AC AD KH 6S 4C', 'AC AD KH 6S 3C'],
    ['AC AD KH KS 3C', 'AC AD QH QS 3C'],
    ['AC AD KH KS 4C', 'AC AD KH KS 3C'],
    ['AC AD AH KS 4C', 'AC AD AH QS 4C'],
    ['AC AD AH KS 5C', 'AC AD AH KS 4C'],
    ['AC AD AH KS KC', 'AC AD AH QS QC'],
    ['KC KD KH KS AC', 'KC KD KH KS QC'],
    ['AC KC 9C 6C 4C', 'AC KC 9C 6C 3C'],
    ['TC JD QH KS AC', '9C TD JH QS KC'],
    ['TC JC QC KC AC', '9C TC JC QC KC'],
  ])('PP-007 kicker comparison %s > %s', (a, b) => {
    expect(compareHands(evaluate(cards(a)), evaluate(cards(b)))).toBe(1);
  });
  it('PP-007 wheel is five-high; ace does not wrap other straights', () => {
    expect(evaluate(cards('AC 2D 3H 4S 5C')).kickers).toEqual([5]);
    expect(evaluate(cards('AC 2C 3C 4C 5C')).category).toBe(8);
    expect(compareHands(evaluate(cards('2C 3D 4H 5S 6C')),
      evaluate(cards('AC 2D 3H 4S 5C')))).toBe(1);
    expect(evaluate(cards('QC KD AH 2S 3C')).category).toBe(0);
  });
  it('PP-007 ties ignore suit and input order', () => {
    const a = evaluate(cards('AC KD QH JS 9C'));
    expect(compareHands(a, evaluate(cards('9S JC QD KH AS')))).toBe(0);
    expect(compareHands(a, a)).toBe(0);
  });
  it('PP-007 all five-card subsets of seeded seven-card sets match brute force', () => {
    const rng = createRng(20261116);
    const hands = [];
    for (let seed = 0; seed < 40; seed += 1) {
      const deck = shuffle(rng, Array.from({ length: 52 }, (_, i) => i)).slice(0, 7);
      for (let a = 0; a < 7; a += 1) {
        for (let b = a + 1; b < 7; b += 1) {
          const five = deck.filter((_, i) => i !== a && i !== b);
          const actual = evaluate(five);
          const expected = reference(five);
          expect([actual.category, ...actual.kickers]).toEqual(expected);
          hands.push(actual);
        }
      }
    }
    const sorted = hands.sort(compareHands);
    for (let i = 0; i < sorted.length - 2; i += 1) {
      const [a, b, c] = sorted.slice(i, i + 3);
      expect(compareHands(must(a), must(b))).toBeLessThanOrEqual(0);
      expect(compareHands(must(a), must(c))).toBeLessThanOrEqual(0);
      expect(compareHands(must(a), must(b)) + compareHands(must(b), must(a))).toBe(0);
    }
  });
  it('PP-007 exhaustive rank multisets and flush variants agree with reference', () => {
    let checked = 0;
    function visit(ranks: number[], minimum: number): void {
      if (ranks.length < 5) {
        for (let rank = minimum; rank < 13; rank += 1) visit([...ranks, rank], rank);
        return;
      }
      if (ranks.every((rank) => rank === ranks[0])) return;
      const used = new Map<number, number>();
      const five = ranks.map((rank) => {
        const suit = used.get(rank) ?? 0;
        used.set(rank, suit + 1);
        return suit * 13 + rank;
      });
      const variants = [five];
      if (used.size === 5) variants.push(five.map((card, i) => card + (i % 4) * 13));
      for (const variant of variants) {
        const actual = evaluate(variant);
        expect([actual.category, ...actual.kickers]).toEqual(reference(variant));
        checked += 1;
      }
    }
    visit([], 0);
    expect(checked).toBe(7462);
  });
  it('PP-007 rejects non-five-card hands and duplicate or invalid cards', () => {
    for (const invalid of [[], [0, 1, 2, 3], [0, 1, 2, 3, 3], [0, 1, 2, 3, 52]]) {
      expect(() => evaluate(invalid)).toThrow(RangeError);
    }
  });
});
