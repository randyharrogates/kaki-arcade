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
