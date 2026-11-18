// REL-002, PLAT-020, PERF-022; run with --phones 1.
import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function imagery(h) {
  const sizes = [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 390, height: 844 }];
  /** @param {string} name */
  const capture = async name => {
    if (name.includes('-start-')) await h.host.getByRole('status').filter({ hasText: 'Loading settings…' }).waitFor({ state: 'hidden' });
    await h.host.evaluate(async () => { await document.fonts.ready; await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))); });
    await h.host.evaluate(() => new Promise(resolve => { requestAnimationFrame(() => { requestAnimationFrame(() => { resolve(undefined); }); }); }));
    const failures = await h.host.locator('.landing-copy, .game-tile:not([data-hidden="true"]), .game-metadata, .game-setup-mirror, .picker-players').evaluateAll(nodes => nodes.filter(el => {
      if (!el.checkVisibility()) return false;
      const r = el.getBoundingClientRect();
      const scrollingLanding = el.matches('.landing-copy') && innerWidth <= 1000;
      return r.left < -1 || (!scrollingLanding && r.top < -1) || r.right > innerWidth + 1 || (!scrollingLanding && r.bottom > innerHeight + 1) || el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    }).map(el => el.getAttribute('class')));
    assert.deepEqual(failures, [], name);
    const images = await h.host.locator('.game-picture-slot img, .landing-picture:visible').evaluateAll(nodes => nodes.map(el => {
      const r = el.getBoundingClientRect();
      return { ratio: r.width / r.height, alt: el.getAttribute('alt'), ready: el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0 };
    }));
    for (const image of images) { assert.ok(image.alt && image.ready); assert.ok(Math.abs(image.ratio - 1.618) <= 0.02); }
    await h.shot(name);
  };
  for (const size of [...sizes, { width: 844, height: 390 }]) {
    await h.host.setViewportSize(size); await h.host.goto(h.origin); await h.host.locator('.landing-copy').waitFor();
    await h.host.locator('.landing-picture').evaluate(async el => { if (el instanceof HTMLImageElement) await el.decode(); });
    await capture(`landing-${String(size.width)}`);
    if (size.width <= 1000) {
      const before = await h.host.locator('.landing-screen').evaluate(el => el.scrollTop);
      await h.host.locator('.legal-footer').scrollIntoViewIfNeeded();
      const after = await h.host.locator('.landing-screen').evaluate(el => el.scrollTop);
      if (before !== after) await capture(`landing-footer-${String(size.width)}`);
    }
  }
  await h.createRoom();
  const phone = await h.newPhone(); await h.openJoin(phone, 'Player 1');
  await phone.getByRole('button', { name: 'Join', exact: true }).click(); await h.waitSeated(phone, 'Player 1');
  const heldPhone = await h.newPhone(); await h.openJoin(heldPhone, 'Player 2');
  await heldPhone.getByRole('button', { name: 'Join', exact: true }).click(); await h.waitSeated(heldPhone, 'Player 2');
  await heldPhone.getByRole('button', { name: 'Change name', exact: true }).click();
  await heldPhone.locator('#rename').fill('WWWWWWWWWWWW');
  await heldPhone.getByRole('button', { name: 'Save name', exact: true }).click();
  await h.host.setViewportSize({ width: 1920, height: 1080 });
  await h.host.emulateMedia({ reducedMotion: 'no-preference' });
  await phone.getByRole('button', { name: 'Pick a game', exact: true }).click();
  await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
  /** @param {string} name @param {string} button */
  const motion = async (name, button) => {
    await h.host.setViewportSize({ width: 1920, height: 1080 });
    await h.host.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))); });
    const strip = h.frameStrip(name, h.host, { frames: 6, everyMs: 100 });
    await phone.getByRole('button', { name: button, exact: true }).click();
    await strip;
  };
  await motion('picker-right-1920', 'Next');
  await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
  await motion('picker-left-1920', 'Previous');

  for (const game of ['tabao-rush', 'peek-poker', 'rabakz']) {
    await h.host.locator(`[data-game="${game}"][data-focused="true"]`).waitFor();
    for (const size of sizes) { await h.host.setViewportSize(size); await capture(`${game}-picker-${String(size.width)}`); }
    const tile = await h.host.locator(`[data-game="${game}"]`).elementHandle();
    assert.ok(tile);
    if (game === 'peek-poker') await phone.getByRole('button', { name: 'Select', exact: true }).click();
    else await motion(`${game}-select-1920`, 'Select');
    await h.host.locator(`[data-game="${game}"][data-expanded="true"]`).waitFor();
    if (game !== 'tabao-rush') await h.host.locator('.game-setup-mirror').waitFor();
    if (game === 'rabakz') {
      await h.host.locator('.setup-mirror-row').filter({ hasText: 'Difficulty' }).waitFor();
      assert.equal(await h.host.locator('.setup-mirror-row').count(), 4);
      await capture('rabakz-settings-loaded-start-1920');
    }
    assert.ok(await tile.evaluate(el => el === document.querySelector('.game-tile[data-expanded="true"]')));
    for (const size of sizes) {
      if (game === 'rabakz' && size.width === 1920) continue; // The settings-loaded still already captures this state.
      await h.host.setViewportSize(size); await capture(`${game}-start-${String(size.width)}`);
    }
    if (game === 'rabakz') {
      await h.host.setViewportSize({ width: 1920, height: 1080 });
      await phone.locator('.setup-field-row').filter({ has: phone.locator('.setup-field-heading > span', { hasText: /^Categories$/ }) }).getByRole('button').click();
      await phone.locator('.setup-tabs button').filter({ hasText: 'Singapore' }).click();
      // Leave only Singapore Life chosen, whatever the starting selection (main's defaults changed under this script).
      // Singapore first, so Life is on before anything is cleared; then clear every other choice in both tabs.
      for (const tab of ['Singapore', 'Around the world', 'Singapore']) {
        await phone.locator('.setup-tabs button').filter({ hasText: tab }).click();
        const options = phone.locator('.setup-option-grid button:not(.setup-group)');
        for (let i = 0; i < await options.count(); i += 1) {
          const option = options.nth(i);
          const want = tab === 'Singapore' && (await option.locator('.setup-option-label').innerText()).trim() === 'Life';
          if ((await option.getAttribute('aria-pressed') === 'true') !== want) await option.click();
        }
      }
      await phone.getByRole('button', { name: 'Done', exact: true }).click();
      const categories = h.host.locator('[data-field="categories"] dd');
      await categories.filter({ hasText: /^\s*Life\s*$/ }).waitFor().catch(async (/** @type {unknown} */ error) => { throw new Error(`Categories did not narrow to Life: "${await categories.innerText()}"`, { cause: error }); });
      const strip = h.frameStrip('rabakz-refusal-appear-1920', h.host, { frames: 6, everyMs: 100 });
      await phone.getByRole('button', { name: 'Hard', exact: true }).click({ force: true });
      const notice = h.host.locator('.setup-mirror-problem > [role="status"]');
      await notice.filter({ hasText: /Only \d+.*questions\./ }).waitFor();
      await capture('rabakz-refusal-start-1920');
      await strip;
      const clearing = h.frameStrip('rabakz-refusal-clear-1920', h.host, { frames: 6, everyMs: 100 });
      await phone.getByRole('button', { name: 'Mixed', exact: true }).click();
      await clearing;
      assert.equal(await notice.textContent(), '');
      await heldPhone.close();
      const held = h.host.locator('.game-tile[data-expanded="true"] .picker-players li').filter({ hasText: 'WWWWWWWWWWWW' });
      await held.getByText('Seat held', { exact: true }).waitFor();
      for (const size of sizes.slice(0, 2)) {
        await h.host.setViewportSize(size);
        await capture(`rabakz-held-long-name-start-${String(size.width)}`);
      }
    }
    if (game === 'peek-poker') await phone.getByRole('button', { name: 'Back', exact: true }).click();
    else await motion(`${game}-back-1920`, 'Back');
    if (game !== 'rabakz') await phone.getByRole('button', { name: 'Next', exact: true }).click();
  }
}
