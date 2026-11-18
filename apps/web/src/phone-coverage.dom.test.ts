import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { build } from 'vite';
import { rabakzBank } from '@kaki/content-rabakz/vite';
import { expect, it } from 'vitest';
import { THEMES } from '@kaki/ui';

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
        import {deal,startPicking} from '${path('../../../games/peek-poker/src/rules/round.ts')}';
        import {makePlayers} from '@kaki/platform/kit';
        import {EMPTY_SETUP} from '@kaki/platform';
        let state=deal(peekPoker.init(42,makePlayers(2,false),{rounds:3},EMPTY_SETUP));
        let theme='console';
        let view={...phoneView('lobby',{seat:1,leader:true,phase:'playing'}),gameLayout:peekPoker.controllerLayout(state,'p1'),gamePrivateView:peekPoker.privateView(state,'p1')};
        const app=document.createElement('div');app.id='app';document.body.append(app);
        const draw=()=>render(h(GameController,{controller:{seat:1,name:'Fern',theme:view.connected?theme:'console',link:view.connected?'connected':'reconnecting'},view,send(){},sessionCommand(action){document.body.dataset.command=action??'menu';}}),app);
        window.showPoker=()=>{theme='peek-poker';draw();};
        window.showPicking=()=>{state=startPicking(state);view={...view,gameLayout:peekPoker.controllerLayout(state,'p1'),gamePrivateView:null};draw();};
        window.consoleState=(phase,leader,connected)=>{view={...view,phase,leader,connected};draw();};draw();
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
      await page.waitForSelector('.ka-layout-text');
      await page.waitForFunction(() => {
        const play = document.querySelector('.ka-controller-play')?.getBoundingClientRect();
        const engine = document.querySelector('.ka-layout-engine:not(.ka-layout-ghost)')?.getBoundingClientRect();
        if (!play || !engine) return false;
        return play.width === engine.width && play.height === engine.height;
      });
      // Reproduce the live route: layout arrives before the playing/theme update.
      await page.waitForSelector('.ka-layout-surface[style]');
      await page.evaluate(() => { (window as unknown as { showPoker(): void }).showPoker(); });
      await page.waitForSelector('.ka-controller-shell[data-theme="peek-poker"]');
      const paint = await page.locator('.ka-layout-surface').evaluate((el, expected) => {
        const css = getComputedStyle(el);
        const probe = document.createElement('div');
        probe.style.backgroundColor = expected.colour; probe.style.backgroundImage = expected.treatment.image;
        document.body.append(probe);
        const reference = getComputedStyle(probe);
        const matches = css.backgroundColor === reference.backgroundColor && css.backgroundImage === reference.backgroundImage;
        probe.remove();
        const channels = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number).slice(0, 3);
        const luminance = (s: string) => channels(s).reduce((sum, c, i) => {
          const v = c / 255;
          return sum + (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4) * ([0.2126, 0.7152, 0.0722][i] ?? 0);
        }, 0);
        const texts = [...document.querySelectorAll('.ka-layout-text, .ka-private-stat-label, .ka-private-stat-value')];
        const b = luminance(css.backgroundColor);
        return { matches, contrasts: texts.map(text => {
          const a = luminance(getComputedStyle(text).color);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        }) };
      }, THEMES['peek-poker'].background);
      expect(paint.matches).toBe(true);
      expect(paint.contrasts).toHaveLength(3);
      expect(paint.contrasts.every(contrast => contrast >= 4.5)).toBe(true);
      await page.evaluate(() => { (window as unknown as { showPicking(): void }).showPicking(); });
      await page.waitForSelector('.ka-layout-grid .ka-layout-target');
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
              const css = getComputedStyle(n);
              // Transparent colours can retain nonzero RGB channels. They paint
              // nothing regardless of the reference element's serialised colour.
              const clear = (colour: string) => colour === 'transparent' || /^(?:rgba\([^)]*,\s*0(?:\.0+)?\)|[^/]+\/\s*0(?:\.0+)?%?\))$/.test(colour);
              const border = ['Top', 'Right', 'Bottom', 'Left'].some(side =>
                parseFloat(css.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 &&
                !clear(css.getPropertyValue(`border-${side.toLowerCase()}-color`)));
              return css.backgroundImage !== 'none' || !clear(css.backgroundColor) || border ||
                css.boxShadow !== 'none' || (css.outlineStyle !== 'none' && parseFloat(css.outlineWidth) > 0 && !clear(css.outlineColor));
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
      const menu = page.getByRole('button', { name: 'Menu', exact: true });
      const menuBox = await menu.boundingBox();
      expect(menuBox && menuBox.width >= 89 && menuBox.height >= 68).toBe(true);
      const gameBoxes = await page.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-control]').evaluateAll(nodes => nodes.map(n => {
        const r = n.getBoundingClientRect();
        return { id: n.getAttribute('data-control'), x: r.x, y: r.y, width: r.width, height: r.height };
      }));
      expect(gameBoxes).toHaveLength(17);
      for (const box of gameBoxes) {
        expect(menuBox && (box.x + box.width <= menuBox.x || box.x >= menuBox.x + menuBox.width ||
          box.y + box.height <= menuBox.y || box.y >= menuBox.y + menuBox.height),
        `${String(width)} × ${String(height)}: ${String(box.id)} intersects Menu`).toBe(true);
      }
      expect(await menu.evaluate(n => Boolean(n.closest('.ka-controller-header')))).toBe(true);
      const pillBox = await menu.locator('.phone-session-pill').boundingBox();
      const barBox = await page.locator('.ka-controller-header').boundingBox();
      expect(pillBox && barBox && pillBox.y >= barBox.y && pillBox.y + pillBox.height <= barBox.y + barBox.height).toBe(true);
      // Before any pointer input (Chromium shows :focus-visible on a script-focused
      // container then), a lost link focuses its dialog with no outline drawn.
      await page.keyboard.press('Shift');
      await page.evaluate(() => { (window as unknown as { consoleState(phase: string, leader: boolean, connected: boolean): void }).consoleState('playing', false, false); });
      const consolePaint = await page.locator('.ka-layout-engine:not(.ka-layout-ghost) > .ka-layout-surface').evaluate((el, expected) => {
        const probe = document.createElement('div');
        probe.style.backgroundColor = expected.colour; probe.style.backgroundImage = expected.treatment.image;
        document.body.append(probe);
        const css = getComputedStyle(el), reference = getComputedStyle(probe);
        const matches = css.backgroundColor === reference.backgroundColor && css.backgroundImage === reference.backgroundImage;
        probe.remove(); return matches;
      }, THEMES.console.background);
      expect(consolePaint).toBe(true);
      const freshLost = page.getByRole('dialog', { name: 'Connection lost', exact: true }); await freshLost.waitFor();
      expect(await freshLost.evaluate(n => document.activeElement === n && getComputedStyle(n).outlineStyle)).toBe('none');
      await page.evaluate(() => { (window as unknown as { consoleState(phase: string, leader: boolean, connected: boolean): void }).consoleState('playing', false, true); });
      await menu.click(); expect(await page.locator('body').getAttribute('data-command')).toBe('menu');
      for (const leader of [true, false]) {
        await page.evaluate(leader => { (window as unknown as { consoleState(phase: string, leader: boolean, connected: boolean): void }).consoleState('paused', leader, true); }, leader);
        const dialog = page.getByRole('dialog', { name: 'Paused', exact: true }); await dialog.waitFor();
        // Measure the settled veil, not its entrance (it scales in from 0.95).
        await dialog.evaluate(n => Promise.all(n.getAnimations({ subtree: true }).map(a => a.finished)));
        expect(await menu.isDisabled()).toBe(true);
        expect(await menu.locator('.phone-session-pill').evaluate(pill => {
          const r = pill.getBoundingClientRect();
          return Boolean(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.phone-game-veil'));
        })).toBe(true);
        expect(await dialog.evaluate(n => n.contains(document.activeElement))).toBe(true);
        expect(await dialog.evaluate((n, leader) => document.activeElement === (leader ? n.querySelector('button') : n), leader)).toBe(true);
        expect(await page.locator('.phone-game-controls').evaluate(n => n.hasAttribute('inert'))).toBe(true);
        expect(await dialog.getByText('Only the leader can quit.', { exact: true }).count()).toBe(1);
        for (const name of ['Resume', 'Quit to picker']) {
          const button = dialog.getByRole('button', { name, exact: true });
          expect(await button.isDisabled()).toBe(!leader);
          const paint = await button.evaluate(n => {
            const css = getComputedStyle(n);
            const reference = document.createElement('span');
            reference.style.backgroundColor = 'var(--ka-accent)';
            reference.style.color = 'var(--ka-on-colour)';
            n.append(reference);
            const accent = getComputedStyle(reference).backgroundColor;
            const white = getComputedStyle(reference).color;
            reference.style.backgroundColor = 'transparent';
            const transparent = getComputedStyle(reference).backgroundColor;
            reference.remove();
            return { transparent, background: css.backgroundColor, image: css.backgroundImage,
              border: css.borderTopColor, borderWidth: css.borderTopWidth, borderStyle: css.borderTopStyle,
              colour: css.color, accent, white, opacity: css.opacity,
              disabledOpacity: String(1 - Number(css.getPropertyValue('--ka-opacity-ghost'))) };
          });
          expect(paint.background).toBe(name === 'Resume' ? paint.accent : paint.transparent);
          expect(paint.image).toBe('none');
          expect(paint.borderStyle).toBe('solid');
          expect(paint.borderWidth).toBe('3px');
          expect(paint.border).toBe(name === 'Resume' ? paint.accent : paint.white);
          if (name === 'Quit to picker') expect(paint.colour).toBe(paint.white);
          expect(paint.opacity).toBe(leader ? '1' : paint.disabledOpacity);
          const r = await button.boundingBox();
          expect(r && r.width >= 89 && r.height >= 68 && r.x >= 0 && r.y >= 0 && r.x + r.width <= (width ?? 667) && r.y + r.height <= (height ?? 375)).toBe(true);
          if (leader) { await button.click(); expect(await page.locator('body').getAttribute('data-command')).toBe(name === 'Resume' ? 'menu' : 'quit'); }
        }
        await page.evaluate(leader => { (window as unknown as { consoleState(phase: string, leader: boolean, connected: boolean): void }).consoleState('playing', leader, true); }, leader);
        expect(await menu.evaluate(n => document.activeElement === n)).toBe(true);
      }
      await page.evaluate(() => { (window as unknown as { consoleState(phase: string, leader: boolean, connected: boolean): void }).consoleState('playing', false, false); });
      const lost = page.getByRole('dialog', { name: 'Connection lost', exact: true }); await lost.waitFor();
      expect(await lost.evaluate(n => document.activeElement === n)).toBe(true);
      expect(await lost.evaluate(n => getComputedStyle(n).outlineStyle)).toBe('none');
      expect(await lost.innerText()).toContain('Reconnecting…');
      expect(await lost.innerText()).toContain('Your seat is kept for 2 minutes.');
      expect(await lost.innerText()).toContain('Host disconnected');
      expect(await page.locator('.phone-live').innerText()).toContain('Host disconnected');
      expect(await page.locator('.phone-game-controls').evaluate(n => n.hasAttribute('inert'))).toBe(true);
      await page.evaluate(() => { (window as unknown as { consoleState(phase: string, leader: boolean, connected: boolean): void }).consoleState('playing', false, true); });
      expect(await menu.evaluate(n => document.activeElement === n)).toBe(true);
      await page.close();
    }
  } finally { await browser.close(); }
}, 60000);
