import { expect, it } from 'vitest';
import { stepLevel } from './pause-level';
it('RZ-033 steps levels by ten and clamps at either end', () => {
  expect(stepLevel(70, 1)).toBe(80);
  expect(stepLevel(55, -1)).toBe(45);
  expect(stepLevel(95, 1)).toBe(100);
  expect(stepLevel(5, -1)).toBe(0);
  expect(stepLevel(100, 1)).toBe(100);
  expect(stepLevel(0, -1)).toBe(0);
});
