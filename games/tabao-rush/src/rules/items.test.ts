import { items, inventory } from './state';
import { expect, it } from 'vitest';
import { cloneState, createRng, deepFreeze, hashState, nextInt } from '@kaki/sim-core';
import type { SampledInput } from '@kaki/sim-core';
import { BUTTON, createTick, EMPTY_SETUP, STEP_MS } from '@kaki/platform';
import type { StepInputs } from '@kaki/platform';
import { tabaoRush } from './game';
import { heldItem, itemPress, THROW_RANGE, THROW_STEPS } from './items';
import { clearOfWalls } from './level';
import { MIN_SEPARATION } from './state';
import type { Cook, Item, Level, TabaoState } from './state';
import { targetTile } from './target';

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing fixture');
  return value;
}

const players = Array.from({ length: 8 }, (_, i) => ({ id: `p${String(i + 1)}`,
  seat: i + 1, name: `Cook ${String(i + 1)}`, colour: 'seat-1' as const }));
const level: Level = {
  id: 'item-rules', width: 10, height: 5, spawns: [],
  tiles: Array.from({ length: 50 }, (_, i) => i < 10 || i >= 40 || i % 10 === 0 || i % 10 === 9
    ? { kind: 'wall' as const } : i === 13 ? { kind: 'station' as const,
      stationId: 'crate', ingredient: 'cucumber' } : i === 16 || i === 26
      ? { kind: 'counter' as const } : { kind: 'floor' as const }),
};
function cook(id = 'p1', x = 3.5, y = 2.5, facing: Cook['facing'] = 6): Cook {
  return { id, x, y, facing, vx: 0, vy: 0, targetTile: targetTile(level, x, y, facing) };
}
function initial(cooks = [cook()]): TabaoState {
  return { ...tabaoRush.init(42, players.slice(0, cooks.length), {}, EMPTY_SETUP), level, cooks };
}
function carrying(state: TabaoState, kind: Item['kind'] = 'raw'): TabaoState {
  return { ...state, nextItemId: 1, inventory: inventory([{ id: 0, kind,
    place: { kind: 'held', cook: 'p1' } }]) };
}
function step(state: TabaoState, inputs: StepInputs = createTick()): TabaoState {
  return tabaoRush.step(state, inputs, STEP_MS);
}
function finish(state: TabaoState): TabaoState {
  for (let n = 0; n < THROW_STEPS; n += 1) state = step(state);
  return state;
}
function frame(x = 0, y = 0, pressed = 0): SampledInput {
  return { axes: [x, y, 0, 0], held: pressed, pressed, released: 0, age: 0, seq: 0 };
}

it('TR-002 crate supply is endless, hands hold one, occupied and processing stations refuse placement', () => {
  let state = initial();
  state = itemPress(state, 'p1', 'cross');
  expect(heldItem(state, 'p1')).toMatchObject({ kind: 'raw', ingredient: 'cucumber' });
  expect(itemPress(state, 'p1', 'cross')).toBe(state);
  state = { ...state, cooks: [cook('p1', 5.5, 1.5, 0)] };
  state = itemPress(state, 'p1', 'cross');
  expect(items(state)[0]?.place).toEqual({ kind: 'counter', tile: 16 });
  state = { ...state, cooks: [cook()] };
  state = itemPress(state, 'p1', 'cross');
  expect(state.nextItemId).toBe(2);
  state = { ...state, cooks: [cook('p1', 5.5, 1.5, 0)] };
  expect(itemPress(state, 'p1', 'cross')).toBe(state);
  state = { ...state, cooks: [{ ...cook(), targetTile: 13 }] };
  expect(itemPress(state, 'p1', 'cross')).toBe(state);
});

it('TR-023 TR-002 counters pass the same item across the counter without copying or hand swaps', () => {
  let state = carrying(initial([cook('p1', 5.5, 2.5, 0), cook('p2', 7.5, 2.5, 4)]));
  state = itemPress(state, 'p1', 'cross');
  expect(items(state)[0]?.place).toEqual({ kind: 'counter', tile: 26 });
  state = itemPress(state, 'p2', 'cross');
  expect(heldItem(state, 'p2')?.id).toBe(0);
  expect(items(state)).toHaveLength(1);
  expect(heldItem(state, 'p1')).toBeUndefined();
});

it('TR-021 TR-002 cross uses the pre-press highlighted target despite simultaneous movement', () => {
  const state = initial();
  expect(state.cooks[0]?.targetTile).toBe(13);
  const next = step(state, createTick({ frames: new Map([
    ['p1', frame(1, 0, 1 << BUTTON.FACE_BOTTOM)],
  ]) }));
  expect(heldItem(next, 'p1')?.ingredient).toBe('cucumber');
  expect(next.cooks[0]?.facing).toBe(0);
  expect(next.cooks[0]?.targetTile).toBeNull();
});

it('TR-002 TR-009 ignores button taps and resolves cross before triangle', () => {
  const state = initial();
  const actions = ['cross', 'triangle'].map((control) => ({ player: 'p1', control, revision: 0 }));
  expect(items(step(state, createTick({ actions })))).toHaveLength(0);
  const frames = new Map([['p1', frame(0, 0, (1 << BUTTON.FACE_BOTTOM) | (1 << BUTTON.FACE_TOP))]]);
  expect(items(step(state, createTick({ frames, actions })))[0]?.place.kind).toBe('flight');
});

it('TR-009 raw and chopped fly four tiles with public arc timing and settle without overshoot', () => {
  for (const kind of ['raw', 'chopped'] as const) {
    const state = carrying(initial([cook('p1', 1.5, 3.5, 0)]), kind);
    let thrown = itemPress(state, 'p1', 'triangle');
    expect(items(thrown)[0]?.place).toEqual({ kind: 'flight', start: { x: 1.5, y: 3.5 },
      end: { x: 1.5 + THROW_RANGE, y: 3.5 }, rest: { kind: 'floor', tile: 35 }, startStep: 0, duration: THROW_STEPS, thrower: 'p1' });
    expect(tabaoRush.publicView(thrown)).toMatchObject({ items: items(thrown) });
    for (let n = 1; n < THROW_STEPS; n += 1) {
      thrown = step(thrown);
      expect(items(thrown)[0]?.place.kind).toBe('flight');
    }
    thrown = step(thrown);
    expect(items(thrown)[0]?.place).toEqual({ kind: 'floor', tile: 35 });
    expect(step(thrown).inventory).toBe(thrown.inventory);
    thrown = { ...thrown, cooks: [cook('p1', 5.5, 3.5, 0)] };
    expect(heldItem(itemPress(thrown, 'p1', 'cross'), 'p1')?.id).toBe(0);
  }
});

it('TR-009 plates, dishes and equipment cannot be thrown; other controls are inert', () => {
  for (const kind of ['plate', 'dish', 'extinguisher'] as const) {
    const state = carrying(initial(), kind);
    expect(itemPress(state, 'p1', 'triangle')).toBe(state);
    for (const button of ['circle', 'square', 'start']) expect(itemPress(state, 'p1', button)).toBe(state);
  }
  const state = carrying(initial());
  expect(items(itemPress({ ...state, tick: state.endTick - THROW_STEPS + 1 }, 'p1', 'triangle'))[0]?.place.kind).toBe('held');
});

it('TR-009 counter landings, occupied counters, walls, boundaries and stations preserve every item', () => {
  const state = carrying(initial([cook('p1', 2.5, 2.5, 0)]));
  const landed = finish(itemPress(state, 'p1', 'triangle'));
  expect(items(landed)[0]?.place).toEqual({ kind: 'counter', tile: 26 });
  const occupied: TabaoState = { ...state, nextItemId: 2, inventory: inventory([...items(state),
    { id: 1, kind: 'raw', place: { kind: 'counter', tile: 26 } }]) };
  const fallback = finish(itemPress(occupied, 'p1', 'triangle'));
  expect(items(fallback)[0]?.place.kind).toBe('floor');
  expect(items(fallback)[1]?.place).toEqual({ kind: 'counter', tile: 26 });
  for (const cookAt of [cook('p1', 8.5, 3.5, 0), cook(), cook('p1', 1.5, 1.5, 5)]) {
    const blocked = finish(itemPress(carrying(initial([cookAt])), 'p1', 'triangle'));
    expect(items(blocked)).toHaveLength(1);
    expect(items(blocked)[0]?.place.kind).toBe('floor');
  }
  const open: Level = { ...level, tiles: level.tiles.map(() => ({ kind: 'floor' })) };
  const outside = finish(itemPress({ ...carrying(initial([cook('p1', 8.5, 3.5, 0)])),
    level: open }, 'p1', 'triangle'));
  expect(items(outside)[0]?.place).toEqual({ kind: 'floor', tile: 39 });
});

it('TR-009 catches an empty teammate in the swept path; full hands keep both items', () => {
  const state = carrying(initial([cook('p1', 1.5, 3.5, 0), cook('p2', 3.5, 3.5)]));
  const caught = finish(itemPress(state, 'p1', 'triangle'));
  expect(heldItem(caught, 'p2')?.id).toBe(0);
  const full: TabaoState = { ...state, nextItemId: 2, inventory: inventory([...items(state),
    { id: 1, kind: 'dish', place: { kind: 'held', cook: 'p2' } }]) };
  const missed = finish(itemPress(full, 'p1', 'triangle'));
  expect(heldItem(missed, 'p2')?.id).toBe(1);
  expect(items(missed)[0]?.place).toEqual({ kind: 'floor', tile: 35 });
});

it('TR-002 leaving drops held items; leaving throwers do not cancel flights; spectators cannot interact', () => {
  const state = carrying(initial([cook('p1', 1.5, 3.5, 0)]));
  const left = tabaoRush.leave(state, 'p1');
  expect(items(left)[0]?.place).toEqual({ kind: 'floor', tile: 31 });
  const thrown = itemPress(state, 'p1', 'triangle');
  expect(items(finish(tabaoRush.leave(thrown, 'p1')))[0]?.place.kind).toBe('floor');
  const joined = tabaoRush.join(step(left), required(players[0]));
  expect(itemPress(joined, 'p1', 'cross')).toBe(joined);
});

it('TR-002 TR-009 TR-023 layouts keep stable revisions, activate cross/triangle only and expose no secrets', () => {
  const state = initial();
  const layout = tabaoRush.controllerLayout(state, 'p1');
  expect(layout.controls.filter((control) => control.kind === 'button' && !control.disabled)
    .map((control) => control.id)).toEqual(['cross', 'triangle']);
  expect(tabaoRush.controllerLayout(itemPress(state, 'p1', 'cross'), 'p1')).toBe(layout);
  expect(tabaoRush.privateView(state, 'p1')).toBeNull();
  expect(tabaoRush.secrets(state)).toEqual([]);
});

it('TR-002 TR-009 TR-023 TR-020 TR-021 TR-022 seeded long matches conserve identities, capacity, flight deadlines, movement and determinism at 1–8 cooks',
  { timeout: 120000 }, () => {
    for (let count = 1; count <= 8; count += 1) {
      const rng = createRng(9000 + count);
      let state = tabaoRush.init(count, players.slice(0, count), {}, EMPTY_SETUP);
      // A real reachable crate starts every run with supply to move, drop and throw.
      state = { ...state, cooks: state.cooks.map((entry, i) => i === 0
        ? { ...entry, x: 3.5, y: 2.5, facing: 6, targetTile: 13 }
        : i === 2 ? { ...entry, x: 1.5 } : entry) };
      const baseline = hashState(state);
      let replay = cloneState(state);
      let issued = 0;
      let returning: typeof players[number] | undefined;
      const flights = new Map<number, number>();
      const sticks = new Map<string, readonly [number, number]>();
      for (let tick = 0; tick < 12600; tick += 1) {
        if (returning) {
          state = tabaoRush.join(state, returning);
          replay = tabaoRush.join(replay, returning);
          returning = undefined;
        } else if (tick > 100 && nextInt(rng, 0, 699) === 0) {
          // Keep one active cook; churn other seats (a solo run also gains spectators).
          const player = required(players[nextInt(rng, 1, Math.max(1, count - 1))]);
          if (state.players.some((entry) => entry.id === player.id)) {
            state = tabaoRush.leave(state, player.id);
            replay = tabaoRush.leave(replay, player.id);
          }
          returning = player;
        }
        const frames = new Map<string, SampledInput>();
        for (const entry of state.cooks) {
          if (tick % 40 === 0) sticks.set(entry.id, [nextInt(rng, -1, 1), nextInt(rng, -1, 1)]);
          const stick = sticks.get(entry.id) ?? [0, 0];
          frames.set(entry.id, tick < 3 ? frame(0, 0, entry.id === 'p1'
            ? tick === 0 ? 1 << BUTTON.FACE_BOTTOM : tick === 2 ? 1 << BUTTON.FACE_TOP : 0 : 0)
            : frame(stick[0], stick[1], nextInt(rng, 0, 3) === 0 ? 1 << BUTTON.FACE_BOTTOM :
              nextInt(rng, 0, 3) === 0 ? 1 << BUTTON.FACE_TOP : 0));
        }
        const inputs: StepInputs = createTick({ frames });
        const previous = state;
        state = step(deepFreeze(state), inputs);
        replay = step(replay, inputs);
        if (hashState(state) !== hashState(replay)) throw new Error('Non-deterministic match');
        if (items(state).length !== state.nextItemId) throw new Error('Lost or duplicated item');
        if (new Set(items(state).map((item) => item.id)).size !== items(state).length) throw new Error('Duplicate identity');
        for (const old of items(previous)) {
          if (!items(state).some((item) => item.id === old.id && item.kind === old.kind &&
            item.ingredient === old.ingredient)) throw new Error('An existing item vanished or changed');
        }
        for (const item of items(state)) {
          if (item.id < previous.nextItemId) continue;
          if (item.place.kind !== 'held') throw new Error('Crate item must enter empty hands');
          const holder = item.place.cook;
          const before = previous.cooks.find((entry) => entry.id === holder);
          const crate = before?.targetTile === null || before?.targetTile === undefined
            ? undefined : previous.level.tiles[before.targetTile];
          if (crate?.kind !== 'station' || crate.ingredient !== item.ingredient ||
            heldItem(previous, holder) ||
            ((frames.get(holder)?.pressed ?? 0) & (1 << BUTTON.FACE_BOTTOM)) === 0) {
            throw new Error('Item appeared without a valid crate press');
          }
        }
        issued += state.nextItemId - previous.nextItemId;
        const holders = new Set<string>();
        const counters = new Set<number>();
        for (const item of items(state)) {
          const loc = item.place;
          if (loc.kind === 'held') {
            if (holders.has(loc.cook) || !state.cooks.some((c) => c.id === loc.cook)) throw new Error('Invalid hands');
            holders.add(loc.cook);
          } else if (loc.kind === 'counter') {
            if (counters.has(loc.tile) || state.level.tiles[loc.tile]?.kind !== 'counter') throw new Error('Invalid counter');
            counters.add(loc.tile);
          } else if (loc.kind === 'floor') {
            if (state.level.tiles[loc.tile]?.kind !== 'floor') throw new Error('Invalid floor');
          } else {
            if (state.tick >= loc.startStep + loc.duration) throw new Error('Overdue flight');
            flights.set(item.id, loc.startStep + loc.duration);
          }
          if (loc.kind !== 'flight' && flights.has(item.id)) {
            if (state.tick > required(flights.get(item.id))) throw new Error('Late landing');
            flights.delete(item.id);
          }
        }
        for (let i = 0; i < state.cooks.length; i += 1) {
          const a = required(state.cooks[i]);
          if (!clearOfWalls(state.level, a.x, a.y)) throw new Error('Wall penetration');
          if (a.targetTile !== targetTile(state.level, a.x, a.y, a.facing)) throw new Error('Wrong highlight');
          for (let j = 0; j < i; j += 1) {
            const b = required(state.cooks[j]);
            if (Math.hypot(a.x - b.x, a.y - b.y) < MIN_SEPARATION - 1e-8) throw new Error('Cook penetration');
          }
        }
      }
      expect(hashState(state)).not.toBe(baseline);
      expect(issued).toBeGreaterThan(0);
      expect(flights.size).toBe(0);
    }
  });

it('TR-009 diagonal arcs keep Euclidean range and an obstructed corner cannot leak through a wall', () => {
  const open: Level = { ...level, tiles: level.tiles.map(() => ({ kind: 'floor' })) };
  for (const facing of [0, 1, 2, 3, 4, 5, 6, 7] as const) {
    const state = { ...carrying(initial([cook('p1', 5, 2.5, facing)])), level: open };
    const flight = items(itemPress(state, 'p1', 'triangle'))[0]?.place;
    if (flight?.kind !== 'flight') throw new Error('Missing flight');
    expect(Math.hypot(flight.end.x - flight.start.x, flight.end.y - flight.start.y))
      .toBeLessThanOrEqual(THROW_RANGE + 1e-12);
    expect(items(finish(itemPress(state, 'p1', 'triangle')))[0]?.place.kind).toBe('floor');
  }
  const state = carrying(initial([cook('p1', 2.5, 2.5, 7)]));
  const flight = items(itemPress(state, 'p1', 'triangle'))[0]?.place;
  if (flight?.kind !== 'flight') throw new Error('Missing flight');
  expect(flight.end.x).toBeLessThan(3);
  expect(flight.end.y).toBeGreaterThan(2);
});

it('TR-009 a moving teammate can catch mid-flight; competing flights fill hands only once', () => {
  let state = carrying(initial([cook('p1', 1.5, 3.5, 0), cook('p2', 3.5, 2.5)]));
  state = itemPress(state, 'p1', 'triangle');
  for (let i = 0; i < 11; i += 1) state = step(state);
  state = { ...state, cooks: [cook('p1', 1.5, 3.5, 0), cook('p2', 3.5, 3.5)] };
  state = step(state);
  expect(heldItem(state, 'p2')?.id).toBe(0);
  const flight = { kind: 'flight' as const, start: { x: 1.5, y: 3.5 },
    end: { x: 5.5, y: 3.5 }, rest: { kind: 'floor' as const, tile: 35 }, startStep: 0, duration: THROW_STEPS, thrower: 'p1' };
  const competing: TabaoState = { ...initial([cook('p1', 1.5, 3.5, 0), cook('p2', 3.5, 3.5)]),
    nextItemId: 2, inventory: inventory([{ id: 0, kind: 'raw', place: flight },
      { id: 1, kind: 'chopped', place: flight }]) };
  const landed = finish(competing);
  expect(heldItem(landed, 'p2')?.id).toBe(0);
  expect(items(landed)[1]?.place.kind).toBe('floor');
});

it('TR-023 TR-002 same-step counter contests use ascending seat regardless of frame order', () => {
  const state: TabaoState = { ...initial([cook('p1', 5.5, 2.5, 0), cook('p2', 7.5, 2.5, 4)]),
    nextItemId: 1, inventory: inventory([{ id: 0, kind: 'raw', place: { kind: 'counter', tile: 26 } }]) };
  for (const ids of [['p2', 'p1'], ['p1', 'p2']]) {
    const frames = new Map(ids.map((id) => [id, frame(0, 0, 1 << BUTTON.FACE_BOTTOM)]));
    expect(heldItem(step(state, createTick({ frames })), 'p1')?.id).toBe(0);
  }
});

it('TR-002 TR-009 untouched item branches and payloads are shared across pure frozen steps', () => {
  const state = deepFreeze(carrying(initial()));
  const next = step(state);
  expect(next.inventory).toBe(state.inventory);
  expect(next.level).toBe(state.level);
  expect(next.players).toBe(state.players);
  const thrown = itemPress(state, 'p1', 'triangle');
  expect(thrown.inventory).not.toBe(state.inventory);
  expect(items(state)[0]?.place.kind).toBe('held');
  expect(step(thrown).inventory).toBe(thrown.inventory);
});
