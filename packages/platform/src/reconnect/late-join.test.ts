import { expect, it } from 'vitest';
import type { HostMessage } from '@kaki/protocol';
import { createReconnectRoom } from './host-room';
import { createPhoneReconnect } from './phone';
import { createPhoneSeatStore } from './phone-store';
import { createRoom } from '../room/room';
import { Clock, CODE, MemoryStorage } from './testing.fixture';
import type { PhoneReconnectDial } from './phone';

it.each(['lobby', 'results'] as const)('PLAT-008 held phone is admitted on %s even if its retry cannot send', phase => {
  const clock = new Clock(); let serial = 0;
  const room = createReconnectRoom({ room: createRoom(), clock, mintToken: () => String(++serial).repeat(32) });
  room.host({ type: 'phase', phase: 'playing', allowRunningJoin: false });
  let dial: PhoneReconnectDial | undefined;
  let sends = 0;
  const phone = createPhoneReconnect({ clock, store: createPhoneSeatStore(new MemoryStorage()),
    initial: { code: CODE, nickname: 'Fern' }, state() { /* State inspected below. */ },
    dial(options) {
      dial = options;
      options.onPeer({ sendPhone(message) {
        // The first hello reaches the TV; subsequent sends encounter backpressure.
        if (++sends > 1) return false;
        room.receive('phone', message); return true;
      } });
      return { stop() { /* In-memory channel. */ } };
    },
  });
  room.attach('phone', { sendHost(message) { dial?.onControl(message); return true; },
    bindIdentity() { /* In-memory identity. */ }, close() { /* In-memory channel. */ } });
  dial?.onState('control-open');
  expect(phone.state).toBe('waiting-for-lobby');
  expect(room.room.players).toHaveLength(0);
  room.host({ type: 'phase', phase, allowRunningJoin: false });
  expect(room.room.players).toHaveLength(1);
  expect(phone.state).toBe('back-in-seat');
  phone.stop(); room.stop();
});

it.each(['leave', 'disconnect'] as const)('PLAT-008 %s cancels a held request', action => {
  const room = createReconnectRoom({ room: createRoom(), clock: new Clock(), mintToken: () => 'x'.repeat(32) });
  room.attach('phone', { sendHost: () => true, bindIdentity() { /* Fake identity. */ }, close() { /* Fake channel. */ } });
  room.host({ type: 'phase', phase: 'playing', allowRunningJoin: false });
  room.receive('phone', { v: 1, t: 'hello', name: 'Fern' });
  if (action === 'leave') room.receive('phone', { v: 1, t: 'leave' });
  else room.dropped('phone');
  room.host({ type: 'phase', phase: 'lobby', allowRunningJoin: false });
  expect(room.room.players).toHaveLength(0);
  room.stop();
});

it.each([false, true])('PLAT-008 held retry seats once and preserves name notice (nested: %s)', nested => {
  const messages: HostMessage[] = [];
  let serial = 0; let reentered = false;
  const room = createReconnectRoom({ room: createRoom(), clock: new Clock(), mintToken: () => String(++serial).repeat(32),
    changed(state) {
      if (nested && state.phase === 'lobby' && state.players.length === 2 && !reentered) {
        reentered = true; room.host({ type: 'phase', phase: 'lobby', allowRunningJoin: false });
      }
    },
  });
  room.attach('first', { sendHost: () => true, bindIdentity() { /* Fake identity. */ }, close() { /* Fake channel. */ } });
  room.receive('first', { v: 1, t: 'hello', name: 'Fern' });
  room.host({ type: 'phase', phase: 'playing', allowRunningJoin: false });
  let retried = false;
  room.attach('held', { sendHost(message) {
    messages.push(message);
    if (!nested && message.t === 'room' && message.phase === 'lobby' && !retried) {
      retried = true; room.receive('held', { v: 1, t: 'hello', name: 'Fern' });
    }
    return true;
  }, bindIdentity() { /* Fake identity. */ }, close() { /* Fake channel. */ } });
  room.receive('held', { v: 1, t: 'hello', name: 'Fern' });
  const otherMessages: HostMessage[] = [];
  if (nested) {
    room.attach('other', { sendHost(message) { otherMessages.push(message); return true; }, bindIdentity() { /* Fake identity. */ }, close() { /* Fake channel. */ } });
    room.receive('other', { v: 1, t: 'hello', name: 'Fern' });
  }
  room.host({ type: 'phase', phase: 'lobby', allowRunningJoin: false });
  expect(room.room.players).toHaveLength(nested ? 3 : 2);
  if (nested) expect(otherMessages.filter(message => message.t === 'seat')).toEqual([
    expect.objectContaining({ t: 'seat', resumed: false, name: 'Fern 3' }),
  ]);
  expect(messages.filter(message => message.t === 'seat')).toEqual([
    expect.objectContaining({ t: 'seat', resumed: false, name: 'Fern 2', nameReplaced: false }),
  ]);
  room.stop();
});


it('PLAT-008 replay precedes the phone hello and the later hello only resumes the seat', () => {
  const messages: HostMessage[] = [];
  const seated: number[] = [];
  let serial = 0;
  const room = createReconnectRoom({ room: createRoom(), clock: new Clock(),
    mintToken: () => String(++serial).repeat(32), seated(_id, seat) { seated.push(seat); },
  });
  room.attach('first', { sendHost: () => true, bindIdentity() { /* Fake identity. */ }, close() { /* Fake channel. */ } });
  room.receive('first', { v: 1, t: 'hello', name: 'Fern' });
  room.host({ type: 'phase', phase: 'playing', allowRunningJoin: false });
  room.attach('held', { sendHost(message) { messages.push(message); return true; },
    bindIdentity() { /* Fake identity. */ }, close() { /* Fake channel. */ } });
  room.receive('held', { v: 1, t: 'hello', name: 'Fern' });
  seated.length = 0;
  room.host({ type: 'phase', phase: 'lobby', allowRunningJoin: false });
  expect(room.room.players).toHaveLength(2);
  expect(seated).toEqual([2]);
  const seats = messages.filter(message => message.t === 'seat');
  expect(seats).toEqual([expect.objectContaining({ resumed: false, name: 'Fern 2', nameReplaced: false })]);
  messages.length = 0;
  // Real network order: the lobby broadcast reaches the phone after the host has replayed.
  room.receive('held', { v: 1, t: 'hello', name: 'Fern' });
  expect(room.room.players).toHaveLength(2);
  expect(room.room.players[1]?.name).toBe('Fern 2');
  expect(seated).toEqual([2]);
  expect(messages.filter(message => message.t === 'seat')).toEqual([expect.objectContaining({ t: 'seat', resumed: true, name: 'Fern 2', seatToken: seats[0]?.seatToken })]);
  room.stop();
});
