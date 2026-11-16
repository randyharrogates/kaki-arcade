import { describe, expect, it } from 'vitest';
import { duration, STAGGER_MS } from '@kaki/ui';
import { lobbyMasks, lobbyMotion } from './lobby-motion';

describe('masked lobby state changes (NN-5)', () => {
  it('uses token durations and row stagger with a shared mask timing', () => {
    for (const row of [true, false]) for (let index = 0; index < 8; index++) {
      const motion = lobbyMotion(row, index, { reduced: false });
      expect(motion.incoming.options.duration).toBe(row ? duration.base : duration.slow);
      expect(motion.incoming.options.delay).toBe(row ? index * STAGGER_MS : 0);
      expect(motion.outgoing.options).toEqual(motion.incoming.options);
    }
  });
  it('partitions each slot without overlapping readable regions or a blank region', () => {
    for (let step = 0; step <= 100; step++) {
      const masks = lobbyMasks(step / 100);
      expect(masks.incoming).toBe(`inset(0 0 ${String(100 - step)}% 0)`);
      expect(masks.outgoing).toBe(`inset(${String(step)}% 0 0 0)`);
    }
  });
  it('immediately reveals only the incoming label under reduced motion', () => {
    const motion = lobbyMotion(true, 7, { reduced: true });
    expect(motion.incoming.options).toMatchObject({ duration: 0, delay: 0 });
    expect(motion.incoming.keyframes).toEqual([{ clipPath: 'inset(0 0 0% 0)' }]);
    expect(motion.outgoing.keyframes).toEqual([{ clipPath: 'inset(100% 0 0 0)' }]);
  });
});

it('fades outgoing labels to eight percent in the first third while preserving the wipe', () => {
  for (const row of [true, false]) {
    const frames = lobbyMotion(row, 0, { reduced: false }).outgoing.keyframes;
    expect(frames).toEqual([
      { clipPath: lobbyMasks(0).outgoing, opacity: 1, offset: 0 },
      { clipPath: lobbyMasks(1 / 3).outgoing, opacity: 0.08, offset: 1 / 3 },
      { clipPath: lobbyMasks(1).outgoing, opacity: 0.08, offset: 1 },
    ]);
  }
});
