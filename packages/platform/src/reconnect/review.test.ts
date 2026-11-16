import { describe, expect, it } from 'vitest';
import { createInputBuffer } from '@kaki/sim-core';
import type { HostMessage, Json } from '@kaki/protocol';
import { createHostInput, createHostTransport, createPhoneTransport } from
  '../../../netcode/src/index';
import type { Peer } from '../../../netcode/src/index';
import { createSession } from '../session';
import type { SessionTransport } from '../session';
import type { FixtureState } from '../session/session.fixture';
import { fixture } from '../session/session.fixture';
import type { RoomState } from '../room/room';
import { createHostSnapshotStore, restoreHost } from './host-store';
import { createRoom } from '../room/room';
import { createPhoneReconnect } from './phone';
import type { PhoneReconnectOptions, PhoneReconnectState } from './phone';
import { createPhoneSeatStore } from './phone-store';
import { createReconnectRoom } from './host-room';
import { Clock, CODE, MemoryStorage, PeerHub, SECRET, SignalRoom, settle } from './testing.fixture';

async function rig(count = 1, teams = false) {
  const clock = new Clock(); const server = new SignalRoom(clock); const hub = new PeerHub(clock);
  const peers = new Map<string, Peer>();
  let serial = 0;
  let runner: ReturnType<typeof createSession<FixtureState, { steps: number }, { step: number }>> | undefined;
  function adapter(initial: RoomState) { return createReconnectRoom({ room: initial, clock,
    mintToken: () => `seat-${String(++serial)}`.padEnd(32, 'x'),
    session: { updateRoom: next => runner?.updateRoom(next) },
    seated(id, seat) { peers.get(id)?.bindInput(createHostInput(buffer, `seat-${String(seat)}`)); },
  }); }
  let room = adapter(createRoom());
  let restoring = false;
  const pendingPeers: [string, Peer][] = [];
  const pendingControls: [string, unknown][] = [];
  let acknowledge: ((message: { code: string; hostToken: string; reopened: boolean }) => void) | undefined;
  const buffer = createInputBuffer<string>({ axisCount: 4, seqModulus: 65536, staleAfterSteps: 15 });
  async function openHost() { return createHostTransport({ clock, socket: server.socket, baseUrl: 'https://signal',
    credentials: { code: CODE, hostToken: SECRET }, factory: hub.factory,
    fetch: () => { throw new Error('Stored host must not create a room'); },
    onRoom(message) { acknowledge?.(message); }, onPeer(id, peer) {
      peers.set(id, peer);
      if (restoring) pendingPeers.push([id, peer]); else room.attach(id, peer);
    },
    onState(state, id) { if (state === 'closed' || state === 'disconnected') room.dropped(id); },
    onControl(message, _identity, id) {
      if (restoring) pendingControls.push([id, message]); else room.receive(id, message);
    },
    onLink() { /* No shell. */ }, onError() { /* Driver handles link recovery. */ },
  }); }
  let host = await openHost();
  await settle(clock);
  function phone(index: number, storage = new MemoryStorage()) {
    const states: PhoneReconnectState[] = [];
    const messages: HostMessage[] = [];
    let lifecycle: (event: 'sleep' | 'wake') => void = () => { /* Not subscribed yet. */ };
    let wire: ReturnType<typeof createPhoneTransport> | undefined;
    const options: PhoneReconnectOptions = {
      clock, store: createPhoneSeatStore(storage), initial: { code: CODE, nickname: `Guest ${String(index)}` },
      state: state => states.push(state), message: message => messages.push(message),
      lifecycle: { subscribe(receive) { lifecycle = receive; return () => { /* No DOM. */ }; } },
      dial(d) {
        wire = createPhoneTransport({ clock, socket: server.socket, baseUrl: 'https://signal',
          code: d.code, roomToken: d.roomToken, factory: hub.factory,
          onPeer: d.onPeer, onJoined: d.onJoined, onError: d.onError,
          onState: d.onState, onControl: d.onControl, onLink() { /* No shell. */ },
          onSignal(m) { if (m.t === 'host') d.onHost(m.present); },
        });
        return wire;
      },
    };
    const driver = createPhoneReconnect(options);
    return { driver, options, storage, states, messages, get wire() { return wire; }, lifecycle(e: 'sleep' | 'wake') { lifecycle(e); } };
  }
  const phones: ReturnType<typeof phone>[] = [];
  // The real core has four opening slots; each connection finishes opening before the next.
  for (let i = 1; i <= count; i++) { phones.push(phone(i)); await settle(clock); }
  if (teams) for (const p of room.room.players)
    room.host({ type: 'team', seat: p.seat, team: p.seat % 2 ? 'red' : 'blue' });
  const sent: { id: string; kind: string }[] = [];
  const transport: SessionTransport = {
    sendLayout(id, layout) {
      sent.push({ id, kind: 'layout' });
      return peers.get(id)?.sendHost({ v: 1, t: 'layout', rev: layout.revision,
        layout: layout as unknown as Json }) ?? false;
    },
    sendPrivateView(id, view) {
      sent.push({ id, kind: 'view' });
      // A new connection starts its own private-view wire revision.
      return peers.get(id)?.sendHost({ v: 1, t: 'view', rev: sent.length,
        view: view as unknown as Json }) ?? false;
    },
    fence() { /* Default immediate reconnect has no fence. */ },
    status() { /* No shell. */ }, subscribe() { return () => { /* No shell. */ }; },
  };
  function start() {
    runner = createSession({ game: fixture, settings: { steps: 90000 }, seed: 83,
      room: room.room, context: { data: {}, saved: null, teams }, buffer, transport,
      publicView() { /* No renderer. */ }, event(e) {
        if (e.type === 'paused') room.host({ type: 'phase',
          phase: e.paused ? 'paused' : 'playing', allowRunningJoin: true });
      } });
    room.host({ type: 'phase', phase: 'playing', allowRunningJoin: true });
    return runner;
  }
  async function reloadHost(absenceMs = 250) {
    const storage = new MemoryStorage();
    const store = createHostSnapshotStore({ storage, clock, validateSelection: () => false });
    store.write({ credentials: host.credentials, createdAt: 1000, room: room.room,
      scores: { 'seat-1': 83 }, results: [], selection: null });
    runner = undefined; room.stop(); host.stop(); peers.clear(); restoring = true;
    clock.advance(absenceMs); await settle(clock);
    const restored = await restoreHost({ store, clock, reopen: async (_credentials, registerStop) => {
      const ack = new Promise<{ code: string; hostToken: string; reopened: boolean }>(resolve => {
        acknowledge = resolve;
      });
      host = await openHost(); registerStop(() => { host.stop(); }); await settle(clock);
      return { ...await ack, link: host };
    } });
    if (!restored || restored.retryable) throw new Error('Restore failed');
    acknowledge = undefined; room = adapter(restored.room); restoring = false;
    for (const [id, peer] of pendingPeers.splice(0)) room.attach(id, peer);
    for (const [id, message] of pendingControls.splice(0)) room.receive(id, message);
    clock.advance(250); await settle(clock);
    return restored;
  }
  function stop() { for (const p of phones) p.driver.stop(); room.stop(); host.stop(); }
  return { clock, server, hub, peers, get room() { return room; }, phones, phone, start, sent, stop, buffer, host, reloadHost };
}
import { applyHostEvent, applyPhoneEvent } from '../room/room';
import { createHostCheckpoints, HOST_STORAGE_KEY } from './host-store';
import type { HostSnapshotInput } from './host-store';
import { storageBytes } from './storage';
import type { Results } from '../game/types';
import type { PhoneReconnectDial } from './phone';

function hostSetup(count = 8, name = (i: number) => `Guest ${String(i)}`) {
  const clock = new Clock(); const storage = new MemoryStorage();
  let room = createRoom();
  for (let i = 1; i <= count; i++) room = applyPhoneEvent(room,
    { deviceId: `d${String(i)}`, connectionId: `c${String(i)}` },
    { type: 'join', name: name(i), seatToken: String(i).repeat(128) }, clock.now()).state;
  const input: HostSnapshotInput = { credentials: { code: CODE, hostToken: SECRET }, createdAt: 1000,
    room, scores: {}, results: [], selection: null };
  const store = createHostSnapshotStore({ storage, clock, validateSelection: () => true });
  return { clock, storage, input, store };
}
const ok = () => Promise.resolve({ code: CODE, hostToken: SECRET, reopened: true,
  link: { stop() { /* none */ } } });

describe('review: PLAT-007 boundaries', () => {
  it.each([120000, 120001])('phone reload after exactly %i ms', async gap => {
    const r = await rig(); const p = r.phones[0]; if (!p) throw new Error('x');
    const before = r.room.room.players[0];
    p.driver.stop(); await settle(r.clock); r.clock.advance(gap);
    const back = createPhoneReconnect(p.options); await settle(r.clock);
    if (gap === 120000) {
      expect(back.state).toBe('back-in-seat');
      expect(r.room.room.players[0]?.seatToken).toBe(before?.seatToken);
    } else {
      expect(p.states).toContain('seat-expired');
      expect(r.room.room.players[0]?.seatToken).not.toBe(before?.seatToken);
    }
    back.stop(); r.stop();
  });
  it('network drop with no wake: phone retries by itself and returns at 60 s', async () => {
    const r = await rig(); const p = r.phones[0]; if (!p) throw new Error('x');
    r.server.offlinePhones = true; p.wire?.peer?.close(); await settle(r.clock);
    r.clock.advance(60000); r.server.offlinePhones = false;
    r.clock.advance(30000); await settle(r.clock); r.clock.advance(1000); await settle(r.clock);
    expect(p.driver.state).toBe('back-in-seat');
    r.stop();
  });
  it('after the hold the phone retries slowly and recovers', async () => {
    const r = await rig(); const p = r.phones[0]; if (!p) throw new Error('x');
    r.server.offlinePhones = true; p.wire?.peer?.close(); await settle(r.clock);
    r.clock.advance(125000); await settle(r.clock);
    r.server.offlinePhones = false;
    // Give transport promises their microtasks between retry deadlines.
    for (let i = 0; i < 75; i++) { r.clock.advance(8000); await settle(r.clock); }
    expect(p.states).toContain('hold-over');
    expect(p.driver.state).toBe('back-in-seat');
    expect(r.room.room.players).toHaveLength(1);
    r.stop();
  });
});

describe('review: phone code precedence', () => {
  it('a fresh room B code overrides a stored room A seat', () => {
    const storage = new MemoryStorage(); const store = createPhoneSeatStore(storage);
    store.write({ code: 'AAAA1111', seatToken: SECRET, nickname: 'Guest', roomToken: null, droppedAt: null });
    const codes: string[] = [];
    const d = createPhoneReconnect({ clock: new Clock(), store, initial: { code: 'BBBB2222', nickname: 'New' },
      state: () => undefined, dial(o: PhoneReconnectDial) { codes.push(o.code); return { stop() { /* */ } }; } });
    expect(codes).toEqual(['BBBB2222']);
    d.stop();
  });
  it('failed resume send and lobby broadcast retry resume without hello', () => {
    const storage = new MemoryStorage(); const store = createPhoneSeatStore(storage);
    store.write({ code: CODE, seatToken: SECRET, nickname: 'Guest', roomToken: null, droppedAt: null });
    const sent: string[] = []; let first = true; let dial: PhoneReconnectDial | undefined;
    const d = createPhoneReconnect({ clock: new Clock(), store, state: () => undefined,
      dial(o) { dial = o; o.onPeer({ sendPhone(m) { if (first) { first = false; return false; } sent.push(m.t); return true; } });
        return { stop() { /* */ } }; } });
    dial?.onState('control-open');
    dial?.onControl({ v: 1, t: 'room', phase: 'lobby', leader: false, players: 1, team: null });
    expect(sent).toEqual(['resume']);
    d.stop();
  });
});

describe('review: PLAT-009 holds and snapshot', () => {
  it('a phone gone for ten minutes expires through repeated host reloads', async () => {
    const r = hostSetup(2);
    let room = applyHostEvent(r.input.room, { type: 'disconnect', seat: 2 }, r.clock.now()).state;
    for (let i = 0; i < 6; i++) {
      r.clock.advance(1100); expect(r.store.write({ ...r.input, room })).toBe(true);
      r.clock.advance(100000);
      const restored = await restoreHost({ store: r.store, clock: r.clock, reopen: ok });
      if (!restored || restored.retryable) throw new Error('restore failed');
      // seat 1 comes back, seat 2 never does
      room = applyPhoneEvent(restored.room, { deviceId: 'n1', connectionId: `n${String(i)}` },
        { type: 'resume', seatToken: '1'.repeat(128) }, r.clock.now()).state;
    }
    expect(r.clock.now() - 1000).toBeGreaterThan(600000);
    expect(room.players.map(p => p.seat)).toEqual([1]);
  });
  it('results growth keeps only the last result', () => {
    const r = hostSetup(8);
    expect(r.store.write(r.input)).toBe(true);
    const one: Results = { mode: 'players', players: Array.from({ length: 8 }, (_, i) => ({
      id: `seat-${String(i + 1)}`, place: i + 1, score: 1234, joinedMidGame: false })),
      extras: { personalBest: 0, solo: false } };
    const size = storageBytes(JSON.stringify(one));
    const n = Math.ceil(65536 / size) + 1;
    r.clock.advance(1000);
    expect(r.store.write({ ...r.input, results: Array(n).fill(one) })).toBe(true);
    expect(r.store.read()?.results).toEqual([one]);
  });
  it('transient reopen failure keeps the snapshot and returns retryable', async () => {
    const r = hostSetup(2); r.store.write(r.input);
    const res = await restoreHost({ store: r.store, clock: r.clock, reopen: () => Promise.reject(new Error('offline')) });
    expect(res).toEqual({ retryable: true }); expect(r.store.read()).not.toBeNull();
  });
  it('a clock 1 ms behind writtenAt accepts the snapshot', () => {
    const r = hostSetup(2); r.clock.advance(5000); r.store.write(r.input);
    const back = new Clock(); back.time = r.clock.time - 1;
    const other = createHostSnapshotStore({ storage: r.storage, clock: back, validateSelection: () => true });
    expect(other.read()).not.toBeNull(); expect(r.storage.getItem(HOST_STORAGE_KEY)).not.toBeNull();
  });
  it('8 long names in 4-byte script fit; size reported', () => {
    const r = hostSetup(8, i => `${'𠀀'.repeat(10)} ${String(i)}`);
    expect(r.input.room.players).toHaveLength(8); expect(r.input.room.players.every(p => p.name.startsWith('𠀀'))).toBe(true);
    expect(r.store.write(r.input)).toBe(true);
    expect(storageBytes(r.storage.getItem(HOST_STORAGE_KEY) ?? '')).toBeLessThanOrEqual(65536);
  });
  it.each([
    '{"__proto__":{"polluted":1},"version":1}',
    '[' .repeat(40) + ']'.repeat(40),
    'not json',
  ])('rejects %s safely', text => {
    const r = hostSetup(1); r.storage.setItem(HOST_STORAGE_KEY, text);
    expect(r.store.read()).toBeNull(); expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(r.storage.getItem(HOST_STORAGE_KEY)).toBeNull();
  });
  it('snapshot with __proto__ key added to a valid snapshot is rejected', () => {
    const r = hostSetup(1); r.store.write(r.input);
    const text = r.storage.getItem(HOST_STORAGE_KEY) ?? '';
    r.storage.setItem(HOST_STORAGE_KEY, text.replace('"scores":{}', '"scores":{"__proto__":{"x":1}}'));
    expect(r.store.read()).toBeNull();
  });
  it('a second page-hide flushes pending changes after bfcache return', () => {
    const r = hostSetup(1); let score = 1;
    let hide: () => void = () => undefined;
    const cp = createHostCheckpoints({ store: r.store, clock: r.clock,
      capture: () => ({ ...r.input, scores: { 'seat-1': score } }),
      lifecycle: { subscribe(f) { hide = f; return () => undefined; } } });
    hide(); r.clock.advance(5000); score = 2; cp.checkpoint();
    r.clock.advance(100); score = 3; cp.checkpoint(); hide();
    expect(r.storage.getItem(HOST_STORAGE_KEY)).toContain('"seat-1":3');
    cp.stop();
  });
});
