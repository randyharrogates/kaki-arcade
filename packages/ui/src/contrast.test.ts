import { describe, expect, it } from 'vitest';
import { allContrastPairs, blend, CONTRAST_MINIMUM, contrastRatio, luminance, measure } from './contrast';
import { PLAYER_COLOURS, SEAT_NUMERAL } from './colour';
import { PEEK_POKER_CARDS, THEMES } from './themes';

/**
 * Decided colour pairs that measure under the minimum today. The colours are Randy's
 * (DESIGN §4 is locked), so they are not changed here: each is listed under After D-056 in
 * docs/slices/F-06-design-tokens.md. This list is exact. A pair that
 * is not on it fails the test, and so does a pair on it that no longer fails or whose
 * measured ratio has moved, so it cannot quietly grow or go stale.
 */
const KNOWN_FAILURES: Record<string, number> = {
  'console: secondary on background (treatment #D6CBBB)': 3.73,
  'console: secondary on background (treatment #C7B6A2)': 3.03,
  'console: secondary on background (treatment #B9C6B6)': 3.36,
  'tabao-rush: secondary on background (treatment #D6CBBB)': 3.73,
  'tabao-rush: secondary on background (treatment #C7B6A2)': 3.03,
  'tabao-rush: secondary on background (treatment #B9C6B6)': 3.36,
  'seat-3 fill on marble': 1.57,
  'seat-4 fill on marble': 2.53,
  'seat-6 fill on marble': 2.30,
  'seat-7 fill on marble': 2.48,
  'seat-8 fill on marble': 2.95,
};

describe('WCAG contrast', () => {
  it('computes dark numeral contrast on every seat colour', () => {
    const pairs = allContrastPairs();
    const failures: Record<string, number> = {};
    for (const player of PLAYER_COLOURS) {
      const pair = pairs.find((p) => p.id === `numeral on ${player.token}`);
      expect(pair).toMatchObject({ text: SEAT_NUMERAL, background: player.colour, use: 'large' });
      if (pair === undefined) throw new Error('Missing seat contrast pair');
      const result = measure(pair);
      expect(result.ratio).toBe(contrastRatio(SEAT_NUMERAL, player.colour));
      if (!result.pass) failures[result.id] = Math.round(result.ratio * 100) / 100;
    }
    expect(failures).toEqual({});
  });

  it('computes the standard ratios', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#FFFFFF')).toBeCloseTo(1, 10);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 10);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 10);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(CONTRAST_MINIMUM).toEqual({ body: 4.5, large: 3 });
  });

  it('records treatment colours as they end up on screen', () => {
    expect(THEMES['peek-poker'].background.treatment.paints).toEqual([blend('#FFFFFF', 0.04, '#1D5741')]);
    expect(PEEK_POKER_CARDS.back.treatment.paints).toEqual([blend('#FFFFFF', 0.16, '#B5371F')]);
  });

  it('declares every pair: ink and secondary on background and panel, accent, chip, players, teams, shapes, suits', () => {
    const ids = allContrastPairs().map((pair) => pair.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const theme of ['console', 'rabakz', 'peek-poker', 'tabao-rush']) {
      for (const what of [
        'ink on background',
        'secondary on background',
        'ink on panel',
        'secondary on panel',
        'accent text on accent fill',
        'chip text on chip',
        'stick outline on background',
        'highlight on background',
      ]) {
        expect(ids).toContain(`${theme}: ${what}`);
      }
    }
    for (let seat = 1; seat <= 8; seat += 1) {
      expect(ids).toContain(`numeral on seat-${String(seat)}`);
      expect(ids).toContain(`seat-${String(seat)} fill on marble`);
    }
    for (const name of ['team-red', 'team-blue', 'shape-cross', 'shape-circle', 'shape-square', 'shape-triangle']) {
      expect(ids).toContain(`white on ${name}`);
    }
  });

  it('meets 4.5 : 1 for body text and 3 : 1 for large text and symbols, except the listed decided pairs', () => {
    const failures: Record<string, number> = {};
    for (const result of allContrastPairs().map(measure)) {
      if (!result.pass) failures[result.id] = Math.round(result.ratio * 100) / 100;
    }
    expect(failures).toEqual(KNOWN_FAILURES);
  });
});
