import { sessionRegistrations } from './game-registry';
import { expect, it } from 'vitest';
import { THEMES, contrastRatio } from '@kaki/ui';
import type { VNode } from 'preact';
import { GameFinalHint } from './game-final-hint';

const hintText = (props: Parameters<typeof GameFinalHint>[0]) => GameFinalHint(props).props.children as VNode<{ children: string; style: { color: string; fontSize: string } }>;

it('PLAT-024 Rabakz final hint uses theme secondary text at TV size with contrast over plum and dots', () => {
  const hint = hintText({ theme: THEMES.rabakz, keyboard: false });
  expect(hint.props.children).toBe('The leader continues on their phone');
  expect(hint.props.style).toEqual({ color: THEMES.rabakz.background.secondary, fontSize: 'var(--ka-type-34)' });
  const background = THEMES.rabakz.background;
  for (const paint of [background.colour, ...background.treatment.paints]) {
    expect(contrastRatio(hint.props.style.color, paint)).toBeGreaterThanOrEqual(4.5);
  }
  expect(hintText({ theme: THEMES.rabakz, keyboard: true }).props.children).toBe('Enter: Continue');
});

it('PLAT-024 registry carries the Tabao Rush final-hint theme', () => {
  expect(sessionRegistrations['tabao-rush']?.finalHintTheme).toBe(THEMES['tabao-rush']);
  expect(hintText({ theme: sessionRegistrations['tabao-rush']?.finalHintTheme, keyboard: false }).props.style.color).toBe(THEMES['tabao-rush'].background.secondary);
});
