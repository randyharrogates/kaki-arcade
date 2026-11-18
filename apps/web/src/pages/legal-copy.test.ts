import { expect, it } from 'vitest';
import { contrastRatio, THEMES } from '@kaki/ui';
import { legalCopy } from './legal-copy';
const privacy = legalCopy.privacy.sections.map(s => s.text).join(' ');
it('DATA-001 explains no account, email or personal details', () => {
  for (const text of ['do not need an account or email address', 'do not collect personal details']) expect(privacy).toContain(text);
});
it('DATA-002 explains local saves and clearing site data', () => {
  for (const text of ['Scores, stars, settings and recently seen questions', 'TV or host computer only', 'clear this site’s saved data']) expect(privacy).toContain(text);
});
it("DATA-003 DATA-004 describe D-180's eight kinds, timing and retention", () => {
  const counts = legalCopy.privacy.sections.find(section => section.title === 'Anonymous counts')?.text ?? '';
  for (const text of ['Only your TV or host computer sends counts, never the phones',
    'matches stopped by an error', 'games that fail to load',
    'cannot reach our server (under-counted, as counts go there too)',
    'lost connections (one per outage)', 'one of four smoothness bands',
    '17, 34 or 50 milliseconds, or slower', 'daily totals with no end date',
    'after results or when the page is hidden or closed', 'never during play',
    'no cookies, names, room codes, addresses, device details or the page you came from']) expect(counts).toContain(text);
});
it('DATA-004 keeps every section within 720 characters', () => {
  for (const page of Object.values(legalCopy)) for (const section of page.sections) expect(section.text.length).toBeLessThanOrEqual(720);
});
it('DATA-005 explains room safety, expiry and tab copies of nicknames', () => {
  for (const text of ['hard to guess', 'limit how often rooms', '10 minutes with nobody connected', '12 hours', 'Nicknames travel only between the devices in your room; our server never sees them.', 'browser tab', 'Closing the tab clears']) expect(privacy).toContain(text);
});
it('RZ-021 credits the adapted bank under the same linked licence and Singapore pack', () => {
  const copy = JSON.stringify(legalCopy.credits);
  for (const text of ['Open Trivia Database', 'https://opentdb.com', 'https://creativecommons.org/licenses/by-sa/4.0/', 'same licence (CC BY‑SA 4.0)', 'Singapore pack was written for Kaki Arcade']) expect(copy).toContain(text);
});
it('DATA-004 body and links have AA contrast over every panel paint', () => {
  const bg = THEMES.console.panel;
  for (const paint of [bg.from, bg.to, ...bg.treatment.paints]) expect(contrastRatio(bg.ink, paint)).toBeGreaterThanOrEqual(4.5);
});

it('DATA-005 expiry copy matches signal core constants without bundling signal code', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('apps/signal/src/core/room.ts', 'utf8');
  expect(source).toContain('export const IDLE_MS = 10 * 60 * 1000;');
  expect(source).toContain('export const ABSOLUTE_MS = 12 * 60 * 60 * 1000;');
  expect(privacy).toContain('10 minutes');
  expect(privacy).toContain('12 hours');
});

it('DATA-003 DATA-005 describe brief memory use without technical jargon or a no-storage promise', () => {
  expect(privacy.match(/keeping it only in memory/g)).toHaveLength(2);
  expect(privacy).not.toMatch(/hash|rate limit|identifier|never stor/i);
});
