import { tv } from '@kaki/ui';
/** Uniformly fit the chosen board; resize work never runs in a frame loop. */
export function screenScale(width: number, height: number): number {
  return Math.max(0, Math.min(width / tv.width, height / tv.height));
}
