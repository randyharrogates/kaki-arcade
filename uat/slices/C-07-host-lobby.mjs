// NFR-TEST; PLAT-001, PLAT-004, PLAT-009, PLAT-010. Demo captures are labelled as demos.
import assert from 'node:assert/strict';
import { hostPresets } from '../../tools/uat/core.js';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function lobby(h) {
  const code = await h.createRoom(); await h.shot('real-room');
  await h.step('Reload reopens the same real room', async () => {
    await h.host.reload(); await h.host.getByLabel(`Room code ${code.slice(0, 4)} ${code.slice(4)}`).waitFor(); assert.equal(await h.host.getByLabel(/^Room code /).getAttribute('aria-label'), 'Room code ' + code.slice(0, 4) + ' ' + code.slice(4)); await h.shot('real-reloaded');
  });
  // Chromium emits network console errors during deliberate outages; other console errors still fail.
  await h.step('Pairing outage retains open room', async () => {
    h.expectSignalError(/^WebSocket connection to .* failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED$/);
    h.expectSignalError(/^(Failed to load resource: net::ERR_CONNECTION_(REFUSED|RESET)|net::ERR_CONNECTION_(REFUSED|RESET))$/);
    await h.network.stopSignal(); await h.host.getByRole('status').filter({ hasText: 'Reconnecting' }).waitFor();
    assert.equal(await h.host.locator('header [role=status]').innerText(), 'Reconnecting');
    await h.host.getByLabel('Room code ' + code.slice(0, 4) + ' ' + code.slice(4)).waitFor(); await h.shot('real-server-stopped');
    await h.network.startSignal();
  });
  await h.step('Saved room missing from real server expires', async () => {
    h.expectSignalError(/^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/);
    // The reopened host dials its old room: the handshake is refused and the request is abandoned.
    h.expectSignalError(/^WebSocket connection to .* failed: Error during WebSocket handshake: Unexpected response code: 404$/);
    h.expectSignalError(/^net::ERR_(ABORTED|CONNECTION_REFUSED)$/);
    h.expectSignalError(/^Failed to load resource: net::ERR_CONNECTION_REFUSED$/);
    await h.closeHost(); await h.network.resetSignal(); await h.reopenHost();
    await h.host.getByRole('heading', { name: 'This room has expired' }).waitFor(); assert.equal(await h.host.evaluate(() => sessionStorage.getItem('kaki.host-reconnect.v1')), null); await h.shot('real-expired');
  });
  for (const [preset, viewport] of Object.entries(hostPresets)) {
    await h.host.setViewportSize(viewport);
    for (const query of ['demo=0', 'demo=1', 'demo=3', 'demo=8', 'demo=8&names=long', ...['creating', 'restoring', 'unreachable', 'expired', 'replaced'].map(state => `demo=8&state=${state}`)]) {
      if (preset === '4K' && !['demo=8', 'demo=8&names=long'].includes(query)) continue;
      await h.step(`Demo ${preset} ${query}`, async () => {
        await h.host.goto(`${h.origin}/host?${query}`);
        await h.host.getByRole('list', { name: 'Player seats' }).waitFor();
        await h.shot(`demo-${preset}-${query.replace(/[=&]/g, '-')}`); await assertLayout(h);
      });
    }
  }
  await h.host.setViewportSize(hostPresets['1080p']);
  // The demo timer is fixed at 2000 ms. Settle normally, then slow only future wipes.
  for (const change of ['join', 'held', 'leave', 'return']) {
    await h.step('Slowed demo ' + change + ' strip', async () => {
      await h.host.goto(`${h.origin}/host?demo=3&change=${change}`);
      await h.hostSeat('Cloud Noodle').waitFor();
      await h.host.evaluate(async () => {
        const deadline = performance.now() + 1500;
        let quiet = 0;
        while (quiet < 2 && performance.now() < deadline) {
          await new Promise(requestAnimationFrame);
          quiet = document.getAnimations().some(a => a.playState === 'running' || a.pending) ? 0 : quiet + 1;
        }
        if (quiet < 2) throw new Error('Initial demo reveal did not settle before change timer');
        const url = new URL(location.href); url.searchParams.set('slow', '10');
        history.replaceState(null, '', url);
      });
      const index = { join: 3, held: 0, leave: 2, return: 0 }[change];
      assert.notEqual(index, undefined);
      const clip = await h.host.evaluate(index => {
        const seats = document.querySelector('[aria-label="Player seats"]');
        if (!seats) throw new Error('Missing seats');
        const boxes = [...seats.children].slice(Math.max(0, index - 1), index + 2).map(e => e.getBoundingClientRect());
        const x = Math.floor(Math.min(...boxes.map(b => b.x)));
        const y = Math.floor(Math.min(...boxes.map(b => b.y)));
        return { x, y, width: Math.ceil(Math.max(...boxes.map(b => b.right))) - x, height: Math.ceil(Math.max(...boxes.map(b => b.bottom))) - y };
      }, Number(index));
      // Observe the applied identity on the next animation frame; no announcement polling delay.
      await h.host.waitForFunction(index => document.querySelector('[aria-label="Player seats"]')?.children[index]?.querySelector('.outgoing[aria-hidden="true"]'), Number(index), { polling: 'raf' });
      const duration = await h.host.evaluate(index => {
        const seat = document.querySelector('[aria-label="Player seats"]')?.children[index];
        return Math.max(...document.getAnimations().filter(a => seat?.contains(a.effect instanceof KeyframeEffect ? a.effect.target : null)).map(a => Number(a.effect?.getComputedTiming().endTime)));
      }, Number(index));
      assert.ok(duration > 0 && Number.isFinite(duration));
      await h.frameStrip('demo-' + change + '-slow10', h.host, {
        frames: 9, everyMs: (duration + 100) / 8, clip,
        checkFrame: async frame => {
          if (frame !== 0 && frame !== 8) return;
          const state = await h.host.evaluate(index => {
            const seat = document.querySelector('[aria-label="Player seats"]')?.children[index];
            const incoming = seat?.querySelector('.incoming');
            const mask = incoming ? getComputedStyle(incoming).clipPath : '';
            return { outgoing: !!seat?.querySelector('.outgoing[aria-hidden="true"]'), masked: mask.startsWith('inset(') && (mask.match(/-?\d*\.?\d+/g) ?? []).some(n => Number(n) !== 0) };
          }, Number(index));
          assert.equal(state.outgoing, frame === 0, 'Outgoing copy must exist only at strip start');
          if (frame === 0) assert.ok(state.masked, 'Incoming copy must not be fully revealed');
        },
      });
    });
  }
  await h.step('Reduced motion settles within one frame', async () => {
    await h.reducedMotion(true);
    await h.slowMotion(2, '/host?demo=3&change=join');
    await h.host.getByLabel(/^Room code /).waitFor();
    // Poll from the current document, checking immediately: no stale node or missed mutation.
    await h.host.waitForFunction(() => document.querySelector('[aria-label="Player seats"]')?.textContent.replace(/\s/g, '').includes('WaffleFern'), null, { timeout: 10000 });
    const settled = /** @type {unknown} */ (await h.host.evaluate(() => new Promise(resolve => {
      requestAnimationFrame(() => {
        const seats = document.querySelector('[aria-label="Player seats"]');
        const content = [...(seats?.querySelectorAll('[data-held]') ?? [])].filter(e => !e.closest('[aria-hidden="true"]'));
        resolve(content.length === 8 && content.every(e => getComputedStyle(e).opacity === '1') &&
          document.getAnimations().filter(a => seats?.contains(a.effect instanceof KeyframeEffect ? a.effect.target : null)).every(a =>
            a.playState === 'finished' || Number(a.effect?.getTiming().duration) === 0));
      });
    })));
    assert.equal(settled, true, 'Reduced motion must settle by next frame');
    await h.shot('demo-1080p-join-reduced-motion');
  });
}
/** @param {import('../../tools/uat/harness.ts').Harness} h */
async function assertLayout(h) {
  const layout = await h.host.evaluate(() => ({
    width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
    viewportWidth: innerWidth, viewportHeight: innerHeight,
    rows: [...document.querySelectorAll('.seat .incoming .connection')].map(e => e.getBoundingClientRect().y),
  }));
  assert.equal(layout.width, layout.viewportWidth, 'Horizontal scroll');
  assert.equal(layout.height, layout.viewportHeight, 'Vertical scroll');
  assert.equal(layout.rows.length, 8);
  assert.ok(layout.rows.every(y => Math.abs(y - (layout.rows[0] ?? 0)) < 1), 'Seat status rows must align');
}
