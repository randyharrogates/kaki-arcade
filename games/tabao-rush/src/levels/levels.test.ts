import { offered } from '../rules/recipe-journey.fixture';
import { withOrder } from '../rules/orders.fixture';
import { RECIPES } from '../rules/recipes';
import * as fs from 'node:fs';
import { expect, it } from 'vitest';
import { BUTTON, createTick, STEP_MS } from '@kaki/platform';
import { readSources, scanSources } from '@kaki/platform/kit';
import { LEVELS, FIRST_KITCHEN, FULL_KITCHEN } from './catalogue';
import { validateLevel, validateLevels } from './validator';
import { compileLevel, loadLevel } from './loader';
import { tabaoRush } from '../rules/game';
import { prepareStations } from '../rules/stations';
import { items } from '../rules/state';
import type { LevelDefinition } from './format';

const players = Array.from({ length: 8 }, (_, i) => ({ id: `p${String(i)}`, seat: i + 1, name: `Cook ${String(i)}`, colour: 'seat-1' as const }));
const copy = () => JSON.parse(JSON.stringify(FULL_KITCHEN)) as Record<string, unknown>;
const without = (kind: string) => ({ ...FULL_KITCHEN, stations: FULL_KITCHEN.stations.filter(a => a.kind !== kind) });
const cases: [string, () => unknown, string][] = [
  ['object', () => null, 'object'],
  ['name', () => ({ ...FIRST_KITCHEN, name: '' }), 'id and name'],
  ['dimensions', () => ({ ...FIRST_KITCHEN, width: -1 }), 'dimensions'],
  ['map', () => ({ ...FIRST_KITCHEN, collision: [] }), 'Collision map'],
  ['screen', () => ({ ...FIRST_KITCHEN, width: 30, collision: Array.from({ length: 180 }, () => 'floor') }), 'footprint'],
  ['kitchens', () => ({ ...FIRST_KITCHEN, kitchens: ['coop', 'coop'] }), 'kitchen ids'],
  ['dishes', () => ({ ...FIRST_KITCHEN, allowedDishes: ['unknown'] }), 'Allowed dishes'],
  ['anchor shape', () => ({ ...FIRST_KITCHEN, stations: [{}] }), 'Stations need'],
  ['spawn shape', () => ({ ...FIRST_KITCHEN, spawns: [] }), 'eight spawns'],
  ['twist shape', () => ({ ...FIRST_KITCHEN, twists: null }), 'Twists must'],
  ['round', () => ({ ...FIRST_KITCHEN, roundSeconds: NaN }), 'Round length'],
  ['threshold', () => ({ ...FIRST_KITCHEN, soloThresholds: [100, 100, 20] }), 'thresholds'],
  ['fire ordinal', () => ({ ...FULL_KITCHEN, ordinal: 4 }), 'level 5'],
  ['station id', () => ({ ...FULL_KITCHEN, stations: [...FULL_KITCHEN.stations, FULL_KITCHEN.stations[0]] }), 'ids must be unique'],
  ['station tile', () => ({ ...FULL_KITCHEN, stations: FULL_KITCHEN.stations.map(a => ({ ...a, tile: 1 })) }), 'distinct tiles'],
  ['blocked', () => ({ ...FULL_KITCHEN, collision: FULL_KITCHEN.collision.map((t, i) => i === 1 ? 'wall' : t) }), 'unblocked'],
  ['station kitchen', () => ({ ...FULL_KITCHEN, stations: FULL_KITCHEN.stations.map(a => ({ ...a, kitchen: 'absent' })) }), 'unknown kitchen'],
  ['crate ingredient', () => ({ ...FULL_KITCHEN, stations: FULL_KITCHEN.stations.map(a => a.kind === 'crate' ? { ...a, ingredient: 'ghost' } : a) }), 'known ingredient'],
  ['rack kind', () => ({ ...FULL_KITCHEN, stations: FULL_KITCHEN.stations.map(a => a.kind === 'dish-rack' ? { ...a, container: undefined } : a) }), 'container kind'],
  ['rack bound', () => ({ ...FULL_KITCHEN, stations: FULL_KITCHEN.stations.map(a => a.kind === 'dish-rack' ? { ...a, stock: 500 } : a) }), 'capacity'],
  ['non rack stock', () => ({ ...FULL_KITCHEN, stations: FULL_KITCHEN.stations.map(a => ({ ...a, stock: 1 })) }), 'cannot declare'],
  ['spawn duplicate', () => ({ ...FULL_KITCHEN, spawns: Array.from({ length: 8 }, () => FULL_KITCHEN.spawns[0]) }), 'spawns must be distinct'],
  ['spawn blocked', () => ({ ...FULL_KITCHEN, spawns: FULL_KITCHEN.spawns.map(s => ({ ...s, tile: 1 })) }), 'walkable'],
  ['disconnect', () => ({ ...FULL_KITCHEN, collision: FULL_KITCHEN.collision.map((t, i) => i % FULL_KITCHEN.width === 8 ? 'wall' : t) }), 'Every floor tile'],
  ['unreachable', () => ({ ...FULL_KITCHEN, collision: FULL_KITCHEN.collision.map((t, i) => i >= 15 && i < 30 ? 'wall' : t) }), 'reachable on foot'],
  ['needed station', () => without('rice'), 'needs a rice'],
  ['return', () => without('return-counter'), 'return counter'],
  ['sink', () => without('sink'), 'needs a sink'],
  ['rack required', () => without('dish-rack'), 'rack with its kind'],
  ['crate required', () => without('crate'), 'needs a crate'],
  ['plates', () => ({ ...FULL_KITCHEN, stations: FULL_KITCHEN.stations.map(a => a.container === 'plate' ? { ...a, stock: 1 } : a) }), '6 clean plates'],
  ['boards', () => ({ ...FULL_KITCHEN, roundSeconds: 60, stations: FULL_KITCHEN.stations.filter(a => a.kind !== 'chop' || a.id === FULL_KITCHEN.stations.find(s => s.kind === 'chop')?.id), soloThresholds: [100, 200, 600] }), 'chopping capacity'],
  ['safe fire edge', () => ({ ...FULL_KITCHEN, fireNeighbours: { 1: [FULL_KITCHEN.stations.find(a => a.kind === 'serving')?.tile] } }), 'Fire neighbours'],
  ['extinguisher', () => without('extinguisher'), 'reachable extinguisher'],
  ['crate station conflict', () => ({ ...FULL_KITCHEN, stations: FULL_KITCHEN.stations.map(a => a.kind === 'crate' ? { ...a, stationType: 'chop' } : a) }), 'crate cannot'],
  ['extinguisher distance', () => ({ ...FULL_KITCHEN, collision: Array.from({ length: 90 }, (_, t) => (Math.floor(t / 15) === 1 || Math.floor(t / 15) === 3) && t % 15 >= 1 && t % 15 <= 13 || t === 43 ? 'floor' : 'wall'), stations: [{ id: 'ext', tile: 1, facing: 2, kitchen: 'coop', kind: 'extinguisher' }, { id: 'far', tile: 61, facing: 6, kitchen: 'coop', kind: 'chop' }] }), 'within 15 walking'],
  ['twist reference', () => ({ ...FULL_KITCHEN, twists: [{ kind: 'shared-wok', station: 'absent' }] }), 'Twist'],
];
it.each(cases)('TR-050 TR-057 validator: %s', (_, make, message) => {
  expect(validateLevel(make()).join('\n')).toContain(message);
  expect(loadLevel(make(), 1, players).state).toBeUndefined();
});
it('TR-050 ids are unique across levels and malformed JSON never throws', () => {
  expect(validateLevels([FIRST_KITCHEN, FIRST_KITCHEN]).join()).toContain('must be unique');
  for (const value of [undefined, [], '', 1, {}, { ...copy(), fireNeighbours: null }, { ...copy(), twists: [null] }, { ...copy(), soloThresholds: [{ toString: 'invalid' }, 2, 3] }, { ...copy(), collision: Array.from({ length: 90 }, () => ({ toString: 'invalid' })) }, { ...copy(), twists: [{ kind: { toString: 'invalid' } }] }]) expect(() => validateLevel(value)).not.toThrow();
});
it.each(LEVELS)('TR-050 $id JSON round-trip, initial equipment and deterministic loader', level => {
  expect(validateLevel(level)).toEqual([]);
  const data = JSON.parse(JSON.stringify(level)) as LevelDefinition;
  const result = loadLevel(data, 73, players);
  expect(result.problems).toEqual([]);
  expect(result.state?.level).toEqual(compileLevel(level));
  expect(result.state?.level.twists).toEqual(level.twists);
  expect(result.state?.level.name).toBe(level.name);
  expect(result).toEqual(loadLevel(level, 73, players));
  expect(result.state?.cooks.every(c => c.kitchen === 'coop')).toBe(true);
  if (!result.state) throw new Error('Loader refused valid level');
  const ids = items(result.state).map(i => i.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(prepareStations(result.state)).toBe(result.state);
});
it('TR-006 two kitchens assign cooks before order scaling', () => {
  const positions = [...Array.from({ length: 13 }, (_, i) => i + 1), 76, 77, 78];
  const stations = ['coop', 'other'].flatMap((kitchen, k) =>
    (['crate', 'drinks', 'plating', 'serving', 'sink', 'bin', 'dish-rack', 'return-counter'] as const).map((kind, i) => ({
      id: `${kitchen}-${kind}`, kitchen, kind, tile: positions[k * 8 + i] ?? -1, facing: ((positions[k * 8 + i] ?? 0) >= 75 ? 6 as const : 2 as const),
      ...(kind === 'crate' ? { ingredient: 'kopi' } : {}),
      ...(kind === 'dish-rack' ? { container: 'cup' as const } : {}),
    })));
  const data: LevelDefinition = { ...FULL_KITCHEN, stations, kitchens: ['coop', 'other'],
    allowedDishes: ['kopi-teh'], soloThresholds: [10, 20, 30], firesEnabled: false,
    twists: [],
    spawns: FULL_KITCHEN.spawns.map((s, i) => ({ ...s, kitchen: i < 4 ? 'coop' : 'other' })) };
  const result = loadLevel(data, 1, players);
  expect(result.problems).toEqual([]);
  expect(result.state?.cooks.map(c => c.kitchen)).toEqual(['coop', 'coop', 'coop', 'coop', 'other', 'other', 'other', 'other']);
  const teamed = loadLevel(data, 1, [...players].reverse().map(p => ({ ...p, team: p.seat % 2 as 0 | 1 }))).state;
  expect(teamed?.players.map(p => p.seat)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(teamed?.cooks.map(c => c.kitchen)).toEqual(['other', 'coop', 'other', 'coop', 'other', 'coop', 'other', 'coop']);
  expect(result.state?.kitchens?.map(k => k.cooks)).toEqual([4, 4]);
  expect(result.state?.kitchens?.map(k => k.thresholds)).toEqual([[30, 60, 90], [30, 60, 90]]);
});
it.each(LEVELS.flatMap(level => [1, 8].map(count => ({ level, count }))))('TR-050 TR-057 $level.id short round at $count cooks: serve, return, expiry and reload', ({ level, count }) => {
  const start = performance.now();
  const loaded = loadLevel(level, 9, players.slice(0, count)).state;
  const recipe = RECIPES.find(r => r.id === 'kopi-teh');
  if (!loaded || !recipe) throw new Error('Missing fixture');
  const serving = Object.values(loaded.stations ?? {}).find(s => s.type === 'serving');
  const returns = Object.values(loaded.stations ?? {}).find(s => s.type === 'return-counter');
  if (!serving || !returns) throw new Error('Missing stations');
  const state = withOrder({ ...loaded, level: { ...loaded.level, roundSeconds: 50 }, endTick: 3000,
    cooks: loaded.cooks.map((c, i) => i ? c : { ...c, targetTile: serving.tile }),
    inventory: { ...loaded.inventory, held: { p0: offered(recipe) } } }, recipe.id);
  const mask = 1 << BUTTON.FACE_BOTTOM;
  let next = tabaoRush.step(state, createTick({ frames: new Map([['p0', { held: mask, pressed: mask, released: 0, axes: [0, 0, 0, 0], age: 0, seq: 0 }]]) }), STEP_MS);
  expect(next.serviceEvents?.some(e => e.type === 'served')).toBe(true);
  expect(next.kitchens?.[0]?.score).toBeGreaterThan(0);
  // Guarantee a 40-second order is open immediately after service.
  next = withOrder(next, recipe.id);
  let replay = JSON.parse(JSON.stringify(next)) as typeof next;
  const tick = createTick();
  for (let i = 1; i < 3000; i++) {
    next = tabaoRush.step(next, tick, STEP_MS);
    replay = tabaoRush.step(replay, tick, STEP_MS);
  }
  expect(next).toEqual(replay);
  expect(next.kitchens?.[0]?.expired).toBeGreaterThan(0);
  expect(next.stations?.[returns.tile]?.supply?.some(i => i.kind === 'dirty-plate')).toBe(true);
  expect(tabaoRush.isOver(next)).toBe(true);
  process.stdout.write(`T-06 ${level.id} ${String(count)} cooks 3000 steps/reload: ${(performance.now() - start).toFixed(1)}ms\n`);

});
it('TR-050 invalid legacy kitchen remains inspectable without returns', () => {
  const result = loadLevel(FIRST_KITCHEN, 1, players.slice(0, 1));
  if (!result.state) throw new Error('Missing state');
  const legacy = { ...result.state, stations: undefined, level: { ...result.state.level,
    tiles: result.state.level.tiles.map(t => t.kind === 'station' && t.stationType === 'return-counter' ? { kind: 'wall' as const } : t) } };
  // Unprepared legacy data is still inspectable after validation moved out of prepareStations.
  expect(() => tabaoRush.publicView(legacy as unknown as typeof result.state)).not.toThrow();
});
it('TR-050 validates all later twist reference shapes without implementing behaviour', () => {
  for (const twist of [
    { kind: 'split-kitchen', kitchens: ['coop'] }, { kind: 'moving-trolley', path: [31, 32] },
    ...['rain-slick', 'shared-pantry', 'trade-across', 'gold-order', 'sabo'].map(kind => ({ kind, tiles: [31, 32] })),
  ]) {
    expect(validateLevel({ ...FULL_KITCHEN, twists: [twist] }).join()).toContain('has no implemented behaviour');
    const invalid = { ...twist, kitchens: ['absent'], tiles: [-1], path: [-1] };
    expect(validateLevel({ ...FULL_KITCHEN, twists: [invalid] }).join()).toContain('Twist');
  }
});

it('TR-050 rules and levels stay pure across their shared source root', () => {
  expect(scanSources(readSources(fs, new URL('..', import.meta.url).pathname))).toEqual([]);
});

it('TR-050 missing legacy return retains the served container and awards no points', () => {
  const loaded = loadLevel(FIRST_KITCHEN, 1, players.slice(0, 1)).state;
  const recipe = RECIPES.find(r => r.id === 'chicken-rice');
  if (!loaded || !recipe) throw new Error('Missing fixture');
  const serving = Object.values(loaded.stations ?? {}).find(s => s.type === 'serving');
  if (!serving) throw new Error('Missing serving counter');
  const held = offered(recipe);
  const state = withOrder({ ...loaded, stations: Object.fromEntries(Object.entries(loaded.stations ?? {}).filter(([, s]) => s.type !== 'return-counter')),
    cooks: loaded.cooks.map(c => ({ ...c, targetTile: serving.tile })),
    inventory: { ...loaded.inventory, held: { p0: held } } }, recipe.id);
  const mask = 1 << BUTTON.FACE_BOTTOM;
  const next = tabaoRush.step(state, createTick({ frames: new Map([['p0', { held: mask, pressed: mask, released: 0, axes: [0, 0, 0, 0], age: 0, seq: 0 }]]) }), STEP_MS);
  expect(next.inventory.held.p0).toEqual(held);
  expect(next.kitchens?.[0]?.score).toBe(0);
  expect(next.returns ?? []).toEqual([]);
  expect(next.serviceEvents?.at(-1)).toMatchObject({ type: 'rejected', reason: { code: 'missing-return-counter' } });
});

it('TR-051 loader refuses zero, too many or duplicate cooks', () => {
  for (const crew of [[], [...players, players[0]].filter((p): p is typeof players[number] => p !== undefined), [players[0], players[0]].filter((p): p is typeof players[number] => p !== undefined)]) {
    const result = loadLevel(FIRST_KITCHEN, 1, crew);
    expect(result.state).toBeUndefined();
    expect(result.problems.join()).toContain('1 to 8 cooks');
  }
});
