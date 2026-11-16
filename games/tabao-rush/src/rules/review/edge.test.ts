import { expect, it } from 'vitest';
import { BUTTON, createTick, EMPTY_SETUP, secondsToSteps, STEP_MS } from '@kaki/platform';
import type { SampledInput } from '@kaki/sim-core';
import { tabaoRush } from '../game';
import { FLOOR_LIMIT, heldItem, itemPress, THROW_STEPS } from '../items';
import { inventory, items } from '../state';
import type { Cook, Item, Level, TabaoState } from '../state';
import { targetTile } from '../target';
import { build } from './maps';

const CROSS = 1 << BUTTON.FACE_BOTTOM, TRIANGLE = 1 << BUTTON.FACE_TOP;
const level = build('review-edge', ['##########', '#..A..c..#', '#.....c..#',
  '#..##....#', '#........#', '##########'], []);
const players = ['p1', 'p2'].map((id, i) => ({ id, seat: i + 1, name: id, colour: 'seat-1' as const }));
function cook(id: string, x: number, y: number, facing: Cook['facing'] = 0, map = level): Cook {
  return { id, x, y, facing, vx: 0, vy: 0, targetTile: targetTile(map, x, y, facing) };
}
function raw(id: number, place: Item['place']): Item { return { id, kind: 'raw', ingredient: 'test', place }; }
function initial(cooks: Cook[], entries: Item[] = [], map: Level = level): TabaoState {
  return { ...tabaoRush.init(1, players.slice(0, cooks.length), {}, EMPTY_SETUP),
    level: map, cooks, inventory: inventory(entries), nextItemId: entries.length };
}
function step(state: TabaoState, presses: [string, number][] = []): TabaoState {
  const frames = new Map<string, SampledInput>(presses.map(([id, pressed]) => [id,
    { axes: [0, 0, 0, 0], held: pressed, pressed, released: 0, age: 0, seq: 0 }]));
  return tabaoRush.step(state, createTick({ frames }), STEP_MS);
}
function finish(state: TabaoState): TabaoState {
  for (let n = 0; n < THROW_STEPS; n++) state = step(state);
  return state;
}

it('TR-009 D-078 slow token is 23 steps and point-blank throws publish before any catch, including pickup chains', () => {
  expect(THROW_STEPS).toBe(secondsToSteps(0.377));
  expect(THROW_STEPS).toBe(23);
  for (const source of ['held', 'floor', 'counter'] as const) {
    const counterMap = build('chain-counter', ['##########', '#........#', '#........#',
      '#.c......#', '#........#', '##########'], []);
    const map = source === 'counter' ? counterMap : level;
    const cooks = source === 'counter'
      ? [cook('p1', 2.5, 4.5, 6, map), cook('p2', 2.5, 4.14, 2, map)]
      : [cook('p1', 2.5, 4.5, 0, map), cook('p2', 2.86, 4.5, 4, map)];
    const place: Item['place'] = source === 'held' ? { kind: 'held', cook: 'p1' }
      : { kind: source, tile: source === 'floor' ? 42 : 32 };
    let state = initial(cooks, [raw(0, place)], map);
    state = step(state, [['p1', CROSS | TRIANGLE]]);
    expect(items(state)[0]?.place.kind).toBe('flight');
    expect(heldItem(state, 'p2')).toBeUndefined();
    state = step(state);
    expect(heldItem(state, 'p2')?.id).toBe(0);
  }
});

it('TR-009 catches respect radius and full hands; crate pickup precedes catch resolution', () => {
  for (const offset of [0.19, 0.21]) {
    const state = initial([cook('p1', 1.5, 4.5), cook('p2', 3.5, 4.5 - offset)],
      [raw(0, { kind: 'held', cook: 'p1' })]);
    const result = finish(step(state, [['p1', TRIANGLE]]));
    expect(heldItem(result, 'p2')?.id).toBe(offset < 0.2 ? 0 : undefined);
    expect(heldItem(result, 'p1')).toBeUndefined();
  }
  let state = initial([cook('p1', 1.5, 2.5), cook('p2', 3.5, 2.5, 6)],
    [raw(0, { kind: 'held', cook: 'p1' })]);
  state = step(state, [['p1', TRIANGLE]]);
  state = step(state, [['p2', CROSS]]);
  state = finish(state);
  expect(heldItem(state, 'p2')?.id).toBe(1);
  expect(items(state)).toHaveLength(2);
});

it('TR-009 occupied endpoints walk back along the path from either direction and publish the resting point', () => {
  const map = build('pass', ['###########', '#.........#', '#....c....#', '#.........#', '###########'], []);
  for (const [x, facing, expected] of [[1.5, 0, 26], [9.5, 4, 28]] as const) {
    let state = initial([cook('p1', x, 2.5, facing, map)],
      [raw(0, { kind: 'held', cook: 'p1' }), raw(1, { kind: 'counter', tile: 27 })], map);
    state = step(state, [['p1', TRIANGLE]]);
    const flight = items(state)[0]?.place;
    if (flight?.kind !== 'flight') throw new Error('Missing flight');
    expect(flight.rest).toEqual({ kind: 'floor', tile: expected });
    expect(Math.floor(flight.end.y) * map.width + Math.floor(flight.end.x)).toBe(expected);
    const original = flight;
    for (let n = 1; n < THROW_STEPS - 1; n++) {
      state = step(state); expect(items(state)[0]?.place).toBe(original);
    }
    state = step(state);
    expect(items(state)[0]?.place).toEqual(original.rest);
    expect(items(state)[1]?.place).toEqual({ kind: 'counter', tile: 27 });
  }
});

it('TR-002 TR-021 floor highlight identifies the oldest cross pickup, target priority and no floor placement', () => {
  let state = initial([cook('p1', 2.5, 4.5)],
    [raw(0, { kind: 'floor', tile: 42 }), raw(1, { kind: 'floor', tile: 42 })]);
  expect(tabaoRush.publicView(state)).toMatchObject({ cooks: [{ floorItem: 0 }] });
  expect(items(step(state))).toEqual(items(state));
  state = step(state, [['p1', CROSS]]);
  expect(heldItem(state, 'p1')?.id).toBe(0);
  expect(tabaoRush.publicView(state)).toMatchObject({ cooks: [{ floorItem: null }] });
  expect(itemPress(state, 'p1', 'cross')).toBe(state);
  const facingCounter = initial([cook('p1', 5.5, 1.5)], [raw(0, { kind: 'floor', tile: 15 })]);
  expect(tabaoRush.publicView(facingCounter)).toMatchObject({ cooks: [{ floorItem: null }] });
  expect(heldItem(step(facingCounter, [['p1', CROSS]]), 'p1')).toBeUndefined();
});

it('TR-002 crates refuse at 24 floor items and resume after floor recovery', () => {
  let state = initial([cook('p1', 3.5, 2.5, 6)], Array.from({ length: FLOOR_LIMIT }, (_, id) =>
    raw(id, { kind: 'floor', tile: 23 })));
  expect(itemPress(state, 'p1', 'cross')).toBe(state);
  state = { ...state, cooks: [cook('p1', 3.5, 2.5, 0)] };
  state = step(state, [['p1', CROSS]]);
  expect(state.inventory.floorCount).toBe(23);
  state = itemPress(state, 'p1', 'triangle');
  state = { ...state, cooks: [cook('p1', 3.5, 2.5, 6)] };
  state = itemPress(state, 'p1', 'cross');
  expect(state.nextItemId).toBe(25);
});

it('TR-009 leaving receiver or thrower preserves flights; moving throws use pre-step facing; final-step refusal is scaffolding', () => {
  const state = initial([cook('p1', 1.5, 4.5), cook('p2', 4.5, 4.5)], [raw(0, { kind: 'held', cook: 'p1' })]);
  const thrown = step(state, [['p1', TRIANGLE]]);
  expect(items(finish(tabaoRush.leave(thrown, 'p2')))[0]?.place.kind).toBe('floor');
  expect(heldItem(finish(tabaoRush.leave(thrown, 'p1')), 'p2')?.id).toBe(0);
  const last = step({ ...state, tick: state.endTick - THROW_STEPS }, [['p1', TRIANGLE]]);
  expect(items(last)[0]?.place.kind).toBe('flight');
  expect(items(finish(last))[0]?.place.kind).not.toBe('flight');
  const late = step({ ...state, tick: state.endTick - THROW_STEPS + 1 }, [['p1', TRIANGLE]]);
  expect(heldItem(late, 'p1')?.id).toBe(0);
  const moving = tabaoRush.step(state, createTick({ frames: new Map([['p1',
    { axes: [0, -1, 0, 0] as const, held: TRIANGLE, pressed: TRIANGLE, released: 0, age: 0, seq: 0 }]]) }), STEP_MS);
  expect(items(moving)[0]?.place).toMatchObject({ start: { x: 1.5, y: 4.5 }, end: { x: 5.5, y: 4.5 } });
});


it('TR-002 leaving drops on a free resting floor and never replaces an existing item', () => {
  const state = initial([cook('p1', 2.5, 4.5)],
    [raw(0, { kind: 'held', cook: 'p1' }), raw(1, { kind: 'floor', tile: 42 })]);
  const dropped = tabaoRush.leave(state, 'p1');
  expect(items(dropped)).toHaveLength(2);
  expect(items(dropped)[0]?.place).toEqual({ kind: 'floor', tile: 32 });
  expect(items(dropped)[1]?.place).toEqual({ kind: 'floor', tile: 42 });
});

it('TR-009 resting reservations prevent occupied-counter overwrite and simultaneous flight collisions', () => {
  const map = build('reserved', ['###########', '#.........#', '#....c....#', '#.........#', '###########'], []);
  let state = initial([cook('p1', 1.5, 2.5, 0, map), cook('p2', 5.5, 3.5, 6, map)],
    [raw(0, { kind: 'held', cook: 'p1' }), raw(1, { kind: 'held', cook: 'p2' })], map);
  state = step(state, [['p1', TRIANGLE], ['p2', CROSS]]);
  expect(heldItem(state, 'p2')?.id).toBe(1);
  state = finish(state);
  expect(items(state)[0]?.place).toEqual({ kind: 'counter', tile: 27 });
  expect(items(state)).toHaveLength(2);
});
