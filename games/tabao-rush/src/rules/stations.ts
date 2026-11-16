import { secondsToSteps } from '@kaki/platform';
import type { Cook, Item, Station, StationType, TabaoState } from './state';
import { heldItem, relocate } from './items';

// D-080 timings remain provisional until screen review.
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
    stations[at] = { tile: at, id: tile.stationId, type: tile.stationType, neighbours: [],
      content: null, progress: 0, total: tile.stationType === 'plating' || tile.stationType === 'bin'
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
      .filter((tile) => stations[tile] !== undefined).slice().sort((a, b) => a - b) };
  }
  let next = { ...state, stations };
  const tile = state.level.extinguisherTile;
  if (tile !== undefined) {
    const item: Item = { id: state.nextItemId, kind: 'extinguisher', processes: [], place: { kind: 'counter', tile } };
    next = { ...next, nextItemId: state.nextItemId + 1, inventory: { ...state.inventory,
      counters: { ...state.inventory.counters, [tile]: item } } };
  }
  return next;
}

export function accepts(type: StationType, item: Item): boolean {
  // T-04: a plated dish must leave its plate; refuse dishes until that model exists.
  if (type === 'bin') return ['raw', 'chopped', 'cooked', 'burnt'].includes(item.kind);
  if (type === 'sink') return item.kind === 'dirty-plate';
  if (type === 'plating') return item.kind === 'plate' || item.kind === 'chopped' || item.kind === 'cooked' || item.kind === 'dish';
  if (type === 'chop') return item.kind === 'raw';
  if (type === 'drinks') return item.kind === 'raw' && (item.ingredient === 'kopi' || item.ingredient === 'teh');
  return item.kind === 'raw' || item.kind === 'chopped';
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
  if (held && !station.content && accepts(station.type, held)) {
    const loaded = relocate(state, held, { kind: 'counter', tile });
    if (station.type !== 'bin') return loaded;
    // The bin is the explicit player-controlled destruction point.
    return { ...loaded, stations: { ...loaded.stations, [tile]: { ...station, content: null } } };
  }
  if (!held && station.content && (station.progress === station.total || station.content.kind === 'burnt')) {
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
    processes: [...(station.content.processes ?? (station.content.kind === 'chopped' ? ['chop' as const] : [])), station.type] };
}

function ignite(station: Station): Station {
  return { ...station, content: station.content?.kind === 'plate' || station.content?.kind === 'dirty-plate'
    ? station.content : null, progress: 0, doneAge: 0, burntAge: 0,
    warning: false, fire: true, fireAge: 0, extinguish: 0, turned: false };
}

/** Single indexed pass, then bounded-degree spread; newly lit stations wait until next step. */
export function advanceStations(state: TabaoState): TabaoState {
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
        if (progress === old.total && old.type !== 'plating' && old.type !== 'bin') {
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
  return { ...state, stations: changed || clock >= SPREAD_STEPS ? stations : previous,
    fireSpreadClock: clock >= SPREAD_STEPS ? 0 : clock };
}

/** Public renderer/sound data; no implementation bookkeeping or wall-clock derivation. */
export function stationViews(state: TabaoState) {
  return Object.values(prepareStations(state).stations ?? {}).map((station) => ({
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
