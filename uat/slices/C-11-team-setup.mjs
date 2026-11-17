// PLAT-025, D-143. Run separately with --phones 4 and --phones 8.
import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function teamSetup(h) {
  if (![4, 8].includes(h.maxPhones)) throw new Error('C-11 requires --phones 4 or --phones 8');
  await h.createRoom();
  /** @type {import('playwright').Page[]} */
  const phones = [];
  /** @param {string} name @param {boolean} [setup] */
  async function join(name, setup = false) {
    const page = await h.newPhone();
    await h.openJoin(page, name); await page.getByRole('button', { name: 'Join', exact: true }).click();
    if (setup) { await page.getByRole('region', { name: 'Pick a side' }).waitFor(); await h.host.locator('.team-player').filter({ hasText: name }).waitFor(); }
    else await h.waitSeated(page, name);
    phones.push(page); return page;
  }
  for (let i = 1; i <= h.maxPhones; i++) await join(i === 1 ? 'Cloud Noodle' : i === h.maxPhones ? 'WWWWWWWWWWWW' : `Player ${String(i)}`);
  const leader = phones[0]; if (!leader) throw new Error('Missing leader');
  /** @param {string} name */
  const click = async (name) => leader.getByRole('button', { name, exact: true }).click();
  await h.step('Optional teams default off; balanced automatic split', async () => {
    await click('Pick a game'); await click('Next'); await click('Next'); await click('Select');
    await leader.getByRole('button', { name: 'Teams off', exact: true }).waitFor();
    await h.shot('teams-off-toggle', leader);
    await click('Teams off'); await leader.getByRole('button', { name: 'Teams on', exact: true }).waitFor();
    await h.shot('teams-on-toggle', leader); await click('Start');
    await h.host.getByRole('main', { name: 'Team setup', exact: true }).waitFor();
    assert.equal(await h.host.locator('.team-player[data-team="0"]').count(), h.maxPhones / 2);
    assert.equal(await h.host.locator('.team-player[data-team="1"]').count(), h.maxPhones / 2);
    for (let i = 0; i < phones.length; i++) {
      const phone = phones[i]; if (!phone) continue;
      await phone.getByRole('button', { name: i % 2 === 0 ? 'Red ✓' : 'Blue ✓', exact: true }).waitFor();
    }
    const chips = await h.host.locator('.team-player-name').evaluateAll(names => names.map(name => {
      const range = document.createRange(); range.selectNodeContents(name);
      const boxes = Array.from(range.getClientRects());
      return { lines: new Set(boxes.map(box => box.top)).size, fits: name.scrollWidth <= name.clientWidth + 1 };
    }));
    assert.equal(chips.length, h.maxPhones);
    assert.ok(chips.every(chip => chip.lines === 1 && chip.fits), 'TV names must fit on one line');
    await h.shot('automatic-split'); await h.shot('maximum-length-name-tv');
  });
  const watcher = phones[1]; if (!watcher) throw new Error('Missing watcher');
  await h.step('Switch and refusal, then leader move', async () => {
    const strip = h.frameStrip('switch-arc', h.host, { frames: 6, everyMs: 100 });
    await leader.getByRole('button', { name: 'Blue', exact: true }).click(); await strip;
    await h.host.locator('.team-player[data-seat="1"][data-team="1"]').waitFor();
    await click('Move players');
    await leader.getByRole('button', { name: '2 · Player 2 · Blue', exact: true }).click();
    await h.host.locator('.team-player[data-seat="2"][data-team="0"]').waitFor();
    assert.equal(await h.host.locator('.team-player').count(), h.maxPhones, 'No leave before switch and leader move');
    await watcher.locator('.phone-teams [role="status"]').filter({ hasText: 'Cloud Noodle moved you to Red.' }).waitFor();
    await h.shot('moved-player-phone', watcher); await h.shot('leader-grid-after-move', leader);
    await click('Done'); await h.shot('leader-move');
    await h.host.emulateMedia({ reducedMotion: 'reduce' });
    await leader.getByRole('button', { name: 'Red', exact: true }).click();
    await h.host.locator('.team-player[data-seat="1"][data-team="0"]').waitFor();
    assert.equal(await h.host.locator('.team-player').evaluateAll(chips => chips.flatMap(chip => chip.getAnimations()).length), 0);
    await h.shot('reduced-motion-switch');
    await h.host.emulateMedia({ reducedMotion: 'no-preference' });
    await leader.getByRole('button', { name: 'Blue', exact: true }).click();
    // Leave Player 2 alone on Red, then ask that phone to leave its side.
    for (let i = 2; i < phones.length; i += 2) {
      const phone = phones[i]; if (!phone) continue;
      await phone.getByRole('button', { name: 'Blue', exact: true }).click();
      await phone.getByRole('button', { name: 'Blue ✓', exact: true }).waitFor();
    }
    await watcher.getByRole('button', { name: 'Blue', exact: true }).click();
    await watcher.locator('.phone-teams [role="status"]').filter({ hasText: 'Red needs at least one player.' }).waitFor();
    assert.equal(await leader.locator('.phone-picker-reason').count(), 0);
    await h.host.getByRole('status').filter({ hasText: "Player 2 can't leave Red: it needs at least one player." }).waitFor();
    await h.shot('refusal-tapping-phone', watcher); await h.shot('refusal-other-phone', leader); await h.shot('refusal-tv');
  });
  await h.step('Leave and join during setup', async () => {
    const last = phones.pop(); if (!last) throw new Error('Missing last phone');
    const before = await h.host.locator('.team-player').count();
    await last.getByRole('button', { name: 'Leave', exact: true }).click(); await last.close();
    // Wait for authoritative leave before admitting the replacement.
    await h.host.waitForFunction(count => document.querySelectorAll('.team-player').length < count, before);
    await h.shot('leave-during-setup');
    const redCount = await h.host.locator('.team-player[data-team="0"]').count();
    const blueCount = await h.host.locator('.team-player[data-team="1"]').count();
    const newcomer = await join('New Friend', true);
    await newcomer.getByRole('button', { name: redCount <= blueCount ? 'Red ✓' : 'Blue ✓', exact: true }).waitFor();
    assert.equal(await h.host.locator('.team-player').count(), h.maxPhones);
    await h.shot('join-during-setup');
  });
  await h.step('Both phone sizes, including the leader move list', async () => {
    for (const page of [leader, watcher]) for (const size of [{ width: 667, height: 375 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(size);
      await h.shot(`teams-${String(size.width)}-${page === leader ? 'leader' : 'player'}`, page);
      const targets = await page.locator('.phone-team-buttons button').evaluateAll(buttons => buttons.map(b => { const r = b.getBoundingClientRect(); return { width: r.width, height: r.height }; }));
      assert.equal(targets.length, 2); assert.equal(targets[0]?.width, targets[1]?.width);
      assert.ok(targets.every(r => r.width >= 55 && r.height >= 144));
      if (page === leader) {
        await click('Move players');
        /** @type {{ text: string | null, width: number, height: number, inside: boolean }[]} */
        const roster = await page.locator('.phone-team-moves button').evaluateAll(buttons => buttons.map(button => {
          const rect = button.getBoundingClientRect();
          return { text: button.textContent, width: rect.width, height: rect.height, inside: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight };
        }));
        assert.equal(roster.length, h.maxPhones);
        const names = await h.host.locator('.team-player-name').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
        for (const name of names) assert.ok(roster.some(row => row.text?.includes(name ?? '')), `Missing ${name ?? "name"}`);
        assert.ok(roster.every(row => row.inside && row.width >= 55 && row.height >= 55));
        await h.shot(`move-players-${String(size.width)}`, page);
        await click('Done');
      }
    }
  });
  await h.step('Start Rabakz with teams', async () => {
    await click('Start'); await h.host.locator('.team-screen').waitFor({ state: 'detached' });
    await h.host.locator('[data-theme="rabakz"]').first().waitFor();
    for (const phone of phones) {
      for (let index = 0; index < 4; index++) await phone.locator('[data-part="answer"] .ka-layout-target').nth(index).waitFor();
      assert.equal(await phone.locator('[data-part="answer"] .ka-layout-target').count(), 4, 'Every phone needs all four answer buttons');
    }
    await h.shot('rabakz-team-game'); await h.shot('rabakz-team-controller', leader);
  });
}
