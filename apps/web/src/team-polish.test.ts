import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import { phoneGridNamePresentations } from './seat-text';

it('PLAT-025 fits controls independently at 21px with grapheme-safe truncation', () => {
  const measure = (text: string, size: number) => Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)).length * size;
  expect(phoneGridNamePresentations([{ name: 'Jo', width: 100 }, { name: '👩‍🍳'.repeat(12), width: 100 }], measure)).toEqual([
    { lines: ['Jo'], size: 21 }, { lines: ['👩‍🍳👩‍🍳👩‍🍳…'], size: 21 },
  ]);
});

it('PLAT-025 renders headed halves, refits names and exposes pressed Teams state', async () => {
  const fixture = fileURLToPath(new URL('./team-polish-dom-fixture.tsx', import.meta.url));
  const route = fileURLToPath(new URL('./team-setup-route.tsx', import.meta.url));
  const bundle = await build({ configFile: false, build: { target: 'esnext', write: false, minify: false, lib: { entry: fixture, formats: ['es'], name: 'fixture' } }, esbuild: { jsx: 'automatic', jsxImportSource: 'preact' }, plugins: [{
    name: 'team-polish-fixture',
    resolveId(id) { return id === fixture ? id : undefined; },
    load(id) {
      if (id !== fixture) return;
      return `import { render } from 'preact';
        import { PhoneTeams, TeamsToggle } from '${route}';
        const root = document.createElement('main'); root.className = 'phone-page'; root.dataset.seated = 'true'; document.body.append(root);
        let players = []; let enabled = false; let notice = null; let revision = 0;
        const send = (control, id) => { if (control === 'teams-move') { const target = players.find(p => p.id === id); if (players.filter(p => p.team === target.team).length === 1) notice = (target.team === 0 ? 'Red' : 'Blue') + ' needs at least one player.'; else { notice = null; players = players.map(p => p.id === id ? {...p, team: 1 - p.team} : p); } draw(); } };
        function draw() { revision++; render(<><header class="phone-id"><span class="phone-badge">1</span><strong>Cloud Noodle</strong><span>Connected</span><button>Leave</button></header><div class="overlap"><PhoneTeams setup={{kind:'team-setup',revision,screen:'teams',enabled:true,error:null,players,notice,refused:Boolean(notice)}} seat={1} leader={true} send={send}/></div></>, root); }
        window.setRoster = (count, long = false, redCount = count - 1) => { players = Array.from({length: count}, (_, i) => ({id: String(i), seat: i+1, name: i === 0 ? (long ? 'WWWWWWWWWWWW' : 'Cloud Noodle') : 'Player ' + (i+1), colour:'seat-1', team: (i >= redCount) ? 1 : 0})); draw(); };
        window.setNotice = value => { notice = value; draw(); }; window.setRoster(8);
        const toggleRoot = document.createElement('div'); document.body.append(toggleRoot);
        function toggle() { render(<TeamsToggle enabled={enabled} toggle={() => { enabled = !enabled; toggle(); }}/>, toggleRoot); } toggle();`;
    },
  }] });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const output = Array.isArray(bundle) ? bundle[0] : bundle;
    if (!output || !('output' in output)) throw new Error('Missing fixture bundle');
    const chunk = output.output.find(item => item.type === 'chunk');
    if (!chunk) throw new Error('Missing fixture code');
    for (const path of ['../../../packages/ui/tokens.css', './style.css', './phone.css', './team-setup.css']) {
      await page.addStyleTag({ content: await readFile(fileURLToPath(new URL(path, import.meta.url)), 'utf8') });
    }
    await page.addStyleTag({ content: 'html, body { margin: 0; height: 100%; } * { box-sizing: border-box; }' });
    await page.clock.install();
    await page.addScriptTag({ type: 'module', content: chunk.code });
    await page.getByRole('button', { name: 'Move players', exact: true }).click();
    for (const count of [4, 8]) for (const width of [667, 844]) for (const redCount of Array.from({ length: count - 1 }, (_, i) => i + 1)) {
      await page.setViewportSize({ width, height: width === 667 ? 375 : 390 });
      await page.evaluate(({ count, redCount }) => { (Reflect.get(window, 'setRoster') as (count: number, long: boolean, redCount: number) => void)(count, false, redCount); }, { count, redCount });
      await page.evaluate(() => { (Reflect.get(window, 'setNotice') as (notice: string | null) => void)(null); });
      await expect.poll(() => page.locator('.phone-team-moves button').count()).toBe(count);
      expect(await page.getByRole('region', { name: 'Red', exact: true }).getByRole('heading', { name: 'Red', exact: true }).count()).toBe(1);
      expect(await page.getByRole('region', { name: 'Blue', exact: true }).getByRole('heading', { name: 'Blue', exact: true }).count()).toBe(1);
      await expect.poll(() => page.locator('.phone-team-moves button').evaluateAll(buttons => buttons.every(button => {
        const r = button.getBoundingClientRect(); const label = button.querySelector('.team-player-name');
        return r.height >= 55 && r.width >= 55 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && label !== null && parseFloat(getComputedStyle(label).fontSize) >= 21 && label.scrollWidth <= label.clientWidth + 1;
      }))).toBe(true);
      await expect.poll(() => page.locator('.phone-team-moves .team-player-name').evaluateAll(labels => labels.every(label => label.textContent === label.getAttribute('title')))).toBe(true);
      expect(await page.locator('.phone-team-actions button').evaluateAll(buttons => buttons.every(button => { const r = button.getBoundingClientRect(); return r.width >= 55 && r.height >= 55 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }) && new Set(buttons.map(button => button.getBoundingClientRect().top)).size === 1)).toBe(true);
      const gridTop = await page.locator('.phone-team-moves').evaluate(el => el.getBoundingClientRect().top);
      const actionsTop = await page.locator('.phone-team-actions').evaluate(el => el.getBoundingClientRect().top);
      for (const refused of [false, true]) {
        await page.evaluate(refused => { (Reflect.get(window, 'setNotice') as (notice: string | null) => void)(refused ? 'Red needs at least one player.' : null); }, refused);
        await expect.poll(() => page.locator('.phone-team-moves button, .phone-team-actions button').evaluateAll(buttons => buttons.every(button => {
          const r = button.getBoundingClientRect();
          if (r.width < 55 || r.height < 55 || r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) return false;
          for (let ancestor = button.parentElement; ancestor; ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor);
            if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
            const box = ancestor.getBoundingClientRect();
            const left = box.left + ancestor.clientLeft;
            const top = box.top + ancestor.clientTop;
            const right = box.left + ancestor.clientLeft + ancestor.clientWidth;
            const bottom = box.top + ancestor.clientTop + ancestor.clientHeight;
            if (r.left < left || r.top < top || r.right > right || r.bottom > bottom) return false;
          }
          const style = getComputedStyle(button);
          const tl = parseFloat(style.borderTopLeftRadius) + 2, tr = parseFloat(style.borderTopRightRadius) + 2;
          const bl = parseFloat(style.borderBottomLeftRadius) + 2, br = parseFloat(style.borderBottomRightRadius) + 2;
          return [[r.left + tl, r.top + tl], [r.right - tr, r.top + tr],
            [r.left + bl, r.bottom - bl], [r.right - br, r.bottom - br],
            [r.left + r.width / 2, r.top + 2], [r.left + r.width / 2, r.bottom - 2],
            [r.left + 2, r.top + r.height / 2], [r.right - 2, r.top + r.height / 2]].every(([x, y]) => {
            const hit = document.elementFromPoint(x ?? 0, y ?? 0);
            return hit !== null && button.contains(hit);
          });
        }))).toBe(true);
        expect(await page.locator('.phone-team-moves').evaluate(el => el.getBoundingClientRect().top)).toBe(gridTop);
        expect(await page.locator('.phone-team-actions').evaluate(el => el.getBoundingClientRect().top)).toBe(actionsTop);
        expect(await page.locator('.phone-team-half h2').evaluateAll(headings => headings.every(el => getComputedStyle(el).fontSize === '21px'))).toBe(true);
        expect(await page.locator('.phone-page, .phone-page .overlap, .phone-teams').evaluateAll(nodes => nodes.every(el => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth))).toBe(true);
      }
      expect(await page.locator('.phone-team-roster').evaluateAll(rosters => rosters.every(roster => new Set(Array.from(roster.children).map(button => button.getBoundingClientRect().top)).size <= 3))).toBe(true);
      expect(await page.locator('.phone-team-moves button').evaluateAll(buttons => Math.max(...buttons.map(b => b.getBoundingClientRect().width)) - Math.min(...buttons.map(b => b.getBoundingClientRect().width)))).toBeLessThan(1);
    }
    const jo = page.getByRole('button', { name: 'Seat 1, Cloud Noodle, Red team. Move to Blue.', exact: true });
    expect(await jo.locator('.team-player-name').textContent()).toBe('Cloud Noodle');
    await jo.click();
    expect(await page.getByRole('region', { name: 'Blue', exact: true }).getByRole('button', { name: 'Seat 1, Cloud Noodle, Blue team. Move to Red.', exact: true }).count()).toBe(1);
    await page.setViewportSize({ width: 667, height: 375 });
    await page.evaluate(() => { (Reflect.get(window, 'setRoster') as (count: number, long: boolean) => void)(8, true); });
    await page.evaluate(() => { (Reflect.get(window, 'setNotice') as (notice: string) => void)('Red needs at least one player.'); });
    const status = page.locator('.phone-team-heading-refusal');
    expect(await status.isVisible()).toBe(true);
    expect(await status.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(21);
    expect(await status.evaluate(el => { const r = el.getBoundingClientRect(); return getComputedStyle(el).clipPath === 'none' && r.width > 1 && r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth; })).toBe(true);
    expect(await page.locator('.phone-team-actions button').evaluateAll(buttons => buttons.every(button => { const r = button.getBoundingClientRect(); return r.width >= 55 && r.height >= 55 && r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth; }))).toBe(true);
    await expect.poll(() => page.locator('.phone-team-moves').getAttribute('data-heading-refused')).toBe('true');
    expect(await status.textContent()).toContain('Red needs at least one player.');
    expect(await status.evaluate(el => el.getBoundingClientRect().top)).toBe(await page.locator('.phone-team-half h2').first().evaluate(el => el.getBoundingClientRect().top));
    const positions = () => page.locator('.phone-team-moves, .phone-team-actions').evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().top));
    const beforeClear = await positions();
    await page.clock.fastForward(3000);
    await expect.poll(() => page.locator('.phone-team-moves').getAttribute('data-heading-refused')).toBe('false');
    await expect.poll(() => page.locator('.phone-team-half h2').evaluateAll(nodes => nodes.every(el => getComputedStyle(el).opacity === '1'))).toBe(true);
    expect(await positions()).toEqual(beforeClear);
    expect(await page.getByRole('status').count()).toBe(1);
    // An unrelated host update preserves the notice without reviving the heading.
    await page.evaluate(() => { (Reflect.get(window, 'setRoster') as (count: number, long: boolean, redCount: number) => void)(8, true, 1); });
    await expect.poll(() => page.locator('.phone-team-moves').getAttribute('data-heading-refused')).toBe('false');
    const loneRed = page.locator('.phone-team-half').first().getByRole('button');
    await loneRed.click();
    await expect.poll(() => page.locator('.phone-team-moves').getAttribute('data-heading-refused')).toBe('true');
    await page.clock.fastForward(3000);
    await expect.poll(() => page.locator('.phone-team-moves').getAttribute('data-heading-refused')).toBe('false');
    await loneRed.click();
    await expect.poll(() => page.locator('.phone-team-moves').getAttribute('data-heading-refused')).toBe('true');
    // A successful next tap clears the heading and consumes the pending tap.
    await page.locator('.phone-team-half').last().getByRole('button').first().click();
    await expect.poll(() => page.locator('.phone-team-moves').getAttribute('data-heading-refused')).toBe('false');
    await page.evaluate(() => { (Reflect.get(window, 'setNotice') as (notice: string) => void)('Blue needs at least one player.'); });
    await expect.poll(() => page.locator('.phone-team-moves').getAttribute('data-heading-refused')).toBe('true');
    expect(await status.textContent()).toContain('Blue needs at least one player.');
    await page.evaluate(() => { (Reflect.get(window, 'setRoster') as (count: number, long: boolean) => void)(8, true); });
    const label = page.locator('.phone-team-moves .team-player-name').first();
    await expect.poll(() => label.textContent()).toMatch(/…$/);
    const narrow = await label.textContent();
    await page.setViewportSize({ width: 1800, height: 600 });
    await expect.poll(() => label.textContent()).toBe('WWWWWWWWWWWW');
    expect(narrow).not.toBe(await label.textContent());
    const toggle = page.getByRole('button', { name: 'Teams', exact: true });
    expect(await toggle.getAttribute('aria-pressed')).toBe('false');
    const border = await toggle.evaluate(el => getComputedStyle(el).borderColor);
    await toggle.click();
    const on = page.getByRole('button', { name: 'Teams', exact: true });
    expect(await on.getAttribute('aria-pressed')).toBe('true');
    const pressed = on.locator('[data-visible="true"]');
    expect(await pressed.textContent()).toContain('✓');
    await expect.poll(() => on.evaluate(el => getComputedStyle(el).borderColor)).not.toBe(border);
    expect(await on.evaluate(el => { const probe = document.createElement('span'); probe.style.backgroundColor = 'var(--ka-chip)'; el.append(probe); const primary = getComputedStyle(probe).backgroundColor; probe.remove(); return getComputedStyle(el).backgroundColor === primary; })).toBe(false);
    expect(await on.evaluate(el => getComputedStyle(el).transitionProperty)).toContain('border-color');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await status.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    expect(await page.locator('.phone-team-half h2').first().evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    await on.click();
    const off = page.getByRole('button', { name: 'Teams', exact: true });
    expect(await off.getAttribute('aria-pressed')).toBe('false');
    expect(await off.locator('.phone-teams-state').first().evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
  } finally { await browser.close(); }
}, 120000);
