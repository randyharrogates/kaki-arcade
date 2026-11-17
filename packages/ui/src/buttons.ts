// Button-size floors on the phone (docs/DESIGN.md §4.4, D-051, corrected by D-053): "buttons
// must not be too small". Sizes are in CSS px. 68 is a size, not a spacing value: it is the
// height of the Peek Poker grid cell on board 4.

import { phone } from './scale';
import type { Size } from './scale';

/** Floors at the reference phone, 844 × 390. */
export const BUTTON_FLOOR = {
  /** Each of the four face buttons (cross, circle, square, triangle): width and height. */
  face: 110,
  /** Any other control a player taps during play: at least this wide. */
  inPlayWidth: 89,
  /** Any other control a player taps during play: at least this tall. */
  inPlayHeight: 68,
  /** Anything tappable anywhere, on the phone or the TV: width and height. */
  minimum: 55,
} as const;
export type ButtonKind = keyof typeof BUTTON_FLOOR;

/** D-122: faces on narrow phones use the viewport long side, down to 89 px. */
export function faceFloor(viewport: Size): number {
  return Math.max(BUTTON_FLOOR.inPlayWidth, BUTTON_FLOOR.face * Math.min(1, Math.max(viewport.width, viewport.height) / phone.width));
}

/**
 * How much larger than the reference phone a screen is: the smaller of its width and height
 * ratios, so a control scaled by it still fits. Never below 1: a smaller phone keeps the
 * reference sizes here; layout faces use the D-122 faceFloor exception. The controller is landscape-only; portrait sizes are read as landscape.
 */
export function phoneScale(viewport: Size): number {
  const long = Math.max(viewport.width, viewport.height);
  const short = Math.min(viewport.width, viewport.height);
  const factor = Math.min(long / phone.width, short / phone.height);
  return Number.isFinite(factor) ? Math.max(1, factor) : 1;
}

/** One button size for a phone of the given size, in whole px, never under its floor. */
export function buttonSize(kind: ButtonKind, viewport: Size): number {
  return Math.round(BUTTON_FLOOR[kind] * phoneScale(viewport));
}

/** Every size for a phone of the given size. */
export function buttonSizes(viewport: Size): Record<ButtonKind, number> {
  return {
    face: buttonSize('face', viewport),
    inPlayWidth: buttonSize('inPlayWidth', viewport),
    inPlayHeight: buttonSize('inPlayHeight', viewport),
    minimum: buttonSize('minimum', viewport),
  };
}

/** The smallest an in-play control (not a face button) may be on a phone of the given size. */
export function inPlaySize(viewport: Size): Size {
  return { width: buttonSize('inPlayWidth', viewport), height: buttonSize('inPlayHeight', viewport) };
}

/**
 * The same rule as a CSS length, for use without script: the floor, or the floor scaled to
 * the viewport when that is larger.
 */
export function buttonSizeCss(kind: ButtonKind, heightUnit: 'vh' | 'svh' = 'svh'): string {
  const floor = BUTTON_FLOOR[kind];
  const byWidth = `calc(max(100vw, 100${heightUnit}) * ${String(floor)} / ${String(phone.width)})`;
  const byHeight = `calc(min(100vw, 100${heightUnit}) * ${String(floor)} / ${String(phone.height)})`;
  return `max(${String(floor)}px, min(${byWidth}, ${byHeight}))`;
}
