import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
it('PLAT-035 waiting panel fits both TVs, retains keyboard controls, and reduces countdown motion', async () => {
  const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));
  const fixture = source('./c29-panel-fixture.tsx');
  const bundle = await build({ configFile: false, build: { write: false, minify: false, lib: { entry: fixture, formats: ['es'] }, rolldownOptions: { output: { codeSplitting: false } } }, esbuild: { jsx: 'automatic', jsxImportSource: 'preact' }, plugins: [{
    name: 'c29-panel', resolveId: id => id === fixture ? id : undefined,
    load(id) { if (id === fixture) return `import {render} from 'preact'; import {PausePanel} from '${source('./pause-panel.tsx')}'; import {RejoinNotice} from '${source('./rejoin-notice.tsx')}'; import {hostSound} from '${source('./host-sound.ts')}'; const audio=hostSound(); window.showCount = countdown => render(<><header class="screen"><p>Question 1 of 10</p></header><RejoinNotice notice={{id:1,text:"Randy is back on a new phone"}}/><PausePanel paused sound={audio.sound} resume={()=>{}} quit={()=>{}} codeGroups={['BCDF','2345']} joinLink="https://arcade.example/play" waiting={{message:'Waiting for Mei and Randy to rejoin',countdown}}/></>,document.getElementById('app')); window.showCount(null);`; return undefined; },
  }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing fixture bundle');
  const chunk = output.output.find(item => item.type === 'chunk'); if (!chunk) throw new Error('Missing script');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await page.setContent('<div id="app"></div>');
    for (const path of ['../../../packages/ui/tokens.css', './style.css']) await page.addStyleTag({ content: await readFile(source(path), 'utf8') });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    for (const [width, height] of [[1920, 1080], [1280, 720]] as const) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { document.documentElement.style.setProperty('--screen-scale', String(innerWidth / 1920)); });
      for (const countdown of [null, 3]) {
        await page.evaluate(count => { (Reflect.get(window, 'showCount') as (value: number | null) => void)(count); }, countdown);
        await page.getByRole('button', { name: countdown === null ? 'Carry on without them' : 'Resume', exact: true }).waitFor();
        await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished)));
        expect(await page.locator('.host-pause section, .host-pause section *').evaluateAll(nodes => nodes.flatMap(el => {
          const r = el.getBoundingClientRect();
          return r.width && r.height && (r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) ? [el.getAttribute('class') ?? el.tagName] : [];
        }))).toEqual([]);
        await page.getByRole('status').filter({hasText:'Randy is back on a new phone'}).waitFor();
        expect(await page.locator('.host-rejoin-notice p').evaluate(notice => {
          const box = notice.getBoundingClientRect();
        if (Math.abs(parseFloat(getComputedStyle(notice).fontSize) * innerWidth / 1920 - 34) > 0.01) return false;
          const intersects = (r: DOMRect) => r.width > 0 && r.height > 0 && box.left < r.right && box.right > r.left && box.top < r.bottom && box.bottom > r.top;
          const panel = document.querySelector('.host-pause section');
          if (!panel || intersects(panel.getBoundingClientRect())) return false;
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.textContent?.trim() || notice.contains(node) || node.parentElement?.closest('script, style, .host-rejoin-notice')) continue;
            const range = document.createRange(); range.selectNodeContents(node);
            if (Array.from(range.getClientRects()).some(intersects)) return false;
          }
          const scale = innerWidth / 1920;
          return box.left >= 55 * scale - 0.5 && box.right <= innerWidth - 55 * scale + 0.5 && box.bottom <= innerHeight - 55 * scale + 0.5;
        })).toBe(true);
        expect(await page.locator('.room-code').evaluate(el => getComputedStyle(el).fontSize)).toBe('233px');
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const count of [3, 2, 1]) {
      await page.evaluate(count => { (Reflect.get(window, 'showCount') as (value: number) => void)(count); }, count);
      await page.locator('.rejoin-countdown').filter({ hasText: String(count) }).waitFor();
      expect(await page.locator('.rejoin-countdown').evaluate(el => el.getAnimations().length)).toBe(0);
    }
  } finally { await browser.close(); }
});
