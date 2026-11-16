// The reliable, ordered data channel between one phone and the host: JSON messages for things
// that happen once and must arrive. Input state does not travel here (see `wire.ts`).
//
// A phone can ask for a seat, name itself, send an action and ask to pause or leave. The host
// can send that phone its own seat, its controller layout, its private view and the little
// room state a controller shows. Nothing here can carry simulation state or another player's
// private view (NET-001).
//
// Versions: every message carries the protocol version, and a message with another version
// cannot be read at all, so the other side's `close` with `unsupported-version` will itself
// fail to decode. A page that gets `bad-version` from any decoder, on any channel, must
// therefore treat that result as the explanation: "this page is out of date; reload".
//
// Joining while a game runs: the host answers `hello` with `refused` and `game-running`, and
// keeps the channel open. It sends that phone `room` on every phase change, as it does to
// seated phones. The phone waits, and sends `hello` again when `canAskToJoin` says the phase
// allows it. The host may still refuse.

import { bool, int, json, messageValidator, nullable, oneOf, record, textDecoder } from './check';
import type { Json, MessageShapes } from './check';
import { acceptedName, colourIndex, counter, requestedName, seatNumber, token } from './fields';
import {
  MAX_ACTION_BYTES,
  MAX_CHANNEL_BYTES,
  MAX_LAYOUT_BYTES,
  MAX_PLAYERS,
  MAX_VIEW_BYTES,
} from './limits';
import type { PROTOCOL_VERSION } from './limits';
import { NAME_PROBLEMS } from './names';
import type { NameProblem } from './names';
import type { Result } from './result';

type V = typeof PROTOCOL_VERSION;

// --- Phone → host -----------------------------------------------------------------------

/**
 * First message from a new player: ask for a seat. `name` is the nickname the player chose, or
 * `null` to be given a neutral default. Answered with `seat`, `refused` or `name-refused`.
 *
 * `name` is checked only for size on the way in: the host runs `checkNickname` on it, so that
 * it can say why a name will not do. The join form should run `checkNickname` first.
 */
export interface Hello {
  readonly v: V;
  readonly t: 'hello';
  readonly name: string | null;
}

/**
 * First message from a returning phone (after sleep, reload or a dropped link): ask for the
 * same seat back (PLAT-007). Answered with `seat`, or with `refused` if the seat is gone, in
 * which case the phone may send `hello` on the same channel.
 */
export interface Resume {
  readonly v: V;
  readonly t: 'resume';
  readonly seatToken: string;
}

/** Change nickname. The host answers with a new `seat`, or with `name-refused`. */
export interface SetName {
  readonly v: V;
  readonly t: 'set-name';
  readonly name: string;
}

/**
 * Something the player did that is an event, not a held state: a choice on the private panel,
 * a lock-in, a swipe, a team switch. `data` belongs to whatever sent the current layout (the
 * game or the lobby) and is opaque here.
 */
export interface Action {
  readonly v: V;
  readonly t: 'action';
  /** The revision of the layout the player was looking at, so the host can ignore a late one. */
  readonly rev: number;
  /**
   * The revision of the private view the player was looking at, or `null` if none has been
   * sent. A choice made on view 4 that arrives after view 5 was sent can then be ignored.
   */
  readonly viewRev: number | null;
  readonly data: Json;
}

/** What a phone may ask of a running game (PLAT-023). The host decides whether it is allowed. */
export const CONTROL_REQUESTS = ['pause', 'resume', 'quit'] as const;
export type ControlRequest = (typeof CONTROL_REQUESTS)[number];

export interface Control {
  readonly v: V;
  readonly t: 'control';
  readonly request: ControlRequest;
}

/** The player is leaving for good: free the seat now instead of holding it. */
export interface Leave {
  readonly v: V;
  readonly t: 'leave';
}

export type PhoneMessage = Hello | Resume | SetName | Action | Control | Leave;

// --- Host → phone -----------------------------------------------------------------------

/** This phone's place in the room (PLAT-004). Sent on joining, on returning and on a rename. */
export interface Seat {
  readonly v: V;
  readonly t: 'seat';
  /** 1 to 8. */
  readonly seat: number;
  /** Index into the eight player colours in `packages/ui`, 0 to 7. */
  readonly colour: number;
  readonly name: string;
  /** True when the chosen nickname was blocked and replaced; the player is told (PLAT-005). */
  readonly nameReplaced: boolean;
  /**
   * Kept by the phone and sent in `resume` to get this seat back. A seat's token does not
   * change for as long as the room lasts: every `seat` message for the same seat carries the
   * same one.
   */
  readonly seatToken: string;
  /** True when this answers `resume`. */
  readonly resumed: boolean;
}

/**
 * The name in `hello` or `set-name` failed `checkNickname`. After `hello` the phone has no
 * seat yet and sends `hello` again with another name; after `set-name` it keeps the name it
 * had. (A name that passes the check but is on the blocked-words list is not refused: it is
 * replaced, and `seat` says so. PLAT-005.)
 */
export interface NameRefused {
  readonly v: V;
  readonly t: 'name-refused';
  readonly reason: NameProblem;
}

/**
 * Why the host would not seat a phone.
 *
 * - `room-full`     eight players are seated (PLAT-003)
 * - `seat-expired`  the seat asked for in `resume` is gone; the phone may send `hello`
 * - `game-running`  this game does not take new players mid-round (PLAT-008); the channel
 *                   stays open and the phone asks again when the phase changes
 */
export const REFUSAL_REASONS = ['room-full', 'seat-expired', 'game-running'] as const;
export type RefusalReason = (typeof REFUSAL_REASONS)[number];

export interface Refused {
  readonly v: V;
  readonly t: 'refused';
  readonly reason: RefusalReason;
}

/** What the room is doing, as far as a controller needs to know. */
export const ROOM_PHASES = ['lobby', 'playing', 'paused', 'results'] as const;
export type RoomPhase = (typeof ROOM_PHASES)[number];

/**
 * After `refused` with `game-running`: true when a `room` message shows a phase in which the
 * phone should send `hello` again (no round is in progress).
 */
export function canAskToJoin(phase: RoomPhase): boolean {
  return phase === 'lobby' || phase === 'results';
}

/** This phone's team in a team game (PLAT-025). */
export interface TeamInfo {
  /** 0 or 1. The team's colour theme is looked up from this in `packages/ui`. */
  readonly id: number;
  readonly name: string;
}

/**
 * The room as this phone needs to see it. Sent after `seat` and whenever any field changes. A
 * phone that was refused with `game-running` is sent it too, with `leader` false and `team`
 * `null`, so that it sees the phase change.
 */
export interface RoomState {
  readonly v: V;
  readonly t: 'room';
  readonly phase: RoomPhase;
  /** Players seated, 0 to 8. */
  readonly players: number;
  /** True when this phone is the room leader (PLAT-006). */
  readonly leader: boolean;
  readonly team: TeamInfo | null;
}

/**
 * The controller layout for this phone, sent only when it changes. The payload's shape is the
 * controller layout schema of the game interface; here it is opaque JSON with a size cap.
 */
export interface Layout {
  readonly v: V;
  readonly t: 'layout';
  /** Goes up by one with each new layout for this phone. */
  readonly rev: number;
  readonly layout: Json;
}

/**
 * This phone's private view, sent only when it changes; `null` clears it. The payload's shape
 * is the private view schema of the game interface; here it is opaque JSON with a size cap.
 */
export interface PrivateView {
  readonly v: V;
  readonly t: 'view';
  /** Goes up by one with each new view for this phone. */
  readonly rev: number;
  readonly view: Json;
}

/** How good this phone's link is, as the big screen shows it (PLAT-010, CTRL-008). */
export const LINK_QUALITIES = ['good', 'weak', 'relayed'] as const;
export type LinkQuality = (typeof LINK_QUALITIES)[number];

export interface Link {
  readonly v: V;
  readonly t: 'link';
  readonly quality: LinkQuality;
  /** The round trip the host is working from, in ms, or `null` if not yet measured. */
  readonly rttMs: number | null;
}

/**
 * Why the host is ending this phone's connection.
 *
 * - `room-closed`          the room has ended
 * - `replaced`             the same seat was resumed from another tab or device
 * - `unsupported-version`  the phone's page is older or newer than the host's; reload
 * - `bad-message`          the phone sent something the host could not accept
 */
export const CLOSE_REASONS = [
  'room-closed',
  'replaced',
  'unsupported-version',
  'bad-message',
] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];

/** Last message before the host closes the channel. The phone must not reconnect by itself. */
export interface Close {
  readonly v: V;
  readonly t: 'close';
  readonly reason: CloseReason;
}

export type HostMessage =
  | Seat
  | Refused
  | NameRefused
  | RoomState
  | Layout
  | PrivateView
  | Link
  | Close;

// --- Validators -------------------------------------------------------------------------

const PHONE_SHAPES: MessageShapes<PhoneMessage> = {
  hello: { name: nullable(requestedName) },
  resume: { seatToken: token },
  'set-name': { name: requestedName },
  action: { rev: counter, viewRev: nullable(counter), data: json(MAX_ACTION_BYTES) },
  control: { request: oneOf(CONTROL_REQUESTS) },
  leave: {},
};

const HOST_SHAPES: MessageShapes<HostMessage> = {
  seat: {
    seat: seatNumber,
    colour: colourIndex,
    name: acceptedName,
    nameReplaced: bool,
    seatToken: token,
    resumed: bool,
  },
  refused: { reason: oneOf(REFUSAL_REASONS) },
  'name-refused': { reason: oneOf(NAME_PROBLEMS) },
  room: {
    phase: oneOf(ROOM_PHASES),
    players: int(0, MAX_PLAYERS),
    leader: bool,
    team: nullable(record<TeamInfo>({ id: int(0, 1), name: acceptedName })),
  },
  layout: { rev: counter, layout: json(MAX_LAYOUT_BYTES) },
  view: { rev: counter, view: json(MAX_VIEW_BYTES) },
  link: { quality: oneOf(LINK_QUALITIES), rttMs: nullable(int(0, 60_000)) },
  close: { reason: oneOf(CLOSE_REASONS) },
};

/** Host side: checks a value already parsed from JSON. Never throws. */
export const validatePhoneMessage: (value: unknown) => Result<PhoneMessage> =
  messageValidator<PhoneMessage>(PHONE_SHAPES);

/** Phone side: checks a value already parsed from JSON. Never throws. */
export const validateHostMessage: (value: unknown) => Result<HostMessage> =
  messageValidator<HostMessage>(HOST_SHAPES);

/** Host side: decodes the text of a message from a phone. Never throws. */
export const decodePhoneMessage: (data: unknown) => Result<PhoneMessage> = textDecoder(
  validatePhoneMessage,
  MAX_CHANNEL_BYTES,
);

/** Phone side: decodes the text of a message from the host. Never throws. */
export const decodeHostMessage: (data: unknown) => Result<HostMessage> = textDecoder(
  validateHostMessage,
  MAX_CHANNEL_BYTES,
);

export function encodePhoneMessage(message: PhoneMessage): string {
  return JSON.stringify(message);
}

export function encodeHostMessage(message: HostMessage): string {
  return JSON.stringify(message);
}
