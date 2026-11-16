import { PROTOCOL_VERSION as v, validatePhoneMessage } from '@kaki/protocol';
import type { HostMessage } from '@kaki/protocol';
import type { GameModule, JsonValue, Results } from '../game/types';
import { findSecret } from '../game/json';
import { applyHostEvent, applyPhoneEvent, LEADER_GRACE_MS, RECONNECT_WINDOW_MS } from '../room/room';
import type { HostEvent, RoomResult, RoomState } from '../room/room';
import type { HostSnapshotInput } from './host-store';
import { safeJson } from './storage';
import type { ReconnectClock } from './storage';
/** Saves exactly what the game author permits. Never serialises simulation state/recordings. */
export function savedSelection<State, Settings extends object, View>(
  game: GameModule<State, Settings, View>, state: State, settings: Settings,
): NonNullable<HostSnapshotInput['selection']> {
  const saved = game.save?.(state) ?? null;
  if (!safeJson(settings) || !safeJson(saved)) throw new Error('Invalid game progress');
  return { id: game.meta.id, settings: settings as JsonValue, saved };
}
/** Optional capture guard for current results: declared secrets may only enter via save(). */
export function safeSessionResults<State, Settings extends object, View>(
  game: GameModule<State, Settings, View>, state: State, results: readonly Results[],
): readonly Results[] {
  for (const secret of game.secrets(state))
    if (findSecret(secret, results, 'results') !== null) throw new Error('Unsafe game results');
  return results;
}
export interface ReconnectHostPeer {
  sendHost(message: HostMessage): boolean;
  bindIdentity(deviceId: string): void;
  close(): void;
}
/** Authenticates tokens before binding input; connection ids always come from transport. */
export function createReconnectRoom(o: {
  room: RoomState;
  clock: ReconnectClock;
  mintToken(): string;
  session?: { updateRoom(room: RoomState): void };
  changed?(room: RoomState): void;
  seated?(connectionId: string, seat: number, peer: ReconnectHostPeer): void;
}) {
  let room = o.room;
  let timer: unknown;
  let stopped = false;
  const peers = new Map<string, ReconnectHostPeer>();
  function schedule(): void {
    o.clock.cancel(timer);
    if (stopped) return;
    let due = Infinity;
    for (const p of room.players) {
      if (p.disconnectedAt === null) continue;
      due = Math.min(due, p.disconnectedAt + RECONNECT_WINDOW_MS + 1);
      if (p.seat === room.leader) {
        if (p.awaitingRestore) due = Math.min(due, p.restoreDeadline ?? Infinity);
        else due = Math.min(due, p.disconnectedAt + LEADER_GRACE_MS);
      }
    }
    if (Number.isFinite(due)) timer = o.clock.schedule(() => {
      commit(applyHostEvent(room, { type: 'expire' }, o.clock.now()));
    }, Math.max(0, due - o.clock.now()));
  }
  function commit(result: RoomResult, id?: string): void {
    room = result.state;
    for (const effect of result.effects) {
      if ('t' in effect) {
        if (id) peers.get(id)?.sendHost(effect);
      } else if (effect.type === 'close') {
        const old = peers.get(effect.connectionId);
        // Remove before close: synchronous stale disconnect callbacks cannot affect the winner.
        peers.delete(effect.connectionId);
        old?.sendHost({ v, t: 'close', reason: 'replaced' }); old?.close();
      }
    }
    if (id && !result.result.ok && !result.result.hostInternal) {
      const reason = result.result.reason;
      if (reason === 'seat-expired' || reason === 'room-full' || reason === 'game-running')
        peers.get(id)?.sendHost({ v, t: 'refused', reason });
      else if (reason === 'blank' || reason === 'too-long' || reason === 'bad-characters') {
        peers.get(id)?.sendHost({ v, t: 'name-refused', reason });
      }
    }
    // Immediate update invalidates the runner's output/input caches on a new connection (D-079).
    o.session?.updateRoom(room);
    for (const [connection, peer] of peers) {
      const seat = room.players.find(p => p.connectionId === connection);
      peer.sendHost({ v, t: 'room', phase: room.phase, players: room.players.length,
        leader: seat?.seat === room.leader,
        team: seat?.team ? { id: seat.team === 'red' ? 0 : 1,
          name: seat.team === 'red' ? 'Red' : 'Blue' } : null });
    }
    o.changed?.(room); schedule();
  }
  schedule();
  return {
    get room(): RoomState { return room; },
    attach(id: string, peer: ReconnectHostPeer): void {
      if (stopped || peers.has(id)) return;
      peers.set(id, peer);
    },
    receive(id: string, input: unknown): void {
      if (stopped) return;
      const peer = peers.get(id);
      const checked = validatePhoneMessage(input);
      if (!peer || !checked.ok) return;
      const message = checked.value;
      const seat = room.players.find(p => p.connectionId === id);
      const identity = { connectionId: id, deviceId: seat?.deviceId ?? id,
        ...(seat ? { seat: seat.seat } : {}) };
      let result: RoomResult;
      if (message.t === 'resume') result = applyPhoneEvent(room, identity,
        { type: 'resume', seatToken: message.seatToken }, o.clock.now());
      else if (message.t === 'hello') result = applyPhoneEvent(room, identity,
        { type: 'join', name: message.name, seatToken: o.mintToken() }, o.clock.now());
      else if (message.t === 'leave') result = applyPhoneEvent(room, identity,
        { type: 'leave' }, o.clock.now());
      else if (message.t === 'set-name') result = applyPhoneEvent(room, identity,
        { type: 'rename', name: message.name }, o.clock.now());
      else return;
      if (result.result.ok) {
        const accepted = result.state.players.find(p => p.connectionId === id);
        if (accepted) {
          peer.bindIdentity(accepted.seatToken);
          if (seat?.seatToken !== accepted.seatToken)
            o.seated?.(id, accepted.seat, peer);
        }
      }
      commit(result, id);
    },
    dropped(id: string): void {
      if (stopped || !peers.delete(id)) return;
      const seat = room.players.find(p => p.connectionId === id);
      if (seat) commit(applyHostEvent(room, { type: 'disconnect', seat: seat.seat },
        o.clock.now()));
    },
    host(event: HostEvent): void {
      if (!stopped) commit(applyHostEvent(room, event, o.clock.now()));
    },
    stop(): void {
      stopped = true; o.clock.cancel(timer);
      const old = [...peers.values()]; peers.clear();
      for (const peer of old) peer.close();
    },
  };
}
