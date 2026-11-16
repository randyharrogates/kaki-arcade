import { wasPressed } from '@kaki/sim-core';
import { BUTTON, secondsToSteps } from '@kaki/platform';
import type { StepInputs } from '@kaki/platform';
import { tileAt } from './level';
import { COOK_RADIUS } from './state';
import type { Cook, Item, ItemLocation, Point, TabaoState } from './state';
import { stationAction, stationCross } from './stations';
import { isHeld } from '@kaki/sim-core';
import { FACING_X, FACING_Y } from './target';

export const THROW_RANGE = 4;
// D-051 slow motion token: 377 ms (D-078 d); rules do not depend on the UI package.
export const THROW_STEPS = secondsToSteps(0.377);
export const FLOOR_LIMIT = 24;

export function heldItem(state: TabaoState, id: string): Item | undefined {
  return state.inventory.held[id];
}

/** Copy only the affected location index, never the full item population. */
export function relocate(state: TabaoState, item: Item, place: ItemLocation): TabaoState {
  let index = state.inventory;
  const old = item.place;
  if (old.kind === 'held') index = { ...index, held: { ...index.held, [old.cook]: undefined } };
  else if (old.kind === 'counter' && !state.stations?.[old.tile]) index = { ...index, counters: { ...index.counters, [old.tile]: undefined } };
  else if (old.kind === 'floor') index = { ...index, floorCount: index.floorCount - 1,
    floor: { ...index.floor, [old.tile]: index.floor[old.tile]?.filter((i) => i.id !== item.id) } };
  else if (old.kind === 'counter') {
    const station = state.stations?.[old.tile];
    if (station) state = { ...state, stations: { ...state.stations, [old.tile]: { ...station, content: null, progress: 0, doneAge: 0, burntAge: 0, warning: false, turned: false } } };
  }
  else index = { ...index, flights: index.flights.filter((i) => i.id !== item.id),
    reserved: { ...index.reserved, [old.rest.tile]: (index.reserved[old.rest.tile] ?? 1) - 1 } };
  const moved = { ...item, place };
  if (place.kind === 'held') index = { ...index, held: { ...index.held, [place.cook]: moved } };
  else if (place.kind === 'counter' && !state.stations?.[place.tile]) index = { ...index, counters: { ...index.counters, [place.tile]: moved } };
  else if (place.kind === 'floor') index = { ...index, floorCount: index.floorCount + 1,
    floor: { ...index.floor, [place.tile]: [...(index.floor[place.tile] ?? []), moved].sort((a, b) => a.id - b.id) } };
  else if (place.kind === 'counter') {
    const station = state.stations?.[place.tile];
    if (station) state = { ...state, stations: { ...state.stations, [place.tile]: { ...station, content: moved, progress: 0, doneAge: 0, burntAge: 0, warning: false, turned: false } } };
  }
  else index = { ...index, flights: [...index.flights, moved],
    reserved: { ...index.reserved, [place.rest.tile]: (index.reserved[place.rest.tile] ?? 0) + 1 } };
  return { ...state, inventory: index };
}

/** Emergency fallback for a leave or a path with no unoccupied floor tile.
 * Reachability across split kitchens belongs to T-06.
 */
export function floorTile(state: TabaoState, point: Point): number {
  let best = -1;
  let distance = Infinity;
  let foundFree = false;
  for (let tile = 0; tile < state.level.tiles.length; tile += 1) {
    if (state.level.tiles[tile]?.kind !== 'floor') continue;
    const free = !state.inventory.floor[tile]?.length && !state.inventory.reserved[tile];
    if (foundFree && !free) continue;
    if (free && !foundFree) { foundFree = true; distance = Infinity; }
    const d = (tile % state.level.width + 0.5 - point.x) ** 2 +
      (Math.floor(tile / state.level.width) + 0.5 - point.y) ** 2;
    if (d < distance) { best = tile; distance = d; }
  }
  if (best < 0) throw new Error('Items need a floor tile');
  return best;
}

export function floorPickup(state: TabaoState, cook: Cook): Item | undefined {
  if (cook.targetTile !== null || heldItem(state, cook.id)) return undefined;
  const tile = Math.floor(cook.y) * state.level.width + Math.floor(cook.x);
  return state.inventory.floor[tile]?.[0];
}

function pickPut(state: TabaoState, cook: Cook): TabaoState {
  const held = heldItem(state, cook.id);
  const tile = cook.targetTile;
  if (tile !== null) {
    const target = state.level.tiles[tile];
    const onCounter = state.inventory.counters[tile];
    if (target?.kind === 'counter') {
      if (held && !onCounter && !state.inventory.reserved[tile]) return relocate(state, held, { kind: 'counter', tile });
      if (!held && onCounter) return relocate(state, onCounter, { kind: 'held', cook: cook.id });
    }
    if (!held && target?.kind === 'station' && target.ingredient !== undefined &&
      state.inventory.floorCount < FLOOR_LIMIT) {
      const item: Item = { id: state.nextItemId, kind: 'raw', processes: [], ingredient: target.ingredient,
        place: { kind: 'held', cook: cook.id } };
      return { ...state, nextItemId: state.nextItemId + 1, inventory: { ...state.inventory,
        held: { ...state.inventory.held, [cook.id]: item } } };
    }
    return state;
  }
  const floor = floorPickup(state, cook);
  return floor ? relocate(state, floor, { kind: 'held', cook: cook.id }) : state;
}

/** Grid traversal clips against walls, boundaries and non-counter station footprints.
 * Counters can be thrown across. Corner ties test both sides before entering the diagonal.
 */
function throwEnd(state: TabaoState, cook: Cook): Point {
  const dx = FACING_X[cook.facing];
  const dy = FACING_Y[cook.facing];
  let x = Math.floor(cook.x);
  let y = Math.floor(cook.y);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  let tx = dx === 0 ? Infinity : ((dx > 0 ? x + 1 : x) - cook.x) / dx;
  let ty = dy === 0 ? Infinity : ((dy > 0 ? y + 1 : y) - cook.y) / dy;
  const blocked = (column: number, row: number) => {
    const tile = tileAt(state.level, column, row);
    return tile === undefined || tile.kind === 'wall' || tile.kind === 'station';
  };
  let range = THROW_RANGE;
  while (Math.min(tx, ty) <= THROW_RANGE) {
    const distance = Math.min(tx, ty);
    const crossX = tx <= ty + 1e-12;
    const crossY = ty <= tx + 1e-12;
    if ((crossX && blocked(x + sx, y)) || (crossY && blocked(x, y + sy)) ||
      (crossX && crossY && blocked(x + sx, y + sy))) {
      range = Math.max(0, distance - 1e-9);
      break;
    }
    if (crossX) { x += sx; tx += 1 / Math.abs(dx); }
    if (crossY) { y += sy; ty += 1 / Math.abs(dy); }
  }
  return { x: cook.x + dx * range, y: cook.y + dy * range };
}

/** Sample the bounded four-tile segment backwards, recording each crossed tile once.
 * The selected point stays on that segment, so publication and resting agree.
 */
function resting(state: TabaoState, start: Point, end: Point): {
  end: Point; rest: { kind: 'counter' | 'floor'; tile: number };
} {
  const endpoint = Math.floor(end.y) * state.level.width + Math.floor(end.x);
  if (endpoint !== state.level.extinguisherTile && state.level.tiles[endpoint]?.kind === 'counter' && !state.inventory.counters[endpoint] && !state.inventory.reserved[endpoint]) {
    return { end, rest: { kind: 'counter', tile: endpoint } };
  }
  // Tile-boundary parameters give exact traversal even for very short corner intersections.
  const ts = [0, 1];
  for (const axis of ['x', 'y'] as const) {
    const delta = end[axis] - start[axis];
    if (delta === 0) continue;
    for (let v = Math.ceil(Math.min(start[axis], end[axis])); v <= Math.max(start[axis], end[axis]); v++) {
      const t = (v - start[axis]) / delta;
      if (t > 0 && t < 1) ts.push(t);
    }
  }
  ts.sort((a, b) => b - a);
  const candidates = [1, ...ts.slice(0, -1).map((t, i) => (t + (ts[i + 1] ?? 0)) / 2), 0];
  for (const t of candidates) {
    const point = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
    const tile = Math.floor(point.y) * state.level.width + Math.floor(point.x);
    if (state.level.tiles[tile]?.kind === 'floor' && !state.inventory.floor[tile]?.length && !state.inventory.reserved[tile]) {
      return { end: point, rest: { kind: 'floor', tile } };
    }
  }
  // If the whole path is occupied, conserve on the start floor pile.
  const own = Math.floor(start.y) * state.level.width + Math.floor(start.x);
  const tile = state.level.tiles[own]?.kind === 'floor' ? own : floorTile(state, start);
  return { end: start, rest: { kind: 'floor', tile } };
}

function throwItem(state: TabaoState, cook: Cook): TabaoState {
  const item = heldItem(state, cook.id);
  if (!item || (item.kind !== 'raw' && item.kind !== 'chopped') ||
    state.tick + THROW_STEPS > state.endTick) return state;
  const start = { x: cook.x, y: cook.y };
  const destination = resting(state, start, throwEnd(state, cook));
  return relocate(state, item, { kind: 'flight', start, ...destination,
    startStep: state.tick, duration: THROW_STEPS, thrower: cook.id });
}

export function itemPress(state: TabaoState, id: string, control: string): TabaoState {
  const cook = state.cooks.find((entry) => entry.id === id);
  if (!cook) return state;
  if (control === 'cross') {
    if (cook.targetTile !== null && (state.stations?.[cook.targetTile] || state.level.extinguisherTile === cook.targetTile)) return stationCross(state, cook);
    return pickPut(state, cook);
  }
  if (control === 'triangle') return throwItem(state, cook);
  return state;
}

export function interactItems(state: TabaoState, inputs: StepInputs): TabaoState {
  let next = state;
  for (const player of state.players) {
    const frame = inputs.frames.get(player.id);
    if (!frame) continue;
    if (wasPressed(frame, BUTTON.FACE_BOTTOM)) next = itemPress(next, player.id, 'cross');
    if (isHeld(frame, BUTTON.FACE_RIGHT) || wasPressed(frame, BUTTON.FACE_RIGHT)) next = stationAction(next, player.id);
    if (wasPressed(frame, BUTTON.FACE_TOP)) next = itemPress(next, player.id, 'triangle');
  }
  return next;
}

export function landItems(state: TabaoState): TabaoState {
  let next = state;
  for (const item of state.inventory.flights) {
    const flight = item.place;
    if (flight.kind !== 'flight') continue;
    const elapsed = state.tick - flight.startStep;
    // step() increments the tick before resolving. Always publish creation first.
    if (elapsed <= 1) continue;
    const before = Math.max(0, (elapsed - 1) / flight.duration);
    const after = Math.min(1, elapsed / flight.duration);
    const dx = flight.end.x - flight.start.x;
    const dy = flight.end.y - flight.start.y;
    let receiver: Cook | undefined;
    let first = Infinity;
    for (const cook of state.cooks) {
      if (cook.id === flight.thrower || heldItem(next, cook.id)) continue;
      const length2 = dx * dx + dy * dy;
      const t = length2 === 0 ? after : Math.max(before, Math.min(after,
        ((cook.x - flight.start.x) * dx + (cook.y - flight.start.y) * dy) / length2));
      if (Math.hypot(cook.x - flight.start.x - dx * t,
        cook.y - flight.start.y - dy * t) <= COOK_RADIUS && t < first) {
        receiver = cook; first = t;
      }
    }
    if (receiver) next = relocate(next, item, { kind: 'held', cook: receiver.id });
    else if (elapsed >= flight.duration) next = relocate(next, item, flight.rest);
  }
  return next;
}

export function dropLeaving(state: TabaoState, id: string): TabaoState {
  const cook = state.cooks.find((entry) => entry.id === id);
  const item = heldItem(state, id);
  if (!cook || !item) return state;
  const destination = resting(state, cook, cook).rest;
  return relocate(state, item, destination.kind === 'floor' &&
    (state.inventory.floor[destination.tile]?.length || state.inventory.reserved[destination.tile])
    ? { kind: 'floor', tile: floorTile(state, cook) } : destination);
}
