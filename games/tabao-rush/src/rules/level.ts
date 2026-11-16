import { COOK_RADIUS } from './state';
import type { Level, Tile } from './state';

const FLOOR: Tile = { kind: 'floor' };
const WALL: Tile = { kind: 'wall' };
const COUNTER: Tile = { kind: 'counter' };

/** Hand-written movement fixture, not a launch level or a level loader. */
export const TEST_LEVEL: Level = {
  id: 'movement-stall',
  width: 10,
  height: 7,
  tiles: [
    '##########',
    '#..ss.c..#',
    '#........#',
    '#..##....#',
    '#........#',
    '#........#',
    '##########',
  ].flatMap((row, y) => Array.from(row, (mark, x): Tile => {
    if (mark === '#') return WALL;
    if (mark === 's') return { kind: 'station', stationId: `anchor-${String(y * 10 + x)}`,
      ...(x === 3 ? { ingredient: 'cucumber' } : {}) };
    if (mark === 'c') return COUNTER;
    return FLOOR;
  })),
  spawns: [
    { x: 1.5, y: 2.5 },
    { x: 2.5, y: 2.5 },
    { x: 3.5, y: 2.5 },
    { x: 4.5, y: 2.5 },
    { x: 5.5, y: 2.5 },
    { x: 6.5, y: 2.5 },
    { x: 7.5, y: 2.5 },
    { x: 8.5, y: 2.5 },
  ],
};

export function tileAt(level: Level, x: number, y: number): Tile | undefined {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return undefined;
  return level.tiles[y * level.width + x];
}

/** Conservative square wall footprint, circular cook/cook footprint. */
export function clearOfWalls(level: Level, x: number, y: number): boolean {
  const r = COOK_RADIUS - 1e-10;
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty += 1) {
    for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx += 1) {
      if (tileAt(level, tx, ty)?.kind !== 'floor') return false;
    }
  }
  return true;
}
