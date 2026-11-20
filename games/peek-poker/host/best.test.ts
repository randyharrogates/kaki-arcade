import { expect, it } from 'vitest';
import { bestLabel } from './best';

it.each([
  ['rising', 'Best 42', 'New best · 42'],
  ['steady', 'Steady best 42', 'New steady best · 42'],
] as const)('PP-033 PP-012 %s best labels', (difficulty, best, newBest) => {
  expect(bestLabel(difficulty, 42)).toBe(best);
  expect(bestLabel(difficulty, 42, true)).toBe(newBest);
});
