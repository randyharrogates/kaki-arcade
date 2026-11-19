import { afterEach, expect, it, vi } from 'vitest';
import type { Harness } from '../uat/harness.js';
import type { Capture } from './browser.js';
import { actionTiming, armPhoneFeedback } from './action-timing.js';

afterEach(() => { vi.unstubAllGlobals(); });
it('does not install timing observers in production (PERF-010, PERF-012)', async () => {
  const observe = vi.fn();
  expect(await actionTiming({} as Harness, { build: 'production', observe } as unknown as Capture, [])).toBeUndefined();
  expect(observe).not.toHaveBeenCalled();
});
it('correlates only the armed player/control/value at receipt and actual apply (PERF-010)', async () => {
  const browser: Record<string, unknown> = {};
  vi.stubGlobal('window', browser);
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  const evaluate = vi.fn((fn: () => void) => { fn(); return Promise.resolve(); });
  const host = { evaluate };
  const observe = vi.fn();
  await actionTiming({ host } as unknown as Harness, { build: 'development', observe } as unknown as Capture, []);
  expect(observe).toHaveBeenCalledWith(host);
  const emit = vi.fn();
  browser.__perfEmit = emit;
  browser.__perfAction = { player: 'seat-2', control: 'grid', value: 3, sequence: 19 };
  const hook = browser.__kakiActionTiming as (stage: string, player: string, control: string, value: number, accepted?: { round: number; wireRevision: number; gameRevision: number }) => void;
  hook('receipt', 'seat-1', 'grid', 3);
  hook('applied', 'seat-2', 'grid', 4);
  hook('applied', 'seat-2', 'lock', 3);
  expect(emit).not.toHaveBeenCalled();
  hook('receipt', 'seat-2', 'grid', 3);
  expect(browser.__perfApplied).toBeUndefined();
  hook('applied', 'seat-2', 'grid', 3);
  expect(emit.mock.calls).toEqual([['receipt', 'seat-2', 19], ['applied', 'seat-2', 19]]);
  expect(browser.__perfApplied).toBe(19);
  browser.__perfStep = 'Round 2 pick';
  hook('applied', 'seat-8', 'lock', 0, { round: 2, wireRevision: 40, gameRevision: 9 });
  expect(browser.__perfAcceptedActions).toEqual([{ step: 'Round 2 pick', player: 'seat-8', control: 'lock', value: 0, round: 2, wireRevision: 40, gameRevision: 9 }]);
});

it.each(['matrix(0.97, 0, 0, 0.97, 0, 0)', 'matrix(1, 0, 0, 1, 0, 0)', 'none'])('records only the pressed matrix at the next frame: %s (PERF-012)', transform => {
  const visible = transform.startsWith('matrix(0.97');
  const emit = vi.fn();
  vi.stubGlobal('window', { __perfEmit: emit });
  let listener: (event: unknown) => void = () => undefined;
  let nextFrame: () => void = () => undefined;
  const button = { dataset: { held: 'true' } };
  class Target { closest() { return button; } }
  vi.stubGlobal('Element', Target);
  vi.stubGlobal('document', { addEventListener: (_name: string, fn: typeof listener) => { listener = fn; } });
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => { nextFrame = fn; });
  vi.stubGlobal('getComputedStyle', () => ({ transform }));
  armPhoneFeedback({ player: 'seat-1', sequence: 4, pressedScale: 0.97 });
  listener({ isTrusted: false, target: new Target() });
  expect(emit).not.toHaveBeenCalled();
  listener({ isTrusted: true, target: new Target() });
  expect(emit.mock.calls).toEqual([['touch', 'seat-1', 4]]);
  nextFrame();
  expect(emit.mock.calls).toEqual(visible ? [['touch', 'seat-1', 4], ['feedback', 'seat-1', 4]] : [['touch', 'seat-1', 4]]);
});
