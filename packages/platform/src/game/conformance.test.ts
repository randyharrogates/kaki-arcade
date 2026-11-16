import { nullPrivateDots, redealDots } from './fixtures/dots.test';
import { describe, expect, it } from 'vitest';
import {
  keep,
  DOTS_SOURCES,
  PICKS_SOURCES,
  DOTS_SCENARIOS,
  PICKS_SCENARIOS,
  dots,
  PICKS_DATA,
  picks,
  CONFORMANCE_CHECKS,
  assertConformance,
  checkResults,
  formatReport,
  makePlayers,
  runConformance,
  brisk,
} from './conformance-support.test';
describe('the conformance kit on the fixture games', () => {
  it('passes Dots (real time, returns-new, optional teams)', { timeout: 15000 }, () => {
    const report = keep(
      'Dots, as written',
      runConformance(dots, DOTS_SCENARIOS, { sources: DOTS_SOURCES, allowImports: ['vitest'] }),
    );
    expect(formatReport(report)).toMatch(/PASSES/);
    expect(report.ok, formatReport(report)).toBe(true);
    expect(report.stepMode).toBe('returns-new');
    expect(report.checks.map((check) => check.id)).toEqual(CONFORMANCE_CHECKS.map(([id]) => id));
    expect(report.checks.every((check) => check.applied > 0 || check.status === 'not-applicable')).toBe(true);
    expect(
      report.scenarios.every((scenario) => scenario.steps >= 2000 && scenario.overAtStep > 0),
    ).toBe(true);
  });
  it(
    'passes Picks (turn-phased, in-place, secrets, data and a saved best)',
    { timeout: 15000 },
    () => {
      const report = keep(
        'Picks, as written',
        assertConformance(picks, PICKS_SCENARIOS, {
          sources: PICKS_SOURCES,
          allowImports: ['vitest'],
          data: PICKS_DATA,
        }),
      );
      expect(report.stepMode).toBe('in-place');
      expect(report.scenarios.map((scenario) => scenario.overAtStep > 0)).toEqual([
        true,
        true,
        true,
      ]);
    },
  );
  it('gives the same report twice (the kit itself is deterministic)', () => {
    const run = (): string =>
      formatReport(
        runConformance(dots, DOTS_SCENARIOS.slice(1, 2), {
          sources: DOTS_SOURCES,
          allowImports: ['vitest'],
        }),
      );
    const stable = (report: string): string =>
      report
        .split('\n')
        .filter((line) => !line.includes('step ms:'))
        .join('\n');
    expect(stable(run())).toBe(stable(run()));
  });
  it('assertConformance throws the whole report', () => {
    expect(() => assertConformance(dots, DOTS_SCENARIOS.slice(2), { sources: [] })).toThrow(
      /FAIL {2}purity[\s\S]*no source files were given/,
    );
  });
  it('refuses a scenario the game cannot play, and a run with no scenarios', () => {
    const nine = runConformance(dots, [{ name: 'nine', players: 9 }], {
      sources: DOTS_SOURCES,
      allowImports: ['vitest'],
    });
    expect(formatReport(nine)).toMatch(/asks for 9 players; the game takes 1 to 8/);
    const teams = runConformance(
      picks,
      [{ name: 'teams', players: 4, teams: true, data: PICKS_DATA }],
      { sources: PICKS_SOURCES, allowImports: ['vitest'], data: PICKS_DATA },
    );
    expect(formatReport(teams)).toMatch(/asks for teams/);
    const none = runConformance(dots, [], { sources: DOTS_SOURCES, allowImports: ['vitest'] });
    expect(formatReport(none)).toMatch(/no scenarios were given/);
    const noData = runConformance(picks, [{ name: 'no data', players: 2 }], {
      sources: PICKS_SOURCES,
      allowImports: ['vitest'],
    });
    expect(formatReport(noData)).toMatch(
      /preload\(null\) names "picks\/numbers.json" but the kit was given no such data/,
    );
    const badSettings = runConformance(
      dots,
      [{ name: 'bad', players: 2, settings: { seconds: 15 } }],
      { sources: DOTS_SOURCES, allowImports: ['vitest'] },
    );
    expect(formatReport(badSettings)).toMatch(
      /the scenario's settings do not validate: Match length/,
    );
  });
});
describe('checkResults', () => {
  const four = makePlayers(4, false);
  const row = (id: string, place: number, score: number) => ({
    id,
    place,
    score,
    joinedMidGame: false,
  });
  it('accepts ties that share a place and skip the next', () => {
    expect(
      checkResults(
        {
          mode: 'players',
          players: [row('p1', 1, 9), row('p2', 1, 9), row('p3', 3, 4), row('p4', 4, 0)],
        },
        four,
      ),
    ).toEqual([]);
  });
  it('accepts coop with a shared score and everyone first', () => {
    expect(
      checkResults(
        {
          mode: 'coop',
          score: 310,
          players: four.map((player) => row(player.id, 1, 310)),
          extras: { stars: 2 },
        },
        four,
      ),
    ).toEqual([]);
    expect(
      checkResults({ mode: 'coop', players: four.map((player) => row(player.id, 1, 0)) }, four),
    ).toEqual(['in coop, results.score must be the shared score']);
  });
  it('accepts teams, with the players still listed', () => {
    const teams = makePlayers(4, true);
    const players = [row('p1', 1, 5), row('p2', 2, 3), row('p3', 3, 1), row('p4', 4, 0)];
    expect(
      checkResults(
        {
          mode: 'teams',
          players,
          teams: [
            { team: 0, place: 1, score: 6 },
            { team: 1, place: 2, score: 3 },
          ],
        },
        teams,
      ),
    ).toEqual([]);
    expect(checkResults({ mode: 'teams', players }, teams)[0]).toMatch(
      /must list team 0 and team 1/,
    );
    expect(checkResults({ mode: 'players', players }, teams)[0]).toMatch(/played in teams/);
    expect(checkResults({ mode: 'teams', players, teams: [] }, four)[0]).toMatch(
      /not played in teams/,
    );
  });
  it('says what is wrong with a list that is not total or not in order', () => {
    const problems = (
      players: {
        id: string;
        place: number;
        score: number;
      }[],
    ): string => checkResults({ mode: 'players', players }, four).join('\n');
    expect(problems([row('p1', 1, 9), row('p2', 2, 4), row('p3', 3, 1)])).toMatch(
      /p4 is in the match but missing/,
    );
    expect(problems([row('p1', 1, 9), row('p1', 2, 4), row('p3', 3, 1), row('p4', 4, 0)])).toMatch(
      /p1 is listed twice/,
    );
    expect(
      problems([
        row('p1', 1, 9),
        row('p2', 2, 4),
        row('p3', 3, 1),
        row('p4', 4, 0),
        row('p9', 5, 0),
      ]),
    ).toMatch(/p9 is listed but is not in the match/);
    expect(problems([row('p1', 1, 2), row('p2', 2, 4), row('p3', 3, 1), row('p4', 4, 0)])).toMatch(
      /p2 is placed below the row above but has a higher score/,
    );
    expect(problems([row('p1', 1, 9), row('p2', 1, 4), row('p3', 3, 1), row('p4', 4, 0)])).toMatch(
      /shares place 1 with the row above but has a different score/,
    );
    expect(problems([row('p1', 1, 9), row('p2', 2, 9), row('p3', 2, 9), row('p4', 5, 0)])).toMatch(
      /p4 has place 5; after 3 better rows it must be 4/,
    );
    expect(problems([row('p1', 2, 9), row('p2', 2, 9), row('p3', 3, 1), row('p4', 4, 0)])).toMatch(
      /listed first with place 2/,
    );
    expect(
      problems([row('p1', 1, Number.NaN), row('p2', 2, 4), row('p3', 3, 1), row('p4', 4, 0)]),
    ).toMatch(/NaN/);
    expect(checkResults({ mode: 'ladder', players: [] }, four)[0]).toMatch(
      /must be players, teams or coop/,
    );
    expect(checkResults(null, four)[0]).toMatch(/players list/);
  });
});
// ---------------------------------------------------------------------------------------------

// Adapted from the review skeletons: a no-secrets kitchen and a full new deal.
it.each([
  ['always-null private view', nullPrivateDots],
  ['full round re-deal', redealDots],
] as const)('round 3 passes %s', (name, game) => {
  const report = keep(`Dots ${name}`, runConformance(game,
    DOTS_SCENARIOS.filter((_, i) => i !== 1), { sources: DOTS_SOURCES, allowImports: ['vitest'] }));
  expect(report.ok, formatReport(report)).toBe(true);
  if (name === 'always-null private view') {
    expect(report.checks.find((c) => c.id === 'private-revision')?.status).toBe('not-applicable');
    expect(formatReport(report)).toContain('N/A  private-revision');
  }
});
it('round 3 lets a lone waiting joiner finish auto-skips beyond the scenario length', { timeout: 15000 }, () => {
  const report = keep('Picks solo waiting joiner auto-skips', runConformance(picks, [
    { name: 'solo short match', players: 1, data: PICKS_DATA, script: brisk },
    { name: 'full short match', players: 8, data: PICKS_DATA, script: brisk },
    { name: 'solo slow auto-skips', players: 1, data: PICKS_DATA,
      settings: { rounds: 3, pickSeconds: 20 }, script: () => ({}) },
  ], { sources: PICKS_SOURCES, allowImports: ['vitest'], data: PICKS_DATA }));
  expect(report.ok, formatReport(report)).toBe(true);
  expect(report.scenarios.some((s) => (s.membershipReplay?.steps ?? 0) > 2000 && (s.membershipReplay?.overAtStep ?? 0) > 2000)).toBe(true);
});
