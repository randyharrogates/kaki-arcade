// Motion helpers (docs/DESIGN.md §3 and §4.5). Each returns keyframes
// and timing that go straight into the Web Animations API,
//
//   const m = enter({ kind: 'popover', origin });
//   Object.assign(element.style, m.style);
//   element.animate(m.keyframes, m.options);
//
// or frame values for a renderer that draws its own frames (`arcPoint`, `cardTurnAt`,
// `countUpAt`). Only reducedMotion and helpers accepting an optional ReducedOption read
// matchMedia when reduced is omitted: enter, exit, staggerDelay, press, expand, collapse,
// arc, pulse, pulseRing, countUpDuration, crossfade and cardTurn. Frame helpers are pure.
//
// Reduced motion: animation builders default to the device (see reducedMotion). Frame
// helpers require an explicit reduced flag where applicable. True returns the end state
// with zero duration and zero delay, so the state change is kept and the movement is dropped.
//
// No helper bounces or overshoots: every curve stays inside 0 to 1 (see `bezier`).

import {
  derivedDuration,
  duration,
  easeOutCubic,
  easing,
  ENTER_DISTANCE,
  exitDuration,
  KNOB_STRETCH,
  POPOVER_START_SCALE,
  PRESS_SCALE,
  PULSE_SCALE,
  STAGGER_MS,
  motionGeometry,
} from './motion-tokens';
import type { Tempo } from './motion-tokens';
import { PHI, radius } from './scale';
import type { Rect } from './scale';

/** One keyframe: CSS properties in camelCase, plus the optional `offset` and `easing`. */
export type MotionKeyframe = Record<string, string | number>;

/** Timing for `element.animate`. `fill` is always `both`: the end state stays. */
export interface MotionTiming {
  duration: number;
  delay: number;
  easing: string;
  fill: 'both';
}

export interface Motion {
  keyframes: MotionKeyframe[];
  options: MotionTiming;
  /** Styles to set on the element before animating, for example `transformOrigin`. */
  style: Record<string, string>;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface ReducedOption {
  /** Defaults to the device setting. Pass it explicitly in tests and on the host. */
  readonly reduced?: boolean;
}

interface MediaQueryHost {
  matchMedia?: (query: string) => { readonly matches: boolean };
}

/** True when the device asks for reduced motion. False where there is no `matchMedia`. */
export function reducedMotion(): boolean {
  const host = globalThis as MediaQueryHost;
  if (typeof host.matchMedia !== 'function') return false;
  return host.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isReduced(option: ReducedOption | undefined): boolean {
  return option?.reduced ?? reducedMotion();
}

function endState(keyframes: readonly MotionKeyframe[]): MotionKeyframe {
  const last = keyframes.at(-1) ?? {};
  const state: MotionKeyframe = {};
  for (const [key, value] of Object.entries(last)) {
    if (key !== 'offset' && key !== 'easing') state[key] = value;
  }
  return state;
}

/** The same change with the movement dropped: the end state, at once. */
export function still(motion: Motion): Motion {
  return {
    keyframes: [endState(motion.keyframes)],
    options: { duration: 0, delay: 0, easing: easing.linear, fill: 'both' },
    style: motion.style,
  };
}

function build(
  keyframes: MotionKeyframe[],
  timing: { duration: number; delay?: number; easing: string },
  option: ReducedOption | undefined,
  style: Record<string, string> = {},
): Motion {
  const motion: Motion = {
    keyframes,
    options: { duration: timing.duration, delay: timing.delay ?? 0, easing: timing.easing, fill: 'both' },
    style,
  };
  return isReduced(option) ? still(motion) : motion;
}

function num(value: number): string {
  // Whole numbers stay whole; anything else keeps three decimals at most.
  return String(Math.round(value * 1000) / 1000);
}

/** Delay for the i-th row of a list, in ms: rows follow 30 ms apart. */
export function staggerDelay(index: number, option?: ReducedOption): number {
  if (isReduced(option)) return 0;
  return Math.max(0, Math.floor(index)) * STAGGER_MS;
}

export interface EnterOptions extends ReducedOption {
  /**
   * `popover` grows from 0.95 out of its trigger (menus, panels, order cards).
   * `row` rises 13 px into place (list rows, details settling).
   * `fade` only fades.
   */
  readonly kind?: 'popover' | 'row' | 'fade';
  /** Where the trigger is, in px from the element's top left. The element grows from here. */
  readonly origin?: Point;
  readonly tempo?: Tempo;
  /** Position in a list: adds the stagger delay. */
  readonly index?: number;
}

function originStyle(origin: Point | undefined): Record<string, string> {
  return origin === undefined ? {} : { transformOrigin: `${num(origin.x)}px ${num(origin.y)}px` };
}

function enterKeyframes(kind: 'popover' | 'row' | 'fade'): [MotionKeyframe, MotionKeyframe] {
  switch (kind) {
    case 'popover':
      return [
        { opacity: 0, transform: `scale(${num(POPOVER_START_SCALE)})` },
        { opacity: 1, transform: 'scale(1)' },
      ];
    case 'row':
      return [
        { opacity: 0, transform: `translateY(${num(ENTER_DISTANCE)}px)` },
        { opacity: 1, transform: 'translateY(0px)' },
      ];
    case 'fade':
      return [{ opacity: 0 }, { opacity: 1 }];
  }
}

/** An entrance: eases out, from the trigger. */
export function enter(options: EnterOptions = {}): Motion {
  const kind = options.kind ?? 'popover';
  const [from, to] = enterKeyframes(kind);
  return build(
    [from, to],
    {
      duration: duration[options.tempo ?? 'base'],
      delay: staggerDelay(options.index ?? 0, { reduced: false }),
      easing: easing.out,
    },
    options,
    originStyle(options.origin),
  );
}

export type ExitOptions = Omit<EnterOptions, 'index'>;

/**
 * The exit that undoes `enter` with the same options: back to the trigger, in 0.8 of the
 * entrance's time. Hide or remove the element when it finishes.
 */
export function exit(options: ExitOptions = {}): Motion {
  const kind = options.kind ?? 'popover';
  const [from, to] = enterKeyframes(kind);
  return build(
    [to, from],
    { duration: exitDuration(options.tempo ?? 'base'), easing: easing.inOut },
    options,
    originStyle(options.origin),
  );
}

/** The scale of a control: 0.97 while pressed, 1 otherwise. A state, kept under reduced motion. */
export function pressScale(pressed: boolean): number {
  return pressed ? PRESS_SCALE : 1;
}

/** Going into or out of the pressed state. Press-down is instant; release eases out at the fast duration. */
export function press(pressed: boolean, option?: ReducedOption): Motion {
  const down = `scale(${num(PRESS_SCALE)})`;
  const up = 'scale(1)';
  return build(
    pressed ? [{ transform: up }, { transform: down }] : [{ transform: down }, { transform: up }],
    { duration: pressed ? 0 : duration.fast, easing: easing.out },
    option,
  );
}

/**
 * How far a moving knob or thumb stretches along its direction of travel: 1 at rest, 1.12 at
 * full travel. `travel` is 0 to 1. Apply it directly while the control is held; never tween it.
 */
export function knobStretch(travel: number): number {
  return 1 + KNOB_STRETCH * Math.min(1, Math.max(0, travel));
}

export interface ExpandOptions extends ReducedOption {
  /**
   * `clip`: the element is laid out at `to` and a clip opens from `from`. Its content does
   * not scale, so text stays sharp; repaints the whole element each frame: measure on the TV before using at full screen.
   * `transform`: the element is laid out at `to` and is moved and scaled from `from`. Only
   * the compositor works. Content scales unevenly while it opens.
   */
  readonly mode?: 'clip' | 'transform';
  /** Corner radius of the small rectangle, in px. `clip` mode only. */
  readonly fromRadius?: number;
  /** Corner radius of the large rectangle, in px. `clip` mode only. */
  readonly toRadius?: number;
}

function clipInset(from: Rect, to: Rect, round: number): string {
  const top = from.top - to.top;
  const left = from.left - to.left;
  const right = to.left + to.width - (from.left + from.width);
  const bottom = to.top + to.height - (from.top + from.height);
  return `inset(${num(top)}px ${num(right)}px ${num(bottom)}px ${num(left)}px round ${num(round)}px)`;
}

function expandKeyframes(from: Rect, to: Rect, options: ExpandOptions): [MotionKeyframe, MotionKeyframe] {
  if ((options.mode ?? 'transform') === 'clip') {
    return [
      { clipPath: clipInset(from, to, options.fromRadius ?? radius.corner) },
      { clipPath: clipInset(to, to, options.toRadius ?? 0) },
    ];
  }
  const scaleX = to.width === 0 ? 1 : from.width / to.width;
  const scaleY = to.height === 0 ? 1 : from.height / to.height;
  return [
    {
      transform: `translate(${num(from.left - to.left)}px, ${num(from.top - to.top)}px) scale(${num(scaleX)}, ${num(scaleY)})`,
    },
    { transform: 'translate(0px, 0px) scale(1, 1)' },
  ];
}

/**
 * The same object opening into its detail view: a game tile into its start screen. Both
 * rectangles are in the same coordinates (for example `getBoundingClientRect()` of the tile
 * and of the screen). Nothing is swapped in: animate the element that was the tile.
 */
export function expand(from: Rect, to: Rect, options: ExpandOptions = {}): Motion {
  const style: Record<string, string> = (options.mode ?? 'transform') === 'transform' ? { transformOrigin: '0 0' } : {};
  return build(expandKeyframes(from, to, options), { duration: duration.slow, easing: easing.inOut }, options, style);
}

/** `expand` undone: the detail view closing back into the tile, in 0.8 of the time. */
export function collapse(from: Rect, to: Rect, options: ExpandOptions = {}): Motion {
  const [small, large] = expandKeyframes(from, to, options);
  const style: Record<string, string> = (options.mode ?? 'transform') === 'transform' ? { transformOrigin: '0 0' } : {};
  return build([large, small], { duration: exitDuration('slow'), easing: easing.inOut }, options, style);
}

/** Default height of an arc for a throw of the given length: 1 : 1.618², so long throws fly higher. */
export function arcHeight(from: Point, to: Point): number {
  return Math.round(Math.hypot(to.x - from.x, to.y - from.y) / (PHI * PHI));
}

/**
 * Where a thrown or dealt object is at `progress` (0 to 1): it crosses at a steady speed and
 * rises and falls as a thrown thing does, slowing to the top and gathering speed on the way
 * down. Pass a reusable `out` to avoid allocation in render. It lands exactly on `to` and never passes it. Screen coordinates: y grows downwards.
 */
export function arcPoint(from: Point, to: Point, progress: number, height: number = arcHeight(from, to), out: { x: number; y: number } = { x: 0, y: 0 }): Point {
  const t = Math.min(1, Math.max(0, progress));
  out.x = from.x + (to.x - from.x) * t;
  out.y = from.y + (to.y - from.y) * t - 4 * height * t * (1 - t);
  return out;
}

export interface ArcOptions extends ReducedOption {
  /** How high above the straight line the path peaks, in px. */
  readonly height?: number;
  /** Duration in ms. Defaults to one golden step above `slow` (610 ms), as on board 5. */
  readonly duration?: number;
  /** How many straight pieces the curve is drawn with. */
  readonly segments?: number;
}

/**
 * Keyframes for an object thrown or dealt from `from` to `to`, for an element positioned at
 * `from`. The keyframes sample `arcPoint`, so one element and one animation are enough.
 */
export function arc(from: Point, to: Point, options: ArcOptions = {}): Motion {
  const segments = Math.max(2, Math.floor(options.segments ?? motionGeometry.arcSegments));
  const height = options.height ?? arcHeight(from, to);
  const keyframes: MotionKeyframe[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const point = arcPoint(from, to, i / segments, height);
    keyframes.push({
      offset: i / segments,
      transform: `translate(${num(point.x - from.x)}px, ${num(point.y - from.y)}px)`,
    });
  }
  return build(keyframes, { duration: options.duration ?? derivedDuration.arc, easing: easing.linear }, options);
}

/** One pulse to confirm success: up to 1.05 and back to exactly 1. Nothing follows it. */
export function pulse(option?: ReducedOption): Motion {
  return build(
    [
      { transform: 'scale(1)' },
      { transform: `scale(${num(PULSE_SCALE)})`, offset: motionGeometry.pulsePeak },
      { transform: 'scale(1)' },
    ],
    { duration: duration.slow, easing: easing.inOut },
    option,
  );
}

/** The ring that spreads from a success and fades out. It ends invisible. */
export function pulseRing(option?: ReducedOption): Motion {
  return build(
    [
      { opacity: motionGeometry.ringOpacity, transform: `scale(${num(motionGeometry.ringStart)})` },
      { opacity: 0, transform: `scale(${num(motionGeometry.ringEnd)})` },
    ],
    { duration: derivedDuration.pulseRing, easing: easing.out },
    option,
  );
}

export interface CountUpOptions extends ReducedOption {
  /** Duration in ms. Defaults to two golden steps above `slow` (987 ms), as on board 5. */
  readonly duration?: number;
}

/**
 * The number to show `elapsed` ms after a score started counting from `from` to `to`: fast at
 * first, slowing, and exactly `to` from the end onwards. It never passes `to`. Whole numbers.
 * Pass reduced explicitly; this per-frame helper never reads the environment.
 */
export function countUpAt(from: number, to: number, elapsed: number, options: CountUpOptions & { readonly reduced: boolean }): number {
  const total = options.duration ?? derivedDuration.countUp;
  if (options.reduced || total <= 0 || elapsed >= total) return to;
  if (elapsed <= 0) return from;
  const value = Math.round(from + (to - from) * easeOutCubic(elapsed / total));
  return to >= from ? Math.min(to, Math.max(from, value)) : Math.max(to, Math.min(from, value));
}

/** How long a count-up runs, in ms: 0 under reduced motion. */
export function countUpDuration(options: CountUpOptions = {}): number {
  return isReduced(options) ? 0 : (options.duration ?? derivedDuration.countUp);
}

export interface Crossfade {
  /**
   * The new screen, placed on top of the old one, fading in.
   */
  incoming: Motion;
  /**
   * The old screen. It stays fully drawn underneath for the whole change, so the two overlap
   * and there is never a blank or see-through frame. Remove it when this finishes.
   */
  outgoing: Motion;
}

/** The screen change (4A): a crossfade at `slow` with old and new overlapping. */
// Icon swaps use this opacity-only crossfade too (D-056).
export function crossfade(option?: ReducedOption): Crossfade {
  const timing = { duration: duration.slow, easing: easing.inOut };
  return {
    incoming: build([{ opacity: 0 }, { opacity: 1 }], timing, option),
    outgoing: build([{ opacity: 1 }, { opacity: 1 }], timing, option),
  };
}

export interface CardTurn {
  /** For the card: turns to edge-on, then on from edge-on to flat. */
  card: Motion;
  /** For the back: drawn until the card is edge-on, then gone. */
  back: Motion;
  /** For the face: hidden until the card is edge-on, then drawn. */
  face: Motion;
  /** When the card is edge-on and the face takes over, in ms from the start. */
  swapAt: number;
}

/**
 * The card reveal (3A): the card turns over and the face changes while the card is edge-on,
 * so there is no cut. Give the card's parent a `perspective`.
 */
export function cardTurn(option?: ReducedOption): CardTurn {
  const total = duration.slow;
  const timing = { duration: total, easing: easing.linear };
  const reduced = isReduced(option);
  return {
    card: build(
      [
        { transform: 'rotateY(0deg)', offset: 0, easing: easing.in },
        { transform: `rotateY(${num(motionGeometry.cardEdgeDegrees)}deg)`, offset: motionGeometry.cardHalf },
        { transform: `rotateY(${num(-motionGeometry.cardEdgeDegrees)}deg)`, offset: motionGeometry.cardHalf, easing: easing.out },
        { transform: 'rotateY(0deg)', offset: 1 },
      ],
      timing,
      option,
    ),
    back: build(
      [
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: motionGeometry.cardHalf },
        { opacity: 0, offset: motionGeometry.cardHalf },
        { opacity: 0, offset: 1 },
      ],
      timing,
      option,
    ),
    face: build(
      [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: motionGeometry.cardHalf },
        { opacity: 1, offset: motionGeometry.cardHalf },
        { opacity: 1, offset: 1 },
      ],
      timing,
      option,
    ),
    swapAt: reduced ? 0 : total * motionGeometry.cardHalf,
  };
}

export interface CardTurnFrame {
  /** Which side to draw. It changes exactly when `width` is 0. */
  side: 'back' | 'face';
  /** The card's drawn width as a fraction of its full width: 1 flat, 0 edge-on. */
  width: number;
}

/** The card turn for a renderer: progress is 0..1, eased by the caller if wanted.
 * Pass reduced explicitly and reuse out to avoid allocations; never reads the environment. */
export function cardTurnAt(progress: number, option: { readonly reduced: boolean }, out: CardTurnFrame = { side: 'back', width: 1 }): CardTurnFrame {
  const t = option.reduced ? 1 : Math.min(1, Math.max(0, progress));
  const angle = t < motionGeometry.cardHalf ? t * Math.PI : (1 - t) * Math.PI;
  const width = Math.abs(Math.cos(angle));
  out.side = t < motionGeometry.cardHalf ? 'back' : 'face';
  out.width = width < motionGeometry.edgeEpsilon ? 0 : width;
  return out;
}
