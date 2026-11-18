import { meta } from './meta';
import { STEPS_PER_SECOND, secondsToSteps } from '@kaki/platform';
import type { GameModule, StepInputs } from '@kaki/platform';
import { createRng } from '@kaki/sim-core';
import { deal, finishSwap, hide, reveal, SCOREBOARD_STEPS } from './round';
import { newPicker } from './state';
import type { Settings, State } from './state';
import {
  controllerLayout, privateView, publicView, results, secrets, scrambleSecrets,
} from './views';

function applyPicks(state: State, inputs: StepInputs): State {
  let players = state.players;
  let lockCount = state.lockCount;
  for (let actionIndex = 0; actionIndex < inputs.actions.length; actionIndex += 1) {
    const action = inputs.actions[actionIndex];
    if (action === undefined) continue;
    let repeated = false;
    for (let earlier = 0; earlier < actionIndex; earlier += 1) {
      const previous = inputs.actions[earlier];
      if (previous?.player === action.player && previous.control === action.control) {
        repeated = true;
        break;
      }
    }
    if (repeated) continue;
    const index = players.findIndex((p) => p.info.id === action.player);
    const p = players[index];
    if (p === undefined || p.waiting || p.locked) continue;
    let next = p;
    if (action.control === 'grid' && typeof action.value === 'number' &&
        Number.isInteger(action.value) && action.value >= 0 && action.value < 16) {
      const cell = action.value;
      if (p.picks.includes(cell)) {
        next = { ...p, picks: p.picks.filter((i) => i !== cell) };
      } else if (p.picks.length < 2) {
        next = { ...p, picks: [...p.picks, cell] };
      }
    } else if (action.control === 'lock' && action.value === 'go' && p.picks.length === 2) {
      next = { ...p, locked: true, lockOrder: lockCount, revision: p.revision + 1 };
      lockCount += 1;
    }
    if (next !== p) {
      if (players === state.players) players = [...players];
      players[index] = { ...next, viewRevision: p.viewRevision + 1 };
    }
  }
  return players === state.players ? state : { ...state, players, lockCount };
}

function advanceStep(state: State, inputs: StepInputs): State {
  if (state.phase === 'over' || state.paused) return state;
  let next = { ...state, left: state.left - 1, ticks: state.ticks + 1 };
  if (state.phase === 'pick') {
    next = applyPicks(next, inputs);
    let connected = 0;
    let unlocked = 0;
    for (const p of next.players) {
      if (p.waiting || inputs.disconnected.includes(p.info.id) ||
          inputs.connected.get(p.info.id) === false) continue;
      connected += 1;
      if (!p.locked) unlocked += 1;
    }
    if (next.left <= 0 || (connected > 0 && unlocked === 0)) return reveal(next);
    return next;
  }
  if (next.left > 0) return next;
  if (state.phase === 'memorise') return hide(next);
  if (state.phase === 'swap') return finishSwap(next);
  if (state.phase === 'reveal') return { ...next, phase: 'scoreboard', left: SCOREBOARD_STEPS };
  if (state.round >= state.settings.rounds) {
    const score = state.players[0]?.score ?? 0;
    const best = state.solo ? Math.max(state.best, score) : state.best;
    return { ...next, phase: 'over', left: 0, best };
  }
  return deal({ ...next, round: state.round + 1 });
}

// Countdown revisions advance only at displayed whole-second boundaries.
export function step(state: State, inputs: StepInputs): State {
  const next = advanceStep(state, inputs);
  if (next === state) return next;
  const phaseChanged = next.phase !== state.phase;
  const secondsChanged = next.phase === 'memorise' &&
    Math.ceil(next.left / STEPS_PER_SECOND) !== Math.ceil(state.left / STEPS_PER_SECOND);
  if (!phaseChanged && !secondsChanged) return next;
  return { ...next, players: next.players.map((p, i) => {
    const previous = state.players[i];
    return p.waiting ? p : { ...p,
      revision: p.revision + (phaseChanged ? 1 : 0),
      viewRevision: p.viewRevision + (p.viewRevision === previous?.viewRevision ? 1 : 0),
    };
  }) };
}

export const peekPoker: GameModule<State, Settings, ReturnType<typeof publicView>> = {
  meta,
  settings: { fields: [
    { kind: 'choice', id: 'rounds', label: 'Rounds', default: 5, options: [
      { value: 3, label: '3' }, { value: 5, label: '5' }, { value: 7, label: '7' },
    ] },
  ] },
  init(seed, players, settings, context) {
    const saved = context.saved;
    const best = saved !== null && typeof saved === 'object' && !Array.isArray(saved) &&
      typeof saved.best === 'number' && Number.isFinite(saved.best) ? Math.max(0, saved.best) : 0;
    return deal({
      rng: createRng(seed), settings: { ...settings }, phase: 'memorise', round: 1,
      left: secondsToSteps(20), ticks: 0, grid: [], shared: [], lockCount: 0,
      swaps: [], swapIndex: 0, paused: false, solo: players.length === 1, best,
      players: players.map((p) => newPicker(p, false, false)),
    });
  },
  step,
  join(state, player) {
    if (state.players.some((p) => p.info.id === player.id)) return state;
    return {
      ...state, solo: false,
      players: [...state.players, newPicker(player, state.ticks > 0, state.ticks > 0 && state.phase !== 'over')]
        .sort((a, b) => a.info.seat - b.info.seat),
    };
  },
  leave(state, id) {
    if (!state.players.some((p) => p.info.id === id)) return state;
    return { ...state, players: state.players.filter((p) => p.info.id !== id) };
  },
  pause: (state) => state.phase === 'memorise' ? { ...state, paused: true } : state,
  resume: (state) => state.paused ? { ...state, paused: false } : state,
  controllerLayout, privateView, publicView, results, secrets, scrambleSecrets,
  isOver: (state) => state.phase === 'over',
  assets: () => [],
  save: (state) => ({ best: state.solo && state.phase === 'over' ?
    Math.max(state.best, state.players[0]?.score ?? 0) : state.best }),
};
