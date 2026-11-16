import { describe, expect, it } from 'vitest';

import { buttonMask, copyFrame, createInputBuffer, wasPressed } from './input';
import type { InputFrame, SampledInput } from './input';
import { createRecorder, decodeRecording, encodeRecording, replay } from './replay';
import type { Recording } from './replay';
import { cloneRng, createRng, forkRng, nextChance, nextFloat, nextInt, pick, shuffle } from './rng';
import type { RngState } from './rng';
import { cloneState, deepFreeze, hashState } from './snapshot';
import { DEFAULT_STEP_MS, createSimLoop, runSteps } from './timestep';

// A small stand-in for a real game, written the way game rules will be: state is plain data
// with its random generator inside it, and `step` returns a new state without touching the
// old one. It uses every kind of randomness and input a game might.

const PLAYERS = ['p1', 'p2', 'p3', 'p4'] as const;
type PlayerId = (typeof PLAYERS)[number];
type Inputs = ReadonlyMap<PlayerId, SampledInput>;

interface Cook {
  x: number;
  y: number;
  score: number;
  carrying: string | null;
}

interface ToyState {
  tick: number;
  timeMs: number;
  rng: RngState;
  deck: number[];
  cooks: Map<PlayerId, Cook>;
  orders: string[];
}

const DISHES = ['laksa', 'satay', 'rojak', 'mee goreng'];
const GRAB = 0;

function init(seed: number): ToyState {
  const root = createRng(seed);
  const deck = shuffle(forkRng(root, 'deck'), Array.from({ length: 52 }, (_, i) => i));
  const cooks = new Map<PlayerId, Cook>();
  for (const id of PLAYERS) cooks.set(id, { x: 0, y: 0, score: 0, carrying: null });
  return { tick: 0, timeMs: 0, rng: forkRng(root, 'play'), deck, cooks, orders: [] };
}

function step(state: ToyState, inputs: Inputs, dtMs: number): ToyState {
  const rng = cloneRng(state.rng);
  const orders = [...state.orders];
  const deck = [...state.deck];
  const cooks = new Map<PlayerId, Cook>();
  if (nextChance(rng, 0.02) && orders.length < 5) orders.push(pick(rng, DISHES));
  for (const [id, old] of state.cooks) {
    const frame = inputs.get(id);
    const cook = { ...old };
    if (frame !== undefined) {
      cook.x += (frame.axes[0] ?? 0) * 0.2 * dtMs;
      cook.y += (frame.axes[1] ?? 0) * 0.2 * dtMs;
      if (wasPressed(frame, GRAB)) {
        if (cook.carrying === null && orders.length > 0) {
          cook.carrying = orders.shift() ?? null;
        } else if (cook.carrying !== null) {
          cook.carrying = null;
          cook.score += 10 + nextInt(rng, 0, 5) + (deck.pop() ?? 0);
          if (deck.length === 0) deck.push(...shuffle(rng, Array.from({ length: 52 }, (_, i) => i)));
        }
      }
    }
    cook.x += (nextFloat(rng) - 0.5) * 0.001;
    cooks.set(id, cook);
  }
  return { tick: state.tick + 1, timeMs: state.timeMs + dtMs, rng, deck, cooks, orders };
}

/**
 * A scripted evening: four phones over a lossy, repeating, reordering link into a real input
 * buffer, sampled once per step. Returns the per-step frames the simulation was given.
 */
function scriptedInputs(scriptSeed: number, steps: number): Inputs[] {
  const rng = createRng(scriptSeed);
  const buffer = createInputBuffer<PlayerId>({ seqModulus: 65536, staleAfterSteps: 15 });
  const phones = PLAYERS.map((id) => {
    buffer.add(id);
    return { id, seq: 0, buttons: 0, x: 0, y: 0 };
  });
  const log: Inputs[] = [];
  for (let i = 0; i < steps; i += 1) {
    for (const phone of phones) {
      if (nextChance(rng, 0.08)) phone.buttons ^= buttonMask(GRAB);
      if (nextChance(rng, 0.1)) {
        phone.x = nextInt(rng, -1, 1);
        phone.y = nextInt(rng, -1, 1);
      }
      const seq = phone.seq++;
      if (nextChance(rng, 0.15)) continue;
      buffer.receive(phone.id, seq, phone.buttons, [phone.x, phone.y]);
      if (nextChance(rng, 0.1)) buffer.receive(phone.id, seq, phone.buttons, [phone.x, phone.y]);
      if (nextChance(rng, 0.1) && seq > 2) buffer.receive(phone.id, seq - 2, 0, [0, 0]);
    }
    const frames = new Map<PlayerId, InputFrame>();
    for (const [id, frame] of buffer.sample()) frames.set(id, copyFrame(frame));
    log.push(frames);
  }
  return log;
}

function inputsAt(inputs: Inputs[], tick: number): Inputs {
  const entry = inputs[tick];
  if (entry === undefined) throw new Error(`no inputs scripted for step ${String(tick)}`);
  return entry;
}

function hashesOf(seed: number, inputs: Inputs[]): string[] {
  const hashes: string[] = [];
  let state = init(seed);
  for (const entry of inputs) {
    state = step(state, entry, DEFAULT_STEP_MS);
    hashes.push(hashState(state));
  }
  return hashes;
}

describe('determinism (PLAT-032)', () => {
  const STEPS = 10_000;
  const inputs = scriptedInputs(404, STEPS);

  it('same seed and inputs give the same state hash at every one of 10,000 steps', () => {
    const first = hashesOf(2026, inputs);
    const second = hashesOf(2026, inputs);
    expect(first).toHaveLength(STEPS);
    expect(second).toEqual(first);
    // The run is not trivially constant: the state really changes every step.
    expect(new Set(first).size).toBe(STEPS);
  });

  it('a different seed gives a different state', () => {
    const first = hashesOf(2026, inputs);
    const other = hashesOf(2027, inputs);
    expect(other[0]).not.toBe(first[0]);
    expect(other[STEPS - 1]).not.toBe(first[STEPS - 1]);
  });

  it('different inputs give a different state', () => {
    const first = hashesOf(2026, inputs);
    const changed = inputs.map((entry, i) => {
      if (i !== 5000) return entry;
      const copy = cloneState(entry) as Map<PlayerId, InputFrame>;
      const frame = copy.get('p1');
      if (frame !== undefined) frame.axes[0] = frame.axes[0] === 1 ? -1 : 1;
      return copy;
    });
    const second = hashesOf(2026, changed);
    expect(second.slice(0, 5000)).toEqual(first.slice(0, 5000));
    expect(second[5000]).not.toBe(first[5000]);
    expect(second[STEPS - 1]).not.toBe(first[STEPS - 1]);
  });

  it('the input script itself is repeatable', () => {
    expect(hashState(scriptedInputs(404, 500))).toBe(hashState(inputs.slice(0, 500)));
    expect(hashState(scriptedInputs(405, 500))).not.toBe(hashState(inputs.slice(0, 500)));
  });

  it('the step never changes the state or the inputs it is given', () => {
    let state = deepFreeze(init(9));
    for (const entry of inputs.slice(0, 300)) state = deepFreeze(step(state, deepFreeze(cloneState(entry)), DEFAULT_STEP_MS));
    expect(state.tick).toBe(300);
  });

  it('reaches the same state through the clock-driven loop at any frame rate', () => {
    const expected = hashState(runSteps(step, init(31), inputs.slice(0, 2000)));
    for (const frameMs of [[DEFAULT_STEP_MS], [33.4, 33.2], [6.9, 7.1, 6.8], [16, 18, 15, 17.5, 40]]) {
      const loop = createSimLoop<ToyState, Inputs>({
        initialState: init(31),
        step,
        sampleInputs: (tick) => inputsAt(inputs, tick),
        maxCatchUpSteps: 1,
      });
      let frame = 0;
      while (loop.tick < 2000) {
        loop.advance(frameMs[frame % frameMs.length] ?? 0);
        frame += 1;
      }
      expect(hashState(loop.state)).toBe(expected);
    }
  });
});

describe('record and replay', () => {
  const inputs = scriptedInputs(808, 1500);

  function record(seed: number, hashEvery: number): Recording<Inputs> {
    const recorder = createRecorder<ToyState, Inputs>({ seed, hashEvery });
    const loop = createSimLoop<ToyState, Inputs>({
      initialState: init(seed),
      step,
      sampleInputs: (tick) => inputsAt(inputs, tick),
      onStep: (state, _tick, used) => {
        recorder.record(used, state);
      },
    });
    while (loop.tick < inputs.length) loop.stepOnce();
    return recorder.recording;
  }

  it('a recording replays to identical hashes at every step', () => {
    const recording = record(77, 1);
    expect(recording.inputs).toHaveLength(1500);
    expect(recording.hashes).toHaveLength(1500);
    expect(recording.stepMs).toBe(DEFAULT_STEP_MS);
    const result = replay(recording, init, step);
    expect(result.matches).toBe(true);
    expect(result.firstMismatchStep).toBe(-1);
    expect(result.hashes).toEqual(recording.hashes);
    expect(result.state.tick).toBe(1500);
    expect(hashState(result.state)).toBe(recording.hashes[1499]);
  });

  it('keeps a hash every N steps when asked', () => {
    const recording = record(77, 100);
    expect(recording.hashes).toHaveLength(15);
    expect(recording.hashes[14]).toBe(record(77, 1).hashes[1499]);
    expect(replay(recording, init, step).matches).toBe(true);
  });

  it('copies inputs as it records, so reused input frames are safe', () => {
    const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15 });
    buffer.add('p1');
    const recorder = createRecorder<number, ReadonlyMap<string, SampledInput>>({ seed: 1 });
    buffer.receive('p1', 0, 1);
    recorder.record(buffer.sample(), 0);
    buffer.receive('p1', 1, 0);
    recorder.record(buffer.sample(), 1);
    expect(recorder.recording.inputs.map((entry) => entry.get('p1')?.held)).toEqual([1, 0]);
  });

  it('reports the step where a replay stops matching', () => {
    const recording = record(77, 1);
    // A "game" that has changed since the recording: from step 700 it behaves differently.
    const changedStep = (state: ToyState, entry: Inputs, dtMs: number): ToyState => {
      const next = step(state, entry, dtMs);
      return next.tick === 700 ? { ...next, orders: [...next.orders, 'kaya toast'] } : next;
    };
    const result = replay(recording, init, changedStep);
    expect(result.matches).toBe(false);
    expect(result.firstMismatchStep).toBe(700);
  });

  it('reports a wrong seed at the first step, and a hand-edited input where it is', () => {
    const recording = record(77, 1);
    expect(replay({ ...recording, seed: 78 }, init, step).firstMismatchStep).toBe(1);

    const edited = cloneState(recording) as Recording<Map<PlayerId, InputFrame>>;
    const frame = edited.inputs[900]?.get('p2');
    if (frame === undefined) throw new Error('no frame');
    frame.axes[1] = frame.axes[1] === 1 ? -1 : 1;
    expect(replay(edited, init, step).firstMismatchStep).toBe(901);
  });

  it('does not match when the recording has more or fewer hashes than the run', () => {
    const recording = record(77, 1);
    const fewer = replay({ ...recording, hashes: recording.hashes.slice(0, -1) }, init, step);
    expect(fewer.matches).toBe(false);
    expect(fewer.firstMismatchStep).toBe(1500);
    // More recorded hashes than inputs: the first surplus hash belongs to step 1501.
    const more = replay({ ...recording, hashes: [...recording.hashes, 'x', 'y'] }, init, step);
    expect(more.matches).toBe(false);
    expect(more.firstMismatchStep).toBe(1501);
    const sparse = record(77, 100);
    const sparseMore = replay({ ...sparse, hashes: [...sparse.hashes, 'x'] }, init, step);
    expect(sparseMore.matches).toBe(false);
    expect(sparseMore.firstMismatchStep).toBe(1600);
    const empty = replay({ seed: 77, stepMs: 1, hashEvery: 1, inputs: [], hashes: ['x'] }, init, step);
    expect(empty.firstMismatchStep).toBe(1);
  });

  it('a recording saved as JSON text and read back replays to the same hashes', () => {
    const recording = record(77, 10);
    const text = JSON.stringify(encodeRecording(recording));
    expect(text).toContain('kaki-recording-1');
    const restored = decodeRecording<Inputs>(JSON.parse(text));
    expect(restored.seed).toBe(77);
    expect(restored.stepMs).toBe(recording.stepMs);
    expect(restored.hashEvery).toBe(10);
    expect(restored.hashes).toEqual(recording.hashes);
    expect(restored.inputs).toHaveLength(1500);
    expect(restored.inputs[0]).toBeInstanceOf(Map);
    expect(hashState(restored.inputs)).toBe(hashState(recording.inputs));
    const result = replay(restored, init, step);
    expect(result.matches).toBe(true);
    expect(hashState(result.state)).toBe(hashState(replay(recording, init, step).state));
    // Encoding twice gives the same text: a fixture does not churn.
    expect(JSON.stringify(encodeRecording(restored))).toBe(text);
  });

  it('takes a string seed (a room code) and keeps it through recording, saving and replay', () => {
    const initFromCode = (code: string): { rng: RngState; total: number } => ({ rng: createRng(code), total: 0 });
    const stepTotal = (state: { rng: RngState; total: number }, add: number): { rng: RngState; total: number } => {
      const rng = cloneRng(state.rng);
      return { rng, total: state.total + add + nextInt(rng, 0, 9) };
    };
    const recorder = createRecorder<{ rng: RngState; total: number }, number, string>({ seed: 'KAKI-42' });
    let state = initFromCode('KAKI-42');
    for (let i = 0; i < 50; i += 1) {
      state = stepTotal(state, i);
      recorder.record(i, state);
    }
    const restored = decodeRecording<number, string>(JSON.parse(JSON.stringify(encodeRecording(recorder.recording))));
    expect(restored.seed).toBe('KAKI-42');
    expect(replay(restored, initFromCode, stepTotal).matches).toBe(true);
    expect(replay({ ...restored, seed: 'KAKI-43' }, initFromCode, stepTotal).firstMismatchStep).toBe(1);
  });

  it('refuses to decode what is not a recording', () => {
    const good = encodeRecording(record(77, 100)) as Record<string, unknown>;
    expect(() => decodeRecording(good)).not.toThrow();
    const bad: unknown[] = [
      null,
      'text',
      [],
      { ...good, format: 'something-else' },
      { ...good, seed: -1 },
      { ...good, seed: 1.5 },
      { ...good, seed: null },
      { ...good, stepMs: 0 },
      { ...good, stepMs: '16' },
      { ...good, hashEvery: 0 },
      { ...good, hashEvery: 'x' },
      { ...good, hashes: [1, 2] },
      { ...good, hashes: 'abc' },
      { ...good, inputs: { not: 'a list' } },
      { ...good, inputs: [{ $nope: 1 }] },
    ];
    for (const value of bad) expect(() => decodeRecording(value), JSON.stringify(value).slice(0, 60)).toThrow();
  });

  it('refuses a bad hash interval', () => {
    expect(() => createRecorder({ seed: 1, hashEvery: 0 })).toThrow(RangeError);
    expect(() => replay({ seed: 1, stepMs: 1, hashEvery: 1.5, inputs: [], hashes: [] }, () => 0, (s: number) => s)).toThrow(
      RangeError,
    );
  });
});
