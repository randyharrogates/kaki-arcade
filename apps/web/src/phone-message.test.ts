import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { phoneView } from './phone';

it('NFR-A11Y keeps the persistent phone announcement clipped and outside layout', () => {
  const css = readFileSync(new URL('./phone.css', import.meta.url), 'utf8');
  const rule = /\.phone-live\s*\{([^}]+)\}/.exec(css)?.[1] ?? '';
  for (const declaration of ['position: absolute', 'width: 1px', 'height: 1px', 'padding: 0', 'border: 0', 'overflow: hidden', 'white-space: nowrap', 'clip: rect(0, 0, 0, 0)', 'clip-path: inset(50%)']) expect(rule).toContain(declaration);
  expect(rule).not.toMatch(/display:\s*none|visibility:\s*hidden/);
  const route = readFileSync(new URL('./phone-route.tsx', import.meta.url), 'utf8');
  expect(route).toContain('const announcement = pickerAnnouncement(view)');
  expect(route.match(/class="phone-live"/g)).toHaveLength(1);
  expect(route).toContain('role="status" aria-live="polite" aria-atomic="true">{announcement}');
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

it('NFR-DES seated layouts reserve intrinsic header space and never truncate identity', () => {
  const css = readFileSync(new URL('./phone.css', import.meta.url), 'utf8');
  const rules = (selector: string): string => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1]?.trim() === selector).map(match => match[2]).join(';');
  expect(rules('.phone-id strong')).not.toMatch(/overflow:\s*hidden|text-overflow:\s*ellipsis|white-space:\s*nowrap/);
  expect(rules('.phone-id strong')).toContain('overflow-wrap: anywhere');
  expect(rules('.phone-page[data-seated="true"] > .overlap')).toContain('min-height: 0');
  expect(css).not.toMatch(/min-height:\s*calc\(100%\s*-/);
  const leave = rules('.phone-page button.phone-leave');
  for (const dimension of ['min-width', 'min-height']) expect(leave).toContain(`${dimension}: var(--ka-space-55)`);
  const route = readFileSync(new URL('./phone-route.tsx', import.meta.url), 'utf8');
  const header = /<header class="phone-id">(.*?)<\/header>/.exec(route)?.[1] ?? '';
  expect(header.match(/>Leave<\/button>/g)).toHaveLength(1);
  expect(header).not.toContain("picker.screen");
  expect(route).toContain('role="img" aria-label={view.connected');
});
