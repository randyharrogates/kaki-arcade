import { sharedHostSound } from './host-sound';
import landing from './images/landing.webp';
import { useEffect, useRef } from 'preact/hooks';
import { LegalFooter } from './pages/legal-footer';
export function Landing() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (matchMedia('(min-width: 1001px)').matches) root.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent): void => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      const links = Array.from(root.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []);
      const index = links.findIndex(link => link === active);
      const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
      if (direction) {
        event.preventDefault();
        links[Math.max(0, Math.min(links.length - 1, index < 0 ? 0 : index + direction))]?.focus();
      }
      if ((event.key === ' ' || event.code === 'Space') && !event.repeat) {
        if (index >= 0 || active === document.body) { event.preventDefault(); links[index >= 0 ? index : 0]?.click(); }
      }
    };
    window.addEventListener('keydown', key); return () => { window.removeEventListener('keydown', key); };
  }, []);
  return <main class="screen landing-screen" ref={root}><section class="landing-copy"><h1>Kaki Arcade</h1><p>Bring your friends. Your phones are the controllers.</p><a class="ka-panel" href="/host" onClick={event => {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    sharedHostSound().start();
    history.pushState(null, '', '/host');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }}>Host a game</a><p>Tabao Rush · Peek Poker · Rabakz</p><a class="landing-help" href="/tv-help">Put this on your TV</a></section><img class="landing-picture ka-panel" src={landing} width="678" height="419" alt="Friends on a sofa using their phones to play together on a television"/><LegalFooter/></main>;
}
