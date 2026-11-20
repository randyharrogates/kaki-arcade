import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from 'vite';
import { expect, it } from 'vitest';
it('TR-055 TV rail and phone guidance fit every required viewport with reduced motion', async () => {
  const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
  const entry = path('./tutorial-dom.fixture.ts');
  const bundle = await build({ configFile: false, resolve: { alias: [{ find: /^preact$/, replacement: createRequire(import.meta.url).resolve('preact') }] }, build: { write: false, target: 'esnext', lib: { entry, formats: ['es'] } }, plugins: [{ name: 'tutorial-dom', resolveId: (id: string) => id === entry ? id : undefined, load: (id: string) => id.endsWith('/phone-browser.ts') ? 'export const phoneBrowserDependencies = () => ({});' : id.endsWith('/phone-demo.ts') ? 'export const phoneDemo = () => null;' : id.endsWith('apps/web/src/controller-images.ts') ? 'export const preloadControllerImages = () => Promise.resolve({});' : id === entry ? `
    import {h,render} from 'preact';
    import {GameController} from '${path('./phone-route.tsx')}';
    import {tabaoRush} from '${path('../../../games/tabao-rush/src/rules/game.ts')}';
    import {tutorialKitchen} from '${path('../../../games/tabao-rush/src/rules/tutorial.ts')}';
    import {EMPTY_SETUP} from '${path('../../../packages/platform/src/game/settings.ts')}';
    import {createTutorial} from '${path('../../../games/tabao-rush/host/tutorial.ts')}';
    const players=[{id:'p1',seat:1,name:'Cook 1',colour:'seat-1'},{id:'p2',seat:2,name:'Cook 2',colour:'seat-2'}];
    const base=tutorialKitchen(tabaoRush.init(42,players,{}, {...EMPTY_SETUP,firstInRoom:true}));
    let tv;
    window.draw=(step,phone,leader=true,localLeader=false)=>{
      const state={...base,tutorial:{step,done:[]}};
      if(phone)render(h(GameController,{controller:{seat:1,name:'Cook 1',link:'connected',theme:'tabao-rush'},view:{connected:true,phase:'playing',leader,gameLayout:tabaoRush.controllerLayout(state,'p1'),gamePrivateView:null,picker:null},send:()=>{},sessionCommand:()=>{}}),document.body);
      else {tv??=createTutorial(document.body); tv.update(tabaoRush.publicView(state),innerWidth,innerHeight,localLeader);}
    };
  ` : undefined }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw Error('bundle');
  const chunk = output.output.find(c => c.type === 'chunk'); if (!chunk) throw Error('chunk');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [width, height] of [[667, 375], [844, 390], [932, 430], [1920, 1080], [1280, 720]] as const) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      for (const file of ['../../../packages/ui/tokens.css', '../../../packages/controller-kit/src/layout.css', '../../../packages/controller-kit/src/shell.css', '../../../packages/controller-kit/src/buttons.css', '../../../packages/controller-kit/src/stick.css', './phone.css', '../../../games/tabao-rush/host/tutorial.css']) await page.addStyleTag({ content: await readFile(path(file), 'utf8') });
      await page.addStyleTag({ content: 'body { margin:0; }' });
      await page.addScriptTag({ type: 'module', content: chunk.code });
      await page.waitForFunction(() => Reflect.has(window, 'draw'));
      let leaderHeaderHeight: number | undefined;
      for (let step = 0; step < 4; step++) {
        for (const leader of width < 1000 ? [true, false] : [true]) {
          await page.evaluate(({ step, phone, leader }) => { (Reflect.get(window, 'draw') as (s: number, p: boolean, l: boolean) => void)(step, phone, leader); }, { step, phone: width < 1000, leader });
          if (width < 1000) {
            await page.locator('.ka-layout-engine[data-fits="true"]').waitFor();
            const headerHeight = await page.locator('.ka-controller-header').evaluate(n => n.getBoundingClientRect().height);
            if (leader) {
              leaderHeaderHeight = headerHeight;
              const skip = await page.getByRole('button', { name: 'Skip tutorial', exact: true }).boundingBox();
              expect(skip?.height).toBeGreaterThanOrEqual(55);
              expect(skip?.width).toBeGreaterThanOrEqual(55);
            } else expect(headerHeight).toBe(leaderHeaderHeight);
            expect(await page.locator('[data-highlighted="true"]').getAttribute('data-part')).toBe(['move', 'cross', 'circle', 'cross'][step]);
            expect(await page.locator('.ka-controller-heading').textContent()).toBe(`Step ${String(step + 1)} of 4`);
            // T-09 (CTRL-008, D-287): the game heading sits beside the connection status, which keeps its own element.
            expect(await page.locator('.ka-controller-word').textContent()).toBe('Connected');
            expect(await page.getByRole('button', { name: 'Skip tutorial', exact: true }).count()).toBe(leader ? 1 : 0);
            expect(await page.locator('.ka-layout-face').count()).toBe(4);
            expect(await page.locator('.ka-layout-face').evaluateAll(nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.width >= (innerWidth >= 844 ? 110 : 89) - 1 && r.height >= 89; }))).toBe(true);
          } else {
            expect(await page.locator('.tr-tutorial-hint').textContent()).toBe('Leader: Skip on your phone');
            await page.evaluate(step => { (Reflect.get(window, 'draw') as (s: number, p: boolean, l: boolean, local: boolean) => void)(step, false, true, true); }, step);
            expect(await page.locator('.tr-tutorial-hint').textContent()).toBe('Leader: press K or Back to skip');
            expect(await page.locator('.tr-tutorial-titles h1').count()).toBe(1);
            expect(await page.locator('.tr-tutorial-steps [data-state="done"]').count()).toBe(step);
            const rail = await page.locator('.tr-tutorial-rail').boundingBox();
            expect(rail?.y).toBeCloseTo(55 * width / 1920); expect((rail?.x ?? 0) / width).toBeCloseTo(1208 / 1920);
            expect(await page.locator('.tr-tutorial-main').evaluate(n => getComputedStyle(n).borderWidth)).toBe('8px');
            expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
          }
          expect(await page.locator(width < 1000 ? '.ka-layout-part, .ka-controller-header button' : '.tr-tutorial-rail, .tr-tutorial-ring').evaluateAll(nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }))).toBe(true);
        }
      }
      if (width >= 1000) {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.evaluate(() => { (Reflect.get(window, 'draw') as (s: number, p: boolean) => void)(0, false); });
        const motion = await page.locator('.tr-tutorial-main').evaluate(n => n.getAnimations().map(a => a.effect?.getTiming().easing));
        expect(motion).toContain('cubic-bezier(0.65, 0, 0.35, 1)');
      }
      await page.close();
    }
  } finally { await browser.close(); }
}, 60000);
