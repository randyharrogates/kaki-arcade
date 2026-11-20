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

it('PP-033 PP-012 bests and new-best claims follow the match difficulty, across round counts', () => {
  const saved = { bests: { rising: 100, steady: 20 } };
  for (const rounds of [3, 5, 7] as const) {
    for (const difficulty of ['rising', 'steady'] as const) {
      const state = peekPoker.init(42, makePlayers(1, false), { rounds, difficulty }, { data: {}, saved, teams: false });
      state.phase = 'over';
      const player = state.players[0];
      if (!player) throw Error('fixture');
      player.score = 30;
      expect(savedView(peekPoker.publicView(state), state)).toMatchObject({
        difficulty, soloBest: saved.bests[difficulty], newBest: difficulty === 'steady',
      });
      expect(peekPoker.save?.(state)).toEqual({ bests: { rising: 100, steady: difficulty === 'steady' ? 30 : 20 } });
    }
  }
  expect(saved).toEqual({ bests: { rising: 100, steady: 20 } });
});

it('PP-033 legacy records migrate only to Rising; unreadable records yield empty bests', () => {
  for (const difficulty of ['rising', 'steady'] as const) {
    const state = peekPoker.init(42, makePlayers(1, false), { rounds: 3, difficulty }, { data: {}, saved: { best: 50 }, teams: false });
    expect(peekPoker.publicView(state).soloBest).toBe(difficulty === 'rising' ? 50 : 0);
    expect(peekPoker.save?.(state)).toEqual({ bests: { rising: 50, steady: 0 } });
    for (const saved of [null, {}, { best: 'bad' }, { bests: { rising: 50, steady: -1 } }]) {
      const empty = peekPoker.init(42, makePlayers(1, false), { rounds: 3, difficulty }, { data: {}, saved, teams: false });
      expect(empty.bestAtStart).toBe(0);
      expect(peekPoker.save?.(empty)).toEqual({ bests: { rising: 0, steady: 0 } });
      expect(savedView(peekPoker.publicView(empty), empty).newBest).toBe(false);
    }
  }
});
