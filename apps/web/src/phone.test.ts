import type { AnalogInput, PhoneMessage } from '@kaki/protocol';
import { CLOSED_ROOM_REASON } from './team-setup';
import { describe, expect, it, vi } from 'vitest';
import { createPhoneSeatStore } from '@kaki/platform';
import type { PhoneReconnectDial } from '@kaki/platform';
import { createPhone, phoneCopy, phoneView, phoneController } from './phone';
import type { PhoneDependencies, PhoneState, PhoneView } from './phone';
import { normaliseJoinCode } from './phone';
import { phoneDemo } from './phone-demo';
import { Clock, MemoryStorage, CODE, SECRET } from './testing.fixture';
function fixture(saved = false) {
  const clock = new Clock(); const storage = new MemoryStorage();
  if (saved) createPhoneSeatStore(storage).write({ code: CODE, nickname: 'Fern', seatToken: SECRET, roomToken: null, droppedAt: null });
  let dial: PhoneReconnectDial | undefined;
  let feedback: Parameters<PhoneDependencies['dial']>[1] | undefined;
  let view = phoneView('entry');
  let canSend = true; let closes = 0;
  const sampled = vi.fn<(buttons: number, analog: AnalogInput) => void>();
  const sent: unknown[] = []; const times: number[] = [];
  const deps: PhoneDependencies = { clock, storage, dial(options, receive) {
    dial = options; feedback = receive; times.push(clock.now());
    const peer = { inputSender: { change: sampled }, sendPhone(message: PhoneMessage) { sent.push(message); return canSend; } };
    options.onPeer(peer);
    return { stop: () => { closes++; } };
  } };
  const phone = createPhone(deps, null, next => { view = next; });
  return { phone, clock, storage, sent, sampled, times, deps, failSend() { canSend = false; },
    get closes() { return closes; }, get view() { return view; }, get dial() { if (!dial) throw new Error('No dial'); return dial; },
    get feedback() { if (!feedback) throw new Error('No feedback'); return feedback; },
    seat(name = 'Fern', replaced = false) { dial?.onControl({ v: 1, t: 'seat', seat: 3, colour: 2, name, nameReplaced: replaced, resumed: saved, seatToken: SECRET }); },
  };
}
describe('C-08 phone view (PLAT-002 to PLAT-009, CTRL-008)', () => {
  it.each(Object.keys(phoneCopy) as PhoneState[])('projects %s with plain copy and a deterministic demo', state => {
    const view = phoneView(state);
    expect(view.title).toBe(phoneCopy[state][0]); expect(view.detail).toBe(phoneCopy[state][1]);
    expect(phoneDemo(state, new URLSearchParams()).state).toBe(state);
    expect(JSON.stringify(view)).not.toContain(SECRET);
  });
  it.each([['h7kq 9mxr', 'H7KQ9MXR'], ['bcdf-2345', CODE], ['O1IL2345', ''], ['BCDF234', ''], ['ＢＣＤＦ２３４５', '']])('normalises only the permitted alphabet: %s', (code, expected) => {
    expect(normaliseJoinCode(code)).toBe(expected);
  });
  it.each([['', 'blank'], ['abcdefghijklmn', 'too-long'], ['A\u202e', 'bad-characters']])('warns about nickname %s using shared rules', (name, state) => {
    const f = fixture(); f.phone.join(CODE, name); expect(f.view.state).toBe(state); expect(f.times).toHaveLength(0); f.phone.stop();
  });
  it('accepts 12 graphemes and keeps secrets outside the view', () => {
    const f = fixture(); const name = 'é'.repeat(12); f.phone.join('bcdf 2345', name); f.dial.onState('control-open');
    expect(f.sent).toContainEqual({ v: 1, t: 'hello', name });
    f.seat(name); f.dial.onControl({ v: 1, t: 'room', phase: 'lobby', players: 1, leader: true, team: null });
    expect(f.view).toMatchObject({ state: 'lobby', name, seat: 3, colour: 'var(--ka-seat-3)', leader: true });
    expect(JSON.stringify(f.view)).not.toContain(SECRET); f.phone.stop();
  });
  it('shows host name refusal, duplicate suffix and blocked-name replacement', () => {
    const f = fixture(); f.phone.join(CODE, 'Fern'); f.dial.onControl({ v: 1, t: 'name-refused', reason: 'too-long' });
    expect(f.view.state).toBe('too-long'); f.phone.join(CODE, 'Fern'); f.seat('Fern 2'); expect(f.view.notice).toContain('Name taken');
    f.seat('Player 3', true); expect(f.view.notice).toContain('changed'); f.phone.stop();
  });
  it.each([['room-full', 'room-full'], ['room-not-found', 'room-not-found'], ['room-expired', 'room-not-found'], ['not-allowed', 'entry'], ['bad-token', 'cannot-connect'], ['bad-message', 'cannot-connect'], ['opening-timeout', 'cannot-connect'], ['bad-version', 'out-of-date'], ['unsupported-version', 'out-of-date']])('maps %s to %s', (error, state) => {
    const f = fixture(); f.phone.join(CODE, 'Fern'); f.dial.onError(error); expect(f.view.state).toBe(state); f.phone.stop();
  });
  it('shows full for the ninth join, then allows another room', () => {
    const f = fixture(); f.phone.join(CODE, 'Fern'); f.dial.onControl({ v: 1, t: 'refused', reason: 'room-full' });
    expect(f.view.title).toBe('This room is full'); expect(f.view.action).toBe('Join another room'); f.phone.edit(); expect(f.view.state).toBe('entry'); f.phone.stop();
  });
  it('automatically resumes after reload, host disconnect and host return', () => {
    const f = fixture(true); f.dial.onState('control-open'); expect(f.sent).toContainEqual({ v: 1, t: 'resume', seatToken: SECRET });
    f.seat(); f.dial.onHost(false); expect(f.view.state).toBe('lobby');
    f.dial.onHost(true); expect(f.view.state).toBe('lobby');
    f.dial.onState('closed'); expect(f.view.state).toBe('host-disconnected');
    f.clock.advance(1000); f.dial.onHost(true); f.dial.onState('control-open'); f.seat();
    expect(f.view).toMatchObject({ state: 'lobby', seat: 3, name: 'Fern' }); f.phone.stop();
  });
  it('paces unreachable attempts at 1, 2, 4 seconds and honours Retry-After', () => {
    const f = fixture(); f.phone.join(CODE, 'Fern');
    for (const delay of [1000, 2000, 4000]) {
      f.feedback.unreachable(); f.dial.onError('socket-unavailable'); expect(f.view.state).toBe('unreachable');
      f.clock.advance(delay - 1); expect(f.times.at(-1)).toBe(f.clock.now() - delay + 1); f.clock.advance(1);
    }
    expect(f.times).toEqual([1000, 2000, 4000, 8000]);
    f.feedback.unreachable(); f.feedback.retryAfter(60000); f.dial.onError('socket-unavailable');
    for (let i = 0; i < 29; i++) f.clock.advance(1000);
    expect(f.times).toHaveLength(4); f.clock.advance(9000); expect(f.times).toHaveLength(5); f.phone.stop();
  });
  it('offers rejoin after the hold and waits for a running game to finish', () => {
    const f = fixture(true); f.dial.onHost(false); f.clock.advance(120001); expect(f.view.state).toBe('hold-over');
    expect(f.view.action).toBe('Join again'); f.phone.rejoin();
    f.dial.onControl({ v: 1, t: 'refused', reason: 'game-running' }); expect(f.view.state).toBe('waiting-for-lobby');
    f.phone.stop();
  });
  it('handles replaced, room closure, leave, invalid code and fresh code over saved seat', () => {
    const f = fixture(true); f.seat(); f.dial.onControl({ v: 1, t: 'close', reason: 'replaced' }); expect(f.view.state).toBe('entry');
    f.phone.edit(); f.phone.join('no', 'Fern'); expect(f.view.state).toBe('invalid-code');
    f.phone.join(CODE, 'Fern'); f.seat(); f.dial.onControl({ v: 1, t: 'close', reason: 'room-closed' }); expect(f.view.state).toBe('room-gone');
    f.phone.edit(); f.phone.join(CODE, 'Fern'); f.seat(); f.phone.leave(); expect(f.view.state).toBe('left');
    f.phone.stop();
    const g = fixture(true); g.phone.stop(); let next: PhoneView | undefined;
    const phone = createPhone(g.deps, 'H7KQ9MXR', view => { next = view; }); expect(next?.state).toBe('entry'); expect(createPhoneSeatStore(g.storage).read()).toBeNull(); phone.stop();
  });
});

it('PLAT-004 changes a seated name, shows a host refusal, and retries the new name on the same seat', () => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.seat(); f.phone.changeName();
  expect(f.view.renaming).toBe(true); f.phone.saveName('Pebble');
  expect(f.sent.at(-1)).toEqual({ v: 1, t: 'set-name', name: 'Pebble' });
  f.dial.onControl({ v: 1, t: 'name-refused', reason: 'bad-characters' });
  expect(f.view.state).toBe('bad-characters'); f.phone.saveName('Mango');
  expect(f.sent.at(-1)).toEqual({ v: 1, t: 'set-name', name: 'Mango' }); f.seat('Mango');
  expect(f.view).toMatchObject({ state: 'lobby', seat: 3, name: 'Mango' }); f.phone.stop();
});

it('PLAT-007 sleeps and wakes without retyping or losing the saved token', () => {
  const f = fixture(true); f.phone.stop(); let lifecycle: ((event: 'sleep' | 'wake') => void) | undefined;
  const phone = createPhone({ ...f.deps, lifecycle: { subscribe(receive) { lifecycle = receive; return () => undefined; } } }, null, () => undefined);
  f.dial.onState('control-open'); f.seat(); lifecycle?.('sleep'); f.clock.advance(30000); lifecycle?.('wake'); f.dial.onState('control-open');
  expect(f.sent.at(-1)).toEqual({ v: 1, t: 'resume', seatToken: SECRET });
  expect(createPhoneSeatStore(f.storage).read()?.nickname).toBe('Fern'); phone.stop();
});

it.each([['unsupported-version', 'out-of-date'], ['bad-message', 'cannot-connect'], ['replaced', 'entry'], ['room-closed', 'room-gone']] as const)('maps trusted host close %s to %s and stops retrying', (reason, state) => {
  const f = fixture(true); f.seat(); f.dial.onControl({ v: 1, t: 'close', reason });
  expect(f.view.state).toBe(state); const count = f.times.length; f.clock.advance(180000); expect(f.times).toHaveLength(count); f.phone.stop();
});

it('PLAT-004 accepts twelve joined visible emoji without splitting them', () => {
  const f = fixture(); const name = '👍🏽'.repeat(12); f.phone.join(CODE, name); f.dial.onState('control-open');
  expect(f.sent.at(-1)).toEqual({ v: 1, t: 'hello', name }); f.seat(name);
  expect(f.view.name).toBe(name); f.phone.stop();
});

it('PLAT-007 publishes seat expiry, then lets the authoritative host seat the returning player afresh', () => {
  const f = fixture(true); f.dial.onState('control-open');
  f.dial.onControl({ v: 1, t: 'refused', reason: 'seat-expired' });
  expect(f.view).toMatchObject({ state: 'seat-expired', action: 'Join again' });
  expect(f.sent.at(-1)).toEqual({ v: 1, t: 'hello', name: 'Fern' });
  f.seat(); expect(f.view.state).toBe('lobby'); f.phone.stop();
});

it('PROBE B: rename cannot dial another room, cancel, validation and refusal retain the seat', () => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.seat();
  const saved = createPhoneSeatStore(f.storage).read();
  f.phone.changeName(); f.phone.join('BCDF2346', 'Dora');
  f.phone.saveName(''); expect(f.view.renaming).toBe(true);
  f.phone.cancelName(); expect(f.view.name).toBe('Fern');
  f.phone.changeName(); f.phone.saveName('Dora');
  f.dial.onControl({ v: 1, t: 'name-refused', reason: 'too-long' });
  expect(f.view).toMatchObject({ renaming: true, title: 'Your name is too long', seat: 3 });
  expect(f.times).toHaveLength(1); expect(createPhoneSeatStore(f.storage).read()).toEqual(saved);
  expect(f.sent).toEqual([{ v: 1, t: 'set-name', name: 'Dora' }]); f.phone.stop();
});
it('reads a pasted full join URL', () => {
  expect(normaliseJoinCode('https://arcade.example/play?code=bcdf-2345')).toBe(CODE);
});

it.each([false, true])('PLAT-002/006 lobby copy waits for the picker (leader=%s)', leader => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.seat();
  f.dial.onControl({ v: 1, t: 'room', phase: 'lobby', players: 1, leader, team: null });
  expect(f.view).toMatchObject({ title: 'You’re in.', detail: leader ? "Pick a game when everyone’s in." : 'Waiting for the leader to pick a game.', leader });
  f.phone.stop();
});
it('PLAT-008 accepted mid-game copy follows room phase back to the lobby', () => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.seat();
  for (const phase of ['playing', 'paused', 'lobby'] as const) {
    f.dial.onControl({ v: 1, t: 'room', phase, players: 1, leader: false, team: null });
    expect(f.view.detail).toBe(phase === 'lobby' ? 'Waiting for the leader to pick a game.' : 'Watch the TV.');
  }
  f.phone.stop();
});
it('PLAT-008 refused mid-game keeps the waiting-for-lobby message', () => {
  const f = fixture(); f.phone.join(CODE, 'Fern');
  f.dial.onControl({ v: 1, t: 'room', phase: 'playing', players: 1, leader: false, team: null });
  f.dial.onControl({ v: 1, t: 'refused', reason: 'game-running' });
  expect(f.view).toMatchObject({ title: 'Waiting for the lobby', detail: 'You can join when the current game ends.', connected: false });
  f.phone.stop();
});

it('PLAT-004/007 closes rename on channel loss and resumes the old name (probe C)', () => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.seat(); f.phone.changeName();
  f.dial.onState('closed');
  expect(f.view).toMatchObject({ state: 'host-disconnected', title: 'Host disconnected', renaming: false, connected: false });
  f.phone.saveName('Ghost');
  expect(f.sent).not.toContainEqual({ v: 1, t: 'set-name', name: 'Ghost' });
  f.clock.advance(1000); f.dial.onHost(true); f.dial.onState('control-open'); f.seat();
  expect(f.view).toMatchObject({ state: 'lobby', renaming: false, name: 'Fern' }); f.phone.stop();
});
it('PLAT-004 explains a failed rename send', () => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.seat(); f.phone.changeName(); f.failSend(); f.phone.saveName('Ghost');
  expect(f.view).toMatchObject({ title: 'Your name could not be sent', detail: 'Try again when connected.', renaming: true }); f.phone.stop();
});
it.each(['seat-expired', 'room-gone', 'waiting-for-lobby', 'left'] as const)('PLAT-007/008 clears public seat identity for %s including demos', state => {
  expect(phoneView(state, { seat: 3, colour: 'red', leader: true })).toMatchObject({ seat: null, colour: '', leader: false });
  expect(phoneDemo(state, new URLSearchParams()).seat).toBeNull();
});
it.each(['hold-over', 'replaced', 'out-of-date', 'cannot-connect'] as const)('PLAT-007 retains possibly held seat in %s', state => {
  expect(phoneView(state, { seat: 3 }).seat).toBe(3);
});
it('PLAT-009 uses separate unreachable title and detail and typographic apostrophes in phone copy', () => {
  expect(phoneCopy.unreachable).toEqual(['Can’t reach the room', 'We’ll keep trying.']);
  expect(phoneView('lobby', { leader: true }).detail).not.toContain("'");
  expect(Object.values(phoneCopy).flat().join(' ')).not.toContain("'");
  expect(phoneView('removed')).toMatchObject({ title: 'You were removed from this game', detail: "You can’t rejoin this room.", action: 'Join another room' });
});

it('PLAT-006 gives the lobby leader an invitation and watchers waiting copy', () => {
  expect(phoneView('lobby', { leader: true }).detail).toBe("Pick a game when everyone’s in.");
  expect(phoneView('lobby', { leader: false }).detail).toBe('Waiting for the leader to pick a game.');
});

it('C-16 layout mounts the controller decision and session end restores picker (PLAT-031)', () => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.dial.onState('control-open'); f.seat();
  expect(phoneController(f.view)).toBeNull();
  f.dial.onControl({ v: 1, t: 'layout', rev: 0, layout: { revision: 0, controls: [] } });
  expect(phoneController(f.view)).toEqual({ seat: 3, name: 'Fern', theme: 'console', link: 'connected' });
  f.dial.onState('closed'); expect(phoneController(f.view)?.link).toBe('reconnecting');
  f.clock.advance(1000); f.dial.onState('control-open'); f.seat();
  f.dial.onControl({ v: 1, t: 'room', phase: 'results', players: 1, leader: true, team: null });
  expect(phoneController(f.view)).toBeNull(); f.phone.stop();
});

it('C-16 a late start failure clears a previously delivered controller layout', () => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.seat();
  f.dial.onControl({ v: 1, t: 'layout', rev: 0, layout: { revision: 0, controls: [] } });
  expect(phoneController(f.view)).not.toBeNull();
  f.dial.onControl({ v: 1, t: 'picker-state', revision: 1, screen: 'start', game: null, leaderName: 'Fern', reason: null, failed: true });
  expect(phoneController(f.view)).toBeNull(); f.phone.stop();
});

it('PLAT-025 phone sends the authoritative setup view revision and clears setup on game views', () => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.seat();
  f.dial.onControl({ v: 1, t: 'view', rev: 12, view: { kind: 'team-setup', revision: 2, screen: 'teams', enabled: true, players: [], error: null } });
  expect(f.view.teamSetup?.revision).toBe(12);
  f.phone.teamInput('teams-switch');
  expect(f.sent.at(-1)).toEqual({ v: 1, t: 'action', rev: 0, viewRev: 12, data: { control: 'teams-switch' } });
  f.dial.onControl({ v: 1, t: 'view', rev: 13, view: null }); expect(f.view.teamSetup).toBeNull(); f.phone.stop();
});

it('PLAT-025 preserves the game layout after teams and sends an answer with wire revisions', () => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.seat();
  f.dial.onControl({ v: 1, t: 'view', rev: 12, view: { kind: 'team-setup', revision: 2, screen: 'teams', enabled: true, players: [], error: null } });
  const layout = { revision: 4, controls: [{ kind: 'options', id: 'answer', options: [{ id: '0', label: 'Tokyo' }, { id: '1', label: 'Seoul' }] }] };
  f.dial.onControl({ v: 1, t: 'layout', rev: 4, layout });
  expect(phoneController(f.view)).toBeNull();
  f.dial.onControl({ v: 1, t: 'view', rev: 13, view: null });
  expect(f.view.gameLayout).toEqual(layout);
  expect(phoneController(f.view)).not.toBeNull();
  f.dial.onControl({ v: 1, t: 'room', phase: 'playing', players: 1, leader: true, team: null });
  f.phone.controllerInput({ control: 'answer', revision: 4, phase: 'choose', value: '1' });
  expect(f.sent.at(-1)).toEqual({ v: 1, t: 'action', rev: 4, viewRev: 13, data: { control: 'answer', value: '1' } });
  f.phone.stop();
});

it.each([true, false])('D-099 closed-room copy replaces the picker for leader=%s', leader => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.seat();
  f.dial.onControl({ v: 1, t: 'room', phase: 'lobby', players: 8, leader, team: null });
  f.dial.onControl({ v: 1, t: 'picker-state', revision: 1, screen: 'lobby', game: null, leaderName: 'Fern', reason: CLOSED_ROOM_REASON, failed: false });
  expect(f.view).toMatchObject({ state: 'room-gone', title: 'This room has closed', detail: 'Join the new room on the TV.', picker: null, layout: false, leader: false });
  const before = f.sent.length; f.phone.pickerInput('open'); expect(f.sent).toHaveLength(before); f.phone.stop();
});

it('PLAT-023 paused controls cannot send game inputs and only the leader can resume or quit', () => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.seat();
  f.dial.onControl({ v: 1, t: 'layout', rev: 1, layout: { revision: 1, controls: [{ kind: 'options', id: 'advance', options: [{ id: 'go', label: 'Advance' }] }] } });
  f.dial.onControl({ v: 1, t: 'view', rev: 1, view: null });
  f.dial.onControl({ v: 1, t: 'room', phase: 'playing', players: 8, leader: false, team: null });
  f.phone.controllerInput({ control: 'advance', revision: 1, phase: 'choose', value: 'go' });
  expect(f.sent.at(-1)).toMatchObject({ t: 'action', data: { control: 'advance' } });
  f.dial.onControl({ v: 1, t: 'room', phase: 'paused', players: 8, leader: false, team: null });
  const before = f.sent.length;
  f.phone.controllerInput({ control: 'advance', revision: 1, phase: 'choose', value: 1 });
  f.phone.sessionCommand(); f.phone.sessionCommand('quit'); expect(f.sent).toHaveLength(before);
  f.dial.onControl({ v: 1, t: 'room', phase: 'paused', players: 8, leader: true, team: null });
  f.phone.sessionCommand('quit'); expect(f.sent.at(-1)).toMatchObject({ t: 'action', data: { control: 'console-quit' } });
  f.phone.sessionCommand(); expect(f.sent.at(-1)).toMatchObject({ t: 'action', data: { control: 'console-resume' } }); f.phone.stop();
});
describe('REL-006 connecting timeout', () => {
  it('keeps connecting at 14.9 s, offers retry at 15 s and closes the old attempt', () => {
    const f = fixture(); f.phone.join(CODE, 'Fern');
    f.dial.onHost(false);
    f.clock.advance(14900); expect(f.view.state).toBe('connecting');
    f.clock.advance(100); expect(f.view.state).toBe('could-not-connect');
    expect(`${f.view.title} ${f.view.detail}`).toBe('This phone could not connect to the big screen. Connect it to the same Wi-Fi as the big screen and scan again.');
    expect(f.view.action).toBe('Try again');
    const old = f.dial; const closes = f.closes;
    f.phone.retry(); expect(f.closes).toBe(closes + 1);
    expect(f.closes).toBeGreaterThan(0); expect(f.times).toHaveLength(2);
    expect(f.dial).not.toBe(old); expect(f.dial.code).toBe(CODE);
    expect(f.view.state).toBe('connecting');
    old.onError('room-full'); expect(f.view.state).toBe('connecting');
    f.dial.onState('control-open'); expect(f.sent.at(-1)).toMatchObject({ t: 'hello', name: 'Fern' });
    f.clock.advance(14900); expect(f.view.state).toBe('connecting');
    f.clock.advance(100); expect(f.view.state).toBe('could-not-connect');
    f.phone.stop(); expect(f.clock.tasks.size).toBe(0);
  });
  it('keeps the advice when the reconnect hold window ends for a never-seated phone', () => {
    const f = fixture(); f.phone.join(CODE, 'Fern');
    f.dial.onHost(false); f.clock.advance(130000);
    expect(f.view.state).toBe('could-not-connect'); expect(f.view.action).toBe('Try again');
    f.phone.retry(); expect(f.view.state).toBe('connecting'); f.phone.stop();
  });
  it('never shows the message after seating at 10 s', () => {
    const f = fixture(); f.phone.join(CODE, 'Fern'); f.clock.advance(10000); f.seat();
    f.clock.advance(20000); expect(f.view.state).toBe('lobby'); f.phone.stop();
  });
  it('continues normally when a late connection seats the phone', () => {
    const f = fixture(); f.phone.join(CODE, 'Fern'); f.clock.advance(16000);
    expect(f.view.state).toBe('could-not-connect'); f.seat();
    expect(f.view.state).toBe('lobby'); f.clock.advance(20000); expect(f.view.action).toBe(null); f.phone.stop();
  });
  it('keeps the timeout visible across signalling presence changes until seated', () => {
    const f = fixture(); f.phone.join(CODE, 'Fern');
    f.dial.onHost(false); f.clock.advance(15000);
    f.dial.onHost(true); expect(f.view.state).toBe('could-not-connect');
    f.dial.onHost(false); expect(f.view.state).toBe('could-not-connect');
    f.seat(); expect(f.view.state).toBe('lobby'); f.phone.stop();
  });
  it.each(['edit', 'leave', 'stop'] as const)('cancels the timer on %s', action => {
    const f = fixture(); f.phone.join(CODE, 'Fern'); f.clock.advance(10000); f.phone[action]();
    f.clock.advance(20000); expect(f.view.state).not.toBe('could-not-connect');
    expect(f.clock.tasks.size).toBe(0); f.phone.stop();
  });
});

it('TR-064 game theme applies from starting through play and pause, then resets in the lobby', () => {
  const f = fixture(); f.phone.join(CODE, 'Fern'); f.dial.onState('control-open'); f.seat();
  f.dial.onControl({ v: 1, t: 'picker-state', revision: 1, screen: 'starting', game: { id: 'tabao-rush', name: 'Tabao Rush', blurb: 'Cook', min: 1, max: 8 }, leaderName: 'Fern', reason: null, failed: false });
  expect(f.view.theme).toBe('tabao-rush');
  for (const phase of ['playing', 'paused', 'lobby'] as const) {
    if (phase === 'lobby') f.dial.onControl({ v: 1, t: 'picker-state', revision: 2, screen: 'lobby', game: null, leaderName: 'Fern', reason: null, failed: false });
    f.dial.onControl({ v: 1, t: 'room', phase, players: 1, leader: true, team: null });
    expect(f.view.theme).toBe(phase === 'lobby' ? 'console' : 'tabao-rush');
  }
  f.phone.stop();
});

it('PLAT-034 name choices are separate from game-private content and send a room claim', () => {
  const f = fixture(); f.phone.join(CODE, 'New'); f.dial.onState('control-open');
  f.dial.onControl({ v: 1, t: 'view', rev: 0, view: { kind: 'rejoin-seats', players: [{ seat: 2, colour: 1, name: 'Randy' }] } });
  expect(f.view.rejoinSeats).toEqual([{ seat: 2, colour: 1, name: 'Randy' }]);
  f.phone.claimSeat(2);
  expect(f.sent.at(-1)).toMatchObject({ t: 'action', viewRev: null, data: { control: 'rejoin-seat', seat: 2 } });
  f.seat('Randy'); expect(f.view.rejoinSeats).toBeUndefined(); f.phone.stop();
});

it('PLAT-034 a claimed phone returns to normal join when the original browser retakes the seat', () => {
  const f = fixture(); f.phone.join(CODE, 'New'); f.dial.onState('control-open');
  f.phone.claimSeat(2); f.seat('Randy');
  f.dial.onControl({ v: 1, t: 'close', reason: 'replaced' });
  expect(f.view).toMatchObject({ state: 'entry', seat: null, leader: false });
  expect(f.view.rejoinSeats).toBeUndefined();
  f.phone.join(CODE, 'New'); f.dial.onState('control-open');
  expect(f.sent.at(-1)).toMatchObject({ t: 'hello', name: 'New' });
  f.dial.onControl({ v: 1, t: 'view', rev: 0, view: { kind: 'rejoin-seats', players: [{ seat: 3, colour: 2, name: 'Cloud' }] } });
  expect(f.view.rejoinSeats).toEqual([{ seat: 3, colour: 2, name: 'Cloud' }]);
  f.phone.stop();
});

describe('TR-020 sampled phone controls', () => {
  function playing() {
    const f = fixture(); f.phone.join(CODE, 'Fern'); f.seat();
    f.dial.onControl({ v: 1, t: 'room', phase: 'playing', players: 2, leader: true, team: null });
    f.dial.onControl({ v: 1, t: 'layout', rev: 4, layout: { revision: 4, controls: [
      { kind: 'stick', id: 'move' },
      { kind: 'button', id: 'cross', button: 'face-bottom', label: 'Pick' },
      { kind: 'button', id: 'circle', button: 'face-right', label: 'Act' },
      { kind: 'options', id: 'ready', options: [{ id: 'yes', label: 'Ready' }] },
    ] } });
    f.dial.onControl({ v: 1, t: 'view', rev: 8, view: null });
    f.sampled.mockClear();
    return f;
  }
  it('NET-005 CTRL-005 disconnect clears held stick and buttons at the sender boundary', () => {
    const f = playing();
    f.phone.controllerInput({ control: 'move', revision: 4, phase: 'change', value: { x: -1, y: 0 } });
    f.phone.controllerInput({ control: 'circle', revision: 4, phase: 'press', value: true });
    expect(f.sampled).toHaveBeenLastCalledWith(32, { stickX: -1, stickY: 0, tilt: null });
    f.sampled.mockClear();
    f.dial.onState('closed');
    expect(f.view.connected).toBe(false);
    expect(f.sampled).toHaveBeenLastCalledWith(0, { stickX: 0, stickY: 0, tilt: null });
    f.phone.stop();
  });
  it('sends stick axes and explicit release through the sampled sender only', () => {
    const f = playing();
    f.phone.controllerInput({ control: 'move', revision: 4, phase: 'change', value: { x: 0.75, y: -0.5 } });
    expect(f.sampled).toHaveBeenLastCalledWith(0, { stickX: 0.75, stickY: -0.5, tilt: null });
    f.phone.controllerInput({ control: 'move', revision: 4, phase: 'release', value: { x: 0.75, y: -0.5 } });
    expect(f.sampled).toHaveBeenLastCalledWith(0, { stickX: 0, stickY: 0, tilt: null });
    expect(f.sent).toEqual([]); f.phone.stop();
  });
  it('keeps a tap as exactly one action and ignores its release', () => {
    const f = playing();
    f.phone.controllerInput({ control: 'ready', revision: 4, phase: 'choose', value: 'yes' });
    f.phone.controllerInput({ control: 'ready', revision: 4, phase: 'release', value: 'yes' });
    expect(f.sent).toEqual([{ v: 1, t: 'action', rev: 4, viewRev: 8, data: { control: 'ready', value: 'yes' } }]);
    expect(f.sampled).not.toHaveBeenCalled(); f.phone.stop();
  });
  it('preserves axes and simultaneous held buttons on press and release', () => {
    const f = playing();
    f.phone.controllerInput({ control: 'move', revision: 4, phase: 'change', value: { x: 1, y: 0 } });
    for (const [control, phase] of [['cross', 'press'], ['circle', 'press'], ['cross', 'release'], ['circle', 'release']] as const) {
      f.phone.controllerInput({ control, revision: 4, phase, value: phase === 'press' });
    }
    expect(f.sampled.mock.calls.map(call => call[0])).toEqual([0, 16, 48, 32, 0]);
    expect(f.sampled.mock.calls.every(call => call[1].stickX === 1)).toBe(true);
    expect(f.sent).toEqual([]); f.phone.stop();
  });
});
