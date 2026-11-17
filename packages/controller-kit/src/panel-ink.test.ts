import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = ['layout.css', 'buttons.css', 'stick.css', 'shell.css']
  .map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
function body(selector: string): string {
  return rules.filter(([, selectors]) => selectors?.trim().split(',').map(s => s.trim()).includes(selector))
    .map(([, , declarations]) => declarations).join(' ');
}
it.each(['.ka-layout-target', '.ka-kit-button', '.ka-layout-card', '.ka-layout-card-face', '.ka-private-grid-label', '.ka-stick-base', '.ka-stick-knob', '.ka-controller-header'])('CTRL-003 pins panel ink on %s (D-161)', selector => {
  expect(body(selector)).toMatch(/color:\s*var\(--ka-panel-ink\)/);
});
it('CTRL-003 keeps disabled ink on cards and their labels, and on-colour ink on shaped targets', () => {
  for (const selector of [".ka-layout-target[aria-disabled='true']", ".ka-layout-card[data-state='disabled']", ".ka-layout-card[data-state='disabled'] .ka-layout-card-face", ".ka-layout-card[data-state='disabled'] .ka-private-grid-label", ".ka-layout-target[aria-disabled='true'] .ka-layout-card-face"]) {
    expect(body(selector)).toMatch(/color:\s*var\(--ka-disabled-ink\)/);
  }
  expect(body(".ka-layout-target[class*='ka-kit-']")).toMatch(/color:\s*var\(--ka-on-colour\)/);
});
