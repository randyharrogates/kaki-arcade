import { describe, expect, it, vi } from 'vitest';
import { createSoundEngine } from '@kaki/platform';
import { rabakz } from '../src';
import { advance, answer, scenario } from './scenarios';
import { cuesFor, scheduleCue, SEAT_NOTES } from './sound';
import type { Cue } from './sound';
function fakeAudio() {
  const oscillators: { type: string; frequency: { value: number }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; ended: (() => void) | undefined }[] = [];
  const gains: { gain: { value: number; setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const context = { createDynamicsCompressor: () => ({ threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() }), state: 'running', currentTime: 10, destination: {}, createOscillator() {
    let ended: (() => void) | undefined;
    const o = { get ended() { return ended; }, addEventListener: (_type: string, listener: () => void) => { ended = listener; }, type: '', frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }; oscillators.push(o); return o;
  }, createGain() { const g = { gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }; gains.push(g); return g; } };
  return { context: context as unknown as AudioContext, oscillators, gains };
}
describe('RZ-033 Mallet schedules', () => {
  const cases: [Cue, number[], number[], number][] = [
    [{ kind: 'unlock' }, [72, 79], [0, 0.089], 0.32],
    [{ kind: 'correct' }, [72, 76, 79, 84], [0, 0.089, 0.178, 0.267], 0.32],
    [{ kind: 'wrong' }, [64, 60], [0, 0.144], 0.28],
    ...SEAT_NOTES.map((midi, i): [Cue, number[], number[], number] => [{ kind: 'answer', seat: i + 1 }, [midi], [0], 0.38]),
  ];
  for (const [cue, notes, starts, peak] of cases) it(`exact notes, partials and envelopes: ${JSON.stringify(cue)}`, () => {
    const { context, oscillators, gains } = fakeAudio(); const engine = createSoundEngine(context);
    expect(gains).toHaveLength(4); engine.play(scheduleCue(cue));
    expect(gains).toHaveLength(4 + notes.length * 3); expect(oscillators).toHaveLength(notes.length * 3);
    notes.forEach((midi, i) => {
      const t = 10.02 + (starts[i] ?? 0);
      [1, 3.93, 9.2].forEach((ratio, j) => {
        const o = oscillators[i * 3 + j]; const g = gains[4 + i * 3 + j]; const decay = [0.42, 0.09, 0.03][j] ?? 0;
        expect(o?.frequency.value).toBeCloseTo(440 * 2 ** ((midi - 69) / 12) * ratio);
        expect(o?.type).toBe('sine'); expect(o?.start).toHaveBeenCalledWith(t); expect(o?.stop).toHaveBeenCalledWith(t + decay + 0.02);
        expect(g?.gain.setValueAtTime).toHaveBeenCalledWith(0.0001, t);
        expect(g?.gain.exponentialRampToValueAtTime).toHaveBeenNthCalledWith(1, peak * ([1, 0.28, 0.06][j] ?? 0), t + 0.004);
        expect(g?.gain.exponentialRampToValueAtTime).toHaveBeenNthCalledWith(2, 0.0001, t + decay);
      });
    });
    for (const o of oscillators) o.ended?.();
    expect(oscillators.every(o => o.disconnect.mock.calls.length === 1)).toBe(true);
    expect(gains.slice(4).every(g => g.disconnect.mock.calls.length === 1)).toBe(true);
  });
});
describe('RZ-033 public match cues', () => {
  it('sounds every event once through a complete solo match, scoreboard and final announcement', () => {
    let state = scenario('one-player');
    let previous: ReturnType<typeof rabakz.publicView> | null = null;
    const heard: Cue[] = [];
    let frames = 0;
    const observe = () => {
      const next = rabakz.publicView(state);
      heard.push(...cuesFor(previous, next));
      expect(cuesFor(next, next)).toEqual([]);
      previous = next;
    };
    observe();
    while (state.phase !== 'over' && frames++ < 20000) {
      state = advance(state, state.phase === 'question' ? [answer(state, 0, ((state.questions[state.round]?.correct ?? 0) + state.round % 2) % 4)] : []);
      observe();
    }
    expect(state.phase).toBe('over');
    expect(heard.filter(c => c.kind === 'unlock')).toHaveLength(10);
    expect(heard.filter(c => c.kind === 'answer')).toEqual(Array.from({ length: 10 }, () => ({ kind: 'answer', seat: 1 })));
    expect(heard.filter(c => c.kind === 'correct')).toHaveLength(5);
    expect(heard.filter(c => c.kind === 'wrong')).toHaveLength(5);
  });
  it('each visible buzz, reveal and unlock once, including ties and subsequent rounds', () => {
    let state = scenario('open'); let previous = rabakz.publicView(state);

    expect(cuesFor(null, previous)).toEqual([{ kind: 'unlock' }]);
    const heard: Cue[] = [];
    const observe = () => { const next = rabakz.publicView(state); heard.push(...cuesFor(previous, next)); expect(cuesFor(next, structuredClone(next))).toEqual([]); previous = next; };
    const correct = state.questions[state.round]?.correct ?? 0;
    state = advance(state, [answer(state, 7, (correct + 1) % 4)]); observe();
    state = advance(state, [answer(state, 1, correct), answer(state, 2, correct)]); observe();
    while (state.phase === 'question') { state = advance(state); observe(); }
    while (state.phase !== 'question') { state = advance(state); observe(); }
    state = advance(state, [{ player: state.players[0]?.info.id ?? '', control: 'skip', revision: 0 }]); observe();
    expect(heard).toEqual([{ kind: 'answer', seat: 8 }, { kind: 'wrong', delay: 0.233 }, { kind: 'answer', seat: 2 }, { kind: 'answer', seat: 3, delay: 0.03 }, { kind: 'correct', delay: 0.263 }, { kind: 'unlock' }]);

  });
});

it('RZ-005 RZ-033 both separate wrong presses survive the unlock, with deterministic public events', () => {
  let state = scenario('open', 2);
  for (const [seat, pick] of [[0, 1], [1, 2]] as const) {
    const before = rabakz.publicView(state);
    const wrong = ((state.questions[state.round]?.correct ?? 0) + pick) % 4;
    const next = advance(state, [answer(state, seat, wrong)]);
    expect(next).toEqual(advance(state, [answer(state, seat, wrong)]));
    const view = rabakz.publicView(next);
    expect(view.wrongPresses).toEqual({ ...before.wrongPresses, [seat + 1]: 1 });
    expect(cuesFor(before, view)).toEqual([{ kind: 'answer', seat: seat + 1 }, { kind: 'wrong', delay: 0.233 }]);
    state = next;
  }
  expect(state.players.every(p => p.pick === null)).toBe(true);
  expect(rabakz.publicView(advance(state)).wrongPresses).toEqual(state.wrongPresses);
});
it('RZ-033 skips and no-winner timeouts are silent', () => {
  const state = scenario('open');
  expect(cuesFor(rabakz.publicView(state), rabakz.publicView(scenario('reveal-nobody')))).toEqual([]);
  let timeout = state;
  while (timeout.phase === 'question') timeout = advance(timeout);
  expect(cuesFor(rabakz.publicView(state), rabakz.publicView(timeout))).toEqual([]);
});
it('RZ-033 staggers eight tied winners and delays right after the last seat, and delays solo wrong', () => {
  for (const count of [1, 8]) {
    let state = scenario('open', count);
    const previous = rabakz.publicView(state);
    state = advance(state, state.players.map((_, i) => answer(state, i, ((state.questions[state.round]?.correct ?? 0) + (count === 1 ? 1 : 0)) % 4)));
    while (state.phase === 'question') state = advance(state);
    const { context, oscillators } = fakeAudio();
    const engine = createSoundEngine(context);
    for (const cue of cuesFor(previous, rabakz.publicView(state))) engine.play(scheduleCue(cue));
    const starts = oscillators.filter((_, i) => i % 3 === 0).map(o => o.start.mock.calls[0]?.[0] as number);
    const expected = count === 8 ? [...Array.from({ length: 8 }, (_, i) => i * 0.03), ...[0, 0.089, 0.178, 0.267].map(t => 0.21 + 0.233 + t)] : [0, 0.233, 0.233 + 0.144];
    expect(starts).toHaveLength(expected.length);
    starts.forEach((t, i) => { expect(t).toBeCloseTo(10.02 + (expected[i] ?? 0)); });
  }
});

it('RZ-033 simultaneous wrong presses get one wrong 233 ms after the last staggered seat', () => {
  const state = scenario('open', 2);
  const correct = state.questions[0]?.correct ?? 0;
  const next = advance(state, [answer(state, 0, (correct + 1) % 4), answer(state, 1, (correct + 2) % 4)]);
  expect(cuesFor(rabakz.publicView(state), rabakz.publicView(next))).toEqual([
    { kind: 'answer', seat: 1 }, { kind: 'answer', seat: 2, delay: 0.03 },
    { kind: 'wrong', delay: 0.263 },
  ]);
});

for (const count of [2, 3]) it(`RZ-033 retains consecutive-step wrong presses until one draw (${String(count)} players)`, () => {
  let state = scenario('open', count);
  const previous = rabakz.publicView(state);
  const correct = state.questions[0]?.correct ?? 0;
  state = advance(state, [answer(state, 0, (correct + 1) % 4)]);
  state = advance(state, [answer(state, 1, (correct + 2) % 4)]);
  const view = rabakz.publicView(state);
  expect(view.wrongPresses).toEqual({ 1: 1, 2: 1 });
  expect(cuesFor(previous, view)).toEqual([
    { kind: 'answer', seat: 1 }, { kind: 'answer', seat: 2, delay: 0.03 },
    { kind: 'wrong', delay: 0.263 },
  ]);
  expect(cuesFor(view, rabakz.publicView(advance(state)))).toEqual([]);
  if (count === 2) expect(state.players.every(p => p.pick === null)).toBe(true);
  while (state.round === 0) state = advance(state);
  const reset = rabakz.publicView(state);
  expect(reset.wrongPresses).toEqual({});
  expect(cuesFor(view, reset)).toEqual([{ kind: 'unlock' }]);
});
it('RZ-033 retains multiple wrong presses from the same seat between draws', () => {
  let state = scenario('open', 2);
  const previous = rabakz.publicView(state);
  const correct = state.questions[0]?.correct ?? 0;
  state = advance(state, [answer(state, 0, (correct + 1) % 4), answer(state, 1, (correct + 1) % 4)]);
  state = advance(state, [answer(state, 0, (correct + 2) % 4)]);
  const view = rabakz.publicView(state);
  expect(view.wrongPresses).toEqual({ 1: 2, 2: 1 });
  expect(cuesFor(previous, view)).toEqual([
    { kind: 'answer', seat: 1 }, { kind: 'answer', seat: 1, delay: 0.03 },
    { kind: 'answer', seat: 2, delay: 0.06 }, { kind: 'wrong', delay: 0.06 + 0.233 },
  ]);
  expect(cuesFor(view, structuredClone(view))).toEqual([]);
});
