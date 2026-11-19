import { describe, expect, it, vi } from 'vitest';
import { createRoom, applyPhoneEvent } from '@kaki/platform';
import type { GameModule, SessionEvent, SessionTransportEvent } from '@kaki/platform';
import { createSessionAdapter, hostScreen, animationFrames } from './session-adapter';
import type { LoadedGame, AdapterOptions } from './session-adapter';
import { hostCounts } from './counts';
import type { SessionDisplay } from './session-adapter';

function fixture(onDisplay?: (display: SessionDisplay | null) => void, counts?: AdapterOptions['counts'], minPlayers = 1, detail?: AdapterOptions['detail']) {
  let room = createRoom();
  room = applyPhoneEvent(room, { connectionId: 'a', deviceId: 'd' }, { type: 'join', name: 'Fern', seatToken: '1'.repeat(32) }, 0).state;
  const calls: string[] = [];
  const game: GameModule<number, object, number> = {
    meta: { id: 'test', name: 'Test', blurb: 'Test', players: { min: minPlayers, max: 8 }, teams: 'none', coop: false, solo: true, localSeat: 'play', midGameJoin: true },
    settings: { fields: [] }, init: () => { calls.push('init'); return 0; },
    step: state => { calls.push('step'); return state + 1; }, join: s => s, leave: s => s,
    publicView: s => s, privateView: () => null, controllerLayout: () => ({ revision: 0, controls: [] }),
    assets: () => [], isOver: s => s >= 2, results: () => ({ mode: 'players', players: [{ id: 'seat-1', place: 1, score: 2, joinedMidGame: false }] }), secrets: () => [],
  };
  const staleFrames: ((ms: number) => void)[] = [];
  let frame: ((ms: number) => void) | undefined;
  let receive: ((event: SessionTransportEvent) => void) | undefined;
  let display: SessionDisplay | null = null;
  const events: SessionEvent[] = [];
  const endFrames = vi.fn(() => { frame = undefined; });
  const endTransport = vi.fn(() => { receive = undefined; });
  const load = vi.fn(() => { calls.push('load'); return Promise.resolve({ game }); });
  const assets = vi.fn(() => { calls.push('assets'); return Promise.resolve(); });
  const layouts = vi.fn(() => true);
  const adapter = createSessionAdapter({ ...(detail ? { detail } : {}), ...(counts ? { counts } : {}), load, prepare: () => Promise.resolve({ context: { data: {}, saved: null, teams: false }, settings: {} }), assets, seed: () => 7,
    display: next => { display = next; onDisplay?.(next); }, event: e => { events.push(e); },
    frames: { subscribe(fn) { frame = fn; staleFrames.push(fn); return endFrames; } },
    transport: { sendLayout: layouts, sendPrivateView: () => true, fence: () => undefined, status: () => undefined, subscribe(fn) { receive = fn; return endTransport; } },
  });
  return { adapter, room, game, staleFrames, load, assets, layouts, calls, events, endFrames, endTransport, get receive() { return receive; }, get display() { return display; }, frame(ms: number) { frame?.(ms); } };
}
describe('C-16 session adapter (PLAT-022, PLAT-023, PLAT-031)', () => {
  it('shares prefetch, initialises before frames, and never loads after the first step', async () => {
    const f = fixture(); await f.adapter.prefetch('test'); await f.adapter.start('test', f.room);
    expect(f.calls).toEqual(['load', 'init', 'assets']); expect(f.load).toHaveBeenCalledOnce();
    expect(hostScreen(f.display, false)).toBe('game'); f.frame(17);
    expect(f.calls).toEqual(['load', 'init', 'assets', 'step']); f.frame(17);
    expect(f.load).toHaveBeenCalledOnce(); expect(f.assets).toHaveBeenCalledOnce(); expect(f.layouts).toHaveBeenCalledOnce();
    expect(hostScreen(f.display, false)).toBe('results');
    f.adapter.backToPicker(); expect(f.events.map(e => e.type)).toEqual(['results', 'picker']);
    f.adapter.stop(); expect(hostScreen(f.display, false)).toBe('picker'); expect(f.room.players[0]?.name).toBe('Fern');
  });
  it('rejects failed loading and init without running a frame', async () => {
    const f = fixture(); f.load.mockRejectedValueOnce(new Error('offline'));
    await expect(f.adapter.start('test', f.room)).rejects.toThrow('offline');
    f.game.init = () => { throw new Error('init'); };
    await expect(f.adapter.start('test', f.room)).rejects.toThrow('Session setup failed');
    f.frame(100); expect(f.calls).not.toContain('step'); expect(f.display).toBeNull();
  });
  it('stop releases every subscription and stops the simulation', async () => {
    const f = fixture(); await f.adapter.start('test', f.room); f.adapter.stop(); f.adapter.stop(); f.frame(100);
    expect(f.endFrames).toHaveBeenCalledOnce(); expect(f.endTransport).toHaveBeenCalledOnce(); expect(f.receive).toBeUndefined(); expect(f.calls).not.toContain('step');
  });
  it('forwards room changes to the runner', async () => {
    const f = fixture(); const leave = vi.spyOn(f.game, 'leave'); await f.adapter.start('test', f.room);
    f.adapter.updateRoom({ ...f.room, players: [], leader: null }); expect(leave).toHaveBeenCalledWith(0, 'seat-1'); expect(f.events[0]?.type).toBe('results');
  });
  it('an old failed asset request cannot stop a newer session', async () => {
    const f = fixture(); let reject: (error: Error) => void = () => undefined;
    f.assets.mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail; }));
    const old = f.adapter.start('test', f.room); const rejected = expect(old).rejects.toThrow('old assets');
    await vi.waitFor(() => { expect(f.assets).toHaveBeenCalled(); });
    await f.adapter.start('test', f.room); reject(new Error('old assets')); await rejected;
    f.frame(17); expect(f.calls).toContain('step'); expect(hostScreen(f.display, false)).toBe('game'); f.adapter.stop();
  });
  it('does not subscribe frames until assets are ready, and cancellation releases transport', async () => {
    const f = fixture(); let ready = (): void => undefined;
    f.assets.mockImplementationOnce(() => new Promise<void>(resolve => { ready = resolve; }));
    const start = f.adapter.start('test', f.room); await vi.waitFor(() => { expect(f.assets).toHaveBeenCalled(); });
    f.frame(100); expect(f.calls).not.toContain('step'); f.adapter.stop(); ready(); await expect(start).rejects.toThrow('Cancelled'); expect(f.endTransport).toHaveBeenCalledOnce();
  });
});

it('PERF-001 unchanged public view preserves the display identity; changes publish', async () => {
  const f = fixture(); f.game.publicView = () => ({ label: 'unchanged' }) as unknown as number;
  await f.adapter.start('test', f.room); const first = f.display;
  f.frame(17); expect(f.display).toBe(first);
  f.game.publicView = () => 42; f.game.isOver = () => false;
  f.frame(17); expect(f.display).not.toBe(first); expect(f.display?.view).toBe(42); f.adapter.stop();
});
it('stop clears every seat buffer slot and an old frame cannot advance a new match', async () => {
  const f = fixture(); await f.adapter.start('test', f.room);
  const remove = vi.spyOn(f.adapter.buffer, 'remove'); f.adapter.stop();
  expect(remove.mock.calls.map(([id]) => id)).toEqual(Array.from({ length: 8 }, (_, i) => `seat-${String(i + 1)}`));
  await f.adapter.start('test', f.room); f.staleFrames[0]?.(100);
  expect(f.calls).not.toContain('step'); f.frame(17); expect(f.calls).toContain('step'); f.adapter.stop();
});
it('animationFrames starts at zero, measures deltas and cancels even a queued callback', () => {
  let tick: FrameRequestCallback = () => undefined; let serial = 0;
  const request = vi.fn((callback: FrameRequestCallback) => { tick = callback; return ++serial; });
  const cancel = vi.fn(); const frame = vi.fn();
  const stop = animationFrames(request, cancel).subscribe(frame);
  tick(100); tick(117); expect(frame.mock.calls).toEqual([[0], [17]]);
  stop(); expect(cancel).toHaveBeenCalledWith(3); tick(150);
  expect(frame).toHaveBeenCalledTimes(2); expect(request).toHaveBeenCalledTimes(3);
});
it('PLAT-022 a game-owned final view stays first until the leader continues to console results', async () => {
  const f = fixture(); f.load.mockImplementation(() => Promise.resolve({ game: f.game, finalScreen: true }));
  await f.adapter.start('test', f.room); f.frame(17); f.frame(17);
  expect(f.display?.results).toBeDefined(); expect(f.display?.finalScreen).toBe(true);
  expect(hostScreen(f.display, false)).toBe('game');
  f.adapter.continueResults(); expect(f.display?.finalScreen).toBe(false); expect(hostScreen(f.display, false)).toBe('results');
  f.adapter.stop(); f.adapter.continueResults(); expect(f.display).toBeNull();
});

it('PLAT-025 passes an optional team split and context to game init', async () => {
  const f = fixture(); const init = vi.spyOn(f.game, 'init');
  const game = { ...f.game, meta: { ...f.game.meta, teams: 'optional' as const } };
  const p = f.room.players[0]; if (!p) throw new Error('Missing fixture seat');
  const room = { ...f.room, players: [{ ...p, team: 'red' as const }, { ...p, seat: 2, deviceId: 'second', connectionId: 'second', seatToken: '2'.repeat(32), team: 'blue' as const }] };
  // The actual preparation boundary receives teams before it resolves settings/data.
  const adapter = createSessionAdapter({ load: () => Promise.resolve({ game }),
    prepare: (_game, _seed, teams) => Promise.resolve({ context: { data: {}, saved: null, teams: teams ?? false }, settings: {} }),
    assets: () => Promise.resolve(), seed: () => 7, display: () => undefined, event: () => undefined,
    frames: { subscribe: () => () => undefined },
    transport: { sendLayout: () => true, sendPrivateView: () => true, fence: () => undefined, status: () => undefined, subscribe: () => () => undefined } });
  await adapter.start('test', room);
  expect(init.mock.calls[0]?.[1].map(p => p.team)).toEqual([0, 1]);
  expect(init.mock.calls[0]?.[3].teams).toBe(true); adapter.stop();
});
it('PLAT-033 awaits mounted readiness and rejects a failed or cancelled mount', async () => {
  const destroy = vi.fn();
  const Screen = { mount: vi.fn(() => ({ destroy })) };
  let mounted: ReturnType<typeof Screen.mount> | undefined;
  const f = fixture(display => {
    // Model the shell's renderer ownership at the display subscription boundary.
    if (display?.ready && !mounted) mounted = Screen.mount();
    if (!display) { mounted?.destroy(); mounted = undefined; }
  });
  f.load.mockImplementation(() => Promise.resolve({ game: f.game, Screen }));
  const start = f.adapter.start('test', f.room);
  await vi.waitFor(() => { expect(f.display?.ready).toBeTypeOf('function'); });
  f.frame(100); expect(f.calls).not.toContain('step');
  const pendingDisplay = f.display;
  f.display?.ready?.(); await start;
  expect(pendingDisplay?.ready).toBeTypeOf('function');
  expect(f.display).not.toBe(pendingDisplay);
  expect(f.display?.ready).toBeUndefined();
  f.frame(17); expect(f.calls).toContain('step');
  const failure = f.adapter.start('test', f.room);
  const rejected = expect(failure).rejects.toThrow('decode');
  await vi.waitFor(() => { expect(f.display?.ready).toBeTypeOf('function'); });
  f.display?.ready?.(new Error('decode')); await rejected;
  expect(f.display).toBeNull();
  const cancelled = f.adapter.start('test', f.room);
  const cancellation = expect(cancelled).rejects.toThrow('Cancelled');
  await vi.waitFor(() => { expect(f.display?.ready).toBeTypeOf('function'); });
  destroy.mockClear();
  f.adapter.stop(); await cancellation;
  expect(destroy).toHaveBeenCalledOnce();
});


it('DATA-003 the real session boundary sends once after results, never in play', async () => {
  const send = vi.fn<(body: string) => Promise<boolean>>(() => Promise.resolve(true));
  const beacon = vi.fn(() => true);
  const counts = hostCounts({ send, beacon, cancel: () => undefined });
  const f = fixture(undefined, counts); f.game.isOver = () => false;
  await f.adapter.start('test', f.room);
  for (let n = 0; n < 600; n++) f.frame(17);
  counts.hide(); expect(send).not.toHaveBeenCalled(); expect(beacon).not.toHaveBeenCalled();
  f.game.isOver = () => true; f.frame(17); expect(f.display?.results).toBeDefined();
  expect(send).toHaveBeenCalledTimes(1); counts.hide(); f.frame(17);
  expect(send).toHaveBeenCalledTimes(1); expect(beacon).not.toHaveBeenCalled();
  f.adapter.stop();
});

it('RZ-013 quit while short of players saves once through results', async () => {
  const storage = await import('./session-storage');
  const save = vi.spyOn(storage, 'saveSession').mockResolvedValue(0);
  const f = fixture(undefined, undefined, 2);
  try {
    await f.adapter.start('test', f.room);
    f.adapter.command('quit', 'seat-1');
    await vi.waitFor(() => { expect(save).toHaveBeenCalledOnce(); });
    expect(f.events.filter(event => event.type === 'results')).toHaveLength(1);
  } finally { f.adapter.stop(); save.mockRestore(); }
});

it.each([false, true])('PLAT-008 PLAT-025 admission reads joinTeam from loaded module (%s)', async supported => {
  const f = fixture();
  if (supported) f.game.joinTeam = () => 1;
  expect(f.adapter.allowsRunningJoin(true)).toBe(false);
  await f.adapter.start('test', f.room);
  expect(f.adapter.allowsRunningJoin(false)).toBe(true);
  expect(f.adapter.allowsRunningJoin(true)).toBe(supported);
  f.load.mockResolvedValueOnce({ game: { ...f.game, meta: { ...f.game.meta, midGameJoin: false } } });
  await f.adapter.start('other-test', f.room);
  expect(f.adapter.allowsRunningJoin(false)).toBe(false);
  expect(f.adapter.allowsRunningJoin(true)).toBe(false);
  f.adapter.stop();
  expect(f.adapter.allowsRunningJoin(true)).toBe(false);
});

it('PLAT-025 session adapter forwards the team request and joins from the assigned room snapshot', async () => {
  const { fixture: game } = await import('../../../packages/platform/src/session/session.fixture');
  const { makeRoom, joinRoom } = await import('../../../packages/platform/src/session/testing.fixture');
  const { applyHostEvent } = await import('@kaki/platform');
  const join = vi.fn((...args: Parameters<typeof game.join>) => game.join(...args)), assignTeam = vi.fn((seat: number, team: 0 | 1) => {
    room = applyHostEvent(room, { type: 'team', seat, team: team === 0 ? 'red' : 'blue' }, room.clock).state;
    adapter.updateRoom(room);
  });
  let room = makeRoom(3, true);
  const adapter = createSessionAdapter({
    load: () => Promise.resolve({ game: { ...game, join, joinTeam: () => 1 } as unknown as LoadedGame }),
    prepare: () => Promise.resolve({ context: { data: {}, saved: null, teams: true }, settings: { steps: 100 } }),
    assets: () => Promise.resolve(), transport: { sendLayout: () => true, sendPrivateView: () => true, fence: () => undefined, status: () => undefined, subscribe: () => () => undefined }, frames: { subscribe: () => () => undefined },
    seed: () => 7, display: () => undefined, event: () => undefined,
  });
  await adapter.start('session-fixture', room, undefined, assignTeam);
  room = joinRoom(room, 4); adapter.updateRoom(room);
  expect(assignTeam).toHaveBeenCalledExactlyOnceWith(4, 1);
  expect(room.players.find(p => p.seat === 4)?.team).toBe('blue');
  expect(join).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'seat-4', team: 1 }));
  adapter.stop();
});

it('PERF-002 prepares assets then detail then mount/Ready then frames, mapping Lower to half', async () => {
  const order: string[] = [];
  const detail = vi.fn(() => { order.push('detail'); expect(f.staleFrames).toHaveLength(0); return Promise.resolve('lower' as const); });
  const f = fixture(display => { if (display?.ready) { expect(f.staleFrames).toHaveLength(0); order.push('mount'); expect(display.detail).toBe('half'); display.ready(); order.push('ready'); } }, undefined, 1, detail);
  const Screen = { mount: vi.fn() };
  f.load.mockImplementation(() => Promise.resolve({ game: f.game, Screen }));
  f.assets.mockImplementation(() => { order.push('assets'); return Promise.resolve(); });
  await f.adapter.start('test', f.room); f.frame(17); order.push('frames');
  expect(order).toEqual(['assets', 'detail', 'mount', 'ready', 'frames']);
  expect(f.staleFrames).toHaveLength(1); f.adapter.stop();
});
it('PERF-002 skips detail without a Screen', async () => {
  const detail = vi.fn(() => Promise.resolve('full' as const));
  const f = fixture(undefined, undefined, 1, detail);
  await f.adapter.start('test', f.room); expect(detail).not.toHaveBeenCalled(); f.adapter.stop();
});
it('PERF-002 cancellation during detail aborts and subscribes no frames', async () => {
  let signal: AbortSignal | undefined;
  const detail = vi.fn((_id: string, _screen: unknown, abort: AbortSignal) => { signal = abort; return new Promise<'full'>((_resolve, reject) => { abort.addEventListener('abort', () => { reject(Error('Cancelled')); }); }); });
  const f = fixture(undefined, undefined, 1, detail);
  f.load.mockImplementation(() => Promise.resolve({ game: f.game, Screen: { mount: vi.fn() } }));
  const pending = f.adapter.start('test', f.room), rejected = expect(pending).rejects.toThrow('Cancelled');
  await vi.waitFor(() => { expect(detail).toHaveBeenCalled(); }); f.adapter.stop(); await rejected;
  expect(signal?.aborted).toBe(true); expect(f.staleFrames).toHaveLength(0);
});

it('PERF-010 dev trace maps accepted wire revisions to game revisions and excludes stale taps', async () => {
  const hook = vi.fn();
  globalThis.__kakiActionTiming = hook;
  const f = fixture();
  f.game.isOver = () => false;
  f.game.controllerLayout = state => ({ revision: state + 7, controls: [{ kind: 'options', id: 'lock', options: [{ id: 'go', label: 'Lock in' }] }] });
  try {
    await f.adapter.start('test', f.room);
    f.receive?.({ type: 'tap', connectionId: 'a', action: { control: 'lock', value: 'go', revision: 0 } });
    f.frame(17);
    expect(hook.mock.calls.filter(call => call[0] === 'applied')).toEqual([
      ['applied', 'seat-1', 'lock', 'go', { round: null, wireRevision: 0, gameRevision: 7 }],
    ]);
    f.receive?.({ type: 'tap', connectionId: 'a', action: { control: 'lock', value: 'go', revision: 0 } });
    f.receive?.({ type: 'tap', connectionId: 'a', action: { control: 'lock', value: 'go', revision: 1 } });
    f.frame(17);
    expect(hook.mock.calls.filter(call => call[0] === 'applied').at(-1)).toEqual(
      ['applied', 'seat-1', 'lock', 'go', { round: null, wireRevision: 1, gameRevision: 8 }]);
    expect(hook.mock.calls.filter(call => call[0] === 'applied')).toHaveLength(2);
  } finally { f.adapter.stop(); globalThis.__kakiActionTiming = undefined; }
});
