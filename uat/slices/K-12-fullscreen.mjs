// CTRL-004, D-297. Run with --phones 1 --phone-browser chromium.
import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function fullscreen(h) {
  assert.equal(h.maxPhones, 1, 'Use --phones 1');
  assert.equal(h.phoneEngine?.engine, 'chromium', 'Use --phone-browser chromium (Android Pixel emulation)');
  // Observe received control messages without replacing the transport or game logic.
  await h.host.addInitScript(() => {
    // Keep the receiver: apply below invokes the native method on its connection.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const original = RTCPeerConnection.prototype.createDataChannel;
    /** @param {RTCDataChannel} channel */
    const observe = channel => {
      channel.addEventListener('message', (/** @type {MessageEvent<unknown>} */ event) => {
        if (typeof event.data !== 'string') return;
        try {
          const message = /** @type {unknown} */ (JSON.parse(event.data));
          if (message && typeof message === 'object' && 't' in message && 'input' in message && message.t === 'picker-input' && message.input === 'open') {
            const root = document.documentElement;
            root.dataset.fullscreenOpenInputs = String(Number(root.dataset.fullscreenOpenInputs ?? 0) + 1);
          }
        } catch { /* Other channel payloads are irrelevant to this assertion. */ }
      });
      return channel;
    };
    /** @param {string} label @param {RTCDataChannelInit} [options] */
    RTCPeerConnection.prototype.createDataChannel = function (label, options) { return observe(original.call(this, label, options)); };
  });
  const installation = 'link[rel="manifest"], meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"]';
  await h.host.goto(h.origin);
  assert.equal(await h.host.locator(installation).count(), 0, 'Landing page has no phone installation tags');
  const response = await h.host.request.get(new URL('/manifest.webmanifest', h.origin).href);
  assert.ok(response.ok(), 'Manifest is served');
  const manifest = /** @type {unknown} */ (await response.json());
  assert.ok(manifest && typeof manifest === 'object');
  assert.ok('display' in manifest && 'orientation' in manifest && 'start_url' in manifest);
  assert.equal(manifest.display, 'fullscreen');
  assert.equal(manifest.orientation, 'landscape');
  assert.equal(manifest.start_url, '/play');
  await h.createRoom();
  const phone = await h.newPhone();
  await phone.setViewportSize({ width: 844, height: 390 });
  await h.openJoin(phone, 'Fern');
  await phone.getByRole('button', { name: 'Join', exact: true }).tap();
  await h.waitSeated(phone, 'Fern');
  await h.step('First landscape touch reaches the host once and enters fullscreen', async () => {
    await h.shot('before-tap', phone);
    assert.equal(await phone.locator(installation).count(), 3);
    assert.equal(await h.host.locator(installation).count(), 0);
    const box = await phone.getByRole('button', { name: 'Pick a game', exact: true }).boundingBox();
    assert.ok(box, 'Pick a game has a touch target');
    const cdp = await phone.context().newCDPSession(phone);
    // No phone page scripts during this interval: let transient activation expire.
    await new Promise(resolve => setTimeout(resolve, 5500));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await phone.waitForFunction(() => Boolean(document.fullscreenElement));
    await h.host.locator('[data-game][data-focused="true"]').waitFor();
    await new Promise(resolve => setTimeout(resolve, 500));
    assert.equal(await h.host.locator('html').getAttribute('data-fullscreen-open-inputs'), '1');
    assert.equal(await h.host.evaluate(() => Boolean(document.fullscreenElement)), false);
    await h.shot('after-tap', phone);
  });
  await h.step('Portrait leaves fullscreen', async () => {
    // A fullscreen window cannot be resized, so turn the phone through device emulation, which changes the orientation media query.
    const cdp = await phone.context().newCDPSession(phone);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true, screenOrientation: { type: 'portraitPrimary', angle: 0 } });
    await phone.waitForFunction(() => !document.fullscreenElement);
    // Out of fullscreen the window can be resized again: match the viewport so the still is portrait.
    await cdp.send('Emulation.clearDeviceMetricsOverride');
    await phone.setViewportSize({ width: 390, height: 844 });
    assert.equal(await phone.evaluate(() => Boolean(document.fullscreenElement)), false);
    assert.ok(await phone.evaluate(() => matchMedia('(orientation: portrait)').matches), 'Phone is portrait');
    await h.shot('portrait', phone);
  });
}
