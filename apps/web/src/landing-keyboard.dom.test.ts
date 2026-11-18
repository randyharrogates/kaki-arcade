import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import preact from '@preact/preset-vite';

it('REL-002 landing supports arrows, native Tab and Enter, Space and editable focus', async () => {
  const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));
  const fixture = source('./landing-keyboard-fixture.tsx');
  const built = await build({ configFile: false, plugins: [preact(), {
    name: 'landing-keyboard-fixture', resolveId: id => id === fixture ? id : undefined,
    load: id => id === fixture ? `import { render } from 'preact';
      import { Landing } from '${source('./landing-route.tsx')}';
      render(<Landing/>, document.getElementById('app'));
      document.addEventListener('click', event => {
        const link = event.target.closest('a');
        if (link) { event.preventDefault(); document.body.dataset.activated = link.getAttribute('href'); }
      });` : undefined,
  }], build: { write: false, target: 'esnext', minify: false, lib: { entry: fixture, formats: ['es'] }, rolldownOptions: { output: { codeSplitting: false } } } });
  const output = Array.isArray(built) ? built[0] : built;
  if (!output || !('output' in output)) throw new Error('Missing fixture');
  const chunk = output.output.find(item => item.type === 'chunk');
  if (!chunk) throw new Error('Missing fixture code');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.setContent('<div id="app"></div>');
    await page.addScriptTag({ type: 'module', content: chunk.code });
    const focused = () => page.evaluate(() => document.activeElement?.textContent);
    await expect.poll(focused).toBe('Host a game');
    const names = ['Host a game', 'Put this on your TV', 'Privacy', 'Credits'];
    const recovered = await page.evaluate(() => {
      (document.activeElement as HTMLElement).blur();
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
      document.body.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(recovered).toBe(true);
    expect(await focused()).toBe('Host a game');
    await page.evaluate(() => { (document.activeElement as HTMLElement).blur(); });
    await page.keyboard.press('Space');
    expect(await page.locator('body').getAttribute('data-activated')).toBe('/host');
    const guarded = await page.evaluate(() => {
      const host = document.querySelector<HTMLAnchorElement>('.landing-screen a');
      host?.focus();
      delete document.body.dataset.activated;
      return ['altKey', 'ctrlKey', 'metaKey'].every(modifier =>
        ['ArrowLeft', 'ArrowRight', ' '].every(key => {
          const event = new KeyboardEvent('keydown', { key, [modifier]: true, bubbles: true, cancelable: true });
          host?.dispatchEvent(event);
          return !event.defaultPrevented && document.activeElement === host && !document.body.dataset.activated;
        })) && (() => {
          const event = new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true, cancelable: true });
          host?.dispatchEvent(event);
          return !event.defaultPrevented && !document.body.dataset.activated;
        })();
    });
    expect(guarded).toBe(true);
    for (const key of ['ArrowDown', 'ArrowRight']) {
      await page.getByRole('link', { name: 'Host a game', exact: true }).focus();
      for (const name of names.slice(1)) { await page.keyboard.press(key); expect(await focused()).toBe(name); }
      await page.keyboard.press(key); expect(await focused()).toBe('Credits');
    }
    for (const key of ['ArrowUp', 'ArrowLeft']) {
      await page.getByRole('link', { name: 'Credits', exact: true }).focus();
      for (const name of names.slice(0, -1).reverse()) { await page.keyboard.press(key); expect(await focused()).toBe(name); }
      await page.keyboard.press(key); expect(await focused()).toBe('Host a game');
    }
    for (const name of names.slice(1)) { await page.keyboard.press('Tab'); expect(await focused()).toBe(name); }
    for (const name of names.slice(0, -1).reverse()) { await page.keyboard.press('Shift+Tab'); expect(await focused()).toBe(name); }
    for (const link of await page.locator('.landing-screen a').all()) {
      await link.focus();
      for (const key of ['Enter', 'Space']) {
        await page.evaluate(() => { delete document.body.dataset.activated; });
        await page.keyboard.press(key);
        expect(await page.locator('body').getAttribute('data-activated')).toBe(await link.getAttribute('href'));
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('about:blank');
    await page.setContent('<div id="app"></div>');
    await page.addScriptTag({ type: 'module', content: chunk.code });
    await page.waitForSelector('.landing-screen');
    // Let the mount effect run before checking that phone load leaves focus alone.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('Host a game');
    const untouched = await page.evaluate(() => {
      const input = document.createElement('input'); document.querySelector('main')?.append(input); input.focus();
      return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].every(key => {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        input.dispatchEvent(event);
        return !event.defaultPrevented && document.activeElement === input;
      });
    });
    expect(untouched).toBe(true);
  } finally { await browser.close(); }
});
