document.documentElement.setAttribute('data-entry', 'run');
import { supportDecision } from './support';
import type { SupportEnvironment } from './support';
import { BrowserNotSupported } from './BrowserNotSupported';
import { installFavicon } from './favicon';
import { render } from 'preact';
import type { ComponentType } from 'preact';
import { useLayoutEffect, useState } from 'preact/hooks';
import { screenScale } from './viewport';
import { PhonePage } from './phone-route';
import { HostLobby } from './host-route';
import { Landing } from './landing-route';
import '@kaki/ui/tokens.css';
import './style.css';
function ControllerDemoRoute() {
  const [demo, setDemo] = useState<ComponentType | null>(null);
  useLayoutEffect(() => {
    let active = true;
    if (import.meta.env.DEV) void import('./controller-demo').then(module => { if (active) setDemo(() => module.ControllerDemo); });
    return () => { active = false; };
  }, []);
  const Demo = demo;
  return Demo ? <Demo/> : null;
}
function App() {
  useLayoutEffect(() => {
    const resize = (): void => {
      document.documentElement.style.setProperty('--screen-scale', String(screenScale(window.innerWidth, window.innerHeight)));
    };
    installFavicon();
    if (import.meta.env.DEV && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const slow = Math.max(1, Number(new URLSearchParams(location.search).get('slow')) || 1);
      const tokens = getComputedStyle(document.documentElement);
      for (const name of ['fast', 'base', 'slow', 'fast-exit', 'base-exit', 'slow-exit', 'arc', 'count-up']) {
        const token = `--ka-duration-${name}`;
        document.documentElement.style.setProperty(token, `${String(parseFloat(tokens.getPropertyValue(token)) * slow)}ms`);
      }
    }
    resize(); window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); };
  }, []);
  const path = location.pathname.replace(/\/$/, '') || '/';
  if (import.meta.env.DEV && path === '/play' && new URLSearchParams(location.search).get('demo') === 'controller') return <ControllerDemoRoute/>;
  if (path === '/play') return <PhonePage/>;
  if (path === '/host') return <HostLobby/>;
  if (path === '/') return <Landing/>;
  return <main class="screen room-status"><h1>This page has not been built yet.</h1><a href="/">Back to Kaki Arcade</a></main>;
}
const root = document.getElementById('app');
async function start(): Promise<void> {
  // Functions are bound to window when present, so nothing is copied off it unbound.
  const env: SupportEnvironment = { pathname: location.pathname,
    RTCPeerConnection: window.RTCPeerConnection, WebSocket: window.WebSocket, Element: window.Element,
    CSS: window.CSS, PointerEvent: window.PointerEvent, fetch: typeof window.fetch === 'function' ? window.fetch.bind(window) : undefined,
    AbortController: window.AbortController, AbortSignal: window.AbortSignal,
    URL: window.URL, URLSearchParams: window.URLSearchParams, crypto: window.crypto,
    matchMedia: typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : undefined, getComputedStyle: typeof window.getComputedStyle === 'function' ? window.getComputedStyle.bind(window) : undefined,
    ResizeObserver: window.ResizeObserver, requestAnimationFrame: typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame.bind(window) : undefined,
    cancelAnimationFrame: typeof window.cancelAnimationFrame === 'function' ? window.cancelAnimationFrame.bind(window) : undefined, performance: window.performance };
  const decision = supportDecision(env);
  if (import.meta.env.DEV && decision.screen === 'route') {
    const { unsupportedDemo } = await import('./unsupported-demo');
    decision.missing.push(...unsupportedDemo(location.search));
    if (decision.missing.length) decision.screen = 'unsupported';
  }
  if (root) render(decision.screen === 'unsupported'
    ? <BrowserNotSupported pathname={location.pathname} missing={decision.missing}/>
    : <App/>, root);
}
void start().catch(() => {
  document.dispatchEvent(new Event('unsupported-entry-failed'));
});
