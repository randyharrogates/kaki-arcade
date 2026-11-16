// Signalling: what the host page and a phone say to the pairing server, and what it says back.
// The pairing server only introduces devices (NET-002): it creates rooms, forwards WebRTC
// handshakes, hands out ICE servers and enforces limits. No message here carries gameplay.
//
// A room has one host and any number of phones, each known to the server by a peer id. The
// host is a party to every handshake, so phone messages go "to host" and host messages name a
// peer.
//
// Roles. A socket's first message decides what it is: `create` or `reopen` makes it a host
// socket, `join` makes it a phone socket. There is one decoder per role and direction, and
// each accepts only what that role may send, so the server cannot take `to-phone`, `drop` or
// `close-room` from a phone by forgetting a check:
//
//   pairing server reads   first message on a socket      decodeOpeningSignal
//                          later, on a host socket        decodeHostSignal
//                          later, on a phone socket       decodePhoneSignal
//   host page reads        everything it is sent          decodeToHostSignal
//   phone reads            everything it is sent          decodeToPhoneSignal
//
// A socket sends its opening message once. A second `create`, `reopen` or `join` on the same
// socket is refused by the role decoders; a phone that wants another room opens a new socket.
//
// Handshake rules:
//   - The HOST always makes the offer, and creates both data channels (the unreliable one for
//     input and the reliable one for events, see `datachannel.ts`) before it does. It starts
//     when it is told `peer-joined`.
//   - The PHONE only answers. So `to-phone` and `from-host` carry an offer or candidates, and
//     `to-host` and `from-phone` carry an answer or candidates; the other way round is refused.
//   - After `reopen` the pairing server sends the host `peer-joined` again for every phone
//     still waiting, meaning every phone socket the server still holds open for that room.
//
// Ending a room: the host sends `close-room`. The server sends every phone socket `dropped`
// with `room-closed`, forgets the room and closes the sockets.

import { bool, boundedText, int, kinds, list, messageValidator, nullable, oneOf, record, text, textDecoder } from './check';
import type { MessageShapes } from './check';
import { peerId, roomCode, token } from './fields';
import {
  MAX_CANDIDATE_BYTES,
  MAX_ICE_SERVERS,
  MAX_ICE_TEXT_CHARS,
  MAX_ICE_URLS,
  MAX_SDP_BYTES,
  MAX_SIGNAL_BYTES,
  PROTOCOL_VERSION,
} from './limits';
import type { Result } from './result';

// --- Shared parts -----------------------------------------------------------------------

/** An ICE candidate, forwarded by the pairing server without being read. */
export interface CandidateStep {
  readonly kind: 'candidate';
  readonly candidate: string;
  readonly mid: string | null;
  readonly mLineIndex: number | null;
}

/** The sender has no more candidates. */
export interface CandidatesDoneStep {
  readonly kind: 'candidates-done';
}

/** A handshake step the host may send: its offer, or a candidate. */
export type HostHandshakeStep =
  | { readonly kind: 'offer'; readonly sdp: string }
  | CandidateStep
  | CandidatesDoneStep;

/** A handshake step a phone may send: its answer, or a candidate. */
export type PhoneHandshakeStep =
  | { readonly kind: 'answer'; readonly sdp: string }
  | CandidateStep
  | CandidatesDoneStep;

/**
 * One ICE server. `urls` has at least one entry. `username` and `credential` are `null` for a
 * server that needs none (STUN); `RTCPeerConnection` does not accept `null` there, so netcode
 * must leave those two keys out when they are `null`.
 */
export interface IceServer {
  readonly urls: string[];
  readonly username: string | null;
  readonly credential: string | null;
}

/**
 * Whether relay (TURN) servers are in the list.
 *
 * - `available`      they are
 * - `limit-reached`  the monthly relay limit has been passed, so they are not (NET-004). If
 *                    no direct link forms, the phone tells its player to join the same Wi-Fi
 *                    as the big screen.
 * - `off`            this pairing server has no relay (local development)
 */
export const RELAY_STATES = ['available', 'limit-reached', 'off'] as const;
export type RelayState = (typeof RELAY_STATES)[number];

/** The ICE servers to use for a handshake. */
export interface IceGrant {
  readonly servers: IceServer[];
  /** Seconds until relay credentials in `servers` stop working. 0 when there are none. */
  readonly ttlS: number;
  readonly relay: RelayState;
}

/** Why the pairing server refused something. */
export const SIGNAL_ERROR_CODES = [
  'room-not-found',
  'room-expired',
  'room-full',
  'rate-limited',
  'bad-token',
  'bad-message',
  'unsupported-version',
  'not-allowed',
  'host-absent',
  'peer-not-found',
  'server-error',
] as const;
export type SignalErrorCode = (typeof SIGNAL_ERROR_CODES)[number];

/** Why a phone was removed at the signalling level. */
export const DROP_REASONS = ['room-full', 'room-closed'] as const;
export type DropReason = (typeof DROP_REASONS)[number];

type V = typeof PROTOCOL_VERSION;

// --- The first message on a socket -------------------------------------------------------

/** Host: make a new room. Answered with `created`. */
export interface CreateRoom {
  readonly v: V;
  readonly t: 'create';
}

/** Host: take back a room after the host page reloaded (PLAT-009). Answered with `created`. */
export interface ReopenRoom {
  readonly v: V;
  readonly t: 'reopen';
  readonly code: string;
  readonly hostToken: string;
}

/**
 * Phone: enter a room by its code. A returning phone also sends the room token it was given,
 * so the server can tell a return from a new arrival. Answered with `joined`.
 */
export interface JoinRoom {
  readonly v: V;
  readonly t: 'join';
  readonly code: string;
  readonly roomToken: string | null;
}

/** The first message on a socket. It decides whether the socket is a host's or a phone's. */
export type OpeningSignal = CreateRoom | ReopenRoom | JoinRoom;

// --- Later messages, by role -------------------------------------------------------------

/** Phone: forward its answer or a candidate to the host. */
export interface HandshakeToHost {
  readonly v: V;
  readonly t: 'to-host';
  readonly step: PhoneHandshakeStep;
}

/** Host: forward its offer or a candidate to one phone. */
export interface HandshakeToPhone {
  readonly v: V;
  readonly t: 'to-phone';
  readonly peer: string;
  readonly step: HostHandshakeStep;
}

/** Host or phone: ask for fresh ICE servers. Answered with `ice`. */
export interface RelayRequest {
  readonly v: V;
  readonly t: 'relay';
}

/** Host: remove one phone from signalling. The phone is sent `dropped` with the reason. */
export interface DropPeer {
  readonly v: V;
  readonly t: 'drop';
  readonly peer: string;
  readonly reason: DropReason;
}

/** Host: end the room. Every phone is sent `dropped` with `room-closed`. */
export interface CloseRoom {
  readonly v: V;
  readonly t: 'close-room';
}

/** Host or phone: keep-alive. Answered with `pong`. */
export interface SignalPing {
  readonly v: V;
  readonly t: 'ping';
}

/** What a host socket may send after its opening message. */
export type HostSignal = HandshakeToPhone | RelayRequest | DropPeer | CloseRoom | SignalPing;

/** What a phone socket may send after its opening message. */
export type PhoneSignal = HandshakeToHost | RelayRequest | SignalPing;

// --- Pairing server → host or phone ------------------------------------------------------

/** To the host: the room exists. `hostToken` proves ownership in a later `reopen`. */
export interface RoomCreated {
  readonly v: V;
  readonly t: 'created';
  readonly code: string;
  readonly hostToken: string;
  /** True when this answers `reopen`. */
  readonly reopened: boolean;
  readonly ice: IceGrant;
}

/** To a phone: it is in the room. */
export interface RoomJoined {
  readonly v: V;
  readonly t: 'joined';
  /** This phone's peer id for this connection. */
  readonly peer: string;
  /** Sent back in `join` when the phone returns. */
  readonly roomToken: string;
  /** False while the host page is away (PLAT-009). `host` follows when it returns. */
  readonly hostPresent: boolean;
  readonly ice: IceGrant;
}

/**
 * To the host: a phone has entered and is waiting for an offer. Sent again after `reopen` for
 * every phone socket the server still holds.
 */
export interface PeerJoined {
  readonly v: V;
  readonly t: 'peer-joined';
  readonly peer: string;
}

/** To the host: a phone's signalling connection has gone. Its data channel may still be up. */
export interface PeerLeft {
  readonly v: V;
  readonly t: 'peer-left';
  readonly peer: string;
}

/** To a phone: the host page has gone away or come back (PLAT-009). */
export interface HostPresence {
  readonly v: V;
  readonly t: 'host';
  readonly present: boolean;
}

/** To a phone: the host's offer or a candidate. */
export interface HandshakeFromHost {
  readonly v: V;
  readonly t: 'from-host';
  readonly step: HostHandshakeStep;
}

/** To the host: one phone's answer or a candidate. */
export interface HandshakeFromPhone {
  readonly v: V;
  readonly t: 'from-phone';
  readonly peer: string;
  readonly step: PhoneHandshakeStep;
}

/** To whoever sent `relay`: fresh ICE servers. */
export interface IceUpdate {
  readonly v: V;
  readonly t: 'ice';
  readonly ice: IceGrant;
}

/** To a phone: it was removed, by the host or because the room ended. */
export interface Dropped {
  readonly v: V;
  readonly t: 'dropped';
  readonly reason: DropReason;
}

/** To whoever caused it: something was refused. */
export interface SignalError {
  readonly v: V;
  readonly t: 'error';
  readonly code: SignalErrorCode;
  /** For `rate-limited`: seconds to wait before trying again. Otherwise `null`. */
  readonly retryAfterS: number | null;
}

/** Answer to `ping`. */
export interface SignalPong {
  readonly v: V;
  readonly t: 'pong';
}

/** What the pairing server may send to a host socket. */
export type ToHostSignal =
  | RoomCreated
  | PeerJoined
  | PeerLeft
  | HandshakeFromPhone
  | IceUpdate
  | SignalError
  | SignalPong;

/** What the pairing server may send to a phone socket. */
export type ToPhoneSignal =
  | RoomJoined
  | HostPresence
  | HandshakeFromHost
  | IceUpdate
  | Dropped
  | SignalError
  | SignalPong;

/** Any signalling message. */
export type AnySignal = OpeningSignal | HostSignal | PhoneSignal | ToHostSignal | ToPhoneSignal;

// --- Validators -------------------------------------------------------------------------

const sdp = boundedText(1, MAX_SDP_BYTES);

const candidateFields = {
  candidate: boundedText(0, MAX_CANDIDATE_BYTES),
  mid: nullable(text(0, 16, /^[\x21-\x7e]*$/)),
  mLineIndex: nullable(int(0, 255)),
};

const hostStep = kinds<HostHandshakeStep>({
  offer: { sdp },
  candidate: candidateFields,
  'candidates-done': {},
});

const phoneStep = kinds<PhoneHandshakeStep>({
  answer: { sdp },
  candidate: candidateFields,
  'candidates-done': {},
});

// Printable ASCII with no spaces: one byte per character, nothing JSON has to escape at length.
const iceText = text(1, MAX_ICE_TEXT_CHARS, /^[\x21-\x7e]+$/);

const iceGrant = record<IceGrant>({
  servers: list(
    record<IceServer>({
      urls: list(iceText, MAX_ICE_URLS, 1),
      username: nullable(iceText),
      credential: nullable(iceText),
    }),
    MAX_ICE_SERVERS,
  ),
  ttlS: int(0, 86_400),
  relay: oneOf(RELAY_STATES),
});

const dropReason = oneOf(DROP_REASONS);
const errorFields = { code: oneOf(SIGNAL_ERROR_CODES), retryAfterS: nullable(int(0, 86_400)) };

const OPENING_SHAPES: MessageShapes<OpeningSignal> = {
  create: {},
  reopen: { code: roomCode, hostToken: token },
  join: { code: roomCode, roomToken: nullable(token) },
};

const HOST_SHAPES: MessageShapes<HostSignal> = {
  'to-phone': { peer: peerId, step: hostStep },
  relay: {},
  drop: { peer: peerId, reason: dropReason },
  'close-room': {},
  ping: {},
};

const PHONE_SHAPES: MessageShapes<PhoneSignal> = {
  'to-host': { step: phoneStep },
  relay: {},
  ping: {},
};

const TO_HOST_SHAPES: MessageShapes<ToHostSignal> = {
  created: { code: roomCode, hostToken: token, reopened: bool, ice: iceGrant },
  'peer-joined': { peer: peerId },
  'peer-left': { peer: peerId },
  'from-phone': { peer: peerId, step: phoneStep },
  ice: { ice: iceGrant },
  error: errorFields,
  pong: {},
};

const TO_PHONE_SHAPES: MessageShapes<ToPhoneSignal> = {
  joined: { peer: peerId, roomToken: token, hostPresent: bool, ice: iceGrant },
  host: { present: bool },
  'from-host': { step: hostStep },
  ice: { ice: iceGrant },
  dropped: { reason: dropReason },
  error: errorFields,
  pong: {},
};

type Validator<M> = (value: unknown) => Result<M>;
type Decoder<M> = (data: unknown) => Result<M>;

/** Pairing server: checks the first message on a socket. Never throws. */
export const validateOpeningSignal: Validator<OpeningSignal> = messageValidator<OpeningSignal>(OPENING_SHAPES);
/** Pairing server: checks a later message on a host socket. Never throws. */
export const validateHostSignal: Validator<HostSignal> = messageValidator<HostSignal>(HOST_SHAPES);
/** Pairing server: checks a later message on a phone socket. Never throws. */
export const validatePhoneSignal: Validator<PhoneSignal> = messageValidator<PhoneSignal>(PHONE_SHAPES);
/** Host page: checks a message from the pairing server. Never throws. */
export const validateToHostSignal: Validator<ToHostSignal> = messageValidator<ToHostSignal>(TO_HOST_SHAPES);
/** Phone: checks a message from the pairing server. Never throws. */
export const validateToPhoneSignal: Validator<ToPhoneSignal> = messageValidator<ToPhoneSignal>(TO_PHONE_SHAPES);

/** Pairing server: decodes the text of the first message on a socket. Never throws. */
export const decodeOpeningSignal: Decoder<OpeningSignal> = textDecoder(validateOpeningSignal, MAX_SIGNAL_BYTES);
/** Pairing server: decodes the text of a later message on a host socket. Never throws. */
export const decodeHostSignal: Decoder<HostSignal> = textDecoder(validateHostSignal, MAX_SIGNAL_BYTES);
/** Pairing server: decodes the text of a later message on a phone socket. Never throws. */
export const decodePhoneSignal: Decoder<PhoneSignal> = textDecoder(validatePhoneSignal, MAX_SIGNAL_BYTES);
/** Host page: decodes the text of a message from the pairing server. Never throws. */
export const decodeToHostSignal: Decoder<ToHostSignal> = textDecoder(validateToHostSignal, MAX_SIGNAL_BYTES);
/** Phone: decodes the text of a message from the pairing server. Never throws. */
export const decodeToPhoneSignal: Decoder<ToPhoneSignal> = textDecoder(validateToPhoneSignal, MAX_SIGNAL_BYTES);

/**
 * Encodes any signalling message. Encoders do not validate: in development, run the matching
 * validator on what you are about to send.
 */
export function encodeSignal(message: AnySignal): string {
  return JSON.stringify(message);
}

/**
 * The exact text of a keep-alive ping and its pong. They have no variable part, so a server
 * that can answer a fixed string without waking (Durable Object WebSocket hibernation) can use
 * these two constants directly.
 */
export const SIGNAL_PING_TEXT: string = encodeSignal({ v: PROTOCOL_VERSION, t: 'ping' });
export const SIGNAL_PONG_TEXT: string = encodeSignal({ v: PROTOCOL_VERSION, t: 'pong' });
