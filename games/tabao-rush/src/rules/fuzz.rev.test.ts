import { describe, expect, it } from 'vitest';
import { decodeState, encodeState, hashState } from '@kaki/sim-core';
import { ROUND_STEPS } from './game';
import { tabaoRush } from './playing.fixture';
import { items } from './state';
import type { Item, TabaoState, Cook } from './state';
import { food, CAPACITY, checkRecipe, RECIPES } from './recipes';
import { actionPreview, itemPress } from './items';
import { stationAction } from './stations';
import { aimAt, circle, crateTile, cross, EXT, frame, ING, isContainer, players, setup, stationTiles, stepWith, tiles, triangle, W } from './review-fixture';

interface Food { id: number; kind: string; ingredient?: string | undefined; parent: number | null }
function foods(s: TabaoState): Food[] {
  const out: Food[] = [];
  for (const r of items(s)) {
    if (r.kind === 'extinguisher') continue;
    if (isContainer(r)) for (const f of food(r)) out.push({ id: f.id, kind: f.kind, ingredient: f.ingredient, parent: r.id });
    else { out.push({ id: r.id, kind: r.kind, ingredient: r.ingredient, parent: null }); for (const f of r.contents ?? []) out.push({ id: f.id, kind: f.kind, ingredient: f.ingredient, parent: r.id }); }
  }
  return out;
}
const foodIdsOf = (i: Item | undefined | null): number[] => !i ? [] : isContainer(i) ? food(i).map((f) => f.id) : [i.id, ...food(i).map((f) => f.id)];

function rand(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)] as T;


function wantFor(held: Item | undefined, s: TabaoState, r: () => number): number | null {
  const all = [...tiles.keys()].filter((i) => tiles[i]?.kind !== 'floor' && tiles[i]?.kind !== 'wall');
  if (r() < 0.25) return r() < 0.1 ? null : pick(r, all);
  const fires = Object.values(s.stations ?? {}).filter((st) => st.fire);
  if (held?.kind === 'extinguisher') return fires.length ? (fires[0]?.tile ?? EXT) : EXT;
  if (!held) {
    if (fires.length && r() < 0.3) return EXT;
    const done = Object.values(s.stations ?? {}).filter((st) => st.type === 'plating' && st.content && 'dish' in checkRecipe(st.content));
    if (done.length && r() < 0.8) return pick(r, done).tile;
    if (s.inventory.floorCount > 0 && r() < 0.4) return -1;
    const ready = Object.values(s.stations ?? {}).filter((st) => st.content && st.type !== 'plating' && (st.progress === st.total || st.content.kind === 'burnt'));
    if (ready.length && r() < 0.5) return pick(r, ready).tile;
    const working = Object.values(s.stations ?? {}).filter((st) => st.content && ['chop', 'drinks', 'sink', 'plating', 'grill', 'wok'].includes(st.type));
    if (working.length && r() < 0.5) return pick(r, working).tile;
    if (r() < 0.25) return pick(r, stationTiles('dish-rack'));
    return crateTile(pick(r, ING));
  }
  if (held.kind === 'dirty-plate') return pick(r, stationTiles('sink'));
  if (held.kind === 'dish') return r() < 0.75 ? pick(r, stationTiles('serving')) : r() < 0.5 ? pick(r, stationTiles('bin')) : pick(r, stationTiles('plating'));
  if (held.kind === 'plate') return r() < 0.8 ? pick(r, stationTiles('plating')) : pick(r, stationTiles('dish-rack'));
  if (held.kind === 'burnt') return pick(r, stationTiles('bin'));
  const hist = (held.processes ?? []).join(',');
  for (const rec of RECIPES) for (const p of rec.ingredients) {
    const matches = p.ingredient === held.ingredient || p.ingredient === 'drink' && (held.ingredient === 'kopi' || held.ingredient === 'teh');
    if (!matches) continue;
    const done = p.steps.filter((x) => x !== 'spread' && x !== 'mix');
    const k = hist ? hist.split(',').length : 0;
    const next = done[k];
    if (rec.id === 'laksa' && held.ingredient === 'noodles') return pick(r, stationTiles('pot'));
    if (next && r() < 0.85) return pick(r, stationTiles(next as never));
  }
  return pick(r, stationTiles('plating'));
}


type Stats = Record<string, number>;
function invariants(before: TabaoState, after: TabaoState, frames: Map<string, ReturnType<typeof frame>>, lost: Set<number>, containers: Map<number, string>, st: Stats, ctx: string) {
  const fb = foods(before), fa = foods(after);
  const ids = new Set<number>();
  for (const r of items(after).flatMap((i) => [i, ...(i.cup ? [i.cup] : [])])) { if (ids.has(r.id)) throw new Error(`dup root ${String(r.id)} ${ctx}`); ids.add(r.id); }
  for (const f of fa) if (f.parent !== null) { if (ids.has(f.id)) throw new Error(`dup nested ${String(f.id)} ${ctx}`); ids.add(f.id); }
  const aIds = new Set(fa.map((f) => f.id));
  const bIds = new Set(fb.map((f) => f.id));
  for (const f of fb) if (!aIds.has(f.id)) {
    const binned = before.cooks.some((c) => (frames.get(c.id)?.pressed ?? 0) & cross && c.targetTile !== null && before.stations?.[c.targetTile]?.type === 'bin' && !before.stations[c.targetTile]?.fire && foodIdsOf(before.inventory.held[c.id]).includes(f.id));
    const served = (after.serviceEvents ?? []).some((e) => e.type === 'served' && foodIdsOf(before.inventory.held[e.cook]).includes(f.id));
    const fire = Object.values(before.stations ?? {}).some((s) => foodIdsOf(s.content).includes(f.id) && after.stations?.[s.tile]?.fire);
    if (!(binned || served || fire)) throw new Error(`food vanished ${JSON.stringify(f)} ${ctx}`);
    st[binned ? 'sink:bin' : served ? 'sink:served' : 'sink:fire'] = (st[binned ? 'sink:bin' : served ? 'sink:served' : 'sink:fire'] ?? 0) + 1;
    lost.add(f.id);
  }
  for (const f of fa) if (!bIds.has(f.id)) {
    if (lost.has(f.id)) throw new Error(`resurrected ${String(f.id)} ${ctx}`);
    if (f.id < before.nextItemId || f.kind !== 'raw') throw new Error(`created ${JSON.stringify(f)} ${ctx}`);
    const ok = before.cooks.some((c) => !before.inventory.held[c.id] && (frames.get(c.id)?.pressed ?? 0) & cross && c.targetTile !== null && tiles[c.targetTile]?.kind === 'station' && (tiles[c.targetTile] as { ingredient?: string }).ingredient === f.ingredient);
    if (!ok) throw new Error(`food without crate ${JSON.stringify(f)} ${ctx}`);
    st.crate = (st.crate ?? 0) + 1;
  }
  // containers
  const cs = items(after).flatMap((i) => [i, ...(i.cup ? [i.cup] : [])]).filter(isContainer);
  if (cs.length !== containers.size) throw new Error(`container count ${String(cs.length)} ${ctx}`);
  for (const c of cs) {
    if (containers.get(c.id) !== c.container) throw new Error(`container changed ${JSON.stringify(c)} ${ctx}`);
    const n = c.contents?.length ?? 0;
    if (n > CAPACITY[c.container ?? 'plate']) throw new Error(`over capacity ${ctx}`);
    if (c.kind === 'dirty-plate' && n) throw new Error(`dirty with food ${ctx}`);
    if (c.kind === 'plate' && n) throw new Error(`clean plate kind with food ${JSON.stringify(c)} ${ctx}`);
    if (c.kind === 'dish' && !food(c).length) throw new Error(`empty dish ${JSON.stringify(c)} ${ctx}`);
    if (c.place.kind === 'flight') throw new Error(`container thrown ${ctx}`);
    if (c.place.kind === 'counter') { const s = after.stations?.[c.place.tile]; if (s && !['plating', 'sink', 'dish-rack', 'return-counter'].includes(s.type)) throw new Error(`container on ${s.type} ${ctx}`); }
    st[`c:${c.kind}:${c.place.kind}`] = (st[`c:${c.kind}:${c.place.kind}`] ?? 0) + 1;
  }
  for (const f of fa) if (['plate', 'dirty-plate', 'dish'].includes(f.kind)) throw new Error(`food with container kind ${ctx}`);
  // indexes
  for (const it of items(after)) {
    const p = it.place;
    if (p.kind === 'held' && after.inventory.held[p.cook] !== it) throw new Error(`held idx ${ctx}`);
    if (p.kind === 'held' && !after.cooks.some((c) => c.id === p.cook)) throw new Error(`held by departed ${ctx}`);
    if (p.kind === 'counter' && !after.returns?.some((r) => r.item === it) && !(after.inventory.counters[p.tile] === it || after.stations?.[p.tile]?.content === it || after.stations?.[p.tile]?.supply?.includes(it))) throw new Error(`counter idx ${ctx}`);
    if (p.kind === 'floor' && !after.inventory.floor[p.tile]?.includes(it)) throw new Error(`floor idx ${ctx}`);
    if (p.kind === 'flight' && !after.inventory.flights.includes(it)) throw new Error(`flight idx ${ctx}`);
  }
  for (const [cook, it] of Object.entries(after.inventory.held)) if (it && (it.place.kind !== 'held' || it.place.cook !== cook)) throw new Error(`held place ${ctx}`);
  for (const s of Object.values(after.stations ?? {})) {
    if (s.content && !(s.content.place.kind === 'counter' && s.content.place.tile === s.tile)) throw new Error(`station place ${ctx}`);
    for (const c of s.supply ?? []) if (!(c.place.kind === 'counter' && c.place.tile === s.tile)) throw new Error(`supply place ${ctx}`);
    if (s.type === 'bin' && s.content) throw new Error(`bin holds ${ctx}`);
    if (s.type === 'serving' && s.content) throw new Error(`serving holds ${ctx}`);
  }
  const floorN = Object.values(after.inventory.floor).reduce((n, p) => n + (p?.length ?? 0), 0);
  if (floorN !== after.inventory.floorCount) throw new Error(`floorCount ${ctx}`);
  st.maxFloor = Math.max(st.maxFloor ?? 0, floorN);
  st.maxLive = Math.max(st.maxLive ?? 0, fa.length + cs.length);
  for (const e of after.serviceEvents ?? []) st[`ev:${e.type}:${e.type === 'served' ? e.dish : e.reason.code}`] = (st[`ev:${e.type}:${e.type === 'served' ? e.dish : e.reason.code}`] ?? 0) + 1;
  if ((after.serviceEvents?.length ?? 0) > 8) throw new Error('events > 8');
  for (const e of after.serviceEvents ?? []) if (e.type === 'rejected' && after.inventory.held[e.cook] !== before.inventory.held[e.cook]) throw new Error(`rejected item altered ${ctx}`);
}

/** Preview vs effect: the first presser in seat order (unaffected by others) must get exactly what its preview said. */
function previewCheck(start: TabaoState, frames: Map<string, ReturnType<typeof frame>>, st: Stats, ctx: string) {
  const view = tabaoRush.publicView(start) as { cooks: (Cook & { actions: { cross: string; circle: string } })[] };
  const prepared = { ...start, serviceEvents: [] };
  let first = true;
  for (const p of start.players) {
    const f = frames.get(p.id); const cook = start.cooks.find((c) => c.id === p.id);
    if (!f || !cook) continue;
    const pv = view.cooks.find((c) => c.id === p.id)?.actions;
    if (!pv) throw new Error('no preview');
    // previews on the published state and on the step's starting state must agree
    const again = actionPreview(prepared, cook);
    if (again.cross !== pv.cross || again.circle !== pv.circle) throw new Error(`preview basis differs ${ctx}`);
    if (!first) continue;
    if (f.pressed & cross) {
      first = false;
      const out = itemPress(prepared, p.id, 'cross');
      const did = out !== prepared;
      if ((pv.cross !== 'nothing') !== did) throw new Error(`cross preview ${pv.cross} but did=${String(did)} ${ctx}`);
      const hb = prepared.inventory.held[p.id], ha = out.inventory.held[p.id];
      const ev = out.serviceEvents?.at(-1);
      const kind = pv.cross.split(' ')[0] ?? '';
      st[`pv:${kind}`] = (st[`pv:${kind}`] ?? 0) + 1;
      if (kind === 'pick' && !(hb === undefined && ha)) throw new Error(`pick up label wrong ${ctx}`);
      if (kind === 'put' && !(hb && (ha === undefined))) throw new Error(`put down label wrong: ${JSON.stringify(hb)} -> ${JSON.stringify(ha)} ${ctx}`);
      if (kind === 'serve' && ev?.type !== 'served') throw new Error(`serve label wrong ${ctx}`);
      if (kind === 'reject:' && ev?.type !== 'rejected') throw new Error(`reject label wrong ${ctx}`);
      if (kind === 'add' && !(hb && (ha === undefined || isContainer(ha)))) throw new Error(`add label wrong ${ctx}`);
    } else if (f.held & circle || f.pressed & circle) {
      first = false;
      const out = stationAction(prepared, p.id);
      if ((pv.circle !== 'nothing') !== (out !== prepared)) throw new Error(`circle preview ${pv.circle} ${ctx}`);
      st[`pvc:${pv.circle}`] = (st[`pvc:${pv.circle}`] ?? 0) + 1;
    } else if (f.pressed & triangle) first = false;
  }
}

describe('T-04 review fuzz', { timeout: 600_000 }, () => {
  for (const n of [1, 2, 4, 8]) for (const fires of [true, false]) it(`round at ${String(n)} cooks fires=${String(fires)}: conservation, indexes, previews, reload`, () => {
    const r = rand(n * 977 + (fires ? 1 : 0));
    let state = setup(n, 11, fires);
    let twin = state;
    const containers = new Map(items(state).filter(isContainer).map((c) => [c.id, c.container ?? 'plate'] as const));
    expect(containers.size).toBe(8);
    const lost = new Set<number>(); const st: Stats = {};
    for (let t = 0; t < ROUND_STEPS; t++) {
      // leave and rejoin
      if (n > 1 && t === 4000) { const id = `p${String(n - 1)}`; state = tabaoRush.leave(state, id); twin = tabaoRush.leave(twin, id); }
      if (n > 2 && t === 7000) { state = tabaoRush.leave(state, 'p1'); twin = tabaoRush.leave(twin, 'p1'); }
      if (n > 1 && t === 9000) { const pl = players(n)[n - 1]; if (pl) { state = tabaoRush.join(state, pl); twin = tabaoRush.join(twin, pl); } }
      const throwPhase = t % 4000 < 150;
      const cooks = state.cooks.map((c, i) => {
        const want = wantFor(state.inventory.held[c.id], state, r);
        if (want === -1) {
          const tile = Number(Object.entries(state.inventory.floor).find(([, pile]) => pile?.length)?.[0] ?? 4 * W + 5);
          return { ...c, targetTile: null, x: tile % W + 0.5, y: Math.floor(tile / W) + 0.5, facing: 2 as const };
        }
        return aimAt(c, throwPhase && r() < 0.5 ? null : want, 2.5 + i * 3);
      });
      state = { ...state, cooks }; twin = { ...twin, cooks };
      const frames = new Map(state.players.map((p) => {
        const x = r();
        const press = throwPhase ? (x < 0.3 ? cross : x < 0.7 ? triangle : 0) : x < 0.35 ? cross : x < 0.4 ? triangle : 0;
        return [p.id, frame(r() < 0.6 ? circle : 0, press | (r() < 0.05 ? circle : 0), t)] as const;
      }));
      previewCheck(state, frames, st, `t=${String(t)}`);
      const before = state;
      state = stepWith(state, frames); twin = stepWith(twin, frames);
      invariants(before, state, frames, lost, containers, st, `n=${String(n)} t=${String(t)}`);
      if (t === Math.floor(ROUND_STEPS / 2)) state = decodeState(JSON.parse(JSON.stringify(encodeState(state)))) as TabaoState;
      if (t % 1000 === 0) expect(hashState(state)).toBe(hashState(twin));
    }
    expect(hashState(state)).toBe(hashState(twin));
    process.stdout.write(`${String(n)} ${String(fires)} ${JSON.stringify(Object.fromEntries(Object.entries(st).sort()))}\n`);
    expect(st.maxLive ?? 0).toBeGreaterThan(0);
  });
});
