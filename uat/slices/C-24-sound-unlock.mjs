import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
/** RZ-033 / TR-063, D-229. The harness has no per-slice browser launch args.
 * Run Chromium; --autoplay-policy=user-gesture-required cannot be supplied here.
 */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function soundUnlock(h) {
  await h.host.setViewportSize({ width: 1920, height: 1080 });
  await h.host.context().addInitScript(() => {
    const Native = AudioContext;
    Reflect.set(window, 'AudioContext', class extends Native {
      constructor() {
        super();
        document.documentElement.dataset.soundContexts = String(Number(document.documentElement.dataset.soundContexts ?? 0) + 1);
        const update = () => { document.documentElement.dataset.soundState = this.state; };
        update(); this.addEventListener('statechange', update);
        document.addEventListener('c24-suspend', () => { void this.suspend().catch(() => undefined); });
      }
    });
  });
  await h.host.goto(h.origin);
  await h.host.getByRole('link', { name: 'Host a game', exact: true }).click();
  await h.host.getByRole('main', { name: 'Host lobby' }).waitFor();
  await h.host.waitForFunction(() => document.documentElement.dataset.soundState === 'running');
  await h.host.getByText('J: join from this keyboard', { exact: true }).waitFor();
  await h.shot('01-lobby-running-1080p');
  // Back must unmount the live host; re-entry restores or creates one room.
  for (const restore of [true, false]) {
    await h.host.waitForFunction(() => document.documentElement.dataset.hostLifecycle === 'live');
    await h.host.waitForFunction(() => sessionStorage.getItem('kaki.host-reconnect.v1') !== null);
    const before = await h.host.locator('.room-code').textContent();
    await h.host.goBack();
    await h.host.getByRole('link', { name: 'Host a game', exact: true }).waitFor();
    // Landing markup precedes passive host cleanup, whose final flush retains the room.
    await h.host.waitForFunction(() => document.documentElement.dataset.hostLifecycle === 'disposed');
    if (!restore) await h.host.evaluate(() => { sessionStorage.removeItem('kaki.host-reconnect.v1'); });
    await h.host.getByRole('link', { name: 'Host a game', exact: true }).click();
    await h.host.getByText('J: join from this keyboard', { exact: true }).waitFor();
    await h.host.waitForFunction(() => (document.querySelector('.room-code')?.textContent ?? '').replace(/\s/g, '').length === 8);
    const after = await h.host.locator('.room-code').textContent();
    if (restore) assert.equal(after, before); else assert.notEqual(after, before);
    assert.equal(await h.host.evaluate(() => document.documentElement.dataset.soundContexts), '1');
    await h.host.keyboard.press('KeyJ');
    await h.host.getByText('1 of 8 players', { exact: true }).waitFor();
    await h.host.keyboard.press('KeyL');
    await h.host.getByText('0 of 8 players', { exact: true }).waitFor();
  }
  // A fresh page has no prior user activation, unlike a same-tab reload.
  const direct = await h.host.context().newPage();
  const previous = h.host;
  try {
    h.host = direct;
    await direct.goto(`${h.origin}/host`);
    const noGestureState = await direct.evaluate(async () => { const context = new AudioContext(); const state = context.state; await context.close(); return state; });
    await writeFile(join(h.evidence, 'sound-policy.json'), JSON.stringify({ noGestureState }, null, 2) + '\n');
    await direct.setViewportSize({ width: 1920, height: 1080 });
    await direct.getByText('Click or press a key on this screen to turn on sound', { exact: true }).waitFor();
    await h.shot('02-lobby-blocked-1080p');
    await direct.setViewportSize({ width: 1280, height: 720 });
    await h.shot('02-lobby-blocked-720p');
    await direct.setViewportSize({ width: 1920, height: 1080 });
    await direct.keyboard.press('KeyA');
    await direct.getByText('J: join from this keyboard', { exact: true }).waitFor();
    await direct.waitForFunction(() => document.documentElement.dataset.soundState === 'running');
    await h.shot('03-lobby-unlocked-1080p');
    await direct.setViewportSize({ width: 1280, height: 720 });
    await h.shot('03-lobby-unlocked-720p');
    await direct.setViewportSize({ width: 1920, height: 1080 });
    await direct.keyboard.press('KeyJ');
    await direct.keyboard.press('Enter');
    await direct.getByRole('main', { name: 'Game picker' }).waitFor();
    await direct.waitForTimeout(600);
    await direct.keyboard.press('Enter'); await direct.waitForTimeout(600);
    await direct.keyboard.press('Enter');
    // Wait for the game to be running (not a fixed delay), then pause.
    await direct.getByRole('main', { name: 'Game picker' }).waitFor({ state: 'detached' });
    await direct.waitForFunction(() => !document.body.innerText.includes('Starting…'));
    await direct.waitForTimeout(600);
    await direct.keyboard.press('Escape');
    await direct.getByRole('dialog', { name: 'Paused' }).waitFor();
    // Suspend the real context to inspect the blocked row without another TV gesture.
    await direct.evaluate(() => { document.dispatchEvent(new Event('c24-suspend')); });
    await direct.getByText('Sound is off', { exact: true }).first().waitFor();
    assert.deepEqual(await direct.locator('.pause-level-value').allTextContents(), ['', '']);
    // Measure only once finite animations have finished: the Paused popover enters from scale 0.95,
    // so a rect taken mid-entrance differs from the settled one by a fraction of a pixel.
    const rects = async () => {
      await direct.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))); });
      return direct.locator('.host-pause section, .host-pause button').evaluateAll(nodes => nodes.map(node => { const { x, y, width, height } = node.getBoundingClientRect(); return { x, y, width, height }; }));
    };
    const blocked1080 = await rects();
    assert.equal(blocked1080.length, 7);
    await h.shot('04-pause-sound-off-1080p');
    await direct.setViewportSize({ width: 1280, height: 720 });
    await h.shot('04-pause-sound-off-720p');
    const blocked720 = await rects();
    await direct.getByRole('heading', { name: 'Paused', exact: true }).click();
    await direct.waitForFunction(() => document.documentElement.dataset.soundState === 'running');
    await direct.getByText('Sound is off', { exact: true }).first().waitFor({ state: 'hidden' });
    assert.deepEqual(await rects(), blocked720);
    await h.shot('05-pause-click-unlocked-720p');
    await direct.setViewportSize({ width: 1920, height: 1080 });
    assert.deepEqual(await rects(), blocked1080);
    await h.shot('05-pause-click-unlocked-1080p');
    const effects = direct.getByRole('slider', { name: 'Effects' });
    while (Number(await effects.getAttribute('aria-valuenow')) < 100) await direct.getByRole('button', { name: 'Raise effects', exact: true }).click();
    assert.equal(await effects.locator('.pause-level-value').textContent(), '100');
    assert.equal(await effects.locator('.pause-level-value').evaluate(node => {
      const text = node.firstElementChild?.getBoundingClientRect();
      const column = node.getBoundingClientRect();
      return node.scrollWidth <= node.clientWidth && !!text && text.left >= column.left && text.right <= column.right && text.top >= column.top && text.bottom <= column.bottom;
    }), true);
    await h.shot('06-pause-effects-100-1080p');
  } finally { h.host = previous; await direct.close(); }
}
