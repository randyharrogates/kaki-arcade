import type { StepInputs } from '@kaki/platform';
import { secondsToSteps } from '@kaki/platform';
import { finalRound, question } from './model';
import type { State } from './model';

export const TIE_STEPS = secondsToSteps(0.25);
export const REVEAL_STEPS = secondsToSteps(4);
export const SCOREBOARD_STEPS = secondsToSteps(20);
export const IDLE_STEPS = secondsToSteps(30);

function reveal(state: State): State {
  const won = state.winners.length > 0;
  const teamGains: [number, number] = [0, 0];
  for (const winner of state.winners) {
    if (winner.info.team === undefined) continue;
    const gained = (100 + (winner.streak >= 2 ? 50 : 0)) *
      (finalRound(state) ? 2 : 1);
    teamGains[winner.info.team] = Math.max(teamGains[winner.info.team], gained);
  }
  const players = state.players.map((player) => {
    const winner = state.winners.some((item) => item.incarnation === player.incarnation);
    const streak = winner ? player.streak + 1 : won ? 0 : player.streak;
    const gained = winner ? (100 + (streak >= 3 ? 50 : 0)) *
      (finalRound(state) ? 2 : 1) : 0;
    return { ...player, streak, gained, score: player.score + gained,
      privateRevision: player.privateRevision + 1 };
  });
  return { ...state, phase: 'reveal', elapsed: 0, players,
    teamScores: [state.teamScores[0] + teamGains[0],
      state.teamScores[1] + teamGains[1]] };
}
function advance(state: State): State {
  if (state.round + 1 === state.settings.length) return { ...state, phase: 'over' };
  const round = state.round + 1;
  return { ...state, round,
    phase: round === state.settings.length * 0.9 ? 'final' : 'question', elapsed: 0,
    firstCorrect: null, wrong: [], wrongPresses: {}, winners: [], players: state.players.map((player) => ({
      ...player, eligible: true, pick: null, gained: 0, answers: [], skipped: false,
      privateRevision: player.privateRevision + 1,
    })) };
}
function answer(state: State, id: string, pick: number, disabled: readonly number[]): State {
  const index = state.players.findIndex((player) => player.info.id === id);
  const player = state.players[index];
  if (!player?.eligible || player.pick !== null || disabled.includes(pick)) return state;
  const correct = pick === question(state).correct;
  const players = state.players.slice();
  players[index] = { ...player, pick, streak: correct ? player.streak : 0,
    answers: [...player.answers, pick], privateRevision: player.privateRevision + 1 };
  return { ...state, players,
    wrongPresses: correct ? state.wrongPresses : { ...state.wrongPresses, [player.info.seat]: (state.wrongPresses[player.info.seat] ?? 0) + 1 },
    winners: correct ? [...state.winners, player] : state.winners,
    firstCorrect: correct ? state.firstCorrect ?? state.tick : state.firstCorrect,
    wrong: correct || state.wrong.includes(pick) ? state.wrong : [...state.wrong, pick] };
}
export function step(state: State, inputs: StepInputs): State {
  if (state.phase === 'over') return state;
  if (state.phase !== 'question') {
    const elapsed = state.elapsed + 1;
    if (state.phase === 'scoreboard') {
      const continued = inputs.actions.some((action) =>
        action.player === inputs.leader && action.control === 'continue');
      return continued || elapsed >= SCOREBOARD_STEPS ? advance(state) : { ...state, elapsed };
    }
    if (elapsed < REVEAL_STEPS) return { ...state, elapsed };
    if (state.phase === 'final') return { ...state, phase: 'question', elapsed: 0 };
    if (state.round + 1 === state.settings.length) return { ...state, phase: 'over', elapsed: 0 };
    if ((state.round + 1) % 5 === 0) return { ...state, phase: 'scoreboard', elapsed: 0,
      scoreboardTotals: {
        ...(state.scoreboardTotals ? { previous: state.scoreboardTotals.current } : {}),
        current: { players: state.players.map(player => ({ incarnation: player.incarnation, score: player.score })),
          teams: [...state.teamScores] },
      } };
    return advance(state);
  }
  let current: State = { ...state, tick: state.tick + 1, elapsed: state.elapsed + 1 };
  // Close before handling skip: the winners of a completed window must survive it.
  if (current.firstCorrect !== null &&
      current.tick - current.firstCorrect > TIE_STEPS) return reveal(current);
  for (const action of inputs.actions) {
    if (inputs.connected.get(action.player) === false) continue;
    // A skip has no effect once someone has answered correctly: the tie window runs out.
    if (action.control === 'skip' && action.player === inputs.leader) {
      if (current.firstCorrect === null) return reveal({ ...current,
        players: current.players.map(player => player.info.id === action.player ?
          { ...player, skipped: true } : player),
      });
      continue;
    }
    if (action.control === 'answer') {
      const pick = typeof action.value === 'string' ? Number(action.value) : -1;
      if (Number.isInteger(pick) && pick >= 0 && pick < 4) {
        // All taps in this step saw the options enabled at its start.
        const before = current;
        current = answer(current, action.player, pick, state.wrong);
        // A solo wrong answer ends the question before any later tap can skip it.
        if (current !== before && current.firstCorrect === null &&
            current.players.filter(player => player.eligible).length === 1 &&
            current.players.some(player => player.eligible && player.pick !== null &&
              inputs.connected.get(player.info.id) !== false &&
              !inputs.disconnected.includes(player.info.id))) return reveal(current);
      }
    }
  }
  if (current.firstCorrect !== null) return current;
  let active = 0;
  let answered = 0;

  for (const player of current.players) {
    if (!player.eligible) continue;
    if (inputs.connected.get(player.info.id) === false ||
        inputs.disconnected.includes(player.info.id)) continue;
    active += 1;
    if (player.pick !== null) answered += 1;
  }
  if (current.elapsed >= IDLE_STEPS ||
      (current.players.filter((player) => player.eligible).length === 1 && answered === 1)) return reveal(current);
  if (active > 0 && active === answered) {
    return { ...current, players: current.players.map((player) =>
      player.pick === null ? player : { ...player, pick: null,
        privateRevision: player.privateRevision + 1 }) };
  }
  return current;
}
