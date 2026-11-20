// PP-033, PP-011: real leader setup and three rounds, using P-07's observation seam.
import assert from 'node:assert/strict';
/** @typedef {{phase:string,round:number,seconds:number,swap:unknown}} View */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function steadyMode(h) {
  assert.ok(h.maxPhones === 1 || h.maxPhones === 3, 'Use --phones 1 or --phones 3');
  const solo = h.maxPhones === 1;
  if (solo) await h.host.addInitScript(() => {
    localStorage.setItem('kaki.host-device.game.peek-poker.progress-v1', JSON.stringify({
      schemaVersion: 1, data: { bests: { rising: 40, steady: 12 } },
    }));
  });
  await h.host.setViewportSize({ width: 1920, height: 1080 });
  /** @type {View[]} */ const views = [];
  await h.host.exposeFunction('p13Public', /** @param {View} view */ view => { views.push(view); });
  await h.host.route('**/src/session-adapter.ts', async route => {
    const response = await route.fetch(), source = await response.text();
    const marker = /publicView\(view\)\s*\{/;
    assert.ok(marker.test(source), 'P-07 public observation seam matches');
    await route.fulfill({ response, body: source.replace(marker, 'publicView(view) { window.p13Public(structuredClone(view));') });
  });
  await h.createRoom();
  /** @type {import('playwright').Page[]} */ const phones = [];
  for (let i = 0; i < h.maxPhones; i++) {
    const phone = await h.newPhone();
    await h.openJoin(phone, `Player ${String(i + 1)}`);
    await phone.getByRole('button', { name: 'Join', exact: true }).click();
    await h.waitSeated(phone, `Player ${String(i + 1)}`); phones.push(phone);
  }
  const leader = phones[0]; assert.ok(leader);
  /** @param {string} name */
  const click = name => leader.getByRole('button', { name, exact: true }).click();
  await h.step('Choose Steady on the leader phone and mirror it on TV', async () => {
    await click('Pick a game'); await click('Next');
    await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
    await click('Select');
    await leader.getByRole('button', { name: 'Rising', exact: true }).waitFor();
    await click('Steady');
    if (solo) await click('7');
    await leader.locator('[data-field="difficulty"] button[aria-pressed="true"]').filter({ hasText: 'Steady' }).waitFor();
    await h.host.locator('[data-field="difficulty"]').filter({ hasText: 'Steady' }).waitFor();
    await h.shot('setup-steady-phone', leader); await h.shot('setup-steady-tv', h.host);
    await click('Start');
    await h.host.locator('.pp-table[data-phase="memorise"]').waitFor();
    await h.host.clock.install();
    await h.host.clock.pauseAt(await h.host.evaluate(() => new Date(Date.now() + 50)));
  });
  /** @param {number} round @param {string} phase */
  const advance = async (round, phase) => {
    for (let i = 0; i < 900; i++) {
      const current = views.at(-1);
      if (current?.round === round && current.phase === phase) return current;
      await h.host.clock.runFor(100);
    }
    throw new Error(`Did not reach round ${String(round)} ${phase}`);
  };
  try {
    if (solo) {
      await h.step('Solo play shows the seeded Steady best', async () => {
        const label = h.host.locator('.pp-best');
        assert.equal(await label.textContent(), 'Steady best 12');
        // Let the set-up screen finish fading into the table. Web Animations run on real time, not the paused fake clock.
        await h.host.clock.runFor(1000);
        await h.host.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => undefined))));
        await h.shot('steady-best-play-tv', h.host, undefined, false);
      });
      for (let round = 1; round <= 7; round++) {
        await h.step(`Solo round ${String(round)} locks two picks`, async () => {
          await advance(round, 'pick');
          const grid = leader.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button');
          await grid.nth(0).click(); await h.host.clock.runFor(100);
          await grid.nth(8).click(); await h.host.clock.runFor(100);
          await leader.locator('[data-target="grid:8"][data-state="selected"]').waitFor();
          await click('Lock in'); await h.host.clock.runFor(100);
          await advance(round, 'scoreboard');
        });
      }
      await advance(7, 'over');
      await h.step('Solo final shows a new Steady best above 12', async () => {
        const label = h.host.locator('.pp-result-best');
        await label.filter({ hasText: /^New steady best · [0-9]+$/ }).waitFor();
        const text = await label.textContent();
        assert.ok(text && /^New steady best · [0-9]+$/.test(text));
        assert.ok(Number(text.split(' · ')[1]) > 12);
        // Let the results rows and the hand-off line finish entering: Web Animations run on real time, not the paused fake clock.
        await h.host.clock.runFor(1500);
        await h.host.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => undefined))));
        await h.shot('steady-best-final-tv', h.host, undefined, false);
      });
      return;
    }
    for (let round = 1; round <= 3; round++) {
      await h.step(`Round ${String(round)} uses 20 seconds and proceeds directly to pick`, async () => {
        const memorise = await advance(round, 'memorise');
        assert.equal(memorise.seconds, 20);
        if (round === 3) {
          await h.shot('round-3-memorise-tv', h.host, undefined, false);
          await h.shot('round-3-memorise-phone', leader);
        }
        await advance(round, 'pick');
        assert.ok(views.filter(v => v.round === round).every(v => v.phase !== 'swap' && v.swap === null));
        if (round === 3) {
          await h.host.clock.runFor(600); // Settle the canvas flip, as P-07 does.
          await h.shot('round-3-pick-tv', h.host, undefined, false);
          await h.shot('round-3-pick-phone', leader);
        } else {
          await advance(round, 'scoreboard');
        }
      });
    }
    assert.ok(views.every(v => v.phase !== 'swap'));
  } finally { await h.host.clock.resume(); }
}
