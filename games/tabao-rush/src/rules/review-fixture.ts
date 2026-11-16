import { BUTTON, createTick, EMPTY_SETUP, STEP_MS } from '@kaki/platform';
import { tabaoRush } from './game';
import { prepareStations } from './stations';
import type { Item, Level, StationType, TabaoState, Tile, Cook } from './state';

export const cross = 1 << BUTTON.FACE_BOTTOM, circle = 1 << BUTTON.FACE_RIGHT, triangle = 1 << BUTTON.FACE_TOP;
export const W = 30, H = 9;
export const ING = ['rice', 'chicken', 'cucumber', 'kway-teow', 'satay', 'laksa-broth', 'noodles', 'pineapple', 'turnip', 'bread', 'kopi', 'teh'];
const topStations: StationType[] = ['chop', 'wok', 'pot', 'grill', 'rice', 'drinks', 'plating', 'plating', 'serving', 'sink', 'bin', 'dish-rack'];
const bottom: (StationType | 'counter' | null)[] = [null, 'chop', 'plating', 'counter', 'counter', 'wok', 'grill', 'pot', 'rice', 'plating', 'counter', 'counter', 'chop', 'drinks', 'sink', 'serving', 'counter', 'bin'];
export const EXT = 1 * W + 27;
export const tiles: Tile[] = Array.from({ length: W * H }, (_, i) => {
  if (i === 0) return { kind: 'station', stationId: 'returns', stationType: 'return-counter' };
  if (i === 7 * W + 20 || i === 7 * W + 21) return { kind: 'station', stationId: `rack-${String(i)}`, stationType: 'dish-rack', container: i % W === 20 ? 'bowl' : 'cup' };
  const x = i % W, y = Math.floor(i / W);
  if (x === 0 || x === W - 1 || y === 0 || y === H - 1) return { kind: 'wall' };
  if (y === 1) {
    if (x >= 1 && x <= 12) return { kind: 'station', stationId: `crate-${ING[x - 1] ?? ''}`, ingredient: ING[x - 1] ?? '' };
    const t = topStations[x - 14];
    if (t) return { kind: 'station', stationId: `${t}-${String(i)}`, stationType: t, ...(t === 'dish-rack' ? { container: 'plate' } : {}) };
    return { kind: 'counter' };
  }
  if (y === 7) {
    const t = bottom[x];
    if (t === 'counter') return { kind: 'counter' };
    if (t) return { kind: 'station', stationId: `${t}-${String(i)}`, stationType: t, ...(t === 'dish-rack' ? { container: 'plate' } : {}) };
  }
  return { kind: 'floor' };
});
export function makeLevel(fires = true): Level {
  return { id: 'rev', width: W, height: H, tiles, firesEnabled: fires, ...(fires ? { extinguisherTile: EXT } : {}),
    spawns: Array.from({ length: 8 }, (_, i) => ({ x: 2.5 + i * 3, y: 4.5 })) };
}
export const crateTile = (ing: string) => 1 * W + 1 + ING.indexOf(ing);
export const stationTiles = (type: StationType) => tiles.flatMap((t, i) => t.kind === 'station' && t.stationType === type ? [i] : []);
export const counterTiles = tiles.flatMap((t, i) => t.kind === 'counter' ? [i] : []);
export function players(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${String(i)}`, seat: i + 1, name: `C${String(i)}`, colour: 'seat-1' as const }));
}
export function setup(n: number, seed = 5, fires = true): TabaoState {
  const level = makeLevel(fires);
  const base = tabaoRush.init(seed, [], {}, EMPTY_SETUP);
  let s: TabaoState = { ...base, level };
  for (const p of players(n)) s = tabaoRush.join(s, p);
  return prepareStations(s);
}
export function aimAt(c: Cook, tile: number | null, floorX = 5.5): Cook {
  if (tile === null) return { ...c, targetTile: null, x: floorX, y: 4.5, facing: 2 };
  const x = tile % W, y = Math.floor(tile / W);
  return y === 1 ? { ...c, targetTile: tile, x: x + 0.5, y: 2.5, facing: 6 } : { ...c, targetTile: tile, x: x + 0.5, y: 6.5, facing: 2 };
}
export function frame(held: number, pressed: number, seq = 0) {
  return { held, pressed, released: 0, axes: [0, 0, 0, 0], age: 0, seq };
}
export function tick(frames: Map<string, ReturnType<typeof frame>>) { return createTick({ frames }); }
export function stepWith(state: TabaoState, frames: Map<string, ReturnType<typeof frame>>) {
  return tabaoRush.step(state, tick(frames), STEP_MS);
}
export const isContainer = (i: { kind: string; container?: string }) => i.container !== undefined || i.kind === 'plate' || i.kind === 'dirty-plate' || i.kind === 'dish';
export type Root = Item;

export function required<T>(value: T | undefined | null): T { if (value === undefined || value === null) throw new Error('Missing fixture value'); return value; }
