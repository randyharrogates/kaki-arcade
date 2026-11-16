import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cloneState, createRng, deepFreeze, hashState, nextInt } from '@kaki/sim-core';
import type { SampledInput } from '@kaki/sim-core';
import { BUTTON, createTick, EMPTY_SETUP, STEP_MS } from '@kaki/platform';
import { ROUND_STEPS, tabaoRush } from '../game';
import { FLOOR_LIMIT, heldItem, THROW_STEPS } from '../items';
import { items, inventory, COOK_RADIUS } from '../state';
import type { Item, Level, TabaoState } from '../state';
import { tileAt } from '../level';
import { targetTile } from '../target';
import { build, MAPS } from './maps';

const players = Array.from({ length: 8 }, (_, i) => ({ id: `p${String(i + 1)}`,
  seat: i + 1, name: `C${String(i + 1)}`, colour: 'seat-1' as const }));
const CROSS = 1 << BUTTON.FACE_BOTTOM;
const TRIANGLE = 1 << BUTTON.FACE_TOP;
function frame(x: number, y: number, pressed: number): SampledInput {
  return { axes: [x, y, 0, 0], held: pressed, pressed, released: 0, age: 0, seq: 0 };
}
function start(level: Level, count: number): TabaoState {
  let state = { ...tabaoRush.init(42, [], {}, EMPTY_SETUP), level };
  for (const player of players.slice(0, count)) state = tabaoRush.join(state, player);
  return state;
}
function pressed(frames: ReadonlyMap<string, SampledInput>, id: string, mask: number): boolean {
  return ((frames.get(id)?.pressed ?? 0) & mask) !== 0;
}
function checkTransition(before: TabaoState, after: TabaoState, frames: ReadonlyMap<string, SampledInput>) {
  const old = new Map(items(before).map((item) => [item.id, item]));
  const entries = items(after);
  expect(entries).toHaveLength(after.nextItemId);
  expect(new Set(entries.map((item) => item.id)).size).toBe(entries.length);
  const holders = new Set<string>();
  const counters = new Set<number>();
  for (const item of entries) {
    const previous = old.get(item.id);
    const place = item.place;
    if (place.kind === 'held') {
      expect(holders.has(place.cook)).toBe(false); holders.add(place.cook);
      expect(after.cooks.some((cook) => cook.id === place.cook)).toBe(true);
    } else if (place.kind === 'counter') {
      expect(counters.has(place.tile)).toBe(false); counters.add(place.tile);
      expect(after.level.tiles[place.tile]?.kind).toBe('counter');
    } else if (place.kind === 'floor') expect(after.level.tiles[place.tile]?.kind).toBe('floor');
    if (!previous) {
      const owner = place.kind === 'held' ? place.cook : place.kind === 'flight' ? place.thrower : '';
      const cook = before.cooks.find((cook) => cook.id === owner);
      const tile = cook?.targetTile;
      expect(tile === null || tile === undefined ? undefined : before.level.tiles[tile])
        .toMatchObject({ kind: 'station', ingredient: item.ingredient });
      expect(pressed(frames, owner, CROSS)).toBe(true);
    } else {
      expect(item.kind).toBe(previous.kind);
      expect(item.ingredient).toBe(previous.ingredient);
      const from = previous.place;
      if (from.kind === 'flight') {
        if (place.kind === 'flight') expect(place).toBe(from);
        else if (place.kind === 'held') {
          expect(place.cook).not.toBe(from.thrower);
          const cook = after.cooks.find((cook) => cook.id === place.cook);
          if (!cook) throw new Error('Missing catcher');
          const dx = from.end.x - from.start.x, dy = from.end.y - from.start.y;
          const length2 = dx * dx + dy * dy;
          const low = Math.max(0, (after.tick - from.startStep - 1) / from.duration);
          const high = Math.min(1, (after.tick - from.startStep) / from.duration);
          const t = length2 === 0 ? high : Math.max(low, Math.min(high,
            ((cook.x - from.start.x) * dx + (cook.y - from.start.y) * dy) / length2));
          expect(Math.hypot(cook.x - from.start.x - dx * t, cook.y - from.start.y - dy * t))
            .toBeLessThanOrEqual(COOK_RADIUS + 1e-9);
        } else {
          expect(after.tick - from.startStep).toBe(from.duration);
          expect(place).toEqual(from.rest);
        }
      } else if (place !== from) {
        const owner = from.kind === 'held' ? from.cook
          : place.kind === 'held' ? place.cook : place.kind === 'flight' ? place.thrower : '';
        const cook = before.cooks.find((cook) => cook.id === owner);
        if (!cook) throw new Error('Missing actor');
        if (from.kind !== 'held' || place.kind === 'counter') {
          expect(pressed(frames, owner, CROSS)).toBe(true);
          if (from.kind === 'floor') {
            expect(cook.targetTile).toBeNull();
            expect(Math.floor(cook.y) * before.level.width + Math.floor(cook.x)).toBe(from.tile);
          } else if (from.kind === 'counter') expect(cook.targetTile).toBe(from.tile);
          else if (place.kind === 'counter') expect(cook.targetTile).toBe(place.tile);
        }
        if (from.kind === 'held' && place.kind === 'held') {
          const receiver = before.cooks.find((cook) => cook.id === place.cook);
          expect(pressed(frames, from.cook, CROSS)).toBe(true);
          expect(pressed(frames, place.cook, CROSS)).toBe(true);
          expect(cook.targetTile).not.toBeNull();
          expect(receiver?.targetTile).toBe(cook.targetTile);
          expect(cook.targetTile === null ? undefined : before.level.tiles[cook.targetTile]?.kind).toBe('counter');
        }
        if (from.kind === 'held' && place.kind === 'floor') throw new Error('Unpressed floor placement');
      }
    }
    if (place.kind === 'flight') {
      expect(after.tick).toBeLessThan(place.startStep + place.duration);
      if (previous?.place.kind !== 'flight') {
        expect(pressed(frames, place.thrower, TRIANGLE)).toBe(true);
        expect(place.duration).toBe(THROW_STEPS);
        expect(place.startStep).toBe(before.tick);
        expect(Math.hypot(place.end.x - place.start.x, place.end.y - place.start.y)).toBeLessThanOrEqual(4 + 1e-9);
        for (let n = 0; n <= 100; n++) {
          const tile = tileAt(after.level, Math.floor(place.start.x + (place.end.x - place.start.x) * n / 100),
            Math.floor(place.start.y + (place.end.y - place.start.y) * n / 100));
          expect(tile?.kind).toMatch(/^(floor|counter)$/);
        }
      }
    }
  }
}

for (const level of MAPS) for (const count of [1, 2, 3, 4, 5, 6, 7, 8]) {
  it(`TR-002 TR-009 TR-023 reviewer conservation and press invariants: ${level.id}, ${String(count)} cooks`, () => {
    const rng = createRng(count * 97);
    let state = start(level, count);
    // Seed every cook with supply so each map exercises throws even before reaching a crate.
    state = { ...state, nextItemId: count, inventory: inventory(state.cooks.map((cook, id): Item =>
      ({ id, kind: 'raw', ingredient: 'test', place: { kind: 'held', cook: cook.id } }))) };
    let replay = cloneState(state);
    for (let tick = 0; tick < 900; tick++) {
      const frames = new Map(state.cooks.map((cook) => [cook.id,
        frame(nextInt(rng, -1, 1), nextInt(rng, -1, 1), nextInt(rng, 0, 3) * CROSS |
          (tick % 7 === 0 ? TRIANGLE : 0))]));
      const previous = state;
      state = tabaoRush.step(deepFreeze(state), createTick({ frames }), STEP_MS);
      replay = tabaoRush.step(replay, createTick({ frames }), STEP_MS);
      expect(hashState(state)).toBe(hashState(replay));
      checkTransition(previous, state, frames);
      if (tick === 450 && count > 1) {
        const leaving = players[count - 1];
        if (!leaving) throw new Error('Missing player');
        state = tabaoRush.leave(state, leaving.id); replay = tabaoRush.leave(replay, leaving.id);
        expect(heldItem(state, leaving.id)).toBeUndefined();
        state = tabaoRush.join(state, leaving); replay = tabaoRush.join(replay, leaving);
      }
    }
  });
}

it('TR-002 TR-009 PERF-001 eight cooks mashing crates stay bounded for a whole round', () => {
  const level = build('abuse', ['##########', '#AAAAAAAA#', '#........#', '#........#',
    '#........#', '#........#', '#........#', '#........#', '##########'], []);
  let state = { ...tabaoRush.init(1, players, {}, EMPTY_SETUP), level };
  state = { ...state, cooks: state.cooks.map((cook, i) => ({ ...cook, x: 1.5 + i, y: 2.25,
    facing: 6, targetTile: targetTile(level, 1.5 + i, 2.25, 6) })) };
  const samples: { tick: number; items: number; mean: number; p95: number | undefined; worst: number | undefined }[] = [];
  let maximum = 0;
  // At most 8 creations per step, with flights lasting 23 steps after the floor cap is reached.
  const bound = FLOOR_LIMIT + 8 * (THROW_STEPS + 1);
  for (let block = 0; block < 21; block++) {
    const times = [];
    for (let t = 0; t < 600; t++) {
      const frames = new Map(state.cooks.map((cook) => [cook.id, frame(0, 0, t % 2 === 0 ? CROSS | TRIANGLE : 0)]));
      const begin = performance.now();
      state = tabaoRush.step(state, createTick({ frames }), STEP_MS);
      times.push(performance.now() - begin);
      maximum = Math.max(maximum, state.nextItemId);
      expect(state.nextItemId).toBeLessThanOrEqual(bound);
      expect(state.inventory.flights.length).toBeLessThanOrEqual(8 * THROW_STEPS);
      // Location indexes replace an elapsed-time-sized item registry. No per-step flattening.
      expect('items' in state).toBe(false);
      expect(Object.keys(state.inventory.floor).length).toBeLessThanOrEqual(level.tiles.length);
    }
    times.sort((a, b) => a - b);
    samples.push({ tick: state.tick, items: state.nextItemId,
      mean: times.reduce((a, b) => a + b, 0) / times.length,
      p95: times[Math.floor(times.length * 0.95)], worst: times[times.length - 1] });
  }
  expect(state.tick).toBe(ROUND_STEPS);
  expect(state.inventory.flights).toHaveLength(0);
  expect(state.inventory.floorCount).toBeGreaterThanOrEqual(FLOOR_LIMIT);
  expect(samples.slice(1).every((sample) => sample.items === samples[0]?.items)).toBe(true);
  expect(items(state)).toHaveLength(state.nextItemId);
  if (process.env.T02_EVIDENCE === '1') writeFileSync(new URL('../../../../../uat/evidence/T-02-tabao-items/review-performance.json', import.meta.url),
    JSON.stringify({ maximum, bound, samples }, null, 2));
});


it('TR-009 PERF-001 60 resting items and eight flights inspect only flight and hand indexes per step', () => {
  const level = build('work-bound', ['##########', '#AAAAAAAA#', '#........#', '#........#',
    '#........#', '#........#', '#........#', '#........#', '##########'], []);
  let state = { ...tabaoRush.init(2, players, {}, EMPTY_SETUP), level, tick: 5 };
  state = { ...state, cooks: state.cooks.map((cook, i) => ({ ...cook, x: 1.5 + i, y: 7.5,
    facing: 6, targetTile: null })) };
  const entries: Item[] = Array.from({ length: 60 }, (_, id) => ({ id, kind: 'raw',
    place: { kind: 'floor', tile: 21 + id % 8 } }));
  for (let n = 0; n < 8; n++) entries.push({ id: 60 + n, kind: 'raw', place: {
    kind: 'flight', start: { x: 1.2, y: 2.5 + n % 5 * 0.9 },
    end: { x: 5.2, y: 2.5 + n % 5 * 0.9 }, rest: { kind: 'floor', tile: 75 },
    startStep: 0, duration: THROW_STEPS, thrower: 'departed' } });
  const index = inventory(entries);
  let handReads = 0;
  const held = new Proxy(index.held, {
    get(target, key: string) { handReads++; return target[key]; },
    ownKeys() { throw new Error('Step enumerated held items'); },
  });
  const floor = new Proxy(index.floor, { ownKeys() { throw new Error('Step enumerated resting items'); } });
  state = { ...state, nextItemId: entries.length, inventory: { ...index, held, floor } };
  const times: number[] = [];
  for (let rep = 0; rep < 2000; rep++) {
    const before = performance.now();
    const next = tabaoRush.step(state, createTick(), STEP_MS);
    times.push(performance.now() - before);
    expect(next.inventory).toBe(state.inventory);
  }
  expect(handReads).toBe(2000 * 8 * 8);
  times.sort((a, b) => a - b);
  if (process.env.T02_EVIDENCE === '1') writeFileSync(new URL('../../../../../uat/evidence/T-02-tabao-items/review-worst-case.json', import.meta.url),
    JSON.stringify({ items: entries.length, flights: 8, floor: 60, steps: times.length,
      handReadsPerStep: handReads / times.length, mean: times.reduce((a, b) => a + b, 0) / times.length,
      p95: times[1900], worst: times[1999] }, null, 2));
});
