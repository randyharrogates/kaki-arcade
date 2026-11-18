import type { JsonValue } from '@kaki/platform';
import type { State } from '../src';
import { expect, it } from 'vitest';
import { rabakz, savedView, QUESTION_DATA, questionData } from '../src';
import type { Question } from '../src';
import { appendRecent, emptyRecord, validRecord, RECENT_LIMIT } from '../src/records';
const bank: Question[] = Array.from({ length: 10 }, (_, i) => ({ id: `q${String(i)}`, prompt: 'Question', options: ['a', 'b', 'c', 'd'], correct: 0, category: 'general', difficulty: 'easy', region: 'general', type: 'multiple-choice' }));
const player = { id: 'one', name: 'Guest', seat: 1, colour: 'seat-1' } as const;
function init(saved: unknown = emptyRecord()) {
  return rabakz.init(7, [player], { length: 10, difficulty: 'mixed' }, { data: { [QUESTION_DATA]: questionData(bank) }, saved: saved as JsonValue, teams: false });
}
it('RZ-015 caps history and moves repeats to the newest end', () => {
  expect(appendRecent(['a', 'b'], ['a'])).toEqual(['b', 'a']);
  expect(appendRecent([], Array.from({ length: 300 }, (_, i) => String(i)))).toHaveLength(RECENT_LIMIT);
  expect(validRecord({ recent: ['x'.repeat(65)], bests: {} })).toBe(false);
});
it('RZ-015 quit records only shown rounds and never saves a best', () => {
  const state = init({ recent: ['old'], bests: { '10': 100 } });
  const seat = state.players[0];
  if (!seat) throw new Error('Missing seat');
  const quit = { ...state, round: 2, players: [{ ...seat, score: 500 }] };
  expect(save({ ...quit, phase: 'final' })).toMatchObject({ recent: ['old', 'q0', 'q1'] });
  expect(save(quit)).toEqual({ recent: ['old', 'q0', 'q1', 'q2'], bests: { '10': 100 } });
});
it('RZ-013 no Best 0; only completed eligible solo improvements change a best', () => {
  const state = init();
  expect(rabakz.publicView(state).soloBest).toBeUndefined();
  const seat = state.players[0];
  if (!seat) throw new Error('Missing seat');
  const end = { ...state, phase: 'over' as const, round: 9, players: [{ ...seat, score: 100 }] };
  expect(save(end)).toMatchObject({ bests: { '10': 100 } });
  const view = rabakz.publicView(end);
  expect(savedView(view, end)).toMatchObject({ soloBest: 100, newBest: true });
  expect(view.newBest).toBe(false);
  expect(savedView(view, { ...end, soloBest: 100 })).toBe(view);
  expect(savedView(view, { ...end, soloEligible: false })).toBe(view);
  const previous = init({ recent: [], bests: { '10': 100, '50': 4000 } });
  expect(save({ ...end, savedRecord: previous.savedRecord, soloBest: 100 })).toMatchObject({ bests: { '10': 100, '50': 4000 } });
  const joined = rabakz.join(end, { ...player, id: 'two' });
  expect(joined.soloEligible).toBe(false);
  expect(save(joined)).toMatchObject({ bests: {} });
});
it('DATA-002 unreadable records suppress all best claims', () => {
  const state = init(null);
  expect(state.soloEligible).toBe(false);
  expect(rabakz.publicView(state).soloBest).toBeUndefined();
  expect(rabakz.publicView({ ...state, phase: 'over' }).newBest).toBe(false);
});

function save(state: State) {
  if (!rabakz.save) throw new Error('Missing save');
  return rabakz.save(state);
}
