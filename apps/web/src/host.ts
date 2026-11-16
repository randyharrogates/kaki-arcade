import { createHostCheckpoints, createHostSnapshotStore, createReconnectRoom, createRoom, restoreHost } from '@kaki/platform';
import type { HostCredentials, HostSnapshotInput, ReconnectClock, ReconnectHostPeer, ReconnectStorage } from '@kaki/platform';
import type { LinkSnapshot } from '@kaki/netcode';
import type { PairingState, LobbyInput } from './view-model';

export interface HostLink { credentials: HostCredentials; stop(): void }
export interface DialCallbacks {
  retryAfter?(ms: number): void;
  peer(id: string, peer: ReconnectHostPeer): void;
  control(id: string, message: unknown): void;
  dropped(id: string): void;
  quality(id: string, link: LinkSnapshot): void;
  state(state: PairingState): void;
}
export interface HostDependencies {
  clock: ReconnectClock;
  storage: ReconnectStorage;
  mintToken(): string;
  dial(credentials: HostCredentials | undefined, callbacks: DialCallbacks,
    registerStop: (stop: () => void) => void): Promise<HostLink & { reopened: boolean }>;
  online?: { subscribe(callback: () => void): () => void };
  lifecycle?: { subscribe(callback: (event?: 'pageshow' | 'pagehide' | 'hidden') => void): () => void };
}
/** All credentials and peers remain inside this closure; subscribers receive a projection later. */
export function createHost(deps: HostDependencies, changed: (input: Omit<LobbyInput, 'origin'>) => void) {
  const store = createHostSnapshotStore({ storage: deps.storage, clock: deps.clock, validateSelection: () => false });
  let pairing: PairingState = 'creating';
  let code = '';
  let stopped = false;
  let attempt = 0;
  let link: HostLink | undefined;
  let stopDial: (() => void) | undefined;
  let roomAdapter: ReturnType<typeof createReconnectRoom> | undefined;
  let checkpoints: ReturnType<typeof createHostCheckpoints> | undefined;
  let snapshot: HostSnapshotInput | undefined;
  const links = new Map<string, LinkSnapshot>();
  let retry: unknown;
  let failures = 0;
  let creationAttempts = 0;
  let creationAllowedAt = 0;
  let retryAfter = 0;
  const qualityRuns = new Map<string, { quality: LinkSnapshot['quality']; count: number }>();
  function scheduleRetry(): void {
    deps.clock.cancel(retry);
    const delay = Math.max(Math.min(30000, 1000 * 2 ** Math.min(failures++, 5)), retryAfter - deps.clock.now(), (store.read() ? 0 : creationAllowedAt) - deps.clock.now());
    retry = deps.clock.schedule(() => { void start(); }, delay);
  }
  const unsubscribeOnline = deps.online?.subscribe(() => { if (pairing === 'unreachable') void start(); });
  function publish(): void {
    if (!stopped) changed({ room: roomAdapter?.room ?? createRoom(), links, pairing, code });
  }
  function terminal(): boolean { return pairing === 'replaced' || pairing === 'expired'; }
  function retire(): void {
    checkpoints?.stop(); checkpoints = undefined;
    roomAdapter?.stop(); roomAdapter = undefined;
    link?.stop(); link = undefined;
    stopDial?.(); stopDial = undefined;
    links.clear(); qualityRuns.clear();
  }
  async function start(fresh = false): Promise<void> {
    if (stopped) return;
    deps.clock.cancel(retry);
    const wait = Math.max(retryAfter, store.read() ? 0 : creationAllowedAt) - deps.clock.now();
    if (wait > 0) { retry = deps.clock.schedule(() => { void start(fresh); }, wait); return; }
    const generation = ++attempt;
    // Preserve the latest room before a manual retry.
    checkpoints?.flush(); retire();
    if (fresh) store.clear();
    pairing = store.read() && !fresh ? 'restoring' : 'creating'; code = ''; publish();
    const pending: (() => void)[] = [];
    const current = (): boolean => !stopped && generation === attempt;
    const run = (action: () => void): void => {
      if (!current() || terminal()) return;
      if (roomAdapter) action(); else pending.push(action);
    };
    const callbacks: DialCallbacks = {
      retryAfter: ms => { if (current() && Number.isFinite(ms)) retryAfter = Math.max(retryAfter, deps.clock.now() + ms); },
      peer: (id, peer) => { run(() => { roomAdapter?.attach(id, peer); }); },
      control: (id, message) => { run(() => { roomAdapter?.receive(id, message); }); },
      dropped: id => { run(() => { links.delete(id); qualityRuns.delete(id); roomAdapter?.dropped(id); }); },
      quality: (id, quality) => { run(() => {
        const previous = links.get(id);
        if (previous?.quality === quality.quality) { qualityRuns.delete(id); return; }
        const run = qualityRuns.get(id);
        const count = run?.quality === quality.quality ? run.count + 1 : 1;
        qualityRuns.set(id, { quality: quality.quality, count });
        if (!previous || count >= 3) {
          links.set(id, quality); qualityRuns.delete(id);
          if (roomAdapter?.room.players.some(player => player.connectionId === id && player.disconnectedAt === null)) publish();
        }
      }); },
      state: state => {
        if (!current() || terminal()) return;
        pairing = state;
        if (state === 'replaced' || state === 'expired') {
          // Never let the losing tab overwrite the winner's checkpoint or reopen automatically.
          deps.clock.cancel(retry); checkpoints?.stop(); store.clear(); retire();
        }
        publish();
        // Once open, signalling recovery belongs to netcode; keep the room and peers.
        if (state === 'ready') { failures = 0; deps.clock.cancel(retry); }
      },
    };
    const registerStop = (stop: () => void): void => {
      if (!current()) stop(); else stopDial = stop;
    };
    try {
      const hadSnapshot = store.read() !== null;
      const restored = await restoreHost({ store, clock: deps.clock,
        reopen: async (credentials, register) => {
          const opened = await deps.dial(credentials, callbacks, stop => { register(stop); registerStop(stop); });
          return { link: opened, ...opened.credentials, reopened: opened.reopened };
        } });
      if (!current()) { if (restored && !restored.retryable) restored.link.stop(); return; }
      if (terminal()) return;
      if (restored?.retryable) { pairing = 'unreachable'; publish(); scheduleRetry(); return; }
      if (hadSnapshot && !restored) { pairing = 'expired'; publish(); return; }
      if (restored) {
        link = restored.link;
        snapshot = restored;
      } else {
        creationAttempts++;
        if (creationAttempts >= 8) creationAllowedAt = deps.clock.now() + 60000;
        const opened = await deps.dial(undefined, callbacks, registerStop);
        if (!current()) { opened.stop(); return; }
        link = opened;
        snapshot = { credentials: opened.credentials, createdAt: deps.clock.now(), room: createRoom(), scores: {}, results: [], selection: null };
      }
      if (terminal()) { retire(); return; }
      code = link.credentials.code;
      const captured = snapshot;
      roomAdapter = createReconnectRoom({ room: captured.room, clock: deps.clock, mintToken: () => deps.mintToken(),
        changed: () => { checkpoints?.checkpoint(); publish(); } });
      checkpoints = createHostCheckpoints({ store, clock: deps.clock,
        capture: () => ({ ...captured, room: roomAdapter?.room ?? captured.room }),
        ...(deps.lifecycle ? { lifecycle: deps.lifecycle } : {}) });
      failures = 0; retryAfter = 0;
      deps.clock.cancel(retry);
      pairing = 'ready';
      for (const action of pending.splice(0)) action();
      checkpoints.checkpoint(); publish();
    } catch (error) {
      if (current() && !terminal()) {
        stopDial?.();
        if (error && typeof error === 'object' && 'retryAfterMs' in error && typeof error.retryAfterMs === 'number') retryAfter = deps.clock.now() + error.retryAfterMs;
        pairing = 'unreachable'; publish(); scheduleRetry();
      }
    }
  }
  return {
    start,
    stop(): void { stopped = true; deps.clock.cancel(retry); unsubscribeOnline?.(); attempt++; checkpoints?.flush(); retire(); },
  };
}
