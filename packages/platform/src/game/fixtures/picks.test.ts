// FIXTURE GAME 2: "Picks". Turn-phased, with secrets. Written only to prove the game
// interface and the conformance kit; it is not a product game and lives in no build.
//
// Each round every player secretly taps one number from 1 to 9 on their own phone and locks
// it in. The highest number that nobody else chose wins its value in points. Each round also
// has a sealed bonus number, hidden from everyone: whoever picked it gets 5 more. Picks, the
// bonus and the seal's code are shown only at the reveal. Players who have not picked when
// time runs out get a number drawn from the seed.
//
// `in-place`: a step changes the state it is given and returns it. (The other fixture is
// `returns-new`, so the kit is proved on both.)
import { describe, expect, it } from 'vitest';
import {
  createTick,
  defaultSettings,
  settingsSchema,
} from '../kit';
import type {
  PlayerInfo,
} from '../kit';
import { picks, PICKS_DATA } from '../../test-fixtures/picks.fixture';
import type { PicksState } from '../../test-fixtures/picks.fixture';
function players(count: number): PlayerInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${String(i + 1)}`,
    seat: i + 1,
    name: `P${String(i + 1)}`,
    colour: `seat-${String(i + 1)}` as PlayerInfo['colour'],
  }));
}
describe('fixture game: Picks', () => {
  const settings = defaultSettings(
    settingsSchema(picks, { firstInRoom: false, data: PICKS_DATA, saved: null, teams: false }),
  );
  const start = (count: number): PicksState =>
    picks.init(3, players(count), settings, { firstInRoom: false, data: PICKS_DATA, saved: null, teams: false });
  const tap = (player: string, control: string, value?: number) => ({
    player,
    control,
    revision: 0,
    ...(value === undefined ? {} : { value }),
  });
  it(
    'gives the round to the highest number nobody else picked, and ' +
      'reveals early when all have locked',
    () => {
      const state = start(3);
      state.bonusCell = 1;
      picks.step(
        state,
        createTick({
          actions: [tap('p1', 'numbers', 8), tap('p2', 'numbers', 8), tap('p3', 'numbers', 4)],
        }),
        16,
      );
      expect(state.phase).toBe('pick');
      picks.step(
        state,
        createTick({ actions: [tap('p1', 'lock'), tap('p2', 'lock'), tap('p3', 'lock')] }),
        16,
      );
      expect(state.phase).toBe('reveal');
      expect(state.players.map((player) => player.score)).toEqual([0, 0, 5]);
    },
  );
  it(
    'adds the bonus, fills missing picks from the seed when time runs ' +
      'out, and plays the set number of rounds',
    () => {
      const state = start(2);
      state.bonusCell = 2;
      state.leftSteps = 1;
      picks.step(state, createTick({ actions: [tap('p1', 'numbers', 1)] }), 1000 / 60);
      expect(state.phase).toBe('reveal');
      expect(state.players[0]?.pick).toBe(2);
      expect(state.players[1]?.pick).not.toBeNull();
      expect(state.players[0]?.gained).toBeGreaterThanOrEqual(5);
      for (let i = 0; i < 20 && !picks.isOver(state); i += 1) {
        state.leftSteps = 1;
        picks.step(state, createTick(), 1000 / 60);
      }
      expect(state.round).toBe(3);
      expect(picks.isOver(state)).toBe(true);
      expect(picks.save?.(state)).toEqual({ best: picks.results(state).players[0]?.score });
    },
  );
  it(
    'seats a late joiner from the next round with nothing, and lets ' +
      'the leader cut the reveal short',
    () => {
      const state = start(2);
      picks.join(state, { id: 'p3', seat: 3, name: 'P3', colour: 'seat-3' });
      expect(picks.controllerLayout(state, 'p3').controls[0]).toMatchObject({ kind: 'text' });
      state.leftSteps = 1;
      picks.step(state, createTick(), 1000 / 60);
      expect(state.players[2]).toMatchObject({ waiting: true, score: 0, revision: 0, pick: null });
      picks.step(state, createTick({ actions: [tap('p1', 'next')] }), 16);
      expect(state).toMatchObject({ phase: 'pick', round: 2 });
      expect(state.players[2]?.waiting).toBe(false);
    },
  );
  it('shows no pick, bonus or seal on the TV until the reveal', () => {
    const state = start(2);
    picks.step(state, createTick({ actions: [tap('p1', 'numbers', 6)] }), 16);
    expect(JSON.stringify(picks.publicView(state))).not.toMatch(/"pick":|bonus|seal/);
    state.leftSteps = 1;
    picks.step(state, createTick(), 1000 / 60);
    expect(picks.publicView(state)).toMatchObject({ bonusCell: state.bonusCell, seal: state.seal });
  });
});
