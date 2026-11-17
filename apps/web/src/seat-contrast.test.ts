import { expect, it } from 'vitest';
import { THEMES, PLAYER_COLOURS, SEAT_NUMERAL, contrastRatio, tvType, GHOST_OPACITY } from '@kaki/ui';
it('NFR-A11Y non-live and held seats retain large-text contrast at full strength', () => {
  const panel = THEMES.console.panel;
  for (const paint of [panel.from, panel.to, ...panel.treatment.paints]) {
    expect(contrastRatio(panel.secondary, paint)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(SEAT_NUMERAL, paint)).toBeGreaterThanOrEqual(3);
  }
  for (const seat of PLAYER_COLOURS) expect(contrastRatio(SEAT_NUMERAL, seat.colour)).toBeGreaterThanOrEqual(3);
  expect(tvType.roomCode).toBe(233); expect(GHOST_OPACITY).toBe(0.08);
});

it('CTRL-008 phone heading and small helper text contrast against every join panel paint', () => {
  const panel = THEMES.console.panel;
  for (const paint of [panel.from, panel.to, ...panel.treatment.paints]) {
    expect(contrastRatio(panel.ink, paint)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(panel.secondary, paint)).toBeGreaterThanOrEqual(4.5);
  }
});

it('PLAT-020 disabled Select and Start secondary ink contrasts on both gradient ends', () => {
  const panel = THEMES.console.panel;
  for (const paint of [panel.from, panel.to])
    expect(contrastRatio(panel.secondary, paint)).toBeGreaterThanOrEqual(4.5);
});
