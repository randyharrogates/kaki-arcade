import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const tokens = readFileSync(new URL('../../../packages/ui/tokens.css', import.meta.url), 'utf8');
const token = (name: string) => Number(new RegExp(`${name}:\\s*([\\d.]+)`).exec(tokens)?.[1]);
// Read the production declarations, including later overrides, rather than copying the gaps.
function rule(selector: string) {
  const values: Record<string, string> = {};
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectors?.split(',').some(item => item.trim() === selector)) continue;
    for (const declaration of body?.split(';') ?? []) {
      const [name, value] = declaration.split(':');
      if (name && value) values[name.trim()] = value.trim();
    }
  }
  return values;
}

it('PLAT-024 keeps the main copy band and heading beside the count and hints', () => {
  expect(rule('.picker-screen header')['min-height']).toBe('var(--picker-copy-band)');
  expect(rule('.picker-screen header > .overlap')).toMatchObject({ 'grid-column': '1', 'grid-row': '1', height: 'var(--picker-copy-band)' });
  expect(rule('.picker-screen header .incoming')['padding-top']).toBe('var(--ka-space-21)');
  expect(rule('.picker-screen header > .overlap').top).toBeUndefined();
  expect(rule('.picker-screen header h1')['white-space']).toBe('nowrap');
  expect(rule('.picker-header-side')).toMatchObject({ 'grid-column': '2', 'grid-row': '1', 'justify-items': 'end' });
  expect(rule('.picker-screen .host-hints')['line-height']).toBe('var(--ka-line-body)');
  expect(rule('.lobby header')['flex-wrap']).toBe('nowrap');
  expect(rule('.team-screen footer')['align-items']).toBe('baseline');
  // Round 11 reserves another 21 px for the heading inset. D-165 addendum: 21 px between heading and subtitle so the 89 px face's descent never meets the subtitle; the stage sits 34 px lower than main.
  const band = token('--ka-type-89') * token('--ka-line-display') + token('--ka-type-34') * token('--ka-line-body') + token('--ka-space-21') * 2;
  expect(55 + band + token('--ka-space-34')).toBeCloseTo(264.2, 1);
});
