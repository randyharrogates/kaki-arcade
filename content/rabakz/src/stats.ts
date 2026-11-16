// The bank against its launch sizes (RZ-024) and the match budget (RZ-020). Pure.

import type { BankIndex } from './schema';
import { BANK_TARGETS, DIFFICULTIES, MATCH_TRANSFER_BUDGET_BYTES, REGIONS } from './schema';

export interface TargetLine {
  readonly label: string;
  readonly have: number;
  readonly target: number;
  /** 0 when the target is met. */
  readonly short: number;
}

export interface BankStats {
  readonly targets: readonly TargetLine[];
  /** True when every RZ-024 target is met. */
  readonly met: boolean;
  /** All chunk files together: what a Mixed-categories match loads before any picture. */
  readonly chunkBytes: number;
}

export function bankStats(index: BankIndex): BankStats {
  const line = (label: string, have: number, target: number): TargetLine => ({
    label,
    have,
    target,
    short: Math.max(0, target - have),
  });
  const targets = [
    line('Questions in total', index.totals.total, BANK_TARGETS.total),
    line('Singapore pack', index.totals.byRegion.singapore, BANK_TARGETS.singapore),
    line('Picture questions', index.totals.byType.picture, BANK_TARGETS.picture),
  ];
  return {
    targets,
    met: targets.every((target) => target.short === 0),
    chunkBytes: index.categories.reduce((sum, category) => sum + category.bytes, 0),
  };
}

/** The report `pnpm --filter @kaki/content-rabakz stats` prints. */
export function formatStats(index: BankIndex): string {
  const stats = bankStats(index);
  const pad = (text: string, width: number): string => text.padEnd(width);
  const num = (value: number, width = 7): string => String(value).padStart(width);
  const titleWidth = Math.max(24, ...index.categories.map((category) => category.id.length)) + 2;
  const lines: string[] = ['Rabakz question bank', ''];

  lines.push(
    `${pad('Category', titleWidth)}${[...DIFFICULTIES, ...REGIONS, 'picture', 'total'].map((head) => head.padStart(11)).join('')}`,
  );
  const row = (name: string, counts: BankIndex['totals']): string =>
    pad(name, titleWidth) +
    [
      ...DIFFICULTIES.map((difficulty) => counts.byDifficulty[difficulty]),
      ...REGIONS.map((region) => counts.byRegion[region]),
      counts.byType.picture,
      counts.total,
    ]
      .map((value) => num(value, 11))
      .join('');
  for (const category of index.categories) lines.push(row(category.id, category.counts));
  lines.push(row('All', index.totals), '');

  lines.push(
    `By type: multiple choice ${String(index.totals.byType['multiple-choice'])}, true or false ${String(index.totals.byType['true-false'])}, picture ${String(index.totals.byType.picture)}`,
  );
  lines.push(
    `Written for Kaki Arcade: ${String(index.originalQuestions)}. From datasets: ${String(index.totals.total - index.originalQuestions)}.`,
  );
  for (const credit of index.credits) {
    lines.push(`  ${credit.dataset} (${credit.licence}): ${String(credit.questions)}`);
  }
  const { trueFalse, sourcePositions } = index.answers;
  lines.push(
    '',
    `True-or-false answers: True ${String(trueFalse.true)}, False ${String(trueFalse.false)} (shown in the fixed order True, False)`,
    `Four-option answers by source position: ${sourcePositions.map(String).join(' / ')} (not a fault: the game shuffles these)`,
  );
  const pictureFiles = index.categories.flatMap((category) => category.pictures);
  const pictureBytes = pictureFiles.reduce((sum, picture) => sum + picture.bytes, 0);
  const largest = pictureFiles.reduce((most, picture) => Math.max(most, picture.bytes), 0);
  lines.push(
    `Pictures: ${String(pictureFiles.length)} file(s), ${String(pictureBytes)} bytes, largest ${String(largest)}`,
  );
  lines.push('', 'Launch sizes (RZ-024)');
  for (const target of stats.targets) {
    const verdict = target.short === 0 ? 'met' : `short by ${String(target.short)}`;
    lines.push(
      `  ${pad(target.label, 20)}${num(target.have)} of ${String(target.target).padEnd(6)}${verdict}`,
    );
  }
  const share = Math.round((stats.chunkBytes / MATCH_TRANSFER_BUDGET_BYTES) * 100);
  lines.push(
    '',
    `All chunks together: ${String(stats.chunkBytes)} bytes uncompressed, ${String(share)}% of the 2 MB match budget (RZ-020) before pictures.`,
    stats.met ? 'Every launch size is met.' : 'The bank is not yet at launch size.',
  );
  return `${lines.join('\n')}\n`;
}
