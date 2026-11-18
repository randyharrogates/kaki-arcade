import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { tvHelpSections } from './tv-help-copy';
describe('REL-003 TV help copy', () => {
  it('includes each setup step and qualified networking advice in British English', () => {
    const copy = JSON.stringify(tvHelpSections);
    for (const text of ['HDMI cable', 'input', 'Chrome, Edge or Safari', 'Control + Command + F', 'F11', 'Game Mode', 'picture settings', 'reduce delay', 'varies by TV brand', 'power and awake', 'browser app', 'address shown below', 'may be slower', 'may not open the game', 'If so', 'QR code', 'internet connection', 'If a phone cannot join, connect it to the same Wi-Fi as the big screen and scan again.']) expect(copy).toContain(text);
    expect(tvHelpSections.map(s => s.steps.length)).toEqual([4, 2, 2]);
    expect(copy).not.toMatch(/color|center|optimiz|guarantee|works well/i);
  });
  it('keeps copy behind the dynamic route', async () => {
    const main = await readFile(new URL('../main.tsx', import.meta.url), 'utf8');
    expect(main).toContain("import('./pages/tv-help-route')");
    expect(main).not.toContain('tv-help-copy');
  });
});
