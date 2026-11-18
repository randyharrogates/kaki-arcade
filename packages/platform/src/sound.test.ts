import { describe, expect, it, vi } from 'vitest';
import type { SoundContext } from './sound';
import { confirmationTone, createSoundEngine, SOUND_STORAGE_KEY } from './sound';
function audio() {
  const nodes: ReturnType<typeof gain>[] = [];
  function gain() { return { gain: { value: 1, setTargetAtTime: vi.fn() }, connect: vi.fn() }; }
  const context = { createDynamicsCompressor: () => ({ threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() }), state: 'running', currentTime: 10, destination: {}, createGain: () => { const node = gain(); nodes.push(node); return node; } };
  return { context: context as unknown as SoundContext, nodes };
}
describe('RZ-033 shared levels', () => {
  it('defaults and pre-creates the complete master/effects/music chain', () => {
    const { context, nodes } = audio(); const sound = createSoundEngine(context);
    expect([sound.getLevel('effects'), sound.getLevel('music')]).toEqual([70, 55]);
    expect(nodes).toHaveLength(4);
    const cue = vi.fn(); sound.play(cue); sound.play(cue, 'music');
    expect(cue.mock.calls).toEqual([[context, 10.02, nodes[1]], [context, 10.02, nodes[2]]]);
    expect(nodes).toHaveLength(4);
  });
  it('loads valid saved levels, clamps changes and saves both channels', () => {
    const storage = { getItem: vi.fn(() => '{"effects":23,"music":0}'), setItem: vi.fn() };
    const { context, nodes } = audio(); const sound = createSoundEngine(context, storage);
    expect(sound.getLevel('effects')).toBe(23); expect(sound.getLevel('music')).toBe(0);
    sound.setLevel('effects', 200); sound.setLevel('music', -5); sound.setLevel('music', NaN);
    expect([sound.getLevel('effects'), sound.getLevel('music')]).toEqual([100, 0]);
    expect(storage.setItem).toHaveBeenLastCalledWith(SOUND_STORAGE_KEY, '{"effects":100,"music":0}');
    expect(nodes[1]?.gain.setTargetAtTime).toHaveBeenCalledWith(1, 10, 0.02);
  });
  it('survives blocked storage and rejects malformed saved levels', () => {
    for (const value of ['bad', '{"effects":-1,"music":"55"}', 'null']) {
      const sound = createSoundEngine(audio().context, { getItem: () => value, setItem: vi.fn() });
      expect([sound.getLevel('effects'), sound.getLevel('music')]).toEqual([70, 55]);
    }
    const sound = createSoundEngine(audio().context, { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
    expect(sound.getLevel('effects')).toBe(70); sound.setLevel('effects', 42); expect(sound.getLevel('effects')).toBe(42);
  });
});
it('RZ-033 schedules cues while resume is pending and connects effects through a pre-created limiter', () => {
  const { context, nodes } = audio();
  const limiter = { threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
  const createLimiter = vi.fn(() => limiter);
  Object.assign(context, { state: 'suspended', createDynamicsCompressor: createLimiter });
  const sound = createSoundEngine(context); const cue = vi.fn(); sound.play(cue);
  expect(cue).toHaveBeenCalledWith(context, 10.02, nodes[1]);
  expect(createLimiter).toHaveBeenCalledTimes(1);
  expect(nodes[1]?.connect).toHaveBeenCalledWith(limiter);
  expect(limiter.connect).toHaveBeenCalledWith(nodes[3]);
  expect(nodes[3]?.connect).toHaveBeenCalledWith(nodes[0]);
  expect(nodes[3]?.gain.value).toBeCloseTo(0.6745280277, 9);
  expect((nodes[3]?.gain.value ?? 0) * (1 / (10 ** (-6 * (1 - 1 / 20) / 20))) ** 0.6).toBeCloseTo(1);
  expect([limiter.threshold.value, limiter.knee.value, limiter.ratio.value, limiter.attack.value, limiter.release.value]).toEqual([-6, 0, 20, 0.001, 0.1]);
});

it('RZ-033 confirmation preserves the D-168 C5 attack, partials, decay and cleanup', () => {
  const { context, nodes } = audio();
  const oscillators: { type: string; frequency: { value: number }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn> }[] = [];
  Object.assign(context, {
    createOscillator() {
      const oscillator = { type: '', frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), addEventListener: vi.fn() };
      oscillators.push(oscillator); return oscillator;
    },
    createGain() {
      const node = { gain: { value: 1, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
      nodes.push(node); return node;
    },
  });
  const sound = createSoundEngine(context);
  sound.setLevel('effects', 20); sound.play(confirmationTone);
  expect(nodes[1]?.gain.setTargetAtTime).toHaveBeenCalledWith(0.2, 10, 0.02);
  expect(oscillators).toHaveLength(3);
  for (const [index, ratio, peak, decay] of [[0, 1, 0.38, 0.42], [1, 3.93, 0.38 * 0.28, 0.09], [2, 9.2, 0.38 * 0.06, 0.03]] as const) {
    const oscillator = oscillators[index];
    const gain = nodes[index + 4];
    expect(oscillator?.type).toBe('sine');
    expect(oscillator?.frequency.value).toBeCloseTo(440 * 2 ** (3 / 12) * ratio);
    expect(oscillator?.start).toHaveBeenCalledWith(10.02);
    expect(oscillator?.stop).toHaveBeenCalledWith(10.02 + decay + 0.02);
    expect(gain?.connect).toHaveBeenCalledWith(nodes[1]);
    const envelope = gain?.gain as unknown as { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> };
    expect(envelope.setValueAtTime).toHaveBeenCalledWith(0.0001, 10.02);
    expect(envelope.exponentialRampToValueAtTime.mock.calls).toEqual([[peak, 10.02 + 0.004], [0.0001, 10.02 + decay]]);
    const ended = oscillator?.addEventListener.mock.calls[0]?.[1] as () => void;
    ended();
    expect(oscillator?.disconnect).toHaveBeenCalledOnce();
    expect((gain as unknown as { disconnect: ReturnType<typeof vi.fn> }).disconnect).toHaveBeenCalledOnce();
  }
});
