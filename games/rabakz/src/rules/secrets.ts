import type { Secret } from '@kaki/platform';
import type { State } from './model';

function hidden(state: State, index: number): boolean {
  return index > state.round || (index === state.round &&
    (state.phase === 'question' || state.phase === 'final') && state.wrong.length < 3);
}
export function secrets(state: State): readonly Secret[] {
  return state.questions.flatMap((q, index): Secret[] => {
    if (!hidden(state, index)) return [];
    if (index > state.round || state.phase === 'final') return [
      { owner: null, label: `future-${String(index)}-prompt`, value: q.prompt },
      { owner: null, label: `future-${String(index)}-correct`, value: q.correct,
        match: (value, path) => value === q.correct && path.includes('questions[') && path.endsWith('correct') },
    ];
    return [{ owner: null, label: 'correct', value: q.correct,
      match: (value, path) => value !== null && path.endsWith('correct') }];
  });
}
export function scrambleSecrets(state: State, _viewer: string | null, salt: number): State {
  return { ...state, questions: state.questions.map((q, index) => {
    if (!hidden(state, index)) return q;
    const possible = [0, 1, 2, 3].filter((value) => value !== q.correct &&
      (index !== state.round || !state.wrong.includes(value)));
    const correct = possible[salt % possible.length] ?? (q.correct + 1) % 4;
    return { ...q, correct, ...(index > state.round || state.phase === 'final' ? {
      prompt: `Hidden prompt ${String(salt)} ${String(index)}`,
      options: q.options.map((_, option) => `Hidden option ${String(salt)} ${String(index)} ${String(option)}`),
    } : {}) };
  }) };
}
