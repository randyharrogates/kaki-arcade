// REL-006. Run by the integrator; screenshots still require visual review.
import assert from 'node:assert/strict';
const heading = 'This browser can’t run Kaki Arcade';
const computer = 'Open this page in an up-to-date Chrome, Edge or Safari on a computer.';
const phone = 'Open the join link in an up-to-date Safari on iPhone or Chrome on Android.';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function unsupported(h) {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await h.host.setViewportSize(viewport);
    for (const path of ['/', '/host', '/play']) {
      const label = `${path === '/' ? 'landing' : path.slice(1)}-${String(viewport.width)}`;
      await h.step(`Unsupported demo ${label}`, async () => {
        await h.host.goto(`${h.origin}${path}?demo=unsupported&missing=webrtc,animate`);
        await h.host.locator('#app main.unsupported').getByRole('heading', { name: heading, exact: true }).waitFor();
        await h.host.locator('#app main.unsupported').getByText(path === '/play' ? phone : computer, { exact: true }).waitFor();
        await h.host.locator('#app main.unsupported').getByText('Missing: direct connections between devices, screen animations.', { exact: true }).waitFor();
        assert.equal(await h.host.locator('#app main.unsupported button').count(), 0);
        assert.equal(await h.host.evaluate(() => document.documentElement.scrollWidth > window.innerWidth || (document.querySelector('.unsupported')?.scrollWidth ?? 0) > window.innerWidth), false);
        assert.equal(await h.host.locator('#unsupported-classic').isHidden(), true);
        await h.shot(`unsupported-${label}`);
      });
      await h.step(`Normal route ${label}`, async () => {
        await h.host.goto(`${h.origin}${path}`);
        // Since A-09, / is the landing page (landing-route.tsx), not the room screen.
        const normal = path === '/play' ? '.phone-page' : path === '/host' ? '.lobby' : '.landing-screen';
        await h.host.locator('#app').locator(normal).first().waitFor();
        assert.equal(await h.host.locator('#app main.unsupported').getByRole('heading', { name: heading, exact: true }).count(), 0);
        assert.equal(await h.host.locator('#unsupported-classic').isHidden(), true);
        await h.shot(`normal-${label}`);
      });
    }
  }
  await h.step('Delayed demo chunk keeps the static message hidden', async () => {
    const page = await h.host.context().newPage();
    try {
      await page.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          const screen = document.getElementById('unsupported-classic');
          if (!screen) throw new Error('Missing static fallback');
          const check = () => {
            if (!screen.hidden) document.documentElement.setAttribute('data-static-seen', 'yes');
          };
          new MutationObserver(check).observe(screen, { attributes: true, attributeFilter: ['hidden'] });
          check();
        });
      });
      await page.route('**/unsupported-demo*', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        await route.continue();
      });
      await page.goto(`${h.origin}/?demo=unsupported&missing=webrtc,animate`, { waitUntil: 'load' });
      assert.equal(await page.locator('#unsupported-classic').isHidden(), true);
      await page.locator('#app main.unsupported').getByRole('heading', { name: heading, exact: true }).waitFor();
      assert.equal(await page.locator('#unsupported-classic').isHidden(), true);
      assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-static-seen')), false);
      await h.shot('delayed-demo', page);
    } finally { await page.close(); }
  });
  // A separate context prevents the injected deletion leaking into normal checks.
  const context = await h.browser.newContext({ viewport: { width: 1280, height: 720 } });
  try {
    await context.addInitScript(() => { Reflect.deleteProperty(window, 'WebSocket'); });
    const page = await context.newPage();
    /** @type {string[]} */
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const path of ['/', '/host', '/play']) await h.step(`Real missing WebSocket ${path}`, async () => {
      await page.goto(`${h.origin}${path}`);
      await page.locator('#app main.unsupported').getByRole('heading', { name: heading, exact: true }).waitFor();
      await page.locator('#app main.unsupported').getByText(path === '/play' ? phone : computer, { exact: true }).waitFor();
      await page.locator('#app main.unsupported').getByText('Missing: live connections.', { exact: true }).waitFor();
      assert.equal(await page.locator('#unsupported-classic').isHidden(), true);
      assert.deepEqual(errors, []);
      await h.shot(`real-missing-websocket-${path === '/' ? 'landing' : path.slice(1)}`, page);
    });
  } finally { await context.close(); }
}
/** Production-only checks: node uat/slices/C-14-unsupported-browser.mjs --production */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
async function productionChecks(h) {
  for (const failure of ['classic', 'failed-preflight', 'parse']) {
    const context = await h.browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      if (failure !== 'parse') await context.addInitScript(kind => {
        if (kind === 'classic') Reflect.deleteProperty(Promise, 'allSettled');
        else Reflect.deleteProperty(AbortSignal, 'timeout');
      }, failure);
      const page = await context.newPage();
      /** @type {string[]} */
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      if (failure === 'parse') await page.route('**/assets/*.js', route => route.fulfill({ contentType: 'text/javascript', body: 'class { x = }' }));
      for (const path of ['/', '/host', '/play']) await h.step(`Production ${failure} ${path}`, async () => {
        errors.length = 0;
        await page.goto(`${h.origin}${path}`, { waitUntil: 'load' });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        const screen = page.locator('#unsupported-classic');
        const title = screen.getByRole('heading', { name: heading, exact: true });
        await title.waitFor();
        await screen.getByText(path === '/play' ? phone : computer, { exact: true }).waitFor();
        assert.equal(await screen.locator('p:not([hidden])').count(), 2);
        assert.equal(await page.locator('#app').evaluate(app => getComputedStyle(app).display === 'none'), true);
        const box = await title.boundingBox();
        assert.ok(box && box.y >= 0 && box.y + box.height <= await page.evaluate(() => innerHeight));
        assert.equal(await page.locator('script[type="module"][src]').count(), failure === 'parse' ? 1 : 0);
        if (failure === 'parse') assert.ok(errors.length > 0, 'capture the injected parse error');
        else assert.deepEqual(errors, []);
        await h.shot(`production-${failure}-${path === '/' ? 'landing' : path.slice(1)}`, page);
      });
    } finally { await context.close(); }
  }
  await h.step('Production with JavaScript off shows the noscript message', async () => {
    const context = await h.browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto(h.origin, { waitUntil: 'load' });
      const heading = page.getByRole('heading', { name: 'Kaki Arcade needs JavaScript', exact: true });
      await heading.waitFor();
      const box = await heading.boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height <= 844, 'noscript heading inside the viewport');
      // Settling runs script in the page, which is off here; the heading wait above is the settle.
      await h.shot('production-javascript-off', page, undefined, false);
    } finally { await context.close(); }
  });
  for (const path of ['/', '/host', '/play']) await h.step(`Production working browser ${path}`, async () => {
    await h.host.goto(`${h.origin}${path}`, { waitUntil: 'load' });
    // Since A-09, / is the landing page (landing-route.tsx), not the room screen.
    const normal = path === '/play' ? '.phone-page' : path === '/host' ? '.lobby' : '.landing-screen';
    await h.host.locator('#app').locator(normal).first().waitFor();
    await h.host.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    assert.equal(await h.host.locator('#unsupported-classic').isHidden(), true);
    assert.equal(await h.host.locator('#app').isVisible(), true);
    await h.shot(`production-working-${path === '/' ? 'landing' : path.slice(1)}`);
  });
}
// Use the existing runner's production extension without changing the harness.
if (process.argv.includes('--production')) {
  const { registerHooks } = await import('node:module');
  const library = new URL('../../tools/uat/', import.meta.url).href;
  registerHooks({ resolve(specifier, context, nextResolve) {
    const url = new URL(specifier, context.parentURL ?? import.meta.url);
    return nextResolve(url.href.startsWith(library) && url.pathname.endsWith('.js') ? url.href.replace(/\.js$/, '.ts') : specifier, context);
  } });
  const loaded = /** @type {unknown} */ (await import(new URL('../../tools/uat/runner.ts', import.meta.url).href));
  const { run } = /** @type {typeof import('../../tools/uat/runner.js')} */ (loaded);
  await run(['C-14-unsupported-browser'], { production: true, script: new URL(import.meta.url).pathname,
    command: 'node uat/slices/C-14-unsupported-browser.mjs --production', execute: productionChecks });
}
