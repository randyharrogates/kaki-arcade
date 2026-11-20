import { expect, it } from 'vitest';
import { tutorialFixture, tutorialFixtureTick, TUTORIAL_SKIP_FRAME } from '../../dev/tutorial.fixture';
import { tabaoRush } from './game';

it('TR-055 renderer tutorial deterministically hands off to play at frame 600', () => {
  const players = Array.from({ length: 8 }, (_, i) => ({ id: `cook-${String(i)}`, seat: i + 1, colour: 'seat-1' as const, name: `Cook ${String(i + 1)}` }));
  function run() {
    let state = tutorialFixture(players);
    expect(state.phase).toBe('tutorial');
    for (let frame = 1; frame <= TUTORIAL_SKIP_FRAME; frame++) {
      const frames = new Map(state.players.map((p, i) => [p.id, { held: 0, pressed: 0, released: 0, age: 0, seq: state.tick,
        axes: [Math.sin(state.tick / 120 + i), Math.cos(state.tick / 120 + i), 0, 0] }]));
      state = tabaoRush.step(state, tutorialFixtureTick(state, frames), 1 / 60);
      expect(state.phase).toBe(frame < TUTORIAL_SKIP_FRAME ? 'tutorial' : 'play');
    }
    expect(state.tick).toBe(0);
    expect(state.cooks).toHaveLength(8);
    return state;
  }
  expect(run()).toEqual(run());
});
