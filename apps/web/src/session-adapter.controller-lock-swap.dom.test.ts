import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { build } from 'vite';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';

it('CTRL-002 CTRL-003 real Lock-in tap cannot send again from a ghost or replacement layout', async () => {
  const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
  const entry = path('./lock-swap-fixture.ts');
  const bundle = await build({ configFile: false, resolve: { alias: [{ find: /^preact$/, replacement: createRequire(import.meta.url).resolve('preact') }] }, build: { write: false, target: 'esnext', lib: { entry, formats: ['es'] } }, plugins: [{ name: 'lock-swap', resolveId: id => id === entry ? id : undefined, load: id => id === entry ? `
    import {h,render} from 'preact';
    import {LayoutEngine} from '${path('../../../packages/controller-kit/src/layout-renderer.ts')}';
    window.outputs=[];
    window.draw=(mode)=>render(h(LayoutEngine,{layout:{revision:mode+1,controls:mode===2?[{kind:'text',id:'watch',text:'Watch the TV'}]:[{kind:'options',id:'lock',options:[{id:'go',label:mode?'Locked in':'Lock in',state:mode?'selected':'plain'}]}]},area:{width:844,height:322},viewport:{width:844,height:390},onOutput:o=>{window.outputs.push(o);window.draw(1);}}),document.body);
    window.draw(0);
  ` : undefined }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw Error('bundle');
  const chunk = output.output.find(c => c.type === 'chunk'); if (!chunk) throw Error('chunk');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    await page.addStyleTag({ content: await readFile(path('../../../packages/ui/tokens.css'), 'utf8') });
    await page.addStyleTag({ content: await readFile(path('../../../packages/controller-kit/src/layout.css'), 'utf8') });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    const button = page.getByRole('button', { name: 'Lock in', exact: true });
    const box = await button.boundingBox(); if (!box) throw Error('button');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); // pointerdown causes the state update before release
    await page.waitForFunction(() => document.querySelector('.ka-layout-ghost') !== null);
    expect(await page.evaluate(() => Reflect.get(window, 'outputs') as unknown)).toHaveLength(1);
    await page.locator('.ka-layout-ghost').first().dispatchEvent('pointerup', { pointerId: 1, button: 0 });
    await page.locator('.ka-layout-ghost').first().dispatchEvent('click');
    await page.mouse.up(); // real pointerup and compatibility click on the live target
    await page.evaluate(() => { (Reflect.get(window, 'draw') as (mode: number) => void)(2); });
    await page.locator('.ka-layout-engine:not(.ka-layout-ghost)').dispatchEvent('pointerup', { pointerId: 1, button: 0 });
    await page.locator('.ka-layout-engine:not(.ka-layout-ghost)').dispatchEvent('click');
    expect(await page.evaluate(() => Reflect.get(window, 'outputs') as unknown)).toEqual([{ control: 'lock', phase: 'choose', value: 'go', revision: 1 }]);
  } finally { await browser.close(); }
}, 30000);
