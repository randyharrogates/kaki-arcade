import { duration } from '@kaki/ui';
import { useEffect, useRef, useState } from 'preact/hooks';
import { createPhone, phoneView } from './phone';
import type { PhoneView } from './phone';
import { phoneBrowserDependencies } from './phone-browser';
import { Icon } from './icons';
import { Overlap } from './Overlap';
import './phone.css';
export function PhonePage() {
  const params = new URLSearchParams(location.search);
  const [view, setView] = useState<PhoneView>(() => phoneView('entry', { code: params.get('code') ?? '' }));
  const [code, setCode] = useState(params.get('code') ?? '');
  const [name, setName] = useState('');
  const lastView = useRef(view);
  const page = useRef<HTMLElement>(null);
  const phone = useRef<ReturnType<typeof createPhone>>(null);
  useEffect(() => {
    let alive = true;
    const present = (next: PhoneView): void => {
      if (!alive) return;
      if (next.code !== lastView.current.code) setCode(next.code);
      if (next.name !== lastView.current.name) setName(next.name);
      lastView.current = next; setView(next);
    };
    if (import.meta.env.DEV && params.has('demo')) {
      void import('./phone-demo').then(({ phoneDemo }) => { present(phoneDemo(params.get('demo') ?? '', params)); });
    } else phone.current = createPhone(phoneBrowserDependencies(String(import.meta.env.KAKI_SIGNAL_URL)), params.get('code'), present);
    return () => { alive = false; phone.current?.stop(); };
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = (): void => {
      if (viewport && page.current) {
        page.current.style.height = `${String(viewport.height)}px`;
        if (document.activeElement instanceof HTMLInputElement) document.activeElement.closest('.phone-name-row')?.scrollIntoView({ block: 'nearest' });
      }
    };
    resize(); viewport?.addEventListener('resize', resize);
    return () => { viewport?.removeEventListener('resize', resize); };
  }, []);
  // Reacquire on foreground; releasing on cleanup prevents a stale page keeping it alive.
  useEffect(() => {
    let lock: WakeLockSentinel | undefined; let active = true;
    const acquire = (): void => {
      if (view.connected && !document.hidden && ('wakeLock' in navigator)) void navigator.wakeLock.request('screen').then(next => {
        if (active) lock = next; else void next.release();
      }).catch(() => undefined);
    };
    acquire(); document.addEventListener('visibilitychange', acquire);
    return () => { active = false; document.removeEventListener('visibilitychange', acquire); void lock?.release(); };
  }, [view.connected]);
  const form = view.action === 'Join' && !view.renaming;
  const feedback = (): void => { if ('vibrate' in navigator) navigator.vibrate(duration.fast); };
  return <main ref={page} class="phone-page" data-theme="console" aria-label="Phone lobby">
    <div class="phone-live" role="status" aria-live="polite" aria-atomic="true">{`${view.title} ${view.detail}`}</div>
    {view.seat !== null && <header class="phone-id"><span class="phone-badge" style={{ backgroundColor: view.colour }}>{view.seat}</span><strong>{view.name}</strong><span class="phone-connection" data-connected={view.connected}><Icon kind={view.connected ? 'good' : 'weak'}/>{view.connected ? 'Connected' : 'Disconnected'}</span></header>}
    <Overlap fade identity={view.renaming ? 'rename' : form ? 'form' : 'lobby'}>{view.renaming ? <section class="phone-join ka-panel">
      <div class="phone-intro"><h1>Change your name</h1></div>
      <form class="phone-fields" onSubmit={event => { event.preventDefault(); feedback(); phone.current?.saveName(name); }}>
        <label for="rename">Your name</label>
        <input id="rename" class="ka-panel" value={name} autoFocus ref={element => { element?.focus(); }} onInput={event => { setName(event.currentTarget.value); }}/>
        <div class="phone-actions">
          <button type="submit" class="ka-panel ka-pressable">Save name</button>
          <button type="button" class="ka-panel ka-pressable" onClick={() => { setName(view.name); phone.current?.cancelName(); }}>Cancel</button>
        </div>
        {view.state !== 'rename' && <p>{view.title}. {view.detail}</p>}
      </form>
    </section> : form ? <section class="phone-join ka-panel">
      <div class="phone-intro"><h1>Kaki Arcade</h1><p>Join the room on the TV</p></div>
      <form class="phone-fields" onSubmit={event => { event.preventDefault(); feedback(); phone.current?.join(code, name); }}>
        <label for="room-code">Room code</label>
        <input id="room-code" name="code" class="phone-code ka-panel" value={code} onInput={event => { setCode(event.currentTarget.value); }} autoCapitalize="characters" autoCorrect="off" spellcheck={false} enterKeyHint="next" aria-describedby="code-help"/>
        <span id="code-help" class="phone-help">8 characters, as shown on the TV</span>
        <label for="nickname">Your name</label>
        <div class="phone-name-row"><input id="nickname" name="nickname" class="ka-panel" value={name} onInput={event => { setName(event.currentTarget.value); }} autoComplete="nickname" enterKeyHint="go" aria-describedby="name-help"/><button class="ka-panel ka-pressable" type="submit">Join</button></div>
        <span id="name-help" class="phone-help">1 to 12 visible characters</span>
        <div class="phone-feedback">{view.state !== 'entry' && <><strong>{view.title}</strong><p>{view.detail}</p></>}</div>
      </form>
    </section> : <section class="phone-lobby" data-seated={view.seat !== null}>
      {view.seat !== null && <div class="phone-seat ka-panel" data-connected={view.connected}><Overlap fade identity={String(view.seat) + view.colour}><div class="phone-seat-content"><span class="phone-badge phone-badge-large" style={{ backgroundColor: view.colour || 'var(--ka-panel-to)' }}>{view.seat}</span><strong>{`Seat ${String(view.seat)}`}</strong><strong>{view.name}</strong>{view.leader && <strong>You’re the leader</strong>}</div></Overlap></div>}
      <div class="phone-message"><Overlap fade identity={view.state}><div class="phone-status"><h2>{view.title}</h2><p>{view.detail}</p></div></Overlap>
        {(view.connected || ['waiting-for-lobby', 'hold-over'].includes(view.state)) && <div class="phone-actions">{view.connected && <button class="ka-panel ka-pressable" onClick={() => { setName(view.name); feedback(); phone.current?.changeName(); }}>Change name</button>}<button class="ka-panel ka-pressable" onClick={() => { feedback(); phone.current?.leave(); }}>Leave</button></div>}
        {view.action && <button class="ka-panel ka-pressable" onClick={() => { feedback(); if (view.action === 'Reload') location.reload(); else if (view.action === 'Join again') phone.current?.rejoin(); else phone.current?.edit(); }}>{view.action}</button>}
      </div>
    </section>}</Overlap>
  </main>;
}
