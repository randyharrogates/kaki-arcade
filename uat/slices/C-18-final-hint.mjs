import assert from 'node:assert/strict';

/** PLAT-022, PLAT-024, PP-032, RZ-032: real eight-phone matches, accelerated only with the browser clock.
 * @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function finalHint(h) {
  assert.equal(h.maxPhones, 8, 'Run with --phones 8');
  let installed = false;
  /** @type {import('playwright').Page[]} */
  const phones = [];
  try {
    for (const match of ['peek-poker', 'rabakz-ffa', 'rabakz-teams', 'rabakz-teams-untied', 'rabakz-solo', 'rabakz-four']) {
      const game = match === 'peek-poker' ? match : 'rabakz';
      const teams = match.startsWith('rabakz-teams');
      const scoring = match === 'rabakz-teams-untied';
      const count = match === 'rabakz-solo' ? 1 : match === 'rabakz-four' ? 4 : 8;
      await h.host.goto(h.origin);
      await h.host.evaluate(() => { sessionStorage.removeItem('kaki.host-reconnect.v1'); });
      await h.createRoom();
      for (let i = 0; i < count; i++) {
        let phone = phones[i];
        if (!phone) { phone = await h.newPhone(); phones.push(phone); }
        else {
          await phone.goto(h.origin);
          await phone.evaluate(() => { sessionStorage.removeItem('kaki.phone-reconnect.v1'); });
        }
        await h.openJoin(phone, `Player ${String(i + 1)}`);
        await phone.getByRole('button', { name: 'Join', exact: true }).click();
        await h.waitSeated(phone, `Player ${String(i + 1)}`);
      }
      const leader = phones[0]; assert.ok(leader);
      await leader.getByRole('button', { name: 'Pick a game', exact: true }).click();
      for (let i = 0; i < 3 && !(await h.host.locator(`[data-game="${game}"][data-focused="true"]`).count()); i++) {
        const previous = await h.host.locator('[data-game][data-focused="true"]').getAttribute('data-game');
        await leader.getByRole('button', { name: 'Next', exact: true }).click();
        await h.host.waitForFunction(previous => document.querySelector('[data-game][data-focused="true"]')?.getAttribute('data-game') !== previous, previous);
      }
      await h.host.locator(`[data-game="${game}"][data-focused="true"]`).waitFor();
      await leader.getByRole('button', { name: 'Select', exact: true }).click();
      if (teams) await leader.getByRole('button', { name: 'Teams', exact: true }).click();
      // Read the shipped bank on the host, as in R-08, solely as an answer oracle.
      const answers = scoring ? await h.host.evaluate(async () => {
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
      }) : {};
      const answered = new Set();
      // Install the fake clock before Start, so the game's timers are created on it.
      if (!installed) { await h.host.clock.install(); installed = true; }
      await leader.getByRole('button', { name: 'Start', exact: true }).click();
      if (teams) {
        await h.host.getByRole('main', { name: 'Team setup', exact: true }).waitFor();
        await leader.getByRole('region', { name: 'Pick a side' }).waitFor();
        await leader.getByRole('button', { name: 'Start', exact: true }).click();
      }
      await h.host.locator(game === 'peek-poker' ? '.pp-table' : '.rz-question').waitFor();
      // Unanswered rounds use the games' normal timeout and automatic scoreboard continuation.
      await h.step(`${match}: run ${scoring ? 'scored' : 'unanswered'} rounds to the final screen`, async () => {
        // 100 ms steps, as P-07: one-second jumps left the round-1 reveal stuck at "1".
        for (let tick = 0; tick < 6000 && !(await h.host.locator('.game-final-hint').count()); tick++) {
          if (scoring && answered.size < 3) {
            const prompt = await h.host.locator('.rz-question h1').evaluateAll(nodes => nodes[0]?.textContent ?? null);
            const right = prompt ? answers[prompt] : undefined;
            if (prompt && right && !answered.has(prompt)) {
              // Give three different phones a win; seats 1 and 3 share a team.
              const phone = phones[answered.size]; assert.ok(phone);
              const button = phone.getByRole('button', { name: right, exact: true });
              if (await button.isVisible() && await button.isEnabled()) {
                await button.click();
                answered.add(prompt);
              }
            }
          }
          await h.host.clock.runFor(100);
        }
        if (!(await h.host.locator('.game-final-hint').count())) {
          await h.shot(`${match}-no-final-hint`);
          throw new Error(`${match}: no final hint after 600 s of game time; TV text: ${(await h.host.locator('body').innerText()).slice(0, 400)}`);
        }
      }, 420000);
      await h.host.clock.resume();
      await h.host.waitForTimeout(1000);
      const rows = game === 'peek-poker' ? '.pp-score-row' : '.rz-rank';
      assert.equal(await h.host.locator(rows).count(), game === 'rabakz' && !teams ? Math.max(0, count - 2) : count);
      if (scoring) {
        assert.equal(answered.size, 3, 'Three phones answered correctly');
        const totals = await h.host.locator('.rz-podium-player .rz-total').allTextContents();
        assert.equal(totals.length, 2);
        assert.notEqual(totals[0], totals[1], 'Team final scores differ');
        assert.ok(await h.host.locator('.rz-rank[data-leader]').count(), 'Scored final includes highlighted rows');
      }
      if (game === 'rabakz' && !teams) assert.equal(await h.host.locator('.rz-podium-player').count(), count === 1 ? 0 : 2);
      if (teams) assert.equal(await h.host.locator('.rz-group-label').count(), 2);
      if (teams) assert.ok(await h.host.locator('.rz-row-team').count() >= 8, 'Final players carry team marks');
      for (const keyboard of [false, true]) {
        if (keyboard) await h.host.keyboard.press('Shift');
        await h.host.getByText(keyboard ? 'Enter: Continue' : 'The leader continues on their phone', { exact: true }).waitFor();
        for (const width of (count < 8 || scoring ? [1920] : [1920, 1280, 3840])) {
          await h.step(`${match}: ${String(width)} ${keyboard ? 'keyboard' : 'phone'} band clearance`, async () => {
            await h.host.setViewportSize({ width, height: width * 1080 / 1920 });
            await h.host.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
            const geometry = await h.host.locator('.game-final-hint').evaluate((hint, rows) => {
              const box = hint.getBoundingClientRect();
              return { height: box.height, clear: [...document.querySelectorAll(rows)].every(n => n.getBoundingClientRect().bottom <= box.top + 0.5) };
            }, game === 'rabakz' ? `${rows},.rz-podium` : rows);
            // The board scale settles after the resize; poll for up to 1 s before judging.
            for (let tries = 0; tries < 20 && Math.abs(geometry.height - 34 * width / 1920) >= 0.5; tries++) {
              await h.host.waitForTimeout(50);
              Object.assign(geometry, await h.host.locator('.game-final-hint').evaluate((hint, rows) => {
                const box = hint.getBoundingClientRect();
                return { height: box.height, clear: [...document.querySelectorAll(rows)].every(n => n.getBoundingClientRect().bottom <= box.top + 0.5) };
              }, game === 'rabakz' ? `${rows},.rz-podium` : rows));
            }
            assert.ok(Math.abs(geometry.height - 34 * width / 1920) < 0.5, `Hint follows board scale at ${String(width)} (${keyboard ? 'keyboard' : 'phone'}): ${String(geometry.height)} px, expected ${String(34 * width / 1920)}`);
            assert.ok(geometry.clear, 'Final ranking clears the hand-off band');
            await h.shot(`${match}-${String(width)}-${keyboard ? 'keyboard' : 'phone'}`);
          });
        }
      }
    }
  } finally { for (const phone of phones) await phone.close(); }
}
