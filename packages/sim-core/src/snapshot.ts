// Snapshot helpers for simulation state (PLAT-032): copy it, freeze it, fingerprint it.
//
// "State" here means plain data: null, undefined, booleans, numbers, strings, bigints, arrays
// (with no holes and no extra named properties), plain objects, Maps, Sets and typed arrays,
// nested as deep as the engine's call stack allows (many hundreds of levels), with nothing
// referring back to something that contains it. Anything else (a function, a symbol, a class
// instance, a calendar date object, a DOM node) does not belong in simulation state, and `cloneState`, `hashState` and `deepFreeze` throw a TypeError
// naming where it is, for example `state.cooks<p1>.onDone`.
//
// The same object may appear in two places (a level table shared by two fields): it is
// cloned as two copies, hashed twice and frozen once.

import { absorb, absorbString, createDigest, finishHex } from './hash';
import type { Digest } from './hash';

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

function isTypedArray(value: object): value is TypedArray {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** True when the array has every index from 0 to length - 1 and no other property. */
function isDense(items: unknown[]): boolean {
  for (let i = 0; i < items.length; i += 1) {
    if (!(i in items)) return false;
  }
  return Object.keys(items).length === items.length;
}

function describe(value: unknown): string {
  if (typeof value === 'function') return 'a function';
  if (typeof value === 'symbol') return 'a symbol';
  return Object.prototype.toString.call(value);
}

function unsupported(value: unknown, path: string): TypeError {
  return new TypeError(`simulation state must be plain data, found ${describe(value)} at ${path}`);
}

function protoKey(path: string): TypeError {
  return new TypeError(
    `simulation state must be plain data, found a property named "__proto__" at ${path}.__proto__ (it cannot be copied safely)`,
  );
}

function refuseChange(): never {
  throw new TypeError('this Map or Set is frozen: simulation state was changed where it must not be');
}

/**
 * Can `deepFreeze` make this Map or Set read-only? Freezing the object does not stop `set`
 * or `add`; that takes replacing those methods on the object itself, which is impossible
 * once it has been frozen, sealed or made non-extensible by someone else.
 */
function canGuard(collection: object, method: 'set' | 'add'): boolean {
  if (Object.getOwnPropertyDescriptor(collection, method)?.value === refuseChange) return true;
  return Object.isExtensible(collection);
}

function unguardable(kind: 'Map' | 'Set', path: string): TypeError {
  return new TypeError(
    `cannot make the ${kind} at ${path} read-only: it was frozen, sealed or made non-extensible before deepFreeze saw it, ` +
      `which does not stop it being changed and prevents deepFreeze from stopping it. Do not freeze Maps and Sets by hand.`,
  );
}

function entryPath(path: string, key: unknown): string {
  return `${path}<${typeof key === 'string' || typeof key === 'number' ? String(key) : 'value'}>`;
}

// The fast paths below do not track where they are. When one meets something it cannot
// handle it throws this marker, and `explain` walks the state again, slowly, to say where.
const NOT_PLAIN = new TypeError('simulation state must be plain data');

/** The objects between the root and the value being visited: meeting one again is a cycle. */
type Open = Set<object>;

/**
 * The slow, exact check. Throws a TypeError naming the first thing that is not plain data.
 * `done`, when given, remembers what has been checked so a shared part is walked once.
 */
function checkAt(value: unknown, path: string, open: Open, done: WeakSet<object> | null, forFreeze = false): void {
  if (typeof value === 'function' || typeof value === 'symbol') throw unsupported(value, path);
  if (value === null || typeof value !== 'object') return;
  if (open.has(value)) {
    throw new TypeError(`simulation state refers to itself: ${path} is something that contains it`);
  }
  if (done !== null) {
    if (done.has(value)) return;
    done.add(value);
  }
  open.add(value);
  if (Array.isArray(value)) {
    const items: unknown[] = value;
    for (let i = 0; i < items.length; i += 1) {
      if (!(i in items)) {
        throw new TypeError(`simulation state must be plain data, found an array with a hole at ${path}[${String(i)}]`);
      }
      checkAt(items[i], `${path}[${String(i)}]`, open, done, forFreeze);
    }
    for (const key of Object.keys(items)) {
      if (!/^(0|[1-9]\d*)$/.test(key)) {
        throw new TypeError(`simulation state must be plain data, found an array with an extra property at ${path}.${key}`);
      }
    }
  } else if (value instanceof Map) {
    if (forFreeze && !canGuard(value, 'set')) throw unguardable('Map', path);
    for (const [key, entry] of value as Map<unknown, unknown>) {
      checkAt(key, `${path}<key>`, open, done, forFreeze);
      checkAt(entry, entryPath(path, key), open, done, forFreeze);
    }
  } else if (value instanceof Set) {
    if (forFreeze && !canGuard(value, 'add')) throw unguardable('Set', path);
    for (const entry of value as Set<unknown>) checkAt(entry, `${path}<item>`, open, done, forFreeze);
  } else if (!isTypedArray(value)) {
    if (!isPlainObject(value)) throw unsupported(value, path);
    for (const key of Object.keys(value)) {
      if (key === '__proto__') throw protoKey(path);
      checkAt(value[key], `${path}.${key}`, open, done, forFreeze);
    }
  }
  open.delete(value);
}

/** Turns the marker into an error that names the place; rethrows anything else. */
function explain(error: unknown, state: unknown): never {
  if (error === NOT_PLAIN) checkAt(state, 'state', new Set(), null);
  throw error;
}

// ---------------------------------------------------------------------------------------------
// Clone

function cloneAt(value: unknown, open: Open): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function' || typeof value === 'symbol') throw NOT_PLAIN;
    return value;
  }
  if (isTypedArray(value)) return value.slice();
  if (open.has(value)) throw NOT_PLAIN;
  open.add(value);
  let result: unknown;
  if (Array.isArray(value)) {
    const items: unknown[] = value;
    if (!isDense(items)) throw NOT_PLAIN;
    const copy = new Array<unknown>(items.length);
    for (let i = 0; i < items.length; i += 1) copy[i] = cloneAt(items[i], open);
    result = copy;
  } else if (value instanceof Map) {
    const copy = new Map<unknown, unknown>();
    for (const [key, entry] of value as Map<unknown, unknown>) copy.set(cloneAt(key, open), cloneAt(entry, open));
    result = copy;
  } else if (value instanceof Set) {
    const copy = new Set<unknown>();
    for (const entry of value as Set<unknown>) copy.add(cloneAt(entry, open));
    result = copy;
  } else if (isPlainObject(value)) {
    const copy: Record<string, unknown> = Object.getPrototypeOf(value) === null ? (Object.create(null) as Record<string, unknown>) : {};
    for (const key of Object.keys(value)) {
      if (key === '__proto__') throw NOT_PLAIN;
      copy[key] = cloneAt(value[key], open);
    }
    result = copy;
  } else {
    throw NOT_PLAIN;
  }
  open.delete(value);
  return result;
}

/**
 * A deep, independent copy of a state. Order of object keys, Map entries and Set items is
 * kept. An object referred to from two places becomes two copies.
 */
export function cloneState<T>(state: T): T {
  try {
    return cloneAt(state, new Set()) as T;
  } catch (error) {
    return explain(error, state);
  }
}

// ---------------------------------------------------------------------------------------------
// Hash

const TAG_NULL = 1;
const TAG_UNDEFINED = 2;
const TAG_FALSE = 3;
const TAG_TRUE = 4;
const TAG_NUMBER = 5;
const TAG_STRING = 6;
const TAG_BIGINT = 7;
const TAG_ARRAY = 8;
const TAG_OBJECT = 9;
const TAG_MAP = 10;
const TAG_SET = 11;
const TAG_TYPED = 12;

// Scratch space for reading a number's 64 bits. Byte order is fixed so every device agrees.
const numberBits = new DataView(new ArrayBuffer(8));

function absorbNumber(digest: Digest, value: number): void {
  // Every not-a-number hashes alike; +0 and -0 hash differently, as they behave differently.
  numberBits.setFloat64(0, Number.isNaN(value) ? Number.NaN : value, true);
  absorb(digest, numberBits.getUint32(0, true));
  absorb(digest, numberBits.getUint32(4, true));
}

function hashAt(digest: Digest, value: unknown, open: Open): void {
  switch (typeof value) {
    case 'undefined':
      absorb(digest, TAG_UNDEFINED);
      return;
    case 'boolean':
      absorb(digest, value ? TAG_TRUE : TAG_FALSE);
      return;
    case 'number':
      absorb(digest, TAG_NUMBER);
      absorbNumber(digest, value);
      return;
    case 'string':
      absorb(digest, TAG_STRING);
      absorbString(digest, value);
      return;
    case 'bigint':
      absorb(digest, TAG_BIGINT);
      absorbString(digest, value.toString());
      return;
    case 'function':
    case 'symbol':
      throw NOT_PLAIN;
    case 'object':
      break;
  }
  if (value === null) {
    absorb(digest, TAG_NULL);
    return;
  }
  if (isTypedArray(value)) {
    absorb(digest, TAG_TYPED);
    absorbString(digest, Object.prototype.toString.call(value));
    absorb(digest, value.length);
    for (const element of value) {
      if (typeof element === 'bigint') absorbString(digest, element.toString());
      else absorbNumber(digest, element);
    }
    return;
  }
  if (open.has(value)) throw NOT_PLAIN;
  open.add(value);
  hashContainer(digest, value, open);
  open.delete(value);
}

function hashContainer(digest: Digest, value: object, open: Open): void {
  if (Array.isArray(value)) {
    const items: unknown[] = value;
    if (!isDense(items)) throw NOT_PLAIN;
    absorb(digest, TAG_ARRAY);
    absorb(digest, items.length);
    for (const item of items) hashAt(digest, item, open);
    return;
  }
  if (value instanceof Map) {
    absorb(digest, TAG_MAP);
    absorb(digest, value.size);
    for (const [key, entry] of value as Map<unknown, unknown>) {
      hashAt(digest, key, open);
      hashAt(digest, entry, open);
    }
    return;
  }
  if (value instanceof Set) {
    absorb(digest, TAG_SET);
    absorb(digest, value.size);
    for (const entry of value as Set<unknown>) hashAt(digest, entry, open);
    return;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    absorb(digest, TAG_OBJECT);
    absorb(digest, keys.length);
    for (const key of keys) {
      if (key === '__proto__') throw NOT_PLAIN;
      absorbString(digest, key);
      hashAt(digest, value[key], open);
    }
    return;
  }
  throw NOT_PLAIN;
}

/**
 * A fingerprint of a state: 16 hex characters, the same on every device and every run.
 *
 * Two states hash alike when they hold the same data. The order of an OBJECT's keys does not
 * matter. The order of a Map's entries and a Set's items DOES, because iterating them in a
 * different order can make a simulation behave differently. A property set to `undefined` is
 * not the same as a missing one, and -0 is not the same as 0. Not cryptographic: for determinism checks, not for security.
 */
export function hashState(state: unknown): string {
  const digest = createDigest(0x5a17);
  try {
    hashAt(digest, state, new Set());
  } catch (error) {
    explain(error, state);
  }
  return finishHex(digest);
}

// ---------------------------------------------------------------------------------------------
// Freeze

/**
 * Freezes a state all the way down and returns it, so that any later attempt to change it
 * throws (in strict code, which all modules are). It always goes all the way down, including
 * through parts that were already frozen on the surface. Maps and Sets have their changing
 * methods replaced so they throw too. Typed arrays cannot be frozen by the language and are
 * left writable. Throws the same TypeError as `cloneState` on anything that is not plain
 * data, before freezing anything. Also throws, naming the place, on a Map or Set that was
 * already frozen or made non-extensible by other means: such a Map can still be written to
 * and can no longer be guarded, so it cannot honestly be called frozen. Meant for tests: freeze the input to a step or a view
 * function to prove it is not changed. Too slow for the frame loop.
 */
export function deepFreeze<T>(state: T): T {
  checkAt(state, 'state', new Set(), new WeakSet(), true);
  freezeAt(state, new WeakSet());
  return state;
}

function freezeAt(value: unknown, done: WeakSet<object>): void {
  if (value === null || typeof value !== 'object') return;
  if (isTypedArray(value) || done.has(value)) return;
  done.add(value);
  if (value instanceof Map) {
    // Already guarded by an earlier deepFreeze, or extensible: checkAt made sure of that.
    if (Object.isExtensible(value)) {
      Object.defineProperties(value, {
        set: { value: refuseChange },
        delete: { value: refuseChange },
        clear: { value: refuseChange },
      });
      Object.freeze(value);
    }
    for (const [key, entry] of value as Map<unknown, unknown>) {
      freezeAt(key, done);
      freezeAt(entry, done);
    }
    return;
  }
  if (value instanceof Set) {
    if (Object.isExtensible(value)) {
      Object.defineProperties(value, {
        add: { value: refuseChange },
        delete: { value: refuseChange },
        clear: { value: refuseChange },
      });
      Object.freeze(value);
    }
    for (const entry of value as Set<unknown>) freezeAt(entry, done);
    return;
  }
  Object.freeze(value);
  for (const key of Object.keys(value)) freezeAt((value as Record<string, unknown>)[key], done);
}

// ---------------------------------------------------------------------------------------------
// JSON

// A tagged value is an object with exactly one key, and that key starts with "$".
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function encodeAt(value: unknown, open: Open): Json {
  switch (typeof value) {
    case 'undefined':
      return { $undefined: true };
    case 'boolean':
    case 'string':
      return value;
    case 'number':
      if (Number.isNaN(value)) return { $number: 'NaN' };
      if (value === Number.POSITIVE_INFINITY) return { $number: 'Infinity' };
      if (value === Number.NEGATIVE_INFINITY) return { $number: '-Infinity' };
      if (Object.is(value, -0)) return { $number: '-0' };
      return value;
    case 'bigint':
      return { $bigint: value.toString() };
    case 'function':
    case 'symbol':
      throw NOT_PLAIN;
    case 'object':
      break;
  }
  if (value === null) return null;
  if (isTypedArray(value)) {
    const values: Json[] = [];
    for (const element of value) values.push(encodeAt(element, open));
    return { $typed: [Object.prototype.toString.call(value).slice(8, -1), values] };
  }
  if (open.has(value)) throw NOT_PLAIN;
  open.add(value);
  let result: Json;
  if (Array.isArray(value)) {
    const items: unknown[] = value;
    if (!isDense(items)) throw NOT_PLAIN;
    result = items.map((item) => encodeAt(item, open));
  } else if (value instanceof Map) {
    const entries: Json[] = [];
    for (const [key, entry] of value as Map<unknown, unknown>) entries.push([encodeAt(key, open), encodeAt(entry, open)]);
    result = { $map: entries };
  } else if (value instanceof Set) {
    const items: Json[] = [];
    for (const entry of value as Set<unknown>) items.push(encodeAt(entry, open));
    result = { $set: items };
  } else if (isPlainObject(value)) {
    const keys = Object.keys(value);
    const entries: [string, Json][] = [];
    let escape = Object.getPrototypeOf(value) === null;
    for (const key of keys) {
      if (key === '__proto__') throw NOT_PLAIN;
      if (key.startsWith('$')) escape = true;
      entries.push([key, encodeAt(value[key], open)]);
    }
    if (escape) {
      // A key that looks like a tag, or an object with no prototype: spell it out.
      result = { [Object.getPrototypeOf(value) === null ? '$bare' : '$object']: entries };
    } else {
      const plain: Record<string, Json> = {};
      for (const [key, entry] of entries) plain[key] = entry;
      result = plain;
    }
  } else {
    throw NOT_PLAIN;
  }
  open.delete(value);
  return result;
}

/**
 * Turns a state into data that `JSON.stringify` keeps exactly: Maps, Sets, typed arrays,
 * bigints, `undefined`, -0, NaN and the infinities become small tagged objects such as
 * `{ "$map": [[key, value], ...] }`. `decodeState` reverses it, and the result has the same
 * `hashState` as the original. For saving recordings and states as files or in storage.
 */
export function encodeState(state: unknown): unknown {
  try {
    return encodeAt(state, new Set());
  } catch (error) {
    return explain(error, state);
  }
}

const TYPED_ARRAYS = {
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
};

function badEncoding(what: string): TypeError {
  return new TypeError(`decodeState: not something encodeState produced (${what})`);
}

function decodeEntries(body: unknown, tag: string): [unknown, unknown][] {
  if (!Array.isArray(body)) throw badEncoding(`${tag} needs a list`);
  return (body as unknown[]).map((pair) => {
    if (!Array.isArray(pair) || pair.length !== 2) throw badEncoding(`${tag} needs [key, value] pairs`);
    const [key, entry] = pair as [unknown, unknown];
    return [decodeAt(key), decodeAt(entry)];
  });
}

function decodeTagged(tag: string, body: unknown): unknown {
  switch (tag) {
    case '$undefined':
      return undefined;
    case '$number':
      if (body === 'NaN') return Number.NaN;
      if (body === 'Infinity') return Number.POSITIVE_INFINITY;
      if (body === '-Infinity') return Number.NEGATIVE_INFINITY;
      if (body === '-0') return -0;
      throw badEncoding('unknown $number');
    case '$bigint':
      if (typeof body !== 'string' || !/^-?\d+$/.test(body)) throw badEncoding('bad $bigint');
      return BigInt(body);
    case '$map':
      return new Map(decodeEntries(body, tag));
    case '$set': {
      if (!Array.isArray(body)) throw badEncoding('$set needs a list');
      return new Set((body as unknown[]).map((item) => decodeAt(item)));
    }
    case '$object':
    case '$bare': {
      const target: Record<string, unknown> = tag === '$bare' ? (Object.create(null) as Record<string, unknown>) : {};
      for (const [key, entry] of decodeEntries(body, tag)) {
        if (typeof key !== 'string' || key === '__proto__') throw badEncoding(`bad key in ${tag}`);
        target[key] = entry;
      }
      return target;
    }
    case '$typed': {
      if (!Array.isArray(body) || body.length !== 2) throw badEncoding('$typed needs [name, values]');
      const [name, values] = body as [unknown, unknown];
      if (typeof name !== 'string' || !Array.isArray(values)) throw badEncoding('$typed needs [name, values]');
      const decoded = (values as unknown[]).map((item) => decodeAt(item));
      if (name === 'BigInt64Array' || name === 'BigUint64Array') {
        if (!decoded.every((item) => typeof item === 'bigint')) throw badEncoding(`${name} needs bigints`);
        return name === 'BigInt64Array' ? BigInt64Array.from(decoded) : BigUint64Array.from(decoded);
      }
      if (!Object.hasOwn(TYPED_ARRAYS, name)) throw badEncoding(`unknown typed array ${name}`);
      if (!decoded.every((item) => typeof item === 'number')) throw badEncoding(`${name} needs numbers`);
      return TYPED_ARRAYS[name as keyof typeof TYPED_ARRAYS].from(decoded);
    }
    default:
      throw badEncoding(`unknown tag ${tag}`);
  }
}

function decodeAt(value: unknown): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value !== 'object') throw badEncoding(`a ${typeof value}`);
  if (Array.isArray(value)) return (value as unknown[]).map((item) => decodeAt(item));
  const source = value as Record<string, unknown>;
  const keys = Object.keys(source);
  const only = keys.length === 1 ? keys[0] : undefined;
  if (only?.startsWith('$') === true) return decodeTagged(only, source[only]);
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (key === '__proto__' || key.startsWith('$')) throw badEncoding(`unexpected key ${key}`);
    result[key] = decodeAt(source[key]);
  }
  return result;
}

/** Reverses `encodeState`. Throws a TypeError on anything `encodeState` could not have made. */
export function decodeState(encoded: unknown): unknown {
  return decodeAt(encoded);
}
