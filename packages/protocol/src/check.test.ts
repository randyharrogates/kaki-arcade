import { describe, expect, it } from 'vitest';

import { BAD, BIG, boundedText, int, json, kinds, list, nullable, oneOf, record, text, utf8Length } from './check';
import { acceptedName, peerId, roomCode, token } from './fields';
import { MAX_JSON_DEPTH } from './limits';

const encoder = new TextEncoder();

describe('utf8Length', () => {
  it('matches a real encoder, lone surrogates included', () => {
    const samples = [
      '',
      'kaki',
      'é',
      'ñandú',
      '漢字',
      '🍜',
      'a🍜b',
      '\ud83c',
      '\udf5c',
      'x\ud83cy',
      '\ud83c🍜',
      '߿ࠀ￿',
    ];
    for (const sample of samples) {
      expect(utf8Length(sample), JSON.stringify(sample)).toBe(encoder.encode(sample).length);
    }
  });
});

describe('simple checks', () => {
  it('int takes whole numbers in range only', () => {
    const check = int(1, 8);
    expect(check(1)).toBe(1);
    expect(check(8)).toBe(8);
    for (const bad of [0, 9, 1.5, NaN, Infinity, '3', null, undefined, [3]]) {
      expect(check(bad)).toBe(BAD);
    }
  });

  it('text tells too long from wrong', () => {
    const check = text(2, 4, /^[a-z]+$/);
    expect(check('abc')).toBe('abc');
    expect(check('a')).toBe(BAD);
    expect(check('ABC')).toBe(BAD);
    expect(check(7)).toBe(BAD);
    expect(check('abcde')).toBe(BIG);
  });

  it('oneOf, nullable and list', () => {
    const colour = oneOf(['red', 'blue']);
    expect(colour('red')).toBe('red');
    expect(colour('green')).toBe(BAD);
    expect(colour('toString')).toBe(BAD);
    expect(nullable(colour)(undefined)).toBeNull();
    expect(nullable(colour)(null)).toBeNull();
    expect(nullable(colour)('green')).toBe(BAD);
    const colours = list(colour, 2);
    expect(colours(['red', 'blue'])).toEqual(['red', 'blue']);
    expect(colours(['red', 'green'])).toBe(BAD);
    expect(colours(['red', 'blue', 'red'])).toBe(BIG);
    expect(colours('red')).toBe(BAD);
    expect(list(colour, 2, 1)([])).toBe(BAD);
    expect(list(colour, 2, 1)(['red'])).toEqual(['red']);
  });

  it('boundedText counts bytes as they sit in a JSON message', () => {
    const check = boundedText(1, 6);
    expect(check('abcdef')).toBe('abcdef');
    expect(check('abcdefg')).toBe(BIG);
    expect(check('')).toBe(BAD);
    expect(check(6)).toBe(BAD);
    // Three characters, but six bytes escaped (\r \n \") and six as UTF-8 (two 3-byte ones).
    expect(check('\r\n"')).toBe('\r\n"');
    expect(check('\r\n"x')).toBe(BIG);
    expect(check('漢字')).toBe('漢字');
    expect(check('漢字x')).toBe(BIG);
    // A control character is six bytes once escaped.
    expect(check('\u0001')).toBe('\u0001');
    expect(check('\u0001x')).toBe(BIG);
  });

  it('record keeps only the named fields', () => {
    const check = record<{ a: number }>({ a: int(0, 9) });
    expect(check({ a: 1, extra: true })).toEqual({ a: 1 });
    expect(check({})).toBe(BAD);
    expect(check([])).toBe(BAD);
    expect(check(null)).toBe(BAD);
  });

  it('kinds refuses an unknown kind, including names every object has', () => {
    type Shape = { kind: 'dot' } | { kind: 'line'; length: number };
    const check = kinds<Shape>({ dot: {}, line: { length: int(0, 9) } });
    expect(check({ kind: 'line', length: 3 })).toEqual({ kind: 'line', length: 3 });
    expect(check({ kind: 'line' })).toBe(BAD);
    expect(check({ kind: 'circle' })).toBe(BAD);
    expect(check({ kind: 'constructor' })).toBe(BAD);
    expect(check({ kind: 7 })).toBe(BAD);
  });
});

describe('identifiers and names', () => {
  it('room codes, tokens and peer ids', () => {
    expect(roomCode('K4KI')).toBe('K4KI');
    expect(roomCode('kaki')).toBe(BAD);
    expect(roomCode('ABC')).toBe(BAD);
    expect(roomCode('ABCDEFGHJ')).toBe(BIG);
    expect(roomCode('AB CD')).toBe(BAD);
    expect(token('a'.repeat(16))).toBe('a'.repeat(16));
    expect(token('a'.repeat(15))).toBe(BAD);
    expect(token('a'.repeat(129))).toBe(BIG);
    expect(token('a'.repeat(15) + '!')).toBe(BAD);
    expect(token('a'.repeat(16) + '\n')).toBe(BAD);
    expect(peerId('p-1')).toBe('p-1');
    expect(peerId('')).toBe(BAD);
  });

  it('a name the host sends is checked for content, not for its count of visible characters', () => {
    expect(acceptedName('Ah Beng')).toBe('Ah Beng');
    expect(acceptedName('Mei 🍜')).toBe('Mei 🍜');
    // Thirteen visible characters: the host has already counted, the phone does not count again.
    expect(acceptedName('abcdefghijklm')).toBe('abcdefghijklm');
    expect(acceptedName('x'.repeat(48))).toBe('x'.repeat(48));
    expect(acceptedName('x'.repeat(49))).toBe(BIG);
    expect(acceptedName('x'.repeat(1000))).toBe(BIG);
    for (const bad of ['', '   ', '\u3164', 'a\u202eb', 'a\u200bb', 'a\nb', 'a\ud83c', '\u200dab', 12, null]) {
      expect(acceptedName(bad), JSON.stringify(bad)).toBe(BAD);
    }
  });
});

describe('json', () => {
  const size = (value: unknown): number => encoder.encode(JSON.stringify(value)).length;

  it('measures a payload exactly as compact UTF-8 JSON', () => {
    const payloads = [
      null,
      true,
      false,
      0,
      -12.5,
      1e21,
      'plain',
      'quote " and \\ and \n and 🍜 and é',
      [],
      {},
      [1, 'two', [3, null], { four: 4 }],
      { parts: ['stick', 'a', 'b'], panel: { kind: 'cards', cards: ['7♠', 'K♥'] }, 'ké"y': '' },
    ];
    for (const payload of payloads) {
      const bytes = size(payload);
      expect(json(bytes)(payload), JSON.stringify(payload)).toEqual(payload);
      if (bytes > 0) expect(json(bytes - 1)(payload), JSON.stringify(payload)).toBe(BIG);
    }
  });

  it('returns a copy, not the value it was given', () => {
    const payload = { a: [1, { b: 2 }] };
    const copy = json(100)(payload);
    expect(copy).toEqual(payload);
    expect(copy).not.toBe(payload);
  });

  it('refuses what JSON cannot carry', () => {
    const check = json(1000);
    class Card {
      rank = 7;
    }
    for (const bad of [undefined, NaN, Infinity, 10n, Symbol('x'), () => 1, new Card(), new Date(0), new Map()]) {
      expect(check(bad)).toBe(BAD);
      expect(check({ inner: [bad] })).toBe(BAD);
    }
    expect(check(JSON.parse('{"__proto__":{"polluted":true}}'))).toBe(BAD);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('accepts an object with no prototype', () => {
    const bare = Object.assign(Object.create(null) as Record<string, unknown>, { a: 1 });
    expect(json(100)(bare)).toEqual({ a: 1 });
  });

  it('stops at the depth cap, and at a value that contains itself', () => {
    let nested: unknown = 0;
    for (let i = 0; i < MAX_JSON_DEPTH; i += 1) nested = [nested];
    expect(json(1000)(nested)).not.toBe(BIG);
    expect(json(1000)([nested])).toBe(BIG);
    const loop: unknown[] = [];
    loop.push(loop);
    expect(json(1_000_000)(loop)).toBe(BIG);
  });
});
