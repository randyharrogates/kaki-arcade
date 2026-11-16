function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error('Missing fixture value');
  return value;
}
import { expect, it } from 'vitest';
import { BUTTON, createTick, EMPTY_SETUP, STEP_MS } from '@kaki/platform';
import type { StepInputs } from '@kaki/platform';
import { tabaoRush } from './game';
import { items } from './state';
import type { Item, Level, StationType, TabaoState } from './state';
import { itemPress } from './items';
import { BURN_STEPS, COOK_STEPS, EXTINGUISH_STEPS, FIRE_STEPS,
  prepareStations, SPREAD_STEPS, WORK_STEPS } from './stations';

const types: readonly StationType[] = ['chop', 'wok', 'pot', 'grill', 'rice', 'drinks', 'plating', 'sink', 'bin'];
const players = Array.from({ length: 8 }, (_, i) => ({ id: `p${String(i)}`, seat: i + 1,
  name: `Cook ${String(i)}`, colour: 'seat-1' as const }));
const level: Level = {
  id: 'station-mechanisms', width: 14, height: 5, firesEnabled: true, extinguisherTile: 26,
  spawns: Array.from({ length: 8 }, (_, i) => ({ x: i + 1.5, y: 2.5 })),
  tiles: Array.from({ length: 70 }, (_, i) => {
    if (i === 0) return { kind: 'station', stationId: 'returns', stationType: 'return-counter' };
    const type = types[i - 15];
    if (type) return { kind: 'station', stationId: type, stationType: type };
    if (i === 24) return { kind: 'station', stationId: 'crate', ingredient: 'kopi' };
    if (i === 25 || i === 26) return { kind: 'counter' };
    return i < 14 || i >= 56 || i % 14 === 0 || i % 14 === 13 ? { kind: 'wall' } : { kind: 'floor' };
  }),
};
function initial(count = 1): TabaoState {
  const state = tabaoRush.init(73, players.slice(0, count), {}, EMPTY_SETUP);
  return prepareStations({ ...state, level, cooks: state.cooks.map((cook, i) => ({ ...cook,
    x: i + 1.5, y: 2.5, targetTile: 15 + i, facing: 6 })) });
}
function aim(state: TabaoState, tile: number, id = 'p0'): TabaoState {
  return { ...state, cooks: state.cooks.map((c) => c.id === id ? { ...c, targetTile: tile,
    x: tile % 14 + 0.5, y: Math.floor(tile / 14) + 1.5, facing: 6 } : c) };
}
function hand(state: TabaoState, kind: Item['kind'], ingredient?: string, id = 'p0'): TabaoState {
  const target = state.cooks.find((c) => c.id === id)?.targetTile;
  const type = target === null || target === undefined ? undefined : state.stations?.[target]?.type;
  ingredient ??= type === 'chop' ? 'satay' : type === 'grill' ? kind === 'raw' ? 'bread' : 'satay' : type === 'wok' ? 'kway-teow' : type === 'pot' ? 'laksa-broth' : type === 'rice' ? 'rice' : 'kopi';
  const item: Item = { id: state.nextItemId, kind, ingredient, ...(kind === 'chopped' ? { processes: ['chop'] as const } : {}), place: { kind: 'held', cook: id } };
  return { ...state, nextItemId: state.nextItemId + 1, inventory: { ...state.inventory,
    held: { ...state.inventory.held, [id]: item } } };
}
function input(held = 0, pressed = 0, id = 'p0', x = 0): StepInputs {
  return createTick({ frames: new Map([[id, { held, pressed, released: 0, axes: [x, 0, 0, 0],
    age: 0, seq: 0 }]]) });
}
const cross = 1 << BUTTON.FACE_BOTTOM;
const circle = 1 << BUTTON.FACE_RIGHT;
function step(state: TabaoState, inputs: StepInputs = createTick()): TabaoState {
  return tabaoRush.step(state, inputs, STEP_MS);
}
function run(state: TabaoState, n: number, buttons = 0): TabaoState {
  for (let i = 0; i < n; i++) state = step(state, input(buttons));
  return state;
}
function load(type: StationType, kind: Item['kind'] = type === 'wok' ? 'chopped' : 'raw'): TabaoState {
  return itemPress(hand(aim(initial(), 15 + types.indexOf(type)), kind), 'p0', 'cross');
}
function station(state: TabaoState, type: StationType) {
  const value = state.stations?.[15 + types.indexOf(type)];
  if (!value) throw new Error('Missing station');
  return value;
}
function frames(entries: [string, number, number][]): StepInputs {
  return createTick({ frames: new Map(entries.map(([id, held, pressed]) => [id, { held, pressed, released: 0,
    axes: [0, 0, 0, 0], age: 0, seq: 0 }])) });
}
const CHOP = 15, WOK = 16, DRINKS = 20, PLATING = 21, SINK = 22, BIN = 23, RACK = 26;

for (const [label, type, kind, output] of [
  ['A01', 'chop', 'raw', 'chopped'], ['A02', 'sink', 'dirty-plate', 'plate'],
] as const) it(`${label} final circle work precedes a later seat's cross without losing work`, () => {
  const tile = type === 'chop' ? CHOP : SINK;
  let s = itemPress(hand(aim(initial(2), tile), kind), 'p0', 'cross');
  const id = required(required(required(s.stations)[tile]).content).id;
  s = { ...s, stations: { ...s.stations, [tile]: { ...required(s.stations?.[tile]), progress: WORK_STEPS - 1 } },
    cooks: s.cooks.map((c) => ({ ...c, targetTile: tile })) };
  s = step(s, frames([['p0', circle, 0], ['p1', cross, cross]]));
  expect(s.inventory.held.p1).toMatchObject({ id, kind: output });
  expect(required(required(s.stations)[tile]).content).toBeNull();
});

it('A03 a quick tap of circle (pressed, not held at the sample) turns the grill', () => {
  let s = run(load('grill'), COOK_STEPS);
  s = step(s, input(0, circle));
  expect(station(s, 'grill').turned).toBe(true);
});

it('A04 fire spreads to a station separated by one plain counter', () => {
  const w = 10;
  const lv: Level = { id: 'gap', width: w, height: 4, firesEnabled: true, extinguisherTile: 18,
    spawns: [{ x: 1.5, y: 2.5 }],
    tiles: Array.from({ length: 40 }, (_, i) => i === 0 ? { kind: 'station', stationId: 'returns', stationType: 'return-counter' as const } : i === 12 ? { kind: 'station', stationId: 'w', stationType: 'wok' as const }
      : i === 13 ? { kind: 'counter' } : i === 14 ? { kind: 'station', stationId: 'p', stationType: 'pot' as const }
      : i === 18 ? { kind: 'counter' }
      : i < w || i >= 30 || i % w === 0 || i % w === w - 1 ? { kind: 'wall' } : { kind: 'floor' }) };
  const base = tabaoRush.init(1, players.slice(0, 1), {}, EMPTY_SETUP);
  let s = prepareStations({ ...base, level: lv, cooks: base.cooks.map((c) => ({ ...c, x: 2.5, y: 2.5, targetTile: null })) });
  s = { ...s, stations: { ...s.stations, 12: { ...required(required(s.stations)[12]), fire: true } } };
  for (let i = 0; i < SPREAD_STEPS * 3; i++) s = step(s);
  expect(required(required(s.stations)[14]).fire).toBe(true);
});

it('A05 fires enabled with no extinguisher anywhere is refused or the fire can be put out', () => {
  const { extinguisherTile: omitted, ...lv } = level;
  expect(omitted).toBeDefined();
  const base = tabaoRush.init(1, players.slice(0, 1), {}, EMPTY_SETUP);
  expect(() => prepareStations({ ...base, level: lv })).toThrow(/extinguisher/);
});

it('A06 extinguisher cannot be thrown, binned, plated or loaded', () => {
  const s = itemPress(aim(initial(), RACK), 'p0', 'cross');
  expect(s.inventory.held.p0?.kind).toBe('extinguisher');
  for (const t of [BIN, PLATING, CHOP, WOK, SINK, DRINKS]) { const a = aim(s, t); expect(itemPress(a, 'p0', 'cross')).toBe(a); }
  const t = itemPress(s, 'p0', 'triangle');
  expect(t.inventory.held.p0?.kind).toBe('extinguisher');
});

it('A07 leaver holding the extinguisher: it stays in the world', () => {
  let s = initial(2);
  s = itemPress(aim(s, RACK), 'p0', 'cross');
  s = tabaoRush.leave(s, 'p0');
  expect(items(s).filter((i) => i.kind === 'extinguisher')).toHaveLength(1);
  const e = required(items(s).find((i) => i.kind === 'extinguisher'));
  expect(e.place.kind).toBe('floor');
});

it('A08 extinguishing interrupted at step 59 resets to zero', () => {
  let s = itemPress(aim(initial(), RACK), 'p0', 'cross');
  s = aim(s, WOK);
  s = { ...s, stations: { ...s.stations, [WOK]: { ...required(required(s.stations)[WOK]), fire: true } } };
  s = run(s, EXTINGUISH_STEPS - 1, circle);
  expect(station(s, 'wok').extinguish).toBe(EXTINGUISH_STEPS - 1);
  s = step(s);
  expect(station(s, 'wok').extinguish).toBe(0);
  expect(station(s, 'wok').fire).toBe(true);
});

it('A09 public view says which cook is working a station (renderer needs chop/wash/extinguish animation)', () => {
  const s = run(aim(load('chop'), CHOP), 5, circle);
  const v = JSON.stringify(tabaoRush.publicView(s));
  expect((JSON.parse(v) as { stations: { type: string; worker: number | null }[] }).stations.find((x: { type: string }) => x.type === 'chop')?.worker).toBe(1);
});

it('A10 public view exposes time until a burnt station catches fire', () => {
  const s = run(load('wok'), COOK_STEPS + BURN_STEPS + 10);
  const v = (tabaoRush.publicView(s) as { stations: Record<string, unknown>[] }).stations.find((x) => x.type === 'wok');
  expect(required(v).fireIn).toBe(FIRE_STEPS - 10);
  expect(required(v).fireInTotal).toBe(FIRE_STEPS);
});

it('A11 publicView is pure on an unprepared state and agrees with the first step', () => {
  const base = tabaoRush.init(3, players.slice(0, 1), {}, EMPTY_SETUP);
  const plain = { ...base, level };
  const v = tabaoRush.publicView(plain) as { items: Item[] };
  const after = tabaoRush.publicView(step(plain)) as { items: Item[] };
  expect(v.items.map((i) => i.id)).toEqual(after.items.map((i) => i.id));
  expect(plain.stations).toBeUndefined();
});

it('A12 crate tile that also has a stationType still gives ingredients', () => {
  const lv: Level = { ...level, tiles: level.tiles.map((t, i) => i === 24 ? { kind: 'station' as const, stationId: 'crate', ingredient: 'kopi', stationType: 'drinks' as const } : t) };
  const base = tabaoRush.init(1, players.slice(0, 1), {}, EMPTY_SETUP);
  let s = prepareStations({ ...base, level: lv, cooks: base.cooks.map((c) => ({ ...c, x: 10.5, y: 2.5, facing: 6, targetTile: 24 })) });
  s = itemPress(s, 'p0', 'cross');
  expect(s.inventory.held.p0?.kind).toBe('raw');
});

it('A13 grill output from raw vs chopped is distinguishable (T-04 needs recipe order)', () => {
  const a = run(step(run(load('grill', 'raw'), COOK_STEPS / 2), input(circle)), COOK_STEPS);
  const b = run(step(run(load('grill', 'chopped'), COOK_STEPS / 2), input(circle)), COOK_STEPS);
  const ka = station(a, 'grill').content; const kb = station(b, 'grill').content;
  expect(JSON.stringify({ ...ka, id: 0 })).not.toBe(JSON.stringify({ ...kb, id: 0 }));
});

it('A14 two cooks: one holding extinguisher works fire, another extinguisher-less cook cannot add', () => {
  let s = initial(2);
  s = itemPress(aim(s, RACK), 'p0', 'cross');
  s = aim(aim(s, WOK), WOK, 'p1');
  s = { ...s, stations: { ...s.stations, [WOK]: { ...required(required(s.stations)[WOK]), fire: true } } };
  for (let i = 0; i < EXTINGUISH_STEPS; i++) s = step(s, frames([['p0', circle, 0], ['p1', circle, 0]]));
  expect(station(s, 'wok').fire).toBe(false);
});

it('A15 taking food at the exact burn boundary gets cooked, never burnt', () => {
  let s = run(aim(load('wok'), 25), COOK_STEPS + BURN_STEPS - 1);
  expect(station(s, 'wok').content?.kind).toBe('cooked');
  s = step(aim(s, WOK), input(cross, cross));
  expect(s.inventory.held.p0?.kind).toBe('cooked');
});

it('A16 controllerLayout does not scan the level each call (cost probe)', () => {
  const s = initial(1);
  let reads = 0;
  const tiles = new Proxy(s.level.tiles as Level['tiles'][number][], { get(t, k) { if (typeof k === 'string' && /^\d+$/.test(k)) reads++; return Reflect.get(t, k) as unknown; } });
  tabaoRush.controllerLayout({ ...s, level: { ...s.level, tiles } }, 'p0');
  expect(reads).toBeLessThan(20);
});

it('A02b sink and drinks race, single step from progress 179', () => {
  for (const [type, kind] of [['sink', 'dirty-plate'], ['drinks', 'raw']] as const) {
    let s = initial(2);
    s = itemPress(hand(aim(s, 15 + types.indexOf(type)), kind), 'p0', 'cross');
    const t = 15 + types.indexOf(type);
    s = { ...s, stations: { ...s.stations, [t]: { ...required(required(s.stations)[t]), progress: WORK_STEPS - 1 } },
      cooks: s.cooks.map((c) => ({ ...c, targetTile: t })) };
    s = step(s, frames([['p0', circle, 0], ['p1', cross, cross]]));
    expect(s.inventory.held.p1?.kind, type).toBe(type === 'sink' ? 'plate' : 'cooked');
    expect(s.stations?.[t]?.content).toBeNull();
  }
});

it('TR-010 D-080 one kitchen clock chooses the oldest fire with an unlit neighbour', () => {
  let s = initial();
  const stations = { ...s.stations };
  for (const [tile, age] of [[WOK, 1000], [DRINKS, 500]] as const) {
    stations[tile] = { ...required(stations[tile]), fire: true, fireAge: age };
  }
  s = { ...s, stations, fireSpreadClock: SPREAD_STEPS - 1 };
  s = step(s);
  expect(Object.values(s.stations ?? {}).filter((x) => x.fire).map((x) => x.tile)).toEqual([CHOP, WOK, DRINKS]);
  expect(s.fireSpreadClock).toBe(0);
  s = run(s, SPREAD_STEPS - 1);
  expect(Object.values(s.stations ?? {}).filter((x) => x.fire)).toHaveLength(3);
  s = step(s);
  expect(required(s.stations)[17]?.fire).toBe(true);
  expect(Object.values(s.stations ?? {}).filter((x) => x.fire)).toHaveLength(4);
});

it('TR-008 TR-010 bin refuses plates and dishes; rack never receives a thrown ingredient', () => {
  for (const kind of ['plate', 'dirty-plate', 'dish'] as const) {
    const s = hand(aim(initial(), BIN), kind);
    expect(itemPress(s, 'p0', 'cross')).toBe(s);
  }
  let s = itemPress(aim(initial(), RACK), 'p0', 'cross');
  s = tabaoRush.leave(s, 'p0');
  s = tabaoRush.join({ ...s, tick: 0 }, required(players[0]));
  s = hand(aim(s, RACK), 'raw');
  s = { ...s, cooks: s.cooks.map((c) => ({ ...c, x: 12.5, y: 2.5, facing: 6 })) };
  s = itemPress(s, 'p0', 'triangle');
  expect(s.inventory.flights[0]?.place).toMatchObject({ kind: 'flight', rest: { kind: 'floor' } });
  expect(s.inventory.reserved[RACK] ?? 0).toBe(0);
});

it('TR-003 ordered process data survives chop then grill and appears in public items', () => {
  let s = run(load('chop'), WORK_STEPS, circle);
  s = itemPress(s, 'p0', 'cross');
  expect(s.inventory.held.p0?.processes).toEqual(['chop']);
  s = itemPress(aim(s, 18), 'p0', 'cross');
  s = run(s, COOK_STEPS / 2);
  s = step(s, input(0, circle));
  s = run(s, COOK_STEPS / 2 - 1);
  expect(station(s, 'grill').content?.processes).toEqual(['chop', 'grill']);
  const view = tabaoRush.publicView(s) as { items: Item[] };
  expect(view.items.find((i) => i.kind === 'cooked')?.processes).toEqual(['chop', 'grill']);
});
