import type { HostSignal, IceGrant, ToHostSignal, ToPhoneSignal } from '@kaki/protocol';
import { PROTOCOL_VERSION as v } from '@kaki/protocol';
import { createHostPairing, createPhonePairing } from './pairing';
import type { PairingOptions, FetchRoom, RoomCredentials, Pairing } from './pairing';
import { createPeer } from './peer';
import type { Peer, PeerOptions } from './peer';

export type TransportPeerOptions = Omit<PeerOptions, 'role' | 'connectionId' | 'ice' | 'signal'>;
export interface HostTransportOptions extends PairingOptions, TransportPeerOptions {
  fetch: FetchRoom;
  credentials?: RoomCredentials;
  onRoom(message: Extract<ToHostSignal, { t: 'created' }>): void;
  onPeer(connectionId: string, peer: Peer): void;
  onSignal?(message: ToHostSignal): void;
}
export async function createHostTransport(options: HostTransportOptions) {
  const peers = new Map<string, Peer>();
  let ice: IceGrant = { servers: [], ttlS: 0, relay: 'off' };
  let pairing: Pairing | null = null;
  let stopped = false;
  let iceExpiresAt = 0;
  const pending: ToHostSignal[] = [];
  const waitingPeers = new Set<string>();
  let refreshing = false;
  let refreshTimer: unknown;
  function finishRefresh(): void {
    options.clock.cancel(refreshTimer); refreshing = false;
    if (stopped) return;
    const ready = [...waitingPeers]; waitingPeers.clear();
    for (const peer of ready) messagePeer(peer, true);
  }
  function message(message: ToHostSignal): void {
    if (stopped) return;
    if (!pairing) { pending.push(message); return; }
    options.onSignal?.(message);
    if (message.t === 'created') { ice = message.ice; iceExpiresAt = (ice.ttlS === 0 ? Infinity : options.clock.now() + ice.ttlS * 1000); options.onRoom(message); }
    if (message.t === 'ice') {
      ice = message.ice; iceExpiresAt = (ice.ttlS === 0 ? Infinity : options.clock.now() + ice.ttlS * 1000); finishRefresh();
    }
    if (message.t === 'error' && refreshing) finishRefresh();
    if (message.t === 'peer-joined') messagePeer(message.peer);
    if (message.t === 'from-phone') peers.get(message.peer)?.signal(message.step);
    if (message.t === 'peer-left') {
      waitingPeers.delete(message.peer); pairing.discardPeer(message.peer);
      if (!peers.get(message.peer)?.connected) peers.get(message.peer)?.close();
    }
  }
  function messagePeer(peerId: string, useExisting = false): void {
    if (!useExisting && options.clock.now() >= iceExpiresAt) {
      waitingPeers.add(peerId);
      if (!refreshing) { refreshing = true; refreshTimer = options.clock.schedule(finishRefresh, 3000); pairing?.send({ v, t: 'relay' }); }
      return;
    }
    const previous = peers.get(peerId);
    if (previous?.connected) return;
    previous?.close();
    const peer = createPeer({ ...options, role: 'host', connectionId: peerId, ice,
      onState(state, connectionId) {
        if (state === 'closed') { peers.delete(connectionId); pairing?.discardPeer(connectionId); }
        options.onState(state, connectionId);
      },
      signal(step) {
        if (step.kind !== 'answer') pairing?.send({ v, t: 'to-phone', peer: peerId, step });
      } });
    peers.set(peerId, peer);
    options.onPeer(peerId, peer);
  }
  const result = await createHostPairing({ ...options, onMessage: message,
    onError(code) {
      if (code === 'socket-unavailable') { options.onError(code); return; }
      stopped = true;
      for (const peer of peers.values()) peer.close();
      peers.clear(); options.onError(code);
    } });
  pairing = result;
  for (const item of pending) message(item);
  return {
    credentials: result.credentials,
    send(message: HostSignal): boolean { return result.send(message); },
    get iceExpiresAt(): number { return iceExpiresAt; },
    refreshIceIfExpired(): boolean { return options.clock.now() >= iceExpiresAt && result.send({ v, t: 'relay' }); },
    refreshIce(): boolean { return result.send({ v, t: 'relay' }); },
    peers: peers as ReadonlyMap<string, Peer>,
    stop(): void {
      stopped = true; options.clock.cancel(refreshTimer); pairing.stop();
      for (const peer of peers.values()) peer.close();
      peers.clear();
    },
  };
}
export interface PhoneTransportOptions extends PairingOptions, TransportPeerOptions {
  code: string;
  roomToken?: string | null;
  onSignallingError?(code: string): void;
  onJoined(message: Extract<ToPhoneSignal, { t: 'joined' }>): void;
  onPeer(peer: Peer): void;
  onSignal?(message: ToPhoneSignal): void;
}
export function createPhoneTransport(options: PhoneTransportOptions) {
  let peer: Peer | null = null;
  let stopped = false;
  let pairing: Pairing | null = null;
  const pending: ToPhoneSignal[] = [];
  let iceExpiresAt = Infinity;
  let refreshing = false;
  let refreshTimer: unknown;
  const awaitingIce: Extract<ToPhoneSignal, { t: 'from-host' }>[] = [];
  let joined: Extract<ToPhoneSignal, { t: 'joined' }> | null = null;
  function makePeer(info: Extract<ToPhoneSignal, { t: 'joined' }>): void {
    peer?.close(); pairing?.discardPeer('');
    peer = createPeer({ ...options, role: 'phone', connectionId: info.peer, ice: info.ice,
      onState(state, connectionId) {
        if (state === 'closed') pairing?.discardPeer('');
        options.onState(state, connectionId);
      },
      signal(step) { if (step.kind !== 'offer') pairing?.send({ v, t: 'to-host', step }); } });
    options.onPeer(peer);
  }
  function finishRefresh(): void {
    options.clock.cancel(refreshTimer); refreshing = false;
    if (stopped) return;
    if (awaitingIce.length && joined) makePeer(joined);
    for (const item of awaitingIce.splice(0)) receivePhone(item, true);
  }
  function receivePhone(message: ToPhoneSignal, useExisting = false): void {
    if (stopped) return;
    if (!pairing) { pending.push(message); return; }
    options.onSignal?.(message);
    if (message.t === 'joined') {
      joined = message;
      iceExpiresAt = message.ice.ttlS === 0 ? Infinity : options.clock.now() + message.ice.ttlS * 1000;
      makePeer(message); options.onJoined(message);
    }
    if (message.t === 'ice' && joined) {
      joined = { ...joined, ice: message.ice };
      iceExpiresAt = message.ice.ttlS === 0 ? Infinity : options.clock.now() + message.ice.ttlS * 1000;
      finishRefresh();
    }
    if (message.t === 'error' && refreshing) finishRefresh();
    if (message.t === 'from-host') {
      if (refreshing || (!useExisting && message.step.kind === 'offer' && options.clock.now() >= iceExpiresAt)) {
        awaitingIce.push(message);
        if (!refreshing) { refreshing = true; refreshTimer = options.clock.schedule(finishRefresh, 3000); pairing.send({ v, t: 'relay' }); }
        return;
      }
      if (message.step.kind === 'offer' && (!peer || peer.closed || peer.hasSeenOffer) && joined) makePeer(joined);
      peer?.signal(message.step);
    }
  }
  pairing = createPhonePairing({ ...options, onMessage: receivePhone,
    onError(code) { options.onSignallingError?.(code); if (code === 'socket-closed' && peer?.connected) return; stopped = true; peer?.close(); options.onError(code); } });
  for (const item of pending) receivePhone(item);
  return {
    get peer(): Peer | null { return peer; },
    stop(): void { stopped = true; options.clock.cancel(refreshTimer); pairing.stop(); peer?.close(); },
  };
}
