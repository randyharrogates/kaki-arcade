import { describe, expect, it, vi, afterEach } from 'vitest';
import { decideDetail } from '@kaki/platform';
import { chooseDetail, detailKey, setDetailSetting, prepareDetail, sampleScene } from './detail-preparation';
import type { DetailStorage } from './detail-preparation';
function memory(): DetailStorage {
  const data = new Map<string, string>();
  return { get length() { return data.size; }, key: index => [...data.keys()][index] ?? null,
    getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } };
}
const env = { userAgent: 'TV', screen: { width: 1920, height: 1080, devicePixelRatio: 1 } };
function globals() {
  vi.stubGlobal('navigator', { userAgent: env.userAgent });
  vi.stubGlobal('screen', env.screen);
  vi.stubGlobal('window', { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1 });
  vi.stubGlobal('document', { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), createElement: () => ({ remove: vi.fn() }) });
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('PERF-002 Start detail', () => {
  it('uses median cadence, inclusive maximums and at most five percent dropped', () => {
    const judge = (times: number[]) => decideDetail({ frameTimes: times, hidden: false });
    expect(judge([...Array<number>(94).fill(16), ...Array<number>(6).fill(24)]).mode).toBe('full');
    expect(judge(Array<number>(100).fill(20.5)).mode).toBe('full');
    expect(judge(Array<number>(100).fill(20.51)).mode).toBe('lower');
    expect(judge([...Array<number>(95).fill(16), ...Array<number>(5).fill(50)]).mode).toBe('full');
    expect(judge([...Array<number>(94).fill(16), ...Array<number>(6).fill(25)]).mode).toBe('lower');
    expect(judge([...Array<number>(99).fill(16), 50.01]).mode).toBe('lower');
    expect(judge([...Array<number>(99).fill(33.3), 100]).lowerBudgetMet).toBe(true);
    expect(judge([...Array<number>(99).fill(33.3), 100.01]).lowerBudgetMet).toBe(false);
  });
  it('remembers per game on this TV and resets with the detail setting', async () => {
    globals();
    const storage = memory(); let calls = 0;
    const measure = () => { calls++; return Promise.resolve('lower' as const); };
    expect(await chooseDetail('one', 'auto', storage, measure)).toBe('lower');
    expect(await chooseDetail('one', 'auto', storage, measure)).toBe('lower');
    await chooseDetail('two', 'auto', storage, measure); expect(calls).toBe(2);
    setDetailSetting(storage, 'auto'); expect(storage.getItem(detailKey('one'))).toBeNull();
    await chooseDetail('one', 'auto', storage, measure); expect(calls).toBe(3);
  });
  it('PERF-023 waits for half resources on cached lower before returning', async () => {
    globals();
    const storage = memory(); await chooseDetail('one', 'auto', storage, () => Promise.resolve('lower'));
    let release = () => { /* Replaced by gate. */ }; let ready = false;
    const loaded: string[] = [];
    const gate = new Promise<void>(resolve => { release = resolve; });
    const pending = prepareDetail('one', {
      benchmarkScene: () => { throw Error('cached scene must not run'); },
      async loadBenchmarkAssets(detail) { loaded.push(detail); await gate; return {}; },
    }, storage).then(mode => { ready = true; return mode; });
    await Promise.resolve(); await Promise.resolve();
    expect(loaded).toEqual(['half']); expect(ready).toBe(false);
    release(); expect(await pending).toBe('lower');
  });
  it('keeps no-scene Auto full and honours explicit detail', async () => {
    const storage = memory(); storage.setItem(detailKey('one'), 'lower');
    expect(await chooseDetail('one', 'auto', storage)).toBe('full');
    expect(await chooseDetail('one', 'full', storage, () => { throw Error('must not run'); })).toBe('full');
  });
});

it('PERF-002 reuses only matching UA, dimensions and DPR; ignores raw strings', async () => {
  const storage = memory(), measure = vi.fn(() => Promise.resolve('full' as const));
  storage.setItem(detailKey('one'), 'lower');
  await chooseDetail('one', 'auto', storage, measure, env);
  await chooseDetail('one', 'auto', storage, measure, env);
  expect(measure).toHaveBeenCalledTimes(1);
  for (const changed of [ { ...env, userAgent: 'new' },
    { ...env, screen: { ...env.screen, width: 1280 } },
    { ...env, screen: { ...env.screen, height: 720 } },
    { ...env, screen: { ...env.screen, devicePixelRatio: 2 } } ]) {
    await chooseDetail('one', 'auto', storage, measure, changed);
    await chooseDetail('one', 'auto', storage, measure, env);
  }
  expect(measure).toHaveBeenCalledTimes(9);
});
it('PERF-002 visible 300 ms draws time out to cached Lower, including a failed Lower budget', async () => {
  globals(); vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => { callback(Date.now()); }, 16));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  const storage = memory();
  const pending = chooseDetail('slow', 'auto', storage, () => sampleScene(() => { vi.advanceTimersByTime(300); }));
  await vi.runAllTimersAsync(); expect(await pending).toBe('lower');
  expect(JSON.parse(storage.getItem(detailKey('slow')) ?? '{}') as unknown).toMatchObject({ data: { lowerBudgetMet: false } });
  expect(await chooseDetail('slow', 'auto', storage, () => { throw Error('cached'); })).toBe('lower');
});
it('PERF-002 benchmark load, draw and destroy failures use uncached Full; half load fails Start', async () => {
  globals(); vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => { callback(Date.now()); }, 16));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  for (const failure of ['load', 'draw', 'destroy']) {
    const storage = memory();
    const pending = prepareDetail('one', {
      loadBenchmarkAssets: () => failure === 'load' ? Promise.reject(Error('load')) : Promise.resolve({}),
      benchmarkScene: () => ({ draw() { if (failure === 'draw') throw Error('draw'); }, destroy() { if (failure === 'destroy') throw Error('destroy'); } }),
    }, storage);
    await vi.runAllTimersAsync(); expect(await pending).toBe('full');
    expect(storage.getItem(detailKey('one'))).toBeNull();
  }
  const storage = memory(); setDetailSetting(storage, 'lower');
  await expect(prepareDetail('one', { loadBenchmarkAssets: () => Promise.reject(Error('half')) }, storage)).rejects.toThrow('half');
});
it('PERF-002 cancellation stops sampling without caching', async () => {
  globals(); const cancel = vi.fn();
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', cancel);
  const storage = memory(), controller = new AbortController();
  const pending = chooseDetail('one', 'auto', storage, () => sampleScene(() => undefined, controller.signal), env, controller.signal);
  controller.abort(); await expect(pending).rejects.toThrow('Cancelled');
  expect(cancel).toHaveBeenCalled(); expect(storage.getItem(detailKey('one'))).toBeNull();
});
it('PERF-002 setting changes preserve C-13 measurement', () => {
  const storage = memory();
  const measurement = { mode: 'full', screen: env.screen, refreshRate: 60, userAgentHash: '12345678' };
  storage.setItem('kaki.host-device.platform.settings', JSON.stringify({ schemaVersion: 1, data: { detailMode: 'auto', measurement } }));
  setDetailSetting(storage, 'lower');
  expect(JSON.parse(storage.getItem('kaki.host-device.platform.settings') ?? '{}') as unknown).toMatchObject({ data: { measurement } });
});

it('PERF-002 a zero interval returns Full without caching an invalid sample', async () => {
  const storage = memory();
  const result = decideDetail({ frameTimes: [16, 0, 16], hidden: false });
  expect(result).toMatchObject({ mode: 'lower', valid: false });
  expect(await chooseDetail('one', 'auto', storage, () => Promise.resolve(result), env)).toBe('full');
  expect(storage.length).toBe(0);
});
