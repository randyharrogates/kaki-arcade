// The kit, proved on the two fixture games: both pass, and for every check there is a
// deliberately broken variant of a fixture that the kit catches (in `broken.test.ts`).
import * as fs from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloneRng, cloneState, createRng } from '@kaki/sim-core';
import { dots, dotsResults, dotsStep } from './fixtures/dots.test';
import type { DotsSettings, DotsState } from './fixtures/dots.test';
import { PICKS_DATA, picks, picksSecrets, picksStep } from './fixtures/picks.test';
import type { PicksSettings, PicksState } from './fixtures/picks.test';
import {
  CONFORMANCE_CHECKS,
  settingsSchema,
  assertConformance,
  checkResults,
  formatReport,
  fuzzScript,
  makePlayers,
  readSources,
  runConformance,
} from './kit';
import type { CheckId, ConformanceReport, GameModule, Scenario, Script } from './kit';
const HERE = dirname(fileURLToPath(import.meta.url));
// Set to a file path to have every report written there (the slice's evidence).
const EVIDENCE = process.env.KAKI_KIT_EVIDENCE;
export const caughtChecks = new Set<CheckId>();
export const keep = (title: string, report: ConformanceReport): ConformanceReport => {
  if (title.startsWith('BROKEN'))
    for (const check of report.checks) if (check.status === 'fail') caughtChecks.add(check.id);
  if (EVIDENCE !== undefined && EVIDENCE !== '')
    fs.appendFileSync(EVIDENCE, `## ${title}\n\n${formatReport(report)}\n\n`);
  return report;
};
const ALL = readSources(fs, HERE, { includeTests: true });
export const DOTS_SOURCES = ALL.filter((file) => file.path === 'fixtures/dots.test.ts');
export const PICKS_SOURCES = ALL.filter((file) => file.path === 'fixtures/picks.test.ts');
/** Everyone picks and locks at once, then the leader moves on: a script that plays to the end. */
export const brisk: Script = ({ players, layout, leader }) => {
  const actions: {
    player: string;
    control: string;
    value?: string | number;
  }[] = [];
  for (const player of players) {
    for (const control of layout(player.id).controls) {
      if (control.kind === 'grid') {
        if (!control.cells.some((cell) => cell.state === 'selected'))
          actions.push({ player: player.id, control: control.id, value: (player.seat * 2) % 9 });
      } else if (
        control.kind === 'options' &&
        control.options[0]?.state !== 'disabled' &&
        (control.audience !== 'leader' || player.id === leader)
      ) {
        actions.push({
          player: player.id,
          control: control.id,
          value: control.options[0]?.id ?? '',
        });
      }
    }
  }
  return { actions };
};
export const DOTS_SCENARIOS: Scenario<DotsSettings>[] = [
  { name: 'eight restless players', players: 8 },
  {
    name: 'two teams of two, edges wrap',
    players: 4,
    teams: true,
    settings: { wrap: true, gemPoints: 3, seconds: 30 },
  },
  { name: 'one player alone', players: 1, settings: { seconds: 10 } },
];
export const PICKS_SCENARIOS: Scenario<PicksSettings>[] = [
  {
    name: 'five players tapping at random',
    players: 5,
    data: PICKS_DATA,
    script: fuzzScript({ tapChance: 0.2 }),
  },
  {
    name: 'eight players, everyone locks in at once',
    players: 8,
    data: PICKS_DATA,
    settings: { rounds: 7 },
    script: brisk,
  },
  {
    name: 'one player alone, with a saved best',
    players: 1,
    data: PICKS_DATA,
    saved: { best: 12 },
  },
];
export const THIS_FILE = ALL.filter((file) => file.path === 'conformance-broken.test.ts');
export const DOTS_ONE: Scenario<DotsSettings>[] = [{ name: 'four players', players: 4 }];
export const DOTS_TEAMS: Scenario<DotsSettings>[] = [{ name: 'two teams', players: 4, teams: true }];
export const PICKS_ONE: Scenario<PicksSettings>[] = [
  { name: 'four players', players: 4, data: PICKS_DATA, script: fuzzScript({ tapChance: 0.2 }) },
];
export function brokenDots(
  title: string,
  change: Partial<GameModule<DotsState, DotsSettings>>,
  scenarios = DOTS_ONE,
  sources = DOTS_SOURCES,
): ConformanceReport {
  return keep(
    `BROKEN Dots: ${title}`,
    runConformance({ ...dots, ...change }, scenarios, {
      sources,
      stopOnFailure: ['secrets', 'layout', 'repeat-taps', 'private-revision', 'sharing', 'results'],
      allowImports: ['vitest', 'node:fs', 'node:path', 'node:url'],
    }),
  );
}
export function brokenPicks(
  title: string,
  change: Partial<GameModule<PicksState, PicksSettings>>,
): ConformanceReport {
  return keep(
    `BROKEN Picks: ${title}`,
    runConformance({ ...picks, ...change }, PICKS_ONE, {
      sources: PICKS_SOURCES,
      stopOnFailure: ['secrets', 'layout', 'repeat-taps', 'private-revision', 'sharing', 'results'],
      allowImports: ['vitest'],
      data: PICKS_DATA,
    }),
  );
}
export function failed(report: ConformanceReport): CheckId[] {
  return report.checks.filter((check) => check.status === 'fail').map((check) => check.id);
}
export function said(report: ConformanceReport, check: CheckId): string {
  return report.checks.find((candidate) => candidate.id === check)?.failures.join('\n') ?? '';
}
export type Writable<T> = {
  -readonly [K in keyof T]: Writable<T[K]>;
};

export {
  cloneRng,
  cloneState,
  createRng,
  dots,
  dotsResults,
  dotsStep,
  PICKS_DATA,
  picks,
  picksSecrets,
  picksStep,
  CONFORMANCE_CHECKS,
  settingsSchema,
  assertConformance,
  checkResults,
  formatReport,
  fuzzScript,
  makePlayers,
  readSources,
  runConformance,
};
export type {
  DotsSettings,
  DotsState,
  PicksSettings,
  PicksState,
  CheckId,
  ConformanceReport,
  GameModule,
  Scenario,
  Script,
};

import { it, expect } from 'vitest';
it('the check registry has unique ids', () => { expect(new Set(CONFORMANCE_CHECKS.map(([id]) => id)).size).toBe(CONFORMANCE_CHECKS.length); });
