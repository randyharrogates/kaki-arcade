import { describe, expect, it, vi } from 'vitest';
import * as sim from '@kaki/sim-core';
import { phasedFixture } from './fixture';
import { dots } from '../test-fixtures/dots.fixture';
import { createMatch, parseRecording, replayMatch } from './match';

// PLAT-030, NFR-TEST: cadence and diagnostics, without wall-clock assertions.
describe('recording checkpoints', () => {
  it('does no hashing when recording is disabled, including lifecycle changes', () => {
    const hash = vi.spyOn(sim, 'hashState');
    try {
      const m = createMatch(dots, { seed: 42, players: 8, record: false });
      m.step(80); m.pause().resume().disconnect('p1').reconnect('p1').leave('p8');
      expect(() => m.recording()).toThrow('disabled');
      expect(hash).not.toHaveBeenCalled();
    } finally { hash.mockRestore(); }
  });
  it('defaults to every 60 steps and always includes the current final step', () => {
    const m = createMatch(dots, { seed: 42, players: 8 }); m.step(125);
    const first = m.recording();
    expect(first.recording.hashes.map(h => h.step)).toEqual([60, 120, 125]);
    m.step(5);
    const file = parseRecording(JSON.stringify(m.recording()));
    expect(file.recording.hashes.map(h => h.step)).toEqual([60, 120, 130]);
    expect(first.recording.hashes.map(h => h.step)).toEqual([60, 120, 125]);
    expect(replayMatch(dots, file).matches).toBe(true);
  });
  it('reports checkpoint span and view, then refines with the original build', () => {
    const m = createMatch(dots, { seed: 42, players: 2 }); m.step(125);
    const changed = { ...dots, step: (...args: Parameters<typeof dots.step>) => {
      const state = dots.step(...args);
      return state.leftSteps === 1127 ? { ...state, gem: { x: 999, y: 999 } } : state;
    } };
    const coarse = replayMatch(changed, m.recording()).divergence;
    expect(coarse).toMatchObject({ step: 120, fromStep: 61, toStep: 120, exact: false, checkpoint: { step: 120 } });
    expect(coarse?.actualView).toMatchObject({ gem: { x: 999, y: 999 } });
    const exact = replayMatch(changed, m.recording(), { referenceGame: dots }).divergence;
    expect(exact).toMatchObject({ step: 73, fromStep: 61, toStep: 120, exact: true, checkpoint: { step: 120 } });
    expect(exact?.diff.some(d => d.includes('gem.x'))).toBe(true);
    const dense = createMatch(dots, { seed: 42, players: 2, hashEvery: 1 }); dense.step(125);
    expect(replayMatch(changed, dense.recording()).divergence).toMatchObject({ step: 73, fromStep: 73, toStep: 73, exact: true });
  });
  it('refines in-place states and refuses an incorrect original build', () => {
    const original = { ...phasedFixture, stepMode: 'in-place' as const,
      step: (...args: Parameters<typeof phasedFixture.step>) => Object.assign(args[0], phasedFixture.step(...args)) };
    const changed = { ...original, step: (...args: Parameters<typeof original.step>) => {
      const state = original.step(...args); if (state.tick >= 5) state.secret = 'changed'; return state;
    } };
    const m = createMatch(original, { seed: 1, players: 2, hashEvery: 6 }); m.step(12);
    expect(replayMatch(changed, m.recording(), { referenceGame: original, diff: 'state' }).divergence)
      .toMatchObject({ step: 5, exact: true, fromStep: 1, toStep: 6 });
    expect(replayMatch(changed, m.recording(), { referenceGame: changed }).divergence)
      .toMatchObject({ step: 6, exact: false, expectedView: undefined });
  });
  it('records lifecycle checkpoints and rejects malformed checkpoint positions', () => {
    const m = createMatch(dots, { seed: 1, players: 2, hashEvery: 7 }); m.step(3); m.pause().resume(); m.step(5);
    const file = m.recording();
    expect(file.recording.hashes.map(h => [h.event, h.step])).toEqual([[4, 3], [5, 3], [9, 7], [10, 8]]);
    expect(replayMatch(dots, file).matches).toBe(true);
    for (const hashes of [[], [...file.recording.hashes].reverse(), [{ event: 10, step: 7, hash: file.initialHash }]]) {
      expect(() => parseRecording(JSON.stringify({ ...file, recording: { ...file.recording, hashes } }))).toThrow();
    }
    for (const hashEvery of [0, -1, 1.5, NaN]) expect(() => createMatch(dots, { seed: 1, players: 2, hashEvery })).toThrow('hashEvery');
  });
});
