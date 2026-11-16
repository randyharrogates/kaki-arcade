// Small total checks that the message validators are assembled from. A check takes any value
// and returns either a clean copy of it or a fault; it never throws on data.

import { MAX_JSON_DEPTH, PROTOCOL_VERSION } from './limits';
import { fail, ok } from './result';
import type { Result } from './result';

/** The value has the wrong shape. */
export const BAD: unique symbol = Symbol('bad');
/** The value has the right shape but is over its size cap. */
export const BIG: unique symbol = Symbol('big');

export type Fault = typeof BAD | typeof BIG;
export type Check<T> = (value: unknown) => T | Fault;

export function isFault(value: unknown): value is Fault {
  return value === BAD || value === BIG;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Bytes this string takes as UTF-8. A lone surrogate counts as 3, as an encoder would write it. */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit < 0x80) {
      bytes += 1;
    } else if (unit < 0x800) {
      bytes += 2;
    } else if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i += 1;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

export const bool: Check<boolean> = (value) => (typeof value === 'boolean' ? value : BAD);

/** A whole number from `min` to `max` inclusive. */
export function int(min: number, max: number): Check<number> {
  return (value) =>
    // `value + 0` turns -0 into 0: JSON has no -0, so it would not survive a round trip.
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
      ? value + 0
      : BAD;
}

/** A string of `min` to `max` UTF-16 units, optionally matching a pattern. */
export function text(min: number, max: number, pattern: RegExp | null = null): Check<string> {
  return (value) => {
    if (typeof value !== 'string') return BAD;
    if (value.length > max) return BIG;
    if (value.length < min) return BAD;
    if (pattern !== null && !pattern.test(value)) return BAD;
    return value;
  };
}

/** One of a fixed set of strings. */
export function oneOf<const T extends string>(values: readonly T[]): Check<T> {
  return (value) => {
    for (const candidate of values) {
      if (candidate === value) return candidate;
    }
    return BAD;
  };
}

/** The inner check, or `null` when the value is `null` or absent. */
export function nullable<T>(inner: Check<T>): Check<T | null> {
  return (value) => (value === null || value === undefined ? null : inner(value));
}

/**
 * A string of at least `minChars` characters that takes at most `maxBytes` inside a JSON
 * message: UTF-8 bytes with JSON escapes counted, not counting the quotes.
 */
export function boundedText(minChars: number, maxBytes: number): Check<string> {
  return (value) => {
    if (typeof value !== 'string') return BAD;
    if (value.length > maxBytes) return BIG;
    if (value.length < minChars) return BAD;
    return utf8Length(JSON.stringify(value)) - 2 > maxBytes ? BIG : value;
  };
}

/** An array of `minItems` to `maxItems` items that each pass the inner check. */
export function list<T>(inner: Check<T>, maxItems: number, minItems = 0): Check<T[]> {
  return (value) => {
    if (!Array.isArray(value)) return BAD;
    if (value.length > maxItems) return BIG;
    if (value.length < minItems) return BAD;
    const out: T[] = [];
    for (const item of value as unknown[]) {
      const checked = inner(item);
      if (isFault(checked)) return checked;
      out.push(checked);
    }
    return out;
  };
}

type FieldChecks<T> = { readonly [K in keyof T]: Check<T[K]> };

function readFields(
  source: Record<string, unknown>,
  checks: Readonly<Record<string, Check<unknown>>>,
  out: Record<string, unknown>,
): { fault: Fault; field: string } | null {
  for (const key of Object.keys(checks)) {
    const check = checks[key];
    if (check === undefined) continue;
    const checked = check(source[key]);
    if (isFault(checked)) return { fault: checked, field: key };
    out[key] = checked;
  }
  return null;
}

/** An object whose named fields each pass their check. Fields not named are dropped. */
export function record<T>(checks: FieldChecks<T>): Check<T> {
  return (value) => {
    if (!isRecord(value)) return BAD;
    const out: Record<string, unknown> = {};
    const problem = readFields(value, checks, out);
    return problem === null ? (out as T) : problem.fault;
  };
}

/** The field checks for each member of a union told apart by `kind`. */
export type KindShapes<U extends { kind: string }> = {
  readonly [K in U['kind']]: FieldChecks<Omit<Extract<U, { kind: K }>, 'kind'>>;
};

/** A union of objects told apart by a `kind` field. */
export function kinds<U extends { kind: string }>(shapes: KindShapes<U>): Check<U> {
  const table: Readonly<Record<string, Readonly<Record<string, Check<unknown>>>>> = shapes;
  return (value) => {
    if (!isRecord(value)) return BAD;
    const kind = value.kind;
    if (typeof kind !== 'string' || !Object.hasOwn(table, kind)) return BAD;
    const checks = table[kind];
    if (checks === undefined) return BAD;
    const out: Record<string, unknown> = { kind };
    const problem = readFields(value, checks, out);
    return problem === null ? (out as U) : problem.fault;
  };
}

/** Any JSON value. Game payloads are carried as this and given a type by the game interface. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function copyJson(value: unknown, budget: { left: number }, depth: number): Json | Fault {
  if (value === null) {
    budget.left -= 4;
    return budget.left < 0 ? BIG : null;
  }
  switch (typeof value) {
    case 'boolean':
      budget.left -= value ? 4 : 5;
      return budget.left < 0 ? BIG : value;
    case 'number':
      if (!Number.isFinite(value)) return BAD;
      budget.left -= JSON.stringify(value).length;
      // `value + 0` turns -0 into 0: JSON has no -0, so it would not survive a round trip.
      return budget.left < 0 ? BIG : value + 0;
    case 'string':
      if (value.length > budget.left) return BIG;
      budget.left -= utf8Length(JSON.stringify(value));
      return budget.left < 0 ? BIG : value;
    case 'object':
      break;
    case 'undefined':
    case 'bigint':
    case 'symbol':
    case 'function':
      return BAD;
  }
  if (depth >= MAX_JSON_DEPTH) return BIG;
  if (Array.isArray(value)) {
    const items = value as unknown[];
    budget.left -= 2 + Math.max(0, items.length - 1);
    if (budget.left < 0) return BIG;
    const out: Json[] = [];
    for (const item of items) {
      const copied = copyJson(item, budget, depth + 1);
      if (isFault(copied)) return copied;
      out.push(copied);
    }
    return out;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return BAD;
  const source = value as Record<string, unknown>;
  const keys = Object.keys(source);
  budget.left -= 2 + Math.max(0, keys.length - 1);
  if (budget.left < 0) return BIG;
  const out: Record<string, Json> = {};
  for (const key of keys) {
    // Assigning this key to a plain object would set its prototype instead of a field.
    if (key === '__proto__') return BAD;
    if (key.length > budget.left) return BIG;
    budget.left -= utf8Length(JSON.stringify(key)) + 1;
    if (budget.left < 0) return BIG;
    const copied = copyJson(source[key], budget, depth + 1);
    if (isFault(copied)) return copied;
    out[key] = copied;
  }
  return out;
}

/**
 * Any JSON value that takes at most `maxBytes` as compact UTF-8 JSON and nests no deeper than
 * `MAX_JSON_DEPTH`. `null` is a value here; an absent field is not.
 */
export function json(maxBytes: number): Check<Json> {
  return (value) => (value === undefined ? BAD : copyJson(value, { left: maxBytes }, 0));
}

/** Any message: the protocol version and a type. */
export interface Message {
  readonly v: typeof PROTOCOL_VERSION;
  readonly t: string;
}

/**
 * The field checks for each message type in a union. The compiler requires a check for every
 * field of every type, refuses a check for a field that does not exist, and requires each
 * check to return that field's type.
 */
export type MessageShapes<M extends Message> = {
  readonly [T in M['t']]: FieldChecks<Omit<Extract<M, { t: T }>, 'v' | 't'>>;
};

/**
 * A validator for a union of messages. It accepts any value at all and never throws. The
 * message it returns is a clean copy holding only the fields the type defines.
 */
export function messageValidator<M extends Message>(
  shapes: MessageShapes<M>,
): (value: unknown) => Result<M> {
  const table: Readonly<Record<string, Readonly<Record<string, Check<unknown>>>>> = shapes;
  return (value) => {
    try {
      if (!isRecord(value)) return fail('not-object');
      if (value.v !== PROTOCOL_VERSION) return fail('bad-version', 'v');
      const type = value.t;
      if (typeof type !== 'string' || !Object.hasOwn(table, type)) {
        return fail('unknown-type', 't');
      }
      const checks = table[type];
      if (checks === undefined) return fail('unknown-type', 't');
      const out: Record<string, unknown> = { v: PROTOCOL_VERSION, t: type };
      const problem = readFields(value, checks, out);
      if (problem !== null) {
        return fail(problem.fault === BIG ? 'too-large' : 'bad-field', problem.field);
      }
      return ok(out as unknown as M);
    } catch {
      // Only an exotic object (a proxy or a getter that throws) can get here.
      return fail('bad-field');
    }
  };
}

/**
 * A decoder for JSON text: checks the size, parses, then validates. It accepts any value at
 * all and never throws.
 */
export function textDecoder<M>(
  validate: (value: unknown) => Result<M>,
  maxBytes: number,
): (data: unknown) => Result<M> {
  return (data) => {
    if (typeof data !== 'string') return fail('not-text');
    if (data.length > maxBytes || utf8Length(data) > maxBytes) return fail('too-large');
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return fail('not-json');
    }
    return validate(parsed);
  };
}
