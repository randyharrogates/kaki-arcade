import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createPerfTiming } from '../../packages/platform/src/harness/perf-timing';
import type { PerfTimingEvent } from '../../packages/platform/src/harness/perf-timing';
import { correlate, feedbackMilliseconds } from './timing.js';
it('opt-in timing stamps touch/receipt/application/feedback and retains incomplete inputs (PERF-010, PERF-012)', () => {
  const events: PerfTimingEvent[] = [];
  let epoch = 1000, frame = 1;
  const options = { enabled: true, player: 'p1', now: () => epoch, frame: () => frame, record: (e: PerfTimingEvent) => { events.push(e); } };
  expect(createPerfTiming({ ...options, enabled: false })).toBeUndefined();
  const hook = createPerfTiming(options);
  hook?.('touch', 1); epoch += 10; frame++; hook?.('feedback', 1); hook?.('receipt', 1); epoch += 5; frame++; hook?.('applied', 1);
  hook?.('touch', 2);
  expect(correlate(events)).toEqual({ incomplete: 1, missingFeedback: 1, feedback: [1], samples: [{ touch: 1000, receipt: 1010, applied: 1015, frame: 3, touchFrame: 1, feedbackFrame: 2 }] });
  const first = events[0]; if (!first) throw new Error('Missing touch');
  expect(() => correlate([...events, first])).toThrow('Duplicate');
  expect(() => correlate([{ ...first, sequence: -1 }])).toThrow('Invalid');
});
it('product entries do not import the optional hook (zero production dependency edges)', async () => {
  for (const name of ['packages/platform/src/index.ts', 'packages/platform/src/harness/index.ts']) expect(await readFile(name, 'utf8')).not.toContain('perf-timing');
});

it('feedback does not depend on receipt or application (PERF-012)', () => {
  const base: PerfTimingEvent = { marker: 'kaki-perf-timing-v1', player: 'p', sequence: 1, stage: 'touch', frame: 2, epochMs: 10 };
  expect(correlate([base, { ...base, stage: 'feedback', frame: 4 }])).toMatchObject({ samples: [], incomplete: 1, feedback: [2], missingFeedback: 0 });
  expect(correlate([base])).toMatchObject({ feedback: [], missingFeedback: 1 });
});

it('PERF-012 reports elapsed touch to feedback milliseconds independently of apply', () => {
  const touch: PerfTimingEvent = { marker: 'kaki-perf-timing-v1', player: 'seat-8', sequence: 4, stage: 'touch', frame: 10, epochMs: 100 };
  expect(feedbackMilliseconds([touch, { ...touch, stage: 'feedback', frame: 11, epochMs: 116.5 }])).toEqual([16.5]);
});
