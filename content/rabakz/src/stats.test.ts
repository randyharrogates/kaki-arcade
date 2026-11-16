import { describe, expect, it } from 'vitest';
import { parseBlocklist } from './blocklist';
import { buildBank } from './build';
import type { BankIndex, Counts } from './schema';
import { bankStats, formatStats } from './stats';

function counts(total: number, singapore: number, picture: number): Counts {
  return {
    total,
    byDifficulty: { easy: total, medium: 0, hard: 0 },
    byRegion: { general: total - singapore, singapore },
    byType: { 'multiple-choice': total - picture, 'true-false': 0, picture },
    byDifficultyAndRegion: {
      easy: { general: total - singapore, singapore },
      medium: { general: 0, singapore: 0 },
      hard: { general: 0, singapore: 0 },
    },
    picturesByDifficultyAndRegion: {
      easy: { general: picture, singapore: 0 },
      medium: { general: 0, singapore: 0 },
      hard: { general: 0, singapore: 0 },
    },
  };
}

function index(total: number, singapore: number, picture: number): BankIndex {
  const all = counts(total, singapore, picture);
  return {
    format: 1,
    totals: all,
    answers: { trueFalse: { true: 4, false: 1 }, sourcePositions: [2, 6, 5, 2] },
    categories: [
      {
        id: 'everything',
        title: 'Everything',
        file: 'everything.abc.json',
        hash: 'abc',
        bytes: 500_000,
        counts: all,
        pictures: picture === 0 ? [] : [{ file: 'a.jpg', bytes: 90_000 }, { file: 'b.jpg', bytes: 120_000 }],
      },
    ],
    credits: [{ dataset: 'Open Trivia Database', licence: 'CC BY-SA 4.0', questions: total - singapore }],
    originalQuestions: singapore,
  };
}

describe('bankStats', () => {
  it('reports how far short a small bank is of each RZ-024 launch size', () => {
    const stats = bankStats(index(20, 7, 0));
    expect(stats.met).toBe(false);
    expect(stats.targets).toEqual([
      { label: 'Questions in total', have: 20, target: 1500, short: 1480 },
      { label: 'Singapore pack', have: 7, target: 200, short: 193 },
      { label: 'Picture questions', have: 0, target: 60, short: 60 },
    ]);
    expect(stats.chunkBytes).toBe(500_000);
  });

  it('is met at exactly the launch sizes and not one short', () => {
    expect(bankStats(index(1500, 200, 60)).met).toBe(true);
    expect(bankStats(index(1499, 200, 60)).met).toBe(false);
    expect(bankStats(index(1500, 199, 60)).met).toBe(false);
    expect(bankStats(index(1500, 200, 59)).met).toBe(false);
  });
});

describe('formatStats', () => {
  it('prints the table, the credits, the launch sizes and the budget share', () => {
    const text = formatStats(index(20, 7, 0));
    expect(text).toContain('everything');
    expect(text).toContain('Open Trivia Database (CC BY-SA 4.0): 13');
    expect(text).toContain('Questions in total       20 of 1500  short by 1480');
    expect(text).toContain('Picture questions         0 of 60    short by 60');
    expect(text).toContain('500000 bytes uncompressed, 25% of the 2 MB match budget');
    expect(text).toContain('The bank is not yet at launch size.');
    expect(text).toContain(
      'True-or-false answers: True 4, False 1 (shown in the fixed order True, False)',
    );
    expect(text).toContain(
      'Four-option answers by source position: 2 / 6 / 5 / 2 (not a fault: the game shuffles these)',
    );
    expect(text).toContain('Pictures: 0 file(s), 0 bytes, largest 0');
    expect(formatStats(index(1500, 200, 60))).toContain(
      'Pictures: 2 file(s), 210000 bytes, largest 120000',
    );
    expect(formatStats(index(1500, 200, 60))).toContain('Every launch size is met.');
  });

  it('prints a real build', () => {
    const file = {
      name: 'history.json',
      text: JSON.stringify({
        category: 'history',
        title: 'History',
        questions: [
          {
            id: 'his-1',
            type: 'true-false',
            prompt: 'The Berlin Wall came down in 1989.',
            options: ['True', 'False'],
            answer: 'True',
            difficulty: 'medium',
            region: 'general',
            source: { kind: 'original', note: 'Check: any history of Europe.' },
          },
        ],
      }),
    };
    const result = buildBank({
      files: [file],
      blocklist: parseBlocklist(''),
      pictures: new Map(),
      hash: () => 'h',
    });
    expect(result.output).not.toBeNull();
    if (result.output !== null) {
      expect(formatStats(result.output.index)).toMatch(/history +0 +1 +0 +1 +0 +0 +1\n/);
    }
  });
});
