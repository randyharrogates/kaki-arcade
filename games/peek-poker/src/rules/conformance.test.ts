import * as fs from 'node:fs';
import { expect, it } from 'vitest';
import { readSources, runConformance, formatReport } from '@kaki/platform/kit';
import { peekPoker } from './game';

it('PP-001 PP-005 PP-012 PP-013 conformance at minimum and maximum counts',
  { timeout: 120000 }, () => {
    const report = runConformance(peekPoker, [
      { name: 'solo three rounds', players: 1, settings: { rounds: 3 },
        steps: 9000 },
      { name: 'five rounds', players: 4, settings: { rounds: 5 },
        steps: 14000 },
      { name: 'eight seven rounds', players: 8, settings: { rounds: 7 },
        steps: 19000 },
    ], { sources: readSources(fs, new URL('.', import.meta.url).pathname)
      .filter((source) => !source.path.endsWith('.test.ts')) });
    if (process.env.KAKI_PEEK_EVIDENCE === '1') {
      const output = new URL(
        '../../../../uat/evidence/P-01-peek-poker-rules/kit.txt', import.meta.url,
      );
      fs.writeFileSync(output, formatReport(report) + '\n');
    }
    expect(report.ok, formatReport(report)).toBe(true);
  });
