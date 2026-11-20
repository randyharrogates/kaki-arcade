import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('RZ-031 only Right opt into the generic success pulse', () => {
  const css = readFileSync(new URL('../controller.css',import.meta.url),'utf8');
  const selectors = css.slice(css.lastIndexOf('/* RZ-031'));
  expect([...selectors.matchAll(/data-status-title='([^']+)'/g)].map(match => match[1])).toEqual(['Right']);
  expect(selectors).toContain('--ka-status-pulse: success');
});
