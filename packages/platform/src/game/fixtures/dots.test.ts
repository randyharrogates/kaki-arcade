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
import {
  BUTTON,
  createTick,
  defaultSettings,
  settingsSchema,
} from '../kit';
import type {
  PlayerInfo,
  TeamId,
} from '../kit';
import { dots } from '../../test-fixtures/dots.fixture';
import type { DotsState } from '../../test-fixtures/dots.fixture';
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
  const settings = defaultSettings(settingsSchema(dots, { firstInRoom: false, data: {}, saved: null, teams: false }));
  const frame = (x: number, y: number, held = 0) => ({
    held,
    pressed: 0,
    released: 0,
    axes: [x, y, 0, 0],
    seq: 0,
    age: 0,
  });
  it('moves a dot by its stick, the same distance straight or diagonally', () => {
    const start = dots.init(1, players(2), settings, { firstInRoom: false, data: {}, saved: null, teams: false });
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
    const start = dots.init(1, players(3), settings, { firstInRoom: false, data: {}, saved: null, teams: false });
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
      { firstInRoom: false, data: {}, saved: null, teams: false },
    );
    const onGem: DotsState = {
      ...start,
      dots: start.dots.map((dot) => ({ ...dot, x: start.gem.x, y: start.gem.y })),
    };
    const next = dots.step(onGem, createTick(), 16);
    expect(next.dots[0]?.score).toBe(3);
    expect(next.gem).not.toEqual(start.gem);
    expect(start.rng).toEqual(
      dots.init(5, players(1), settings, { firstInRoom: false, data: {}, saved: null, teams: false }).rng,
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
      { firstInRoom: false, data: {}, saved: null, teams: false },
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
