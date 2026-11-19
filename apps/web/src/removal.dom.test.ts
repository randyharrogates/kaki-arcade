import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import preact from '@preact/preset-vite';
it('PLAT-011 confirms on the same card, cancels, supports keyboard, and renders the removed phone without controls', async () => {
  const fixture = fileURLToPath(new URL('./removal-fixture.tsx', import.meta.url));
  const remove = fileURLToPath(new URL('./remove-player.tsx', import.meta.url));
  const route = fileURLToPath(new URL('./phone-route.tsx', import.meta.url));
  const bundle = await build({ configFile: false, define: { 'import.meta.env.DEV': 'false' }, plugins: [preact(), {
    name: 'removal-fixture', resolveId: id => id === fixture ? id : undefined,
    load(id) {
      if (id === fixture) return `import {render} from 'preact'; import {RemovePlayer} from '${remove}'; import {PhonePage} from '${route}'; render(<article><RemovePlayer name="Fern" remove={() => {document.body.dataset.removed='true';}}/></article>, document.body); window.removedScreen=()=>render(<PhonePage/>,document.body);`;
      if (id.endsWith('/phone-browser.ts')) return 'export const phoneBrowserDependencies=()=>({});';
      if (id.endsWith('/phone.ts')) return `const view={state:'removed',title:'You were removed from this game',detail:"You can't rejoin this room.",action:'Join another room',seat:null,connected:false}; export const phoneView=()=>view; export const phoneController=()=>null; export const offersTeamChoice=()=>false; export const createPhone=(_deps,_code,present)=>{present(view);return {stop(){}};};`;
      return undefined;
    },
  }], build: { write: false, minify: false, lib: { entry: fixture, formats: ['es'] }, rolldownOptions: { output: { codeSplitting: false } } } });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing bundle');
  const script = output.output.find(chunk => chunk.type === 'chunk');
  if (!script) throw new Error('Missing script');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await page.addScriptTag({ content: script.code, type: 'module' });
    const trigger = page.getByRole('button', { name: 'Remove', exact: true });
    await trigger.focus(); await page.keyboard.press('Enter');
    const confirm = page.getByRole('group', { name: 'Remove Fern?' });
    await confirm.waitFor();
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect.poll(() => page.getByRole('group').count()).toBe(0);
    expect(await trigger.evaluate(el => el === document.activeElement)).toBe(true);
    await page.keyboard.press('Enter'); await confirm.waitFor();
    await page.keyboard.press('Escape');
    await expect.poll(() => page.getByRole('group').count()).toBe(0);
    await trigger.click(); await confirm.getByRole('button', { name: 'Remove', exact: true }).click();
    expect(await page.getAttribute('body', 'data-removed')).toBe('true');
    await page.evaluate(() => { const show = Reflect.get(window, 'removedScreen') as () => void; show(); });
    await page.getByText('You were removed from this game', { exact: true }).waitFor();
    await page.getByText("You can't rejoin this room.", { exact: true }).waitFor();
    expect(await page.getByRole('button', { name: 'Join another room', exact: true }).count()).toBe(1);
  } finally { await browser.close(); }
});
