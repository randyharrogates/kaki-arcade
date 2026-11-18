import assert from 'node:assert/strict';
/** REL-003. @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function tvHelp(h) {
  await h.step('Landing link opens the help page lazily', async () => {
    await h.host.setViewportSize({ width: 1920, height: 1080 });
    /** @type {string[]} */
    const requests = [];
    h.host.on('request', request => requests.push(request.url()));
    await h.host.goto(h.origin);
    const link = h.host.getByRole('link', { name: 'Put this on your TV', exact: true });
    await link.waitFor();
    assert.equal(requests.some(url => /tv-help-(route|copy)/.test(url)), false);
    await h.shot('landing-help-link');
    await link.click();
    await h.host.locator('.tv-help h1').waitFor();
  });
  for (const { width, height } of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 960, height: 540 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) await h.step(`Help at ${String(width)} × ${String(height)}`, async () => {
    await h.host.setViewportSize({ width, height });
    await h.host.goto(`${h.origin}/tv-help`);
    await h.host.locator('.tv-help h1').waitFor();
    assert.equal(await h.host.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (width >= 960 && height >= 540) assert.equal(await h.host.locator('.tv-help').evaluate(el => {
      const board = el.getBoundingClientRect();
      return [...el.querySelectorAll('section')].every(node => node.getBoundingClientRect().bottom <= board.bottom - 89 * board.width / 1920) && el.scrollHeight <= el.clientHeight && [...el.querySelectorAll('li, h1, h2, a, p')].every(node => {
        const r = node.getBoundingClientRect();
        return r.left >= board.left && r.right <= board.right && r.top >= board.top && r.bottom <= board.bottom;
      });
    }), true, 'All TV copy stays inside the board');
    await h.shot(`tv-help-${String(width)}x${String(height)}`);
    if (width < 960 || height < 540) {
      const sections = await h.host.locator('.tv-help section').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top + scrollY, bottom: rect.bottom + scrollY };
      }));
      for (const [index, section] of sections.entries()) {
        for (let top = section.top; top < section.bottom; top += Math.floor(height / 2)) {
          await h.host.evaluate(y => { window.scrollTo(0, y); }, top);
          await h.shot(`tv-help-${String(width)}x${String(height)}-section-${String(index + 1)}-scroll-${String(Math.floor(top))}`);
        }
      }
    }
  });
}
