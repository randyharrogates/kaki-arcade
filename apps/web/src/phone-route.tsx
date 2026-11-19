import '../../../packages/controller-kit/src/layout.css';
import '../../../games/rabakz/controller.css';
import '../../../packages/controller-kit/src/buttons.css';
import '../../../packages/controller-kit/src/stick.css';
import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { GameSetup } from './game-setup-route';
import { PhoneTeams, TeamsToggle } from './team-setup-route';
import { ChoiceShape } from './choice-shape';
import { pageWake, shellAfterWake } from './phone-wake';
import type { LayoutOutput } from '@kaki/controller-kit';
import { ControllerShell, LayoutEngine } from '@kaki/controller-kit';
import '@kaki/controller-kit/shell.css';
import { pickerAnnouncement } from './picker-announcement';
import { duration } from '@kaki/ui';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { createPhone, phoneView, phoneController, offersTeamChoice } from './phone';
import type { PhoneView } from './phone';
import { phoneBrowserDependencies } from './phone-browser';
import { Icon } from './icons';
import { Overlap } from './Overlap';
import './phone.css';
import { PhonePlayers } from './remove-player';
import { preloadControllerImages } from './controller-images';
export function PhonePage() {
  const params = new URLSearchParams(location.search);
  const [view, setView] = useState<PhoneView>(() => phoneView('entry', { code: params.get('code') ?? '' }));
  useEffect(() => { if (view.picker?.game?.id && view.picker.screen !== 'picker' && view.picker.screen !== 'lobby') void preloadControllerImages(view.picker.game.id).catch(() => { /* The controller retries and keeps Ready unavailable. */ }); }, [view.picker?.game?.id, view.picker?.screen]);
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
  const controller = phoneController(view);
  const [wakeReady, setWakeReady] = useState(false);
  const releaseWake = useRef<Promise<void>>(Promise.resolve());
  // Reacquire on foreground; releasing on cleanup prevents a stale page keeping it alive.
  useEffect(() => {
    if (controller) {
      const cancel = shellAfterWake(releaseWake.current, () => { setWakeReady(true); });
      return () => { cancel(); setWakeReady(false); };
    }
    setWakeReady(false);
    const wake = pageWake(navigator, () => view.connected && !document.hidden);
    // The shell's unmount cleanup runs before this passive effect reacquires for the page.
    const acquire = (): void => { wake.acquire(); };
    acquire(); document.addEventListener('visibilitychange', acquire);
    return () => { document.removeEventListener('visibilitychange', acquire); releaseWake.current = wake.stop(); };
  }, [!controller && view.connected, controller !== null]);
  const results = view.connected && view.phase === 'results';
  const picker = view.connected && !view.renaming && !results ? view.picker : null;
  const ownTeam = view.teamSetup?.screen === 'teams' ? view.teamSetup.players.find(p => p.seat === view.seat)?.team : undefined;
  const announcement = pickerAnnouncement(view);
  const teamAnnouncement = ownTeam === undefined ? '' : ` Your team is ${ownTeam === 0 ? 'Red' : 'Blue'}. ${view.teamSetup?.notice ?? ''}`;
  const form = view.action === 'Join' && !view.renaming;
  const feedback = (): void => { if ('vibrate' in navigator) navigator.vibrate(duration.fast); };
  const teamChoice = offersTeamChoice(view) && view.teamSetup?.screen === 'choice' ? <TeamsToggle enabled={view.teamSetup.enabled} toggle={() => { feedback(); phone.current?.teamInput('teams-toggle'); }}/> : null;
  if (controller && wakeReady) return <GameController removePlayer={seat => { phone.current?.removePlayer(seat); }} sessionCommand={action => { phone.current?.sessionCommand(action); }} controller={controller} view={view} send={output => { phone.current?.controllerInput(output); }}/>;
  return <main ref={page} class="phone-page ka-surface" data-seated={view.seat !== null} data-setup={view.leader && view.teamSetup?.screen === 'choice' && picker?.screen === 'start'} data-theme={view.theme} aria-label="Phone lobby">
    <PhoneLive announcement={announcement}><span>{teamAnnouncement}</span></PhoneLive>
    {view.seat !== null && <header class="phone-id"><span class="phone-badge" style={{ backgroundColor: view.colour }}>{view.seat}</span><strong>{view.name}</strong><span class="phone-connection" role="img" aria-label={view.connected ? 'Connected' : 'Disconnected'} data-connected={view.connected}><Icon kind={view.connected ? 'good' : 'weak'}/><span aria-hidden="true">{view.connected ? 'Connected' : 'Disconnected'}{ownTeam === undefined ? '' : ` · on ${ownTeam === 0 ? 'Red' : 'Blue'}`}</span></span><button class="phone-leave ka-panel ka-pressable" onClick={() => { feedback(); phone.current?.leave(); }}>Leave</button></header>}
    <Overlap fade identity={view.teamSetup?.screen === 'teams' ? 'teams' : results ? 'results' : picker && picker.screen !== 'lobby' ? 'picker' : view.renaming ? 'rename' : form ? 'form' : 'lobby'}>{view.connected && view.teamSetup?.screen === 'teams' ? <PhoneTeams setup={view.teamSetup} seat={view.seat} leader={view.leader} send={(control, value) => { feedback(); phone.current?.teamInput(control, value); }}/> : view.connected && view.teamSetup?.screen === 'choice' && !results && picker?.screen === 'start' ? <GameSetup setup={view.teamSetup} leader={view.leader} leaderName={picker.leaderName ?? 'The leader'} change={(id, value) => { feedback(); phone.current?.settingInput(id, value); }} toggle={() => { feedback(); phone.current?.teamInput('teams-toggle'); }} start={() => { feedback(); phone.current?.pickerInput('start'); }} back={() => { feedback(); phone.current?.pickerInput('back'); }}/> : view.renaming ? <section class="phone-join ka-panel">
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
    </section> : picker && picker.screen !== 'lobby' ? <section class="phone-picker">
      <div class="phone-status picker-status"><h2>{picker.screen === 'starting' ? `Starting ${picker.game?.name ?? 'the game'}` : view.leader ? picker.screen === 'start' ? 'Ready to start?' : 'You choose the game' : picker.screen === 'start' ? `${picker.leaderName ?? 'The leader'} starts the game` : `${picker.leaderName ?? 'The leader'} is choosing`}</h2><p>Watch the TV.</p><strong>{picker.screen !== 'starting' && !picker.failed && picker.game?.name}{picker.reason && <span class="phone-picker-reason"><Icon kind="weak"/>{picker.reason}</span>}</strong></div>
      {teamChoice}
      {view.leader && picker.screen !== 'starting' && <div class="phone-picker-controls">
        {picker.screen === 'picker' ? <><button class="ka-panel ka-pressable" onClick={() => { feedback(); phone.current?.pickerInput('previous'); }}><span aria-hidden="true">← </span>Previous</button><button class="ka-panel ka-pressable" onClick={() => { feedback(); phone.current?.pickerInput('next'); }}>Next<span aria-hidden="true"> →</span></button><button class="ka-panel ka-pressable picker-primary" disabled={picker.reason !== null && !picker.failed} onClick={() => { feedback(); phone.current?.pickerInput('select'); }}>Select</button></> : <button class="ka-panel ka-pressable picker-primary" disabled={picker.reason !== null && !picker.failed} onClick={() => { feedback(); phone.current?.pickerInput('start'); }}>Start</button>}
        <button class="ka-panel ka-pressable" onClick={() => { feedback(); phone.current?.pickerInput('back'); }}>Back</button>
      </div>}
    </section> : results ? <section class="phone-picker"><div class="phone-status phone-results"><h2>Results</h2>{view.resultStats?.map(stat => <p key={stat.label}>{stat.label} <strong>{stat.value}</strong></p>)}<p>Watch the TV.</p></div>{teamChoice}{view.leader && (view.picker?.screen === 'starting' ? <button class="ka-panel ka-pressable" onClick={() => { feedback(); phone.current?.pickerInput('select'); }}><ChoiceShape/>Continue</button> : <><button class="ka-panel ka-pressable" onClick={() => { feedback(); phone.current?.pickerInput('start'); }}><ChoiceShape/>Play again</button><button class="ka-panel ka-pressable" onClick={() => { feedback(); phone.current?.pickerInput('open'); }}><ChoiceShape circle/>Back to game picker</button></>)}</section> : form ? <section class="phone-join ka-panel">
      <div class="phone-intro"><h1>Kaki Arcade</h1><p>Join the room on the TV</p></div>
      <form class="phone-fields" onSubmit={event => { event.preventDefault(); feedback(); phone.current?.join(code, name); }}>
        <label for="room-code">Room code</label>
        <input onPointerDown={event => {
          // PERF-020: observational only; the cold-load probe dispatches after paint.
          if (!event.isTrusted && !performance.getEntriesByName('kaki-controller-interactive').length) performance.mark('kaki-controller-interactive');
        }} id="room-code" name="code" class="phone-code ka-panel" value={code} onInput={event => { setCode(event.currentTarget.value); }} autoCapitalize="characters" autoCorrect="off" spellcheck={false} enterKeyHint="next" aria-describedby="code-help"/>
        <span id="code-help" class="phone-help">8 characters, as shown on the TV</span>
        <label for="nickname">Your name</label>
        <div class="phone-name-row"><input id="nickname" name="nickname" class="ka-panel" value={name} onInput={event => { setName(event.currentTarget.value); }} autoComplete="nickname" enterKeyHint="go" aria-describedby="name-help"/><button class="ka-panel ka-pressable" type="submit">Join</button></div>
        <span id="name-help" class="phone-help">1 to 12 visible characters</span>
        <div class="phone-feedback">{view.state !== 'entry' && <><strong>{view.title}</strong><p>{view.detail}</p></>}</div>
      </form>
    </section> : <section class="phone-lobby" data-players={view.connected && view.leader} data-seated={view.seat !== null} data-setup={view.teamSetup?.screen === 'choice' && picker?.screen === 'start'}>
      {view.connected && view.leader && <PhonePlayers players={view.players ?? []} ownSeat={view.seat} remove={seat => { phone.current?.removePlayer(seat); }}/>}
      <div class="phone-message">{view.leader && <strong class="phone-leader">You’re the leader</strong>}<Overlap fade identity={view.state}><div class="phone-status"><h2>{view.title}</h2><p>{view.detail}</p></div></Overlap>
        {view.connected && view.leader && picker?.screen === 'lobby' && <button class="ka-panel ka-pressable" onClick={() => { feedback(); phone.current?.pickerInput('open'); }}>Pick a game</button>}
        {(view.connected || ['waiting-for-lobby', 'hold-over'].includes(view.state)) && <div class="phone-actions">{view.connected && <button class="ka-panel ka-pressable" onClick={() => { setName(view.name); feedback(); phone.current?.changeName(); }}>Change name</button>}{view.seat === null && <button class="ka-panel ka-pressable phone-leave" onClick={() => { feedback(); phone.current?.leave(); }}>Leave</button>}</div>}
        {view.action && <button class="ka-panel ka-pressable" onClick={() => { feedback(); if (view.action === 'Reload') location.reload(); else if (view.action === 'Try again') phone.current?.retry(); else if (view.action === 'Join again') phone.current?.rejoin(); else phone.current?.edit(); }}>{view.action}</button>}
      </div>
    </section>}</Overlap>
  </main>;
}

export function GameController({ controller, view, send, sessionCommand, removePlayer }: { removePlayer?: (seat: number) => void; controller: NonNullable<ReturnType<typeof phoneController>>; view: PhoneView; send: (output: LayoutOutput) => void; sessionCommand?: (action?: 'quit') => void }) {
  const controls = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<{ width: number; height: number; viewport: { width: number; height: number } } | null>(null);
  const [pictures, setPictures] = useState<{ id: string; urls: Readonly<Record<string,string>> } | null>(null);
  const gameId = view.picker?.game?.id ?? '';
  useEffect(() => { let active = true; if (gameId) void preloadControllerImages(gameId).then(urls => { if (active) setPictures({ id: gameId, urls }); }, () => { if (active) setPictures({ id: gameId, urls: {} }); /* Failed pictures retain their accessible text fallback. */ }); return () => { active = false; }; }, [gameId]);
  useLayoutEffect(() => {
    const board = controls.current?.closest('.ka-controller-play');
    if (!board) return;
    // Read the live box: observer entries can precede the shell's final grid layout.
    const measure = () => {
      const { width, height } = board.getBoundingClientRect();
      const viewport = { width: innerWidth, height: innerHeight };
      setArea(old => old?.width === width && old.height === height
        && old.viewport.width === viewport.width && old.viewport.height === viewport.height
        ? old : { width, height, viewport });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    measure();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, []);
  const [header, setHeader] = useState<Element | null>(null);
  useEffect(() => { setHeader(document.querySelector('.ka-controller-header')); }, []);
  const needsPictures = view.gameLayout?.controls.some(c => c.kind === 'grid' && c.cells.some(cell => cell.image)) === true;
  const pictureHeading = needsPictures ? view.gameLayout?.controls.find(c => c.kind === 'text' && c.tone === 'note') : undefined;
  const renderedLayout = pictureHeading && view.gameLayout ? { ...view.gameLayout, controls: view.gameLayout.controls.filter(c => c !== pictureHeading) } : view.gameLayout;
  const picturesPending = needsPictures && pictures?.id !== gameId;
  const blocked = !view.connected || view.phase === 'paused';
  const veil = !view.connected ? 'lost' : view.phase === 'paused' ? 'paused' : 'playing';
  const veils = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const focusInVeil = useRef(false);
  useLayoutEffect(() => {
    // Keep the last focused location even if an outgoing layer becomes inert.
    const trackFocus = (event: FocusEvent) => { focusInVeil.current = event.target instanceof Node && Boolean(veils.current?.contains(event.target)); };
    document.addEventListener('focusin', trackFocus);
    return () => { document.removeEventListener('focusin', trackFocus); };
  }, []);
  useLayoutEffect(() => {
    if (blocked) {
      const dialog = veils.current?.querySelector<HTMLElement>('.incoming > .phone-game-veil');
      const resume = dialog?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      (resume ?? dialog)?.focus();
    } else if (focusInVeil.current) {
      menu.current?.focus();
    }
  }, [veil, view.leader, header]);
  const notice = !view.connected ? 'Host disconnected. Reconnecting… Your seat is kept for 2 minutes.' : view.phase === 'paused' ? 'Paused. Only the leader can quit.' : '';
  return <div class="phone-game-page" data-console-controls={Boolean(sessionCommand)} data-blocked={blocked} data-theme={controller.theme}>
    <PhoneLive announcement={notice}/>
    <ControllerShell {...controller} {...(pictureHeading?.kind === 'text' ? { heading: pictureHeading.text } : {})}>
      {header && sessionCommand && createPortal(<button ref={menu} class="phone-session-button ka-pressable" disabled={blocked} onClick={() => { sessionCommand(); }}><span class="phone-session-pill">Menu</span></button>, header)}
      <div ref={controls} class="phone-game-controls" inert={blocked || picturesPending} aria-busy={picturesPending} aria-hidden={blocked}>{area && renderedLayout && <LayoutEngine images={pictures?.urls ?? {}} layout={renderedLayout} privateView={view.gamePrivateView} area={area} viewport={area.viewport} isLeader={view.leader} onOutput={output => { if (!blocked && !picturesPending) send(output); }}/>}</div>
    </ControllerShell>
      <div ref={veils} class="phone-game-veils"><Overlap fade tempo="base" identity={veil}>{blocked && <section class="phone-game-veil" tabIndex={-1} role="dialog" aria-modal="true" aria-label={view.connected ? 'Paused' : 'Connection lost'}>
        <h1>{view.connected ? 'Paused' : 'Reconnecting…'}</h1>
        {view.connected ? <><div class="phone-veil-actions"><button class="ka-pressable" disabled={!view.leader} onClick={() => { sessionCommand?.(); }}>Resume</button><button class="ka-pressable" disabled={!view.leader} onClick={() => { sessionCommand?.('quit'); }}>Quit to picker</button></div><p>Only the leader can quit.</p>{view.leader && removePlayer && <PhonePlayers players={view.players ?? []} ownSeat={view.seat} remove={removePlayer}/>}</> : <><p>Your seat is kept for 2 minutes.</p><p>Host disconnected</p></>}
      </section>}</Overlap></div>
  </div>;
}

function PhoneLive({ announcement, children }: { announcement: string; children?: ComponentChildren }) {
  return <div class="phone-live" role="status" aria-live="polite" aria-atomic="true">{announcement}{children}</div>;
}
