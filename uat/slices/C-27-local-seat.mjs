import assert from 'node:assert/strict';
/** @typedef {{players: {id: string}[]}} Public */
/** CTRL-009, PLAT-006, PLAT-021, PLAT-024. Integrator: --phones 1. */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function localSeat(h) {
  // Observe only public output; never expose the game's private state.
  await h.host.route('**/src/session-adapter.ts', async route => {
    const response = await route.fetch(); const source = await response.text();
    assert.ok(source.includes('runner = next;'));
    await route.fulfill({ response, body: source.replace('runner = next;', `runner = next;
      Reflect.set(window, 'c27Public', () => next.state ? loaded.game.publicView(next.state) : null);`) });
  });
  await h.createRoom();
  await h.host.setViewportSize({ width: 1920, height: 1080 });
  await h.host.getByRole('main', { name: 'Host lobby' }).waitFor();
  await h.host.keyboard.press('KeyJ');
  await h.host.getByText('L: leave', { exact: true }).waitFor();
  /** @param {string} key */
  async function press(key) { await h.host.keyboard.press(key); await h.host.waitForTimeout(600); }
  await press('Enter'); await press('ArrowRight'); await press('Enter'); await press('Enter');
  const refusal = 'Peek Poker needs a phone. Go back and scan the code in the lobby to join.';
  await h.host.locator('.setup-mirror-problem [role="status"]').filter({ hasText: refusal }).waitFor();
  assert.equal(await h.host.getByRole('main', { name: 'Game picker' }).count(), 1);
  await h.host.getByRole('heading', { name: 'Waiting for a phone', exact: true }).waitFor();
  assert.ok(!(await h.host.locator('.host-hints').innerText()).includes('Enter: start'));
  assert.ok((await h.host.locator('.host-hints').innerText()).includes('Esc: back'));
  assert.ok(!(await h.host.locator('[data-game="peek-poker"]').innerText()).includes('Needs at least'));
  await h.shot('01-local-only-start-refused');
  const phone = await h.newPhone(); await h.openJoin(phone, 'Fern');
  await phone.getByRole('button', { name: 'Join', exact: true }).click();
  // Joining mid-setup goes straight to the setup controls, not the lobby's "You're in"; the TV heading names the seated phone.
  await h.host.getByRole('heading', { name: 'Fern starts on their phone', exact: true }).waitFor();
  await phone.getByRole('button', { name: 'Start', exact: true }).waitFor();
  await h.host.locator('.picker-player-text').filter({ hasText: 'Player 1' }).getByText('Watching', { exact: true }).waitFor();
  await h.shot('02-phone-leads-tv-watching');
  await press('Enter');
  await h.host.locator('.pp-table[data-phase="pick"]').waitFor({ timeout: 60000 });
  const grid = phone.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button');
  // The phone shows "Watch the TV" while the cards are memorised; its grid appears when picking opens.
  await grid.first().waitFor({ timeout: 60000 });
  await grid.nth(0).click(); await grid.nth(5).click();
  await phone.getByRole('button', { name: 'Lock in', exact: true }).click();
  await h.host.locator('.pp-table[data-phase="reveal"]').waitFor();
  await phone.locator('.ka-layout-engine:not(.ka-layout-ghost) .ka-private-panel [data-kind="cards"]').waitFor();
  const view = /** @type {Public} */ (await h.host.evaluate(() => {
    /** @type {unknown} */
    const candidate = Reflect.get(window, 'c27Public');
    if (typeof candidate !== 'function') throw new Error('Missing public view observer');
    const read = /** @type {() => Public} */ (candidate);
    return read();
  }));
  assert.ok(view.players.some(/** @param {{id: string}} p */ p => p.id === 'seat-2'));
  assert.ok(!view.players.some(/** @param {{id: string}} p */ p => p.id === 'seat-1'));
  await h.shot('03-phone-playing-tv-no-hand');
  await h.shot('04-phone-hand', phone);
}
