import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import preact from '@preact/preset-vite';
import { rabakzBank } from '@kaki/content-rabakz/vite';

it('PLAT-006/025 contains setup in the real host route and scaled TV stage', async () => {
  const source = (name: string) => fileURLToPath(new URL(name, import.meta.url));
  const fixture = source('./setup-host-dom-fixture.tsx');
  const bundle = await build({ configFile: false, define: { 'import.meta.env.KAKI_JOIN_ORIGIN': JSON.stringify('') }, build: { target: 'esnext', write: false, minify: false, lib: { entry: fixture, formats: ['es'] }, rolldownOptions: { output: { codeSplitting: false } } }, plugins: [preact(), rabakzBank(), {
    name: 'setup-host-fixture',
    resolveId: id => id === fixture ? id : undefined,
    load(id) {
      if (id === source('./browser.ts')) return `import { loadSessionGame, prepareSetup } from '${source('./session-loading.ts')}';
      export function browserDependencies() { return {
        session: { setup: async (id, teams) => prepareSetup((await loadSessionGame(id)).game, teams), start: async () => {} },
        clock: { now: () => Date.now(), schedule: (fn, ms) => setTimeout(fn, ms), cancel: timer => clearTimeout(timer) },
        storage: { getItem: () => null, setItem() {}, removeItem() {} }, mintToken: (() => { let n = 0; return () => 'fixture-token-' + String(++n).padStart(4, '0'); })(),
        dial: async (_, callbacks) => {
          let revision = 0;
          window.joinPhone = () => {
            callbacks.peer('one', { sendHost(message) { if (message.t === 'picker-state') revision = message.revision; return true; }, bindIdentity() {}, close() {} });
            callbacks.control('one', { v: 1, t: 'hello', name: 'Player 1' });
          };
          window.phoneInput = input => callbacks.control('one', { v: 1, t: 'picker-input', input, revision });
          return { credentials: { code: 'H7KQ9MXR', hostToken: 'a'.repeat(32) }, reopened: false, stop() {} };
        }
      }; }`;
      if (id !== fixture) return;
      return `import { render } from 'preact'; import { HostLobby } from '${source('./host-route.tsx')}';
        import { screenScale } from '${source('./viewport.ts')}';
        const root = document.createElement('div'); root.id = 'app'; document.body.append(root);
        const resize = () => document.documentElement.style.setProperty('--screen-scale', String(screenScale(innerWidth, innerHeight)));
        resize(); window.addEventListener('resize', resize); render(<HostLobby/>, root);`;
    },
  }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing host fixture');
  const chunk = output.output.find(item => item.type === 'chunk');
  if (!chunk) throw new Error('Missing host fixture code');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    for (const asset of output.output) if (asset.type === 'asset' && asset.fileName.endsWith('.css')) await page.addStyleTag({ content: typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source) });
    for (const path of ['../../../packages/ui/tokens.css', './style.css', './team-setup.css', './game-setup.css']) await page.addStyleTag({ content: await readFile(source(path), 'utf8') });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    await expect.poll(() => page.locator('.lobby').count()).toBe(1);
    await page.evaluate(() => { (Reflect.get(window, 'joinPhone') as () => void)(); });
    const input = async (action: string) => {
      await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
      await page.evaluate(action => { (Reflect.get(window, 'phoneInput') as (action: string) => void)(action); }, action);
    };
    await expect.poll(() => page.locator('.seat[data-empty="false"]').count()).toBe(1);
    await input('open');
    await expect.poll(() => page.locator('.picker-screen').count()).toBe(1);
    const idlePictureGaps = new Map<number, number[]>();
    for (const game of ['tabao-rush', 'peek-poker', 'rabakz']) {
      await input('select');
      const card = page.locator('.game-tile[data-expanded="true"]');
      if (game !== 'tabao-rush') await expect.poll(() => card.locator('.setup-mirror-row').count()).toBe(game === 'rabakz' ? 4 : 1);
      await expect.poll(() => card.locator('.setup-mirror-problem [role="status"]').allTextContents()).toEqual(game === 'tabao-rush' ? [] : ['']);
      // Wait for the real picker expansion and host surface crossfade to finish.
      await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
      // UAT opens setup at 1080p, then resizes the mounted host for its 720p still.
      for (const [width, height] of [[1280, 720], [1920, 1080], [3840, 2160]] as const) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => new Promise<void>(resolve => { requestAnimationFrame(() => { requestAnimationFrame(() => { resolve(); }); }); }));
        const geometry = await card.evaluate(el => {
          const box = (node: Element) => { const r = node.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width }; };
          const mirror = el.querySelector('.game-setup-mirror');
          const title = el.querySelector('.game-metadata h2');
          const slot = el.querySelector('.game-copy');
          const players = el.querySelector('.game-detail');
          const picture = el.querySelector('.game-picture-slot');
          const playerHeading = el.querySelector('.game-start-content h3');
          const content = el.querySelector('.game-tile-content:not([data-snapshot])');
          if (!title || !slot || !players || !picture || !playerHeading || !content) throw new Error('Missing setup geometry');
          const outer = box(el); const summary = box(mirror ?? slot); const column = box(slot); const heading = box(title);
          const media = picture.getBoundingClientRect();
          // Exclude empty feedback reserves and the stretched grid column itself:
          // otherwise an invisible row could justify its own extra height.
          const copyContentBottom = Math.max(...Array.from(slot.querySelectorAll('.game-metadata, .setup-mirror-row, .setup-mirror-problem p')).filter(node => node.textContent.trim()).map(node => box(node).bottom));
          const inside = (r: typeof outer, b: typeof outer) => r.left >= b.left - 0.5 && r.top >= b.top - 0.5 && r.right <= b.right + 0.5 && r.bottom <= b.bottom + 0.5;
          return { outer, summary, column, heading, cardFits: inside(outer, { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth }), titleFits: inside(heading, outer), mirrorFits: inside(summary, outer), columnFits: inside(summary, column), widthFits: summary.width <= column.width + 0.5,
            playersFit: inside(box(players), outer), playersClear: box(players).top >= Math.max(column.bottom, media.bottom),
            headingPictureGap: (box(playerHeading).top - media.bottom) / (innerWidth / 1920),
            copyExcess: Math.max(0, copyContentBottom - media.bottom) / (innerWidth / 1920),
            pictureRowGap: (box(players).top - Math.max(column.bottom, media.bottom)) / (innerWidth / 1920),
            pictureTopInset: (media.top - box(content).top) / (innerWidth / 1920),
            pictureRatio: media.width / media.height, pictureWidth: media.width / (innerWidth / 1920),
            contentFits: content.scrollHeight <= content.clientHeight + 1 && content.scrollWidth <= content.clientWidth + 1 };
        });
        expect(geometry, `${String(width)} × ${String(height)}: ${JSON.stringify(geometry)}`).toMatchObject({ cardFits: true, titleFits: true, mirrorFits: true, columnFits: true, widthFits: true, playersFit: true, playersClear: true, contentFits: true });
        // Measure the heading itself, in design pixels (the 720p stage scales by 2/3).
        expect(Math.abs(geometry.headingPictureGap - geometry.copyExcess - 13)).toBeLessThanOrEqual(1);
        if (geometry.copyExcess <= 1) {
          const gaps = idlePictureGaps.get(width) ?? [];
          gaps.push(geometry.headingPictureGap);
          idlePictureGaps.set(width, gaps);
          expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
        }
        expect(Math.abs(geometry.pictureRowGap - 13)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.pictureTopInset - 13)).toBeLessThanOrEqual(1);
        expect(geometry.pictureRatio).toBeCloseTo(1.618, 2);
        expect(geometry.pictureWidth).toBeGreaterThanOrEqual(656);
      }
      await input('back');
      if (game !== 'rabakz') await input('next');
    }
    await page.close();
  } finally { await browser.close(); }
}, 120000);
