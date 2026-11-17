/// <reference lib="dom" />
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { memoryGate, prepareEvidence, ready, startGroup, stopGroup } from '../uat/core.js';
import { controllerConditions, controllerStartupLine, controllerStartupReport } from './controller-startup-report.js';

/** Standalone because the round/frame harness creates a room before timing navigation. */
export async function main({ slice = 'controller', out = 'perf-1' } = {}) {
  if (!/^perf-(1|controller[A-Za-z0-9-]*)$/.test(out)) throw new Error('Controller --out must be perf-1 or start with perf-controller (gitignored run folders)');
  if (!existsSync('apps/web/dist/.vite/manifest.json')) throw new Error('Build production first: pnpm run build');
  memoryGate();
  const web = await new Promise<number>((resolve, reject) => {
    const listener = createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const address = listener.address();
      listener.close(error => {
        if (error) reject(error);
        else if (!address || typeof address === 'string') reject(new Error('No preview port allocated'));
        else resolve(address.port);
      });
    });
  });
  const evidence = await prepareEvidence(process.cwd(), slice, out);
  const server = startGroup('pnpm', ['--dir', 'apps/web', 'exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(web), '--strictPort']);
  const abort = new AbortController();
  const stop = () => { abort.abort(new Error('Controller start-up interrupted')); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const samples: number[] = [];
  try {
    const origin = `http://127.0.0.1:${String(web)}`;
    await ready(origin, server.check, abort.signal);
    browser = await chromium.launch({ headless: true });
    const close = () => { void browser?.close(); };
    abort.signal.addEventListener('abort', close, { once: true });
    for (let run = 0; run < 5; run++) {
      abort.signal.throwIfAborted();
      const context = await browser.newContext({ viewport: controllerConditions.viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
      try {
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: controllerConditions.cpuRate });
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.clearBrowserCache');
        await cdp.send('Network.emulateNetworkConditions', controllerConditions.network);
        // Install before navigation: no Node/Playwright round trip delays the press.
        await page.addInitScript(() => {
          const probe = () => {
            const control = document.querySelector<HTMLInputElement>('#room-code');
            const rect = control?.getBoundingClientRect();
            let visible = true;
            for (let node: Element | null = control; node; node = node.parentElement) {
              const style = getComputedStyle(node);
              if (Number(style.opacity) === 0 || style.visibility !== 'visible') visible = false;
            }
            if (!visible || document.fonts.status !== 'loaded' || !control || !rect || rect.width <= 0 || rect.height <= 0 || getComputedStyle(control).visibility !== 'visible' || !document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.isSameNode(control)) {
              requestAnimationFrame(probe); return;
            }
            // A second presentation callback lets the preceding frame paint first.
            requestAnimationFrame(() => {
              control.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 1 }));
              if (!performance.getEntriesByName('kaki-controller-interactive').length) requestAnimationFrame(probe);
            });
          };
          requestAnimationFrame(probe);
        });
        await page.goto(`${origin}/play`, { waitUntil: 'commit', timeout: 30000 });
        await page.waitForFunction(() => performance.getEntriesByName('kaki-controller-interactive').length === 1, undefined, { timeout: 30000 });
        samples.push(await page.evaluate(() => performance.getEntriesByName('kaki-controller-interactive')[0]?.startTime ?? NaN));
      } finally { await context.close(); }
    }
    const report = controllerStartupReport(samples, browser.version());
    await writeFile(join(evidence, 'startup.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(controllerStartupLine(report));
    if (report.status !== 'pass') throw new Error('PERF-020 controller start-up budget exceeded');
  } catch (error) {
    if (samples.length !== 5) await writeFile(join(evidence, 'startup.json'), JSON.stringify({ schemaVersion: 1, requirement: 'PERF-020', status: 'fail', samplesMs: samples, medianMs: null, budgetMs: 2000, error: error instanceof Error ? error.message : String(error) }, null, 2) + '\n');
    throw error;
  } finally {
    await browser?.close();
    await stopGroup(server.child.pid);
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
  }
}
