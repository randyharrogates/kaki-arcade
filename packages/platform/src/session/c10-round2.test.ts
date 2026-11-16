// C-10 independent review attack cases. Each `it` states the expected correct behaviour.
import { describe, expect, it } from 'vitest';
import { cloneState, createInputBuffer, createSimLoop } from '@kaki/sim-core';
import { EMPTY_SETUP, STEP_MS } from '../game/index';
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


describe('C-10 round 2 variations', () => {
  it('R1 sim-core rule 2: a button let go during a pause (frames running) gives one released after resume', () => {
    let released = 0, pressed = 0;
    const game = { ...fixture, controllerLayout: () => ({ revision: 0, controls: [{ kind: 'button' as const, id: 'b', button: 'face-bottom' as const, label: 'X' }] }),
      step: (st: FixtureState, i: Parameters<typeof fixture.step>[1], dt: number) => { for (const f of i.frames.values()) { released += f.released & 16; pressed += f.pressed & 16; } return fixture.step(st, i, dt); } };
    const s = setup(1, game); s.run(1);
    s.press('seat-1', 16); s.run(1); expect(pressed).toBe(16);
    s.session.pause('seat-1'); s.wire.tap('c1');
    s.press('seat-1', 0); s.run(10);           // let go during the pause, frames keep arriving
    s.session.resume('seat-1'); s.run(1);
    expect(released).toBe(16);
  });
  it('R2 sim-core rule 2: a button pressed during a pause and still down gives one pressed after resume', () => {
    let pressed = 0;
    const game = { ...fixture, controllerLayout: () => ({ revision: 0, controls: [{ kind: 'button' as const, id: 'b', button: 'face-bottom' as const, label: 'X' }] }),
      step: (st: FixtureState, i: Parameters<typeof fixture.step>[1], dt: number) => { for (const f of i.frames.values()) pressed += f.pressed & 16; return fixture.step(st, i, dt); } };
    const s = setup(1, game); s.run(1);
    s.session.pause('seat-1'); s.press('seat-1', 16); s.run(10);
    s.session.resume('seat-1'); s.run(1);
    expect(pressed).toBe(16);
  });
  it('R3 pause/resume ten times, reconnect during pause: input and taps still count', () => {
    const s = setup(2); s.run(1);
    for (let k = 0; k < 10; k++) { s.session.pause('seat-2'); s.run(3); s.session.resume('seat-1'); s.run(1); }
    s.session.pause('seat-2');
    s.wire.receive({ type: 'connection', connectionId: 'c2', connected: false });
    s.wire.receive({ type: 'connection', connectionId: 'c2', connected: true });
    s.session.resume('seat-1'); s.run(1);
    s.wire.tap('c2'); s.run(1);
    expect(s.session.state?.actions).toContain('seat-2:pick:yes');
  });
  it('R4 wire revision n tap: accepted after cosmetic n+1, refused after tappable change n+2', () => {
    // game revision 0 for steps < -290 (plain then disabled 'no'), then game revision 1
    const game = { ...fixture, controllerLayout: (st: FixtureState) => st.step < -290 ? { revision: 0, controls: [{ kind: 'options' as const, id: 'pick',
      options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No', state: st.step < -295 ? 'plain' as const : 'disabled' as const }] }] }
      : { revision: 1, controls: [{ kind: 'options' as const, id: 'pick', options: [{ id: 'maybe', label: 'Maybe' }] }] } };
    const s = setup(1, game); s.run(1);
    const n = s.wire.last.get('c1') ?? -1;
    s.run(5); expect(s.wire.last.get('c1')).toBe(n + 1);   // cosmetic resend
    s.wire.tap('c1', 'pick', 'yes', n); s.run(1);
    expect(s.session.state?.actions).toEqual(['seat-1:pick:yes']);
    s.run(10); expect(s.wire.last.get('c1')).toBe(n + 2);
    s.wire.tap('c1', 'pick', 'yes', n); s.wire.tap('c1', 'pick', 'yes', n + 1); s.run(1);
    expect(s.session.state?.actions).toEqual(['seat-1:pick:yes']);
  });
  it('R5 room team changes keep game teams fixed without duplicate joins (D-082)', () => {
    const seen: PlayerInfo[] = [];
    const game = { ...fixture, join(st: FixtureState, p: PlayerInfo) { seen.push(p); return fixture.join(st, p); } };
    const s = setup(4, game, 300, true); s.run(2);
    let room = applyHostEvent(s.room, { type: 'team', seat: 2, team: 'red' }, 0).state;
    room = applyHostEvent(room, { type: 'team', seat: 4, team: 'red' }, 0).state;
    s.session.updateRoom(room); s.run(1);
    // D-082: existing players keep their original team without another join.
    const inGame = (s.session.state?.players ?? []).filter(p => p.id === 'seat-2');
    expect(inGame).toHaveLength(1);
    expect(inGame[0]?.team).toBe(1);
    expect(seen).toHaveLength(0);
    expect(s.session.paused).toBe(false);
  });
  it('R6 a seated team stays fixed through a room team reset (D-082)', () => {
    let leaves = 0, joins = 0;
    const game = { ...fixture, join(st: FixtureState, p: PlayerInfo) { joins++; return fixture.join(st, p); }, leave(st: FixtureState, id: string) { leaves++; return fixture.leave(st, id); } };
    const s = setup(4, game, 300, true); s.run(2);
    let room = applyHostEvent(s.room, { type: 'team', seat: 3, team: null }, 0).state; s.session.updateRoom(room);
    room = applyHostEvent(room, { type: 'team', seat: 3, team: 'red' }, 0).state; s.session.updateRoom(room);
    expect(s.session.state?.players).toHaveLength(4);
    expect(s.session.paused).toBe(false);
    expect({ leaves, joins }).toEqual({ leaves: 0, joins: 0 });
  });
  it('R7 shortage ends exactly at the two-minute hold, not before', () => {
    const game = { ...fixture, meta: { ...fixture.meta, players: { min: 2, max: 8 } } };
    const s = setup(2, game, 100000); s.run(2);
    const room = applyPhoneEvent(s.room, { deviceId: 'd2', connectionId: 'c2', seat: 2 }, { type: 'leave' }, 0).state;
    s.session.updateRoom(room);
    s.frame(119999); expect(s.session.ended).toBe(false);
    s.frame(1); expect(s.events.at(-1)?.type).toBe('results');
  });
  it('R8 shortage ended by a joiner does not end the match later', () => {
    const game = { ...fixture, meta: { ...fixture.meta, players: { min: 2, max: 8 } } };
    const s = setup(2, game, 100000); s.run(2);
    let room = applyPhoneEvent(s.room, { deviceId: 'd2', connectionId: 'c2', seat: 2 }, { type: 'leave' }, 0).state;
    s.session.updateRoom(room); s.frame(60000);
    room = join(room, 3); s.session.updateRoom(room); s.frame(100000); s.frame(100000);
    expect(s.session.ended).toBe(false); s.session.resume('seat-1'); expect(s.session.paused).toBe(false);
  });
  it('R9 seat reused by a new player: the new phone gets fresh content, the old connection nothing', () => {
    const s = setup(2); s.run(2);
    let room = applyPhoneEvent(s.room, { deviceId: 'd2', connectionId: 'c2', seat: 2 }, { type: 'leave' }, 0).state;
    room = applyPhoneEvent(room, { deviceId: 'd9', connectionId: 'c9' }, { type: 'join', name: 'New', seatToken: '9'.repeat(32) }, 0).state;
    s.wire.sent = []; s.session.updateRoom(room); s.run(2);
    expect(s.wire.sent.some(m => m.connection === 'c2')).toBe(false);
    expect(s.wire.sent.filter(m => m.connection === 'c9').map(m => m.type).sort()).toEqual(['layout', 'view']);
  });
});
