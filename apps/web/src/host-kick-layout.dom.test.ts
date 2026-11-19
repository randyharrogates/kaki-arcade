import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import preact from '@preact/preset-vite';
import { rabakzBank } from '@kaki/content-rabakz/vite';

it('PLAT-011 keeps TV cards and confirmation inside the safe margin for three and eight players', async () => {
  const source = (name: string) => fileURLToPath(new URL(name, import.meta.url));
  const fixture = source('./host-kick-layout-fixture.tsx');
  const bundle = await build({ configFile: false, plugins: [rabakzBank(), preact(), {
    name: 'host-kick-layout', resolveId: id => id === fixture ? id : undefined,
    load(id) {
      if (id !== fixture) return;
      return `import {render} from 'preact'; import {Seat} from '${source('./host-route.tsx')}';
        window.showSeats = count => render(<main class="screen lobby"><header>Lobby</header><section class="join-panel ka-panel"><div class="join-content"><div class="qr"/></div></section><ol class="seats" data-wrap="true">{Array.from({length:8},(_,i)=><Seat index={i} seat={{number:i+1,occupied:i<count,name:i<count?['漢字漢字漢字漢字漢字漢字','😀😀😀😀😀😀😀😀😀😀😀😀','Cloud','Player Four','Player Five','Player Six','Player Seven','Player Eight'][i]:'Join',colour:'var(--ka-seat-1)',leader:i===0,connection:i<count?'Good':'Scan to join',icon:'good'}} localSeat={3} remove={()=>{}}/>)}</ol></main>,document.getElementById('app')); window.showSeats(3);`;
    },
  }], build: { write: false, minify: false, lib: { entry: fixture, formats: ['es'] }, rolldownOptions: { output: { codeSplitting: false } } } });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing layout bundle');
  const script = output.output.find(item => item.type === 'chunk');
  if (!script) throw new Error('Missing layout script');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setContent('<div id="app"></div>');
    for (const asset of output.output) if (asset.type === 'asset' && asset.fileName.endsWith('.css')) await page.addStyleTag({ content: String(asset.source) });
    for (const path of ['../../../packages/ui/tokens.css', './style.css']) await page.addStyleTag({ content: await readFile(source(path), 'utf8') });
    await page.addScriptTag({ type: 'module', content: script.code });
    for (const count of [3, 8]) for (const [width, height] of [[1920, 1080], [1280, 720]] as const) {
      await page.setViewportSize({ width, height });
      await page.evaluate(({ count, width }) => {
        document.documentElement.style.setProperty('--screen-scale', String(width / 1920));
        (Reflect.get(window, 'showSeats') as (count: number) => void)(count);
      }, { count, width });
      const cards = page.locator('.seat');
      expect(await page.locator('.seat-content.ka-panel').count()).toBe(0);
      // The seat card overlaps its old and new states while it changes; count once it settles.
      await expect.poll(() => cards.count()).toBe(8);
      await expect.poll(() => page.locator('.seat-content').count()).toBe(8);
      await page.evaluate(() => document.fonts.ready);
      expect(await cards.nth(2).getByRole('button', { name: 'Remove', exact: true }).count()).toBe(0);
      for (const index of [0, 1]) expect(await cards.nth(index).locator('.name-line').count()).toBe(3);
      const iconSizes = await page.locator('.seat-content .connection .icon').evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().width / (innerWidth / 1920)));
      for (const [index, size] of iconSizes.entries()) expect(size).toBeCloseTo(index < count && index !== 2 ? 21 : 34);
      const bounds = await cards.evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().height));
      const fits = () => cards.evaluateAll(nodes => nodes.flatMap(card => {
        const r = card.getBoundingClientRect(), bottom = innerHeight - 55 * innerWidth / 1920;
        // Every box stays inside its card and the screen; the card and any clipping box must not scroll
        // (other visible-overflow text may overhang, but the leader row must fit its glyphs).
        return [card, ...card.querySelectorAll<HTMLElement>('*')].flatMap(el => {
          const b = el.getBoundingClientRect();
          if (!b.width || !b.height || getComputedStyle(el).visibility === 'hidden') return [];
          return b.left >= r.left - 1 && b.right <= r.right + 1 && b.top >= r.top - 1 && b.bottom <= r.bottom + 1 && b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= bottom + 1 && el.scrollWidth <= el.clientWidth && (el !== card && !el.classList.contains('leader') && getComputedStyle(el).overflow === 'visible' || el.scrollHeight <= el.clientHeight)
            ? [] : [el.getAttribute('class') ?? el.tagName];
        });
      }));
      expect(await fits()).toEqual([]);
      await cards.first().getByRole('button', { name: 'Remove', exact: true }).click();
      await page.getByRole('group', { name: 'Remove 漢字漢字漢字漢字漢字漢字?' }).waitFor();
      expect(await fits()).toEqual([]);
      expect(await page.locator('.remove-confirm button').evaluateAll(nodes => nodes.every(el => el.scrollWidth <= el.clientWidth))).toBe(true);
      expect(await cards.evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().height))).toEqual(bounds);
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect.poll(() => page.getByRole('group').count()).toBe(0);
    }
  } finally { await browser.close(); }
}, 120000);
