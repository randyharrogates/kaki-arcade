import { expect, it } from 'vitest';
import { createSession, STEP_MS, AXIS_COUNT } from '@kaki/platform';
import { createInputBuffer } from '@kaki/sim-core';
import { tabaoRush } from '../../../../games/tabao-rush/src/index';
import { peekPoker } from '../../../../games/peek-poker/src/rules/game';
import { FakeTransport, makeRoom } from './testing.fixture';
it('sends per step', () => {
  for (const [name, game, settings] of [['tabao', tabaoRush, {}], ['peek', peekPoker, { rounds: 3 }]] as const) {
    const t = new FakeTransport(); const events: unknown[] = [];
    const buffer = createInputBuffer<string>({ axisCount: AXIS_COUNT, seqModulus: 65536, staleAfterSteps: 15 });
    const s = createSession({ game: game as never, settings, seed: 1, room: makeRoom(8), context: { data: {}, saved: null, teams: false }, buffer, transport: t, publicView() { /**/ }, event(e) { events.push(e); } });
    const initialLayouts = t.sent.filter(m => m.type === 'layout').length;
    expect(initialLayouts, name).toBe(8);
    for (let i = 0; i < 600; i++) s.advance(STEP_MS);
    expect(s.step, name).toBe(600);
    expect(events, name).toEqual([]);
    expect(t.sent.filter(m => m.type === 'layout'), name).toHaveLength(initialLayouts);
    expect(t.sent.filter(m => m.type === 'view').length, name).toBeGreaterThanOrEqual(8);
  }
});
