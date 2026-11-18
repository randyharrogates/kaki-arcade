// DATA-003: real host -> local pairing worker -> daily aggregate read-back.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function counts(h) {
  const endpoint = `${h.signalOrigin}/counts`;
  const kinds = ['error:host:session', 'error:host:load', 'error:signal:unavailable', 'reconnect:signal',
    'perf:host-frame-p95:le17', 'perf:host-frame-p95:le34', 'perf:host-frame-p95:le50', 'perf:host-frame-p95:gt50'];
  /** @type {import('playwright').Request[]} */
  const requests = [];
  /** @param {import('playwright').Request} request */
  const capture = request => { if (request.url() === endpoint) requests.push(request); };
  h.host.on('request', capture);
  try {
    // A cookie is available at the worker origin, so omission is a meaningful assertion.
    await h.host.context().addCookies([{ name: 'uat-counts-privacy', value: 'must-not-send', url: h.signalOrigin }]);
    await h.createRoom();
    const { page: phone } = await h.joinPhone('Counts Guest');
    await h.step('Play the shortest Rabakz match with real phone answers', async () => {
      await phone.getByRole('button', { name: 'Pick a game', exact: true }).click();
      for (const game of ['tabao-rush', 'peek-poker']) {
        await h.host.locator(`[data-game="${game}"][data-focused="true"]`).waitFor();
        await phone.getByRole('button', { name: 'Next', exact: true }).click();
      }
      await h.host.locator('[data-game="rabakz"][data-focused="true"]').waitFor();
      await phone.getByRole('button', { name: 'Select', exact: true }).click();
      await h.host.locator('[data-game="rabakz"][data-expanded="true"]').waitFor();
      // Rabakz defaults to its shortest offered length: ten questions.
      await phone.getByRole('button', { name: 'Start', exact: true }).click();
      await h.host.locator('.rz-question').waitFor();
      // Collect at least 600 real animation frames; never replace game state or clocks.
      await h.host.evaluate(() => new Promise(resolve => {
        let frames = 0;
        const next = () => { if (++frames >= 620) resolve(true); else requestAnimationFrame(next); };
        requestAnimationFrame(next);
      }));
      let taps = 0;
      const deadline = Date.now() + 180000;
      // The phone's crossed-out Continue also appears mid-match (and in crossfade layers), so the TV's
      // Final results heading is what marks the end.
      const finished = h.host.getByText('Final results', { exact: true });
      while (!(await finished.count())) {
        assert.ok(Date.now() < deadline, 'Ten-question match finishes within three minutes');
        const answer = phone.locator('[data-part="answer"] button[aria-disabled="false"]').first();
        // A tap can land while the phone crossfades to the next state (the panel covers the old grid); skip it and try again.
        if (await answer.count() && await answer.isVisible()) await answer.tap({ timeout: 1000 }).then(() => { taps++; }, () => undefined);
        await phone.waitForTimeout(200);
      }
      assert.ok(taps >= 10, 'The phone tapped answers throughout the match');
      await phone.getByRole('button', { name: 'Continue', exact: true }).and(phone.locator(':not([aria-disabled="true"])')).last().click();
      const post = requests.find(request => request.method() === 'POST');
      assert.ok(post, 'The real match emitted a counts request');
      const response = await post.response();
      assert.ok(response);
      assert.equal(response.status(), 204, 'Real host counts accepted by the local worker');
      await h.host.getByRole('main', { name: 'Results', exact: true }).waitFor();
      await h.shot('counts-results-tv');
    }, 240000);
    await h.step('Hide host once and read back today’s anonymous totals', async () => {
      h.expectSignalError(/^WebSocket connection to .* failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED$/);
      h.expectSignalError(/^(Failed to load resource: net::ERR_CONNECTION_(REFUSED|RESET)|net::ERR_CONNECTION_(REFUSED|RESET))$/);
      // The results screen shows no pairing status, so watch the TV's own signalling socket: a retry
      // while the server is down means it entered "reconnecting" (and counted reconnect:signal).
      const signalWs = h.signalOrigin.replace(/^http/, 'ws');
      const retry = h.host.waitForEvent('websocket', { timeout: 60000, predicate: socket => socket.url().startsWith(signalWs) });
      await h.network.stopSignal();
      await retry;
      // Register the recovery wait before restarting, so a retry that opens during startSignal is not missed.
      // Wait for signalling recovery (a socket that receives a message) so the counts endpoint is up.
      const recovered = h.host.waitForEvent('websocket', { timeout: 90000, predicate: socket => !socket.url().startsWith(signalWs) ? false : new Promise(resolve => {
        socket.once('framereceived', () => { resolve(true); });
        socket.once('close', () => { resolve(false); });
        socket.once('socketerror', () => { resolve(false); });
      }) });
      await h.network.startSignal();
      await recovered;
      // Leave the host page so the browser itself fires visibilitychange (hidden) and pagehide; do not
      // replace visibilityState or call counts. Window minimising is not observable in Playwright's
      // Chromium (pages stay visible), so navigation is the browser-generated hide (2026-11-18 probe).
      await h.host.goto(`${h.origin}/play`);
      const day = new Date().toISOString().slice(0, 10);
      const deadline = Date.now() + 15000;
      /** @type {unknown} */
      let totals;
      do {
        const read = await h.host.evaluate(async url => {
          const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(2000) });
          return { status: response.status, body: await response.text() };
        }, endpoint);
        assert.equal(read.status, 200, 'Use --signal-var COUNTS_DEV_READ:true for local read-back');
        totals = JSON.parse(read.body);
        if (totals && typeof totals === 'object' && 'reconnect:signal' in totals &&
          typeof totals['reconnect:signal'] === 'number' && totals['reconnect:signal'] > 0) break;
        await h.host.waitForTimeout(200);
      } while (Date.now() < deadline);
      assert.equal(new Date().toISOString().slice(0, 10), day, 'Run must not straddle UTC midnight');
      assert.ok(totals && typeof totals === 'object' && !Array.isArray(totals));
      const entries = Object.entries(totals);
      assert.ok(entries.length > 0);
      for (const [kind, value] of entries) {
        assert.ok(kinds.includes(kind), `Only the eight anonymous count kinds: ${kind}`);
        assert.ok(typeof value === 'number' && Number.isSafeInteger(value) && value > 0, 'Only positive safe integers');
      }
      const bands = entries.filter(([kind]) => kind.startsWith('perf:host-frame-p95:'));
      assert.equal(bands.length, 1, 'One completed match contributes exactly one frame band');
      assert.equal(bands[0]?.[1], 1);
      const posts = requests.filter(request => request.method() === 'POST');
      /** @type {unknown} */
      const resultsBatch = JSON.parse(posts[0]?.postData() ?? 'null');
      assert.ok(resultsBatch && typeof resultsBatch === 'object' && !Array.isArray(resultsBatch), 'Results batch was observed before navigation');
      assert.ok(!('reconnect:signal' in resultsBatch), 'Reconnect was recorded after results');
      for (const [kind, value] of Object.entries(resultsBatch)) assert.deepEqual(entries.find(([key]) => key === kind), [kind, value], 'Hide does not resend drained results');
      assert.ok(entries.some(([kind, value]) => kind === 'reconnect:signal' && value === 1),
        'Browser-fired hide delivered the pending reconnect count within fifteen seconds');
      // Page listeners can miss unload requests; the server read-back above proves hide delivery.
      // Hide request privacy options are asserted in browser.test.ts.
      for (const request of requests) {
        const headers = await request.allHeaders();
        assert.equal(headers.cookie, undefined, `${request.method()} /counts omits cookies`);
        assert.equal(headers.referer, undefined, `${request.method()} /counts omits referrer`);
      }
      await writeFile(join(h.evidence, 'counts.json'), `${JSON.stringify(totals, null, 2)}\n`);
      await writeFile(join(h.evidence, 'counts-requests.json'), `${JSON.stringify({ day, requests: requests.map(request => ({ method: request.method(), cookie: false, referrer: false })) }, null, 2)}\n`);
    });
  } finally {
    h.host.off('request', capture);
    await h.host.context().clearCookies({ name: 'uat-counts-privacy' });
  }
}
