// Dev/test fixtures: every state is made by init and actual rule steps.
import { STEP_MS } from '@kaki/platform';
import type { PlayerInfo, PlayerAction } from '@kaki/platform';
import { rabakz, DEFAULT_SETTINGS, QUESTION_DATA, questionData } from '../src/index';
import type { Question, State } from '../src/index';
import { COLOUR_TOKEN_NAMES } from '@kaki/ui';

export const SCENARIOS = ['open', 'some-answered', 'wrong-marked', 'locked-out', 'reveal-one-winner',
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
  const names = ['Mei', 'Ravi', 'Aisyah', 'Daniel', 'Siti', 'Kai', 'Jia Wen', 'Amir'];
  const players: PlayerInfo[] = Array.from({ length: count }, (_, i) => ({
    id: `seat-${String(i + 1)}`, seat: i + 1, name: ['wide-names', 'longest-reveal', 'three-winners'].includes(name) ? (i % 2 ? '😀'.repeat(12) : '麗'.repeat(12)) : names[i] ?? 'Player', colour: COLOUR_TOKEN_NAMES[i] ?? 'seat-1',
  }));
  const questions: Question[] = Array.from({ length: 10 }, (_, i) => ({
    id: `${name.startsWith('picture') ? 'picture' : name.startsWith('longest') ? 'longest' : 'screen'}-${String(i)}`, prompt: ['longest-text', 'longest-reveal'].includes(name) ? LONG_PROMPT : (i === 0 || name === 'perf-next-question') ? 'What is the capital of Japan?' : `Which fruit grows in a bunch? Question ${String(i + 1)}`,
    options: ['longest-text', 'longest-reveal'].includes(name) ? Array.from({ length: 4 }, (_, option) => LONG_OPTION.slice(0, -1) + String(option)) : (i === 0 || name === 'perf-next-question') ? ['Tokyo', 'Seoul', 'Bangkok', 'Hanoi'] : ['Bananas', 'Apples', 'Pears', 'Oranges'],
    correct: 0, category: 'General knowledge', difficulty: 'easy', region: 'general',
    type: name.startsWith('picture') || ['longest-text', 'longest-reveal'].includes(name) ? 'picture' : 'multiple-choice',
  }));
  let state = rabakz.init(46, players, DEFAULT_SETTINGS, { data: { [QUESTION_DATA]: questionData(questions) }, saved: null, teams: false });
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
