import { nameLines, namePresentation, countdownLabel } from './seat-text';
import { useLayoutEffect, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createRoom, HOST_STORAGE_KEY } from '@kaki/platform';
import { browserDependencies } from './browser';
import { createHost } from './host';
import { lobbyView, seatIdentity } from './view-model';
import type { LobbyView } from './view-model';
import { Overlap } from './Overlap';
import { qrPath } from './qr';
import { Icon } from './icons';
function QR({ payload }: { payload: string }) {
  const { path, size } = useMemo(() => qrPath(payload), [payload]);
  return <svg class="qr" viewBox={`0 0 ${String(size)} ${String(size)}`} role="img" aria-label={`Join at ${payload}. Room code ${new URL(payload).searchParams.get('code')?.split('').join(' ') ?? ''}`} shape-rendering="crispEdges"><path d={path}/></svg>;
}
function Seat({ seat, index }: { seat: LobbyView['seats'][number]; index: number }) {
  const nameElement = useRef<HTMLSpanElement>(null);
  const [name, setName] = useState(() => ({ lines: nameLines(seat.name), size: 34 }));
  useLayoutEffect(() => {
    const element = nameElement.current;
    const context = document.createElement('canvas').getContext('2d');
    if (!element || !context) return;
    const font = getComputedStyle(element).fontFamily;
    setName(namePresentation(seat.name, element.clientWidth, (text, size) => {
      context.font = `${String(size)}px ${font}`;
      return context.measureText(text).width;
    }));
  }, [seat.name]);
  return <li class="ka-panel seat" data-empty={!seat.occupied}>
    <Overlap identity={seatIdentity(seat)} row index={index}>
      <div class="seat-content" data-empty={!seat.occupied} data-held={seat.held} data-dimmed={seat.dimmed}>
        <span class="seat-number" style={{ backgroundColor: seat.held ? 'var(--ka-panel-to)' : seat.colour, borderColor: seat.colour }}>{seat.number}</span>
        <span ref={nameElement} class="nickname">{name.lines.map((line, index) => <span class="name-line" key={index}>{line}</span>)}</span>
        <span class="connection">{seat.connection && <><Icon kind={seat.icon}/><span>{seat.connection}</span></>}</span>
        <span class="leader">{seat.held ? countdownLabel(seat.holdSeconds) : seat.leader ? <><Icon kind="leader"/> Leader</> : '\u00a0'}</span>
      </div>
    </Overlap>
  </li>;
}
/** A reload that will restore a saved room says so from the first frame. */
function hasSavedRoom(): boolean {
  try { return window.sessionStorage.getItem(HOST_STORAGE_KEY) !== null; } catch { return false; }
}
export function HostLobby() {
  const [view, setView] = useState(() => lobbyView({ room: createRoom(), links: new Map(), code: '', pairing: hasSavedRoom() ? 'restoring' : 'creating', origin: location.origin }));
  const focusedState = useRef('');
  const action = (element: HTMLButtonElement | null): void => {
    if (element && focusedState.current !== view.pairing) {
      focusedState.current = view.pairing; element.focus();
    }
  };
  if (!view.retry && !view.newRoom) focusedState.current = '';
  const previous = useRef<LobbyView['seats']>([]);
  const changedSeats = view.seats.filter((seat, i) => !previous.current[i] || seatIdentity(seat) !== seatIdentity(previous.current[i])).length;
  const announcements = view.seats.flatMap((seat, i) => {
    const before = previous.current[i];
    if (seat.held && !before?.held) return [`${seat.name}'s seat is held`];
    if (seat.occupied && !before?.occupied) return [`${seat.name} joined`];
    if (!seat.occupied && before?.occupied) return [`${before.name} left`];
    if (seat.occupied && !seat.held && before?.held) return [`${seat.name} returned`];
    return [];
  }).join('. ');
  const announcement = useRef('');
  if (announcements) announcement.current = announcements;
  previous.current = view.seats;
  const host = useRef<ReturnType<typeof createHost>>(null);
  useEffect(() => {
    let alive = true;
    let latest: Parameters<typeof lobbyView>[0] | undefined;
    const clock = { now: () => Date.now() };
    let demoClock = false;
    const present = (input: Parameters<typeof lobbyView>[0]): void => {
      latest = { ...input, origin: location.origin, joinOrigin: String(import.meta.env.KAKI_JOIN_ORIGIN) };
      if (alive) setView(lobbyView(latest, demoClock ? { now: () => performance.now() - demoStart } : clock));
    };
    const demoStart = performance.now();
    const tick = window.setInterval(() => { if (latest?.room.players.some(player => player.disconnectedAt !== null)) present(latest); }, 1000);
    const demo = new URLSearchParams(location.search).get('demo');
    if (import.meta.env.DEV && demo !== null && /^[0-8]$/.test(demo)) {
      demoClock = true;
      void import('./demo').then(({ demoInput, demoChange }) => {
        const params = new URLSearchParams(location.search);
        const input = demoInput(Number(demo), params); present({ ...input, origin: location.origin });
        window.setTimeout(() => { if (alive && params.has('change')) present({ ...demoChange(input, params.get('change') ?? ''), origin: location.origin }); }, 2000);
      });
    } else {
      const controller = createHost(browserDependencies(String(import.meta.env.KAKI_SIGNAL_URL)), input => { present({ ...input, origin: location.origin }); });
      host.current = controller; void controller.start();
    }
    return () => { alive = false; window.clearInterval(tick); host.current?.stop(); };
  }, []);
  return <main class="screen lobby" aria-label="Host lobby">
    <header><h1>Kaki Arcade</h1><span class="ka-chip" role="status">{view.pairing === 'reconnecting' ? 'Reconnecting' : 'Lobby'}</span><span class="player-count">{view.count}</span></header>
    <section class="ka-panel join-panel" aria-label="Join the room">
      <Overlap identity={view.pairing + view.joinLink}>
        {view.qrPayload ? <div class="join-content">
          <QR payload={view.qrPayload}/>
          <div class="join-copy"><h2>Scan to join</h2><p>or go to <b>{new URL(view.joinLink).host}/play</b></p>
            <div class="room-code" aria-label={`Room code ${view.codeGroups.join(' ')}`}>{view.codeGroups.map(group => <span key={group}>{group}</span>)}</div>
          </div>
        </div> : <div class="room-status" role="status"><h2>{view.status}</h2>
          {view.retry && <button ref={action} class="ka-panel ka-pressable" onClick={() => { void host.current?.start(); }}>Try again</button>}
          {view.newRoom && <button ref={action} class="ka-panel ka-pressable" onClick={() => { void host.current?.start(true); }}>Create a new room</button>}
          {view.pairing === 'replaced' && <p>Use the other tab to keep this room open.</p>}
        </div>}
      </Overlap>
    </section>
    <div class="announcements" aria-live="polite" aria-atomic="true">{announcement.current}</div>
    <ol class="seats" data-wrap={view.seats.some(seat => seat.connection === 'Scan to join' || seat.connection === 'Seat held')} aria-label="Player seats">{view.seats.map((seat, index) => <Seat key={seat.number} seat={seat} index={changedSeats > 1 ? index : 0}/>)}</ol>
  </main>;
}
