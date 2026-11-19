import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { cloneState, createInputBuffer, createSimLoop, createRng, hashState, nextInt } from '@kaki/sim-core';
import { BUTTON, EMPTY_SETUP, STEP_MS, driveStep } from '../game/index';
import type { GameModule } from '../game/types';
import type { Tick } from '../game/drive';
import type { ControllerLayout, PrivateView } from '../game/layout';
import { applyHostEvent, applyPhoneEvent, createRoom } from '../room/room';
import type { RoomState } from '../room/room';
import { createSession } from './index';
import type { SessionEvent, SessionTransport, SessionTransportEvent } from './index';
import { fixture } from './session.fixture';
import type { FixtureState } from './session.fixture';

function join(room: RoomState, seat: number, connection = `c${String(seat)}`): RoomState {
  return applyPhoneEvent(room, { deviceId: `d${String(seat)}`, connectionId: connection },
    { type: 'join', name: `Guest ${String(seat)}`, seatToken: String(seat).repeat(32) }, room.clock).state;
}
function makeRoom(n: number): RoomState {
  let room = createRoom();
  for (let i = 1; i <= n; i++) room = join(room, i);
  return applyHostEvent(room, { type: 'phase', phase: 'playing', allowRunningJoin: true }, 0).state;
}
class Transport implements SessionTransport {
  receive: (e: SessionTransportEvent) => void = () => { /* Idle fake. */ };
  messages: { connection: string; type: string; value: unknown }[] = [];
  statuses = new Map<string, { paused: boolean; generation: number }>();
  fences = new Map<string, number | null>();
  sendLayout(connection: string, layout: ControllerLayout): boolean { this.messages.push({ connection, type: 'layout', value: layout }); return true; }
  sendPrivateView(connection: string, view: PrivateView | null): boolean { this.messages.push({ connection, type: 'view', value: view }); return true; }
  status(c: string, paused: boolean, generation: number): void { this.statuses.set(c, { paused, generation }); }
  fence(c: string, seq: number | null): void { this.fences.set(c, seq); }
  subscribe(fn: (e: SessionTransportEvent) => void): () => void { this.receive = fn; return () => { this.receive = () => { /* Idle fake. */ }; }; }
  tap(c: string, control = 'pick', revision = 0, value = 'yes'): void {
    this.receive({ type: 'tap', connectionId: c, action: { control, revision, value } });
  }
}
function setup(n = 1, game = fixture, steps = 30, teams = false, seed = 123) {
  let room = makeRoom(n);
  if (teams) for (let seat = 1; seat <= n; seat++) room = applyHostEvent(room,
    { type: 'team', seat, team: seat % 2 ? 'red' : 'blue' }, 0).state;
  const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 });
  const transport = new Transport();
  const events: SessionEvent[] = []; const log: Tick[] = []; const views: unknown[] = [];
  let frame: (ms: number) => void = () => { /* Idle fake. */ };
  let stopped = false;
  const session = createSession({ game, settings: { steps }, seed, room, context: { ...EMPTY_SETUP, teams, data: { questions: ['preloaded'] } },
    buffer, transport, loop: createSimLoop,
    frames: { subscribe(fn) { frame = fn; return () => { stopped = true; }; } },
    publicView(v) { views.push(v); }, event(e) { events.push(e); }, record(t) { log.push(cloneState(t)); } });
  return { session, buffer, transport, events, log, views, room, frame: (ms = STEP_MS) => { frame(ms); }, stopped: () => stopped };
}
function run(s: ReturnType<typeof setup>, steps: number): void { for (let i = 0; i < steps; i++) s.frame(); }

describe('authoritative session', () => {
  it.each([1, 8])('PLAT-022 PLAT-030 PLAT-031 PLAT-033 NET-001 whole match with %i players', n => {
    const s = setup(n); run(s, 40);
    expect(s.session.step).toBe(30); expect(s.session.ended).toBe(true);
    expect(s.events.at(-1)?.type).toBe('results'); expect(s.stopped()).toBe(true);
    expect(s.views).toHaveLength(31);
    expect(s.session.state?.data).toEqual({ questions: ['preloaded'] });
    s.session.backToPicker(); expect(s.events.at(-1)).toEqual({ type: 'picker' });
  });
  it('PLAT-031 NET-001 sends revisions only, filters audience and clears null views', () => {
    const game = { ...fixture, controllerLayout: () => ({ revision: 0, controls: [
      { kind: 'text' as const, id: 'leader-only', text: 'Leader', audience: 'leader' as const }] }),
    privateView: (s: FixtureState, id: string) => s.step < -25 ? fixture.privateView(s, id) : null };
    const s = setup(2, game); run(s, 9);
    expect(s.transport.messages.filter(m => m.type === 'layout')).toHaveLength(2);
    expect(s.transport.messages.filter(m => m.type === 'view')).toHaveLength(4);
    expect(JSON.stringify(s.transport.messages.filter(m => m.connection === 'c2'))).not.toContain('leader-only');
    expect(s.transport.messages.filter(m => m.type === 'view').at(-1)?.value).toBeNull();
  });
  it('NET-001 PLAT-031 seeded random matches never send another phone secrets or undeclared reveal', () => {
    const rng = createRng(9051);
    for (let trial = 0; trial < 60; trial++) {
      const n = nextInt(rng, 1, 8); const seed = nextInt(rng, 1, 100000); const s = setup(n, fixture, 30, n > 1, seed);
      for (let step = 0; step < 30; step++) {
        const seat = nextInt(rng, 1, n); s.transport.tap(`c${String(seat)}`);
        s.frame();
      }
      for (let a = 1; a <= n; a++) {
        const bytes = JSON.stringify(s.transport.messages.filter(m => m.connection === `c${String(a)}`));
        expect(bytes).not.toContain(`unrevealed-${String(seed)}`);
        for (let b = 1; b <= n; b++) if (a !== b) expect(bytes).not.toContain(`private-seat-${String(b)}-${String(seed)}`);
      }
    }
  });
  it('PLAT-030 stale revision, unknown connection, duplicate controls and arrival order', () => {
    const s = setup(2);
    s.transport.tap('evil'); s.transport.tap('c2'); s.transport.tap('c1', 'move', 0, 'left');
    s.transport.tap('c2', 'pick', 0, 'no'); s.session.updateRoom(s.room); s.frame();
    expect(s.session.state?.actions).toEqual(['seat-2:pick:yes', 'seat-1:move:left']);
    run(s, 9); s.transport.tap('c1', 'pick', 0); s.frame();
    expect(s.session.state?.actions).toHaveLength(2);
  });
  it('PLAT-023 any player pauses; only leader resumes or confirms quit; START never reaches rules', () => {
    const s = setup(2);
    s.buffer.receive('seat-2', 0, 1 << BUTTON.START); s.frame();
    expect(s.session.paused).toBe(true); expect(s.session.step).toBe(0);
    run(s, 10); s.session.resume('seat-2'); expect(s.session.paused).toBe(true);
    s.session.resume('seat-1'); s.frame();
    expect(s.session.state?.presses).toBe(0);
    expect(s.session.quit('seat-2', true)).toBe('forbidden');
    expect(s.session.quit('seat-1')).toBe('confirm'); expect(s.session.ended).toBe(false);
    expect(s.session.quit('seat-1', true)).toBe('quit'); expect(s.events.at(-1)?.type).toBe('picker');
  });
  it('PLAT-023 NET-001 resume discards paused edges and accepts fresh input without ack', () => {
    const s = setup(); s.buffer.receive('seat-1', 0, 1); s.frame();
    s.session.pause('seat-1'); s.transport.tap('c1');
    s.buffer.receive('seat-1', 1, 0); s.buffer.receive('seat-1', 2, 1);
    s.session.resume('seat-1'); s.frame();
    expect(s.session.state?.presses).toBe(1);
    expect(s.session.state?.actions).toEqual([]);
    s.buffer.receive('seat-1', 3, 0); s.frame();
    s.buffer.receive('seat-1', 4, 1); s.transport.tap('c1'); s.frame();
    expect(s.session.state?.presses).toBe(2);
    expect(s.session.state?.actions).toHaveLength(1);
  });
  it('PLAT-030 NET-001 disconnect and reconnect clear input, drop queued taps, resend views and fence identity', () => {
    const s = setup(); s.buffer.receive('seat-1', 0, 1); s.frame(); s.transport.tap('c1');
    s.transport.receive({ type: 'connection', connectionId: 'c1', connected: false }); s.frame();
    expect(s.session.state?.held).toBe(0); expect(s.log.at(-1)?.frames.has('seat-1')).toBe(false); expect(s.log.at(-1)?.connected.get('seat-1')).toBe(false);
    s.transport.receive({ type: 'connection', connectionId: 'c1', connected: true });
    expect(s.transport.messages.filter(m => m.type === 'layout')).toHaveLength(2);
    expect(s.transport.messages.filter(m => m.type === 'view')).toHaveLength(2);
    s.transport.tap('c1'); s.frame(); expect(s.session.state?.actions).toHaveLength(1);
  });
  it('PLAT-008 PLAT-030 join, leave, seat order, joinedMidGame results and leader change from real room reducer', () => {
    const s = setup(2); s.frame();
    let room = join(s.room, 3); s.session.updateRoom(room);
    expect(s.session.state?.players).toHaveLength(3);
    room = applyPhoneEvent(room, { deviceId: 'd1', connectionId: 'c1', seat: 1 }, { type: 'leave' }, 0).state;
    s.session.updateRoom(room); expect(s.session.state?.players).toHaveLength(2);
    expect(s.session.quit('seat-1', true)).toBe('forbidden');
    expect(s.session.quit('seat-2')).toBe('confirm');
    run(s, 29); expect([...s.log[1]?.frames.keys() ?? []]).toEqual(['seat-2', 'seat-3']);
    const event = s.events.find(e => e.type === 'results');
    expect(event?.type === 'results' && event.results.players.find(p => p.id === 'seat-3')?.joinedMidGame).toBe(true);
  });
  it('PLAT-030 pauses below minimum or with an empty team, and resumes only after membership is sufficient', () => {
    const s = setup(2, { ...fixture, meta: { ...fixture.meta, players: { min: 2, max: 8 } } }, 30, true);
    let room = applyPhoneEvent(s.room, { deviceId: 'd2', connectionId: 'c2', seat: 2 }, { type: 'leave' }, 0).state;
    s.session.updateRoom(room); run(s, 10); expect(s.session.step).toBe(0);
    s.session.resume('seat-1'); expect(s.session.paused).toBe(true);
    room = join(room, 2); room = applyHostEvent(room, { type: 'team', seat: 2, team: 'blue' }, 0).state;
    s.session.updateRoom(room); s.session.resume('seat-1'); s.frame(); expect(s.session.step).toBe(1);
  });
  it.each(['step', 'join', 'leave', 'publicView', 'privateView', 'controllerLayout'] as const)(
    'PLAT-030 contains a throwing %s with seed, step and operation', method => {
      let throwing = false;
      const game = { ...fixture, [method]: (...args: unknown[]) => {
        if (throwing) throw new Error('private-game-secret');
        return (fixture[method] as (...args: unknown[]) => unknown)(...args);
      } } as GameModule<FixtureState, { steps: number }, { step: number }>;
      const s = setup(2, game); throwing = true;
      if (method === 'join') s.session.updateRoom(join(s.room, 3));
      else if (method === 'leave') s.session.updateRoom({ ...s.room, players: s.room.players.slice(1) });
      else s.frame();
      expect(s.session.ended).toBe(true);
      expect(s.events.at(-1)).toMatchObject({ type: 'error', seed: 123, operation: method });
      expect(JSON.stringify(s.events)).not.toContain('private-game-secret');
      expect(() => { s.frame(); }).not.toThrow();
    });
  it('PLAT-030 multi-second stalls cap catch-up at six and freeze exactly at natural end', () => {
    const s = setup(); s.frame(5000); expect(s.session.step).toBe(6); s.frame(); expect(s.session.step).toBe(7);
    const short = setup(1, fixture, 2); short.frame(5000); expect(short.session.step).toBe(2);
  });
  it('PLAT-030 NET-001 same seed and borrowed per-step recording replay to identical hash', () => {
    const s = setup(8); s.transport.tap('c5'); s.buffer.receive('seat-1', 0, 4); run(s, 30);
    let replay = fixture.init(123, s.session.state?.players ?? [], { steps: 30 }, { ...EMPTY_SETUP, data: { questions: ['preloaded'] } });
    for (const tick of s.log) replay = driveStep(fixture, replay, tick, STEP_MS);
    expect(hashState(replay)).toBe(hashState(s.session.state));
  });
  it('PLAT-030 reports eight-player session call cost (diagnostic, no new budget)', () => {
    const s = setup(8, fixture, 10000); const start = performance.now(); run(s, 10000); expect(s.session.step).toBe(10000);
    // eslint-disable-next-line no-console
    console.info(`C-10 eight-player advance mean: ${String((performance.now() - start) * 1000 / 10000)} us/step (fixture + recording + views included)`);
  });
  it('PLAT-030 measures runner overhead with an allocation-free game and recording disabled', () => {
    const room = makeRoom(8);
    const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 });
    const layout = { revision: 0, controls: [] };
    const view = { step: 0 };
    const game = { ...fixture, stepMode: 'in-place' as const,
      step(s: FixtureState) { s.step++; return s; }, controllerLayout() { return layout; },
      privateView() { return null; }, publicView() { return view; }, isOver() { return false; } };
    const transport = new Transport();
    const session = createSession({ game, room, settings: { steps: 1 }, seed: 1, context: EMPTY_SETUP,
      buffer, transport, publicView() { /* No renderer. */ }, event() { /* No shell. */ } });
    const count = 100000;
    for (let i = 0; i < 1000; i++) session.advance(STEP_MS);
    const start = performance.now();
    for (let i = 0; i < count; i++) session.advance(STEP_MS);
    const us = (performance.now() - start) * 1000 / count;
    // eslint-disable-next-line no-console
    console.info(`C-10 runner + real buffer/loop, eight seats, no recorder: ${String(us)} us/step`);
    expect(session.step).toBe(count + 1000);
    expect(transport.messages).toHaveLength(16); // One layout and view per seat; no steady-step sends.
  });

  it('PLAT-023 disconnected leader cannot resume and PLAT-022 last departure ends the match', () => {
    const s = setup(2); s.session.pause('seat-2');
    s.transport.receive({ type: 'connection', connectionId: 'c1', connected: false });
    s.session.resume('seat-1'); expect(s.session.paused).toBe(true);
    s.session.updateRoom({ ...s.room, players: [], leader: null });
    expect(s.session.ended).toBe(true);
    expect(s.events.at(-1)).toEqual({ type: 'results', results: { mode: 'players', players: [] } });
  });

});

it('PLAT-008 held membership never reaches join; allowed seat joins once; resume retains score and membership', () => {
  let joins = 0;
  const game = { ...fixture, join(state: FixtureState, player: Parameters<typeof fixture.join>[1]) {
    joins++; return fixture.join(state, player);
  } };
  const s = setup(2, game); s.frame();
  let room = applyHostEvent(s.room, { type: 'phase', phase: 'playing', allowRunningJoin: false }, 0).state;
  const request = { deviceId: 'd3', connectionId: 'c3' };
  const held = applyPhoneEvent(room, request, { type: 'join', name: 'Third', seatToken: '3'.repeat(32) }, 0);
  expect(held.result).toMatchObject({ ok: false, reason: 'game-running' });
  s.session.updateRoom(held.state); expect(joins).toBe(0);
  room = applyHostEvent(room, { type: 'phase', phase: 'playing', allowRunningJoin: game.meta.midGameJoin }, 0).state;
  room = applyPhoneEvent(room, request, { type: 'join', name: 'Third', seatToken: '3'.repeat(32) }, 0).state;
  s.session.updateRoom(room); expect(joins).toBe(1);
  const state = s.session.state;
  if (!state) throw new Error('No match');
  const scores = game.results(state);
  expect(scores.players.find(p => p.id === 'seat-3')?.score).toBe(0);
  room = applyPhoneEvent(room, { deviceId: 'd3', connectionId: 'c3-new' }, { type: 'resume', seatToken: '3'.repeat(32) }, 1).state;
  s.session.updateRoom(room); expect(joins).toBe(1);
  const resumed = s.session.state;
  if (!resumed) throw new Error('No resumed match');
  expect(game.results(resumed)).toEqual(scores);
  room = applyPhoneEvent(room, { deviceId: 'd3', connectionId: 'c3-new', seat: 3 }, { type: 'leave' }, 2).state;
  s.session.updateRoom(room); expect(s.session.state?.players).toHaveLength(2);
});

it('PLAT-035 pauses after more than three seconds, freezes simulation, counts down and cancels on another drop', () => {
  const s = setup(3, fixture, 100000);
  let room = applyHostEvent(s.room, { type: 'disconnect', seat: 2 }, 0).state;
  s.session.updateRoom(room); s.frame(2999); expect(s.session.paused).toBe(false);
  s.frame(1); expect(s.session.paused).toBe(false);
  s.frame(1); expect(s.session.paused).toBe(true);
  const tick = s.session.step; s.frame(1000); expect(s.session.step).toBe(tick);
  room = applyHostEvent(room, { type: 'disconnect', seat: 3 }, 0).state; s.session.updateRoom(room);
  expect(s.events.at(-1)).toMatchObject({ message: 'Waiting for Guest 2 and Guest 3 to rejoin' });
  for (const seat of [2, 3]) room = applyPhoneEvent(room, { deviceId: `d${String(seat)}`, connectionId: `new${String(seat)}` }, { type: 'resume', seatToken: String(seat).repeat(32) }, 0).state;
  s.session.updateRoom(room); expect(s.events.at(-1)).toMatchObject({ countdown: 3 });
  s.frame(1000); expect(s.events.at(-1)).toMatchObject({ countdown: 2 });
  room = applyHostEvent(room, { type: 'disconnect', seat: 2 }, 0).state; s.session.updateRoom(room);
  s.frame(3001); expect(s.session.paused).toBe(true); expect(s.events.at(-1)).toMatchObject({ countdown: null });
  room = applyPhoneEvent(room, { deviceId: 'd2', connectionId: 'again' }, { type: 'resume', seatToken: '2'.repeat(32) }, 0).state;
  s.session.updateRoom(room);
  for (const countdown of [2, 1]) { s.frame(1000); expect(s.events.at(-1)).toMatchObject({ countdown }); }
  s.frame(1000); expect(s.session.paused).toBe(false);
});
it('PLAT-035 carry on requires the connected leader and does not repeatedly pause for held seats', () => {
  const s = setup(3, fixture, 100000);
  s.session.updateRoom(applyHostEvent(s.room, { type: 'disconnect', seat: 3 }, 0).state);
  s.frame(3001); s.session.resume('seat-2'); expect(s.session.paused).toBe(true);
  s.session.resume('seat-1'); expect(s.session.paused).toBe(false);
  s.frame(4000); expect(s.session.paused).toBe(false); expect(s.session.state?.players).toHaveLength(3);
});
it('PLAT-035 never auto-resumes a pause players chose, including one chosen during countdown', () => {
  const s = setup(2, fixture, 100000);
  s.session.pause('seat-1');
  let room = applyHostEvent(s.room, { type: 'disconnect', seat: 2 }, 0).state;
  s.session.updateRoom(room); s.frame(3001);
  room = applyPhoneEvent(room, { deviceId: 'd2', connectionId: 'new' }, { type: 'resume', seatToken: '2'.repeat(32) }, 0).state;
  s.session.updateRoom(room); s.frame(4000); expect(s.session.paused).toBe(true);
});
it.each(['lobby', 'results', 'scoreboard', 'final'] as const)('PLAT-035 no automatic pause on %s', phase => {
  const s = setup(2, { ...fixture, pauseOnDisconnect: () => phase !== 'scoreboard' && phase !== 'final' }, 100000);
  const room = applyHostEvent(s.room, { type: 'disconnect', seat: 2 }, 0).state;
  s.session.updateRoom({ ...room, phase: phase === 'lobby' || phase === 'results' ? phase : 'playing' });
  s.frame(4000); expect(s.session.paused).toBe(false);
});
it('PLAT-034 same-browser takeover preserves simulation state and score without calling join', () => {
  const game = { ...fixture, results(state: FixtureState) { const result = fixture.results(state); return { ...result, players: result.players.map(p => ({ ...p, score: state.presses })) }; } };
  const s = setup(2, game, 100000); s.buffer.receive('seat-2', 0, 1, [0, 0, 0, 0]); s.frame();
  const before = s.session.state; const scores = before && game.results(before);
  expect(scores?.players[1]?.score).toBe(1);
  const room = { ...s.room, players: s.room.players.map(p => ({ ...p, browserId: `browser-${String(p.seat)}` })) };
  s.session.updateRoom(room);
  const result = applyPhoneEvent(room, { browserId: 'browser-2', deviceId: 'fresh', connectionId: 'fresh' }, { type: 'join', name: 'Guest 2', seatToken: 'new-unused-token-123456789' }, 0);
  s.session.updateRoom(result.state);
  expect(s.session.state).toBe(before); expect(before && game.results(before)).toEqual(scores);
});
it('PLAT-011 walks all session outputs for three phones and public views without leaking browser IDs or tokens', () => {
  const s = setup(3, fixture, 100000);
  const room = { ...s.room, players: s.room.players.map(p => ({ ...p, browserId: `secret-browser-${String(p.seat)}`, claimedBy: `secret-claimer-${String(p.seat)}` })) };
  s.session.updateRoom(room); s.session.pause('seat-2'); s.session.resume('seat-1'); s.frame();
  const secrets = room.players.flatMap(p => [p.browserId, p.claimedBy, p.seatToken]);
  const walk = (value: unknown): void => {
    if (typeof value === 'string') { for (const secret of secrets) expect(value).not.toContain(secret); }
    else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) { expect(['browserId', 'claimedBy', 'seatToken']).not.toContain(key); walk(child); }
  };
  for (const message of s.transport.messages) walk(message);
  for (const view of s.views) walk(view);
  for (const [connection, status] of s.transport.statuses) walk({ connection, status });
  expect(new Set(s.transport.messages.map(m => m.connection))).toEqual(new Set(['c1', 'c2', 'c3']));
  expect(new Set(s.transport.messages.map(m => m.type))).toEqual(new Set(['layout', 'view']));
});
it('PLAT-035 more than two missing names use the count; a chosen pause during countdown stays paused', () => {
  const s = setup(4, fixture, 100000); let room = s.room;
  for (const seat of [2, 3, 4]) room = applyHostEvent(room, { type: 'disconnect', seat }, 0).state;
  s.session.updateRoom(room); s.frame(3001);
  expect(s.events.at(-1)).toMatchObject({ message: 'Waiting for 3 players to rejoin' });
  for (const seat of [2, 3, 4]) room = applyPhoneEvent(room, { deviceId: `d${String(seat)}`, connectionId: `new${String(seat)}` }, { type: 'resume', seatToken: String(seat).repeat(32) }, 0).state;
  s.session.updateRoom(room); expect(s.events.at(-1)).toMatchObject({ countdown: 3 });
  s.session.pause('seat-1'); s.frame(4000); expect(s.session.paused).toBe(true);
});

it('PLAT-034 name claim preserves non-zero score, eligibility and private state without join or leave', () => {
  const calls: string[] = [];
  const game = { ...fixture,
    init(...args: Parameters<typeof fixture.init>) { return { ...fixture.init(...args), data: { eligible: true, hand: ['private-card'] } }; },
    join(s: FixtureState) { calls.push('join'); return s; },
    leave(s: FixtureState) { calls.push('leave'); return s; },
    results(s: FixtureState) { const result = fixture.results(s); return { ...result, players: result.players.map(p => ({ ...p, score: s.presses })) }; },
  };
  const s = setup(2, game, 100000);
  s.buffer.receive('seat-2', 0, 1, [0, 0, 0, 0]); s.frame();
  const before = s.session.state;
  if (!before) throw new Error('Expected running state');
  const scores = game.results(before);
  const privateState = game.privateView(before, 'seat-2');
  expect(scores.players[1]?.score).toBeGreaterThan(0);
  const held = applyHostEvent(s.room, { type: 'disconnect', seat: 2 }, 0).state;
  s.session.updateRoom(held);
  const claimed = applyPhoneEvent(held, { browserId: 'fresh-browser-123456', connectionId: 'fresh', deviceId: 'fresh' }, { type: 'claim', seat: 2, seatToken: 'fresh-token-1234567890123456' }, 0);
  expect(claimed.result.ok).toBe(true); s.session.updateRoom(claimed.state);
  expect(s.session.state).toBe(before);
  const after = s.session.state;
  if (!after) throw new Error('Expected claimed state');
  expect(game.results(after)).toEqual(scores);
  expect(game.privateView(after, 'seat-2')).toEqual(privateState);
  expect(s.session.state?.players).toEqual(before.players);
  expect(s.session.state?.data).toEqual({ eligible: true, hand: ['private-card'] });
  expect(calls).toEqual([]);
});
