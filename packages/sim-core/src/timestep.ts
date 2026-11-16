// The fixed-timestep driver (docs/ARCHITECTURE.md §4, PLAT-032).
//
// The simulation never sees a clock. The caller (the host page's frame callback, a test, the
// load harness) measures how much real time has passed and hands it in; this module
// turns that into a whole number of equal steps and a leftover fraction for the renderer.

/** 60 simulation steps a second. */
export const DEFAULT_STEP_MS = 1000 / 60;

/**
 * Most steps one advance may run. 6 steps is 100 ms, the longest frame docs/PERFORMANCE.md
 * tolerates anywhere (PERF-002); anything longer is a stall, and the time beyond the cap is
 * dropped so the game slows briefly and never spirals trying to catch up.
 */
export const DEFAULT_MAX_CATCH_UP_STEPS = 6;

// Absorbs floating-point error in the accumulator, so that feeding exactly one step's worth of
// time always yields exactly one step. A millionth of a millisecond.
const EPSILON_MS = 1e-6;

export interface StepClockOptions {
  /** Length of one simulation step in milliseconds. Default 1000 / 60. */
  stepMs?: number;
  /** Cap on steps per advance. Default 6. */
  maxCatchUpSteps?: number;
  /**
   * When above 0, an elapsed time within this many milliseconds of a whole number of steps is
   * treated as exactly that many. A 60 Hz display reports frames of 16.6 to 16.8 ms; without
   * snapping, that jitter produces an occasional frame with no step followed by one with two,
   * which shows as a stutter on anything drawn at its latest simulated position. Default 0
   * (off): the simulation then tracks real time exactly.
   */
  snapToleranceMs?: number;
}

/** Plain mutable data. The four result fields describe the most recent `advanceClock`. */
export interface StepClock {
  readonly stepMs: number;
  readonly maxCatchUpSteps: number;
  readonly snapToleranceMs: number;
  /** Real time received but not yet simulated. Always from 0 up to (not including) `stepMs`. */
  accumulatorMs: number;
  /** Steps the last advance asked for. */
  steps: number;
  /**
   * How far the present is past the latest simulated step, 0 (inclusive) to 1 (exclusive).
   * A renderer draws interpolated things at `previous + (latest - previous) * alpha`.
   */
  alpha: number;
  /** Time the last advance threw away because of the catch-up cap. Normally 0. */
  droppedMs: number;
  /** Time thrown away since the clock was made. Not cleared by `resetClock`. */
  totalDroppedMs: number;
}

export function createStepClock(options: StepClockOptions = {}): StepClock {
  const stepMs = options.stepMs ?? DEFAULT_STEP_MS;
  const maxCatchUpSteps = options.maxCatchUpSteps ?? DEFAULT_MAX_CATCH_UP_STEPS;
  const snapToleranceMs = options.snapToleranceMs ?? 0;
  if (!(stepMs > 0) || !Number.isFinite(stepMs)) {
    throw new RangeError(`stepMs must be a positive number, got ${String(stepMs)}`);
  }
  if (!Number.isInteger(maxCatchUpSteps) || maxCatchUpSteps < 1) {
    throw new RangeError(`maxCatchUpSteps must be a whole number of at least 1, got ${String(maxCatchUpSteps)}`);
  }
  if (!(snapToleranceMs >= 0) || snapToleranceMs >= stepMs / 2) {
    throw new RangeError(`snapToleranceMs must be from 0 to under half a step, got ${String(snapToleranceMs)}`);
  }
  return {
    stepMs,
    maxCatchUpSteps,
    snapToleranceMs,
    accumulatorMs: 0,
    steps: 0,
    alpha: 0,
    droppedMs: 0,
    totalDroppedMs: 0,
  };
}

/**
 * Feeds elapsed real time in and returns how many steps to simulate now (also left in
 * `clock.steps`). Allocates nothing. A negative, infinite or not-a-number elapsed time counts
 * as 0, so a clock that jumps backwards cannot corrupt the accumulator.
 */
export function advanceClock(clock: StepClock, elapsedMs: number): number {
  const stepMs = clock.stepMs;
  let elapsed = elapsedMs > 0 && Number.isFinite(elapsedMs) ? elapsedMs : 0;

  if (clock.snapToleranceMs > 0 && elapsed > 0) {
    const nearest = Math.round(elapsed / stepMs) * stepMs;
    if (nearest > 0 && Math.abs(elapsed - nearest) <= clock.snapToleranceMs) elapsed = nearest;
  }

  let accumulator = clock.accumulatorMs + elapsed;
  let steps = Math.floor((accumulator + EPSILON_MS) / stepMs);
  accumulator -= steps * stepMs;
  if (accumulator < 0) accumulator = 0;

  let dropped = 0;
  if (steps > clock.maxCatchUpSteps) {
    dropped = (steps - clock.maxCatchUpSteps) * stepMs;
    steps = clock.maxCatchUpSteps;
  }

  let alpha = accumulator / stepMs;
  if (alpha >= 1) alpha = 0;

  clock.accumulatorMs = accumulator;
  clock.steps = steps;
  clock.alpha = alpha;
  clock.droppedMs = dropped;
  clock.totalDroppedMs += dropped;
  return steps;
}

/**
 * Forgets any banked time. Call when play resumes after a pause, so the pause is not replayed
 * as catch-up steps. `totalDroppedMs` is KEPT: it is the running total for the life of the
 * clock, and a pause does not un-drop anything.
 */
export function resetClock(clock: StepClock): void {
  clock.accumulatorMs = 0;
  clock.steps = 0;
  clock.alpha = 0;
  clock.droppedMs = 0;
}

/**
 * One step of a simulation: old state and this step's inputs in, new state out. Must be
 * deterministic and touch nothing outside its arguments (PLAT-032).
 *
 * Recommended contract (and what F-04's conformance kit is advised to enforce): `step`
 * RETURNS A NEW STATE AND NEVER CHANGES THE ONE IT WAS GIVEN, nor its inputs. That is what
 * lets a renderer interpolate between `previousState` and `state`, and lets tests freeze the
 * input. The loop itself also works with a step that changes its state in place.
 */
export type StepFn<State, Inputs> = (state: State, inputs: Inputs, dtMs: number) => State;

export interface SimLoopOptions<State, Inputs> extends StepClockOptions {
  initialState: State;
  step: StepFn<State, Inputs>;
  /**
   * Called once before each step with the number of the step about to run (0 for the first).
   * Returns that step's inputs: on the host this is where the input buffer is sampled, so an
   * input is applied on the first step after it arrives.
   */
  sampleInputs: (tick: number) => Inputs;
  /**
   * Called after each step with the new state, the number of the step just run and the inputs
   * it used. For recorders, and for capturing what the renderer interpolates between.
   */
  onStep?: (state: State, tick: number, inputs: Inputs) => void;
}

export interface SimLoop<State> {
  readonly clock: StepClock;
  /** The latest simulated state. */
  state: State;
  /**
   * The state before the latest step. Only differs from `state` when the step function
   * returns new objects; a step that changes its state in place must keep its own copy of
   * whatever the renderer interpolates.
   */
  previousState: State;
  /** Steps completed so far. Simulated time is `tick * clock.stepMs`. */
  tick: number;
  /**
   * Feeds elapsed real time, runs the steps that are due and returns how many ran. If the
   * step function (or `sampleInputs` or `onStep`) throws, the error passes through; `state`
   * and `tick` stay at the last completed step, and the time of the steps not completed is
   * added to the clock's dropped time and `clock.steps` set to the number that did run.
   * A step whose `step` returned and whose `onStep` then threw DID complete: `state` and
   * `tick` include it. Note that `sampleInputs` had already run for the step that failed, so
   * with an input buffer that step's presses and releases have been consumed and are gone.
   */
  advance(elapsedMs: number): number;
  /** Runs exactly one step now, whatever the clock says. For tests and step-by-step tools. */
  stepOnce(): void;
}

/** Joins a clock, a step function and an input source into the thing a frame callback drives. */
export function createSimLoop<State, Inputs>(options: SimLoopOptions<State, Inputs>): SimLoop<State> {
  const { step, sampleInputs, onStep } = options;
  const clock = createStepClock(options);
  const stepMs = clock.stepMs;

  const loop: SimLoop<State> = {
    clock,
    state: options.initialState,
    previousState: options.initialState,
    tick: 0,
    advance(elapsedMs) {
      const steps = advanceClock(clock, elapsedMs);
      const tickBefore = loop.tick;
      try {
        for (let i = 0; i < steps; i += 1) loop.stepOnce();
      } finally {
        // Counted from the tick, so a step that completed before `onStep` threw is counted.
        const ran = loop.tick - tickBefore;
        if (ran < steps) {
          // Something threw. The steps not completed are abandoned, not owed: count their
          // time as dropped so the clock and the tick agree, and let the error through.
          const abandonedMs = (steps - ran) * stepMs;
          clock.steps = ran;
          clock.droppedMs += abandonedMs;
          clock.totalDroppedMs += abandonedMs;
        }
      }
      return loop.tick - tickBefore;
    },
    stepOnce() {
      const tick = loop.tick;
      const inputs = sampleInputs(tick);
      const before = loop.state;
      const after = step(before, inputs, stepMs);
      loop.previousState = before;
      loop.state = after;
      loop.tick = tick + 1;
      if (onStep !== undefined) onStep(after, tick, inputs);
    },
  };
  return loop;
}

/**
 * Runs a step function over a list of inputs with no clock at all: one step per entry.
 * For rules tests, bots and replays.
 */
export function runSteps<State, Inputs>(
  step: StepFn<State, Inputs>,
  initialState: State,
  inputs: Iterable<Inputs>,
  stepMs: number = DEFAULT_STEP_MS,
): State {
  let state = initialState;
  for (const entry of inputs) state = step(state, entry, stepMs);
  return state;
}
