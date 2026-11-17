// CTRL-004, CTRL-008. Dev route only; browser execution belongs to the integrator.
import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function controllerShell(h) {
  const page = await h.newPhone();
  await page.addInitScript(() => {
    let requests = 0;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => document.documentElement.dataset.uatHidden === 'true' });
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: () => {
      document.documentElement.dataset.wakeRequests = String(++requests);
      if (new URLSearchParams(location.search).get('deny') === '1') return Promise.reject(new Error('UAT denial'));
      const sentinel = new EventTarget();
      return Promise.resolve(Object.assign(sentinel, { release: () => { sentinel.dispatchEvent(new Event('release')); return Promise.resolve(); } }));
    } } });
  });
  const goto = async (query = '') => {
    await page.goto(`${h.origin}/play?demo=controller&${query}`);
    await page.locator('html.ka-controller-locked').waitFor({ state: 'attached' });
    await page.waitForFunction(() => document.documentElement.dataset.wakeRequests === '1');
  };
  for (const [width, height] of /** @type {[number, number][]} */ ([[844, 390], [667, 375], [568, 320], [390, 844], [320, 568]])) {
    for (const seat of [1, 8]) for (const link of ['connected', 'reconnecting', 'lost']) {
      const label = `${String(width)}x${String(height)}-seat${String(seat)}-${link}`;
      await h.step(label, async () => {
        await page.setViewportSize({ width, height });
        await goto(`seat=${String(seat)}&name=WWWWWWWWWWWW&link=${link}&deny=1`);
        await page.locator('.ka-controller-wake').waitFor();
        await headerFits(page);
        assert.deepEqual(await page.locator('.ka-controller-shell').evaluate(shell => [shell, ...shell.querySelectorAll('*')].filter(node => {
          const r = node.getBoundingClientRect();
          return r.width && r.height && (r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5);
        }).map(node => node.getAttribute('class'))), [], 'Every shell element stays inside the viewport');
        assert.equal(await page.locator('.ka-controller-header').evaluate(node => node.getBoundingClientRect().height <= 55), true);
        assert.equal(await page.locator('.ka-controller-portrait').isVisible(), height > width);
        if (width > height) assert.equal(await page.locator('.ka-controller-play').evaluate(node => node.getBoundingClientRect().height >= 233), true);
        await h.shot(label, page);
      });
    }
  }
  await h.step('Overlap detector rejects deliberately restored overflowing layout', async () => {
    await page.setViewportSize({ width: 320, height: 568 });
    await goto(`name=${'W'.repeat(30)}&link=reconnecting`);
    await headerFits(page);
    assert.equal(await page.locator('.ka-controller-player strong').evaluate(node => getComputedStyle(node).textOverflow === 'ellipsis' && node.scrollWidth > node.clientWidth && node.clientWidth > 0), true);
    // Mutation control: reproduce the original minimum-content bug, then measure the overlap.
    await page.locator('.ka-controller-player').evaluate(node => { node.style.width = 'max-content'; });
    const broken = await headerGeometry(page);
    // Forcing the name to full width either overlaps the link or pushes the header past its own width.
    assert.ok(broken.playerRight > broken.linkLeft || !broken.fits || !broken.onScreen, 'Detector reports the restored overflowing layout');
    await page.locator('.ka-controller-player').evaluate(node => { node.style.removeProperty('width'); });
    await headerFits(page);
    await h.shot('long-name-clipped', page);
  });
  await h.step('Real wake helper resolves, hides/releases, and re-requests on return', async () => {
    await goto();
    assert.equal(await page.locator('.ka-controller-wake').count(), 0);
    for (const hidden of [true, false]) await page.evaluate(hidden => {
      document.documentElement.dataset.uatHidden = String(hidden);
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
    await page.waitForFunction(() => document.documentElement.dataset.wakeRequests === '2');
    assert.equal(await page.locator('.ka-controller-wake').count(), 0);
    await h.shot('wake-reacquired', page);
  });
  await h.step('Mounted page lock and unmount cleanup', async () => {
    await goto();
    assert.equal(await page.evaluate(() => [document.documentElement, document.body].every(node => {
      const css = getComputedStyle(node); return css.overscrollBehavior === 'none' && css.touchAction === 'none';
    })), true);
    const contextPrevented = () => page.evaluate(() => {
      const event = new Event('contextmenu', { bubbles: true, cancelable: true }); document.dispatchEvent(event); return event.defaultPrevented;
    });
    assert.equal(await contextPrevented(), true);
    await page.evaluate(() => { window.dispatchEvent(new Event('controller-demo-unmount')); });
    await page.locator('.ka-controller-shell').waitFor({ state: 'detached' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('ka-controller-locked'));
    assert.equal(await contextPrevented(), false);
  });
  await h.step('Link crossfade and portrait turn frame strips', async () => {
    await page.setViewportSize({ width: 568, height: 320 });
    await goto('slow=10');
    // Event advances the same live state as cycle=1, at a deterministic capture boundary.
    await page.evaluate(() => { window.dispatchEvent(new Event('controller-demo-link')); });
    await h.frameStrip('link-crossfade', page, { frames: 6, everyMs: 350, checkFrame: async frame => {
      if (frame === 1) assert.equal(await page.locator('.ka-controller-icons span').evaluateAll(nodes => nodes.filter(node => {
        const opacity = Number(getComputedStyle(node).opacity); return opacity > 0 && opacity < 1;
      }).length === 2), true, 'Outgoing and incoming icons overlap mid-crossfade');
    } });
    await page.setViewportSize({ width: 320, height: 568 });
    await h.frameStrip('portrait-turn', page, { frames: 6, everyMs: 600, checkFrame: async frame => {
      if (frame === 1) assert.equal(await page.locator('.ka-controller-rotate').evaluate(node => node.getAnimations().some(a => {
        const p = a.effect?.getComputedTiming().progress; return p !== null && p !== undefined && p > 0 && p < 1;
      })), true, 'Phone outline is mid-turn');
    } });
  });
  await h.step('Reduced motion retains live link state and final portrait turn', async () => {
    await h.reducedMotion(true); await goto();
    await page.evaluate(() => { window.dispatchEvent(new Event('controller-demo-link')); });
    await page.getByText('Reconnecting', { exact: true }).waitFor();
    assert.equal(await page.locator('.ka-controller-icons span').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).transitionDuration === '0s')), true);
    assert.deepEqual(await page.locator('.ka-controller-rotate').evaluate(node => {
      const css = getComputedStyle(node); return [css.animationName, css.transform];
    }), ['none', 'matrix(0, 1, -1, 0, 0, 0)']);
    assert.equal(await page.locator('.ka-controller-wake').count(), 0);
    await h.shot('portrait-reduced-held', page);
  });
}
/** @param {import('playwright').Page} page */
async function headerGeometry(page) {
  return page.locator('.ka-controller-header').evaluate(header => {
    const player = header.querySelector('.ka-controller-player'); const link = header.querySelector('.ka-controller-link');
    if (!player || !link) throw new Error('Header missing');
    return { playerRight: player.getBoundingClientRect().right, linkLeft: link.getBoundingClientRect().left, fits: header.scrollWidth <= header.clientWidth,
      onScreen: header.getBoundingClientRect().right <= innerWidth + 0.5 && link.getBoundingClientRect().right <= innerWidth + 0.5 };
  });
}
/** @param {import('playwright').Page} page */
async function headerFits(page) {
  const result = await headerGeometry(page);
  assert.ok(result.playerRight + 13 <= result.linkLeft + 0.5, 'Player column clears link by 13px');
  assert.ok(result.onScreen, 'Header and link stay inside the screen');
  assert.equal(result.fits, true, 'Header content stays inside header');
}
