// @kaki/sim-core: what a deterministic simulation is built from (PLAT-032).
// Pure TypeScript. Nothing in this package reads a clock, a random source, the DOM or the
// network; `purity.test.ts` fails if that stops being true.

export type { RngState } from './rng';
export {
  cloneRng,
  createRng,
  forkRng,
  nextChance,
  nextFloat,
  nextFloatBetween,
  nextInt,
  nextU32,
  pick,
  shuffle,
  shuffled,
  splitRng,
} from './rng';

export type { SimLoop, SimLoopOptions, StepClock, StepClockOptions, StepFn } from './timestep';
export {
  DEFAULT_MAX_CATCH_UP_STEPS,
  DEFAULT_STEP_MS,
  advanceClock,
  createSimLoop,
  createStepClock,
  resetClock,
  runSteps,
} from './timestep';

export type { InputBuffer, InputBufferOptions, InputFrame, ReceiveResult, SampledInput } from './input';
export {
  MAX_BUTTONS,
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

export { cloneState, decodeState, deepFreeze, encodeState, hashState } from './snapshot';

export type { Recorder, RecorderOptions, Recording, ReplayResult, Seed } from './replay';
export { createRecorder, decodeRecording, encodeRecording, replay } from './replay';
