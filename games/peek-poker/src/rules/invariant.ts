/** A checked access to data whose presence is guaranteed by a game invariant. */
export function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Missing game data');
  return value;
}
