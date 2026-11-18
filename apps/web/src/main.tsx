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
import '@kaki/ui/tokens.css';
import './style.css';
function ShellRoute({ host }: { host: boolean }) {
  const [route, setRoute] = useState<ComponentType | null>(null);
  useLayoutEffect(() => {
    let active = true;
    const loading = host ? import('./host-route').then(module => module.HostLobby) : import('./landing-route').then(module => module.Landing);
    void loading.then(component => { if (active) setRoute(() => component); });
    return () => { active = false; };
  }, [host]);
  const Route = route;
  return Route ? <Route/> : <main class="screen room-status" aria-busy="true">Loading…</main>;
}
function LegalRoute({ page }: { page: 'privacy' | 'credits' }) {
  const [component, setComponent] = useState<ComponentType<{ page: 'privacy' | 'credits' }> | null>(null);
  useLayoutEffect(() => { let active = true; void import('./pages/legal-route').then(module => { if (active) setComponent(() => module.LegalPage); }); return () => { active = false; }; }, []);
  const Page = component;
  document.title = `${page === 'privacy' ? 'Privacy' : 'Credits'} · Kaki Arcade`;
  return Page ? <Page page={page}/> : <main class="screen ka-surface" data-theme="console"><div class="ka-panel"><h1>{page === 'privacy' ? 'Privacy' : 'Credits'}</h1></div></main>;
}
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
function SoundDemoRoute() {
  const [demo, setDemo] = useState<ComponentType | null>(null);
  useLayoutEffect(() => { if (import.meta.env.DEV) void import('./host-sound-demo').then(module => { setDemo(() => module.HostSoundDemo); }); }, []);
  const Demo = demo;
  return Demo ? <Demo/> : null;
}
function TvHelpRoute() {
  const [help, setHelp] = useState<ComponentType | null>(null);
  useLayoutEffect(() => {
    let active = true;
    void import('./pages/tv-help-route').then(module => { if (active) setHelp(() => module.TvHelp); });
    return () => { active = false; };
  }, []);
  const Help = help;
  return Help ? <Help/> : <main class="screen room-status" aria-busy="true">Loading…</main>;
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
  if (import.meta.env.DEV && path === '/host/sound') return <SoundDemoRoute/>;
  if (path === '/privacy' || path === '/credits') return <LegalRoute page={path.slice(1) as 'privacy' | 'credits'}/>;
  if (path === '/play') return <PhonePage/>;
  if (path === '/host') return <ShellRoute host/>;
  if (path === '/tv-help') return <TvHelpRoute/>;
  if (path === '/') return <ShellRoute host={false}/>;
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
