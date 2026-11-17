import { cpus, loadavg, platform, release, totalmem } from 'node:os';
export function summary(values: readonly number[]) {
  if (values.some(v => !Number.isFinite(v) || v < 0)) throw new Error('Invalid samples');
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => sorted.length ? sorted[Math.ceil(sorted.length * p) - 1] ?? null : null;
  return { count: sorted.length, median: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99), max: sorted.at(-1) ?? null, over50: sorted.filter(v => v > 50).length };
}
export type Status = 'pass' | 'fail' | 'not assessed' | 'insufficient samples';
export interface Assessment { id: string; status: Status; reason: string }
export function evaluate(id: 'PERF-001' | 'PERF-010' | 'PERF-012', values: number[], options: { reason?: string | undefined; minimum: number; headed?: boolean; seconds?: number }): Assessment {
  const reason = options.reason ?? (id === 'PERF-001' && !options.headed ? 'Headless rAF has not been shown representative' : undefined);
  if (reason) return { id, status: 'not assessed', reason };
  const stats = summary(values);
  if (stats.count < options.minimum || (id === 'PERF-001' && (options.seconds ?? 0) < 180)) return { id, status: 'insufficient samples', reason: `Requires ${String(options.minimum)} samples${id === 'PERF-001' ? ' and 180 seconds' : ''}` };
  const failed = id === 'PERF-001' ? (stats.p95 ?? Infinity) > 16.7 || (stats.max ?? Infinity) > 50 : id === 'PERF-010' ? (stats.p95 ?? Infinity) > 50 : values.some(v => v > 1);
  return { id, status: failed ? 'fail' : 'pass', reason: id === 'PERF-012' ? 'Feedback in at most one presentation frame' : id === 'PERF-001' ? 'p95 ≤16.7 ms; max ≤50 ms' : 'Direct input p95 ≤50 ms' };
}
export function machine() {
  const processors = cpus(), load = loadavg();
  return { platform: platform(), release: release(), cpu: processors[0]?.model ?? 'unknown', cores: processors.length, totalMemoryBytes: totalmem(), node: process.version, loadAverageStart: load, contention: (load[0] ?? 0) > processors.length ? 'detected (one-minute load exceeds logical CPUs)' : 'unknown (load average cannot establish a quiet machine)' };
}
export interface Timing { touch: number; receipt: number; applied: number; frame: number; feedbackFrame?: number; touchFrame?: number }
export function timing(sample: Timing) {
  if (![sample.touch, sample.receipt, sample.applied, sample.frame].every(Number.isFinite) || sample.receipt < sample.touch - 2 || sample.applied < sample.receipt - 2 || !Number.isInteger(sample.frame)) throw new Error('Invalid timing or clocks');
  const feedback = sample.feedbackFrame !== undefined && sample.touchFrame !== undefined ? sample.feedbackFrame - sample.touchFrame : null;
  if (feedback !== null && (!Number.isInteger(feedback) || feedback < 0)) throw new Error('Invalid feedback frames');
  return { inputMs: Math.max(0, sample.applied - sample.touch), transportMs: Math.max(0, sample.receipt - sample.touch), applyWaitMs: Math.max(0, sample.applied - sample.receipt), feedbackFrames: feedback };
}

export function clockTick() {
  let tick = Infinity, previous = performance.now();
  for (let i = 0; i < 10000; i++) { const now = performance.now(); if (now > previous) tick = Math.min(tick, now - previous); previous = now; }
  return tick;
}
export function resolution(stats: ReturnType<typeof summary>, tick: number) {
  return Object.fromEntries(['median', 'p95', 'p99', 'max'].map(key => { const value = stats[key as 'median']; return [key, value !== null && value < 4 * tick ? 'below resolution' : 'resolved']; }));
}
