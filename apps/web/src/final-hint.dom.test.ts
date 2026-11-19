import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from 'vite';
import { expect, it } from 'vitest';

it('PLAT-022 PLAT-024 RZ-032 Rabakz free-for-all and 2/4/8-player team finals clear both scaled hand-off hints', async () => {
  const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
  const entry = path('./c18-fixture.ts');
  const bundle = await build({ configFile: false, resolve: { alias: [{ find: /^preact$/, replacement: createRequire(import.meta.url).resolve('preact') }] }, oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } }, build: { write: false, target: 'esnext', lib: { entry, formats: ['es'] } }, plugins: [{ name: 'c18', resolveId: id => id === entry ? id : undefined, load: id => id === entry ? `
    import {h,render} from 'preact';
    import {GameFinalHint} from '${path('./game-final-hint.tsx')}';
    import {RabakzScreen} from '${path('../../../games/rabakz/host/Screen.tsx')}';
    import {scenario} from '${path('../../../games/rabakz/host/scenarios.ts')}';
    import {rabakz} from '${path('../../../games/rabakz/src/index.ts')}';
    window.draw=(keyboard,mode,tied,count)=>{const view=rabakz.publicView(scenario(mode==='ffa'?'podium-ties':tied?'podium-teams-tie':'podium-teams',count));if(mode!=='ffa'){view.teamScores=tied?[300,300]:[1000,100];view.players.forEach((p,i)=>{p.team=i<(mode==='7-1'?count-1:count/2)?0:1;});}document.documentElement.style.setProperty('--screen-scale',String(Math.min(innerWidth/1920,innerHeight/1080)));render(h('div',null,h(RabakzScreen,{view,width:innerWidth,height:innerHeight,reduced:true}),h(GameFinalHint,{keyboard})),document.body);};
  ` : undefined }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw Error('bundle');
  const chunk = output.output.find(c => c.type === 'chunk');
  if (!chunk) throw Error('chunk');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1280, 1920, 3840]) {
      const page = await browser.newPage({ viewport: { width, height: width * 1080 / 1920 } });
      for (const p of ['../../../packages/ui/tokens.css', '../../../games/rabakz/host/screen.css', './style.css']) await page.addStyleTag({ content: await readFile(path(p), 'utf8') });
      await page.addScriptTag({ type: 'module', content: chunk.code });
      await page.waitForFunction(() => Reflect.has(window, 'draw'));
      for (const count of [2, 4, 8]) for (const mode of ['ffa', '4-4', '7-1']) for (const keyboard of [false, true]) for (const tied of [false, true]) {
        await page.evaluate(args => { (Reflect.get(window, 'draw') as (k: boolean, m: string, t: boolean, c: number) => void)(...args); }, [keyboard, mode, tied, count] as [boolean, string, boolean, number]);
        expect(await page.locator('[data-player]').count()).toBe(count);
        expect(await page.locator('.rz-rank').count()).toBe(0);
        expect(await page.locator('.rz-results-body').evaluate(n => getComputedStyle(n).transform)).toBe('none');
        expect(await page.locator('.rz-rank, .rz-group-label, .rz-podium-player .rz-total').evaluateAll(rows => rows.every(n => Number.parseFloat(getComputedStyle(n).fontSize) >= 34))).toBe(true);
        expect(await page.locator('.rz-results-body').evaluate(n => Math.abs((n.getBoundingClientRect().left + n.getBoundingClientRect().right) / 2 - innerWidth / 2))).toBeLessThan(0.5);
        expect(await page.locator('[data-final-team-title]').count()).toBe(mode === 'ffa' ? 0 : 2);
        expect(await page.getByText('Leader can continue', { exact: true }).count()).toBe(0);
        expect(await page.locator('.game-final-hint').evaluate(n => n.getBoundingClientRect().height)).toBeCloseTo(34 * width / 1920);
        expect(await page.locator('.game-final-hint').evaluate(n => {
          const hint = n.getBoundingClientRect();
          return [...document.querySelectorAll('.rz-rank,.rz-podium')].every(row => row.getBoundingClientRect().bottom <= hint.top + 0.5);
        })).toBe(true);
      }
      await page.close();
    }
  } finally { await browser.close(); }
}, 30000);
