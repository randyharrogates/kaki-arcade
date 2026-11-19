import { preloadShellPictures } from './shell-images';
import { PausePanel } from './pause-panel';
import type { Sound } from '@kaki/platform';
import { hostSound } from './host-sound';
import { isLocalSeat, activeScreenSound } from '@kaki/platform';
import type { PadAction } from './gamepad-poll';
import { gamepadPoll, watchGamepads } from './gamepad-poll';
import { hostKeyboard, hostKeyboardControls, hostResultsKey } from './host-keyboard';
import { localPlayer, tickLocalInput } from './local-player';
import { TeamSetup } from './team-setup-route';
import type { TeamSetupView } from './team-setup';
import { GameFinalHint } from './game-final-hint';
import { Results } from './results';
import { HostGameScreen } from './host-game-screen';
import { hostScreen } from './session-adapter';
import { sessionDisplayStore } from './session-display';
import type { ComponentChildren } from 'preact';
import { GamePicker } from './picker-route';
import { initialPicker } from '@kaki/platform';
import { gameMetas, sessionRegistrations } from './game-registry';
import type { RoomState } from '@kaki/platform';
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
function Nickname({ value }: { value: string }) {
  const nameElement = useRef<HTMLSpanElement>(null);
  const [name, setName] = useState(() => ({ lines: nameLines(value), size: 34 }));
  useLayoutEffect(() => {
    const element = nameElement.current;
    const context = document.createElement('canvas').getContext('2d');
    if (!element || !context) return;
    const font = getComputedStyle(element).fontFamily;
    setName(namePresentation(value, element.clientWidth, (text, size) => {
      context.font = `${String(size)}px ${font}`;
      return context.measureText(text).width;
    }));
  }, [value]);
  return <span ref={nameElement} class="nickname">{name.lines.map((line, index) => <span class="name-line" key={index}>{line}</span>)}</span>;
}
function Seat({ seat, index }: { seat: LobbyView['seats'][number]; index: number }) {
  return <li class="ka-panel seat" data-empty={!seat.occupied}>
    <Overlap identity={seatIdentity(seat)} row index={index}>
      <div class="seat-content" data-empty={!seat.occupied} data-held={seat.held} data-dimmed={seat.dimmed}>
        <span class="seat-number" style={{ backgroundColor: seat.held ? 'var(--ka-panel-to)' : seat.colour, borderColor: seat.colour }}>{seat.number}</span>
        <Nickname value={seat.name}/>
        <span class="connection">{seat.connection && <>{seat.icon && <Icon kind={seat.icon}/>}<span>{seat.connection}</span></>}</span>
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
  useEffect(() => { void preloadShellPictures().catch(() => undefined); }, []);
  const audio = useMemo(() => hostSound(), []);
  useEffect(() => () => { audio.dispose(); }, [audio]);
  const [view, setView] = useState(() => lobbyView({ room: createRoom(), links: new Map(), code: '', pairing: hasSavedRoom() ? 'restoring' : 'creating', origin: location.origin }));
  const displays = useMemo(sessionDisplayStore, []);
  const [picker, setPicker] = useState(initialPicker(gameMetas));
  const [teamSetup, setTeamSetup] = useState<TeamSetupView | null>(null);
  const [room, setRoom] = useState<RoomState>(createRoom());
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
    const demoEvents = new AbortController();
    let latest: Parameters<typeof lobbyView>[0] | undefined;
    const clock = { now: () => Date.now() };
    let demoClock = false;
    const present = (input: Parameters<typeof lobbyView>[0]): void => {
      if (alive) { setPicker(input.picker ?? initialPicker(gameMetas)); setRoom(input.room); setTeamSetup(input.teamSetup ?? null); }
      latest = { ...input, origin: location.origin, joinOrigin: String(import.meta.env.KAKI_JOIN_ORIGIN) };
      if (alive) setView(lobbyView(latest, demoClock ? { now: () => performance.now() - demoStart } : clock));
    };
    const demoStart = performance.now();
    const tick = window.setInterval(() => { if (latest?.room.players.some(player => player.disconnectedAt !== null)) present(latest); }, 1000);
    const demo = import.meta.env.DEV ? new URLSearchParams(location.search).get('demo') : null;
    if (import.meta.env.DEV && demo === 'picker') {
      void import('./picker-demo').then(({ pickerDemo, pickerDemoChange }) => {
        const params = new URLSearchParams(location.search);
        const input = pickerDemo(params); present({ ...input, origin: location.origin });
        window.addEventListener('picker-demo-change', () => { if (alive) present({ ...pickerDemoChange(latest ?? input, params), origin: location.origin }); }, { signal: demoEvents.signal });
      });
    } else if (import.meta.env.DEV && demo !== null && /^[0-8]$/.test(demo)) {
      demoClock = true;
      void import('./demo').then(({ demoInput, demoChange }) => {
        const params = new URLSearchParams(location.search);
        const input = demoInput(Number(demo), params); present({ ...input, origin: location.origin });
        window.setTimeout(() => { if (alive && params.has('change')) present({ ...demoChange(input, params.get('change') ?? ''), origin: location.origin }); }, 2000);
      });
    } else {
      const controller = createHost(browserDependencies(String(import.meta.env.KAKI_SIGNAL_URL), undefined, undefined, value => { if (alive) displays.publish(value); }, event => { host.current?.sessionEvent(event); }), input => { present({ ...input, origin: location.origin }); });
      host.current = controller; void controller.start();
    }
    return () => { alive = false; demoEvents.abort(); window.clearInterval(tick); host.current?.stop(); };
  }, []);
  const local = useMemo(localPlayer, []);
  const padSlot = useRef<number | undefined>(undefined);
  const [padConnected, setPadConnected] = useState(false);
  const [localDevice, setLocalDevice] = useState<'keyboard' | 'controller'>('keyboard');
  const keyboard = useMemo(() => hostKeyboard({
    state: () => ({ phase: host.current?.room.phase ?? 'lobby', teams: host.current?.teamSetup?.screen === 'teams', localSeat: host.current?.room.players.some(isLocalSeat) ?? false, picker: host.current?.picker.screen }),
    controls: hostKeyboardControls,
    active: () => document.activeElement,
    join: () => { if (host.current?.joinLocal(local)) setLocalDevice('keyboard'); },
    leave: () => { host.current?.leaveLocal(); padSlot.current = undefined; },
    command: action => { host.current?.keyboard(action); },
  }), [local]);
  useLayoutEffect(() => { keyboard.rendered(); });
  useEffect(() => {
    const { held, key, clear, remember } = keyboard;
    window.addEventListener('keydown', key); window.addEventListener('keyup', key); window.addEventListener('blur', clear); window.addEventListener('focusin', remember);
    const previous: boolean[][] = [];
    const actions: PadAction[] = [];
    const hidden = (): void => { keyboard.visibility(document.hidden); };
    const disconnected = (event: GamepadEvent): void => { previous[event.gamepad.index]?.fill(false); if (padSlot.current === event.gamepad.index) padSlot.current = undefined; };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('gamepaddisconnected', disconnected);
    const keyboardTick = window.setInterval(() => { if (host.current?.room.players.some(isLocalSeat)) tickLocalInput('keyboard', padSlot.current, local, held, null); }, 1000 / 60);
    const stopPolling = watchGamepads(window, navigator, pads => {
      const seated = host.current?.room.players.some(isLocalSeat);
      if (!seated) padSlot.current = undefined;
      for (const action of gamepadPoll(previous, pads, padSlot.current, host.current?.room.phase ?? 'lobby', actions)) {
        if (action.type === 'clear') padSlot.current = undefined;
        else if (action.type === 'leave') { host.current?.leaveLocal(); padSlot.current = undefined; }
        else if (action.type === 'join' && host.current?.joinLocal(local)) { padSlot.current = action.index; setLocalDevice('controller'); }
        else if (action.type === 'key') {
          (document.activeElement ?? window).dispatchEvent(new KeyboardEvent('keydown', { key: action.key, code: action.key, bubbles: true, cancelable: true }));
        }
      }
      if (host.current?.room.players.some(isLocalSeat)) tickLocalInput('gamepad', padSlot.current, local, held, document.hidden || padSlot.current === undefined ? null : pads[padSlot.current] ?? null);
    }, setPadConnected);
    return () => { document.removeEventListener('visibilitychange', hidden); window.removeEventListener('gamepaddisconnected', disconnected); stopPolling(); window.clearInterval(keyboardTick); window.removeEventListener('keydown', key); window.removeEventListener('keyup', key); window.removeEventListener('blur', clear); window.removeEventListener('focusin', remember); };
  }, [keyboard, local]);
  const action = (element: HTMLButtonElement | null): void => { element?.focus(); };
  const lobby = <main class="screen lobby" aria-label="Host lobby">
    <header data-crowded={padConnected && room.players.length > 0 && !room.players.some(isLocalSeat)}><h1>Kaki Arcade</h1><span class="ka-chip" role="status">{view.pairing === 'reconnecting' ? 'Reconnecting' : 'Lobby'}</span><div class="lobby-hints" hidden={view.pairing === 'closed-room'}><p class="host-hints">{room.players.length > 0 && <span>Enter: pick a game</span>}{room.players.some(isLocalSeat) ? <span>L: leave</span> : <span>J: join from this keyboard</span>}{padConnected && !room.players.some(isLocalSeat) && <span class="host-pad-hint">Start on a game pad: join</span>}</p></div><span class="player-count">{view.count}</span></header>
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
  return <><SessionSurface sound={audio.sound} displays={displays} room={room} picker={picker} lobby={lobby} teamSetup={teamSetup} localDevice={localDevice} command={(action, value) => { host.current?.keyboard(action, value); }}
    startTeams={() => { host.current?.keyboard('teams-start'); }}
    back={() => { host.current?.returnToPicker(); }} again={() => { host.current?.playAgain(); }} continued={() => { host.current?.continueResults(); }}/>
    <PausePanel sound={audio.sound} paused={room.phase === 'paused'} resume={() => { host.current?.keyboard('resume'); }} quit={() => { host.current?.keyboard('quit'); }}/></>;
}
export function SessionSurface({ displays, room, picker, lobby, teamSetup, startTeams, back, again, continued, command, localDevice, sound }: {
  sound: Sound;
  localDevice: 'keyboard' | 'controller'; command: ReturnType<typeof createHost>['keyboard'];
  teamSetup: TeamSetupView | null; startTeams: () => void;
  displays: ReturnType<typeof sessionDisplayStore>; room: RoomState; picker: ReturnType<typeof initialPicker>; lobby: ComponentChildren; back: () => void; again: () => void; continued: () => void;
}) {
  const [session, setSession] = useState(() => displays.get());
  const [size, setSize] = useState({ width: innerWidth, height: innerHeight });
  useEffect(() => displays.subscribe(setSession), [displays]);
  useEffect(() => { const resize = (): void => { setSize({ width: innerWidth, height: innerHeight }); }; window.addEventListener('resize', resize); return () => { window.removeEventListener('resize', resize); }; }, []);
  const Screen = session?.Screen;
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => { const used = (): void => { setKeyboard(true); }; window.addEventListener('keydown', used); return () => { window.removeEventListener('keydown', used); }; }, []);
  useEffect(() => {
    if (!session?.finalScreen) return;
    const key = (event: KeyboardEvent): void => { setKeyboard(true); hostResultsKey(event, continued, back); };
    window.addEventListener('keydown', key); return () => { window.removeEventListener('keydown', key); };
  }, [session?.finalScreen, continued, back]);
  return <div class="host-shell"><Overlap fade surface identity={teamSetup?.screen === 'teams' ? 'teams' : hostScreen(session, picker.screen === 'lobby')}>{active => teamSetup?.screen === 'teams' ? <TeamSetup move={id => { command('teams-move', id); }} setup={teamSetup} room={room} game={gameMetas.find(g => g.id === picker.focus)?.name ?? ''} start={() => { if (active) startTeams(); }}/> : session ? session.results && !session.finalScreen ? <Results active={active} session={session} room={room} back={back} again={again} keyboard={keyboard}/> : Screen ? <><HostGameScreen starting={<GamePicker state={{ ...picker, screen: 'starting' }} room={room} localDevice={localDevice} setup={teamSetup}/>} Screen={Screen} view={session.view as never} width={size.width} height={size.height} ready={session.ready} sound={activeScreenSound(active, sound)} soundHistory={session.soundHistory}/>{session.finalScreen && <GameFinalHint theme={sessionRegistrations[session.gameId]?.finalHintTheme} keyboard={keyboard}/>}</> : <main class="screen room-status session-placeholder" aria-label="Game screen"><h1>This game’s screen is not built yet</h1><ol class="picker-players" aria-label="Players">{room.players.map(p => <li class="ka-panel" key={p.seat}><span class="seat-number" style={{ backgroundColor: `var(--ka-seat-${String(p.seat)})` }}>{p.seat}</span>{p.name}</li>)}</ol></main> : picker.screen === 'lobby' ? lobby : <GamePicker state={picker} room={room} localDevice={localDevice} setup={teamSetup}/>}</Overlap></div>;
}
