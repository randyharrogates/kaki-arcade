import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { resolve } from 'node:path';
import { classicFeatures, featureNames, missingFeatures, supportCopy, supportDecision } from './support';
import type { SupportEnvironment } from './support';
import { unsupportedDemo } from './unsupported-demo';
const fn = () => undefined;
function supported(): SupportEnvironment {
  return { Promise: { allSettled: fn }, globalThis: {}, replaceAll: fn, pathname: '/host', RTCPeerConnection: Object.assign(fn, { prototype: { createDataChannel: fn } }),
    WebSocket: fn, Element: { prototype: { animate: fn } }, CSS: { supports: () => true }, PointerEvent: fn,
    fetch: fn, AbortController: fn, AbortSignal: { timeout: fn }, URL: fn, URLSearchParams: fn,
    crypto: { getRandomValues: fn }, matchMedia: fn, getComputedStyle: fn, ResizeObserver: fn, requestAnimationFrame: fn, cancelAnimationFrame: fn,
    performance: { now: fn } };
}
describe('REL-006 browser capabilities', () => {
  it('accepts every feature and chooses the route', () => {
    expect(missingFeatures(supported())).toEqual([]);
    expect(supportDecision(supported())).toEqual({ screen: 'route', missing: [] });
  });
  const absent = {
    allSettled: 'Promise', global: 'globalThis', replaceAll: 'replaceAll', webrtc: 'RTCPeerConnection', websocket: 'WebSocket', animate: 'Element', clipPath: 'CSS',
    pointer: 'PointerEvent', fetch: 'fetch', abort: 'AbortController', timeout: 'AbortSignal',
    url: 'URL', params: 'URLSearchParams', random: 'crypto', media: 'matchMedia', styles: 'getComputedStyle', resize: 'ResizeObserver',
    frames: 'requestAnimationFrame', performance: 'performance',
  } as const;
  it.each(Object.keys(featureNames) as (keyof typeof featureNames)[])('reports missing %s and prevents mounting the route', name => {
    const env = supported(); env.pathname = '/play'; Object.assign(env, { [absent[name]]: undefined });
    expect(missingFeatures(env)).toEqual([name]);
    expect(supportDecision(env)).toEqual({ screen: 'unsupported', missing: [name] });
  });
  it('requires data channels, animations and the actual mask syntax', () => {
    const env = supported(); env.RTCPeerConnection = Object.assign(() => undefined, { prototype: {} });
    env.Element = { prototype: {} }; env.CSS = { supports: (property, value) => property !== 'clip-path' || value !== 'inset(0)' };
    expect(missingFeatures(env)).toEqual(['webrtc', 'animate', 'clipPath']);
  });
  it('requires pointer events only on play, including a trailing slash', () => {
    const env = supported(); delete env.PointerEvent;
    expect(missingFeatures(env)).toEqual([]);
    env.pathname = '/'; expect(missingFeatures(env)).toEqual([]);
    env.pathname = '/play/'; expect(missingFeatures(env)).toEqual(['pointer']);
  });
  it('does not require wake lock, vibration, motion or visualViewport', () => {
    expect(missingFeatures({ ...supported(), navigator: {}, DeviceMotionEvent: undefined, visualViewport: undefined } as SupportEnvironment)).toEqual([]);
  });
  it.each(['/', '/host', '/host/'])('gives computer guidance on %s', path => {
    expect(supportCopy(path)).toBe('Open this page in an up-to-date Chrome, Edge or Safari on a computer.');
  });
  it('gives phone guidance on play', () => {
    expect(supportCopy('/play')).toBe('Open the join link in an up-to-date Safari on iPhone or Chrome on Android.');
  });
  it('filters demo names and requires the explicit demo', () => {
    expect(unsupportedDemo('?demo=unsupported&missing=webrtc,animate,nonsense')).toEqual(['webrtc', 'animate']);
    expect(unsupportedDemo('?missing=webrtc')).toEqual([]);
  });
  it('keeps the ES5 preflight before the entry and mirrors its capability list', () => {
    const html = readFileSync(resolve('apps/web/index.html'), 'utf8');
    const script = /<script id="support-preflight">([\s\S]*?)<\/script>/.exec(html)?.[1];
    expect(script).toBeTruthy();
    expect(html.indexOf('id="support-preflight"')).toBeLessThan(html.indexOf('type="module"'));
    // The brief explicitly requires parsing this classic bootstrap with new Function.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    expect(() => new Function(script ?? '')).not.toThrow();
    expect(script).not.toMatch(/=>|\b(?:const|let|class)\b|\?\.|`/);
    expect(/classicFeatures: ([^*]+)/.exec(script ?? '')?.[1]?.trim().split(', ')).toEqual([...classicFeatures]);
    for (const token of ['AbortSignal.timeout', 'allSettled', 'globalThis', 'replaceAll', 'RTCPeerConnection', 'Element.prototype.animate', "supports('clip-path', 'inset(0)')", 'PointerEvent', "!== '/play'"]) expect(script).toContain(token);
    const config = readFileSync(resolve('apps/web/vite.config.ts'), 'utf8');
    expect(config).toContain("hasAttribute('data-unsupported')");
  });
  const backstopCases = [false, true].flatMap(preflight => [false, true].flatMap(marker =>
    [false, true].flatMap(error => [false, true].map(rendered => ({ preflight, marker, error, rendered })))));
  it.each(backstopCases)('static backstop decision %j', ({ preflight, marker, error, rendered }) => {
    const html = readFileSync(resolve('apps/web/index.html'), 'utf8');
    const script = /<script id="support-preflight">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
    const listeners: Record<string, () => void> = {};
    const app = { hasChildNodes: () => rendered, style: { display: '' } };
    let visible = false;
    const screen = { removeAttribute: () => { visible = true; } };
    const phone = { hidden: true }; const computer = { hidden: true };
    const nodes: Record<string, unknown> = { app, 'unsupported-classic': screen, 'unsupported-phone': phone, 'unsupported-computer': computer };
    const document = { documentElement: { setAttribute: () => undefined, getAttribute: () => marker ? 'run' : null },
      addEventListener: (name: string, listener: () => void) => { listeners[name] = listener; },
      getElementById: (id: string) => nodes[id] };
    const window = { location: { pathname: '/play' }, addEventListener: document.addEventListener,
      Promise: { allSettled: fn }, AbortSignal: Object.assign(fn, { timeout: fn }),
      RTCPeerConnection: preflight ? fn : undefined, Element: { prototype: { animate: fn } },
      CSS: { supports: () => true }, PointerEvent: fn };
    runInNewContext(script, { window, document });
    listeners.DOMContentLoaded?.();
    listeners.load?.();
    if (error) listeners['unsupported-entry-failed']?.();
    const expected = !rendered && (!preflight || !marker || error);
    expect(visible).toBe(expected);
    expect(app.style.display).toBe(expected ? 'none' : '');
    if (expected) { expect(phone.hidden).toBe(false); expect(computer.hidden).toBe(true); }
    expect(script).not.toContain('requestAnimationFrame');
  });
  it('main uses the tested decision before render and keeps the fixture behind DEV', () => {
    const main = readFileSync(resolve('apps/web/src/main.tsx'), 'utf8');
    expect(main.startsWith("document.documentElement.setAttribute('data-entry', 'run');")).toBe(true);
    expect(main).toContain("start().catch");
    expect(main).toContain('const decision = supportDecision(env)');
    expect(main).toContain("decision.screen === 'unsupported'");
    expect(main).toMatch(/if \(import.meta.env.DEV && decision.screen === 'route'\) \{\s*const \{ unsupportedDemo \} = await import/);
  });
});
