import type { Level, Tile } from '../state';
// '#' wall, '.' floor, 'c' counter, 's' station (inert), 'A'/'B' crates.
export function build(id: string, rows: string[], spawns: { x: number; y: number }[]): Level {
  const width = (rows[0] ?? '').length;
  return { id, width, height: rows.length, spawns, tiles: rows.flatMap((row, y) => Array.from(row, (m, x): Tile => {
    if (m === '#') return { kind: 'wall' };
    if (m === 'c') return { kind: 'counter' };
    if (m === 's') return { kind: 'station', stationId: `s${String(y * width + x)}` };
    if (m === 'A') return { kind: 'station', stationId: `a${String(y * width + x)}`, ingredient: 'chicken' };
    if (m === 'B') return { kind: 'station', stationId: `b${String(y * width + x)}`, ingredient: 'cucumber' };
    return { kind: 'floor' };
  })) };
}
const sp = (pts: [number, number][]) => pts.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
export const MAPS: Level[] = [
  build('open', [
    '############',
    '#..A..c..B.#',
    '#..........#',
    '#....cc....#',
    '#..........#',
    '#.s..c..s..#',
    '############',
  ], sp([[1,2],[3,2],[5,2],[7,2],[9,2],[2,4],[4,4],[8,4]])),
  build('pass-counter', [
    '###########',
    '#A...c...B#',
    '#....c....#',
    '#....c....#',
    '#....c....#',
    '###########',
  ], sp([[1,2],[2,3],[3,2],[4,4],[6,2],[7,3],[8,2],[9,4]])),
  build('corridor', [
    '##############',
    '#A..#####...B#',
    '#............#',
    '#..c#####.s..#',
    '##############',
  ], sp([[1,2],[2,2],[3,2],[5,2],[8,2],[10,2],[11,2],[12,2]])),
  build('pillars', [
    '###########',
    '#.A.#.#.B.#',
    '#.#.....#.#',
    '#...c#c...#',
    '#.#.....#.#',
    '#..s.#.s..#',
    '###########',
  ], sp([[1,1],[3,1],[5,1],[7,1],[9,1],[1,3],[3,2],[7,2]])),
];
