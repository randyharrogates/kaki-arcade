import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { arc, duration, easing, reducedMotion, space } from '@kaki/ui';
import type { RoomState } from '@kaki/platform';
import type { TeamSetupView } from './team-setup';
import { phoneGridNamePresentations, namePresentation } from './seat-text';
import './team-setup.css';
import { Icon } from './icons';
let nameCanvas: HTMLCanvasElement | undefined;

function TeamName({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let active = true;
    const fit = () => {
      if (!active) return;
      nameCanvas ??= document.createElement('canvas');
      const context = nameCanvas.getContext('2d');
      if (!context) return;
      const font = getComputedStyle(el).fontFamily;
      const measure = (text: string, size: number) => { context.font = `${String(size)}px ${font}`; return context.measureText(text).width; };
      const fitted = namePresentation(name, el.clientWidth, measure, true);
      // Measure one line; the full name remains available to pointer and assistive users.
      el.textContent = fitted.lines.join('');
      el.style.fontSize = `${String(fitted.size)}px`;
    };
    fit(); const observer = new ResizeObserver(fit); observer.observe(el); void document.fonts.ready.then(fit);
    return () => { active = false; observer.disconnect(); };
  }, [name]);
  return <span class="team-player-name" ref={ref} title={name} aria-label={name}>{name}</span>;
}
export function TeamSetup({ setup, room, game, start }: { setup: TeamSetupView; room: RoomState; game: string; start: () => void }) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const before = useRef(new Map<string, DOMRect>());
  const previousTeams = useRef(new Map<string, number | undefined>());
  const animations = useRef(new Map<string, Animation>());
  // Measure the painted positions before Preact moves keyed players to their new grid cells.
  for (const [id, el] of nodes.current) before.current.set(id, el.getBoundingClientRect());
  useLayoutEffect(() => {
    for (const [id, el] of nodes.current) {
      const from = before.current.get(id);
      animations.current.get(id)?.cancel();
      const to = el.getBoundingClientRect();
      if (from && (from.left !== to.left || from.top !== to.top)) {
        const scale = to.width;
        const width = el.offsetWidth;
        const dx = (from.left - to.left) * width / scale, dy = (from.top - to.top) * width / scale;
        const changedTeam = previousTeams.current.get(id) !== setup.players.find(p => p.id === id)?.team;
        const motion = arc({ x: dx, y: dy }, { x: 0, y: 0 }, { height: space[34] });
        const frames = changedTeam
          ? motion.keyframes.map(frame => ({ ...frame, transform: `translate(${String(dx)}px, ${String(dy)}px) ${String(frame.transform)}` }))
          : [{ transform: `translate(${String(dx)}px, ${String(dy)}px)` }, { transform: 'translate(0px, 0px)' }];
        if (!reducedMotion()) {
          el.style.zIndex = changedTeam ? '3' : '2';
          const animation = el.animate(frames, { duration: changedTeam ? motion.options.duration : duration.base, easing: easing.inOut, fill: 'none' });
          animations.current.set(id, animation);
          animation.onfinish = animation.oncancel = () => {
            if (animations.current.get(id) === animation) { el.style.zIndex = ''; animations.current.delete(id); }
          };
        }
      }
    }
    previousTeams.current = new Map(setup.players.map(p => [p.id, p.team]));
  }, [setup]);
  useLayoutEffect(() => () => { for (const a of animations.current.values()) a.cancel(); }, []);
  const leader = room.players.find(p => p.seat === room.leader)?.name ?? 'The leader';
  return <main class="screen team-screen" aria-label="Team setup">
    <header><h1>Pick a side</h1><p>{game} · team mode</p></header>
    <section class="team-field" aria-label="Teams">
      <div class="team-half team-red"/><div class="team-half team-blue"/>
      <h2 class="team-label team-red-label">Red · {setup.players.filter(p => p.team === 0).length}</h2>
      <h2 class="team-label team-blue-label">Blue · {setup.players.filter(p => p.team === 1).length}</h2>
      <div class="team-line"/>
      {setup.players.map(p => <div key={p.id} ref={el => { if (el) nodes.current.set(p.id, el); else nodes.current.delete(p.id); }} class="team-player ka-panel" data-team={p.team} data-seat={p.seat}
        style={{ gridColumn: p.team === 0 ? 1 : 2, gridRow: setup.players.filter(other => other.team === p.team && other.seat <= p.seat).length + 1 }}>
        <span class="seat-number" style={{ backgroundColor: `var(--ka-seat-${String(p.seat)})` }}>{p.seat}</span><TeamName name={p.name}/>{p.seat === room.leader && <span class="team-leader"><Icon kind="leader"/> Leader</span>}
      </div>)}
    </section>
    <footer><p role="status">{setup.error ?? `Tap your side on your phone. ${leader} starts.`}</p><button class="ka-panel ka-pressable picker-primary" onClick={start} disabled={setup.players.length < 2}>Start</button></footer>
  </main>;
}
export function PhoneTeams({ setup, seat, leader, send }: { setup: TeamSetupView; seat: number | null; leader: boolean; send: (control: string, value?: string) => void }) {
  const [moving, setMoving] = useState(false);
  const lastRefusal = useRef('');
  const [headingRefusal, setHeadingRefusal] = useState<string | null>(null);
  const pendingMoveRevision = useRef<number | null>(null);
  const previousNotice = useRef<string | null>(null);
  const refusalTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const notice = setup.refused && setup.notice ? setup.notice : null;
    const appeared = notice !== null && notice !== previousNotice.current;
    previousNotice.current = notice;
    const moveReply = pendingMoveRevision.current !== null && setup.revision > pendingMoveRevision.current;
    if (moveReply || !moving) pendingMoveRevision.current = null;
    if (!moving || !notice) {
      window.clearTimeout(refusalTimer.current);
      setHeadingRefusal(null);
      return;
    }
    if (!appeared && !moveReply) return;
    window.clearTimeout(refusalTimer.current);
    lastRefusal.current = notice;
    setHeadingRefusal(notice);
    refusalTimer.current = window.setTimeout(() => { setHeadingRefusal(null); }, 3000);
  }, [moving, setup.notice, setup.refused, setup.revision]);
  useEffect(() => () => { window.clearTimeout(refusalTimer.current); }, []);
  const own = setup.players.find(p => p.seat === seat);
  const grid = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el) return;
    let active = true;
    const fit = () => {
      if (!active) return;
      nameCanvas ??= document.createElement('canvas');
      const context = nameCanvas.getContext('2d');
      if (!context) return;
      const labels = Array.from(el.querySelectorAll<HTMLElement>('.team-player-name'));
      const font = getComputedStyle(el).fontFamily;
      const fitted = phoneGridNamePresentations(labels.map(label => ({ name: label.title, width: label.clientWidth })), (text, size) => {
        context.font = `${getComputedStyle(el).fontWeight} ${String(size)}px ${font}`;
        return context.measureText(text).width;
      });
      labels.forEach((label, index) => {
        const presentation = fitted[index];
        if (!presentation) return;
        label.textContent = presentation.lines.join('');
        label.style.fontSize = `var(--ka-phone-type-${String(presentation.size)})`;
      });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    void document.fonts.ready.then(fit);
    return () => { active = false; observer.disconnect(); };
  }, [moving, setup.players]);
  return <section class="phone-teams" data-moving={moving} data-refused={Boolean(setup.notice && setup.refused)} aria-label="Pick a side">
    {!moving && <div class="phone-team-buttons">{(['Red', 'Blue'] as const).map((name, team) => <button class={`ka-pressable phone-team-${name.toLowerCase()}`} aria-pressed={own?.team === team} onClick={() => { send(own?.team === team ? 'teams-dismiss' : 'teams-switch'); }}>{name}{own?.team === team ? ' ✓' : ''}</button>)}</div>}
    <p role="status" class={moving ? 'phone-live' : undefined}>{setup.notice ? <strong class={setup.refused ? 'phone-picker-reason' : undefined}>{setup.refused && <Icon kind="weak"/>}{setup.notice}</strong> : (leader ? moving ? '' : 'Choose your side or move players.' : 'The leader starts when everyone is ready.')}</p>
    {leader && <>{moving ? <div class="phone-team-moves" data-heading-refused={Boolean(headingRefusal)} ref={grid} aria-label="Move players" style={{ gridTemplateColumns: `repeat(${String([0, 1].reduce((sum, team) => sum + Math.max(1, Math.ceil(setup.players.filter(p => p.team === team).length / 3)), 0))}, minmax(0, 1fr))` }}>{(['Red', 'Blue'] as const).map((teamName, team) => <section class="phone-team-half" aria-label={teamName} key={teamName} style={{ '--team-columns': Math.max(1, Math.ceil(setup.players.filter(p => p.team === team).length / 3)), gridColumn: `span ${String(Math.max(1, Math.ceil(setup.players.filter(p => p.team === team).length / 3)))}` }}><h2>{teamName}</h2><div class="phone-team-roster">{setup.players.filter(p => p.team === team).map(p => <button class="ka-panel ka-pressable" key={p.id} aria-label={`Seat ${String(p.seat)}, ${p.name}, ${teamName} team. Move to ${team === 0 ? 'Blue' : 'Red'}.`} onClick={() => { window.clearTimeout(refusalTimer.current); setHeadingRefusal(null); pendingMoveRevision.current = setup.revision; send('teams-move', p.id); }}><span class="phone-team-mark" aria-hidden="true" style={{ backgroundColor: `var(--ka-team-${team === 0 ? 'red' : 'blue'})` }}>{p.seat}</span><span class="team-player-name" title={p.name}>{p.name}</span></button>)}</div></section>)}<div class="phone-team-heading-refusal phone-picker-reason" aria-hidden="true"><Icon kind="weak"/>{headingRefusal ?? lastRefusal.current}</div></div> : null}<div class="phone-team-actions">{!moving && <button class="ka-panel ka-pressable" onClick={() => { setMoving(true); send('teams-dismiss'); }}>Move players</button>}{moving && <button class="ka-panel ka-pressable" onClick={() => { setMoving(false); send('teams-dismiss'); }}>Done</button>}<button class="ka-panel ka-pressable" onClick={() => { send('teams-back'); }}>Back to game picker</button><button class="ka-panel ka-pressable picker-primary" disabled={setup.players.length < 2} onClick={() => { send('teams-start'); }}>Start</button></div></>}
  </section>;
}

/** Text and the stronger border share the same motion timing. */
export function TeamsToggle({ enabled, toggle }: { enabled: boolean; toggle: () => void }) {
  return <button class="ka-panel ka-pressable phone-teams-choice" aria-label="Teams" aria-pressed={enabled} onClick={toggle}>
    <span class="phone-teams-state" data-visible={!enabled} aria-hidden="true">Teams off</span>
    <span class="phone-teams-state" data-visible={enabled} aria-hidden="true">Teams on ✓</span>
  </button>;
}
