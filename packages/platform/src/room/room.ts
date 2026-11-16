import {
  canAskToJoin, checkNickname, MAX_PLAYERS, PROTOCOL_VERSION, ROOM_PHASES,
  TOKEN_PATTERN
} from '@kaki/protocol';
import type { Json, NameProblem, RefusalReason, RoomPhase, Seat } from '@kaki/protocol';
import { hasBlockedWord, nameSkeleton, storedName } from './blocked-words';
export const RECONNECT_WINDOW_MS = 120000;
export const LEADER_GRACE_MS = 10000;
export interface RoomPlayer {
  readonly seat: number;
  readonly colour: number;
  readonly name: string;
  readonly seatToken: string;
  readonly deviceId: string;
  readonly connectionId: string;
  readonly disconnectedAt: number | null;
  readonly midGameJoin: boolean;
  readonly awaitingRestore?: boolean;
  readonly restoreDeadline?: number | undefined;
  readonly team: null | 'red' | 'blue';
  readonly quality: Json;
}
export interface RoomState {
  readonly players: readonly RoomPlayer[];
  readonly leader: number | null;
  readonly phase: RoomPhase;
  readonly allowRunningJoin: boolean;
  readonly clock: number;
}
export type HostEvent = {
  readonly type: 'expire';
} | {
  readonly type: 'restore';
} | {
  readonly type: 'disconnect';
  readonly seat: number;
} | {
  readonly type: 'phase';
  readonly phase: RoomPhase;
  readonly allowRunningJoin: boolean;
} | {
  readonly type: 'team';
  readonly seat: number;
  readonly team: null | 'red' | 'blue';
} | {
  readonly type: 'quality';
  readonly seat: number;
  readonly quality: Json;
};
export type PhoneEvent = {
  readonly type: 'join';
  readonly name: string | null;
  readonly seatToken: string;
} | {
  readonly type: 'resume';
  readonly seatToken: string;
} | {
  readonly type: 'rename';
  readonly name: string;
} | {
  readonly type: 'leave';
};
/** Trusted transport binding, never taken from the phone message. Tokens are host-minted. */
export interface PhoneIdentity {
  readonly deviceId: string;
  readonly connectionId: string;
  readonly seat?: number;
}
/** Non-protocol failures are explicitly host-internal and must not be sent as refused messages. */
export type RoomRefusal = RefusalReason | NameProblem
  | 'bad-event' | 'bad-clock' | 'token-in-use' | 'player-missing';
export type RoomEffect = Seat | {
  readonly type: 'close';
  readonly connectionId: string;
  readonly reason: 'replaced';
} | {
  readonly type: 'leader-changed';
  readonly leader: number | null;
} | {
  readonly type: 'seat-expired' | 'player-joined' | 'player-left';
  readonly seat: number;
} | {
  readonly type: 'name-replaced';
  readonly seat: number;
  readonly name: string;
} | {
  readonly type: 'name-suffixed';
  readonly seat: number;
  readonly name: string;
  readonly givenName: string;
  readonly nameSuffixed: true;
};
export interface RoomResult {
  readonly state: RoomState;
  readonly effects: readonly RoomEffect[];
  readonly result: {
    readonly ok: true;
  } | {
    readonly ok: false;
    readonly reason: RoomRefusal;
    readonly hostInternal: boolean;
  };
}
export function createRoom(): RoomState {
  return { players: [], leader: null, phase: 'lobby', allowRunningJoin: false, clock: 0 };
}
/** This is the only shareable room projection. Seat notices are private channel effects. */
export function publicRoom(state: RoomState) {
  return {
    ...state, players: state.players.map((p) => ({
      seat: p.seat, colour: p.colour,
      name: p.name, disconnectedAt: p.disconnectedAt, midGameJoin: p.midGameJoin, team: p.team,
      quality: p.quality
    }))
  };
}
export function isRoomLeader(state: RoomState, seat: number): boolean {
  return state.leader === seat && state.players.some((p) => p.seat === seat &&
    p.disconnectedAt === null);
}
function elect(state: RoomState): RoomState {
  const current = state.players.find((p) => p.seat === state.leader);
  if (current && ((current.awaitingRestore &&
    (current.restoreDeadline === undefined || state.clock < current.restoreDeadline)) ||
    current.disconnectedAt === null ||
    (!current.awaitingRestore && state.clock - current.disconnectedAt < LEADER_GRACE_MS)))
    return state;
  const connected = state.players.filter((p) => p.disconnectedAt === null).map((p) => p.seat);
  return { ...state, leader: connected.length ? Math.min(...connected) : null };
}
function safeName(name: string): boolean {
  return checkNickname(name) === 'ok' &&
    !hasBlockedWord(name);
}
function uniqueName(name: string, players: readonly RoomPlayer[], seat: number): string {
  const used = new Set(players.map((p) => nameSkeleton(p.name)));
  if (safeName(name) && !used.has(nameSkeleton(name)))
    return name;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const ending = ` ${String(suffix)}`;
    let base = Array.from(name);
    while (base.length && checkNickname(base.join('') + ending) !== 'ok')
      base = base.slice(0, -1);
    const candidate = base.join('') + ending;
    if (!safeName(candidate))
      break;
    if (!used.has(nameSkeleton(candidate)))
      return candidate;
  }
  for (let n = seat; ; n += 1) {
    const candidate = `Player ${String(n)}`;
    if (safeName(candidate) && !used.has(nameSkeleton(candidate)))
      return candidate;
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validEvent(value: unknown, host: boolean): boolean {
  if (!record(value))
    return false;
  const seat = typeof value.seat === 'number' && Number.isInteger(value.seat) &&
    value.seat >= 1 && value.seat <= MAX_PLAYERS;
  const token = typeof value.seatToken === 'string' && TOKEN_PATTERN.test(value.seatToken);
  if (host)
    switch (value.type) {
      case 'expire':
      case 'restore': return true;
      case 'disconnect': return seat;
      case 'phase': return ROOM_PHASES.some((p) => p === value.phase) &&
        typeof value.allowRunningJoin === 'boolean';
      case 'team': return seat && (value.team === null || value.team === 'red' ||
        value.team === 'blue');
      case 'quality': return seat && isJson(value.quality);
      default: return false;
    }
  switch (value.type) {
    case 'join': return token && (value.name === null || typeof value.name === 'string');
    case 'resume': return token;
    case 'rename': return typeof value.name === 'string';
    case 'leave': return true;
    default: return false;
  }
}
function isJson(value: unknown, seen = new Set<unknown>()): value is Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return true;
  if (typeof value === 'number')
    return Number.isFinite(value);
  if (typeof value !== 'object' || seen.has(value))
    return false;
  seen.add(value);
  const valid = (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype)
    && Object.values(value).every((v) => isJson(v, seen));
  seen.delete(value);
  return valid;
}
export function applyHostEvent(state: RoomState, event: unknown, now: number): RoomResult {
  return apply(state, event, now);
}
export function applyPhoneEvent(state: RoomState, identity: PhoneIdentity,
  event: unknown, now: number): RoomResult {
  return apply(state, event, now, identity);
}
function apply(state: RoomState, input: unknown, time: number,
  identity?: PhoneIdentity): RoomResult {
  let next = state;
  const effects: RoomEffect[] = [];
  const finish = (reason?: RoomRefusal): RoomResult => {
    next = elect(next);
    if (next.leader !== state.leader)
      effects.push({ type: 'leader-changed', leader: next.leader });
    return {
      state: next, effects, result: reason ? {
        ok: false, reason,
        hostInternal: [
          'bad-event',
          'bad-clock',
          'token-in-use',
          'player-missing',
        ].includes(reason)
      } : { ok: true }
    };
  };
  if (!Number.isFinite(time))
    return finish('bad-clock');
  // Snapshot untrusted data once to contain throwing or changing accessors.
  let event: HostEvent | PhoneEvent;
  try {
    if (!record(input))
      return finish('bad-event');
    const snapshot: unknown = { ...input };
    if (!validEvent(snapshot, !identity))
      return finish('bad-event');
    if (identity && (!identity.deviceId || !identity.connectionId))
      return finish('bad-event');
    event = snapshot as HostEvent | PhoneEvent;
  }
  catch {
    return finish('bad-event');
  }
  const now = Math.max(Math.floor(time), state.clock);
  const players = state.players.filter((p) => {
    const expired = p.disconnectedAt !== null && now - p.disconnectedAt > RECONNECT_WINDOW_MS;
    if (expired)
      effects.push({ type: 'seat-expired', seat: p.seat });
    return !expired;
  });
  // Prune expired holds before starting the restore wait for retained seats.
  next = {
    ...state, clock: now, players: event.type === 'restore'
      ? players.map((p) => ({
        ...p, disconnectedAt: p.disconnectedAt ?? now,
        awaitingRestore: true, restoreDeadline: undefined
      })) : players
  };
  if (event.type !== 'restore')
    next = elect(next);
  const notice = (p: RoomPlayer, replaced: boolean, resumed: boolean): void => {
    effects.push({
      v: PROTOCOL_VERSION, t: 'seat', seat: p.seat, colour: p.colour,
      name: p.name, seatToken: p.seatToken, nameReplaced: replaced, resumed
    });
    if (replaced)
      effects.push({ type: 'name-replaced', seat: p.seat, name: p.name });
  };
  if (event.type === 'expire' || event.type === 'restore')
    return finish();
  if (event.type === 'phase') {
    next = { ...next, phase: event.phase, allowRunningJoin: event.allowRunningJoin };
    return finish();
  }
  if (event.type === 'resume' || event.type === 'join') {
    const existing = event.type === 'resume'
      ? next.players.find((p) => p.seatToken === event.seatToken)
      : next.players.find((p) => p.connectionId === identity?.connectionId
        || p.deviceId === identity?.deviceId);
    if (existing) {
      if (event.type === 'join' && existing.connectionId === identity?.connectionId) {
        notice(existing, false, true);
        return finish();
      }
      if (existing.disconnectedAt === null && (event.type === 'resume' ||
        existing.connectionId !== identity?.connectionId))
        effects.push({ type: 'close', connectionId: existing.connectionId, reason: 'replaced' });
      if (existing.seat !== next.leader) {
        next = {
          ...next,
          players: next.players.map((p) =>
            p.seat === next.leader && p.awaitingRestore && p.restoreDeadline === undefined
              ? { ...p, restoreDeadline: now + 20000 } : p)
        };
      }
      const restored = {
        ...existing, disconnectedAt: null, awaitingRestore: false,
        deviceId: identity?.deviceId ?? existing.deviceId,
        connectionId: identity?.connectionId ?? existing.connectionId
      };
      next = { ...next, players: next.players.map((p) => p.seat === existing.seat ? restored : p) };
      notice(restored, false, true);
      return finish();
    }
    if (event.type === 'resume')
      return finish('seat-expired');
  }
  const seat = identity ? next.players.find((p) => p.seat === identity.seat &&
    p.connectionId === identity.connectionId
    && p.deviceId === identity.deviceId)?.seat
    : 'seat' in event ? event.seat : undefined;
  const player = event.type === 'join' ? undefined
    : next.players.find((p) => p.seat === seat);
  if (event.type === 'join' || event.type === 'rename') {
    if (event.type === 'rename' && (player?.disconnectedAt !== null))
      return finish('player-missing');
    if (event.type === 'join') {
      if (!canAskToJoin(next.phase) && !next.allowRunningJoin)
        return finish('game-running');
      if (next.players.length >= MAX_PLAYERS)
        return finish('room-full');
      if (next.players.some((p) => p.seatToken === event.seatToken))
        return finish('token-in-use');
    }
    const requested = event.name === null ? null : storedName(event.name);
    if (requested !== null) {
      const problem = checkNickname(requested);
      if (problem !== 'ok')
        return finish(problem);
    }
    let number = player?.seat ?? 1;
    if (!player)
      while (next.players.some((p) => p.seat === number))
        number += 1;
    const blocked = requested !== null && hasBlockedWord(requested);
    const name = uniqueName(requested === null || blocked ?
      `Player ${String(number)}` : requested, next.players.filter((p) => p !== player), number);
    const updated: RoomPlayer = player ? { ...player, name } : {
      seat: number,
      colour: number - 1, name,
      seatToken: event.type === 'join' ? event.seatToken : '', deviceId: identity?.deviceId ?? '',
      connectionId: identity?.connectionId ?? '', disconnectedAt: null,
      midGameJoin: !canAskToJoin(next.phase), team: null, quality: null
    };
    next = {
      ...next, players: player ? next.players.map((p) => p === player ? updated :
        p) : [...next.players, updated]
    };
    notice(updated, blocked, false);
    if (!blocked && requested !== null && name !== requested) {
      effects.push({
        type: 'name-suffixed', seat: number, name,
        givenName: requested, nameSuffixed: true
      });
    }
    if (!player)
      effects.push({ type: 'player-joined', seat: number });
    return finish();
  }
  if (!player)
    return finish('player-missing');
  if (event.type === 'leave') {
    next = { ...next, players: next.players.filter((p) => p !== player) };
    effects.push({ type: 'player-left', seat: player.seat });
  }
  else {
    const updated = event.type === 'disconnect' ? {
      ...player,
      disconnectedAt: player.disconnectedAt ?? now
    }
      : event.type === 'team' ? { ...player, team: event.team }
        : { ...player, quality: event.quality };
    next = { ...next, players: next.players.map((p) => p === player ? updated : p) };
  }
  return finish();
}
