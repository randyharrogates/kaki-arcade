// DATA-001..005, RZ-021. Console has one light marble theme, no dark mode.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function legal(h) {
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const measurements = [];
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await h.host.setViewportSize(viewport);
    await h.host.goto(h.origin);
    await h.host.locator('.legal-footer').waitFor();
    await h.shot(`landing-footer-${String(viewport.width)}`);
  }
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await h.host.setViewportSize(viewport);
      for (const name of ['Privacy', 'Credits']) await h.step(`${name} ${String(viewport.width)}x${String(viewport.height)}`, async () => {
        await h.host.goto(`${h.origin}/${name.toLowerCase()}`);
        await h.host.getByRole('heading', { name, exact: true }).waitFor();
        /** @param {unknown} condition @param {string} message */
        const check = (condition, message) => { if (!condition) failures.push(`${name} ${String(viewport.width)}x${String(viewport.height)}: ${message}`); };
        check(await h.host.locator('.legal-page').evaluate(el => el.scrollWidth <= el.clientWidth), 'horizontal overflow');
        const prefix = `${name.toLowerCase()}-${String(viewport.width)}x${String(viewport.height)}`;
        if (viewport.width >= 1280) {
          check(await h.host.locator('.legal-page').evaluate(el => el.scrollHeight <= el.clientHeight), 'vertical overflow');
          const fit = await h.host.locator('.legal-reading').evaluate(el => {
            const panel = el.getBoundingClientRect();
            const board = el.closest('.legal-page');
            if (!board) throw new Error('Missing legal board');
            const scale = board.getBoundingClientRect().width / board.clientWidth;
            const bottom = Math.max(...Array.from(el.querySelectorAll('section'), section => section.getBoundingClientRect().bottom));
            const required = parseFloat(getComputedStyle(el).getPropertyValue('--ka-space-34')) * scale;
            return { clearance: panel.bottom - bottom, required, panelBottom: panel.bottom, viewportHeight: innerHeight };
          });
          measurements.push(`${prefix}: ${JSON.stringify(fit)}`);
          await writeFile(join(h.evidence, 'fit.txt'), measurements.join('\n') + '\n');
          check(fit.panelBottom <= fit.viewportHeight, 'panel outside viewport');
          check(fit.clearance >= fit.required, `bottom clearance ${String(fit.clearance)} < ${String(fit.required)}`);
          check(await h.host.getByRole('link', { name: 'Back to Kaki Arcade' }).evaluate(el => el === document.activeElement), 'back link lacks focus');
          check(await h.host.locator('section').first().evaluate(el => {
            const heading = el.querySelector('h2'); const body = el.querySelector('p');
            return heading && body && parseFloat(getComputedStyle(heading).fontSize) > parseFloat(getComputedStyle(body).fontSize);
          }), 'heading must exceed body size');
        }
        await h.shot(`${prefix}-top`);
        const sections = h.host.locator('.legal-sections section');
        for (let index = 0; viewport.width < 1280 && index < await sections.count(); index++) {
          const before = await h.host.locator('.legal-page').evaluate(el => el.scrollTop);
          await sections.nth(index).scrollIntoViewIfNeeded();
          const after = await h.host.locator('.legal-page').evaluate(el => el.scrollTop);
          if (after !== before) await h.shot(`${prefix}-section-${String(index + 1)}`);
        }
        if (viewport.width < 1000) {
          await h.host.locator('.legal-page').evaluate(el => { el.scrollTop = el.scrollHeight; });
          await h.shot(`${prefix}-end`);
        }
      });
  }
  assert.deepEqual(failures, [], failures.join('\n'));
}
