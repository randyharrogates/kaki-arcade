// C-10 review: Tabao Rush through createSession and the harness with identical inputs.
import { describe, expect, it } from 'vitest';
import { ROUND_STEPS } from './index';
import { tabaoRush } from './rules/playing.fixture';
import { twin } from '../../../packages/platform/src/session/testing.fixture';

const CROSS = 1 << 4, TRIANGLE = 1 << 7, CIRCLE = 1 << 5, SHOULDER = 1 << 8;
function drive(t: ReturnType<typeof twin>, extra = 0): number {
  let mismatches = 0;
  for (let i = 0; i < ROUND_STEPS + 10 && !t.session.ended; i++) {
    for (const p of t.players) {
      const phase = Math.floor((i + p.seat * 7) / 15) % 4;
      const x = [1, 0, -1, 0][phase] ?? 0, y = [0, 1, 0, -1][phase] ?? 0;
      const buttons = (i % 23 < 2 ? CROSS : 0) | (i % 37 < 2 ? TRIANGLE : 0) | (i % 51 < 2 ? CIRCLE : 0) | (i % 41 < 2 ? extra : 0);
      t.set(p.id, buttons, x, y);
    }
    t.step();
    const [a, b] = t.hashes(); if (a !== b) mismatches++;
  }
  return mismatches;
}
describe('C-10 review: Tabao Rush through the session runner', { timeout: 60_000 }, () => {
  it.each([1, 8])('whole round at %i players: same hash as the harness every step', (n) => {
    const t = twin({ game: tabaoRush, seed: 42, players: n, settings: {} });
    const mismatches = drive(t);
    expect(t.session.ended).toBe(true);
    expect(t.session.step).toBe(ROUND_STEPS);
    expect(mismatches).toBe(0);
    expect(t.match.state.inventory.floorCount + Object.keys(t.match.state.inventory.held).length).toBeGreaterThanOrEqual(0);
  });
  it('an undrawn shoulder button is cleared by runner and harness', () => {
    let seen = 0;
    const game = { ...tabaoRush, step: (...a: Parameters<typeof tabaoRush.step>) => {
      for (const f of a[1].frames.values()) seen |= f.held & SHOULDER; return tabaoRush.step(...a); } };
    const t = twin({ game, seed: 42, players: 2, settings: {} });
    for (let i = 0; i < 30; i++) { t.set('seat-1', SHOULDER, 0, 0); t.step(); }
    // Both paths clear controls the phone does not draw.
    expect(seen).toBe(0);
  });
});
