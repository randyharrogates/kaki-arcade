import { createHostDeviceStore, hostDeviceSettingsSchema, decideDetail, runDetailBenchmark, hashHostUserAgent } from '@kaki/platform';
import type { GamePresentation, DetailDecision, DetailScreen, HostRecordSchema } from '@kaki/platform';
export type Detail = 'full' | 'lower';
export type DetailSetting = Detail | 'auto';
const prefix = 'kaki.host-device.platform.detail-benchmark-';
function settingsRecord(storage: DetailStorage) {
  return createHostDeviceStore({ backend: () => storage }).open({ platform: true }, 'settings', hostDeviceSettingsSchema);
}
interface Measurement { mode: Detail; screen: DetailScreen; userAgentHash: string; lowerBudgetMet: boolean }
const schema: HostRecordSchema<Measurement> = {
  version: 1,
  validate(value): value is Measurement {
    if (!value || typeof value !== 'object') return false;
    const m = value as Record<string, unknown>;
    if (!m.screen || typeof m.screen !== 'object') return false;
    const display = m.screen as Record<string, unknown>;
    return (m.mode === 'full' || m.mode === 'lower') && typeof m.lowerBudgetMet === 'boolean'
      && typeof m.userAgentHash === 'string' && /^[0-9a-f]{8}$/.test(m.userAgentHash)
      && Object.keys(m).sort().join(',') === 'lowerBudgetMet,mode,screen,userAgentHash'
      && Object.keys(display).sort().join(',') === 'devicePixelRatio,height,width'
      && [display.width, display.height, display.devicePixelRatio].every(n => typeof n === 'number' && Number.isFinite(n) && n > 0);
  },
};
function record(storage: DetailStorage, id: string) {
  return createHostDeviceStore({ backend: () => storage }).open({ platform: true }, `detail-benchmark-${id}-v2`, schema);
}
export interface DetailEnvironment { userAgent: string; screen: DetailScreen }
function environment(): DetailEnvironment {
  return { userAgent: navigator.userAgent, screen: { width: screen.width, height: screen.height, devicePixelRatio: window.devicePixelRatio } };
}
function cancelled(signal?: AbortSignal): void { if (signal?.aborted) throw Error('Cancelled'); }
export interface DetailStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; length: number; key(index: number): string | null }
/** Lazy access also tolerates browsers that throw when reading localStorage itself. */
export const browserDetailStorage: DetailStorage = {
  get length() { return localStorage.length; }, key: index => localStorage.key(index),
  getItem: key => localStorage.getItem(key), setItem: (key, value) => { localStorage.setItem(key, value); },
  removeItem: key => { localStorage.removeItem(key); },
};
export function readDetailSetting(storage: DetailStorage): DetailSetting {
  return settingsRecord(storage).read()?.detailMode ?? 'auto';
}
export function setDetailSetting(storage: DetailStorage, mode: DetailSetting): void {
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) if (key?.startsWith(prefix)) storage.removeItem(key);
    const previous = settingsRecord(storage).read();
    settingsRecord(storage).savePoint({ detailMode: mode, measurement: previous?.measurement ?? null });
  } catch { /* Blocked storage must not prevent Start. */ }
}
export function detailKey(id: string): string { return `${prefix}${id}-v2`; }
export async function chooseDetail(id: string, mode: DetailSetting, storage: DetailStorage,
  measure?: () => Promise<DetailDecision | Detail | null>, env?: DetailEnvironment, signal?: AbortSignal): Promise<Detail> {
  cancelled(signal);
  if (mode !== 'auto') return mode;
  if (!measure) return 'full';
  const current = env ?? environment();
  const hash = hashHostUserAgent(current.userAgent);
  const store = record(storage, id), cached = store.read();
  if (cached?.userAgentHash === hash && cached.screen.width === current.screen.width
    && cached.screen.height === current.screen.height && cached.screen.devicePixelRatio === current.screen.devicePixelRatio) return cached.mode;
  let result: DetailDecision | Detail | null;
  try { result = await measure(); } catch { cancelled(signal); return 'full'; }
  cancelled(signal);
  if (result === null || (typeof result !== 'string' && !result.valid)) return 'full';
  const verdict = typeof result === 'string' ? result : result.mode;
  store.savePoint({ mode: verdict, screen: current.screen, userAgentHash: hash,
    lowerBudgetMet: typeof result === 'string' ? false : result.lowerBudgetMet });
  return verdict;
}
/** Shared sampler; hidden pages yield no verdict. A visible TV with too few intervals uses Lower. */
export async function sampleScene(draw: (timestamp: number) => void, signal?: AbortSignal): Promise<DetailDecision | null> {
  cancelled(signal);
  let timestamp = 0;
  const runner = runDetailBenchmark({
    setTimer: (callback, milliseconds) => setTimeout(callback, milliseconds),
    clearTimer: handle => { clearTimeout(handle as ReturnType<typeof setTimeout>); },
    request: callback => requestAnimationFrame(now => { timestamp = now; callback(now); }),
    cancel: handle => { cancelAnimationFrame(handle as number); }, hidden: () => document.hidden,
    onHidden(callback) {
      const listener = (): void => { if (document.hidden) callback(); };
      document.addEventListener('visibilitychange', listener);
      return () => { document.removeEventListener('visibilitychange', listener); };
    },
  }, () => { draw(timestamp); }, { durationMs: 1000, timeoutMs: 1400, warmupFrames: 5 });
  const abort = (): void => { runner.cancel(); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const sample = await runner.result; cancelled(signal);
    if (sample.hidden) return null;
    const decision = decideDetail(sample);
    return sample.frameTimes.length < 2 ? { ...decision, mode: 'lower', valid: true, lowerBudgetMet: false } : decision;
  } finally { signal?.removeEventListener('abort', abort); }
}
export async function prepareDetail(id: string, presentation: GamePresentation<HTMLElement, unknown>, storage: DetailStorage = browserDetailStorage, signal?: AbortSignal): Promise<Detail> {
  const scene = presentation.benchmarkScene;
  const load = presentation.loadBenchmarkAssets?.bind(presentation);
  const mode = await chooseDetail(id, readDetailSetting(storage), storage, scene ? async () => {
    const assets = await load?.('full'); cancelled(signal);
    const target = document.createElement('div');
    const width = window.innerWidth * window.devicePixelRatio, height = window.innerHeight * window.devicePixelRatio;
    const workload = scene(target, { width, height, assets });
    try { return await sampleScene(now => { workload.draw(now); }, signal); }
    finally { try { workload.destroy(); } finally { target.remove(); } }
  } : undefined, undefined, signal);
  cancelled(signal);
  if (mode === 'lower') await load?.('half');
  cancelled(signal);
  return mode;
}
