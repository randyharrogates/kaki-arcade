import { saveSession } from './session-storage';
import type { hostCounts } from './counts';
import { prepareSetup, prepareMatch } from './session-loading';
import type { PreparedSetup } from './game-setup';
import { createSession, gamePlayers } from '@kaki/platform';
import type { GameModule, InitContext, JsonValue, RoomState, SessionEvent, SessionFrames, SessionTransport, Sound, TeamId, GamePresentation } from '@kaki/platform';
import { createInputBuffer } from '@kaki/sim-core';
import { INPUT_STALE_STEPS, SEQ_MODULO } from '@kaki/protocol';
import type { ComponentType } from 'preact';

// The registry erases the individual module's state/settings types at this boundary only.
export type LoadedGame = GameModule<unknown, object>;
export interface ScreenProps { view: never; width: number; height: number; detail?: 'full' | 'half'; sound?: Sound | undefined; soundHistory?: { previous: unknown } | undefined }
export interface MountedHostScreen extends GamePresentation<HTMLElement, unknown> {
  mount(root: HTMLElement, options: ScreenProps): { ready: Promise<void>; update(options: ScreenProps): void; destroy(): void };
}
export type HostScreen = (ComponentType<ScreenProps> & GamePresentation<HTMLElement, unknown>) | MountedHostScreen;
export interface SessionDisplay { detail?: 'full' | 'half'; gameId: string; view: unknown; Screen?: HostScreen; ready?: (error?: unknown) => void; soundHistory?: { previous: unknown }; paused?: boolean; waiting?: { message: string | null; countdown: number | null }; finalScreen?: boolean; results?: Extract<SessionEvent, { type: 'results' }>['results'] }
export function hostScreen(display: SessionDisplay | null, lobby: boolean): string { return display ? display.results ? display.finalScreen ? 'game' : 'results' : 'game' : lobby ? 'lobby' : 'picker'; }
export interface AdapterOptions {
  counts?: Pick<ReturnType<typeof hostCounts>, 'begin' | 'frame' | 'end' | 'stop' | 'add'>;
  load(id: string): Promise<{ game: LoadedGame; Screen?: HostScreen; viewKey?: (view: unknown) => unknown; finalScreen?: boolean }>;
  prepare(game: LoadedGame, seed: number, teams?: boolean): Promise<{ context: InitContext; settings: object }>;
  assets(game: LoadedGame, state: unknown): Promise<void>;
  detail?(id: string, screen: HostScreen, signal: AbortSignal): Promise<'full' | 'lower'>;
  transport: SessionTransport;
  frames: SessionFrames;
  seed(): number;
  display(value: SessionDisplay | null): void;
  event(event: SessionEvent): void;
}
/** Frames are gated until init, every asset and the host view have finished loading. */
export function createSessionAdapter(o: AdapterOptions) {
  const setups = new Map<string, PreparedSetup>();
  const setupVersions = new Map<string, number>();
  const pending = new Map<string, ReturnType<AdapterOptions['load']>>();
  let generation = 0;
  let detailAbort: AbortController | undefined;
  let cancelReady: (() => void) | undefined;
  let latestRoom: RoomState | undefined;
  let runner: ReturnType<typeof createSession> | undefined;
  let stopFrames: (() => void) | undefined;
  let saveActive: ((state: unknown) => Promise<void>) | undefined;
  let activeGame: LoadedGame | undefined;
  let resultsEnded = false;
  let revealResults: (() => void) | undefined;
  let stopTransport: (() => void) | undefined;
  const buffer = createInputBuffer<string>({ axisCount: 4, seqModulus: SEQ_MODULO, staleAfterSteps: INPUT_STALE_STEPS });
  function prefetch(id: string) {
    let loaded = pending.get(id);
    if (!loaded) { loaded = o.load(id).catch((error: unknown) => { pending.delete(id); throw error; }); pending.set(id, loaded); }
    return loaded;
  }
  function stop(): void {
    detailAbort?.abort(); detailAbort = undefined;
    cancelReady?.(); cancelReady = undefined;
    o.counts?.stop();
    revealResults = undefined; generation++; stopFrames?.(); stopFrames = undefined; stopTransport?.(); stopTransport = undefined;
    activeGame = undefined; runner = undefined; for (let seat = 1; seat <= 8; seat++) buffer.remove(`seat-${String(seat)}`); o.display(null);
  }
  return {
    buffer, prefetch,
    command(action: 'pause' | 'resume' | 'quit', id: string): void {
      if (action === 'quit') {
        const active = runner;
        const save = saveActive;
        if (active?.quit(id, true) === 'quit' && !resultsEnded && active.state !== undefined) void save?.(active.state);
      } else if (action === 'pause') runner?.pause(id);
      else runner?.resume(id);
    },
    async setup(id: string, teams: boolean) {
      const version = (setupVersions.get(id) ?? 0) + 1; setupVersions.set(id, version);
      const loaded = await prefetch(id);
      const setup = await prepareSetup(loaded.game, teams);
      if (setupVersions.get(id) === version) setups.set(id, setup);
      return setup;
    },
    allowsRunningJoin(teams: boolean): boolean { return !!activeGame?.meta.midGameJoin && (!teams || !!activeGame.joinTeam); },
    async start(gameId: string, room: RoomState, settings?: object, assignTeam?: (seat: number, team: TeamId) => void): Promise<void> {
      stop(); resultsEnded = false; latestRoom = room; const current = generation;
      const controller = new AbortController(); detailAbort = controller;
      const loaded = await prefetch(gameId);
      const seed = o.seed();
      const prepared = settings ? await prepareMatch(loaded.game, seed, setups.get(gameId) ?? await prepareSetup(loaded.game), settings) : await o.prepare(loaded.game, seed, loaded.game.meta.teams === 'required' || (loaded.game.meta.teams === 'optional' && gamePlayers(loaded.game.meta, room).length > 1 && gamePlayers(loaded.game.meta, room).every(p => p.team !== null)));
      if (current !== generation) throw new Error('Cancelled');
      const setup = { failed: false };
      const isFailed = (): boolean => setup.failed;
      let display: SessionDisplay = { gameId, view: null, soundHistory: { previous: null }, ...(loaded.Screen ? { Screen: loaded.Screen } : {}) };
      let previousView: unknown;
      saveActive = async state => {
        const view = await saveSession(loaded.game, state, display.view, prepared.context.saved !== null);
        if (current !== generation) return;
        display = { ...display, view }; o.display(display);
      };
      // P-09 test-only observer: absent from production, never changes wire data or rules.
      // Only when the perf harness installed its hook before load; otherwise the game object is passed through untouched.
      const timing = import.meta.env.DEV ? globalThis.__kakiActionTiming : undefined;
      const gameRevisions = new Map<string, number>();
      const wireRevisions = new Map<string, Map<number, number>>();
      const received: { player: string; control: string; value?: string | number; wireRevision: number; gameRevision: number }[] = [];
      const observedGame: LoadedGame = timing ? Object.assign(Object.create(loaded.game) as LoadedGame, { controllerLayout(state: unknown, player: string) {
        const layout = loaded.game.controllerLayout(state, player);
        gameRevisions.set(player, layout.revision); return layout;
      }, step(state: unknown, inputs: Parameters<LoadedGame['step']>[1], dt: number) {
        const result = loaded.game.step(state, inputs, dt);
        for (const action of inputs.actions) {
          const index = received.findIndex(r => r.player === action.player && r.control === action.control && r.value === action.value && r.gameRevision === action.revision);
          const receipt = index < 0 ? undefined : received.splice(index, 1)[0];
          globalThis.__kakiActionTiming?.('applied', action.player, action.control, action.value, receipt ? {
            wireRevision: receipt.wireRevision, gameRevision: action.revision,
            round: state && typeof state === 'object' && 'round' in state && typeof state.round === 'number' ? state.round : null,
          } : undefined);
        }
        received.length = 0;
        return result;
      } }) : loaded.game;
      const next = createSession({ game: observedGame, ...prepared, seed, room: latestRoom, buffer,
        ...(assignTeam ? { assignTeam } : {}),
        transport: { ...o.transport, sendLayout(connection, layout) {
          const sent = o.transport.sendLayout(connection, layout);
          if (timing && sent) {
            const seat = latestRoom?.players.find(p => p.connectionId === connection)?.seat;
            const player = `seat-${String(seat)}`, revision = gameRevisions.get(player);
            if (revision !== undefined) {
              const revisions = wireRevisions.get(player) ?? new Map<number, number>();
              for (const [wire, game] of revisions) if (game < revision) revisions.delete(wire);
              revisions.set(layout.revision, revision); wireRevisions.set(player, revisions);
            }
          }
          return sent;
        }, subscribe(receive) { stopTransport = o.transport.subscribe(event => {
          if (timing && event.type === 'tap') {
            const seat = latestRoom?.players.find(p => p.connectionId === event.connectionId)?.seat;
            if (seat !== undefined) {
              const player = `seat-${String(seat)}`;
              const gameRevision = wireRevisions.get(player)?.get(event.action.revision);
              if (gameRevision !== undefined) received.push({ player, ...event.action, wireRevision: event.action.revision, gameRevision });
            }
            if (seat !== undefined) globalThis.__kakiActionTiming?.('receipt', `seat-${String(seat)}`, event.action.control, event.action.value);
          }
          receive(event);
        }); return () => { stopTransport?.(); stopTransport = undefined; }; } },
        publicView(view) {
          const key = loaded.viewKey ? loaded.viewKey(view) : view;
          if (sameView(key, previousView)) return;
          previousView = key; display = { ...display, view }; if (runner) o.display(display);
        },
        event(event) {
          if (event.type === 'waiting') { display = { ...display, waiting: { message: event.message, countdown: event.countdown } }; if (runner) o.display(display); }
          if (event.type === 'paused') { display = { ...display, paused: event.paused }; if (runner) o.display(display); }
          if (event.type === 'error') { setup.failed = true; o.counts?.add('error:host:session'); o.counts?.stop(); }
          if (event.type === 'results') {
            resultsEnded = true;
            stopFrames?.(); stopFrames = undefined; o.counts?.end();
            // Results can arrive inside advance(). Save only after that frame returns.
            queueMicrotask(() => {
              if (current === generation && next.state !== undefined) void saveActive?.(next.state);
            });
            display = { ...display, results: event.results, finalScreen: loaded.finalScreen ?? false };
            revealResults = () => { display = { ...display, finalScreen: false }; o.display(display); };
            o.display(display);
          }
          o.event(event);
        },
      });
      if (setup.failed || next.state === undefined) { stop(); throw new Error('Session setup failed'); }
      try { await o.assets(loaded.game, next.state); }
      catch (error) { if (current === generation) stop(); throw error; }
      if (current !== generation) throw new Error('Cancelled');
      if (loaded.Screen && o.detail) {
        try {
          const detail = await o.detail(gameId, loaded.Screen, controller.signal);
          display = { ...display, detail: detail === 'lower' ? 'half' : 'full' };
        } catch (error) { if (current === generation) stop(); throw error; }
      }
      if (current !== generation) throw new Error('Cancelled');
      next.updateRoom(latestRoom);
      if (isFailed()) { stop(); throw new Error('Session setup failed'); }
      if (loaded.Screen && 'mount' in loaded.Screen) {
        try {
          await new Promise<void>((resolve, reject) => {
            cancelReady = () => { reject(new Error('Cancelled')); };
            display = { ...display, ready: error => { if (error) reject(error instanceof Error ? error : new Error('Host screen preparation failed', { cause: error })); else resolve(); } };
            o.display(display);
          });
        } catch (error) { if (current === generation) stop(); throw error; }
        cancelReady = undefined;
        if (current !== generation) throw new Error('Cancelled');
        // Remove readiness only from a fresh, unpublished snapshot.
        display = { ...display };
        delete display.ready;
      }
      activeGame = loaded.game; runner = next; o.display(display);
      if (!next.ended) {
        o.counts?.begin();
        try { stopFrames = o.frames.subscribe(ms => { if (current === generation) { o.counts?.frame(ms); next.advance(ms); } }); }
        catch (error) { stop(); throw error; }
      }
    },
    updateRoom(room: RoomState): void { latestRoom = room; runner?.updateRoom(room); },
    continueResults(): void { revealResults?.(); revealResults = undefined; },
    backToPicker(): void { runner?.backToPicker(); },
    stop,
  };
}
/** Compare view structure without allocating a serialised copy on every simulation step. */
function sameView(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const left = Object.entries(a); const right = Object.entries(b);
  return left.length === right.length && left.every(([key, value]) => Object.hasOwn(b, key) && sameView(value, Reflect.get(b, key)));
}
export function animationFrames(request: typeof requestAnimationFrame, cancel: typeof cancelAnimationFrame): SessionFrames {
  return { subscribe(frame) {
    let previous: number | undefined; let active = true;
    const isActive = (): boolean => active; let handle: number;
    const tick = (now: number): void => { if (!active) return; const elapsed = previous === undefined ? 0 : now - previous; previous = now; frame(elapsed); if (isActive()) handle = request(tick); };
    handle = request(tick);
    return () => { active = false; cancel(handle); };
  } };
}
export const wireJson = (value: unknown): JsonValue => value as JsonValue;

// Installed only by tools/perf in a development browser capture.
declare global {
  var __kakiActionTiming: ((stage: 'receipt' | 'applied', player: string, control: string, value?: string | number, accepted?: { round: number | null; wireRevision: number; gameRevision: number }) => void) | undefined;
}
