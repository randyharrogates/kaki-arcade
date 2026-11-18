import landing from './images/landing.webp';
import { useEffect, useRef } from 'preact/hooks';
import { LegalFooter } from './pages/legal-footer';
export function Landing() {
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const key = (event: KeyboardEvent): void => {
      if (event.key.startsWith('Arrow')) { event.preventDefault(); link.current?.focus(); }
      if (event.code === 'Space' && (document.activeElement === document.body || document.activeElement === link.current)) { event.preventDefault(); link.current?.click(); }
    };
    window.addEventListener('keydown', key); return () => { window.removeEventListener('keydown', key); };
  }, []);
  return <main class="screen landing-screen"><section class="landing-copy"><h1>Kaki Arcade</h1><p>Bring your friends. Your phones are the controllers.</p><a class="ka-panel" ref={link} href="/host">Host a game</a><p>Tabao Rush · Peek Poker · Rabakz</p><a class="landing-help" href="/tv-help">Put this on your TV</a></section><img class="landing-picture ka-panel" src={landing} width="678" height="419" alt="Friends on a sofa using their phones to play together on a television"/><LegalFooter/></main>;
}
