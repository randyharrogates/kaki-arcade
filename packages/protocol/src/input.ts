// The controller's input as it travels, the SEND rule that keeps it correct over a channel
// that loses packets (NET-005), and the function the host uses to unpack a frame.
//
// The idea: the phone works in ticks. Each tick has one button mask and one sequence number.
// Every frame carries the mask of its own tick and the masks of the `INPUT_HISTORY` ticks
// before it, so each tick travels in `INPUT_HISTORY + 1` frames. Losing a frame loses nothing
// as long as one of the next `INPUT_HISTORY` frames arrives. There is no clock, no timed
// repeat and no queue: a press is on the wire in the first tick after the thumb lands.
//
// The host's input buffer is `@kaki/sim-core`, not this package. The host passes each frame
// through `expandInput` and gives the buffer every tick it returns, oldest first. The buffer
// already ignores sequence numbers it has seen, so most of what it is given is skipped; the
// ticks it had missed are applied in order. Its own host rules (when to reset a slot, what to
// do on resume from pause) are in sim-core. What it needs from here: `seqModulus: SEQ_MODULO`,
// `staleAfterSteps: INPUT_STALE_STEPS`, one slot per data channel, `buttons` passed as the
// bitmask it is, and each axis passed through `axisToUnit`.

/**
 * One bit per kit button (CTRL-001), plus shake (CTRL-003). A set bit means held.
 * A button mask is 12 bits.
 */
export const BUTTON = {
  up: 1 << 0,
  down: 1 << 1,
  left: 1 << 2,
  right: 1 << 3,
  faceBottom: 1 << 4,
  faceRight: 1 << 5,
  faceLeft: 1 << 6,
  faceTop: 1 << 7,
  l: 1 << 8,
  r: 1 << 9,
  start: 1 << 10,
  shake: 1 << 11,
} as const;

export type ButtonName = keyof typeof BUTTON;

/** How many buttons there are, and every defined button bit. */
export const BUTTON_COUNT = 12;
export const BUTTON_MASK = 0x0fff;

/** An axis on the wire is a whole number from -127 to 127. -128 is never sent. */
export const AXIS_MAX = 127;

/** Tilt on the wire. */
export interface Tilt {
  /** -127 (tilted fully left) to 127 (fully right). */
  readonly x: number;
  /** -127 (tilted fully away) to 127 (fully towards the player). */
  readonly y: number;
}

/** One tick of one phone: what the host's input buffer is given. */
export interface InputState {
  /** Held buttons, a mask of `BUTTON` bits. */
  readonly buttons: number;
  /** Stick, -127 (full left) to 127 (full right). 0 is centred. */
  readonly stickX: number;
  /** Stick, -127 (full up) to 127 (full down), as on a screen. 0 is centred. */
  readonly stickY: number;
  /** Tilt, or `null` when the current layout has no tilt part or motion is not allowed. */
  readonly tilt: Tilt | null;
}

/** What an input frame carries: one tick, and the button masks of the ticks before it. */
export interface WireInput extends InputState {
  /** This tick's number: 0 to 65535, one more than the tick before, wrapping to 0. */
  readonly seq: number;
  /**
   * The button masks of the previous `INPUT_HISTORY` ticks, newest first: `history[0]` is
   * tick `seq - 1`. Ticks from before the channel opened are 0.
   */
  readonly history: readonly number[];
}

/** One tick as the host's input buffer takes it. */
export interface InputTick extends InputState {
  readonly seq: number;
}

/** Nothing held. */
export const RELEASED: InputState = Object.freeze({ buttons: 0, stickX: 0, stickY: 0, tilt: null });

export function isReleased(state: InputState): boolean {
  return state.buttons === 0 && state.stickX === 0 && state.stickY === 0 && state.tilt === null;
}

/**
 * A stick or tilt reading from -1 to 1, as an axis value. Out-of-range readings are clamped
 * and a reading that is not a number is 0.
 */
export function unitToAxis(unit: number): number {
  if (Number.isNaN(unit)) return 0;
  // Rounded away from zero on both sides, so left and right behave alike.
  const size = Math.round(Math.min(1, Math.abs(unit)) * AXIS_MAX);
  return size === 0 ? 0 : unit < 0 ? -size : size;
}

/** An axis value as a number from -1 to 1. */
export function axisToUnit(axis: number): number {
  return axis / AXIS_MAX;
}

/**
 * A phone ticks at most this many times a second. Keeping to it is the caller's job: a tick
 * that would come sooner than `1000 / INPUT_MAX_HZ` ms after the last one is put off until
 * then, never dropped.
 */
export const INPUT_MAX_HZ = 120;

/** The longest break in the link that must not lose a press or a release, in ms. */
export const INPUT_BURST_MS = 50;

/**
 * How many earlier ticks each frame carries. Each tick therefore travels in
 * `INPUT_HISTORY + 1` frames, and any `INPUT_HISTORY` frames in a row can be lost.
 *
 * Eight, so that even at `INPUT_MAX_HZ` the frames carrying one tick span 67 ms, more than
 * `INPUT_BURST_MS` (six would span exactly 50 ms, with nothing to spare). At 60 ticks a second
 * they span 133 ms.
 */
export const INPUT_HISTORY = 8;

/**
 * While anything is held, the phone ticks at least this often (every two simulation steps),
 * so the host can tell a steady hold from a dead link. Ticking every 1/60 s is better still.
 */
export const INPUT_KEEPALIVE_MS = 33;

/**
 * A phone that is holding something and has not been heard for this many simulation steps is
 * released by the host (250 ms at 60 steps a second). The host's input buffer applies it.
 */
export const INPUT_STALE_STEPS = 15;

/** Sequence numbers are 16 bits. */
export const SEQ_MODULO = 0x1_0000;

export function nextSeq(seq: number): number {
  return (seq + 1) % SEQ_MODULO;
}

/**
 * True when `seq` was sent after `last`, allowing for wrap-around: a number up to half the
 * range ahead is newer; the same number, or one behind, is not.
 */
export function isNewerSeq(seq: number, last: number): boolean {
  const ahead = (seq - last) & 0xffff;
  return ahead !== 0 && ahead < 0x8000;
}

// --- The send rule ----------------------------------------------------------------------
//
//   - `pressButtons` and `releaseButtons` are called from touch events. They only record.
//   - `nextInputSend` is one tick. The caller runs it on its own timer (60 a second), and may
//     run it straight away on a touch event as well. Every call that returns a frame uses one
//     sequence number.
//
// A button's bit can change once per tick. If the button changed since the last tick, the bit
// changes in this one, so a tap that starts and ends between two ticks is one tick set and the
// next tick clear, and a gap that short is one tick clear and the next set. If a button
// changed three times between two ticks, two of the changes cancel (two taps closer together
// than two ticks become one).

/** The stick and tilt as the kit reads them: each number from -1 to 1. */
export interface AnalogInput {
  readonly stickX: number;
  readonly stickY: number;
  readonly tilt: { readonly x: number; readonly y: number } | null;
}

/** What the phone remembers between ticks. Starts fresh with each new data channel. */
export interface InputSender {
  /** The sequence number the next tick will carry. */
  readonly seq: number;
  /** The buttons the thumbs are on right now. */
  readonly down: number;
  /** Buttons that changed and changed back since the last tick. */
  readonly blip: number;
  /** The button masks of the last `INPUT_HISTORY` ticks, newest first. */
  readonly history: readonly number[];
  /** Fully released ticks still to send before going quiet. */
  readonly quietIn: number;
}

const NO_HISTORY: readonly number[] = Object.freeze(new Array<number>(INPUT_HISTORY).fill(0));

export function createInputSender(): InputSender {
  return { seq: 0, down: 0, blip: 0, history: NO_HISTORY, quietIn: 0 };
}

/** The buttons the thumbs are on right now, as recorded. */
export function heldButtons(sender: InputSender): number {
  return sender.down;
}

function record(sender: InputSender, changing: number): InputSender {
  if (changing === 0) return sender;
  const sent = sender.history[0] ?? 0;
  const down = sender.down ^ changing;
  // Of the buttons changing now: one already marked as "changed and changed back" has now
  // changed a third time, and two of the three cancel. One that is now back where the last
  // tick left it is marked. The rest simply differ from the last tick.
  const cancelled = sender.blip & changing;
  const back = changing & ~cancelled & ~(down ^ sent);
  return { ...sender, down, blip: (sender.blip & ~cancelled) | back };
}

/** Call when buttons go down (a mask of `BUTTON` bits). Buttons already down are ignored. */
export function pressButtons(sender: InputSender, mask: number): InputSender {
  return record(sender, mask & ~sender.down & BUTTON_MASK);
}

/** Call when buttons come up (a mask of `BUTTON` bits). Buttons already up are ignored. */
export function releaseButtons(sender: InputSender, mask: number): InputSender {
  return record(sender, mask & sender.down & BUTTON_MASK);
}

/** Call with the full set of buttons now down, when that is easier than separate events. */
export function setButtons(sender: InputSender, mask: number): InputSender {
  return record(sender, (mask ^ sender.down) & BUTTON_MASK);
}

export interface InputSend {
  readonly sender: InputSender;
  /** The frame to send now, or `null` when there is nothing to say. */
  readonly frame: WireInput | null;
  /**
   * Keep ticking: true while anything is held, or the release is still being repeated. When
   * it is false the caller can stop its timer until the next touch event.
   */
  readonly more: boolean;
}

/**
 * One tick. `analog` is the stick and tilt right now, each from -1 to 1; readings are rounded
 * to the wire's steps here, so a stick resting a hair off centre, or a reading that is not a
 * number, counts as centred.
 *
 * Returns a frame while anything is held, and after everything is released until the released
 * state has been sent `INPUT_HISTORY + 1` times, so the release is as well protected as the
 * press. After that it returns `null` and uses no sequence number.
 */
export function nextInputSend(sender: InputSender, analog: AnalogInput): InputSend {
  const sent = sender.history[0] ?? 0;
  const buttons = sent ^ ((sender.down ^ sent) | sender.blip);
  // A button marked "changed and changed back" still has its second change to send.
  const pending = buttons !== sender.down;
  const state: InputState = {
    buttons,
    stickX: unitToAxis(analog.stickX),
    stickY: unitToAxis(analog.stickY),
    tilt: analog.tilt === null ? null : { x: unitToAxis(analog.tilt.x), y: unitToAxis(analog.tilt.y) },
  };
  const released = isReleased(state);
  if (released && !pending && sender.quietIn === 0) return { sender, frame: null, more: false };
  const quietIn = released ? Math.max(0, sender.quietIn - 1) : INPUT_HISTORY + 1;
  return {
    sender: {
      seq: nextSeq(sender.seq),
      down: sender.down,
      blip: 0,
      history: [buttons, ...sender.history.slice(0, INPUT_HISTORY - 1)],
      quietIn,
    },
    frame: { ...state, seq: sender.seq, history: sender.history },
    more: !released || pending || quietIn > 0,
  };
}

// --- The host side: unpacking a frame ---------------------------------------------------

/**
 * The ticks a frame carries, oldest first: its `INPUT_HISTORY` earlier ticks, each with its
 * own sequence number (`seq - k`, wrapped), then the frame's own tick. Give every one of them
 * to the host's input buffer, in this order. The stick and tilt are only known for the newest
 * tick, so the earlier ticks are given the same ones.
 *
 * Pure: it keeps nothing between calls.
 */
export function expandInput(frame: WireInput): InputTick[] {
  const ticks: InputTick[] = [];
  for (let back = INPUT_HISTORY; back >= 1; back -= 1) {
    ticks.push({
      seq: (frame.seq - back + SEQ_MODULO) % SEQ_MODULO,
      buttons: frame.history[back - 1] ?? 0,
      stickX: frame.stickX,
      stickY: frame.stickY,
      tilt: frame.tilt,
    });
  }
  ticks.push({
    seq: frame.seq,
    buttons: frame.buttons,
    stickX: frame.stickX,
    stickY: frame.stickY,
    tilt: frame.tilt,
  });
  return ticks;
}
