import { afterEach, expect, it, vi } from 'vitest';
import { hostSound } from './host-sound';
afterEach(() => { vi.unstubAllGlobals(); });
it('RZ-033 creates one TV context and complete graph on the first gesture, resumes and disposes it', () => {
  const resume = vi.fn(() => Promise.resolve()); const close = vi.fn(() => Promise.resolve());
  const createGain = vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn() }));
  const construct = vi.fn();
  class Context {
    state = 'suspended'; destination = {}; currentTime = 0;
    createDynamicsCompressor = () => ({ threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() });
    createGain = createGain; resume = resume; close = close;
    constructor() { construct(); }
  }
  vi.stubGlobal('AudioContext', Context);
  const target = new EventTarget();
  Object.defineProperty(target, 'localStorage', { get() { throw Error('blocked'); } });
  const audio = hostSound(target as unknown as Window);
  expect(construct).not.toHaveBeenCalled();
  target.dispatchEvent(new Event('keydown')); target.dispatchEvent(new Event('click'));
  expect(construct).toHaveBeenCalledTimes(1); expect(createGain).toHaveBeenCalledTimes(4);
  expect(resume).toHaveBeenCalledTimes(2);
  expect(audio.sound.getLevel('effects')).toBe(70);
  audio.dispose(); target.dispatchEvent(new Event('pointerdown'));
  expect(resume).toHaveBeenCalledTimes(2); expect(close).toHaveBeenCalledTimes(1);
});
it('RZ-033 reads and saves levels before any gesture and applies them to the created gains', () => {
  const values = new Map([['kaki.sound.levels', '{"effects":23,"music":12}']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const gains: { gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> }; connect: ReturnType<typeof vi.fn> }[] = [];
  class Context {
    state = 'suspended'; destination = {}; currentTime = 0;
    resume = () => Promise.resolve(); close = () => Promise.resolve();
    createDynamicsCompressor = () => ({ threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, connect: vi.fn() });
    createGain() { const node = { gain: { value: 1, setTargetAtTime: vi.fn() }, connect: vi.fn() }; gains.push(node); return node; }
  }
  vi.stubGlobal('AudioContext', Context);
  const target = new EventTarget(); Object.assign(target, { localStorage: storage });
  const audio = hostSound(target as unknown as Window);
  expect(audio.sound.getLevel('effects')).toBe(23);
  audio.sound.setLevel('effects', 42);
  expect(audio.sound.getLevel('effects')).toBe(42);
  expect(JSON.parse(values.get('kaki.sound.levels') ?? '')).toEqual({ effects: 42, music: 12 });
  expect(gains).toHaveLength(0);
  target.dispatchEvent(new Event('keydown'));
  expect(gains.slice(0, 3).map(g => g.gain.value)).toEqual([1, 0.42, 0.12]);
  audio.dispose();
});
