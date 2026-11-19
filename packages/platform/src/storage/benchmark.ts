import { detailRefreshRate } from './settings';

export type MeasuredDetail = 'full' | 'lower';
export const FULL_FRAME_P95_MS = 16.7;
export const FULL_FRAME_MAX_MS = 50;
/** D-113: includes steady 50 Hz while excluding 40–48 Hz workload cadence. */
export const FULL_CADENCE_MAX_MS = 20.5;
export const LOWER_FRAME_P95_MS = 33.3;
export const LOWER_FRAME_MAX_MS = 100;
/** Sampling duration, not a new budget: 120 intervals (~2 s at 60 Hz). */
export const BENCHMARK_FRAME_COUNT = 120;
export const BENCHMARK_WARMUP_FRAMES = 10;
export interface FrameSample { frameTimes: readonly number[]; hidden: boolean; noWorkload?: boolean }
export interface DetailDecision {
  mode: MeasuredDetail;
  valid: boolean;
  lowerBudgetMet: boolean;
  reason?: string;
  median: number | null;
  p95: number | null;
  max: number | null;
}
/** D-111: dropped intervals exceed 1.5 times the median display interval.
 * Lower detail uses the 33.3 ms cadence; it remains the floor if that budget fails. */
export function decideDetail(sample: FrameSample): DetailDecision {
  if (sample.noWorkload) return { mode: 'full', valid: false, reason: 'no workload yet',
    lowerBudgetMet: false, median: null, p95: null, max: null };
  if (sample.hidden || sample.frameTimes.length === 0
    || sample.frameTimes.some(t => !Number.isFinite(t) || t <= 0))
    return { mode: 'lower', valid: false, lowerBudgetMet: false, median: null, p95: null, max: null };
  const sorted = [...sample.frameTimes].sort((a, b) => a - b);
  const median = sorted[Math.ceil(sorted.length / 2) - 1] ?? Infinity;
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1] ?? Infinity;
  const max = sorted[sorted.length - 1] ?? Infinity;
  const dropped = (interval: number): number => sorted.filter(t => t > 1.5 * interval).length / sorted.length;
  // A throttled 30 Hz sample cannot qualify as full even without dropped frames.
  const full = median <= FULL_CADENCE_MAX_MS && dropped(median) <= 0.05 && max <= FULL_FRAME_MAX_MS;
  return { mode: full ? 'full' : 'lower', valid: true, median,
    lowerBudgetMet: dropped(LOWER_FRAME_P95_MS) <= 0.05 && max <= LOWER_FRAME_MAX_MS, p95, max };
}
/** Browser shell adapter: request = cb => requestAnimationFrame(cb), hidden = document.hidden; onHidden subscribes to visibilitychange
 * and calls back when hidden. No DOM environment is needed here. */
export interface BenchmarkSource {
  request(callback: (timestamp: number) => void): unknown;
  cancel(handle: unknown): void;
  hidden(): boolean;
  /** Required together when a wall timeout is requested. */
  setTimer?(callback: () => void, milliseconds: number): unknown;
  clearTimer?(handle: unknown): void;
  /** Must observe hiding between frames, even if the tab is visible by the next frame. */
  onHidden(callback: () => void): () => void;
}
/** Runs the injected representative workload once per frame. Without work, auto
 * stays full with valid=false and reason "no workload yet"; never cache an idle lobby.
 * Discard ten initial callbacks so lobby paint/JIT warm-up cannot set the verdict. */
export function runDetailBenchmark(source: BenchmarkSource, work?: () => void, options: { durationMs?: number; timeoutMs?: number; warmupFrames?: number } = {}): {
  result: Promise<FrameSample>;
  cancel(): void;
} {
  return runFrameSample(source, work, BENCHMARK_FRAME_COUNT, options);
}
export interface IdleCadence { median: number; refreshRate: number }
/** D-113: short idle display probe; never a workload verdict. Invalid probes return null. */
export function probeIdleCadence(source: BenchmarkSource): {
  result: Promise<IdleCadence | null>; cancel(): void;
} {
  const runner = runFrameSample(source, () => { /* Intentionally idle. */ }, 30);
  return { cancel: () => { runner.cancel(); }, result: runner.result.then(sample => {
    const decision = decideDetail(sample);
    return decision.valid && decision.median !== null
      ? { median: decision.median, refreshRate: detailRefreshRate(decision.median) } : null;
  }) };
}
function runFrameSample(source: BenchmarkSource, work: (() => void) | undefined, count: number, options: { durationMs?: number; timeoutMs?: number; warmupFrames?: number } = {}): {
  result: Promise<FrameSample>; cancel(): void;
} {
  if (options.timeoutMs !== undefined && (!source.setTimer || !source.clearTimer)) throw new Error('Benchmark timeout requires a timer source');
  const frameTimes: number[] = [];
  let warmup = options.warmupFrames ?? BENCHMARK_WARMUP_FRAMES;
  let started: number | undefined;
  let timer: unknown;
  let fail: (error: unknown) => void = () => undefined;
  let previous: number | undefined;
  let handle: unknown;
  let done = false;
  const isDone = (): boolean => done;
  let unsubscribe = () => { /* Installed before requesting frames. */ };
  let hidden = source.hidden();
  let finish: (sample: FrameSample) => void = () => { /* Installed before requesting a frame. */ };
  const result = new Promise<FrameSample>((resolve, reject) => { finish = resolve; fail = reject; });
  function complete(error?: unknown, failed = false): void {
    if (done) return;
    done = true;
    source.cancel(handle);
    if (timer !== undefined) source.clearTimer?.(timer);
    unsubscribe();
    if (failed) fail(error); else finish({ frameTimes, hidden });
  }
  function frame(now: number): void {
    if (done) return;
    hidden ||= source.hidden();
    if (hidden) { complete(); return; }
    started ??= now;
    try { work?.(); } catch (error) { complete(error, true); return; }
    if (isDone()) return;
    if (options.durationMs !== undefined && now - started >= options.durationMs) { complete(); return; }
    if (warmup > 0) {
      warmup--;
      handle = source.request(frame);
      return;
    }
    if (previous !== undefined) frameTimes.push(now - previous);
    previous = now;
    if (options.durationMs === undefined && frameTimes.length === count) complete();
    else handle = source.request(frame);
  }
  unsubscribe = source.onHidden(() => { hidden = true; complete(); });
  if (!work) { done = true; unsubscribe(); finish({ frameTimes, hidden, noWorkload: true }); }
  else if (hidden) { complete(); unsubscribe(); }
  else {
    if (options.timeoutMs !== undefined) timer = source.setTimer?.(complete, options.timeoutMs);
    handle = source.request(frame);
  }
  return { result, cancel(): void { hidden = true; complete(); } };
}
