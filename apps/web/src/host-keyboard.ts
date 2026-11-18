import type { RoomState } from '@kaki/platform';

/** Stable listener: state is read from the authoritative host for every key. */
export function hostKeyboard(input: {
  state(): { phase: RoomState['phase']; teams: boolean; picker?: string | undefined; localSeat?: boolean };
  controls(): HTMLElement[];
  active(): Element | null;
  join(): void;
  leave(): void;
  command(action: 'pause' | 'resume' | 'open' | 'teams-back' | 'back' | 'previous' | 'next' | 'select' | 'start' | 'teams-toggle'): void;
}) {
  const held = new Set<string>();
  let focusPause = false;
  let focused: HTMLElement | undefined;
  let label: string | null = null;
  const focus = (node: HTMLElement | undefined): void => {
    if (!node) return;
    node.focus(); focused = node; label = node.textContent;
  };
  return {
    held,
    remember: (): void => {
      const active = input.active();
      focused = input.controls().find(node => node === active);
      label = focused?.textContent ?? null;
    },
    clear: (): void => { held.clear(); },
    visibility: (hidden: boolean): void => { if (hidden) held.clear(); },
    rendered(): void {
      const nodes = input.controls();
      const active = input.active();
      if (nodes.includes(active as HTMLElement)) {
        focused = active as HTMLElement; label = focused.textContent;
      } else if (focused && !nodes.includes(focused) && label !== null &&
        (!active || active === focused || (typeof document !== 'undefined' && active === document.body))) {
        focus(nodes.find(node => node.textContent === label));
      }
      if (!focusPause) return;
      if (input.state().phase === 'paused') {
        focus(nodes[0]);
        focusPause = false;
      } else if (input.state().phase !== 'playing') focusPause = false;
    },
    key: (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.type === 'keyup') { held.delete(event.code); return; }
      const { phase, teams, picker, localSeat } = input.state();
      if (event.code === 'KeyJ' && phase === 'lobby') { input.join(); return; }
      if (event.code === 'KeyL' && phase === 'lobby' && !teams && (picker === undefined || picker === 'lobby' || picker === 'picker' || picker === 'start')) { held.clear(); input.leave(); return; }
      if (phase === 'playing' && event.code !== 'Escape') {
        if (localSeat && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Enter', 'KeyE', 'KeyQ', 'KeyR', 'KeyZ', 'KeyX'].includes(event.code)) { held.add(event.code); event.preventDefault(); }
        return;
      }
      if (phase === 'results' && (event.key === 'Escape' || event.key === 'Enter')) return;
      if (event.key === 'Escape') {
        if (event.repeat) return;
        event.preventDefault();
        if (phase === 'playing') { held.clear(); focusPause = true; input.command('pause'); }
        else if (phase === 'paused') input.command('resume');
        else input.command(teams ? 'teams-back' : 'back');
        return;
      }
      const active = input.active();
      if ((event.key === 'Enter' || event.key === ' ') && input.controls().includes(active as HTMLElement)) {
        event.preventDefault();
        if (!event.repeat) (active as HTMLElement).click();
        return;
      }
      if (phase === 'lobby' && !teams && picker !== undefined) {
        const action = picker === 'lobby' ? event.key === 'Enter' ? 'open' : null
          : event.key === 'ArrowLeft' ? 'previous' : event.key === 'ArrowRight' ? 'next'
          : event.key === 'Enter' ? picker === 'start' ? 'start' : 'select'
          : event.code === 'KeyT' && picker === 'start' ? 'teams-toggle' : null;
        if (action) { event.preventDefault(); if (!event.repeat) input.command(action); return; }
      }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        const nodes = input.controls();
        const index = nodes.indexOf(input.active() as HTMLElement);
        const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
        focus(nodes[index < 0 ? 0 : (index + direction + nodes.length) % nodes.length]);
      }
    },
  };
}

export function hostKeyboardControls(): HTMLElement[] {
  const pause = document.querySelector('.host-pause:not([inert])');
  return [...(pause ?? document).querySelectorAll<HTMLElement>('.host-pause button:not(:disabled), .host-shell button:not(:disabled), .host-shell a[href], .host-shell [role="button"][tabindex="0"]')]
    .filter(el => el.isConnected && !el.closest('.outgoing, [inert], [hidden], [aria-hidden="true"]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility === 'visible');
}

/** TV results remain usable after every controller has disconnected. */
export function hostResultsKey(event: KeyboardEvent, continued: () => void, back: () => void): void {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.defaultPrevented) return;
  const active = typeof document === 'undefined' ? null : document.activeElement;
  if (event.key === 'Enter' && !active?.matches('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')) { event.preventDefault(); continued(); }
  if (event.key === 'Escape') { event.preventDefault(); back(); }
}
