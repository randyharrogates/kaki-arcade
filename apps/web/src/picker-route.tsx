import { GameSetupMirror } from './game-setup-route';
import type { TeamSetupView } from './team-setup';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { expand } from '@kaki/ui';
import { MAX_PLAYERS } from '@kaki/protocol';
import type { RoomState, PickerModel } from '@kaki/platform';
import { playerRange, unavailable } from '@kaki/platform';
import { LOCAL_CONNECTION } from './local-player';
import { gameMetas } from './game-registry';
import { Icon } from './icons';
import { Overlap } from './Overlap';
import { pickerAnimation, pickerRects, pickerFocusAnimation, pickerLayout } from './picker-animation';
import { freezePickerContent, wipePickerContent } from './picker-content';

/** The tile owns the mask; surface and content travel together without scaling text. */
export function GamePicker({ state, room, setup = null, localDevice = 'keyboard' }: { state: PickerModel; room: RoomState; setup?: TeamSetupView | null; localDevice?: 'keyboard' | 'controller' }) {
  const tiles = useRef(new Map<string, HTMLElement>());
  const snapshots = useRef(new Map<string, HTMLElement>());
  const before = useRef(new Map<string, DOMRect>());
  const previous = useRef(state);
  const clips = useRef(new Map<string, ReturnType<typeof pickerAnimation>>());
  const animations = useRef<Animation[]>([]);
  const [covered, setCovered] = useState(state.screen !== 'picker');
  const expanded = state.screen === 'start' || state.screen === 'starting';
  const changing = previous.current.focus !== state.focus ||
    (previous.current.screen === 'start' || previous.current.screen === 'starting') !== expanded;
  // Freeze outgoing content before Preact updates it; geometry is owned by the layout effect.
  if (changing) for (const [id, tile] of tiles.current) {
    const content = tile.querySelector<HTMLElement>('.game-tile-content:not([data-snapshot])');
    const changesContent = id === state.focus || id === previous.current.focus;
    if (changesContent && content && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      snapshots.current.set(id, freezePickerContent(content));
  }
  useLayoutEffect(() => {
    const measure = (): void => { for (const animation of animations.current) animation.cancel(); animations.current = []; for (const clip of clips.current.values()) clip.clear(); for (const [id, tile] of tiles.current) { tile.querySelector('.game-tile-content')?.removeAttribute('style'); before.current.set(id, tile.getBoundingClientRect()); } };
    window.addEventListener('resize', measure);
    return () => { window.removeEventListener('resize', measure); };
  }, []);
  useLayoutEffect(() => {
    // Capture every painted rectangle before cancellation, including focus translations.
    const visible = pickerRects(tiles.current);
    for (const [id, clip] of clips.current) { const box = clip.interrupt(); if (box) visible.set(id, box as DOMRect); }
    for (const animation of animations.current) animation.cancel();
    animations.current = [];
    for (const tile of tiles.current.values()) {
      for (const property of ['position', 'left', 'top', 'width', 'height', 'z-index']) tile.style.removeProperty(property);
      tile.querySelector('.game-tile-content')?.removeAttribute('style');
    }
    const wasExpanded = previous.current.screen === 'start' || previous.current.screen === 'starting';
    const changingSize = wasExpanded !== expanded;
    setCovered(!changingSize && expanded);
    const slow = import.meta.env.DEV ? Math.max(1, Number(new URLSearchParams(location.search).get('slow')) || 1) : 1;
    const screen = tiles.current.values().next().value?.closest<HTMLElement>('.screen');
    const scale = screen ? screen.getBoundingClientRect().width / screen.offsetWidth : 1;
    const rect = (r: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>) => ({ left: r.left / scale, top: r.top / scale, width: r.width / scale, height: r.height / scale });
    const targets = pickerLayout(tiles.current, state.focus, expanded);
    for (const [id, tile] of tiles.current) {
      const to = targets.get(id);
      if (!to) continue;
      const from = before.current.has(id) ? visible.get(id) ?? before.current.get(id) : undefined;
      before.current.set(id, to);
      const content = tile.querySelector<HTMLElement>('.game-tile-content');
      const old = snapshots.current.get(id);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const changesContent = changingSize ? id === state.focus : id === state.focus || id === previous.current.focus;
      if (!from) continue;
      if (changingSize && id === state.focus && content) {
        let clip = clips.current.get(id);
        if (!clip) { clip = pickerAnimation(tile, content); clips.current.set(id, clip); }
        clip.start(from, to, scale, expanded, slow, () => { setCovered(expanded); });
      } else if (!changingSize && !expanded) {
        const motion = expand(rect(from), rect(to));
        motion.options.duration *= slow;
        if (motion.options.duration > 0) {
          const animation = pickerFocusAnimation(tile, content, rect(from), rect(to), motion.options);
          if (animation) animations.current.push(animation);
        }
      }
      if (!reduced && content && old && changesContent) {
        const motion = expand(rect(from), rect(to));
        const duration = motion.options.duration * slow * (changingSize && !expanded ? 0.8 : 1);
        if (duration > 0) animations.current.push(...wipePickerContent(content, old, duration));
      }
    }
    previous.current = state;
  }, [expanded, state.focus]);
  useLayoutEffect(() => () => { for (const clip of clips.current.values()) clip.clear(); for (const animation of animations.current) animation.cancel(); }, []);
  const leaderPlayer = room.players.find(player => player.seat === room.leader);
  const leader = leaderPlayer?.name ?? 'The leader';
  const starts = `${leader} starts ${leaderPlayer?.connectionId === LOCAL_CONNECTION ? `with the ${localDevice}` : 'on their phone'}`;
  const params = import.meta.env.DEV ? new URLSearchParams(location.search) : null;
  const layout = import.meta.env.DEV && params?.get('demo') === 'picker' ? params.get('layout') ?? 'b' : undefined;
  return <main class="screen picker-screen" aria-label="Game picker" data-layout={layout} data-art={import.meta.env.DEV && params?.get('art') === '1' ? 'placeholder' : undefined}>
    <header data-start={expanded}><Overlap fade identity={expanded ? state.screen : 'picker'}><PickerHeading expanded={expanded} text={expanded ? state.screen === 'starting' ? 'Starting…' : starts : 'Pick a game'}/>{(!expanded || state.error) && <p>{state.error ? <><Icon kind="weak"/>{state.error}</> : `${leader} is choosing: ${gameMetas.find(game => game.id === state.focus)?.name ?? ''}`}</p>}</Overlap><div class="picker-header-side"><span class="player-count">{room.players.length} of {MAX_PLAYERS} players</span><p class="host-hints">{expanded ? <><span>Enter: start</span><span>Esc: back</span>{gameMetas.find(game => game.id === state.focus)?.teams !== 'none' && !setup?.teamsReason && <span>T: teams</span>}</> : <><span>Left and Right: choose</span><span>Enter: select</span><span>Esc: back</span></>}</p></div></header>
    <div class="announcements" aria-live="polite" aria-atomic="true">{state.error ?? `${state.screen === 'starting' ? 'Starting ' + (gameMetas.find(game => game.id === state.focus)?.name ?? 'the game') : expanded ? starts : leader + ' is choosing'}${expanded ? '' : ' ' + (gameMetas.find(game => game.id === state.focus)?.name ?? '')}`}</div>
    <div class="picker-stage" role="list" aria-label="Installed games">
      {gameMetas.map(game => {
        const focused = game.id === state.focus;
        const detail = focused && expanded;
        const hasSettings = detail && Boolean(setup?.settings && (setup.settings.fields.length || setup.settings.loading || setup.settings.problem));
        const reason = unavailable(game, room.players.length);
        return <div key={game.id} ref={node => { if (node) tiles.current.set(game.id, node); else tiles.current.delete(game.id); }}
          class="game-tile" data-game={game.id} data-focused={focused} data-expanded={detail} data-hidden={expanded && covered && !focused}
          tabIndex={expanded && !focused ? -1 : 0} role="listitem" aria-current={focused ? 'true' : undefined} aria-disabled={reason !== null} aria-label={`${game.name}. ${game.blurb} ${playerRange(game)}. ${reason ?? 'Available'}`}>
          <div class="game-surface ka-panel"/>
          <div class="game-tile-content">
            <div class="game-picture-slot" aria-label="Game picture slot"/>
            <div class="game-copy"><div class="game-metadata" data-primary={focused}><h2>{game.name}</h2><p>{game.blurb}</p><p>{playerRange(game)}</p>{reason && <strong class="game-unavailable"><Icon kind="weak"/>{reason}</strong>}</div>{hasSettings && <div class="game-setup-slot" aria-label="Settings and team setup slot"><GameSetupMirror setup={setup}/></div>}</div>
            <div class="game-detail">{detail ? <div class="game-start-content"><h3>Who’s in</h3><ol class="picker-players">{room.players.map(player => <li class="ka-panel" key={player.seat}><span class="seat-number" style={{ backgroundColor: `var(--ka-seat-${String(player.seat)})` }}>{player.seat}</span><span>{player.name}{player.disconnectedAt !== null ? ' · Seat held' : ''}</span></li>)}</ol><div class="game-setup-slot"/></div> : <span/>}</div>
          </div>
        </div>;
      })}
    </div>
  </main>;
}

function PickerHeading({ expanded, text }: { expanded: boolean; text: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const element = heading.current;
    if (!element) return;
    let alive = true;
    const fit = () => {
      if (!alive) return;
      element.style.removeProperty('font-size');

      const context = document.createElement('canvas').getContext('2d');
      if (!context) return;
      const css = getComputedStyle(element);
      context.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      const metrics = context.measureText(element.textContent);
      const width = Math.max(metrics.width, metrics.actualBoundingBoxRight);
      const header = element.closest('header');
      if (!header) return;
      const column = parseFloat(getComputedStyle(header).gridTemplateColumns.split(' ')[0] ?? '0');
      const token = width <= column ? 'var(--ka-type-89)' : 'var(--ka-type-55)';
      element.style.fontSize = token;
      if (!element.closest('.outgoing')) header.style.setProperty('--picker-heading-size', token);
    };
    fit();
    const observer = new ResizeObserver(fit); observer.observe(element.closest('header') ?? element);
    void document.fonts.ready.then(fit);
    return () => { alive = false; observer.disconnect(); };
  }, [expanded, text]);
  return <h1 ref={heading}>{text}</h1>;
}
