// FIXTURE GAME 1: "Dots". Real time, shared space, optional teams. Written only to prove the
// game interface and the conformance kit; it is not a product game and lives in no build.
//
// Each player steers a dot round a 16 by 9 field with the stick and collects the gem, which
// then reappears somewhere drawn from the seed. Holding the bottom face button halves the
// speed; tapping "Boost" doubles it for a second. The match lasts a set time.
//
// `returns-new`: a step never changes the state it was given and shares every dot that did
// not move with the previous state.
import { describe, expect, it } from 'vitest';
import { cloneRng, cloneState, createRng, isHeld, nextFloatBetween, normaliseAxes } from '@kaki/sim-core';
import type { RngState } from '@kaki/sim-core';
import {
  AXIS,
  BUTTON,
  createTick,
  defaultSettings,
  settingsSchema,
  secondsToSteps,
  stepsToSeconds,
  teamsInUse,
} from '../kit';
import type {
  ControllerLayout,
  GameModule,
  PlayerInfo,
  PrivateView,
  Results,
  StepInputs,
  TeamId,
} from '../kit';
export interface DotsSettings {
  seconds: number;
  gemPoints: 1 | 2 | 3;
  wrap: boolean;
}
export interface Dot {
  readonly id: string;
  readonly seat: number;
  readonly colour: string;
  readonly team: TeamId | null;
  readonly x: number;
  readonly y: number;
  readonly score: number;
  /** Steps of boost left. */
  readonly boost: number;
  readonly joinedMidGame: boolean;
}
export interface DotsState {
  readonly rng: RngState;
  readonly settings: DotsSettings;
  readonly teams: boolean;
  readonly dots: readonly Dot[];
  readonly gem: {
    readonly x: number;
    readonly y: number;
  };
  readonly leftSteps: number;
}
export interface DotsView {
  dots: {
    id: string;
    seat: number;
    colour: string;
    team: TeamId | null;
    x: number;
    y: number;
    boosted: boolean;
  }[];
  gem: {
    x: number;
    y: number;
  };
  secondsLeft: number;
  over: boolean;
}
export const FIELD = { w: 16, h: 9 } as const;
const SPEED_PER_MS = 0.006;
const BOOST_STEPS = 60;
const REACH = 0.6;
function place(rng: RngState): {
  x: number;
  y: number;
} {
  return { x: nextFloatBetween(rng, 1, FIELD.w - 1), y: nextFloatBetween(rng, 1, FIELD.h - 1) };
}
function newDot(
  player: PlayerInfo,
  at: {
    x: number;
    y: number;
  },
): Dot {
  return {
    id: player.id,
    seat: player.seat,
    colour: player.colour,
    team: player.team ?? null,
    x: at.x,
    y: at.y,
    score: 0,
    boost: 0,
    joinedMidGame: false,
  };
}
function fit(value: number, size: number, wrap: boolean): number {
  if (wrap) return ((value % size) + size) % size;
  return value < 0 ? 0 : value > size ? size : value;
}
/** Ranks rows by score, best first; equal scores share a place and the next place is skipped. */
export function rank<
  Row extends {
    score: number;
  },
>(
  rows: readonly Row[],
): (Row & {
  place: number;
})[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  let place = 0;
  return sorted.map((row, index) => {
    if (index === 0 || row.score !== sorted[index - 1]?.score) place = index + 1;
    return { ...row, place };
  });
}
export function dotsStep(state: DotsState, inputs: StepInputs, dtMs: number): DotsState {
  if (state.leftSteps <= 0) return state;
  const boosting = new Set<string>();
  for (const action of inputs.actions) {
    if (action.control === 'boost') boosting.add(action.player);
  }
  let rng = state.rng;
  let gem = state.gem;
  const out: [number, number] = [0, 0];
  const dots = state.dots.map((dot) => {
    const frame = inputs.frames.get(dot.id);
    let boost = boosting.has(dot.id) ? BOOST_STEPS : dot.boost > 0 ? dot.boost - 1 : 0;
    let { x, y, score } = dot;
    if (frame !== undefined) {
      normaliseAxes(frame.axes[AXIS.STICK_X] ?? 0, frame.axes[AXIS.STICK_Y] ?? 0, out);
      const pace =
        SPEED_PER_MS * dtMs * (isHeld(frame, BUTTON.FACE_BOTTOM) ? 0.5 : 1) * (boost > 0 ? 2 : 1);
      x = fit(x + out[0] * pace, FIELD.w, state.settings.wrap);
      y = fit(y + out[1] * pace, FIELD.h, state.settings.wrap);
    }
    if (Math.hypot(x - gem.x, y - gem.y) < REACH) {
      score += state.settings.gemPoints;
      // The generator draws in place, so copy it before the first draw of a step.
      if (rng === state.rng) rng = cloneRng(state.rng);
      gem = place(rng);
      boost = 0;
    }
    // Share a dot that did not change.
    return x === dot.x && y === dot.y && score === dot.score && boost === dot.boost
      ? dot
      : { ...dot, x, y, score, boost };
  });
  return { ...state, rng, gem, dots, leftSteps: Math.max(0, state.leftSteps - 1) };
}
export function dotsResults(state: DotsState): Results {
  const players = rank(
    state.dots.map((dot) => ({ id: dot.id, score: dot.score, joinedMidGame: dot.joinedMidGame })),
  );
  if (!state.teams) return { mode: 'players', players };
  const total = (team: TeamId): number =>
    state.dots.reduce((sum, dot) => (dot.team === team ? sum + dot.score : sum), 0);
  return {
    mode: 'teams',
    players,
    teams: rank([
      { team: 0, score: total(0) },
      { team: 1, score: total(1) },
    ]),
  };
}
export const dots: GameModule<DotsState, DotsSettings, DotsView> = {
  meta: {
    id: 'fixture-dots',
    name: 'Dots',
    blurb: 'Steer your dot to the gem before anyone else.',
    players: { min: 1, max: 8 },
    teams: 'optional',
    coop: false,
    solo: true,
  },
  settings: {
    fields: [
      {
        kind: 'number',
        id: 'seconds',
        label: 'Match length',
        min: 10,
        max: 60,
        step: 10,
        default: 20,
        unit: 's',
      },
      {
        kind: 'choice',
        id: 'gemPoints',
        label: 'Points for a gem',
        options: [
          { value: 1, label: '1' },
          { value: 2, label: '2' },
          { value: 3, label: '3' },
        ],
        default: 1,
      },
      { kind: 'toggle', id: 'wrap', label: 'Edges wrap round', default: false },
    ],
  },
  init(seed, players, settings) {
    const rng = createRng(seed);
    const gem = place(rng);
    return {
      rng,
      settings: { ...settings },
      teams: teamsInUse(players),
      dots: players.map((player) => newDot(player, place(rng))),
      gem,
      leftSteps: secondsToSteps(settings.seconds),
    };
  },
  step: dotsStep,
  join(state, player) {
    if (state.dots.some((dot) => dot.id === player.id)) return state;
    // Arrives where the gem is not: the opposite corner region, with no draw from the generator.
    const at = { x: FIELD.w - state.gem.x, y: FIELD.h - state.gem.y };
    return {
      ...state,
      dots: [
        ...state.dots,
        {
          ...newDot(player, at),
          joinedMidGame: state.leftSteps < secondsToSteps(state.settings.seconds),
        },
      ].sort((a, b) => a.seat - b.seat),
    };
  },
  leave(state, player) {
    if (!state.dots.some((dot) => dot.id === player)) return state;
    return { ...state, dots: state.dots.filter((dot) => dot.id !== player) };
  },
  publicView(state) {
    return {
      dots: state.dots.map((dot) => ({
        id: dot.id,
        seat: dot.seat,
        colour: dot.colour,
        team: dot.team,
        x: dot.x,
        y: dot.y,
        boosted: dot.boost > 0,
      })),
      gem: { x: state.gem.x, y: state.gem.y },
      secondsLeft: stepsToSeconds(state.leftSteps),
      over: state.leftSteps <= 0,
    };
  },
  privateView(state, player): PrivateView | null {
    const dot = state.dots.find((candidate) => candidate.id === player);
    return dot === undefined
      ? null
      : { revision: dot.score, blocks: [{ kind: 'stat', label: 'Gems', value: dot.score }] };
  },
  controllerLayout(state, player): ControllerLayout {
    if (state.leftSteps <= 0)
      return {
        revision: 2,
        controls: [{ kind: 'text', id: 'done', text: 'Look at the TV', tone: 'title' }],
      };
    if (!state.dots.some((dot) => dot.id === player))
      return {
        revision: 0,
        controls: [{ kind: 'text', id: 'wait', text: 'You are in from the next match' }],
      };
    return {
      revision: 1,
      controls: [
        { kind: 'stick', id: 'move' },
        { kind: 'button', id: 'slow', button: 'face-bottom', label: 'Slow' },
        { kind: 'options', id: 'boost', options: [{ id: 'go', label: 'Boost', colour: 'seat-1' }] },
      ],
    };
  },
  isOver: (state) => state.leftSteps <= 0,
  results: dotsResults,
  assets: () => [{ key: 'dots/atlas.json', kind: 'atlas' }],
  secrets: () => [],
};
function players(count: number, teams = false): PlayerInfo[] {
  return Array.from({ length: count }, (_, i) => {
    const base = {
      id: `p${String(i + 1)}`,
      seat: i + 1,
      name: `P${String(i + 1)}`,
      colour: `seat-${String(i + 1)}` as PlayerInfo['colour'],
    };
    return teams ? { ...base, team: (i % 2) as TeamId } : base;
  });
}
describe('fixture game: Dots', () => {
  const settings = defaultSettings(settingsSchema(dots, { data: {}, saved: null, teams: false }));
  const frame = (x: number, y: number, held = 0) => ({
    held,
    pressed: 0,
    released: 0,
    axes: [x, y, 0, 0],
    seq: 0,
    age: 0,
  });
  it('moves a dot by its stick, the same distance straight or diagonally', () => {
    const start = dots.init(1, players(2), settings, { data: {}, saved: null, teams: false });
    const [a, b] = start.dots;
    const next = dots.step(
      start,
      createTick({
        frames: new Map([
          ['p1', frame(1, 0)],
          ['p2', frame(1, 1)],
        ]),
      }),
      100,
    );
    const [a2, b2] = next.dots;
    expect((a2?.x ?? 0) - (a?.x ?? 0)).toBeCloseTo(0.6);
    expect(Math.hypot((b2?.x ?? 0) - (b?.x ?? 0), (b2?.y ?? 0) - (b?.y ?? 0))).toBeCloseTo(0.6);
  });
  it('shares what did not change and never touches the old state', () => {
    const start = dots.init(1, players(3), settings, { data: {}, saved: null, teams: false });
    const next = dots.step(start, createTick({ frames: new Map([['p1', frame(1, 0)]]) }), 16);
    expect(next).not.toBe(start);
    expect(next.dots[0]).not.toBe(start.dots[0]);
    expect(next.dots[1]).toBe(start.dots[1]);
    expect(next.rng).toBe(start.rng);
  });
  it('scores the gem, moves it from the seed, and halves speed while the button is held', () => {
    const start = dots.init(
      5,
      players(1),
      { ...settings, gemPoints: 3 },
      { data: {}, saved: null, teams: false },
    );
    const onGem: DotsState = {
      ...start,
      dots: start.dots.map((dot) => ({ ...dot, x: start.gem.x, y: start.gem.y })),
    };
    const next = dots.step(onGem, createTick(), 16);
    expect(next.dots[0]?.score).toBe(3);
    expect(next.gem).not.toEqual(start.gem);
    expect(start.rng).toEqual(
      dots.init(5, players(1), settings, { data: {}, saved: null, teams: false }).rng,
    );
    const slow = dots.step(
      start,
      createTick({ frames: new Map([['p1', frame(1, 0, 1 << BUTTON.FACE_BOTTOM)]]) }),
      100,
    );
    expect((slow.dots[0]?.x ?? 0) - (start.dots[0]?.x ?? 0)).toBeCloseTo(0.3);
  });
  it('ends when time runs out and ranks ties together, teams by their totals', () => {
    let state = dots.init(
      2,
      players(4, true),
      { ...settings, seconds: 10 },
      { data: {}, saved: null, teams: false },
    );
    state = {
      ...state,
      leftSteps: 1,
      dots: state.dots.map((dot, i) => ({ ...dot, score: [4, 4, 1, 0][i] ?? 0 })),
    };
    state = dots.step(state, createTick(), 16);
    expect(dots.isOver(state)).toBe(true);
    const results = dots.results(state);
    expect(results.players.map((row) => row.place)).toEqual([1, 1, 3, 4]);
    expect(results.teams).toEqual([
      { team: 0, score: 5, place: 1 },
      { team: 1, score: 4, place: 2 },
    ]);
    expect(dots.step(state, createTick(), 16)).toBe(state);
  });
});

// Honest review skeleton cases, expressed only in the generic fixture rules.
export const nullPrivateDots = { ...dots, privateView: () => null };
export const redealDots = {
  ...dots,
  step(state: DotsState, inputs: StepInputs, dt: number): DotsState {
    const next = dotsStep(state, inputs, dt);
    // A new round replaces every object, including the seats and generator.
    return state.leftSteps > 0 && state.leftSteps % 120 === 0 ? cloneState(next) : next;
  },
};
