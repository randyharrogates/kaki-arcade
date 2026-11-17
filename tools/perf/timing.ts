import type { PerfTimingEvent } from '../../packages/platform/src/harness/perf-timing';
import { timing } from './metrics.js';
import type { Timing } from './metrics.js';
/** Correlation is player+sequence; clear between scenarios, before sequence wrap.
 * Incomplete/lost inputs remain counted, never silently replaced by receipt latency.
 */
export function correlate(events: readonly PerfTimingEvent[]) {
  const groups = new Map<string, Partial<Record<PerfTimingEvent['stage'], PerfTimingEvent>>>();
  for (const event of events) {
    if (!Number.isInteger(event.sequence) || event.sequence < 0 || event.sequence > 65535 || !Number.isFinite(event.epochMs) || !Number.isInteger(event.frame) || event.frame < 0) throw new Error('Invalid timing event');
    const key = `${event.player}:${String(event.sequence)}`;
    const group = groups.get(key) ?? {};
    if (group[event.stage]) throw new Error('Duplicate timing stage; start a new capture before sequence wrap');
    group[event.stage] = event; groups.set(key, group);
  }
  const samples: Timing[] = [];
  let incomplete = 0, missingFeedback = 0;
  const feedback: number[] = [];
  for (const group of groups.values()) {
    if (group.touch) { if (group.feedback) { const frames = group.feedback.frame - group.touch.frame; if (frames < 0) throw new Error('Invalid feedback frames'); feedback.push(frames); } else missingFeedback++; }
    if (!group.touch || !group.receipt || !group.applied) { incomplete++; continue; }
    const sample: Timing = { touch: group.touch.epochMs, receipt: group.receipt.epochMs, applied: group.applied.epochMs, frame: group.applied.frame,
      touchFrame: group.touch.frame, ...(group.feedback ? { feedbackFrame: group.feedback.frame } : {}) };
    timing(sample); samples.push(sample);
  }
  return { samples, incomplete, feedback, missingFeedback };
}
