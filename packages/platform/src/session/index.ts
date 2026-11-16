import { cloneState, copyInputFrame, createInputFrame, createSimLoop, resetClock } from '@kaki/sim-core';
import type { InputBuffer, InputFrame, SimLoopOptions, SimLoop } from '@kaki/sim-core';
import { BUTTON, STEP_MS, stepModeOf } from '../game/types';
import type { GameModule, InitContext, PlayerAction, PlayerInfo, Results } from '../game/types';
import { createTick, driveStep } from '../game/drive';
import type { Tick } from '../game/drive';
import { layoutFor, privateViewFor, PAD_BUTTON_BIT } from '../game/layout';
import type { ControllerLayout, PrivateView } from '../game/layout';
import { sameLayout, sameView } from './compare';
import { RECONNECT_WINDOW_MS } from '../room/room';
import { mergeSettings, settingsSchema, validateSettings } from '../game/settings';
import type { MatchEvent } from '../harness/match';
import type { RoomPlayer, RoomState } from '../room/room';

/** Bound to an authenticated connection by the shell; never trust a seat inside phone JSON. */
export type SessionTransportEvent =
  | { type: 'tap'; connectionId: string; action: Omit<PlayerAction, 'player'> }
  | { type: 'connection'; connectionId: string; connected: boolean }
  | { type: 'acknowledge-resume'; connectionId: string; generation: number; nextSequence: number };
export interface SessionTransport {
  sendLayout(connectionId: string, layout: ControllerLayout): boolean;
  sendPrivateView(connectionId: string, view: PrivateView | null): boolean;
  /** Optional tightening only. Default pause/resume keeps HostInput feeding the buffer. */
  fence(connectionId: string, nextSequence: number | null): void;
  /** Shell draws pause state and forwards it through its room-state message. */
  status(connectionId: string, paused: boolean, generation: number): void;
  subscribe(receive: (event: SessionTransportEvent) => void): () => void;
}
/** Elapsed frame time is supplied externally. No timers or clock reads in platform. */
export interface SessionFrames { subscribe(frame: (elapsedMs: number) => void): () => void }
export type SessionEvent =
  | { type: 'results'; results: Results }
  | { type: 'error'; seed: number; step: number; operation: string }
  | { type: 'picker' }
  | { type: 'paused'; paused: boolean };
/** Host-only lifecycle log supplements sampled ticks for replay across room and pause changes. */
export type SessionInput = MatchEvent;
export interface SessionOptions<State, Settings extends object, View> {
  game: GameModule<State, Settings, View>;
  settings: Settings;
  seed: number;
  room: RoomState;
  context: InitContext;
  buffer: InputBuffer<string>;
  transport: SessionTransport;
  frames?: SessionFrames;
  loop?: (options: SimLoopOptions<State, Tick>) => SimLoop<State>;
  publicView(view: View, step: number): void;
  event(event: SessionEvent): void;
  /** Borrowed, pre-validation tick. Copy here if retaining a recording. No harness dependency. */
  record?(tick: Tick, step: number): void;
  resumeFenceSteps?: number;
  recordInput?(input: SessionInput, step: number): void;
}
interface Seat {
  room: RoomPlayer;
  player: PlayerInfo;
  frame: InputFrame;
  connected: boolean;
  blocked: boolean;
  generation: number;
  layout: ControllerLayout | undefined;
  view: PrivateView | null | undefined;
  sourceLayout?: ControllerLayout;
  sourceView?: PrivateView | null;
  audienceLeader?: boolean;
  viewLeader?: boolean;
  wire: number;
  revisions: Map<number, number>;
  buttons: number;
  axes: number;
  transportConnected: boolean | undefined;
  joinedMidGame: boolean;
  fenceRemaining: number;
}
function playerInfo(p: RoomPlayer): PlayerInfo {
  return { id: `seat-${String(p.seat)}`, seat: p.seat, name: p.name,
    colour: `seat-${String(p.seat)}` as PlayerInfo['colour'],
    ...(p.team === null ? {} : { team: p.team === 'red' ? 0 : 1 }) };
}
const INTERRUPTED = new Error('Session interrupted');

/** One match. Room snapshots must come from the authoritative room reducer. */
export function createSession<State, Settings extends object, View>(o: SessionOptions<State, Settings, View>) {
  let seats: Seat[] = [];
  let room = o.room;
  let paused = false;
  let ended = false;
  let operation = 'init';
  let generation = 0;
  let elapsed = o.room.clock;
  let shortSince: number | null = null;
  let pickerSent = false;
  let loop: SimLoop<State> | undefined;
  const taps: PlayerAction[] = [];
  const frames = new Map<string, InputFrame>();
  const connected = new Map<string, boolean>();
  const disconnected: string[] = [];
  const tick = createTick({ frames, connected, disconnected, actions: taps });
  let leader: string | null = null;
  let stopFrames = (): void => { /* Not subscribed yet. */ };
  let stopTransport = (): void => { /* Not subscribed yet. */ };
  function fail(): void {
    if (ended) return;
    ended = true;
    stopFrames(); stopTransport();
    try { o.event({ type: 'error', seed: o.seed, step: loop?.tick ?? 0, operation }); } catch { /* Subscriber failure is contained. */ }
  }
  function guard(fn: () => void): void { try { fn(); } catch { fail(); } }
  function enough(): boolean {
    if (seats.length < o.game.meta.players.min) return false;
    return !o.context.teams || (seats.some(s => s.player.team === 0) && seats.some(s => s.player.team === 1));
  }
  // An in-place game may change and hand back the same layout or view object, so identity
  // proves nothing there: always compare against the clone that was sent (D-082).
  const inPlace = stepModeOf(o.game) === 'in-place';
  function output(): void {
    if (!loop) return;
    operation = 'publicView';
    o.publicView(o.game.publicView(loop.state), loop.tick);
    for (const s of seats) {
      if (!s.connected) continue;
      operation = 'controllerLayout';
      const isLeader = s.player.id === leader;
      const sourceLayout = o.game.controllerLayout(loop.state, s.player.id);
      if (inPlace || sourceLayout !== s.sourceLayout || s.audienceLeader !== isLeader || !s.layout) {
        const layout = layoutFor(sourceLayout, isLeader);
        if (!sameLayout(s.layout, layout)) {
          const revision = s.wire + 1;
          if (o.transport.sendLayout(s.room.connectionId, { ...layout, revision })) {
            s.wire = revision;
            for (const [wire, game] of s.revisions) if (game < layout.revision) s.revisions.delete(wire);
            s.revisions.set(revision, layout.revision);
            s.layout = cloneState(layout);
            s.buttons = 0; s.axes = 0;
            for (const c of layout.controls) {
              if (c.kind === 'button') s.buttons |= 1 << PAD_BUTTON_BIT[c.button];
              if (c.kind === 'dpad') s.buttons |= 15;
              if (c.kind === 'shake') s.buttons |= (1 << BUTTON.SHAKE) | (1 << PAD_BUTTON_BIT[c.button]);
              if (c.kind === 'stick') s.axes |= 3;
              if (c.kind === 'tilt') s.axes |= 12;
            }
          }
        }
        if (sameLayout(s.layout, layout)) { s.sourceLayout = sourceLayout; s.audienceLeader = isLeader; }
      }
      operation = 'privateView';
      const sourceView = o.game.privateView(loop.state, s.player.id);
      if (inPlace || sourceView !== s.sourceView || s.viewLeader !== isLeader || s.view === undefined) {
        const view = privateViewFor(sourceView, isLeader);
        if (!sameView(s.view, view) && o.transport.sendPrivateView(s.room.connectionId, view)) s.view = cloneState(view);
        if (sameView(s.view, view)) { s.sourceView = sourceView; s.viewLeader = isLeader; }
      }
    }
  }
  function finish(): void {
    if (!loop || ended) return;
    operation = 'results';
    const result = o.game.results(loop.state);
    const results = { ...result, players: result.players.map(p => ({ ...p,
      joinedMidGame: seats.find(s => s.player.id === p.id)?.joinedMidGame ?? p.joinedMidGame })) };
    ended = true; stopFrames(); stopTransport();
    o.event({ type: 'results', results });
  }
  function setPaused(value: boolean): void {
    if (!loop || ended || value === paused) return;
    operation = value ? 'pause' : 'resume';
    if (value && o.game.pause) loop.state = o.game.pause(loop.state);
    if (!value && o.game.resume) loop.state = o.game.resume(loop.state);
    paused = value; taps.length = 0;
    o.recordInput?.({ kind: value ? 'pause' : 'resume' }, loop.tick);
    resetClock(loop.clock);
    o.buffer.discardEdges();
    for (const s of seats) if (s.connected) {
      s.generation = ++generation;
      if (!value && Number.isSafeInteger(o.resumeFenceSteps) && (o.resumeFenceSteps ?? 0) > 0) {
        s.blocked = true; s.fenceRemaining = (o.resumeFenceSteps ?? 0);
        o.transport.fence(s.room.connectionId, null);
      }
      o.transport.status(s.room.connectionId, paused, s.generation);
    }
    o.event({ type: 'paused', paused });
    output();
  }
  function sync(next: RoomState): void {
    if (ended) return;
    const old = seats;
    const updated: Seat[] = [];
    for (const s of old) if (!next.players.some(p => p.seatToken === s.room.seatToken)) {
      if (loop) { operation = 'leave'; loop.state = o.game.leave(loop.state, s.player.id); o.recordInput?.({ kind: 'leave', player: s.player.id }, loop.tick); }
      o.buffer.remove(s.player.id);
    }
    for (const p of [...next.players].sort((a, b) => a.seat - b.seat)) {
      let s = old.find(s => s.room.seatToken === p.seatToken);
      if (!s && o.context.teams && p.team === null) continue;
      if (!s) {
        const player = playerInfo(p);
        s = { room: p, player, frame: createInputFrame(o.buffer.axisCount), connected: p.disconnectedAt === null,
          blocked: false, generation: 0, layout: undefined, view: undefined, wire: -1, revisions: new Map(), buttons: 0, axes: 0, transportConnected: undefined,
          fenceRemaining: 0, joinedMidGame: (loop?.tick ?? 0) > 0 };
        o.buffer.add(player.id); o.buffer.reset(player.id);
        if (loop) { operation = 'join'; loop.state = o.game.join(loop.state, player); o.recordInput?.({ kind: 'join', player }, loop.tick); }
      } else {
        const changedConnection = p.connectionId !== s.room.connectionId;
        const reconnect = changedConnection || (!s.connected && s.transportConnected === undefined && p.disconnectedAt === null);
        const details = playerInfo(p);
        s.player = { ...s.player, name: details.name, colour: details.colour };
        s.room = p;
        if (changedConnection) s.transportConnected = undefined;
        s.connected = s.transportConnected ?? p.disconnectedAt === null;
        if (reconnect) {
          s.blocked = false; o.buffer.reset(s.player.id); s.layout = undefined; s.view = undefined;
        }
      }
      updated.push(s);
    }
    seats = updated; room = next; elapsed = Math.max(elapsed, room.clock);
    leader = seats.find(s => s.player.seat === room.leader)?.player.id ?? null;
    frames.clear(); connected.clear();
    for (const s of seats) if (s.connected) frames.set(s.player.id, s.frame);
    for (let i = taps.length - 1; i >= 0; i--) {
      const action = taps[i];
      if (!seats.some(s => s.player.id === action?.player && s.connected && !s.blocked)) taps.splice(i, 1);
    }
    if (loop) { if (seats.length === 0) { finish(); return; } if (!enough()) { shortSince ??= elapsed; setPaused(true); } else shortSince = null; output(); }
  }
  guard(() => {
    sync(room);
    const schema = settingsSchema(o.game, o.context);
    const checked = validateSettings(schema, mergeSettings(schema, o.settings));
    if (!checked.ok) { operation = 'settings: ' + checked.errors.join('; '); throw new Error(operation); }
    const initialState = o.game.init(o.seed, seats.map(s => s.player), checked.settings, o.context);
    loop = (o.loop ?? createSimLoop)({ initialState, stepMs: STEP_MS,
      sampleInputs() {
        if (ended || paused || !enough()) throw INTERRUPTED;
        operation = 'sample';
        const sampled = o.buffer.sample();
        disconnected.length = 0; frames.clear();
        for (const s of seats) {
          const frame = sampled.get(s.player.id);
          if (frame) copyInputFrame(s.frame, frame);
          connected.set(s.player.id, s.connected);
          if (!s.connected) { disconnected.push(s.player.id); continue; }
          if (s.blocked && --s.fenceRemaining <= 0) { s.blocked = false; o.transport.fence(s.room.connectionId, (s.frame.seq + 1) % 65536); }
          if (s.blocked) { s.frame.held = 0; s.frame.pressed = 0; s.frame.released = 0; s.frame.axes.fill(0); }
          frames.set(s.player.id, s.frame);
          const start = s.frame.pressed & (1 << BUTTON.START);
          s.frame.held &= s.buttons; s.frame.pressed &= s.buttons; s.frame.released &= s.buttons;
          for (let i = 0; i < s.frame.axes.length; i++) if (!(s.axes & (1 << i))) s.frame.axes[i] = 0;
          if (start !== 0) { setPaused(true); throw INTERRUPTED; }
        }
        // Stable object, frames and arrays are borrowed by the game/recording subscriber.
        return tick;
      },
      step(state, input, dt) {
        operation = 'record'; o.record?.(input, loop?.tick ?? 0); o.recordInput?.({ kind: 'tick', tick: input }, loop?.tick ?? 0);
        operation = 'step'; return driveStep(o.game, state, input, dt);
      },
      onStep() { taps.length = 0; output(); operation = 'isOver'; if (loop && o.game.isOver(loop.state)) finish(); },
    });
    // Tick's leader is updated by the accessor without allocating a tick per step.
    Object.defineProperty(tick, 'leader', { get: () => leader });
    output(); operation = 'isOver'; if (o.game.isOver(loop.state)) finish();
    if (!enough()) { shortSince = elapsed; setPaused(true); }
  });
  function advance(elapsedMs: number): void {
    if (ended || !loop) return;
    elapsed = Math.max(elapsed + Math.max(0, elapsedMs), room.clock);
    if (shortSince !== null && elapsed - shortSince >= RECONNECT_WINDOW_MS) { guard(finish); return; }
    if (paused) { guard(output); return; }
    try { loop.advance(elapsedMs); } catch (error) { if (error !== INTERRUPTED) fail(); }
  }
  function receive(e: SessionTransportEvent): void {
    if (ended) return;
    guard(() => {
      const s = seats.find(s => s.room.connectionId === e.connectionId);
      if (!s) return;
      if (e.type === 'connection') {
        s.transportConnected = e.connected;
        if (s.connected === e.connected) return;
        s.connected = e.connected; s.blocked = false;
        o.recordInput?.({ kind: e.connected ? 'reconnect' : 'disconnect', player: s.player.id }, loop?.tick ?? 0);
        o.buffer.reset(s.player.id);
        for (let i = taps.length - 1; i >= 0; i--) if (taps[i]?.player === s.player.id) taps.splice(i, 1);
        s.layout = undefined; s.view = undefined;
        if (e.connected) output();
      } else if (e.type === 'acknowledge-resume') {
        if (s.blocked && !paused && e.generation === s.generation && Number.isInteger(e.nextSequence) && e.nextSequence >= 0 && e.nextSequence < 65536) {
          o.transport.fence(e.connectionId, e.nextSequence); o.buffer.discardEdges(s.player.id); s.blocked = false;
        }
      } else if (!paused && s.connected && !s.blocked && s.layout) {
        const revision = s.revisions.get(e.action.revision);
        if (revision !== undefined) taps.push({ ...e.action, revision, player: s.player.id });
      }
    });
  }
  function isEnded(): boolean { return ended; }
  if (!isEnded()) {
    stopTransport = o.transport.subscribe(receive);
    stopFrames = o.frames?.subscribe(advance) ?? stopFrames;
  }
  return {
    advance,
    updateRoom(next: RoomState): void { guard(() => { sync(next); }); },
    pause(id: string): void { if (seats.some(s => s.player.id === id && s.connected)) guard(() => { setPaused(true); }); },
    resume(id: string): void { if (id === leader && enough() && seats.some(s => s.player.id === id && s.connected)) guard(() => { setPaused(false); }); },
    /** First request prompts the shell; confirmation is an explicit second UI action. */
    quit(id: string, confirmed = false): 'forbidden' | 'confirm' | 'quit' {
      if (ended || id !== leader || !seats.some(s => s.player.id === id && s.connected)) return 'forbidden';
      if (!confirmed) return 'confirm';
      if (!enough()) { guard(finish); return 'quit'; }
      ended = true; taps.length = 0; stopFrames(); stopTransport(); pickerSent = true; guard(() => { o.event({ type: 'picker' }); }); return 'quit';
    },
    backToPicker(): void { if (ended && !pickerSent) { pickerSent = true; guard(() => { o.event({ type: 'picker' }); }); } },
    get ended(): boolean { return ended; },
    get paused(): boolean { return paused; },
    get step(): number { return loop?.tick ?? 0; },
    /** Host only: never hand simulation state to a renderer or phone. */
    get state(): State | undefined { return loop?.state; },
  };
}
