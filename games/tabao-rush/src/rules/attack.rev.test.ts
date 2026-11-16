import { performance } from 'node:perf_hooks';
import { expect, it } from 'vitest';
import { decodeState, encodeState, hashState } from '@kaki/sim-core';
import { createTick, STEP_MS } from '@kaki/platform';
import { tabaoRush, ROUND_STEPS } from './game';
import { ensureOrders, scaling, stars, patience } from './orders';
import type { OrderEvent } from './orders';
import { withOrder } from './orders.fixture';
import { RECIPES, containerOf, food } from './recipes';
import { initial, level, offered, station, cross } from './recipe-journey.fixture';
import { items } from './state';
import type { TabaoState } from './state';

const log = (...values: unknown[]) => process.stdout.write(values.map((v) => typeof v === 'string' ? v : JSON.stringify(v)).join(' ') + '\n');
const req = <T,>(v: T | undefined): T => { if (v === undefined) throw new Error('missing'); return v; };
const K = (s: TabaoState) => req(s.kitchens?.[0]);
const allDishes = { ...level, allowedDishes: RECIPES.map((r) => r.id) };
const frame = (mask: number, pressed: number, x = 0, y = 0, seq = 0) => ({ held: mask, pressed, released: 0, axes: [x, y, 0, 0], age: 0, seq });
const idle = (s: TabaoState) => tabaoRush.step(s, createTick(), STEP_MS);
let fresh = 1e7;
function holding(s: TabaoState, dishes: Record<string, string>): TabaoState {
  const held: Record<string, unknown> = { ...s.inventory.held };
  s.cooks.forEach((c) => { const d = dishes[c.id]; if (d) { const o = offered(req(RECIPES.find((r) => r.id === d))); const b = (fresh += 50);
    held[c.id] = { ...o, id: b, contents: (o.contents ?? []).map((f, j) => ({ ...f, id: b + 1 + j })), ...(o.cup ? { cup: { ...o.cup, id: b + 20, contents: (o.cup.contents ?? []).map((f, j) => ({ ...f, id: b + 21 + j })) } } : {}), place: { kind: 'held', cook: c.id } }; } });
  return { ...s, cooks: s.cooks.map((c) => dishes[c.id] ? { ...c, targetTile: station('serving'), x: 21.5, y: 2.5, facing: 6 } : c),
    inventory: { ...s.inventory, held: held as TabaoState['inventory']['held'] } };
}
const press = (s: TabaoState, ids: string[]) => tabaoRush.step(s, createTick({ frames: new Map(ids.map((id) => [id, frame(0, cross)])) }), STEP_MS);

it('A1 same seed + same inputs: same orders, hashes; dish sequence independent of play', () => {
  const run = (serve: boolean) => {
    let s: TabaoState = { ...initial(2, 99), level: allDishes };
    const seq: string[] = [];
    for (let t = 0; t < ROUND_STEPS; t++) {
      if (serve && t % 600 === 300 && K(s).orders[0]) { const d = req(K(s).orders[0]).dish; s = press(holding(s, { p0: d }), ['p0']); }
      else s = idle(s);
      for (const o of K(s).orders) seq[o.id] ??= o.dish;
    }
    return { seq, hash: hashState(s), score: K(s).score };
  };
  const a = run(false), b = run(false), c = run(true);
  expect(a.hash).toBe(b.hash); expect(a.seq).toEqual(b.seq);
  const n = Math.min(a.seq.length, c.seq.length);
  expect(c.seq.slice(0, n)).toEqual(a.seq.slice(0, n));
  log('A1 orders created idle', a.seq.length, 'serving', c.seq.length, 'served score', c.score);
});

it('B1 two cooks, one order, reversed map order, higher seat holds matching dish', () => {
  let s = withOrder(ensureOrders({ ...initial(2), level: allDishes }), 'satay');
  s = holding(s, { p0: 'chicken-rice', p1: 'satay' });
  const after = tabaoRush.step(s, createTick({ frames: new Map([['p1', frame(0, cross)], ['p0', frame(0, cross)]]) }), STEP_MS);
  log('B1 events', JSON.stringify(after.orderEvents));
  expect(after.orderEvents?.[0]).toMatchObject({ type: 'refused', cook: 'p0', seat: 1, counter: station('serving'), dish: 'chicken-rice', reason: { code: 'not-ordered' } });
  expect(after.orderEvents?.[1]).toMatchObject({ type: 'served', cook: 'p1', seat: 2, dish: 'satay' });
  expect(after.inventory.held.p0).toBe(s.inventory.held.p0);
  // both same dish, one order: seat 1 wins, seat 2 refused, dish intact
  let t = holding(withOrder(ensureOrders({ ...initial(2), level: allDishes }), 'satay'), { p0: 'satay', p1: 'satay' });
  t = tabaoRush.step(t, createTick({ frames: new Map([['p1', frame(0, cross)], ['p0', frame(0, cross)]]) }), STEP_MS);
  expect(t.orderEvents?.map((e) => [e.type, 'cook' in e ? e.cook : null])).toEqual([['served', 'p0'], ['refused', 'p1']]);
  expect(K(t).score).toBe(120);
});

it('C1 served on its expiry step scores tip 0 and does not expire; D1 arrival on the step of a serve', () => {
  let s = withOrder(ensureOrders(initial(1)), 'chicken-rice');
  s = { ...s, kitchens: [{ ...K(s), orders: [{ ...req(K(s).orders[0]), remaining: 1 }] }] };
  const a = press(holding(s, { p0: 'chicken-rice' }), ['p0']);
  expect(a.orderEvents).toEqual([expect.objectContaining({ type: 'served', tip: 0, points: 100 })]);
  expect(K(a).expired).toBe(0);
  const b = idle(s);
  expect(b.orderEvents?.[0]).toMatchObject({ type: 'expired', penalty: 0 });
  // queue full (2), next arrival due right after this step
  let f = ensureOrders(initial(1));
  f = { ...f, kitchens: [{ ...K(f), orders: [req(K(f).orders[0]), { ...req(K(f).orders[0]), id: 1 }], nextId: 2 }] };
  f = { ...f, tick: K(f).nextArrival - 1 };
  const g = press(holding(f, { p0: 'chicken-rice' }), ['p0']);
  log('D1 after serve on arrival boundary: orders', K(g).orders.map((o) => o.id), 'nextArrival', K(g).nextArrival, 'tick', g.tick);
  expect(K(g).orders.map((o) => o.id)).toEqual([1, 2]);
});

it('E1 defect before not-ordered: wrong container and missing ingredient while not ordered', () => {
  const s = withOrder(ensureOrders({ ...initial(1), level: allDishes }), 'kopi-teh');
  const cr = offered(req(RECIPES.find((r) => r.id === 'chicken-rice')));
  const wrongBox = { ...s, inventory: { ...s.inventory, held: { p0: { ...cr, container: 'bowl' as const } } } };
  const r1 = press(holding(wrongBox, {}), ['p0']);
  const aimed = (x: TabaoState) => ({ ...x, cooks: x.cooks.map((c) => ({ ...c, targetTile: station('serving'), x: 21.5, y: 2.5, facing: 6 as const })) });
  const e1 = press(aimed(wrongBox), ['p0']).orderEvents?.[0];
  const missing = { ...s, inventory: { ...s.inventory, held: { p0: { ...cr, contents: (cr.contents ?? []).slice(0, 2) } } } };
  const e2 = press(aimed(missing), ['p0']).orderEvents?.[0];
  log('E1', JSON.stringify(e1), JSON.stringify(e2), r1.tick);
  expect(e1).toMatchObject({ type: 'refused', reason: { code: 'wrong-container' } });
  expect(e2).toMatchObject({ type: 'refused', reason: { code: 'missing-ingredient' } });
});

function fuzz(count: number, seed: number, churn: boolean, timing?: number[]) {
  let s: TabaoState = { ...initial(count, seed), level: allDishes };
  let rnd = seed * 2654435761 >>> 0 || 1;
  const r = () => { rnd ^= rnd << 13; rnd ^= rnd >>> 17; rnd ^= rnd << 5; return (rnd >>> 0); };
  let ledger = 0, maxView = 0, maxQ = 0, stale = 0; const seen = new Set<number>(); let served = 0, expired = 0, refused = 0;
  const containers = items(s).filter((i) => containerOf(i)).length;
  let saved: unknown = null; let savedTick = -1;
  const inputsLog: ReturnType<typeof createTick>[] = [];
  const targets = level.tiles.flatMap((t, i) => t.kind === 'station' ? [i] : []);
  let nextJoin = 100;
  for (let t = 0; t < ROUND_STEPS + 5; t++) {
    const priorQueueSize = K(ensureOrders(s)).orders.length;
    if (churn && t > 0 && t % 1500 === 0 && s.cooks.length > 1) s = tabaoRush.leave(s, req(s.cooks[s.cooks.length - 1]).id);
    if (churn && t > 0 && t % 2100 === 0) { s = tabaoRush.join(s, { id: `j${String(nextJoin)}`, seat: 8, name: 'J', colour: 'seat-8' as const }); nextJoin++; }
    s = { ...s, cooks: s.cooks.map((c) => ({ ...c, targetTile: r() % 4 === 0 ? req(targets[r() % targets.length]) : c.targetTile })) };
    // give a matching dish sometimes
    if (r() % 40 === 0 && s.cooks[0] && K(ensureOrders(s)).orders.length) {
      s = ensureOrders(s); const d = req(K(s).orders[r() % K(s).orders.length]).dish;
      if (!s.inventory.held[req(s.cooks[0]).id]) s = holding(s, { [req(s.cooks[0]).id]: d });
    }
    const tick = createTick({ frames: new Map(s.cooks.map((c) => { const m = r() % 3 === 0 ? cross : r() % 2 ? 32 : 0; return [c.id, frame(m, r() % 2 ? m : 0, ((r() % 3) - 1), ((r() % 3) - 1), t)]; })) });
    inputsLog.push(tick);
    if (t === 6300) { saved = JSON.parse(JSON.stringify(encodeState(s))); savedTick = t; }
    const prevTick = s.tick; const t0 = performance.now(); s = tabaoRush.step(s, tick, STEP_MS); if (s.tick === prevTick && (s.orderEvents?.length ?? 0) > 0) stale++; const dt = performance.now() - t0; timing?.push(dt);
    for (const e of (s.tick === prevTick ? [] : s.orderEvents ?? [])) {
      if ('delta' in e) ledger += e.delta;
      if (e.type === 'served') { expect(seen.has(e.order)).toBe(false); seen.add(e.order); served++; }
      if (e.type === 'expired') expired++; if (e.type === 'refused') refused++;
    }
    const k = K(s);
    expect((s.orderEvents?.length ?? 0)).toBeLessThanOrEqual(20); expect((s.serviceEvents?.length ?? 0)).toBeLessThanOrEqual(8);
    expect(k.score).toBe(ledger); expect(k.score).toBeGreaterThanOrEqual(0);
    expect(k.orders.length).toBeLessThanOrEqual(k.maximum);
    expect(k.orders.length).toBeLessThanOrEqual(Math.max(priorQueueSize, scaling(s.cooks.length).maximum));
    expect(k.orders.length).toBeLessThanOrEqual(6);
    maxQ = Math.max(maxQ, k.orders.length);
    for (const o of k.orders) { expect(o.remaining).toBeGreaterThanOrEqual(1); expect(o.remaining).toBeLessThanOrEqual(o.total); }
    expect(new Set(k.orders.map((o) => o.id)).size).toBe(k.orders.length);
    const all = items(s).flatMap((i) => containerOf(i) ? [i, ...(i.cup ? [i.cup] : []), ...food(i)] : food(i));
    expect(new Set(all.map((i) => i.id)).size).toBe(all.length);
    expect(items(s).filter((i) => containerOf(i)).length + (s.returns ?? []).filter((x) => !items(s).includes(x.item)).length).toBeGreaterThanOrEqual(containers - 0);
    if (t % 700 === 0) maxView = Math.max(maxView, JSON.stringify(tabaoRush.publicView(s)).length);
    const timer = (tabaoRush.publicView(s) as { timer: { remaining: number } }).timer.remaining;
    expect(timer).toBeGreaterThanOrEqual(0);
  }
  expect(stale).toBe(0);
  expect(s.tick).toBe(ROUND_STEPS); expect(tabaoRush.isOver(s)).toBe(true);
  // replay from the save
  let re = decodeState(saved) as TabaoState;
  // replay: membership changes must be repeated identically; only check when no churn after save
  if (!churn) { for (let t = savedTick; t < ROUND_STEPS + 5; t++) re = tabaoRush.step(re, req(inputsLog[t]), STEP_MS); }

  return { s, re, served, expired, refused, maxQ, maxView, ledger, stale };
}

it('G1 fuzz 1..8 cooks with leaves and joins: ledger, bounds, uniqueness', () => {
  for (let n = 1; n <= 8; n++) {
    const out = fuzz(n, 700 + n, true);
    log('G1', n, JSON.stringify({ served: out.served, expired: out.expired, refused: out.refused, maxQ: out.maxQ, maxView: out.maxView, score: out.ledger, stale: out.stale, cooks: out.s.cooks.length, thr: K(out.s).thresholds }));
  }
}, 600000);

it('H1 save mid-round and continue identically (no churn): random order fuzz', () => {
  // the fuzz's own random draws make re-run differ; so rerun deterministically from save with the same logged inputs, but the fuzz also mutates state outside step. Use a pure run instead.
  let s: TabaoState = { ...initial(4, 5), level: allDishes };
  const ticks: ReturnType<typeof createTick>[] = [];
  let r = 9;
  for (let t = 0; t < ROUND_STEPS; t++) { r = (r * 1103515245 + 12345) >>> 0; ticks.push(createTick({ frames: new Map(s.cooks.map((c, i) => [c.id, frame(r % 5 === i % 5 ? cross : 0, r % 5 === i % 5 ? cross : 0, ((r >> 8) % 3) - 1, ((r >> 12) % 3) - 1, t)])) })); }
  let saved: unknown;
  for (let t = 0; t < ROUND_STEPS; t++) { if (t === 4321) saved = JSON.parse(JSON.stringify(encodeState(s))); s = tabaoRush.step(s, req(ticks[t]), STEP_MS); }
  let re = decodeState(saved) as TabaoState;
  for (let t = 4321; t < ROUND_STEPS; t++) re = tabaoRush.step(re, req(ticks[t]), STEP_MS);
  expect(hashState(re)).toBe(hashState(s));
  expect(K(re).rng).toEqual(K(s).rng); expect(K(re).nextId).toBe(K(s).nextId);
  log('H1 orders created', K(s).nextId, 'expired', K(s).expired);
});

it('I1 end at 12600: inert input, returns conserved, results across ends', () => {
  let s = withOrder(ensureOrders(initial(1)), 'chicken-rice');
  s = { ...s, tick: ROUND_STEPS - 2 };
  s = press(holding(s, { p0: 'chicken-rice' }), ['p0']);
  s = idle(s);
  expect(s.tick).toBe(ROUND_STEPS); expect(tabaoRush.isOver(s)).toBe(true);
  expect(s.returns?.length).toBe(1);
  const after = press(holding(s, { p0: 'chicken-rice' }), ['p0']);
  expect(after.orderEvents).toEqual([]); expect(after.serviceEvents).toEqual([]); expect(idle(after)).toBe(after);
  expect(after.tick).toBe(ROUND_STEPS); expect(K(after).score).toBe(K(s).score);
  log('I1 results end', JSON.stringify(tabaoRush.results(s)), 'view orders', K(s).orders.length, 'lingering events', JSON.stringify(after.orderEvents));
});

it('J1 stars at every boundary 1..8, results extras', () => {
  for (let n = 1; n <= 8; n++) {
    const base = ensureOrders(initial(n));
    expect(K(base).thresholds).toEqual(scaling(n).thresholds);
    const [one = 0, two = 0, three = 0] = scaling(n).thresholds;
    for (const [score, st] of [[one - 1, 0], [one, 1], [two - 1, 1], [two, 2], [three - 1, 2], [three, 3], [10 ** 6, 3]] as const) {
      const s = { ...base, kitchens: [{ ...K(base), score }] };
      expect(stars(K(s))).toBe(st);
      const res = tabaoRush.results(s);
      expect(res).toMatchObject({ mode: 'coop', score, extras: { stars: st } });
      expect(res.players.every((p) => p.place === 1 && p.score === score && !p.joinedMidGame)).toBe(true);
    }
  }
  const empty = tabaoRush.init(1, [], {}, { } as never);
  log('J1 empty results', JSON.stringify(tabaoRush.results(empty)));
});

it('J2 D-091(e): leaving just before the end cannot gain a star', () => {
  let s = ensureOrders(initial(8));
  s = { ...s, tick: ROUND_STEPS - 1, kitchens: [{ ...K(s), score: 1700, cookSteps: 8 * (ROUND_STEPS - 1), elapsedSteps: ROUND_STEPS - 1 }] };
  expect(stars(K(s))).toBe(1);
  for (let i = 1; i < 8; i++) s = tabaoRush.leave(s, `p${String(i)}`);
  s = idle(s);
  expect(stars(K(s))).toBe(1);
  expect(K(s).thresholds).toEqual([1060, 2110, 3170]);
  expect(tabaoRush.results(s).extras).toMatchObject({ stars: 1 });
  log('J2 thresholds after 7 leave', K(s).thresholds, 'stars', stars(K(s)), 'results', JSON.stringify(tabaoRush.results(s).extras));
});

it('K1 D-091(h): isolated streams and scaling by assigned cooks', () => {
  const two = { ...allDishes, tiles: allDishes.tiles.map((t, i) => i === station('serving') && t.kind === 'station' ? { ...t, kitchen: 'red' } : i === station('plating') && t.kind === 'station' ? { ...t, stationType: 'serving' as const, kitchen: 'blue' } : t) };
  const base = initial(4);
  const s = ensureOrders({ ...base, cooks: base.cooks.map((c, i) => ({ ...c, kitchen: i === 0 ? 'red' : 'blue' })), level: two });
  expect(s.kitchens?.slice().sort((a, b) => b.id.localeCompare(a.id)).map((k) => [k.id, k.cooks, k.maximum, k.thresholds])).toEqual([['red', 1, 2, [200, 400, 600]], ['blue', 3, 4, [480, 960, 1450]]]);
  log('K1', JSON.stringify(s.kitchens?.map((k) => ({ id: k.id, dish: k.orders[0]?.dish, cooks: k.cooks, rng: k.rng }))));
  expect(s.kitchens?.[0]?.rng).not.toEqual(s.kitchens?.[1]?.rng);
  // A kitchen named coop is still local when it shares a level with another kitchen.
  const mixed = ensureOrders({ ...base,
    cooks: base.cooks.map((c, i) => ({ ...c, kitchen: i === 0 ? 'coop' : 'blue' })),
    level: { ...two, tiles: two.tiles.map((t) => t.kind === 'station' && t.kitchen === 'red' ? { ...t, kitchen: 'coop' } : t) } });
  expect(mixed.kitchens?.find((k) => k.id === 'coop')).toMatchObject({ cooks: 1, maximum: 2 });
});

it('L1 perf busy 8 cooks, twice', () => {
  for (const run of [1, 2]) {
    const times: number[] = []; fuzz(8, 4242 + run, false, times);
    const w = times.slice(600).sort((a, b) => a - b);
    const mean = w.reduce((a, b) => a + b, 0) / w.length;
    log('L1 run', run, 'mean', mean.toFixed(4), 'p95', req(w[Math.floor(w.length * 0.95)]).toFixed(4), 'p99', req(w[Math.floor(w.length * 0.99)]).toFixed(4), 'worst', req(w.at(-1)).toFixed(3), 'over1ms', w.filter((x) => x > 1).length);
  }
}, 600000);

it('M1 events seen by every-step reader; orderEvents cleared next step', () => {
  let s = withOrder(ensureOrders(initial(1)), 'chicken-rice');
  s = press(holding(s, { p0: 'chicken-rice' }), ['p0']);
  const v1 = tabaoRush.publicView(s) as { orderEvents: OrderEvent[]; kitchens: unknown[]; timer: unknown };
  expect(v1.orderEvents).toHaveLength(1);
  s = idle(s);
  expect((tabaoRush.publicView(s) as { orderEvents: OrderEvent[] }).orderEvents).toHaveLength(0);
  log('M1 view kitchen', JSON.stringify(v1.kitchens), JSON.stringify(v1.timer), JSON.stringify(v1.orderEvents));
});

it('N1 patience: an order arriving lives exactly PATIENCE_STEPS steps', () => {
  let s = ensureOrders(initial(1));
  let steps = 0;
  while (!(s.orderEvents ?? []).some((e) => e.type === 'expired' && e.order === 0)) { s = idle(s); steps++; }
  log('N1 order 0 expired during step index', steps - 1, 'PATIENCE', patience('chicken-rice'), 'scaling1', JSON.stringify(scaling(1)));
  expect(steps).toBe(patience('chicken-rice'));
});
