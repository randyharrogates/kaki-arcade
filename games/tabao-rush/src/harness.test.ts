// Tabao Rush movement driven only through the dev harness. Its View type is unknown, so read the typed state (F-05 request 3; TR-002, TR-020).
import { describe, expect, it } from 'vitest';
import { createBots, createMatch, replayMatch } from '@kaki/platform/harness';
import type { MatchRecording, PlayerScript } from '@kaki/platform/harness';
import { ROUND_STEPS } from './index';
import { tabaoRush } from './rules/playing.fixture';
import type { TabaoState } from './index';
import { THROW_STEPS } from './rules/items';
import { targetTile } from './rules/target';

// A square walk, saved as data: a quarter second each way, repeated through the 210 s round.
const lap: PlayerScript = [
  { do: 'stick', x: 1, y: 0, steps: 15 }, { do: 'stick', x: 0, y: 1, steps: 15 },
  { do: 'stick', x: -1, y: 0, steps: 15 }, { do: 'stick', x: 0, y: -1, steps: 15 },
];
const walk: PlayerScript = Array.from({ length: Math.ceil(ROUND_STEPS / 60) }, () => lap).flat();

// Saved and loaded as a fixture file would be.
const roundTrip = (file: MatchRecording): MatchRecording => JSON.parse(JSON.stringify(file)) as MatchRecording;

describe('Tabao Rush through the harness', { timeout: 60_000 }, () => {  // Whole matches; slow under a loaded verify.
  it('TR-020 a held stick moves the cook every step it is held, and stops when released', () => {
    const match = createMatch(tabaoRush, { seed: 42, players: 1 });
    const start = match.state.cooks[0];
    match.stick('p1', 1, 0).step(15);
    const moved = match.state.cooks[0];
    expect(moved?.x).toBeGreaterThan(start?.x ?? Infinity);
    match.stick('p1', 0, 0).step(5);
    const still = match.state.cooks[0];
    match.step(5);
    expect(match.state.cooks[0]).toEqual(still);
  });

  it.each([1, 8])('a scripted 210 s round at %i players ends on time with every cook inside', (players) => {
    const match = createMatch(tabaoRush, { seed: 42, players });
    for (const p of match.players) match.script(p.id, walk);
    match.step(ROUND_STEPS);
    expect(match.isOver).toBe(true);
    expect(match.steps).toBe(ROUND_STEPS);
    const { cooks, level } = match.state;
    expect(cooks).toHaveLength(players);
    for (const c of cooks) {
      expect(Number.isFinite(c.x) && Number.isFinite(c.y)).toBe(true);
      expect(c.x).toBeGreaterThan(0); expect(c.x).toBeLessThan(level.width);
      expect(c.y).toBeGreaterThan(0); expect(c.y).toBeLessThan(level.height);
    }
    expect(match.results()).toMatchObject({ mode: 'coop', score: 0 });
    expect(replayMatch(tabaoRush, roundTrip(match.recording())).matches).toBe(true);
  });

  it.each([1, 8])('seeded bots play the round at %i players and never press a disabled button', (players) => {
    // Circle (bit 5) and square (bit 6) are drawn disabled; cross and triangle are live.
    let live = 0;
    const guarded = { ...tabaoRush, step: (...args: Parameters<typeof tabaoRush.step>) => {
      for (const frame of args[1].frames.values()) {
        expect(frame.held & 0b1100000).toBe(0);
        live |= frame.held & 0b10010000;
      }
      return tabaoRush.step(...args);
    } };
    const match = createMatch(guarded, { seed: 42, players });
    const bots = createBots(match, { seed: 11 });
    bots.step(ROUND_STEPS);
    expect(match.isOver).toBe(true);
    for (const c of match.state.cooks) expect(Number.isFinite(c.x + c.y)).toBe(true);
    expect(live).toBe(0b10010000);
    expect(replayMatch(tabaoRush, roundTrip(match.recording())).matches).toBe(true);
  });

  it('a late joiner watches, and a leaver takes their cook away', () => {
    const match = createMatch(tabaoRush, { seed: 42, players: 2 });
    match.step(10);
    match.join({ id: 'p3', seat: 3, name: 'Late', colour: 'seat-3' });
    expect(match.layoutFor('p3').controls[0]?.kind).toBe('text');
    match.leave('p2').step(1);
    expect(match.state.cooks.map((c) => c.id)).toEqual(['p1']);
  });

  it('TR-002 a cook facing the crate picks up a cucumber with cross and throws it with triangle', () => {
    // Crafted start: p1 stands below the cucumber crate at (3, 1), facing up.
    const base = tabaoRush.init(42, [{ id: 'p1', seat: 1, name: 'Cook', colour: 'seat-1' }], {}, { data: {}, saved: null, teams: false });
    const first = base.cooks[0];
    if (!first) throw new Error('no cook');
    const cook = { ...first, x: 3.5, y: 2.5, facing: 6 as const, targetTile: targetTile(base.level, 3.5, 2.5, 6) };
    const state: TabaoState = { ...base, cooks: [cook] };
    const match = createMatch(tabaoRush, { seed: 42, players: 1, state });
    match.script('p1', [
      { do: 'press', button: 'faceBottom' }, { do: 'release', button: 'faceBottom' },
      { do: 'stick', x: 0, y: 1, steps: 3 },
      { do: 'press', button: 'faceTop' }, { do: 'release', button: 'faceTop' },
    ]);
    match.step(1);
    expect(match.state.inventory.held.p1).toMatchObject({ ingredient: 'cucumber' });
    match.step(5);
    expect(match.state.inventory.held.p1).toBeUndefined();
    expect(match.state.inventory.flights).toHaveLength(1);
    match.step(THROW_STEPS + 1);
    expect(match.state.inventory.flights).toHaveLength(0);
    expect(match.state.inventory.floorCount).toBe(1);
    expect(match.layoutFor('p1').controls.find((c) => c.id === 'triangle')).toMatchObject({ label: 'Throw' });
    expect(() => match.press('p1', 'shoulderLeft')).toThrow(/not drawn/);
    expect(replayMatch(tabaoRush, roundTrip(match.recording())).matches).toBe(true);
  });
});
