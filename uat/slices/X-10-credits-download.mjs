// RZ-021, DATA-004; D-232. Runs against dev Vite; production emission is covered by apps/web/src/pages/legal-download.test.ts.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function creditsDownload(h) {
  const href = '/rabakz/questions.json';
  let requested;
  h.host.on('request', request => { if (new URL(request.url()).pathname === href) requested = true; });
  const measurements = [];
  const activations = [];
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await h.host.setViewportSize(viewport);
    requested = false;
    await h.host.goto(`${h.origin}/credits`);
    const link = h.host.getByRole('link', { name: 'Download our questions (CC BY‑SA 4.0)', exact: true });
    await link.waitFor();
    assert.equal(await link.getAttribute('href'), href);
    assert.equal(requested, false, 'Download must not preload');
    const fit = await h.host.locator('.legal-page').evaluate(el => ({ height: el.clientHeight, scrollHeight: el.scrollHeight, width: el.clientWidth, scrollWidth: el.scrollWidth }));
    const reading = await h.host.locator('.legal-reading').evaluate(el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left };
    });
    const screenScale = await h.host.locator('.legal-page').evaluate(el => el.getBoundingClientRect().width / el.clientWidth);
    measurements.push({ viewport, fit, reading, screenScale });
    assert.ok(fit.scrollWidth <= fit.width);
    if (viewport.width >= 1280) assert.ok(fit.scrollHeight <= fit.height);
    else assert.ok(await link.evaluate(el => el.getBoundingClientRect().height >= 55));
    await link.scrollIntoViewIfNeeded();
    await h.shot(`credits-download-${String(viewport.width)}`);
    if (viewport.width === 1920 || viewport.width === 390) {
      const pending = viewport.width === 1920 ? h.host.waitForEvent('download') : undefined;
      if (viewport.width === 1920) {
        await h.host.getByRole('link', { name: 'CC BY‑SA 4.0 licence', exact: true }).focus();
        await h.host.keyboard.press('Tab');
        assert.ok(await link.evaluate(el => el === document.activeElement));
        await h.host.keyboard.press('Enter');
      } else {
        // Dispatch a touch through a touch-enabled page at the phone viewport.
        const phone = await h.host.context().browser()?.newContext({ viewport, hasTouch: true });
        assert.ok(phone);
        try {
          const page = await phone.newPage();
          await page.goto(`${h.origin}/credits`);
          const tapped = page.waitForEvent('download');
          await page.getByRole('link', { name: 'Download our questions (CC BY‑SA 4.0)', exact: true }).tap();
          const download = await tapped;
          const path = await download.path();
          assert.ok(path);
          const bank = /** @type {unknown} */ (JSON.parse(await readFile(path, 'utf8')));
          assert.ok(bank && typeof bank === 'object' && 'questions' in bank && Array.isArray(bank.questions));
          assert.ok(bank.questions.every((/** @type {unknown} */ question) => question && typeof question === 'object' && 'id' in question && typeof question.id === 'string' && question.id.startsWith('otdb-')));
          activations.push({ viewport, method: 'tap', questionCount: bank.questions.length, everyIdStartsOtdb: true });
        } finally { await phone.close(); }
        // The host page did not initiate this phone download.
        continue;
      }
      assert.ok(pending);
      const download = await pending;
      assert.equal(download.suggestedFilename(), 'kaki-arcade-rabakz-questions.json');
      const path = await download.path();
      assert.ok(path);
      const bank = /** @type {unknown} */ (JSON.parse(await readFile(path, 'utf8')));
      assert.ok(bank && typeof bank === 'object' && 'questions' in bank && Array.isArray(bank.questions));
      assert.ok(bank.questions.every((/** @type {unknown} */ question) => question && typeof question === 'object' && 'id' in question && typeof question.id === 'string' && question.id.startsWith('otdb-')));
      activations.push({ viewport, method: 'keyboard Enter', questionCount: bank.questions.length, everyIdStartsOtdb: true });
    }
  }
  const response = await h.host.request.get(`${h.origin}${href}`);
  assert.equal(response.status(), 200);
  assert.match(response.headers()['content-type'] ?? '', /application\/json/);
  const bank = /** @type {unknown} */ (await response.json());
  assert.ok(bank && typeof bank === 'object' && 'credits' in bank);
  assert.match(JSON.stringify(bank.credits), /CC BY-SA 4\.0/);
  await writeFile(join(h.evidence, 'download.json'), JSON.stringify({ href, status: response.status(), contentType: response.headers()['content-type'], licence: 'CC BY-SA 4.0', activations, measurements }, null, 2) + '\n');
}
