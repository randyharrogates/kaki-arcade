import type { ControllerLayout, FaceButton, PrivateView, Results } from '@kaki/platform';
import { finalRound, question } from './model';
import type { State } from './model';

const FACES: readonly FaceButton[] = ['face-bottom', 'face-right', 'face-left', 'face-top'];
export function controllerLayout(state: State, id: string): ControllerLayout {
  const player = state.players.find((item) => item.info.id === id);
  const revision = state.round * 5 + (state.phase === 'final' ? 0 :
    state.phase === 'question' ? 1 : state.phase === 'reveal' ? 2 : state.phase === 'scoreboard' ? 3 : 4);
  if (!player) return { revision, controls: [] };
  if (state.phase === 'scoreboard') return { revision, controls: [{
    kind: 'options', id: 'continue', audience: 'leader',
    options: [{ id: 'next', label: 'Continue', face: 'face-bottom' }],
  }] };
  if (state.phase !== 'question') return { revision, controls: [] };
  return { revision, controls: [...(player.eligible ? [{
    kind: 'options' as const, id: 'answer',
    options: question(state).options.map((label, index) => ({
      id: String(index), label, face: FACES[index] ?? 'face-bottom',
      state: player.pick === null && !state.wrong.includes(index) ? 'plain' as const : 'disabled' as const,
    })),
  }] : []), {
    kind: 'options', id: 'skip', audience: 'leader',
    options: [{ id: 'skip', label: 'Skip' }],
  }] };
}
export function privateView(state: State, id: string): PrivateView | null {
  const player = state.players.find((item) => item.info.id === id);
  if (!player) return null;
  return { revision: player.privateRevision, blocks: [
    { kind: 'stat', label: 'Score', value: player.score },
    { kind: 'stat', label: 'Streak', value: player.streak },
    { kind: 'stat', label: 'Points gained', value: player.gained },
    { kind: 'text', text: !player.eligible ? 'Next question' :
      player.pick === null ? 'Watch the screen' : 'Locked in' },
  ] };
}
export function publicView(state: State) {
  const q = question(state);
  const baseline = state.phase === 'scoreboard' ? state.scoreboardTotals?.previous : state.scoreboardTotals?.current;
  return { phase: state.phase, round: state.round + 1, length: state.settings.length,
    winners: state.phase === 'reveal' ? state.winners.map((winner) => ({ ...winner.info })) : [],
    finalRound: finalRound(state), question: state.phase === 'final' ? null : {
      id: q.id, prompt: q.prompt, options: [...q.options], category: q.category,
      difficulty: q.difficulty, type: q.type, region: q.region,
      picture: q.picture ? { file: q.picture.file, alt: q.picture.alt, credit: q.picture.credit } : null,
    }, wrong: [...state.wrong],
    correct: state.phase === 'reveal' || state.phase === 'over' || state.phase === 'scoreboard' ? q.correct : null,
    players: state.players.map((player) => ({
      ...player.info, score: player.score, previousScore: baseline?.players.find(old => old.incarnation === player.incarnation)?.score ?? 0, streak: player.streak, gained: player.gained,
      lockedOut: state.phase === 'question' && player.pick !== null && state.wrong.includes(player.pick),
      waiting: !player.eligible, answered: state.phase === 'question' ? player.pick !== null && state.wrong.includes(player.pick) : player.pick !== null,
      pick: state.phase === 'question' ? null : player.answers.at(-1) ?? null,
      answers: state.phase === 'question' ? null : [...player.answers],
    })), previousTeamScores: baseline ? [...baseline.teams] : [0, 0], teamScores: [...state.teamScores] };
}
export function results(state: State): Results {
  const players = state.players.map((player) => ({
    id: player.info.id, score: player.score, joinedMidGame: player.joinedMidGame,
    place: 1 + state.players.filter((other) => other.score > player.score).length,
  })).sort((a, b) => a.place - b.place);
  if (!state.teams) return { mode: 'players', players };
  const teams = ([0, 1] as const).map((team) => ({ team, score: state.teamScores[team],
    place: (state.teamScores[1 - team] ?? 0) > state.teamScores[team] ? 2 : 1,
  })).sort((a, b) => a.place - b.place);
  return { mode: 'teams', players, teams };
}
