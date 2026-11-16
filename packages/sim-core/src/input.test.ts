import { describe, expect, it } from 'vitest';

import {
  buttonMask,
  copyFrame,
  copyInputFrame,
  createInputBuffer,
  createInputFrame,
  isHeld,
  normaliseAxes,
  wasPressed,
  wasReleased,
} from './input';
import type { InputBuffer, InputBufferOptions, InputFrame, SampledInput } from './input';
import { createRng, nextChance, nextInt, shuffle } from './rng';

const A = 0b001;
const B = 0b010;
const C = 0b100;

/** Unless a test says otherwise: numbers that never wrap, and half a second of silence. */
const BASE: InputBufferOptions = { seqModulus: 0, staleAfterSteps: 30 };

function one(options: Partial<InputBufferOptions> = {}): InputBuffer<string> {
  const buffer = createInputBuffer<string>({ ...BASE, ...options });
  buffer.add('p1');
  return buffer;
}

/** Samples one step and returns a copy of p1's frame. */
function step(buffer: InputBuffer<string>): InputFrame {
  const frame = buffer.sample().get('p1');
  if (frame === undefined) throw new Error('no frame for p1');
  return copyFrame(frame);
}

describe('latest state wins', () => {
  it('starts at rest', () => {
    const buffer = one();
    expect(step(buffer)).toEqual({ held: 0, pressed: 0, released: 0, axes: [0, 0], seq: -1, age: -1 });
    expect(step(buffer).age).toBe(-1);
    expect(createInputFrame(2)).toEqual({ held: 0, pressed: 0, released: 0, axes: [0, 0], seq: -1, age: -1 });
  });

  it('reports a press once, then held, then a release once', () => {
    const buffer = one();
    expect(buffer.receive('p1', 0, A)).toBe('applied');
    expect(step(buffer)).toMatchObject({ held: A, pressed: A, released: 0 });
    buffer.receive('p1', 1, A);
    expect(step(buffer)).toMatchObject({ held: A, pressed: 0, released: 0 });
    expect(step(buffer)).toMatchObject({ held: A, pressed: 0, released: 0 });
    buffer.receive('p1', 2, 0);
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: A });
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
  });

  it('uses the newest of several packets in one step', () => {
    const buffer = one();
    buffer.receive('p1', 0, A, [0.1, 0]);
    buffer.receive('p1', 1, A | B, [0.5, 0]);
    buffer.receive('p1', 2, B, [1, -1]);
    expect(step(buffer)).toEqual({ held: B, pressed: A | B, released: A, axes: [1, -1], seq: 2, age: 0 });
  });

  it('ignores a repeated packet', () => {
    const buffer = one();
    buffer.receive('p1', 0, A);
    step(buffer);
    expect(buffer.receive('p1', 0, A)).toBe('stale');
    expect(buffer.receive('p1', 0, 0)).toBe('stale');
    expect(step(buffer)).toMatchObject({ held: A, pressed: 0, released: 0 });
  });

  it('survives every packet being sent three times', () => {
    const buffer = one();
    const frames: InputFrame[] = [];
    [A, A, 0, 0, B, 0].forEach((buttons, seq) => {
      for (let copy = 0; copy < 3; copy += 1) buffer.receive('p1', seq, buttons);
      frames.push(step(buffer));
    });
    expect(frames.map((frame) => [frame.held, frame.pressed, frame.released])).toEqual([
      [A, A, 0],
      [A, 0, 0],
      [0, 0, A],
      [0, 0, 0],
      [B, B, 0],
      [0, 0, B],
    ]);
  });

  it('never lets an older packet change what is held or the axes', () => {
    const buffer = one();
    buffer.receive('p1', 1, 0, [0, 0]);
    buffer.receive('p1', 5, B, [0.5, 0.5]);
    step(buffer);
    expect(buffer.receive('p1', 3, A | C, [-1, -1])).toBe('late');
    const frame = step(buffer);
    expect(frame.held).toBe(B);
    expect(frame.axes).toEqual([0.5, 0.5]);
    expect(frame.seq).toBe(5);
  });

  it('accepts a jump in sequence numbers (packets lost in between)', () => {
    const buffer = one();
    buffer.receive('p1', 0, 0);
    expect(buffer.receive('p1', 500, A)).toBe('applied');
    expect(step(buffer)).toMatchObject({ held: A, pressed: A, seq: 500 });
  });
});

describe('taps are not missed', () => {
  it('reports a tap that starts and ends inside one step', () => {
    const buffer = one();
    buffer.receive('p1', 0, A);
    buffer.receive('p1', 1, 0);
    const frame = step(buffer);
    expect(frame).toMatchObject({ held: 0, pressed: A, released: A });
    expect(wasPressed(frame, 0)).toBe(true);
    expect(wasReleased(frame, 0)).toBe(true);
    expect(isHeld(frame, 0)).toBe(false);
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
  });

  it('reports release-then-press inside one step while the button stays held', () => {
    const buffer = one();
    buffer.receive('p1', 0, A);
    step(buffer);
    buffer.receive('p1', 1, 0);
    buffer.receive('p1', 2, A);
    expect(step(buffer)).toMatchObject({ held: A, pressed: A, released: A });
  });

  it('reports a press when the packets before it were lost', () => {
    const buffer = one();
    // seq 0 to 6 never arrive; the first thing heard is the button already down.
    buffer.receive('p1', 7, B);
    expect(step(buffer)).toMatchObject({ held: B, pressed: B, released: 0 });
  });

  it('recovers a tap whose press arrives after its release (reordering)', () => {
    const buffer = one();
    buffer.receive('p1', 0, 0);
    step(buffer);
    // The phone sent: seq 1 A down, seq 2 all up. They arrive the other way round.
    expect(buffer.receive('p1', 2, 0)).toBe('applied');
    expect(buffer.receive('p1', 1, A)).toBe('late');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: A, released: A });
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
  });

  it('recovers a reordered tap even when it is the very first thing a phone sends', () => {
    const buffer = one();
    buffer.receive('p1', 1, 0);
    expect(buffer.receive('p1', 0, A)).toBe('late');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: A, released: A });
  });

  it('reports a reordered tap on the next step when it arrives after its step', () => {
    const buffer = one();
    buffer.receive('p1', 0, 0);
    buffer.receive('p1', 2, 0);
    expect(step(buffer)).toMatchObject({ pressed: 0, released: 0 });
    buffer.receive('p1', 1, A);
    expect(step(buffer)).toMatchObject({ held: 0, pressed: A, released: A });
  });

  it('does not invent a second press from a late packet inside one hold', () => {
    const buffer = one();
    buffer.receive('p1', 0, A);
    buffer.receive('p1', 2, A);
    expect(step(buffer)).toMatchObject({ held: A, pressed: A, released: 0 });
    expect(buffer.receive('p1', 1, A)).toBe('late');
    buffer.receive('p1', 4, 0);
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: A });
    // seq 3 (still down) turns up after the release: it is part of the same hold.
    expect(buffer.receive('p1', 3, A)).toBe('late');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
  });

  it('counts a late packet only once', () => {
    const buffer = one();
    buffer.receive('p1', 0, 0);
    buffer.receive('p1', 2, 0);
    expect(buffer.receive('p1', 1, A)).toBe('late');
    step(buffer);
    expect(buffer.receive('p1', 1, A)).toBe('stale');
    expect(step(buffer)).toMatchObject({ pressed: 0, released: 0 });
  });

  it('drops a late packet too old to place, without inventing a press', () => {
    const buffer = one();
    for (let seq = 10; seq < 30; seq += 1) buffer.receive('p1', seq, 0);
    step(buffer);
    // Older than everything remembered. A was in fact held all through seq 0 to 9 and
    // released at 10, so a press here would be wrong.
    expect(buffer.receive('p1', 5, A)).toBe('stale');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
  });

  it('places late packets correctly when the history is exactly full', () => {
    const buffer = one();
    // Eight packets remembered, none forgotten yet; then one older than all of them.
    for (let seq = 1; seq <= 8; seq += 1) buffer.receive('p1', seq, 0);
    expect(buffer.receive('p1', 0, A)).toBe('late');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: A, released: A });
    // That used up the "nothing forgotten" guarantee.
    expect(buffer.receive('p1', 0, A)).toBe('stale');
    for (let seq = 10; seq <= 30; seq += 2) buffer.receive('p1', seq, 0);
    expect(buffer.receive('p1', 29, B)).toBe('late');
    expect(buffer.receive('p1', 27, C)).toBe('late');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: B | C, released: B | C });
  });
});

describe('no stuck buttons', () => {
  it('releases a button when its release packet is lost but a later state arrives', () => {
    const buffer = one();
    buffer.receive('p1', 0, A | B);
    expect(step(buffer)).toMatchObject({ held: A | B, pressed: A | B });
    // seq 1 (A released, B still down) is lost. seq 2 says the same thing.
    buffer.receive('p1', 2, B);
    expect(step(buffer)).toMatchObject({ held: B, pressed: 0, released: A });
    // seq 3, 4, 5 are the "all released" message sent three times; only the last arrives.
    buffer.receive('p1', 5, 0);
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: B });
  });

  it('is not re-pressed by an old "down" packet arriving after the release', () => {
    const buffer = one();
    buffer.receive('p1', 0, A);
    buffer.receive('p1', 1, A);
    step(buffer);
    buffer.receive('p1', 3, 0);
    expect(step(buffer)).toMatchObject({ held: 0, released: A });
    buffer.receive('p1', 2, A);
    buffer.receive('p1', 1, A);
    buffer.receive('p1', 0, A);
    for (let i = 0; i < 5; i += 1) expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
  });

  it('releases everything when a controller goes silent while holding', () => {
    const buffer = one({ staleAfterSteps: 30 });
    buffer.receive('p1', 0, A | C, [1, 0]);
    for (let i = 0; i < 30; i += 1) {
      const frame = step(buffer);
      expect(frame.held).toBe(A | C);
      expect(frame.axes).toEqual([1, 0]);
      expect(frame.age).toBe(i);
    }
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: A | C, axes: [0, 0], age: 30 });
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0, axes: [0, 0] });
    // The link comes back with A still down: that is a fresh press.
    buffer.receive('p1', 1, A);
    expect(step(buffer)).toMatchObject({ held: A, pressed: A, released: 0, age: 0 });
  });

  it('centres a stick left pushed over when a controller goes silent', () => {
    const buffer = one({ staleAfterSteps: 3 });
    buffer.receive('p1', 0, 0, [0, -1]);
    expect(step(buffer).axes).toEqual([0, -1]);
    step(buffer);
    step(buffer);
    expect(step(buffer)).toMatchObject({ held: 0, released: 0, axes: [0, 0] });
  });

  it('keeps a hold alive as long as packets keep coming, and leaves an idle controller alone', () => {
    const buffer = one({ staleAfterSteps: 3 });
    for (let seq = 0; seq < 100; seq += 1) {
      buffer.receive('p1', seq, A);
      expect(step(buffer).held).toBe(A);
    }
    buffer.receive('p1', 100, 0);
    for (let i = 0; i < 100; i += 1) expect(step(buffer)).toMatchObject({ held: 0, pressed: 0 });
  });

  it('does not treat packets from before a silence as taps afterwards', () => {
    const buffer = one({ staleAfterSteps: 2 });
    buffer.receive('p1', 5, A);
    step(buffer);
    step(buffer);
    expect(step(buffer)).toMatchObject({ held: 0, released: A });
    buffer.receive('p1', 9, 0);
    expect(buffer.receive('p1', 7, A)).toBe('stale');
    expect(buffer.receive('p1', 3, A)).toBe('stale');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
  });

  it('can have the silence rule turned off', () => {
    const buffer = one({ staleAfterSteps: 0 });
    buffer.receive('p1', 0, A);
    for (let i = 0; i < 1000; i += 1) expect(step(buffer).held).toBe(A);
  });

  it('reset releases what is held and hears a phone that restarts its numbering', () => {
    const buffer = one();
    buffer.receive('p1', 900, A | B, [1, 1]);
    step(buffer);
    buffer.reset('p1');
    // Nothing has been heard on the new channel: age is -1, not 0, until a packet arrives.
    expect(step(buffer)).toEqual({ held: 0, pressed: 0, released: A | B, axes: [0, 0], seq: -1, age: -1 });
    expect(step(buffer).age).toBe(-1);
    expect(buffer.receive('p1', 0, B)).toBe('applied');
    expect(step(buffer)).toMatchObject({ held: B, pressed: B, seq: 0, age: 0 });
    expect(step(buffer).age).toBe(1);
    buffer.reset('nobody');
  });
});

describe('sequence numbers that wrap', () => {
  it('treats 0 as newer than 65535 when the range is 65536', () => {
    const buffer = one({ seqModulus: 65536 });
    buffer.receive('p1', 65534, A);
    expect(buffer.receive('p1', 65535, A)).toBe('applied');
    expect(buffer.receive('p1', 0, 0)).toBe('applied');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: A, released: A, seq: 0 });
    expect(buffer.receive('p1', 65535, A)).toBe('stale');
    expect(buffer.receive('p1', 1, B)).toBe('applied');
    expect(step(buffer)).toMatchObject({ held: B, pressed: B });
  });

  it('recovers a reordered tap across the wrap', () => {
    const buffer = one({ seqModulus: 65536 });
    buffer.receive('p1', 65534, 0);
    buffer.receive('p1', 0, 0);
    expect(buffer.receive('p1', 65535, A)).toBe('late');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: A, released: A });
  });

  it('runs for many laps', () => {
    const buffer = one({ seqModulus: 256, staleAfterSteps: 0 });
    let presses = 0;
    for (let n = 0; n < 5000; n += 1) {
      expect(buffer.receive('p1', n % 256, n % 2 === 0 ? A : 0)).toBe('applied');
      presses += step(buffer).pressed === A ? 1 : 0;
    }
    expect(presses).toBe(2500);
  });

  it('rejects a number outside the range', () => {
    const buffer = one({ seqModulus: 256 });
    expect(buffer.receive('p1', 256, A)).toBe('invalid');
  });
});

describe('bad input and bookkeeping', () => {
  it('ignores packets for a controller it does not know', () => {
    const buffer = one();
    expect(buffer.receive('p2', 0, A)).toBe('unknown');
    expect(buffer.sample().size).toBe(1);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])('rejects the sequence number %s', (seq) => {
    const buffer = one();
    expect(buffer.receive('p1', seq, A)).toBe('invalid');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0 });
  });

  it('clamps axes, reads rubbish as 0, and fills in missing ones', () => {
    const buffer = one({ axisCount: 4 });
    buffer.receive('p1', 0, 0, [7, -7, Number.NaN]);
    expect(step(buffer).axes).toEqual([1, -1, 0, 0]);
    buffer.receive('p1', 1, 0, [0.25, Number.NEGATIVE_INFINITY, 0.5, -0.5, 99]);
    expect(step(buffer).axes).toEqual([0.25, 0, 0.5, -0.5]);
    buffer.receive('p1', 2, 0);
    expect(step(buffer).axes).toEqual([0, 0, 0, 0]);
  });

  it('handles all 32 buttons as an unsigned mask', () => {
    const buffer = one();
    buffer.receive('p1', 0, 0xffffffff);
    const frame = step(buffer);
    expect(frame.held).toBe(4294967295);
    expect(frame.pressed).toBe(4294967295);
    expect(isHeld(frame, 31)).toBe(true);
    expect(wasPressed(frame, 31)).toBe(true);
    buffer.receive('p1', 1, -1 & ~(1 << 31));
    const next = step(buffer);
    expect(next.released).toBe(2147483648);
    expect(wasReleased(next, 31)).toBe(true);
    expect(isHeld(next, 31)).toBe(false);
    expect(buttonMask(31)).toBe(2147483648);
    expect(buttonMask(0)).toBe(1);
    for (const bad of [32, -1, 0.5, 33, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 32]) {
      expect(() => buttonMask(bad)).toThrow(RangeError);
      // Without the check, 32 would read button 0 and 0.5 would read button 0 too.
      expect(() => isHeld(frame, bad)).toThrow(RangeError);
      expect(() => wasPressed(frame, bad)).toThrow(RangeError);
      expect(() => wasReleased(frame, bad)).toThrow(RangeError);
    }
  });

  it('keeps controllers separate and in the order they were added', () => {
    const buffer = createInputBuffer<string>(BASE);
    buffer.add('p3');
    buffer.add('p1');
    buffer.add('p2');
    buffer.add('p1');
    buffer.receive('p1', 0, A);
    buffer.receive('p2', 0, B);
    const frames = buffer.sample();
    expect([...frames.keys()]).toEqual(['p3', 'p1', 'p2']);
    expect(frames.get('p1')?.held).toBe(A);
    expect(frames.get('p2')?.held).toBe(B);
    expect(frames.get('p3')?.held).toBe(0);
    buffer.remove('p1');
    buffer.remove('p1');
    expect(buffer.has('p1')).toBe(false);
    expect([...buffer.sample().keys()]).toEqual(['p3', 'p2']);
    expect(buffer.receive('p1', 1, A)).toBe('unknown');
  });

  it('reuses its map and frames between samples (so callers must copy what they keep)', () => {
    const buffer = one();
    const first = buffer.sample();
    const firstFrame = first.get('p1');
    buffer.receive('p1', 0, A);
    const second = buffer.sample();
    expect(second).toBe(first);
    expect(second.get('p1')).toBe(firstFrame);
    expect(firstFrame?.held).toBe(A);
  });

  it('copyInputFrame copies every field and resizes the axes', () => {
    const from: InputFrame = { held: 1, pressed: 2, released: 4, axes: [0.5, -0.5, 1], seq: 9, age: 3 };
    const into = createInputFrame(1);
    expect(copyInputFrame(into, from)).toBe(into);
    expect(into).toEqual(from);
    expect(into.axes).not.toBe(from.axes);
  });

  it.each([{ axisCount: -1 }, { axisCount: 1.5 }, { seqModulus: 1 }, { seqModulus: -4 }, { staleAfterSteps: -1 }])(
    'refuses the options %j',
    (options) => {
      expect(() => createInputBuffer({ ...BASE, ...options })).toThrow(RangeError);
    },
  );
});

describe('what game rules meet at the edges', () => {
  it('up then down again inside one step on a held button: held, pressed and released all set', () => {
    const buffer = one();
    buffer.receive('p1', 0, A);
    expect(step(buffer)).toMatchObject({ held: A, pressed: A, released: 0 });
    // The order was release, then press. It ends the step held.
    buffer.receive('p1', 1, 0);
    buffer.receive('p1', 2, A);
    expect(step(buffer)).toMatchObject({ held: A, pressed: A, released: A });
    expect(step(buffer)).toMatchObject({ held: A, pressed: 0, released: 0 });
  });

  it('two taps inside one step read as one', () => {
    const buffer = one();
    buffer.receive('p1', 0, A);
    buffer.receive('p1', 1, 0);
    buffer.receive('p1', 2, A);
    buffer.receive('p1', 3, 0);
    expect(step(buffer)).toMatchObject({ held: 0, pressed: A, released: A });
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
  });

  it('edges pile up while sample() is not called, and arrive on the next sample', () => {
    const buffer = one({ staleAfterSteps: 0 });
    // A pause: packets keep arriving, no steps run.
    buffer.receive('p1', 0, A);
    buffer.receive('p1', 1, 0);
    buffer.receive('p1', 2, B);
    buffer.receive('p1', 3, B | C);
    expect(step(buffer)).toMatchObject({ held: B | C, pressed: A | B | C, released: A });
  });

  it('a removed controller gets no release: its frame just stops appearing', () => {
    const buffer = one();
    buffer.receive('p1', 0, A);
    expect(step(buffer).held).toBe(A);
    buffer.remove('p1');
    expect(buffer.sample().get('p1')).toBeUndefined();
    expect(buffer.sample().size).toBe(0);
  });

  it('reset (new channel): a button still held reads as a release, then a new press', () => {
    const buffer = one();
    buffer.receive('p1', 40, A);
    expect(step(buffer)).toMatchObject({ held: A, pressed: A });
    buffer.reset('p1');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: A });
    buffer.receive('p1', 0, A);
    expect(step(buffer)).toMatchObject({ held: A, pressed: A, released: 0 });
  });

  it('reset reads what the game last saw from its own record, not from the frame it handed out', () => {
    const buffer = one({ staleAfterSteps: 0 });
    buffer.receive('p1', 0, A);
    const handedOut = buffer.sample().get('p1');
    // A game that casts away read-only and scribbles on its input cannot hide the release.
    (handedOut as InputFrame).held = 0;
    buffer.reset('p1');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: A });

    // And after a sample nobody looked at, "last seen" is that sample, not the one before.
    buffer.receive('p1', 0, B);
    buffer.sample();
    buffer.receive('p1', 1, C);
    buffer.reset('p1');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: B });
  });

  it('a reset (the old way to resume) drops the piled-up edges and releases only what the game last saw held', () => {
    const buffer = one({ staleAfterSteps: 0 });
    buffer.receive('p1', 0, C);
    expect(step(buffer)).toMatchObject({ held: C, pressed: C });
    // Paused. C is let go, A is tapped, B is pressed and kept down.
    buffer.receive('p1', 1, 0);
    buffer.receive('p1', 2, A);
    buffer.receive('p1', 3, 0);
    buffer.receive('p1', 4, B);
    buffer.reset('p1');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: C, seq: -1 });
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
    // B is still down on the phone; its next packet is a fresh press.
    buffer.receive('p1', 5, B);
    expect(step(buffer)).toMatchObject({ held: B, pressed: B, released: 0 });
  });

  it('reset on a controller the game never saw holding anything reports nothing', () => {
    const buffer = one();
    buffer.receive('p1', 0, A);
    buffer.reset('p1');
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
  });
});

describe('discardEdges: resuming from a pause', () => {
  /** A is held and seen by the game, then play pauses. */
  function pausedHoldingA(): { buffer: InputBuffer<string>; seq: number } {
    const buffer = one({ seqModulus: 65536, staleAfterSteps: 15 });
    buffer.receive('p1', 0, A);
    expect(step(buffer)).toMatchObject({ held: A, pressed: A });
    return { buffer, seq: 1 };
  }

  it('held all through the pause: no edges, still held, and the next heartbeat changes nothing', () => {
    const { buffer } = pausedHoldingA();
    for (let seq = 1; seq < 200; seq += 1) buffer.receive('p1', seq, A);
    buffer.discardEdges();
    expect(step(buffer)).toMatchObject({ held: A, pressed: 0, released: 0 });
    buffer.receive('p1', 200, A);
    expect(step(buffer)).toMatchObject({ held: A, pressed: 0, released: 0 });
  });

  it('released during the pause: exactly one released', () => {
    const { buffer } = pausedHoldingA();
    buffer.receive('p1', 1, A);
    buffer.receive('p1', 2, 0);
    buffer.receive('p1', 3, A);
    buffer.receive('p1', 4, 0);
    buffer.discardEdges();
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: A });
    expect(step(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
  });

  it('pressed during the pause and still held: exactly one pressed', () => {
    const { buffer } = pausedHoldingA();
    buffer.receive('p1', 1, A | B);
    buffer.receive('p1', 2, A);
    buffer.receive('p1', 3, A | B);
    buffer.discardEdges();
    expect(step(buffer)).toMatchObject({ held: A | B, pressed: B, released: 0 });
    expect(step(buffer)).toMatchObject({ held: A | B, pressed: 0, released: 0 });
  });

  it('a tap wholly inside the pause leaves nothing', () => {
    const { buffer } = pausedHoldingA();
    buffer.receive('p1', 1, A | C);
    buffer.receive('p1', 2, A);
    buffer.receive('p1', 3, A | C);
    buffer.receive('p1', 4, A);
    buffer.discardEdges();
    expect(step(buffer)).toMatchObject({ held: A, pressed: 0, released: 0 });
  });

  it('let go and pressed again inside the pause, held at both ends: nothing', () => {
    const { buffer } = pausedHoldingA();
    buffer.receive('p1', 1, 0);
    buffer.receive('p1', 2, A);
    buffer.discardEdges();
    expect(step(buffer)).toMatchObject({ held: A, pressed: 0, released: 0 });
  });

  it('a reordered packet from inside the pause arriving after it: no phantom press', () => {
    const { buffer } = pausedHoldingA();
    // During the pause the phone sent seq 1 (A), 2 (A and a tap of B), 3 (A). 2 is delayed.
    buffer.receive('p1', 1, A);
    buffer.receive('p1', 3, A);
    buffer.discardEdges();
    expect(buffer.receive('p1', 2, A | B)).toBe('stale');
    expect(step(buffer)).toMatchObject({ held: A, pressed: 0, released: 0 });
    // The same when the delayed packet arrives first after the resume and before a newer one.
    expect(buffer.receive('p1', 2, A | B)).toBe('stale');
    expect(buffer.receive('p1', 4, A)).toBe('applied');
    expect(step(buffer)).toMatchObject({ held: A, pressed: 0, released: 0, seq: 4 });
  });

  it('where reset gets a resume wrong, discardEdges gets it right', () => {
    const viaReset = pausedHoldingA().buffer;
    viaReset.receive('p1', 5, A);
    viaReset.reset('p1');
    const resetFrames = [step(viaReset)];
    // An old packet arrives first after the reset and is taken for the newest.
    viaReset.receive('p1', 3, A | B);
    viaReset.receive('p1', 6, A);
    resetFrames.push(step(viaReset));
    // A release and a press of A the player never made, and a press of B from the past.
    expect(resetFrames[0]).toMatchObject({ released: A });
    expect(resetFrames[1]).toMatchObject({ pressed: A | B });

    const viaDiscard = pausedHoldingA().buffer;
    viaDiscard.receive('p1', 5, A);
    viaDiscard.discardEdges();
    const discardFrames = [step(viaDiscard)];
    viaDiscard.receive('p1', 3, A | B);
    viaDiscard.receive('p1', 6, A);
    discardFrames.push(step(viaDiscard));
    for (const frame of discardFrames) expect(frame).toMatchObject({ held: A, pressed: 0, released: 0 });
  });

  it('works for one controller or all, keeps sequence numbers, and ignores an unknown id', () => {
    const buffer = createInputBuffer<string>(BASE);
    buffer.add('p1');
    buffer.add('p2');
    buffer.receive('p1', 7, A);
    buffer.receive('p1', 8, 0);
    buffer.receive('p2', 7, B);
    buffer.receive('p2', 8, 0);
    buffer.discardEdges('p1');
    buffer.discardEdges('nobody');
    const frames = buffer.sample();
    expect(frames.get('p1')).toMatchObject({ pressed: 0, released: 0, seq: 8 });
    expect(frames.get('p2')).toMatchObject({ pressed: B, released: B, seq: 8 });
    expect(buffer.receive('p1', 8, A)).toBe('stale');
    expect(buffer.receive('p1', 9, A)).toBe('applied');
    // Before anything has been heard it is harmless.
    const fresh = one();
    fresh.discardEdges();
    expect(fresh.receive('p1', 0, A)).toBe('applied');
    expect(step(fresh)).toMatchObject({ held: A, pressed: A });
  });

  it('is not fooled by a sample nobody used: edges are measured from the last sample', () => {
    const buffer = one({ staleAfterSteps: 0 });
    buffer.receive('p1', 0, A);
    buffer.sample();
    buffer.receive('p1', 1, A | B);
    buffer.sample();
    buffer.receive('p1', 2, B);
    buffer.discardEdges();
    expect(step(buffer)).toMatchObject({ held: B, pressed: 0, released: A });
  });
});

describe('normaliseAxes', () => {
  it('caps a diagonal at length 1 and keeps its direction', () => {
    const [x, y] = normaliseAxes(1, 1);
    expect(Math.hypot(x, y)).toBeCloseTo(1, 12);
    expect(x).toBeCloseTo(Math.SQRT1_2, 12);
    expect(y).toBeCloseTo(Math.SQRT1_2, 12);
    const [a, b] = normaliseAxes(-1, 0.5);
    expect(Math.hypot(a, b)).toBeCloseTo(1, 12);
    expect(b / a).toBeCloseTo(-0.5, 12);
  });

  it('makes every direction equally fast at full push', () => {
    for (let degrees = 0; degrees < 360; degrees += 5) {
      const angle = (degrees * Math.PI) / 180;
      // A square-gated stick pushed fully: the larger axis reads 1.
      const scale = 1 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
      const [x, y] = normaliseAxes(Math.cos(angle) * scale, Math.sin(angle) * scale);
      expect(Math.hypot(x, y)).toBeCloseTo(1, 12);
    }
  });

  it('leaves a vector inside the circle exactly as it is', () => {
    expect(normaliseAxes(0.3, -0.4)).toEqual([0.3, -0.4]);
    expect(normaliseAxes(0, 0)).toEqual([0, 0]);
    expect(normaliseAxes(1, 0)).toEqual([1, 0]);
    expect(normaliseAxes(0, -1)).toEqual([0, -1]);
    expect(normaliseAxes(0.6, 0.8)).toEqual([0.6, 0.8]);
  });

  it('reads rubbish as 0 and writes into the array it is given', () => {
    expect(normaliseAxes(Number.NaN, 0.5)).toEqual([0, 0.5]);
    expect(normaliseAxes(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)).toEqual([0, 0]);
    const out: [number, number] = [9, 9];
    expect(normaliseAxes(3, 4, out)).toBe(out);
    expect(out[0]).toBeCloseTo(0.6, 12);
    expect(out[1]).toBeCloseTo(0.8, 12);
  });

  it('is what a frame from the buffer needs: clamped axes alone leave a diagonal 1.41 long', () => {
    const buffer = one();
    buffer.receive('p1', 0, 0, [5, -5]);
    const frame = step(buffer);
    expect(Math.hypot(frame.axes[0] ?? 0, frame.axes[1] ?? 0)).toBeCloseTo(Math.SQRT2, 12);
    const [x, y] = normaliseAxes(frame.axes[0] ?? 0, frame.axes[1] ?? 0);
    expect(Math.hypot(x, y)).toBeCloseTo(1, 12);
  });
});

describe('sampled frames are borrowed', () => {
  it('a sampled frame cannot be stored in a writable slot (checked by the compiler)', () => {
    const buffer = one();
    buffer.receive('p1', 0, A, [1, 0]);
    const sampled = buffer.sample().get('p1');
    if (sampled === undefined) throw new Error('no frame');

    interface GameState {
      lastInput: InputFrame;
    }
    const state: GameState = { lastInput: createInputFrame(2) };
    // @ts-expect-error a SampledInput is read-only and must not be kept: copyFrame() it
    state.lastInput = sampled;
    // @ts-expect-error the same through a variable
    const kept: InputFrame = sampled;
    // @ts-expect-error fields cannot be written
    sampled.held = 0;
    // @ts-expect-error axes cannot be written
    sampled.axes[0] = 0;
    // @ts-expect-error nor may the map be taken as a writable one
    const map: Map<string, InputFrame> = buffer.sample();
    expect(kept).toBe(sampled);
    expect(map.size).toBe(1);

    // This is why it matters: the stored frame is overwritten by the next sample.
    buffer.receive('p1', 1, B, [-1, 0]);
    buffer.sample();
    expect(state.lastInput.held).toBe(B);

    // The right way.
    state.lastInput = copyFrame(sampled);
    buffer.receive('p1', 2, C, [0, 1]);
    buffer.sample();
    expect(state.lastInput).toMatchObject({ held: B, axes: [-1, 0] });

    // A writable frame may be passed where a read-only one is wanted (bots, tests).
    const view: SampledInput = createInputFrame(2);
    expect(isHeld(view, 0)).toBe(false);
  });

  it('copyFrame gives a separate, equal, writable frame', () => {
    const from: SampledInput = { held: 1, pressed: 2, released: 4, axes: [0.5, -0.5, 1], seq: 9, age: 3 };
    const copy = copyFrame(from);
    expect(copy).toEqual(from);
    expect(copy).not.toBe(from);
    expect(copy.axes).not.toBe(from.axes);
    copy.held = 7;
    copy.axes[0] = 0;
    expect(from.held).toBe(1);
    expect(from.axes[0]).toBe(0.5);
  });
});

describe('required options', () => {
  it('will not be made without seqModulus and staleAfterSteps', () => {
    // @ts-expect-error both are required
    expect(() => createInputBuffer()).toThrow(TypeError);
    // @ts-expect-error both are required
    expect(() => createInputBuffer({})).toThrow(/seqModulus and staleAfterSteps/);
    // @ts-expect-error staleAfterSteps is required
    expect(() => createInputBuffer({ seqModulus: 65536 })).toThrow(TypeError);
    // @ts-expect-error seqModulus is required
    expect(() => createInputBuffer({ staleAfterSteps: 15 })).toThrow(TypeError);
    expect(createInputBuffer({ seqModulus: 65536, staleAfterSteps: 15 }).axisCount).toBe(2);
  });

  it('with the 16-bit range, hears 65534, 65535, 0, 1, 2 (and shows what a wrong range does)', () => {
    const right = one({ seqModulus: 65536, staleAfterSteps: 15 });
    const wrong = one({ seqModulus: 0, staleAfterSteps: 15 });
    const packets: [number, number][] = [[65534, A], [65535, A], [0, 0], [1, B], [2, B]];
    for (const [seq, buttons] of packets) {
      expect(right.receive('p1', seq, buttons)).toBe('applied');
      wrong.receive('p1', seq, buttons);
    }
    expect(step(right)).toMatchObject({ held: B, seq: 2 });
    // Told the numbers never wrap, a buffer takes 0 for an old packet and stays on A.
    expect(step(wrong)).toMatchObject({ held: A, seq: 65535 });
  });

  it('follows a controller through three laps of 16-bit numbers under loss, repeats and reordering', () => {
    const rng = createRng(65536);
    const buffer = one({ seqModulus: 65536, staleAfterSteps: 0 });
    let truth = 0;
    let delayed: { n: number; buttons: number }[] = [];
    let newestN = -1;
    let newestButtons = 0;
    let applied = 0;
    let wraps = 0;
    for (let n = 0; n < 200_000; n += 1) {
      if (nextChance(rng, 0.1)) truth ^= 1 << nextInt(rng, 0, 2);
      const arriving = delayed;
      delayed = [];
      const packet = { n, buttons: truth };
      if (!nextChance(rng, 0.2)) {
        if (nextChance(rng, 0.2)) delayed.push(packet);
        else arriving.push(packet);
        if (nextChance(rng, 0.1)) arriving.push(packet);
      }
      shuffle(rng, arriving);
      for (const { n: sent, buttons } of arriving) {
        const result = buffer.receive('p1', sent % 65536, buttons);
        if (sent > newestN) {
          expect(result).toBe('applied');
          if (sent % 65536 < newestN % 65536) wraps += 1;
          newestN = sent;
          newestButtons = buttons;
          applied += 1;
        } else {
          expect(result === 'late' || result === 'stale').toBe(true);
        }
      }
      const frame = step(buffer);
      // Always exactly the newest packet delivered, before, across and after each wrap.
      if (frame.held !== newestButtons || frame.seq !== (newestN < 0 ? -1 : newestN % 65536)) {
        throw new Error(`lost track at packet ${String(n)}: held ${String(frame.held)}, newest ${String(newestButtons)}`);
      }
    }
    expect(wraps).toBe(3);
    expect(applied).toBeGreaterThan(150_000);
  });
});

describe('against a simulated bad link', () => {
  interface Packet {
    seq: number;
    buttons: number;
  }

  it('with duplication and reordering but no loss, sees every tap exactly once', () => {
    const rng = createRng(20261116);
    const buffer = one({ staleAfterSteps: 0 });
    let seq = 0;
    const taps = [0, 0, 0];
    const seen = [0, 0, 0];
    const releases = [0, 0, 0];
    for (let stepIndex = 0; stepIndex < 20_000; stepIndex += 1) {
      // Each step the phone may tap one button: one "down" packet, then "all released" three
      // times, all inside the step. The link shuffles them and repeats some.
      const packets: Packet[] = [];
      if (nextChance(rng, 0.4)) {
        const button = nextInt(rng, 0, 2);
        taps[button] = (taps[button] ?? 0) + 1;
        packets.push({ seq: seq++, buttons: 1 << button });
        for (let i = 0; i < 3; i += 1) packets.push({ seq: seq++, buttons: 0 });
      }
      const delivered = [...packets];
      for (const packet of packets) if (nextChance(rng, 0.3)) delivered.push(packet);
      shuffle(rng, delivered);
      for (const packet of delivered) buffer.receive('p1', packet.seq, packet.buttons);

      const frame = step(buffer);
      expect(frame.held).toBe(0);
      for (let button = 0; button < 3; button += 1) {
        if (wasPressed(frame, button)) seen[button] = (seen[button] ?? 0) + 1;
        if (wasReleased(frame, button)) releases[button] = (releases[button] ?? 0) + 1;
      }
    }
    expect(Math.min(...taps)).toBeGreaterThan(2000);
    expect(seen).toEqual(taps);
    expect(releases).toEqual(taps);
  });

  it('with heavy loss, duplication and reordering, never leaves a button stuck', () => {
    const rng = createRng(5150);
    const buffer = one({ staleAfterSteps: 0 });
    let seq = 0;
    let truth = 0;
    let inFlight: Packet[] = [];
    let heldSteps = 0;
    for (let stepIndex = 0; stepIndex < 30_000; stepIndex += 1) {
      // The player changes what is held now and then; the phone sends its state every step
      // while anything is down, and three "all released" packets when everything goes up.
      const before = truth;
      if (nextChance(rng, 0.2)) truth ^= 1 << nextInt(rng, 0, 2);
      if (truth !== 0) inFlight.push({ seq: seq++, buttons: truth });
      else if (before !== 0) for (let i = 0; i < 3; i += 1) inFlight.push({ seq: seq++, buttons: 0 });

      // The link: 30% lost, 20% repeated, 30% held back a step, the rest shuffled.
      const arriving: Packet[] = [];
      const later: Packet[] = [];
      for (const packet of inFlight) {
        if (nextChance(rng, 0.3)) continue;
        if (nextChance(rng, 0.3)) later.push(packet);
        else arriving.push(packet);
        if (nextChance(rng, 0.2)) arriving.push(packet);
      }
      inFlight = later;
      shuffle(rng, arriving);
      let newest = -1;
      for (const packet of arriving) {
        buffer.receive('p1', packet.seq, packet.buttons);
        newest = Math.max(newest, packet.seq);
      }

      const frame = step(buffer);
      // Whatever arrived, the held state is exactly the newest packet ever delivered.
      if (newest > frame.seq) throw new Error('a newer packet was not applied');
      // `held` only ever changes together with a matching edge.
      if (frame.held !== 0) heldSteps += 1;
    }
    expect(heldSteps).toBeGreaterThan(1000);

    // Play stops. One final "all released" gets through, as the protocol's repeats intend.
    buffer.receive('p1', seq + 10, 0);
    expect(step(buffer).held).toBe(0);
    // Stragglers from before arrive afterwards and change nothing.
    for (let old = seq - 40; old < seq; old += 1) buffer.receive('p1', old, 0b111);
    for (let i = 0; i < 10; i += 1) expect(step(buffer).held).toBe(0);
  });

  it('keeps held, pressed and released consistent step to step under any link', () => {
    const rng = createRng(77);
    const buffer = one({ staleAfterSteps: 5 });
    let seq = 0;
    let previousHeld = 0;
    for (let stepIndex = 0; stepIndex < 30_000; stepIndex += 1) {
      const count = nextInt(rng, 0, 3);
      for (let i = 0; i < count; i += 1) {
        // Sequence numbers wander forwards and backwards; buttons are arbitrary.
        seq = Math.max(0, seq + nextInt(rng, -4, 6));
        buffer.receive('p1', seq, nextInt(rng, 0, 7));
      }
      const frame = step(buffer);
      // A button that is down now and was not before was pressed; one that was down and is
      // not now was released. (Extra edges are allowed: taps and flickers.)
      const wentDown = frame.held & ~previousHeld;
      const wentUp = previousHeld & ~frame.held;
      expect(frame.pressed & wentDown).toBe(wentDown);
      expect(frame.released & wentUp).toBe(wentUp);
      // A button pressed but not released is down; released but not pressed is up.
      expect(frame.held & (frame.pressed & ~frame.released)).toBe(frame.pressed & ~frame.released);
      expect(frame.held & (frame.released & ~frame.pressed)).toBe(0);
      previousHeld = frame.held;
    }
  });
});
