import { RECIPES } from '../rules/recipes';
import type { LevelDefinition } from './format';

/** DESIGN §4.3/4.6: safe area, fixed scale and orthographic projection.
 * Provisional 144 px HUD and 120 px vertical prop allowance. */
export const SCREEN_FIT = { width: 1920, height: 1080, margin: 55, tile: 120,
  depthScale: 0.866, hud: 144, props: 120 } as const;
export const MAX_EXTINGUISHER_WALK = 15;
const kinds = ['crate', 'extinguisher', 'chop', 'wok', 'pot', 'grill', 'rice', 'drinks', 'plating', 'sink', 'bin', 'serving', 'dish-rack', 'return-counter'];
const safe = new Set(['serving', 'dish-rack', 'return-counter']);
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');
const facing = (v: unknown) => Number.isInteger(v) && Number(v) >= 0 && Number(v) < 8;
/** Accepts unknown JSON. Malformed structure is reported before traversal. */
export function validateLevel(input: unknown): string[] {
  if (!record(input)) return ['Level must be an object.'];
  const problems: string[] = [];
  if (typeof input.id !== 'string' || !input.id.trim() || typeof input.name !== 'string' || !input.name.trim()) problems.push('Level needs a non-empty id and name.');
  if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || Number(input.width) < 1 || Number(input.height) < 1 || !Number.isSafeInteger(Number(input.width) * Number(input.height))) return [...problems, 'Grid dimensions and tile count must be positive safe integers.'];
  if (Number(input.width) > 15 || Number(input.height) > 6) return [...problems, 'Kitchen footprint exceeds the fixed screen safe area including HUD and props.'];
  if (typeof input.venue !== 'string' || !['kopitiam', 'hawker centre', 'pasar malam', 'zi char'].includes(input.venue)) problems.push('Venue must be kopitiam, hawker centre, pasar malam or zi char.');
  if (!Array.isArray(input.collision) || input.collision.length !== Number(input.width) * Number(input.height) || !input.collision.every(t => typeof t === 'string' && ['floor', 'wall', 'counter'].includes(t))) return [...problems, 'Collision map must contain one floor, wall or counter per tile.'];
  if (!strings(input.kitchens) || !input.kitchens.length || input.kitchens.length > 2 || input.kitchens.some(k => !k.trim()) || new Set(input.kitchens).size !== input.kitchens.length) return [...problems, 'Use one or two distinct kitchen ids.'];
  if (!strings(input.allowedDishes) || !input.allowedDishes.length || new Set(input.allowedDishes).size !== input.allowedDishes.length || input.allowedDishes.some(id => !RECIPES.some(r => r.id === id))) return [...problems, 'Allowed dishes must be distinct known recipe ids.'];
  if (!Array.isArray(input.stations) || !input.stations.every(a => record(a) && typeof a.id === 'string' && a.id.trim() && typeof a.kind === 'string' && kinds.includes(a.kind) && Number.isInteger(a.tile) && facing(a.facing) && typeof a.kitchen === 'string')) return [...problems, 'Stations need an id, known kind, integer tile, facing 0 to 7 and kitchen.'];
  if (!Array.isArray(input.spawns) || input.spawns.length !== 8 || !input.spawns.every(s => record(s) && Number.isInteger(s.tile) && facing(s.facing) && typeof s.kitchen === 'string')) return [...problems, 'Provide eight spawns with integer tile, kitchen and facing 0 to 7.'];
  if (!Array.isArray(input.twists) || !input.twists.every(t => record(t) && typeof t.kind === 'string')) return [...problems, 'Twists must be an array of typed data hooks.'];
  for (const a of input.stations) if (record(a) && a.kind === 'crate' && a.stationType !== undefined) problems.push('A crate cannot also have a station type.');
  const d = input as unknown as LevelDefinition;
  const inside = (t: number) => Number.isInteger(t) && t >= 0 && t < d.collision.length;
  const adjacent = (t: number) => [t - d.width, t + d.width, ...(t % d.width ? [t - 1] : []), ...(t % d.width < d.width - 1 ? [t + 1] : [])].filter(inside);
  if (d.width * SCREEN_FIT.tile > SCREEN_FIT.width - 2 * SCREEN_FIT.margin || d.height * SCREEN_FIT.tile * SCREEN_FIT.depthScale + SCREEN_FIT.props + SCREEN_FIT.hud > SCREEN_FIT.height - 2 * SCREEN_FIT.margin) problems.push('Kitchen footprint exceeds the fixed screen safe area including HUD and props.');
  if (!Number.isFinite(d.roundSeconds) || d.roundSeconds < 60 || d.roundSeconds > 600) problems.push('Round length must be 60 to 600 seconds.');
  if (!Array.isArray(d.soloThresholds) || (input.soloThresholds as unknown[]).length !== 3 || !d.soloThresholds.every((n, i, a) => Number.isSafeInteger(n) && n > (a[i - 1] ?? 0))) problems.push('Solo thresholds must be three increasing positive integers.');
  if (!Number.isInteger(d.ordinal) || d.ordinal < 1 || d.ordinal > 99 || typeof d.firesEnabled !== 'boolean' || d.firesEnabled && d.ordinal < 5) problems.push('Level ordinal must be positive and fires may start only at level 5.');
  const occupied = new Set(d.stations.map(a => a.tile));
  if (new Set(d.stations.map(a => a.id)).size !== d.stations.length) problems.push('Station ids must be unique.');
  if (occupied.size !== d.stations.length) problems.push('Stations must use distinct tiles.');
  for (const a of d.stations) {
    if (!inside(a.tile) || d.collision[a.tile] !== 'floor') problems.push(`Station ${a.id} must be on an unblocked floor tile.`);
    if (!d.kitchens.includes(a.kitchen)) problems.push(`Station ${a.id} names an unknown kitchen.`);
    if (a.kind === 'crate' ? !a.ingredient || a.ingredient === 'drink' || !RECIPES.some(r => d.allowedDishes.includes(r.id) && r.ingredients.some(p => p.ingredient === a.ingredient || p.ingredient === 'drink' && ['kopi', 'teh'].includes(a.ingredient ?? ''))) : a.ingredient !== undefined) problems.push(`Station ${a.id} must have an ingredient only when it is a known ingredient crate.`);
    if (a.kind === 'dish-rack' && (!['plate', 'bowl', 'cup'].includes(a.container ?? '') || a.stock !== undefined && (!Number.isInteger(a.stock) || a.stock < 0 || a.stock > (a.container === 'plate' ? 4 : 2)))) problems.push(`Rack ${a.id} needs a container kind and stock from zero to its capacity (4 plates or 2 bowls/cups).`);
    if (a.kind !== 'dish-rack' && (a.stock !== undefined || a.container !== undefined)) problems.push(`Station ${a.id} cannot declare rack stock or container kind.`);
  }
  const walkable = (t: number) => inside(t) && d.collision[t] === 'floor' && !occupied.has(t);
  if (new Set(d.spawns.map(s => s.tile)).size !== 8) problems.push('Eight cook spawns must be distinct.');
  const distances = d.spawns.map(s => {
    if (!walkable(s.tile) || !d.kitchens.includes(s.kitchen)) problems.push(`Spawn at ${String(s.tile)} needs a walkable tile and known kitchen.`);
    const dist = new Map<number, number>();
    if (walkable(s.tile)) dist.set(s.tile, 0);
    const queue = [...dist.keys()];
    for (const current of queue) for (const t of adjacent(current)) if (walkable(t) && !dist.has(t)) { dist.set(t, (dist.get(current) ?? 0) + 1); queue.push(t); }
    return dist;
  });
  const distance = (tile: number, dist: Map<number, number>) => Math.min(...adjacent(tile).map(t => dist.get(t) ?? Infinity));
  // A single connected floor also makes nearest-floor leave/drop fallbacks safe (T-02).
  if (distances.some(dist => d.collision.some((_, t) => walkable(t) && !dist.has(t)))) problems.push('Every floor tile must connect to every spawn so floor fallbacks cannot cross a split kitchen.');
  const directions = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  for (const a of d.stations) {
    const [dx, dy] = directions[a.facing] ?? [0, 0];
    const x = a.tile % d.width + (dx ?? 0), y = Math.floor(a.tile / d.width) + (dy ?? 0);
    const access = y * d.width + x;
    if (x < 0 || x >= d.width || y < 0 || y >= d.height || !walkable(access) || !distances[0]?.has(access)) problems.push(`Station ${a.id} facing must point at reachable floor.`);
  }
  for (const a of d.stations) if (distances.some(dist => !Number.isFinite(distance(a.tile, dist)))) problems.push(`Station ${a.id} must be reachable on foot from every spawn.`);
  const recipes = RECIPES.filter(r => d.allowedDishes.includes(r.id));
  for (const kitchen of d.kitchens) {
    const anchors = d.stations.filter(a => a.kitchen === kitchen);
    const needs = new Set(['serving', 'sink', 'bin', 'plating', ...recipes.flatMap(r => r.ingredients.flatMap(p => p.steps.map(s => s === 'spread' || s === 'mix' ? 'plating' : s)))]);
    for (const kind of needs) if (!anchors.some(a => a.kind === kind)) problems.push(`Kitchen ${kitchen} needs a ${kind} station.`);
    if (anchors.filter(a => a.kind === 'return-counter').length !== 1) problems.push(`Kitchen ${kitchen} needs exactly one reachable return counter.`);
    const containers = new Set(recipes.flatMap(r => r.id === 'kaya-toast' ? [r.container, 'cup'] : [r.container]));
    for (const container of containers) if (!anchors.some(a => a.kind === 'dish-rack' && a.container === container && (a.stock ?? (container === 'plate' ? 4 : 2)) > 0)) problems.push(`Kitchen ${kitchen} needs a ${container} rack with its kind set.`);
    for (const ingredient of new Set(recipes.flatMap(r => r.ingredients.map(p => p.ingredient)))) if (!anchors.some(a => a.kind === 'crate' && (a.ingredient === ingredient || ingredient === 'drink' && ['kopi', 'teh'].includes(a.ingredient ?? '')))) problems.push(`Kitchen ${kitchen} needs a crate for ${ingredient}.`);
    const plates = anchors.filter(a => a.kind === 'dish-rack' && a.container === 'plate').reduce((n, a) => n + (a.stock ?? 4), 0);
    if (containers.has('plate') && plates < 6) problems.push(`Kitchen ${kitchen} needs at least 6 clean plates.`);
    // D-093 e: worst recipe, at the fastest eight-cook arrival cadence.
    const chops = Math.max(...recipes.map(r => r.ingredients.filter(p => p.steps.includes('chop')).length));
    const orders = 1 + Math.floor(d.roundSeconds / (24 / 8 ** 0.8));
    if (anchors.filter(a => a.kind === 'chop').length * d.roundSeconds / 3 < orders * chops) problems.push(`Kitchen ${kitchen} needs chopping capacity for ${String(orders * chops)} portions at three seconds each.`);
  }
  if (d.fireNeighbours !== undefined) {
    if (!record(d.fireNeighbours) || !Object.entries(d.fireNeighbours).every(([tile, ns]) => Array.isArray(ns) && ns.every(n => Number.isInteger(n)) && d.stations.some(a => a.tile === Number(tile) && !safe.has(a.kind)) && ns.every(n => d.stations.some(a => a.tile === n && !safe.has(a.kind)) && n !== Number(tile)))) problems.push('Fire neighbours must link distinct burnable stations; serving counters, racks and return counters cannot be fire neighbours.');
  }
  if (!d.firesEnabled && d.stations.filter(a => a.kind === 'extinguisher').length > 1) problems.push('A no-fire level permits at most one extinguisher.');
  if (d.firesEnabled) {
    const extinguishers = d.stations.filter(a => a.kind === 'extinguisher');
    if (extinguishers.length !== 1) problems.push('Fires need exactly one reachable extinguisher.');
    const e = extinguishers[0];
    const dist = new Map<number, number>(e ? adjacent(e.tile).filter(walkable).map(t => [t, 0]) : []);
    const queue = [...dist.keys()];
    for (const current of queue) for (const t of adjacent(current)) if (walkable(t) && !dist.has(t)) { dist.set(t, (dist.get(current) ?? 0) + 1); queue.push(t); }
    for (const a of d.stations.filter(a => !safe.has(a.kind) && a.kind !== 'crate' && a.kind !== 'extinguisher')) {
      if (e && distance(a.tile, dist) > MAX_EXTINGUISHER_WALK) problems.push(`Extinguisher must be within 15 walking tiles of ${a.id}.`);
    }
  }
  for (const t of d.twists) {
    const valid = t.kind === 'shared-wok' ? d.stations.some(a => a.id === t.station && a.kind === 'wok')
      : t.kind === 'split-kitchen' ? strings(t.kitchens) && d.kitchens.length === 2 && new Set(t.kitchens).size === 2 && t.kitchens.every(k => d.kitchens.includes(k))
      : ['moving-trolley', 'rain-slick', 'shared-pantry', 'trade-across', 'gold-order', 'sabo'].includes(t.kind) && Array.isArray(t.kind === 'moving-trolley' ? t.path : 'tiles' in t ? t.tiles : undefined) && (() => { const tiles = t.kind === 'moving-trolley' ? t.path : 'tiles' in t ? t.tiles : []; return tiles.length > 0 && tiles.every(inside) && (t.kind !== 'rain-slick' && t.kind !== 'moving-trolley' || tiles.every(walkable)) && (t.kind !== 'moving-trolley' || tiles.every((tile, i) => i === 0 || adjacent(tiles[i - 1] ?? -1).includes(tile))) && (!['sabo', 'shared-pantry', 'trade-across', 'gold-order'].includes(t.kind) || d.kitchens.length === 2); })();
    problems.push(`Twist ${t.kind} has no implemented behaviour.`);
    if (!valid) problems.push(`Twist ${t.kind} needs valid station, kitchen or tile references.`);
  }
  return problems;
}
export function validateCatalogue(levels: readonly unknown[]): string[] {
  const ids = new Set<string>();
  const ordinals = new Set<number>();
  return levels.flatMap((d, i) => {
    const problems = validateLevel(d).map(p => `Level ${String(i + 1)}: ${p}`);
    if (record(d) && typeof d.id === 'string') { if (ids.has(d.id.toLowerCase())) problems.push(`Level id ${d.id} must be unique.`); ids.add(d.id.toLowerCase()); }
    if (record(d) && typeof d.ordinal === 'number') { if (ordinals.has(d.ordinal)) problems.push('Level ordinals must be unique.'); ordinals.add(d.ordinal); }
    return problems;
  });
}

export const validateLevels = validateCatalogue;
