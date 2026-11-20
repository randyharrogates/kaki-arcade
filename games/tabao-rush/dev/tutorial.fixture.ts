import type { PlayerInfo } from '@kaki/platform';
import { createTick, EMPTY_SETUP } from '@kaki/platform';
import type { SampledInput } from '@kaki/sim-core';
import { tabaoRush } from '../src/rules/game';
import type { TabaoState } from '../src/rules/state';

export const TUTORIAL_SKIP_FRAME = 600;

/** Exercise real first-room setup; ready all seeded cooks before renderer mounting. */
export function tutorialFixture(players: readonly PlayerInfo[]): TabaoState {
  const state = tabaoRush.init(707, players, {}, { ...EMPTY_SETUP, firstInRoom: true });
  return tabaoRush.step(state, createTick({ actions: players.map(p => ({
    player: p.id, control: 'ready', value: 'ready', revision: 0,
  })) }), 1 / 60);
}

/** Fixed leader skip keeps the tutorial-to-round hand-off inside the capture window. */
export function tutorialFixtureTick(state: TabaoState, frames: ReadonlyMap<string, SampledInput>) {
  const leader = state.players[0]?.id;
  return createTick({ frames, ...(leader ? { leader } : {}), actions:
    state.phase === 'tutorial' && state.tick >= TUTORIAL_SKIP_FRAME - 1 && leader
      ? [{ player: leader, control: 'header-action', value: 'skip-tutorial',
        revision: tabaoRush.controllerLayout(state, leader).revision }]
      : [],
  });
}
