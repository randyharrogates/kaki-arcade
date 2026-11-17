import { keys, object } from '../reconnect/storage';
import type { HostRecordSchema } from './host-store';
import type { DetailDecision, IdleCadence, MeasuredDetail } from './benchmark';
export type DetailMode = 'auto' | MeasuredDetail;
export interface DetailMeasurement {
  mode: MeasuredDetail;
  screen: DetailScreen;
  refreshRate: number;
  userAgentHash: string;
}
export interface DetailScreen { width: number; height: number; devicePixelRatio: number }
function positive(v: unknown): v is number { return typeof v === 'number' && Number.isFinite(v) && v > 0; }
function screen(v: unknown): v is DetailScreen {
  return object(v) && keys(v, ['width', 'height', 'devicePixelRatio'])
    && positive(v.width) && positive(v.height) && positive(v.devicePixelRatio);
}
/** D-113: quantise idle cadence so timer jitter does not change the cache key. */
export function detailRefreshRate(medianInterval: number): number {
  const hz = 1000 / medianInterval;
  return [50, 60, 75, 90, 100, 120, 144, 165, 240].reduce((nearest, rate) =>
    Math.abs(rate - hz) < Math.abs(nearest - hz) ? rate : nearest, 60);
}
/** Build cache data only from a valid workload verdict and a separate idle probe. */
export function createDetailMeasurement(decision: DetailDecision, idle: IdleCadence | null,
  userAgent: string, display: DetailScreen): DetailMeasurement | null {
  if (!decision.valid || idle === null) return null;
  return { mode: decision.mode, screen: display, refreshRate: idle.refreshRate,
    userAgentHash: hashHostUserAgent(userAgent) };
}
export interface HostDeviceSettings { detailMode: DetailMode; measurement: DetailMeasurement | null }
export function defaultHostDeviceSettings(): HostDeviceSettings {
  return { detailMode: 'auto', measurement: null };
}
function detail(value: unknown): value is MeasuredDetail { return value === 'full' || value === 'lower'; }
export const hostDeviceSettingsSchema: HostRecordSchema<HostDeviceSettings> = {
  version: 1,
  validate(value): value is HostDeviceSettings {
    if (!object(value) || !keys(value, ['detailMode', 'measurement'])
      || !(value.detailMode === 'auto' || detail(value.detailMode))) return false;
    const m: unknown = value.measurement;
    return m === null || object(m) && keys(m, ['mode', 'screen', 'refreshRate', 'userAgentHash'])
      && detail(m.mode) && screen(m.screen) && positive(m.refreshRate) && Number.isInteger(m.refreshRate)
      && typeof m.userAgentHash === 'string' && /^[0-9a-f]{8}$/.test(m.userAgentHash);
  },
};
/** Non-identifying cache discriminator, not a cryptographic identity. Never transmitted.
 * UA changes invalidate the cache; identical UAs on different devices cannot be distinguished. */
export function hashHostUserAgent(userAgent: string): string {
  let hash = 2166136261;
  for (let i = 0; i < userAgent.length; i++) hash = Math.imul(hash ^ userAgent.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
function matches(settings: HostDeviceSettings, userAgent: string, display: DetailScreen, medianInterval: number): boolean {
  const m = settings.measurement;
  return m !== null && m.userAgentHash === hashHostUserAgent(userAgent)
    && m.screen.width === display.width && m.screen.height === display.height
    && m.screen.devicePixelRatio === display.devicePixelRatio
    && m.refreshRate === detailRefreshRate(medianInterval);
}
/** Supply a fresh cadence probe's median to detect display/refresh changes before reuse. */
export function needsDetailBenchmark(settings: HostDeviceSettings, userAgent: string,
  display: DetailScreen, medianInterval: number): boolean {
  return settings.detailMode === 'auto' && !matches(settings, userAgent, display, medianInterval);
}
export function effectiveDetail(settings: HostDeviceSettings, userAgent: string,
  display: DetailScreen, medianInterval: number): MeasuredDetail {
  if (settings.detailMode !== 'auto') return settings.detailMode;
  return matches(settings, userAgent, display, medianInterval) ? (settings.measurement?.mode ?? 'full') : 'full';
}
