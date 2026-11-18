import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import preact from '@preact/preset-vite';

it('REL-006 timeout status and whole retry target fit both portrait screens', async () => {
  const path = (name: string) => fileURLToPath(new URL(name, import.meta.url));
  const entry = path('./phone-timeout-fixture.tsx');
  const bundle = await build({ configFile: false, define: { 'import.meta.env.DEV': 'false' }, plugins: [preact(), {
    name: 'timeout-phone', resolveId: id => id === entry ? id : undefined,
    load(id) {
      if (id === entry) return `import {render} from 'preact'; import {PhonePage} from '${path('./phone-route.tsx')}'; render(<PhonePage/>,document.body);`;
      if (id.endsWith('/phone-demo.ts')) return 'export const phoneDemo = () => null;';
      if (id.endsWith('/phone-browser.ts')) return `import {Clock,MemoryStorage} from '${path('./testing.fixture.ts')}';
        const clock = new Clock(); window.advance = ms => clock.advance(ms);
        export const phoneBrowserDependencies = () => ({clock,storage:new MemoryStorage(),dial(){return {stop(){}}}});`;
      return undefined;
    },
  }], build: { write: false, lib: { entry, formats: ['es'] }, rolldownOptions: { output: { codeSplitting: false } } } });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing bundle');
  const chunk = output.output.find(item => item.type === 'chunk');
  if (!chunk) throw new Error('Missing script');
  const browser = await chromium.launch();
  try {
    for (const [width, height] of [[390, 844], [375, 667]] as const) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      for (const asset of output.output) if (asset.type === 'asset' && asset.fileName.endsWith('.css')) await page.addStyleTag({ content: String(asset.source) });
      for (const name of ['../../../packages/ui/tokens.css', './style.css']) await page.addStyleTag({ content: await readFile(path(name), 'utf8') });
      await page.addScriptTag({ type: 'module', content: chunk.code });
      await page.getByLabel('Room code', { exact: true }).fill('BCDF2345');
      await page.getByLabel('Your name', { exact: true }).fill('Fern');
      await page.getByRole('button', { name: 'Join', exact: true }).click();
      const advance = async (ms: number) => page.evaluate(ms => { (window as unknown as { advance(ms: number): void }).advance(ms); }, ms);
      await advance(14900); expect(await page.getByRole('heading', { name: 'Joining the room…' }).isVisible()).toBe(true);
      await advance(100);
      const retry = page.getByRole('button', { name: 'Try again', exact: true }); await retry.waitFor();
      expect(await page.getByRole('heading', { name: 'This phone could not connect to the big screen.', exact: true }).isVisible()).toBe(true);
      expect(await page.getByText('Connect it to the same Wi-Fi as the big screen and scan again.', { exact: true }).isVisible()).toBe(true);
      const box = await retry.boundingBox(); expect(box && box.height >= 55 && box.y + box.height <= height).toBe(true);
      expect(await page.locator('.phone-page').evaluate(el => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
      if (!box) throw new Error('Missing retry target');
      await retry.click({ position: { x: box.width / 2, y: box.height - 5 } });
      await page.getByRole('heading', { name: 'Joining the room…' }).waitFor();
      await page.close();
    }
  } finally { await browser.close(); }
}, 60000);
