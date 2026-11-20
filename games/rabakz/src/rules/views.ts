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
    options: [{ id: 'next', label: 'Continue' }],
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
    // Keep the tie window private: the host ignores skip once a correct press arrives.
    options: [{ id: 'skip', label: 'Skip' }],
  }] };
}
function playerView(state: State, id: string): PrivateView | null {
  const player = state.players.find((item) => item.info.id === id);
  if (!player) return null;
  const revealed = state.phase === 'reveal';
  const lastPick = player.answers.at(-1);
  const lockedOut = state.phase === 'question' && player.pick !== null &&
    state.wrong.includes(player.pick);
  const revision = player.privateRevision * 1000 + state.round * 10 +
    ['question', 'final', 'reveal', 'scoreboard', 'over'].indexOf(state.phase);
  const text = (text: string, tone: 'title' | 'body' | 'note' = 'note') =>
    ({ kind: 'text' as const, text, tone });
  if (state.phase === 'scoreboard' || state.phase === 'over') {
    const team = player.info.team;
    const teamPlace = state.teams && (team === 0 || team === 1);
    const score = teamPlace ? state.teamScores[team] : player.score;
    const scores = teamPlace ? state.teamScores : state.players.map(other => other.score);
    const place = 1 + scores.filter(other => other > score).length;
    const tied = scores.filter(other => other === score).length > 1;
    const suffix = place % 100 >= 11 && place % 100 <= 13 ? 'th' :
      ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[place % 10] ?? 'th';
    const placing = `${tied ? '=' : ''}${String(place)}${suffix}`;
    return { revision: revision * 100 + place * 2 + Number(tied), blocks: [
      ...(!state.teams || teamPlace ? [{ kind: 'stat' as const, label: 'Place', value: placing }] : []),
      ...(state.teams ? [text(teamPlace ? `${team === 0 ? 'Red' : 'Blue'} team` : 'No team', 'body')] : []),
      { kind: 'stat', label: 'Score', value: player.score },
    ] };
  }
  if (revealed) return { revision, blocks: [
    text(lastPick === undefined ? (player.skipped ? 'Skipped' : 'No answer') : lastPick === question(state).correct ? 'Right' : 'Wrong', 'title'),
    { kind: 'stat', label: 'Points gained', value: `+${String(player.gained)}` },
    text(`Streak ${String(player.streak)}`, 'body'),
    text(`Score ${String(player.score)}`, 'body'),
    ...(lastPick === undefined ? [] : [text(question(state).options[lastPick] ?? '')]),
  ] };
  if (state.phase === 'final') return { revision, blocks: [text('Final round · Double points', 'title')] };
  if (!player.eligible) return { revision, blocks: [text('You join at the next question', 'title')] };
  if (player.pick === null) return { revision, blocks: [
    text(`Score ${String(player.score)}`),
  ] };
  return { revision, blocks: [
    text(lockedOut ? 'Locked out' : 'Locked in', 'title'),
    ...(lockedOut ? [text('Wrong answer. Wait until everyone has taken a turn.')] : []),
    text(`${lockedOut ? 'Your answer: ' : ''}${question(state).options[player.pick] ?? ''}`),
    ...(!lockedOut ? [text('Watch the TV for the reveal')] : []),
  ] };
}
export function privateView(state: State, id: string): PrivateView | null {
  const view = playerView(state, id);
  const player = state.players.find(item => item.info.id === id);
  // The scoreboard and Results already name the team on their own line.
  if (!view || !state.teams || !player?.joinedMidGame || state.phase === 'scoreboard' || state.phase === 'over' ||
    (player.info.team !== 0 && player.info.team !== 1)) return view;
  return { ...view, blocks: [...view.blocks, { kind: 'text', tone: 'note',
    text: `You're on ${player.info.team === 0 ? 'Red' : 'Blue'} team` }] };
}
export function publicView(state: State) {
  const q = question(state);
  const baseline = state.phase === 'scoreboard' ? state.scoreboardTotals?.previous : state.scoreboardTotals?.current;
  return { ...(state.soloBest !== undefined ? { soloBest: state.soloBest } : {}), newBest: false, wrongPresses: state.wrongPresses, phase: state.phase, round: state.round + 1, length: state.settings.length,
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
