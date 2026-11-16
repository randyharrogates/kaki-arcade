import { describe, expect, it } from 'vitest';

import { cloneState, decodeState, deepFreeze, encodeState, hashState } from './snapshot';

function sample(): {
  tick: number;
  name: string;
  flags: boolean[];
  nothing: null;
  players: Map<string, { x: number; y: number; hand: string[] }>;
  done: Set<number>;
  grid: Uint8Array;
  nested: { deep: { deeper: number[] } };
} {
  return {
    tick: 12,
    name: 'kopi',
    flags: [true, false],
    nothing: null,
    players: new Map([
      ['p1', { x: 1.5, y: -2, hand: ['a', 'b'] }],
      ['p2', { x: 0, y: 0, hand: [] }],
    ]),
    done: new Set([3, 1, 2]),
    grid: new Uint8Array([1, 2, 3, 4]),
    nested: { deep: { deeper: [1, 2, 3] } },
  };
}

describe('hashState', () => {
  it('known answers (these must never change)', () => {
    // If one of these fails, every recorded replay's hashes are invalid. Undo the change.
    expect(hashState(null)).toBe('43eab555b1520436');
    expect(hashState(undefined)).toBe('dffa32d1664c1c65');
    expect(hashState(0)).toBe('01ac82b6e7d002d3');
    expect(hashState(-0)).toBe('9ca62b05e4ba3560');
    expect(hashState(1)).toBe('d63ea5e7fc231e23');
    expect(hashState('a')).toBe('103aef3f400c861e');
    expect(hashState('')).toBe('1de2e6524f0964e0');
    expect(hashState([])).toBe('a6d331efe9635072');
    expect(hashState({})).toBe('25e7169cf76df3aa');
    expect(hashState({ a: 1, b: [true, null, 'x'] })).toBe('e4d21e5dfbf3fb20');
    expect(hashState(new Map([[1, 'a']]))).toBe('9eff7db5be991b35');
    expect(hashState(new Set([1]))).toBe('e00dca5bc2e9ef85');
    expect(hashState(new Uint8Array([1, 2, 3]))).toBe('9d79bbb1cd06d6ba');
    expect(hashState(10n)).toBe('a7e6bd9cb828cb7a');
    expect(hashState(Number.NaN)).toBe('f0649f3df18cd942');
  });

  it('is 16 lower-case hex characters and repeatable', () => {
    const hash = hashState(sample());
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(hashState(sample())).toBe(hash);
  });

  it('ignores the order of object keys', () => {
    expect(hashState({ a: 1, b: { c: 2, d: 3 } })).toBe(hashState({ b: { d: 3, c: 2 }, a: 1 }));
  });

  it('depends on the order of Map entries and Set items', () => {
    const ab = new Map([['a', 1], ['b', 2]]);
    const ba = new Map([['b', 2], ['a', 1]]);
    expect(hashState(ab)).not.toBe(hashState(ba));
    expect(hashState(new Set([1, 2]))).not.toBe(hashState(new Set([2, 1])));
  });

  it('changes when any leaf changes', () => {
    const base = hashState(sample());
    const edits: ((state: ReturnType<typeof sample>) => void)[] = [
      (s) => (s.tick += 1),
      (s) => (s.name = 'kopi '),
      (s) => (s.flags[1] = true),
      (s) => s.flags.push(false),
      (s) => ((s.players.get('p1') as { x: number }).x += 1e-12),
      (s) => (s.players.get('p2') as { hand: string[] }).hand.push(''),
      (s) => s.players.delete('p2'),
      (s) => s.done.add(4),
      (s) => (s.grid[3] = 5),
      (s) => (s.nested.deep.deeper[0] = -1),
    ];
    const hashes = new Set([base]);
    for (const edit of edits) {
      const state = sample();
      edit(state);
      hashes.add(hashState(state));
    }
    expect(hashes.size).toBe(edits.length + 1);
  });

  it('tells apart values that look alike', () => {
    const lookalikes: unknown[] = [
      0,
      -0,
      '0',
      false,
      null,
      undefined,
      [],
      {},
      [0],
      ['0'],
      [[]],
      [[], []],
      { a: undefined },
      { a: null },
      { length: 0 },
      '',
      ' ',
      'ab',
      ['a', 'b'],
      ['ab'],
      [1, [2, 3]],
      [[1, 2], 3],
      [1, 2, 3],
      new Map(),
      new Set(),
      new Map([['a', 1]]),
      { a: 1 },
      new Set(['a', 1]),
      ['a', 1],
      new Uint8Array([1, 2]),
      new Uint16Array([1, 2]),
      new Float64Array([1, 2]),
      [1, 2],
      1n,
      1,
      '1',
      true,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER - 1,
      0.1 + 0.2,
      0.3,
    ];
    const hashes = new Set(lookalikes.map((value) => hashState(value)));
    expect(hashes.size).toBe(lookalikes.length);
  });

  it('hashes every not-a-number alike', () => {
    expect(hashState(0 / 0)).toBe(hashState(Number.NaN));
    expect(hashState(Math.sqrt(-1))).toBe(hashState(Number.NaN));
  });

  it('has no collisions across 200,000 small distinct states', () => {
    const hashes = new Set<string>();
    for (let x = 0; x < 200_000; x += 1) hashes.add(hashState({ tick: x >> 4, p: [x & 15, x] }));
    expect(hashes.size).toBe(200_000);
  });

  it('refuses things that are not plain data, naming where they are', () => {
    class Cook {
      x = 1;
    }
    expect(() => hashState({ a: [0, { cook: new Cook() }] })).toThrow(/state\.a\[1\]\.cook/);
    expect(() => hashState({ fn: () => 1 })).toThrow(/a function at state\.fn/);
    expect(() => hashState([Symbol('s')])).toThrow(/a symbol at state\[0\]/);
    expect(() => hashState({ when: new Date(0) })).toThrow(/\[object Date\] at state\.when/);
    expect(() => hashState(new Map([['k', /x/]]))).toThrow(TypeError);
  });

  it('refuses a state that refers to itself, naming where', () => {
    const loop: { self?: unknown } = {};
    loop.self = loop;
    expect(() => hashState(loop)).toThrow(/refers to itself: state\.self/);
    expect(() => cloneState(loop)).toThrow(/refers to itself: state\.self/);
    const a: { b: { list: unknown[] } } = { b: { list: [] } };
    a.b.list.push(new Map([['back', a]]));
    expect(() => hashState(a)).toThrow(/refers to itself: state\.b\.list\[0\]<back>/);
    expect(() => cloneState(a)).toThrow(/refers to itself: state\.b\.list\[0\]<back>/);
  });

  it('accepts one object used in two places (that is not a cycle)', () => {
    const shared = { n: [1, 2] };
    const state = { a: shared, b: shared, m: new Map([['x', shared]]) };
    expect(hashState(state)).toBe(hashState({ a: { n: [1, 2] }, b: { n: [1, 2] }, m: new Map([['x', { n: [1, 2] }]]) }));
    const copy = cloneState(state);
    expect(copy).toEqual(state);
    expect(copy.a).not.toBe(copy.b);
  });

  it('handles nesting far deeper than any real state (the only limit is the engine\'s call stack)', () => {
    let deep: unknown = 0;
    for (let i = 0; i < 500; i += 1) deep = i % 2 === 0 ? [deep] : { d: deep };
    expect(hashState(deep)).toMatch(/^[0-9a-f]{16}$/);
    expect(hashState(cloneState(deep))).toBe(hashState(deep));
  });

  it('refuses an array with a hole or an extra property, naming where', () => {
    // eslint-disable-next-line no-sparse-arrays -- a hole is the thing under test
    const holed = { rows: [[1, , 3]] };
    expect(() => hashState(holed)).toThrow(/an array with a hole at state\.rows\[0\]\[1\]/);
    expect(() => cloneState(holed)).toThrow(/an array with a hole at state\.rows\[0\]\[1\]/);
    expect(() => deepFreeze(holed)).toThrow(/an array with a hole at state\.rows\[0\]\[1\]/);
    const long: number[] = [];
    long.length = 3;
    expect(() => hashState(long)).toThrow(/a hole at state\[0\]/);

    const tagged: number[] & { label?: string } = [1, 2];
    tagged.label = 'x';
    expect(() => hashState({ tagged })).toThrow(/an array with an extra property at state\.tagged\.label/);
    expect(() => cloneState({ tagged })).toThrow(/an extra property at state\.tagged\.label/);
    // One hole and one extra property: the counts match, and it is still refused.
    const both: number[] & { extra?: number } = [1, 2];
    // eslint-disable-next-line @typescript-eslint/no-array-delete -- making a hole on purpose
    delete both[0];
    both.extra = 1;
    expect(() => hashState(both)).toThrow(/a hole at state\[0\]/);
  });

  it('refuses an own property named __proto__, naming where', () => {
    const parsed = JSON.parse('{"__proto__":{"x":1},"a":1}') as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(['__proto__', 'a']);
    expect(() => cloneState(parsed)).toThrow(/a property named "__proto__" at state\.__proto__/);
    expect(() => hashState(parsed)).toThrow(/a property named "__proto__" at state\.__proto__/);
    expect(() => deepFreeze(parsed)).toThrow(/a property named "__proto__" at state\.__proto__/);
    expect(() => encodeState(parsed)).toThrow(/a property named "__proto__" at state\.__proto__/);
    expect(Object.isFrozen(parsed)).toBe(false);
    const nested = { players: new Map([['p1', [parsed]]]) };
    expect(() => cloneState(nested)).toThrow(/at state\.players<p1>\[0\]\.__proto__/);
    expect(() => hashState(nested)).toThrow(/at state\.players<p1>\[0\]\.__proto__/);
    // The ordinary prototype link is not an own property and is fine.
    expect(hashState({ a: 1 })).toBe(hashState(cloneState({ a: 1 })));
  });

  it('supports 64-bit integer arrays', () => {
    expect(hashState(new BigInt64Array([1n, -2n]))).toBe('acf30080ec83294e');
    expect(hashState(new BigUint64Array([1n, 2n]))).toBe('3f008d97d420edc7');
    expect(hashState(new BigInt64Array([1n, 2n]))).not.toBe(hashState(new BigUint64Array([1n, 2n])));
    expect(hashState(new BigInt64Array([1n, -2n]))).not.toBe(hashState(new BigInt64Array([1n, 2n])));
    const state = { big: new BigInt64Array([5n, -6n]) };
    const copy = cloneState(state);
    expect(copy.big).toBeInstanceOf(BigInt64Array);
    expect([...copy.big]).toEqual([5n, -6n]);
    expect(copy.big).not.toBe(state.big);
    expect(hashState(copy)).toBe(hashState(state));
    expect(Object.isFrozen(deepFreeze(state))).toBe(true);
  });
});

describe('cloneState', () => {
  it('copies everything and shares nothing', () => {
    const original = sample();
    const copy = cloneState(original);
    expect(copy).toEqual(original);
    expect(hashState(copy)).toBe(hashState(original));
    expect(copy).not.toBe(original);
    expect(copy.flags).not.toBe(original.flags);
    expect(copy.players).not.toBe(original.players);
    expect(copy.players.get('p1')).not.toBe(original.players.get('p1'));
    expect(copy.players.get('p1')?.hand).not.toBe(original.players.get('p1')?.hand);
    expect(copy.done).not.toBe(original.done);
    expect(copy.grid).not.toBe(original.grid);
    expect(copy.grid.buffer).not.toBe(original.grid.buffer);
    expect(copy.nested.deep.deeper).not.toBe(original.nested.deep.deeper);

    const before = hashState(original);
    copy.tick = 99;
    copy.players.get('p1')?.hand.push('z');
    copy.done.clear();
    copy.grid[0] = 200;
    copy.nested.deep.deeper.length = 0;
    expect(hashState(original)).toBe(before);
  });

  it('keeps types and order', () => {
    const copy = cloneState(sample());
    expect(copy.players).toBeInstanceOf(Map);
    expect([...copy.players.keys()]).toEqual(['p1', 'p2']);
    expect([...copy.done]).toEqual([3, 1, 2]);
    expect(copy.grid).toBeInstanceOf(Uint8Array);
    expect(Object.keys(cloneState({ z: 1, a: 2, m: 3 }))).toEqual(['z', 'a', 'm']);
  });

  it('passes simple values through, and keeps undefined and objects with no prototype', () => {
    expect(cloneState(5)).toBe(5);
    expect(cloneState('x')).toBe('x');
    expect(cloneState(null)).toBeNull();
    expect(cloneState<unknown>(undefined)).toBeUndefined();
    expect(cloneState(7n)).toBe(7n);
    const withUndefined = cloneState({ a: undefined });
    expect('a' in withUndefined).toBe(true);
    const bare = Object.create(null) as Record<string, number>;
    bare.k = 1;
    const copy = cloneState(bare);
    expect(Object.getPrototypeOf(copy)).toBeNull();
    expect(copy.k).toBe(1);
  });

  it('can copy a frozen state into one that can be changed', () => {
    const copy = cloneState(deepFreeze(sample()));
    copy.tick += 1;
    copy.players.set('p3', { x: 0, y: 0, hand: [] });
    copy.done.add(9);
    expect(copy.tick).toBe(13);
    expect(copy.players.size).toBe(3);
  });

  it('refuses things that are not plain data', () => {
    expect(() => cloneState({ a: { b: new Date(0) } })).toThrow(/state\.a\.b/);
    expect(() => cloneState([() => 0])).toThrow(/state\[0\]/);
  });
});

describe('deepFreeze', () => {
  it('makes every level throw on change, and returns the same object', () => {
    const state = sample();
    const hash = hashState(state);
    const frozen = deepFreeze(state);
    expect(frozen).toBe(state);
    expect(() => (frozen.tick = 1)).toThrow(TypeError);
    expect(() => frozen.flags.push(true)).toThrow(TypeError);
    expect(() => (frozen.flags[0] = false)).toThrow(TypeError);
    expect(() => ((frozen.players.get('p1') as { x: number }).x = 9)).toThrow(TypeError);
    expect(() => frozen.players.get('p1')?.hand.push('c')).toThrow(TypeError);
    expect(() => (frozen.nested.deep.deeper[0] = 9)).toThrow(TypeError);
    expect(() => ((frozen as { extra?: number }).extra = 1)).toThrow(TypeError);
    expect(() => delete (frozen as { name?: string }).name).toThrow(TypeError);
    expect(hashState(frozen)).toBe(hash);
  });

  it('makes Maps and Sets throw on change but still readable', () => {
    const frozen = deepFreeze(sample());
    expect(() => frozen.players.set('p3', { x: 0, y: 0, hand: [] })).toThrow(/frozen/);
    expect(() => frozen.players.delete('p1')).toThrow(/frozen/);
    expect(() => {
      frozen.players.clear();
    }).toThrow(/frozen/);
    expect(() => frozen.done.add(9)).toThrow(/frozen/);
    expect(() => frozen.done.delete(1)).toThrow(/frozen/);
    expect(() => {
      frozen.done.clear();
    }).toThrow(/frozen/);
    expect(frozen.players.get('p2')).toEqual({ x: 0, y: 0, hand: [] });
    expect(frozen.done.has(3)).toBe(true);
    expect([...frozen.players.keys()]).toEqual(['p1', 'p2']);
  });

  it('copes with simple values and with one object used in two places', () => {
    expect(deepFreeze(3)).toBe(3);
    expect(deepFreeze(null)).toBeNull();
    const shared = { n: [1] };
    const state = { a: shared, b: shared, list: [shared, shared] };
    expect(Object.isFrozen(deepFreeze(state))).toBe(true);
    expect(Object.isFrozen(shared)).toBe(true);
    expect(Object.isFrozen(shared.n)).toBe(true);
    expect(deepFreeze(state)).toBe(state);
  });

  it('goes all the way down through a value that is already frozen on the surface', () => {
    const state = Object.freeze({ cooks: [{ x: 1 }] });
    deepFreeze(state);
    expect(() => state.cooks.push({ x: 2 })).toThrow(TypeError);
    expect(() => ((state.cooks[0] as { x: number }).x = 9)).toThrow(TypeError);
    expect(state.cooks).toEqual([{ x: 1 }]);
  });

  it('freezes a shallow-frozen level table embedded in a state, at any depth and inside Maps and Sets', () => {
    const level = Object.freeze({ name: 'kopitiam', tiles: [[0, 1], [1, 0]], spawn: { x: 1, y: 2 } });
    const frozenMap = new Map([['k', Object.freeze({ hits: [1] })]]);
    const frozenSet = new Set([Object.freeze({ id: [7] })]);
    const state = { tick: 0, level, inner: Object.freeze({ again: Object.freeze([{ deep: { n: 1 } }]) }), frozenMap, frozenSet };
    deepFreeze(state);
    expect(() => level.tiles.push([9])).toThrow(TypeError);
    expect(() => level.tiles[0]?.push(9)).toThrow(TypeError);
    expect(() => (level.spawn.x = 9)).toThrow(TypeError);
    expect(() => ((state.inner.again[0] as { deep: { n: number } }).deep.n = 2)).toThrow(TypeError);
    expect(() => frozenMap.get('k')?.hits.push(2)).toThrow(TypeError);
    expect(() => [...frozenSet][0]?.id.push(8)).toThrow(TypeError);
    // A purity check built on freezing now really catches a step that writes into the table.
    const badStep = (s: typeof state): typeof state => {
      s.level.tiles[1]?.fill(5);
      return s;
    };
    expect(() => badStep(state)).toThrow(TypeError);
  });

  it('refuses a Map that was frozen by hand: it is still writable and can no longer be guarded', () => {
    const m = Object.freeze(new Map([['a', 1]]));
    const state = { tick: 0, inner: { m } };
    expect(() => deepFreeze(state)).toThrow(/cannot make the Map at state\.inner\.m read-only/);
    expect(() => deepFreeze(state)).toThrow(TypeError);
    // Nothing was frozen, and the reason for refusing is real: the Map does take writes.
    expect(Object.isFrozen(state)).toBe(false);
    m.set('b', 2);
    expect(m.size).toBe(2);
  });

  it('refuses a Set that was frozen by hand', () => {
    const s = Object.freeze(new Set([1]));
    expect(() => deepFreeze({ list: [s] })).toThrow(/cannot make the Set at state\.list\[0\] read-only/);
    s.add(2);
    expect(s.has(2)).toBe(true);
  });

  it('refuses a Set or Map that was sealed or made non-extensible', () => {
    const s = Object.preventExtensions(new Set([1]));
    expect(() => deepFreeze({ s })).toThrow(/cannot make the Set at state\.s read-only/);
    const sealed = Object.seal(new Map([[1, 1]]));
    expect(() => deepFreeze(new Map([['k', sealed]]))).toThrow(/cannot make the Map at state<k> read-only/);
    expect(() => deepFreeze(Object.preventExtensions(new Map()))).toThrow(/cannot make the Map at state read-only/);
  });

  it('accepts a Map or Set it froze itself, any number of times, and they stay read-only', () => {
    const state = { m: new Map([['a', { n: 1 }]]), s: new Set([1]) };
    deepFreeze(state);
    deepFreeze(state);
    deepFreeze({ wrapped: state, again: state.m });
    expect(() => state.m.set('b', { n: 2 })).toThrow(/frozen/);
    expect(() => state.s.add(2)).toThrow(/frozen/);
    expect(() => ((state.m.get('a') as { n: number }).n = 2)).toThrow(TypeError);
  });

  it('refuses what is not plain data, naming where it is, and freezes nothing when it does', () => {
    class Cook {
      x = 1;
    }
    const withInstance = { ok: { n: 1 }, cooks: [{ who: new Cook() }] };
    expect(() => deepFreeze(withInstance)).toThrow(/found \[object Object\] at state\.cooks\[0\]\.who/);
    expect(Object.isFrozen(withInstance)).toBe(false);
    expect(Object.isFrozen(withInstance.ok)).toBe(false);
    expect(() => deepFreeze({ on: { done: () => 1 } })).toThrow(/a function at state\.on\.done/);
    expect(() => deepFreeze(new Map([['p1', { when: new Date(0) }]]))).toThrow(/\[object Date\] at state<p1>\.when/);
    expect(() => deepFreeze([Symbol('s')])).toThrow(/a symbol at state\[0\]/);
    const loop: { self?: unknown } = {};
    loop.self = loop;
    expect(() => deepFreeze(loop)).toThrow(/refers to itself: state\.self/);
  });

  it('leaves typed arrays writable (the language cannot freeze them)', () => {
    const frozen = deepFreeze({ grid: new Uint8Array([1, 2]) });
    frozen.grid[0] = 9;
    expect(frozen.grid[0]).toBe(9);
    expect(() => ((frozen as { grid: unknown }).grid = null)).toThrow(TypeError);
  });
});

describe('encodeState and decodeState', () => {
  function roundTrip(value: unknown): unknown {
    return decodeState(JSON.parse(JSON.stringify(encodeState(value))));
  }

  it('a state survives JSON with the same hash, types and order', () => {
    const state = sample();
    const back = roundTrip(state) as ReturnType<typeof sample>;
    expect(hashState(back)).toBe(hashState(state));
    expect(back).toEqual(state);
    expect(back.players).toBeInstanceOf(Map);
    expect([...back.players.keys()]).toEqual(['p1', 'p2']);
    expect([...back.done]).toEqual([3, 1, 2]);
    expect(back.grid).toBeInstanceOf(Uint8Array);
  });

  it('keeps what plain JSON loses', () => {
    const awkward = {
      nothing: undefined,
      list: [undefined, -0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, 1.5],
      big: 12345678901234567890n,
      nested: new Map<unknown, unknown>([
        [1, new Set(['a', new Map([['deep', new Float64Array([0.1, -0, Number.NaN])]])])],
        [{ key: 'object' }, [new BigInt64Array([1n, -2n]), new BigUint64Array([3n])]],
      ]),
      typed: [new Int8Array([-1]), new Uint8ClampedArray([255]), new Int16Array([-2]), new Uint16Array([2]), new Int32Array([-3]), new Uint32Array([3]), new Float32Array([0.5])],
    };
    const back = roundTrip(awkward) as typeof awkward;
    expect(hashState(back)).toBe(hashState(awkward));
    expect('nothing' in back).toBe(true);
    expect(Object.is(back.list[1], -0)).toBe(true);
    expect(back.big).toBe(12345678901234567890n);
    expect(back.typed.map((array) => array.constructor.name)).toEqual(awkward.typed.map((array) => array.constructor.name));
  });

  it('keeps objects whose keys look like its own tags, and objects with no prototype', () => {
    const bare = Object.create(null) as Record<string, number>;
    bare.k = 1;
    const tricky = { a: { $map: [[1, 2]] }, b: { $undefined: true }, c: { $x: 1, y: 2 }, d: bare, e: { $number: 'NaN' } };
    const back = roundTrip(tricky) as typeof tricky;
    expect(hashState(back)).toBe(hashState(tricky));
    expect(back.a).toEqual({ $map: [[1, 2]] });
    expect(back.a).not.toBeInstanceOf(Map);
    expect(back.b).toEqual({ $undefined: true });
    expect(Object.getPrototypeOf(back.d)).toBeNull();
  });

  it('leaves JSON-safe data as it is', () => {
    const plain = { a: 1, b: 'x', c: [true, null, { d: 0.5 }] };
    expect(encodeState(plain)).toEqual(plain);
    expect(decodeState(plain)).toEqual(plain);
  });

  it('refuses what is not plain data, and encodings it did not make', () => {
    expect(() => encodeState({ a: [() => 1] })).toThrow(/a function at state\.a\[0\]/);
    const loop: { self?: unknown } = {};
    loop.self = loop;
    expect(() => encodeState(loop)).toThrow(/refers to itself/);
    for (const bad of [{ $nope: 1 }, { $map: 3 }, { $map: [[1]] }, { $set: 1 }, { $number: 'seven' }, { $bigint: '1.5' }, { $typed: ['Nope', []] }, { $typed: ['Uint8Array', ['x']] }, { $typed: ['BigInt64Array', [1]] }, { $object: [[1, 2]] }, { a: 1, $b: 2 }, { $object: [['__proto__', 1]] }]) {
      expect(() => decodeState(bad), JSON.stringify(bad)).toThrow(/decodeState/);
    }
  });
});
