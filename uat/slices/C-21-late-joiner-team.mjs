// RZ-014, PLAT-008, PLAT-025: D-234 team assignment and next-question participation.
import assert from 'node:assert/strict';

/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function lateTeam(h) {
  assert.equal(h.maxPhones, 4, 'Use --phones 4');
  await h.host.route('**/src/session-adapter.ts', async route => {
    const response = await route.fetch(), source = await response.text();
    assert.ok(source.includes('runner = next;'));
    await route.fulfill({ response, body: source.replace('runner = next;', `runner = next;
      Reflect.set(window, 'c21Public', () => runner === next && next.state ? loaded.game.publicView(next.state) : null);`) });
  });
  /** @typedef {ReturnType<typeof import('../../games/rabakz/src/rules/views').publicView>} Public */
  const view = () => h.host.evaluate(() => {
    /** @type {unknown} */
    const candidate = Reflect.get(window, 'c21Public');
    const read = /** @type {() => Public} */ (candidate);
    return read();
  });
  await h.createRoom();
  const phones = [];
  for (const name of ['Fern', 'Moss', 'Reed']) {
    const phone = await h.newPhone(); phones.push(phone);
    await h.openJoin(phone, name); await phone.getByRole('button', { name: 'Join', exact: true }).click();
    await h.waitSeated(phone, name);
  }
  const leader = phones[0] ?? (() => { throw new Error('Missing leader'); })();
  /** @param {string} label */
  const click = label => leader.getByRole('button', { name: label, exact: true }).click();
  await click('Pick a game');
  for (const id of ['peek-poker', 'rabakz']) {
    await click('Next'); await h.host.locator(`[data-game="${id}"][data-focused="true"]`).waitFor();
  }
  await click('Select'); await leader.getByRole('region', { name: 'Game settings' }).waitFor();
  await click('Teams');
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
  await h.host.clock.install(); await click('Start');
  await leader.getByRole('region', { name: 'Pick a side' }).waitFor(); await click('Start');
  await h.host.locator('.rz-question').waitFor();
  await h.host.clock.pauseAt(await h.host.evaluate(() => Date.now()) + 50);
  /** @param {() => Promise<boolean>} ready */
  async function until(ready) {
    for (let i = 0; i < 90; i++) {
      if (await ready()) return;
      await h.host.clock.runFor(100); await leader.waitForTimeout(30);
    }
    assert.fail('Timed out waiting for Rabakz');
  }
  /** @param {string} name @param {import('playwright').Page} [page] */
  async function shot(name, page = h.host) {
    let expired = false;
    const settled = async () => {
      let quiet = 0;
      while (quiet < 2 && !expired) {
        const count = await page.evaluate(async () => {
          const running = document.getAnimations().filter(a =>
            (a.playState === 'running' || a.pending) && a.effect?.getComputedTiming().iterations !== Infinity);
          await Promise.all(running.map(a => a.finished.catch(() => undefined)));
          return running.length;
        });
        quiet = count === 0 ? quiet + 1 : 0;
        // Runner time: host page timers are deliberately paused.
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    };
    let timer;
    try {
      await Promise.race([settled(), new Promise((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error(`Still ${name}: finite animations did not settle within 3000 ms`));
        }, 3000);
      })]);
    } finally { clearTimeout(timer); }
    await h.shot(name, page, undefined, false);
  }
  const before = await view();
  const red = before.players.filter(p => p.team === 0).length;
  const blue = before.players.filter(p => p.team === 1).length;
  assert.notEqual(red, blue);
  const team = red < blue ? 0 : 1;
  const newcomer = await h.newPhone();
  await h.openJoin(newcomer, 'Newcomer'); await newcomer.getByRole('button', { name: 'Join', exact: true }).click();
  await until(async () => (await view()).players.some(p => p.name === 'Newcomer'));
  const joined = (await view()).players.find(p => p.name === 'Newcomer'); assert.ok(joined);
  assert.equal(joined.team, team); assert.equal(joined.score, 0); assert.equal(joined.waiting, true);
  await newcomer.getByText(`You're on ${team === 0 ? 'Red' : 'Blue'} team`, { exact: true }).waitFor();
  await shot('joined-tv'); await shot('joined-phone', newcomer);
  await click('Skip');
  await until(async () => (await view()).round === 2 && (await view()).phase === 'question');
  const current = await view(); assert.ok(current.question);
  const right = answers[current.question.prompt]; assert.ok(right);
  await newcomer.getByRole('button', { name: right, exact: true }).click();
  await newcomer.getByText('Locked in', { exact: true }).waitFor();
  await shot('next-question-answer-phone', newcomer); await shot('next-question-answer-tv');
  await until(async () => (await view()).phase === 'reveal');
  const revealed = await view();
  assert.equal(revealed.players.find(p => p.name === 'Newcomer')?.score, 100);
  assert.equal(revealed.teamScores[team], (before.teamScores[team] ?? 0) + 100);
  await shot('team-total-reveal-tv'); await shot('team-total-reveal-phone', newcomer);
  for (const round of [3, 4, 5]) {
    await until(async () => { const current = await view(); return current.round === round && current.phase === 'question'; });
    await click('Skip');
  }
  await until(async () => (await view()).phase === 'scoreboard');
  assert.equal((await view()).teamScores[team], 100);
  assert.equal(await h.host.locator('.rz-team-panel').count(), 2);
  await shot('team-total-scoreboard-tv'); await shot('team-total-scoreboard-phone', newcomer);
  await h.host.clock.resume();
}
