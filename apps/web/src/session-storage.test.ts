import { expect, it, vi } from 'vitest';
import { makePlayers } from '@kaki/platform/kit';
import { peekPoker } from '../../../games/peek-poker/src';
import { saveSession, readSaved } from './session-storage';
import type { LoadedGame } from './session-adapter';

it('PP-012 DATA-002 a readable store with a failed write never claims New best', async () => {
  const setItem = vi.fn(() => { throw new Error('quota'); });
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ schemaVersion: 1, data: { best: 10 } }), setItem });
  try {
    const saved = await readSaved('peek-poker');
    expect(saved).toEqual({ best: 10 });
    const state = peekPoker.init(42, makePlayers(1, false), { rounds: 3 }, { data: {}, saved, teams: false });
    state.phase = 'over'; state.players.forEach(p => { p.score = 12; });
    const view = peekPoker.publicView(state);
    expect(await saveSession(peekPoker as LoadedGame, state, view)).toBe(view);
    expect(view.newBest).toBe(false);
    expect(setItem).toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
