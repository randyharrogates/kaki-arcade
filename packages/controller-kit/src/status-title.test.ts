import { afterEach, expect, it, vi } from 'vitest';
import { pulse } from '@kaki/ui';
import { pulseStatusTitle } from './status-title';

afterEach(() => { vi.unstubAllGlobals(); });
it.each([false,true])('PLAT-022 success uses the pulse token, reduced motion=%s', reduced => {
  vi.stubGlobal('matchMedia',() => ({matches:reduced}));
  vi.stubGlobal('getComputedStyle',() => ({getPropertyValue:() => 'success'}));
  const cancel = vi.fn(), animate = vi.fn(() => ({cancel}));
  const cleanup = pulseStatusTitle({animate} as unknown as HTMLElement);
  expect(animate).toHaveBeenCalledTimes(reduced ? 0 : 1);
  if (!reduced) {
    const motion = pulse();
    expect(animate).toHaveBeenCalledWith(motion.keyframes,motion.options);
    cleanup?.(); expect(cancel).toHaveBeenCalledOnce();
  }
});
it.each(['','none'])('PLAT-022 neutral and failure titles do not pulse (%s)', property => {
  vi.stubGlobal('matchMedia',() => ({matches:false}));
  vi.stubGlobal('getComputedStyle',() => ({getPropertyValue:() => property}));
  const animate = vi.fn();
  expect(pulseStatusTitle({animate} as unknown as HTMLElement)).toBeUndefined();
  expect(animate).not.toHaveBeenCalled();
});
