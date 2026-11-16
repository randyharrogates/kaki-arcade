import { describe, expect, it } from 'vitest';
import type { PhoneMessage } from '@kaki/protocol';
import { createPhoneReconnect } from './phone';
import type { PhoneReconnectDial, PhoneReconnectState } from './phone';
import { createPhoneSeatStore } from './phone-store';
import { Clock, CODE, MemoryStorage, SECRET } from './testing.fixture';

function unit(saved = true) {
  const storage = new MemoryStorage(); const store = createPhoneSeatStore(storage);
  if (saved) store.write({ code: CODE, seatToken: SECRET, nickname: 'Guest', roomToken: null, droppedAt: null });
  const clock = new Clock(); const attempts: number[] = []; const sent: PhoneMessage[] = [];
  let dial: PhoneReconnectDial | undefined;
  const states: PhoneReconnectState[] = [];
  const driver = createPhoneReconnect({ clock, store,
    initial: { code: CODE, nickname: 'Guest' }, state: state => states.push(state),
    dial(options) {
      dial = options; attempts.push(clock.now());
      options.onPeer({ sendPhone(message) { sent.push(message); return true; } });
      return { stop() { /* Fake connection has no pending work. */ } };
    },
  });
  return { storage, store, clock, attempts, sent, states, driver,
    get dial() { if (!dial) throw new Error('No dial'); return dial; } };
}

describe('PLAT-007 bounded recovery and plain states', () => {
  it('back-off is bounded, continues slowly after the hold and accepts authoritative expiry', () => {
    const r = unit();
    r.dial.onState('closed');
    for (const delay of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
      const before = r.attempts.length;
      r.clock.advance(delay - 1); expect(r.attempts).toHaveLength(before);
      r.clock.advance(1); expect(r.attempts).toHaveLength(before + 1);
      r.dial.onError('network-failed');
    }
    r.clock.advance(121000);
    expect(r.driver.state).toBe('hold-over'); expect(r.store.read()?.seatToken).toBe(SECRET);
    const count = r.attempts.length; r.clock.advance(600000); expect(r.attempts.length).toBeGreaterThan(count);
    r.driver.wake(); r.dial.onState('control-open');
    expect(r.sent.at(-1)?.t).toBe('resume');
    r.dial.onControl({ v: 1, t: 'refused', reason: 'seat-expired' });
    expect(r.store.read()).toBeNull();
    expect(r.sent.at(-1)).toEqual({ v: 1, t: 'hello', name: 'Guest' });
    r.driver.stop(); expect(r.clock.tasks.size).toBe(0);
  });
  it.each(['room-not-found', 'room-expired', 'room-closed'])('clears identity on %s', reason => {
    const r = unit(); r.dial.onError(reason);
    expect(r.driver.state).toBe('room-gone'); expect(r.store.read()).toBeNull();
    r.clock.advance(60000); r.driver.wake(); r.driver.rejoin();
    expect(r.attempts).toHaveLength(1);
    expect(r.driver.state).toBe('room-gone');
    r.driver.stop();
  });
  it('reports full and waits for lobby after an expired seat, following PLAT-008', () => {
    const r = unit(); r.dial.onState('control-open');
    expect(r.sent.at(-1)).toEqual({ v: 1, t: 'resume', seatToken: SECRET });
    r.dial.onControl({ v: 1, t: 'refused', reason: 'seat-expired' });
    expect(r.store.read()).toBeNull(); expect(r.sent.at(-1)?.t).toBe('hello');
    r.dial.onControl({ v: 1, t: 'refused', reason: 'game-running' });
    expect(r.driver.state).toBe('waiting-for-lobby');
    r.dial.onControl({ v: 1, t: 'room', phase: 'lobby', leader: false, players: 1, team: null });
    expect(r.sent.at(-1)?.t).toBe('hello');
    r.dial.onControl({ v: 1, t: 'refused', reason: 'room-full' });
    expect(r.driver.state).toBe('room-full'); r.driver.stop();
  });
  it('successful join writes accepted nickname and explicit leave clears it', () => {
    const r = unit(false); r.dial.onState('control-open');
    r.dial.onControl({ v: 1, t: 'seat', seat: 1, colour: 0, name: 'Assigned',
      seatToken: SECRET, nameReplaced: false, resumed: false });
    expect(r.store.read()?.nickname).toBe('Assigned');
    r.driver.leave(); expect(r.store.read()).toBeNull(); expect(r.sent.at(-1)?.t).toBe('leave');
  });
  it('throwing storage and arbitrary transport errors do not leak tokens or break seating', () => {
    const r = unit(); r.storage.fail = true;
    r.dial.onError(SECRET); expect(r.states).not.toContain(SECRET);
    r.clock.advance(1000); r.dial.onState('control-open');
    r.dial.onControl({ v: 1, t: 'seat', seat: 1, colour: 0, name: 'Guest',
      seatToken: SECRET, nameReplaced: false, resumed: true });
    expect(r.driver.state).toBe('back-in-seat'); r.driver.stop();
  });
  it('stale callbacks cannot change the newest connection or send its token', () => {
    const r = unit(); const old = r.dial; r.driver.wake();
    old.onState('control-open'); old.onError('room-not-found');
    expect(r.sent).toEqual([]); expect(r.store.read()).not.toBeNull();
    r.driver.stop();
  });
});

describe('PLAT-007 terminal protocol failures', () => {
  it.each(['bad-message', 'opening-timeout', 'bad-token'])('%s does not retry', reason => {
    const r = unit(); r.dial.onError(reason); r.clock.advance(121000);
    expect(r.driver.state).toBe('cannot-connect'); expect(r.attempts).toHaveLength(1);
    r.driver.stop();
  });
  it('a version error asks for reload while retaining the seat for the updated page', () => {
    const r = unit(); r.dial.onError('bad-version');
    expect(r.driver.state).toBe('out-of-date'); expect(r.store.read()?.seatToken).toBe(SECRET);
    r.driver.stop();
  });
});

describe('D-086 phone hold and clock boundaries', () => {
  it('stops slow recovery on a definitive answer and offers explicit rejoin while held', () => {
    const r = unit(); r.dial.onError('network-failed'); r.clock.advance(125000);
    expect(r.driver.state).toBe('hold-over');
    r.driver.rejoin(); r.dial.onState('control-open');
    expect(r.sent.at(-1)).toEqual({ v: 1, t: 'hello', name: 'Guest' });
    r.dial.onState('closed'); r.clock.advance(30000);
    r.dial.onError('room-not-found');
    const count = r.attempts.length; r.clock.advance(600000);
    expect(r.attempts).toHaveLength(count); expect(r.clock.tasks.size).toBe(0);
    r.driver.stop();
  });
  it.each([1, 5000, 5001])('handles a stored drop %i ms ahead of the clock', skew => {
    const clock = new Clock(); const store = createPhoneSeatStore(new MemoryStorage());
    store.write({ code: CODE, seatToken: SECRET, nickname: 'Guest', roomToken: null,
      droppedAt: clock.now() + skew });
    const sent: PhoneMessage[] = [];
    const d = createPhoneReconnect({ clock, store, state: () => undefined,
      dial(o) {
        o.onPeer({ sendPhone(m) { sent.push(m); return true; } }); o.onState('control-open');
        return { stop() { /* No real socket. */ } };
      } });
    expect(sent[0]?.t).toBe(skew <= 5000 ? 'resume' : 'hello'); d.stop();
  });
});

it.each(['room-not-found', 'room-expired', 'not-allowed'])('D-095: open channel ignores signalling %s before and after seating', reason => {
  const r = unit(); r.dial.onState('control-open');
  const before = [...r.states]; const saved = r.store.read();
  r.dial.onError(reason); expect(r.states).toEqual(before); expect(r.store.read()).toEqual(saved);
  r.dial.onControl({ v: 1, t: 'seat', seat: 1, colour: 0, name: 'Guest', seatToken: SECRET, nameReplaced: false, resumed: true });
  r.dial.onHost(false); r.dial.onError(reason);
  expect(r.driver.state).toBe('back-in-seat'); expect(r.store.read()?.seatToken).toBe(SECRET);
  r.dial.onState('closed'); r.clock.advance(1000); r.dial.onError(reason);
  expect(r.driver.state).toBe(reason === 'not-allowed' ? 'replaced' : 'room-gone'); r.driver.stop();
});
it('attemptDelayMs starts the negotiation deadline after the admission wait', () => {
  const clock = new Clock(); let attempts = 0;
  const driver = createPhoneReconnect({ clock, store: createPhoneSeatStore(new MemoryStorage()),
    initial: { code: CODE, nickname: 'Guest' }, attemptDelayMs: () => 30000,
    state: () => undefined, dial: () => { attempts++; return { stop() { /* No transport resources in this fixture. */ } }; } });
  clock.advance(44999); expect(attempts).toBe(1);
  clock.advance(1001); expect(attempts).toBe(2); driver.stop();
});
