/** Completed-round totals already persisted by C-22; a zero score still means played. */
export function firstInRoom(scores: Readonly<Record<string, Readonly<Record<string, number>>>>, gameId: string): boolean {
  return !Object.values(scores).some(games => Object.hasOwn(games, gameId));
}
