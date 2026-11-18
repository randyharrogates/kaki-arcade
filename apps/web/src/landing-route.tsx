import { useEffect, useRef } from 'preact/hooks';
export function Landing() {
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const key = (event: KeyboardEvent): void => {
      if (event.key.startsWith('Arrow')) { event.preventDefault(); link.current?.focus(); }
      if (event.code === 'Space' && (document.activeElement === document.body || document.activeElement === link.current)) { event.preventDefault(); link.current?.click(); }
    };
    window.addEventListener('keydown', key); return () => { window.removeEventListener('keydown', key); };
  }, []);
  return <main class="screen room-status"><h1>This page has not been built yet.</h1><a ref={link} href="/host">Host a room</a><a href="/tv-help" style={{ minHeight: 'var(--ka-button-minimum-floor)', display: 'inline-flex', alignItems: 'center' }}>Put this on your TV</a></main>;
}
