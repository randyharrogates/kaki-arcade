import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import preact from '@preact/preset-vite';
import { rabakzBank } from '@kaki/content-rabakz/vite';

it('REL-002 PLAT-020 gates decoded pictures, preserves the shared tile, ratios and TV containment', async () => {
  const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));
  const fixture = source('./shell-imagery-fixture.tsx');
  const built = await build({ configFile: false, plugins: [preact(), rabakzBank(), {
    name: 'shell-imagery-fixture', resolveId: id => id === fixture ? id : undefined,
    load: id => id === fixture ? `import { render } from 'preact';
      import { Landing } from '${source('./landing-route.tsx')}';
      import { GamePicker } from '${source('./picker-route.tsx')}';
      import { demoInput } from '${source('./demo.ts')}';
      import { initialPicker } from '@kaki/platform';
      import { gameMetas } from '${source('./game-registry.ts')}';
      const room = demoInput(8).room;
      const root = document.getElementById('app');
      const schema = { kind: 'team-setup', revision: 1, enabled: false, players: [], error: null, screen: 'choice', teamsOffered: false, teamsReason: null,
        settings: { loading: false, problem: null, fields: ['Questions', 'Categories', 'Difficulty', 'Region'].map((label, id) => ({kind:'number', id:String(id), label, help:null, value:10, min:1, max:20, step:1})) }};
      window.show = (focus, screen) => render(focus === 'landing' ? <Landing/> : <GamePicker room={room} state={{...initialPicker(gameMetas), focus, screen}} setup={focus === 'rabakz' ? schema : null}/>, root);
      window.setupStatus = (loading, problem, refusal) => { schema.settings = {...schema.settings, loading, problem}; schema.refusal = refusal; window.show('rabakz', 'start'); };
      window.show('landing');` : undefined,
  }], build: { write: false, target: 'esnext', minify: false, lib: { entry: fixture, formats: ['es'] }, rolldownOptions: { output: { codeSplitting: false } } } });
  const output = Array.isArray(built) ? built[0] : built;
  if (!output || !('output' in output)) throw new Error('Missing fixture');
  const chunk = output.output.find(item => item.type === 'chunk');
  if (!chunk) throw new Error('Missing fixture code');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="app"></div>');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of ['../../../packages/ui/tokens.css', './style.css', './game-setup.css']) await page.addStyleTag({ content: await readFile(source(path), 'utf8') });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    await expect.poll(() => page.locator('.landing-screen').count()).toBe(1);
    const show = async (focus: string, screen = 'picker') => {
      await page.evaluate(({ focus, screen }) => { (Reflect.get(window, 'show') as (focus: string, screen: string) => void)(focus, screen); }, { focus, screen });
      await expect.poll(() => page.locator(focus === 'landing' ? '.landing-screen' : '.picker-screen').count()).toBe(1);
      await page.evaluate(async () => { await Promise.all([...document.images].map(img => img.decode())); });
    };
    // Hold the three decode promises: tiles must not mount during this interval.
    await page.evaluate(() => {
      // Retain the prototype method deliberately; call below supplies its image receiver.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const decode = HTMLImageElement.prototype.decode;
      const releases: (() => void)[] = [];
      HTMLImageElement.prototype.decode = function () {
        return new Promise<void>(resolve => { releases.push(resolve); }).then(() => decode.call(this));
      };
      Reflect.set(window, 'releasePictures', () => { HTMLImageElement.prototype.decode = decode; for (const release of releases) release(); });
      (Reflect.get(window, 'show') as (focus: string, screen: string) => void)('tabao-rush', 'picker');
    });
    await expect.poll(() => page.locator('.room-status').textContent()).toBe('Loading game pictures…');
    expect(await page.locator('.game-tile').count()).toBe(0);
    await page.evaluate(() => { (Reflect.get(window, 'releasePictures') as () => void)(); });
    await expect.poll(() => page.locator('.game-tile').count()).toBe(3);
    // A warm second mount must render tiles synchronously, before effects run.
    expect(await page.evaluate(() => {
      const show = Reflect.get(window, 'show') as (focus: string, screen: string) => void;
      show('landing', 'picker');
      show('tabao-rush', 'picker');
      return document.querySelectorAll('.game-tile').length;
    })).toBe(3);
    for (const [width, height] of [[1920, 1080], [1280, 720], [390, 844], [844, 390], [1000, 720], [1001, 720]] as const) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { document.documentElement.style.setProperty('--screen-scale', String(Math.min(innerWidth / 1920, innerHeight / 1080))); });
      await show('landing');
      const help = page.getByRole('link', { name: 'Put this on your TV', exact: true });
      expect(await help.count()).toBe(1);
      expect(await help.getAttribute('href')).toBe('/tv-help');
      if (width <= 1000) {
        expect(await page.locator('.landing-screen').evaluate(el => getComputedStyle(el).transform)).toBe('none');
        expect(await page.locator('.landing-picture').isVisible()).toBe(false);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const gap = await page.locator('.legal-footer').evaluate(el => {
          const help = document.querySelector('.landing-help');
          if (!help) throw new Error('Missing TV help');
          return el.getBoundingClientRect().top - help.getBoundingClientRect().bottom;
        });
        expect(gap).toBe(34);
        for (const link of await page.locator('.landing-screen a').all()) {
          await link.scrollIntoViewIfNeeded();
          expect(await link.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(55);
          expect(await link.evaluate(el => {
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return hit !== null && el.contains(hit);
          })).toBe(true);
        }
      }
      await help.scrollIntoViewIfNeeded();
      expect(await help.evaluate(el => {
        const r = el.getBoundingClientRect();
        const games = el.previousElementSibling?.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && Boolean(games && r.top >= games.bottom);
      }), `help link at ${String(width)}`).toBe(true);
    }
    await show('rabakz', 'start');
    const status = page.locator('.game-tile[data-expanded="true"] .setup-mirror-problem [role="status"]');
    for (const state of [
      { loading: true, problem: null, refusal: null, text: 'Loading settings…', icons: 0 },
      { loading: false, problem: 'Settings unavailable.', refusal: null, text: 'Settings unavailable.', icons: 1 },
      { loading: false, problem: null, refusal: { field: '0', sentence: 'Choose more questions.', revision: 2 }, text: 'Choose more questions.', icons: 1 },
    ]) {
      await page.evaluate(state => { (Reflect.get(window, 'setupStatus') as (loading: boolean, problem: string | null, refusal: unknown) => void)(state.loading, state.problem, state.refusal); }, state);
      await expect.poll(() => status.textContent()).toBe(state.text);
      expect(await status.locator('svg.icon').count()).toBe(state.icons);
    }
    await page.evaluate(() => { (Reflect.get(window, 'setupStatus') as (loading: boolean, problem: null, refusal: null) => void)(false, null, null); });

    for (const [width, height] of [[1920, 1080], [1280, 720]] as const) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { document.documentElement.style.setProperty('--screen-scale', String(Math.min(innerWidth / 1920, innerHeight / 1080))); });
      for (const focus of ['landing', 'tabao-rush', 'peek-poker', 'rabakz']) {
        await show(focus);
        const tile = focus !== 'landing' ? await page.locator(`[data-game="${focus}"]`).elementHandle() : null;
        for (const screen of focus === 'landing' ? ['picker'] : ['picker', 'start']) {
          await show(focus, screen);
          if (screen === 'start') expect(await tile?.evaluate(el => el === document.querySelector('[data-expanded="true"]'))).toBe(true);
          const result = await page.evaluate(() => {
            const nodes = [...document.querySelectorAll('.landing-copy, .landing-picture, .game-tile:not([data-hidden="true"]), .game-metadata, .game-setup-mirror, .picker-players')].filter(el => el.checkVisibility());
            const overflow = nodes.filter(el => { const r = el.getBoundingClientRect(); return r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1; }).map(el => el.className);
            const images = [...document.querySelectorAll<HTMLImageElement>('.game-picture-slot img, .landing-picture')].filter(el => el.checkVisibility()).map(el => { const r = el.getBoundingClientRect(); return { ratio: r.width / r.height, alt: el.alt, ready: el.complete && el.naturalWidth > 0 }; });
            return { overflow, images };
          });
          expect(result.overflow, `${focus} ${screen} ${String(width)}`).toEqual([]);
          expect(result.images.length).toBeGreaterThan(0);
          for (const image of result.images) { expect(image.ready).toBe(true); expect(image.alt.length).toBeGreaterThan(0); expect(Math.abs(image.ratio - 1.618)).toBeLessThanOrEqual(0.02); }
        }
      }
    }
  } finally { await browser.close(); }
}, 60000);
