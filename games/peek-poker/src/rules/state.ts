import type { PlayerInfo } from '@kaki/platform';
import type { RngState } from '@kaki/sim-core';
import type { Card } from './cards';
import type { Hand } from './evaluator';

export interface Settings {
  rounds: 3 | 5 | 7;
}
export interface Picker {
  info: PlayerInfo;
  score: number;
  picks: number[];
  locked: boolean;
  lockOrder: number | null;
  filled: boolean;
  waiting: boolean;
  joinedMidGame: boolean;
  revision: number;
  viewRevision: number;
  hand: Hand | null;
  gained: number;
}
export interface Swap {
  kind: 'cards' | 'rows';
  from: number;
  to: number;
}
export interface State {
  rng: RngState;
  settings: Settings;
  phase: 'memorise' | 'swap' | 'pick' | 'reveal' | 'scoreboard' | 'over';
  round: number;
  left: number;
  ticks: number;
  grid: Card[];
  shared: Card[];
  players: Picker[];
  lockCount: number;
  // Host-only plan: future swaps must never reach any view.
  swaps: Swap[];
  swapIndex: number;
  paused: boolean;
  solo: boolean;
  best: number;
  bestAtStart: number;
  recordable: boolean;
}
export function newPicker(info: PlayerInfo, mid: boolean, waiting: boolean): Picker {
  return {
    info: { ...info }, score: 0, picks: [], locked: false, lockOrder: null,
    filled: false, waiting, joinedMidGame: mid, revision: 0, viewRevision: 0,
    hand: null, gained: 0,
  };
}
