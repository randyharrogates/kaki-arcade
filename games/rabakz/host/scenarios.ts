// Dev/test fixtures: every state is made by init and actual rule steps.
import { STEP_MS } from '@kaki/platform';
import type { PlayerInfo, PlayerAction } from '@kaki/platform';
import { rabakz, DEFAULT_SETTINGS, QUESTION_DATA, questionData } from '../src/index';
import type { Question, State } from '../src/index';
import { COLOUR_TOKEN_NAMES } from '@kaki/ui';

export const SCENARIOS = ['podium-teams-split', 'jack-u', 'podium-teams-tie', 'podium-solo', 'podium-unicode', 'scoreboard-unicode', 'podium-tie-first', 'podium-tie-second', 'podium-partial-ties', 'scoreboard-teams-late', 'podium-teams-late', 'reveal-teams', 'scoreboard', 'scoreboard-next', 'scoreboard-teams', 'scoreboard-ties', 'podium', 'podium-teams', 'podium-ties', 'open', 'some-answered', 'wrong-marked', 'locked-out', 'reveal-one-winner',
  'reveal-tie', 'reveal-nobody', 'picture', 'longest-text', 'one-player', 'eight-players', 'picture-wrong', 'picture-reveal', 'longest-reveal', 'wide-names', 'three-winners', 'departed-winner', 'departed-during-reveal', 'next-question', 'non-picture-question', 'picture-question', 'perf-next-question'] as const;
export type Scenario = typeof SCENARIOS[number];
// Exactly the schema limits: 120 and 40, including spaces, no word over 30 / 15.
export const LONG_PROMPT = ('W'.repeat(29) + ' ').repeat(4).trimEnd() + '?';
export const LONG_OPTION = ('W'.repeat(9) + ' ').repeat(4).trimEnd() + 'W';

export function advance(state: State, actions: readonly PlayerAction[] = []): State {
  return rabakz.step(state, { frames: new Map(), actions,
    connected: new Map(state.players.map(p => [p.info.id, true])), disconnected: [],
    leader: state.players[0]?.info.id ?? null }, STEP_MS);
}
export function answer(state: State, index: number, option: number): PlayerAction {
  return { player: state.players[index]?.info.id ?? '', control: 'answer', value: String(option), revision: 0 };
}
export function scenario(name: Scenario, count = name === 'one-player' ? 1 : 8): State {
  if (name === 'podium-solo') count = 1;
  const names = ['Mei', 'Ravi', 'Aisyah', 'Daniel', 'Siti', 'Kai', 'Jia Wen', 'Amir'];
  const players: PlayerInfo[] = Array.from({ length: count }, (_, i) => ({
    id: `seat-${String(i + 1)}`, seat: i + 1, name: ['wide-names', 'longest-reveal', 'three-winners'].includes(name) ? (i % 2 ? '😀'.repeat(12) : '麗'.repeat(12)) : names[i] ?? 'Player', colour: COLOUR_TOKEN_NAMES[i] ?? 'seat-1', ...(name.includes('teams') ? { team: (name === 'podium-teams-split' ? i < count - 1 ? 0 : 1 : i % 2) as 0 | 1 } : {}),
  }));
  const questions: Question[] = Array.from({ length: name.startsWith('scoreboard') ? 30 : 10 }, (_, i) => ({
    id: `${name.startsWith('picture') ? 'picture' : name.startsWith('longest') ? 'longest' : 'screen'}-${String(i)}`, prompt: name === 'jack-u' ? "Which singer was featured in Jack Ü (Skrillex & Diplo)'s 2015 song 'Where Are Ü Now'?" : ['longest-text', 'longest-reveal'].includes(name) ? LONG_PROMPT : (i === 0 || name === 'perf-next-question') ? 'What is the capital of Japan?' : `Which fruit grows in a bunch? Question ${String(i + 1)}`,
    options: ['longest-text', 'longest-reveal'].includes(name) ? Array.from({ length: 4 }, (_, option) => LONG_OPTION.slice(0, -1) + String(option)) : (i === 0 || name === 'perf-next-question') ? ['Tokyo', 'Seoul', 'Bangkok', 'Hanoi'] : ['Bananas', 'Apples', 'Pears', 'Oranges'],
    correct: 0, category: 'technology', difficulty: 'easy', region: 'general',
    type: name.startsWith('picture') || ['longest-text', 'longest-reveal'].includes(name) ? 'picture' : 'multiple-choice',
  }));
  let state = rabakz.init(46, players, name.startsWith('scoreboard') ? { ...DEFAULT_SETTINGS, length: 30 } : DEFAULT_SETTINGS, { data: { [QUESTION_DATA]: questionData(questions) }, saved: null, teams: name.includes('teams') });
  if (name.startsWith('scoreboard') || name.startsWith('podium') || name === 'reveal-teams') {
    const target = name.startsWith('podium') || name === 'reveal-teams' || name === 'scoreboard-next' ? 9 : 4;
    while (state.round < target || state.phase !== 'reveal') {
      if (state.phase === 'question') {
        const winner = name.includes('ties') ? 0 : state.round % count;
        state = advance(state, name.includes('ties') ? state.players.map((_, i) => answer(state, i, state.questions[state.round]?.correct ?? 0)) : [answer(state, winner, state.questions[state.round]?.correct ?? 0)]);
        if (name === 'scoreboard-next' && state.phase === 'question') state = advance(state, [answer(state, count - 1, state.questions[state.round]?.correct ?? 0)]);
      }
      state = advance(state);
    }
    if (name === 'reveal-teams') return state;
    while (state.phase === 'reveal') state = advance(state);
    const scores = name === 'podium-teams-tie' ? [300,300,0,0,0,0,0,0] : name === 'podium-tie-first' ? [300,300,200,100,90,80,70,60] : name === 'podium-tie-second' ? [300,200,200,100,90,80,70,60] : name === 'podium-partial-ties' ? [300,300,200,100,100,50,40,30] : undefined;
    if (name === 'podium-teams-tie') state = { ...state, teamScores: [300, 300] };
    // Late fixture removes membership after scoring; remove that contribution too.
    if (name.endsWith('late')) {
      const late = state.players.at(-1);
      if (late?.info.team !== undefined) {
        const teamScores: [number, number] = [...state.teamScores];
        teamScores[late.info.team] -= late.score;
        // Historical scoreboard baselines describe the earlier membership.
        state = { ...state, teamScores };
      }
    }
    return { ...state, players: state.players.map((p, i) => ({ ...p, ...(scores ? { score: scores[i] ?? 0 } : {}), info: name.endsWith('late') && i === count - 1 ? { id: p.info.id, seat: p.info.seat, colour: p.info.colour, name: 'W'.repeat(12) } : { ...p.info, name: name.endsWith('unicode') ? ['陈美玲', '🦊Fox'][i % 2] ?? 'Mei' : 'W'.repeat(12) } })) };
  }
  const correct = state.questions[0]?.correct ?? 0;
  if (name === 'some-answered') return advance(state, [answer(state, 0, correct)]);
  if (name === 'wrong-marked' || name === 'locked-out' || name === 'picture-wrong') return advance(state, [answer(state, 0, (correct + 1) % 4)]);
  if (name === 'reveal-nobody') return advance(state, [{ player: players[0]?.id ?? '', control: 'skip', revision: 0 }]);
  if (name === 'reveal-one-winner' || name === 'reveal-tie' || ['picture-reveal', 'longest-reveal', 'three-winners', 'departed-winner', 'departed-during-reveal', 'next-question', 'perf-next-question'].includes(name)) {
    state = advance(state, [answer(state, 0, correct)]);
    if (name === 'reveal-tie') state = advance(state, [answer(state, 1, correct)]);
    if (name === 'three-winners' || name === 'longest-reveal') state = advance(state, [answer(state, 1, correct), answer(state, 2, correct)]);
    if (name === 'departed-winner') state = rabakz.leave(state, players[0]?.id ?? '');
    while (state.phase === 'question') state = advance(state);
  }
  if (name === 'departed-during-reveal') state = rabakz.leave(state, players[0]?.id ?? '');
  if (name === 'next-question' || name === 'perf-next-question') while (state.phase !== 'question') state = advance(state);
  return state;
}
