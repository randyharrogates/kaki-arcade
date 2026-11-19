/// <reference lib="dom" />
import { createElement as h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { SeatNumber, ThemeName } from '@kaki/ui';
import { headerModel, indicators } from './model';
import type { LinkState } from './model';
import { installPageLock } from './lock';
import { keepScreenAwake } from './wake';
import type { WakeState } from './wake';
export interface ControllerShellProps {
  seat: SeatNumber;
  name: string;
  heading?: string;
  link: LinkState;
  children?: ComponentChildren;
  theme?: ThemeName;
}
/** Generic controls; the phone route owns room-gated fullscreen. Import shell.css with the component. */
export function ControllerShell(props: ControllerShellProps) {
  const [wake, setWake] = useState<WakeState>('released');
  useEffect(() => {
    const unlock = installPageLock(document, document.documentElement);
    const stopWake = keepScreenAwake(navigator, document, setWake);
    return () => { unlock(); stopWake(); };
  }, []);
  const model = headerModel(props.seat, props.name, props.link);
  return h('main', { class: 'ka-controller-shell', 'data-theme': props.theme ?? 'console', 'aria-label': 'Controller' },
    h('header', { class: 'ka-controller-header' },
      h('div', { class: 'ka-controller-player' },
        h('span', { class: 'ka-controller-seat', style: { backgroundColor: model.colour } }, model.seat),
        h('strong', null, model.name)),
      h('div', { class: 'ka-controller-connection' },
        props.heading && h('span', { class: 'ka-controller-heading' }, props.heading),
      h('span', { class: 'ka-controller-link', role: 'status' },
        h('span', { class: 'ka-controller-icons', 'aria-hidden': 'true' },
          ...Object.entries(indicators).map(([state, indicator]) => h('span', { key: state, 'data-active': state === props.link }, indicator.icon))), h('span', { class: 'ka-controller-word' }, model.word)))),
    h('section', { class: 'ka-controller-board' },
      h('div', { class: 'ka-controller-play' }, props.children),
      h('div', { class: 'ka-controller-portrait', role: 'status' },
        h('svg', { class: 'ka-controller-rotate', 'aria-hidden': 'true', viewBox: '0 0 55 89' },
          h('rect', { x: 8, y: 5, width: 39, height: 79, rx: 5 })),
        h('p', null, 'Turn your phone sideways')),
      wake === 'unavailable' && h('p', { class: 'ka-controller-wake' }, 'Keep your screen on')));
}
