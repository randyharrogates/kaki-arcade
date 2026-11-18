/** RZ-013, RZ-015, DATA-002: pure game-owned record codec. */
export const RECORD_VERSION = 1;
export const RECENT_LIMIT = 200;
export interface RabakzRecord { recent: string[]; bests: Record<string, number> }
export const emptyRecord = (): RabakzRecord => ({ recent: [], bests: {} });
export function validRecord(value: unknown): value is RabakzRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).every(key => key === 'recent' || key === 'bests') &&
    Array.isArray(v.recent) && v.recent.length <= RECENT_LIMIT &&
    v.recent.every(id => typeof id === 'string' && id.length > 0 && id.length <= 64) &&
    new Set(v.recent).size === v.recent.length && !!v.bests && typeof v.bests === 'object' && !Array.isArray(v.bests) &&
    Object.entries(v.bests).every(([key, score]) => ['10', '30', '50'].includes(key) && typeof score === 'number' && Number.isSafeInteger(score) && score >= 0);
}
export function appendRecent(old: readonly string[], shown: readonly string[]): string[] {
  return [...new Set([...old, ...shown].reverse())].reverse().slice(-RECENT_LIMIT);
}
