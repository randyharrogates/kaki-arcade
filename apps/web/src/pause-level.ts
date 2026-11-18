/** RZ-033: preserve saved intermediate values (the Music default is 55). */
export function stepLevel(level: number, direction: -1 | 1): number {
  return Math.max(0, Math.min(100, level + direction * 10));
}
