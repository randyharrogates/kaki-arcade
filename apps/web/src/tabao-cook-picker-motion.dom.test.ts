import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from 'vite';
import { expect, it } from 'vitest';

it('TR-064 mounted picker badges settle during parent renders and exit fades', async () => {
  const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
  const entry = path('./picker-motion.fixture.ts');
  const bundle = await build({ configFile: false, resolve: { alias: [{ find: /^preact$/, replacement: createRequire(import.meta.url).resolve('preact') }] }, build: { write: false, target: 'esnext', lib: { entry, formats: ['es'] } }, plugins: [{
    name: 'picker-motion', resolveId: id => id === entry ? id : undefined,
    load: id => id === entry ? `
      import {h,render,options} from 'preact';
      import {HostGameScreen} from '${path('./host-game-screen.tsx')}';
      import {createCookPicker} from '${path('../../../games/tabao-rush/host/cook-picker.ts')}';
      import {tabaoRush} from '${path('../../../games/tabao-rush/src/rules/game.ts')}';
      import {EMPTY_SETUP,createTick,STEP_MS} from '${path('../../../packages/platform/src/index.ts')}';
      const players=Array.from({length:3},(_,i)=>({id:'p'+(i+1),seat:i+1,name:'Cook '+(i+1),colour:'seat-'+(i+1)}));
      let state=tabaoRush.init(42,players,{},EMPTY_SETUP);
      const refs=new Set();
      const previous=options.vnode;
      options.vnode=node=>{previous?.(node);if(node.type==='div'&&typeof node.ref==='function')refs.add(node.ref);};
      const Screen={mount(root,props){const picker=createCookPicker(root,new Map());picker.update(props.view,1920,1080);return {ready:Promise.resolve(),update(props){picker.update(props.view,1920,1080);},destroy(){picker.destroy();}};}};
      function show(){render(h(HostGameScreen,{Screen,view:tabaoRush.publicView(state),width:1920,height:1080}),document.body);}
      function loop(){show();requestAnimationFrame(loop);}
      requestAnimationFrame(loop);
      window.tap=(player,control,value)=>{state=tabaoRush.step(state,createTick({actions:[{player,control,value,revision:0}]}),STEP_MS);show();};
      window.refCount=()=>refs.size;
    ` : undefined,
  }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw Error('bundle');
  const chunk = output.output.find(c => c.type === 'chunk'); if (!chunk) throw Error('chunk');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'no-preference' });
    for (const file of ['../../../packages/ui/tokens.css', '../../../games/tabao-rush/host/cook-picker.css']) {
      await page.addStyleTag({ content: await readFile(path(file), 'utf8') });
    }
    await page.addScriptTag({ type: 'module', content: chunk.code });
    await page.waitForFunction(() => document.querySelectorAll('.tr-cook-seat').length === 3);
    await page.waitForTimeout(300);
    const tap = async (player: string, control: string, value?: number) => page.evaluate(({ player, control, value }) => {
      (Reflect.get(window, 'tap') as (p: string, c: string, v?: number) => void)(player, control, value);
    }, { player, control, value });
    await tap('p2', 'cooks', 7);
    await page.waitForTimeout(300);
    expect(await page.locator('.tr-cook-card').nth(7).locator('.tr-cook-seat').textContent()).toBe('2');
    expect(await page.locator('.tr-cook-seat').evaluateAll(nodes => nodes.every(n => getComputedStyle(n).opacity === '1'))).toBe(true);
    await tap('p1', 'ready'); await tap('p2', 'ready'); await tap('p3', 'ready');
    const picker = page.locator('.tr-cook-picker');
    // Synchronise to the real exit animation, then sample its midpoint without a timing race.
    await page.waitForFunction(() => document.querySelector('.tr-cook-picker')?.getAnimations().length === 1);
    const midpoint = await picker.evaluate(node => {
      const animation = node.getAnimations()[0]; if (!animation) throw Error('Missing exit');
      animation.pause();
      animation.currentTime = Number(animation.effect?.getComputedTiming().duration) / 2;
      const opacity = Number(getComputedStyle(node).opacity);
      animation.play(); return opacity;
    });
    expect(midpoint).toBeGreaterThan(0); expect(midpoint).toBeLessThan(1);
    await page.waitForTimeout(300);
    expect(await picker.evaluate(node => (node as HTMLElement).hidden)).toBe(true);
    expect(await page.locator('.tr-cook-seat').allTextContents()).toEqual(['1 ✓', '3 ✓', '2 ✓']);
    expect(await page.locator('.tr-cook-seat').evaluateAll(nodes => nodes.every(n => getComputedStyle(n).opacity === '1'))).toBe(true);
    expect(await page.evaluate(() => document.getAnimations().some(animation => animation.pending))).toBe(false);
    // This also catches an unstable ref even if its parentNode guard still prevents appends.
    expect(await page.evaluate(() => (Reflect.get(window, 'refCount') as () => number)())).toBe(1);
  } finally { await browser.close(); }
}, 30000);
