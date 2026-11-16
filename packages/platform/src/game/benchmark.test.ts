// What does each way of stepping cost at Tabao Rush's size? (Owner's ruling D-048: a step may
// return a new state that shares its unchanged parts; this is the first evidence for it.)
//
// One made-up kitchen, the size the real one will be: 8 cooks, 40 stations, up to 40 items,
// 5 orders. The same rules are written three ways and must reach the same state:
//
//   in-place   changes the state it is given; creates nothing
//   sharing    returns a new state; copies only the cooks, stations, items and orders that
//              changed this step and shares the rest (what `returns-new` asks for)
//   whole copy returns a new state with every object copied, changed or not
//
// Each runs 10,000 steps a batch. Time is the best of several batches; bytes are the growth of
// the heap between samples, summed, so they include nothing that was freed in between and are
// a floor, not an exact count. The limits asserted are far above the measurements.
import { describe, expect, it } from 'vitest';
import { DEFAULT_STEP_MS, cloneState, hashState } from '@kaki/sim-core';
interface Cook {
  x: number;
  y: number;
  facing: number;
  holding: number;
  dash: number;
  anim: number;
}
interface Station {
  kind: number;
  x: number;
  y: number;
  state: number;
  progress: number;
  item: number;
}
interface Item {
  kind: number;
  x: number;
  y: number;
  stage: number;
}
interface Order {
  dish: number;
  patience: number;
}
interface Kitchen {
  tick: number;
  score: number;
  leftMs: number;
  cooks: readonly Cook[];
  stations: readonly Station[];
  items: readonly Item[];
  orders: readonly Order[];
}
const STEPS = 10000;
const BATCHES = 5;
function kitchen(): Kitchen {
  return {
    tick: 0,
    score: 0,
    leftMs: 210000,
    cooks: Array.from({ length: 8 }, (_, i) => ({
      x: 2 + i,
      y: 3,
      facing: i % 8,
      holding: -1,
      dash: 0,
      anim: 0,
    })),
    stations: Array.from({ length: 40 }, (_, i) => ({
      kind: i % 11,
      x: i % 10,
      y: Math.floor(i / 10),
      state: i % 5 === 0 ? 1 : 0,
      progress: 0,
      item: -1,
    })),
    items: Array.from({ length: 40 }, (_, i) => ({
      kind: i % 7,
      x: i % 10,
      y: Math.floor(i / 10),
      stage: 0,
    })),
    orders: Array.from({ length: 5 }, (_, i) => ({ dish: i % 7, patience: 30000 + i * 1000 })),
  };
}
// The rules, as small pure helpers on numbers, so the three versions cannot drift apart.
// Every cook moves every step; 8 of 40 stations are cooking and advance every step; one item
// changes every 6th step; every order loses patience every step. Timers kept as counters that
// change each step are the worst case for sharing: a real game can store "done at tick N".
const cookX = (cook: Cook, tick: number, i: number): number =>
  cook.x + Math.sin((tick + i * 40) / 30) * 0.05;
const cookY = (cook: Cook, tick: number, i: number): number =>
  cook.y + Math.cos((tick + i * 40) / 30) * 0.05;
const working = (station: Station): boolean => station.state === 1;
const nextProgress = (station: Station): number => (station.progress + 1) % 600;
const itemDue = (tick: number, i: number): boolean => tick % 6 === 0 && i === (tick / 6) % 40;
const nextPatience = (order: Order, i: number): number =>
  order.patience <= 0 ? 30000 + i * 1000 : order.patience - DEFAULT_STEP_MS;
function stepInPlace(state: Kitchen): Kitchen {
  const s = state;
  const tick = s.tick;
  for (let i = 0; i < s.cooks.length; i += 1) {
    const cook = s.cooks[i];
    if (cook === undefined) continue;
    const x = cookX(cook, tick, i);
    cook.y = cookY(cook, tick, i);
    cook.x = x;
    cook.anim = (cook.anim + 1) % 24;
  }
  for (const station of s.stations) {
    if (working(station)) {
      station.progress = nextProgress(station);
      if (station.progress === 0) s.score += 10;
    }
  }
  for (let i = 0; i < s.items.length; i += 1) {
    const item = s.items[i];
    if (item !== undefined && itemDue(tick, i)) item.stage += 1;
  }
  for (let i = 0; i < s.orders.length; i += 1) {
    const order = s.orders[i];
    if (order !== undefined) order.patience = nextPatience(order, i);
  }
  s.tick = tick + 1;
  s.leftMs -= DEFAULT_STEP_MS;
  return state;
}
function stepSharing(state: Kitchen): Kitchen {
  const tick = state.tick;
  let score = state.score;
  const cooks = state.cooks.map((cook, i) => ({
    ...cook,
    x: cookX(cook, tick, i),
    y: cookY(cook, tick, i),
    anim: (cook.anim + 1) % 24,
  }));
  const stations = state.stations.map((station) => {
    if (!working(station)) return station;
    const progress = nextProgress(station);
    if (progress === 0) score += 10;
    return { ...station, progress };
  });
  // Nothing in the list changed: share the list itself.
  const items =
    tick % 6 === 0
      ? state.items.map((item, i) => (itemDue(tick, i) ? { ...item, stage: item.stage + 1 } : item))
      : state.items;
  const orders = state.orders.map((order, i) => ({ ...order, patience: nextPatience(order, i) }));
  return {
    tick: tick + 1,
    score,
    leftMs: state.leftMs - DEFAULT_STEP_MS,
    cooks,
    stations,
    items,
    orders,
  };
}
function stepWholeCopy(state: Kitchen): Kitchen {
  const tick = state.tick;
  let score = state.score;
  const cooks = state.cooks.map((cook, i) => ({
    ...cook,
    x: cookX(cook, tick, i),
    y: cookY(cook, tick, i),
    anim: (cook.anim + 1) % 24,
  }));
  const stations = state.stations.map((station) => {
    if (!working(station)) return { ...station };
    const progress = nextProgress(station);
    if (progress === 0) score += 10;
    return { ...station, progress };
  });
  const items = state.items.map((item, i) =>
    itemDue(tick, i) ? { ...item, stage: item.stage + 1 } : { ...item },
  );
  const orders = state.orders.map((order, i) => ({ ...order, patience: nextPatience(order, i) }));
  return {
    tick: tick + 1,
    score,
    leftMs: state.leftMs - DEFAULT_STEP_MS,
    cooks,
    stations,
    items,
    orders,
  };
}
const stepGenericClone = (state: Kitchen): Kitchen => stepInPlace(cloneState(state));
interface Measured {
  micros: number;
  bytes: number;
  hash: string;
}
function measure(step: (state: Kitchen) => Kitchen): Measured {
  let state = kitchen();
  for (let i = 0; i < STEPS; i += 1) state = step(state);
  let best = Number.POSITIVE_INFINITY;
  let leastBytes = Number.POSITIVE_INFINITY;
  let hash = '';
  for (let batch = 0; batch < BATCHES; batch += 1) {
    state = kitchen();
    const start = performance.now();
    for (let i = 0; i < STEPS; i += 1) state = step(state);
    best = Math.min(best, ((performance.now() - start) * 1000) / STEPS);
    hash = hashState(state);
    // A second pass for memory, sampled often enough that a collection between two samples
    // (which shows as a drop, and is skipped) loses little.
    state = kitchen();
    let grown = 0;
    let counted = 0;
    let before = process.memoryUsage().heapUsed;
    for (let i = 0; i < STEPS; i += 10) {
      for (let j = 0; j < 10; j += 1) state = step(state);
      const after = process.memoryUsage().heapUsed;
      if (after >= before) {
        grown += after - before;
        counted += 10;
      }
      before = after;
    }
    if (counted > 0) leastBytes = Math.min(leastBytes, grown / counted);
  }
  return { micros: best, bytes: leastBytes, hash };
}
function report(label: string, result: Measured): void {
  const share = (result.micros / (DEFAULT_STEP_MS * 1000)) * 100;
  const perSecond = (result.bytes * 60) / 1024;
  process.stdout.write(
    '[step-mode benchmark] ' +
      label.padEnd(34) +
      ' ' +
      result.micros.toFixed(3).padStart(7) +
      ' \u00B5s per step (' +
      share.toFixed(4) +
      '% of a 16.7 ms step), about ' +
      result.bytes.toFixed(0).padStart(6) +
      ' bytes per step (' +
      perSecond.toFixed(0) +
      ' KB a second at 60 steps)\n',
  );
}
describe('step modes at Tabao Rush size: 8 cooks, 40 stations, 40 items, 5 orders', () => {
  it.skipIf(process.env.KAKI_BENCHMARK !== '1')(
    'measures in-place, structural sharing and whole-state copy over 10,000 steps',
    { timeout: 15000 },
    () => {
      const inPlace = measure(stepInPlace);
      const sharing = measure(stepSharing);
      const wholeCopy = measure(stepWholeCopy);
      const generic = measure(stepGenericClone);
      report('in-place', inPlace);
      report('returns-new, sharing', sharing);
      report('returns-new, whole copy by hand', wholeCopy);
      report('returns-new, cloneState every step', generic);
      // The same rules: all four end in the same state.
      expect(new Set([inPlace.hash, sharing.hash, wholeCopy.hash, generic.hash]).size).toBe(1);
      // Sharing must stay a small slice of the 16.7 ms step. Measured: about 1 µs. Limit: 100 µs
      // (0.6%).
      expect(sharing.micros).toBeLessThan(100);
      expect(inPlace.micros).toBeLessThan(100);
    },
  );
  it('sharing really shares: untouched stations and items are the same objects', () => {
    const before = kitchen();
    const after = stepSharing({ ...before, tick: 1 });
    expect(after.items).toBe(before.items);
    expect(after.stations[1]).toBe(before.stations[1]);
    expect(after.stations[0]).not.toBe(before.stations[0]);
    expect(after.cooks[0]).not.toBe(before.cooks[0]);
    expect(stepWholeCopy(before).stations[1]).not.toBe(before.stations[1]);
  });
});
