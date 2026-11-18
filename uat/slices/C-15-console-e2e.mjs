// PLAT-030, PLAT-033 (console seam only), NN-1, NN-2; PLAT-007/009/023, CTRL-003.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function consoleE2e(h) {
  assert.equal(h.maxPhones, 8, 'C-15 requires eight phones');
  // Enable the existing development gate before the registry module evaluates, including reloads.
  await h.host.addInitScript(() => {
    if (location.pathname === '/host') {
      const url = new URL(location.href); url.searchParams.set('fixture', 'console-e2e'); history.replaceState(null, '', url);
    }
  });
  await h.createRoom();
  /** @type {import('playwright').Page[]} */
  const phones = [];
  for (let i = 1; i <= 8; i++) {
    const { page, ms } = await h.joinPhone(`Phone ${String(i)}`);
    assert.ok(ms <= 5000, 'PERF-021 join to seat <= 5 s'); phones.push(page);
    assert.deepEqual(page.viewportSize(), { width: 844, height: 390 });
  }
  const leader = phones[0] ?? h.host, last = phones[7] ?? h.host; assert.equal(phones.length, 8);
  const timings = { reconnectMs: 0, hostRecoveryMs: 0, recoveryBudget: 'No duration budget in PERFORMANCE.md; PLAT-007 seat hold is 120000 ms' };
  /** @param {string} name */
  const shots = async name => { await h.shot(`${name}-tv`); await h.shot(`${name}-phone1`, leader); await h.shot(`${name}-phone8`, last); };
  /** @param {import('playwright').Page} page */
  const privateText = page => page.locator('.ka-private-panel:not(.ka-private-ghost)').innerText();
  const total = () => h.host.locator('[data-console-total]').innerText();
  const step = () => h.host.locator('[data-console-step]').innerText();
  async function start() {
    await leader.getByRole('button', { name: 'Pick a game', exact: true }).click();
    await h.host.locator('[data-game="console-e2e"][data-focused="true"]').waitFor();
    await leader.getByRole('button', { name: 'Select', exact: true }).click();
    await leader.getByRole('button', { name: 'Start', exact: true }).click();
    await h.host.getByRole('main', { name: 'Console test game' }).waitFor();
    await h.host.waitForFunction(() => !document.querySelector('.host-shell .outgoing'));
    for (const phone of phones) await phone.getByRole('button', { name: 'Advance', exact: true }).waitFor();
  }
  async function privacy() {
    for (const [i, phone] of phones.entries()) {
      const own = `Secret seat-${String(i + 1)} seed 15`;
      assert.ok((await privateText(phone)).includes(own));
      assert.ok(!(await h.hostText()).includes(own), 'Private text absent from TV DOM');
      for (const other of phones) if (other !== phone) assert.ok(!(await h.phoneText(other)).includes(own), 'Private text absent from every other phone DOM');
    }
  }
  await h.step('Eight seated browsers', async () => {
    assert.equal(await h.host.locator('.seat[data-empty="false"]:not(.outgoing *)').count(), 8);
    await shots('01-seated');
  });
  /** @type {unknown} */
  let priorScores;
  await h.step('Completed scores checkpoint before interrupted round', async () => {
    await start();
    for (let round = 0; round < 2; round++) for (const phone of phones) await phone.getByRole('button', { name: 'Advance', exact: true }).click();
    await h.host.getByRole('main', { name: 'Results', exact: true }).waitFor();
    await shots('01-completed-results');
    await leader.getByRole('button', { name: 'Back to game picker', exact: true }).click();
    await h.host.getByRole('main', { name: 'Game picker', exact: true }).waitFor();
    await h.host.keyboard.press('Escape');
    await h.host.waitForFunction(() => sessionStorage.getItem('kaki.host-reconnect.v1')?.includes('"seat-1":16'));
    priorScores = await h.host.evaluate(() => sessionStorage.getItem('kaki.host-reconnect.v1')?.match(/"scores":(\{[^}]*\})/)?.[1]);
  });
  await h.step('Leader picks and starts the module', async () => { await start(); await privacy(); await shots('02-started');
    for (const { width, height } of [{ width: 667, height: 375 }, { width: 844, height: 390 }, { width: 932, height: 430 }]) {
      await leader.setViewportSize({ width, height });
      const menu = await leader.getByRole('button', { name: 'Menu', exact: true }).boundingBox();
      assert.ok(menu && menu.width >= 89 && menu.height >= 68 && menu.x >= 0 && menu.y >= 0 && menu.x + menu.width <= width && menu.y + menu.height <= height);
      await h.shot(`menu-${String(width)}-${String(height)}`, leader);
    }
    await leader.setViewportSize({ width: 844, height: 390 }); });
  await h.step('All eight phones send play inputs', async () => {
    for (const phone of phones) await phone.getByRole('button', { name: 'Advance', exact: true }).click();
    await h.host.waitForFunction(() => document.querySelector('[data-console-total]')?.textContent === '8');
    await shots('03-play');
  });
  await h.step('Keyboard pause and phone resume', async () => {
    await Promise.all([h.frameStrip('keyboard-pause'), h.host.keyboard.press('Escape')]);
    await h.host.getByRole('dialog', { name: 'Paused', exact: true }).waitFor();
    const frozen = await step(); await h.host.waitForTimeout(250); assert.equal(await step(), frozen);
    await shots('04-keyboard-paused');
    for (const { width, height } of [{ width: 667, height: 375 }, { width: 932, height: 430 }]) {
      for (const { role, phone } of [{ role: 'leader', phone: leader }, { role: 'non-leader', phone: last }]) {
        await phone.setViewportSize({ width, height });
        const dialog = phone.getByRole('dialog', { name: 'Paused', exact: true });
        await dialog.waitFor();
        assert.equal(await phone.locator('.phone-game-controls').evaluate(n => n.hasAttribute('inert')), true);
        for (const name of ['Resume', 'Quit to picker']) {
          const button = dialog.getByRole('button', { name, exact: true }); const r = await button.boundingBox();
          assert.equal(await button.isDisabled(), role !== 'leader');
          assert.ok(r && r.width >= 89 && r.height >= 68 && r.x >= 0 && r.y >= 0 && r.x + r.width <= width && r.y + r.height <= height);
        }
        await h.shot(`paused-${role}-${String(width)}-${String(height)}`, phone);
        await phone.setViewportSize({ width: 844, height: 390 });
      }
    }
    await Promise.all([h.frameStrip('phone-resume'), leader.getByRole('button', { name: 'Resume', exact: true }).click()]);
    await h.host.getByRole('dialog', { name: 'Paused', exact: true }).waitFor({ state: 'hidden' });
    await h.host.waitForFunction(value => document.querySelector('[data-console-step]')?.textContent !== value, frozen);
    await shots('05-phone-resumed');
  });
  await h.step('Phone pause and keyboard resume', async () => {
    await last.getByRole('button', { name: 'Menu', exact: true }).click();
    await h.host.getByRole('dialog', { name: 'Paused', exact: true }).waitFor();
    assert.equal(await last.getByRole('button', { name: 'Resume', exact: true }).isDisabled(), true);
    await shots('06-phone-paused');
    await Promise.all([h.frameStrip('keyboard-resume'), h.host.keyboard.press('Enter')]);
    await h.host.getByRole('dialog', { name: 'Paused', exact: true }).waitFor({ state: 'hidden' });
    await shots('07-keyboard-resumed');
  });
  await h.step('Phone eight reload retains seat, private state and controller', async () => {
    const before = await privateText(last); const beforeOther = await privateText(leader);
    for (const phone of phones.slice(0, 7)) await phone.evaluate(() => {
      document.documentElement.dataset.c15Disconnect = 'false';
      const observer = new MutationObserver(() => { if (/Host disconnected|Reconnecting|Disconnected/.test(document.body.innerText)) document.documentElement.dataset.c15Disconnect = 'true'; });
      observer.observe(document.body, { subtree: true, childList: true, characterData: true });
      window.addEventListener('c15-stop-observing', () => { observer.disconnect(); }, { once: true });
    });
    const began = performance.now(); await h.reloadPhone(last);
    await last.getByRole('button', { name: 'Advance', exact: true }).waitFor();
    timings.reconnectMs = performance.now() - began;
    assert.ok(timings.reconnectMs < 120000); assert.equal(await privateText(last), before);
    assert.equal(await last.locator('.ka-controller-seat').innerText(), '8');
    assert.equal(await privateText(leader), beforeOther);
    for (const phone of phones.slice(0, 7)) assert.equal(await phone.evaluate(() => { window.dispatchEvent(new Event('c15-stop-observing')); return document.documentElement.dataset.c15Disconnect; }), 'false');
    assert.equal(await total(), '8'); await privacy();
    await last.getByRole('button', { name: 'Advance', exact: true }).click();
    await h.host.waitForFunction(() => document.querySelector('[data-console-total]')?.textContent === '9');
    await shots('08-phone-recovered');
  });
  await h.step('Host reload loses round and restores room and all seats automatically', async () => {
    // Hold navigation briefly so phones can visibly report the real host channel loss.
    await h.host.route('**/host?*', async route => { await new Promise(resolve => setTimeout(resolve, 1000)); await route.continue(); }, { times: 1 });
    let began = 0;
    const sawHostDisconnected = phones.map(() => false);
    let capturedLoss = false;
    /** @type {Promise<unknown> | undefined} */
    let reload;
    await h.frameStrip('host-reload-phone1', leader, { frames: 8, everyMs: 250, checkFrame: async index => {
      if (index === 1) { began = performance.now(); reload = h.host.reload(); }
      for (const [i, phone] of phones.entries()) sawHostDisconnected[i] ||= (await h.phoneText(phone)).includes('Host disconnected');
      if (!capturedLoss && sawHostDisconnected.every(Boolean)) { capturedLoss = true; await h.shot('connection-lost-leader', leader); await h.shot('connection-lost-non-leader', last); }
    } });
    await reload;
    await h.host.getByRole('main', { name: 'Host lobby', exact: true }).waitFor();
    // After a TV reload a phone may be mid-backoff (retries cap at 30 s, PHONE_RETRY_MAX_MS); allow 45 s.
    for (const [i, phone] of phones.entries()) await h.waitSeated(phone, `Phone ${String(i + 1)}`, 45000);
    timings.hostRecoveryMs = performance.now() - began;
    assert.ok(sawHostDisconnected.every(Boolean), 'PLAT-009 all eight phones display Host disconnected before automatic recovery');
    assert.equal((await h.host.getByLabel(/^Room code /).getAttribute('aria-label') ?? '').replace(/^Room code /, '').replace(/\s/g, ''), h.code);
    assert.equal(await h.host.locator('[data-console-total]').count(), 0, 'PLAT-009 running round is lost');
    for (const phone of phones) { assert.equal(await phone.locator('.ka-private-panel').count(), 0); assert.equal(await phone.getByRole('button', { name: 'Advance', exact: true }).count(), 0); }
    assert.deepEqual(await h.host.evaluate(() => sessionStorage.getItem('kaki.host-reconnect.v1')?.match(/"scores":(\{[^}]*\})/)?.[1]), priorScores, 'PLAT-009 prior completed scores survive');
    await shots('09-host-recovered-lobby');
    // Frame-strip helpers mutate a shared capture list: use a second real mid-play reload
    // for the TV strip, rather than running two strip builders concurrently.
    await start();
    await h.frameStrip('host-reload-tv', h.host, { frames: 8, everyMs: 250, checkFrame: async index => { if (index === 1) await h.host.reload(); } });
    // After a TV reload a phone may be mid-backoff (retries cap at 30 s, PHONE_RETRY_MAX_MS); allow 45 s.
    for (const [i, phone] of phones.entries()) await h.waitSeated(phone, `Phone ${String(i + 1)}`, 45000);
    await shots('09-second-host-recovered-lobby');
  });
  await h.step('Fresh round then quit retains players', async () => {
    await start(); assert.equal(await total(), '0'); await privacy();
    await h.reducedMotion(true);
    await leader.getByRole('button', { name: 'Menu', exact: true }).click(); await leader.getByRole('button', { name: 'Quit to picker', exact: true }).click();
    await h.host.getByRole('main', { name: 'Game picker', exact: true }).waitFor();
    await shots('10-quit-picker');
    await h.host.keyboard.press('Escape');
    // Quitting must not unseat anyone: the default wait, no reconnect allowance.
    for (const [i, phone] of phones.entries()) await h.waitSeated(phone, `Phone ${String(i + 1)}`);
    await shots('11-quit-keeps-eight');
  });
  await h.step('D-099 room gone keeps linked play and offers new room after quit', async () => {
    await start();
    h.expectSignalError(/WebSocket|Failed to load resource|net::ERR_CONNECTION_REFUSED|net::ERR_ABORTED/);
    for (let i = 1; i <= 8; i++) h.expectSignalError(/WebSocket|Failed to load resource|net::ERR_CONNECTION_REFUSED|net::ERR_ABORTED/, `phone${String(i)}`);
    await h.network.resetSignal();
    // The host's live projection exposes no code once the gone report arrives.
    await h.host.waitForFunction(() => !sessionStorage.getItem('kaki.host-reconnect.v1'), undefined, { timeout: 30000 });
    await leader.getByRole('button', { name: 'Advance', exact: true }).click();
    await h.host.waitForFunction(() => document.querySelector('[data-console-total]')?.textContent === '1');
    await shots('12-gone-keeps-play');
    await h.host.keyboard.press('Escape'); await h.host.getByRole('button', { name: 'Quit to picker', exact: true }).click();
    await h.host.getByRole('button', { name: 'Create a new room', exact: true }).waitFor();
    assert.equal(await h.host.getByLabel(/^Room code /).count(), 0);
    assert.equal(await h.host.getByText('Enter: pick a game', { exact: true }).isVisible(), false);
    assert.equal(await h.host.getByText('J: join from this keyboard', { exact: true }).isVisible(), false);
    for (const [i, phone] of phones.entries()) {
      await phone.getByText('Join the new room on the TV.', { exact: true }).waitFor();
      assert.equal(await phone.getByRole('button', { name: 'Pick a game', exact: true }).count(), 0);
      await h.shot(`closed-room-phone-${String(i + 1)}`, phone);
    }
    await shots('13-gone-new-room-offer');
  });
  await writeFile(join(h.evidence, 'recovery-timings.json'), JSON.stringify(timings, null, 2) + '\n');
}
