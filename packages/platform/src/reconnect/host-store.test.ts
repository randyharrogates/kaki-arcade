import { describe, expect, it } from 'vitest';
import { createHostPairing } from '../../../netcode/src/index';
import { applyHostEvent, applyPhoneEvent, createRoom } from '../room/room';
import { createHostCheckpoints, createHostSnapshotStore, HOST_SNAPSHOT_BYTES,
  HOST_STORAGE_KEY, HOST_WRITE_INTERVAL_MS, restoreHost } from './host-store';
import type { HostSnapshotInput } from './host-store';
import { createPhoneSeatStore, PHONE_STORAGE_KEY } from './phone-store';
import { Clock, CODE, MemoryStorage, SECRET, SignalRoom, settle } from './testing.fixture';
import { storageBytes } from './storage';

function setup(count = 8) {
  const clock = new Clock(); const storage = new MemoryStorage();
  let room = createRoom();
  for (let i = 1; i <= count; i++) room = applyPhoneEvent(room,
    { deviceId: `d${String(i)}`, connectionId: `c${String(i)}` },
    { type: 'join', name: `Guest ${String(i)}`, seatToken: String(i).repeat(32) }, clock.now()).state;
  const input: HostSnapshotInput = { credentials: { code: CODE, hostToken: SECRET }, createdAt: 1000,
    room, scores: { 'seat-1': 83, 'seat-2': 42 }, results: [{ mode: 'players', players: [
      { id: 'seat-1', place: 1, score: 83, joinedMidGame: false },
    ] }], selection: null };
  const store = createHostSnapshotStore({ storage, clock,
    validateSelection: (id, settings) => id === 'test-game' && settings !== null });
  return { clock, storage, input, store };
}
function reopened() {
  return Promise.resolve({ code: CODE, hostToken: SECRET, reopened: true,
    link: { stop() { /* Nothing opened in this unit test. */ } } });
}

describe('PLAT-009 bounded host persistence and strict restore', () => {
  it.each(['lobby', 'playing', 'paused', 'results'] as const)('restores %s to lobby with names, teams, leader and scores', async phase => {
    const r = setup();
    let room = applyHostEvent(r.input.room,
      { type: 'team', seat: 1, team: 'blue' }, r.clock.now()).state;
    room = applyHostEvent(room, { type: 'phase', phase, allowRunningJoin: true }, r.clock.now()).state;
    room = applyHostEvent(room, { type: 'disconnect', seat: 3 }, r.clock.now()).state;
    const input = { ...r.input, room };
    expect(r.store.write(input)).toBe(true);
    r.clock.advance(110000);
    const restored = await restoreHost({ store: r.store, clock: r.clock, reopen: reopened });
    if (restored?.retryable) throw new Error('Unexpected retryable restore');
    expect(restored?.room).toMatchObject({ phase: 'lobby', leader: 1, allowRunningJoin: false });
    expect(restored?.room.players).toHaveLength(8);
    expect(restored?.room.players.every(p => p.disconnectedAt === (p.seat === 3 ? 1000 : r.clock.now()))).toBe(true);
    expect(restored?.room.players[0]).toMatchObject({ seat: 1, colour: 0, name: 'Guest 1', team: 'blue' });
    expect(restored?.scores).toEqual(input.scores);
    expect(restored?.results).toEqual(input.results);
    expect(restored?.match).toBe('lost');
    expect(r.storage.getItem(HOST_STORAGE_KEY)).not.toContain('deviceId":"d');
  });
  it('PLAT-009 server acknowledgement reopens with the stored secret; absent rooms start clean', async () => {
    const r = setup(); const server = new SignalRoom(r.clock);
    const first = await createHostPairing({ clock: r.clock, socket: server.socket,
      baseUrl: 'https://signal', credentials: r.input.credentials,
      fetch: () => { throw new Error('No new room'); }, onError() { /* No error. */ },
      onMessage() { /* First open. */ } });
    await settle(r.clock); first.stop();
    expect(r.store.write(r.input)).toBe(true);
    const restoring = restoreHost({ store: r.store, clock: r.clock, reopen: async (credentials, registerStop) => {
      let acknowledge: ((value: { code: string; hostToken: string; reopened: boolean }) => void)
        | undefined;
      const ack = new Promise<{ code: string; hostToken: string; reopened: boolean }>(resolve => {
        acknowledge = resolve;
      });
      const link = await createHostPairing({ clock: r.clock, socket: server.socket,
        baseUrl: 'https://signal', credentials,
        fetch: () => { throw new Error('Restore cannot POST'); }, onError() { /* No error. */ },
        onMessage(message) { if (message.t === 'created') acknowledge?.(message); } });
      registerStop(() => { link.stop(); });
      await settle(r.clock);
      return { ...await ack, link };
    } });
    const restored = await restoring;
    if (restored?.retryable) throw new Error('Unexpected retryable restore');
    expect(restored?.room.players).toHaveLength(8);
    restored?.link.stop();
    r.clock.advance(1000); r.store.write(r.input);
    expect(await restoreHost({ store: r.store, clock: r.clock,
      reopen: () => Promise.reject(new Error('room-not-found')) })).toBeNull();
    expect(r.store.read()).toBeNull();
  });
  it.each([
    ['broken JSON', '{'],
    ['oversized', 'x'.repeat(HOST_SNAPSHOT_BYTES + 1)],
    ['old version', JSON.stringify({ version: 0 })],
  ])('PLAT-009 rejects %s', (_name, text) => {
    const r = setup(); r.storage.data.set(HOST_STORAGE_KEY, text);
    expect(r.store.read()).toBeNull(); expect(r.storage.data.size).toBe(0);
  });
  it('PLAT-009 rejects field mismatch, duplicate seats/tokens, foreign room, stale and future times', () => {
    const r = setup(); r.store.write(r.input);
    const original = r.storage.getItem(HOST_STORAGE_KEY); if (!original) throw new Error('Missing snapshot');
    const probes = [
      (v: Record<string, unknown>) => {
        const room = v.room as { players: Record<string, unknown>[] };
        const first = room.players[0]; if (!first) throw new Error('No player');
        room.players[1] = { ...first };
      },
      (v: Record<string, unknown>) => {
        const room = v.room as { players: Record<string, unknown>[] };
        const first = room.players[0]; if (!first) throw new Error('No player');
        first.colour = 7;
      },
      (v: Record<string, unknown>) => { v.extra = true; },
      (v: Record<string, unknown>) => { v.writtenAt = 6001; },
      (v: Record<string, unknown>) => { v.selection = { id: 'foreign-game', settings: {}, saved: null }; },
      (v: Record<string, unknown>) => { v.scores = { 'seat-1': '83' }; },
      (v: Record<string, unknown>) => { v.results = [{ mode: 'players', players: [{ id: 'seat-9' }] }]; },
    ];
    for (const mutate of probes) {
      const value = JSON.parse(original) as Record<string, unknown>; mutate(value);
      r.storage.data.set(HOST_STORAGE_KEY, JSON.stringify(value)); expect(r.store.read()).toBeNull();
    }
    r.storage.data.set(HOST_STORAGE_KEY, original); expect(r.store.read('BCDF2346')).toBeNull();
    r.storage.data.set(HOST_STORAGE_KEY, original); r.clock.advance(43200000);
    expect(r.store.read()).toBeNull();
  });
  it('PLAT-009 rejects a foreign created acknowledgement and closes its socket', async () => {
    const r = setup(); r.store.write(r.input); let stopped = false;
    expect(await restoreHost({ store: r.store, clock: r.clock,
      reopen: () => Promise.resolve({ code: 'BCDF2346', hostToken: SECRET, reopened: true,
        link: { stop() { stopped = true; } } }) })).toBeNull();
    expect(stopped).toBe(true); expect(r.store.read()).toBeNull();
  });
  it('DATA-002 storage denial is contained and the good snapshot survives', async () => {
    const r = setup(); r.store.write(r.input); r.storage.fail = true;
    expect(r.store.read()).toBeNull(); r.clock.advance(1000);
    expect(r.store.write(r.input)).toBe(false);
    expect(await restoreHost({ store: r.store, clock: r.clock, reopen: reopened })).toBeNull();
    r.storage.fail = false; expect(r.store.read()).not.toBeNull();
  });
  it('DATA-002 bounds UTF-8 bytes, coalesces safe points, never captures per step', () => {
    const r = setup(); let captures = 0;
    const checkpoints = createHostCheckpoints({ clock: r.clock, store: r.store,
      capture() { captures++; return r.input; } });
    checkpoints.checkpoint();
    for (let i = 0; i < 12000; i++) { /* Simulation steps have no checkpoint hook. */ }
    expect(captures).toBe(1); expect(r.storage.writes).toBe(1);
    for (let i = 0; i < 100; i++) checkpoints.checkpoint();
    r.clock.advance(HOST_WRITE_INTERVAL_MS - 1); expect(captures).toBe(1);
    r.clock.advance(1); expect(captures).toBe(2); expect(r.storage.writes).toBe(2);
    expect(storageBytes(r.storage.getItem(HOST_STORAGE_KEY) ?? '')).toBeLessThanOrEqual(HOST_SNAPSHOT_BYTES);
    r.clock.advance(1000);
    expect(r.store.write({ ...r.input, selection: { id: 'test-game', settings: {},
      saved: '🍊'.repeat(HOST_SNAPSHOT_BYTES / 4) } })).toBe(true);
    expect(r.store.read()?.selection).toBeNull(); checkpoints.stop();
  });
});

describe('PLAT-007 phone session storage', () => {
  it('validates reads, clears on explicit leaving and contains denied storage', () => {
    const storage = new MemoryStorage(); const store = createPhoneSeatStore(storage);
    const seat = { code: CODE, seatToken: SECRET, nickname: 'Guest', roomToken: null, droppedAt: null };
    expect(store.write(seat)).toBe(true); expect(store.read()).toEqual(seat);
    store.clear(); expect(store.read()).toBeNull();
    storage.data.set(PHONE_STORAGE_KEY, '{bad'); expect(store.read()).toBeNull();
    storage.fail = true; expect(store.write(seat)).toBe(false); expect(store.read()).toBeNull();
  });
});

describe('PLAT-009 restore lifecycle boundaries', () => {
  it('bounds a silent reopen and closes a socket whose acknowledgement arrives too late', async () => {
    const r = setup(); r.store.write(r.input);
    let acknowledge: ((value: Awaited<ReturnType<typeof reopened>>) => void) | undefined;
    let pendingClosed = false;
    const restoring = restoreHost({ store: r.store, clock: r.clock,
      reopen: (_credentials, registerStop) => {
        registerStop(() => { pendingClosed = true; });
        return new Promise<Awaited<ReturnType<typeof reopened>>>(resolve => { acknowledge = resolve; });
      } });
    r.clock.advance(15000); expect(await restoring).toEqual({ retryable: true });
    expect(pendingClosed).toBe(true);
    let closed = false;
    acknowledge?.({ code: CODE, hostToken: SECRET, reopened: true,
      link: { stop() { closed = true; } } });
    await Promise.resolve(); expect(closed).toBe(true); expect(r.clock.tasks.size).toBe(0);
  });
  it.each([15000, 23001])('leader return at +%i follows the room restore election', async delay => {
    const r = setup(3); r.store.write(r.input); r.clock.advance(1000);
    const restored = await restoreHost({ store: r.store, clock: r.clock, reopen: reopened });
    if (!restored || restored.retryable) throw new Error('No restore');
    let room = applyPhoneEvent(restored.room, { deviceId: 'other', connectionId: 'other' },
      { type: 'resume', seatToken: '2'.repeat(32) }, 5000).state;
    room = applyPhoneEvent(room, { deviceId: 'third', connectionId: 'third' },
      { type: 'resume', seatToken: '3'.repeat(32) }, 13000).state;
    room = applyPhoneEvent(room, { deviceId: 'leader', connectionId: 'leader' },
      { type: 'resume', seatToken: '1'.repeat(32) }, 2000 + delay).state;
    expect(room.leader).toBe(delay < 23000 ? 1 : 2);
    expect(room.players.find(p => p.seat === 1)?.disconnectedAt).toBeNull();
  });
});

describe('DATA-002 lifecycle flush', () => {
  it('captures the latest score before reload, with at most one extra final write', () => {
    const r = setup(); let scores = r.input.scores; let captures = 0;
    let hide: () => void = () => { /* Not subscribed yet. */ };
    const checkpoints = createHostCheckpoints({ store: r.store, clock: r.clock,
      capture() { captures++; return { ...r.input, scores }; },
      lifecycle: { subscribe(receive) { hide = receive; return () => { /* No DOM. */ }; } } });
    checkpoints.checkpoint(); scores = { 'seat-1': 99 }; checkpoints.checkpoint();
    r.clock.advance(10);
    for (let i = 0; i < 100; i++) hide();
    expect(r.store.read()?.scores).toEqual(scores);
    expect(r.storage.writes).toBe(2); expect(captures).toBe(2);
    r.clock.advance(1000); expect(r.storage.writes).toBe(2);
    checkpoints.stop();
  });
  it('a room with an old checkpoint is restored if the server still owns it', async () => {
    const r = setup(); r.store.write(r.input); r.clock.advance(660000);
    const restored = await restoreHost({ store: r.store, clock: r.clock, reopen: reopened });
    if (restored?.retryable) throw new Error('Unexpected retry');
    expect(restored?.room.players).toHaveLength(8);
  });
});

describe('D-086 optional capture and definitive refusals', () => {
  it('drops bad optional values and preserves the last good snapshot on a throwing capture', () => {
    const r = setup();
    const bad = { ...r.input, get results(): HostSnapshotInput['results'] { throw new Error('capture'); },
      selection: { id: 'foreign-game', settings: {}, saved: null } };
    expect(r.store.write(bad)).toBe(true);
    expect(r.store.read()).toMatchObject({ results: [], selection: null });
    const text = r.storage.getItem(HOST_STORAGE_KEY);
    const cp = createHostCheckpoints({ clock: r.clock, store: r.store,
      capture() { throw new Error('capture'); } });
    cp.checkpoint(); cp.flush();
    expect(r.storage.getItem(HOST_STORAGE_KEY)).toBe(text);
    cp.stop();
  });
  it.each(['room-not-found', 'room-expired', 'not-allowed', 'bad-token'])(
    'clears on definitive %s', async code => {
      const r = setup(); r.store.write(r.input);
      expect(await restoreHost({ store: r.store, clock: r.clock,
        reopen: () => Promise.reject(Object.assign(new Error('refused'), { code })) })).toBeNull();
      expect(r.store.read()).toBeNull();
    });
  it('re-arms flush on pageshow even without a checkpoint notification', () => {
    const r = setup(); let score = 1;
    let lifecycle: (event?: 'pageshow' | 'pagehide' | 'hidden') => void = () => undefined;
    const cp = createHostCheckpoints({ store: r.store, clock: r.clock,
      capture: () => ({ ...r.input, scores: { 'seat-1': score } }),
      lifecycle: { subscribe(receive) { lifecycle = receive; return () => undefined; } } });
    lifecycle('pagehide'); lifecycle('pageshow'); score = 2; lifecycle('hidden');
    expect(r.store.read()?.scores).toEqual({ 'seat-1': 2 }); cp.stop();
  });
});
