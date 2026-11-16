import { describe, expect, it } from 'vitest';

import { copyFrame, createInputBuffer } from './input';
import type { InputBuffer } from './input';
import { createRng, nextInt } from './rng';

// Protocol constants are deliberately copied: this package has no protocol dependency.
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('missing test data');
  return value;
}

const SEQ_MODULO = 65536;
const INPUT_STALE_STEPS = 15;

function setup(staleAfterSteps = 0): InputBuffer<string> {
  const buffer = createInputBuffer<string>({ seqModulus: SEQ_MODULO, staleAfterSteps });
  buffer.add('p');
  return buffer;
}

function sample(buffer: InputBuffer<string>) {
  const frame = buffer.sample().get('p');
  if (frame === undefined) throw new Error('missing slot');
  return copyFrame(frame);
}

describe('carried input edges', () => {
  it('PERF-010 PERF-011 NET-005: press-release-press defers only the duplicate', () => {
    const buffer = setup();
    buffer.receive('p', 0, 1);
    buffer.receive('p', 1, 0);
    buffer.receive('p', 2, 1);
    expect(sample(buffer)).toMatchObject({ held: 0, pressed: 1, released: 1, seq: 1 });
    expect(sample(buffer)).toMatchObject({ held: 1, pressed: 1, released: 0, seq: 2 });
    expect(sample(buffer)).toMatchObject({ held: 1, pressed: 0, released: 0 });
  });

  it('NET-005: duplicate releases defer the whole tick, including other buttons and axes', () => {
    const buffer = setup();
    buffer.receive('p', 0, 1);
    sample(buffer);
    buffer.receive('p', 1, 0);
    buffer.receive('p', 2, 1);
    buffer.receive('p', 3, 2, [1, -1]);
    buffer.receive('p', 4, 0);
    expect(sample(buffer)).toMatchObject({ held: 1, pressed: 1, released: 1, axes: [0, 0] });
    expect(sample(buffer)).toMatchObject({ held: 0, pressed: 2, released: 3, axes: [0, 0] });
  });

  it('NET-005: loss recovery, duplicates and reordered frames across SEQ_MODULO', () => {
    const buffer = setup();
    // A surviving frame expands the ticks lost before it, oldest first.
    const ticks = [0, 1, 0, 1, 0];
    for (let i = 0; i < ticks.length; i += 1) {
      buffer.receive('p', (SEQ_MODULO - 2 + i) % SEQ_MODULO, ticks[i] ?? 0);
    }
    // An older frame arrives after it, carrying the same history.
    for (let i = 0; i < ticks.length - 1; i += 1) {
      buffer.receive('p', (SEQ_MODULO - 2 + i) % SEQ_MODULO, ticks[i] ?? 0);
    }
    expect(sample(buffer)).toMatchObject({ held: 0, pressed: 1, released: 1 });
    expect(sample(buffer)).toMatchObject({ held: 0, pressed: 1, released: 1, seq: 2 });
    expect(sample(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
  });

  it('NET-005: a late recovered tap waits behind an already pending tap', () => {
    const buffer = setup();
    buffer.receive('p', 0, 0);
    buffer.receive('p', 2, 0);
    buffer.receive('p', 3, 1);
    buffer.receive('p', 4, 0);
    buffer.receive('p', 1, 1);
    expect(sample(buffer)).toMatchObject({ pressed: 1, released: 1 });
    expect(sample(buffer)).toMatchObject({ pressed: 1, released: 1, held: 0, seq: 4 });
    expect(sample(buffer)).toMatchObject({ pressed: 0, released: 0 });
  });

  it('NET-005: silence suppression survives discardEdges until an UP tick', () => {
    const buffer = setup(INPUT_STALE_STEPS);
    buffer.receive('p', 0, 3);
    for (let i = 0; i < INPUT_STALE_STEPS; i += 1) sample(buffer);
    expect(sample(buffer)).toMatchObject({ held: 0, pressed: 0, released: 3 });
    buffer.receive('p', 1, 3);
    buffer.discardEdges();
    expect(sample(buffer)).toMatchObject({ held: 3, pressed: 0, released: 0 });
    buffer.receive('p', 2, 2);
    sample(buffer);
    buffer.receive('p', 3, 3);
    expect(sample(buffer)).toMatchObject({ held: 3, pressed: 1, released: 0 });
    buffer.receive('p', 4, 0);
    sample(buffer);
    buffer.receive('p', 5, 3);
    expect(sample(buffer)).toMatchObject({ held: 3, pressed: 3, released: 0 });
  });

  it('NET-005: reset clears queue/suppression; discardEdges uses queued net state', () => {
    const buffer = setup();
    buffer.receive('p', 0, 1);
    sample(buffer);
    buffer.receive('p', 1, 0);
    buffer.receive('p', 2, 1);
    buffer.receive('p', 3, 0);
    buffer.discardEdges('p');
    expect(sample(buffer)).toMatchObject({ held: 0, pressed: 0, released: 1, seq: 3 });
    buffer.receive('p', 4, 1);
    buffer.receive('p', 5, 0);
    buffer.receive('p', 6, 1);
    buffer.reset('p');
    buffer.receive('p', 0, 2);
    expect(sample(buffer)).toMatchObject({ held: 2, pressed: 2, released: 0, seq: 0 });
    expect(sample(buffer)).toMatchObject({ pressed: 0, released: 0 });
    const silent = setup(1);
    silent.receive('p', 0, 1);
    sample(silent);
    sample(silent);
    silent.reset('p');
    silent.receive('p', 0, 1);
    expect(sample(silent).pressed).toBe(1);
  });

  it('NET-005 PERF-010 PERF-011: bounded queue retains newest state beyond the 256-tick safety bound', () => {
    const buffer = setup();
    for (let seq = 0; seq < 600; seq += 1) {
      buffer.receive('p', seq, seq % 2 === 0 ? 1 : 0);
    }
    for (let i = 0; i <= 4; i += 1) sample(buffer);
    expect(sample(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0, seq: 599 });
  });

  it('NET-005: the same Map, frame and axes objects are reused', () => {
    const buffer = setup();
    const map = buffer.sample();
    const frame = map.get('p');
    const axes = frame?.axes;
    for (let round = 0; round < 100; round += 1) {
      for (let i = 0; i < 8; i += 1) {
        buffer.receive('p', round * 8 + i, i % 2);
      }
      for (let i = 0; i < 8; i += 1) {
        expect(buffer.sample()).toBe(map);
        expect(map.get('p')).toBe(frame);
        expect(map.get('p')?.axes).toBe(axes);
      }
    }
  });

  it('NET-005: late DOWN inside UP states after silence adds one tap without a phantom', () => {
    const buffer = setup(15);
    buffer.receive('p', 0, 1);
    for (let i = 0; i < 16; i++) sample(buffer);
    buffer.receive('p', 1, 0);
    buffer.receive('p', 3, 0);
    sample(buffer);
    expect(buffer.receive('p', 2, 1)).toBe('late');
    expect(sample(buffer)).toMatchObject({ held: 0, pressed: 1, released: 1 });
    expect(buffer.receive('p', 2, 1)).toBe('stale');
    expect(sample(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0 });
  });

  it('NET-005: nine-tick oldest-first protocol history queues no duplicate junk', () => {
    const buffer = setup();
    for (let newest = 0; newest < 100; newest++) {
      for (let seq = Math.max(0, newest - 8); seq <= newest; seq++) {
        expect(buffer.receive('p', seq, seq % 2)).toBe(seq === newest ? 'applied' : 'stale');
      }
      expect(sample(buffer)).toMatchObject({ seq: newest, held: newest % 2 });
    }
    expect(sample(buffer)).toMatchObject({ pressed: 0, released: 0, seq: 99 });
  });

  it('NET-005 D-068: collapse takes newest axes and held state by the fifth sample', () => {
    const buffer = setup();
    for (let seq = 0; seq < 73; seq++) buffer.receive('p', seq, seq % 2 === 0 ? 3 : 0, [seq / 100, -1]);
    for (let n = 0; n < 4; n++) sample(buffer);
    expect(sample(buffer)).toMatchObject({ held: 3, seq: 72, axes: [0.72, -1] });
    expect(sample(buffer)).toMatchObject({ held: 3, pressed: 0, released: 0 });
    buffer.receive('p', 73, 0);
    expect(sample(buffer)).toMatchObject({ held: 0, released: 3 });
  });

  it('NET-005 D-068: seeded stalls retain every kind of edge in the collapsed span', () => {
    const rng = createRng(68012);
    for (const ticks of [40, 259]) {
      for (let trial = 0; trial < 100; trial++) {
        const buffer = setup();
        // Four samples cannot exhaust this backlog; the fifth collapses it.
        // 259 ticks also reaches the receive-side 256-entry safety bound.
        let physical = 0;
        const tapAt = nextInt(rng, 12, ticks - 3);
        const timeline: number[] = [];
        for (let seq = 0; seq < ticks; seq++) {
          physical = (seq % 2 === 0 ? 1 : 0) | (seq === tapAt ? 2 : 0);
          timeline.push(physical);
          buffer.receive('p', seq, physical, [seq / ticks, 0]);
        }
        let bp = 0; let br = 0;
        for (let n = 0; n < 8; n++) {
          const frame = sample(buffer);
          if (frame.pressed & 2) bp++;
          if (frame.released & 2) br++;
          if (n === 4) {
            // Independent physical OR of transitions after the fourth sampled tick.
            const start = ticks === 40 ? 7 : 255;
            let down = 0; let up = 0;
            for (let seq = start + 1; seq < ticks; seq++) {
              const before = required(timeline[seq - 1]);
              const after = required(timeline[seq]);
              down |= after & ~before;
              up |= before & ~after;
            }
            if (ticks === 40) {
              expect(frame.pressed).toBe(down);
              expect(frame.released).toBe(up);
            }
            expect(frame.held).toBe(physical);
            expect(frame.axes[0]).toBeCloseTo((ticks - 1) / ticks);
          }
        }
        expect([bp, br]).toEqual([1, 1]);
      }
    }
  });

  it('NET-005: an UP inside collapse rearms a silence-suppressed button', () => {
    const buffer = setup(15);
    buffer.receive('p', 0, 1);
    for (let n = 0; n < 16; n++) sample(buffer);
    for (let seq = 1; seq <= 40; seq++) {
      buffer.receive('p', seq, (seq === 30 ? 0 : 1) | (seq % 2 === 0 ? 2 : 0));
    }
    for (let n = 0; n < 4; n++) expect(sample(buffer).pressed & 1).toBe(0);
    expect(sample(buffer)).toMatchObject({ held: 3, pressed: 3, released: 3, seq: 40 });
  });

  it('NET-005: pause discard drops a tap wholly inside a deep deferred span', () => {
    const buffer = setup();
    for (let seq = 0; seq < 40; seq++) {
      buffer.receive('p', seq, (seq % 2 === 0 ? 1 : 0) | (seq === 30 ? 2 : 0));
    }
    buffer.discardEdges();
    for (let n = 0; n < 8; n++) {
      expect(sample(buffer)).toMatchObject({ held: 0, pressed: 0, released: 0, seq: 39 });
    }
  });

  it('NET-005: physical timelines independently account for recovered edges across players', () => {
    const rng = createRng(20261116);
    const buffer = setup(15);
    buffer.add('q');
    // These are physical transitions, not a model of the implementation's pending ticks.
    const physical = ['p', 'q'].map((id) => ({
      id, seq: 0, events: [[], [], []] as { down: boolean; arrived: number }[][],
      state: 0, axis: 0, mask: 1, presses: 0, releases: 0,
    }));
    let step = 0;
    function check() {
      const frames = buffer.sample();
      for (const model of physical) {
        const frame = required(frames.get(model.id));
        for (let bit = 0; bit < 3; bit += 1) {
          const mask = 1 << bit;
          let down = (frame.pressed & mask) !== 0;
          let up = (frame.released & mask) !== 0;
          while (down || up) {
            const event = required(model.events[bit]).shift();
            expect(event, 'no phantom edge').toBeDefined();
            if (!event) throw new Error('phantom');
            expect(step - event.arrived).toBeLessThanOrEqual(4);
            if (event.down) {
              expect(down).toBe(true);
              expect(model.state & mask).toBe(0);
              model.state |= mask;
              model.presses++;
              down = false;
            } else {
              expect(up).toBe(true);
              expect(model.state & mask).toBe(mask);
              model.state &= ~mask;
              model.releases++;
              up = false;
            }
          }
        }
        expect(frame.held).toBe(model.state);
        if (model.events.every((events) => events.length === 0)) {
          expect(frame.held).toBe(0);
          expect(frame.axes[0]).toBeCloseTo(model.axis);
          expect(frame.axes[1]).toBeCloseTo(-model.axis);
        }
      }
      step++;
    }
    for (let window = 0; window < 400; window++) {
      for (const model of physical) {
        if (window % 2 === 0) model.mask = nextInt(rng, 1, 7);
        const mask = model.mask; // Several buttons may flip together.
        const axis = nextInt(rng, -10, 10) / 10;
        const base = model.seq;
        const ticks = [mask, 0, mask, 0];
        for (const buttons of ticks) {
          for (let bit = 0; bit < 3; bit++) {
            if (mask & (1 << bit)) required(model.events[bit]).push({ down: buttons !== 0, arrived: step });
          }
        }
        // Lose intermediate wire frames; recover history, sometimes the first DOWN late.
        const order = window % 4 === 2 ? [1, 2, 3, 0] : [0, 1, 2, 3];
        for (const offset of order) buffer.receive(model.id, base + offset, required(ticks[offset]), [axis, -axis]);
        for (const offset of [3, 1, 0, 2]) buffer.receive(model.id, base + offset, required(ticks[offset]), [axis, -axis]);
        model.seq += 4;
        model.axis = axis;
      }
      // Carry a queue into the next window; never require full drainage between windows.
      for (let n = 0; n < (window % 2 === 0 ? 1 : 3); n++) check();
      if (window % 40 === 39) {
        for (const model of physical) model.axis = 0;
        for (let n = 0; n < 16; n++) {
          const frames = buffer.sample();
          for (const model of physical) expect(required(frames.get(model.id)).held).toBe(0);
          step++;
        }
      }
    }
    for (let n = 0; n < 4; n++) check();
    for (const model of physical) {
      expect(model.events.every((events) => events.length === 0)).toBe(true);
      expect(model.presses).toBe(model.releases);
    }
  });
});
