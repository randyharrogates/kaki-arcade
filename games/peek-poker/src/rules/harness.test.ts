// Peek Poker driven only through the dev harness (F-05 request 2; PP-001, PP-002, secrets).
import { describe, expect, it } from 'vitest';
import { createBots, createMatch, dumpView, replayMatch } from '@kaki/platform/harness';
import type { MatchRecording, PlayerScript, ScriptCommand } from '@kaki/platform/harness';
import { peekPoker } from './game';

// Saved and loaded as a fixture file would be.
const roundTrip = (file: MatchRecording): MatchRecording => JSON.parse(JSON.stringify(file)) as MatchRecording;

const ROUND = 60 * 60;
function script(rounds: number, cells: readonly [number, number]): PlayerScript {
  const commands: ScriptCommand[] = [];
  for (let round = 1; round <= rounds; round += 1) commands.push(
    { do: 'until', predicate: { path: ['round'], value: round }, maxSteps: ROUND },
    { do: 'until', predicate: { path: ['phase'], value: 'pick' }, maxSteps: ROUND },
    { do: 'tap', control: 'grid', value: cells[0] },
    { do: 'tap', control: 'grid', value: cells[1] },
    { do: 'tap', control: 'lock', value: 'go' },
    { do: 'until', predicate: { path: ['phase'], op: 'ne', value: 'pick' }, maxSteps: ROUND },
  );
  return commands;
}

describe('Peek Poker through the harness', { timeout: 60_000 }, () => {  // Whole matches; slow under a loaded verify.
  it.each([1, 8])('PP-001 a scripted 3-round match at %i players: pick two, lock in, all reveal', (players) => {
    const match = createMatch(peekPoker, { seed: 42, players, settings: { rounds: 3 } });
    for (const p of match.players) match.script(p.id, script(3, [p.seat - 1, p.seat + 7]));
    match.until((m) => m.publicView().phase === 'pick', ROUND);
    expect(match.publicView().grid).toBeNull();
    match.step(3);
    // The final lock immediately reveals (PP-022); controls give way to the own hand.
    expect(match.publicView().phase).toBe('reveal');
    expect(match.layoutFor('p1').controls).toEqual([]);
    match.until((m) => m.publicView().phase === 'reveal', 5);
    const hands = match.publicView().hands;
    expect(hands).toHaveLength(players);
    expect(match.publicView().players.map((p) => p.picks)).toEqual(match.players.map((p) => [p.seat - 1, p.seat + 7]));
    expect(match.privateViewFor('p1')?.blocks[0]).toMatchObject({ kind: 'cards' });
    match.until((m) => m.isOver, 3 * ROUND);
    expect(match.publicView().round).toBe(3);
    const results = match.results();
    expect(results.players).toHaveLength(players);
    expect(results.players[0]?.place).toBe(1);
    expect(replayMatch(peekPoker, roundTrip(match.recording())).matches).toBe(true);
  });

  it('a tap the phone could not make is refused with step, player and reason', () => {
    const match = createMatch(peekPoker, { seed: 42, players: 2, settings: { rounds: 3 } });
    expect(() => match.tap('p1', 'grid', 0)).toThrow(/player p1, tap grid/);
    match.until((m) => m.publicView().phase === 'pick', ROUND);
    expect(() => match.tap('p1', 'lock', 'go')).toThrow(/disabled|refus|not/i);
  });

  it.each([1, 8])('seeded bots finish a 3-round match at %i players within 20,000 steps', (players) => {
    const run = () => {
      const match = createMatch(peekPoker, { seed: 42, players, settings: { rounds: 3 } });
      const bots = createBots(match, { seed: 5 });
      for (let i = 0; i < 20_000 && !match.isOver; i += 1) bots.step();
      return match;
    };
    const a = run(), b = run();
    expect(a.isOver).toBe(true);
    expect(a.publicView().round).toBe(3);
    expect(a.results()).toEqual(b.results());
    expect(replayMatch(peekPoker, roundTrip(a.recording())).matches).toBe(true);
  });

  it('pausing in the memorise phase hides the grid and the dump shows no faces', () => {
    const match = createMatch(peekPoker, { seed: 42, players: 2, settings: { rounds: 3 } });
    match.step(10);
    expect(match.publicView().grid).not.toBeNull();
    match.pause();
    expect(match.publicView().grid).toBeNull();
    expect(dumpView(match.publicView())).toContain('"grid": null');
    match.resume().step(1);
    expect(match.publicView().grid).not.toBeNull();
  });
});
