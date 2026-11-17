import { meta } from './meta';
import type { GameModule, JsonValue, SettingsSchema } from '@kaki/platform';
import { teamsInUse } from '@kaki/platform';
import { createRng, shuffled } from '@kaki/sim-core';
import { step } from './rules/flow';
import { CATEGORY_DATA, QUESTION_DATA, seat } from './rules/model';
import type { Question, Settings, State } from './rules/model';
import { scrambleSecrets, secrets } from './rules/secrets';
import { controllerLayout, privateView, publicView, results } from './rules/views';

export type { Question, Settings, State } from './rules/model';
export { CATEGORY_DATA, QUESTION_DATA, DEFAULT_SETTINGS } from './rules/model';

export const rabakz: GameModule<State, Settings, ReturnType<typeof publicView>> = {
  meta,
  settings(context): SettingsSchema<Settings> {
    const categories = context.data[CATEGORY_DATA];
    const values = Array.isArray(categories) ? categories.flatMap((value) =>
      value !== null && typeof value === 'object' && !Array.isArray(value) &&
      typeof value.id === 'string' && typeof value.title === 'string' ?
        [{ value: value.id, label: value.title }] : []) : [];
    return { fields: [
      { kind: 'choice', id: 'length', label: 'Questions', default: 10,
        options: ([10, 30, 50] as const).map((value) => ({ value, label: String(value) })) },
      ...(values.length >= 2 ? [{ kind: 'multi' as const, id: 'categories' as const, label: 'Categories', default: [],
        help: 'none chosen = Mixed', options: values }] : []),
      { kind: 'choice', id: 'difficulty', label: 'Difficulty', default: 'mixed',
        options: (['easy', 'mixed', 'hard'] as const).map((value) => ({ value, label: value.slice(0, 1).toUpperCase() + value.slice(1) })) },
    ] };
  },
  preload: (settings) => [{ key: settings === null ? CATEGORY_DATA : QUESTION_DATA,
    kind: 'data' }],
  init(seed, players, settings, context) {
    const source = context.data[QUESTION_DATA] as unknown as readonly Question[] | undefined;
    if (!source || source.length < settings.length) throw new Error('bank-too-small');
    if (source.length > settings.length) throw new Error('bank-too-large');
    if (new Set(source.map((q) => q.id)).size !== source.length) throw new Error('duplicate-question-id');
    settings = { ...settings, categories: settings.categories ?? [] };
    const rng = createRng(seed);
    const questions = source.map((q) => {
      if (q.options.length !== 4 || !Number.isInteger(q.correct) ||
          q.correct < 0 || q.correct > 3) throw new Error('Invalid question');
      const order = shuffled(rng, [0, 1, 2, 3]);
      return { ...q, options: order.map((index) => q.options[index]) as
        [string, string, string, string], correct: order.indexOf(q.correct) };
    });
    return { rng, questions, settings, nextSeat: players.length, retiredRevisions: {}, players: players.map((info, index) => seat(info, false, index)),
      teams: teamsInUse(players), teamScores: [0, 0], round: 0, phase: 'question',
      tick: 0, elapsed: 0, firstCorrect: null, wrong: [], winners: [] };
  },
  step,
  join(state, player) {
    if (state.players.some((item) => item.info.id === player.id)) return state;
    const added = { ...seat(player, state.tick !== 0, state.nextSeat),
      privateRevision: (state.retiredRevisions[player.id] ?? -1) + 1, eligible: state.tick === 0 || state.phase !== 'question' };
    return { ...state, nextSeat: state.nextSeat + 1, players: [...state.players, added] };
  },
  leave(state, id) {
    const departing = state.players.find((player) => player.info.id === id);
    if (!departing) return state;
    return { ...state, retiredRevisions: { ...state.retiredRevisions,
      [id]: departing.privateRevision },
      players: state.players.filter((player) => player.info.id !== id) };
  },
  publicView, privateView, controllerLayout, results, secrets, scrambleSecrets,
  isOver: (state) => state.phase === 'over',
  assets: (state) => state.questions.flatMap((q) => q.picture ?
    [{ key: q.picture.file, kind: 'image' as const }] : []),
};
// Useful for callers constructing the preload payload without importing a content package.
export function questionData(questions: readonly Question[]): JsonValue {
  return questions as unknown as JsonValue;
}

export { meta } from './meta';
