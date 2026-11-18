import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import { readFile } from 'node:fs/promises';
it('REL-003 fits the TV board and lets phones scroll without horizontal overflow', async () => {
  const fixture = fileURLToPath(new URL('./tv-help-fixture.tsx', import.meta.url));
  const bundle = await build({ configFile: false, build: { target: 'esnext', write: false, lib: { entry: fixture, formats: ['es'] } }, esbuild: { jsx: 'automatic', jsxImportSource: 'preact' }, plugins: [{
    name: 'tv-help-fixture', resolveId(id) { return id === fixture ? id : undefined; },
    load(id) { if (id === fixture) return `import { render } from 'preact'; import { TvHelp } from '${fileURLToPath(new URL('./tv-help-route.tsx', import.meta.url))}'; import { Landing } from '${fileURLToPath(new URL('../landing-route.tsx', import.meta.url))}'; render(<Landing/>, document.getElementById('app')); window.showHelp = () => render(<TvHelp/>, document.getElementById('app'));`; return undefined; },
  }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing help bundle');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route('http://127.0.0.1:6720/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="app"></div>' }));
    await page.goto('http://127.0.0.1:6720/tv-help');
    for (const url of ['../../../../packages/ui/tokens.css', '../style.css']) await page.addStyleTag({ content: await readFile(new URL(url, import.meta.url), 'utf8') });
    for (const item of output.output) if (item.type === 'asset' && item.fileName.endsWith('.css')) await page.addStyleTag({ content: String(item.source) });
    const chunk = output.output.find(item => item.type === 'chunk');
    if (!chunk) throw new Error('Missing help code');
    await page.addScriptTag({ type: 'module', content: chunk.code });
    expect(await page.getByRole('link', { name: 'Put this on your TV', exact: true }).getAttribute('href')).toBe('/tv-help');
    await page.evaluate('window.showHelp()');
    await page.locator('.tv-help h1').waitFor();
    expect(await page.title()).toBe('Put this on your TV · Kaki Arcade');
    expect(await page.locator('.tv-help-address').textContent()).toBe('Address: the address in this laptop’s address bar');
    expect(await page.locator('.tv-help-address').evaluate(el => getComputedStyle(el).fontFamily)).not.toMatch(/mono/i);
    // A real host shows the address itself, and only the host is set in the mono face.
    const hosted = await browser.newPage();
    await hosted.route('http://kaki.test/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="app"></div>' }));
    await hosted.goto('http://kaki.test/tv-help');
    for (const url of ['../../../../packages/ui/tokens.css', '../style.css']) await hosted.addStyleTag({ content: await readFile(new URL(url, import.meta.url), 'utf8') });
    for (const item of output.output) if (item.type === 'asset' && item.fileName.endsWith('.css')) await hosted.addStyleTag({ content: String(item.source) });
    await hosted.addScriptTag({ type: 'module', content: chunk.code });
    // An inline module may run after addScriptTag resolves; wait for its global.
    await hosted.waitForFunction(() => typeof Reflect.get(window, 'showHelp') === 'function');
    await hosted.evaluate('window.showHelp()');
    await hosted.locator('.tv-help h1').waitFor();
    expect(await hosted.locator('.tv-help-address').textContent()).toBe('Address: kaki.test');
    expect(await hosted.locator('.tv-help-address').evaluate(el => getComputedStyle(el).fontFamily)).not.toMatch(/mono/i);
    expect(await hosted.locator('.tv-help-host').evaluate(el => getComputedStyle(el).fontFamily)).toMatch(/mono/i);
    await hosted.close();
    for (const { width, height } of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 960, height: 540 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { document.documentElement.style.setProperty('--screen-scale', String(Math.min(innerWidth / 1920, innerHeight / 1080))); });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width >= 960 && height >= 540) expect(await page.locator('.tv-help').evaluate(el => {
        const board = el.getBoundingClientRect();
        return [...el.querySelectorAll('section')].every(node => node.getBoundingClientRect().bottom <= board.bottom - 89 * board.width / 1920) && el.scrollHeight <= el.clientHeight && [...el.querySelectorAll('li, h1, h2, a, p')].every(node => { const r = node.getBoundingClientRect(); return r.left >= board.left && r.right <= board.right && r.top >= board.top && r.bottom <= board.bottom; });
      })).toBe(true);
      else expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);
    }
  } finally { await browser.close(); }
}, 30000);
