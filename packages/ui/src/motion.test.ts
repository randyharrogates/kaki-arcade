import { afterEach, describe, expect, it } from 'vitest';
import {
  arc,
  arcHeight,
  arcPoint,
  bezier,
  bezierAt,
  bezierCss,
  cardTurn,
  cardTurnAt,
  collapse,
  countUpAt,
  countUpDuration,
  crossfade,
  derivedDuration,
  duration,
  easeOutCubic,
  EASING_NAMES,
  easing,
  enter,
  exit,
  EXIT_FACTOR,
  exitDuration,
  expand,
  KNOB_STRETCH,
  knobStretch,
  POPOVER_START_SCALE,
  press,
  PRESS_SCALE,
  pressScale,
  pulse,
  PULSE_SCALE,
  pulseRing,
  reducedMotion,
  STAGGER_MS,
  staggerDelay,
  still,
} from './index';
import type { CardTurnFrame, Motion } from './index';

const ON = { reduced: false } as const;
const OFF = { reduced: true } as const;
const TILE = { left: 600, top: 300, width: 300, height: 400 };
const SCREEN = { left: 0, top: 0, width: 1920, height: 1080 };

/** Every motion each helper returns, moving and reduced. */
function everyMotion(reduced: boolean): Record<string, Motion> {
  const r = { reduced };
  const turn = cardTurn(r);
  const fade = crossfade(r);
  return {
    'enter popover': enter({ kind: 'popover', origin: { x: 21, y: 0 }, index: 2, ...r }),
    'enter row': enter({ kind: 'row', index: 3, ...r }),
    'enter fade': enter({ kind: 'fade', ...r }),
    'exit popover': exit({ kind: 'popover', origin: { x: 21, y: 0 }, ...r }),
    'exit row': exit({ kind: 'row', ...r }),
    'press down': press(true, r),
    'press up': press(false, r),
    'expand clip': expand(TILE, SCREEN, r),
    'expand transform': expand(TILE, SCREEN, { mode: 'transform', ...r }),
    'collapse clip': collapse(TILE, SCREEN, r),
    'collapse transform': collapse(TILE, SCREEN, { mode: 'transform', ...r }),
    arc: arc({ x: 0, y: 0 }, { x: 400, y: 50 }, r),
    pulse: pulse(r),
    'pulse ring': pulseRing(r),
    'crossfade in': fade.incoming,
    'crossfade out': fade.outgoing,
    'card turn': turn.card,
    'card back': turn.back,
    'card face': turn.face,
  };
}

function scales(motion: Motion): number[] {
  return motion.keyframes.flatMap((keyframe) =>
    [...String(keyframe.transform ?? '').matchAll(/scale\(([^)]+)\)/g)].flatMap((match) =>
      (match[1] ?? '').split(',').map(Number),
    ),
  );
}

describe('motion tokens (DESIGN §4.5, D-051)', () => {
  it('holds the decided tempo, easing and constants', () => {
    expect(duration).toEqual({ fast: 144, base: 233, slow: 377 });
    expect(duration.base / duration.fast).toBeCloseTo(1.618, 2);
    expect(duration.slow / duration.base).toBeCloseTo(1.618, 2);
    expect(EXIT_FACTOR).toBe(0.8);
    expect(exitDuration('base')).toBe(186);
    expect(easing.out).toBe('cubic-bezier(.16,1,.3,1)');
    expect(easing.inOut).toBe('cubic-bezier(.65,0,.35,1)');
    expect(STAGGER_MS).toBe(30);
    expect(PRESS_SCALE).toBe(0.97);
    expect(POPOVER_START_SCALE).toBe(0.95);
    expect(KNOB_STRETCH).toBe(0.12);
    expect(derivedDuration).toEqual({ arc: 610, countUp: 987, pulseRing: 452 });
  });

  it('opens menus inside 150 to 250 ms', () => {
    expect(duration.base).toBeGreaterThanOrEqual(150);
    expect(duration.base).toBeLessThanOrEqual(250);
  });
});

describe('no bounce, no overshoot', () => {
  it('keeps every easing curve inside 0 to 1: control points and sampled output', () => {
    expect(Object.keys(bezier).sort()).toEqual([...EASING_NAMES].sort());
    for (const name of EASING_NAMES) {
      const curve = bezier[name];
      for (const point of curve) {
        expect(point, `${name} control point`).toBeGreaterThanOrEqual(0);
        expect(point, `${name} control point`).toBeLessThanOrEqual(1);
      }
      let previous = 0;
      for (let i = 0; i <= 1000; i += 1) {
        const value = bezierAt(curve, i / 1000);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
        // Never goes backwards either: no wobble.
        expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = value;
      }
      expect(bezierAt(curve, 0)).toBe(0);
      expect(bezierAt(curve, 1)).toBe(1);
      expect(bezierCss(curve)).toBe(easing[name]);
    }
  });

  it('uses only token easings in every helper, on the motion and on each keyframe', () => {
    const allowed = new Set<string>(Object.values(easing));
    for (const [name, motion] of Object.entries(everyMotion(false))) {
      expect(allowed.has(motion.options.easing), name).toBe(true);
      for (const keyframe of motion.keyframes) {
        if ('easing' in keyframe) expect(allowed.has(String(keyframe.easing)), name).toBe(true);
      }
    }
  });

  it('never scales past the end value, apart from the one pulse', () => {
    for (const [name, motion] of Object.entries(everyMotion(false))) {
      if (name === 'pulse' || name === 'pulse ring') continue;
      for (const scale of scales(motion)) expect(scale, name).toBeLessThanOrEqual(1);
    }
    expect(Math.max(...scales(pulse(ON)))).toBe(PULSE_SCALE);
    expect(scales(pulse(ON)).at(-1)).toBe(1);
    expect(Math.min(...scales(pulse(ON)))).toBe(1);
  });

  it('uses only token durations', () => {
    const allowed = new Set<number>([
      0, // Instant press-down.
      ...Object.values(duration),
      exitDuration('fast'),
      exitDuration('base'),
      exitDuration('slow'),
      derivedDuration.arc,
      derivedDuration.pulseRing,
    ]);
    for (const [name, motion] of Object.entries(everyMotion(false))) {
      expect(allowed.has(motion.options.duration), `${name}: ${String(motion.options.duration)}`).toBe(true);
    }
  });
});

describe('reduced motion', () => {
  const host = globalThis as { matchMedia?: unknown };
  afterEach(() => {
    delete host.matchMedia;
  });

  it('follows the device and is false where there is no matchMedia', () => {
    expect(reducedMotion()).toBe(false);
    host.matchMedia = (query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' });
    expect(reducedMotion()).toBe(true);
    expect(enter().options.duration).toBe(0);
    expect(staggerDelay(4)).toBe(0);
    host.matchMedia = () => ({ matches: false });
    expect(reducedMotion()).toBe(false);
    expect(enter().options.duration).toBe(duration.base);
  });

  it('returns a zero-duration state change from every helper: the same end state, no movement', () => {
    const moving = everyMotion(false);
    const reduced = everyMotion(true);
    for (const name of Object.keys(moving)) {
      const a = moving[name];
      const b = reduced[name];
      if (a === undefined || b === undefined) throw new Error(name);
      expect(b.options, name).toEqual({ duration: 0, delay: 0, easing: 'linear', fill: 'both' });
      expect(b.keyframes.length, name).toBe(1);
      const end = { ...a.keyframes.at(-1) };
      delete end.offset;
      delete end.easing;
      expect(b.keyframes[0], name).toEqual(end);
      expect(b.style, name).toEqual(a.style);
      expect(a.options.fill).toBe('both');
    }
    expect(still(pulse(ON))).toEqual(pulse(OFF));
  });

  it('drops stagger, card swap delay and count-up time', () => {
    expect(staggerDelay(5, OFF)).toBe(0);
    expect(cardTurn(OFF).swapAt).toBe(0);
    expect(countUpDuration(OFF)).toBe(0);
    expect(countUpAt(0, 500, 0, OFF)).toBe(500);
    expect(cardTurnAt(0, OFF)).toEqual({ side: 'face', width: 1 });
  });

  it('keeps the pressed state', () => {
    expect(pressScale(true)).toBe(0.97);
    expect(press(true, OFF).keyframes).toEqual([{ transform: 'scale(0.97)' }]);
  });
});

describe('enter, exit and stagger', () => {
  it('enters with ease-out from 0.95 at the trigger', () => {
    const motion = enter({ kind: 'popover', origin: { x: 21, y: 0 }, ...ON });
    expect(motion.keyframes).toEqual([
      { opacity: 0, transform: 'scale(0.95)' },
      { opacity: 1, transform: 'scale(1)' },
    ]);
    expect(motion.options).toEqual({ duration: 233, delay: 0, easing: easing.out, fill: 'both' });
    expect(motion.style).toEqual({ transformOrigin: '21px 0px' });
  });

  it('exits back to the trigger in 0.8 of the entrance', () => {
    const options = { kind: 'popover', origin: { x: 21, y: 0 }, ...ON } as const;
    const inwards = enter(options);
    const outwards = exit(options);
    expect(outwards.keyframes).toEqual([...inwards.keyframes].reverse());
    expect(outwards.style).toEqual(inwards.style);
    expect(outwards.options.duration).toBe(Math.round(inwards.options.duration * 0.8));
    for (const tempo of ['fast', 'base', 'slow'] as const) {
      expect(exit({ tempo, ...ON }).options.duration / enter({ tempo, ...ON }).options.duration).toBeCloseTo(0.8, 2);
    }
  });

  it('staggers rows 30 ms apart', () => {
    expect([0, 1, 2, 7].map((index) => staggerDelay(index, ON))).toEqual([0, 30, 60, 210]);
    expect(staggerDelay(-3, ON)).toBe(0);
    expect(enter({ kind: 'row', index: 3, ...ON }).options.delay).toBe(90);
    expect(enter({ kind: 'row', ...ON }).keyframes[0]).toEqual({ opacity: 0, transform: 'translateY(13px)' });
  });
});

describe('press and knob', () => {
  it('scales to 0.97 while pressed', () => {
    expect(pressScale(true)).toBe(0.97);
    expect(pressScale(false)).toBe(1);
    expect(press(true, ON).keyframes.at(-1)).toEqual({ transform: 'scale(0.97)' });
    expect(press(false, ON).keyframes.at(-1)).toEqual({ transform: 'scale(1)' });
    expect(press(true, ON).options.duration).toBe(0);
  });

  it('stretches a knob up to 12% and no further', () => {
    expect(knobStretch(0)).toBe(1);
    expect(knobStretch(0.5)).toBeCloseTo(1.06, 10);
    expect(knobStretch(1)).toBeCloseTo(1.12, 10);
    expect(knobStretch(5)).toBeCloseTo(1.12, 10);
    expect(knobStretch(-1)).toBe(1);
  });
});

describe('expand: the same object opens', () => {
  it('opens a clip from the tile to the whole screen', () => {
    const motion = expand(TILE, SCREEN, { mode: 'clip', ...ON });
    expect(motion.keyframes).toEqual([
      { clipPath: 'inset(300px 1020px 380px 600px round 13px)' },
      { clipPath: 'inset(0px 0px 0px 0px round 0px)' },
    ]);
    expect(motion.options).toEqual({ duration: 377, delay: 0, easing: easing.inOut, fill: 'both' });
  });

  it('or moves and scales the element from the tile', () => {
    const motion = expand(TILE, SCREEN, { mode: 'transform', ...ON });
    expect(motion.keyframes).toEqual([
      { transform: 'translate(600px, 300px) scale(0.156, 0.37)' },
      { transform: 'translate(0px, 0px) scale(1, 1)' },
    ]);
    expect(motion.style).toEqual({ transformOrigin: '0 0' });
  });

  it('works when the target is not at the origin', () => {
    const to = { left: 100, top: 50, width: 800, height: 600 };
    const from = { left: 300, top: 250, width: 200, height: 150 };
    expect(expand(from, to, { mode: 'clip', ...ON }).keyframes[0]).toEqual({ clipPath: 'inset(200px 400px 250px 200px round 13px)' });
    expect(expand(from, to, { mode: 'transform', ...ON }).keyframes[0]).toEqual({
      transform: 'translate(200px, 200px) scale(0.25, 0.25)',
    });
  });

  it('closes back into the tile in 0.8 of the time', () => {
    const open = expand(TILE, SCREEN, ON);
    const close = collapse(TILE, SCREEN, ON);
    expect(close.keyframes).toEqual([...open.keyframes].reverse());
    expect(close.options.duration).toBe(302);
  });
});

describe('arc: thrown and dealt objects', () => {
  const from = { x: 100, y: 500 };
  const to = { x: 500, y: 400 };

  it('starts on the start, lands exactly on the target, and crosses at a steady speed', () => {
    expect(arcPoint(from, to, 0)).toEqual(from);
    expect(arcPoint(from, to, 1)).toEqual(to);
    expect(arcPoint(from, to, 7)).toEqual(to);
    expect(arcPoint(from, to, -1)).toEqual(from);
    for (let i = 0; i <= 10; i += 1) expect(arcPoint(from, to, i / 10).x).toBeCloseTo(100 + 40 * i, 9);
  });

  it('rises above the straight line, peaks once, and slows towards the top', () => {
    const height = 120;
    const lift = (t: number): number => from.y + (to.y - from.y) * t - arcPoint(from, to, t, height).y;
    expect(lift(0.5)).toBeCloseTo(height, 9);
    for (let i = 1; i < 100; i += 1) expect(lift(i / 100)).toBeGreaterThan(0);
    for (let i = 1; i <= 50; i += 1) expect(lift(i / 100)).toBeGreaterThan(lift((i - 1) / 100));
    for (let i = 51; i <= 100; i += 1) expect(lift(i / 100)).toBeLessThan(lift((i - 1) / 100));
    // Eased rise: each tenth of the way up gains less than the one before.
    expect(lift(0.1) - lift(0)).toBeGreaterThan(lift(0.5) - lift(0.4));
    // Symmetric fall: it gathers speed on the way down.
    expect(lift(0.9) - lift(1)).toBeCloseTo(lift(0.1) - lift(0), 9);
  });

  it('returns keyframes relative to the start, evenly spaced, for one linear animation', () => {
    const motion = arc(from, to, { height: 120, segments: 4, ...ON });
    expect(motion.keyframes).toEqual([
      { offset: 0, transform: 'translate(0px, 0px)' },
      { offset: 0.25, transform: 'translate(100px, -115px)' },
      { offset: 0.5, transform: 'translate(200px, -170px)' },
      { offset: 0.75, transform: 'translate(300px, -165px)' },
      { offset: 1, transform: 'translate(400px, -100px)' },
    ]);
    expect(motion.options).toEqual({ duration: 610, delay: 0, easing: 'linear', fill: 'both' });
    expect(arc(from, to, ON).keyframes.length).toBe(13);
    expect(arcHeight({ x: 0, y: 0 }, { x: 262, y: 0 })).toBe(100);
  });
});

describe('pulse', () => {
  it('pulses once and ends where it began', () => {
    const motion = pulse(ON);
    expect(motion.keyframes.length).toBe(3);
    expect(motion.keyframes[0]).toEqual(motion.keyframes.at(-1));
    expect(pulseRing(ON).keyframes.at(-1)?.opacity).toBe(0);
  });
});

describe('count-up', () => {
  it('eases out: fast at first, slowing', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBe(0.875);
    expect(countUpAt(0, 1000, 987 / 2, ON)).toBe(875);
  });

  it('stops exactly on the number and never passes it', () => {
    for (const [from, to] of [
      [0, 100],
      [300, 1250],
      [0, 7],
      [50, 50],
      [900, 200],
    ] as const) {
      let previous: number = from;
      for (let elapsed = -50; elapsed <= 1200; elapsed += 1) {
        const value = countUpAt(from, to, elapsed, ON);
        expect(Number.isInteger(value)).toBe(true);
        if (to >= from) {
          expect(value).toBeGreaterThanOrEqual(previous);
          expect(value).toBeLessThanOrEqual(to);
        } else {
          expect(value).toBeLessThanOrEqual(previous);
          expect(value).toBeGreaterThanOrEqual(to);
        }
        previous = value;
      }
      expect(countUpAt(from, to, 0, ON)).toBe(from);
      expect(countUpAt(from, to, 987, ON)).toBe(to);
      expect(countUpAt(from, to, 100000, ON)).toBe(to);
    }
    expect(countUpAt(0, 10, 50, { duration: 100, ...ON })).toBe(9);
    expect(countUpAt(0, 10, 5, { duration: 0, ...ON })).toBe(10);
    expect(countUpDuration(ON)).toBe(987);
  });
});

describe('crossfade: the screen change', () => {
  it('fades the new screen in over the old one, which stays fully drawn, so nothing is blank', () => {
    const { incoming, outgoing } = crossfade(ON);
    expect(incoming.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(outgoing.keyframes).toEqual([{ opacity: 1 }, { opacity: 1 }]);
    expect(incoming.options).toEqual({ duration: 377, delay: 0, easing: easing.inOut, fill: 'both' });
    expect(outgoing.options).toEqual(incoming.options);
  });
});

describe('card turn', () => {
  it('swaps the face exactly while the card is edge-on', () => {
    const turn = cardTurn(ON);
    expect(turn.swapAt).toBe(377 / 2);
    expect(turn.card.keyframes.map((k) => [k.offset, k.transform])).toEqual([
      [0, 'rotateY(0deg)'],
      [0.5, 'rotateY(90deg)'],
      [0.5, 'rotateY(-90deg)'],
      [1, 'rotateY(0deg)'],
    ]);
    expect(turn.back.keyframes.map((k) => [k.offset, k.opacity])).toEqual([
      [0, 1],
      [0.5, 1],
      [0.5, 0],
      [1, 0],
    ]);
    expect(turn.face.keyframes.map((k) => [k.offset, k.opacity])).toEqual([
      [0, 0],
      [0.5, 0],
      [0.5, 1],
      [1, 1],
    ]);
    for (const part of [turn.card, turn.back, turn.face]) expect(part.options.duration).toBe(377);
  });

  it('gives a frame renderer the same turn', () => {
    expect(cardTurnAt(0, ON)).toEqual({ side: 'back', width: 1 });
    expect(cardTurnAt(0.5, ON)).toEqual({ side: 'face', width: 0 });
    expect(cardTurnAt(1, ON)).toEqual({ side: 'face', width: 1 });
    expect(cardTurnAt(0.25, ON).side).toBe('back');
    expect(cardTurnAt(0.25, ON).width).toBeCloseTo(Math.SQRT1_2, 9);
    expect(cardTurnAt(0.75, ON).width).toBeCloseTo(Math.SQRT1_2, 9);
    for (let i = 0; i <= 100; i += 1) {
      const frame = cardTurnAt(i / 100, ON);
      expect(frame.width).toBeGreaterThanOrEqual(0);
      expect(frame.width).toBeLessThanOrEqual(1);
    }
  });
});


describe('frame renderer allocation and environment contract', () => {
  it('reuses outputs for 10,000 frames without reading matchMedia', () => {
    const host = globalThis as { matchMedia?: unknown };
    const previous = host.matchMedia;
    let calls = 0;
    host.matchMedia = () => { calls += 1; return { matches: false }; };
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 100 };
    const point = { x: 0, y: 0 };
    const card: CardTurnFrame = { side: 'back', width: 1 };
    try {
      for (let i = 0; i < 10000; i += 1) {
        expect(arcPoint(from, to, i / 10000, 100, point)).toBe(point);
        expect(cardTurnAt(i / 10000, ON, card)).toBe(card);
        expect(typeof countUpAt(0, 100, i, ON)).toBe('number');
      }
      expect(calls).toBe(0);
    } finally {
      if (previous === undefined) delete host.matchMedia;
      else host.matchMedia = previous;
    }
  });
  it('defaults to compositor transforms and releases at fast tempo', () => {
    expect(expand(TILE, SCREEN, ON).keyframes[0]).toHaveProperty('transform');
    expect(press(false, ON).options.duration).toBe(duration.fast);
  });
});
