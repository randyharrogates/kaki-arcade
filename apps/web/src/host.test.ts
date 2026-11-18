import { CLOSED_ROOM_REASON } from './team-setup';
import { describe, expect, it, vi } from 'vitest';
import { HOST_STORAGE_KEY } from '@kaki/platform';
import type { HostCredentials } from '@kaki/platform';
import { PROTOCOL_VERSION as v } from '@kaki/protocol';
import { createHost } from './host';
import type { DialCallbacks, HostDependencies } from './host';
import { lobbyView } from './view-model';
import type { LobbyView } from './view-model';

function fixture() {
  let now = 100;
  let next = 0;
  const tasks = new Map<number, { callback(): void; at: number }>();
  const values = new Map<string, string>();
  let callbacks: DialCallbacks | undefined;
  let lifecycle: ((event?: 'pageshow' | 'pagehide' | 'hidden') => void) | undefined;
  let token = 0;
  const credentials = { code: 'H7KQ9MXR', hostToken: 'host-private-value-1234567890123456' };
  const stop = vi.fn();
  const dial = vi.fn<HostDependencies['dial']>((saved, cb, register) => {
    callbacks = cb; register(stop);
    return Promise.resolve({ credentials: saved ?? credentials, reopened: saved !== undefined, stop });
  });
  const deps: HostDependencies = {
    clock: { now: () => now, schedule: (callback, delay) => { const id = ++next; tasks.set(id, { callback, at: now + delay }); return id; }, cancel: handle => { if (typeof handle === 'number') tasks.delete(handle); } },
    storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } },
    mintToken: () => `seat-private-${String(++token).padStart(24, '0')}`,
    lifecycle: { subscribe: callback => { lifecycle = callback; return () => { lifecycle = undefined; }; } },
    dial,
  };
  function advance(ms: number): void {
    now += ms;
    for (const [id, task] of tasks) if (task.at <= now) { tasks.delete(id); task.callback(); }
  }
  const views: LobbyView[] = [];
  const make = () => createHost(deps, input => { views.push(lobbyView({ ...input, origin: 'https://arcade.example' })); });
  const peer = () => ({ sendHost: vi.fn(() => true), bindIdentity: vi.fn(), close: vi.fn() });
  return { deps, dial, credentials, stop, views, make, peer, values, advance,
    get callbacks() { if (!callbacks) throw new Error('No dial'); return callbacks; },
    lifecycle: (event: 'pageshow' | 'pagehide' | 'hidden') => { lifecycle?.(event); },
  };
}
describe('host wiring (PLAT-001, PLAT-004, PLAT-009, PLAT-010)', () => {
  it('creates a room, authenticates joins, measures quality and expires held seats', async () => {
    const f = fixture(); const host = f.make(); await host.start();
    expect(f.views.at(-1)?.codeGroups).toEqual(['H7KQ', '9MXR']);
    const peer = f.peer(); f.callbacks.peer('a', peer);
    f.callbacks.control('a', { v, t: 'hello', name: 'Mei Ling' });
    expect(peer.bindIdentity).toHaveBeenCalledOnce();
    f.callbacks.quality('a', { quality: 'weak', path: 'direct', medianMs: 120, p95Ms: 150, loss: 0 });
    expect(f.views.at(-1)?.seats[0]).toMatchObject({ name: 'Mei Ling', number: 1, leader: true, connection: 'Weak' });
    f.callbacks.dropped('a');
    expect(f.views.at(-1)?.seats[0]?.connection).toBe('Seat held');
    f.advance(120001);
    expect(f.views.at(-1)?.seats[0]?.occupied).toBe(false);
    host.stop();
  });
  it('restores seats, names, colours and leader on reload with the same credentials', async () => {
    const f = fixture(); const host = f.make(); await host.start();
    f.callbacks.peer('a', f.peer()); f.callbacks.control('a', { v, t: 'hello', name: 'Mei Ling' });
    f.callbacks.peer('b', f.peer()); f.callbacks.control('b', { v, t: 'hello', name: 'Arjun' });
    f.lifecycle('hidden'); host.stop();
    const stored = f.values.get(HOST_STORAGE_KEY);
    expect(stored).toContain('Mei Ling');
    const restored = f.make(); await restored.start();
    expect(f.dial.mock.calls.at(-1)?.[0]).toEqual(f.credentials);
    expect(f.views.at(-1)?.seats.slice(0, 2).map(s => [s.number, s.name, s.colour, s.leader])).toEqual([
      [1, 'Mei Ling', f.views[2]?.seats[0]?.colour, true], [2, 'Arjun', f.views[2]?.seats[1]?.colour, false],
    ]);
    expect(f.views.at(-1)?.seats[0]?.connection).toBe('Seat held');
    const snapshot: unknown = JSON.parse(stored ?? '{}');
    const seatToken = (snapshot as { room: { players: { seatToken: string }[] } }).room.players[0]?.seatToken;
    const peer = f.peer(); f.callbacks.peer('returned', peer);
    f.callbacks.control('returned', { v, t: 'resume', seatToken });
    expect(peer.bindIdentity).toHaveBeenCalledWith(seatToken);
    expect(f.views.at(-1)?.seats[0]?.connection).toBe('Connected');
    restored.stop();
  });
  it('buffers peers and controls received during authenticated reopen', async () => {
    const f = fixture(); const host = f.make(); await host.start(); host.stop();
    f.dial.mockImplementationOnce((credentials, cb, register) => {
      register(f.stop); cb.peer('early', f.peer()); cb.control('early', { v, t: 'hello', name: 'Arjun' });
      return Promise.resolve({ credentials: credentials ?? f.credentials, reopened: true, stop: f.stop });
    });
    const restored = f.make(); await restored.start();
    expect(f.views.at(-1)?.seats[0]?.name).toBe('Arjun'); restored.stop();
  });
  it('keeps a snapshot after transient restore failure and retries it', async () => {
    const f = fixture(); const host = f.make(); await host.start(); host.stop();
    const stored = f.values.get(HOST_STORAGE_KEY);
    f.dial.mockRejectedValueOnce(new Error('offline'));
    const restored = f.make(); await restored.start();
    expect(f.views.at(-1)?.pairing).toBe('unreachable');
    expect(f.values.get(HOST_STORAGE_KEY)).toBe(stored);
    await restored.start(); expect(f.views.at(-1)?.pairing).toBe('ready'); restored.stop();
  });
  it('shows unreachable on failed creation, then retry creates one room', async () => {
    const f = fixture(); f.dial.mockRejectedValueOnce(new Error('offline'));
    const host = f.make(); await host.start();
    expect(f.views.at(-1)?.retry).toBe(true);
    await host.start(); expect(f.views.at(-1)?.pairing).toBe('ready'); host.stop();
  });
  it('shows definitive expiry rather than silently replacing the room', async () => {
    const f = fixture(); const host = f.make(); await host.start(); host.stop();
    f.dial.mockRejectedValueOnce(new Error('room-expired'));
    const restored = f.make(); await restored.start();
    expect(f.views.at(-1)?.pairing).toBe('expired');
    expect(f.values.has(HOST_STORAGE_KEY)).toBe(false);
    await restored.start(true); expect(f.views.at(-1)?.pairing).toBe('ready'); restored.stop();
  });
  it('refuses a restore whose acknowledgement names different credentials', async () => {
    const f = fixture(); const host = f.make(); await host.start(); host.stop();
    f.dial.mockResolvedValueOnce({ credentials: { ...f.credentials, code: '9MXRH7KQ' }, reopened: true, stop: f.stop });
    const restored = f.make(); await restored.start();
    expect(f.views.at(-1)?.pairing).toBe('expired');
    expect(f.views.at(-1)?.qrPayload).toBe('');
    expect(f.values.has(HOST_STORAGE_KEY)).toBe(false);
    restored.stop();
  });
  it('stops the replaced host without a final write, and ignores late peer events', async () => {
    const f = fixture(); const host = f.make(); await host.start();
    f.callbacks.state('replaced');
    expect(f.views.at(-1)?.pairing).toBe('replaced');
    f.callbacks.state('ready');
    expect(f.views.at(-1)?.pairing).toBe('replaced');
    expect(f.stop).toHaveBeenCalled();
    host.stop();
    f.callbacks.control('a', { v, t: 'hello', name: 'Late' });
    expect(f.values.has(HOST_STORAGE_KEY)).toBe(false);
  });
  it('stops a pending dial on disposal and does not publish its late result', async () => {
    const f = fixture();
    let finish: ((result: { credentials: HostCredentials; reopened: boolean; stop(): void }) => void) | undefined;
    f.dial.mockImplementationOnce((_saved, _cb, register) => { register(f.stop); return new Promise(resolve => { finish = resolve; }); });
    const host = f.make(); const starting = host.start();
    await Promise.resolve(); host.stop();
    const count = f.views.length;
    finish?.({ credentials: f.credentials, reopened: false, stop: f.stop }); await starting;
    expect(f.views).toHaveLength(count); expect(f.stop).toHaveBeenCalled();
  });
  it('never renders or logs secret credentials from creation, joins or restore', async () => {
    const log = vi.spyOn(console, 'log'); const error = vi.spyOn(console, 'error'); const warn = vi.spyOn(console, 'warn');
    try {
      const f = fixture(); const host = f.make(); await host.start();
      f.callbacks.peer('private-connection', f.peer()); f.callbacks.control('private-connection', { v, t: 'hello', name: 'Mei Ling' });
      host.stop(); const restored = f.make(); await restored.start(); restored.stop();
      const rendered = JSON.stringify(f.views);
      for (const secret of [f.credentials.hostToken, 'seat-private-', 'private-connection', 'seatToken', 'hostToken', 'roomToken']) expect(rendered).not.toContain(secret);
      expect(log).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled(); expect(warn).not.toHaveBeenCalled();
    } finally { log.mockRestore(); error.mockRestore(); warn.mockRestore(); }
  });
  it('continues without storage when browser storage is denied', async () => {
    const f = fixture(); f.deps.storage.getItem = () => { throw new Error('denied'); };
    f.deps.storage.setItem = () => { throw new Error('denied'); };
    const host = f.make(); await host.start(); expect(f.views.at(-1)?.pairing).toBe('ready'); host.stop();
  });
});

it('requires three consecutive changed quality reports and publishes only label changes', async () => {
  const f = fixture(); const host = f.make(); await host.start();
  f.callbacks.peer('a', f.peer()); f.callbacks.control('a', { v, t: 'hello', name: 'Mei Ling' });
  const report = (quality: 'good' | 'weak') => { f.callbacks.quality('a', { quality, path: 'direct', medianMs: 20, p95Ms: 30, loss: 0 }); };
  report('good'); const count = f.views.length;
  report('weak'); report('good'); report('weak'); report('weak');
  expect(f.views.length).toBe(count);
  report('weak'); expect(f.views.length).toBe(count + 1);
  expect(f.views.at(-1)?.seats[0]?.connection).toBe('Weak'); host.stop();
});
it('backs off at 1, 2, 4 seconds, honours Retry-After, resets on success and retries online', async () => {
  const f = fixture(); let online: (() => void) | undefined;
  f.deps.online = { subscribe(callback) { online = callback; return () => { online = undefined; }; } };
  const successful = f.dial.getMockImplementation();
  if (!successful) throw new Error('Missing dial');
  f.dial.mockRejectedValue(new Error('offline'));
  const host = f.make(); await host.start();
  const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
  for (const [delay, calls] of [[1000, 2], [2000, 3], [4000, 4]] as const) {
    f.advance(delay - 1); await settle(); expect(f.dial).toHaveBeenCalledTimes(calls - 1);
    f.advance(1); await settle(); expect(f.dial).toHaveBeenCalledTimes(calls);
  }
  f.dial.mockRejectedValueOnce(Object.assign(new Error('rate-limited'), { retryAfterMs: 120000 }));
  online?.(); await settle(); expect(f.dial).toHaveBeenCalledTimes(5);
  online?.(); await settle(); expect(f.dial).toHaveBeenCalledTimes(5);
  f.dial.mockImplementation(successful);
  f.advance(120000); await settle(); expect(f.views.at(-1)?.pairing).toBe('ready');
  const peer = f.peer(); f.callbacks.peer('a', peer);
  f.callbacks.control('a', { v, t: 'hello', name: 'Mei Ling' });
  f.callbacks.state('reconnecting'); f.advance(60000); await settle();
  expect(f.dial).toHaveBeenCalledTimes(6); expect(peer.close).not.toHaveBeenCalled();
  expect(f.views.at(-1)?.seats[0]?.name).toBe('Mei Ling');
  f.callbacks.state('ready'); host.stop();
});
it('keeps a not-allowed restore in replaced despite restore completion', async () => {
  const f = fixture(); const original = f.make(); await original.start(); original.stop();
  f.dial.mockImplementationOnce((_saved, callbacks) => { callbacks.state('replaced'); return Promise.reject(new Error('not-allowed')); });
  const host = f.make(); await host.start();
  expect(f.views.at(-1)?.pairing).toBe('replaced'); f.advance(60000);
  expect(f.dial).toHaveBeenCalledTimes(2); host.stop();
});
it('caps exponential retries at 30 seconds, then spaces creations after the eighth by a minute', async () => {
  const f = fixture(); f.dial.mockRejectedValue(new Error('offline'));
  const host = f.make(); await host.start();
  const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
  for (const delay of [1000, 2000, 4000, 8000, 16000, 30000, 30000, 60000, 60000]) {
    const count = f.dial.mock.calls.length;
    f.advance(delay - 1); await settle(); expect(f.dial).toHaveBeenCalledTimes(count);
    f.advance(1); await settle(); expect(f.dial).toHaveBeenCalledTimes(count + 1);
  }
  host.stop();
});
it('retries a transient restore automatically and preserves the original credentials', async () => {
  const f = fixture(); const original = f.make(); await original.start(); original.stop();
  f.dial.mockRejectedValueOnce(new Error('offline'));
  const host = f.make(); await host.start();
  expect(f.views.at(-1)?.pairing).toBe('unreachable');
  f.advance(1000); for (let i = 0; i < 20; i++) await Promise.resolve();
  expect(f.dial.mock.calls.at(-1)?.[0]).toEqual(f.credentials);
  expect(f.views.at(-1)?.pairing).toBe('ready'); host.stop();
});
it('does not publish quality for an unseated or held connection', async () => {
  const f = fixture(); const host = f.make(); await host.start();
  f.callbacks.peer('a', f.peer());
  const report = { quality: 'good' as const, path: 'direct' as const, medianMs: 20, p95Ms: 30, loss: 0 };
  let count = f.views.length;
  f.callbacks.quality('a', report); expect(f.views).toHaveLength(count);
  f.callbacks.control('a', { v, t: 'hello', name: 'Mei Ling' });
  expect(f.views.at(-1)?.seats[0]?.connection).toBe('Good');
  f.callbacks.dropped('a'); count = f.views.length;
  f.callbacks.quality('a', report); expect(f.views).toHaveLength(count); host.stop();
});

it('C-16 start rejection uses picker failure, results and picker retain the room players (PLAT-022)', async () => {
  const f = fixture(); f.deps.session = { start: vi.fn().mockRejectedValue(new Error('offline')), stop: vi.fn() };
  const host = f.make(); await host.start(); f.callbacks.peer('a', f.peer()); f.callbacks.control('a', { v: 1, t: 'hello', name: 'Fern' });
  for (const input of ['open', 'select', 'start'] as const) { f.advance(200); host.leaderInput('a', input); }
  await Promise.resolve(); await Promise.resolve();
  expect(host.picker.screen).toBe('start'); expect(host.picker.error).toContain('Could not load');
  const players = host.room.players;
  host.sessionEvent({ type: 'results', results: { mode: 'players', players: [] } }); expect(host.room.phase).toBe('results');
  host.sessionEvent({ type: 'picker' }); expect(host.picker.screen).toBe('picker'); expect(host.room.players).toEqual(players); expect(host.room.phase).toBe('lobby'); host.stop();
});

it('PLAT-022 only a current seated leader can return from results at the current picker revision', async () => {
  const f = fixture(); const stop = vi.fn(); f.deps.session = { start: vi.fn().mockResolvedValue(undefined), stop };
  const host = f.make(); await host.start();
  for (const id of ['a', 'b']) { f.callbacks.peer(id, f.peer()); f.callbacks.control(id, { v, t: 'hello', name: id }); }
  for (const input of ['open', 'select', 'start'] as const) { f.advance(200); host.leaderInput('a', input); }
  await Promise.resolve(); const players = host.room.players;
  host.sessionEvent({ type: 'results', results: { mode: 'players', players: [] } });
  host.leaderInput('b', 'open'); host.leaderInput('stranger', 'open'); host.leaderInput('a', 'open', host.picker.revision - 1);
  expect(host.room.phase).toBe('results');
  host.leaderInput('a', 'open'); expect(host.room.phase).toBe('lobby'); expect(host.picker.screen).toBe('picker');
  expect(host.room.players).toEqual(players); expect(stop).toHaveBeenCalled(); host.stop();
});
it('retiring a pending start clears starting and ignores its late completion', async () => {
  const f = fixture(); let finish: () => void = () => undefined;
  f.deps.session = { start: () => new Promise<void>(resolve => { finish = resolve; }), stop: vi.fn() };
  const host = f.make(); await host.start(); f.callbacks.peer('a', f.peer()); f.callbacks.control('a', { v, t: 'hello', name: 'Fern' });
  for (const input of ['open', 'select', 'start'] as const) { f.advance(200); host.leaderInput('a', input); }
  expect(host.picker.screen).toBe('starting'); f.callbacks.state('expired');
  expect(host.picker.screen).toBe('start'); finish(); await Promise.resolve(); expect(host.room.phase).toBe('lobby'); host.stop();
});

it.each(['previous', 'next', 'select', 'back'] as const)('PLAT-022 results input %s cannot return to picker', async input => {
  const f = fixture(); f.deps.session = { start: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };
  const host = f.make(); await host.start(); f.callbacks.peer('a', f.peer()); f.callbacks.control('a', { v, t: 'hello', name: 'Fern' });
  for (const action of ['open', 'select', 'start'] as const) { f.advance(200); host.leaderInput('a', action); }
  await Promise.resolve(); host.sessionEvent({ type: 'results', results: { mode: 'players', players: [] } });
  host.leaderInput('a', input); expect(host.room.phase).toBe('results'); expect(host.picker.screen).not.toBe('picker'); host.stop();
});
it('PLAT-022 play again starts the same game with the same room players', async () => {
  const f = fixture(); const start = vi.fn().mockResolvedValue(undefined); f.deps.session = { start, stop: vi.fn() };
  const host = f.make(); await host.start(); f.callbacks.peer('a', f.peer()); f.callbacks.control('a', { v, t: 'hello', name: 'Fern' });
  for (const action of ['open', 'select', 'start'] as const) { f.advance(200); host.leaderInput('a', action); }
  await Promise.resolve(); const players = host.room.players;
  host.sessionEvent({ type: 'results', results: { mode: 'players', players: [] } }); host.leaderInput('a', 'start');
  await Promise.resolve(); expect(start).toHaveBeenCalledTimes(2);
  expect(start.mock.calls[1]?.[0]).toBe(start.mock.calls[0]?.[0]); expect(host.room.players).toEqual(players); expect(host.room.phase).toBe('playing'); host.stop();
});
it('PLAT-022 leaving starting when the last seat leaves cancels the pending session', async () => {
  const f = fixture(); let finish: () => void = () => undefined; const stop = vi.fn();
  f.deps.session = { start: () => new Promise<void>(resolve => { finish = resolve; }), stop };
  const host = f.make(); await host.start(); f.callbacks.peer('a', f.peer()); f.callbacks.control('a', { v, t: 'hello', name: 'Fern' });
  for (const action of ['open', 'select', 'start'] as const) { f.advance(200); host.leaderInput('a', action); }
  stop.mockClear(); f.callbacks.dropped('a'); f.advance(120001); expect(host.picker.screen).toBe('lobby'); expect(stop).toHaveBeenCalled();
  finish(); await Promise.resolve(); expect(host.room.phase).toBe('lobby'); host.stop();
});

it('PLAT-024 stale results back action cannot interrupt a new start', async () => {
  const f = fixture(); const stop = vi.fn();
  f.deps.session = { start: () => new Promise(() => undefined), stop };
  const host = f.make(); await host.start(); f.callbacks.peer('a', f.peer()); f.callbacks.control('a', { v, t: 'hello', name: 'Fern' });
  for (const action of ['open', 'select', 'start'] as const) { f.advance(200); host.leaderInput('a', action); }
  stop.mockClear(); host.returnToPicker(); expect(stop).not.toHaveBeenCalled(); expect(host.picker.screen).toBe('starting'); host.stop();
});

it('D-099 preserves linked players and session, refuses new peers and offers a new room after quit', async () => {
  const f = fixture(); const stop = vi.fn(); const command = vi.fn();
  f.deps.session = { start: vi.fn().mockResolvedValue(undefined), stop, command };
  const host = f.make(); await host.start(); const peer = f.peer();
  f.callbacks.peer('a', peer); f.callbacks.control('a', { v, t: 'hello', name: 'Fern' });
  host.roomInput({ type: 'phase', phase: 'playing', allowRunningJoin: false });
  stop.mockClear(); f.callbacks.state('expired');
  expect(stop).not.toHaveBeenCalled(); expect(peer.close).not.toHaveBeenCalled();
  expect(host.room.phase).toBe('playing'); expect(host.room.players).toHaveLength(1);
  expect(f.views.at(-1)?.codeGroups).toEqual([]); expect(f.views.at(-1)?.newRoom).toBe(false);
  const stranger = f.peer(); f.callbacks.peer('new', stranger); expect(stranger.close).toHaveBeenCalledOnce();
  f.callbacks.state('ready'); expect(f.views.at(-1)?.pairing).toBe('closed-room');
  host.keyboard('pause'); expect(command).toHaveBeenCalledWith('pause', 'seat-1');
  host.sessionEvent({ type: 'picker' });
  expect(host.picker.screen).toBe('lobby'); expect(f.views.at(-1)?.newRoom).toBe(true);
  expect(peer.sendHost).toHaveBeenCalledWith(expect.objectContaining({ t: 'picker-state', screen: 'lobby', reason: CLOSED_ROOM_REASON }));
  f.callbacks.control('new', { v, t: 'hello', name: 'Stranger' }); expect(host.room.players).toHaveLength(1);
  host.stop();
});
it('PLAT-023 phone pause is authenticated, and only the connected leader resumes', async () => {
  const f = fixture(); const command = vi.fn(); const control = vi.fn(); f.deps.session = { start: vi.fn().mockResolvedValue(undefined), command, control };
  const host = f.make(); await host.start();
  for (const id of ['a', 'b']) { f.callbacks.peer(id, f.peer()); f.callbacks.control(id, { v, t: 'hello', name: id }); }
  control.mockClear();
  const action = (id: string, control: string) => { f.callbacks.control(id, { v, t: 'action', rev: 0, viewRev: 0, data: { control } }); };
  host.roomInput({ type: 'phase', phase: 'playing', allowRunningJoin: false });
  action('stranger', 'console-pause'); expect(command).not.toHaveBeenCalled();
  action('b', 'console-pause'); expect(command).toHaveBeenLastCalledWith('pause', 'seat-2');
  host.sessionEvent({ type: 'paused', paused: true }); command.mockClear();
  action('b', 'console-resume'); expect(command).not.toHaveBeenCalled();
  action('a', 'console-resume'); expect(command).toHaveBeenCalledWith('resume', 'seat-1');
  command.mockClear(); action('b', 'console-quit'); expect(command).not.toHaveBeenCalled();
  action('a', 'console-quit'); expect(command).toHaveBeenCalledWith('quit', 'seat-1');
  expect(control).not.toHaveBeenCalled(); host.stop();
});
it('PLAT-009 checkpoints completed scores once and restores them after an interrupted round', async () => {
  const f = fixture(); const host = f.make(); await host.start();
  f.callbacks.peer('a', f.peer()); f.callbacks.control('a', { v, t: 'hello', name: 'Fern' });
  host.roomInput({ type: 'phase', phase: 'playing', allowRunningJoin: false });
  const results = { mode: 'coop' as const, score: 16, players: [{ id: 'seat-1', score: 16, place: 1, joinedMidGame: false }] };
  host.sessionEvent({ type: 'results', results }); host.sessionEvent({ type: 'results', results });
  const firstGame = host.picker.focus;
  host.returnToPicker(); f.advance(1000); host.leaderInput('a', 'next');
  const secondGame = host.picker.focus;
  expect(secondGame).not.toBe(firstGame);
  host.roomInput({ type: 'phase', phase: 'playing', allowRunningJoin: false });
  host.sessionEvent({ type: 'results', results: { ...results, players: [{ id: 'seat-1', score: 7, place: 1, joinedMidGame: false }] } });
  host.returnToPicker();
  // Another completed round of the second game accumulates only there.
  host.roomInput({ type: 'phase', phase: 'playing', allowRunningJoin: false });
  host.sessionEvent({ type: 'results', results });
  host.returnToPicker(); host.roomInput({ type: 'phase', phase: 'playing', allowRunningJoin: false });
  f.lifecycle('pagehide');
  const beforeReload = JSON.parse(f.values.get(HOST_STORAGE_KEY) ?? '{}') as { scores: unknown };
  expect(beforeReload.scores).toEqual({ 'seat-1': { [firstGame]: 16, [secondGame]: 23 } });
  host.stop();
  const restored = f.make(); await restored.start(); f.lifecycle('hidden');
  const saved = JSON.parse(f.values.get(HOST_STORAGE_KEY) ?? '{}') as { scores: unknown; results: unknown };
  expect(saved.scores).toEqual(beforeReload.scores); expect(saved.results).toEqual([results]);
  expect(restored.room.phase).toBe('lobby'); restored.stop();
});

it.each(['left', 'expired'])('PLAT-009 clears completed scores when a seat is %s', async reason => {
  const f = fixture(); const host = f.make(); await host.start();
  f.callbacks.peer('a', f.peer()); f.callbacks.control('a', { v, t: 'hello', name: 'Fern' });
  host.roomInput({ type: 'phase', phase: 'playing', allowRunningJoin: false });
  host.sessionEvent({ type: 'results', results: { mode: 'coop', score: 16, players: [{ id: 'seat-1', score: 16, place: 1, joinedMidGame: false }] } });
  host.returnToPicker(); f.advance(1000); host.leaderInput('a', 'next');
  host.roomInput({ type: 'phase', phase: 'playing', allowRunningJoin: false });
  host.sessionEvent({ type: 'results', results: { mode: 'players', players: [{ id: 'seat-1', score: 7, place: 1, joinedMidGame: false }] } });
  f.lifecycle('pagehide');
  expect(Object.keys((JSON.parse(f.values.get(HOST_STORAGE_KEY) ?? '{}') as { scores: Record<string, object> }).scores['seat-1'] ?? {})).toHaveLength(2);
  host.returnToPicker();
  if (reason === 'left') f.callbacks.control('a', { v, t: 'leave' });
  else { f.callbacks.dropped('a'); f.advance(120001); }
  f.callbacks.peer('new', f.peer()); f.callbacks.control('new', { v, t: 'hello', name: 'New player' });
  f.lifecycle('pagehide');
  expect(JSON.parse(f.values.get(HOST_STORAGE_KEY) ?? '{}')).toMatchObject({ scores: {} });
  host.stop();
});
