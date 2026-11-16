import { installFavicon } from './favicon';
import { render } from 'preact';
import { useLayoutEffect } from 'preact/hooks';
import { screenScale } from './viewport';
import { PhonePage } from './phone-route';
import { HostLobby } from './host-route';
import { Landing } from './landing-route';
import '@kaki/ui/tokens.css';
import './style.css';
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
  if (path === '/play') return <PhonePage/>;
  if (path === '/host') return <HostLobby/>;
  if (path === '/') return <Landing/>;
  return <main class="screen room-status"><h1>This page has not been built yet.</h1><a href="/">Back to Kaki Arcade</a></main>;
}
const root = document.getElementById('app');
if (root) render(<App/>, root);
