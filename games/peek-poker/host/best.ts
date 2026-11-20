import type { PokerPublicView } from './view-model';

/** PP-033 PP-012: name Steady's separate record; preserve Rising's existing copy. */
export function bestLabel(difficulty: PokerPublicView['difficulty'], score: number, newBest = false): string {
  const steady = difficulty === 'steady';
  return newBest ? `New ${steady ? 'steady ' : ''}best · ${String(score)}` :
    `${steady ? 'Steady best' : 'Best'} ${String(score)}`;
}
