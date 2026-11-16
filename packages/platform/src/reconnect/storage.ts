/** Browser storage is supplied by the shell. No browser globals are read here. */
export interface ReconnectStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
/** Use the room clock basis, stable across reloads; persisted times are rounded down. */
export interface ReconnectClock {
  now(): number;
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
}
export function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function keys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).length === expected.length && expected.every(k => k in value);
}
export function natural(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
/** UTF-8 byte count without DOM encoders. JSON escapes lone surrogates before this is used. */
export function storageBytes(text: string): number {
  let bytes = 0;
  for (const c of text) {
    const n = c.codePointAt(0) ?? 0;
    bytes += n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4;
  }
  return bytes;
}
export function remove(storage: ReconnectStorage, key: string): void {
  try { storage.removeItem(key); } catch { /* Storage denial must not interrupt play. */ }
}
/** Reject non-JSON data, excessive nesting, prototype keys and non-finite numbers. */
export function safeJson(value: unknown, depth = 0): boolean {
  if (depth > 32) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((v: unknown) => safeJson(v, depth + 1));
  return object(value) && Object.getPrototypeOf(value) === Object.prototype &&
    Object.entries(value).every(([k, v]) => !['__proto__', 'constructor', 'prototype'].includes(k)
      && safeJson(v, depth + 1));
}
