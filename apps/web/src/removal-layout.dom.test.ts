import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import preact from '@preact/preset-vite';

it('PLAT-011 scrolls eight touch-sized leader rows and fits the column confirmation at all three landscape sizes', async () => {
  const route = fileURLToPath(new URL('./phone-route.tsx', import.meta.url));
  const fixture = fileURLToPath(new URL('./removal-layout-fixture.tsx', import.meta.url));
  const phone = fileURLToPath(new URL('./phone.ts', import.meta.url));
  const bundle = await build({ configFile: false, define: { 'import.meta.env.DEV': 'false' }, plugins: [preact(), {
    name: 'leader-removal-layout',
    resolveId: id => id === fixture ? id : undefined,
    load(id) {
      if (id === fixture) return `import {render} from 'preact'; import {PhonePage} from '${route}'; render(<PhonePage/>, document.body);`;
      if (id.endsWith('/phone-browser.ts')) return 'export const phoneBrowserDependencies = () => ({});';
      if (id.endsWith('/phone-demo.ts')) return 'export const phoneDemo = () => null;';
      if (id !== phone) return;
      return `const view = {state:'lobby',connected:true,seat:1,name:'Fern',leader:true,phase:'lobby',theme:'console',title:'You’re in.',detail:'Pick a game when everyone’s in.',colour:'var(--ka-seat-1)',
        picker:{screen:'lobby'},teamSetup:null,players:Array.from({length:8},(_,i)=>({seat:i+1,name:['Fern','Moss','Cloud','Alexandertan','Player Five','Player Six','Player Seven','Player Eight'][i]}))};
        export const phoneView = () => view;
        export const phoneController = () => null;
        export const offersTeamChoice = () => false;
        export const createPhone = (_deps, _code, present) => { present(view); return {stop(){},removePlayer(seat){document.body.dataset.removed=String(seat); view.players=view.players.filter(player=>player.seat!==seat); present({...view});}}; };`;
    },
  }], build: { write: false, minify: false, lib: { entry: fixture, formats: ['es'] }, rolldownOptions: { output: { codeSplitting: false } } } });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing leader layout bundle');
  const chunk = output.output.find(item => item.type === 'chunk');
  const css = output.output.filter(item => item.type === 'asset');
  if (!chunk) throw new Error('Missing leader layout code');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const asset of css) {
      if (asset.fileName.endsWith('.css')) await page.addStyleTag({ content: String(asset.source) });
    }
    // Load the same global reset, tokens and setup styling as the app.
    const { readFile } = await import('node:fs/promises');
    for (const path of ['../../../packages/ui/tokens.css', './style.css', './game-setup.css']) {
      await page.addStyleTag({ content: await readFile(fileURLToPath(new URL(path, import.meta.url)), 'utf8') });
    }
    await page.addScriptTag({ type: 'module', content: chunk.code });
    for (const [width, height] of [[667, 375], [844, 390], [932, 430]] as const) {
      await page.setViewportSize({ width, height });
      await page.getByRole('button', {name:'Pick a game',exact:true}).waitFor();
      expect(await page.getByRole('listitem').count()).toBe(8);
      expect(await page.getByRole('button', {name:'Remove Fern',exact:true}).count()).toBe(0);
      const fits = () => page.locator('.phone-page, .phone-id, .phone-lobby, .phone-message, .phone-status, .phone-player-column, .phone-player-confirm, .phone-page button:not(.phone-players button):not([hidden]), .phone-status h2, .phone-status p').evaluateAll(nodes => nodes.flatMap(el => {
        if (el.closest('ol[aria-hidden="true"]')) return [];
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1
          ? [] : [el.getAttribute('class') ?? el.tagName];
      }));
      expect(await fits()).toEqual([]);
      const split = await page.locator('.phone-lobby').evaluate(el => {
        const columns = getComputedStyle(el).gridTemplateColumns.split(' ').map(Number.parseFloat);
        return (columns[0] ?? 0) / (columns[1] ?? 1);
      });
      expect(split).toBeCloseTo(1.618, 2);
      const list = page.getByRole('list', {name:'Players'});
      expect(await list.evaluate(el => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && el.scrollWidth <= el.clientWidth + 1;
      })).toBe(true);
      expect(await list.getByRole('listitem').evaluateAll(nodes => nodes.every(el => el.scrollWidth <= el.clientWidth + 1))).toBe(true);
      const rowTargets = await list.getByRole('button').evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().height));
      expect(rowTargets).toHaveLength(7);
      expect(rowTargets.every(height => height >= 55)).toBe(true);
      expect(await list.evaluate(el => el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY === 'auto')).toBe(true);
      const pageFits = () => page.locator('.phone-page').evaluate(el => el.scrollHeight <= el.clientHeight + 1 && document.documentElement.scrollHeight <= innerHeight);
      expect(await pageFits()).toBe(true);
      await list.evaluate(el => { el.scrollTop = el.scrollHeight; });
      expect(await list.evaluate(el => el.scrollTop > 0)).toBe(true);
      expect(await page.locator('.phone-page').evaluate(el => {
        el.scrollTop = el.scrollHeight;
        return el.scrollTop === 0 && window.scrollY === 0;
      })).toBe(true);
      expect(await pageFits()).toBe(true);
      await list.evaluate(el => { el.scrollTop = 0; });
      const columnBounds = await page.locator('.phone-player-column').boundingBox();
      await page.getByRole('button',{name:'Remove Moss',exact:true}).click();
      const confirm = page.getByRole('group',{name:'Remove Moss?'});
      await confirm.waitFor();
      expect(await page.locator('.phone-player-column').boundingBox()).toEqual(columnBounds);
      await expect.poll(() => confirm.evaluate(el => el.getAnimations().length)).toBe(0);
      expect(await fits()).toEqual([]);
      expect(await confirm.getByRole('button').evaluateAll(nodes => nodes.every(el => el.getBoundingClientRect().height >= 55))).toBe(true);
      expect(await confirm.evaluate(el => {
        const parent = el.parentElement;
        if (!parent) return false;
        const r = el.getBoundingClientRect(), column = parent.getBoundingClientRect();
        return r.top >= column.top && r.bottom <= column.bottom && r.left >= column.left && r.right <= column.right;
      })).toBe(true);
      await confirm.getByRole('button',{name:'Cancel',exact:true}).click();
      await expect.poll(() => confirm.count()).toBe(0);
      expect(await page.getByRole('button', {name:'Remove Cloud',exact:true}).evaluate(el => el === document.activeElement)).toBe(true);
      await page.getByRole('button',{name:'Remove Moss',exact:true}).focus();
      await page.keyboard.press('Enter');
      await confirm.waitFor();
      await page.keyboard.press('Escape');
      await expect.poll(() => confirm.count()).toBe(0);

    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.getByRole('button',{name:'Remove Moss',exact:true}).click();
    const confirm = page.getByRole('group',{name:'Remove Moss?'});
    await confirm.waitFor();
    expect(await confirm.evaluate(el => el.getAnimations().length)).toBe(0);
    await confirm.getByRole('button',{name:'Remove',exact:true}).click();
    await expect.poll(() => confirm.count()).toBe(0);
    expect(await page.getByRole('listitem').count()).toBe(7);
    expect(await page.getByRole('button',{name:'Remove Cloud',exact:true}).evaluate(el => el === document.activeElement)).toBe(true);
    for (const name of ['Cloud', 'Alexandertan', 'Player Five', 'Player Six', 'Player Seven', 'Player Eight']) {
      await page.getByRole('button', {name:`Remove ${name}`,exact:true}).click();
      const removing = page.getByRole('group', {name:`Remove ${name}?`});
      await removing.getByRole('button', {name:'Remove',exact:true}).click();
      await expect.poll(() => removing.count()).toBe(0);
    }
    expect(await page.getByRole('listitem').count()).toBe(1);
    expect(await page.locator('.phone-player-own').evaluate(el => el === document.activeElement)).toBe(true);
  } finally { await browser.close(); }
}, 120000);
