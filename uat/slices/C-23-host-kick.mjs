import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function hostKick(h) {
  assert.ok(h.maxPhones >= 3, 'C-23 needs --phones 3');
  await h.createRoom();
  const leader = await h.newPhone(), second = await h.newPhone(), third = await h.newPhone();
  const phones = [leader, second, third];
  const nonLeaderName = '😀😀😀😀😀😀😀😀😀😀😀😀';
  const names = ['漢字漢字漢字漢字漢字漢字', nonLeaderName, 'Cloud'];
  for (const [index, page] of phones.entries()) {
    const name = names[index]; assert.ok(name);
    await h.openJoin(page, name);
    await page.getByRole('button', { name: 'Join', exact: true }).click();
    await h.waitSeated(page, name);
  }
  await leader.setViewportSize({ width: 667, height: 375 });
  await h.shot('leader-lobby-667-before-removal', leader);
  await leader.setViewportSize({ width: 844, height: 390 });
  await h.shot('leader-lobby-844-before-removal', leader);
  const card = h.host.getByRole('listitem').filter({ has: h.host.getByText('Cloud', { exact: true }) });
  for (const { width, height } of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
    await h.host.setViewportSize({ width, height });
    await assertTvCards(h);
    const nonLeader = h.host.getByRole('listitem').filter({ has: h.host.getByText(nonLeaderName, { exact: true }) });
    assert.equal(await nonLeader.locator('.name-line').count(), 3, 'non-leader worst-case name occupies three lines');
  }
  await h.host.locator('body').click({ position: { x: 0, y: 0 } });
  for (let step = 0; step < 20; step++) {
    await h.host.keyboard.press('ArrowRight');
    if (await card.getByRole('button', { name: 'Remove', exact: true }).evaluate(el => el === document.activeElement)) break;
  }
  assert.ok(await card.getByRole('button', { name: 'Remove', exact: true }).evaluate(el => el === document.activeElement));
  await h.host.keyboard.press('Enter');
  await h.host.setViewportSize({ width: 1920, height: 1080 });
  await assertTvCards(h);
  await h.shot('01-tv-confirm-1920');
  await h.host.setViewportSize({ width: 1280, height: 720 });
  await assertTvCards(h);
  await h.shot('02-tv-confirm-1280');
  await h.host.keyboard.press('ArrowLeft');
  assert.ok(await card.getByRole('group', { name: 'Remove Cloud?' }).getByRole('button', { name: 'Remove', exact: true }).evaluate(el => el === document.activeElement));
  await h.host.keyboard.press('Enter');
  await card.getByText('Cloud', { exact: true }).waitFor({ state: 'detached' });
  assert.equal(await h.host.getByRole('main', { name: 'Host lobby' }).count(), 1, 'keyboard removal did not open the picker');
  await third.getByText('You were removed from this game', { exact: true }).waitFor();
  await h.shot('03-lobby-after-host-removal');
  await h.shot('04-removed-phone', third);
  const beforeReload = await third.evaluate(() => performance.timeOrigin);
  await third.reload();
  assert.notEqual(await third.evaluate(() => performance.timeOrigin), beforeReload, 'removed phone loaded a new document');
  await third.getByText('You were removed from this game', { exact: true }).waitFor();
  await h.shot('05-reload-refused', third);
  const player = leader.getByRole('listitem').filter({ has: leader.getByText(nonLeaderName, { exact: true }) });
  await player.getByRole('button', { name: `Remove ${nonLeaderName}`, exact: true }).click();
  await h.shot('06-leader-confirm', leader);
  await leader.getByRole('group', { name: `Remove ${nonLeaderName}?` }).getByRole('button', { name: 'Remove', exact: true }).click();
  await second.getByText('You were removed from this game', { exact: true }).waitFor();
  await leader.getByRole('group', { name: `Remove ${nonLeaderName}?` }).waitFor({ state: 'detached' });
  await h.shot('07-lobby-after-leader-removal');
  await h.shot('leader-lobby-after-removing-moss', leader);
}

/** PLAT-011: wait for the resize listener and two identical geometry measurements.
 * @param {import('../../tools/uat/harness.ts').Harness} h
 */
async function assertTvCards(h) {
  const page = h.host;
  try {
    await page.waitForFunction(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--screen-scale')) === Math.max(0, Math.min(innerWidth / 1920, innerHeight / 1080)));
    let previous = '';
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    for (let attempt = 0; ; attempt++) {
      await page.evaluate(() => new Promise(done => requestAnimationFrame(done)));
      const current = await page.locator('.seat, .seat *').evaluateAll(nodes => JSON.stringify(nodes.map(el => {
        const r = el.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height, el.scrollHeight, el.clientHeight];
      })));
      if (current === previous) break;
      assert.ok(attempt < 60, 'TV card geometry settles');
      previous = current;
    }
    assert.deepEqual(await measureTvCards(page), [], 'TV seat cards and children fit their cards and safe viewport');
  } catch (error) {
    await h.shot(`fit-failure-${String(await page.evaluate(() => innerWidth))}`, page, undefined, false);
    throw error;
  }
}

/** @param {import('playwright').Page} page */
async function measureTvCards(page) {
  return page.locator('.seat').evaluateAll(cards => cards.flatMap(card => {
    const r = card.getBoundingClientRect(), bottom = innerHeight - 55 * innerWidth / 1920;
    return [card, ...card.querySelectorAll('*')].flatMap(el => {
      if (!(el instanceof HTMLElement)) return [];
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height || getComputedStyle(el).visibility === 'hidden') return [];
      return b.left >= r.left - 1 && b.right <= r.right + 1 && b.top >= r.top - 1 && b.bottom <= r.bottom + 1 && b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= bottom + 1 && el.scrollHeight <= el.clientHeight
        ? [] : [`${el.className || el.tagName} ${[b.left < r.left - 1 && 'left', b.right > r.right + 1 && 'right', b.top < r.top - 1 && 'top', b.bottom > r.bottom + 1 && `bottom+${(b.bottom - r.bottom).toFixed(1)}`, b.bottom > bottom + 1 && `safe+${(b.bottom - bottom).toFixed(1)}`, el.scrollHeight > el.clientHeight && `scroll ${String(el.scrollHeight)}>${String(el.clientHeight)}`].filter(Boolean).join(',')} @${String(innerWidth)}`];
    });
  }));
}
