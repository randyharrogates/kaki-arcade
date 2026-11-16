import { arriveOrders, completeOrder, kitchenId } from './orders';
import { secondsToSteps } from '@kaki/platform';
import type { Cook, Item, Station, StationType, TabaoState } from './state';
import { floorTile, heldItem, relocate } from './items';
import { readyForContainer, assemblyAction, CAPACITY, checkRecipe, containerOf, food, ingredientAccepted, potAddition, REJECTION_STEPS } from './recipes';

export const ASSEMBLY_STEPS = secondsToSteps(1);
export const RETURN_STEPS = secondsToSteps(5);
const PASSIVE = new Set<StationType>(['plating', 'bin', 'serving', 'dish-rack', 'return-counter']);
const SAFE = new Set<StationType>(['serving', 'dish-rack', 'return-counter']);
// D-085 timings remain provisional until screen review.
export const WORK_STEPS = secondsToSteps(3);
export const COOK_STEPS = secondsToSteps(5);
export const WARNING_STEPS = secondsToSteps(3);
export const BURN_STEPS = secondsToSteps(5);
export const FIRE_STEPS = secondsToSteps(5);
export const SPREAD_STEPS = secondsToSteps(6);
export const EXTINGUISH_STEPS = secondsToSteps(1);

export function automatic(type: StationType): boolean {
  return type === 'wok' || type === 'pot' || type === 'grill' || type === 'rice';
}

/** One level scan at initialisation; later steps only walk the station index. */
export function prepareStations(state: TabaoState): TabaoState {
  if (state.stations) return state;
  if (state.level.firesEnabled && state.level.extinguisherTile === undefined) throw new Error('Fires require an extinguisher rack');
  const stations: Record<number, Station> = {};
  state.level.tiles.forEach((tile, at) => {
    if (tile.kind !== 'station' || !tile.stationType || tile.ingredient !== undefined) return;
    stations[at] = { tile: at, id: tile.stationId, type: tile.stationType, ...(tile.container ? { container: tile.container } : {}), ...(tile.kitchen ? { kitchen: tile.kitchen } : {}), neighbours: [],
      content: null, progress: 0, total: PASSIVE.has(tile.stationType)
        ? 0 : automatic(tile.stationType) ? COOK_STEPS : WORK_STEPS,
      doneAge: 0, burntAge: 0, warning: false, fire: false, fireAge: 0,
      extinguish: 0, workedAt: -1, turned: false };
  });
  for (const station of Object.values(stations)) {
    const at = station.tile;
    const width = state.level.width;
    const neighbours: number[] = [];
    for (const delta of [-width, -1, 1, width]) {
      for (let distance = 1; distance <= 2; distance++) {
        const tile = at + delta * distance;
        if (Math.abs(delta) === 1 && Math.floor(tile / width) !== Math.floor(at / width)) break;
        if (stations[tile]) { neighbours.push(tile); break; }
        if (state.level.tiles[tile]?.kind !== 'counter') break;
      }
    }
    stations[at] = { ...station, neighbours: (state.level.fireNeighbours?.[at] ?? neighbours)
      .filter((tile) => !SAFE.has(station.type) && stations[tile] !== undefined && !SAFE.has(stations[tile].type)).slice().sort((a, b) => a - b) };
  }
  if (!Object.values(stations).some((s) => s.type === 'return-counter')) throw new Error('Level requires a return counter');
  for (const station of Object.values(stations)) if (station.type === 'serving' && Object.values(stations).filter((s) => s.type === 'return-counter' && s.kitchen === station.kitchen).length !== 1) throw new Error('Each kitchen requires one return counter');
  let next = { ...state, stations };
  for (const station of Object.values(stations)) if (station.type === 'dish-rack') {
    const supply: Item[] = [];
    const container = station.container;
    if (!container) throw new Error('Dish rack requires a container kind');
    for (let i = 0; i < (container === 'plate' ? 4 : 2); i++) {
      supply.push({ id: next.nextItemId, kind: 'plate', container, contents: [], processes: [],
        place: { kind: 'counter', tile: station.tile } });
      next = { ...next, nextItemId: next.nextItemId + 1 };
    }
    stations[station.tile] = { ...station, supply };
  }
  const tile = state.level.extinguisherTile;
  if (tile !== undefined) {
    const item: Item = { id: next.nextItemId, kind: 'extinguisher', processes: [], place: { kind: 'counter', tile } };
    next = { ...next, nextItemId: next.nextItemId + 1, inventory: { ...next.inventory,
      counters: { ...next.inventory.counters, [tile]: item } } };
  }
  return next;
}

export function accepts(type: StationType, item: Item): boolean {
  if (type === 'bin') return ['raw', 'chopped', 'cooked', 'burnt'].includes(item.kind) || containerOf(item) !== undefined && food(item).length > 0;
  if (type === 'sink') return item.kind === 'dirty-plate';
  if (type === 'dish-rack') return item.kind === 'plate' && !(item.contents?.length) && !item.cup;
  if (type === 'serving') return true;
  if (type === 'plating') return item.kind === 'plate' || item.kind === 'chopped' || item.kind === 'cooked' || item.kind === 'dish';
  if (type === 'chop' || type === 'drinks') return item.kind === 'raw' && ingredientAccepted(type, item.ingredient, item.processes ?? []);
  return (item.kind === 'raw' || item.kind === 'chopped') && ingredientAccepted(type, item.ingredient, item.processes ?? []);
}

/** Detach before relocating: a nested cup is not an indexed held/counter item. */
function separateCup(state: TabaoState, plate: Item, tile: number, cook?: string): TabaoState {
  const { cup, ...rest } = plate;
  const outer: Item = rest.kind === 'dish' && !rest.contents?.length ? { ...rest, kind: 'plate', processes: [] } : rest;
  const station = state.stations?.[tile];
  if (!cup || !station) return state;
  if (plate.place.kind === 'held') state = { ...state, inventory: { ...state.inventory, held: { ...state.inventory.held, [plate.place.cook]: outer } } };
  else state = { ...state, stations: { ...state.stations, [tile]: { ...station, content: outer, ...(state.stations?.[tile]?.type === 'plating' ? { progress: 0, total: 0 } : {}) } } };
  const detached = { ...cup, place: { kind: 'floor' as const, tile } };
  // Insert directly: the old nested place is descriptive, not an inventory index.
  if (cook && !state.inventory.held[cook]) return { ...state, inventory: { ...state.inventory, held: { ...state.inventory.held, [cook]: { ...detached, place: { kind: 'held', cook } } } } };
  if (!state.stations?.[tile]?.content && !state.inventory.counters[tile] && state.stations?.[tile]?.type !== 'bin') return { ...state, stations: { ...state.stations, [tile]: { ...station, content: { ...detached, place: { kind: 'counter', tile } } } } };
  const beside = [-state.level.width, -1, 1, state.level.width].map((delta) => tile + delta).find((at) =>
    Math.abs(at % state.level.width - tile % state.level.width) <= 1 && state.level.tiles[at]?.kind === 'counter' && !state.inventory.counters[at] && !state.inventory.reserved[at]);
  if (beside !== undefined) return { ...state, inventory: { ...state.inventory, counters: { ...state.inventory.counters, [beside]: { ...cup, place: { kind: 'counter', tile: beside } } } } };
  const point = state.cooks.find((c) => c.id === cook) ?? { x: tile % state.level.width + 0.5, y: Math.floor(tile / state.level.width) + 0.5 };
  const own = Math.floor(point.y) * state.level.width + Math.floor(point.x);
  const floor = state.level.tiles[own]?.kind === 'floor' ? own : floorTile(state, point);
  return { ...state, inventory: { ...state.inventory, floorCount: state.inventory.floorCount + 1, floor: { ...state.inventory.floor, [floor]: [...(state.inventory.floor[floor] ?? []), { ...cup, place: { kind: 'floor', tile: floor } } as Item].sort((a, b) => a.id - b.id) } } };

}

export function stationCross(state: TabaoState, cook: Cook): TabaoState {
  const tile = cook.targetTile;
  if (tile === null) return state;
  const held = heldItem(state, cook.id);
  if (tile === state.level.extinguisherTile) {
    const equipment = state.inventory.counters[tile];
    if (!held && equipment) return relocate(state, equipment, { kind: 'held', cook: cook.id });
    if (held?.kind === 'extinguisher' && !equipment && !state.inventory.reserved[tile]) return relocate(state, held, { kind: 'counter', tile });
    return state;
  }
  const station = state.stations?.[tile];
  if (!station || station.fire) return state;
  if (station.type === 'serving' && held) {
    state = state.kitchens ? state : arriveOrders(state);
    const kitchen = kitchenId(station.kitchen);
    const result = checkRecipe(held, state.kitchens?.find((k) => k.id === kitchen)?.orders.map((o) => o.dish) ?? []);
    const seat = state.players.find((p) => p.id === cook.id)?.seat ?? 0;
    const base = { cook: cook.id, seat, step: state.tick, counter: tile };
    if ('reason' in result) return { ...state,
      orderEvents: [...(state.orderEvents ?? []), { type: 'refused', kitchen, ...base, dish: (() => { const candidate = checkRecipe(held); return 'dish' in candidate ? candidate.dish : null; })(), reason: result.reason }],
      serviceEvents: [...(state.serviceEvents ?? []), { ...base, type: 'rejected', reason: result.reason }],
      stations: { ...state.stations, [tile]: { ...station, rejection: { reason: result.reason, until: state.tick + REJECTION_STEPS } } } };
    const target = Object.values(state.stations ?? {}).find((s) => s.type === 'return-counter' && s.kitchen === station.kitchen);
    if (!target) throw new Error('Level requires a return counter');
    const { cup, ...outer } = held;
    const containers = [outer, ...(cup ? [cup] : [])];
    const drink = food(held).find((f) => f.ingredient === 'kopi' || f.ingredient === 'teh')?.ingredient;
    state = completeOrder(state, kitchen, result.dish, cook.id);
    return { ...state, serviceEvents: [...(state.serviceEvents ?? []), { ...base, type: 'served', dish: result.dish, ...(drink ? { drink } : {}) }],
      returns: [...(state.returns ?? []), ...containers.map((item) => ({ due: state.tick + RETURN_STEPS, tile: target.tile,
        item: { ...item, kind: 'dirty-plate' as const, contents: [], processes: [], place: { kind: 'counter' as const, tile: target.tile } } }))],
      inventory: { ...state.inventory, held: { ...state.inventory.held, [cook.id]: undefined } } };
  }
  if (station.type === 'dish-rack' || station.type === 'return-counter') {
    if (!held && station.supply?.[0]) {
      const taken = station.supply[0];
      return { ...state, inventory: { ...state.inventory, held: { ...state.inventory.held,
        [cook.id]: { ...taken, place: { kind: 'held', cook: cook.id } } } },
        stations: { ...state.stations, [tile]: { ...station, supply: station.supply.slice(1) } } };
    }
    if (held && station.type === 'dish-rack' && containerOf(held) === (station.container ?? 'plate') && accepts('dish-rack', held)) return { ...state,
      inventory: { ...state.inventory, held: { ...state.inventory.held, [cook.id]: undefined } },
      stations: { ...state.stations, [tile]: { ...station, supply: [...(station.supply ?? []), { ...held, place: { kind: 'counter', tile } }] } } };
    return state;
  }
  if (held && station.type === 'bin' && containerOf(held)) {
    if (!food(held).length && !held.cup) return state;
    state = separateCup(state, held.cup ? { ...held, cup: { ...held.cup, kind: 'plate', contents: [], processes: [] } } : held, tile, cook.id);
    const outer = heldItem(state, cook.id);
    if (!outer) return state;
    return { ...state, inventory: { ...state.inventory, held: { ...state.inventory.held,
      [cook.id]: { ...outer, kind: 'plate', contents: [], processes: [] } } } };
  }
  if (!held && station.type === 'plating' && station.content?.cup && !('dish' in checkRecipe(station.content))) return separateCup(state, station.content, tile, cook.id);
  if (held && station.type === 'plating' && station.content?.container === 'bowl' && station.content.kind !== 'dirty-plate') {
    const broth = station.content.contents?.[0];
    if (broth && station.content.contents.length === 1 && potAddition({ ...broth, place: station.content.place }, held)) return { ...state,
      inventory: { ...state.inventory, held: { ...state.inventory.held, [cook.id]: undefined } },
      stations: { ...state.stations, [tile]: { ...station, progress: 0, total: 0, content: { ...station.content, kind: 'dish', contents: [broth, ...food(held).map((f) => ({ ...f, kind: 'cooked' as const, processes: ['pot' as const] }))] } } } };
  }
  if (held && station.content && station.type === 'plating' && containerOf(station.content) &&
    station.content.kind !== 'dirty-plate' && accepts('plating', held)) {
    const container = containerOf(station.content);
    if (!readyForContainer(held)) return state;
    if (containerOf(held) === 'cup' && container === 'plate' && held.contents?.length && !station.content.cup && (station.content.contents?.length ?? 0) < CAPACITY.plate) return { ...state,
      inventory: { ...state.inventory, held: { ...state.inventory.held, [cook.id]: undefined } },
      stations: { ...state.stations, [tile]: { ...station, progress: 0, total: 0, content: { ...station.content, kind: 'dish', cup: held, processes: [] } } } };
    const added = containerOf(held) ? held.contents ?? [] : food(held);
    const awaitingNoodles = station.content.contents?.some((f) => f.ingredient === 'laksa-broth') && !station.content.contents.some((f) => f.ingredient === 'noodles');
    if (awaitingNoodles) return state;
    if (added.some((f) => f.ingredient === 'laksa-broth') && !added.some((f) => f.ingredient === 'noodles') && (container !== 'bowl' || station.content.contents?.length)) return state;
    if (!container || added.length === 0 || added.some((f) => f.kind === 'burnt') ||
      (station.content.contents?.length ?? 0) + (station.content.cup ? 1 : 0) + added.length > CAPACITY[container]) return state;
    // Pouring a drink preserves its cup in the cook's hand.
    const remainder: Item | undefined = containerOf(held) ? { ...held, kind: held.cup?.contents?.length ? 'dish' : 'plate', contents: [], processes: [] } : undefined;
    return { ...state, inventory: { ...state.inventory, held: { ...state.inventory.held, [cook.id]: remainder } },
      stations: { ...state.stations, [tile]: { ...station, progress: 0, total: 0, content: { ...station.content,
        kind: 'dish', contents: [...(station.content.contents ?? []), ...added], processes: [] } } } };
  }
  if (held && station.type === 'pot' && station.progress === station.total && station.content && potAddition(station.content, held)) {
    return { ...state, inventory: { ...state.inventory, held: { ...state.inventory.held, [cook.id]: undefined } },
      stations: { ...state.stations, [tile]: { ...station, progress: station.total, doneAge: 0, warning: false,
        content: { ...station.content, contents: food(held).map((f) => ({ ...f, kind: 'cooked' as const, processes: ['pot' as const] })) } } } };
  }
  if (held && !station.content && accepts(station.type, held)) {
    let loaded = relocate(state, held, { kind: 'counter', tile });
    if (station.type === 'sink' && held.cup) loaded = separateCup(loaded, { ...held, place: { kind: 'counter', tile } }, tile, cook.id);
    if (station.type !== 'bin') return loaded;
    // The bin is the explicit player-controlled destruction point.
    return { ...loaded, stations: { ...loaded.stations, [tile]: { ...station, content: null } } };
  }
  if (!held && station.content && (station.type === 'plating' || station.progress === station.total || station.content.kind === 'burnt')) {
    return relocate(state, station.content, { kind: 'held', cook: cook.id });
  }
  return state;
}

/** Called in seat order between cross and triangle, using the preceding highlight. */
export function stationAction(state: TabaoState, id: string): TabaoState {
  const cook = state.cooks.find((entry) => entry.id === id);
  if (cook?.targetTile === undefined || cook.targetTile === null) return state;
  const station = state.stations?.[cook.targetTile];
  if (!station || station.workedAt === state.tick) return state;
  const held = heldItem(state, id);
  const worker = state.players.find((p) => p.id === id)?.seat ?? null;
  if (station.fire) {
    if (held?.kind !== 'extinguisher') return state;
    return { ...state, stations: { ...state.stations, [station.tile]: {
      ...station, extinguish: station.extinguish + 1, workedAt: state.tick, worker,
    } } };
  }
  if (!held && station.type === 'plating' && station.content && containerOf(station.content) && !station.content.processes?.length) {
    const action = assemblyAction(station.content);
    if (action) {
      const progress = station.progress + 1;
      const done = progress >= ASSEMBLY_STEPS;
      return { ...state, stations: { ...state.stations, [station.tile]: { ...station, total: ASSEMBLY_STEPS, progress,
        workedAt: state.tick, worker, content: done ? { ...station.content,
          processes: action.action === 'mix' ? ['mix'] : [],
          contents: action.action === 'spread' ? station.content.contents?.map((f) => f.ingredient === action.ingredient && (f.processes ?? []).join(',') === 'grill' ? { ...f, processes: ['grill', 'spread'] } : f) ?? [] : station.content.contents ?? [] } : station.content } } };
    }
  }
  if (station.type === 'plating') return state;
  if (held || !station.content || station.content.kind === 'burnt' || station.progress >= station.total) return state;
  if (station.type === 'grill') {
    if (station.turned || station.progress < Math.ceil(station.total / 2)) return state;
    return { ...state, stations: { ...state.stations, [station.tile]: { ...station, turned: true, workedAt: state.tick, worker } } };
  }
  if (station.type === 'wok') return { ...state, stations: { ...state.stations, [station.tile]: { ...station, workedAt: state.tick, worker } } };
  if (automatic(station.type)) return state;
  return { ...state, stations: { ...state.stations, [station.tile]: {
    ...station, progress: station.progress + 1,
    content: station.progress + 1 === station.total ? finish(station) : station.content, workedAt: state.tick, worker,
  } } };
}

function finish(station: Station): Item | null {
  if (!station.content) return null;
  return { ...station.content,
    kind: station.type === 'chop' ? 'chopped' : station.type === 'sink' ? 'plate' : 'cooked',
    ...(station.type === 'sink' && station.content.cup ? { cup: { ...station.content.cup, kind: 'plate' as const, contents: [], processes: [] } } : {}),
    processes: station.type === 'sink' ? [] : station.type === 'pot' && station.content.contents?.length
      ? station.content.processes ?? [] : [...(station.content.processes ?? (station.content.kind === 'chopped' ? ['chop' as const] : [])), station.type],
    ...(station.type === 'pot' && station.content.contents?.length ? { contents: station.content.contents.map((f) => ({ ...f, kind: 'cooked' as const, processes: [...(f.processes ?? []), 'pot' as const] })) } : {}) };
}

function ignite(station: Station): Station {
  return { ...station, content: station.content && containerOf(station.content)
    ? station.content.kind === 'dish' || station.content.contents?.length
      ? { ...station.content, kind: 'dirty-plate', contents: [], processes: [], ...(station.content.cup ? { cup: { ...station.content.cup, kind: 'dirty-plate', contents: [], processes: [] } } : {}) } : station.content : null, progress: 0, doneAge: 0, burntAge: 0,
    warning: false, fire: true, fireAge: 0, extinguish: 0, turned: false };
}

/** Single indexed pass, then bounded-degree spread; newly lit stations wait until next step. */
export function advanceStations(state: TabaoState): TabaoState {
  if (state.returns?.some((r) => r.due <= state.tick)) {
    const stations = { ...state.stations };
    for (const r of state.returns) if (r.due <= state.tick) {
      const station = stations[r.tile];
      if (!station) throw new Error('Missing return counter');
      stations[r.tile] = { ...station, supply: [...(station.supply ?? []), r.item] };
    }
    state = { ...state, stations, returns: state.returns.filter((r) => r.due > state.tick) };
  }
  const previous = state.stations;
  if (!previous) return state;
  let changed = false;
  const stations = { ...previous };

  for (const old of Object.values(previous)) {
    let station = old;
    if (old.fire) {
      if (old.extinguish >= EXTINGUISH_STEPS) {
        station = { ...old, fire: false, fireAge: 0, extinguish: 0 };
      } else {
        const age = old.fireAge + 1;
        station = { ...old, fireAge: age, extinguish: old.workedAt === state.tick ? old.extinguish : 0 };
      }
    } else if (old.content) {
      if (old.content.kind === 'burnt') {
        station = { ...old, burntAge: old.burntAge + 1 };
        if (state.level.firesEnabled && station.burntAge >= FIRE_STEPS) station = ignite(station);
      } else {
        const limit = old.type === 'grill' && !old.turned ? Math.ceil(old.total / 2) : old.total;
        const rate = old.type === 'wok' && old.workedAt === state.tick ? 2 : 1;
        const progress = Math.min(limit, old.progress + (automatic(old.type) ? rate : 0));
        station = progress !== old.progress ? { ...old, progress } : old;
        if (progress === old.total && !PASSIVE.has(old.type)) {
          const output = old.type === 'chop' ? 'chopped' : old.type === 'sink' ? 'plate' : 'cooked';
          if (old.content.kind !== output) station = { ...station, content: finish(station) };
          else if (automatic(old.type)) {
            const age = old.doneAge + 1;
            station = { ...station, doneAge: age, warning: age >= WARNING_STEPS };
            if (age >= BURN_STEPS) station = { ...station, warning: false, content: { ...old.content, kind: 'burnt' } };
          }
        }
      }
    }
    if (station !== old) { stations[old.tile] = station; changed = true; }
  }
  const burning = Object.values(stations).filter((s) => s.fire);
  const clock = burning.length && Object.values(previous).some((s) => s.fire) ? (state.fireSpreadClock ?? 0) + 1 : 0;
  if (clock >= SPREAD_STEPS) {
    const source = burning.sort((a, b) => b.fireAge - a.fireAge || a.tile - b.tile)
      .find((s) => s.neighbours.some((at) => !stations[at]?.fire));
    const destination = source?.neighbours.find((at) => !stations[at]?.fire);
    if (destination !== undefined && stations[destination]) stations[destination] = ignite(stations[destination]);
  }
  let next: TabaoState = { ...state, stations: changed || clock >= SPREAD_STEPS ? stations : previous, fireSpreadClock: clock >= SPREAD_STEPS ? 0 : clock };
  for (const st of Object.values(next.stations ?? {})) if (st.fire && st.content?.cup) next = separateCup(next, st.content, st.tile, next.cooks.find((c) => c.targetTile === st.tile && !next.inventory.held[c.id])?.id);
  return next;
}

/** Public renderer/sound data; no implementation bookkeeping or wall-clock derivation. */
export function stationViews(state: TabaoState) {
  return Object.values(prepareStations(state).stations ?? {}).map((station) => ({
    supply: station.supply ?? [],
    rejection: station.rejection && state.tick <= station.rejection.until ? station.rejection.reason : null,
    id: station.id, tile: station.tile, type: station.type, contents: station.content,
    progress: station.progress, total: station.total, warning: station.warning, fire: station.fire,
    worker: station.workedAt === state.tick - 1 ? station.worker ?? null : null,
    fireIn: station.content?.kind === 'burnt' && state.level.firesEnabled ? Math.max(0, FIRE_STEPS - station.burntAge) : null,
    fireInTotal: FIRE_STEPS,
    turned: station.turned, extinguish: station.extinguish, extinguishTotal: EXTINGUISH_STEPS,
    status: station.fire ? 'fire' : station.content?.kind === 'burnt' ? 'burnt'
      : !station.content ? 'empty' : station.progress === station.total ? 'done' : 'working',
  }));
}
