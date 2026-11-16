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

describe('PLAT-007 automatic seat return over real signalling and simulated data channels', () => {
  it.each(['sleep', 'reload', 'drop'] as const)('%s at 1, 60 and 119 seconds keeps identity and private state', async mode => {
    for (const gap of [1000, 60000, 119000]) {
      const r = await rig(); const p = r.phones[0]; if (!p) throw new Error('Missing phone');
      const session = r.start(); await settle(r.clock);
      const before = r.room.room.players[0];
      const state = session.state;
      if (!state) throw new Error('Missing match');
      const privateBefore = p.messages.findLast(m => m.t === 'view');
      const score = fixture.results(state).players[0]?.score;
      let returning = p.driver;
      if (mode === 'reload') { p.driver.stop(); }
      else if (mode === 'sleep') p.lifecycle('sleep');
      else {
        r.server.offlinePhones = true;
        p.wire?.peer?.close();
      }
      await settle(r.clock); r.clock.advance(gap);
      if (mode === 'reload') returning = createPhoneReconnect(p.options);
      else { r.server.offlinePhones = false; p.lifecycle('wake'); }
      await settle(r.clock);
      expect(returning.state).toBe('back-in-seat');
      const after = r.room.room.players[0];
      expect(after).toMatchObject({ seat: before?.seat, colour: before?.colour,
        name: before?.name, seatToken: before?.seatToken, disconnectedAt: null });
      expect(session.state).toEqual(state);
      expect(fixture.results(session.state).players[0]?.score).toBe(score);
      expect(p.messages.findLast(m => m.t === 'view')).toMatchObject({
        t: 'view', view: privateBefore && 'view' in privateBefore ? privateBefore.view : null,
      });
      // Reconnect reset accepts sequence zero at once, with no acknowledgement barrier.
      expect(r.sent.slice(-2).map(s => s.kind)).toEqual(['layout', 'view']);
      p.wire?.peer?.inputSender?.change(1, { stickX: 0, stickY: 0, tilt: null });
      await settle(r.clock); session.advance(1000 / 60);
      expect(session.state.presses).toBe(1);
      returning.stop(); r.stop();
    }
  });
  it('PLAT-007 121 seconds expires the identity and follows fresh joining rules', async () => {
    const r = await rig(); const p = r.phones[0]; if (!p) throw new Error('Missing phone');
    const old = r.room.room.players[0]?.seatToken;
    p.lifecycle('sleep'); await settle(r.clock); r.clock.advance(121000);
    p.lifecycle('wake'); await settle(r.clock);
    expect(p.states).toContain('seat-expired');
    expect(p.driver.state).toBe('back-in-seat');
    expect(r.room.room.players[0]?.seatToken).not.toBe(old);
    r.stop();
  });
  it.each(['pause', 'teams', 'leader'] as const)('PLAT-007 returns during %s', async mode => {
    const r = await rig(2, mode === 'teams'); const session = r.start();
    const p = r.phones[0]; if (!p) throw new Error('Missing phone');
    if (mode === 'pause') session.pause('seat-2');
    const team = r.room.room.players[0]?.team;
    p.lifecycle('sleep'); await settle(r.clock); r.clock.advance(60000);
    p.lifecycle('wake'); await settle(r.clock);
    expect(p.driver.state).toBe('back-in-seat');
    expect(r.room.room.players[0]?.team).toBe(team);
    expect(session.paused).toBe(mode === 'pause');
    expect(r.room.room.leader).toBe(2);
    r.stop();
  });
  it('PLAT-007 eight phones drop and return together with no retyping', async () => {
    const r = await rig(8); r.start();
    const before = r.room.room.players.map(p => [p.seat, p.name, p.colour, p.seatToken]);
    for (const p of r.phones) p.lifecycle('sleep');
    await settle(r.clock); r.clock.advance(119000);
    for (const p of r.phones) p.lifecycle('wake');
    await settle(r.clock);
    // Four opening slots: the remaining phones retry with bounded back-off.
    r.clock.advance(250); await settle(r.clock);
    expect(r.phones.map(p => p.driver.state)).toEqual(Array(8).fill('back-in-seat'));
    expect(r.room.room.players.map(p => [p.seat, p.name, p.colour, p.seatToken])).toEqual(before);
    r.stop();
  });
  it('PLAT-007 a newer token holder replaces and closes the older phone', async () => {
    const r = await rig(); const first = r.phones[0]; if (!first) throw new Error('Missing phone');
    const storage = new MemoryStorage(); storage.data = new Map(first.storage.data);
    // Do not replace signalling identity: the host, not signalling, arbitrates seat tokens.
    const stored = createPhoneSeatStore(storage).read(); if (!stored) throw new Error('Missing seat');
    createPhoneSeatStore(storage).write({ ...stored, roomToken: null });
    const second = r.phone(9, storage); await settle(r.clock);
    expect(second.driver.state).toBe('back-in-seat');
    expect(first.driver.state).toBe('replaced');
    expect(r.room.room.players).toHaveLength(1);
    expect(first.storage.data.size).toBe(0);
    expect(r.server.urls.every(url => !url.includes(stored.seatToken))).toBe(true);
    second.driver.stop(); r.stop();
  });
});


describe('PLAT-009 host reload with automatic phone recovery', () => {
  it('phones keep waiting on signalling when the host returns after three minutes', async () => {
    const r = await rig(8); r.start();
    const tokens = r.room.room.players.map(p => p.seatToken);
    await r.reloadHost(180000);
    r.clock.advance(1000); await settle(r.clock);
    expect(r.phones.map(p => p.driver.state)).toEqual(Array(8).fill('back-in-seat'));
    expect(r.room.room.players.map(p => p.seatToken)).toEqual(tokens);
    r.stop();
  });
  it.each(['lobby', 'match', 'pause', 'teams', 'disconnected'] as const)(
    'eight phones recover after host reload during %s', async mode => {
      const r = await rig(8, mode === 'teams');
      if (mode !== 'lobby') {
        const session = r.start();
        if (mode === 'pause') session.pause('seat-1');
      }
      if (mode === 'disconnected') r.phones[2]?.lifecycle('sleep');
      await settle(r.clock);
      if (mode === 'disconnected') r.clock.advance(119000);
      const before = r.room.room.players.map(p => [p.seat, p.name, p.colour, p.team, p.seatToken]);
      const restored = await r.reloadHost();
      if (mode === 'disconnected') {
        // The original hold expires across reload; the absent phone must get a fresh seat.
        r.clock.advance(2000); r.phones[2]?.lifecycle('wake'); await settle(r.clock);
      }
      r.clock.advance(1000); await settle(r.clock);
      expect(restored.scores).toEqual({ 'seat-1': 83 });
      expect(r.room.room.phase).toBe('lobby');
      const after = [...r.room.room.players].sort((a, b) => a.seat - b.seat)
        .map(p => [p.seat, p.name, p.colour, p.team, p.seatToken]);
      if (mode === 'disconnected') {
        expect(after.map(p => p.slice(0, 4))).toEqual(before.map(p => p.slice(0, 4)));
        expect(after[2]?.[4]).not.toBe(before[2]?.[4]);
        expect(r.phones[2]?.states).toContain('seat-expired');
      } else expect(after).toEqual(before);
      expect(r.room.room.leader).toBe(1);
      expect(r.phones.map(p => p.driver.state)).toEqual(Array(8).fill('back-in-seat'));
      expect(r.phones.some(p => p.states.includes('host-disconnected'))).toBe(true);
      r.stop();
    });
});
