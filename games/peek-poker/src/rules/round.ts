import { must } from './invariant';
import { secondsToSteps } from '@kaki/platform';
import { cloneRng, nextInt } from '@kaki/sim-core';
import { dealCards } from './cards';
import { compareHands, evaluate, HAND_POINTS } from './evaluator';
import type { State, Swap } from './state';

export const MEMORISE_SECONDS = [20, 16, 12, 10, 8, 7, 6] as const;
export const SWAP_SECONDS = 2;
export const SWAP_STEPS = secondsToSteps(SWAP_SECONDS);
export const REVEAL_STEPS = secondsToSteps(8);
export const SCOREBOARD_STEPS = secondsToSteps(5);
export function difficulty(round: number, rounds: number, mode: State['settings']['difficulty'] = 'rising'): number {
  if (mode === 'steady') return 0;
  return rounds === 3 ? (round - 1) * 2 : round - 1;
}

export function deal(state: State): State {
  const rng = cloneRng(state.rng);
  const cards = dealCards(rng);
  return {
    ...state, ...cards, rng, phase: 'memorise',
    left: secondsToSteps(must(MEMORISE_SECONDS[difficulty(state.round, state.settings.rounds, state.settings.difficulty)])),
    lockCount: 0, swaps: [], swapIndex: 0,
    players: state.players.map((p) => ({
      ...p, picks: [], locked: false, lockOrder: null, waiting: false,
      hand: null, gained: 0, filled: false, viewRevision: p.viewRevision + 1,
    })),
  };
}

export function hide(state: State): State {
  const row = difficulty(state.round, state.settings.rounds, state.settings.difficulty);
  if (row < 2) return startPicking(state);
  const rng = cloneRng(state.rng);
  const swaps: Swap[] = [];
  const count = row === 2 || row === 3 ? 1 : row === 4 ? 2 : 3;
  for (let i = 0; i < count; i += 1) {
    const max = row === 3 ? 3 : 15;
    const from = nextInt(rng, 0, max);
    const offset = nextInt(rng, 1, max);
    swaps.push({ kind: row === 3 ? 'rows' : 'cards', from, to: (from + offset) % (max + 1) });
  }
  return { ...state, rng, phase: 'swap', swaps, swapIndex: 0, left: SWAP_STEPS };
}

export function finishSwap(state: State): State {
  const swap = must(state.swaps[state.swapIndex]);
  const grid = [...state.grid];
  const width = swap.kind === 'rows' ? 4 : 1;
  for (let i = 0; i < width; i += 1) {
    const a = swap.from * width + i;
    const b = swap.to * width + i;
    [grid[a], grid[b]] = [must(grid[b]), must(grid[a])];
  }
  const next = { ...state, grid, swapIndex: state.swapIndex + 1, left: SWAP_STEPS };
  return next.swapIndex === next.swaps.length ? startPicking(next) : next;
}

export function startPicking(state: State): State {
  return {
    ...state, phase: 'pick', left: secondsToSteps(20),
    players: state.players.map((p) => p.waiting ? p : {
      ...p, revision: p.revision + 1, viewRevision: p.viewRevision + 1,
    }),
  };
}

export function reveal(state: State): State {
  const rng = cloneRng(state.rng);
  let players = state.players.map((p) => {
    if (p.waiting) return p;
    const picks = [...p.picks];
    const filled = picks.length < 2;
    while (picks.length < 2) {
      const available = Array.from({ length: 16 }, (_, i) => i).filter((i) => !picks.includes(i));
      picks.push(must(available[nextInt(rng, 0, available.length - 1)]));
    }
    const cards = [...picks.map((i) => must(state.grid[i])), ...state.shared];
    return { ...p, picks, filled, hand: evaluate(cards) };
  });
  const playing = players.filter((p) => !p.waiting);
  const best = playing.reduce((top, p) => Math.max(top, must(p.hand).strength), -1);
  const tied = playing.filter((p) => must(p.hand).strength === best);
  const fastest = tied.filter((p) => p.locked && p.lockOrder !== null)
    .sort((a, b) => must(a.lockOrder) - must(b.lockOrder))[0];
  players = players.map((p) => {
    if (p.waiting) return p;
    const bonus = must(p.hand).strength === best ? (p === fastest ? 3 : 1) : 0;
    const gained = must(HAND_POINTS[must(p.hand).category]) + bonus;
    return {
      ...p, gained, score: p.score + gained, viewRevision: p.viewRevision + 1,
      revision: p.revision + (p.locked ? 0 : 1),
    };
  });
  return { ...state, rng, players, phase: 'reveal', left: REVEAL_STEPS };
}

export function rankedHands(state: State) {
  return state.players.filter((p) => p.hand !== null).sort((a, b) =>
    compareHands(must(b.hand), must(a.hand)) || b.gained - a.gained ||
    (a.lockOrder ?? Number.MAX_SAFE_INTEGER) - (b.lockOrder ?? Number.MAX_SAFE_INTEGER) ||
    Number(a.filled) - Number(b.filled) ||
    a.info.seat - b.info.seat);
}
