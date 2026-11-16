import { describe, expect, it } from 'vitest';

import { createInputBuffer } from './input';
import {
  DEFAULT_MAX_CATCH_UP_STEPS,
  DEFAULT_STEP_MS,
  advanceClock,
  createSimLoop,
  createStepClock,
  resetClock,
  runSteps,
} from './timestep';

describe('advanceClock', () => {
  it('defaults to 60 steps a second with a cap of 6', () => {
    const clock = createStepClock();
    expect(clock.stepMs).toBe(1000 / 60);
    expect(clock.maxCatchUpSteps).toBe(6);
    expect(DEFAULT_MAX_CATCH_UP_STEPS * DEFAULT_STEP_MS).toBeCloseTo(100, 9);
  });

  it('gives exactly one step for each step of time, however long it runs', () => {
    const clock = createStepClock();
    for (let frame = 0; frame < 100_000; frame += 1) {
      expect(advanceClock(clock, DEFAULT_STEP_MS)).toBe(1);
    }
    expect(clock.totalDroppedMs).toBe(0);
    expect(clock.alpha).toBeLessThan(0.001);
  });

  it('banks time below a step and reports the fraction as alpha', () => {
    const clock = createStepClock({ stepMs: 10 });
    expect(advanceClock(clock, 4)).toBe(0);
    expect(clock.alpha).toBeCloseTo(0.4, 12);
    expect(advanceClock(clock, 4)).toBe(0);
    expect(clock.alpha).toBeCloseTo(0.8, 12);
    expect(advanceClock(clock, 4)).toBe(1);
    expect(clock.steps).toBe(1);
    expect(clock.alpha).toBeCloseTo(0.2, 12);
    expect(clock.accumulatorMs).toBeCloseTo(2, 12);
  });

  it('runs two steps a frame on a 30 frames-a-second display', () => {
    const clock = createStepClock();
    let total = 0;
    for (let frame = 0; frame < 300; frame += 1) {
      const steps = advanceClock(clock, 1000 / 30);
      expect(steps).toBe(2);
      total += steps;
    }
    expect(total).toBe(600);
  });

  it('simulates the same total whatever the frame pattern', () => {
    const patterns = [[16.6, 16.7, 16.8, 16.5, 16.9], [33.3, 33.4], [8.3, 8.4, 8.3], [5, 40, 12, 9.5, 21]];
    for (const pattern of patterns) {
      const clock = createStepClock();
      let elapsed = 0;
      let steps = 0;
      for (let frame = 0; frame < 5000; frame += 1) {
        const dt = pattern[frame % pattern.length] ?? 0;
        elapsed += dt;
        steps += advanceClock(clock, dt);
      }
      // Simulated time never runs ahead of real time and trails it by less than one step.
      expect(clock.totalDroppedMs).toBe(0);
      expect(steps).toBe(Math.floor((elapsed + 1e-6) / DEFAULT_STEP_MS));
      expect(clock.alpha).toBeGreaterThanOrEqual(0);
      expect(clock.alpha).toBeLessThan(1);
    }
  });

  it('caps catch-up after a stall and drops the rest', () => {
    const clock = createStepClock({ stepMs: 10, maxCatchUpSteps: 5 });
    expect(advanceClock(clock, 1234)).toBe(5);
    expect(clock.droppedMs).toBeCloseTo(1180, 9);
    expect(clock.accumulatorMs).toBeCloseTo(4, 9);
    expect(clock.alpha).toBeCloseTo(0.4, 9);
    // The stall is gone: the next ordinary frame is ordinary.
    expect(advanceClock(clock, 10)).toBe(1);
    expect(clock.droppedMs).toBe(0);
    expect(clock.totalDroppedMs).toBeCloseTo(1180, 9);
  });

  it('never spirals: with the cap, steps per advance are bounded for any input', () => {
    const clock = createStepClock();
    for (const elapsed of [1e3, 1e6, 1e12, Number.MAX_VALUE]) {
      expect(advanceClock(clock, elapsed)).toBe(DEFAULT_MAX_CATCH_UP_STEPS);
      expect(clock.accumulatorMs).toBeGreaterThanOrEqual(0);
      expect(clock.accumulatorMs).toBeLessThan(clock.stepMs);
      expect(clock.alpha).toBeGreaterThanOrEqual(0);
      expect(clock.alpha).toBeLessThan(1);
    }
  });

  it.each([-5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0])(
    'treats an elapsed time of %s as nothing',
    (elapsed) => {
      const clock = createStepClock({ stepMs: 10 });
      advanceClock(clock, 3);
      expect(advanceClock(clock, elapsed)).toBe(0);
      expect(clock.accumulatorMs).toBeCloseTo(3, 12);
      expect(clock.alpha).toBeCloseTo(0.3, 12);
    },
  );

  it('snaps display jitter to whole steps when asked to', () => {
    const jitter = [16.6, 16.8, 16.5, 16.9, 16.7, 16.4];
    const snapped = createStepClock({ snapToleranceMs: 1 });
    const exact = createStepClock();
    let unevenFrames = 0;
    for (let frame = 0; frame < 6000; frame += 1) {
      const dt = jitter[frame % jitter.length] ?? 0;
      expect(advanceClock(snapped, dt)).toBe(1);
      expect(snapped.alpha).toBeLessThan(0.001);
      if (advanceClock(exact, dt) !== 1) unevenFrames += 1;
    }
    // Without snapping the same frames do produce 0-step and 2-step frames.
    expect(unevenFrames).toBeGreaterThan(0);
    // Snapping also covers a 30 Hz frame, and leaves a far-off value alone.
    expect(advanceClock(snapped, 33.9)).toBe(2);
    expect(advanceClock(snapped, 8)).toBe(0);
    expect(snapped.accumulatorMs).toBeCloseTo(8, 6);
  });

  it('resetClock forgets banked time but keeps the running total of dropped time', () => {
    const clock = createStepClock({ stepMs: 10, maxCatchUpSteps: 2 });
    advanceClock(clock, 57);
    expect(clock.totalDroppedMs).toBeCloseTo(30, 9);
    resetClock(clock);
    expect(clock).toMatchObject({ accumulatorMs: 0, steps: 0, alpha: 0, droppedMs: 0 });
    expect(clock.totalDroppedMs).toBeCloseTo(30, 9);
    expect(advanceClock(clock, 9)).toBe(0);
    advanceClock(clock, 100);
    expect(clock.totalDroppedMs).toBeCloseTo(110, 9);
  });

  it.each([
    { stepMs: 0 },
    { stepMs: -1 },
    { stepMs: Number.NaN },
    { stepMs: Number.POSITIVE_INFINITY },
    { maxCatchUpSteps: 0 },
    { maxCatchUpSteps: 1.5 },
    { snapToleranceMs: -1 },
    { snapToleranceMs: 9 },
  ])('refuses the options %j', (options) => {
    expect(() => createStepClock(options)).toThrow(RangeError);
  });
});

interface Counter {
  ticks: number;
  sum: number;
  timeMs: number;
}

function addStep(state: Counter, input: number, dtMs: number): Counter {
  return { ticks: state.ticks + 1, sum: state.sum + input, timeMs: state.timeMs + dtMs };
}

describe('createSimLoop', () => {
  it('samples inputs once before each step, in order, and passes the fixed dt', () => {
    const log: string[] = [];
    const loop = createSimLoop<Counter, number>({
      stepMs: 10,
      initialState: { ticks: 0, sum: 0, timeMs: 0 },
      step(state, input, dtMs) {
        log.push(`step ${String(state.ticks)} input ${String(input)} dt ${String(dtMs)}`);
        return addStep(state, input, dtMs);
      },
      sampleInputs(tick) {
        log.push(`sample ${String(tick)}`);
        return tick * 100;
      },
      onStep(state, tick, input) {
        log.push(`after ${String(tick)} input ${String(input)} ticks ${String(state.ticks)}`);
      },
    });
    expect(loop.advance(25)).toBe(2);
    expect(log).toEqual([
      'sample 0',
      'step 0 input 0 dt 10',
      'after 0 input 0 ticks 1',
      'sample 1',
      'step 1 input 100 dt 10',
      'after 1 input 100 ticks 2',
    ]);
    expect(loop.tick).toBe(2);
    expect(loop.state).toEqual({ ticks: 2, sum: 100, timeMs: 20 });
    expect(loop.previousState).toEqual({ ticks: 1, sum: 0, timeMs: 10 });
    expect(loop.clock.alpha).toBeCloseTo(0.5, 12);
  });

  it('runs nothing when no step is due', () => {
    let calls = 0;
    const loop = createSimLoop<number, null>({
      stepMs: 10,
      initialState: 0,
      step: (state) => state + 1,
      sampleInputs: () => {
        calls += 1;
        return null;
      },
    });
    expect(loop.advance(9)).toBe(0);
    expect(calls).toBe(0);
    expect(loop.state).toBe(0);
    loop.stepOnce();
    expect(loop.state).toBe(1);
    expect(loop.tick).toBe(1);
  });

  it('when a step throws: the error passes through and the unfinished steps are counted as dropped', () => {
    const sampled: number[] = [];
    const loop = createSimLoop<number, number>({
      stepMs: 10,
      initialState: 0,
      step(state, tick) {
        if (tick === 2) throw new Error('rules bug');
        return state + 1;
      },
      sampleInputs(tick) {
        sampled.push(tick);
        return tick;
      },
    });
    // 47 ms: four steps due (ticks 0 to 3) and 7 ms left over. Tick 2 throws.
    expect(() => loop.advance(47)).toThrow('rules bug');
    expect(loop.tick).toBe(2);
    expect(loop.state).toBe(2);
    expect(sampled).toEqual([0, 1, 2]);
    expect(loop.clock.steps).toBe(2);
    expect(loop.clock.droppedMs).toBeCloseTo(20, 9);
    expect(loop.clock.totalDroppedMs).toBeCloseTo(20, 9);
    expect(loop.clock.accumulatorMs).toBeCloseTo(7, 9);
    // The abandoned steps are not owed: the next frame runs only what that frame brings.
    // (Tick 2 is tried again, and throws again, because the fault is in the rules.)
    expect(() => loop.advance(10)).toThrow('rules bug');
    expect(loop.tick).toBe(2);
    expect(loop.clock.droppedMs).toBeCloseTo(10, 9);
    expect(loop.clock.totalDroppedMs).toBeCloseTo(30, 9);
  });

  it('when onStep throws, the step it followed still counts: clock and tick agree', () => {
    const loop = createSimLoop<number, null>({
      stepMs: 10,
      initialState: 0,
      step: (state) => state + 1,
      sampleInputs: () => null,
      onStep(_state, tick) {
        if (tick === 1) throw new Error('recorder bug');
      },
    });
    // Four steps due. The second step (tick 1) completes, then its onStep throws.
    expect(() => loop.advance(40)).toThrow('recorder bug');
    expect(loop.tick).toBe(2);
    expect(loop.state).toBe(2);
    expect(loop.clock.steps).toBe(2);
    expect(loop.clock.droppedMs).toBeCloseTo(20, 9);
    // Simulated time plus dropped time accounts for everything fed in.
    expect(loop.tick * 10 + loop.clock.totalDroppedMs + loop.clock.accumulatorMs).toBeCloseTo(40, 9);
    expect(loop.advance(10)).toBe(1);
    expect(loop.tick).toBe(3);
  });

  it('a throw comes after sampleInputs, so that step\'s presses are already consumed', () => {
    const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15 });
    buffer.add('p1');
    let fail = true;
    const presses: number[] = [];
    const loop = createSimLoop<number, ReturnType<typeof buffer.sample>>({
      stepMs: 10,
      initialState: 0,
      step(state, inputs) {
        if (fail) throw new Error('rules bug');
        presses.push(inputs.get('p1')?.pressed ?? 0);
        return state + 1;
      },
      sampleInputs: () => buffer.sample(),
    });
    buffer.receive('p1', 0, 1);
    expect(() => loop.advance(10)).toThrow('rules bug');
    fail = false;
    loop.advance(10);
    // The press was handed to the step that threw. The retried step sees it held, not pressed.
    expect(presses).toEqual([0]);
    expect(loop.tick).toBe(1);
  });

  it('when a step throws on top of a stall, both kinds of dropped time are added', () => {
    let calls = 0;
    const loop = createSimLoop<number, null>({
      stepMs: 10,
      maxCatchUpSteps: 3,
      initialState: 0,
      step(state) {
        calls += 1;
        if (calls === 2) throw new Error('once');
        return state + 1;
      },
      sampleInputs: () => null,
    });
    // 100 ms: ten steps due, capped to three (70 ms dropped); the second throws (20 ms more).
    expect(() => loop.advance(100)).toThrow('once');
    expect(loop.tick).toBe(1);
    expect(loop.clock.droppedMs).toBeCloseTo(90, 9);
    expect(loop.advance(10)).toBe(1);
    expect(loop.tick).toBe(2);
    expect(loop.clock.droppedMs).toBe(0);
  });

  it('reaches the same state at the same tick whatever the frame rate', () => {
    const run = (frameMs: number[]): Counter => {
      const loop = createSimLoop<Counter, number>({
        initialState: { ticks: 0, sum: 0, timeMs: 0 },
        step: addStep,
        sampleInputs: (tick) => (tick * 7) % 13,
      });
      let frame = 0;
      while (loop.tick < 3000) {
        const before = loop.tick;
        loop.advance(frameMs[frame % frameMs.length] ?? 0);
        frame += 1;
        // Stop exactly on the tick, not past it.
        if (loop.tick > 3000) throw new Error(`overshot from ${String(before)}`);
      }
      return loop.state;
    };
    const at60 = run([DEFAULT_STEP_MS]);
    expect(at60.ticks).toBe(3000);
    expect(run([16.1, 17.3, 16.6, 16.7])).toEqual(at60);
    expect(run([7, 9, 8.2])).toEqual(at60);
  });

  it('applies an input on the first step after it arrives', () => {
    const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15 });
    buffer.add('p1');
    const pressedAtTick: number[] = [];
    const loop = createSimLoop<number, ReturnType<typeof buffer.sample>>({
      initialState: 0,
      step(state, inputs) {
        if (inputs.get('p1')?.pressed === 1) pressedAtTick.push(state);
        return state + 1;
      },
      sampleInputs: () => buffer.sample(),
    });
    loop.advance(DEFAULT_STEP_MS * 3);
    buffer.receive('p1', 0, 1);
    loop.advance(DEFAULT_STEP_MS);
    expect(pressedAtTick).toEqual([3]);
  });
});

describe('runSteps', () => {
  it('runs one step per input with the given dt', () => {
    const end = runSteps(addStep, { ticks: 0, sum: 0, timeMs: 0 }, [1, 2, 3, 4], 5);
    expect(end).toEqual({ ticks: 4, sum: 10, timeMs: 20 });
    expect(runSteps(addStep, { ticks: 0, sum: 0, timeMs: 0 }, [1]).timeMs).toBe(DEFAULT_STEP_MS);
  });
});
