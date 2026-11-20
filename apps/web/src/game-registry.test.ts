import { makePlayers } from '@kaki/platform/kit';
import { peekPoker } from '../../../games/peek-poker/src';
import { expect, it } from 'vitest';
import { sessionRegistrations } from './game-registry';
import { ConsoleScreen, publicViewKey } from '../../../games/peek-poker/host';
it('PP-030 PP-031 registers the public-only console table', async () => {
  const registration = sessionRegistrations['peek-poker'];
  expect(await registration?.screen?.()).toBe(ConsoleScreen);
  expect(await registration?.viewKey?.()).toBe(publicViewKey);
});
it('PP-012 registers the shell record codec with a non-null empty record', async () => {
  const record = await sessionRegistrations['peek-poker']?.record?.();
  expect(record?.version).toBe(1);
  expect(record?.empty()).toEqual({ bests: { rising: 0, steady: 0 } });
  expect(record?.validate({ best: 12 })).toBe(true);
  expect(record?.validate({ best: -1 })).toBe(false);
  const state = peekPoker.init(42, makePlayers(1, false), { rounds: 3 }, { data: {}, saved: { best: 10 }, teams: false });
  state.phase = 'over'; state.recordable = true; state.solo = true;
  state.players.forEach(player => { player.score = 12; });
  const view = peekPoker.publicView(state);
  expect(record?.savedView(view, state)).toEqual({ ...view, newBest: true });
  state.players.forEach(player => { player.score = 10; });
  const tie = peekPoker.publicView(state);
  expect(record?.savedView(tie, state)).toBe(tie);
});
