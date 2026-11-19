import { expect, it } from 'vitest';
import { createTick, STEP_MS } from '@kaki/platform';
import { ROUND_STEPS } from './game';
import { tabaoRush } from './playing.fixture';
import { arriveOrders, completeOrder, ageOrders, ensureOrders, scaling, stars } from './orders';
import { withOrder } from './orders.fixture';
import { RECIPES } from './recipes';
import { initial, level, offered, station, cross } from './recipe-journey.fixture';
import type { TabaoState } from './state';

const req = <T,>(v: T | undefined): T => { if (v === undefined) throw new Error('missing'); return v; };
const K = (s: TabaoState) => req(s.kitchens?.[0]);
const idle = (s: TabaoState) => tabaoRush.step(s, createTick(), STEP_MS);
const run = (s: TabaoState, n: number) => { for (let i = 0; i < n; i++) s = idle(s); return s; };
const ok = (t: readonly number[]) => t.every((x, i) => Number.isFinite(x) && x % 10 === 0 && (i === 0 || x >= req(t[i - 1])));

it('R1 leave just before the end keeps ~8-cook thresholds', () => {
  let s = run(ensureOrders(initial(8)), ROUND_STEPS - 10);
  for (let i = 1; i < 8; i++) s = tabaoRush.leave(s, `p${String(i)}`);
  s = run(s, 20);
  expect(K(s).thresholds).toEqual([1060, 2110, 3170]);
  expect(ok(K(s).thresholds)).toBe(true);
});
it('R2 leave early: thresholds near solo', () => {
  let s = run(ensureOrders(initial(8)), 100);
  for (let i = 1; i < 8; i++) s = tabaoRush.leave(s, `p${String(i)}`);
  s = run(s, ROUND_STEPS);
  expect(K(s).thresholds).toEqual(scaling((800 + ROUND_STEPS - 100) / ROUND_STEPS).thresholds);
});
it('R3 spectator join then leave changes nothing', () => {
  let s = run(ensureOrders(initial(1)), 50);
  const before = K(s);
  s = tabaoRush.join(s, { id: 'x', seat: 5, name: 'X', colour: 'seat-5' });
  s = tabaoRush.leave(s, 'x');
  expect(K(s).orders).toEqual(before.orders);
});
it('R4 late joiners spectate and retain solo thresholds', () => {
  let t = run(ensureOrders(initial(1)), ROUND_STEPS - 60);
  for (let i = 1; i < 8; i++) t = tabaoRush.join(t, { id: `q${String(i)}`, seat: i + 1, name: 'Q', colour: 'seat-2' });
  t = run(t, 100);
  expect(t.cooks).toHaveLength(1);
  expect(tabaoRush.results(t).players).toHaveLength(8);
  expect(K(t).thresholds).toEqual([200, 400, 600]);
});
it('R5 zero cooks for a stretch: no NaN, finite thresholds', () => {
  let s = run(ensureOrders(initial(2)), 1000);
  s = tabaoRush.leave(s, 'p0'); s = tabaoRush.leave(s, 'p1');
  s = run(s, 3000);
  expect(JSON.stringify(tabaoRush.publicView(s))).not.toContain('NaN');
  expect(ok(K(s).thresholds)).toBe(true);
  expect(K(s).thresholds).toEqual([200, 400, 600]);
  for (let x = 0; x <= 9; x += 0.01) expect(ok(scaling(x).thresholds)).toBe(true);
  let prev = [0, 0, 0];
  for (let x = 1; x <= 8.0001; x += 0.001) { const t = scaling(x).thresholds; expect(t.every((v, i) => v >= req(prev[i]))).toBe(true); prev = [...t]; }
});
it('R6 two-kitchen level: production code never assigns cook.kitchen', () => {
  const two = { ...level, tiles: level.tiles.map((t, i) => i === station('serving') && t.kind === 'station' ? { ...t, kitchen: 'red' } : i === station('plating') && t.kind === 'station' ? { ...t, stationType: 'serving' as const, kitchen: 'blue' } : t) };
  const s = run(ensureOrders({ ...initial(8), level: two }), 10);
  expect(s.cooks.every((c) => c.kitchen === undefined)).toBe(true);
  expect(s.kitchens).toHaveLength(2);
  for (const k of s.kitchens ?? []) expect(k).toMatchObject({ cooks: 0, maximum: 2, thresholds: [200, 400, 600] });
  const coop = run(ensureOrders({ ...initial(8), cooks: initial(8).cooks.map((c) => ({ ...c, kitchen: 'other' })) }), 10);
  expect(K(coop)).toMatchObject({ cooks: 8, maximum: 6, cookSteps: 80, thresholds: [1060, 2110, 3170] });
});
it('R7 departures preserve all cards and an already prepared dish remains ordered', () => {
  let s = run(ensureOrders({ ...initial(8), level: { ...level, allowedDishes: ['chicken-rice'] } }), 1);
  for (let i = 0; i < 2000 && K(s).orders.length < 6; i++) s = idle(s);
  const before = K(s).orders.map((o) => o.id);
  for (let i = 1; i < 8; i++) s = tabaoRush.leave(s, `p${String(i)}`);
  const after = K(s).orders.map((o) => o.id);
  expect(before).toHaveLength(6);
  expect(after).toEqual(before);
  expect(K(s)).toMatchObject({ maximum: 6, targetMaximum: 2, expired: 0 });
  expect(s.orderEvents).toEqual([]);
  const retained = K(s);
  s = arriveOrders({ ...s, tick: retained.nextArrival });
  expect(K(s).orders.map((o) => o.id)).toEqual(before);
  expect(K(s).nextId).toBe(retained.nextId);
  // Keep the newest card as the only matching dish, then actually offer that dish.
  for (const id of before.slice(0, -1)) {
    s = completeOrder(s, K(s).id, 'chicken-rice', 'p0');
    expect(s.orderEvents?.at(-1)).toMatchObject({ type: 'served', order: id });
  }
  const ready = { ...s, cooks: s.cooks.map((c) => ({ ...c, targetTile: station('serving'), x: 21.5, y: 2.5, facing: 6 as const })),
    inventory: { ...s.inventory, held: { p0: offered(req(RECIPES.find((r) => r.id === 'chicken-rice'))) } } };
  const served = tabaoRush.step(ready, createTick({ frames: new Map([['p0', { held: 0, pressed: cross, released: 0, axes: [0, 0, 0, 0], age: 0, seq: 0 }]]) }), STEP_MS);
  expect(served.orderEvents?.[0]).toMatchObject({ type: 'served', order: before.at(-1) });
});
it('R8 expiry clamp reports real loss; refused dish null for unknown', () => {
  const base = withOrder(ensureOrders({ ...initial(1), level: { ...level, allowedDishes: RECIPES.map((r) => r.id) } }), 'rojak');
  const s = ageOrders({ ...base, kitchens: [{ ...K(base), score: 7, orders: K(base).orders.map((o) => ({ ...o, remaining: 1 })) }] });
  expect(s.orderEvents?.[0]).toMatchObject({ penalty: 7, delta: -7 }); expect(K(s).score).toBe(0);
  const junk = { ...base, cooks: base.cooks.map((c) => ({ ...c, targetTile: station('serving'), x: 21.5, y: 2.5, facing: 6 as const })),
    inventory: { ...base.inventory, held: { p0: { ...offered(req(RECIPES[0])), contents: [{ id: 999, kind: 'raw' as const, ingredient: 'turnip', processes: [] }] } } } };
  const r = tabaoRush.step(junk, createTick({ frames: new Map([['p0', { held: 0, pressed: cross, released: 0, axes: [0, 0, 0, 0], age: 0, seq: 0 }]]) }), STEP_MS);
  expect(r.orderEvents?.[0]).toMatchObject({ type: 'refused', dish: null, seat: 1, counter: station('serving') });
});
it('R9 8-cook steady state: 6 cards, 273-step arrivals; empty refill', () => {
  let s = ensureOrders(initial(8));
  let maxQ = 0;
  expect(K(s).nextArrival).toBe(273);
  for (let t = 0; t < ROUND_STEPS; t++) { s = idle(s); maxQ = Math.max(maxQ, K(s).orders.length); }
  expect(K(s).expired).toBeGreaterThan(0);
  expect(stars(K(s))).toBe(0);
  expect(maxQ).toBe(6);
});
