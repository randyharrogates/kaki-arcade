import { expect, it, vi } from 'vitest';
import { createInputBuffer } from '@kaki/sim-core';
import { applyHostEvent } from '../room/room';
import { createSession } from './index';
import { fixture } from './session.fixture';
import { FakeTransport, joinRoom, makeRoom } from './testing.fixture';

it.each([true, false])('PLAT-008 PLAT-025 requests a team once only with joinTeam (%s)', supported => {
  const joinTeam = vi.fn(() => 1 as const), join = vi.fn((...args: Parameters<typeof fixture.join>) => fixture.join(...args)), assignTeam = vi.fn();
  const room = makeRoom(2, true);
  const session = createSession({ game: { ...fixture, join, ...(supported ? { joinTeam } : {}) },
    settings: { steps: 100 }, seed: 7, room, context: { data: {}, saved: null, teams: true },
    buffer: createInputBuffer<string>({ axisCount: 4, seqModulus: 65536, staleAfterSteps: 15 }),
    transport: new FakeTransport(), assignTeam, publicView: () => undefined, event: () => undefined });
  session.advance(20);
  const next = joinRoom(room, 3);
  session.updateRoom(next); session.updateRoom(next);
  expect(join).not.toHaveBeenCalled();
  expect(joinTeam).toHaveBeenCalledTimes(supported ? 1 : 0);
  expect(assignTeam).toHaveBeenCalledTimes(supported ? 1 : 0);
  if (supported) {
    expect(assignTeam).toHaveBeenCalledWith(3, 1);
    const assigned = applyHostEvent(next, { type: 'team', seat: 3, team: 'blue' }, next.clock).state;
    session.updateRoom(assigned); session.updateRoom(assigned);
    expect(join).toHaveBeenCalledOnce();
    expect(join).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'seat-3', team: 1 }));
    expect(joinTeam).toHaveBeenCalledOnce();
  }
});

it('PLAT-025 synchronous assignment serialises newcomers against the updated game state', () => {
  let room = makeRoom(2, true);
  const joinTeam = vi.fn((state: Parameters<typeof fixture.join>[0]) => state.players.length % 2 === 0 ? 0 as const : 1 as const);
  const session = createSession({ game: { ...fixture, joinTeam }, settings: { steps: 100 }, seed: 7, room,
    context: { data: {}, saved: null, teams: true },
    buffer: createInputBuffer<string>({ axisCount: 4, seqModulus: 65536, staleAfterSteps: 15 }), transport: new FakeTransport(),
    assignTeam(seat, team) { room = applyHostEvent(room, { type: 'team', seat, team: team === 0 ? 'red' : 'blue' }, room.clock).state; session.updateRoom(room); },
    publicView: () => undefined, event: () => undefined });
  room = joinRoom(joinRoom(room, 3), 4); session.updateRoom(room);
  expect(session.state?.players.map(p => p.team)).toEqual([0, 1, 0, 1]);
  expect(joinTeam).toHaveBeenCalledTimes(2);
});
