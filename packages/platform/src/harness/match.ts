import { INPUT_STALE_STEPS, SEQ_MODULO } from '@kaki/protocol';
import { cloneState, createInputBuffer, decodeState, encodeState, hashState } from '@kaki/sim-core';
import { applyMembership, createTick, driveStep } from '../game/drive';
import type { Tick } from '../game/drive';
import type { ControllerLayout, PrivateView } from '../game/layout';
import { layoutFor, privateViewFor, rejectAction, PAD_BUTTON_BIT } from '../game/layout';
import { mergeSettings, settingsSchema, validateSettings } from '../game/settings';
import { AXIS_COUNT, BUTTON, SEAT_COLOURS, STEP_MS } from '../game/types';
import type { GameModule, PlayerAction, PlayerInfo, SetupContext, Results } from '../game/types';
import { positiveSteps, scriptCursor, testPredicate } from './scripts';
import type { NamedButton, PlayerScript, ScriptCursor } from './scripts';
import { diffViews, headline } from './text';
import type { TimelineEntry } from './text';

export interface MatchOptions<Settings extends object, State = unknown, View = unknown> {
  seed: number;
  players: number | readonly PlayerInfo[];
  settings?: Partial<Settings>;
  teams?: boolean;
  context?: Partial<SetupContext>;
  /** Test-only crafted initial state. */
  state?: State;
  headline?: (view: View) => string;
  viewEvery?: number;
  record?: boolean;
  hashEvery?: number;
}
export type MatchEvent = { kind: 'tick'; tick: Tick } | { kind: 'join'; player: PlayerInfo } |
  { kind: 'leave' | 'disconnect' | 'reconnect'; player: string } | { kind: 'pause' | 'resume' };
export interface MatchRecording {
  format: 'kaki-match-3'; game: string; options: Omit<MatchOptions<object>, 'state' | 'headline' | 'viewEvery' | 'record' | 'hashEvery'>;
  initialHash: string; initialView: unknown; initialState?: unknown;
  recording: { runs: { count: number; event: unknown }[]; hashes: { event: number; step: number; hash: string }[] };
  views: { event: number; view: unknown }[];
}
export function makeMatchPlayers(count: number, teams = false): PlayerInfo[] {
  if (!Number.isInteger(count) || count < 1 || count > 8) throw new RangeError('players must be from 1 to 8');
  return Array.from({ length: count }, (_, i) => ({ id: `p${String(i + 1)}`, seat: i + 1,
    name: `Player ${String(i + 1)}`, colour: SEAT_COLOURS[i] ?? 'seat-1', ...(teams ? { team: i % 2 as 0 | 1 } : {}) }));
}
const aliases: Record<string, number> = {
  faceBottom: BUTTON.FACE_BOTTOM, faceRight: BUTTON.FACE_RIGHT, faceLeft: BUTTON.FACE_LEFT,
  faceTop: BUTTON.FACE_TOP, shoulderLeft: BUTTON.SHOULDER_LEFT, shoulderRight: BUTTON.SHOULDER_RIGHT,
  up: BUTTON.DPAD_UP, down: BUTTON.DPAD_DOWN, left: BUTTON.DPAD_LEFT, right: BUTTON.DPAD_RIGHT, pause: BUTTON.START, shake: BUTTON.SHAKE,
  ...PAD_BUTTON_BIT,
};
export function buttonBit(name: NamedButton): number { const bit = aliases[name]; if (bit === undefined) throw new Error(`unknown button ${name}`); return bit; }
interface Pad { buttons: number; axes: number[]; seq: number }

export interface Match<State, Settings extends object, View> {
  readonly blocked: 'paused' | 'roster short' | 'empty team' | 'over' | null;
  readonly disconnected: ReadonlySet<string>;
  setLeader(id: string): Match<State, Settings, View>;
  readonly state: State; readonly steps: number; readonly paused: boolean;
  readonly players: readonly PlayerInfo[]; readonly timeline: readonly TimelineEntry[]; readonly isOver: boolean;
  publicView(): View; layoutFor(id: string): ControllerLayout; privateViewFor(id: string): PrivateView | null; results(): Results;
  script(id: string, commands: PlayerScript): Match<State, Settings, View>;
  stick(id: string, x: number, y: number, evenIfRefused?: boolean): Match<State, Settings, View>;
  tilt(id: string, x: number, y: number, evenIfRefused?: boolean): Match<State, Settings, View>;
  press(id: string, button: NamedButton, evenIfRefused?: boolean): Match<State, Settings, View>;
  release(id: string, button: NamedButton, evenIfRefused?: boolean): Match<State, Settings, View>;
  tap(id: string, control: string, value?: string | number, evenIfRefused?: boolean, revision?: number): Match<State, Settings, View>;
  join(player: PlayerInfo): Match<State, Settings, View>; leave(id: string): Match<State, Settings, View>;
  disconnect(id: string): Match<State, Settings, View>; reconnect(id: string): Match<State, Settings, View>;
  pause(): Match<State, Settings, View>; resume(): Match<State, Settings, View>;
  step(n?: number): number;
  until(predicate: (match: Match<State, Settings, View>) => boolean, maxSteps: number): Match<State, Settings, View>;
  recording(): MatchRecording;
}

function sameTick(a: Tick, b: Tick, offset: number): boolean {
  if (a.leader !== b.leader || a.actions.length || b.actions.length || a.frames.size !== b.frames.size ||
    a.disconnected.length !== b.disconnected.length || a.disconnected.some((id, i) => id !== b.disconnected[i])) return false;
  for (const [id, x] of a.frames) {
    const y = b.frames.get(id);
    if (y?.seq !== (x.seq + offset) % SEQ_MODULO || x.held !== y.held || x.pressed !== y.pressed || x.released !== y.released || x.age !== y.age || x.axes.some((v, i) => v !== y.axes[i])) return false;
  }
  return true;
}

/** No clock or console needed: one call advances exactly N fixed steps. */
export function createMatch<State, Settings extends object, View>(game: GameModule<State, Settings, View>, options: MatchOptions<Settings, State, View>) {
  if (!Number.isSafeInteger(options.seed) || options.seed < 0) throw new RangeError('seed must be a non-negative safe integer');
  const teams = options.teams ?? options.context?.teams ?? (game.meta.teams === 'required');
  if ((teams && game.meta.teams === 'none') || (!teams && game.meta.teams === 'required')) throw new Error('teams do not fit this game');
  let players = cloneState(typeof options.players === 'number' ? makeMatchPlayers(options.players, teams) : [...options.players]);
  const context: SetupContext = cloneState({ data: {}, saved: null, ...options.context, teams });
  function validateRoster(roster: readonly PlayerInfo[], initial: boolean): void {
    if (roster.length > game.meta.players.max || (initial && roster.length < game.meta.players.min)) throw new Error('unsupported player count');
    if (new Set(roster.map((p) => p.id)).size !== roster.length || new Set(roster.map((p) => p.seat)).size !== roster.length) throw new Error('duplicate player id or seat');
    for (const p of roster) {
      if (!Number.isInteger(p.seat) || p.seat < 1 || p.seat > 8) throw new Error('seat must be from 1 to 8');
      if (teams ? p.team !== 0 && p.team !== 1 : p.team !== undefined) throw new Error('player teams do not fit context');
    }
    if (initial && teams && (!roster.some((p) => p.team === 0) || !roster.some((p) => p.team === 1))) throw new Error('both teams need a player');
  }
  validateRoster(players, true);
  const firstPlayerId = players[0]?.id ?? null;
  players.sort((a, b) => a.seat - b.seat);
  const schema = settingsSchema(game, context);
  const checked = validateSettings(schema, mergeSettings(schema, options.settings ?? {}));
  if (!checked.ok) throw new Error(checked.errors.join('; '));
  let state = options.state === undefined ? game.init(options.seed, players, checked.settings, context) : cloneState(options.state);
  positiveSteps(options.viewEvery ?? 0, 'viewEvery');
  const recordingEnabled = options.record !== false;
  const hashEvery = options.hashEvery ?? 60;
  if (!Number.isSafeInteger(hashEvery) || hashEvery < 1) throw new RangeError('hashEvery must be a positive integer');
  const initialState = !recordingEnabled || options.state === undefined ? undefined : encodeState(state);
  const initialHash = recordingEnabled ? hashState(state) : '', initialView: unknown = recordingEnabled ? cloneState(game.publicView(state)) : undefined;
  const setup = cloneState({ seed: options.seed, players, settings: checked.settings, teams, context });
  const buffer = createInputBuffer<string>({ axisCount: AXIS_COUNT, seqModulus: SEQ_MODULO, staleAfterSteps: INPUT_STALE_STEPS });
  const pads = new Map<string, Pad>();
  const disconnected = new Set<string>();
  const scripts = new Map<string, ScriptCursor>();
  const runs: { count: number; event: unknown }[] = [];
  const hashes: { event: number; step: number; hash: string }[] = [];
  const views: MatchRecording['views'] = [];
  let eventCount = 0;
  let lastTick: Tick | null = null;
  let rosterDirty = true, reorderFrames = false;
  let connected = new Map<string, boolean>();
  let absent: string[] = [];
  let leaderId = firstPlayerId;
  const timeline: TimelineEntry[] = [];
  let steps = 0, paused = false;
  let actions: PlayerAction[] = [];
  function leader(): string | null { return leaderId; }
  function pad(id: string): Pad {
    const value = pads.get(id);
    if (!value) throw new Error(`unknown player ${id}`);
    return value;
  }
  function addPad(id: string): void { buffer.add(id); pads.set(id, { buttons: 0, axes: [0, 0, 0, 0], seq: 0 }); }
  for (const p of players) addPad(p.id);
  function note(): void {
    const view = game.publicView(state);
    const text = options.headline?.(view) ?? headline(view);
    if (timeline.at(-1)?.text !== text || (game.isOver(state) && timeline.at(-1)?.step !== steps)) timeline.push({ step: steps, text });
  }
  note();
  function record(event: MatchEvent): void {
    if (event.kind !== 'tick') rosterDirty = true;
    if (!recordingEnabled) { note(); return; }
    eventCount += 1;
    const previous = runs.at(-1);
    if (event.kind === 'tick' && lastTick && sameTick(lastTick, event.tick, previous?.count ?? 0) && previous) previous.count += 1;
    else {
      runs.push({ count: 1, event: encodeState(event) });
      lastTick = event.kind === 'tick' ? cloneState(event.tick) : null;
    }
    if (event.kind !== 'tick' || steps % hashEvery === 0) hashes.push({ event: eventCount, step: steps, hash: hashState(state) });
    if (event.kind === 'tick' && options.viewEvery && steps % options.viewEvery === 0) views.push({ event: eventCount, view: cloneState(game.publicView(state)) });
    note();
  }
  function blocked(): Match<State, Settings, View>['blocked'] {
    return game.isOver(state) ? 'over' : paused ? 'paused' : players.length < game.meta.players.min ? 'roster short' :
      teams && ![0, 1].every((team) => players.some((p) => p.team === team)) ? 'empty team' : null;
  }
  function canStep(): boolean { return blocked() === null; }
  function drawn(id: string): { stick: boolean; tilt: boolean; buttons: number } {
    const result = { stick: false, tilt: false, buttons: 1 << BUTTON.START };
    for (const c of game.controllerLayout(state, id).controls) {
      if (c.audience === 'leader' && id !== leader() || c.audience === 'not-leader' && id === leader()) continue;
      if (c.kind === 'stick') result.stick = true;
      if (c.kind === 'tilt') result.tilt = true;
      if (c.kind === 'button') result.buttons |= 1 << PAD_BUTTON_BIT[c.button];
      if (c.kind === 'shake') result.buttons |= (1 << BUTTON.SHAKE) | (1 << PAD_BUTTON_BIT[c.button]);
      if (c.kind === 'dpad') for (const name of ['up', 'down', 'left', 'right'] as const) result.buttons |= 1 << buttonBit(name);
    }
    return result;
  }
  function refuse(id: string, offered: boolean, input: string, even = false): void {
    pad(id);
    if (!offered && !even) throw new Error(`step ${String(steps + 1)}, player ${id}: ${input} is not drawn by the layout`);
  }
  const match: Match<State, Settings, View> = {
    get blocked() { return blocked(); },
    get disconnected() { return new Set(disconnected); },
    setLeader(id) { pad(id); leaderId = id; return match; },
    get state() { return state; }, get steps() { return steps; }, get paused() { return paused; },
    get players(): readonly PlayerInfo[] { return cloneState(players); },
    get timeline(): readonly TimelineEntry[] { return cloneState(timeline); },
    get isOver() { return game.isOver(state); },
    publicView: () => game.publicView(state),
    layoutFor: (id: string) => layoutFor(game.controllerLayout(state, id), id === leader()),
    privateViewFor: (id: string) => privateViewFor(game.privateView(state, id), id === leader()),
    results: () => game.results(state),
    script(id: string, commands: PlayerScript) { pad(id); scripts.set(id, scriptCursor(cloneState(commands))); return match; },
    stick(id: string, x: number, y: number, even = false) {
      const cursor = scripts.get(id); if (cursor && cursor.index === cursor.commands.length) scripts.delete(id);
      refuse(id, drawn(id).stick, 'stick', even); const p = pad(id); p.axes[0] = x; p.axes[1] = y; return match; },
    tilt(id: string, x: number, y: number, even = false) { refuse(id, drawn(id).tilt, 'tilt', even); const p = pad(id); p.axes[2] = x; p.axes[3] = y; return match; },
    press(id: string, button: NamedButton, even = false) { refuse(id, (drawn(id).buttons & (1 << buttonBit(button))) !== 0, button, even); pad(id).buttons |= 1 << buttonBit(button); return match; },
    release(id: string, button: NamedButton) { pad(id).buttons &= ~(1 << buttonBit(button)); return match; },
    tap(id: string, control: string, value?: string | number, evenIfRefused = false, revision?: number) {
      pad(id);
      const layout = game.controllerLayout(state, id);
      const action: PlayerAction = { player: id, control, ...(value === undefined ? {} : { value }), revision: revision ?? layout.revision };
      const refused = disconnected.has(id) ? 'player is disconnected' : paused ? 'match is paused' : rejectAction(layout, action, id === leader());
      if (refused !== null && !evenIfRefused) throw new Error(`step ${String(steps + 1)}, player ${id}, tap ${control}: ${refused}`);
      if (!disconnected.has(id) && !paused) actions.push(action);
      return match;
    },
    join(player: PlayerInfo) {
      const roster = [...players, cloneState(player)].sort((a, b) => a.seat - b.seat);
      validateRoster(roster, false);
      state = applyMembership(game, state, createTick({ joined: [player] }));
      reorderFrames ||= players.some(p => p.seat > player.seat);
      players = roster; leaderId ??= player.id; addPad(player.id); record({ kind: 'join', player }); return match;
    },
    leave(id: string) {
      pad(id); state = applyMembership(game, state, createTick({ departed: [id] }));
      players = players.filter((p) => p.id !== id); buffer.remove(id); pads.delete(id); disconnected.delete(id); scripts.delete(id);
      if (leaderId === id) leaderId = players[0]?.id ?? null;
      actions = actions.filter((a) => a.player !== id); record({ kind: 'leave', player: id }); return match;
    },
    disconnect(id: string) {
      pad(id); disconnected.add(id); buffer.remove(id); actions = actions.filter((a) => a.player !== id);
      record({ kind: 'disconnect', player: id }); return match;
    },
    reconnect(id: string) {
      const p = pad(id); disconnected.delete(id); reorderFrames = true; buffer.add(id); buffer.reset(id); p.seq = 0; p.buttons = 0; p.axes.fill(0);
      record({ kind: 'reconnect', player: id }); return match;
    },
    pause() { if (!paused) { state = game.pause?.(state) ?? state; paused = true; actions = []; record({ kind: 'pause' }); } return match; },
    resume() { if (paused) { state = game.resume?.(state) ?? state; paused = false; buffer.discardEdges(); actions = []; record({ kind: 'resume' }); } return match; },
    step(n = 1) {
      positiveSteps(n);
      let taken = 0;
      for (let i = 0; i < n && canStep(); i += 1) {
        for (const player of players) {
          if (disconnected.has(player.id)) continue;
          const cursor = scripts.get(player.id);
          if (cursor) advanceScript(player.id, cursor);
          const p = pad(player.id);
          const allowed = drawn(player.id);
          if (!allowed.stick) { p.axes[0] = 0; p.axes[1] = 0; }
          if (!allowed.tilt) { p.axes[2] = 0; p.axes[3] = 0; }
          p.buttons &= allowed.buttons;
          buffer.receive(player.id, p.seq, p.buttons, p.axes); p.seq = (p.seq + 1) % SEQ_MODULO;
        }
        const sampled = buffer.sample();
        if (rosterDirty) {
          connected = new Map(); absent = [];
          for (const p of players) {
            const present = !disconnected.has(p.id); connected.set(p.id, present);
            if (!present) absent.push(p.id);
          }
          rosterDirty = false;
        }
        // The buffer lends frames in insertion order. Only a lower-seat join or reconnect
        // requires restoring seat order; normal steps can borrow the sampled Map directly.
        const frames = reorderFrames ? new Map(players.flatMap(p => {
          const frame = sampled.get(p.id); return frame ? [[p.id, frame] as const] : [];
        })) : sampled;
        const tick = createTick({ frames, actions, leader: leader(), disconnected: absent, connected });
        state = driveStep(game, state, tick, STEP_MS); steps += 1; taken += 1; actions = []; record({ kind: 'tick', tick });
      }
      return taken;
    },
    until(predicate: (current: typeof match) => boolean, maxSteps: number) {
      positiveSteps(maxSteps, 'maxSteps');
      for (let i = 0; !predicate(match); i += 1) {
        if (i >= maxSteps || !canStep()) throw new Error(`until did not resolve after ${String(i)} steps (${blocked() ?? 'step limit'})`);
        match.step();
      }
      return match;
    },
    recording(): MatchRecording {
      if (!recordingEnabled) throw new Error('match recording is disabled');
      const checkpoints = [...hashes];
      if (eventCount && checkpoints.at(-1)?.event !== eventCount) checkpoints.push({ event: eventCount, step: steps, hash: hashState(state) });
      return cloneState({ format: 'kaki-match-3', game: game.meta.id, options: setup, initialHash, initialView,
        ...(initialState === undefined ? {} : { initialState }),
        recording: { runs, hashes: checkpoints }, views });
    },
  };
  function advanceScript(id: string, cursor: ScriptCursor): void {
    const previous = cursor.commands[cursor.index - 1];
    if (cursor.elapsed === 0 && previous?.do === 'stick') { match.stick(id, 0, 0, true); if (cursor.index === cursor.commands.length) { scripts.delete(id); return; } }
    // Instant commands run before the next timed command. A tap occupies one step.
    while (cursor.index < cursor.commands.length) {
      const command = cursor.commands[cursor.index];
      if (!command) break;
      if (command.do === 'until') {
        if (!(command.predicates ?? (command.predicate ? [command.predicate] : [])).every((p) => testPredicate(game.publicView(state), p))) {
          if (cursor.elapsed >= command.maxSteps) throw new Error(`player ${id}: script until timed out at step ${String(steps)}`);
          cursor.elapsed += 1; return;
        }
      } else if (command.do === 'stick' || command.do === 'wait') {
        if (command.do === 'stick') match.stick(id, command.x, command.y, command.evenIfRefused);
        cursor.elapsed += 1;
        if (cursor.elapsed < command.steps) return;
        cursor.index += 1; cursor.elapsed = 0;
        // Reset a held stick on the NEXT step, so all N steps see the direction.
        return;
      } else if (command.do === 'press') match.press(id, command.button, command.evenIfRefused);
      else if (command.do === 'release') match.release(id, command.button, command.evenIfRefused);
      else if (command.do === 'tapIfOffered') {
        const layout = game.controllerLayout(state, id);
        if (!rejectAction(layout, { player: id, control: command.control, ...(command.value === undefined ? {} : { value: command.value }), revision: layout.revision }, id === leader())) match.tap(id, command.control, command.value);
      } else match.tap(id, command.control, command.value, command.evenIfRefused, command.revision);
      cursor.index += 1; cursor.elapsed = 0;
      if (command.do === 'tap' || command.do === 'tapIfOffered' || command.do === 'press' || command.do === 'release') return;
    }
  }
  return match;
}

export interface ReplayDivergence { event: number; step: number; fromStep: number; toStep: number; exact: boolean;
    checkpoint: { event: number; step: number }; diff: string[]; expectedView: unknown; actualView: unknown; checkpointView: unknown }

/** Replay sampled inputs. Supply the original implementation to reconstruct diagnostic views. */
export function replayMatch<State, Settings extends object, View>(game: GameModule<State, Settings, View>, file: MatchRecording,
  diagnostics: { referenceGame?: GameModule<State, Settings, View>; diff?: 'state' | 'private'; player?: string } = {}) {
  file = parseRecording(JSON.stringify(file));
  if (file.game !== game.meta.id) throw new Error('recording game does not match');
  const reference = diagnostics.referenceGame;
  const init = (module: typeof game): State => createMatch(module, { ...file.options, record: false,
    ...(file.initialState === undefined ? {} : { state: decodeState(file.initialState) }) } as MatchOptions<Settings, State, View>).state;
  let state = init(game);
  let expected = reference ? init(reference) : undefined;
  let eventIndex = 0, simStep = 0, previousStep = 0, previousEvent = 0;
  let spanState = cloneState(state), spanExpected = cloneState(expected);
  let spanEvents: MatchEvent[] = [];

  let divergence: ReplayDivergence | null = null;
  function check(hash: string): void {
    if (divergence) return;
    if (hashState(state) !== hash) {
      let actual = state, original = expected, foundEvent = eventIndex, foundStep = simStep;
      const referenceMatches = reference !== undefined && hashState(expected) === hash;
      if (reference && referenceMatches && eventIndex > previousEvent) {
        actual = cloneState(spanState); original = cloneState(spanExpected);
        foundEvent = previousEvent; foundStep = previousStep;
        // Refine only the failing checkpoint span, comparing both builds at every event.
        for (const event of spanEvents) {
          actual = apply(game, actual, event); original = apply(reference, original as State, event);
          foundEvent += 1; if (event.kind === 'tick') foundStep += 1;
          if (hashState(actual) !== hashState(original)) break;
        }
      }
      const snapshot = diagnostics.diff ? undefined : eventIndex === 0 ? file.initialView : file.views.find((v) => v.event === eventIndex)?.view;
      const expectedView = referenceMatches ? diagnostics.diff === 'state' ? cloneState(original) : diagnostics.diff === 'private' ? reference.privateView(original as State, diagnostics.player ?? 'p1') : reference.publicView(original as State) : snapshot;
      const actualView = diagnostics.diff === 'state' ? cloneState(actual) : diagnostics.diff === 'private' ? game.privateView(actual, diagnostics.player ?? 'p1') : game.publicView(actual);
      divergence = { event: foundEvent, step: foundStep, fromStep: eventIndex === 0 ? 0 : previousStep + (simStep > previousStep ? 1 : 0), toStep: simStep,
        exact: referenceMatches || simStep - previousStep <= 1, checkpoint: { event: eventIndex, step: simStep },
        diff: expectedView === undefined ? ['Original view unavailable: supply diagnostics.referenceGame from the recorded build.'] : diffViews(expectedView, actualView),
        expectedView: cloneState(expectedView), actualView: cloneState(actualView), checkpointView: cloneState(game.publicView(state)) };
    } else {
      previousEvent = eventIndex; previousStep = simStep;
      if (reference) { spanState = cloneState(state); spanExpected = cloneState(expected); spanEvents = []; }
    }
  }
  check(file.initialHash);
  function apply(module: typeof game, current: State, event: MatchEvent): State {
    if (event.kind === 'tick') return driveStep(module, current, event.tick, STEP_MS);
    if (event.kind === 'join') return applyMembership(module, current, createTick({ joined: [event.player] }));
    if (event.kind === 'leave') return applyMembership(module, current, createTick({ departed: [event.player] }));
    if (event.kind === 'pause') return module.pause?.(current) ?? current;
    if (event.kind === 'resume') return module.resume?.(current) ?? current;
    return current;
  }
  let checkpointIndex = 0;
  for (const run of file.recording.runs) {
    const event = decodeState(run.event) as MatchEvent;
    for (let i = 0; i < run.count; i += 1) {
      const current = event.kind === 'tick' ? { ...event, tick: { ...event.tick, frames: new Map([...event.tick.frames].map(([id, frame]) => [id, { ...frame, seq: (frame.seq + i) % SEQ_MODULO }])) } } : event;
      state = apply(game, state, current);
      if (reference) { expected = apply(reference, expected as State, current); if (!(divergence as ReplayDivergence | null)) spanEvents.push(current); }
      eventIndex += 1; if (event.kind === 'tick') simStep += 1;
      const checkpoint = file.recording.hashes[checkpointIndex];
      if (checkpoint?.event === eventIndex) { check(checkpoint.hash); checkpointIndex += 1; }
    }
  }
  const found = divergence as ReplayDivergence | null;
  return { state, matches: found === null, divergence: found, finalHash: hashState(state) };
}

type ObjectValue = Record<string, unknown>;
function object(value: unknown): value is ObjectValue { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function integer(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
function player(value: unknown): boolean { return object(value) && typeof value.id === 'string' && value.id.length > 0 && integer(value.seat) && value.seat >= 1 && value.seat <= 8 && typeof value.name === 'string' && typeof value.colour === 'string' && (value.team === undefined || value.team === 0 || value.team === 1); }
function strings(value: unknown): boolean { return Array.isArray(value) && value.every((v: unknown) => typeof v === 'string'); }
function action(value: unknown): boolean { return object(value) && typeof value.player === 'string' && typeof value.control === 'string' && integer(value.revision) && (value.value === undefined || typeof value.value === 'string' || typeof value.value === 'number' && Number.isFinite(value.value)); }
function frame(value: unknown): boolean {
  if (!object(value) || !Array.isArray(value.axes) || value.axes.length !== AXIS_COUNT || !value.axes.every((v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= -1 && v <= 1)) return false;
  return ['held', 'pressed', 'released', 'seq', 'age'].every((key) => integer(value[key]));
}
function validEvent(value: unknown): boolean {
  if (!object(value)) return false;
  if (value.kind === 'tick') {
    const tick = value.tick;
    if (!object(tick) || !(tick.frames instanceof Map) || !(tick.connected instanceof Map) || !Array.isArray(tick.actions) || !tick.actions.every(action) || !strings(tick.disconnected) || !Array.isArray(tick.joined) || !tick.joined.every(player) || !strings(tick.departed) || !(tick.leader === null || typeof tick.leader === 'string')) return false;
    const frames: Map<unknown, unknown> = tick.frames, connected: Map<unknown, unknown> = tick.connected;
    return [...frames].every(([id, input]) => typeof id === 'string' && frame(input)) && [...connected].every(([id, present]) => typeof id === 'string' && typeof present === 'boolean');
  }
  if (value.kind === 'join') return player(value.player);
  if (value.kind === 'leave' || value.kind === 'disconnect' || value.kind === 'reconnect') return typeof value.player === 'string';
  return value.kind === 'pause' || value.kind === 'resume';
}
/** Validate untrusted JSON, including decoded tick Maps, actions and input frames. */
export function parseRecording(json: string): MatchRecording {
  const f: unknown = JSON.parse(json);
  const fail = (): never => { throw new Error('invalid match recording'); };
  if (!object(f) || f.format !== 'kaki-match-3' || typeof f.game !== 'string' || !object(f.options) || !integer(f.options.seed) ||
    !(integer(f.options.players) && f.options.players >= 1 && f.options.players <= 8 || Array.isArray(f.options.players) && f.options.players.every(player)) ||
    typeof f.initialHash !== 'string' || !/^[0-9a-f]{16}$/.test(f.initialHash) || !Array.isArray(f.views) || !object(f.recording) || !Array.isArray(f.recording.runs) || !Array.isArray(f.recording.hashes)) return fail();
  if (Object.keys(f.options).some((key) => !['seed', 'players', 'settings', 'teams', 'context'].includes(key))) return fail();
  if (f.options.settings !== undefined && !object(f.options.settings) || f.options.context !== undefined && !object(f.options.context) || f.options.teams !== undefined && typeof f.options.teams !== 'boolean') return fail();
  if (f.initialState !== undefined && hashState(decodeState(f.initialState)) !== f.initialHash) return fail();
  let count = 0, steps = 0;
  const ranges: { from: number; to: number; step: number; tick: boolean }[] = [];
  for (const run of f.recording.runs as unknown[]) {
    if (!object(run) || !integer(run.count) || run.count < 1 || !validEvent(decodeState(run.event))) return fail();
    const event = decodeState(run.event) as MatchEvent;
    ranges.push({ from: count, to: count + run.count, step: steps, tick: event.kind === 'tick' });
    count += run.count; if (event.kind === 'tick') steps += run.count;
    if (!Number.isSafeInteger(count)) return fail();
  }
  let previousHashEvent = 0, rangeIndex = 0;
  for (const h of f.recording.hashes as unknown[]) {
    if (!object(h) || !integer(h.event) || h.event <= previousHashEvent || h.event > count || typeof h.hash !== 'string' || !/^[0-9a-f]{16}$/.test(h.hash)) return fail();
    while (ranges[rangeIndex] && h.event > (ranges[rangeIndex]?.to ?? 0)) rangeIndex += 1;
    const range = ranges[rangeIndex];
    if (!range || h.step !== range.step + (range.tick ? h.event - range.from : 0)) return fail();
    previousHashEvent = h.event;
  }
  if (previousHashEvent !== count) return fail();
  let previous = 0;
  for (const snapshot of f.views as unknown[]) {
    if (!object(snapshot) || !integer(snapshot.event) || snapshot.event <= previous || snapshot.event > count || !('view' in snapshot)) return fail();
    previous = snapshot.event;
  }
  return f as unknown as MatchRecording;
}
