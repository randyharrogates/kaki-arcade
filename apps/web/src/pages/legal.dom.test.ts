import { it, expect } from 'vitest';
import { createServer } from 'vite';
import { chromium } from 'playwright';
it('DATA-004 RZ-021 footer links render both pages without horizontal scrolling', async () => {
  const server = await createServer({ root: 'apps/web', server: { host: '127.0.0.1', port: 6732, strictPort: true } });
  await server.listen();
  try {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const downloads: string[] = [];
      page.on('request', request => { if (new URL(request.url()).pathname === '/rabakz/questions.json') downloads.push(request.url()); });
      for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1000, height: 720 }, { width: 1001, height: 720 }]) {
        await page.setViewportSize(viewport);
        await page.goto('http://127.0.0.1:6732');
        const footer = await page.locator('.legal-footer').boundingBox();
        const tvHelp = await page.getByRole('link', { name: 'Put this on your TV', exact: true }).boundingBox();
        expect(footer).not.toBeNull();
        expect(tvHelp).not.toBeNull();
        if (!footer || !tvHelp) throw new Error('Missing landing footer or TV help link');
        expect(footer.x + footer.width <= tvHelp.x || tvHelp.x + tvHelp.width <= footer.x ||
          footer.y + footer.height <= tvHelp.y || tvHelp.y + tvHelp.height <= footer.y,
        `Landing footer overlaps TV help at ${String(viewport.width)}×${String(viewport.height)}`).toBe(true);
        if (viewport.width <= 1000) {
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          for (const link of await page.locator('.legal-footer a').all()) {
            await link.scrollIntoViewIfNeeded();
            expect(await link.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(55);
            expect(await link.evaluate(el => {
              const rect = el.getBoundingClientRect();
              const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
              return hit !== null && el.contains(hit);
            }), `Footer link is covered at ${String(viewport.width)}×${String(viewport.height)}`).toBe(true);
          }
        }
        for (const name of ['Privacy', 'Credits']) {
          await page.goto('http://127.0.0.1:6732');
          await page.locator('.legal-footer').getByRole('link', { name, exact: true }).click();
          await page.waitForURL(`**/${name.toLowerCase()}`);
          await page.goto(`http://127.0.0.1:6732/${name.toLowerCase()}`);
          await page.getByRole('heading', { name, exact: true }).waitFor();
          if (viewport.width >= 1280) expect(await page.getByRole('link', { name: 'Back to Kaki Arcade' }).evaluate(el => el === document.activeElement)).toBe(true);
          if (name === 'Credits') {
            const download = page.getByRole('link', { name: 'Download our questions (CC BY‑SA 4.0)', exact: true });
            expect(downloads).toEqual([]);
            expect(await download.getAttribute('download')).toBe('kaki-arcade-rabakz-questions.json');
            expect(await download.getAttribute('href')).toBe('/rabakz/questions.json');
            await page.getByRole('link', { name: 'CC BY‑SA 4.0 licence', exact: true }).focus();
            await page.keyboard.press('Tab');
            expect(await download.evaluate(el => el === document.activeElement)).toBe(true);
            if (viewport.width <= 1000) expect(await download.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(55);
            const fit = await page.locator('.legal-page').evaluate(el => ({ width: el.clientWidth, height: el.clientHeight, scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight }));
            expect(fit.scrollWidth, `Credits ${String(viewport.width)}: ${JSON.stringify(fit)}`).toBeLessThanOrEqual(fit.width);
            if (viewport.width === 390) expect(fit.scrollHeight).toBeGreaterThan(fit.height);
          }
          if (name === 'Privacy') await page.getByRole('heading', { name: 'Nicknames', exact: true }).waitFor();
          if (name === 'Privacy') expect(await page.locator('section h2').allTextContents()).toEqual(['Anonymous counts', 'Room codes', 'No sign-up', 'Saved on your TV', 'Nicknames']);
          expect(await page.locator('.legal-page').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          expect(await page.locator('.legal-page').evaluate(el => getComputedStyle(el).backgroundImage)).not.toBe('none');
          expect(await page.locator('.legal-sections p').evaluateAll(paragraphs => paragraphs.every(p => {
            // The nearest painted ancestor must be the panel, shielding the dotted page.
            let ancestor = p.parentElement;
            while (ancestor && getComputedStyle(ancestor).backgroundImage === 'none' && getComputedStyle(ancestor).backgroundColor.endsWith(', 0)')) ancestor = ancestor.parentElement;
            if (!ancestor?.matches('.legal-reading.ka-panel')) return false;
            const style = getComputedStyle(ancestor);
            const probe = document.createElement('div');
            probe.className = 'ka-panel'; ancestor.append(probe);
            const expected = getComputedStyle(probe).backgroundImage;
            probe.remove();
            return style.backgroundImage === expected && style.backgroundImage.startsWith('linear-gradient(');
          }))).toBe(true);
          if (viewport.width === 1920) {
            const lines = await page.locator('.legal-sections p').evaluateAll(paragraphs => paragraphs.map(p => {
              const counts = new Map<number, number>();
              const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
              let node: Node | null;
              while ((node = walker.nextNode())) for (let offset = 0; offset < (node.textContent?.length ?? 0); offset++) {
                const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + 1);
                const rect = range.getClientRects()[0];
                if (rect?.width) { const top = Math.round(rect.top); counts.set(top, (counts.get(top) ?? 0) + 1); }
              }
              return [...counts.values()];
            }));
            expect(lines.flat().length).toBeGreaterThan(0);
            expect(Math.max(...lines.flat())).toBeLessThanOrEqual(80);
          }
          if (viewport.width >= 1280) {
            const fit = await page.locator('.legal-reading').evaluate(el => {
              const board = el.closest('.legal-page');
              if (!board) throw new Error('Missing legal board');
              const scale = board.getBoundingClientRect().width / board.clientWidth;
              const bottoms = Array.from(el.querySelectorAll('section'), section => section.getBoundingClientRect().bottom);
              return { clearance: (el.getBoundingClientRect().bottom - Math.max(...bottoms)) / scale, required: parseFloat(getComputedStyle(el).getPropertyValue('--ka-space-34')) };
            });
            expect(fit.clearance, `${name} ${String(viewport.width)}: ${JSON.stringify(fit)}`).toBeGreaterThanOrEqual(fit.required);
            expect(await page.locator('.legal-page').evaluate(el => el.scrollHeight <= el.clientHeight)).toBe(true);
            expect(await page.locator('.legal-reading').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
          }
          if (viewport.width < 1000) {
            const backLink = await page.getByRole('link', { name: 'Back to Kaki Arcade' }).evaluate(el => {
              el.focus();
              return { bottom: el.getBoundingClientRect().bottom };
            });
            const h1 = await page.locator('.legal-page h1').evaluate(el => ({ top: el.getBoundingClientRect().top }));
            expect(backLink.bottom + 10).toBeLessThanOrEqual(h1.top);
            expect(await page.locator('.legal-page').evaluate(el => { el.scrollTop = 55; return el.scrollTop > 0; })).toBe(true);
          }
          if (viewport.width === 1920) expect(await page.locator('section').first().evaluate(el => {
            const h2 = el.querySelector('h2'); const body = el.querySelector('p');
            return h2 && body && parseFloat(getComputedStyle(h2).fontSize) > parseFloat(getComputedStyle(body).fontSize);
          })).toBe(true);
        }
      }
    } finally { await browser.close(); }
  } finally { await server.close(); }
}, 60000);
