import { duration, easing, exitDuration, POPOVER_START_SCALE, reducedMotion } from '@kaki/ui';
import { useCallback, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Overlap } from './Overlap';
import './remove-player.css';
/** PLAT-011: expand the existing player card and keep confirmation at the trigger. */
export function RemovePlayer({ name, remove }: { name: string; remove: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const focusCancel = useCallback((element: HTMLButtonElement | null) => { element?.focus(); }, []);
  const wasConfirm = useRef(false);
  useLayoutEffect(() => {
    if (wasConfirm.current && !confirm) trigger.current?.focus();
    wasConfirm.current = confirm;
  }, [confirm]);
  return <div class="remove-player" data-confirm={confirm} onKeyDown={event => { if (event.key === 'Escape' && confirm) { event.stopPropagation(); setConfirm(false); } }}>
    <button ref={trigger} class="ka-panel ka-pressable" hidden={confirm} aria-expanded={confirm} onClick={() => { setConfirm(true); }}>Remove</button>
    <Overlap fade tempo="base" identity={String(confirm)}>{confirm && <div class="remove-confirm" role="group" aria-label={`Remove ${name}?`}>
      <p>Remove {name}?</p>
      <button class="ka-panel ka-pressable" onClick={remove}>Remove</button>
      <button ref={focusCancel} class="ka-panel ka-pressable" onClick={() => { setConfirm(false); }}>Cancel</button>
    </div>}</Overlap>
  </div>;
}

/** PLAT-011: the selected name expands into its column, keeping the list's scroll position. */
export function PhonePlayers({ players, ownSeat, remove, waiting = false }: { players: readonly { seat: number; name: string; connected?: boolean }[]; ownSeat: number | null; remove?: ((seat: number) => void) | undefined; waiting?: boolean }) {
  const orderedPlayers = waiting ? [...players].sort((a, b) => Number(a.connected !== false) - Number(b.connected !== false)) : players;
  const [selected, setSelected] = useState<{ seat: number; name: string; top: number; bottom: number } | null>(null);
  const column = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const nextFocus = useRef<number | null>(null);
  const closing = useRef(false);
  const animation = useRef<Animation | null>(null);
  const finish = () => { setSelected(null); closing.current = false; };
  const frames = () => [
    { clipPath: `inset(${String(selected?.top ?? 0)}px 0 ${String(selected?.bottom ?? 0)}px 0)`, transform: `scale(${String(POPOVER_START_SCALE)})` },
    { clipPath: 'inset(0px 0 0px 0)', transform: 'scale(1)' },
  ];
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    animation.current?.cancel();
    if (reducedMotion() || !panel.current?.animate) { finish(); return; }
    animation.current = panel.current.animate(frames().reverse(), { duration: exitDuration('base'), easing: easing.inOut });
    animation.current.onfinish = finish;
  };
  useLayoutEffect(() => {
    if (!selected) {
      if (nextFocus.current !== null) {
        (column.current?.querySelector<HTMLElement>(`[data-seat="${String(nextFocus.current)}"]`) ?? column.current?.querySelector<HTMLElement>('[data-seat]'))?.focus();
        nextFocus.current = null;
      }
      return;
    }
    panel.current?.querySelector<HTMLButtonElement>('button:last-child')?.focus();
    if (!reducedMotion()) animation.current = panel.current?.animate(frames(), { duration: duration.base, easing: easing.out }) ?? null;
    return () => { animation.current?.cancel(); };
  }, [selected]);
  useLayoutEffect(() => {
    if (selected && !players.some(player => player.seat === selected.seat)) close();
  }, [players, selected]);
  return <div ref={column} class="phone-player-column" data-confirm={Boolean(selected)} onKeyDown={event => {
    if (event.key === 'Escape' && selected) { event.stopPropagation(); close(); }
  }}>
    <ol class="phone-players" aria-label="Players" inert={Boolean(selected)} aria-hidden={Boolean(selected)}>{orderedPlayers.map((player, index) => <li key={player.seat}>
      {!remove || player.seat === ownSeat ? <span class="phone-player-own ka-panel" tabIndex={-1} data-seat={player.seat}>{player.name}{waiting && <span class="phone-presence ka-chip" data-away={player.connected === false}>{player.connected === false ? 'Away' : 'Here'}</span>}</span> : <button class="ka-panel ka-pressable" data-seat={player.seat} aria-label={`Remove ${player.name}`} onClick={event => {
        const bounds = column.current?.getBoundingClientRect();
        if (!bounds) return;
        const row = event.currentTarget.getBoundingClientRect();
        const candidates = [...orderedPlayers.slice(index + 1), ...orderedPlayers.slice(0, index)].filter(candidate => candidate.seat !== ownSeat);
        nextFocus.current = candidates[0]?.seat ?? ownSeat;
        setSelected({ ...player, top: Math.max(0, row.top - bounds.top), bottom: Math.max(0, bounds.bottom - row.bottom) });
      }}>{player.name}{waiting && <span class="phone-presence ka-chip" data-away={player.connected === false}>{player.connected === false ? 'Away' : 'Here'}</span>}</button>}
    </li>)}</ol>
    {selected && <div ref={panel} class="phone-player-confirm ka-panel" role="group" aria-label={`Remove ${selected.name}?`} style={{ transformOrigin: `center ${String(selected.top)}px` }}>
      <p>Remove {selected.name}?</p>
      <button class="ka-panel ka-pressable" onClick={() => { remove?.(selected.seat); }}>Remove</button>
      <button class="ka-panel ka-pressable" onClick={close}>Cancel</button>
    </div>}
  </div>;
}
