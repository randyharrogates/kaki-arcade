import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';

it('PP-033 PP-012 Steady best labels fit the Rising slots at both TV sizes', async () => {
  const path = (name: string) => fileURLToPath(new URL(name, import.meta.url));
  const entry = path('./best-fixture.ts');
  const bundle: unknown = await build({ configFile: false, build: { write: false, target: 'esnext', lib: { entry, formats: ['es'] } }, plugins: [{
    name: 'best-fixture', resolveId(id: string) { return id === entry ? id : undefined; },
    load(id: string) {
      if (id !== entry) return;
      return `
        import {PeekPokerScreen} from '${path('../../../games/peek-poker/host/Screen.tsx')}';
        import {peekPoker} from '${path('../../../games/peek-poker/src/index.ts')}';
        import {makePlayers} from '@kaki/platform/kit';
        const screen=PeekPokerScreen(document.body,{frames:new Map(),faces:new Map()});
        window.draw=(difficulty,phase,newBest)=>{
          const state=peekPoker.init(42,makePlayers(1,false),{rounds:3,difficulty},{data:{},saved:{bests:{rising:999,steady:999}},teams:false});
          state.phase=phase;state.players[0].score=999;
          screen.update({view:{...peekPoker.publicView(state),newBest},width:innerWidth,height:innerHeight,reduced:true});
        };
      `;
    },
  }] });
  const output: unknown = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || typeof output !== 'object' || !('output' in output) || !Array.isArray(output.output)) throw Error('bundle');
  const chunk: unknown = output.output.find((c: unknown) => c !== null && typeof c === 'object' && 'type' in c && c.type === 'chunk');
  if (!chunk || typeof chunk !== 'object' || !('code' in chunk) || typeof chunk.code !== 'string') throw Error('chunk');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const size of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
      const page = await browser.newPage({ viewport: size });
      await page.addStyleTag({ content: await readFile(path('../../../packages/ui/tokens.css'), 'utf8') });
      await page.addStyleTag({ content: await readFile(path('../../../games/peek-poker/host/screen.css'), 'utf8') });
      await page.addScriptTag({ type: 'module', content: chunk.code });
      await page.waitForFunction(() => Reflect.has(window, 'draw'));
      for (const phase of ['memorise', 'scoreboard', 'over']) for (const newBest of [false, true]) {
        let risingHeight = 0;
        for (const difficulty of ['rising', 'steady']) {
          await page.evaluate(({ difficulty, phase, newBest }) => {
            (Reflect.get(window, 'draw') as (difficulty: string, phase: string, newBest: boolean) => void)(difficulty, phase, newBest);
          }, { difficulty, phase, newBest });
          const label = page.locator(phase === 'memorise' ? '.pp-best' : '.pp-result-best');
          const prefix = difficulty === 'steady' ? 'Steady best' : 'Best';
          expect(await label.textContent()).toBe(phase !== 'memorise' && newBest ?
            `New ${difficulty === 'steady' ? 'steady ' : ''}best · 999` : `${prefix} 999`);
          const fit = await label.evaluate(node => {
            const box = node.getBoundingClientRect();
            const range = document.createRange(); range.selectNodeContents(node);
            const ink = [...range.getClientRects()];
            const slot = node.closest('.pp-summary')?.getBoundingClientRect();
            const others = [...document.querySelectorAll('.pp-score-list,.pp-player,.pp-hands')]
              .filter(other => other.getClientRects().length > 0);
            return { height: box.height, singleLine: ink.length === 1,
              fits: ink.every(r => r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight &&
                (!slot || (r.left >= slot.left && r.right <= slot.right))),
              overlaps: others.some(other => { const r = other.getBoundingClientRect();
                return box.left < r.right && box.right > r.left && box.top < r.bottom && box.bottom > r.top;
              }),
            };
          });
          expect(fit).toMatchObject({ singleLine: true, fits: true, overlaps: false });
          if (difficulty === 'rising') risingHeight = fit.height;
          else expect(fit.height).toBeCloseTo(risingHeight);
        }
      }
      await page.close();
    }
  } finally { await browser.close(); }
}, 30000);
