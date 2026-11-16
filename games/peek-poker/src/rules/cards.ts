import { shuffle } from '@kaki/sim-core';
import type { RngState } from '@kaki/sim-core';

/** 0..51: suit-major, ranks 2..ace. Suits never break poker ties. */
export type Card = number;
export const rankOf = (card: Card): number => card % 13 + 2;
export const suitOf = (card: Card): number => Math.floor(card / 13);
export const cardCode = (card: Card): string =>
  '23456789TJQKA'.charAt(card % 13) + 'CDHS'.charAt(suitOf(card));

export function dealCards(rng: RngState): { grid: Card[]; shared: Card[] } {
  const deck = Array.from({ length: 52 }, (_, index) => index);
  shuffle(rng, deck);
  return { grid: deck.slice(0, 16), shared: deck.slice(16, 19) };
}
