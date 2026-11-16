import { expect, it } from 'vitest';
import { FIRST_KITCHEN as F, FULL_KITCHEN as X, LEVELS } from './catalogue';
import { validateCatalogue, validateLevel } from './validator';
import { loadLevel } from './loader';
import type { Anchor, LevelDefinition } from './format';
const st = (level: LevelDefinition, f: (a: Anchor) => Anchor | null) => ({ ...level, stations: level.stations.map(f).filter((a): a is Anchor => a !== null) });
// Ported from the reviewer's attack/time/serve/map probes, with assertions.
const attacks: readonly [string, unknown, string][] = [
  ['serving faces wall', st(F, a => a.kind === 'serving' ? { ...a, facing: ((a.facing + 4) % 8) as Anchor['facing'] } : a), 'facing'],
  ['zero cups kopi only', { ...st(F, a => a.container === 'cup' ? { ...a, stock: 0 } : a), allowedDishes: ['kopi-teh'] }, 'cup rack'],
  ['zero cups both dishes', st(F, a => a.container === 'cup' ? { ...a, stock: 0 } : a), 'cup rack'],
  ['five plates', st(F, a => a.container === 'plate' ? { ...a, stock: a.id === F.stations.find(s => s.container === 'plate')?.id ? 2 : 1 } : a), '6 clean plates'],
  ['no bowls for laksa', st(X, a => a.container === 'bowl' ? null : a), 'bowl rack'],
  ['unused crate', { ...F, stations: [...F.stations, { id: 'pine', tile: 64, facing: 6, kitchen: 'coop', kind: 'crate', ingredient: 'pineapple' }] }, 'known ingredient'],
  ['drink crate', st(F, a => a.ingredient === 'kopi' ? { ...a, ingredient: 'drink' } : a), 'known ingredient'],
  ['ordinal billion', { ...F, ordinal: 1e9 }, 'ordinal'],
  ['ordinal fraction', { ...F, ordinal: 1.5 }, 'ordinal'],
  ['bad venue', { ...F, venue: 'restaurant' }, 'Venue'],
  ['missing venue', { ...F, venue: undefined }, 'Venue'],
  ['two extinguishers without fire', { ...F, stations: [...F.stations, { id: 'e', tile: 64, facing: 6, kitchen: 'coop', kind: 'extinguisher' }, { id: 'e2', tile: 11, facing: 0, kitchen: 'coop', kind: 'extinguisher' }] }, 'at most one'],
  ['rain on station', { ...F, twists: [{ kind: 'rain-slick', tiles: [1] }] }, 'valid station, kitchen or tile'],
  ['trolley crosses wall', { ...F, twists: [{ kind: 'moving-trolley', path: [0, 60] }] }, 'valid station, kitchen or tile'],
  ['trolley jumps', { ...F, twists: [{ kind: 'moving-trolley', path: [34, 38] }] }, 'valid station, kitchen or tile'],
  ['sabo in one kitchen', { ...F, twists: [{ kind: 'sabo', tiles: [37] }] }, 'valid station, kitchen or tile'],
  ['split needs two regions', { ...F, twists: [{ kind: 'split-kitchen', kitchens: ['coop'] }] }, 'valid station, kitchen or tile'],
];
it.each(attacks)('TR-050 D-093 reviewer regression: %s', (_, data, message) => {
  expect(validateLevel(data).join()).toContain(message);
  expect(loadLevel(data, 1, [{ id: 'p', seat: 1, name: 'Cook', colour: 'seat-1' }]).state).toBeUndefined();
});
it('TR-050 catalogue ids ignore case and ordinals are unique', () => {
  expect(validateCatalogue([F, { ...X, id: F.id.toUpperCase() }]).join()).toContain('id');
  expect(validateCatalogue([F, { ...X, ordinal: F.ordinal, firesEnabled: false }]).join()).toContain('ordinals must be unique');
  expect(validateCatalogue(LEVELS)).toEqual([]);
});
it('TR-050 D-093 seeds use default stars, venues and no unimplemented twists', () => {
  for (const level of LEVELS) {
    expect(level.soloThresholds).toEqual([200, 400, 600]);
    expect(level.twists).toEqual([]);
    expect(validateLevel(level)).toEqual([]);
  }
  expect(validateLevel(st(F, a => a.ingredient === 'kopi' ? { ...a, ingredient: 'teh' } : a))).toEqual([]);
});
it('TR-057 rejects 200x200 with 400 stations before traversal', () => {
  const data = { ...X, width: 200, height: 200, collision: Array.from({ length: 40000 }, () => 'floor'),
    stations: Array.from({ length: 400 }, (_, i) => ({ id: `chop-${String(i)}`, kind: 'chop', kitchen: 'coop', tile: i, facing: 2 })) };
  const start = performance.now();
  expect(validateLevel(data).join()).toContain('footprint');
  const ms = performance.now() - start;
  process.stdout.write(`T-06 validator 200x200 / 400 stations: ${ms.toFixed(3)}ms\n`);
  expect(ms).toBeLessThan(200);
  const validStart = performance.now();
  for (let i = 0; i < 100; i++) expect(validateLevel(X)).toEqual([]);
  process.stdout.write(`T-06 validator valid x100: ${(performance.now() - validStart).toFixed(3)}ms\n`);
});
it.each(LEVELS)('TR-050 $id ASCII map matches its footprint and eight spawns', level => {
  const symbols: Record<string, string> = { crate: 'C', chop: 'K', wok: 'W', pot: 'P', grill: 'G', rice: 'R', drinks: 'D', plating: 'L', sink: 'S', bin: 'B', serving: 'V', 'dish-rack': '#', 'return-counter': 'T', extinguisher: 'E' };
  const cells = level.collision.map((tile, i) => {
    const anchor = level.stations.find(a => a.tile === i);
    const spawn = level.spawns.findIndex(s => s.tile === i);
    return anchor ? symbols[anchor.kind] ?? '?' : spawn >= 0 ? String(spawn + 1) : tile === 'wall' ? 'X' : '.';
  });
  const rows = Array.from({ length: level.height }, (_, y) => cells.slice(y * level.width, (y + 1) * level.width).join(''));
  expect(rows.every(row => row.length === level.width)).toBe(true);
  expect(cells.filter(c => /^[1-8]$/.test(c))).toHaveLength(8);
  process.stdout.write(`T-06 map ${level.id}\n${rows.join('\n')}\n`);
});
