// Record and replay (PLAT-032). Because a simulation is a pure function of its seed and its
// per-step inputs, a recording is just those two things; playing it back must reproduce the
// same state at every step. The recorded state hashes are how that is checked.

import { cloneState, decodeState, encodeState, hashState } from './snapshot';
import { DEFAULT_STEP_MS } from './timestep';
import type { StepFn } from './timestep';

/** A game's seed: a whole number, or a string such as a room code. */
export type Seed = number | string;

/**
 * Everything needed to run a game again exactly. Plain data, but not necessarily JSON-safe
 * (inputs are usually a Map): use `encodeRecording` to save one.
 */
export interface Recording<Inputs, S extends Seed = number> {
  seed: S;
  stepMs: number;
  /** A state hash is kept after every this-many steps (1: after every step). */
  hashEvery: number;
  /** One entry per step, in order. */
  inputs: Inputs[];
  /** `hashes[i]` is the state hash after step `(i + 1) * hashEvery`. */
  hashes: string[];
}

export interface RecorderOptions<S extends Seed = number> {
  seed: S;
  stepMs?: number;
  hashEvery?: number;
}

export interface Recorder<State, Inputs, S extends Seed = number> {
  readonly recording: Recording<Inputs, S>;
  /**
   * Call after each step with the inputs that step used and the state it produced. The inputs
   * are copied, so reused input frames are safe to pass. Fits `SimLoopOptions.onStep` as
   * `(state, _tick, inputs) => recorder.record(inputs, state)`.
   */
  record(inputs: Inputs, stateAfter: State): void;
}

function checkHashEvery(hashEvery: number): void {
  if (!Number.isInteger(hashEvery) || hashEvery < 1) {
    throw new RangeError(`hashEvery must be a whole number of at least 1, got ${String(hashEvery)}`);
  }
}

export function createRecorder<State, Inputs, S extends Seed = number>(options: RecorderOptions<S>): Recorder<State, Inputs, S> {
  const hashEvery = options.hashEvery ?? 1;
  checkHashEvery(hashEvery);
  const recording: Recording<Inputs, S> = {
    seed: options.seed,
    stepMs: options.stepMs ?? DEFAULT_STEP_MS,
    hashEvery,
    inputs: [],
    hashes: [],
  };
  return {
    recording,
    record(inputs, stateAfter) {
      recording.inputs.push(cloneState(inputs));
      if (recording.inputs.length % hashEvery === 0) recording.hashes.push(hashState(stateAfter));
    },
  };
}

export interface ReplayResult<State> {
  /** The state after the last recorded step. */
  state: State;
  /** Hashes computed during this run, at the same steps as the recording's. */
  hashes: string[];
  /** True when every computed hash equals the recorded one (and there are as many). */
  matches: boolean;
  /**
   * The number of the first step (counting from 1) whose hash differs from the recording, or
   * -1 when all match. With `hashEvery` above 1 the fault lies in that step or the
   * `hashEvery - 1` before it. A step with no recorded hash to compare with counts as
   * differing. If the recording holds more hashes than its inputs can produce, this is the
   * step the first surplus hash belongs to, which is past the last input.
   */
  firstMismatchStep: number;
}

/**
 * Runs a recording from the start: `init(seed)` makes the first state, then one `step` per
 * recorded input. Compares state hashes with the recorded ones as it goes.
 */
export function replay<State, Inputs, S extends Seed = number>(
  recording: Readonly<Recording<Inputs, S>>,
  init: (seed: S) => State,
  step: StepFn<State, Inputs>,
): ReplayResult<State> {
  const { hashEvery, inputs, stepMs } = recording;
  checkHashEvery(hashEvery);
  let state = init(recording.seed);
  const hashes: string[] = [];
  let firstMismatchStep = -1;
  for (let i = 0; i < inputs.length; i += 1) {
    state = step(state, inputs[i] as Inputs, stepMs);
    if ((i + 1) % hashEvery === 0) {
      const hash = hashState(state);
      if (firstMismatchStep === -1 && recording.hashes[hashes.length] !== hash) firstMismatchStep = i + 1;
      hashes.push(hash);
    }
  }
  if (firstMismatchStep === -1 && recording.hashes.length > hashes.length) {
    // The recording goes on after its inputs run out: the first hash with no step behind it.
    firstMismatchStep = (hashes.length + 1) * hashEvery;
  }
  const matches = firstMismatchStep === -1;
  return { state, hashes, matches, firstMismatchStep };
}

/**
 * A recording as data that `JSON.stringify` keeps exactly (see `encodeState`), for saving as
 * a test fixture or attaching to a bug report.
 */
export function encodeRecording<Inputs, S extends Seed = number>(recording: Readonly<Recording<Inputs, S>>): unknown {
  return {
    format: 'kaki-recording-1',
    seed: recording.seed,
    stepMs: recording.stepMs,
    hashEvery: recording.hashEvery,
    inputs: encodeState(recording.inputs),
    hashes: [...recording.hashes],
  };
}

/**
 * Reverses `encodeRecording`, checking the shape as it goes: throws a TypeError on anything
 * that is not a recording. The inputs come back as whatever was recorded (Maps as Maps); the
 * caller states their type, as nothing here can check it.
 */
export function decodeRecording<Inputs, S extends Seed = number>(encoded: unknown): Recording<Inputs, S> {
  const bad = (what: string): TypeError => new TypeError(`decodeRecording: ${what}`);
  if (encoded === null || typeof encoded !== 'object') throw bad('not an object');
  const source = encoded as Record<string, unknown>;
  if (source.format !== 'kaki-recording-1') throw bad('not a kaki-recording-1');
  const { seed, stepMs, hashEvery, hashes } = source;
  if (typeof seed === 'number' ? !Number.isSafeInteger(seed) || seed < 0 : typeof seed !== 'string') {
    throw bad('seed must be a whole number of at least 0 or a string');
  }
  if (typeof stepMs !== 'number' || !(stepMs > 0) || !Number.isFinite(stepMs)) throw bad('stepMs must be a positive number');
  if (typeof hashEvery !== 'number') throw bad('hashEvery must be a number');
  checkHashEvery(hashEvery);
  if (!Array.isArray(hashes) || !(hashes as unknown[]).every((hash) => typeof hash === 'string')) {
    throw bad('hashes must be a list of strings');
  }
  const inputs = decodeState(source.inputs);
  if (!Array.isArray(inputs)) throw bad('inputs must be a list');
  return { seed: seed as S, stepMs, hashEvery, inputs: inputs as Inputs[], hashes: [...(hashes as string[])] };
}
