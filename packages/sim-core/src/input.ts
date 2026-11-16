// The host's input buffer (docs/ARCHITECTURE.md §5, PLAT-032, in support of NET-005).
//
// Phones send their WHOLE current input state (a button bitmask and some axes) with a sequence
// number, over a channel that may lose, repeat and reorder packets. This buffer keeps the
// newest state per controller and, once per simulation step, hands the simulation one frame
// per controller: what is held now, and which buttons went down or up since the last step.
//
// What it guarantees:
//   - Latest state wins. A packet older than the newest one seen never changes what is held.
//   - A repeated packet does nothing.
//   - A tap shorter than one step is not missed: if a button goes down and up between two
//     steps, the next frame has it in both `pressed` and `released`, with `held` clear.
//   - A reordered tap is not missed: an old packet that shows a button down between two newer
//     known states where it was up still produces its `pressed` and `released`.
//   - No stuck buttons: any later state with the button up releases it, whatever was lost in
//     between; and a controller that falls silent while holding something is released after
//     `staleAfterSteps` steps.
//
// What it cannot do: if the ONLY packet showing a button down is lost, that tap never
// happened as far as the host can know. That is for the protocol to prevent (resend, or a
// press counter in the message).
//
// Nothing here reads a clock. Staleness is counted in simulation steps. The frames it produces
// are the simulation's inputs, so recording those frames is enough to replay a game.
//
// SAMPLED FRAMES ARE BORROWED, NOT OWNED. `sample()` returns the same Map and the same frame
// objects every step and overwrites them on the next call, so that a step allocates nothing.
// A step may read them freely but must not keep one: a frame stored in the game state would
// change underneath it one step later and silently corrupt the previous state. To keep one,
// take a copy with `copyFrame(frame)` (or `copyInputFrame`, or `cloneState` for the whole
// Map). The types help: `sample()` gives `SampledInput`, which is read-only and cannot be
// assigned to a field typed as the writable `InputFrame`. Type the game's state with
// `InputFrame` and the mistake does not compile.
//
// What game rules will meet at the edges:
//   - Up then down again inside one step, on a button that was held: `held`, `pressed` and
//     `released` are all set. The order was release first, then press; it is still held.
//   - A repeated edge of the same kind defers that tick and subsequent ticks until the
//     next sample. Ticks wait at most 4 samples; then the remaining queue collapses:
//     after a stall, each button reports at most one press and one release for everything
//     that happened in it, and its final state is the newest. A hard 256-tick bound is a safety net.
//   - Edges wait within the queue bound while `sample()` is not called. A press made
//     during a pause is delivered after it unless the host calls `discardEdges()` (rule 2).
//   - After silence releases a button, held may resume but pressed is suppressed until
//     an accepted tick (including a late UP) shows it up. Games see released after silence,
//     then held without pressed on resumption, then a second released on letting go.
//     A new-channel reset clears this suppression.
//   - A controller that is removed while holding a button gets no release: its frame simply
//     stops appearing. Rules must treat a controller with no frame as holding nothing.
//   - A button held across a reconnect reads as a release, then a new press when the new
//     channel's first packet arrives (rule 3). Rules that must not restart an action on that
//     press have to allow for it.
//   - Axes are clamped one by one to -1..1, so a raw diagonal can be 1.41 long. Use
//     `normaliseAxes(x, y)` before turning a stick into a speed.
//
// Rules for the host:
//   1. Call `sample()` exactly once per simulation step.
//   2. Resuming from a pause: call `discardEdges()` before the first step. Taps made wholly
//      inside the pause vanish; a button held all through gives no edge; one let go during
//      the pause gives one `released`; one pressed and still down gives one `pressed`.
//      Sequence numbers are kept, so a packet OLDER than the newest one already received is
//      ignored. A packet sent during the pause that is still in flight at the resume is newer
//      and IS applied (a tap in the last moments of a pause can land as play restarts); only
//      the protocol can close that gap. Do NOT use `reset` for this, and do not sample-and-discard (that keeps what
//      is held but loses the net changes).
//   3. A new data channel for a controller (reconnect, reload, phone woke up), and only
//      then: call `reset(id)` before feeding it anything. Its sequence numbers start again.
//   4. Never feed the buffer a packet from an old channel. The buffer cannot tell an old
//      channel's numbers from the new one's; filtering by connection is the host's job.
//   5. Pass `seqModulus` and `staleAfterSteps` from the protocol's constants. They have no
//      defaults here because a wrong guess fails silently: a buffer that thinks 16-bit
//      numbers never wrap goes deaf to a controller after 65536 packets.

/** Buttons are bits 0 to 31 of a bitmask. */
export const MAX_BUTTONS = 32;

/** The bitmask with only the given button (0 to 31) set. Throws on anything else. */
export function buttonMask(button: number): number {
  // `button >>> 0` equals `button` only for whole numbers from 0 to 2^32 - 1.
  if (button >>> 0 !== button || button >= MAX_BUTTONS) {
    throw new RangeError(`button must be a whole number from 0 to 31, got ${String(button)}`);
  }
  return (1 << button) >>> 0;
}

/** One controller's input for one simulation step. Plain data. */
export interface InputFrame {
  /** Buttons down at this step. */
  held: number;
  /** Buttons that went down at least once since the previous step. */
  pressed: number;
  /** Buttons that went up at least once since the previous step. */
  released: number;
  /** Stick and other analogue values, each from -1 to 1. Length is the buffer's `axisCount`. */
  axes: number[];
  /** Sequence number of the newest packet applied, or -1 if none yet. */
  seq: number;
  /**
   * Steps since a packet was last applied: 0 means one arrived since the previous step.
   * -1 means nothing has been heard since the controller was added or reset.
   */
  age: number;
}

/**
 * A frame as the simulation is given it: the same fields as `InputFrame`, all read-only.
 * This is what `sample()` returns and what a step function should take. It cannot be assigned
 * to an `InputFrame`, which is the point: see "sampled frames are borrowed" at the top of
 * this file. An `InputFrame` can be passed wherever a `SampledInput` is wanted.
 */
export interface SampledInput {
  readonly held: number;
  readonly pressed: number;
  readonly released: number;
  readonly axes: readonly number[];
  readonly seq: number;
  readonly age: number;
}

/** A frame with nothing held, every axis at rest and nothing heard yet (`seq` and `age` -1). */
export function createInputFrame(axisCount = 0): InputFrame {
  return { held: 0, pressed: 0, released: 0, axes: new Array<number>(axisCount).fill(0), seq: -1, age: -1 };
}

/**
 * A stick vector clamped to the unit circle. The buffer clamps each axis to -1..1 on its
 * own, which leaves a full diagonal 1.41 long: a cook moved by the raw axes would run 41%
 * faster diagonally. This keeps the direction and caps the length at 1; shorter vectors pass
 * through unchanged; anything not a finite number counts as 0. Writes into `out` if given
 * (so a step need not allocate) and returns it.
 */
export function normaliseAxes(x: number, y: number, out: [number, number] = [0, 0]): [number, number] {
  const sx = Number.isFinite(x) ? x : 0;
  const sy = Number.isFinite(y) ? y : 0;
  const squared = sx * sx + sy * sy;
  if (squared > 1) {
    const length = Math.sqrt(squared);
    out[0] = sx / length;
    out[1] = sy / length;
  } else {
    out[0] = sx;
    out[1] = sy;
  }
  return out;
}

/** Copies `from` into `into` without allocating (when the axis counts already match). */
export function copyInputFrame(into: InputFrame, from: SampledInput): InputFrame {
  into.held = from.held;
  into.pressed = from.pressed;
  into.released = from.released;
  into.seq = from.seq;
  into.age = from.age;
  into.axes.length = from.axes.length;
  for (let i = 0; i < from.axes.length; i += 1) into.axes[i] = from.axes[i] ?? 0;
  return into;
}

/** A new, separate, writable copy of a frame. Use this to keep a sampled frame. */
export function copyFrame(from: SampledInput): InputFrame {
  return copyInputFrame(createInputFrame(from.axes.length), from);
}

/** Is the button (0 to 31) down at this step? */
export function isHeld(frame: SampledInput, button: number): boolean {
  return (frame.held & buttonMask(button)) !== 0;
}

/** Did the button (0 to 31) go down since the previous step? True for a tap of any length. */
export function wasPressed(frame: SampledInput, button: number): boolean {
  return (frame.pressed & buttonMask(button)) !== 0;
}

/** Did the button (0 to 31) go up since the previous step? */
export function wasReleased(frame: SampledInput, button: number): boolean {
  return (frame.released & buttonMask(button)) !== 0;
}

export interface InputBufferOptions {
  /** How many axes each controller reports (2 for one stick). Default 2. */
  axisCount?: number;
  /**
   * REQUIRED, from the protocol. How many distinct sequence numbers there are before they
   * wrap around: 65536 for a 16-bit field. A number is "newer" when it is less than half the
   * range ahead. 0 means the numbers never wrap; only say so if that is true.
   */
  seqModulus: number;
  /**
   * REQUIRED, from the protocol. A controller that is holding a button or an axis and has
   * had no new packet for this many steps is returned to rest (its buttons are released).
   * It must be longer than the gap between a phone's packets while something is held.
   * 0 turns this off.
   */
  staleAfterSteps: number;
}

/**
 * What became of a packet.
 * - `applied`: newest so far; applied now or queued behind a repeated edge.
 * - `late`: older than the newest, but it filled a gap; used only to recover edges.
 * - `stale`: a repeat, or too old to place. Ignored.
 * - `unknown`: no such controller. Ignored.
 * - `invalid`: the sequence number is not a whole number in range. Ignored.
 */
export type ReceiveResult = 'applied' | 'late' | 'stale' | 'unknown' | 'invalid';

export interface InputBuffer<Id> {
  readonly axisCount: number;
  /** Starts tracking a controller, at rest. Does nothing if it is already tracked. */
  add(id: Id): void;
  /**
   * Stops tracking a controller. Its frame disappears from the next `sample`. NO RELEASE IS
   * DELIVERED for anything it was holding: rules must treat a controller with no frame as
   * holding nothing.
   */
  remove(id: Id): void;
  has(id: Id): boolean;
  /**
   * FOR A NEW DATA CHANNEL ONLY. Puts a controller back to rest and forgets its sequence
   * numbers, so a phone that reconnects and starts counting from 0 again is heard. Whatever
   * the simulation last saw held is reported as released on the next step; presses and
   * releases that arrived since that sample are forgotten. A button the player is still
   * holding therefore reads as a release, then a new press when the new channel's first
   * packet arrives. Not for resuming from a pause: use `discardEdges`.
   */
  reset(id: Id): void;
  /**
   * FOR RESUMING FROM A PAUSE. Call before the first step after the pause, for one controller
   * or (with no argument) all of them. Replaces whatever edges piled up with the net change
   * since the simulation last looked: a button down now that was not down then is `pressed`,
   * one that was down then and is not now is `released`, and anything that went down and up
   * (or up and down) wholly in between leaves no trace. Sequence numbers are kept: a packet
   * older than the newest one received before this call is ignored when it turns up later,
   * but one still in flight (newer than anything received) is applied as new.
   */
  discardEdges(id?: Id): void;
  /**
   * Takes one packet. `buttons` is the bitmask of everything down; `axes` (optional) is
   * copied, with missing or non-finite values read as 0 and the rest clamped to -1..1.
   */
  receive(id: Id, seq: number, buttons: number, axes?: ArrayLike<number>): ReceiveResult;
  /**
   * Call exactly once per simulation step, just before it. Returns one frame per controller,
   * in the order controllers were added. THE MAP AND ITS FRAMES ARE REUSED: they are
   * overwritten by the next call, so copy (`copyFrame`, `cloneState`) anything kept.
   */
  sample(): ReadonlyMap<Id, SampledInput>;
}

// How many recent packets are remembered per controller for placing a late one.
const HISTORY = 8;

// Wait cap is primary; 256 preallocated entries bound memory even without sampling.
// Reaching this safety bound collapses immediately, rather than replaying an old prefix.
const DEFERRED_TICKS = 256;
const MAX_WAIT_SAMPLES = 4;

interface Slot {
  lastSeq: number;
  suppressed: number;
  queued: number;
  queueSeq: number[];
  queueWait: number[];
  queueButtons: number[];
  queueAxes: number[];
  scratchAxes: number[];
  buttons: number;
  pendingPressed: number;
  pendingReleased: number;
  axes: number[];
  /** What the simulation was last told is held. Private: not the frame handed to game code. */
  lastSampledHeld: number;
  /** Steps sampled since a packet was applied; -1 while nothing has been heard. */
  silentSteps: number;
  historySeq: number[];
  historyButtons: number[];
  historyCount: number;
  /** True while the history still reaches back to when the controller was last at rest. */
  historyFromRest: boolean;
  frame: InputFrame;
}

function clampAxis(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  if (value > 1) return 1;
  if (value < -1) return -1;
  return value;
}

export function createInputBuffer<Id>(options: InputBufferOptions): InputBuffer<Id> {
  // Typed as required; read as possibly missing so untyped callers get a clear error too.
  const given = options as Partial<InputBufferOptions> | undefined;
  const axisCount = given?.axisCount ?? 2;
  const givenModulus = given?.seqModulus;
  const givenStale = given?.staleAfterSteps;
  if (givenModulus === undefined || givenStale === undefined) {
    throw new TypeError("createInputBuffer needs seqModulus and staleAfterSteps: pass the protocol's values");
  }
  const seqModulus: number = givenModulus;
  const staleAfterSteps: number = givenStale;
  if (!Number.isInteger(axisCount) || axisCount < 0) {
    throw new RangeError(`axisCount must be a whole number of at least 0, got ${String(axisCount)}`);
  }
  if (!Number.isSafeInteger(seqModulus) || seqModulus < 0 || seqModulus === 1) {
    throw new RangeError(`seqModulus must be 0 or a whole number of at least 2, got ${String(seqModulus)}`);
  }
  if (!Number.isInteger(staleAfterSteps) || staleAfterSteps < 0) {
    throw new RangeError(`staleAfterSteps must be a whole number of at least 0, got ${String(staleAfterSteps)}`);
  }

  const slots = new Map<Id, Slot>();
  const frames = new Map<Id, InputFrame>();
  // The same slots as an array, which `sample` walks every step.
  let slotList: Slot[] = [];

  /** How far `a` is ahead of `b`: above 0 means newer, 0 the same, below 0 older. */
  function ahead(a: number, b: number): number {
    if (seqModulus === 0) return a - b;
    const distance = (((a - b) % seqModulus) + seqModulus) % seqModulus;
    return distance * 2 >= seqModulus ? distance - seqModulus : distance;
  }

  function remember(slot: Slot, index: number, seq: number, buttons: number): void {
    // Insert at `index`, keeping the list oldest-first; when full, the oldest falls off.
    let at = index;
    if (slot.historyCount === HISTORY) {
      if (at === 0) {
        // The newcomer is the oldest and the list is full: it is the one that falls off.
        slot.historyFromRest = false;
        return;
      }
      for (let i = 1; i < HISTORY; i += 1) {
        slot.historySeq[i - 1] = slot.historySeq[i] ?? 0;
        slot.historyButtons[i - 1] = slot.historyButtons[i] ?? 0;
      }
      slot.historyCount -= 1;
      slot.historyFromRest = false;
      at -= 1;
    }
    for (let i = slot.historyCount; i > at; i -= 1) {
      slot.historySeq[i] = slot.historySeq[i - 1] ?? 0;
      slot.historyButtons[i] = slot.historyButtons[i - 1] ?? 0;
    }
    slot.historySeq[at] = seq;
    slot.historyButtons[at] = buttons;
    slot.historyCount += 1;
  }

  function rest(slot: Slot): void {
    slot.pendingReleased |= slot.buttons;
    slot.buttons = 0;
    slot.axes.fill(0);
    slot.historyCount = 0;
    slot.historyFromRest = false;
  }

  function receiveLate(slot: Slot, seq: number, buttons: number, coalesce = false): ReceiveResult | 'blocked' {
    // Find the remembered packets either side of this one.
    let index = 0;
    while (index < slot.historyCount) {
      const distance = ahead(slot.historySeq[index] ?? 0, seq);
      if (distance === 0) return 'stale';
      if (distance > 0) break;
      index += 1;
    }
    if (index === slot.historyCount) return 'stale';
    // Older than everything remembered: placeable only if nothing has been forgotten, in
    // which case what came before it is the controller at rest.
    if (index === 0 && !slot.historyFromRest) return 'stale';
    const before = index === 0 ? 0 : (slot.historyButtons[index - 1] ?? 0);
    const after = slot.historyButtons[index] ?? 0;
    // Already counted: the changes straight from `before` to `after`. New with this packet:
    // a button up on both sides but down here (a tap), or down on both sides but up here.
    const flickered = (~before & buttons & ~after) | (before & ~buttons & after);
    // A late UP between two DOWN states proves a real re-press even after silence.
    const rearmed = slot.suppressed & ~buttons;
    const pressed = flickered & (~slot.suppressed | rearmed);
    if (!coalesce && ((pressed & slot.pendingPressed) !== 0 || (flickered & slot.pendingReleased) !== 0)) {
      return 'blocked';
    }
    slot.pendingPressed |= pressed;
    slot.suppressed &= buttons;
    slot.pendingReleased |= flickered;
    remember(slot, index, seq, buttons);
    return 'late';
  }

  function apply(
    slot: Slot,
    seq: number,
    buttons: number,
    axes?: ArrayLike<number>,
    coalesce = false,
  ): ReceiveResult | 'blocked' {
    const down = buttons >>> 0;
    if (slot.lastSeq >= 0) {
      const distance = ahead(seq, slot.lastSeq);
      if (distance === 0) return 'stale';
      if (distance < 0) return receiveLate(slot, seq, down, coalesce);
    }
    const changed = down ^ slot.buttons;
    const pressed = changed & down & ~slot.suppressed;
    const released = changed & ~down;
    if (!coalesce && ((pressed & slot.pendingPressed) !== 0 || (released & slot.pendingReleased) !== 0)) {
      return 'blocked';
    }
    slot.suppressed &= down;
    slot.pendingPressed |= pressed;
    slot.pendingReleased |= changed & ~down;
    slot.buttons = down;
    for (let i = 0; i < axisCount; i += 1) slot.axes[i] = clampAxis(axes?.[i]);
    slot.lastSeq = seq;
    slot.silentSteps = 0;
    remember(slot, slot.historyCount, seq, down);
    return 'applied';
  }

  function drain(slot: Slot, mode: 'normal' | 'collapse' | 'discard'): void {
    let consumed = 0;
    while (consumed < slot.queued) {
      // Reuse a scratch array allocated with the slot, rather than slicing the queue.
      for (let i = 0; i < axisCount; i += 1) {
        slot.scratchAxes[i] = slot.queueAxes[consumed * axisCount + i] ?? 0;
      }
      if (mode === 'discard') {
        slot.pendingPressed = 0;
        slot.pendingReleased = 0;
      }
      const result = apply(
        slot,
        slot.queueSeq[consumed] ?? 0,
        slot.queueButtons[consumed] ?? 0,
        slot.scratchAxes,
        mode === 'collapse',
      );
      if (result === 'blocked') break;
      consumed += 1;
    }
    for (let i = consumed; i < slot.queued; i += 1) {
      slot.queueWait[i - consumed] = slot.queueWait[i] ?? 0;
      slot.queueSeq[i - consumed] = slot.queueSeq[i] ?? 0;
      slot.queueButtons[i - consumed] = slot.queueButtons[i] ?? 0;
      for (let axis = 0; axis < axisCount; axis += 1) {
        slot.queueAxes[(i - consumed) * axisCount + axis] =
          slot.queueAxes[i * axisCount + axis] ?? 0;
      }
    }
    slot.queued -= consumed;
  }

  function collapse(slot: Slot): void {
    drain(slot, 'collapse');
    forgetHistory(slot);
  }

  function forgetHistory(slot: Slot): void {
    if (slot.historyCount > 0) {
      slot.historySeq[0] = slot.lastSeq;
      slot.historyButtons[0] = slot.buttons;
      slot.historyCount = 1;
    }
    slot.historyFromRest = false;
  }

  return {
    axisCount,
    add(id) {
      if (slots.has(id)) return;
      const frame = createInputFrame(axisCount);
      const slot: Slot = {
        lastSeq: -1,
        suppressed: 0,
        queued: 0,
        queueSeq: new Array<number>(DEFERRED_TICKS).fill(0),
        queueWait: new Array<number>(DEFERRED_TICKS).fill(0),
        queueButtons: new Array<number>(DEFERRED_TICKS).fill(0),
        queueAxes: new Array<number>(DEFERRED_TICKS * axisCount).fill(0),
        scratchAxes: new Array<number>(axisCount).fill(0),
        buttons: 0,
        pendingPressed: 0,
        pendingReleased: 0,
        axes: new Array<number>(axisCount).fill(0),
        lastSampledHeld: 0,
        silentSteps: -1,
        historySeq: new Array<number>(HISTORY).fill(0),
        historyButtons: new Array<number>(HISTORY).fill(0),
        historyCount: 0,
        historyFromRest: true,
        frame,
      };
      slots.set(id, slot);
      slotList.push(slot);
      frames.set(id, frame);
    },
    remove(id) {
      const slot = slots.get(id);
      if (slot === undefined) return;
      slots.delete(id);
      frames.delete(id);
      slotList = slotList.filter((other) => other !== slot);
    },
    has(id) {
      return slots.has(id);
    },
    reset(id) {
      const slot = slots.get(id);
      if (slot === undefined) return;
      rest(slot);
      slot.queued = 0;
      slot.suppressed = 0;
      // Edges not yet sampled are forgotten. The simulation is told of the release of exactly
      // what it last saw held, and of nothing it never saw.
      slot.pendingPressed = 0;
      slot.pendingReleased = slot.lastSampledHeld;
      slot.historyFromRest = true;
      slot.lastSeq = -1;
      slot.silentSteps = -1;
    },
    discardEdges(id) {
      for (const slot of slotList) {
        if (id !== undefined && slots.get(id) !== slot) continue;
        drain(slot, 'discard');
        slot.pendingPressed = slot.buttons & ~slot.lastSampledHeld & ~slot.suppressed;
        slot.pendingReleased = slot.lastSampledHeld & ~slot.buttons;
        forgetHistory(slot);
      }
    },
    receive(id, seq, buttons, axes) {
      const slot = slots.get(id);
      if (slot === undefined) return 'unknown';
      if (!Number.isSafeInteger(seq) || seq < 0 || (seqModulus !== 0 && seq >= seqModulus)) {
        return 'invalid';
      }
      if (seq === slot.lastSeq) return 'stale';
      for (let i = 0; i < slot.historyCount; i += 1) {
        if (slot.historySeq[i] === seq) return 'stale';
      }
      if (slot.queued === 0) {
        const result = apply(slot, seq, buttons, axes);
        if (result !== 'blocked') return result;
      }
      for (let i = 0; i < slot.queued; i += 1) {
        if (slot.queueSeq[i] === seq) return 'stale';
      }
      if (slot.queued === DEFERRED_TICKS) collapse(slot);
      if (slot.queued === 0) {
        const result = apply(slot, seq, buttons, axes);
        if (result !== 'blocked') return result;
      }
      const at = slot.queued;
      slot.queueWait[at] = 0;
      slot.queueSeq[at] = seq;
      slot.queueButtons[at] = buttons >>> 0;
      for (let i = 0; i < axisCount; i += 1) {
        slot.queueAxes[at * axisCount + i] = clampAxis(axes?.[i]);
      }
      slot.queued = Math.min(slot.queued + 1, DEFERRED_TICKS);
      return slot.lastSeq < 0 || ahead(seq, slot.lastSeq) > 0 ? 'applied' : 'late';
    },
    sample() {
      for (const slot of slotList) {
        if (staleAfterSteps > 0 && slot.silentSteps >= staleAfterSteps) {
          let active = slot.buttons !== 0;
          for (let i = 0; i < axisCount && !active; i += 1) active = slot.axes[i] !== 0;
          if (active) {
            slot.suppressed |= slot.buttons;
            rest(slot);
          }
        }
        let expired = false;
        for (let i = 0; i < slot.queued; i += 1) {
          if ((slot.queueWait[i] ?? 0) >= MAX_WAIT_SAMPLES) expired = true;
        }
        if (expired) collapse(slot);
        else drain(slot, 'normal');
        for (let i = 0; i < slot.queued; i += 1) {
          slot.queueWait[i] = (slot.queueWait[i] ?? 0) + 1;
        }
        const frame = slot.frame;
        frame.held = slot.buttons;
        slot.lastSampledHeld = slot.buttons;
        frame.pressed = slot.pendingPressed >>> 0;
        frame.released = slot.pendingReleased >>> 0;
        for (let i = 0; i < axisCount; i += 1) frame.axes[i] = slot.axes[i] ?? 0;
        frame.seq = slot.lastSeq;
        frame.age = slot.silentSteps;
        slot.pendingPressed = 0;
        slot.pendingReleased = 0;
        if (slot.silentSteps >= 0) slot.silentSteps += 1;
      }
      return frames;
    },
  };
}
