import { createSession } from '@kaki/platform';
import type { GameModule, InitContext, JsonValue, RoomState, SessionEvent, SessionFrames, SessionTransport } from '@kaki/platform';
import { createInputBuffer } from '@kaki/sim-core';
import { INPUT_STALE_STEPS, SEQ_MODULO } from '@kaki/protocol';
import type { ComponentType } from 'preact';

// The registry erases the individual module's state/settings types at this boundary only.
export type LoadedGame = GameModule<unknown, object>;
export type HostScreen = ComponentType<{ view: never; width: number; height: number }>;
export interface SessionDisplay { gameId: string; view: unknown; Screen?: HostScreen; paused?: boolean; finalScreen?: boolean; results?: Extract<SessionEvent, { type: 'results' }>['results'] }
export function hostScreen(display: SessionDisplay | null, lobby: boolean): string { return display ? display.results ? display.finalScreen ? 'game' : 'results' : 'game' : lobby ? 'lobby' : 'picker'; }
export interface AdapterOptions {
  load(id: string): Promise<{ game: LoadedGame; Screen?: HostScreen; viewKey?: (view: unknown) => unknown; finalScreen?: boolean }>;
  prepare(game: LoadedGame, seed: number, teams?: boolean): Promise<{ context: InitContext; settings: object }>;
  assets(game: LoadedGame, state: unknown): Promise<void>;
  transport: SessionTransport;
  frames: SessionFrames;
  seed(): number;
  display(value: SessionDisplay | null): void;
  event(event: SessionEvent): void;
}
/** Frames are gated until init, every asset and the host view have finished loading. */
export function createSessionAdapter(o: AdapterOptions) {
  const pending = new Map<string, ReturnType<AdapterOptions['load']>>();
  let generation = 0;
  let latestRoom: RoomState | undefined;
  let runner: ReturnType<typeof createSession> | undefined;
  let stopFrames: (() => void) | undefined;
  let revealResults: (() => void) | undefined;
  let stopTransport: (() => void) | undefined;
  const buffer = createInputBuffer<string>({ axisCount: 4, seqModulus: SEQ_MODULO, staleAfterSteps: INPUT_STALE_STEPS });
  function prefetch(id: string) {
    let loaded = pending.get(id);
    if (!loaded) { loaded = o.load(id).catch((error: unknown) => { pending.delete(id); throw error; }); pending.set(id, loaded); }
    return loaded;
  }
  function stop(): void {
    revealResults = undefined; generation++; stopFrames?.(); stopFrames = undefined; stopTransport?.(); stopTransport = undefined;
    runner = undefined; for (let seat = 1; seat <= 8; seat++) buffer.remove(`seat-${String(seat)}`); o.display(null);
  }
  return {
    buffer, prefetch,
    command(action: 'pause' | 'resume' | 'quit', id: string): void { if (action === 'quit') runner?.quit(id, true); else if (action === 'pause') runner?.pause(id); else runner?.resume(id); },
    async start(gameId: string, room: RoomState): Promise<void> {
      stop(); latestRoom = room; const current = generation;
      const loaded = await prefetch(gameId);
      const seed = o.seed();
      const prepared = await o.prepare(loaded.game, seed, loaded.game.meta.teams === 'required' || (loaded.game.meta.teams === 'optional' && room.players.length > 1 && room.players.every(p => p.team !== null)));
      if (current !== generation) throw new Error('Cancelled');
      const setup = { failed: false };
      const isFailed = (): boolean => setup.failed;
      let display: SessionDisplay = { gameId, view: null, ...(loaded.Screen ? { Screen: loaded.Screen } : {}) };
      let previousView: unknown;
      const next = createSession({ game: loaded.game, ...prepared, seed, room: latestRoom, buffer,
        transport: { ...o.transport, subscribe(receive) { stopTransport = o.transport.subscribe(receive); return () => { stopTransport?.(); stopTransport = undefined; }; } },
        publicView(view) {
          const key = loaded.viewKey ? loaded.viewKey(view) : view;
          if (sameView(key, previousView)) return;
          previousView = key; display = { ...display, view }; if (runner) o.display(display);
        },
        event(event) {
          if (event.type === 'paused') { display = { ...display, paused: event.paused }; if (runner) o.display(display); }
          if (event.type === 'error') setup.failed = true;
          if (event.type === 'results') { stopFrames?.(); stopFrames = undefined; display = { ...display, results: event.results, finalScreen: loaded.finalScreen ?? false }; revealResults = () => { display = { ...display, finalScreen: false }; o.display(display); }; o.display(display); }
          o.event(event);
        },
      });
      if (setup.failed || next.state === undefined) { stop(); throw new Error('Session setup failed'); }
      try { await o.assets(loaded.game, next.state); }
      catch (error) { if (current === generation) stop(); throw error; }
      if (current !== generation) throw new Error('Cancelled');
      next.updateRoom(latestRoom);
      if (isFailed()) { stop(); throw new Error('Session setup failed'); }
      runner = next; o.display(display);
      if (!next.ended) {
        try { stopFrames = o.frames.subscribe(ms => { if (current === generation) next.advance(ms); }); }
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
