import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { build } from 'vite';
import { rabakzBank } from '@kaki/content-rabakz/vite';
import { expect, it } from 'vitest';

it('PP-005 phone game surface covers the viewport and K-09 targets fit all three sizes', async () => {
  const path = (name: string) => fileURLToPath(new URL(name, import.meta.url));
  const entry = path('./phone-coverage-fixture.ts');
  const bundle = await build({ configFile: false, esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
    build: { write: false, target: 'esnext', lib: { entry, formats: ['es'] }, rolldownOptions: { output: { inlineDynamicImports: true } } }, plugins: [rabakzBank(), {
      name: 'phone-coverage', resolveId(id) { if (id === entry) return id; return undefined; },
      load(id) { if (id !== entry) return; return `
        import {h,render} from 'preact';
        import {GameController} from '${path('./phone-route.tsx')}';
        import {phoneView} from '${path('./phone.ts')}';
        import {peekPoker} from '${path('../../../games/peek-poker/src/rules/game.ts')}';
        import {startPicking} from '${path('../../../games/peek-poker/src/rules/round.ts')}';
        import {makePlayers} from '@kaki/platform/kit';
        import {EMPTY_SETUP} from '@kaki/platform';
        const state=startPicking(peekPoker.init(42,makePlayers(2,false),{rounds:3},EMPTY_SETUP));
        const view=phoneView('lobby',{gameLayout:peekPoker.controllerLayout(state,'p1'),gamePrivateView:null});
        const app=document.createElement('div');app.id='app';document.body.append(app);
        render(h(GameController,{controller:{seat:1,name:'Fern',theme:'peek-poker',link:'connected'},view,send(){}}),app);
      `; },
    }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw Error('Missing bundle');
  const chunk = output.output.find(c => c.type === 'chunk');
  if (!chunk) throw Error('Missing script');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [width, height] of [[667, 375], [844, 390], [932, 430]]) {
      const page = await browser.newPage({ viewport: { width: width ?? 667, height: height ?? 375 } });
      for (const css of ['../../../packages/ui/tokens.css', './style.css']) await page.addStyleTag({ content: await readFile(path(css), 'utf8') });
      for (const asset of output.output) if (asset.type === 'asset' && asset.fileName.endsWith('.css')) await page.addStyleTag({ content: String(asset.source) });
      await page.addScriptTag({ type: 'module', content: chunk.code });
      await page.waitForSelector('.ka-layout-grid .ka-layout-target');
      await page.waitForFunction(() => {
        const play = document.querySelector('.ka-controller-play')?.getBoundingClientRect();
        const engine = document.querySelector('.ka-layout-engine:not(.ka-layout-ghost)')?.getBoundingClientRect();
        if (!play || !engine) return false;
        return play.width === engine.width && play.height === engine.height;
      });
      // Inspect actual theme painters, including the pointer-events:none layout
      // surface which elementsFromPoint omits. Controls intentionally paint cards.
      const samplePaint = () => page.evaluate(() => {
        const shell = document.querySelector('.ka-controller-shell');
        const grid = document.querySelector('.ka-layout-grid')?.getBoundingClientRect();
        if (!shell || !grid) throw Error('Missing play area');
        const reference = document.createElement('div');
        reference.dataset.theme = 'peek-poker'; reference.className = 'ka-surface'; reference.hidden = true;
        document.body.append(reference);
        const felt = getComputedStyle(reference).backgroundColor;
        const treatment = getComputedStyle(reference).backgroundImage;
        reference.className = '';
        const transparent = getComputedStyle(reference).backgroundColor;
        reference.remove();
        const samples = [];
        for (const y of [grid.top + 1, grid.bottom - 1, innerHeight - 71, innerHeight - 69, innerHeight - 1]) {
          for (const x of [1, grid.left - 1, innerWidth - 1]) {
            const stack = document.elementsFromPoint(x, y);
            const copied = [...document.querySelectorAll('.ka-layout-surface')].filter(n => {
              const r = n.getBoundingClientRect(); return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
            });
            const painters = [...new Set([...stack, ...copied])].filter(n => {
              const css = getComputedStyle(n);
              return css.backgroundImage === treatment && css.backgroundColor === felt;
            });
            const firstPaint = stack.find(n => {
              const css = getComputedStyle(n); return css.backgroundImage !== 'none' || css.backgroundColor !== transparent;
            });
            const shellBox = shell.getBoundingClientRect();
            const aligned = (n: Element) => {
              if (n === shell) return true;
              if (!n.classList.contains('ka-layout-surface')) return false;
              const r = n.getBoundingClientRect(), css = getComputedStyle(n), base = getComputedStyle(shell);
              return r.left === shellBox.left && r.top === shellBox.top &&
                r.width === shellBox.width && r.height === shellBox.height &&
                css.backgroundSize === base.backgroundSize.split(',').map(size => size.trim() === 'auto' || size.trim() === 'auto auto' ? `${String(shellBox.width)}px ${String(shellBox.height)}px` : size.trim()).join(', ') && css.backgroundPosition === base.backgroundPosition;
            };
            samples.push({ alignedFelt: painters.includes(shell) && painters.every(aligned),
              visibleFelt: firstPaint !== undefined && painters.includes(firstPaint) && aligned(firstPaint), theme: shell.getAttribute('data-theme') });
          }
        }
        return samples;
      });
      expect((await samplePaint()).every(p => p.alignedFelt && p.visibleFelt && p.theme === 'peek-poker')).toBe(true);
      // Each defect independently breaks the same coverage predicate.
      await page.locator('.phone-game-page').evaluate(n => { n.classList.add('ka-surface'); });
      expect((await samplePaint()).every(p => p.alignedFelt && p.visibleFelt && p.theme === 'peek-poker')).toBe(false);
      await page.locator('.phone-game-page').evaluate(n => { n.classList.remove('ka-surface'); });
      expect((await samplePaint()).every(p => p.alignedFelt && p.visibleFelt && p.theme === 'peek-poker')).toBe(true);
      const regression = await page.addStyleTag({ content: '.phone-game-page .ka-layout-surface { top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; }' });
      expect((await samplePaint()).every(p => p.alignedFelt && p.visibleFelt && p.theme === 'peek-poker')).toBe(false);
      await regression.evaluate(n => n.parentNode?.removeChild(n));
      expect((await samplePaint()).every(p => p.alignedFelt && p.visibleFelt && p.theme === 'peek-poker')).toBe(true);
      const geometry = await page.evaluate(() => {
        const shell = document.querySelector('.ka-controller-shell');
        const root = document.querySelector('.phone-game-page');
        if (!shell || !root) throw Error('phone page');
        const rect = root.getBoundingClientRect();
        return { cover: rect.x === 0 && rect.y === 0 && rect.width === innerWidth && rect.height === innerHeight,
          fits: document.querySelector('.ka-layout-engine:not(.ka-layout-ghost)')?.getAttribute('data-fits'),
          cells: [...document.querySelectorAll('.ka-layout-grid .ka-layout-target')].map(n => { const r = n.getBoundingClientRect(); return { w: r.width, h: r.height, inside: r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; }),
          lock: (() => { const r = document.querySelector('[data-target="lock:go"]')?.getBoundingClientRect(); return r ? [r.width, r.height] : null; })() };
      });
      expect(geometry.cover).toBe(true); expect(geometry.fits).toBe('true');
      expect(geometry.cells).toHaveLength(16);
      expect(geometry.cells.every(c => c.w >= 89 && c.h >= 68 && c.inside)).toBe(true);
      expect(geometry.lock?.every(v => v >= 144)).toBe(true);
      await page.close();
    }
  } finally { await browser.close(); }
}, 60000);
