import { conformanceTimeout } from '@kaki/platform/kit';
import * as fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { cloneState, decodeState, encodeState, hashState } from '@kaki/sim-core';
import { createTick, secondsToSteps, STEP_MS } from '@kaki/platform';
import { formatReport, readSources, runConformance } from '@kaki/platform/kit';
import { ROUND_STEPS, tabaoRush } from './game';
import { arriveOrders, ageOrders, completeOrder, DISH_POINTS, ensureOrders, patience, scaling, stars } from './orders';
import { withOrder } from './orders.fixture';
import { RECIPES, CAPACITY, containerOf, food } from './recipes';
import { Journey, initial, level, offered, station, cross } from './recipe-journey.fixture';
import { items } from './state';
import type { TabaoState } from './state';

function required<T>(value: T | undefined): T { if (value === undefined) throw new Error('Missing fixture'); return value; }
const kitchen = (s: TabaoState) => required(s.kitchens?.[0]);
const step = (s: TabaoState) => tabaoRush.step(s, createTick(), STEP_MS);
const serve = (s: TabaoState, count = 1) => tabaoRush.step(s, createTick({ frames: new Map(s.cooks.slice(0, count).reverse().map((c) => [c.id,
  { held: 0, pressed: cross, released: 0, axes: [0, 0, 0, 0], age: 0, seq: s.tick }])) }), STEP_MS);
function holding(s: TabaoState, dish = 'chicken-rice'): TabaoState {
  const recipe = required(RECIPES.find((r) => r.id === dish));
  return { ...s, cooks: s.cooks.map((c) => ({ ...c, targetTile: station('serving'), x: 21.5, y: 2.5, facing: 6 })),
    inventory: { ...s.inventory, held: Object.fromEntries(s.cooks.map((c, i) => [c.id, { ...offered(recipe), id: 100 + i * 10, place: { kind: 'held' as const, cook: c.id } }])) } };
}
const evidence = new URL('../../../../uat/evidence/T-05-tabao-orders/', import.meta.url);
function save(name: string, value: string) {
  if (process.env.T05_EVIDENCE !== '1') return;
  fs.mkdirSync(evidence, { recursive: true }); fs.writeFileSync(new URL(name, evidence), value);
}

it.each([
  ['TR-005: "default 3 minutes 30 seconds"', ROUND_STEPS, 12600],
  ['TR-005: "0 to 3 stars"', stars({ ...kitchen(ensureOrders(initial())), score: 0 }), 0],
  ['TR-005: "0 to 3 stars"', stars({ ...kitchen(ensureOrders(initial())), score: 600 }), 3],
])('%s', (_, actual, expected) => { expect(actual).toBe(expected); });

it.each([
  [1, 1440, 2, [200, 400, 600]], [2, 828, 3, [350, 700, 1040]],
  [3, 598, 4, [480, 960, 1450]], [4, 475, 5, [610, 1210, 1820]],
  [5, 398, 6, [720, 1450, 2170]], [6, 344, 6, [840, 1680, 2510]],
  [7, 304, 6, [950, 1900, 2840]], [8, 273, 6, [1060, 2110, 3170]],
])('TR-006 D-091(d): %i cooks', (n, interval, maximum, thresholds) => {
  expect(scaling(n)).toEqual({ interval, maximum, thresholds });
});
it.each([
  ['kopi-teh', 40, 40], ['laksa', 80, 55], ['char-kway-teow', 80, 55],
  ['chicken-rice', 100, 60], ['satay', 100, 60], ['kaya-toast', 120, 75], ['rojak', 120, 75],
] as const)('TR-004 D-091(a,b,c): %s points, patience, tips and expiry', (dish, points, seconds) => {
  expect(RECIPES.find((r) => r.id === dish)).toMatchObject({ basePoints: points, patienceSeconds: seconds });
  expect(DISH_POINTS[dish]).toBe(points); expect(patience(dish)).toBe(secondsToSteps(seconds));
  for (const fraction of [1, 0.5, 0.25, 1 / patience(dish)]) {
    const s = withOrder(initial(), dish), k = kitchen(s);
    const remaining = Math.round(patience(dish) * fraction), tip = Math.floor(points * 0.2 * remaining / patience(dish));
    const after = completeOrder({ ...s, kitchens: [{ ...k, orders: k.orders.map((o) => ({ ...o, remaining })) }] }, 'coop', dish, 'p0');
    expect(after.orderEvents?.at(-1)).toMatchObject({ points, tip, delta: points + tip });
  }
  const s = withOrder(initial(), dish), k = kitchen(s);
  const expired = ageOrders({ ...s, kitchens: [{ ...k, score: 100, orders: k.orders.map((o) => ({ ...o, remaining: 1 })) }] });
  expect(expired.orderEvents?.[0]).toMatchObject({ penalty: Math.floor(points / 4), delta: -Math.floor(points / 4) });
});
it('TR-005 threshold boundaries give exactly 0, 1, 2 or 3 stars', () => {
  const k = kitchen(ensureOrders(initial()));
  for (const [score, expected] of [[0, 0], [199, 0], [200, 1], [399, 1], [400, 2], [599, 2], [600, 3]]) expect(stars({ ...k, score: required(score) })).toBe(expected);
});
it('TR-001 same seed gives the same dish sequence; counts affect scheduling only', () => {
  const stream = (count: number, seed: number) => {
    let s = ensureOrders({ ...initial(count, seed), level: { ...level, allowedDishes: RECIPES.map((r) => r.id) } });
    const dishes = [kitchen(s).orders[0]?.dish];
    for (let i = 0; i < 30; i++) {
      s = { ...s, tick: kitchen(s).nextArrival, kitchens: [{ ...kitchen(s), orders: [] }] };
      s = arriveOrders(s); dishes.push(kitchen(s).orders[0]?.dish);
      expect(kitchen(s).nextArrival - s.tick).toBe(scaling(count).interval);
    }
    return dishes;
  };
  expect(stream(1, 73)).toEqual(stream(1, 73)); expect(stream(8, 73)).toEqual(stream(1, 73));
  expect(stream(1, 74)).not.toEqual(stream(1, 73));
});
it('TR-004 defect-first refusal preserves dishes; oldest order wins; seat resolves simultaneous service before expiry', () => {
  let s = holding(withOrder(initial(2), 'chicken-rice'));
  const k = kitchen(s), first = required(k.orders[0]);
  s = { ...s, kitchens: [{ ...k, orders: [{ ...first, remaining: 1 }] }] };
  const after = serve(s, 2);
  expect(after.orderEvents).toMatchObject([{ type: 'served', order: first.id, cook: 'p0', points: 100, tip: 0 }, { type: 'refused', cook: 'p1', reason: { code: 'not-ordered' } }]);
  expect(after.inventory.held.p1).toBe(s.inventory.held.p1); expect(kitchen(after).expired).toBe(0);
  const wrong = holding(withOrder(initial(), 'satay'));
  expect(serve(wrong).inventory.held.p0).toBe(wrong.inventory.held.p0);
  expect(serve(wrong).orderEvents?.[0]).toMatchObject({ type: 'refused', reason: { code: 'not-ordered' } });
  const bad = required(wrong.inventory.held.p0);
  const burnt = { ...wrong, inventory: { ...wrong.inventory, held: { p0: { ...bad, contents: [{ id: 101, ingredient: 'rice', kind: 'burnt' as const }] } } } };
  expect(serve(burnt).orderEvents?.[0]).toMatchObject({ reason: { code: 'burnt' } });
  const two = { ...s, kitchens: [{ ...k, orders: [first, { ...first, id: first.id + 1, arrivalStep: 1 }], nextId: first.id + 2 }] };
  expect(serve(two).orderEvents?.[0]).toMatchObject({ type: 'served', order: first.id });
  expect(step(after).orderEvents).toEqual([]);
});
it('TR-001/004 patience warns at last quarter and expires with a clamped penalty', () => {
  const base = ensureOrders(initial()), k = kitchen(base), o = required(k.orders[0]);
  for (const score of [0, 5, 30]) {
    const s = { ...base, kitchens: [{ ...k, score, orders: [{ ...o, remaining: 1 }] }] };
    const next = ageOrders(s);
    expect(kitchen(next)).toMatchObject({ score: Math.max(0, score - 25), expired: 1, orders: [] });
    expect(next.orderEvents?.[0]).toMatchObject({ type: 'expired', penalty: Math.min(score, 25), delta: -Math.min(score, 25) });
  }
  const next = ageOrders({ ...base, kitchens: [{ ...k, orders: [{ ...o, remaining: 901 }] }] });
  expect(kitchen(next).orders[0]).toMatchObject({ remaining: 900, total: 3600, warning: true });
});
it('TR-006 D-091: leave changes future arrival rate; stars retain elapsed crew history; joiners spectate', () => {
  let s = ensureOrders(initial(8));
  const due = kitchen(s).nextArrival;
  s = step(s);
  s = tabaoRush.leave(s, 'p7');
  const left = kitchen(s);
  s = tabaoRush.join(s, { id: 'new', seat: 8, name: 'New', colour: 'seat-8' });
  expect(s.cooks).toHaveLength(7); expect(kitchen(s)).toBe(left);
  expect(tabaoRush.results(s).players.at(-1)).toMatchObject({ score: 0, joinedMidGame: true });
  s = arriveOrders({ ...s, tick: due });
  expect(kitchen(s)).toMatchObject({ cooks: 7, nextArrival: due + 304, thresholds: [1060, 2110, 3170] });
  expect(kitchen(s).orders[0]).toEqual(left.orders[0]);
});
it('TR-001/006 D-091(d): full queues skip draws; a smaller crew retains every card and drains to the new cap', () => {
  let s = ensureOrders(initial(8));
  for (let slot = 0; slot < 8; slot++) s = arriveOrders({ ...s, tick: kitchen(s).nextArrival });
  expect(kitchen(s).orders).toHaveLength(6);
  const full = kitchen(s);
  s = arriveOrders({ ...s, tick: full.nextArrival });
  expect(kitchen(s).rng).toBe(full.rng); expect(kitchen(s).nextId).toBe(full.nextId);
  for (let i = 1; i < 8; i++) s = tabaoRush.leave(s, `p${String(i)}`);
  expect(kitchen(s)).toMatchObject({ maximum: 6, targetMaximum: 2, cooks: 1 });
  expect(kitchen(s).orders).toEqual(full.orders);
  const retained = kitchen(s);
  s = arriveOrders({ ...s, tick: retained.nextArrival });
  expect(kitchen(s).orders).toEqual(retained.orders);
  expect(kitchen(s).rng).toBe(retained.rng);
  expect(kitchen(s).nextId).toBe(retained.nextId);
  // Service drains below the new cap before another draw becomes possible.
  while (kitchen(s).orders.length >= 2) s = completeOrder(s, retained.id, required(kitchen(s).orders[0]).dish, 'p0');
  s = arriveOrders({ ...s, tick: kitchen(s).nextArrival });
  expect(kitchen(s).orders).toHaveLength(2);
  expect(kitchen(s).maximum).toBe(2);
  expect(retained.score).toBe(full.score);
});
it('TR-001/006 downscaling drains inherited orders within an explicit bound by service or expiry', () => {
  let s = ensureOrders(initial(8));
  for (let slot = 0; slot < 6; slot++) s = arriveOrders({ ...s, tick: kitchen(s).nextArrival });
  for (let i = 1; i < 8; i++) s = tabaoRush.leave(s, `p${String(i)}`);
  expect(kitchen(s).orders).toHaveLength(6);
  const inherited = s;
  for (let n = 6; n > 0; n--) {
    s = completeOrder(s, 'coop', 'chicken-rice', 'p0');
    expect(kitchen(s).orders).toHaveLength(n - 1);
    expect(kitchen(s).maximum).toBe(Math.max(n - 1, 2));
  }
  const k = kitchen(inherited);
  const aged = ageOrders({ ...inherited, kitchens: [{ ...k, orders: k.orders.map((o) => ({ ...o, remaining: 1 })) }] });
  expect(kitchen(aged)).toMatchObject({ orders: [], maximum: 2, targetMaximum: 2, expired: 6 });
  expect(aged.orderEvents).toHaveLength(6);
  expect(aged.orderEvents?.every((e) => e.type === 'expired')).toBe(true);
});
it('TR-001/004 step work never enumerates resting inventories, even with thousands of items', () => {
  const deny = <T extends object>(value: T) => new Proxy(value, { ownKeys() { throw new Error('Scanned resting items'); } });
  const base = ensureOrders(initial(8));
  const entries = Object.fromEntries(Array.from({ length: 6000 }, (_, id) => [id, undefined]));
  const inventory = { ...base.inventory, held: deny(base.inventory.held), counters: deny(entries), floor: deny(base.inventory.floor) };
  const s = step({ ...base, inventory });
  expect(s.inventory).toBe(inventory); expect(s.level).toBe(base.level); expect(s.players).toBe(base.players);
  expect(kitchen(s).orders.length).toBeLessThanOrEqual(9);
});
it('TR-005 results at zero, during play and end; exact final step freezes all containers including transit', () => {
  let s = holding(withOrder(initial(), 'chicken-rice'));
  expect(tabaoRush.results(s)).toMatchObject({ mode: 'coop', score: 0, extras: { stars: 0 } });
  s = serve({ ...s, endTick: 2 });
  expect(tabaoRush.results(s)).toMatchObject({ score: 120, players: [{ score: 120, place: 1 }] });
  expect(tabaoRush.isOver(s)).toBe(false);
  s = step(s); expect(s.tick).toBe(2); expect(tabaoRush.isOver(s)).toBe(true);
  expect(s.returns).toHaveLength(1); expect(serve(s)).toBe(s);
  expect(tabaoRush.results(s).score).toBe(120);
  expect(tabaoRush.publicView(s)).toHaveProperty('timer', { remaining: 0, total: 2 });
  const hooked = step({ ...initial(), level: { ...level, roundSeconds: 2 } });
  expect(hooked.endTick).toBe(120);
});
it('TR-004 kitchens keep independent queues and score', () => {
  const s = ensureOrders({ ...initial(), level: { ...level, tiles: level.tiles.map((t) => t.kind === 'station' && t.stationType === 'serving' ? { ...t, kitchen: 'red' } : t) } });
  const red = { ...kitchen(s), id: 'red' }, blue = { ...kitchen(s), id: 'blue' };
  const next = completeOrder({ ...s, kitchens: [red, blue] }, 'blue', 'chicken-rice', 'p0');
  expect(next.kitchens?.[0]).toBe(red); expect(next.kitchens?.[1]?.score).toBe(120);
});

describe('TR-001 TR-004 TR-005 TR-006 complete rounds', { timeout: 120000 }, () => {
  for (const count of [1, 2, 4, 8]) it(`${String(count)} cooks: real crate-to-serve journey then complete round, exact event arithmetic`, () => {
    const driver = new Journey(count);
    // Driver walks and presses only; the order is created by the actual seeded scheduler.
    const events: NonNullable<TabaoState['orderEvents']>[number][] = [];
    const original = driver.tick.bind(driver);
    driver.tick = (mask, x, y) => { original(mask, x, y); events.push(...(driver.state.orderEvents ?? [])); };
    driver.dish('chicken-rice'); driver.serve();
    const served = required(events.find((e) => e.type === 'served'));
    expect(served).toMatchObject({ dish: 'chicken-rice', points: 100 });
    expect(served.tip).toBe(Math.floor(100 * 0.2 * (3600 - served.step) / 3600));
    while (!tabaoRush.isOver(driver.state)) driver.tick();
    expect(driver.state.tick).toBe(12600);
    expect(kitchen(driver.state).score).toBe(events.reduce((sum, e) => sum + ('delta' in e ? e.delta : 0), 0));
    let ruledScore = 0;
    for (const event of events) {
      if (event.type === 'served') {
        expect(event.points).toBe(DISH_POINTS[event.dish]);
        expect(event.delta).toBe(event.points + event.tip);
        ruledScore += event.delta;
      } else if (event.type === 'expired') {
        const loss = Math.min(ruledScore, Math.floor((DISH_POINTS[event.dish] ?? 0) / 4));
        expect(event.penalty).toBe(loss); expect(event.delta).toBe(-loss); ruledScore -= loss;
      }
      expect(ruledScore).toBeGreaterThanOrEqual(0);
    }
    expect(kitchen(driver.state).score).toBe(ruledScore);
    expect(kitchen(driver.state).score).toBe(0);
    expect(kitchen(driver.state).thresholds).toEqual(scaling(count).thresholds);
    expect(kitchen(driver.state).expired).toBeGreaterThan(0);
    expect(tabaoRush.results(driver.state).players.every((p) => p.score === kitchen(driver.state).score)).toBe(true);
  });
  it('conformance retains all scenarios: ordered service AND expiry at 1 and 8 cooks', { timeout: conformanceTimeout(64495) }, () => {
    const driver = new Journey(); driver.dish('chicken-rice'); driver.serve();
    const counts = new Map<number, { served: number; expired: number }>();
    const module: typeof tabaoRush = { ...tabaoRush, init(seed, seated) {
      const base = initial(seated.length, seed);
      const active = new Set(['chop', 'rice', 'plating', 'serving', 'dish-rack', 'return-counter']);
      const kitLevel = { ...level, roundSeconds: 80, tiles: level.tiles.map((t) => t.kind === 'station' && t.stationType && !active.has(t.stationType) ? { kind: 'counter' as const } : t) };
      return { ...base, level: kitLevel, stations: Object.fromEntries(Object.entries(base.stations ?? {}).filter(([, st]) => active.has(st.type))), players: base.players.map((p, i) => ({ ...p, ...required(seated[i]), joinedMidGame: false, spectating: false })),
        cooks: base.cooks.map((c, i) => ({ ...c, id: required(seated[i]).id })) };
    } };
    const report = runConformance(module, [1, 8].map((count) => ({ name: `orders serve and expire ${String(count)}`, players: count, seed: 73, steps: 4801,
      script: (context) => {
        const state = context.publicView as TabaoState;
        const seen = counts.get(count) ?? { served: 0, expired: 0 };
        seen.served += state.orderEvents?.filter((e) => e.type === 'served').length ?? 0;
        seen.expired += state.orderEvents?.filter((e) => e.type === 'expired').length ?? 0;
        counts.set(count, seen);
        const player = context.players[0];
        return player ? { pads: { [player.id]: driver.pads[context.step] ?? { stick: [0, 0], buttons: [] } } } : {};
      } })), { sources: readSources(fs, new URL('.', import.meta.url).pathname) });
    save('conformance.txt', formatReport(report));
    expect(report.ok, formatReport(report)).toBe(true);
    for (const count of [1, 8]) { expect(counts.get(count)?.served).toBeGreaterThan(0); expect(counts.get(count)?.expired).toBeGreaterThan(0); }
  });
  it('210 s aimed fuzz: conservation, score ledger, open/unique completions, bounds, reload and warm timings', () => {
    let s = initial(8), replay = cloneState(s), seed = 113;
    const journey = new Journey(8); journey.dish('chicken-rice'); journey.serve();
    const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
    const targets = level.tiles.flatMap((t, i) => t.kind === 'station' || t.kind === 'counter' ? [i] : []);
    const lost = new Set<number>(), completed = new Set<number>();
    let score = 0, tips = 0, refusals = 0, expired = 0;
    const times: number[] = [];
    const all = (state: TabaoState) => items(state).flatMap((i) => containerOf(i) ? [i, ...(i.cup ? [i.cup] : []), ...food(i)] : food(i));
    for (let tick = 0; tick < ROUND_STEPS; tick++) {
      const pad = journey.pads[tick];
      const cooks = pad ? s.cooks : s.cooks.map((c) => ({ ...c, targetTile: required(targets[random() % targets.length]) }));
      s = { ...s, cooks }; replay = { ...replay, cooks };
      const mask = (buttons: readonly string[]) => buttons[0] === 'FACE_BOTTOM' ? cross : buttons[0] === 'FACE_RIGHT' ? 32 : 0;
      const input = pad ? createTick({ frames: new Map([['p0', { held: mask(pad.buttons),
        pressed: mask(pad.buttons) & ~mask(journey.pads[tick - 1]?.buttons ?? []), released: 0,
        axes: [...pad.stick, 0, 0], age: 0, seq: tick }]]) }) : createTick({ frames: new Map(cooks.map((c) => [c.id, { held: random() & 32, pressed: random() % 3 === 0 ? cross : 128, released: 0, axes: [0, 0, 0, 0], age: 0, seq: tick }])) });
      const queueBound = Math.max(kitchen(ensureOrders(s)).orders.length, scaling(s.cooks.length).maximum);
      const before = arriveOrders(s), prior = all(before), idsBefore = new Set(prior.map((i) => i.id));
      const start = performance.now(); s = tabaoRush.step(s, input, STEP_MS); times.push(performance.now() - start);
      replay = tabaoRush.step(replay, input, STEP_MS);
      const current = all(s), ids = new Set(current.map((i) => i.id));
      expect(ids.size).toBe(current.length);
      for (const item of prior) if (!ids.has(item.id)) {
        expect(containerOf(item as never)).toBeUndefined();
        const served = s.serviceEvents?.some((e) => e.type === 'served' && food(required(before.inventory.held[e.cook])).some((f) => f.id === item.id));
        const binned = before.cooks.some((c) => c.targetTile !== null && before.stations?.[c.targetTile]?.type === 'bin' &&
          ((input.frames.get(c.id)?.pressed ?? 0) & cross) && before.inventory.held[c.id] && food(required(before.inventory.held[c.id])).some((f) => f.id === item.id));
        expect(served === true || binned).toBe(true); lost.add(item.id);
      }
      for (const item of current) if (!idsBefore.has(item.id)) {
        expect(item.id).toBeGreaterThanOrEqual(before.nextItemId); expect(item.kind).toBe('raw');
        expect(before.cooks.some((c) => {
          const at = c.targetTile === null ? undefined : before.level.tiles[c.targetTile];
          return !before.inventory.held[c.id] && ((input.frames.get(c.id)?.pressed ?? 0) & cross) !== 0 &&
            at?.kind === 'station' && at.ingredient === item.ingredient;
        })).toBe(true);
      }
      expect(current.length + lost.size).toBe(s.nextItemId);
      const roots = items(s);
      expect(roots.filter((i) => containerOf(i))).toHaveLength(8);
      for (const item of roots) {
        const container = containerOf(item);
        if (container) expect(item.contents?.length ?? 0).toBeLessThanOrEqual(CAPACITY[container]);
        const at = item.place;
        if (at.kind === 'held') {
          expect(s.inventory.held[at.cook]).toBe(item);
          expect(s.cooks.some((c) => c.id === at.cook)).toBe(true);
        } else if (at.kind === 'counter') {
          expect(s.inventory.counters[at.tile] === item || s.stations?.[at.tile]?.content === item ||
            s.stations?.[at.tile]?.supply?.includes(item) === true || s.returns?.some((r) => r.item === item) === true).toBe(true);
        } else if (at.kind === 'floor') {
          expect(s.inventory.floor[at.tile]?.includes(item)).toBe(true);
          expect(s.level.tiles[at.tile]?.kind).toBe('floor');
        } else {
          expect(container).toBeUndefined(); expect(s.inventory.flights.includes(item)).toBe(true);
          expect(s.tick).toBeLessThan(at.startStep + at.duration);
          expect(at.startStep + at.duration).toBeLessThanOrEqual(s.endTick);
        }
      }
      const reservations: Record<number, number> = {};
      for (const flight of s.inventory.flights) if (flight.place.kind === 'flight') reservations[flight.place.rest.tile] = (reservations[flight.place.rest.tile] ?? 0) + 1;
      expect(Object.entries(s.inventory.reserved).every(([tile, n]) => (n ?? 0) === (reservations[Number(tile)] ?? 0))).toBe(true);
      expect(Object.entries(reservations).every(([tile, n]) => s.inventory.reserved[Number(tile)] === n)).toBe(true);
      expect(s.inventory.floorCount).toBe(Object.values(s.inventory.floor).reduce((sum, pile) => sum + (pile?.length ?? 0), 0));
      for (const e of s.orderEvents ?? []) {
        if ('delta' in e) score += e.delta;
        if (e.type === 'refused') refusals++;
        if (e.type === 'expired') expired++;
        if (e.type === 'served') {
          expect(kitchen(before).orders.some((o) => o.id === e.order && o.dish === e.dish)).toBe(true);
          expect(completed.has(e.order)).toBe(false); completed.add(e.order); tips += e.tip;
        }
      }
      const k = kitchen(s);
      expect(k.score).toBeGreaterThanOrEqual(0); expect(k.score).toBe(score); expect(k.tips).toBe(tips);
      expect(k.orders.length).toBeLessThanOrEqual(queueBound);
      expect(k.orders.length).toBeLessThanOrEqual(6);
      expect(k.orders.every((o) => o.remaining >= 0 && o.remaining <= o.total)).toBe(true);
      expect(s.tick).toBeLessThanOrEqual(s.endTick);
      if (tick === 6300) replay = decodeState(JSON.parse(JSON.stringify(encodeState(s)))) as TabaoState;
      if (tick % 600 === 0 || tick === ROUND_STEPS - 1) expect(hashState(s)).toBe(hashState(replay));
    }
    expect(completed.size).toBeGreaterThan(0); expect(refusals).toBeGreaterThan(0); expect(expired).toBeGreaterThan(0);
    const late = times.slice(600), summary = { warmupSteps: 600, steps: late.length, meanMs: late.reduce((a, b) => a + b, 0) / late.length, worstMs: Math.max(...late) };
    process.stdout.write(`T05 timings ${JSON.stringify(summary)}\n`); save('performance.json', JSON.stringify(summary, null, 2));
  });
});

it('TR-006 D-091(e): cook-steps use the average at every step, interpolating the literal crew table', () => {
  let s = ensureOrders(initial(2));
  for (let t = 0; t < 100; t++) s = step(s);
  expect(kitchen(s)).toMatchObject({ cookSteps: 200, elapsedSteps: 100, thresholds: [350, 700, 1040] });
  s = tabaoRush.leave(s, 'p1');
  for (let t = 0; t < 100; t++) {
    s = step(s);
    expect(kitchen(s).thresholds).toEqual(scaling((200 + t + 1) / (101 + t)).thresholds);
  }
  expect(kitchen(s)).toMatchObject({ cookSteps: 300, elapsedSteps: 200, thresholds: [270, 550, 820] });
});
it('TR-001 D-091(f): serving or expiry of the final card refills within three seconds without changing the stream', () => {
  for (const service of [true, false]) {
    let s = ensureOrders(initial());
    const first = required(kitchen(s).orders[0]);
    s = { ...s, kitchens: [{ ...kitchen(s), orders: [{ ...first, remaining: 1 }], nextArrival: 10000 }] };
    s = service ? serve(holding(s)) : step(s);
    const emptyAt = s.tick;
    expect(kitchen(s).orders).toHaveLength(0);
    while (!kitchen(s).orders.length) { s = step(s); expect(s.tick - emptyAt).toBeLessThanOrEqual(secondsToSteps(3)); }
    const normal = arriveOrders({ ...ensureOrders(initial()), tick: 1440 });
    expect(kitchen(s).orders[0]?.dish).toBe(kitchen(normal).orders[1]?.dish);
    expect(kitchen(s).rng).toEqual(kitchen(normal).rng);
  }
});
it('TR-005 D-091(d): level solo threshold base scales, default remains 200/400/600', () => {
  const s = ensureOrders({ ...initial(2), level: { ...level, soloThresholds: [100, 300, 500] } });
  expect(kitchen(s).thresholds).toEqual([170, 520, 870]);
  expect(kitchen(step(s)).thresholds).toEqual([170, 520, 870]);
});
it('TR-005: final-step events clear on the first frozen step and later frozen states retain identity', () => {
  const s = serve({ ...holding(withOrder(initial(), 'chicken-rice')), endTick: 1 });
  expect(s.orderEvents).toHaveLength(1); expect(s.serviceEvents).toHaveLength(1);
  const frozen = step(s);
  expect(frozen.orderEvents).toEqual([]); expect(frozen.serviceEvents).toEqual([]);
  expect(frozen.kitchens).toBe(s.kitchens); expect(step(frozen)).toBe(frozen);
});
