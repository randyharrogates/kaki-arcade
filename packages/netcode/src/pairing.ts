import { buildHostSubprotocols, decodeToHostSignal, decodeToPhoneSignal, encodeSignal,
  SIGNAL_PING_TEXT, SIGNAL_PONG_TEXT, PROTOCOL_VERSION as v, ROOM_CODE_PATTERN, SIGNAL_SUBPROTOCOL, TOKEN_PATTERN, validateHostSignal, validatePhoneSignal } from '@kaki/protocol';
import type { AnySignal, HostSignal, OpeningSignal, PhoneSignal, ToHostSignal, ToPhoneSignal } from '@kaki/protocol';
import type { Scheduler, Socket, SocketFactory } from './interfaces';

export interface RoomCredentials { code: string; hostToken: string }
export type FetchRoom = (url: string, init: { method: 'POST' }) => Promise<{
  ok: boolean; json(): Promise<unknown>;
}>;
export interface PairingOptions {
  baseUrl: string;
  socket: SocketFactory;
  clock: Scheduler;
  onError(code: string): void;
  random?: () => number;
  /** The shell retries failures before the room acknowledgement. */
  externalRetry?: boolean;
  /** Zero-based consecutive failure count; reset after a successful socket open. */
  retryDelay?(failure: number): number;
  online?: { subscribe(callback: () => void): () => void };
  onPairingState?(state: 'connecting' | 'connected' | 'reconnecting' | 'gone'): void;
  /** Browser WebSocket hides upgrade status; adapters may probe the room on failure. */
  /** gone must be true only for X-Kaki-Room: gone from the pairing server. */
  upgradeStatus?(url: string): Promise<number | { status: number; gone?: boolean; retryAfterMs?: number }>;
}
function socketUrl(base: string, code: string, role: string): string {
  return `${base.replace(/^http/, 'ws').replace(/\/$/, '')}/rooms/${encodeURIComponent(code)}/${role}`;
}
function openPairing(
  options: PairingOptions, role: 'host' | 'phone', code: string, protocols: string[],
  onMessage: (message: ToHostSignal | ToPhoneSignal) => void, opening?: OpeningSignal,
) {
  let socket: Socket | null = null;
  let stopped = false;
  let retry: unknown;
  let pending = false;
  let failures = 0;
  let heartbeat: unknown;
  let waiting = false;
  let everOpened = false;
  let roomOpened = false;
  let retryNotBefore = 0;
  let serverRetryUntil = 0;
  const gone = (value: number | { status: number; gone?: boolean } | undefined): boolean =>
    typeof value === 'object' && value.gone === true && (value.status === 404 || value.status === 410);
  const unsubscribeOnline = options.online?.subscribe(() => {
    if (pending && roomOpened) { options.clock.cancel(retry); retry = options.clock.schedule(connect, Math.max(0, serverRetryUntil - options.clock.now())); }
  });
  let tokens = 40; let updated = options.clock.now();
  const queue: { data: string; peer: string | undefined; priority: boolean }[] = [];
  const rotation: (string | undefined)[] = [];
  function discardPeer(peer: string): void {
    for (let i = queue.length - 1; i >= 0; i--) if (queue[i]?.peer === peer) queue.splice(i, 1);
    const index = rotation.indexOf(peer);
    if (index >= 0) rotation.splice(index, 1);
  }
  function take(): string | undefined {
    // Only a peer's head is eligible: SDP priority never reorders its own stream.
    const seen = new Set<string | undefined>();
    const heads = queue.map((entry, index) => ({ ...entry, index })).filter((entry) => {
      if (seen.has(entry.peer)) return false;
      seen.add(entry.peer); return true;
    });
    const priority = heads.filter((entry) => entry.priority);
    const eligible = priority.length ? priority : heads;
    for (const entry of eligible) if (!rotation.includes(entry.peer)) rotation.push(entry.peer);
    const next = rotation.map((peer) => eligible.find((entry) => entry.peer === peer)).find((entry) => entry !== undefined);
    if (!next) return;
    rotation.splice(rotation.indexOf(next.peer), 1); rotation.push(next.peer); return queue.splice(next.index, 1)[0]?.data;
  }
  let drainTimer: unknown;
  function drain(): void {
    options.clock.cancel(drainTimer);
    const now = options.clock.now(); tokens = Math.min(40, tokens + (now - updated) * 0.025); updated = now;
    while (queue.length && tokens >= 1 && socket?.readyState === 1) { tokens--; const data = take(); if (data !== undefined) socket.send(data); }
    if (queue.length && socket?.readyState === 1) drainTimer = options.clock.schedule(drain, Math.max(1, (1 - tokens) * 40));
  }
  function keepAlive(): void {
    if (waiting) { failed(); return; }
    waiting = true; queue.push({ data: SIGNAL_PING_TEXT, peer: undefined, priority: true }); drain();
    heartbeat = options.clock.schedule(keepAlive, 10000);
  }
  function disconnect(): void {
    options.clock.cancel(heartbeat); options.clock.cancel(drainTimer); waiting = false;
    if (socket) {
      socket.onopen = null; socket.onmessage = null; socket.onclose = null; socket.onerror = null;
      socket.close(); socket = null;
    }
  }
  function stop(): void {
    stopped = true;
    unsubscribeOnline?.();
    if (pending) options.clock.cancel(retry);
    pending = false;
    disconnect(); queue.length = 0; rotation.length = 0;
  }
  function failed(): void {
    disconnect(); queue.length = 0; rotation.length = 0;
    if (stopped) return;
    if (options.externalRetry && !roomOpened) {
      pending = true;
      options.onPairingState?.('reconnecting');
      const probe = options.upgradeStatus?.(socketUrl(options.baseUrl, code, role));
      void Promise.resolve(probe).catch(() => undefined).then(status => {
        if (stopped) return;
        stop();
        if (gone(status)) {
          options.onPairingState?.('gone');
          options.onError('room-not-found');
        } else options.onError('socket-unavailable');
      });
      return;
    }
    if (!pending && (role === 'host' || (!everOpened && failures < 4))) {
      pending = true;
      options.onPairingState?.('reconnecting');
      const delay = options.retryDelay ? options.retryDelay(failures++) :
        Math.min(10000, 250 * 2 ** Math.min(failures++, 6)) * (0.75 + (options.random ?? Math.random)() * 0.5);
      retryNotBefore = options.clock.now() + delay;
      retry = options.clock.schedule(connect, delay);
      if (role === 'host' && failures === 4 && !everOpened) options.onError('socket-unavailable');
      if (options.upgradeStatus) void options.upgradeStatus(socketUrl(options.baseUrl, code, role)).then((status) => {
        if (!stopped && gone(status)) { stop(); options.onPairingState?.('gone'); options.onError('room-not-found'); }
        else if (!stopped && pending && typeof status === 'object' && status.retryAfterMs) {
          serverRetryUntil = options.clock.now() + status.retryAfterMs;
          options.clock.cancel(retry);
          retry = options.clock.schedule(connect, Math.max(retryNotBefore - options.clock.now(), status.retryAfterMs));
        }
      }).catch(() => { /* Retry handles an unavailable probe. */ });
    } else if (role === 'phone') options.onError('socket-closed');
  }
  function connect(): void {
    pending = false;
    if (stopped) return;
    options.onPairingState?.(failures ? 'reconnecting' : 'connecting');
    try { socket = options.socket(socketUrl(options.baseUrl, code, role), protocols); }
    catch { failed(); return; }
    const current = socket;
    let opened = false;
    current.onopen = () => {
      if (opened || stopped || socket !== current) return;
      opened = true; everOpened = true; failures = 0; serverRetryUntil = 0;
      options.onPairingState?.('connected');
      heartbeat = options.clock.schedule(keepAlive, 10000);
      drain();
      if (opening) current.send(encodeSignal(opening));
    };
    const onFailure = (): void => { if (socket === current) failed(); };
    current.onclose = onFailure;
    current.onerror = onFailure;
    current.onmessage = (event) => {
      if (stopped || socket !== current) return;
      if (event.data === SIGNAL_PONG_TEXT) { waiting = false; return; }
      const decoded = role === 'host' ? decodeToHostSignal(event.data) : decodeToPhoneSignal(event.data);
      if (!decoded.ok) { stop(); options.onError(decoded.error.code); return; }
      const message = decoded.value;
      if (message.t === 'created') { failures = 0; roomOpened = true; }
      if (message.t === 'error' && !['host-absent', 'peer-not-found', 'rate-limited', 'server-error'].includes(message.code)) {
        // These errors are final even when the edge never completes a close handshake.
        stop(); if (message.code === 'room-not-found' || message.code === 'room-expired') options.onPairingState?.('gone');
        options.onError(message.code); return;
      }
      if (message.t === 'dropped') { stop(); options.onError(message.reason); return; }
      onMessage(message);
    };
    if (current.readyState === 1) current.onopen();
  }
  connect();
  return {
    send(message: HostSignal | PhoneSignal): boolean {
      if (stopped) return false;
      const checked = role === 'host' ? validateHostSignal(message) : validatePhoneSignal(message);
      if (!checked.ok) return false;
      const value = checked.value;
      const peer = value.t === 'to-phone' ? value.peer : value.t === 'to-host' ? '' : undefined;
      const priority = !('step' in value) || value.step.kind === 'offer' || value.step.kind === 'answer';
      queue.push({ data: encodeSignal(value), peer, priority }); drain(); return true;
    },
    discardPeer,
    stop,
  };
}
export async function createHostPairing(options: PairingOptions & {
  fetch: FetchRoom; credentials?: RoomCredentials; onMessage(message: ToHostSignal): void;
}) {
  let credentials = options.credentials;
  if (!credentials) {
    const response = await options.fetch(`${options.baseUrl.replace(/\/$/, '')}/rooms`, { method: 'POST' });
    if (!response.ok) throw new Error('Room creation failed');
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object' || !('code' in value) || !('hostToken' in value) ||
        typeof value.code !== 'string' || !ROOM_CODE_PATTERN.test(value.code) ||
        typeof value.hostToken !== 'string' || !TOKEN_PATTERN.test(value.hostToken)) throw new Error('Invalid room credentials');
    credentials = { code: value.code, hostToken: value.hostToken };
  }
  const credentialsResult = credentials;
  const pairing = openPairing(options, 'host', credentials.code, buildHostSubprotocols(credentials.hostToken),
    (message) => { options.onMessage(message as ToHostSignal); });
  return { ...pairing, credentials: credentialsResult };
}
export function createPhonePairing(options: PairingOptions & {
  code: string; roomToken?: string | null; onMessage(message: ToPhoneSignal): void;
}) {
  const code = options.code.replace(/[\s-]/g, '').toUpperCase();
  return openPairing(options, 'phone', code, [SIGNAL_SUBPROTOCOL],
    (message) => { options.onMessage(message as ToPhoneSignal); },
    { v, t: 'join', code, roomToken: options.roomToken ?? null });
}
export interface Pairing { discardPeer(peer: string): void; send(message: HostSignal | PhoneSignal): boolean; stop(): void }
// Keep the signalling surface deliberately narrower than gameplay channels.
export type PairingMessage = AnySignal;
