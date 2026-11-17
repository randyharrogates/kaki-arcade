// NFR-TEST; PLAT-002, PLAT-003, PLAT-004, PLAT-007, PLAT-009, PERF-021.
import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function join(h) {
  if (h.maxPhones < 8) throw new Error('C-08 requires --phones 8');
  await h.createRoom();
  const names = ['Mango', 'Pebble', 'Fern', 'Comet', 'Noodle', 'Waffle', 'Puddle', 'Kite'];
  for (const name of names) {
    const { page, ms } = await h.joinPhone(name);
    assert.ok(ms <= 5000, `${name} Join-to-seat took ${String(ms)} ms (PERF-021 proxy; QR-to-seat still needs real-device check)`);
    await h.shot(`seated-${name}`, page);
    if (h.phones.length === 1) await h.shot('one-player');
  }
  await h.shot('eight-players');
  await h.step('Ninth phone sees room full', async () => {
    const ninth = await h.newPhone('portrait'); await h.openJoin(ninth, 'Ninth');
    await ninth.getByRole('button', { name: /^Join$/ }).click();
    await ninth.getByRole('heading', { name: /room is full/i }).waitFor(); await h.shot('room-full', ninth);
  });
  const first = h.phones[0]; assert.ok(first);
  await h.step('Phone reload keeps its seat', async () => {
    const seatNames = await h.hostSeatContent().allTextContents();
    const seatBefore = seatNames.findIndex(text => text.replace(/\s/g, '').includes('Mango'));
    await h.reloadPhone(first); await h.waitSeated(first, 'Mango');
    assert.equal(await h.hostSeat('Mango').count(), 1);
    const restored = await h.hostSeatContent().allTextContents();
    assert.equal(restored.findIndex(text => text.replace(/\s/g, '').includes('Mango')), seatBefore);
    await h.shot('phone-reloaded', first);
  });
  await h.step('Closed host disconnects phones; reopened host restores all eight', async () => {
    await h.closeHost();
    for (const phone of h.phones.slice(0, 8)) await phone.locator('header').getByRole('img', { name: 'Disconnected', exact: true }).waitFor({ timeout: 30000 });
    await h.shot('host-disconnected', first); await h.reopenHost();
    for (const [index, name] of names.entries()) {
      const phone = h.phones[index]; assert.ok(phone);
      await phone.locator('header').getByRole('img', { name: 'Connected', exact: true }).waitFor({ timeout: 30000 });
      await h.waitSeated(phone, name);
    }
    await h.shot('all-eight-returned');
  });
  await h.step('Pairing alone stopped for 25 seconds; rename still reaches host', async () => {
    h.expectSignalError(/^WebSocket connection to .* failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED$/, 'host');
    h.expectSignalError(/^(Failed to load resource: net::ERR_CONNECTION_(REFUSED|RESET)|net::ERR_CONNECTION_(REFUSED|RESET))$/, 'host');
    await h.hostSeatContent().getByText(/^(Good|Weak|Relayed)$/).first().waitFor();
    await h.network.stopSignal(); await first.waitForTimeout(25000);
    for (const phone of h.phones.slice(0, 8)) await phone.locator('header').getByRole('img', { name: 'Connected', exact: true }).waitFor();
    // Tolerate inline rename and the upcoming dedicated screen.
    await first.getByRole('button', { name: /^(Change name|Rename)$/i }).click();
    const cancel = first.getByRole('button', { name: /^Cancel$/ });
    if (await cancel.count()) assert.equal(await cancel.isVisible(), true);
    await first.getByLabel('Your name').fill('Mango Two');
    await first.getByRole('button', { name: /^(Save name|Save|Confirm)$/i }).click();
    await h.hostSeat('Mango Two').waitFor();
    for (const name of ['Mango Two', ...names.slice(1)]) {
      const seat = h.hostSeat(name);
      await seat.getByText(/^(Connected|Good|Weak|Relayed)$/).waitFor();
    }
    await h.shot('rename-during-pairing-outage'); await h.shot('phone-during-pairing-outage', first);
    await h.network.startSignal();
  });
  await h.step('Reduced motion rename reaches final host state within one frame', async () => {
    await h.reducedMotion(true);
    // Start observing before the real rename arrives, then inspect its next painted frame.
    const settled = h.host.evaluate(() => new Promise(resolve => {
      const seats = document.querySelector('[aria-label="Player seats"]');
      if (!seats) throw new Error('Missing seats');
      const observer = new MutationObserver(() => {
        if (!seats.textContent.replace(/\s/g, '').includes('MangoThree')) return;
        observer.disconnect();
        requestAnimationFrame(() => { resolve(!seats.querySelector('.outgoing[aria-hidden="true"]') &&
          [...seats.querySelectorAll('.incoming')].every(e => {
            const mask = getComputedStyle(e).clipPath;
            return mask === 'none' || (mask.startsWith('inset(') && (mask.match(/-?\d*\.?\d+/g) ?? []).every(n => Number(n) === 0));
          })); });
      });
      observer.observe(seats, { childList: true, subtree: true, characterData: true });
    }));
    await first.getByRole('button', { name: /^(Change name|Rename)$/i }).click();
    await first.getByLabel('Your name').fill('Mango Three');
    await first.getByRole('button', { name: /^(Save name|Save|Confirm)$/i }).click();
    assert.equal(await settled, true, 'Real rename must settle by the next frame without outgoing copies');
    await h.hostSeat('Mango Three').waitFor();
    await h.shot('real-rename-reduced-motion-final-within-one-frame');
  });
}
