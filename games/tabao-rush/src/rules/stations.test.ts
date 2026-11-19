import { conformanceTimeout } from '@kaki/platform/kit';
import * as fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { expect, it } from 'vitest';
import { cloneState, decodeState, deepFreeze, encodeState, hashState } from '@kaki/sim-core';
import { BUTTON, createTick, EMPTY_SETUP, STEP_MS } from '@kaki/platform';
import type { StepInputs } from '@kaki/platform';
import { formatReport, readSources, runConformance } from '@kaki/platform/kit';
import { ROUND_STEPS } from './game';
import { tabaoRush } from './playing.fixture';
import { inventory, items } from './state';
import type { Item, Level, StationType, TabaoState } from './state';
import { containerOf } from './recipes';
import { clearOfWalls } from './level';
import { MIN_SEPARATION } from './state';
import { itemPress } from './items';
import { BURN_STEPS, COOK_STEPS, EXTINGUISH_STEPS, FIRE_STEPS,
  prepareStations, SPREAD_STEPS, WARNING_STEPS, WORK_STEPS } from './stations';

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
  ingredient ??= type === 'chop' ? 'chicken' : type === 'wok' ? 'kway-teow' : type === 'pot' ? 'laksa-broth' : type === 'grill' ? 'satay' : type === 'rice' ? 'rice' : 'kopi';
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
const triangle = 1 << BUTTON.FACE_TOP;
function step(state: TabaoState, inputs: StepInputs = createTick()): TabaoState {
  return tabaoRush.step(state, inputs, STEP_MS);
}
function run(state: TabaoState, n: number, buttons = 0): TabaoState {
  for (let i = 0; i < n; i++) state = step(state, input(buttons));
  return state;
}
function load(type: StationType, kind: Item['kind'] = type === 'wok' || type === 'grill' ? 'chopped' : 'raw'): TabaoState {
  return itemPress(hand(aim(initial(), 15 + types.indexOf(type)), kind), 'p0', 'cross');
}
function station(state: TabaoState, type: StationType) {
  const value = state.stations?.[15 + types.indexOf(type)];
  if (!value) throw new Error('Missing station');
  return value;
}

it('TR-007 TR-008 TR-030 every station accepts only its mechanism inputs, capacity one; bin destroys', () => {
  for (const type of types) {
    for (const kind of ['raw', 'chopped', 'cooked', 'burnt', 'plate', 'dirty-plate', 'dish', 'extinguisher'] as const) {
      const state = load(type, kind);
      const accepted = type === 'bin' ? ['raw', 'chopped', 'cooked', 'burnt'].includes(kind)
        : type === 'sink' ? kind === 'dirty-plate'
        : type === 'plating' ? ['plate', 'chopped', 'cooked', 'dish'].includes(kind)
        : type === 'chop' || type === 'drinks' ? kind === 'raw' : type === 'wok' || type === 'grill' ? kind === 'chopped' : kind === 'raw';
      expect(station(state, type).content?.kind).toBe(accepted && type !== 'bin' ? kind : undefined);
      expect(items(state)).toHaveLength(accepted && type === 'bin' ? 1 : 2); // fixed extinguisher + input
      const occupied = hand(state, 'raw');
      const content = station(state, type).content;
      if (content && !(type === 'plating' && containerOf(content))) expect(itemPress(occupied, 'p0', 'cross')).toBe(occupied);
    }
  }
  const wrongDrink = hand(aim(initial(), 20), 'raw', 'cucumber');
  expect(itemPress(wrongDrink, 'p0', 'cross')).toBe(wrongDrink);
});

it('TR-007 TR-008 held chop, pull and wash retain progress on release, walking away and missing frames', () => {
  for (const [type, inputKind, output] of [['chop', 'raw', 'chopped'], ['drinks', 'raw', 'cooked'], ['sink', 'dirty-plate', 'plate']] as const) {
    let state = load(type, inputKind);
    state = run(state, 20, circle);
    expect(station(state, type).progress).toBe(20);
    expect(itemPress(state, 'p0', 'cross')).toBe(state);
    state = run(aim(state, 25), 30, circle);
    state = run(state, 30);
    expect(station(state, type).progress).toBe(20);
    state = run(aim(state, 15 + types.indexOf(type)), WORK_STEPS - 20, circle);
    expect(station(state, type).content?.kind).toBe(output);
    expect(station(state, type).progress).toBe(WORK_STEPS);
    const taken = itemPress(state, 'p0', 'cross');
    expect(taken.inventory.held.p0?.kind).toBe(output);
    expect(station(taken, type).content).toBeNull();
  }
});

it('TR-007 TR-030 automatic stations finish unattended, warn before irreversible burning; burnt food must be binned', () => {
  for (const type of ['wok', 'pot', 'rice'] as const) {
    let state = aim(load(type), 25);
    state = run(state, COOK_STEPS - 1);
    expect(station(state, type).content?.kind).toBe(type === 'wok' ? 'chopped' : 'raw');
    state = step(state);
    expect(station(state, type).content?.kind).toBe('cooked');
    const ready = aim(state, 15 + types.indexOf(type));
    expect(itemPress(ready, 'p0', 'cross').inventory.held.p0?.kind).toBe('cooked');
    state = run(state, WARNING_STEPS - 1);
    expect(station(state, type).warning).toBe(false);
    state = step(state);
    expect(station(state, type).warning).toBe(true);
    const view = tabaoRush.publicView(state);
    expect(view).toHaveProperty('stations');
    expect(JSON.stringify(view)).toContain('"warning":true');
    state = run(state, BURN_STEPS - WARNING_STEPS);
    expect(station(state, type).content?.kind).toBe('burnt');
    state = itemPress(aim(state, 15 + types.indexOf(type)), 'p0', 'cross');
    expect(state.inventory.held.p0?.kind).toBe('burnt');
    for (const destination of types.filter((t) => t !== 'bin')) {
      const next = aim(state, 15 + types.indexOf(destination));
      expect(itemPress(next, 'p0', 'cross')).toBe(next);
    }
    state = itemPress(aim(state, 23), 'p0', 'cross');
    expect(items(state)).toHaveLength(1);
  }
});

it('TR-010 fire starts exactly five seconds after burning, loses food, blocks use, spreads every six seconds; circle with extinguisher puts it out', () => {
  let state = run(load('wok'), COOK_STEPS + BURN_STEPS + FIRE_STEPS - 1);
  expect(station(state, 'wok').fire).toBe(false);
  state = step(state);
  expect(station(state, 'wok').fire).toBe(true);
  expect(station(state, 'wok').content).toBeNull();
  expect(itemPress(state, 'p0', 'cross')).toBe(state);
  state = run(state, SPREAD_STEPS - 1);
  expect(station(state, 'chop').fire).toBe(false);
  state = step(state);
  expect(station(state, 'chop').fire).toBe(true);
  state = run(state, EXTINGUISH_STEPS, circle);
  expect(station(state, 'wok').fire).toBe(true);
  state = itemPress(aim(state, 26), 'p0', 'cross');
  expect(state.inventory.held.p0?.kind).toBe('extinguisher');
  state = aim(state, 16);
  state = run(state, 20, circle);
  state = step(state);
  expect(station(state, 'wok').extinguish).toBe(0);
  state = run(state, EXTINGUISH_STEPS, circle);
  expect(station(state, 'wok').fire).toBe(false);
  state = run(aim(state, 15), EXTINGUISH_STEPS, circle);
  expect(station(state, 'chop').fire).toBe(false);
  state = itemPress(aim(state, 26), 'p0', 'cross');
  expect(state.inventory.counters[26]?.kind).toBe('extinguisher');
  let easy = load('wok');
  easy = { ...easy, level: { ...easy.level, firesEnabled: false } };
  easy = run(easy, COOK_STEPS + BURN_STEPS + FIRE_STEPS + SPREAD_STEPS);
  expect(station(easy, 'wok').content?.kind).toBe('burnt');
  expect(Object.values(easy.stations ?? {}).some((s) => s.fire)).toBe(false);
});

it('TR-021 TR-007 pre-step highlight and ascending seats resolve cross, circle, triangle; no stacked work; action events alone do not count', () => {
  let state = aim(hand(initial(2), 'raw'), 15);
  state = step(state, input(circle | cross | triangle, cross | triangle, 'p0', 1));
  expect(station(state, 'chop').progress).toBe(1);
  expect(station(state, 'chop').content?.id).toBe(1);
  expect(state.inventory.flights).toHaveLength(0);
  state = aim(aim(state, 15), 15, 'p1');
  const frames = new Map([...input(circle, 0, 'p1').frames, ...input(circle).frames]);
  state = step(state, createTick({ frames }));
  expect(station(state, 'chop').progress).toBe(2);
  state = run(aim(state, 15), WORK_STEPS - 2, circle);
  state = step(state, createTick({ frames: new Map([...input(cross, cross, 'p1').frames,
    ...input(cross, cross).frames]) }));
  expect(state.inventory.held.p0?.kind).toBe('chopped');
  expect(state.inventory.held.p1).toBeUndefined();
  const blank = load('chop');
  const taps = step(blank, createTick({ actions: [{ player: 'p0', control: 'circle', revision: 0 }] }));
  expect(station(taps, 'chop').progress).toBe(0);
});

it('TR-030 plating is one-slot storage without recipes and publishes all progress and contents as step data', () => {
  let state = load('plating', 'plate');
  state = run(state, 120, circle);
  expect(station(state, 'plating')).toMatchObject({ progress: 0, total: 0, fire: false, warning: false });
  expect(itemPress(state, 'p0', 'cross').inventory.held.p0?.kind).toBe('plate');
  const { stations: _stations, ...plain } = initial();
  expect(_stations).toBeDefined();
  expect(hashState(prepareStations(deepFreeze(plain)))).toBe(hashState(prepareStations(plain)));
});

for (let count = 1; count <= 8; count++) {
  it(`TR-007 TR-008 TR-010 TR-030 seeded 210-second conservation, conditions, indexes and reload: ${String(count)} cooks`, () => {
    let seed = count * 7919;
    const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
    let state = initial(count);
    // Start every mechanism with one valid input, including the later recipe owner's plate seam.
    for (const type of types.filter((t) => t !== 'bin')) {
      state = itemPress(hand(aim(state, 15 + types.indexOf(type)), type === 'sink' ? 'dirty-plate'
        : type === 'plating' ? 'plate' : type === 'wok' || type === 'grill' ? 'chopped' : 'raw'), 'p0', 'cross');
    }
    state = { ...state, cooks: initial(count).cooks };
    let replay = cloneState(state);
    const burnt = new Set<number>();
    let removed = 0;
    for (let tick = 0; tick < ROUND_STEPS; tick++) {
      const frames = new Map(state.cooks.map((c) => {
        const n = random();
        return [c.id, { held: n & circle, pressed: (n & 7) === 0 ? cross | triangle : 0,
          released: 0, axes: [(n % 3) - 1, ((n >>> 8) % 3) - 1, 0, 0], age: 0, seq: tick }];
      }));
      const inputs = createTick({ frames });
      const before = state;
      state = step(state, inputs);
      replay = step(replay, inputs);
      expect(state.cooks.every((c, i) => clearOfWalls(state.level, c.x, c.y) &&
        state.cooks.slice(i + 1).every((d) => Math.hypot(c.x - d.x, c.y - d.y) >= MIN_SEPARATION - 1e-9))).toBe(true);
      const expanded = (s: TabaoState): Item[] => items(s).flatMap((i) => [i, ...(i.contents ?? []).map((f) => ({ ...f, place: i.place }))]);
      const oldItems = new Map(expanded(before).map((i) => [i.id, i]));
      const current = expanded(state);
      const currentIds = new Set(current.map((i) => i.id));
      expect(currentIds.size).toBe(current.length);
      for (const old of oldItems.values()) if (!currentIds.has(old.id)) {
        const bin = before.cooks.some((c) => c.id === (old.place.kind === 'held' ? old.place.cook : '') &&
          c.targetTile === 23 && ((frames.get(c.id)?.pressed ?? 0) & cross) !== 0);
        const fire = old.place.kind === 'counter' && state.stations?.[old.place.tile]?.fire === true;
        const loadedIntoFire = before.cooks.some((c) => old.place.kind === 'held' && old.place.cook === c.id &&
          c.targetTile !== null && state.stations?.[c.targetTile]?.fire && ((frames.get(c.id)?.pressed ?? 0) & cross) !== 0);
        expect(bin || fire || loadedIntoFire, JSON.stringify({ tick, old })).toBe(true); removed++;
      }
      for (const item of current) {
        if (!oldItems.has(item.id)) {
          expect(item.id).toBeGreaterThanOrEqual(before.nextItemId);
          expect(item.kind).toBe('raw');
        }
        const prior = oldItems.get(item.id);
        if (prior && prior.kind !== item.kind && item.kind === 'dish') {
          expect(prior.kind).toBe('plate');
          expect(prior.place.kind).toBe('counter');
          expect(prior.place.kind === 'counter' && before.stations?.[prior.place.tile]?.type).toBe('plating');
        }
        if (prior && prior.kind !== item.kind && item.kind !== 'dish') {
          expect(prior.place.kind).toBe('counter');
          const mechanism = prior.place.kind === 'counter' ? before.stations?.[prior.place.tile] : undefined;
          expect(mechanism).toBeDefined();
          if (item.kind === 'chopped') { expect(prior.kind).toBe('raw'); expect(mechanism?.type).toBe('chop'); }
          else if (item.kind === 'plate') { expect(prior.kind).toBe('dirty-plate'); expect(mechanism?.type).toBe('sink'); }
          else if (item.kind === 'burnt') { expect(prior.kind).toBe('cooked'); expect(mechanism?.doneAge).toBe(BURN_STEPS - 1); }
          else { expect(item.kind).toBe('cooked'); expect(['raw', 'chopped']).toContain(prior.kind); }
        }
        if (burnt.has(item.id)) expect(item.kind).toBe('burnt');
        if (item.kind === 'burnt') burnt.add(item.id);
        const place = item.place;
        const nested = items(state).some((parent) => parent.contents?.some((f) => f.id === item.id));
        if (nested) continue;
        if (place.kind === 'held') expect(state.inventory.held[place.cook]).toBe(item);
        if (place.kind === 'counter') expect(state.stations?.[place.tile]?.content ?? state.inventory.counters[place.tile]).toBe(item);
        if (place.kind === 'floor') expect(state.inventory.floor[place.tile]).toContain(item);
        if (place.kind === 'flight') expect(state.inventory.flights).toContain(item);
      }
      expect(current.length + removed).toBe(state.nextItemId);
      expect(state.inventory.floorCount).toBe(Object.values(state.inventory.floor).reduce((n, pile) => n + (pile?.length ?? 0), 0));
      for (const station of Object.values(state.stations ?? {})) {
        const old = before.stations?.[station.tile];
        if (!old) throw new Error('Missing previous station');
        expect(station.progress).toBeLessThanOrEqual(station.total);
        if (station.progress > old.progress && !['wok', 'pot', 'grill', 'rice'].includes(station.type)) {
          expect(station.workedAt).toBe(before.tick);
          expect(old.content).not.toBeNull();
          expect(old.fire).toBe(false);
        }
        if (station.fire && !old.fire) {
          const cause = old.content?.kind === 'burnt' && old.burntAge + 1 >= FIRE_STEPS;
          const spread = station.neighbours.some((at) => {
            const source = before.stations?.[at];
            return source?.fire && (before.fireSpreadClock ?? 0) + 1 >= SPREAD_STEPS;
          });
          expect(cause || spread).toBe(true);
          const equipment = current.find((i) => i.kind === 'extinguisher');
          if (!equipment) throw new Error('Fire must always retain its extinguisher');
          // Walk the same seeded world to the rack, then to the fire using real inputs.
          let rescue = state;
          const walk = (x: number, y: number) => {
            for (let attempt = 0; attempt < 600; attempt++) {
              const cook = rescue.cooks.find((c) => c.id === 'p0');
              if (!cook) throw new Error('Missing rescue cook');
              const dx = x - cook.x, dy = y - cook.y;
              if (Math.hypot(dx, dy) < 0.025) break;
              rescue = step(rescue, createTick({ frames: new Map([['p0', { held: 0, pressed: 0,
                released: 0, axes: [Math.max(-1, Math.min(1, dx * 20)), Math.max(-1, Math.min(1, dy * 20)), 0, 0], age: 0, seq: 0 }]]) }));
            }
          };
          // Other cooks obstructing this branch leave through the normal lifecycle.
          for (const cook of rescue.cooks) if (cook.id !== 'p0') rescue = tabaoRush.leave(rescue, cook.id);
          const face = (dy: number) => {
            rescue = step(rescue, createTick({ frames: new Map([['p0', { held: 0, pressed: 0,
              released: 0, axes: [0, dy, 0, 0], age: 0, seq: 0 }]]) }));
          };
          const held = rescue.inventory.held.p0;
          if (held && held.kind !== 'extinguisher') {
            walk(11.5, 2.5); face(-1);
            rescue = step(rescue, input(cross, cross));
          }
          if (rescue.inventory.held.p0?.kind !== 'extinguisher') {
            const equipment = items(rescue).find((i) => i.kind === 'extinguisher');
            if (!equipment || (equipment.place.kind !== 'counter' && equipment.place.kind !== 'floor')) throw new Error('Equipment inaccessible');
            const tile = equipment.place.tile;
            const floor = equipment.place.kind === 'floor';
            walk(tile % 14 + 0.5, floor ? Math.floor(tile / 14) + 0.5 : 2.5);
            face(floor ? 1 : -1);
            rescue = step(rescue, input(cross, cross));
          }
          expect(rescue.inventory.held.p0?.kind).toBe('extinguisher');
          walk(station.tile % 14 + 0.5, 2.5);
          rescue = step(rescue, createTick({ frames: new Map([['p0', { held: 0, pressed: 0, released: 0, axes: [0, -1, 0, 0], age: 0, seq: 0 }]]) }));
          for (let attempt = 0; attempt < EXTINGUISH_STEPS * 2 && rescue.stations?.[station.tile]?.fire; attempt++) rescue = step(rescue, input(circle));
          expect(rescue.stations?.[station.tile]?.fire).toBe(false);
        }
      }
      if (tick % 600 === 0 || tick === ROUND_STEPS - 1) expect(hashState(state)).toBe(hashState(replay));
      if (tick === ROUND_STEPS / 2) replay = decodeState(JSON.parse(JSON.stringify(encodeState(deepFreeze(state))))) as TabaoState;
    }
  }, 30000);
}

it('TR-007 TR-008 TR-010 TR-030 station work passes unmodified conformance kit at 1 and 8 players', { timeout: conformanceTimeout(71544) }, () => {
  // Original scenarios remain unchanged in conformance.test.ts. These add station-specific matches.
  const module: typeof tabaoRush = { ...tabaoRush, init: (seed, seated) => {
    const base = tabaoRush.init(seed, seated, {}, EMPTY_SETUP);
    let state = prepareStations({ ...base, level, cooks: base.cooks.map((c, i) => ({ ...c,
      x: i + 1.5, y: 2.5, facing: 6, targetTile: 15 + i })) });
    const first = seated[0];
    if (first) state = hand(state, 'raw', 'chicken', first.id);
    if (seated.length === 8) {
      const grill = station(state, 'grill'), wok = station(state, 'wok');
      state = { ...state, stations: { ...state.stations,
        [grill.tile]: { ...grill, progress: COOK_STEPS / 2, content: { id: state.nextItemId,
          kind: 'raw', ingredient: 'satay', processes: [], place: { kind: 'counter', tile: grill.tile } } },
        [wok.tile]: { ...wok, fire: true } }, nextItemId: state.nextItemId + 1,
        cooks: state.cooks.map((c, i) => i === 6 ? { ...c, x: 12.5, targetTile: 26 }
          : i === 7 ? { ...c, x: 9.5, targetTile: 23 } : c) };
      const binCook = seated[7];
      if (!binCook) throw new Error('Missing eighth seat');
      state = hand(state, 'raw', 'kopi', binCook.id);
    }
    return state;
  } };
  for (const count of [1, 8]) {
    let worked = module.init(count, players.slice(0, count), {}, EMPTY_SETUP);
    if (count === 8) {
      const binItem = worked.inventory.held.p7?.id;
      worked = step(worked, createTick({ frames: new Map(['p0', 'p6', 'p7'].map((id) => [id, {
        held: 0, pressed: cross, released: 0, axes: [0, 0, 0, 0], age: 0, seq: 0 }])) }));
      expect(worked.inventory.held.p6?.kind).toBe('extinguisher');
      expect(items(worked).some((i) => i.id === binItem)).toBe(false);
      worked = step(worked, input(0, circle, 'p3'));
      expect(station(worked, 'grill').turned).toBe(true);
      expect(station(worked, 'wok').fire).toBe(true);
    } else worked = step(worked, input(cross, cross));
    worked = run(worked, WORK_STEPS, circle);
    expect(station(worked, 'chop').content?.kind).toBe('chopped');
  }
  const report = runConformance(module, [1, 8].map((count) => ({
    name: `station mechanisms ${String(count)} cooks`, players: count, steps: ROUND_STEPS + 1, seed: count,
    script: (context) => {
      return { pads: Object.fromEntries(context.players.map((p) => [p.id, {
        buttons: context.step === 0 ? ['FACE_BOTTOM'] : ['FACE_RIGHT'],
        stick: context.players.length === 8 && p.seat === 7 && context.step > 0 && context.step <= 200
          ? [-1, 0] : context.players.length === 8 && p.seat === 7 && context.step === 201 ? [0, -1] : [0, 0],
      }])) };
    },
  })), { sources: readSources(fs, new URL('.', import.meta.url).pathname) });
  if (process.env.T03_EVIDENCE === '1') {
    const root = new URL('../../../../uat/evidence/T-03-tabao-stations/', import.meta.url);
    fs.writeFileSync(new URL('conformance.txt', root), formatReport(report));
    fs.writeFileSync(new URL('conformance.json', root), JSON.stringify(report, null, 2));
  }
  expect(report.ok, formatReport(report)).toBe(true);
});

it('TR-007 TR-030 PERF-001 abuse plus occupied stations has bounded 210-second work; no resting item enumeration', () => {
  const abuseLevel: Level = { ...level, id: 'stations-and-crates-abuse', width: 20, height: 8,
    firesEnabled: false, extinguisherTile: 98,
    tiles: Array.from({ length: 160 }, (_, at) => {
      const x = at % 20, y = Math.floor(at / 20);
      if (y === 1 && x >= 1 && x <= 8) return { kind: 'station', stationId: `crate-${String(x)}`, ingredient: 'kopi' };
      if (at === 0) return { kind: 'station', stationId: 'returns', stationType: 'return-counter' };
      const type = y === 4 ? types[x - 1] : undefined;
      if (type) return { kind: 'station', stationId: type, stationType: type };
      if (at === 98) return { kind: 'counter' };
      return x === 0 || x === 19 || y === 0 || y === 7 ? { kind: 'wall' } : { kind: 'floor' };
    }),
  };
  const base = tabaoRush.init(88, players, {}, EMPTY_SETUP);
  let state = prepareStations({ ...base, level: abuseLevel, cooks: base.cooks.map((c, i) => ({ ...c,
    x: i + 1.5, y: 2.25, facing: 6, targetTile: 21 + i })) });
  // Seed each holding station. Keep cooking inputs busy, replacing completed output only in this harness.
  const stations = { ...state.stations };
  for (const s of Object.values(stations)) if (s.type !== 'bin') {
    stations[s.tile] = { ...s, content: { id: state.nextItemId, kind: s.type === 'sink' ? 'dirty-plate'
      : s.type === 'plating' ? 'plate' : 'raw', ingredient: 'kopi', place: { kind: 'counter', tile: s.tile } } };
    state = { ...state, nextItemId: state.nextItemId + 1 };
  }
  state = { ...state, stations };
  const samples: { tick: number; items: number; meanMs: number; p95Ms: number; worstMs: number }[] = [];
  for (let block = 0; block < 21; block++) {
    const times: number[] = [];
    for (let t = 0; t < 600; t++) {
      const active = { ...state.stations };
      for (const s of Object.values(active)) if (s.content && s.type !== 'plating') {
        active[s.tile] = { ...s, progress: (state.tick % 100), doneAge: 0, content: { ...s.content,
          kind: s.type === 'sink' ? 'dirty-plate' : 'raw' } };
      }
      state = { ...state, stations: active };
      const inputs = createTick({ frames: new Map(state.cooks.map((c) => [c.id, {
        held: cross | triangle, pressed: t % 2 === 0 ? cross | triangle : 0,
        released: 0, axes: [0, 0, 0, 0], age: 0, seq: t,
      }])) });
      const start = performance.now();
      state = step(state, inputs);
      times.push(performance.now() - start);
      expect(items(state).length).toBeLessThanOrEqual(127 + 8 + 1);
    }
    times.sort((a, b) => a - b);
    samples.push({ tick: state.tick, items: items(state).length,
      meanMs: times.reduce((a, b) => a + b, 0) / times.length,
      p95Ms: times[570] ?? 0, worstMs: times[599] ?? 0 });
  }
  expect(samples.slice(1).every((s) => s.items === samples[0]?.items)).toBe(true);
  const guard = (size: number) => {
    const entries: Item[] = Array.from({ length: size }, (_, id) => ({ id, kind: 'raw', place: { kind: 'floor', tile: 61 } }));
    for (let i = 0; i < 8; i++) entries.push({ id: size + i, kind: 'raw', place: { kind: 'flight',
      start: { x: 1.2, y: 5.5 }, end: { x: 5.2, y: 5.5 }, rest: { kind: 'floor', tile: 105 },
      startStep: 596, duration: 23, thrower: 'gone' } });
    const index = inventory(entries);
    let reads = 0;
    const held = new Proxy(index.held, { get(target, key: string) { reads++; return target[key]; },
      ownKeys() { throw new Error('Enumerated hands'); } });
    const floor = new Proxy(index.floor, { ownKeys() { throw new Error('Enumerated floor items'); } });
    const counters = new Proxy(index.counters, { ownKeys() { throw new Error('Enumerated counters'); } });
    const busy = { ...state, tick: 600, inventory: { ...index, held, floor, counters } };
    for (let n = 0; n < 100; n++) step(busy);
    return reads;
  };
  expect(guard(60)).toBe(6400);
  expect(guard(60)).toBe(guard(6000));
  if (process.env.T03_EVIDENCE === '1') fs.writeFileSync(new URL('../../../../uat/evidence/T-03-tabao-stations/performance.json', import.meta.url),
    JSON.stringify({ description: 'Eight crate mashers; all holding stations occupied, timers kept busy by harness; bin instantaneous.', samples,
      boundedReads60: guard(60), boundedReads6000: guard(6000) }, null, 2));
});


it('TR-007 grill runs on its timer but requires one turn; wok circle stirring speeds its timer without requiring a cook', () => {
  let grill = run(load('grill'), COOK_STEPS);
  expect(station(grill, 'grill').progress).toBe(COOK_STEPS / 2);
  expect(station(grill, 'grill').turned).toBe(false);
  grill = step(grill, input(circle));
  expect(station(grill, 'grill').turned).toBe(true);
  grill = run(aim(grill, 25), COOK_STEPS / 2 - 1);
  expect(station(grill, 'grill').content?.kind).toBe('cooked');
  const wok = run(load('wok'), COOK_STEPS / 2, circle);
  expect(station(wok, 'wok').content?.kind).toBe('cooked');
  expect(station(wok, 'wok').progress).toBe(COOK_STEPS);
});


it('TR-007 TR-008 only empty hands work a station; a pressed circle edge counts', () => {
  const loaded = load('chop');
  expect(station(step(hand(loaded, 'plate'), input(circle)), 'chop').progress).toBe(0);
  expect(station(step(loaded, input(0, circle)), 'chop').progress).toBe(1);
});

it('TR-010 spread loses food but preserves plates until the fire is put out', () => {
  let state = load('plating', 'plate');
  const source = station(state, 'drinks');
  state = { ...state, stations: { ...state.stations, [source.tile]: { ...source, fire: true, fireAge: SPREAD_STEPS - 1,
    neighbours: [21] } } };
  state = step({ ...state, fireSpreadClock: SPREAD_STEPS - 1 });
  expect(station(state, 'plating').fire).toBe(true);
  expect(station(state, 'plating').content?.kind).toBe('plate');
  state = itemPress(aim(state, 26), 'p0', 'cross');
  state = run(aim(state, 21), EXTINGUISH_STEPS, circle);
  expect(station(state, 'plating').fire).toBe(false);
  state = itemPress(aim(state, 26), 'p0', 'cross');
  expect(itemPress(aim(state, 21), 'p0', 'cross').inventory.held.p0?.kind).toBe('plate');
});


it('TR-010 TR-009 returning the extinguisher respects an in-flight counter reservation', () => {
  let state = itemPress(aim(initial(), 26), 'p0', 'cross');
  const thrown: Item = { id: state.nextItemId, kind: 'raw', place: { kind: 'flight', start: { x: 11.5, y: 3.5 },
    end: { x: 12.5, y: 1.5 }, rest: { kind: 'counter', tile: 26 }, startStep: 0, duration: 23, thrower: 'p0' } };
  state = { ...state, tick: 20, nextItemId: state.nextItemId + 1, inventory: { ...state.inventory,
    flights: [thrown], reserved: { 26: 1 } } };
  expect(itemPress(state, 'p0', 'cross')).toBe(state);
  state = run(state, 3);
  expect(items(state).map((i) => i.kind).sort()).toEqual(['extinguisher', 'raw']);
  expect(state.inventory.counters[26]?.kind).toBe('raw');
});
