// Motion tokens (docs/DESIGN.md §3 and §4.5, board 5, D-051).

import { PHI } from './scale';

/** Durations in ms. Each step is 1.618 times the last. */
export const duration = {
  /** Press, small changes. */
  fast: 144,
  /** Menus, rows. */
  base: 233,
  /** Tiles, screens, throws. */
  slow: 377,
} as const;
export type Tempo = keyof typeof duration;
export const TEMPOS = ['fast', 'base', 'slow'] as const;

/** An exit runs at this fraction of its entrance: about 20% shorter. */
export const EXIT_FACTOR = 0.8;

/** Duration of the exit that undoes an entrance of the given tempo, in whole ms. */
export function exitDuration(tempo: Tempo): number {
  return Math.round(duration[tempo] * EXIT_FACTOR);
}

/**
 * Longer moves on board 5 continue the same 1.618 steps from `slow`: a thrown or dealt object
 * takes one step more (610 ms), a score counting up two steps more (987 ms).
 */
export const derivedDuration = {
  arc: Math.round(duration.slow * PHI),
  /** Board 5 success ring runs at 1.2 × slow. */
  pulseRing: Math.round(duration.slow * 1.2),
  countUp: Math.round(duration.slow * (PHI + 1)),
} as const;

/** A cubic Bézier as its four control numbers: x1, y1, x2, y2. */
export type Bezier = readonly [number, number, number, number];

/**
 * Easing curves. `out` and `inOut` are the two chosen on board 5 (2A, soft landing). `in`
 * is the leaving half of board 5 split moves.
 * No curve leaves the 0 to 1 range, so nothing bounces or overshoots.
 */
export const bezier = {
  /** Entrances: starts fast, settles gently. */
  out: [0.16, 1, 0.3, 1],
  /** Moves. */
  inOut: [0.65, 0, 0.35, 1],
  /** ease-in: exits and the falling half of an arc only, never entrances. */
  in: [0.6, 0, 1, 1],
} as const satisfies Record<string, Bezier>;
export type EasingName = keyof typeof bezier;
export const EASING_NAMES = ['out', 'inOut', 'in'] as const;

function trim(value: number): string {
  // 0.16 is written ".16", as on the board.
  return String(value).replace(/^0\./, '.');
}

/** A curve as a CSS `cubic-bezier()` value. */
export function bezierCss(curve: Bezier): string {
  return `cubic-bezier(${curve.map(trim).join(',')})`;
}

/** The curves as CSS values. */
export const easing = {
  out: bezierCss(bezier.out),
  inOut: bezierCss(bezier.inOut),
  in: bezierCss(bezier.in),
  linear: 'linear',
} as const;

/** List rows follow one another by this many ms. */
export const STAGGER_MS = 30;
/** A pressed control is drawn at this scale. */
export const PRESS_SCALE = 0.97;
/** A popover or menu starts at this scale. */
export const POPOVER_START_SCALE = 0.95;
/** A moving knob or thumb stretches by this fraction along its direction of travel. */
export const KNOB_STRETCH = 0.12;
/** A row or detail entering travels this far, in px. */
export const ENTER_DISTANCE = 13;
/** The peak of the success pulse. It returns to exactly 1 and does not go below it. */
export const PULSE_SCALE = 1.05;

/**
 * The value of a cubic Bézier easing at time `x` (0 to 1): what CSS and the Web Animations
 * API compute for `cubic-bezier(x1, y1, x2, y2)`.
 */
export function bezierAt(curve: Bezier, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const [x1, y1, x2, y2] = curve;
  const sample = (a: number, b: number, t: number): number => {
    const u = 1 - t;
    return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
  };
  // x(t) is monotonic when x1 and x2 are in 0..1, so bisection always finds t.
  let low = 0;
  let high = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    if (sample(x1, x2, mid) < x) low = mid;
    else high = mid;
  }
  return sample(y1, y2, (low + high) / 2);
}

/** Ease-out cubic, used for counting up: fast at first, slowing to a stop. */
export function easeOutCubic(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return 1 - (1 - p) ** 3;
}

/** Derived geometry from board 5 (main checkout docs/design-gate/05-motion.html):
 * pulse sample .7 opacity, .6 → 1.8 scale, .4 peak; card sample 90° at halfway.
 * Arc segments and edge epsilon are sampling/rounding precision, not design values.
 */
export const motionGeometry = {
  ringOpacity: 0.7, ringStart: 0.6, ringEnd: 1.8, pulsePeak: 0.4,
  cardHalf: 0.5, cardEdgeDegrees: 90, arcSegments: 12, edgeEpsilon: 1e-9,
} as const;
