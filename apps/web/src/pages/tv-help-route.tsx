import { useLayoutEffect, useRef } from 'preact/hooks';
import { tvHelpSections } from './tv-help-copy';
import './tv-help.css';
export function TvHelp() {
  const back = useRef<HTMLAnchorElement>(null);
  useLayoutEffect(() => { document.title = 'Put this on your TV · Kaki Arcade'; back.current?.focus({ preventScroll: true }); }, []);
  return <main class="screen tv-help ka-surface" data-theme="console">
    <nav><a ref={back} href="/">Back to Kaki Arcade</a></nav>
    <h1>Put this on your TV</h1>
    <div class="tv-help-columns">
      {tvHelpSections.map((section, index) => <section class="ka-panel" key={section.title}>
        <h2>{section.title}</h2>
        <ol>{section.steps.map(step => <li key={step}>{step}</li>)}</ol>
        {index === 1 && <p class="tv-help-address">Address: {location.hostname === 'localhost' || location.hostname.endsWith('.localhost') || location.hostname.startsWith('127.') || location.hostname === '[::1]' ? 'the address in this laptop’s address bar' : <span class="tv-help-host">{location.host}</span>}</p>}
      </section>)}
    </div>
  </main>;
}
