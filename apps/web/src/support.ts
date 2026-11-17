/** REL-006: capabilities, never browser names or optional device enhancements. */
export interface SupportEnvironment {
  pathname: string;
  Promise?: { allSettled?: unknown };
  globalThis?: unknown;
  replaceAll?: unknown;
  RTCPeerConnection?: { prototype?: { createDataChannel?: unknown } };
  WebSocket?: unknown;
  Element?: { prototype?: { animate?: unknown } };
  CSS?: { supports?: (property: string, value: string) => boolean };
  PointerEvent?: unknown;
  fetch?: unknown;
  AbortController?: unknown;
  AbortSignal?: { timeout?: unknown };
  URL?: unknown;
  URLSearchParams?: unknown;
  crypto?: { getRandomValues?: unknown };
  matchMedia?: unknown;
  getComputedStyle?: unknown;
  ResizeObserver?: unknown;
  requestAnimationFrame?: unknown;
  cancelAnimationFrame?: unknown;
  performance?: { now?: unknown };
}
export const classicFeatures = ['allSettled', 'global', 'replaceAll', 'timeout', 'webrtc', 'animate', 'clipPath', 'pointer'] as const;
export const featureNames = {
  allSettled: 'a recent browser engine', global: 'a recent browser engine', replaceAll: 'a recent browser engine',
  webrtc: 'direct connections between devices', websocket: 'live connections',
  animate: 'screen animations', clipPath: 'screen masks', pointer: 'touch controls',
  fetch: 'page requests', abort: 'a recent browser engine', timeout: 'a recent browser engine',
  url: 'page links', params: 'join links', random: 'a recent browser engine',
  media: 'screen preferences', styles: 'screen styling', resize: 'screen size changes', frames: 'screen timing', performance: 'a recent browser engine',
} as const;
export type MissingFeature = keyof typeof featureNames;
const callable = (value: unknown): boolean => typeof value === 'function';
export function missingFeatures(env: SupportEnvironment): MissingFeature[] {
  const checks: Record<MissingFeature, boolean> = {
    allSettled: callable(env.Promise?.allSettled), global: env.globalThis !== undefined, replaceAll: callable(env.replaceAll),
    webrtc: callable(env.RTCPeerConnection) && callable(env.RTCPeerConnection?.prototype?.createDataChannel),
    websocket: callable(env.WebSocket), animate: callable(env.Element?.prototype?.animate),
    clipPath: env.CSS?.supports?.('clip-path', 'inset(0)') === true,
    pointer: env.pathname.replace(/\/$/, '') !== '/play' || callable(env.PointerEvent),
    fetch: callable(env.fetch), abort: callable(env.AbortController), timeout: callable(env.AbortSignal?.timeout),
    url: callable(env.URL), params: callable(env.URLSearchParams), random: callable(env.crypto?.getRandomValues),
    media: callable(env.matchMedia), styles: callable(env.getComputedStyle), resize: callable(env.ResizeObserver), frames: callable(env.requestAnimationFrame) && callable(env.cancelAnimationFrame),
    performance: callable(env.performance?.now),
  };
  return (Object.keys(checks) as MissingFeature[]).filter(name => !checks[name]);
}
export const unsupportedHeading = 'This browser can’t run Kaki Arcade';
export function supportCopy(pathname: string): string {
  return pathname.replace(/\/$/, '') === '/play'
    ? 'Open the join link in an up-to-date Safari on iPhone or Chrome on Android.'
    : 'Open this page in an up-to-date Chrome, Edge or Safari on a computer.';
}
/** The pre-render decision used by main; the route is never mounted on failure. */
export function supportDecision(env: SupportEnvironment): { screen: 'route' | 'unsupported'; missing: MissingFeature[] } {
  const missing = missingFeatures({ Promise: globalThis.Promise, globalThis, replaceAll: Reflect.get(String.prototype, 'replaceAll'), ...env });
  return { screen: missing.length ? 'unsupported' : 'route', missing };
}
