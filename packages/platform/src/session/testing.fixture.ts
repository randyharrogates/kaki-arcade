// C-10 review support: runs a real game through createSession and the dev harness with identical inputs.
import { applyHostEvent, applyPhoneEvent, createRoom, createSession, STEP_MS, AXIS_COUNT } from '@kaki/platform';
import type { GameModule, JsonValue, PlayerInfo, RoomState, Secret, SessionEvent, SessionTransport,
  SessionTransportEvent, ControllerLayout, PrivateView, InitContext } from '@kaki/platform';
import { createMatch } from '@kaki/platform/harness';
import { createInputBuffer, hashState } from '@kaki/sim-core';
const INPUT_STALE_STEPS = 15, SEQ_MODULO = 65536; // protocol values

export const token = (seat: number): string => String(seat % 10).repeat(32);
export function joinRoom(room: RoomState, seat: number, connection = `c${String(seat)}`): RoomState {
  const r = applyPhoneEvent(room, { deviceId: `d${String(seat)}`, connectionId: connection },
    { type: 'join', name: `Guest ${String(seat)}`, seatToken: token(seat) }, room.clock);
  if (!r.result.ok) throw new Error(`join refused ${r.result.reason}`);
  return r.state;
}
export function makeRoom(n: number, teams = false): RoomState {
  let room = createRoom();
  for (let i = 1; i <= n; i++) room = joinRoom(room, i);
  room = applyHostEvent(room, { type: 'phase', phase: 'playing', allowRunningJoin: true }, 0).state;
  if (teams) for (let s = 1; s <= n; s++) room = applyHostEvent(room, { type: 'team', seat: s, team: s % 2 ? 'red' : 'blue' }, 0).state;
  return room;
}
export interface Sent { connection: string; type: 'layout' | 'view'; value: unknown; step: number }
export class FakeTransport implements SessionTransport {
  receive: (e: SessionTransportEvent) => void = () => undefined;
  sent: Sent[] = [];
  failNext = new Set<string>();
  fences: { connection: string; seq: number | null }[] = [];
  statuses: { connection: string; paused: boolean; generation: number }[] = [];
  lastLayout = new Map<string, ControllerLayout>();
  onSend: (connection: string, type: 'layout' | 'view', value: unknown) => void = () => undefined;
  step = (): number => 0;
  /** Behaves like netcode Peer.sendHost: suppresses a layout whose revision equals the last sent. */
  peerSuppression = false;
  sendLayout(connection: string, layout: ControllerLayout): boolean {
    if (this.failNext.delete(`layout:${connection}`)) return false;
    if (this.peerSuppression && this.lastLayout.get(connection)?.revision === layout.revision) return false;
    this.onSend(connection, 'layout', layout);
    this.sent.push({ connection, type: 'layout', value: JSON.parse(JSON.stringify(layout)) as unknown, step: this.step() });
    this.lastLayout.set(connection, layout); return true;
  }
  sendPrivateView(connection: string, view: PrivateView | null): boolean {
    if (this.failNext.delete(`view:${connection}`)) return false;
    this.onSend(connection, 'view', view);
    this.sent.push({ connection, type: 'view', value: JSON.parse(JSON.stringify(view)) as unknown, step: this.step() }); return true;
  }
  fence(connection: string, seq: number | null): void { this.fences.push({ connection, seq }); }
  status(connection: string, paused: boolean, generation: number): void { this.statuses.push({ connection, paused, generation }); }
  subscribe(fn: (e: SessionTransportEvent) => void): () => void { this.receive = fn; return () => { this.receive = () => undefined; }; }
  tap(connection: string, control: string, value?: string | number, revision?: number): void {
    const rev = revision ?? this.lastLayout.get(connection)?.revision ?? -1;
    this.receive({ type: 'tap', connectionId: connection, action: { control, ...(value === undefined ? {} : { value }), revision: rev } });
  }
}

/** Kit-style search: does `value` (anything sent to a phone) contain the secret? */
export function leaks(secret: Secret, value: unknown, path = ''): string | null {
  const v = value as JsonValue;
  if (secret.match) { if (secret.match(v, path)) return path; }
  else {
    if (JSON.stringify(v) === JSON.stringify(secret.value)) return path;
    if (typeof v === 'string' && typeof secret.value === 'string' && secret.value.length >= 2 && v.includes(secret.value)) return path;
  }
  if (v !== null && typeof v === 'object') {
    if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { const f = leaks(secret, v[i], `${path}[${String(i)}]`); if (f) return f; } }
    else for (const [k, x] of Object.entries(v)) {
      if (!secret.match && JSON.stringify(k) === JSON.stringify(secret.value)) return `${path}.${k}`;
      const f = leaks(secret, x, path ? `${path}.${k}` : k); if (f) return f;
    }
  }
  return null;
}

export interface TwinOptions<S, Settings extends object, View> {
  game: GameModule<S, Settings, View>; seed: number; players: number; teams?: boolean;
  settings: NoInfer<Partial<Settings>>; context?: Partial<InitContext>;
}
/** One runner session and one harness match, fed identical inputs. */
export function twin<S, Settings extends object, View>(o: TwinOptions<S, Settings, View>) {
  const teams = o.teams ?? false;
  const room = makeRoom(o.players, teams);
  const context: InitContext = { data: {}, saved: null, ...o.context, teams };
  const buffer = createInputBuffer<string>({ axisCount: AXIS_COUNT, seqModulus: SEQ_MODULO, staleAfterSteps: INPUT_STALE_STEPS });
  const transport = new FakeTransport();
  const events: SessionEvent[] = [];
  const publicViews: unknown[] = [];
  let frame: (ms: number) => void = () => undefined;
  const leaksFound: string[] = [];
  const holder: { state: () => S | undefined; step: () => number } = { state: () => undefined, step: () => 0 };
  const session = createSession({ game: o.game, settings: o.settings as Settings, seed: o.seed, room, context, buffer, transport,
    frames: { subscribe(fn) { frame = fn; return () => { frame = () => undefined; }; } },
    publicView(v) {
      publicViews.push(v);
      const st = holder.state(); if (st === undefined) return;
      for (const s of o.game.secrets(st)) { const f = leaks(s, v); if (f) leaksFound.push(`public step ${String(holder.step())} ${s.label} at ${f}`); }
    },
    event(e) { events.push(e); } });
  holder.state = () => session.state; holder.step = () => session.step;
  transport.step = () => session.step;
  // Privacy: every payload checked against secrets() of the state at the moment it is sent.
  transport.onSend = (connection, type, value) => {
    const st = session.state; if (st === undefined) return;
    const id = `seat-${connection.slice(1).split('-')[0] ?? ''}`;
    for (const s of o.game.secrets(st)) {
      if (s.owner === id) continue;
      const f = leaks(s, value); if (f) leaksFound.push(`${type} to ${id} step ${String(session.step)}: ${s.label} at ${f}`);
    }
  };
  const players: PlayerInfo[] = room.players.map(p => ({ id: `seat-${String(p.seat)}`, seat: p.seat, name: p.name,
    colour: `seat-${String(p.seat)}` as PlayerInfo['colour'], ...(teams ? { team: (p.team === 'red' ? 0 : 1) } : {}) }));
  const match = createMatch(o.game, { seed: o.seed, players, teams, settings: o.settings, context, record: false });
  const seq = new Map<string, number>();
  const pads = new Map<string, { buttons: number; x: number; y: number }>();
  for (const p of players) { seq.set(p.id, 0); pads.set(p.id, { buttons: 0, x: 0, y: 0 }); }
  const api = {
    session, match, transport, events, buffer, room, publicViews, leaksFound, players,
    set(id: string, buttons: number, x = 0, y = 0) { pads.set(id, { buttons, x, y }); },
    tap(id: string, control: string, value?: string | number) {
      const seat = Number(id.slice(5));
      transport.tap(`c${String(seat)}`, control, value);
      if (!match.disconnected.has(id) && !match.paused) match.tap(id, control, value, true, o.game.controllerLayout(match.state, id).revision);
    },
    step(): void {
      for (const p of players) {
        const pad = pads.get(p.id) ?? { buttons: 0, x: 0, y: 0 };
        // Harness side: drive its pad through the public API (refusal bypassed: both sides get identical raw input).
        match.stick(p.id, pad.x, pad.y, true);
        for (let b = 0; b < 12; b++) {
          const names = ['up', 'down', 'left', 'right', 'faceBottom', 'faceRight', 'faceLeft', 'faceTop', 'shoulderLeft', 'shoulderRight', 'pause', 'shake'] as const;
          const name = names[b]; if (name === undefined) continue;
          if (pad.buttons & (1 << b)) match.press(p.id, name, true); else match.release(p.id, name);
        }
        const s = (seq.get(p.id) ?? 0);
        buffer.receive(p.id, s, pad.buttons, [pad.x, pad.y, 0, 0]); seq.set(p.id, (s + 1) % SEQ_MODULO);
      }
      match.step(1);
      frame(STEP_MS);
    },
    hashes(): [string, string] { return [hashState(match.state), hashState(session.state)]; },
  };
  return api;
}
