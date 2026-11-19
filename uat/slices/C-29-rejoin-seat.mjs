import assert from 'node:assert/strict';
/** PLAT-007, PLAT-034, PLAT-035. Real Rabakz session; no injected game state.
 * @param {import('../../tools/uat/harness.ts').Harness} h
 */
export default async function rejoinSeat(h) {
  assert.ok(h.maxPhones >= 3, 'C-29 needs --phones 3');
  await h.createRoom();
  let leader = (await h.joinPhone('Mei')).page;
  let second = (await h.joinPhone('Randy')).page;
  const third = (await h.joinPhone('Cloud')).page;
  await leader.getByRole('button', { name: 'Pick a game', exact: true }).click();
  for (const target of ['peek-poker', 'rabakz']) {
    await leader.getByRole('button', { name: 'Next', exact: true }).click();
    await h.host.locator(`[data-game="${target}"][data-focused="true"]`).waitFor();
  }
  await leader.getByRole('button', { name: 'Select', exact: true }).click();
  const answers = await h.host.evaluate(async () => {
    const path = '/@id/__x00__virtual:rabakz-bank';
    /** @type {unknown} */
    const imported = await import(path);
    const loaded = /** @type {{default:{files:{text:string}[]}}} */ (imported);
    return Object.fromEntries(loaded.default.files.flatMap(file => {
      /** @type {unknown} */
      const raw = JSON.parse(file.text);
      const data = /** @type {{questions?:{prompt:string;options:string[];correct:number}[]}} */ (raw);
      return (data.questions ?? []).map(q => [q.prompt, q.options[q.correct]]);
    }));
  });
  await leader.getByRole('button', { name: 'Start', exact: true }).click();
  await h.host.locator('.rz-question').waitFor();
  await second.locator('.ka-controller-header').waitFor();
  /** @param {import('playwright').Page} page */
  const identity = async page => page.locator('.ka-controller-header').innerText();
  const plain = (/** @type {string} */ text) => text.replace(/\u00AD/g, '').replace(/\s+/g, ' ').trim();
  const prompt = await h.host.locator('.rz-question h1').innerText();
  const right = Object.entries(answers).find(([question]) => plain(question) === plain(prompt))?.[1];
  assert.ok(right, 'Shipped correct answer');
  await second.getByRole('button', { name: right, exact: true }).click();
  await h.host.locator('.rz-frame[data-reveal="true"]').waitFor();
  // The reveal waits for the leader's Continue (or its own longer timer): press it when offered.
  const next = leader.getByRole('button', { name: 'Continue', exact: true });
  if (await next.waitFor({ timeout: 5000 }).then(() => true, () => false)) await next.click().catch(() => undefined);
  await h.host.locator('.rz-frame:not([data-reveal])').waitFor({ timeout: 60000 });
  const before = await identity(second);
  const beforeScore = await second.getByText(/^Score \d+$/).innerText();
  assert.notEqual(beforeScore, 'Score 0', 'Randy earns points before dropping');
  // Retain browser localStorage while discarding the page and its sessionStorage.
  const context = second.context();
  await second.close();
  const waiting = h.host.getByRole('heading', { name: 'Waiting for Randy to rejoin', exact: true });
  await waiting.waitFor();
  for (const [width, height] of [[1920, 1080], [1280, 720]]) {
    assert.ok(width && height); await h.host.setViewportSize({ width, height });
    await h.shot(`waiting-code-${String(width)}`);
    const code = await h.host.locator('.host-pause .room-code').innerText();
    assert.equal(code.replace(/\s/g, ''), h.code);
  }
  await leader.getByRole('heading', { name: 'Waiting for Randy to rejoin', exact: true }).waitFor();
  await h.shot('phone-1-waiting', leader);
  await h.shot('non-leader-waiting', third);
  second = await context.newPage();
  await h.openJoin(second, 'Randy');
  await second.getByRole('button', { name: 'Join', exact: true }).click();
  await h.host.locator('.rejoin-countdown').filter({ hasText: '3' }).waitFor();
  await h.shot('phone-countdown', leader);
  assert.equal(await leader.getByRole('button', { name: 'Resume', exact: true }).count(), 1);
  const strip = h.frameStrip('countdown-3-2-1', h.host, { frames: 6, everyMs: 450 });
  for (const number of ['3', '2', '1']) {
    await h.host.locator('.rejoin-countdown').filter({ hasText: number }).waitFor();
    await h.shot(`countdown-${number}`);
  }
  await strip;
  await h.host.locator('.host-pause').waitFor({ state: 'detached' });
  assert.equal(await identity(second), before, 'same seat and nickname after code rejoin');
  assert.equal(await second.getByText(/^Score \d+$/).innerText(), beforeScore, 'same score after rejoin');
  await h.shot('phone-2-same-seat-name-score', second);
  // A fresh browser can choose only an offline name, never a connected seat.
  await second.close(); await waiting.waitFor();
  const fresh = await h.newPhone();
  await h.openJoin(fresh, 'New'); await fresh.getByRole('button', { name: 'Join', exact: true }).click();
  await fresh.getByRole('heading', { name: 'Are you one of these players?', exact: true }).waitFor();
  assert.equal(await fresh.getByRole('button', { name: /Mei|Cloud/ }).count(), 0);
  await h.shot('fresh-browser-name-list', fresh);
  await fresh.getByRole('button', { name: /Randy/ }).click();
  await h.host.getByRole('status').filter({ hasText: 'Randy is back on a new phone' }).waitFor();
  await h.host.setViewportSize({ width: 1920, height: 1080 });
  await h.shot('claimed-seat-notice-1920');
  await h.host.locator('.host-pause').waitFor({ state: 'detached' });
  assert.equal(await identity(fresh), before, 'name choice restores the same seat');
  assert.equal(await fresh.getByText(/^Score \d+$/).innerText(), beforeScore, 'claim keeps earned score');
  const randy = h.host.locator('.rz-seat-row').filter({ hasText: 'Randy' });
  assert.match(await randy.innerText(), /Thinking/);
  assert.doesNotMatch(await randy.innerText(), /Next question/);
  await fresh.close(); await waiting.waitFor();
  // Two simultaneous missing seats; reconnect the leader in its original browser.
  const leaderContext = leader.context(); await leader.close();
  await h.host.getByRole('heading', { name: 'Waiting for Mei and Randy to rejoin', exact: true }).waitFor();
  await h.shot('two-missing-players');
  leader = await leaderContext.newPage(); await h.openJoin(leader, 'Mei');
  await leader.getByRole('button', { name: 'Join', exact: true }).click();
  await h.shot('leader-carry-on', leader);
  for (const [width, height] of [[1920, 1080], [1280, 720]]) {
    assert.ok(width && height); await h.host.setViewportSize({ width, height }); await h.shot(`tv-waiting-before-carry-on-${String(width)}`);
  }
  await h.host.getByRole('button', { name: 'Carry on without them', exact: true }).focus();
  await h.host.keyboard.press('Enter');
  await h.shot('tv-keyboard-carry-on');
  await h.host.locator('.host-pause').waitFor({ state: 'detached' });
  await h.host.setViewportSize({ width: 1920, height: 1080 });
  await h.shot('tv-after-carry-on-1920');
  // Reconnect, then drop another player to exercise reduced-motion auto resume.
  second = await context.newPage(); await h.openJoin(second, 'Randy');
  await second.getByRole('button', { name: 'Join', exact: true }).click();
  // Original browser identity retakes its seat without a name choice.
  await third.close();
  await h.host.getByRole('heading', { name: 'Waiting for Cloud to rejoin', exact: true }).waitFor();
  await h.host.emulateMedia({ reducedMotion: 'reduce' });
  const cloud = await third.context().newPage(); await h.openJoin(cloud, 'Cloud');
  await cloud.getByRole('button', { name: 'Join', exact: true }).click();
  for (const number of ['3', '2', '1']) {
    const count = h.host.locator('.rejoin-countdown').filter({ hasText: number }); await count.waitFor();
    assert.equal(await count.evaluate(el => el.getAnimations().length), 0, 'reduced-motion number has no animation');
    await h.shot(`reduced-countdown-${number}`);
  }
  await h.host.locator('.host-pause').waitFor({ state: 'detached' });
  await h.host.keyboard.press('Escape');
  await h.host.locator('.host-pause').waitFor();
  await cloud.close();
  await h.host.getByRole('heading', { name: 'Waiting for Cloud to rejoin', exact: true }).waitFor();
  const cloudAgain = await cloud.context().newPage(); await h.openJoin(cloudAgain, 'Cloud');
  await cloudAgain.getByRole('button', { name: 'Join', exact: true }).click();
  await h.host.waitForTimeout(4000);
  assert.equal(await h.host.locator('.host-pause').count(), 1, 'chosen pause stays paused');
  await h.shot('chosen-pause-stays-paused');
}
