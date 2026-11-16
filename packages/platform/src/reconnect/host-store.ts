import { checkNickname, ROOM_CODE_PATTERN, ROOM_PHASES, TOKEN_PATTERN } from '@kaki/protocol';
import type { JsonValue, Results } from '../game/types';
import { applyHostEvent } from '../room/room';
import type { RoomState } from '../room/room';
import { hasBlockedWord, nameSkeleton } from '../room/blocked-words';
import { keys, natural, object, remove, safeJson, storageBytes } from './storage';
import type { ReconnectClock, ReconnectStorage } from './storage';
export const HOST_STORAGE_KEY = 'kaki.host-reconnect.v1';
export const HOST_SNAPSHOT_VERSION = 1;
export const HOST_SNAPSHOT_BYTES = 65536;
export const HOST_WRITE_INTERVAL_MS = 1000;
export const HOST_REOPEN_TIMEOUT_MS = 15000;
export const ROOM_MAX_AGE_MS = 43200000;
export const HOST_SNAPSHOT_MAX_AGE_MS = ROOM_MAX_AGE_MS;
export interface HostCredentials { code: string; hostToken: string }
export interface HostSnapshotInput {
  credentials: HostCredentials;
  createdAt: number;
  room: RoomState;
  /** Cumulative session scores, keyed by seat-N, independent of the interrupted round. */
  scores: Readonly<Record<string, number>>;
  results: readonly Results[];
  selection: { id: string; settings: JsonValue; saved: JsonValue } | null;
}
export interface HostSnapshot extends HostSnapshotInput {
  version: typeof HOST_SNAPSHOT_VERSION;
  writtenAt: number;
}
function credentials(value: unknown): value is HostCredentials {
  return object(value) && keys(value, ['code', 'hostToken']) &&
    typeof value.code === 'string' && ROOM_CODE_PATTERN.test(value.code) &&
    typeof value.hostToken === 'string' && TOKEN_PATTERN.test(value.hostToken);
}
function validRoom(value: unknown): value is RoomState {
  if (!object(value) || !keys(value,
    ['players', 'leader', 'phase', 'allowRunningJoin', 'clock']) || !Array.isArray(value.players) ||
    value.players.length > 8 || typeof value.allowRunningJoin !== 'boolean' ||
    !natural(value.clock) || !ROOM_PHASES.some(p => p === value.phase)) return false;
  const seats = new Set<number>();
  const tokens = new Set<string>();
  const names = new Set<string>();
  for (const p of value.players as unknown[]) {
    if (!object(p) || !keys(p, ['seat', 'colour', 'name', 'seatToken', 'deviceId',
      'connectionId', 'disconnectedAt', 'midGameJoin', 'team', 'quality']) ||
      !natural(p.seat) || p.seat < 1 || p.seat > 8 || p.colour !== p.seat - 1 ||
      typeof p.name !== 'string' || checkNickname(p.name) !== 'ok' || hasBlockedWord(p.name) ||
      typeof p.seatToken !== 'string' || !TOKEN_PATTERN.test(p.seatToken) ||
      p.deviceId !== '' || p.connectionId !== '' || !(p.disconnectedAt === null || natural(p.disconnectedAt)) ||
      typeof p.midGameJoin !== 'boolean' || !(p.team === null || p.team === 'red' || p.team === 'blue') ||
      p.quality !== null || seats.has(p.seat) || tokens.has(p.seatToken) || names.has(nameSkeleton(p.name)))
      return false;
    seats.add(p.seat); tokens.add(p.seatToken); names.add(nameSkeleton(p.name));
  }
  return value.leader === null ||
    natural(value.leader) && seats.has(value.leader);
}
function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
function resultEntry(value: unknown, team: boolean): boolean {
  if (!object(value)) return false;
  const base = team ? ['team', 'place', 'score'] : ['id', 'place', 'score', 'joinedMidGame'];
  if (!keys(value, 'extras' in value ? [...base, 'extras'] : base) ||
    !natural(value.place) || value.place < 1 || !finite(value.score)) return false;
  return team ? value.team === 0 || value.team === 1 :
    typeof value.id === 'string' && /^seat-[1-8]$/.test(value.id) &&
    typeof value.joinedMidGame === 'boolean';
}
function validResults(value: unknown): boolean {
  if (!object(value) || !['players', 'teams', 'coop'].includes(value.mode as string) ||
    !Array.isArray(value.players) || value.players.length > 8 ||
    !value.players.every((p: unknown) => resultEntry(p, false))) return false;
  const ids = value.players.map((p: { id: string }) => p.id);
  if (new Set(ids).size !== ids.length) return false;
  const fields = ['mode', 'players', ...('extras' in value ? ['extras'] : [])];
  if (value.mode === 'teams') {
    fields.push('teams');
    if (!Array.isArray(value.teams) || value.teams.length !== 2 ||
      !value.teams.every((p: unknown) => resultEntry(p, true)) ||
      (value.teams[0] as Record<string, unknown>).team ===
        (value.teams[1] as Record<string, unknown>).team) return false;
  }
  if (value.mode === 'coop') { fields.push('score'); if (!finite(value.score)) return false; }
  return keys(value, fields);
}
export type ValidateSelection = (id: string, settings: JsonValue) => boolean;
function valid(value: unknown, now: number, selection: ValidateSelection): value is HostSnapshot {
  if (!safeJson(value) || !object(value) || !keys(value, ['version', 'writtenAt', 'createdAt',
    'credentials', 'room', 'scores', 'results', 'selection']) ||
    value.version !== HOST_SNAPSHOT_VERSION || !natural(value.writtenAt) ||
    !natural(value.createdAt) || value.createdAt > value.writtenAt || value.writtenAt > now + 5000 ||
    now - value.writtenAt >= HOST_SNAPSHOT_MAX_AGE_MS ||
    now - value.createdAt >= ROOM_MAX_AGE_MS || !credentials(value.credentials) ||
    !validRoom(value.room) || value.room.clock > value.writtenAt ||
    value.room.players.some(p => p.disconnectedAt !== null && p.disconnectedAt > (value.writtenAt as number)) ||
    !object(value.scores) ||
    Object.keys(value.scores).length > 8 ||
    !Object.entries(value.scores).every(([id, score]) => /^seat-[1-8]$/.test(id) && finite(score)) ||
    !Array.isArray(value.results) || value.results.length > 1 || !value.results.every((r: unknown) => validResults(r))) return false;
  const picked = value.selection;
  return picked === null || object(picked) && keys(picked, ['id', 'settings', 'saved']) &&
    typeof picked.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(picked.id) &&
    selection(picked.id, picked.settings as JsonValue);
}
/** Only retain room identity: transport bindings and timers are rebuilt after reload. */
function persistable(input: HostSnapshotInput, now: number): HostSnapshot {
  let results: readonly Results[] = [];
  let selection: HostSnapshotInput['selection'] = null;
  try { results = input.results.slice(-1); } catch { /* Optional results are dispensable. */ }
  try { selection = input.selection; } catch { /* Room identity still survives. */ }
  return { version: HOST_SNAPSHOT_VERSION, writtenAt: now, createdAt: Math.floor(input.createdAt),
    credentials: { ...input.credentials }, room: { ...input.room,
      players: input.room.players.map(p => ({ seat: p.seat, colour: p.colour, name: p.name,
        seatToken: p.seatToken, deviceId: '', connectionId: '', disconnectedAt: p.disconnectedAt,
        midGameJoin: p.midGameJoin, team: p.team, quality: null })) },
    scores: input.scores, results, selection };
}
export function createHostSnapshotStore(o: {
  storage: ReconnectStorage;
  clock: ReconnectClock;
  validateSelection: ValidateSelection;
}) {
  let last = -Infinity;
  function clear(): void { remove(o.storage, HOST_STORAGE_KEY); }
  return {
    clear,
    write(input: HostSnapshotInput, final = false): boolean {
      if (!final && o.clock.now() - last < HOST_WRITE_INTERVAL_MS)
        return false;
      last = Math.floor(o.clock.now());
      try {
        const snapshot = persistable(input, last);
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (valid(snapshot, last, o.validateSelection)) {
              const text = JSON.stringify(snapshot);
              if (storageBytes(text) <= HOST_SNAPSHOT_BYTES) {
                o.storage.setItem(HOST_STORAGE_KEY, text);
                return true;
              }
            }
          } catch { /* Drop optional data before giving up this capture. */ }
          if (attempt === 0) snapshot.results = [];
          else snapshot.selection = null;
        }
        return false;
      } catch { return false; }
    },
    read(expectedCode?: string): HostSnapshot | null {
      let text: string | null;
      try { text = o.storage.getItem(HOST_STORAGE_KEY); } catch { return null; }
      try {
        if (text === null) return null;
        if (text.length > HOST_SNAPSHOT_BYTES || storageBytes(text) > HOST_SNAPSHOT_BYTES)
          throw new Error('Invalid host snapshot');
        const snapshot: unknown = JSON.parse(text);
        if (!valid(snapshot, o.clock.now(), o.validateSelection) ||
          expectedCode !== undefined && snapshot.credentials.code !== expectedCode)
          throw new Error('Invalid host snapshot');
        return snapshot;
      } catch { clear(); return null; }
    },
  };
}
export type HostSnapshotStore = ReturnType<typeof createHostSnapshotStore>;
/** Await the real server's created acknowledgement before exposing restored state to phones. */
export async function restoreHost<Link extends { stop(): void }>(o: {
  store: HostSnapshotStore;
  clock: ReconnectClock;
  expectedCode?: string;
  /** Register socket cleanup before awaiting acknowledgement, so a silent open is cancellable. */
  reopen(credentials: HostCredentials, registerStop: (stop: () => void) => void): Promise<{
    link: Link; code: string; hostToken: string; reopened: boolean;
  }>;
}) {
  const snapshot = o.store.read(o.expectedCode);
  if (!snapshot) return null;
  let accepting = true;
  let retained = false;
  let stopPending: (() => void) | undefined;
  let timer: unknown;
  try {
    const attempt = o.reopen(snapshot.credentials, stop => {
      if (!accepting && !retained) stop(); else stopPending = stop;
    });
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = o.clock.schedule(() => { reject(new Error('Host reopen timed out')); },
        HOST_REOPEN_TIMEOUT_MS);
    });
    void attempt.then(opened => { if (!accepting) opened.link.stop(); }, () => {
      /* The rejection is handled by the race below. */
    });
    const opened = await Promise.race([attempt, deadline]);
    o.clock.cancel(timer);
    if (!opened.reopened || opened.code !== snapshot.credentials.code ||
      opened.hostToken !== snapshot.credentials.hostToken) {
      opened.link.stop(); o.store.clear(); return null;
    }
    const now = Math.max(Math.floor(o.clock.now()), snapshot.writtenAt);
    if (now - snapshot.createdAt >= ROOM_MAX_AGE_MS ||
      now - snapshot.writtenAt >= HOST_SNAPSHOT_MAX_AGE_MS) {
      opened.link.stop(); o.store.clear(); return null;
    }
    const room = applyHostEvent({ ...snapshot.room, clock: now,
      players: snapshot.room.players },
    { type: 'restore' }, now).state;
    const lobby = applyHostEvent(room, { type: 'phase', phase: 'lobby', allowRunningJoin: false },
      now).state;
    retained = true;
    return { ...snapshot, room: lobby, link: opened.link, match: 'lost' as const, retryable: false as const };
  } catch (error) {
    const reason = typeof error === 'string' ? error : object(error) ? error.code ?? error.message : null;
    if (['room-not-found', 'room-expired', 'not-allowed', 'bad-token'].includes(reason as string)) {
      o.store.clear(); return null;
    }
    return { retryable: true as const };
  }
  finally {
    accepting = false; o.clock.cancel(timer);
    if (!retained) stopPending?.();
  }
}
/** Safe points only. The shell calls checkpoint on room, pause, results and settings changes.
 * Capture is lazy, coalesced and never connected to SessionFrames or the simulation step. */
export function createHostCheckpoints(o: {
  store: HostSnapshotStore;
  clock: ReconnectClock;
  capture(): HostSnapshotInput;
  lifecycle?: { subscribe(checkpoint: (event?: 'pageshow' | 'pagehide' | 'hidden') => void): () => void };
}) {
  let last = -Infinity;
  let pending: unknown;
  let stopped = false;
  let dirty = true;
  function write(final = false): void {
    pending = undefined;
    if (stopped) return;
    last = o.clock.now();
    try { dirty = !o.store.write(o.capture(), final); } catch { dirty = true; }
  }
  function checkpoint(): void {
    dirty = true;
    if (stopped || pending !== undefined) return;
    const delay = HOST_WRITE_INTERVAL_MS - (o.clock.now() - last);
    if (delay <= 0) write();
    else pending = o.clock.schedule(() => { write(); }, delay);
  }
  function flush(): void {
    if (!dirty || stopped) return;
    o.clock.cancel(pending); pending = undefined; write(true);
  }
  const unsubscribe = o.lifecycle?.subscribe(event => { if (event === 'pageshow') dirty = true; else flush(); });
  return { checkpoint, flush, stop(): void {
    stopped = true; o.clock.cancel(pending); unsubscribe?.();
  } };
}
