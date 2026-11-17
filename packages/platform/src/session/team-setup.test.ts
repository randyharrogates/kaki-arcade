import { expect, it, vi } from 'vitest';
import { createInputBuffer } from '@kaki/sim-core';
import { createSession } from './index';
import { fixture } from './session.fixture';
import { makeRoom, FakeTransport } from './testing.fixture';
it('PLAT-025 runner refuses missing and empty team splits before init', () => {
  for (const mode of ['missing', 'empty'] as const) {
    const init = vi.fn((...args: Parameters<typeof fixture.init>) => fixture.init(...args)); const event = vi.fn();
    const room = makeRoom(2, mode !== 'missing');
    const players = mode === 'empty' ? room.players.map(p => ({ ...p, team: 'red' as const })) : room.players;
    createSession({ game: { ...fixture, init, meta: { ...fixture.meta, teams: 'required' } }, settings: { steps: 30 }, seed: 7,
      room: { ...room, players }, context: { data: {}, saved: null, teams: true }, buffer: createInputBuffer<string>({ axisCount: 4, seqModulus: 65536, staleAfterSteps: 15 }),
      transport: new FakeTransport(), publicView: () => undefined, event });
    expect(init).not.toHaveBeenCalled(); expect(event).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', operation: 'teams' }));
  }
});

it('PLAT-025 D-149 runner initialises an uneven eight-player split', () => {
  const init = vi.fn((...args: Parameters<typeof fixture.init>) => fixture.init(...args));
  const room = makeRoom(8, true);
  createSession({ game: { ...fixture, init, meta: { ...fixture.meta, teams: 'required' } }, settings: { steps: 30 }, seed: 7,
    room: { ...room, players: room.players.map((p, i) => ({ ...p, team: i < 7 ? 'red' as const : 'blue' as const })) },
    context: { data: {}, saved: null, teams: true }, buffer: createInputBuffer<string>({ axisCount: 4, seqModulus: 65536, staleAfterSteps: 15 }),
    transport: new FakeTransport(), publicView: () => undefined, event: () => undefined });
  expect(init).toHaveBeenCalledOnce();
});
