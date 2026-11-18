/** DATA-003: this additive contract carries counts only, never context or identifiers. */
export const COUNT_KINDS = [
  'error:host:session', 'error:host:load', 'error:signal:unavailable',
  'reconnect:signal',
  'perf:host-frame-p95:le17', 'perf:host-frame-p95:le34',
  'perf:host-frame-p95:le50', 'perf:host-frame-p95:gt50',
] as const;
export type CountKind = typeof COUNT_KINDS[number];
export type Counts = Partial<Record<CountKind, number>>;
export const COUNTS_MAX_BYTES = 512;
export const COUNT_MAX = 65535;
/** The wire object is the sparse count map itself. The server chooses the UTC day. */
export function validateCounts(value: unknown): value is Counts {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    const entries = Object.entries(value);
    return entries.length > 0 && entries.length <= COUNT_KINDS.length && entries.every(([key, n]) =>
      (COUNT_KINDS as readonly string[]).includes(key) && typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= COUNT_MAX);
  } catch { return false; }
}
