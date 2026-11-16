// Rabakz driven only through the dev harness (F-05 request 1; RZ-001, RZ-006, RZ-016).
import { describe, expect, it } from 'vitest';
import { createBots, createMatch, replayMatch } from '@kaki/platform/harness';
import type { MatchRecording, PlayerScript, ScriptCommand } from '@kaki/platform/harness';
import { QUESTION_DATA, questionData, rabakz } from '../index';
import type { Question } from '../index';
import { IDLE_STEPS } from './flow';

// Saved and loaded as a fixture file would be.
const roundTrip = (file: MatchRecording): MatchRecording => JSON.parse(JSON.stringify(file)) as MatchRecording;

const bank = (n = 10): Question[] => Array.from({ length: n }, (_, i) => ({
  id: `q-${String(i)}`, prompt: `Question ${String(i)}`,
  options: [`Right ${String(i)}`, `Wrong a ${String(i)}`, `Wrong b ${String(i)}`, `Wrong c ${String(i)}`],
  correct: 0, category: 'General', difficulty: 'easy', type: 'multiple-choice', region: 'general',
}));
const context = { data: { [QUESTION_DATA]: questionData(bank()) } };
const LONG = IDLE_STEPS + 600;

/** Saved, plain-data script: tap option `pick` each round; the leader also continues at the scoreboard. */
function script(pick: string, leader: boolean): PlayerScript {
  const commands: ScriptCommand[] = [];
  for (let round = 1; round <= 10; round += 1) {
    commands.push(
      { do: 'until', predicate: { path: ['round'], value: round }, maxSteps: LONG },
      { do: 'until', predicate: { path: ['phase'], value: 'question' }, maxSteps: LONG },
      { do: 'tap', control: 'answer', value: pick },
      { do: 'until', predicate: { path: ['phase'], op: 'ne', value: 'question' }, maxSteps: LONG },
    );
    if (leader && round === 5) commands.push(
      { do: 'until', predicate: { path: ['phase'], value: 'scoreboard' }, maxSteps: LONG },
      { do: 'tap', control: 'continue', value: 'next' },
    );
  }
  return commands;
}
describe('Rabakz through the harness', { timeout: 60_000 }, () => {  // Whole matches; slow under a loaded verify.
  it.each([1, 8])('RZ-001 a scripted 10-question match at %i players ends with seat 1 first', (players) => {
    // The right option moves with the shuffle, so a script cannot name it: resolve per round.
    const match = createMatch(rabakz, { seed: 42, players, context });
    for (let round = 1; round <= 10; round += 1) {
      match.until((m) => m.publicView().round === round && m.publicView().phase === 'question', LONG);
      const options = match.publicView().question?.options ?? [];
      const right = String(options.findIndex((o) => o.startsWith('Right')));
      const wrong = String(options.findIndex((o) => o.startsWith('Wrong')));
      for (const p of match.players) match.tap(p.id, 'answer', p.seat === 1 ? right : wrong);
      match.until((m) => m.publicView().phase !== 'question', LONG);
      if (match.publicView().phase === 'reveal' && round === 5) {
        match.until((m) => m.publicView().phase === 'scoreboard', LONG).tap('p1', 'continue', 'next');
      }
    }
    match.until((m) => m.isOver, LONG);
    const results = match.results();
    expect(results.players[0]).toMatchObject({ id: 'p1', place: 1, score: 100 + 100 + 150 * 7 + 300 });
    expect(results.players.slice(1).every((p) => p.score === 0 && p.place === 2)).toBe(true);
    const replay = replayMatch(rabakz, roundTrip(match.recording()));
    expect(replay.matches).toBe(true);
  });

  it.each([1, 8])('saved data scripts (fixed option "0") finish at %i players and replay', (players) => {
    const match = createMatch(rabakz, { seed: 42, players, context });
    for (const p of match.players) match.script(p.id, script('0', p.seat === 1));
    match.until((m) => m.isOver, 10 * 3 * LONG);
    expect(match.isOver).toBe(true);
    expect(match.results().players).toHaveLength(players);
    const file = roundTrip(match.recording());
    expect(replayMatch(rabakz, file).matches).toBe(true);
  });

  it.each([1, 8])('seeded bots finish at %i players, reproducibly', (players) => {
    const run = () => {
      const match = createMatch(rabakz, { seed: 42, players, context });
      const bots = createBots(match, { seed: 9 });
      for (let i = 0; i < 40_000 && !match.isOver; i += 1) bots.step();
      return match;
    };
    const a = run(), b = run();
    expect(a.isOver).toBe(true);
    expect(a.results()).toEqual(b.results());
    const replay = replayMatch(rabakz, roundTrip(a.recording()));
    expect(replay.matches).toBe(true);
    expect(replay.finalHash).toBe(replayMatch(rabakz, roundTrip(b.recording())).finalHash);
  });

  it('RZ-016 eight players in two teams finish with team standings', () => {
    const match = createMatch(rabakz, { seed: 42, players: 8, teams: true, context });
    const bots = createBots(match, { seed: 3 });
    for (let i = 0; i < 40_000 && !match.isOver; i += 1) bots.step();
    const results = match.results();
    expect(match.isOver).toBe(true);
    expect(results.mode).toBe('teams');
    expect(results.teams).toHaveLength(2);
    expect(replayMatch(rabakz, roundTrip(match.recording())).matches).toBe(true);
  });
});
