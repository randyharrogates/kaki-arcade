function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error('Missing fixture value');
  return value;
}
import * as fs from 'node:fs';
import { expect, it } from 'vitest';
import { decodeState, encodeState, hashState } from '@kaki/sim-core';
import { BUTTON, createTick, EMPTY_SETUP, STEP_MS } from '@kaki/platform';
import { tabaoRush, ROUND_STEPS } from './game';
import { items, inventory } from './state';
import type { Item, Level, StationType, TabaoState, Tile } from './state';
import { prepareStations, FIRE_STEPS, SPREAD_STEPS } from './stations';

const cross = 1 << BUTTON.FACE_BOTTOM, circle = 1 << BUTTON.FACE_RIGHT, triangle = 1 << BUTTON.FACE_TOP;
const W = 16, H = 9;
// Row 1: stations/crates along the top; row 7: stations along the bottom; a counter island in the middle.
const top: (string | null)[] = [null, 'chop', 'wok', 'pot', 'grill', 'rice', 'drinks', 'plating', 'sink', 'bin', 'crate:kopi', 'crate:chicken', 'crate:teh', 'counter', 'counter', null];
const bottom: (string | null)[] = [null, 'chop', 'counter', 'wok', 'wok', 'grill', 'counter', 'plating', 'sink', 'counter', 'counter', 'crate:bread', 'pot', 'rice', 'counter', null];
const tiles: Tile[] = Array.from({ length: W * H }, (_, i) => {
  if (i === 0) return { kind: 'station', stationId: 'returns', stationType: 'return-counter' };
  const x = i % W, y = Math.floor(i / W);
  if (x === 0 || x === W - 1 || y === 0 || y === H - 1) return { kind: 'wall' };
  const spec = y === 1 ? top[x] : y === 7 ? bottom[x] : (y === 4 && x >= 5 && x <= 9) ? 'counter' : null;
  if (!spec) return { kind: 'floor' };
  if (spec === 'counter') return { kind: 'counter' };
  if (spec.startsWith('crate:')) return { kind: 'station', stationId: `c${String(i)}`, ingredient: spec.slice(6) };
  return { kind: 'station', stationId: `${spec}${String(i)}`, stationType: spec as StationType };
});
const RACK = 1 * W + 13;
const level: Level = { id: 'fuzz', width: W, height: H, tiles, firesEnabled: true, extinguisherTile: RACK,
  spawns: Array.from({ length: 8 }, (_, i) => ({ x: 2.5 + i * 1.5, y: 3.5 })) };
const OUT: Record<string, string> = { chop: 'chopped', sink: 'plate', drinks: 'cooked', wok: 'cooked', pot: 'cooked', grill: 'cooked', rice: 'cooked' };

function players(n: number) { return Array.from({ length: n }, (_, i) => ({ id: `p${String(i)}`, seat: i + 1, name: `C${String(i)}`, colour: 'seat-1' as const })); }

function setup(seed: number, n: number): TabaoState {
  const base = tabaoRush.init(seed, players(n), {}, EMPTY_SETUP);
  // re-spawn on fuzz level
  let s: TabaoState = { ...base, level, players: [], cooks: [] };
  for (const p of players(n)) s = tabaoRush.join(s, p);
  // seed plates: 3 dirty plates and 2 plates on counters
  const seeded: Item[] = [];
  const counters = [7 * W + 2, 7 * W + 6, 4 * W + 5, 4 * W + 6, 4 * W + 7];
  counters.forEach((tile, k) => seeded.push({ id: k, kind: k < 3 ? 'dirty-plate' : 'plate', place: { kind: 'counter', tile } }));
  s = { ...s, inventory: inventory(seeded), nextItemId: seeded.length };
  return prepareStations(s);
}

function check(before: TabaoState, after: TabaoState, frames: Map<string, { held: number; pressed: number }>, ctx: string, stats: Record<string, number>) {
  const expanded = (s: TabaoState): Item[] => items(s).flatMap((i) => [i, ...(i.contents ?? []).map((f) => ({ ...f, place: i.place }))]);
  const bi = new Map(expanded(before).map((i) => [i.id, i]));
  const ai = expanded(after);
  const ids = new Set(ai.map((i) => i.id));
  if (ids.size !== ai.length) throw new Error(`dup ids ${ctx}`);
  const ext = ai.filter((i) => i.kind === 'extinguisher');
  if (ext.length !== 1) throw new Error(`extinguisher count ${String(ext.length)} ${ctx}`);
  const e = required(ext[0]);
  if (e.place.kind === 'floor' && after.level.tiles[e.place.tile]?.kind !== 'floor') throw new Error(`ext on non-floor ${ctx}`);
  if (e.place.kind === 'held' && !after.cooks.some((c) => c.id === (e.place as { cook: string }).cook)) throw new Error(`ext held by ghost ${ctx}`);
  if (e.place.kind === 'flight') throw new Error(`ext in flight ${ctx}`);
  if (e.place.kind === 'counter' && after.stations?.[e.place.tile]) throw new Error(`ext in station ${ctx}`);
  for (const old of bi.values()) {
    if (ids.has(old.id)) continue;
    const pressedCross = old.place.kind === 'held' && ((frames.get(old.place.cook)?.pressed ?? 0) & cross) !== 0;
    const cookTarget = old.place.kind === 'held' ? before.cooks.find((c) => c.id === (old.place as { cook: string }).cook)?.targetTile : null;
    const bin = pressedCross && cookTarget !== null && cookTarget !== undefined && before.stations?.[cookTarget]?.type === 'bin';
    const fire = old.place.kind === 'counter' && after.stations?.[old.place.tile]?.fire === true && !['plate', 'dirty-plate'].includes(old.kind);
    const loadedIntoFire = pressedCross && cookTarget !== null && cookTarget !== undefined && after.stations?.[cookTarget]?.fire === true;
    if (!(bin || fire || loadedIntoFire)) throw new Error(`vanished ${JSON.stringify(old)} ${ctx}`);
    stats[bin ? 'binned' : 'burned'] = (stats[bin ? 'binned' : 'burned'] ?? 0) + 1;
    if (old.kind === 'extinguisher') throw new Error(`extinguisher lost ${ctx}`);
  }
  for (const it of ai) {
    const prior = bi.get(it.id);
    if (!prior) {
      if (it.id < before.nextItemId) throw new Error(`id reuse ${ctx}`);
      if (it.kind !== 'raw' && it.kind !== 'extinguisher') throw new Error(`new non-raw ${ctx}`);
      if (it.kind === 'raw' && it.place.kind !== 'held' && it.place.kind !== 'flight') throw new Error(`crate not to hand ${ctx}`);
      stats.issued = (stats.issued ?? 0) + 1;
      continue;
    }
    if (prior.kind !== it.kind) {
      const st = prior.place.kind === 'counter' ? before.stations?.[prior.place.tile] : undefined;
      if (!st) throw new Error(`kind change outside station ${JSON.stringify(prior)} -> ${it.kind} ${ctx}`);
      if (prior.kind === 'burnt') throw new Error(`unburnt ${ctx}`);
      if (it.kind === 'burnt') { if (prior.kind !== 'cooked') throw new Error(`burnt from ${prior.kind}`); }
      else if (!(st.type === 'plating' && (it.kind === 'dish' || after.stations?.[st.tile]?.fire && it.kind === 'plate')) && it.kind !== OUT[st.type]) throw new Error(`wrong output ${st.type} ${it.kind} ${ctx}`);
      stats[`x:${st.type}:${it.kind}`] = (stats[`x:${st.type}:${it.kind}`] ?? 0) + 1;
    }
    // leaving a station: what came out must be finished output, burnt, or plating storage
    if (prior.place.kind === 'counter' && it.place.kind === 'held') {
      const st = before.stations?.[prior.place.tile];
      if (st && st.type !== 'plating') {
        const out = OUT[st.type];
        if (it.kind !== out && it.kind !== 'burnt') { stats.unfinishedTaken = (stats.unfinishedTaken ?? 0) + 1; stats[`unfinishedTaken:${st.type}`] = (stats[`unfinishedTaken:${st.type}`] ?? 0) + 1; }
      }
    }
    const history = prior.processes ?? [];
    expect((it.processes ?? []).slice(0, history.length)).toEqual(history);
    const nested = items(after).some((parent) => parent.contents?.some((f) => f.id === it.id));
    if (nested) continue;
    const p = it.place;
    if (p.kind === 'held' && after.inventory.held[p.cook] !== it) throw new Error(`held idx ${ctx}`);
    if (p.kind === 'counter' && (after.stations?.[p.tile]?.content ?? after.inventory.counters[p.tile]) !== it) throw new Error(`counter idx ${ctx}`);
    if (p.kind === 'counter' && after.stations?.[p.tile] && after.inventory.counters[p.tile]) throw new Error(`double-indexed ${ctx}`);
    if (p.kind === 'floor' && !after.inventory.floor[p.tile]?.includes(it)) throw new Error(`floor idx ${ctx}`);
  }
  for (const st of Object.values(after.stations ?? {})) {
    const old = required(required(before.stations)[st.tile]);
    if (st.progress > st.total) throw new Error(`over total ${ctx}`);
    if (st.content && !['plating'].includes(st.type)) {
      const k = st.content.kind;
      const okIn: Record<string, string[]> = { chop: ['raw', 'chopped'], drinks: ['raw', 'cooked'], sink: ['dirty-plate', 'plate'], bin: [] };
      const allowed = okIn[st.type] ?? ['raw', 'chopped', 'cooked', 'burnt'];
      if (!allowed.includes(k) && !(st.fire || old.fire)) throw new Error(`station ${st.type} holds ${k} ${ctx}`);
      if (st.fire && !['plate', 'dirty-plate'].includes(k)) throw new Error(`food in fire ${ctx}`);
    }
    if (st.type === 'bin' && st.content) throw new Error(`bin holds ${ctx}`);
    if (st.progress > old.progress && old.content) {
      if (['chop', 'drinks', 'sink'].includes(st.type)) {
        const worker = before.cooks.some((c) => c.targetTile === st.tile && ((frames.get(c.id)?.held ?? 0) & circle) && !before.inventory.held[c.id]);
        // loaded this step by the same cook is also ok
        if (!worker && !before.cooks.some((c) => c.targetTile === st.tile && ((frames.get(c.id)?.held ?? 0) & circle))) throw new Error(`progress without worker ${ctx}`);
        if (st.progress - old.progress > 1) throw new Error(`stacked work ${ctx}`);
      }
      if (st.type === 'grill' && old.progress === Math.ceil(st.total / 2) && !old.turned && !st.turned) throw new Error(`grill unturned ${ctx}`);
    }
    if (st.fire && !old.fire) {
      stats.ignitions = (stats.ignitions ?? 0) + 1;
      const cause = old.content?.kind === 'burnt' && old.burntAge + 1 >= FIRE_STEPS;
      const spread = st.neighbours.some((at) => { const s = required(required(before.stations)[at]); return s.fire && (before.fireSpreadClock ?? 0) + 1 >= SPREAD_STEPS; });
      if (cause) stats.ignitedByBurn = (stats.ignitedByBurn ?? 0) + 1; else stats.spread = (stats.spread ?? 0) + 1;
      if (!cause && !spread) throw new Error(`fire without cause ${ctx}`);
    }
    if (!st.fire && old.fire) stats.extinguished = (stats.extinguished ?? 0) + 1;
  }
  if (after.inventory.floorCount !== Object.values(after.inventory.floor).reduce((n, p) => n + (p?.length ?? 0), 0)) throw new Error(`floorCount ${ctx}`);
  stats.maxItems = Math.max(stats.maxItems ?? 0, ai.length);
}

it('fuzz 1..8 cooks with join/leave, >=300k cook-steps', () => {
  const stats: Record<string, number> = { cookSteps: 0 };
  for (let n = 1; n <= 8; n++) for (let seedK = 0; seedK < 3; seedK++) {
    let seed = (n * 7907 + seedK * 104729) | 1;
    const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    let s = setup(n * 31 + seedK, n);
    let replay: TabaoState | null = null;
    const log: ReturnType<typeof createTick>[] = [];
    const holds = new Map<string, { axes: [number, number]; held: number; left: number }>();
    for (let t = 0; t < ROUND_STEPS; t++) {
      if (rnd() < 0.0006 && s.cooks.length > 0) {
        const victim = required(s.cooks[Math.floor(rnd() * s.cooks.length)]);
        const b = s; s = tabaoRush.leave(s, victim.id);
        if (items(s).length !== items(b).length) throw new Error('leave changed item count');
        if (items(s).filter((i) => i.kind === 'extinguisher').length !== 1) throw new Error('leave lost extinguisher');
        s = tabaoRush.join(s, { id: victim.id, seat: Number(victim.id.slice(1)) + 1, name: 'x', colour: 'seat-1' });
        replay = null;
      }
      const frames = new Map<string, { held: number; pressed: number; released: number; axes: number[]; age: number; seq: number }>();
      for (const c of s.cooks) {
        let h = holds.get(c.id);
        if (!h || h.left <= 0) {
          const mode = rnd();
          const a = rnd() * Math.PI * 2, m = rnd() < 0.3 ? 0 : 0.5 + rnd() / 2;
          const axes: [number, number] = mode < 0.35 ? [0, -1] : mode < 0.55 ? [0, 1] : mode < 0.75 ? [rnd() < 0.5 ? -1 : 1, 0] : [Math.cos(a) * m, Math.sin(a) * m];
          h = { axes, held: rnd() < 0.6 ? circle : 0, left: Math.floor(rnd() * (mode < 0.55 ? 300 : 200)) };
          holds.set(c.id, h);
        }
        h.left--;
        const r = rnd();
        const pressed = r < 0.03 ? cross : r < 0.035 ? triangle : r < 0.037 ? cross | triangle : 0;
        frames.set(c.id, { held: h.held | pressed, pressed, released: 0, axes: [h.axes[0], h.axes[1], 0, 0], age: 0, seq: t });
      }
      if (process.env.FUZZ_AIM === '1') {
        const targets = tiles.map((t, i) => (t.kind === 'station' || t.kind === 'counter') ? i : -1).filter((i) => i >= 0);
        s = { ...s, cooks: s.cooks.map((c) => { const h = required(holds.get(c.id)); if (h.left % 97 !== 0 && c.targetTile !== null) return c;
          return { ...c, targetTile: rnd() < 0.08 ? RACK : required(targets[Math.floor(rnd() * targets.length)]) }; }) };
        replay = null;
      }
      const inputs = createTick({ frames });
      const before = s;
      s = tabaoRush.step(s, inputs, STEP_MS);
      stats.cookSteps = (stats.cookSteps ?? 0) + s.cooks.length;
      check(before, s, frames, `n${String(n)} k${String(seedK)} t${String(t)}`, stats);
      if (replay) { replay = tabaoRush.step(replay, inputs, STEP_MS); }
      if (t === 4000) replay = decodeState(JSON.parse(JSON.stringify(encodeState(s)))) as TabaoState;
      if (replay && t % 1000 === 0 && hashState(replay) !== hashState(s)) throw new Error(`reload diverged t${String(t)}`);
      log.push(inputs);
    }
    if (replay && hashState(replay) !== hashState(s)) throw new Error('reload diverged at end');
  }
  if (process.env.T03_EVIDENCE === '1') fs.writeFileSync(new URL('../../../../uat/evidence/T-03-tabao-stations/review-fuzz.json', import.meta.url), JSON.stringify(stats, null, 2));
  expect(stats.unfinishedTaken ?? 0).toBe(0);
  expect(stats.cookSteps).toBeGreaterThan(300000);
}, 600000);

import { performance } from 'node:perf_hooks';
it('perf: 8 cooks, every station busy, crates mashed, fires burning, full round', () => {
  let s = setup(5, 8);
  // load every cooking/holding station
  const st = { ...s.stations };
  let id = s.nextItemId;
  for (const x of Object.values(st)) if (x.type !== 'bin') st[x.tile] = { ...x, content: { id: id++, kind: x.type === 'sink' ? 'dirty-plate' : x.type === 'plating' ? 'plate' : 'raw', ingredient: x.type === 'drinks' ? 'kopi' : 'chicken', place: { kind: 'counter', tile: x.tile } } };
  s = { ...s, stations: st, nextItemId: id };
  const crates = tiles.map((t, i) => t.kind === 'station' && t.ingredient ? i : -1).filter((i) => i >= 0);
  const times: number[] = []; const blocks: { mean: number; p95: number; worst: number; fires: number; items: number; viewBytes: number }[] = [];
  let maxView = 0;
  for (let t = 0; t < ROUND_STEPS; t++) {
    // half the cooks mash crates and throw (T-02 abuse), half hold circle on stations
    s = { ...s, cooks: s.cooks.map((c, i) => ({ ...c, targetTile: i < 4 ? required(crates[i % crates.length]) : c.targetTile })) };
    const frames = new Map(s.cooks.map((c, i) => [c.id, { held: i < 4 ? cross | triangle : circle, pressed: i < 4 && t % 2 === 0 ? cross | triangle : 0, released: 0, axes: i < 4 ? [0, 0, 0, 0] : [Math.sin(t / 50 + i), Math.cos(t / 70 + i), 0, 0], age: 0, seq: t }]));
    const inputs = createTick({ frames });
    const a = performance.now();
    s = tabaoRush.step(s, inputs, STEP_MS);
    times.push(performance.now() - a);
    if (t % 600 === 599) {
      const v = JSON.stringify(tabaoRush.publicView(s)).length; maxView = Math.max(maxView, v);
      const b = times.splice(0).sort((x, y) => x - y);
      blocks.push({ mean: b.reduce((x, y) => x + y, 0) / b.length, p95: required(b[Math.floor(b.length * 0.95)]), worst: required(b[b.length - 1]), fires: Object.values(s.stations ?? {}).filter((x) => x.fire).length, items: items(s).length, viewBytes: v });
    }
  }
  if (process.env.T03_EVIDENCE === '1') fs.writeFileSync(new URL('../../../../uat/evidence/T-03-tabao-stations/review-performance.json', import.meta.url), JSON.stringify({ blocks, maxView }, null, 1));
  expect(blocks.length).toBe(21);
}, 300000);
