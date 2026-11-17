/// <reference lib="dom" />
import { createElement as h } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import { pressScale, press, BUTTON_FLOOR, SHAPE_BUTTONS, SHAPE_STROKE, space } from '@kaki/ui';
import { bindControlEvents, controlHit, vibratePress } from './button-input';
import type { ButtonCallbacks } from './button-input';

export interface ControlProps extends ButtonCallbacks { size?: number; height?: number }
const faces = ['Triangle', 'Square', 'Circle', 'Cross'] as const;
const directions = ['Up', 'Left', 'Right', 'Down'] as const;
const paths: Partial<Record<string, string>> = {
  Up: 'M6 15L12 9L18 15', Down: 'M6 9L12 15L18 9',
  Left: 'M15 6L9 12L15 18', Right: 'M9 6L15 12L9 18',
};
function Controls(props: ControlProps & { ids: readonly string[]; diamond?: boolean; slide?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const latest = useRef(props); latest.current = props;
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const buttons = () => node.querySelectorAll<HTMLButtonElement>('button');
    const feedback = (id: string, held: boolean) => {
      const button = [...buttons()].find(button => button.dataset.control === id);
      if (button) {
        button.getAnimations().forEach(animation => { animation.cancel(); });
        const motion = press(false);
        if (!held && motion.options.duration) button.animate(motion.keyframes, motion.options);
        button.style.transform = `scale(${String(pressScale(held))})`;
        button.dataset.held = String(held);
      }
      if (held) { vibratePress(); latest.current.onPress(id); }
      else latest.current.onRelease(id);
    };
    return bindControlEvents(node, window, document, {
      get slide() { return Boolean(latest.current.slide); },
      hit: event => controlHit(buttons(), event, Boolean(latest.current.diamond && !latest.current.slide)),
      onPress: id => { feedback(id, true); }, onRelease: id => { feedback(id, false); },
    });
  }, []);
  return h('div', { ref: root, class: props.diamond ? `ka-button-diamond${props.slide ? '' : ' ka-face-diamond'}` : 'ka-button-single', style: { '--diagonal-axis': Math.SQRT2, '--control-size': props.size === undefined ? undefined : `${String(props.size)}px`, '--control-height': props.height === undefined ? undefined : `${String(props.height)}px` } },
    ...props.ids.map((id, index) => {
      const shape = Object.values(SHAPE_BUTTONS).find(shape => shape.shape === id.toLowerCase());
      const path = shape?.path ?? paths[id];
      return h('button', { type: 'button', key: id, 'data-control': id, 'aria-label': id, 'data-held': 'false', class: `ka-kit-button ka-kit-${id.toLowerCase()}`, style: props.diamond ? { gridArea: ['1 / 2', '2 / 1', '2 / 3', '3 / 2'][index] } : undefined },
      path ? h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', style: { width: `${String(space[55])}px`, height: `${String(space[55])}px` } }, h('path', { d: path, 'stroke-width': SHAPE_STROKE })) : id); }));
}
export function FaceButtons(props: ControlProps) { return h(Controls, { ...props, size: props.size ?? BUTTON_FLOOR.face, ids: faces, diamond: true }); }
export function DPad(props: ControlProps) { return h(Controls, { ...props, size: props.size ?? BUTTON_FLOOR.inPlayWidth, height: props.height ?? BUTTON_FLOOR.inPlayHeight, ids: directions, diamond: true, slide: true }); }
export function ShoulderButton(props: ControlProps & { id: 'L' | 'R' }) { return h(Controls, { ...props, size: props.size ?? BUTTON_FLOOR.inPlayWidth, height: props.height ?? BUTTON_FLOOR.inPlayHeight, ids: [props.id] }); }
export function StartButton(props: ControlProps) { return h(Controls, { ...props, size: props.size ?? BUTTON_FLOOR.inPlayWidth, height: props.height ?? BUTTON_FLOOR.inPlayHeight, ids: ['Start'] }); }
