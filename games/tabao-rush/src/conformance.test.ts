import * as fs from 'node:fs';
import { expect, it } from 'vitest';
import { formatReport, readSources, runConformance } from '@kaki/platform/kit';
import { ROUND_STEPS, tabaoRush } from './rules/game';

it('TR-002 TR-020 TR-021 TR-022 passes whole-match conformance at 1 and 8 players',
  { timeout: 120000 }, () => {
    const report = runConformance(tabaoRush, [
      { name: 'solo co-op', players: 1, steps: ROUND_STEPS + 1, seed: 4201 },
      { name: 'eight-cook co-op', players: 8, steps: ROUND_STEPS + 1, seed: 4208 },
    ], {
      sources: readSources(fs, new URL('./rules', import.meta.url).pathname),
    });
    const evidence = new URL('../../../uat/evidence/T-01-tabao-movement/', import.meta.url);
    fs.writeFileSync(new URL('conformance.txt', evidence), formatReport(report));
    fs.writeFileSync(new URL('conformance.json', evidence), JSON.stringify(report, null, 2));
    expect(report.ok, formatReport(report)).toBe(true);
    expect(report.scenarios.map((scenario) => scenario.overAtStep)).toEqual([
      ROUND_STEPS, ROUND_STEPS,
    ]);
  });
