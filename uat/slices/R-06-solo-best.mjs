// RZ-013, RZ-015, DATA-002. Run outside the sandbox; inspect every TV still.
import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function soloBest(h) {
  const phone = await h.newPhone();
  await phone.setViewportSize({ width: 844, height: 390 });
  // Install once before play. Reinstalling after accelerated match 1 resets wall
  // time backwards, making the real peer receive limiter drop phone input.
  await h.host.clock.install();
  await h.createRoom();
  await h.host.evaluate(() => {
    for (const key of Object.keys(localStorage)) if (key.startsWith('kaki.host-device.game.rabakz.')) localStorage.removeItem(key);
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => {
      if (array instanceof Uint32Array && array.length === 1) { array[0] = 42; return array; }
      return original(array);
    };
  });
  await h.openJoin(phone, 'Guest');
  await phone.getByRole('button', { name: 'Join', exact: true }).click();
  await h.waitSeated(phone, 'Guest');
  await phone.getByRole('button', { name: 'Pick a game', exact: true }).click();
  for (const id of ['peek-poker', 'rabakz']) {
    await phone.getByRole('button', { name: 'Next', exact: true }).click();
    await h.host.locator(`[data-game="${id}"][data-focused="true"]`).waitFor();
  }
  await phone.getByRole('button', { name: 'Select', exact: true }).click();
  await phone.getByRole('region', { name: 'Game settings' }).waitFor();
  /** @type {string[][]} */
  const shown = [];
  for (let match = 0; match < 4; match++) {
    await h.step(`Solo match ${String(match + 1)} with seed 42`, async () => {
      // Resolve an independent answer oracle from the shipped bank, before play.
      const answers = await h.host.evaluate(async () => {
        const path = '/@id/__x00__virtual:rabakz-bank';
        /** @type {unknown} */
        const loaded = await import(path);
        const bank = /** @type {{ default: { files: { text: string }[] } }} */ (loaded).default;
        return Object.fromEntries(bank.files.flatMap(file => {
          /** @type {unknown} */
          const raw = JSON.parse(file.text);
          const chunk = /** @type {{ questions?: { prompt: string, options: string[], correct: number }[] }} */ (raw);
          return (chunk.questions ?? []).map(q => [q.prompt, q.options[q.correct]]);
        }));
      });
      assert.ok(Object.keys(answers).length >= 20, 'Mixed defaults have enough unique prompts for two matches');
      await phone.getByRole('button', { name: 'Start', exact: true }).click();
      await h.host.locator('.rz-question').waitFor();
      if (match) await h.host.getByText(`Best ${match === 1 ? '100' : '200'}`, { exact: false }).first().waitFor();
      else assert.equal(await h.host.getByText(/Best \d/).count(), 0, 'First match has no Best line');
      await h.shot(`match-${String(match + 1)}-start-tv`);
      /** @param {() => Promise<boolean>} ready @param {string} description @param {number} [stepMs] */
      async function advanceUntil(ready, description, stepMs = 1000) {
        for (let elapsed = 0; elapsed < 40000; elapsed += stepMs) {
          if (await ready()) return;
          await h.host.clock.runFor(stepMs);
        }
        assert.fail(`Timed out waiting for ${description}`);
      }
      /** @type {string[]} */
      const prompts = [];
      // First match scores one correct answer; second scores two, then skips the rest.
      for (let round = 0; round < 10; round++) {
        // Skip exists on every question, so its presence alone cannot prove progress.
        // Wait for the numbered TV question and the phone's corresponding layout.
        await advanceUntil(async () =>
          await h.host.getByText(`Question ${String(round + 1)} of 10`, { exact: true }).count() > 0 &&
          await phone.getByRole('button', { name: 'Skip', exact: true }).count() > 0,
        `question ${String(round + 1)} in match ${String(match + 1)}`);
        const prompt = await h.host.locator('.rz-question h1 .rz-copy > div:not(.rz-old)').last().innerText();
        assert.ok(!prompts.includes(prompt), `Duplicate prompt at question ${String(round + 1)}: ${prompt}`); prompts.push(prompt);
        if (round < ([1, 2, 0, 2][match] ?? 0)) {
          const answer = answers[prompt]; assert.ok(answer, `Answer exists for ${prompt}`);
          await phone.getByRole('button', { name: answer, exact: false }).click();
        } else await phone.getByRole('button', { name: 'Skip', exact: true }).click();
        // Give the real phone transport time to deliver the tap, then observe the
        // host leave this question before attempting the next round.
        await advanceUntil(async () =>
          await phone.getByRole('button', { name: 'Skip', exact: true }).count() === 0 ||
          await h.host.getByText(`Question ${String(round + 1)} of 10`, { exact: true }).count() === 0,
        `answer acknowledgement for question ${String(round + 1)}`);
        if (match === 1 && round === 0) {
          await h.host.locator('[data-reveal="true"] .rz-play-best').filter({ hasText: 'Best 100' }).waitFor();
          await h.shot('match-2-reveal-best-tv');
        }
        if (round === 4) {
          await advanceUntil(async () => await phone.getByRole('button', { name: 'Continue', exact: true }).count() > 0, 'mid-match scoreboard');
          const next = phone.getByRole('button', { name: 'Continue', exact: true });
          await next.waitFor(); await next.click(); await h.host.clock.runFor(1000);
        }
      }
      await advanceUntil(async () => await h.host.locator('.rz-solo').count() > 0, 'solo results', 34);
      // Capture the settled entrance, delayed pulse peak, and return to rest.
      let settledPeak = false;
      let settledRest = false;
      if (match < 2) await h.frameStrip(`match-${String(match + 1)}-new-best-pulse`, h.host, {
        frames: 12, everyMs: 80, checkFrame: async () => {
          await h.host.clock.runFor(80);
          const sample = await h.host.locator('.rz-solo-best').evaluate(element => {
            const scale = new DOMMatrixReadOnly(getComputedStyle(element).transform).a;
            let opaque = true;
            for (let parent = /** @type {Element | null} */ (element); parent; parent = parent.parentElement) {
              if (Number(getComputedStyle(parent).opacity) < 1) opaque = false;
            }
            return { scale, opaque };
          });
          if (sample.opaque && sample.scale > 1.001) settledPeak = true;
          if (settledPeak && Math.abs(sample.scale - 1) < 0.001) settledRest = true;
        },
      });
      if (match < 2) {
        assert.ok(settledPeak, 'New best pulse scales above 1 after the entrance settles');
        assert.ok(settledRest, 'New best pulse returns to scale 1');
      }
      await h.host.clock.resume();
      const final = await h.host.locator('.rz-solo').innerText();
      if (match < 2) {
        await h.host.getByText(`New best · ${String((match + 1) * 100)}`, { exact: true }).waitFor();
      } else {
        assert.ok(final.includes('Best 200'));
        assert.ok(!final.includes('New best'), 'Unbeaten and tied finals do not claim a best');
        const best = await h.host.evaluate(() => {
          /** @type {unknown} */
          const raw = JSON.parse(localStorage.getItem('kaki.host-device.game.rabakz.progress-v1') ?? '{}');
          const record = /** @type {{ data: { bests: Record<string, number> } }} */ (raw);
          return record.data.bests['10'];
        });
        assert.equal(best, 200, 'Tie/unbeaten match does not change the saved best');
      }
      await h.shot(`match-${String(match + 1)}-end-tv`);
      shown.push(prompts);
      if (match < 3) {
        await phone.getByRole('button', { name: 'Continue', exact: true }).click();
        await phone.getByRole('button', { name: 'Back to game picker', exact: true }).click();
        await h.host.getByRole('main', { name: 'Game picker', exact: true }).waitFor();
        await phone.getByRole('button', { name: 'Select', exact: true }).click();
        await phone.getByRole('region', { name: 'Game settings' }).waitFor();
      }
    }, 240000);
  }
  assert.ok(shown[1]?.every(prompt => !shown[0]?.includes(prompt)), 'Same seed avoids the first match’s questions');
  // Seed a valid four-digit record through C-13 before navigating to the new room.
  await h.host.evaluate(async ({ platformPath, recordsPath }) => {
    /** @type {unknown} */
    const platform = await import(platformPath);
    const { createHostDeviceStore } = /** @type {typeof import('../../packages/platform/src/index')} */ (platform);
    /** @type {unknown} */
    const records = await import(recordsPath);
    const { validRecord } = /** @type {typeof import('../../games/rabakz/src/records')} */ (records);
    const result = createHostDeviceStore({ backend: () => localStorage }).open({ game: 'rabakz' }, 'progress-v1', { version: 1, validate: validRecord }).savePoint({ recent: [], bests: { '10': 1550, '50': 4000 } });
    if (!result.saved) throw new Error('Could not seed long best through C-13');
  }, { platformPath: `/@fs${new URL('../../packages/platform/src/index.ts', import.meta.url).pathname}`, recordsPath: `/@fs${new URL('../../games/rabakz/src/records.ts', import.meta.url).pathname}` });
  await h.host.goto(h.origin);
  await h.host.evaluate(() => { sessionStorage.removeItem('kaki.host-reconnect.v1'); });
  await phone.goto(h.origin);
  await phone.evaluate(() => { sessionStorage.removeItem('kaki.phone-reconnect.v1'); });
  await h.createRoom();
  await h.openJoin(phone, 'Guest');
  await phone.getByRole('button', { name: 'Join', exact: true }).click();
  await h.waitSeated(phone, 'Guest');
  await phone.getByRole('button', { name: 'Pick a game', exact: true }).click();
  for (const id of ['peek-poker', 'rabakz']) {
    await phone.getByRole('button', { name: 'Next', exact: true }).click();
    await h.host.locator(`[data-game="${id}"][data-focused="true"]`).waitFor();
  }
  await phone.getByRole('button', { name: 'Select', exact: true }).click();
  await phone.getByRole('region', { name: 'Game settings' }).waitFor();
  await phone.getByRole('button', { name: 'Start', exact: true }).click();
  await h.host.getByText('Best 1550', { exact: false }).first().waitFor();
  const fit = await h.host.locator('.rz-play-best').first().evaluate(element => {
    // Count lines by height: inline icons (the thinking dots) sit at a different top on the same line.
    const style = getComputedStyle(element);
    const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    return { fontSize: parseFloat(style.fontSize), lines: Math.round(element.getBoundingClientRect().height / line), height: element.getBoundingClientRect().height, line, overflow: element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight };
  });
  assert.equal(fit.lines, 1, `Four-digit best and status stay on one line (${JSON.stringify(fit)})`);
  assert.equal(fit.overflow, false);
  assert.ok(fit.fontSize >= 34, 'Four-digit best respects the TV type floor');
  await h.shot('long-best-status-tv');
  const second = await h.newPhone();
  await h.openJoin(second, 'Friend');
  await second.getByRole('button', { name: 'Join', exact: true }).click();
  // The console holds a mid-match joiner until the game ends (RZ-014 in the console is a logged gap),
  // so record that screen, quit to the picker, seat Friend there and start a two-player match.
  await second.getByRole('heading', { name: 'Waiting for the lobby' }).waitFor();
  await h.shot('friend-waits-for-lobby-phone', second);
  await h.host.keyboard.press('Escape');
  await h.host.getByRole('button', { name: 'Quit to picker', exact: true }).click();
  await h.host.getByRole('main', { name: 'Game picker', exact: true }).waitFor();
  // A held phone is not yet let in when the TV returns to the picker (C-17), so Friend scans again,
  // as a player would.
  await h.openJoin(second, 'Friend');
  await second.getByRole('button', { name: 'Join', exact: true }).click();
  // Joining while the picker is open shows "<leader> is choosing", not "You're in". Today the phone's
  // held mid-match seat still counts, so it is seated again as "Friend 2" (C-17 follow-up: one phone, one seat).
  try {
    await second.getByRole('heading', { name: /is choosing/ }).waitFor({ timeout: 45000 });
    // The picker shows no seat list; Friend's seat is proved below when Friend appears in the match.
  } catch (error) {
    await h.shot('fault-friend-after-rescan-phone', second, undefined, false);
    await h.shot('fault-friend-after-rescan-tv');
    throw error;
  }
  await phone.getByRole('button', { name: 'Select', exact: true }).click();
  await phone.getByRole('region', { name: 'Game settings' }).waitFor();
  await phone.getByRole('button', { name: 'Start', exact: true }).click();
  // Until C-17, the rescanned phone has a second seat ("Friend 2") beside its held "Friend" seat.
  const friend = h.host.locator('.rz-seat-name').filter({ hasText: 'Friend' }).first();
  for (let i = 0; i < 60 && !(await friend.count()); i++) await h.host.clock.runFor(500);
  await friend.waitFor();
  await h.host.clock.runFor(1000);
  assert.equal(await h.host.getByText(/(?:Best \d|New best)/).count(), 0, 'Two players show no best anywhere');
  await h.shot('two-player-no-best-tv');
  await h.host.keyboard.press('Escape');
  await h.host.getByRole('button', { name: 'Quit to picker', exact: true }).click();
  await h.host.getByRole('main', { name: 'Game picker', exact: true }).waitFor();
  await phone.getByRole('button', { name: 'Select', exact: true }).click();
  await phone.getByRole('region', { name: 'Game settings' }).waitFor();
  await phone.getByRole('button', { name: 'Start', exact: true }).click();
  await h.host.locator('.rz-question').waitFor();
  assert.equal(await h.host.getByText(/(?:Best \d|New best)/).count(), 0);
  await h.shot('two-player-start-no-best-tv');
  for (let second = 0; second < 500 && await h.host.locator('.rz-results[data-final="true"]').count() === 0; second++) {
    await h.host.clock.runFor(1000);
    assert.equal(await h.host.getByText(/(?:Best \d|New best)/).count(), 0, 'No Best in any multiplayer phase');
  }
  await h.host.locator('.rz-results[data-final="true"]').waitFor();
  await h.shot('two-player-final-no-best-tv');
}
