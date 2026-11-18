// RZ-001, RZ-010, RZ-011, RZ-012, PLAT-006, PLAT-025.
import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function setup(h) {
  assert.ok([1, 2, 8].includes(h.maxPhones));
  await h.createRoom();
  /** @type {import('playwright').Page[]} */
  const phones = [];
  for (let i = 0; i < h.maxPhones; i++) {
    const page = await h.newPhone(); await h.openJoin(page, `Player ${String(i + 1)}`);
    await page.getByRole('button', { name: 'Join', exact: true }).click(); await h.waitSeated(page, `Player ${String(i + 1)}`); phones.push(page);
  }
  const leader = phones[0]; assert.ok(leader);
  /** @param {string} name */
  const click = async name => { await leader.getByRole('button', { name, exact: true }).click(); };
  /** @param {import('playwright').Page} page @param {number} width */
  // The phone page follows the viewport through a listener, so let two frames pass before measuring.
  const size = async (page, width) => { await page.setViewportSize({ width, height: width === 667 ? 375 : 390 }); await page.evaluate(() => new Promise(resolve => { requestAnimationFrame(() => { requestAnimationFrame(() => { resolve(undefined); }); }); })); };
  /** @param {string} name @param {import('playwright').Page} page */
  async function shot(name, page) {
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))); });
    // A viewport resize reaches the page's resize listener only at the next frame; measure after it.
    await page.evaluate(() => new Promise(resolve => { requestAnimationFrame(() => { requestAnimationFrame(() => { resolve(undefined); }); }); }));
    const tv = page === h.host;
    if (tv) await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--screen-scale') === String(Math.min(innerWidth / 1920, innerHeight / 1080)));
    const overflow = await page.locator(tv ? '.game-setup-mirror' : '.phone-game-setup, .phone-picker').evaluateAll(nodes => nodes.flatMap(el => {
      const r = el.getBoundingClientRect();
      const ok = r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
      return ok ? [] : [`${el.getAttribute("class") ?? el.tagName} box ${String(Math.round(r.left))},${String(Math.round(r.top))}–${String(Math.round(r.right))},${String(Math.round(r.bottom))} in ${String(innerWidth)}×${String(innerHeight)}, scroll ${String(el.scrollWidth)}×${String(el.scrollHeight)} vs ${String(el.clientWidth)}×${String(el.clientHeight)}`];
    }));
    assert.deepEqual(overflow, [], `${name}: setup must fit its screen`);
    if (tv) assert.ok(await page.locator('.setup-mirror-row span, .setup-mirror-row strong').evaluateAll(nodes => nodes.every(el => parseFloat(getComputedStyle(el).fontSize) >= 34)));
    else {
      assert.ok(await page.locator('button:visible').evaluateAll(nodes => nodes.every(el => { const r = el.getBoundingClientRect(); return r.width >= 55 && r.height >= 55 && r.bottom <= innerHeight && parseFloat(getComputedStyle(el).fontSize) >= 21; })));
      assert.ok(await page.locator('[aria-pressed]:visible, [aria-disabled]:visible').evaluateAll(nodes => nodes.every(el => ['true', 'false'].includes(el.getAttribute('aria-pressed') ?? el.getAttribute('aria-disabled') ?? ''))));
    }
    await h.shot(name, page);
  }
  await h.step('Open settings and mirror default values', async () => {
    await click('Pick a game'); await click('Next'); await click('Next'); await click('Select');
    await leader.getByRole('region', { name: 'Game settings' }).waitFor();
    await leader.getByRole('button', { name: '10', exact: true }).waitFor();
    for (const width of [667, 844]) { await size(leader, width); await shot(`setup-leader-default-${String(width)}`, leader); }
    if (phones[1]) for (const width of [667, 844]) { await size(phones[1], width); await shot(`setup-watcher-${String(width)}`, phones[1]); }
    await shot('setup-tv-default', h.host);
    await h.host.setViewportSize({width:1280,height:720}); await shot('setup-tv-default-720', h.host);
    await h.host.setViewportSize({width:1920,height:1080});
  });
  await h.step('Other installed schemas need no console-specific code', async () => {
    const ids = await h.host.locator('.game-tile').evaluateAll(tiles => tiles.map(tile => tile.getAttribute('data-game') ?? ''));
    await click('Back'); await click('Previous'); await click('Select');
    await leader.getByRole('button', { name: '5', exact: true }).waitFor();
    await size(leader, 667); await shot(`${ids[1] ?? ''}-rounds-leader-667`, leader); await shot(`${ids[1] ?? ''}-rounds-tv`, h.host);
    // Each press waits for the phone to show its result, so no press lands before the host has applied the last.
    await click('Back'); await leader.getByRole('button', { name: 'Previous', exact: true }).waitFor();
    const shown = await leader.locator('strong, b').filter({ hasText: /\S/ }).last().innerText();
    await click('Previous');
    await leader.waitForFunction(before => [...document.querySelectorAll('strong, b')].filter(el => el.textContent.trim()).at(-1)?.textContent !== before, shown);
    await click('Select');
    await leader.getByRole('heading', { name: 'Ready to start?', exact: true }).waitFor();
    await size(leader, 844); await shot(`${ids[0]?.split('-')[0] ?? ''}-no-settings-leader-844`, leader);
    assert.equal(await leader.locator('.phone-game-setup').count(), 0);
    await click('Back'); await click('Next'); await click('Next'); await click('Select');
    await leader.getByRole('button', { name: '10', exact: true }).waitFor();
  });
  await h.step('Expand categories in the same row with D-157 groups', async () => {
    await size(leader, 667); await leader.locator('.setup-field-row').filter({ has: leader.locator('.setup-field-heading > span', { hasText: /^Categories$/ }) }).getByRole('button').click();
    assert.deepEqual(await leader.locator('.setup-tabs button').allTextContents(), ['Around the world', 'Singapore']);
    assert.match(await leader.locator('.setup-option-grid button').first().innerText(), /Mixed/);
    assert.equal(await leader.getByRole('button', { name: 'All of Around the world', exact: true }).count(), 0);
    await shot('categories-world-667', leader);
    await size(leader, 844); await shot('categories-world-844', leader);
    await size(leader, 844); await leader.locator('.setup-tabs button').nth(1).click();
    assert.match(await leader.locator('.setup-option-grid button').first().innerText(), /All of Singapore/);
    await shot('categories-singapore-844', leader);
    await size(leader, 667); await shot('categories-singapore-667', leader);
    await size(leader, 844);
    await leader.locator('.setup-group').click();
    // The choice goes to the host and comes back; wait for the ticks rather than reading them at once.
    await leader.locator('.setup-option-grid button[aria-pressed="true"]').nth(6).waitFor();
    assert.equal(await leader.locator('.setup-option-grid button[aria-pressed="true"]').count(), 7);
    await shot('categories-group-844', leader); await shot('setup-tv-categories', h.host); await click('Done');
    await h.host.setViewportSize({width:1280,height:720}); await shot('setup-tv-categories-720', h.host); await h.host.setViewportSize({width:1920,height:1080});
    await leader.locator('.setup-field-row').filter({hasText:'Categories'}).getByRole('button').click(); await leader.locator('.setup-tabs button').filter({hasText:'Singapore'}).click();
    await click('All of Singapore');
    for (const name of ['Food', 'Life', 'Nature', 'Places']) await click(name);
    await click('Done');
    assert.match(await leader.locator('[data-field="categories"]').innerText(), /Food, Life, Nature \+1 more/);
    assert.match(await h.host.locator('[data-field="categories"]').innerText(), /Food, Life, Nature \+1 more/);
    await shot('long-categories-phone', leader); await shot('long-categories-tv', h.host);
    await leader.locator('.setup-field-row').filter({hasText:'Categories'}).getByRole('button').click(); await leader.locator('.setup-tabs button').filter({hasText:'Singapore'}).click(); await click('All of Singapore'); await click('Done');
  });
  await h.step('RZ-011 refuses Hard for Singapore Life and keeps the chosen difficulty', async () => {
    await size(leader, 667);
    await leader.locator('.setup-field-row').filter({ has: leader.locator('.setup-field-heading > span', { hasText: /^Categories$/ }) }).getByRole('button').click();
    await leader.locator('.setup-tabs button').filter({ hasText: 'Singapore' }).click();
    await leader.getByRole('button', { name: 'All of Singapore', exact: true }).click();
    await click('Life'); await click('Done');
    await leader.getByRole('button', { name: 'Hard', exact: true }).click({ force: true });
    await leader.locator('[role="status"]').filter({ hasText: /Only \d+.*questions\./ }).waitFor();
    assert.equal(await leader.getByRole('button', { name: 'Mixed', exact: true }).getAttribute('aria-pressed'), 'true');
    const headingSentence = await leader.locator('footer').innerText();
    await shot('difficulty-refused-leader-667', leader);
    await h.host.locator('.setup-mirror-problem [role="status"]').waitFor();
    assert.match(await h.host.locator('.setup-mirror-problem').innerText(), /Only \d+.*questions\./);
    assert.doesNotMatch((await h.host.locator('footer').allTextContents()).join(' '), /Only \d+.*questions\./);
    await shot('difficulty-refused-tv', h.host);
    await h.host.setViewportSize({width:1280,height:720}); await shot('difficulty-refused-tv-720', h.host); await h.host.setViewportSize({width:1920,height:1080});
    assert.match(await h.host.locator('.setup-mirror-row[data-field="difficulty"] strong').textContent() ?? '', /Mixed/);
    assert.equal(await leader.locator('.setup-field-heading .setup-refusal').count(), 0);
    assert.match(headingSentence, /Only \d+.*questions\./);
  });
  await h.step('RZ-001/010 category changes may strand 50 questions and disable Start', async () => {
    await size(leader, 844);
    // Start with the full pool so 50 is a valid choice before narrowing the category.
    await leader.locator('.setup-field-row').filter({ has: leader.locator('.setup-field-heading > span', { hasText: /^Categories$/ }) }).getByRole('button').click();
    await click('Mixed'); await click('Done'); await click('50');
    await leader.locator('.setup-field-row').filter({ has: leader.locator('.setup-field-heading > span', { hasText: /^Categories$/ }) }).getByRole('button').click();
    await leader.locator('.setup-tabs button').filter({ hasText: 'Singapore' }).click();
    await leader.getByRole('button', { name: 'All of Singapore', exact: true }).waitFor();
    await click('Nature'); await click('Done');
    await leader.locator('[role="status"]').filter({ hasText: /Only \d+.*questions/ }).waitFor();
    assert.equal(await leader.getByRole('button', { name: 'Start', exact: true }).isDisabled(), true);
    await shot('start-blocked-leader-844', leader); await shot('start-blocked-tv', h.host);
    assert.match(await h.host.locator('.game-setup-mirror [role="status"]').innerText(), /Only \d+.*questions/);
    await click('10');
    const length = leader.locator('.setup-field-row').filter({ has: leader.locator('.setup-field-heading > span', { hasText: /^Questions$/ }) }).getByRole('button').filter({ hasText: '50' });
    // The phone re-renders after the host accepts 10; wait for that before reading the 50 button.
    await leader.locator('.setup-field-row').getByRole('button', { name: /10/ }).and(leader.locator('[aria-pressed="true"]')).first().waitFor();
    for (let i = 0; i < 50 && await length.getAttribute('aria-disabled') !== 'true'; i++) await leader.waitForTimeout(100);
    assert.equal(await length.getAttribute('aria-disabled'), 'true');
    assert.match(await length.innerText(), /✕/);
    assert.match(await length.locator('span').last().evaluate(el => getComputedStyle(el).textDecorationLine), /line-through/);
    assert.equal(await length.getAttribute('aria-pressed'), 'false');
    await length.click({ force: true });
    // Choosing 10 clears the blocked state; wait for the new refusal in the footer.
    await leader.locator('footer [role="status"]').filter({ hasText: /Only \d+.*questions/ }).waitFor();
    assert.match(await leader.locator('footer').innerText(), /Only \d+.*questions/);
    await shot('length-50-unavailable-844', leader);
    // Restore the six-category selection for Part A's match and retention checks.
    await leader.locator('.setup-field-row').filter({ has: leader.locator('.setup-field-heading > span', { hasText: /^Categories$/ }) }).getByRole('button').click();
    await leader.locator('.setup-tabs button').filter({ hasText: 'Singapore' }).click();
    assert.match(await leader.locator('.setup-group').innerText(), /All of Singapore/);
    await leader.locator('.setup-group').click(); await click('Done');
  });
  await h.step('TV value changes use base crossfades and reduced-motion swaps', async () => {
    for (const reduced of [false, true]) {
      await h.host.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const strip = h.frameStrip(reduced ? 'tv-value-change-reduced' : 'tv-value-change', h.host, { everyMs: 34 });
      await click(reduced ? '10' : '30'); await strip;
    }
    await h.host.emulateMedia({ reducedMotion: 'no-preference' }); await click('30');
  });
  await h.step('Start thirty questions with the chosen settings', async () => {
    await click('Start'); await leader.getByRole('main', { name: 'Controller', exact: true }).waitFor();
    await h.shot('match-started-tv', h.host);
  });
  await h.step('Retain settings across the completed match, picker and a leader reload', async () => {
    // Advance the real idle match, as C-16 does; no state or settings are replaced.
    await h.host.clock.install();
    try {
      // Thirty questions: advance five seconds a step and continue past each five-question scoreboard as the leader would.
      for (let step = 0; step < 400; step++) {
        await h.host.clock.runFor(5000);
        if (!(await h.host.locator('.game-final-hint').count()) && await leader.getByRole('button', { name: 'Continue', exact: true }).count()) await leader.getByRole('button', { name: 'Continue', exact: true }).click();
        // The scoreboard every five questions also offers Continue; only the final screen shows this hint.
        if (await h.host.locator('.game-final-hint').count()) break;
      }
    } finally { await h.host.clock.resume(); }
    await click('Continue'); await click('Back to game picker'); await click('Select');
    await leader.getByRole('button', { name: '30', exact: true }).waitFor();
    await size(leader, 844); await shot('settings-kept-leader-844', leader);
    await click('10');
    await size(leader, 667); await leader.reload(); await leader.getByRole('button', { name: '10', exact: true }).waitFor();
    await shot('leader-reload-setup-667', leader);
  }, 480000); // A real thirty-question match takes about five minutes of wall time even on the fake clock.
  await h.step('Team availability and team confirmation', async () => {
    if (h.maxPhones === 1) {
      assert.equal(await leader.locator('.setup-teams-row').getAttribute('aria-disabled'), 'true'); await shot('solo-teams-disabled-667', leader);
      assert.equal(await leader.getByRole('button', { name: 'Teams', exact: true }).isDisabled(), true);
    } else {
      await size(leader, 844); await click('Teams'); await shot('teams-on-setup-leader-844', leader); await shot('teams-on-tv', h.host);
      await click('Start'); await leader.getByRole('region', { name: 'Pick a side' }).waitFor(); await shot('team-confirmation-phone', leader); await h.shot('team-confirmation-tv', h.host); await click('Start');
      await leader.getByRole('main', { name: 'Controller', exact: true }).waitFor(); await h.shot('team-match-tv', h.host);
    }
  });
}
