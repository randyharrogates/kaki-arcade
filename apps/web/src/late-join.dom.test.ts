import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import preact from '@preact/preset-vite';

it('PLAT-008 held phone renders the lobby promise and Leave action in the DOM', async () => {
  const route = fileURLToPath(new URL('./phone-route.tsx', import.meta.url));
  const entry = fileURLToPath(new URL('./late-join-dom-fixture.tsx', import.meta.url));
  const bundle = await build({ configFile: false, define: { 'import.meta.env.DEV': 'false' }, plugins: [preact(), {
    name: 'held-phone',
    resolveId: id => id === entry ? id : undefined,
    load(id) {
      if (id === entry) return `import {render} from 'preact'; import {PhonePage} from '${route}'; render(<PhonePage/>, document.body);`;
      if (id.endsWith('/phone-browser.ts')) return `export const phoneBrowserDependencies = () => ({
        storage: {getItem(){return null;}, setItem(){}, removeItem(){}},
        clock: {now:()=>Date.now(),schedule:(fn,ms)=>setTimeout(fn,ms),cancel:id=>clearTimeout(id)},
        dial(options){options.onPeer({sendPhone(){options.onControl({v:1,t:'refused',reason:'game-running'});return true;}}); options.onState('control-open');return {stop(){}};}
      });`;
      return undefined;
    },
  }], build: { write: false, minify: false, lib: { entry, formats: ['es'] }, rolldownOptions: { output: { codeSplitting: false } } } });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw Error('Missing bundle');
  const script = output.output.find(c => c.type === 'chunk');
  if (!script) throw Error('Missing script');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    await page.addScriptTag({ type: 'module', content: script.code });
    await page.getByLabel('Room code', { exact: true }).fill('BCDF2345');
    await page.getByLabel('Your name', { exact: true }).fill('Fern');
    await page.getByRole('button', { name: 'Join', exact: true }).click();
    await page.getByRole('heading', { name: 'Waiting for the lobby', exact: true }).waitFor();
    expect(await page.getByText('You can join when the current game ends.', { exact: true }).count()).toBe(1);
    expect(await page.getByRole('button', { name: 'Leave', exact: true }).count()).toBe(1);
    expect(await page.locator('.phone-id').count()).toBe(0);
  } finally { await browser.close(); }
});
