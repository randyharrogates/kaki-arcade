import assert from 'node:assert/strict';
/** RZ-033 / D-168: keyboard-only TV pause levels. No phones needed. */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function pauseLevels(h) {
  await h.createRoom();
  await h.host.keyboard.press('KeyJ');
  await h.host.keyboard.press('Enter');
  await h.host.getByRole('main', { name: 'Game picker' }).waitFor();
  await h.host.waitForTimeout(600);
  await h.host.keyboard.press('Enter');
  await h.host.waitForTimeout(600);
  await h.host.keyboard.press('Enter');
  await h.host.locator('.session-placeholder').waitFor();
  for (const { width, height } of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
    await h.host.setViewportSize({ width, height });
    await h.host.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await h.host.waitForFunction(() => Math.abs(Number(getComputedStyle(document.documentElement).getPropertyValue('--screen-scale')) - Math.min(innerWidth / 1920, innerHeight / 1080)) < 0.001);
    await h.host.keyboard.press('Escape');
    await h.host.waitForFunction(() => document.activeElement?.textContent === 'Resume');
    await h.host.waitForTimeout(300);
    await h.shot(`pause-${String(height)}-before`);
    await h.host.keyboard.press('ArrowDown');
    const effects = h.host.getByRole('slider', { name: 'Effects' });
    const before = Number(await effects.getAttribute('aria-valuenow'));
    await h.host.keyboard.press('ArrowLeft');
    assert.equal(Number(await effects.getAttribute('aria-valuenow')), Math.max(0, before - 10));
    await h.host.keyboard.press('ArrowDown');
    const music = h.host.getByRole('slider', { name: 'Music' });
    const musicBefore = Number(await music.getAttribute('aria-valuenow'));
    await h.host.keyboard.press('ArrowRight');
    assert.equal(Number(await music.getAttribute('aria-valuenow')), Math.min(100, musicBefore + 10));
    await h.host.waitForTimeout(300);
    await h.shot(`pause-${String(height)}-after`);
    await h.host.keyboard.press('Escape');
    await h.host.locator('.host-pause').waitFor({ state: 'detached' });
  }
}
