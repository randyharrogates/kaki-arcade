import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from 'vite';
import { expect, it } from 'vitest';

it('RZ-012 RZ-016 RZ-032 podium members fit at 2/4/8 players in both modes and viewport sizes', async () => {
  const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
  const entry = path('./r20-fixture.ts');
  const bundle = await build({ configFile: false, resolve: { alias: [{ find: /^preact$/, replacement: createRequire(import.meta.url).resolve('preact') }] }, oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } }, build: { write: false, target: 'esnext', lib: { entry, formats: ['es'] } }, plugins: [{ name: 'c18', resolveId: id => id === entry ? id : undefined, load: id => id === entry ? `
    import {h,render} from 'preact';
    import {GameFinalHint} from '${path('./game-final-hint.tsx')}';
    import {RabakzScreen} from '${path('../../../games/rabakz/host/Screen.tsx')}';
    import {scenario} from '${path('../../../games/rabakz/host/scenarios.ts')}';
    import {rabakz} from '${path('../../../games/rabakz/src/index.ts')}';
    import {detectOverflow} from '${path('../../../games/rabakz/host/overflow.ts')}';
    window.overflow=detectOverflow;
    window.draw=(keyboard,mode,tied,count)=>{const view=rabakz.publicView(scenario(mode==='ffa'?(tied==='all'?'podium-ties':tied==='first'?'podium-tie-first':'podium'):tied?'podium-teams-tie':'podium-teams',count));view.players.forEach(p=>{p.name='WWWWWWWWWWWWW';});if(mode!=='ffa'){view.teamScores=tied?[300,300]:[1000,100];view.players.forEach((p,i)=>{p.team=i<(mode==='7-1'?count-1:count/2)?0:1;});}document.documentElement.style.setProperty('--screen-scale',String(Math.min(innerWidth/1920,innerHeight/1080)));render(h('div',null,h(RabakzScreen,{view,width:innerWidth,height:innerHeight,reduced:true}),h(GameFinalHint,{keyboard})),document.body);};
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
      // Measure in the real faces: the first draw otherwise lays out in a fallback font.
      await page.evaluate(() => document.fonts.ready);
      for (const count of [2, 4, 8]) for (const mode of ['ffa', '4-4', '7-1']) for (const keyboard of [false, true]) for (const tied of (mode === 'ffa' ? count === 8 ? [false, 'first', 'all'] : ['first', 'all'] : [false, true])) {
        await page.evaluate(args => { (Reflect.get(window, 'draw') as (k: boolean, m: string, t: boolean | string, c: number) => void)(...args); }, [keyboard, mode, tied, count] as [boolean, string, boolean | string, number]);
        expect(await page.locator('[data-player], .rz-rank').count()).toBe(count);
        expect(await page.evaluate(() => (Reflect.get(window, 'overflow') as () => unknown[])())).toEqual([]);
        expect(await page.locator('.rz-step').count()).toBe(mode === 'ffa' ? (tied === 'all' ? 1 : tied === 'first' ? count === 2 ? 1 : 2 : count === 2 ? 2 : 3) : tied ? 1 : 2);
        expect(await page.locator('.rz-step-place').allTextContents()).toContain(tied === 'all' || mode !== 'ffa' && tied || tied === 'first' && count === 2 ? 'Tied for first' : tied === 'first' ? '=1' : '1');
        expect(await page.locator('.rz-results-body').evaluate(n => getComputedStyle(n).transform)).toBe('none');
        expect(await page.locator('.rz-rank, [data-final-team-title], [data-final-member] .rz-rank-name, .rz-podium-player .rz-total').evaluateAll(rows => rows.every(n => Number.parseFloat(getComputedStyle(n).fontSize) >= 34))).toBe(true);
        expect(await page.locator('.rz-results-body').evaluate(n => Math.abs((n.getBoundingClientRect().left + n.getBoundingClientRect().right) / 2 - innerWidth / 2))).toBeLessThan(0.5);
        expect(await page.locator('[data-final-team-title]').count()).toBe(mode === 'ffa' ? 0 : 2);
        if (mode !== 'ffa') expect(await page.locator('[data-final-team-title]').evaluateAll(titles => titles.every(title => title.querySelector('.rz-team-mark') !== null && getComputedStyle(title).backgroundColor === 'rgba(0, 0, 0, 0)'))).toBe(true); // design-lint-ignore: assert browser-computed transparency; this literal does not style a surface
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
