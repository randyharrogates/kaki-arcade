import assert from 'node:assert/strict';
/** REL-002. @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function landing(h) {
  const names = ['Host a game', 'Put this on your TV', 'Privacy', 'Credits'];
  for (const { width, height } of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await h.step(`Landing and keyboard at ${String(width)} × ${String(height)}`, async () => {
      await h.host.setViewportSize({ width, height });
      await h.host.goto(h.origin);
      const links = h.host.locator('.landing-screen a');
      if (width > 1000) await h.host.waitForFunction(() => document.activeElement?.textContent === 'Host a game');
      else {
        await links.first().waitFor();
        await h.host.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await h.host.evaluate(() => document.activeElement === document.body), true);
      }
      await h.host.locator('.landing-picture').evaluate(async image => { if (image instanceof HTMLImageElement) await image.decode(); });
      assert.deepEqual(await links.allTextContents(), names);
      assert.equal(await h.host.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await h.shot(`landing-${String(width)}-host`);
      if (width === 390) await h.host.keyboard.press('ArrowDown');
      if (width === 1920) {
        await h.host.locator('.landing-picture').click();
        assert.equal(await h.host.evaluate(() => document.activeElement === document.body), true);
        await h.host.keyboard.press('ArrowDown');
        assert.equal(await h.host.evaluate(() => document.activeElement?.textContent), names[0]);
        await h.shot('landing-1920-host-after-lost-focus');
      }
      for (const key of ['ArrowDown', 'ArrowRight']) {
        for (let index = 1; index < names.length; index++) {
          await h.host.keyboard.press(key);
          assert.equal(await h.host.evaluate(() => document.activeElement?.textContent), names[index]);
          await h.shot(`landing-${String(width)}-${key}-${String(index)}`);
        }
        const back = key === 'ArrowDown' ? 'ArrowUp' : 'ArrowLeft';
        for (let index = names.length - 2; index >= 0; index--) {
          await h.host.keyboard.press(back);
          assert.equal(await h.host.evaluate(() => document.activeElement?.textContent), names[index]);
        }
      }
      assert.equal(await h.host.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    });
  }
  await h.step('Enter on Host a game opens the room screen', async () => {
    await h.host.setViewportSize({ width: 1920, height: 1080 });
    await h.host.goto(h.origin);
    await h.host.waitForFunction(() => document.activeElement?.textContent === 'Host a game');
    await h.host.keyboard.press('Enter');
    await h.host.getByLabel(/^Room code /).waitFor();
    await h.shot('host-room-after-enter');
  });
}
