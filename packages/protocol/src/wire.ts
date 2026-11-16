// Binary frames for the unreliable, unordered data channel: input and ping from the phone,
// pong from the host. These are sent many times a second, so they are a few bytes each.
//
//   byte 0        header: protocol version in the high 4 bits, frame kind in the low 4
//   input         header · seq u16 · stick x i8 · stick y i8 · runs            7 to 23 bytes
//   input + tilt  header · seq u16 · stick x, y i8 · tilt x, y i8 · runs       9 to 25 bytes
//   ping          header · id u16 · last round trip in ms u16 (0xFFFF = unknown)     5 bytes
//   pong          header · id u16                                                    3 bytes
//
// Multi-byte numbers are big-endian.
//
// `runs` is the button masks of this tick and the `INPUT_HISTORY` ticks before it, newest
// first, with repeats folded together. Each run is a u16: the low 12 bits are a button mask,
// the high 4 bits are how many ticks in a row had that mask, less one. The runs of a frame
// always add up to `INPUT_HISTORY + 1` ticks, and two runs side by side never have the same
// mask. So a frame is 7 bytes while nothing changes (one run), 11 bytes while a tap is passing
// through the history (three runs), and 23 at the very most (nine runs: a button changing on
// every tick).
//
// A data channel must have `binaryType` set to `'arraybuffer'` (see `datachannel.ts`). The
// decoders take an `ArrayBuffer`, a `Uint8Array` or a `DataView`.

import { AXIS_MAX, BUTTON_MASK, INPUT_HISTORY } from './input';
import type { Tilt, WireInput } from './input';
import { PROTOCOL_VERSION } from './limits';
import { fail, ok } from './result';
import type { Result } from './result';

/** The ticks in one input frame: its own and its history. */
const FRAME_TICKS = INPUT_HISTORY + 1;

/** An input frame while nothing is changing, and at its largest. Tilt adds 2 to each. */
export const INPUT_FRAME_MIN_BYTES = 7;
export const INPUT_FRAME_MAX_BYTES = 5 + 2 * FRAME_TICKS;
export const INPUT_TILT_EXTRA_BYTES = 2;
export const PING_FRAME_BYTES = 5;
export const PONG_FRAME_BYTES = 3;

/** No frame is longer than this. */
export const MAX_FRAME_BYTES = INPUT_FRAME_MAX_BYTES + INPUT_TILT_EXTRA_BYTES;

/** The longest round trip a ping can report, in ms. Longer ones are reported as this. */
export const MAX_PING_RTT_MS = 0xfffe;

const KIND_INPUT = 0;
const KIND_INPUT_TILT = 1;
const KIND_PING = 2;
const KIND_PONG = 3;

const RTT_UNKNOWN = 0xffff;

/**
 * A phone's measurement request. The host answers with a pong carrying the same id. A phone
 * sends 12 in quick succession when the channel opens, then one a second. What round trip or
 * loss counts as a weak link is netcode's business, not the protocol's.
 */
export interface Ping {
  /** 0 to 65535, chosen by the phone. */
  readonly id: number;
  /** The round trip the phone last measured, in ms, or `null` before the first answer. */
  readonly rttMs: number | null;
}

export interface Pong {
  readonly id: number;
}

/** What a phone may send on the unreliable channel. */
export type PhoneFrame =
  | { readonly kind: 'input'; readonly input: WireInput }
  | { readonly kind: 'ping'; readonly ping: Ping };

/** What the host may send on the unreliable channel. */
export interface PongFrame {
  readonly kind: 'pong';
  readonly pong: Pong;
}
export type HostFrame = PongFrame;

function header(kind: number): number {
  return ((PROTOCOL_VERSION & 0x0f) << 4) | kind;
}

function u16(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) & 0xffff : 0;
}

function axisByte(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.round(Math.min(AXIS_MAX, Math.max(-AXIS_MAX, value))) & 0xff;
}

function writeU16(out: Uint8Array, at: number, value: number): void {
  out[at] = value >> 8;
  out[at + 1] = value & 0xff;
}

/**
 * Encoders do not validate. A number out of range is brought into range: sequence numbers and
 * ids wrap at 16 bits, undefined button bits are cleared, axes are clamped to ±127, and a
 * history that is too short or too long is padded with 0 or cut.
 */
export function encodeInput(frame: WireInput): Uint8Array {
  // Fold the masks, newest first, into runs.
  const runs: number[] = [];
  let mask = u16(frame.buttons) & BUTTON_MASK;
  let length = 1;
  for (let i = 0; i < INPUT_HISTORY; i += 1) {
    const older = u16(frame.history[i] ?? 0) & BUTTON_MASK;
    if (older === mask) {
      length += 1;
    } else {
      runs.push(((length - 1) << 12) | mask);
      mask = older;
      length = 1;
    }
  }
  runs.push(((length - 1) << 12) | mask);

  const tilt = frame.tilt;
  const fixed = tilt === null ? 5 : 5 + INPUT_TILT_EXTRA_BYTES;
  const out = new Uint8Array(fixed + 2 * runs.length);
  out[0] = header(tilt === null ? KIND_INPUT : KIND_INPUT_TILT);
  writeU16(out, 1, u16(frame.seq));
  out[3] = axisByte(frame.stickX);
  out[4] = axisByte(frame.stickY);
  if (tilt !== null) {
    out[5] = axisByte(tilt.x);
    out[6] = axisByte(tilt.y);
  }
  runs.forEach((run, i) => {
    writeU16(out, fixed + 2 * i, run);
  });
  return out;
}

export function encodePing(ping: Ping): Uint8Array {
  const out = new Uint8Array(PING_FRAME_BYTES);
  out[0] = header(KIND_PING);
  writeU16(out, 1, u16(ping.id));
  const rtt = ping.rttMs;
  writeU16(
    out,
    3,
    rtt === null || Number.isNaN(rtt)
      ? RTT_UNKNOWN
      : Math.round(Math.min(MAX_PING_RTT_MS, Math.max(0, rtt))),
  );
  return out;
}

export function encodePong(pong: Pong): Uint8Array {
  const out = new Uint8Array(PONG_FRAME_BYTES);
  out[0] = header(KIND_PONG);
  writeU16(out, 1, u16(pong.id));
  return out;
}

function toBytes(data: unknown): Uint8Array | null {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data instanceof DataView) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return null;
}

function byteAt(bytes: Uint8Array, at: number): number {
  return bytes[at] ?? 0;
}

function readU16(bytes: Uint8Array, at: number): number {
  return (byteAt(bytes, at) << 8) | byteAt(bytes, at + 1);
}

/** A signed byte as an axis, or `null` for -128, which no encoder writes. */
function readAxis(bytes: Uint8Array, at: number): number | null {
  const value = (byteAt(bytes, at) << 24) >> 24;
  return value < -AXIS_MAX ? null : value;
}

/** Checks the size, version and kind of a frame. Returns its bytes and kind. */
function open(data: unknown): Result<{ bytes: Uint8Array; kind: number }> {
  const bytes = toBytes(data);
  if (bytes === null || bytes.length === 0) return fail('bad-frame');
  if (bytes.length > MAX_FRAME_BYTES) return fail('too-large');
  const first = byteAt(bytes, 0);
  if (first >> 4 !== PROTOCOL_VERSION) return fail('bad-version');
  return ok({ bytes, kind: first & 0x0f });
}

function decodeInputFrame(bytes: Uint8Array, withTilt: boolean): Result<PhoneFrame> {
  const fixed = withTilt ? 5 + INPUT_TILT_EXTRA_BYTES : 5;
  const runBytes = bytes.length - fixed;
  if (runBytes < 2 || runBytes > 2 * FRAME_TICKS || runBytes % 2 !== 0) return fail('bad-frame');
  const stickX = readAxis(bytes, 3);
  const stickY = readAxis(bytes, 4);
  if (stickX === null) return fail('bad-field', 'stickX');
  if (stickY === null) return fail('bad-field', 'stickY');
  let tilt: Tilt | null = null;
  if (withTilt) {
    const x = readAxis(bytes, 5);
    const y = readAxis(bytes, 6);
    if (x === null || y === null) return fail('bad-field', 'tilt');
    tilt = { x, y };
  }
  // Unfold the runs: they must add up to exactly the ticks a frame carries, and two runs side
  // by side must differ, so every set of masks has one encoding only.
  const masks: number[] = [];
  let previous = -1;
  for (let at = fixed; at < bytes.length; at += 2) {
    const run = readU16(bytes, at);
    const mask = run & BUTTON_MASK;
    const length = (run >> 12) + 1;
    if (mask === previous || masks.length + length > FRAME_TICKS) return fail('bad-field', 'buttons');
    for (let i = 0; i < length; i += 1) masks.push(mask);
    previous = mask;
  }
  if (masks.length !== FRAME_TICKS) return fail('bad-field', 'buttons');
  return ok({
    kind: 'input',
    input: {
      seq: readU16(bytes, 1),
      buttons: masks[0] ?? 0,
      history: masks.slice(1),
      stickX,
      stickY,
      tilt,
    },
  });
}

function readPhoneFrame(data: unknown): Result<PhoneFrame> {
  const opened = open(data);
  if (!opened.ok) return opened;
  const { bytes, kind } = opened.value;
  switch (kind) {
    case KIND_INPUT:
      return decodeInputFrame(bytes, false);
    case KIND_INPUT_TILT:
      return decodeInputFrame(bytes, true);
    case KIND_PING: {
      if (bytes.length !== PING_FRAME_BYTES) return fail('bad-frame');
      const rtt = readU16(bytes, 3);
      return ok({
        kind: 'ping',
        ping: { id: readU16(bytes, 1), rttMs: rtt === RTT_UNKNOWN ? null : rtt },
      });
    }
    default:
      return fail('unknown-type');
  }
}

function readHostFrame(data: unknown): Result<HostFrame> {
  const opened = open(data);
  if (!opened.ok) return opened;
  const { bytes, kind } = opened.value;
  if (kind !== KIND_PONG) return fail('unknown-type');
  if (bytes.length !== PONG_FRAME_BYTES) return fail('bad-frame');
  return ok({ kind: 'pong', pong: { id: readU16(bytes, 1) } });
}

/** Host side: decodes a frame from a phone. Accepts any value and never throws. */
export function decodePhoneFrame(data: unknown): Result<PhoneFrame> {
  try {
    return readPhoneFrame(data);
  } catch {
    // A detached buffer or an exotic object (a proxy) can throw when looked at.
    return fail('bad-frame');
  }
}

/** Phone side: decodes a frame from the host. Accepts any value and never throws. */
export function decodeHostFrame(data: unknown): Result<HostFrame> {
  try {
    return readHostFrame(data);
  } catch {
    return fail('bad-frame');
  }
}
