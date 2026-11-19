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


const BTN = () => ({ revision: 0, controls: [{ kind: 'button' as const, id: 'b', button: 'face-bottom' as const, label: 'X' }, { kind: 'options' as const, id: 'pick', options: [{ id: 'yes', label: 'Yes' }] }] });
describe('C-10 round 3', () => {
  it('Q1 in-place game mutating and returning the same layout object: change is sent', () => {
    const L = { revision: 0, controls: [{ kind: 'options' as const, id: 'pick', options: [{ id: 'yes', label: 'Yes', state: 'disabled' as 'disabled' | 'plain' }] }] };
    const game = { ...fixture, stepMode: 'in-place' as const, controllerLayout: (st: FixtureState) => { (L.controls[0]?.options[0] as { state: string }).state = st.step < -295 ? 'disabled' : 'plain'; return L; } };
    const s = setup(1, game); s.run(10);
    expect(JSON.stringify(s.wire.sent.filter(m => m.type === 'layout').at(-1)?.value)).not.toContain('disabled');
  });
  it('Q1b in-place private view mutated in place: change is sent', () => {
    const V = { revision: 0, blocks: [{ kind: 'stat' as const, label: 'Score', value: 0 }] };
    const game = { ...fixture, stepMode: 'in-place' as const, privateView: (st: FixtureState) => { V.revision = st.step + 300; (V.blocks[0] as { value: number }).value = st.step + 300; return V; } };
    const s = setup(1, game); s.run(10);
    expect(JSON.stringify(s.wire.sent.filter(m => m.type === 'view').at(-1)?.value)).toContain('"value":10');
  });
  it('Q2 held through pause and resume: no phantom release or press; tap during pause dropped', () => {
    let rel = 0, pr = 0;
    const game = { ...fixture, controllerLayout: BTN, step: (st: FixtureState, i: Parameters<typeof fixture.step>[1], dt: number) => { for (const f of i.frames.values()) { rel += f.released & 16; pr += f.pressed & 16; } return fixture.step(st, i, dt); } };
    const s = setup(1, game); s.run(1); s.press('seat-1', 16); s.run(1);
    s.session.pause('seat-1'); for (let k = 0; k < 10; k++) { s.press('seat-1', 16); s.frame(); }
    s.wire.tap('c1'); s.session.resume('seat-1'); for (let k = 0; k < 5; k++) { s.press('seat-1', 16); s.frame(); }
    expect({ rel, pr }).toEqual({ rel: 0, pr: 16 });
    expect(s.session.state?.actions).toEqual([]);
  });
  it('Q3 team frozen: change, null, reassign → no join/leave, enough() agrees with game', () => {
    let joins = 0, leaves = 0;
    const game = { ...fixture, meta: { ...fixture.meta, players: { min: 2, max: 8 } }, join(st: FixtureState, p: PlayerInfo) { joins++; return fixture.join(st, p); }, leave(st: FixtureState, id: string) { leaves++; return fixture.leave(st, id); } };
    const s = setup(2, game, 300, true); s.run(2);
    let room = applyHostEvent(s.room, { type: 'team', seat: 2, team: 'red' }, 0).state; s.session.updateRoom(room);
    room = applyHostEvent(room, { type: 'team', seat: 2, team: null }, 0).state; s.session.updateRoom(room);
    room = applyHostEvent(room, { type: 'team', seat: 2, team: 'red' }, 0).state; s.session.updateRoom(room);
    s.run(1);
    expect({ joins, leaves, paused: s.session.paused, step: s.session.step }).toEqual({ joins: 0, leaves: 0, paused: false, step: 3 });
    room = join(room, 3); s.session.updateRoom(room); expect(joins).toBe(0);
    room = applyHostEvent(room, { type: 'team', seat: 3, team: 'blue' }, 0).state; s.session.updateRoom(room);
    expect(joins).toBe(1);
  });
  it('Q4 pruning keeps cosmetic resends of the current game revision usable by an in-flight tap', () => {
    const game = { ...fixture, controllerLayout: (st: FixtureState) => ({ revision: 0, controls: [{ kind: 'options' as const, id: 'pick', options: [{ id: 'yes', label: `Yes ${String(st.step)}` }] }] }) };
    const s = setup(1, game); s.run(3);
    const n = s.wire.last.get('c1') ?? 0;
    s.run(5); s.wire.tap('c1', 'pick', 'yes', n); s.run(1);
    expect(s.session.state?.actions).toEqual(['seat-1:pick:yes']);
  });
});

it('PLAT-011 removing a running player invokes the existing game leave path once', () => {
  const left: string[] = [];
  const game = { ...fixture, leave(state: FixtureState, id: string) { left.push(id); return fixture.leave(state, id); } };
  const s = setup(3, game); s.run(2);
  const result = applyHostEvent(s.room, { type: 'remove', seat: 3 }, s.room.clock);
  s.session.updateRoom(result.state); s.session.updateRoom(result.state);
  expect(left).toEqual(['seat-3']);
  expect(s.session.state?.players.map(p => p.id)).not.toContain('seat-3');
});
