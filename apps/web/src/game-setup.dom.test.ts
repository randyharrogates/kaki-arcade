import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import preact from '@preact/preset-vite';
import { rabakzBank } from '@kaki/content-rabakz/vite';
it('PLAT-006/025 fits generic setup and grouped panels on phones and mirrors TV settings', async () => {
  const fixture = fileURLToPath(new URL('./game-setup-dom-fixture.tsx', import.meta.url));
  const route = fileURLToPath(new URL('./game-setup-route.tsx', import.meta.url));
  const pickerRoute = fileURLToPath(new URL('./picker-route.tsx', import.meta.url));
  const model = fileURLToPath(new URL('./game-setup.ts', import.meta.url));
  const registry = fileURLToPath(new URL('./game-registry.ts', import.meta.url));
  const loading = fileURLToPath(new URL('./session-loading.ts', import.meta.url));
  const bundle = await build({ configFile: false, build: { target: 'esnext', write: false, minify: false, lib: { entry: fixture, formats: ['es'], name: 'fixture' }, rolldownOptions: { output: { codeSplitting: false } } }, plugins: [preact(), rabakzBank(), {
    name: 'setup-fixture', resolveId: id => id === fixture ? id : undefined,
    load(id) {
      if (id !== fixture) return;
      return `import { render } from 'preact'; import { GameSetup } from '${route}';
        import { GamePicker } from '${pickerRoute}'; import { createRoom, initialPicker } from '@kaki/platform';
        import { settingsView, reconcileSettings, settingChange } from '${model}'; import { loadGame, gameMetas } from '${registry}'; import { prepareSetup } from '${loading}';
        const root = document.createElement('main'); root.className = 'phone-page'; root.dataset.seated = 'true'; root.dataset.setup = 'true'; document.body.append(root);
        let setup; let schema; let values; let tv = false; let focused = 2; let hideSettings = false;
        const room = {...createRoom(),leader:1,players:Array.from({length:8}, (_,i)=>({seat:i+1,name:['MOHAMMAD ALI','Wan Ting Lim','WWWWWWWWWWWW'][i%3],disconnectedAt:i === 2 ? 1 : null}))};
        function draw() { setup = {...setup, settings: settingsView(schema, values)}; render(tv ? <GamePicker state={{...initialPicker(gameMetas),screen:'start',focus:gameMetas[focused].id}} room={room} setup={hideSettings ? null : setup}/> : <GameSetup setup={setup} leader leaderName="Leader" change={(id, value) => {const reason = id === 'items' && value.includes('b') ? 'Only 8 questions. Add a category.' : settingChange(schema, values, id, value).reason; if (!reason) values = {...values, [id]:value}; setup = {...setup, revision:setup.revision+1, refusal:reason ? {field:id,sentence:reason,revision:setup.revision+1} : null}; draw();}} toggle={() => {setup.enabled = !setup.enabled; draw();}} start={() => {}} back={() => {}}/>, root); }
        window.longRefusal = sentence => { setup = {...setup, refusal:{field:'difficulty',sentence,revision:2}}; schema = {...schema,check:()=>sentence}; draw(); };
        window.teamState = (enabled) => { setup = {...setup,enabled,teamsReason:'Teams need 2 players'}; draw(); };
        window.noSettings = () => { schema = {fields:[]}; values = {}; draw(); };
        window.hideSettings = (hidden) => { hideSettings = hidden; draw(); };
        window.clearRefusal = () => { setup = {...setup,refusal:null}; schema = {...schema,check:()=>null}; draw(); };
        window.mirrorRefusal = () => { tv = true; root.className = 'host-shell'; draw(); };
        window.refusalFixture = () => {
          schema = {fields:[{kind:'multi',id:'items',label:'Categories',default:[],options:[{value:'a',label:'Available'},{value:'b',label:'Unavailable'}]}, {kind:'choice',id:'difficulty',label:'Difficulty',default:'mixed',options:[{value:'mixed',label:'Mixed'},{value:'hard',label:'Hard'}]}],check: v => v.difficulty === 'hard' || v.items.includes('b') ? 'Only 8 questions. Add a category.' : null};
          values = reconcileSettings(schema); tv = false; setup = {...setup,revision:1,refusal:null}; draw();
        };
        window.setFixture = async (index, mirror = false) => {
          tv = mirror; focused = Math.max(0,index); root.className = tv ? 'host-shell' : 'phone-page';
          if (index >= 0) { const game = await loadGame(gameMetas[index].id); schema = (await prepareSetup(game)).schema; }
          else schema = {fields:[{kind:'multi',id:'items',label:'Categories',default:[],noneLabel:'Mixed',options:Array.from({length:16}, (_,i)=>({value:i,label:['Arts and literature','Film and television','Games and anime','General knowledge','Geography','History','Music','Science and nature','Sport','Tech and vehicles','Arts and sport','Food','History','Life','Nature','Places'][i],group:i<10?'Around the world':'Singapore'}))}]};
          if (index === 2) { const candidates = []; for (const length of [10,30,50]) for (const difficulty of ['easy','mixed','hard']) for (const categories of [[], ...schema.fields.find(f=>f.id === 'categories').options.map(o=>[o.value])]) { const problem = schema.check({length,difficulty,categories}); if (problem) candidates.push(problem); } window.longestSentence = candidates.sort((a,b)=>b.length-a.length)[0]; }
          values = reconcileSettings(schema); setup = {kind:'team-setup',revision:1,screen:'choice',enabled:false,teamsOffered:index !== 1,teamsReason:null,players:[],error:null}; draw(); return setup;
        }; await window.setFixture(2);`;
    },
  }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing bundle');
  const chunk = output.output.find(item => item.type === 'chunk');
  if (!chunk) throw new Error('Missing fixture code');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const path of ['../../../packages/ui/tokens.css', './style.css', './phone.css', './team-setup.css', './game-setup.css']) await page.addStyleTag({ content: await readFile(fileURLToPath(new URL(path, import.meta.url)), 'utf8') });
    await page.addStyleTag({ content: 'html, body { margin: 0; height: 100%; } * { box-sizing: border-box; }' });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    const setFixture = (index: number, mirror = false) => page.evaluate(async ({ index, mirror }) => (Reflect.get(window, 'setFixture') as (index: number, mirror: boolean) => Promise<unknown>)(index, mirror), { index, mirror });
    // This fixture sets scale synchronously; settle rendering and card transitions before measuring.
    const settleTV = async () => {
      await page.evaluate(async () => {
        await new Promise<void>(resolve => requestAnimationFrame(() => { requestAnimationFrame(() => { resolve(); }); }));
        await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined)));
      });
      await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--screen-scale') === String(Math.min(innerWidth / 1920, innerHeight / 1080)));
    };
    const expectOutgoingAt = async (before: { x: number; y: number; width: number; height: number } | null) => {
      expect(before).not.toBeNull();
      const outgoing = page.locator('.setup-problem-outgoing');
      const rect = await outgoing.boundingBox();
      expect(rect).not.toBeNull();
      if (!before || !rect) throw new Error('Missing notice rectangle');
      for (const edge of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(rect[edge] - before[edge])).toBeLessThanOrEqual(1);
      expect(await outgoing.evaluate(el => {
        const r = el.getBoundingClientRect();
        const card = el.closest('.game-tile')?.getBoundingClientRect();
        if (!card) return false;
        return r.left >= card.left && r.right <= card.right && r.top >= card.top && r.bottom <= card.bottom;
      })).toBe(true);
    };
    const fits = async () => await page.locator('.phone-game-setup, .setup-option-grid').evaluateAll(nodes => nodes.every(el => {
      const r = el.getBoundingClientRect(); const page = el.closest('.phone-page');
      if (!page) return false; const style = getComputedStyle(page);
      return r.left >= parseFloat(style.paddingLeft) && r.top >= parseFloat(style.paddingTop) && r.right <= innerWidth - parseFloat(style.paddingRight) && r.bottom <= innerHeight - parseFloat(style.paddingBottom) && el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
    })) && await page.locator('.phone-game-setup button:visible').evaluateAll(buttons => buttons.every(button => {
      const r = button.getBoundingClientRect(); const style = getComputedStyle(button);
      return r.width >= 55 && r.height >= 55 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && parseFloat(style.fontSize) >= 21 && button.scrollWidth <= button.clientWidth + 1 && button.scrollHeight <= button.clientHeight + 1;
    }));
    for (const width of [667, 844]) {
      await page.setViewportSize({ width, height: width === 667 ? 375 : 390 });
      for (const index of [2, 1, -1]) {
        await setFixture(index); await expect.poll(fits).toBe(true);
        if (index === 2) expect(await page.locator('.setup-field-row').count()).toBe(3);
        if (index === 2 || index === -1) {
          await page.locator('.setup-field-row').filter({ hasText: 'Categories' }).getByRole('button').click();
          const grid = page.locator('.setup-option-grid');
          expect(await page.getByRole('button', { name: 'Done', exact: true }).evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(await grid.getByRole('button').first().evaluate(el => getComputedStyle(el).backgroundColor));
          expect(await grid.getByRole('button').first().getAttribute('aria-pressed')).toBe('true');
          expect(await grid.getByRole('button').first().innerText()).toContain('Mixed');
          expect(await grid.getByRole('button', { name: 'All of Around the world', exact: true }).count()).toBe(0);
          expect(await grid.getByRole('button').count()).toBe(11);
          await expect.poll(fits).toBe(true);
          process.stdout.write(JSON.stringify({ round: 'G', width, fixture: index, tab: 'Around the world', bottom: await grid.evaluate(el => el.getBoundingClientRect().bottom) }) + '\n');
          const groupName = 'Singapore';
          await page.getByRole('button', { name: groupName, exact: true }).click();
          // D-157 board B: Mixed sits first in the first group's tab only; the other tab leads with its group button.
          expect(await grid.getByRole('button', { name: 'Mixed', exact: true }).count()).toBe(0);
          expect(await grid.getByRole('button', { name: `All of ${groupName}`, exact: true }).count()).toBe(1);
          expect(await grid.getByRole('button').count()).toBe(7);
          process.stdout.write(JSON.stringify({ round: 'G', width, fixture: index, tab: groupName, bottom: await grid.evaluate(el => el.getBoundingClientRect().bottom) }) + '\n');
          await expect.poll(fits).toBe(true);
          await grid.getByRole('button', { name: `All of ${groupName}`, exact: true }).click();
          expect(await page.locator('.setup-option-grid button[aria-pressed="true"]').count()).toBe(7);
          await expect.poll(fits).toBe(true);
          await page.locator('.setup-tabs button').first().click();
          await grid.getByRole('button', { name: 'Mixed', exact: true }).click();
          expect(await grid.locator('button[aria-pressed="true"]').count()).toBe(1);
          await page.getByRole('button', { name: 'Done', exact: true }).click();
        }
      }
    }
    await setFixture(2);
    await page.evaluate(() => { (Reflect.get(window, 'teamState') as (enabled: boolean) => void)(true); });
    expect(await page.locator('.setup-teams-row').isDisabled()).toBe(false);
    await page.locator('.setup-teams-row button').click();
    expect(await page.locator('.setup-teams-row').isDisabled()).toBe(true);
    await page.setViewportSize({width:1920,height:1080});
    await page.evaluate(() => { document.documentElement.style.setProperty('--screen-scale', '1'); });
    await setFixture(2, true); await settleTV();
    await page.evaluate(() => { (Reflect.get(window, 'teamState') as (enabled: boolean) => void)(false); });
    expect(await page.locator('.host-hints').innerText()).not.toContain('T: teams');
    // Round K: title and mirror must stay within the card at both TV sizes.
    for (const [width, height] of [[1280, 720], [1920, 1080]] as const) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { document.documentElement.style.setProperty('--screen-scale', String(innerWidth / 1920)); });
      await setFixture(2, true); await settleTV();
      expect(await page.locator('.game-tile[data-expanded="true"]').evaluate(card => {
        const outer = card.getBoundingClientRect();
        const inside = (r: DOMRect, bounds: { left: number; top: number; right: number; bottom: number }) => r.left >= bounds.left && r.top >= bounds.top && r.right <= bounds.right && r.bottom <= bounds.bottom;
        return {
          card: inside(outer, { left: 0, top: 0, right: innerWidth, bottom: innerHeight }),
          contents: Array.from(card.querySelectorAll('.game-setup-mirror, .game-metadata h2')).map(el => {
            const r = el.getBoundingClientRect();
            return { element: el.getAttribute('class') ?? el.tagName, inside: inside(r, outer) };
          }),
        };
      })).toEqual({ card: true, contents: [{ element: 'H2', inside: true }, { element: 'game-setup-mirror', inside: true }] });
    }
    // D-170: longest supported refusal flows below the summary, preserving values.
    await setFixture(2);
    const sentence = await page.evaluate(() => String(Reflect.get(window, 'longestSentence')));
    expect(sentence.length).toBeLessThanOrEqual(89);
    for (const [width, height] of [[667, 375], [844, 390], [1920, 1080], [1280, 720]] as const) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { document.documentElement.style.setProperty('--screen-scale', String(innerWidth / 1920)); });
      await setFixture(2, width > 844); if (width > 844) await settleTV();
      const cardBefore = width > 844 ? await page.locator('.game-tile[data-expanded="true"]').boundingBox() : null;
      const detailTop = width > 844 ? await page.locator('.game-tile[data-expanded="true"] .game-detail').evaluate(el => el.getBoundingClientRect().top) : null;
      const enabled = width <= 844 ? await page.getByRole('button', { name: 'Start', exact: true }).evaluate(el => getComputedStyle(el).backgroundColor) : '';
      await page.evaluate(sentence => { (Reflect.get(window, 'longRefusal') as (s: string) => void)(sentence); }, sentence);
      const notice = page.locator('[role="status"]').filter({ hasText: sentence });
      expect(await notice.count()).toBe(1);
      expect(await notice.evaluate(el => {
        const r = el.getBoundingClientRect();
        return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
      })).toBe(true);
      if (width <= 844) {
        await expect.poll(fits).toBe(true);
        expect(await notice.evaluate(el => el.getBoundingClientRect().top >= Math.max(...Array.from(document.querySelectorAll('.setup-field, .setup-teams-row')).map(row => row.getBoundingClientRect().bottom)))).toBe(true);
        const start = page.getByRole('button', { name: 'Start', exact: true });
        expect(await start.isDisabled()).toBe(true);
        expect(await start.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(enabled);
      } else {
        expect(await page.locator('.game-tile[data-expanded="true"]').boundingBox()).toEqual(cardBefore);
        const detail = page.locator('.game-tile[data-expanded="true"] .game-detail');
        expect(Math.abs(await detail.evaluate(el => el.getBoundingClientRect().top) - (detailTop ?? 0))).toBeLessThanOrEqual(1);
        expect(await notice.evaluate(el => {
          const r = el.getBoundingClientRect();
          const card = el.closest('.game-tile')?.getBoundingClientRect();
          const tiles = Array.from(document.querySelectorAll('.game-tile[data-expanded="true"] .picker-players li'));
          return tiles.length === 8 && card && r.left >= card.left && r.right <= card.right && r.top >= card.top && r.bottom <= card.bottom && tiles.every(tile => {
            const box = tile.getBoundingClientRect();
            const label = tile.querySelector('.picker-player-text');
            const name = tile.querySelector('.picker-player-name');
            if (!label || !name) return false;
            const css = getComputedStyle(label);
            const scale = innerWidth / 1920;
            return box.bottom <= r.top && box.left >= card.left && box.right <= card.right && box.top >= card.top && box.bottom <= card.bottom && label.getBoundingClientRect().height <= 2 * parseFloat(css.lineHeight) * scale + 1 && name.getAttribute('title') === name.textContent;
          });
        })).toBe(true);
        expect(await page.locator('.game-tile[data-expanded="true"] .picker-seat-held').count()).toBe(1);
        expect(await page.locator('.setup-mirror-row dd').evaluateAll(nodes => nodes.every(el => getComputedStyle(el).visibility === 'visible'))).toBe(true);
        expect(await notice.evaluate(el => el.getBoundingClientRect().top >= Math.max(...Array.from(document.querySelectorAll('.setup-mirror-row')).map(row => row.getBoundingClientRect().bottom)))).toBe(true);
      }
      const beforeClear = width > 844 ? await notice.boundingBox() : null;
      await page.evaluate(() => { (Reflect.get(window, 'clearRefusal') as () => void)(); });
      if (width > 844) {
        await expectOutgoingAt(beforeClear);
        expect(Math.abs(await page.locator('.game-tile[data-expanded="true"] .game-detail').evaluate(el => el.getBoundingClientRect().top) - (detailTop ?? 0))).toBeLessThanOrEqual(1);
        const status = page.locator('.setup-mirror-problem > [role="status"]');
        expect(await status.textContent()).toBe('');
        expect(await status.evaluate(el => { for (let node: Element | null = el; node; node = node.parentElement) if (getComputedStyle(node).display === 'none' || getComputedStyle(node).visibility === 'hidden') return false; return true; })).toBe(true);
      }
    }
    // Text replacements retain the previous notice alongside the mounted live region.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const [width, height] of [[1920, 1080], [1280, 720]] as const) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { document.documentElement.style.setProperty('--screen-scale', String(innerWidth / 1920)); });
      await setFixture(2, true); await settleTV();
      const status = page.locator('.setup-mirror-problem > [role="status"]');
      const mounted = await status.elementHandle();
      for (const text of ['Loading replacement.', sentence]) {
        await page.evaluate(text => { (Reflect.get(window, 'longRefusal') as (s: string) => void)(text); }, text);
        await settleTV();
      }
      const beforeReplacement = await status.boundingBox();
      await page.evaluate(() => { (Reflect.get(window, 'longRefusal') as (s: string) => void)('Only 8 questions.'); });
      await expectOutgoingAt(beforeReplacement);
      expect(await page.locator('.setup-problem-outgoing').textContent()).toContain(sentence);
      expect(await page.locator('.setup-problem-outgoing').getAttribute('aria-hidden')).toBe('true');
      expect(await page.locator('.setup-problem-outgoing').getAttribute('role')).toBeNull();
      expect(await status.textContent()).toContain('Only 8 questions.');
      expect(await mounted.evaluate(el => el === document.querySelector('.setup-mirror-problem > [role="status"]'))).toBe(true);
      await settleTV();
      expect(await page.locator('.setup-problem-outgoing').count()).toBe(0);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => { (Reflect.get(window, 'longRefusal') as (s: string) => void)('Instant replacement.'); });
      expect(await status.textContent()).toContain('Instant replacement.');
      expect(await page.locator('.setup-problem-outgoing').count()).toBe(0);
      expect(await status.evaluate(el => el.getAnimations().length)).toBe(0);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
    // Round F: compare against the same start card without a settings envelope.
    for (const [width, height] of [[1920, 1080], [1280, 720]] as const) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { document.documentElement.style.setProperty('--screen-scale', String(innerWidth / 1920)); });
      await setFixture(2, true); await settleTV();
      const card = page.locator('.game-tile[data-expanded="true"]');
      // D-165 geometry also holds when the start card contains R-04's mirror.
      const header = page.locator('.picker-screen > header');
      expect(await header.evaluate(el => el.getBoundingClientRect().height / (innerWidth / 1920))).toBeCloseTo(175.2, 1);
      expect(await page.locator('.picker-stage').evaluate(el => el.getBoundingClientRect().top / (innerWidth / 1920))).toBeCloseTo(264.2, 1);
      expect(await header.locator('.incoming').evaluate(el => getComputedStyle(el).paddingTop)).toBe('21px');
      expect(await header.locator('.host-hints').innerText()).toContain('Enter: start');
      const geometry = () => card.locator('.game-picture-slot, .game-metadata').evaluateAll(nodes => nodes.map(el => {
        const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height };
      }));
      await page.evaluate(() => { (Reflect.get(window, 'hideSettings') as (hidden: boolean) => void)(true); });
      const baseline = await geometry();
      // The setup-only grid must leave C-12's plain start header/stage intact.
      expect(await header.evaluate(el => el.getBoundingClientRect().height / (innerWidth / 1920))).toBeCloseTo(175.2, 1);
      expect(await page.locator('.picker-stage').evaluate(el => el.getBoundingClientRect().top / (innerWidth / 1920))).toBeCloseTo(264.2, 1);
      await page.evaluate(() => { (Reflect.get(window, 'hideSettings') as (hidden: boolean) => void)(false); });
      const current = await geometry();
      expect(current[0]?.height).toBeGreaterThan(0);
      expect(baseline[0]?.height).toBeGreaterThan(0);
      expect(await card.locator('.game-metadata h2').innerText()).toBe('Rabakz');
      expect(await card.locator('.game-metadata p').first().innerText()).not.toBe('');
      expect(await card.locator('.setup-mirror-row dt').allTextContents()).toEqual(['Questions', 'Categories', 'Difficulty', 'Teams']);
      expect(await card.locator('.game-picture-slot, .game-metadata h2, .game-metadata p, .game-start-content h3, .picker-players, .game-setup-mirror, .setup-mirror-row, .setup-mirror-row dt, .setup-mirror-row dd').evaluateAll(nodes => nodes.flatMap(el => {
        const r = el.getBoundingClientRect();
        // Headings may let display glyphs run past a tight line box; that is only a defect if something clips them.
        const heading = /^H[1-6]$/.test(el.tagName);
        const unclipped = heading ? getComputedStyle(el).overflow === 'visible' && getComputedStyle(el.parentElement ?? el).overflow === 'visible' : el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
        const safeMargin = 55 * innerWidth / 1920;
        const ok = r.width > 0 && r.height > 0 && r.left >= safeMargin && r.top >= safeMargin && r.right <= innerWidth - safeMargin && r.bottom <= innerHeight - safeMargin && unclipped;
        return ok ? [] : [`${el.tagName}.${el.getAttribute('class') ?? ''} ${String(Math.round(r.left))},${String(Math.round(r.top))}–${String(Math.round(r.right))},${String(Math.round(r.bottom))} overflow ${String(el.scrollHeight - el.clientHeight)}`];
      }))).toEqual([]);
      expect(await card.locator('.game-tile-content').evaluateAll(nodes => nodes.every(el => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1))).toBe(true);
      // No-settings games retain their original card geometry and have no mirror.
      for (const index of [0, 1]) {
        await setFixture(index, true);
        if (index === 1) await page.evaluate(() => { (Reflect.get(window, 'noSettings') as () => void)(); });
        await page.evaluate(() => { (Reflect.get(window, 'hideSettings') as (hidden: boolean) => void)(true); });
        const without = await geometry();
        await page.evaluate(() => { (Reflect.get(window, 'hideSettings') as (hidden: boolean) => void)(false); });
        expect(await card.locator('.game-setup-mirror').count()).toBe(0);
        expect(await geometry()).toEqual(without);
      }
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.evaluate(() => { document.documentElement.style.setProperty('--screen-scale', '1'); });
    await setFixture(2, true); await settleTV();

    await expect.poll(() => page.locator('.game-tile[data-expanded="true"] .game-setup-mirror span, .game-tile[data-expanded="true"] .game-setup-mirror strong').evaluateAll(nodes => nodes.length > 0 && nodes.every(el => {
      const r = el.getBoundingClientRect(); const tile = el.closest('.game-tile')?.getBoundingClientRect();
      return tile !== undefined && parseFloat(getComputedStyle(el).fontSize) >= 34 && r.left >= tile.left && r.top >= tile.top && r.right <= tile.right && r.bottom <= tile.bottom && r.right <= innerWidth && r.bottom <= innerHeight;
    }))).toBe(true);
  } finally { await browser.close(); }
}, 120000);
