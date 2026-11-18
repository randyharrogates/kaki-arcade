/// <reference lib="dom" />
import { expect, it, vi } from 'vitest';
import type { Harness } from '../uat/harness.js';
import type { Capture } from './browser.js';
import scenario from '../../uat/perf/rabakz-screen.mjs';

it('RZ-030 NFR-PERF cycles real dev fixtures, solo states included, for 2750 callbacks without claiming a round', async () => {
  const states: string[] = [];
  let frames = 0;
  vi.stubGlobal('window', { __rzPerfState: (name: string) => { states.push(name); } });
  vi.stubGlobal('document', { fonts: { ready: Promise.resolve() } });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(++frames); return frames; });
  const roundStart = vi.fn(), roundEnd = vi.fn();
  const h = {
    host: {
      locator: () => ({ first: () => ({ waitFor: () => Promise.resolve() }) }),
      evaluate: (fn: (value?: unknown) => unknown, value?: unknown) => Promise.resolve(fn(value)),
    },
    step: (_name: string, action: () => Promise<void>) => action(),
  } as unknown as Harness;
  try {
    await (scenario as { run(h: Harness, capture: Capture): Promise<void> }).run(h, { roundStart, roundEnd } as unknown as Capture);
    expect(states).toEqual(Array.from({ length: 5 }, () => ['open', 'reveal-one-winner', 'perf-next-question', 'picture-question', 'open', 'scoreboard-teams', 'reveal-teams', 'podium-teams', 'perf-solo-best', 'perf-solo-final']).flat());
    expect(frames).toBe(2750);
    expect(roundStart).not.toHaveBeenCalled();
    expect(roundEnd).not.toHaveBeenCalled();
    expect(scenario.frameReason).toContain('not a real busiest 180-second round');
    expect(scenario.hostPage).toContain('/games/rabakz/dev/index.html?perf=1&players=8');
  } finally { vi.unstubAllGlobals(); }
});
