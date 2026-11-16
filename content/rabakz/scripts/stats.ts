// pnpm --filter @kaki/content-rabakz stats [-- --check]
//
// Prints the bank's counts against the launch sizes of RZ-024. Reads the source files, so it
// needs no build first. --check exits 1 while the bank is short of any launch size.

import { bankStats, formatStats } from '../src/tools';
import { buildFromDisk, formatProblem, packagePaths } from './io';

const result = buildFromDisk(packagePaths());
if (result.output === null) {
  const errors = result.problems.filter((problem) => problem.severity === 'error');
  process.stdout.write(`${errors.map(formatProblem).join('\n')}\nThe bank does not validate.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(formatStats(result.output.index));
  // Warnings do not fail the build, so this is where they stay in view.
  const warnings = result.problems.filter((problem) => problem.severity === 'warning');
  process.stdout.write(
    `\nWarnings: ${String(warnings.length)}\n${warnings.map((problem) => `  ${formatProblem(problem)}\n`).join('')}`,
  );
  if (process.argv.includes('--check') && !bankStats(result.output.index).met) {
    process.exitCode = 1;
  }
}
