import { conformanceTimeout } from '@kaki/platform/kit';
import * as fs from 'node:fs';
import { expect, it } from 'vitest';
import { formatReport, fuzzScript, readSources, runConformance } from '@kaki/platform/kit';
import type { Script } from '@kaki/platform/kit';
import { ROUND_STEPS } from './rules/game';
import { tabaoRush } from './rules/playing.fixture';

const fuzz = fuzzScript();
const buttonsAndSupply: Script = (context) => {
  if (context.step >= 70) return fuzz(context);
  const player = context.players[context.players.length === 1 ? 0 : 2];
  if (!player) return fuzz(context);
  return { pads: { [player.id]: {
    stick: context.step < 40 && context.players.length === 1 ? [1, 0]
      : context.step >= 40 && context.step < 60 ? [0, -1] : [0, 0],
    buttons: context.step === 60 ? ['FACE_BOTTOM'] : context.step === 62 ? ['FACE_TOP'] : [],
  } } };
};

it('TR-002 TR-009 TR-023 TR-020 TR-021 TR-022 passes whole-match conformance at 1 and 8 players',
  { timeout: conformanceTimeout(59243) }, () => {
    const report = runConformance(tabaoRush, [
      { name: 'solo co-op', players: 1, steps: ROUND_STEPS + 1, seed: 4201, script: buttonsAndSupply },
      { name: 'eight-cook co-op', players: 8, steps: ROUND_STEPS + 1, seed: 4208, script: buttonsAndSupply },
    ], {
      sources: readSources(fs, new URL('./rules', import.meta.url).pathname),
    });
    // Explicit flags only: normal verification never refreshes tracked evidence.
    for (const [flag, slice] of [['T01_EVIDENCE', 'T-01-tabao-movement'], ['T02_EVIDENCE', 'T-02-tabao-items']]) {
      if (!flag || !slice || process.env[flag] !== '1') continue;
      const evidence = new URL(`../../../uat/evidence/${slice}/`, import.meta.url);
      fs.mkdirSync(evidence, { recursive: true });
      fs.writeFileSync(new URL('conformance.txt', evidence), formatReport(report));
      fs.writeFileSync(new URL('conformance.json', evidence), JSON.stringify(report, null, 2));
    }
    expect(report.ok, formatReport(report)).toBe(true);
    expect(report.scenarios.map((scenario) => scenario.overAtStep)).toEqual([
      ROUND_STEPS, ROUND_STEPS,
    ]);
  });
