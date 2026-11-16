// C-10 independent review attack cases. Each `it` states the expected correct behaviour.
import { describe, expect, it } from 'vitest';
import { cloneState, createInputBuffer, createSimLoop } from '@kaki/sim-core';
import { BUTTON, EMPTY_SETUP, STEP_MS } from '../game/index';
import type { GameModule, PlayerInfo } from '../game/types';
import type { Tick } from '../game/drive';
import type { ControllerLayout, PrivateView } from '../game/layout';
import { applyHostEvent, applyPhoneEvent, createRoom } from '../room/room';
import type { RoomState } from '../room/room';
import { createSession } from './index';
import type { SessionEvent, SessionTransport, SessionTransportEvent } from './index';
import { fixture } from './session.fixture';
import type { FixtureState } from './session.fixture';

const tok = (seat: number): string => String(seat).repeat(32);
function join(room: RoomState, seat: number, connection = `c${String(seat)}`): RoomState {
  return applyPhoneEvent(room, { deviceId: `d${String(seat)}`, connectionId: connection },
    { type: 'join', name: `Guest ${String(seat)}`, seatToken: tok(seat) }, room.clock).state;
}
function makeRoom(n: number): RoomState {
  let room = createRoom();
  for (let i = 1; i <= n; i++) room = join(room, i);
  return applyHostEvent(room, { type: 'phase', phase: 'playing', allowRunningJoin: true }, 0).state;
}
/** Like the real wire today: no acknowledge-resume ever arrives. Optional Peer-style revision suppression. */
class Wire implements SessionTransport {
  receive: (e: SessionTransportEvent) => void = () => undefined;
  sent: { connection: string; type: string; value: unknown }[] = [];
  last = new Map<string, number>();
  suppress = false;
  fail = new Set<string>();
  sendLayout(connection: string, layout: ControllerLayout): boolean {
    if (this.fail.has(`layout:${connection}`)) return false;
    if (this.suppress && this.last.get(connection) === layout.revision) return false;
    this.last.set(connection, layout.revision);
    this.sent.push({ connection, type: 'layout', value: cloneState(layout) }); return true;
  }
  sendPrivateView(connection: string, view: PrivateView | null): boolean {
    if (this.fail.has(`view:${connection}`)) return false;
    this.sent.push({ connection, type: 'view', value: cloneState(view) }); return true;
  }
  status(): void { /* Shell. */ }
  fence(): void { /* HostInput.pause/acknowledgeResume. */ }
  subscribe(fn: (e: SessionTransportEvent) => void): () => void { this.receive = fn; return () => { this.receive = () => undefined; }; }
  tap(c: string, control = 'pick', value: string | number = 'yes', revision?: number): void {
    this.receive({ type: 'tap', connectionId: c, action: { control, value, revision: revision ?? this.last.get(c) ?? 0 } });
  }
}
function setup(n = 2, game: GameModule<FixtureState, { steps: number }, { step: number }> = fixture, steps = 300, teams = false, room0?: RoomState) {
  let room = room0 ?? makeRoom(n);
  if (teams) for (let s = 1; s <= n; s++) room = applyHostEvent(room, { type: 'team', seat: s, team: s % 2 ? 'red' : 'blue' }, 0).state;
  const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 });
  const wire = new Wire();
  const events: SessionEvent[] = []; const log: Tick[] = [];
  let frame: (ms: number) => void = () => undefined;
  const session = createSession({ game, settings: { steps }, seed: 5, room, context: { ...EMPTY_SETUP, teams }, buffer, transport: wire,
    loop: createSimLoop, frames: { subscribe(fn) { frame = fn; return () => { frame = () => undefined; }; } },
    publicView() { /* TV. */ }, event(e) { events.push(e); }, record(t) { log.push(cloneState(t)); } });
  const seq = new Map<string, number>();
  const press = (id: string, buttons: number): void => { const s = seq.get(id) ?? 0; buffer.receive(id, s, buttons); seq.set(id, s + 1); };
  return { session, buffer, wire, events, log, room, press, frame: (ms = STEP_MS) => { frame(ms); }, run(k: number) { for (let i = 0; i < k; i++) frame(STEP_MS); } };
}

describe('C-10 review attacks', () => {
  it('A1 PLAT-023: after one pause and resume on today\'s wire (no ack message), players can still press and tap', () => {
    const s = setup(2); s.run(2);
    s.session.pause('seat-2'); s.session.resume('seat-1');
    s.run(1);
    s.press('seat-1', 1); s.wire.tap('c2'); s.run(1);
    s.press('seat-1', 0); s.run(1);
    expect(s.session.state?.presses).toBeGreaterThan(0);
    expect(s.session.state?.actions.length).toBeGreaterThan(0);
  });
  it('A2 PLAT-007: a reconnected phone on today\'s wire can play again', () => {
    const s = setup(2); s.run(2);
    s.wire.receive({ type: 'connection', connectionId: 'c2', connected: false }); s.run(1);
    s.wire.receive({ type: 'connection', connectionId: 'c2', connected: true }); s.run(30);
    s.press('seat-2', 1); s.wire.tap('c2'); s.run(1);
    expect(s.session.state?.presses).toBeGreaterThan(0);
    expect(s.session.state?.actions).toContain('seat-2:pick:yes');
  });
  it('A3 PLAT-006/NET-001: after a leader change, with real Peer revision suppression, taps still count', () => {
    const s = setup(3); s.wire.suppress = true; s.run(2);
    const room = applyPhoneEvent(s.room, { deviceId: 'd1', connectionId: 'c1', seat: 1 }, { type: 'leave' }, 0).state;
    s.session.updateRoom(room); s.run(2);
    s.wire.tap('c3'); s.run(1);
    expect(s.session.state?.actions).toContain('seat-3:pick:yes');
  });
  it('A4 PLAT-031: a disabled option that becomes enabled (no revision bump, per layout.ts) reaches the phone and its tap counts', () => {
    const game = { ...fixture, controllerLayout: (st: FixtureState) => ({ revision: 0, controls: [{ kind: 'options' as const, id: 'pick',
      options: [{ id: 'yes', label: 'Yes', state: st.step < -295 ? 'disabled' as const : 'plain' as const }] }] }) };
    const s = setup(1, game); s.run(10);
    const layouts = s.wire.sent.filter(m => m.type === 'layout');
    expect(JSON.stringify(layouts.at(-1)?.value)).not.toContain('disabled');
    s.wire.tap('c1'); s.run(1);
    expect(s.session.state?.actions).toEqual(['seat-1:pick:yes']);
  });
  it('A5 NET-001: a failed private-view send is retried to that phone only, including while paused (pause hides private content)', () => {
    const s = setup(3); s.wire.sent = []; s.wire.fail.add('view:c2');
    s.session.pause('seat-1'); // fixture private view revision changes on pause
    expect(s.wire.sent.filter(m => m.type === 'view').map(m => m.connection)).toEqual(['c1', 'c3']);
    s.wire.fail.clear(); s.run(30); // frames keep coming while paused
    expect(s.wire.sent.filter(m => m.type === 'view').map(m => m.connection)).toEqual(['c1', 'c3', 'c2']);
  });
  it('A5b NET-001: failed send retried to that phone only while running', () => {
    const s = setup(3); s.wire.sent = []; s.wire.fail.add('view:c2');
    s.session.pause('seat-1'); s.wire.fail.clear(); s.session.resume('seat-1'); s.session.pause('seat-1');
    expect(s.wire.sent.filter(m => m.type === 'view').map(m => m.connection)).toEqual(['c1', 'c3', 'c1', 'c3', 'c1', 'c2', 'c3']);
  });
  it('A6 PLAT-025 contract: a mid-match joiner in a team match reaches game.join with a team', () => {
    let joined: PlayerInfo | undefined;
    const game = { ...fixture, meta: { ...fixture.meta, players: { min: 2, max: 8 } }, join: (st: FixtureState, p: PlayerInfo) => { joined = p; return fixture.join(st, p); } };
    const s = setup(2, game, 300, true); s.run(2);
    let room = join(s.room, 3); s.session.updateRoom(room);
    expect(joined).toBeUndefined();
    room = applyHostEvent(room, { type: 'team', seat: 3, team: 'blue' }, 0).state; s.session.updateRoom(room);
    expect(joined?.team === 0 || joined?.team === 1).toBe(true);
  });
  it('A7 PLAT-025: a team assigned after joining reaches the game (player info refreshed)', () => {
    let seen: PlayerInfo[] = [];
    const game = { ...fixture, join: (st: FixtureState, p: PlayerInfo) => { seen = [...seen, p]; return fixture.join(st, p); } };
    const s = setup(2, game, 300, true); s.run(2);
    let room = join(s.room, 3); s.session.updateRoom(room);
    room = applyHostEvent(room, { type: 'team', seat: 3, team: 'blue' }, 0).state; s.session.updateRoom(room);
    s.run(1);
    expect(s.session.state?.players.find(p => p.id === 'seat-3')?.team).toBe(1);
  });
  it.each(['results', 'isOver', 'pause', 'resume', 'init'] as const)('A8 PLAT-030: a throwing %s ends with an error carrying seed and step, never throws out', method => {
    let throwing = method === 'init';
    const game = { ...fixture, [method]: (...a: unknown[]) => { if (throwing) throw new Error('x'); return (fixture[method] as (...b: unknown[]) => unknown)(...a); } } as typeof fixture;
    const s = setup(1, game, 3); throwing = true;
    expect(() => { s.session.pause('seat-1'); s.session.resume('seat-1'); s.run(10); }).not.toThrow();
    expect(s.events.some(e => e.type === 'error' && e.seed === 5)).toBe(true);
  });
  it('A9 types.ts leave contract: a match short of players that nobody can rejoin ends (results), not paused for ever', () => {
    const game = { ...fixture, meta: { ...fixture.meta, players: { min: 2, max: 8 } } };
    const s = setup(2, game); s.run(2);
    const room = applyPhoneEvent(s.room, { deviceId: 'd2', connectionId: 'c2', seat: 2 }, { type: 'leave' }, 0).state;
    s.session.updateRoom(room); s.run(100000);
    expect(s.events.some(e => e.type === 'results')).toBe(true);
  });
  it('A10 D-060: leader drops while paused; after the room hands over, the new leader resumes', () => {
    const s = setup(3); s.run(2); s.session.pause('seat-2');
    let room = applyHostEvent(s.room, { type: 'disconnect', seat: 1 }, 0).state; s.session.updateRoom(room);
    s.session.resume('seat-1'); expect(s.session.paused).toBe(true);
    room = applyHostEvent(room, { type: 'expire' }, 11000).state; s.session.updateRoom(room);
    s.session.resume('seat-2'); expect(s.session.paused).toBe(false);
  });
  it('A11 room/transport agreement: a stale room snapshot does not mark a dropped phone connected', () => {
    const s = setup(2); s.run(2);
    s.wire.receive({ type: 'connection', connectionId: 'c2', connected: false });
    s.session.updateRoom(s.room); // unrelated room update, room has not processed the drop yet
    s.run(1);
    expect(s.log.at(-1)?.connected.get('seat-2')).toBe(false);
  });
  it('A12 NET-001: a disconnected phone is not sent layouts or views', () => {
    const s = setup(2); s.run(2);
    const room = applyHostEvent(s.room, { type: 'disconnect', seat: 2 }, 0).state; s.session.updateRoom(room);
    s.wire.sent = []; s.session.pause('seat-1');
    expect(s.wire.sent.some(m => m.connection === 'c2')).toBe(false);
  });
  it('A13 types.ts: disconnected players send no frames (map has no frame for them)', () => {
    const s = setup(2); s.run(2);
    s.wire.receive({ type: 'connection', connectionId: 'c2', connected: false }); s.run(2);
    expect(s.log.at(-1)?.frames.has('seat-2')).toBe(false);
  });
  it('A14 PLAT-022: quit by the leader goes to the picker; quit/pause after the end are refused; backToPicker before the end does nothing', () => {
    const s = setup(2, fixture, 3); s.session.backToPicker(); expect(s.events).toEqual([]);
    s.run(5); expect(s.events.at(-1)?.type).toBe('results');
    expect(s.session.quit('seat-1', true)).toBe('forbidden');
    s.session.backToPicker(); s.session.backToPicker();
    expect(s.events.filter(e => e.type === 'picker')).toHaveLength(1);
  });
  it('A15 PLAT-023: START held into a resume does not re-pause; START never reaches the game', () => {
    let start = 0;
    const game = { ...fixture, step: (st: FixtureState, i: Parameters<typeof fixture.step>[1], dt: number) => { for (const f of i.frames.values()) start |= (f.held | f.pressed | f.released) & (1 << BUTTON.START); return fixture.step(st, i, dt); } };
    const s = setup(1, game); s.run(1);
    s.press('seat-1', 1 << BUTTON.START); s.run(1); expect(s.session.paused).toBe(true);
    s.session.resume('seat-1'); s.press('seat-1', 1 << BUTTON.START); s.run(3);
    expect(s.session.paused).toBe(false); expect(start).toBe(0);
  });
  it('A16 deadlock: blue team empties, a newcomer joins and is put on blue; the leader can resume', () => {
    const game = { ...fixture, meta: { ...fixture.meta, players: { min: 2, max: 8 } } };
    const s = setup(2, game, 300, true); s.run(2);
    let room = applyPhoneEvent(s.room, { deviceId: 'd2', connectionId: 'c2', seat: 2 }, { type: 'leave' }, 0).state;
    s.session.updateRoom(room); expect(s.session.paused).toBe(true);
    room = join(room, 3); s.session.updateRoom(room);
    room = applyHostEvent(room, { type: 'team', seat: (room.players.find(p => p.deviceId === 'd3')?.seat ?? 2), team: 'blue' }, 0).state; s.session.updateRoom(room);
    s.session.resume('seat-1');
    expect(s.session.paused).toBe(false);
  });
  it('A17 secrets: the host-only lifecycle log does not carry seat tokens or device ids', () => {
    const logged: unknown[] = [];
    const room = makeRoom(2);
    const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 });
    const session = createSession({ game: fixture, settings: { steps: 30 }, seed: 1, room, context: EMPTY_SETUP, buffer, transport: new Wire(),
      publicView() { /* TV */ }, event() { /* shell */ }, recordInput(i) { logged.push(i); } });
    session.updateRoom(join(room, 3));
    expect(JSON.stringify(logged)).not.toContain(tok(3));
  });
});


it('PLAT-030 NET-001 console lifecycle events replay in the harness without identities', async () => {
  const { replayMatch } = await import('../harness');
  const { encodeState, hashState } = await import('@kaki/sim-core');
  const events: unknown[] = [];
  const room = makeRoom(2);
  const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 });
  const wire = new Wire();
  const session = createSession({ game: fixture, settings: { steps: 300 }, seed: 1, room, context: EMPTY_SETUP, buffer, transport: wire,
    publicView() { /* TV */ }, event() { /* Shell */ }, recordInput(e) { events.push(encodeState(cloneState(e))); } });
  const initialHash = hashState(session.state);
  const players = (session.state?.players ?? []);
  session.advance(STEP_MS);
  session.updateRoom(join(room, 3));
  wire.receive({ type: 'connection', connectionId: 'c2', connected: false });
  session.advance(STEP_MS); session.pause('seat-1'); session.resume('seat-1');
  session.updateRoom(room); session.advance(STEP_MS);
  const file = { format: 'kaki-match-3' as const, game: fixture.meta.id,
    options: { seed: 1, players, settings: { steps: 300 }, context: EMPTY_SETUP }, initialHash, initialView: { step: -300 }, views: [],
    recording: { runs: events.map(event => ({ count: 1, event })), hashes: [{ event: events.length, step: session.step, hash: hashState(session.state) }] } };
  expect(replayMatch(fixture, file).matches).toBe(true);
  expect(JSON.stringify(file)).not.toContain(tok(3));
});

it('PLAT-025 D-082 later room team assignment preserves the seated game team', () => {
  const seen: PlayerInfo[] = [];
  const game = { ...fixture, join(st: FixtureState, p: PlayerInfo) { seen.push(p); return fixture.join(st, p); } };
  const s = setup(2, game, 300, true);
  const room = applyHostEvent(s.room, { type: 'team', seat: 2, team: 'red' }, 0).state;
  s.session.updateRoom(room);
  expect(seen).toEqual([]);
  expect(s.session.state?.players.filter(p => p.id === 'seat-2')).toEqual([expect.objectContaining({ id: 'seat-2', team: 1 })]);
  expect(s.session.paused).toBe(false);
});

it('PLAT-030 invalid settings fail clearly before game init', () => {
  const s = setup(1, fixture, 0);
  expect(s.session.ended).toBe(true);
  const event = s.events[0];
  expect(event?.type === 'error' && event.operation).toContain('settings:');
});

it('PLAT-022 caller errors in quit and picker callbacks never escape', () => {
  const room = makeRoom(1);
  const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 });
  const session = createSession({ game: fixture, settings: { steps: 30 }, seed: 1, room, context: EMPTY_SETUP, buffer, transport: new Wire(),
    publicView() { /* TV */ }, event() { throw new Error('subscriber'); } });
  expect(() => session.quit('seat-1', true)).not.toThrow();
  expect(() => { session.backToPicker(); }).not.toThrow();
});

it('PLAT-023 optional resume fence times out in steps and is off by default', () => {
  const room = makeRoom(1);
  const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 });
  const wire = new Wire();
  const session = createSession({ game: fixture, settings: { steps: 300 }, seed: 1, room, context: EMPTY_SETUP, buffer, transport: wire,
    resumeFenceSteps: 2, publicView() { /* TV */ }, event() { /* Shell */ } });
  session.pause('seat-1'); session.resume('seat-1');
  buffer.receive('seat-1', 0, 1); wire.tap('c1'); session.advance(STEP_MS);
  expect(session.state?.presses).toBe(0); expect(session.state?.actions).toEqual([]);
  buffer.receive('seat-1', 1, 0); session.advance(STEP_MS);
  buffer.receive('seat-1', 2, 1); wire.tap('c1'); session.advance(STEP_MS);
  expect(session.state?.presses).toBe(1); expect(session.state?.actions).toHaveLength(1);
});

it('PLAT-022 confirmed leader quit while short ends in results', () => {
  const s = setup(2, { ...fixture, meta: { ...fixture.meta, players: { min: 2, max: 8 } } });
  s.session.updateRoom({ ...s.room, players: s.room.players.slice(0, 1) });
  expect(s.session.quit('seat-1', true)).toBe('quit');
  expect(s.events.at(-1)?.type).toBe('results');
});

it('NET-001 transport connection truth also wins after a duplicate connected notification', () => {
  const s = setup(2);
  s.wire.receive({ type: 'connection', connectionId: 'c2', connected: true });
  const stale = applyHostEvent(s.room, { type: 'disconnect', seat: 2 }, 0).state;
  s.session.updateRoom(stale); s.frame();
  expect(s.log.at(-1)?.connected.get('seat-2')).toBe(true);
});
