import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { phoneView } from './phone';

it('NFR-A11Y keeps the persistent phone announcement clipped and outside layout', () => {
  const css = readFileSync(new URL('./phone.css', import.meta.url), 'utf8');
  const rule = /\.phone-live\s*\{([^}]+)\}/.exec(css)?.[1] ?? '';
  for (const declaration of ['position: absolute', 'width: 1px', 'height: 1px', 'padding: 0', 'border: 0', 'overflow: hidden', 'white-space: nowrap', 'clip: rect(0, 0, 0, 0)', 'clip-path: inset(50%)']) expect(rule).toContain(declaration);
  expect(rule).not.toMatch(/display:\s*none|visibility:\s*hidden/);
  const route = readFileSync(new URL('./phone-route.tsx', import.meta.url), 'utf8');
  expect(route.match(/class="phone-live"/g)).toHaveLength(1);
  expect(route).toContain('role="status" aria-live="polite" aria-atomic="true">{`${view.title} ${view.detail}`}');
});

it('PLAT-004 renders the duplicate-name notice once in the visible message tree', () => {
  const view = phoneView('name-taken', { notice: 'Name taken. The room added a number to your name.' });
  const route = readFileSync(new URL('./phone-route.tsx', import.meta.url), 'utf8');
  const message = /<div class="phone-status">(.*?)<\/div>/.exec(route)?.[1] ?? '';
  expect(message).toBe('<h2>{view.title}</h2><p>{view.detail}</p>');
  expect(route).not.toContain('{view.notice}');
  const visible = message.replace('{view.title}', view.title).replace('{view.detail}', view.detail).replace(/<[^>]+>/g, ' ').trim().replace(/\s+/g, ' ');
  expect(visible).toBe('Name taken The room has added a number to your name.');
  expect(visible.match(/number to your name/g)).toHaveLength(1);
  expect(visible).not.toContain(view.notice);
});
