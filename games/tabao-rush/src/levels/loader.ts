import { initialLevelState } from '../rules/initial';
import type { PlayerInfo } from '@kaki/platform';
import type { Level, TabaoState, Tile } from '../rules/state';
import { prepareStations } from '../rules/stations';
import { ensureOrders } from '../rules/orders';
import type { LevelDefinition } from './format';
import { validateLevel } from './validator';

export function compileLevel(data: LevelDefinition): Level {
  const anchors = new Map(data.stations.map(a => [a.tile, a]));
  const extinguisher = data.stations.find(a => a.kind === 'extinguisher');
  return { id: data.id, name: data.name, venue: data.venue, twists: data.twists, kitchenIds: data.kitchens, width: data.width, height: data.height,
    allowedDishes: data.allowedDishes, roundSeconds: data.roundSeconds, soloThresholds: data.soloThresholds,
    firesEnabled: data.firesEnabled,
    ...(data.fireNeighbours ? { fireNeighbours: data.fireNeighbours } : {}),
    ...(extinguisher ? { extinguisherTile: extinguisher.tile } : {}),
    spawns: data.spawns.map(s => ({ x: s.tile % data.width + 0.5, y: Math.floor(s.tile / data.width) + 0.5,
      kitchen: s.kitchen, facing: s.facing })),
    tiles: data.collision.map((kind, tile): Tile => {
      const a = anchors.get(tile);
      if (!a) return { kind };
      if (a.kind === 'extinguisher') return { kind: 'counter' };
      return { kind: 'station', stationId: a.id, kitchen: a.kitchen, facing: a.facing,
        ...(a.kind === 'crate' ? { ingredient: a.ingredient ?? '' } : { stationType: a.kind }),
        ...(a.container ? { container: a.container } : {}), ...(a.stock === undefined ? {} : { stock: a.stock }) };
    }) };
}
/** Invalid data is refused before any simulation is built; no partial state escapes. */
export function loadLevel(data: unknown, seed: number, players: readonly PlayerInfo[]):
  { readonly problems: readonly string[]; readonly state?: TabaoState } {
  const problems = validateLevel(data);
  if (players.length < 1 || players.length > 8 || new Set(players.map(p => p.id)).size !== players.length) problems.push('Choose 1 to 8 cooks with distinct ids.');
  if (problems.length) return { problems };
  const definition = data as LevelDefinition;
  if (definition.kitchens.length === 2 && players.some(p => p.team !== undefined)) {
    const used = new Set<number>();
    for (const [i, player] of [...players].sort((a, b) => a.seat - b.seat).entries()) {
      const kitchen = player.team === undefined ? undefined : definition.kitchens[player.team];
      const index = kitchen === undefined ? i : definition.spawns.findIndex((s, at) => s.kitchen === kitchen && !used.has(at));
      if (index < 0 || used.has(index)) problems.push('Team assignment needs an unused spawn in its kitchen.');
      used.add(index);
    }
    if (problems.length) return { problems };
  }
  const level = compileLevel(definition);
  return { problems: [], state: ensureOrders(prepareStations(initialLevelState(level, seed, players))) };
}

