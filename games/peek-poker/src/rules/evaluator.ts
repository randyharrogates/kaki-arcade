import { must } from './invariant';
import { rankOf, suitOf } from './cards';
import type { Card } from './cards';

export const HAND_NAMES = [
  'High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight',
  'Flush', 'Full house', 'Four of a kind', 'Straight flush',
] as const;
export const HAND_POINTS = [1, 2, 3, 4, 5, 6, 8, 10, 13] as const;
export interface Hand {
  category: number;
  kickers: number[];
  /** Base-15 digits: category then five rank slots, for a total preorder of poker hands. */
  strength: number;
}

function hand(category: number, kickers: number[]): Hand {
  let strength = category;
  for (let i = 0; i < 5; i += 1) strength = strength * 15 + (kickers[i] ?? 0);
  return { category, kickers, strength };
}

/** Exactly five distinct cards from one standard deck. Ace may be low only in A2345. */
export function evaluate(cards: readonly Card[]): Hand {
  if (cards.length !== 5 || new Set(cards).size !== 5 ||
      cards.some((card) => !Number.isInteger(card) || card < 0 || card >= 52)) {
    throw new RangeError('A hand needs five distinct standard cards');
  }
  const ranks = cards.map(rankOf).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const rank of ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1);
  const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const unique = [...counts.keys()];
  const flush = cards.every((card) => suitOf(card) === suitOf(must(cards[0])));
  const wheel = unique.join(',') === '14,5,4,3,2';
  const straight = unique.length === 5 && (must(ranks[0]) - must(ranks[4]) === 4 || wheel);
  const high = wheel ? 5 : must(ranks[0]);
  if (straight && flush) return hand(8, [high]);
  if (must(groups[0])[1] === 4) return hand(7, groups.map(([rank]) => rank));
  if (must(groups[0])[1] === 3 && must(groups[1])[1] === 2) {
    return hand(6, groups.map(([rank]) => rank));
  }
  if (flush) return hand(5, ranks);
  if (straight) return hand(4, [high]);
  if (must(groups[0])[1] === 3) return hand(3, groups.map(([rank]) => rank));
  if (must(groups[0])[1] === 2) {
    return hand(must(groups[1])[1] === 2 ? 2 : 1, groups.map(([rank]) => rank));
  }
  return hand(0, ranks);
}

/** Negative/zero/positive means weaker/equal/stronger; equality includes suit-only changes. */
export function compareHands(a: Hand, b: Hand): number {
  return Math.sign(a.strength - b.strength);
}
