// PLAT-008, RZ-014, PP-013. Integrator runs with --phones 3 (web 5250, signal 5251, UAT 5252).
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
/** @typedef {{round: number; phase: string; question: {id: string}; players: {id: string; team: number | null; score: number; waiting: boolean}[]}} JoinView */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function lateJoin(h) {
  assert.ok(h.maxPhones >= 3, 'C-17 needs --phones 3');
  // Observe public output only; this seam never reads private state or changes game rules.
  await h.host.route('**/src/session-adapter.ts', async route => {
    const response = await route.fetch(); const source = await response.text();
    assert.ok(source.includes('runner = next;'), 'Session observation seam still matches');
    await route.fulfill({ response, body: source.replace('runner = next;', `runner = next;
      Reflect.set(window, 'c17View', () => runner === next && next.state ? loaded.game.publicView(next.state) : null);`) });
  });
  await h.host.addInitScript(() => {
    if (location.pathname === '/host' && sessionStorage.getItem('c17-hold')) {
      const url = new URL(location.href); url.searchParams.set('fixture', 'console-e2e'); history.replaceState(null, '', url);
    }
  });
  await h.createRoom();
  const leader = await h.newPhone(), second = await h.newPhone(), late = await h.newPhone();
  const phones = [leader, second, late];
  const names = ['Fern', 'Moss', 'Cloud'];
  /** @param {number} index */
  async function join(index) {
    const page = phones[index]; assert.ok(page);
    await h.openJoin(page, names[index] ?? 'Player');
    await page.getByRole('button', { name: 'Join', exact: true }).click();
  }
  /** @param {string} label */
  async function shots(label) {
    await h.shot(`${label}-tv`);
    for (const [i, page] of phones.entries()) await h.shot(`${label}-phone${String(i + 1)}`, page);
  }
  /** @param {string} name */
  const click = async name => { await leader.getByRole('button', { name, exact: true }).click(); await leader.waitForTimeout(200); };
  /** @param {string} id */
  async function start(id, teams = false) {
    if (await leader.getByRole('button', { name: 'Pick a game', exact: true }).count()) await click('Pick a game');
    for (let i = 0; i < 3; i++) {
      if (await h.host.locator(`[data-game="${id}"][data-focused="true"]`).count()) break;
      await click('Next');
    }
    await h.host.locator(`[data-game="${id}"][data-focused="true"]`).waitFor();
    await click('Select');
    if (teams) await click('Teams');
    await click('Start');
    if (teams) {
      await h.host.getByRole('main', { name: 'Team setup', exact: true }).waitFor();
      await h.shot('13-team-setup-before-start');
      await click('Start');
    }
    await leader.locator('.ka-controller-shell').waitFor();
  }
  async function quit() {
    await click('Menu'); await click('Quit to picker');
    await h.host.getByRole('main', { name: 'Game picker', exact: true }).waitFor();
  }
  const view = () => h.host.evaluate(() => {
    /** @type {unknown} */
    const candidate = Reflect.get(window, 'c17View');
    const read = /** @type {() => JoinView} */ (candidate);
    return read();
  });
  // Scope clock artefacts to this signal origin and only the host room endpoint.
  const signalHostUrl = new RegExp('^' + h.signalOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/^http/, '(?:https?|wss?)') + '/rooms/[A-Z0-9]{8}/host$');
  // Phone data channels survive a dead host signalling socket, so this proves the session, not signalling;
  // signalling recovery is proven by Cloud's fresh join after both winds (the team step).
  async function connected() {
    for (const phone of phones) await phone.getByText('Connected', { exact: true }).waitFor();
  }
  await h.step('Two players seated; third phone has not joined', async () => {
    await join(0); await h.waitSeated(leader, 'Fern');
    await join(1); await h.waitSeated(second, 'Moss');
    await h.openJoin(late, 'Cloud'); await shots('01-two-seated');
  });
  await h.step('Rabakz running with two players', async () => { await start('rabakz'); await shots('02-rabakz-two'); });
  await h.step('Third phone seated with zero and safe next-question controls', async () => {
    const bankDir = new URL('../../content/rabakz/src/questions/', import.meta.url);
    const questionId = (await view()).question.id;
    let answer;
    for (const file of await readdir(bankDir)) {
      if (!file.endsWith('.json')) continue;
      /** @type {unknown} */
      const data = JSON.parse(await readFile(new URL(file, bankDir), 'utf8'));
      const bank = /** @type {{questions: {id: string; answer: string}[]}} */ (data);
      const question = bank.questions.find(q => q.id === questionId);
      if (question) answer = question.answer;
    }
    assert.ok(typeof answer === 'string', 'Current public question exists in the source bank');
    await click(answer);
    // A correct answer ends question 1 at once: join only once question 2 is open, so the newcomer waits for question 3.
    await h.host.getByText('Question 2 of 10', { exact: true }).waitFor();
    await join(2); await late.getByText('You join at the next question', { exact: true }).waitFor();
    assert.equal(await late.locator('.ka-controller-seat').innerText(), '3');
    const snapshot = await view();
    assert.equal(snapshot.players.find(p => p.id === 'seat-3')?.score, 0);
    assert.equal(snapshot.players.find(p => p.id === 'seat-3')?.waiting, true);
    await shots('03-rabakz-waiting');
  });
  await h.step('Rabakz next question enables third phone at zero', async () => {
    // Winding the page clock ahead of the signal server can trip the host socket's keepalive in fake time;
    // the host then reconnects, and its upgrade-status probe (browser.ts upgradeStatus) is a plain GET that gets 426.
    h.expectError(/^Failed to load resource: the server responded with a status of 426 \(Upgrade Required\)$/, 'host', signalHostUrl);
    h.expectError(/^net::ERR_ABORTED$/, 'host', signalHostUrl);
    await h.host.clock.install();
    try {
      const joinedAt = (await view()).round;
      for (let i = 0; i < 60 && (await view()).round === joinedAt; i++) await h.host.clock.runFor(1000);
    } finally { await h.host.clock.resume(); }
    await connected();
    await h.host.waitForFunction(() => {
      /** @type {unknown} */
    const candidate = Reflect.get(window, 'c17View');
    const read = /** @type {() => JoinView} */ (candidate);
      return read().players.some(p => p.id === 'seat-3' && !p.waiting);
    });
    await late.locator('.ka-layout-options').first().waitFor();
    const scores = (await view()).players;
    assert.equal(scores.find(p => p.id === 'seat-1')?.score, 100);
    assert.equal(scores.find(p => p.id === 'seat-3')?.score, 0);
    await shots('04-rabakz-entered');
    await quit(); await shots('05-rabakz-picker');
    await late.getByRole('button', { name: 'Leave', exact: true }).click();
  });
  await h.step('Peek Poker running with two players', async () => { await start('peek-poker'); await shots('06-poker-two'); });
  await h.step('Third phone seated with no private cards and next-round message', async () => {
    await join(2); await late.getByText('You join at the next round', { exact: true }).waitFor();
    assert.equal(await late.locator('.ka-controller-seat').innerText(), '3');
    assert.equal(await late.locator('.ka-layout-grid, .ka-private-panel').count(), 0);
    const snapshot = await view();
    assert.equal(snapshot.players.find(p => p.id === 'seat-3')?.score, 0);
    assert.equal(snapshot.players.find(p => p.id === 'seat-3')?.waiting, true);
    await shots('07-poker-waiting');
  });
  await h.step('Peek Poker next round enables the third player at zero', async () => {
    // Advance browser time through the normal simulation, without changing its state.
    // Winding the page clock ahead of the signal server can trip the host socket's keepalive in fake time;
    // the host then reconnects, and its upgrade-status probe (browser.ts upgradeStatus) is a plain GET that gets 426.
    h.expectError(/^Failed to load resource: the server responded with a status of 426 \(Upgrade Required\)$/, 'host', signalHostUrl);
    h.expectError(/^net::ERR_ABORTED$/, 'host', signalHostUrl);
    await h.host.clock.install();
    try {
      let capturedScores = false;
      for (let i = 0; i < 120 && (await view()).round === 1; i++) {
        await h.host.clock.runFor(1000);
        const current = await view();
        if (!capturedScores && current.round === 1 && current.phase === 'scoreboard') {
          // Normal timeout fills missing picks and awards the hand's points (at least 1).
          assert.ok((current.players.find(p => p.id === 'seat-1')?.score ?? 0) > 0);
          assert.equal(current.players.find(p => p.id === 'seat-3')?.score, 0);
          await shots('08-poker-round-one-scores');
          capturedScores = true;
        }
      }
      assert.ok(capturedScores, 'Round 1 earned scores captured before the next deal');
    } finally { await h.host.clock.resume(); }
    await connected();
    const snapshot = await view(); assert.equal(snapshot.round, 2);
    assert.ok((snapshot.players.find(p => p.id === 'seat-1')?.score ?? 0) > 0);
    assert.equal(snapshot.players.find(p => p.id === 'seat-3')?.waiting, false);
    assert.equal(snapshot.players.find(p => p.id === 'seat-3')?.score, 0);
    await late.getByText('You join at the next round', { exact: true }).waitFor({ state: 'hidden' });
    await shots('08-poker-entered'); await quit(); await shots('09-poker-picker');
  });
  await h.step('Rabakz teams hold Cloud until the picker', async () => {
    await late.getByRole('button', { name: 'Leave', exact: true }).click();
    await start('rabakz', true);
    assert.equal((await view()).players.length, 2);
    assert.ok((await view()).players.every(p => p.team === 0 || p.team === 1), 'TV public view has every player assigned to a team');
    await join(2);
    await late.getByRole('heading', { name: 'Waiting for the lobby', exact: true }).waitFor();
    assert.equal(await late.locator('.ka-controller-shell').count(), 0);
    await shots('13-team-held');
    await quit();
    await late.locator('.phone-badge').waitFor();
    assert.equal(await late.locator('.phone-badge').innerText(), '3');
    await h.host.getByText('3 of 8 players', { exact: true }).waitFor();
    await shots('14-team-admitted');
  });
  // All v1 games allow joining. Use the existing explicitly enabled development fixture
  // for the denied path, in a fresh room, reusing the same three isolated phone contexts.
  await h.host.goto(`${h.origin}/play`);
  await h.host.evaluate(() => { sessionStorage.clear(); sessionStorage.setItem('c17-hold', 'true'); });
  await h.createRoom();
  await h.step('Game with midGameJoin false holds the third phone', async () => {
    await join(0); await h.waitSeated(leader, 'Fern');
    await join(1); await h.waitSeated(second, 'Moss');
    await h.openJoin(late, 'Cloud'); await start('console-e2e'); await shots('10-denied-two');
    await join(2); await late.getByRole('heading', { name: 'Waiting for the lobby', exact: true }).waitFor();
    assert.ok((await h.phoneText(late)).includes('You can join when the current game ends.'));
    const leave = await late.getByRole('button', { name: 'Leave', exact: true }).last().evaluate(button => { const box = button.getBoundingClientRect(); return { right: box.right, width: innerWidth }; });
    assert.ok(leave.right <= leave.width, `Leave stays on screen (${String(leave.right)} of ${String(leave.width)} px)`);
    await shots('11-held');
  });
  await h.step('Returning to picker admits the held phone automatically', async () => {
    await quit(); await late.locator('.phone-badge').waitFor();
    // Quit returns to the picker, which has no seat list: the TV counts the admitted phone instead.
    await h.host.getByText('3 of 8 players', { exact: true }).waitFor();
    assert.equal(await late.locator('.phone-badge').innerText(), '3');
    await late.getByRole('heading', { name: 'Waiting for the lobby', exact: true }).waitFor({ state: 'hidden' });
    await shots('12-held-admitted');
  });
}
