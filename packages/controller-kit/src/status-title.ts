/// <reference lib="dom" />
import { pulse, reducedMotion } from '@kaki/ui';

/** Themes opt a status title into success feedback using --ka-status-pulse:
 * success. The kit owns the token animation; games own which words mean success. */
export function pulseStatusTitle(node: HTMLElement): (() => void) | undefined {
  if (reducedMotion() || getComputedStyle(node).getPropertyValue('--ka-status-pulse').trim() !== 'success') return;
  const motion = pulse();
  const animation = node.animate(motion.keyframes,motion.options);
  return () => { animation.cancel(); };
}
