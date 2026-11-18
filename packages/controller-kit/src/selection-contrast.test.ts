import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { contrastRatio, ON_COLOUR, PEEK_POKER_CARDS, THEMES, space } from '@kaki/ui';

const css = readFileSync(new URL('./layout.css', import.meta.url), 'utf8');

it('PP-005 D-164 D-166 a selected card back draws the card-back border colour, inset so it lies only on the card back', () => {
  expect(css).toContain(".ka-layout-card-back[data-state='selected'], .ka-private-panel .ka-layout-grid > .ka-layout-card-back[data-state='selected'] { outline-color: var(--ka-card-back-border); outline-offset: calc(-1 * var(--ka-space-13)); }");
  expect(PEEK_POKER_CARDS.back.border).toBe(ON_COLOUR);
  // The 5 px stroke sits at depths 8..13 px inside the card: it never reaches the gap or the theme's background.
  const width = space[5], offset = -space[13];
  expect(-offset - width).toBe(space[8]);
  expect(Math.max(0, width + offset)).toBe(0);
});

it.each(Object.values(THEMES))('PP-005 D-164 D-166 the selected outline reaches 3:1 against the card back and its stripe in $name', theme => {
  // The card back and its border colour are the same in every theme; the outline touches nothing else.
  for (const under of [PEEK_POKER_CARDS.back.colour, ...PEEK_POKER_CARDS.back.treatment.paints]) {
    expect(contrastRatio(PEEK_POKER_CARDS.back.border, under), `${theme.name}: outline against ${under}`).toBeGreaterThanOrEqual(3);
  }
});
