import { createRng } from '@kaki/sim-core';
import { secondsToSteps } from '@kaki/platform';
import type { PlayerInfo } from '@kaki/platform';
import { inventory, participant } from './state';
import type { Level, TabaoState } from './state';
import { targetTile } from './target';

/** Shared initial wiring for authored levels and legacy logic-only fixtures. */
export function initialLevelState(level: Level, seed: number, players: readonly PlayerInfo[]): TabaoState {
  players = [...players].sort((a, b) => a.seat - b.seat);
  const used = new Set<number>();
  const cooks = players.map((p, i) => {
    const kitchen = level.kitchenIds?.length === 2 && p.team !== undefined ? level.kitchenIds[p.team] : undefined;
    const index = kitchen === undefined ? i : level.spawns.findIndex((s, at) => s.kitchen === kitchen && !used.has(at));
    used.add(index);
    const spawn = level.spawns[index];
    if (!spawn) throw new Error('Validated spawn missing');
    const facing = spawn.facing ?? 2;
    return { id: p.id, x: spawn.x, y: spawn.y, ...(spawn.kitchen ? { kitchen: spawn.kitchen } : {}), facing,
      vx: 0, vy: 0, targetTile: targetTile(level, spawn.x, spawn.y, facing) };
  });
  return { level, cooks,
    players: players.map(p => participant(p, 0)), inventory: inventory(), nextItemId: 0,
    rng: createRng(seed), tick: 0, endTick: secondsToSteps(level.roundSeconds ?? 210) };
}
