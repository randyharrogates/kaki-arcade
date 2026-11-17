// CTRL-003, PLAT-031. Run by the integrator with --phones 2.
import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function privatePanel(h) {
  if (h.maxPhones < 2) throw new Error('C-16b requires --phones 2');
  const phones = [await h.newPhone(), await h.newPhone()];
  try {
    // UAT-only source seam: the shell has no pause UI yet. Drive the real session
    // API, preserving its real room messages, rules pause and private-view delivery.
    await h.host.route('**/src/session-adapter.ts', async route => {
      const response = await route.fetch();
      const source = await response.text();
      assert.ok(source.includes('runner = next;'), 'Session seam still matches');
      await route.fulfill({ response, body: source.replace('runner = next;', `runner = next;
        window.addEventListener('c16b-session', event => {
          if (runner !== next) return;
          const request = event.detail;
          if (request === 'pause') next.pause('seat-1');
          if (request === 'resume') next.resume('seat-1');
          if (request === 'quit') next.quit('seat-1', true);
          document.documentElement.dataset.c16bPaused = String(next.paused);
        });`) });
    });
    await h.createRoom();
    for (const [index, phone] of phones.entries()) {
      await phone.setViewportSize(index === 0 ? { width: 667, height: 375 } : { width: 844, height: 390 });
      const name = index === 0 ? 'Cloud Noodle' : 'Pebble Puff';
      await h.openJoin(phone, name);
      await phone.getByRole('button', { name: 'Join', exact: true }).click();
      await h.waitSeated(phone, name);
    }
    const leader = phones[0]; assert.ok(leader);
    await leader.getByRole('button', { name: 'Pick a game', exact: true }).click();
    await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
    for (const target of ['peek-poker', 'rabakz']) {
      await leader.getByRole('button', { name: 'Next', exact: true }).click();
      await h.host.locator(`[data-game="${target}"][data-focused="true"]`).waitFor();
    }
    await leader.getByRole('button', { name: 'Select', exact: true }).click();
    await leader.getByRole('button', { name: 'Start', exact: true }).click();
    await h.host.locator('.rz-question').waitFor();
    for (const [index, phone] of phones.entries()) {
      await phone.locator('.ka-controller-shell[data-theme="rabakz"]').waitFor();
      await phone.locator('.ka-layout-engine:not(.ka-layout-ghost)').waitFor();
      assert.equal(await phone.locator('.ka-controller-shell').getAttribute('data-theme'), 'rabakz');
      assert.equal(await phone.locator('main.ka-controller-shell, main.phone-page').getAttribute('data-theme'), 'rabakz');
      await h.shot(index === 0 ? 'phone-question-667' : 'phone-question-844', phone);
    }
    // R-02 currently sends Score/Streak at the question stage. Check the live
    // renderer's fit result as well as visibility; a hidden overflowing panel fails.
    const panel = leader.locator('.ka-private-panel:not(.ka-private-ghost)');
    await panel.waitFor({ state: 'visible' });
    assert.equal(await leader.locator('.ka-layout-engine:not(.ka-layout-ghost)').getAttribute('data-fits'), 'true');
    // Rabakz's question panel does not change on an answer; use a real paused panel for shot 03.
    await h.host.evaluate(() => { window.dispatchEvent(new CustomEvent('c16b-session', { detail: 'pause' })); });
    await h.host.waitForFunction(() => document.documentElement.dataset.c16bPaused === 'true');
    assert.equal(await leader.locator('main.ka-controller-shell, main.phone-page').getAttribute('data-theme'), 'rabakz');
    await panel.waitFor({ state: 'visible' });
    await h.host.evaluate(() => { window.dispatchEvent(new CustomEvent('c16b-session', { detail: 'resume' })); });
    await h.host.locator('.rz-question').waitFor();
    await h.host.clock.install();
    for (let second = 0; second < 400; second++) {
      await h.host.clock.runFor(1000);
      // The scoreboard every five questions also offers Continue; only the final screen shows this hint.
      if (await h.host.locator('.game-final-hint').count()) break;
    }
    await h.host.clock.resume();
    await leader.getByRole('button', { name: 'Continue', exact: true }).click();
    for (const phone of phones) {
      await phone.locator('.phone-results').waitFor();
      assert.equal(await phone.locator('main.phone-page').getAttribute('data-theme'), 'console');
      assert.equal(await phone.locator('.ka-private-panel').count(), 0);
    }
    await h.shot('phone-results-844', phones[1]);
    await leader.getByRole('button', { name: 'Back to game picker', exact: true }).click();
    await leader.getByRole('button', { name: 'Select', exact: true }).click();
    await leader.getByRole('button', { name: 'Start', exact: true }).click();
    await h.host.locator('.rz-question').waitFor();
    await h.host.evaluate(() => { window.dispatchEvent(new CustomEvent('c16b-session', { detail: 'pause' })); });
    await h.host.waitForFunction(() => document.documentElement.dataset.c16bPaused === 'true');
    assert.equal(await leader.locator('main.ka-controller-shell, main.phone-page').getAttribute('data-theme'), 'rabakz');
    await leader.locator('.ka-private-panel:not(.ka-private-ghost)').waitFor({ state: 'visible' });
    await h.shot('phone-paused-667', leader);

    // K-05 fixture fallback: exercises the same private cards renderer without playing a full poker round.
    const hand = phones[1]; assert.ok(hand);
    const realPhoneUrl = hand.url();
    await hand.setViewportSize({ width: 667, height: 375 });
    await hand.goto(`${h.origin}/play?demo=controller&layout=empty&private=cards-5`);
    await hand.locator('.ka-private-panel .ka-layout-card-face').first().waitFor();
    await hand.locator('.ka-controller-shell').evaluate(node => { node.setAttribute('data-theme', 'peek-poker'); });
    const readable = await hand.locator('.ka-private-panel .ka-layout-card-face').evaluateAll(nodes => nodes.map(node => {
      const probe = document.createElement('span'); probe.style.color = 'var(--ka-panel-ink)'; node.append(probe);
      const expected = getComputedStyle(probe).color; probe.remove();
      return getComputedStyle(node).color === expected && getComputedStyle(node.parentElement ?? node).color === expected;
    }));
    assert.ok(readable.length > 0 && readable.every(Boolean), 'Hand cards use computed panel ink');
    await h.shot('peek-poker-hand-667', hand);
    await hand.goto(realPhoneUrl);
    await hand.locator('.ka-controller-shell').waitFor();

    // Quit the paused session and select Tabao Rush.
    await h.host.evaluate(() => { window.dispatchEvent(new CustomEvent('c16b-session', { detail: 'quit' })); });
    await leader.getByRole('button', { name: 'Select', exact: true }).waitFor();
    await leader.getByRole('button', { name: 'Next', exact: true }).click();
    await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
    await leader.getByRole('button', { name: 'Select', exact: true }).click();
    await leader.getByRole('button', { name: 'Start', exact: true }).click();
    await leader.setViewportSize({ width: 844, height: 390 });
    await leader.locator('.ka-controller-shell[data-theme="tabao-rush"]').waitFor();
    assert.equal(await leader.locator('main.ka-controller-shell, main.phone-page').getAttribute('data-theme'), 'tabao-rush');
    await h.shot('tabao-rush-phone-844', leader);
    await h.host.evaluate(() => { window.dispatchEvent(new CustomEvent('c16b-session', { detail: 'pause' })); window.dispatchEvent(new CustomEvent('c16b-session', { detail: 'quit' })); });
    await leader.getByRole('button', { name: 'Select', exact: true }).waitFor();
    // Rabakz supports optional teams.
    await leader.getByRole('button', { name: 'Previous', exact: true }).click();
    await h.host.locator('[data-game="rabakz"][data-focused="true"]').waitFor();
    await leader.getByRole('button', { name: 'Select', exact: true }).click();
    await leader.getByRole('button', { name: 'Teams', exact: true }).click();
    await leader.getByRole('button', { name: 'Teams', exact: true }).and(leader.locator('[aria-pressed="true"]')).waitFor();
    await leader.getByRole('button', { name: 'Start', exact: true }).click();
    await leader.getByRole('region', { name: 'Pick a side' }).waitFor();
    await leader.setViewportSize({ width: 667, height: 375 });
    assert.equal(await leader.locator('main.phone-page').getAttribute('data-theme'), 'console');
    await h.shot('team-setup-console-667', leader);
  } finally { for (const phone of phones) await phone.close(); }
}
