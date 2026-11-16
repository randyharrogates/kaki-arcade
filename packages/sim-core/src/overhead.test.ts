// How much time the driver itself costs per simulation step, apart from the game's own rules.
// A step has 16.7 ms (PERF-001). The limits below are a tiny slice of that and are set far (70 times or more)
// above what was measured (see docs/slices/F-03-sim-core.md), so this fails
// if the driver becomes grossly slower and not because the machine was busy.

import { describe, expect, it } from 'vitest';

import { createInputBuffer } from './input';
import type { SampledInput } from './input';
import { DEFAULT_STEP_MS, createSimLoop } from './timestep';

const STEPS_PER_BATCH = 100_000;
const BATCHES = 7;

/** Best (lowest) microseconds per step over several batches: the least-disturbed batch. */
function bestMicrosPerStep(batch: () => void): number {
  batch();
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < BATCHES; i += 1) {
    const start = performance.now();
    batch();
    const micros = ((performance.now() - start) * 1000) / STEPS_PER_BATCH;
    if (micros < best) best = micros;
  }
  return best;
}

function report(label: string, micros: number): void {
  const share = (micros / (DEFAULT_STEP_MS * 1000)) * 100;
  process.stdout.write(`[sim-core overhead] ${label}: ${micros.toFixed(4)} µs per step (${share.toFixed(5)}% of a 16.7 ms step)\n`);
}

describe('driver overhead per step', () => {
  it('clock and loop alone cost under 5 µs a step (0.03% of the step)', () => {
    const state = { ticks: 0 };
    const loop = createSimLoop<{ ticks: number }, null>({
      initialState: state,
      step(current) {
        current.ticks += 1;
        return current;
      },
      sampleInputs: () => null,
    });
    const micros = bestMicrosPerStep(() => {
      for (let i = 0; i < STEPS_PER_BATCH; i += 1) loop.advance(DEFAULT_STEP_MS);
    });
    expect(loop.tick).toBe(state.ticks);
    expect(loop.tick).toBe(STEPS_PER_BATCH * (BATCHES + 1));
    report('clock + loop', micros);
    expect(micros).toBeLessThan(5);
  });

  it('with 8 controllers each sending a packet every step, under 20 µs a step (0.12%)', () => {
    const buffer = createInputBuffer<number>({ seqModulus: 65536, staleAfterSteps: 15 });
    for (let id = 0; id < 8; id += 1) buffer.add(id);
    const axes = [0, 0];
    let seq = 0;
    let presses = 0;
    const loop = createSimLoop<number, ReadonlyMap<number, SampledInput>>({
      initialState: 0,
      step(current, inputs) {
        for (const frame of inputs.values()) presses += frame.pressed & 1;
        return current + 1;
      },
      sampleInputs() {
        seq = (seq + 1) % 65536;
        axes[0] = (seq % 3) - 1;
        for (let id = 0; id < 8; id += 1) buffer.receive(id, seq, (seq >> id) & 3, axes);
        return buffer.sample();
      },
    });
    const micros = bestMicrosPerStep(() => {
      for (let i = 0; i < STEPS_PER_BATCH; i += 1) loop.advance(DEFAULT_STEP_MS);
    });
    expect(presses).toBeGreaterThan(0);
    report('clock + loop + 8-controller input buffer', micros);
    expect(micros).toBeLessThan(20);
  });
});
