import { hostDeviceSettingsSchema, createDetailMeasurement, defaultHostDeviceSettings, effectiveDetail, needsDetailBenchmark } from './settings';
import { createHostDeviceStore } from './host-store';
import { expect, it } from 'vitest';
import { BENCHMARK_FRAME_COUNT, decideDetail, probeIdleCadence, runDetailBenchmark } from './benchmark';
const decide = (frameTimes: number[]) => decideDetail({ frameTimes, hidden: false });
it('PERF-001 D-111 accepts quantised 60 Hz with jitter and 120 Hz, rejects drops and throttling', () => {
  for (const quantum of [1, 0.1]) {
    const timestamps = Array.from({ length: 121 }, (_, i) => Math.round((i * 1000 / 60 + (i % 2 ? 0.3 : -0.3)) / quantum) * quantum);
    expect(decide(timestamps.slice(1).map((t, i) => t - (timestamps[i] ?? 0))).mode).toBe('full');
  }
  for (const [hz, mode] of [[50, 'full'], [45, 'lower'], [60, 'full']] as const)
    expect(decide(Array<number>(120).fill(1000 / hz)).mode).toBe(mode);
  expect(decide([20.5]).mode).toBe('full');
  expect(decide([20.501]).mode).toBe('lower');
  expect(decide(Array<number>(120).fill(1000 / 120)).mode).toBe('full');
  expect(decide([...Array<number>(90).fill(16.7), ...Array<number>(10).fill(33.4)]).mode).toBe('lower');
  expect(decide([...Array<number>(99).fill(16.7), 60]).mode).toBe('lower');
  expect(decide(Array<number>(120).fill(1000 / 30)).mode).toBe('lower');
});
it('PERF-001/002 pins median, nearest rank p95, max and inclusive dropped/max limits', () => {
  const mixed = [...Array<number>(90).fill(10), ...Array<number>(5).fill(14), ...Array<number>(4).fill(20), 50];
  expect(decide(mixed)).toMatchObject({ median: 10, p95: 14, max: 50, mode: 'full' });
  expect(mixed[Math.ceil(mixed.length * 0.99) - 1]).toBe(20);
  expect(mixed[0]).toBe(10);
  expect(decide([...Array<number>(94).fill(10), ...Array<number>(6).fill(20)]).mode).toBe('lower');
  expect(decide([...Array<number>(99).fill(10), 50.01]).mode).toBe('lower');
  expect(decide([...Array<number>(95).fill(33.3), ...Array<number>(5).fill(100)]).lowerBudgetMet).toBe(true);
  expect(decide([...Array<number>(99).fill(33.3), 100.01]).lowerBudgetMet).toBe(false);
  expect(decide([...Array<number>(94).fill(33.3), ...Array<number>(6).fill(50)]).lowerBudgetMet).toBe(false);
  expect(decide([10, 15]).mode).toBe('full');
});
it('PERF-002 invalid samples cannot be cached', () => {
  for (const frameTimes of [[], [NaN], [Infinity], [0], [-1]]) expect(decide(frameTimes).valid).toBe(false);
  expect(decideDetail({ frameTimes: [10], hidden: true }).valid).toBe(false);
});
function source(work: (() => void) | undefined = () => { /* Test adapter has no work here. */ }, options: Parameters<typeof runDetailBenchmark>[2] = {}) {
  let callback: (timestamp: number) => void = () => { /* Test adapter has no work here. */ };
  let time = 0; let hidden = false; let cancelled = 0; let onHidden = () => { /* Test adapter has no work here. */ };
  const runner = runDetailBenchmark({ request(cb) { callback = cb; return 1; },
    cancel() { cancelled++; }, hidden: () => hidden,
    onHidden(cb) { onHidden = cb; return () => { onHidden = () => { /* Test adapter has no work here. */ }; }; } }, work, options);
  return { runner, tick(dt = 1000 / 60) { time += dt; callback(time); },
    hide() { hidden = true; onHidden(); }, show() { hidden = false; }, cancelled: () => cancelled };
}
it('PERF-002 uses timestamps, runs workload each callback and discards ten warm-up callbacks', async () => {
  let calls = 0; const f = source(() => { calls++; });
  for (let i = 0; i < 10; i++) f.tick(100);
  for (let i = 0; i <= BENCHMARK_FRAME_COUNT; i++) f.tick();
  const sample = await f.runner.result;
  expect(sample.frameTimes).toHaveLength(120);
  expect(decideDetail(sample).mode).toBe('full');
  expect(calls).toBe(131);
  expect(f.cancelled()).toBe(1);
  f.tick(); expect(calls).toBe(131);
});
it('PERF-002 hide then show between frames invalidates; cancellation is idempotent', async () => {
  const f = source(); f.tick(); f.hide(); f.show(); f.tick();
  expect(decideDetail(await f.runner.result).valid).toBe(false);
  const active = source(); active.runner.cancel(); active.runner.cancel();
  expect((await active.runner.result).hidden).toBe(true); expect(active.cancelled()).toBe(1);
});
it('PERF-002 no workload means full, invalid, no workload yet', async () => {
  const runner = runDetailBenchmark({ request() { throw new Error('must not sample idle'); },
    cancel() { /* No request was made. */ }, hidden: () => false, onHidden: () => () => { /* Test adapter has no work here. */ } });
  expect(decideDetail(await runner.result)).toMatchObject({ mode: 'full', valid: false, reason: 'no workload yet' });
});

it('PERF-002 D-113 caches idle cadence independently of workload and reuses jittered idle keys', async () => {
  const display = { width: 1920, height: 1080, devicePixelRatio: 1 };
  for (const interval of [16, 17]) {
    let callback: (time: number) => void = () => { /* Assigned by request. */ };
    const probe = probeIdleCadence({ request(cb) { callback = cb; return 1; },
      cancel() { /* Fake frame queue. */ }, hidden: () => false,
      onHidden: () => () => { /* No listener in fake source. */ } });
    for (let i = 0; i < 41; i++) callback(i * interval);
    const idle = await probe.result;
    expect(idle).toEqual({ median: interval, refreshRate: 60 });
    const decision = decide(Array<number>(120).fill(1000 / 30));
    const settings = defaultHostDeviceSettings();
    settings.measurement = createDetailMeasurement(decision, idle, 'TV', display);
    let stored = '';
    const record = createHostDeviceStore({ backend: () => ({ getItem: () => stored || null,
      setItem: (_key, value) => { stored = value; } }) })
      .open({ platform: true }, 'settings', hostDeviceSettingsSchema);
    expect(record.savePoint(settings)).toEqual({ saved: true });
    expect(record.read()?.measurement?.refreshRate).toBe(60);
    expect(settings.measurement?.mode).toBe('lower');
    expect(needsDetailBenchmark(settings, 'TV', display, 17)).toBe(false);
    expect(effectiveDetail(settings, 'TV', display, 16)).toBe('lower');
    expect(createDetailMeasurement(decideDetail({ frameTimes: [], hidden: false }), idle, 'TV', display)).toBeNull();
    expect(createDetailMeasurement(decision, null, 'TV', display)).toBeNull();
  }
});

it('PERF-002 duration sampling keeps drawing beyond 120 intervals on fast displays', async () => {
  let draws = 0;
  const f = source(() => { draws++; }, { durationMs: 1000, warmupFrames: 0 });
  for (let i = 0; i <= 1000; i++) f.tick(1);
  expect((await f.runner.result).frameTimes.length).toBeGreaterThan(120);
  expect(draws).toBe(1001);
});
it('PERF-002 workload throws reject and release sampling', async () => {
  const f = source(() => { throw new Error('draw'); });
  f.tick();
  await expect(f.runner.result).rejects.toThrow('draw');
  expect(f.cancelled()).toBe(1);
});
