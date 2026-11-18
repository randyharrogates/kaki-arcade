import { expect, it } from 'vitest';
import { makePlayers } from '@kaki/platform/kit';
import { peekPoker, savedView } from '../index';

it.each([
  ['tie', 10, 1, true, true, 'over', false],
  ['lower', 9, 1, true, true, 'over', false],
  ['multiplayer', 12, 2, true, false, 'over', false],
  ['joined then left', 12, 1, true, false, 'over', false],
  ['unreadable', 12, 1, false, true, 'over', false],
  ['unfinished', 12, 1, true, true, 'scoreboard', false],
  ['improvement', 12, 1, true, true, 'over', true],
] as const)('PP-012 DATA-002 savedView: %s', (_, score, count, recordable, solo, phase, claimed) => {
  const state = peekPoker.init(42, makePlayers(count, false), { rounds: 3 }, { data: {}, saved: { best: 10 }, teams: false });
  state.phase = phase; state.recordable = recordable; state.solo = solo;
  state.players.forEach(p => { p.score = score; });
  const view = peekPoker.publicView(state);
  const before = structuredClone(state);
  expect(view.newBest).toBe(false);
  expect(savedView(view, state).newBest).toBe(claimed);
  if (!claimed) expect(savedView(view, state)).toBe(view);
  expect(state).toEqual(before);
});
