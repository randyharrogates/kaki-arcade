import { describe, expect, it } from 'vitest';

import {
  AXIS_MAX,
  axisToUnit,
  BUTTON,
  BUTTON_COUNT,
  BUTTON_MASK,
  createInputSender,
  expandInput,
  heldButtons,
  INPUT_BURST_MS,
  INPUT_HISTORY,
  INPUT_KEEPALIVE_MS,
  INPUT_MAX_HZ,
  INPUT_STALE_STEPS,
  isNewerSeq,
  isReleased,
  nextInputSend,
  nextSeq,
  pressButtons,
  releaseButtons,
  RELEASED,
  SEQ_MODULO,
  setButtons,
  unitToAxis,
} from './input';
import type { AnalogInput, InputSender, InputTick, WireInput } from './input';
import { decodePhoneFrame, encodeInput } from './wire';

/** BOTTOM small seeded generator (mulberry32), so a failure can be repeated. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CENTRED: AnalogInput = { stickX: 0, stickY: 0, tilt: null };
const BOTTOM = BUTTON.faceBottom;
const RIGHT = BUTTON.faceRight;
const STEP_MS = 1000 / 60;
const MIN_TICK_MS = 1000 / INPUT_MAX_HZ;

/** Runs the sender for `count` ticks with nothing changing, returning what it sent. */
function run(
  sender: InputSender,
  count: number,
  analog: AnalogInput = CENTRED,
): { sender: InputSender; frames: (WireInput | null)[]; more: boolean[] } {
  const frames: (WireInput | null)[] = [];
  const more: boolean[] = [];
  let current = sender;
  for (let i = 0; i < count; i += 1) {
    const send = nextInputSend(current, analog);
    current = send.sender;
    frames.push(send.frame);
    more.push(send.more);
  }
  return { sender: current, frames, more };
}

/** One button's bit in each frame, as a string: `1` set, `0` clear, `.` nothing sent. */
function trace(frames: (WireInput | null)[], bit: number = BOTTOM): string {
  return frames
    .map((frame) => (frame === null ? '.' : (frame.buttons & bit) !== 0 ? '1' : '0'))
    .join('');
}

describe('buttons and axes', () => {
  it('every button has its own bit and the mask covers them all', () => {
    const bits = Object.values(BUTTON);
    let all = 0;
    for (const bit of bits) {
      expect(all & bit).toBe(0);
      all |= bit;
    }
    expect(bits.length).toBe(BUTTON_COUNT);
    expect(all).toBe(BUTTON_MASK);
  });

  it('axes convert both ways and clamp', () => {
    expect(unitToAxis(0)).toBe(0);
    expect(unitToAxis(1)).toBe(AXIS_MAX);
    expect(unitToAxis(-1)).toBe(-AXIS_MAX);
    expect(unitToAxis(7)).toBe(AXIS_MAX);
    expect(unitToAxis(-7)).toBe(-AXIS_MAX);
    expect(unitToAxis(NaN)).toBe(0);
    expect(Object.is(unitToAxis(-0.001), 0)).toBe(true);
    expect(axisToUnit(AXIS_MAX)).toBe(1);
    expect(axisToUnit(-AXIS_MAX)).toBe(-1);
    for (let axis = -AXIS_MAX; axis <= AXIS_MAX; axis += 1) {
      expect(unitToAxis(axisToUnit(axis))).toBe(axis);
    }
  });

  it('released means nothing at all is held', () => {
    expect(isReleased(RELEASED)).toBe(true);
    expect(isReleased({ ...RELEASED, buttons: BOTTOM })).toBe(false);
    expect(isReleased({ ...RELEASED, stickX: 1 })).toBe(false);
    expect(isReleased({ ...RELEASED, stickY: -1 })).toBe(false);
    expect(isReleased({ ...RELEASED, tilt: { x: 0, y: 0 } })).toBe(false);
  });

  it('the published constants, and the history covers a 50 ms break at the fastest tick', () => {
    expect(INPUT_HISTORY).toBe(8);
    expect(INPUT_MAX_HZ).toBe(120);
    expect(INPUT_BURST_MS).toBe(50);
    // The frames that carry one tick span this long at the fastest allowed rate.
    expect(INPUT_HISTORY * MIN_TICK_MS).toBeGreaterThan(INPUT_BURST_MS);
    expect(INPUT_STALE_STEPS).toBe(15);
    expect(INPUT_KEEPALIVE_MS).toBe(33);
    expect(SEQ_MODULO).toBe(65536);
  });
});

describe('sequence numbers', () => {
  it('count up and wrap at 16 bits', () => {
    expect(nextSeq(0)).toBe(1);
    expect(nextSeq(65534)).toBe(65535);
    expect(nextSeq(65535)).toBe(0);
  });

  it('newer is decided across the wrap', () => {
    expect(isNewerSeq(1, 0)).toBe(true);
    expect(isNewerSeq(0, 1)).toBe(false);
    expect(isNewerSeq(5, 5)).toBe(false);
    expect(isNewerSeq(0, 65535)).toBe(true);
    expect(isNewerSeq(65535, 0)).toBe(false);
    expect(isNewerSeq(3, 65530)).toBe(true);
    expect(isNewerSeq(32767, 0)).toBe(true);
    expect(isNewerSeq(32768, 0)).toBe(false);
  });
});

describe('the send rule', () => {
  it('stays quiet, and uses no sequence number, while nothing has been held', () => {
    const sender = createInputSender();
    const send = nextInputSend(sender, CENTRED);
    expect(send.frame).toBeNull();
    expect(send.more).toBe(false);
    expect(send.sender).toBe(sender);
  });

  it('a press is in the very next tick, and every tick after while held', () => {
    const sender = pressButtons(createInputSender(), BOTTOM);
    const held = run(sender, 5);
    expect(trace(held.frames)).toBe('11111');
    expect(held.frames.map((frame) => frame?.seq)).toEqual([0, 1, 2, 3, 4]);
    expect(held.more).toEqual([true, true, true, true, true]);
  });

  it('a release is in the very next tick, then repeated until it has gone out nine times', () => {
    let sender = run(pressButtons(createInputSender(), BOTTOM), 3).sender;
    sender = releaseButtons(sender, BOTTOM);
    const after = run(sender, INPUT_HISTORY + 3);
    expect(trace(after.frames)).toBe('0'.repeat(INPUT_HISTORY + 1) + '..');
    // Keep ticking until the last of them has gone.
    expect(after.more).toEqual([...Array.from({ length: INPUT_HISTORY }, () => true), false, false, false]);
    // Quiet ticks use no sequence numbers: the next press follows on.
    const again = nextInputSend(pressButtons(after.sender, BOTTOM), CENTRED);
    expect(again.frame?.seq).toBe(3 + INPUT_HISTORY + 1);
  });

  it('every frame carries the eight ticks before it, newest first', () => {
    let sender = createInputSender();
    const sent: WireInput[] = [];
    const script = [BOTTOM, BOTTOM | RIGHT, RIGHT, 0, 0, BOTTOM, BOTTOM, BOTTOM, 0, RIGHT, RIGHT];
    for (const mask of script) {
      sender = setButtons(sender, mask);
      const send = nextInputSend(sender, CENTRED);
      sender = send.sender;
      if (send.frame !== null) sent.push(send.frame);
    }
    expect(sent.length).toBe(script.length);
    sent.forEach((frame, i) => {
      expect(frame.buttons).toBe(script[i]);
      expect(frame.history.length).toBe(INPUT_HISTORY);
      frame.history.forEach((mask, back) => {
        expect(mask, `frame ${String(i)}, ${String(back + 1)} back`).toBe(script[i - back - 1] ?? 0);
      });
    });
  });

  it('a tap shorter than a tick is one tick set, then clear', () => {
    let sender = createInputSender();
    sender = pressButtons(sender, BOTTOM);
    sender = releaseButtons(sender, BOTTOM);
    expect(heldButtons(sender)).toBe(0);
    expect(trace(run(sender, 12).frames)).toBe('1' + '0'.repeat(INPUT_HISTORY + 1) + '..');
  });

  it('a gap shorter than a tick is one tick clear, then set', () => {
    let sender = run(pressButtons(createInputSender(), BOTTOM), 2).sender;
    sender = releaseButtons(sender, BOTTOM);
    sender = pressButtons(sender, BOTTOM);
    expect(heldButtons(sender)).toBe(BOTTOM);
    expect(trace(run(sender, 4).frames)).toBe('0111');
  });

  it('a double tap one tick apart is two presses', () => {
    let sender = createInputSender();
    const bits: string[] = [];
    // down, up, down, up: one change per tick.
    for (const down of [true, false, true, false]) {
      sender = down ? pressButtons(sender, BOTTOM) : releaseButtons(sender, BOTTOM);
      const send = nextInputSend(sender, CENTRED);
      sender = send.sender;
      bits.push(trace([send.frame]));
    }
    expect(bits.join('')).toBe('1010');
  });

  it('three changes between two ticks: two cancel, and the button ends where the thumb is', () => {
    // down, up, down inside one tick: one press, still held.
    let sender = createInputSender();
    sender = pressButtons(releaseButtons(pressButtons(sender, BOTTOM), BOTTOM), BOTTOM);
    expect(heldButtons(sender)).toBe(BOTTOM);
    expect(trace(run(sender, 3).frames)).toBe('111');
    // Two whole taps inside one tick: one tap.
    sender = createInputSender();
    sender = releaseButtons(pressButtons(releaseButtons(pressButtons(sender, BOTTOM), BOTTOM), BOTTOM), BOTTOM);
    expect(heldButtons(sender)).toBe(0);
    expect(trace(run(sender, 3).frames)).toBe('100');
    // Fifty taps inside one tick: still one tap, and nothing left over.
    sender = createInputSender();
    for (let i = 0; i < 50; i += 1) sender = releaseButtons(pressButtons(sender, BOTTOM), BOTTOM);
    expect(trace(run(sender, 12).frames)).toBe('1' + '0'.repeat(INPUT_HISTORY + 1) + '..');
  });

  it('each button is handled by itself', () => {
    let sender = createInputSender();
    sender = pressButtons(sender, BOTTOM | RIGHT);
    sender = releaseButtons(sender, RIGHT);
    const frames = run(sender, 3).frames;
    expect(trace(frames, BOTTOM)).toBe('111');
    expect(trace(frames, RIGHT)).toBe('100');
  });

  it('pressing what is down, releasing what is up and undefined bits change nothing', () => {
    const sender = pressButtons(createInputSender(), BOTTOM);
    expect(pressButtons(sender, BOTTOM)).toBe(sender);
    expect(releaseButtons(sender, RIGHT)).toBe(sender);
    expect(pressButtons(sender, 0xf000)).toBe(sender);
    expect(pressButtons(sender, 0)).toBe(sender);
    expect(heldButtons(sender)).toBe(BOTTOM);
  });

  it('setButtons presses and releases whatever differs', () => {
    let sender = setButtons(createInputSender(), BOTTOM | RIGHT);
    expect(heldButtons(sender)).toBe(BOTTOM | RIGHT);
    sender = setButtons(sender, RIGHT | BUTTON.up);
    expect(heldButtons(sender)).toBe(RIGHT | BUTTON.up);
    expect(setButtons(sender, RIGHT | BUTTON.up)).toBe(sender);
  });

  it('the stick is sent as it is at each tick, rounded to the wire', () => {
    const moved = nextInputSend(createInputSender(), { stickX: 1, stickY: -0.5, tilt: null });
    expect(moved.frame).toMatchObject({ buttons: 0, stickX: 127, stickY: -64, tilt: null, seq: 0 });
    expect(unitToAxis(0.5)).toBe(-unitToAxis(-0.5));
    expect(moved.more).toBe(true);
    // Back to centre: the released state goes out nine times, then quiet.
    expect(trace(run(moved.sender, INPUT_HISTORY + 3).frames)).toBe('0'.repeat(INPUT_HISTORY + 1) + '..');
  });

  it('a stick a hair off centre, or one that is not a number, does not keep the stream alive', () => {
    for (const analog of [
      { stickX: 0.003, stickY: -0.0039, tilt: null },
      { stickX: NaN, stickY: NaN, tilt: null },
      { stickX: -0, stickY: 1e-9, tilt: null },
    ]) {
      const send = nextInputSend(createInputSender(), analog);
      expect(send.frame).toBeNull();
      expect(send.more).toBe(false);
    }
    // Out-of-range and infinite readings are clamped, not passed on.
    const wild = nextInputSend(createInputSender(), { stickX: 40, stickY: -Infinity, tilt: { x: NaN, y: 2 } });
    expect(wild.frame).toMatchObject({ stickX: 127, stickY: -127, tilt: { x: 0, y: 127 } });
  });

  it('tilt counts as held, so a tilting phone never goes quiet', () => {
    const tilting: AnalogInput = { stickX: 0, stickY: 0, tilt: { x: 0, y: 0 } };
    const out = run(createInputSender(), 30, tilting);
    expect(out.frames.includes(null)).toBe(false);
    expect(out.more.includes(false)).toBe(false);
    expect(out.frames[0]?.tilt).toEqual({ x: 0, y: 0 });
  });

  it('sequence numbers wrap without a gap', () => {
    const sender = pressButtons({ ...createInputSender(), seq: 65534 }, BOTTOM);
    expect(run(sender, 4).frames.map((frame) => frame?.seq)).toEqual([65534, 65535, 0, 1]);
  });
});

describe('expandInput', () => {
  it('gives the ticks a frame carries, oldest first, each with its own sequence number', () => {
    const frame: WireInput = {
      seq: 100,
      buttons: BOTTOM,
      history: [RIGHT, 0, BOTTOM | RIGHT, 0, 0, 0, 0, BUTTON.up],
      stickX: 5,
      stickY: -6,
      tilt: { x: 1, y: 2 },
    };
    const ticks = expandInput(frame);
    expect(ticks.map((tick) => tick.seq)).toEqual([92, 93, 94, 95, 96, 97, 98, 99, 100]);
    expect(ticks.map((tick) => tick.buttons)).toEqual([BUTTON.up, 0, 0, 0, 0, BOTTOM | RIGHT, 0, RIGHT, BOTTOM]);
    for (const tick of ticks) {
      expect(tick).toMatchObject({ stickX: 5, stickY: -6, tilt: { x: 1, y: 2 } });
    }
  });

  it('wraps the sequence numbers of history below zero', () => {
    const frame: WireInput = { ...RELEASED, seq: 2, buttons: BOTTOM, history: [BOTTOM, BOTTOM, 0, 0, 0, 0, 0, 0] };
    expect(expandInput(frame).map((tick) => tick.seq)).toEqual([65530, 65531, 65532, 65533, 65534, 65535, 0, 1, 2]);
  });

  it('keeps nothing between calls and treats a short history as zeros', () => {
    const frame: WireInput = { ...RELEASED, seq: 9, buttons: BOTTOM, history: [RIGHT] };
    const once = expandInput(frame);
    expect(expandInput(frame)).toEqual(once);
    expect(once.length).toBe(INPUT_HISTORY + 1);
    expect(once.map((tick) => tick.buttons)).toEqual([0, 0, 0, 0, 0, 0, 0, RIGHT, BOTTOM]);
  });

  it('expanding every frame of a session gives back every tick, whichever frames are dropped', () => {
    const random = seeded(77);
    let sender = createInputSender();
    const ticks: InputTick[] = [];
    const frames: WireInput[] = [];
    for (let i = 0; i < 400; i += 1) {
      if (random() < 0.3) sender = setButtons(sender, Math.floor(random() * 4096));
      const send = nextInputSend(sender, CENTRED);
      sender = send.sender;
      if (send.frame !== null) {
        frames.push(send.frame);
        ticks.push({ seq: send.frame.seq, buttons: send.frame.buttons, stickX: 0, stickY: 0, tilt: null });
      }
    }
    expect(frames.length).toBeGreaterThan(300);
    // Keep only every ninth frame: together they still hold every tick.
    const seen = new Map<number, number>();
    frames.forEach((frame, i) => {
      if (i % (INPUT_HISTORY + 1) !== INPUT_HISTORY && i !== frames.length - 1) return;
      for (const tick of expandInput(frame)) seen.set(tick.seq, tick.buttons);
    });
    for (const tick of ticks) expect(seen.get(tick.seq), `tick ${String(tick.seq)}`).toBe(tick.buttons);
  });
});

// --- BOTTOM reference receiver, for these tests only ----------------------------------------------
//
// The host's real input buffer is `@kaki/sim-core`. This is a model of what it does: the
// newest sequence number wins; a sequence number already seen is ignored; a press or release
// is latched when a tick shows a bit changed from the last one applied; a tick that arrives
// late is used only to recover a press or release it alone shows; and a phone that is silent
// for `INPUT_STALE_STEPS` steps while holding something is released. Like the real one, it
// reports presses per simulation step as a bitmask, so two presses of one button inside one
// step are one. For these tests it also counts every press and release it latches.

const BUFFER_HISTORY = 8;

class Receiver {
  private lastSeq = -1;
  private buttons = 0;
  private active = false;
  private pressed = 0;
  private released = 0;
  private silent = 0;
  private history: { seq: number; buttons: number }[] = [];
  private fromRest = true;
  /** Every press and release latched, per button, however they fall into steps. */
  readonly pressCount = new Array<number>(BUTTON_COUNT).fill(0);
  readonly releaseCount = new Array<number>(BUTTON_COUNT).fill(0);

  private latch(pressed: number, released: number): void {
    this.pressed |= pressed;
    this.released |= released;
    for (let i = 0; i < BUTTON_COUNT; i += 1) {
      if ((pressed & (1 << i)) !== 0) this.pressCount[i] = (this.pressCount[i] ?? 0) + 1;
      if ((released & (1 << i)) !== 0) this.releaseCount[i] = (this.releaseCount[i] ?? 0) + 1;
    }
  }

  receive(tick: InputTick): void {
    if (this.lastSeq >= 0) {
      if (tick.seq === this.lastSeq) return;
      if (!isNewerSeq(tick.seq, this.lastSeq)) {
        this.receiveLate(tick);
        return;
      }
    }
    const changed = tick.buttons ^ this.buttons;
    this.latch(changed & tick.buttons, changed & ~tick.buttons);
    this.buttons = tick.buttons;
    this.active = !isReleased(tick);
    this.lastSeq = tick.seq;
    this.silent = 0;
    this.remember(this.history.length, tick);
  }

  /** Every tick of a frame, oldest first, as the host is told to do. */
  receiveFrame(frame: WireInput): void {
    for (const tick of expandInput(frame)) this.receive(tick);
  }

  private remember(at: number, tick: InputTick): void {
    if (this.history.length === BUFFER_HISTORY) {
      this.fromRest = false;
      if (at === 0) return;
      this.history.shift();
      this.history.splice(at - 1, 0, { seq: tick.seq, buttons: tick.buttons });
      return;
    }
    this.history.splice(at, 0, { seq: tick.seq, buttons: tick.buttons });
  }

  private receiveLate(tick: InputTick): void {
    let index = 0;
    while (index < this.history.length) {
      const known = this.history[index]?.seq ?? 0;
      if (known === tick.seq) return;
      if (isNewerSeq(known, tick.seq)) break;
      index += 1;
    }
    if (index === this.history.length) return;
    if (index === 0 && !this.fromRest) return;
    const before = index === 0 ? 0 : (this.history[index - 1]?.buttons ?? 0);
    const after = this.history[index]?.buttons ?? 0;
    const flickered = (~before & tick.buttons & ~after) | (before & ~tick.buttons & after);
    this.latch(flickered, flickered);
    this.remember(index, tick);
  }

  /** Once per simulation step. */
  sample(): { held: number; pressed: number; released: number } {
    if (this.silent >= INPUT_STALE_STEPS && this.active) {
      this.latch(0, this.buttons);
      this.buttons = 0;
      this.active = false;
      this.history = [];
      this.fromRest = false;
    }
    const frame = {
      held: this.buttons,
      pressed: this.pressed & BUTTON_MASK,
      released: this.released & BUTTON_MASK,
    };
    this.pressed = 0;
    this.released = 0;
    this.silent += 1;
    return frame;
  }
}

// --- Tick drivers: how a real phone calls the sender -----------------------------------------

interface Driver {
  readonly name: string;
  /** The longest time between two of its ticks, in ms. */
  readonly maxIntervalMs: number;
  /** Makes a source of tick times, in ms, starting after `fromMs`. */
  start(fromMs: number, random: () => number): () => number;
}

/** BOTTOM perfect 60-a-second clock. */
const ideal: Driver = {
  name: 'ideal 60 Hz',
  maxIntervalMs: STEP_MS,
  start(fromMs) {
    let at = fromMs;
    return () => (at += STEP_MS);
  },
};

/** `setTimeout(tick, 1000 / 60)`: the delay is cut to 16 ms, and callbacks run a little late. */
const truncatingTimeout: Driver = {
  name: 'truncating setTimeout',
  maxIntervalMs: 17.5,
  start(fromMs, random) {
    let at = fromMs;
    return () => (at += 16 + random() * 1.5);
  },
};

/** `requestAnimationFrame`: frames 16.7 ms apart, each up to 3 ms early or late, 1 in 50 skipped. */
const jitteredFrames: Driver = {
  name: 'jittered rAF',
  maxIntervalMs: 2 * STEP_MS + 6,
  start(fromMs, random) {
    let frame = 0;
    return () => {
      frame += random() < 0.02 ? 2 : 1;
      return fromMs + frame * STEP_MS + (random() * 6 - 3);
    };
  },
};

/** The fastest a phone may tick. */
const fastest: Driver = {
  name: '120 Hz',
  maxIntervalMs: MIN_TICK_MS,
  start(fromMs) {
    let at = fromMs;
    return () => (at += MIN_TICK_MS);
  },
};

const realistic: Driver[] = [ideal, truncatingTimeout, jitteredFrames];

// --- BOTTOM whole session: thumbs, phone, link, host -----------------------------------------------

interface Touch {
  readonly atMs: number;
  readonly press: boolean;
  readonly bit: number;
}

interface Link {
  /** Chance that a frame never arrives. */
  readonly loss: number;
  /** Never lose more than this many frames in a row; `null` for no such promise. */
  readonly maxRun: number | null;
  /** BOTTOM frame arrives up to this many ms late, so frames can overtake each other. */
  readonly maxDelayMs: number;
  /** Chance that a frame arrives twice. */
  readonly duplicate: number;
  /** Every frame sent in [breakAtMs, breakAtMs + INPUT_BURST_MS) is lost. */
  readonly breakAtMs: number | null;
}

const PERFECT: Link = { loss: 0, maxRun: null, maxDelayMs: 0, duplicate: 0, breakAtMs: null };

interface Session {
  readonly seed: number;
  readonly touches: readonly Touch[];
  readonly durationMs: number;
  readonly driver: Driver;
  /** Tick straight away on a touch event as well (never sooner than the 120-a-second cap). */
  readonly immediate: boolean;
  readonly link: Link;
  readonly startSeq?: number;
  /** The stick and tilt at a given time. */
  readonly analog?: (nowMs: number) => AnalogInput;
  /** The phone's page freezes: no ticks from `atMs` for `ms`. */
  readonly stall?: { readonly atMs: number; readonly ms: number };
}

interface Outcome {
  /** Presses the thumbs made, per button index. */
  made: number[];
  /** Presses and releases the host's buffer latched, per button index. */
  latchedPresses: number[];
  latchedReleases: number[];
  /** Presses and releases the host's simulation saw: one per button per step at most. */
  stepPresses: number[];
  stepReleases: number[];
  /** For each press in order: ticks between the first tick after it and the tick that sent it. */
  pressDelays: number[];
  /** For each press: did the same button's last release fall between the same two ticks? */
  afterReleaseInSameTick: boolean[];
  /** Steps on which the host held a button long after every thumb was off. */
  stuckSteps: number;
  finalHeld: number;
  frames: number;
  framesLost: number;
  bytes: number;
  maxFrameBytes: number;
  wrapped: boolean;
}

const zeros = (): number[] => new Array<number>(BUTTON_COUNT).fill(0);
const bump = (counts: number[], mask: number): void => {
  for (let i = 0; i < BUTTON_COUNT; i += 1) {
    if ((mask & (1 << i)) !== 0) counts[i] = (counts[i] ?? 0) + 1;
  }
};

/**
 * Plays thumbs → sender → encoder → link → decoder → `expandInput` → reference receiver, in
 * real time. The host steps 60 times a second at a random phase against the phone's ticks.
 */
function play(session: Session): Outcome {
  const random = seeded(session.seed);
  const { link, driver } = session;
  const touches = [...session.touches].sort((a, b) => a.atMs - b.atMs);
  let sender: InputSender = { ...createInputSender(), seq: session.startSeq ?? 0 };
  const receiver = new Receiver();
  const outcome: Outcome = {
    made: zeros(),
    latchedPresses: receiver.pressCount,
    latchedReleases: receiver.releaseCount,
    stepPresses: zeros(),
    stepReleases: zeros(),
    pressDelays: [],
    afterReleaseInSameTick: [],
    stuckSteps: 0,
    finalHeld: 0,
    frames: 0,
    framesLost: 0,
    bytes: 0,
    maxFrameBytes: 0,
    wrapped: false,
  };

  const nextTimerTick = driver.start(random() * STEP_MS, random);
  let timerAt = nextTimerTick();
  let forcedAt = Infinity;
  let lastTickAt = -Infinity;
  let stepAt = random() * STEP_MS;
  let touchIndex = 0;
  let tickCount = 0;
  let lostInARow = 0;
  let lastSeq = session.startSeq ?? 0;
  let lastButtons = 0;
  let lastTouchAt = -Infinity;
  const waiting: { bit: number; idealTick: number }[][] = Array.from({ length: BUTTON_COUNT }, () => []);
  const lastReleaseTick = new Array<number>(BUTTON_COUNT).fill(-1);
  const inFlight: { due: number; order: number; bytes: Uint8Array }[] = [];
  let order = 0;
  // After the last thumb lifts: the release repeats, the longest delay, the silence limit.
  const settleMs = (INPUT_HISTORY + 2) * driver.maxIntervalMs + link.maxDelayMs + (INPUT_STALE_STEPS + 3) * STEP_MS;

  const stallEnd = session.stall === undefined ? 0 : session.stall.atMs + session.stall.ms;
  const stalled = (at: number): boolean =>
    session.stall !== undefined && at >= session.stall.atMs && at < stallEnd;

  for (;;) {
    const touchAt = touches[touchIndex]?.atMs ?? Infinity;
    // The cap is the caller's job: a tick due too soon is put off, never dropped. BOTTOM frozen
    // page runs its overdue ticks when it thaws.
    let tickAt = Math.max(Math.min(timerAt, forcedAt), lastTickAt + MIN_TICK_MS);
    if (stalled(tickAt)) tickAt = stallEnd;
    const now = Math.min(touchAt, tickAt, stepAt);
    if (now > session.durationMs) break;

    if (touchAt === now) {
      const touch = touches[touchIndex];
      touchIndex += 1;
      if (touch === undefined) continue;
      const index = Math.log2(touch.bit);
      const before = sender;
      sender = touch.press ? pressButtons(sender, touch.bit) : releaseButtons(sender, touch.bit);
      if (sender !== before) {
        if (touch.press) {
          outcome.made[index] = (outcome.made[index] ?? 0) + 1;
          waiting[index]?.push({ bit: touch.bit, idealTick: tickCount });
          outcome.afterReleaseInSameTick.push(lastReleaseTick[index] === tickCount);
        } else {
          lastReleaseTick[index] = tickCount;
        }
      }
      lastTouchAt = now;
      if (session.immediate) forcedAt = now;
      continue;
    }

    if (tickAt === now) {
      if (timerAt <= now) timerAt = nextTimerTick();
      while (timerAt <= now) timerAt = nextTimerTick();
      forcedAt = Infinity;
      lastTickAt = now;
      const analog = session.analog === undefined ? CENTRED : session.analog(now);
      const send = nextInputSend(sender, analog);
      sender = send.sender;
      const frame = send.frame;
      if (frame !== null) {
        const rising = frame.buttons & ~lastButtons;
        for (let i = 0; i < BUTTON_COUNT; i += 1) {
          if ((rising & (1 << i)) === 0) continue;
          const press = waiting[i]?.shift();
          if (press !== undefined) outcome.pressDelays.push(tickCount - press.idealTick);
        }
        lastButtons = frame.buttons;
        if (frame.seq < lastSeq) outcome.wrapped = true;
        lastSeq = frame.seq;
        const bytes = encodeInput(frame);
        outcome.frames += 1;
        outcome.bytes += bytes.length;
        outcome.maxFrameBytes = Math.max(outcome.maxFrameBytes, bytes.length);
        const inBreak = link.breakAtMs !== null && now >= link.breakAtMs && now < link.breakAtMs + INPUT_BURST_MS;
        const unlucky = random() < link.loss && (link.maxRun === null || lostInARow < link.maxRun);
        if (inBreak || unlucky) {
          lostInARow += 1;
          outcome.framesLost += 1;
        } else {
          lostInARow = 0;
          inFlight.push({ due: now + random() * link.maxDelayMs, order: (order += 1), bytes });
        }
        if (random() < link.duplicate) {
          inFlight.push({ due: now + random() * link.maxDelayMs, order: (order += 1), bytes });
        }
      }
      tickCount += 1;
      continue;
    }

    // BOTTOM simulation step on the host: take what has arrived, in the order it arrived.
    stepAt += STEP_MS;
    const arrived = inFlight.filter((packet) => packet.due <= now).sort((a, b) => a.due - b.due || a.order - b.order);
    for (const packet of arrived) {
      inFlight.splice(inFlight.indexOf(packet), 1);
      const decoded = decodePhoneFrame(packet.bytes.buffer);
      if (decoded.ok && decoded.value.kind === 'input') receiver.receiveFrame(decoded.value.input);
    }
    const frame = receiver.sample();
    bump(outcome.stepPresses, frame.pressed);
    bump(outcome.stepReleases, frame.released);
    if (heldButtons(sender) === 0 && now - lastTouchAt > settleMs && frame.held !== 0) outcome.stuckSteps += 1;
    outcome.finalHeld = frame.held;
  }
  return outcome;
}

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

/** One tap of `downMs` starting at `atMs`. */
function tap(atMs: number, downMs: number, bit: number = BOTTOM): Touch[] {
  return [
    { atMs, press: true, bit },
    { atMs: atMs + downMs, press: false, bit },
  ];
}

const settings = realistic.flatMap((driver) => [
  { driver, immediate: false, label: driver.name },
  { driver, immediate: true, label: `${driver.name} + a tick on every touch` },
]);

describe.each(settings)('a perfect link, $label', ({ driver, immediate }) => {
  it('every tap of any length is seen exactly once, with no added delay', () => {
    const random = seeded(11);
    const touches: Touch[] = [];
    let at = 50;
    let count = 0;
    for (const downMs of [0.2, 1, 3, 8, 15, 16, 17, 25, 33, 60, 120, 250, 700]) {
      for (let i = 0; i < 40; i += 1) {
        touches.push(...tap(at + random() * 40, downMs));
        at += downMs + 120;
        count += 1;
      }
    }
    const outcome = play({ seed: 3, touches, durationMs: at + 600, driver, immediate, link: PERFECT });
    expect(outcome.made[4]).toBe(count);
    expect(outcome.stepPresses[4]).toBe(count);
    expect(outcome.stepReleases[4]).toBe(count);
    expect(outcome.latchedPresses[4]).toBe(count);
    // Every press went out in the first tick after the thumb landed.
    expect(outcome.pressDelays.length).toBe(count);
    expect(Math.max(...outcome.pressDelays)).toBe(0);
    expect(outcome.stuckSteps).toBe(0);
    expect(outcome.finalHeld).toBe(0);
  });

  it('double and triple taps as fast as one per two ticks are each seen', () => {
    const random = seeded(12);
    // "Two ticks" for this driver: twice its longest gap between ticks, plus the thumb's own
    // unevenness.
    const period = 2 * driver.maxIntervalMs + 3;
    const touches: Touch[] = [];
    let at = 50;
    let count = 0;
    for (let group = 0; group < 300; group += 1) {
      const taps = group % 2 === 0 ? 2 : 3;
      const start = at + random() * 40;
      // An even rhythm: anything from a flick to nearly the whole beat down, the same for
      // each tap of the group, every edge up to 1 ms off the beat.
      const downMs = 2 + (period - 4) * (0.02 + random() * 0.96);
      for (let i = 0; i < taps; i += 1) {
        const pressAt = start + i * period + (random() * 2 - 1);
        const releaseAt = start + i * period + downMs + (random() * 2 - 1);
        touches.push({ atMs: pressAt, press: true, bit: BOTTOM }, { atMs: releaseAt, press: false, bit: BOTTOM });
        count += 1;
      }
      at = start + taps * period + 150;
    }
    const outcome = play({ seed: 4, touches, durationMs: at + 600, driver, immediate, link: PERFECT });
    expect(outcome.made[4]).toBe(count);
    expect(outcome.latchedPresses[4]).toBe(count);
    expect(outcome.latchedReleases[4]).toBe(count);
    expect(outcome.stepPresses[4]).toBe(count);
    expect(outcome.stepReleases[4]).toBe(count);
    // BOTTOM press waits one tick only when the release before it fell between the same two ticks.
    expect(outcome.pressDelays.length).toBe(count);
    expect(Math.max(...outcome.pressDelays)).toBeLessThanOrEqual(1);
    expect(outcome.finalHeld).toBe(0);
  });

  it.each([10, 15])('mashing at %i taps a second for 10 s: every tap seen, none late', (rate) => {
    const random = seeded(13 + rate);
    const period = 1000 / rate;
    const touches: Touch[] = [];
    const count = rate * 10;
    for (let i = 0; i < count; i += 1) {
      // BOTTOM human's thumb: down for 40% to 55% of the beat, a few ms off the beat either way.
      const at = 100 + i * period + (random() * 6 - 3);
      touches.push(...tap(at, period * (0.4 + random() * 0.15)));
    }
    const outcome = play({ seed: 5, touches, durationMs: 100 + 10_000 + 600, driver, immediate, link: PERFECT });
    expect(outcome.made[4]).toBe(count);
    expect(outcome.stepPresses[4]).toBe(count);
    expect(outcome.stepReleases[4]).toBe(count);
    expect(outcome.pressDelays.length).toBe(count);
    // The only press that may wait a tick is one whose release fell between the same two
    // ticks (a skipped animation frame can be longer than the gap between taps).
    outcome.pressDelays.forEach((delay, i) => {
      expect(delay, `press ${String(i)}`).toBe(outcome.afterReleaseInSameTick[i] === true ? 1 : 0);
    });
    if (driver !== jitteredFrames) expect(Math.max(...outcome.pressDelays)).toBe(0);
    expect(outcome.stuckSteps).toBe(0);
    expect(outcome.finalHeld).toBe(0);
    // The game stops acting when the thumb stops: the last release is seen within a few steps.
  });
});

// --- Loss -------------------------------------------------------------------------------------

const PLAYED = [BUTTON.faceBottom, BUTTON.faceRight, BUTTON.up, BUTTON.shake];

/**
 * BOTTOM scripted player for `ms`: per button, a random mix of flicks, taps, holds, fast double and
 * triple taps and bursts of mashing. `gapMs` is the least time between two things on one
 * button.
 */
function script(seed: number, ms: number, twoTicksMs: number, gapMs: number, fast: boolean): Touch[] {
  const random = seeded(seed);
  const touches: Touch[] = [];
  for (const bit of PLAYED) {
    let at = 100 + random() * 300;
    while (at < ms) {
      const roll = random();
      if (roll < 0.3) {
        const down = random() * 12;
        touches.push(...tap(at, down, bit));
        at += down;
      } else if (roll < 0.55 || !fast) {
        const down = 15 + random() * (roll < 0.5 ? 120 : 900);
        touches.push(...tap(at, down, bit));
        at += down;
      } else if (roll < 0.8) {
        const taps = roll < 0.7 ? 2 : 3;
        const down = twoTicksMs * (0.05 + random() * 0.9);
        for (let i = 0; i < taps; i += 1) touches.push(...tap(at + i * twoTicksMs, down, bit));
        at += taps * twoTicksMs;
      } else {
        const period = 1000 / (roll < 0.9 ? 10 : 15);
        const taps = 5 + Math.floor(random() * 15);
        for (let i = 0; i < taps; i += 1) touches.push(...tap(at + i * period, period * 0.45, bit));
        at += taps * period;
      }
      at += gapMs + random() * 400;
    }
  }
  return touches;
}

/** Tilt comes and goes every few seconds, as layouts with and without a tilt part would. */
function tiltComesAndGoes(nowMs: number): AnalogInput {
  const on = Math.floor(nowMs / 2_700) % 2 === 1;
  return {
    stickX: Math.sin(nowMs / 300),
    stickY: Math.floor(nowMs / 1_900) % 3 === 0 ? 0 : Math.cos(nowMs / 170),
    tilt: on ? { x: Math.sin(nowMs / 90), y: 0.25 } : null,
  };
}

describe('lossy links (NET-005)', () => {
  // The promise of the history: any eight frames in a row may be lost. These links lose 5% to
  // 30% of frames in runs of up to eight, deliver some twice and some up to 40 ms late.
  const links: Link[] = [
    { loss: 0.05, maxRun: INPUT_HISTORY, maxDelayMs: 0, duplicate: 0, breakAtMs: null },
    { loss: 0.05, maxRun: INPUT_HISTORY, maxDelayMs: 40, duplicate: 0.1, breakAtMs: null },
    { loss: 0.15, maxRun: INPUT_HISTORY, maxDelayMs: 25, duplicate: 0.2, breakAtMs: null },
    { loss: 0.3, maxRun: INPUT_HISTORY, maxDelayMs: 0, duplicate: 0, breakAtMs: null },
    { loss: 0.3, maxRun: INPUT_HISTORY, maxDelayMs: 40, duplicate: 0.3, breakAtMs: null },
  ];
  const label = 'loss $loss in runs of up to $maxRun, up to $maxDelayMs ms late, duplicates $duplicate';

  it.each(links)(`${label}: every press and release reaches the host's buffer exactly once`, (link) => {
    let taps = 0;
    let lost = 0;
    let merged = 0;
    for (let seed = 1; seed <= 12; seed += 1) {
      const driver = realistic[seed % realistic.length] ?? ideal;
      const outcome = play({
        seed: seed * 7919,
        touches: script(seed * 31, 30_000, 2 * driver.maxIntervalMs + 3, 60, true),
        durationMs: 32_000,
        driver,
        immediate: seed % 2 === 0,
        link,
        // Every run crosses the 16-bit wrap, and tilt comes and goes throughout.
        startSeq: 65_000,
        analog: tiltComesAndGoes,
      });
      const at = `seed ${String(seed)}, ${driver.name}`;
      expect(outcome.wrapped, at).toBe(true);
      expect(outcome.latchedPresses, at).toEqual(outcome.made);
      expect(outcome.latchedReleases, at).toEqual(outcome.made);
      expect(outcome.stuckSteps, at).toBe(0);
      expect(outcome.finalHeld, at).toBe(0);
      // The simulation never sees a press that was not made.
      outcome.made.forEach((count, i) => {
        expect(outcome.stepPresses[i], at).toBeLessThanOrEqual(count);
      });
      taps += sum(outcome.made);
      lost += outcome.framesLost;
      merged += sum(outcome.made) - sum(outcome.stepPresses);
    }
    expect(taps).toBeGreaterThan(5_000);
    expect(lost).toBeGreaterThan(500);
    // `merged` is presses that reached the buffer in the same simulation step as another press
    // of the same button (a catch-up frame after a loss), and so showed as one. See the limit
    // below; it is not asserted to be zero here because fast taps are in this script.
    expect(merged).toBeGreaterThanOrEqual(0);
  });

  it.each(links)(`${label}: taps at least a history apart are each seen by the simulation exactly once`, (link) => {
    let taps = 0;
    for (let seed = 1; seed <= 12; seed += 1) {
      const driver = realistic[seed % realistic.length] ?? ideal;
      // Further apart than the longest catch-up (nine ticks) plus the longest delay.
      const gapMs = (INPUT_HISTORY + 2) * driver.maxIntervalMs + link.maxDelayMs + 2 * STEP_MS;
      const outcome = play({
        seed: seed * 104_729,
        touches: script(seed * 37, 30_000, 0, gapMs, false),
        durationMs: 32_000,
        driver,
        immediate: seed % 2 === 0,
        link,
        startSeq: 65_000,
        analog: tiltComesAndGoes,
      });
      const at = `seed ${String(seed)}, ${driver.name}`;
      expect(outcome.stepPresses, at).toEqual(outcome.made);
      expect(outcome.stepReleases, at).toEqual(outcome.made);
      expect(outcome.stuckSteps, at).toBe(0);
      expect(outcome.finalHeld, at).toBe(0);
      taps += sum(outcome.made);
    }
    expect(taps).toBeGreaterThan(1_500);
  });

  it('the limit: after a run of lost frames, fast taps of one button can reach the simulation as one', () => {
    // Not the protocol losing anything: every press reaches the buffer (asserted above). The
    // buffer reports presses per step as a bitmask, and a catch-up frame after a loss delivers
    // several ticks in one step. Measured here so the number is on record.
    let made = 0;
    let seen = 0;
    for (let seed = 1; seed <= 12; seed += 1) {
      const outcome = play({
        seed: seed * 7919,
        touches: script(seed * 31, 30_000, 2 * STEP_MS + 3, 60, true),
        durationMs: 32_000,
        driver: ideal,
        immediate: false,
        link: { loss: 0.15, maxRun: INPUT_HISTORY, maxDelayMs: 25, duplicate: 0.2, breakAtMs: null },
      });
      expect(outcome.latchedPresses).toEqual(outcome.made);
      made += sum(outcome.made);
      seen += sum(outcome.stepPresses);
    }
    // Measured: 0.06% of presses at 5% loss, 0.12% at 15%, 0.44% at 30% (with realistic
    // drivers and tilt); this run, at 15% on an ideal clock, is of the same order.
    const merged = (made - seen) / made;
    expect(merged).toBeGreaterThan(0);
    expect(merged).toBeLessThan(0.01);
  });

  // Without the promise about runs, a press is lost only if all nine frames that carry its
  // tick are lost: the ninth power of the loss rate.
  it.each([
    [0.3, 0.3 ** 9],
    [0.5, 0.5 ** 9],
    [0.7, 0.7 ** 9],
  ])('independent loss of %f: a tap is missed about loss^9 of the time (%f), never doubled, never stuck', (loss, expected) => {
    let made = 0;
    let seen = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const random = seeded(seed * 53);
      const touches: Touch[] = [];
      for (let at = 100; at < 60_000; at += 150 + random() * 100) touches.push(...tap(at, random() * 30));
      const outcome = play({
        seed: seed * 101,
        touches,
        durationMs: 61_000,
        driver: ideal,
        immediate: false,
        link: { loss, maxRun: null, maxDelayMs: 0, duplicate: 0, breakAtMs: null },
      });
      expect(outcome.latchedPresses[4]).toBeLessThanOrEqual(outcome.made[4] ?? 0);
      expect(outcome.stuckSteps).toBe(0);
      expect(outcome.finalHeld).toBe(0);
      made += outcome.made[4] ?? 0;
      seen += outcome.latchedPresses[4] ?? 0;
    }
    expect(made).toBeGreaterThan(5_000);
    const missed = (made - seen) / made;
    expect(missed).toBeLessThanOrEqual(expected * 1.5 + 0.0005);
    if (expected > 0.001) expect(missed).toBeGreaterThanOrEqual(expected * 0.5);
  });
});

describe('a 50 ms break in the link, at any moment, never loses or doubles a tap', () => {
  const drivers = [...realistic, fastest];

  /** Plays the touches once for every driver, with and without a tick on touch, and every break. */
  function sweep(touches: Touch[], check: (outcome: Outcome, at: string) => void): number {
    let cases = 0;
    for (const driver of drivers) {
      for (const immediate of [false, true]) {
        // The break starts anywhere from well before the tap to well after it.
        for (let breakAtMs = 100; breakAtMs <= 520; breakAtMs += 1) {
          const outcome = play({
            seed: breakAtMs * 13 + cases,
            touches,
            durationMs: 1_100,
            driver,
            immediate,
            link: { ...PERFECT, breakAtMs },
          });
          check(outcome, `break at ${String(breakAtMs)} ms, ${driver.name}, immediate ${String(immediate)}`);
          cases += 1;
        }
      }
    }
    return cases;
  }

  const taps: Record<string, { touches: Touch[]; presses: number }> = {
    'a flick shorter than a tick': { touches: tap(200, 3), presses: 1 },
    'a three-tick tap (the case the review reproduced)': { touches: tap(200, 50), presses: 1 },
    'a long press': { touches: tap(200, 200), presses: 1 },
    'a double tap, 100 ms from press to press': { touches: [...tap(200, 40), ...tap(300, 40)], presses: 2 },
  };

  it.each(Object.entries(taps))('%s: the simulation sees it exactly once', (_name, { touches, presses }) => {
    const cases = sweep(touches, (outcome, at) => {
      expect(outcome.stepPresses[4], at).toBe(presses);
      expect(outcome.stepReleases[4], at).toBe(presses);
      expect(outcome.latchedPresses[4], at).toBe(presses);
      expect(outcome.finalHeld, at).toBe(0);
    });
    expect(cases).toBe(4 * 2 * 421);
  });

  it.each([
    ['80 ms from press to press', 80, 40],
    ['66 ms from press to press (mashing at 15 a second)', 66, 30],
  ])('a double tap, %s: both presses always reach the buffer', (_name, apartMs, downMs) => {
    const cases = sweep([...tap(200, downMs), ...tap(200 + apartMs, downMs)], (outcome, at) => {
      expect(outcome.latchedPresses[4], at).toBe(2);
      expect(outcome.latchedReleases[4], at).toBe(2);
      expect(outcome.finalHeld, at).toBe(0);
    });
    expect(cases).toBe(4 * 2 * 421);
  });

  it('the limit: taps closer than 100 ms can reach the simulation as one after a break', () => {
    // Nothing is lost on the way: both presses and both releases reach the buffer (asserted
    // above). But the frame that catches up after the break delivers several ticks at once,
    // and the buffer reports presses and releases per simulation step as a bitmask, so two of
    // the same kind in one step show as one. Measured here so the numbers are on record:
    // 2 of 3,368 breaks for taps 80 ms apart, 30 of 3,368 for taps 66 ms apart.
    const merged = (apartMs: number, downMs: number): number => {
      let count = 0;
      sweep([...tap(200, downMs), ...tap(200 + apartMs, downMs)], (outcome) => {
        if (outcome.stepPresses[4] !== 2 || outcome.stepReleases[4] !== 2) count += 1;
      });
      return count;
    };
    const at80 = merged(80, 40);
    const at66 = merged(66, 30);
    expect(at80).toBeGreaterThan(0);
    expect(at80).toBeLessThan(20);
    expect(at66).toBeGreaterThan(at80);
    expect(at66).toBeLessThan(100);
  });
});

describe('a 300 ms freeze of the phone, at any moment around a tap', () => {
  it.each([3, 60, 120])('a %i ms tap is one press and one release', (downMs) => {
    let cases = 0;
    let staleReleases = 0;
    for (const driver of realistic) {
      for (const immediate of [false, true]) {
        for (let atMs = 100; atMs <= 800; atMs += 1) {
          const outcome = play({
            seed: atMs * 17 + cases,
            touches: tap(500, downMs),
            durationMs: 1_800,
            driver,
            immediate,
            link: PERFECT,
            stall: { atMs, ms: 300 },
          });
          const at = `freeze at ${String(atMs)} ms, ${driver.name}, immediate ${String(immediate)}`;
          expect(outcome.stepPresses[4], at).toBe(1);
          expect(outcome.stepReleases[4], at).toBe(1);
          expect(outcome.latchedPresses[4], at).toBe(1);
          expect(outcome.finalHeld, at).toBe(0);
          cases += 1;
          // When the freeze began with the button down, the host let go by itself.
          if (atMs > 500 && atMs <= 500 + downMs) staleReleases += 1;
        }
      }
    }
    expect(cases).toBe(3 * 2 * 701);
    if (downMs > 20) expect(staleReleases).toBeGreaterThan(0);
  });

  it('the limit: a button still held when the freeze ends is pressed again', () => {
    // The host cannot tell a frozen phone from a dead one, so it lets go after 250 ms; when
    // the frames come back showing the button down, that is a new press. This is the host's
    // silence rule, not the protocol's.
    const outcome = play({
      seed: 1,
      touches: tap(200, 900),
      durationMs: 2_000,
      driver: ideal,
      immediate: false,
      link: PERFECT,
      stall: { atMs: 400, ms: 300 },
    });
    expect(outcome.stepPresses[4]).toBe(2);
    expect(outcome.stepReleases[4]).toBe(2);
    expect(outcome.finalHeld).toBe(0);
  });
});

describe('a steady hold is not released by silence', () => {
  const TEN_MINUTES = 10 * 60 * 60;

  /**
   * Holds the bottom button for `steps` simulation steps over a link that loses frames independently, the
   * phone ticking once every `everySteps` steps. Returns how many times the host let go.
   */
  function hold(seed: number, loss: number, everySteps: number, steps: number): number {
    const random = seeded(seed);
    const receiver = new Receiver();
    let sender = pressButtons(createInputSender(), BOTTOM);
    let releases = 0;
    for (let step = 0; step < steps; step += 1) {
      if (step % everySteps === 0) {
        const send = nextInputSend(sender, CENTRED);
        sender = send.sender;
        if (send.frame !== null && random() >= loss) receiver.receiveFrame(send.frame);
      }
      if ((receiver.sample().released & BOTTOM) !== 0) releases += 1;
    }
    return releases;
  }

  /** False releases per ten minutes, averaged over `runs` ten-minute holds. */
  function rate(loss: number, everySteps: number, runs: number): number {
    let releases = 0;
    for (let seed = 1; seed <= runs; seed += 1) {
      releases += hold(seed * 31, loss, everySteps, TEN_MINUTES);
    }
    return releases / runs;
  }

  const keepAliveSteps = Math.round(INPUT_KEEPALIVE_MS / STEP_MS);

  it.each([0.05, 0.1, 0.2, 0.3])('ticking 60 times a second, %f loss never releases a ten-minute hold', (loss) => {
    expect(rate(loss, 1, 10)).toBe(0);
  });

  it('the keep-alive is two steps, so seven in a row must be lost to reach the silence limit', () => {
    expect(keepAliveSteps).toBe(2);
    expect(Math.floor((INPUT_STALE_STEPS - 1) / keepAliveSteps)).toBe(7);
  });

  it('ticking only at the keep-alive rate, 5% and 10% loss never release a ten-minute hold', () => {
    expect(rate(0.05, keepAliveSteps, 10)).toBe(0);
    expect(rate(0.1, keepAliveSteps, 10)).toBe(0);
  });

  it('the limit: ticking only at the keep-alive rate, 20% loss releases a hold about twice an hour', () => {
    // Seven keep-alives lost in a row has a chance of 0.2^7, about 1 in 78,000, and there are
    // 18,000 keep-alives in ten minutes. Measured over 40 ten-minute holds: 0.3 per ten minutes.
    const perTenMinutes = rate(0.2, keepAliveSteps, 40);
    expect(perTenMinutes).toBeGreaterThan(0);
    expect(perTenMinutes).toBeLessThan(1);
  });

  it('the limit: ticking only at the keep-alive rate, 30% loss releases a hold about three times in ten minutes', () => {
    // 0.3^7 is about 1 in 4,600. Measured over 40 ten-minute holds: 2.9 per ten minutes.
    // Sustained 30% loss is outside what the game promises; the big screen shows the player as
    // a weak link long before (PLAT-010).
    const perTenMinutes = rate(0.3, keepAliveSteps, 40);
    expect(perTenMinutes).toBeGreaterThan(1);
    expect(perTenMinutes).toBeLessThan(8);
  });
});

describe('what it costs', () => {
  it('a frame is 7 bytes while nothing changes and 23 at the very most', () => {
    const outcome = play({
      seed: 9,
      touches: Array.from({ length: 100 }, (_, i) => tap(100 + i * 100, 45)).flat(),
      durationMs: 10_600,
      driver: ideal,
      immediate: false,
      link: PERFECT,
    });
    // Mashing at 10 taps a second: most frames have three or four runs in them.
    const mean = outcome.bytes / outcome.frames;
    expect(mean).toBeGreaterThan(9);
    expect(mean).toBeLessThan(14);
    expect(outcome.maxFrameBytes).toBeLessThanOrEqual(15);

    // A steady hold: 7 bytes a frame.
    const steady = run(pressButtons(createInputSender(), BOTTOM), 40).frames.slice(INPUT_HISTORY);
    for (const frame of steady) expect(frame === null ? 0 : encodeInput(frame).length).toBe(7);

    // The worst case: a button changing on every tick.
    let sender = createInputSender();
    let worst = 0;
    for (let i = 0; i < 30; i += 1) {
      sender = setButtons(sender, i % 2 === 0 ? BOTTOM : 0);
      const send = nextInputSend(sender, CENTRED);
      sender = send.sender;
      if (send.frame !== null) worst = Math.max(worst, encodeInput(send.frame).length);
    }
    expect(worst).toBe(23);
  });
});
