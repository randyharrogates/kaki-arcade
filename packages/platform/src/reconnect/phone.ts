import { canAskToJoin, PROTOCOL_VERSION as v, ROOM_CODE_PATTERN, validateHostMessage } from '@kaki/protocol';
import type { HostMessage, PhoneMessage, RoomJoined } from '@kaki/protocol';
import { RECONNECT_WINDOW_MS } from '../room/room';
import type { PhoneSeat, PhoneSeatStore } from './phone-store';
import type { ReconnectClock } from './storage';
export type PhoneReconnectState = 'connecting' | 'hold-over' | 'back-in-seat' | 'seat-expired' |
  'room-gone' | 'room-full' | 'host-disconnected' | 'waiting-for-lobby' | 'left' | 'replaced' |
  'out-of-date' | 'cannot-connect' | 'removed';
/** Structural netcode surface: inject createPhoneTransport with browser adapters prebound. */
export interface PhoneReconnectPeer {
  sendPhone(message: PhoneMessage): boolean;
}
export interface PhoneReconnectDial {
  code: string;
  roomToken: string | null;
  onJoined: (message: RoomJoined) => void;
  onControl: (message: unknown) => void;
  onState: (state: string) => void;
  onError: (code: string) => void;
  onHost: (present: boolean) => void;
  onPeer: (peer: PhoneReconnectPeer) => void;
}
export interface PhoneReconnectOptions {
  store: PhoneSeatStore;
  browserId?: string | undefined;
  clock: ReconnectClock;
  /** Required for a fresh join; omitted on page load when the store supplies it. */
  initial?: { code: string; nickname: string | null };
  /** Shell admission gate delay; negotiation timeout starts after that gate. */
  attemptDelayMs?(): number;
  dial(options: PhoneReconnectDial): { stop(): void };
  state(state: PhoneReconnectState): void;
  message?(message: HostMessage): void;
  /** Shell maps pagehide to sleep, pageshow/online to wake; no DOM is used here. */
  lifecycle?: { subscribe(receive: (event: 'sleep' | 'wake') => void): () => void };
}
export const PHONE_RETRY_FIRST_MS = 1000;
export const PHONE_RETRY_MAX_MS = 30000;
export const PHONE_ATTEMPT_MS = 15000;
export function createPhoneReconnect(o: PhoneReconnectOptions) {
  let clockFloor = 0;
  function now(): number { return Math.max(clockFloor, Math.floor(o.clock.now())); }
  let saved: PhoneSeat | null = o.store.read();
  const initialCode = o.initial?.code.replace(/[\s-]/g, '').toUpperCase();
  if (saved && initialCode && ROOM_CODE_PATTERN.test(initialCode) && saved.code !== initialCode) { saved = null; o.store.clear(); }
  const code = (saved?.code ?? o.initial?.code)?.replace(/[\s-]/g, '').toUpperCase();
  let nickname = saved?.nickname ?? o.initial?.nickname ?? null;
  let roomToken = saved?.roomToken ?? null;
  let peer: PhoneReconnectPeer | null = null;
  let link: { stop(): void } | undefined;
  let stopped = false;
  let generation = 0;
  let retry: unknown;
  let deadline: unknown;
  let holdTimer: unknown;
  let failures = 0;
  let droppedAt: number | null = saved?.droppedAt ?? null;
  if (droppedAt !== null && droppedAt > now() + 5000) {
    saved = null; droppedAt = null; o.store.clear();
  }
  if (droppedAt !== null) clockFloor = Math.max(now(), droppedAt);
  let current: PhoneReconnectState = 'connecting';
  let awaiting: 'resume' | 'hello' | null = null;
  let hostPresent: boolean | null = null;
  let inSeat = false;
  let channelOpen = false;
  function state(next: PhoneReconnectState): void { current = next; o.state(next); }
  function cancel(): void { o.clock.cancel(retry); o.clock.cancel(deadline); }
  function disconnect(): void {
    generation++;
    const old = link; link = undefined; peer = null; inSeat = false; channelOpen = false;
    old?.stop();
  }
  function scheduleHold(): void {
    if (holdTimer !== undefined || droppedAt === null || now() - droppedAt > RECONNECT_WINDOW_MS) return;
    holdTimer = o.clock.schedule(() => { holdTimer = undefined; endHold(); },
      RECONNECT_WINDOW_MS - (now() - droppedAt) + 1);
  }
  function rememberDrop(): void {
    droppedAt ??= now();
    scheduleHold();
    if (saved) { saved = { ...saved, droppedAt }; o.store.write(saved); }
  }
  function expire(): void {
    saved = null; o.clock.cancel(holdTimer); holdTimer = undefined;
    o.store.clear(); state('seat-expired');
  }
  function endHold(): void {
    // The host decides expiry. Keep the token while retrying slowly.
    cancel(); retry = undefined; disconnect(); state('hold-over');
    retry = o.clock.schedule(() => { retry = undefined; connect(); }, PHONE_RETRY_MAX_MS);
  }
  function terminal(next: PhoneReconnectState, clear: boolean): void {
    stopped = true; cancel(); o.clock.cancel(holdTimer); holdTimer = undefined; disconnect();
    if (clear) { saved = null; o.store.clear(); }
    state(next);
  }
  function hello(): void {
    awaiting = null;
    if (!peer?.sendPhone({ v, t: 'hello', name: nickname, ...(o.browserId ? { browserId: o.browserId } : {}) })) awaiting = 'hello';
  }
  function request(): void {
    if (!peer) return;
    awaiting = saved ? 'resume' : null;
    if (saved && peer.sendPhone({ v, t: 'resume', seatToken: saved.seatToken, ...(o.browserId ? { browserId: o.browserId } : {}) }) && awaiting === 'resume')
      awaiting = null;
    if (!saved) hello();
  }
  function retryLater(): void {
    if (stopped || retry !== undefined) return;
    const heldSeat = inSeat;
    rememberDrop(); disconnect(); o.clock.cancel(deadline);
    state(heldSeat ? 'host-disconnected' : 'connecting');
    const remaining = RECONNECT_WINDOW_MS - (now() - (droppedAt ?? now()));
    if (remaining < 0) { endHold(); return; }
    const delay = Math.min(PHONE_RETRY_MAX_MS, PHONE_RETRY_FIRST_MS * 2 ** failures++,
      remaining + 1);
    retry = o.clock.schedule(() => {
      retry = undefined;
      connect();
    }, delay);
  }
  function receive(input: unknown): void {
    const checked = validateHostMessage(input);
    if (!checked.ok) return;
    const message = checked.value;
    if (message.t === 'seat' && code) {
      nickname = message.name; droppedAt = null; failures = 0; awaiting = null; inSeat = true;
      saved = { code, seatToken: message.seatToken, nickname, roomToken, droppedAt: null };
      o.store.write(saved); cancel(); o.clock.cancel(holdTimer); holdTimer = undefined;
      retry = undefined; state('back-in-seat');
    } else if (message.t === 'refused') {
      if (message.reason === 'removed') terminal('removed', false);
      else if (message.reason === 'seat-expired') { expire(); hello(); }
      else if (message.reason === 'room-full') terminal('room-full', false);
      else { awaiting = 'hello'; cancel(); state('waiting-for-lobby'); }
    } else if (message.t === 'room' && awaiting === 'resume') request();
    else if (message.t === 'room' && awaiting === 'hello' && canAskToJoin(message.phase)) hello();
    else if (message.t === 'close') {
      if (message.reason === 'unsupported-version') terminal('out-of-date', false);
      else if (message.reason === 'bad-message') terminal('cannot-connect', false);
      else terminal(message.reason === 'replaced' ? 'replaced' : 'room-gone', true);
    }
    o.message?.(message);
  }
  function connect(): void {
    if (stopped || !code) return;
    cancel(); retry = undefined; disconnect(); state(droppedAt !== null && now() - droppedAt > RECONNECT_WINDOW_MS ? 'hold-over' : 'connecting');
    scheduleHold();
    const gen = generation;
    deadline = o.clock.schedule(retryLater, PHONE_ATTEMPT_MS + Math.max(0, o.attemptDelayMs?.() ?? 0));
    try {
      const created = o.dial({ code, roomToken,
        onJoined(message) {
          if (generation !== gen || stopped) return;
          roomToken = message.roomToken;
          if (saved) { saved = { ...saved, roomToken }; o.store.write(saved); }
          hostPresent = message.hostPresent;
          if (!hostPresent) {
            rememberDrop(); o.clock.cancel(deadline); state('host-disconnected');
          }
        },
        onControl(message) { if (generation === gen && !stopped) receive(message); },
        onState(next) {
          if (generation !== gen || stopped) return;
          if (next === 'control-open') { channelOpen = true; request(); }
          else if (['closed', 'failed', 'disconnected'].includes(next)) {
            channelOpen = false;
            retryLater();
          }
        },
        onPeer(next) { if (generation === gen && !stopped) peer = next; },
        onError(reason) {
          if (generation !== gen || stopped) return;
          if (channelOpen && ['room-not-found', 'room-expired', 'not-allowed'].includes(reason)) return;
          if (['room-not-found', 'room-expired', 'room-closed'].includes(reason))
            terminal('room-gone', true);
          else if (reason === 'room-full') terminal('room-full', false);
          else if (reason === 'not-allowed') terminal('replaced', true);
          else if (reason === 'unsupported-version' || reason === 'bad-version')
            terminal('out-of-date', false);
          else if (['bad-token', 'bad-message', 'opening-timeout'].includes(reason))
            terminal('cannot-connect', false);
          else retryLater();
        },
        onHost(present) {
          if (generation !== gen || stopped) return;
          const wasAbsent = hostPresent === false;
          hostPresent = present;
          // Signalling presence is advisory while the data channel still owns the seat.
          if (inSeat) return;
          if (!present) {
            rememberDrop(); o.clock.cancel(deadline); state('host-disconnected');
          } else if (wasAbsent) {
            // Retain the original drop time while netcode supplies a replacement offer.
            droppedAt ??= now();
            if (saved) { saved = { ...saved, droppedAt }; o.store.write(saved); }
            o.clock.cancel(deadline);
            deadline = o.clock.schedule(retryLater, PHONE_ATTEMPT_MS);
            state('connecting');
          }
        },
      });
      if (generation === gen) link = created;
      else created.stop();
    } catch { retryLater(); }
  }
  const unsubscribe = o.lifecycle?.subscribe(event => {
    if (event === 'sleep') { rememberDrop(); cancel(); o.clock.cancel(holdTimer); holdTimer = undefined; retry = undefined; disconnect(); }
    else if (!stopped) connect();
  });
  if (code && ROOM_CODE_PATTERN.test(code)) connect();
  else if (code) terminal('room-gone', true);
  return {
    get state(): PhoneReconnectState { return current; },
    rejoin(): void { if (!stopped) { expire(); droppedAt = null; connect(); } },
    wake(): void { if (!stopped) connect(); },
    leave(): void {
      peer?.sendPhone({ v, t: 'leave' }); terminal('left', true); unsubscribe?.();
    },
    stop(): void { stopped = true; cancel(); o.clock.cancel(holdTimer); disconnect(); unsubscribe?.(); },
  };
}
