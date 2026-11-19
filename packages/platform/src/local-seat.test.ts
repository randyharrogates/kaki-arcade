import { expect, it, vi } from 'vitest';
import { createInputBuffer } from '@kaki/sim-core';
import { applyHostEvent, applyPhoneEvent, createRoom, LOCAL_CONNECTION, selectionRefusal } from './room/room';
import { pickerInput, pickerRoom, pickerFailed, startRefusal } from './picker';
import { createSession, type SessionEvent } from './session';
import { fixture } from './session/session.fixture';
import { FakeTransport, joinRoom } from './session/testing.fixture';
import { EMPTY_SETUP } from './game/settings';

it('CTRL-009 PLAT-006 prefers phones in seating order, including reused lower seats', () => {
  let room = joinRoom(createRoom(), 1, LOCAL_CONNECTION);
  expect(room.leader).toBe(1);
  room = joinRoom(room, 2); expect(room.leader).toBe(2);
  room = joinRoom(room, 3); expect(room.leader).toBe(2);
  room = applyPhoneEvent(room, { deviceId: 'd2', connectionId: 'c2', seat: 2 }, { type: 'leave' }, 0).state;
  expect(room.leader).toBe(3);
  room = joinRoom(room, 4); expect(room.players.at(-1)?.seat).toBe(2); expect(room.leader).toBe(3);
  room = applyPhoneEvent(room, { deviceId: 'd3', connectionId: 'c3', seat: 3 }, { type: 'leave' }, 0).state;
  expect(room.leader).toBe(2);
});

it('CTRL-009 PLAT-021 refuses a watching local-only start with the display title; play starts', () => {
  const room = joinRoom(createRoom(), 1, LOCAL_CONNECTION);
  const watch = { ...fixture.meta, name: 'Private game', localSeat: 'watch' as const };
  const state = { screen: 'start' as const, focus: watch.id, revision: 0 };
  const refused = pickerInput(state, room, [watch], LOCAL_CONNECTION, 'start', 0);
  expect(refused.screen).toBe('start');
  expect(refused.error).toBe('Private game needs a phone. Go back and scan the code in the lobby to join.');
  expect(pickerInput(state, room, [fixture.meta], LOCAL_CONNECTION, 'start', 0).screen).toBe('starting');
  const phoneRoom = joinRoom(room, 2);
  expect(startRefusal(watch, phoneRoom)).toBeNull();
  expect(pickerRoom(refused, phoneRoom, room).error).toBeUndefined();
});

it('CTRL-009 watching seats never enter the game, private output or results, including room updates', () => {
  const room = joinRoom(joinRoom(createRoom(), 1, LOCAL_CONNECTION), 2);
  const privateView = vi.fn((state: Parameters<typeof fixture.privateView>[0], id: string) => fixture.privateView(state, id));
  const transport = new FakeTransport();
  const events: SessionEvent[] = [];
  const session = createSession({ game: { ...fixture, meta: { ...fixture.meta, localSeat: 'watch' }, privateView },
    settings: { steps: 1 }, seed: 1, room, context: EMPTY_SETUP,
    buffer: createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 }),
    transport, publicView() { /* fixture */ }, event(event) { events.push(event); } });
  expect(session.state?.players.map(p => p.id)).toEqual(['seat-2']);
  session.updateRoom(joinRoom(room, 3));
  expect(session.state?.players.map(p => p.id)).toEqual(['seat-2', 'seat-3']);
  expect(privateView.mock.calls.every(call => call[1] !== 'seat-1')).toBe(true);
  expect(transport.sent.every(message => message.connection !== LOCAL_CONNECTION)).toBe(true);
  session.advance(1000 / 60);
  session.advance(1000 / 60);
  const result = events.find(event => event.type === 'results');
  expect(result?.type === 'results' && result.results.players.map(p => p.id)).toEqual(['seat-2', 'seat-3']);

});

it('PLAT-006 PLAT-024 falls back to TV after phone grace and restores the earliest connected phone', () => {
  let room = joinRoom(joinRoom(createRoom(), 1, LOCAL_CONNECTION), 2);
  room = applyHostEvent(room, { type: 'disconnect', seat: 2 }, 0).state;
  room = applyHostEvent(room, { type: 'expire' }, 10000).state;
  expect(room.leader).toBe(1);
  expect(room.players).toHaveLength(2);
  room = applyPhoneEvent(room, { deviceId: 'd2', connectionId: 'c2' }, { type: 'resume', seatToken: room.players[1]?.seatToken }, 11000).state;
  expect(room.leader).toBe(2);
});
it('PLAT-021 retains load failures through room count and leader changes', () => {
  const room = joinRoom(createRoom(), 1, LOCAL_CONNECTION);
  const failed = pickerFailed({ screen: 'start', focus: fixture.meta.id, revision: 0 }, [fixture.meta]);
  expect(pickerRoom(failed, joinRoom(room, 2), room).error).toBe(failed.error);
});

it('PLAT-021 uses the tile participation count for selection except the lone watching seat', () => {
  const room = joinRoom(createRoom(), 1, LOCAL_CONNECTION);
  const watch = { ...fixture.meta, localSeat: 'watch' as const, players: { min: 2, max: 8 } };
  const picker = { screen: 'picker' as const, focus: watch.id, revision: 0 };
  expect(selectionRefusal(watch, room)).toBeNull();
  expect(pickerInput(picker, room, [watch], LOCAL_CONNECTION, 'select', 0).screen).toBe('start');
  const phoneRoom = joinRoom(room, 2);
  expect(selectionRefusal(watch, phoneRoom)).toBe('Needs at least 2 players');
  expect(pickerInput(picker, phoneRoom, [watch], 'c2', 'select', 0)).toBe(picker);
});
