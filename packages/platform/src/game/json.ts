// Plain-JSON helpers for the conformance kit: is a view really JSON, how many bytes is it on
// the wire, are two views equal, and does a secret appear anywhere inside one.
import type { JsonValue, Secret } from './types';
function isPlainObject(value: object): boolean {
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function childPath(path: string, key: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}
/**
 * The first thing in `value` that `JSON.stringify` would lose or change, as a sentence naming
 * where it is, or null when the value is plain JSON. Refused: `undefined`, NaN and the
 * infinities, bigints, functions, symbols, Maps, Sets, typed arrays, class instances, arrays
 * with holes and anything that contains itself. (-0 is let through: it arrives as 0.)
 */
export function jsonProblem(
  value: unknown,
  path = 'value',
  open = new Set<object>(),
): string | null {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return null;
  if (typeof value === 'number')
    return Number.isFinite(value) ? null : `${path} is ${String(value)}, which JSON cannot carry`;
  if (typeof value !== 'object')
    return (
      path +
      ' is ' +
      (value === undefined ? 'undefined' : `a ${typeof value}`) +
      ', which JSON cannot carry'
    );
  if (open.has(value)) return `${path} contains itself`;
  open.add(value);
  let problem: string | null = null;
  if (Array.isArray(value)) {
    const items = value as unknown[];
    for (let i = 0; i < items.length && problem === null; i += 1) {
      problem =
        i in items
          ? jsonProblem(items[i], `${path}[${String(i)}]`, open)
          : `${path}[${String(i)}] is a hole in an array`;
    }
  } else if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      problem = jsonProblem(entry, childPath(path, key), open);
      if (problem !== null) break;
    }
  } else {
    problem = `${path} is ${Object.prototype.toString.call(value)}, not a plain object or array`;
  }
  open.delete(value);
  return problem;
}
/** Characters as a reader counts them roughly: code points, not UTF-16 units. */
export function charCount(text: string): number {
  return Array.from(text).length;
}
/** Bytes of a string in UTF-8, as it travels to a phone. */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit < 128) bytes += 1;
    else if (unit < 2048) bytes += 2;
    else if (unit >= 55296 && unit <= 56319 && i + 1 < text.length) {
      // A surrogate pair is one character of four bytes.
      bytes += 4;
      i += 1;
    } else bytes += 3;
  }
  return bytes;
}
/** Bytes of a plain-JSON value once serialised. */
export function jsonSize(value: unknown): number {
  // `JSON.stringify(undefined)` is undefined, whatever its declared type says.
  const text: unknown = JSON.stringify(value);
  return utf8Length(typeof text === 'string' ? text : 'null');
}
/** Structural equality of two plain-JSON values. Object key order does not matter. */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!jsonEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  for (const key of keys) {
    if (!Object.hasOwn(right, key) || !jsonEqual(left[key], right[key])) return false;
  }
  return true;
}
/**
 * The path of the first place two plain-JSON values differ, or null when they are equal.
 * For telling a game author where a view changed.
 */
export function firstDifference(a: unknown, b: unknown, path = 'view'): string | null {
  if (jsonEqual(a, b)) return null;
  if (
    typeof a === 'object' &&
    typeof b === 'object' &&
    a !== null &&
    b !== null &&
    Array.isArray(a) === Array.isArray(b)
  ) {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length)
        return `${path} (length ${String(a.length)} against ${String(b.length)})`;
      for (let i = 0; i < a.length; i += 1) {
        const inner = firstDifference(a[i], b[i], `${path}[${String(i)}]`);
        if (inner !== null) return inner;
      }
      return path;
    }
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
      const inner = firstDifference(left[key], right[key], childPath(path, key));
      if (inner !== null) return inner;
    }
  }
  return path;
}
function secretHit(secret: Secret, value: JsonValue, path: string, isKey: boolean): boolean {
  if ('match' in secret) return !isKey && secret.match(value, path);
  const wanted = secret.value;
  if (typeof wanted === 'string') {
    if (typeof value !== 'string') return false;
    return value === wanted || (wanted.length >= 2 && value.includes(wanted));
  }
  if (isKey) return typeof wanted === 'number' && value === String(wanted);
  return jsonEqual(value, wanted);
}
/**
 * Deep search of a plain-JSON view for a secret: every value, every object key, at any
 * depth. Returns the path of the first place it is found, or null.
 */
export function findSecret(secret: Secret, view: unknown, path = 'view'): string | null {
  const value = view as JsonValue;
  if (secretHit(secret, value, path, false)) return path;
  if (value === null || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const found = findSecret(secret, value[i], `${path}[${String(i)}]`);
      if (found !== null) return found;
    }
    return null;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (secretHit(secret, key, path, true)) return `${childPath(path, key)} (the key)`;
    const found = findSecret(secret, entry, childPath(path, key));
    if (found !== null) return found;
  }
  return null;
}
