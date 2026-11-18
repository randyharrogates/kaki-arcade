// REL-004 (automated Mac subset), REL-006 (supported routes). Integrator runs and reviews.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function browserMatrix(h) {
  h.coverage = 'REL-004 remains in progress. Automated Mac engines only: WebKit is not real Safari. Edge is not installed; real Safari, iPhone and Android await X-09 / K-07. TV browsers are not covered. REL-006 unsupported proof remains C-14.';
  assert.equal(h.maxPhones, 2, 'Run with --phones 2');
  // No slice-specific expected errors. The harness permits only the exact local favicon 404.
  /** @param {string} name */
  const shots = async name => {
    for (const page of [h.host, ...h.phones]) {
      assert.equal(await page.locator('#app main.unsupported').count(), 0);
      assert.equal(await page.locator('#unsupported-classic').isHidden(), true);
      await h.shot(name, page);
    }
    h.assertNoUnexpectedErrors();
  };
  await h.createRoom();
  // Fix game seeds after room creation; retain real cryptography for pairing.
  await h.host.evaluate(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => {
      if (array instanceof Uint32Array && array.length === 1) { array[0] = 42; return array; }
      return original(array);
    };
  });
  // Pre-join contexts let every recorded step include the TV and both phones.
  const first = await h.newPhone(); const second = await h.newPhone();
  await h.step('Supported pages and room created (REL-006)', async () => {
    await h.openJoin(first, 'Player 1'); await h.openJoin(second, 'Player 2');
    await shots('room');
  });
  for (const [i, page] of h.phones.entries()) await h.step(`Phone ${String(i + 1)} joins`, async () => {
    await page.getByRole('button', { name: 'Join', exact: true }).click();
    await h.waitSeated(page, `Player ${String(i + 1)}`);
    await shots(`join-${String(i + 1)}`);
  });
  await h.step('Two-player lobby', async () => { await shots('lobby'); });
  await h.step('Open picker', async () => {
    await first.getByRole('button', { name: 'Pick a game', exact: true }).click();
    await h.host.getByRole('main', { name: 'Game picker', exact: true }).waitFor();
    await shots('picker');
  });
  await h.step('Select and start Peek Poker', async () => {
    await first.getByRole('button', { name: 'Next', exact: true }).click();
    await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
    await first.getByRole('button', { name: 'Select', exact: true }).click();
    await h.host.locator('.game-setup-mirror [data-field]').first().waitFor();
    await first.locator('.phone-game-setup [data-field]').first().waitFor();
    await shots('peek-settings');
    await first.getByRole('button', { name: 'Start', exact: true }).click();
    await h.host.locator('.pp-table[data-phase="memorise"]').waitFor();
    await shots('peek-start');
  });
  await h.step('Peek Poker pick and reveal', async () => {
    await h.host.locator('.pp-table[data-phase="pick"]').waitFor({ timeout: 60000 });
    for (const page of h.phones) {
      await page.waitForFunction(() => document.querySelectorAll('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button.ka-layout-card-back').length === 16);
    }
    // The TV canvas flip has no DOM animation to await. Let its full token duration
    // elapse after observing pick, then cross a paint boundary before taking stills.
    await h.host.evaluate(async path => {
      /** @type {unknown} */
      const loaded = await import(path);
      const { duration } = /** @type {{ duration: { slow: number } }} */ (loaded);
      await new Promise(resolve => {
        const started = performance.now();
        const frame = () => {
          if (performance.now() - started >= duration.slow) requestAnimationFrame(() => { resolve(undefined); });
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    }, `/@fs${new URL('../../packages/ui/src/motion-tokens.ts', import.meta.url).pathname}`);
    assert.equal(await h.host.locator('.pp-table[data-phase="pick"]').count(), 1);
    await shots('peek-pick');
    for (const page of h.phones) {
      const grid = page.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button');
      await grid.nth(0).click(); await grid.nth(5).click();
      await page.getByRole('button', { name: 'Lock in', exact: true }).click();
    }
    await h.host.locator('.pp-table[data-phase="reveal"]').waitFor();
    await shots('peek-reveal');
  }, 90000);
  await h.step('Peek Poker scoreboard', async () => {
    await h.host.locator('.pp-table[data-phase="scoreboard"]').waitFor({ timeout: 30000 });
    await shots('peek-scoreboard');
  });
  await h.step('Menu pauses and Resume returns to play', async () => {
    await first.getByRole('button', { name: 'Menu', exact: true }).click();
    for (const page of [h.host, ...h.phones]) await page.getByRole('dialog', { name: 'Paused', exact: true }).waitFor();
    await shots('paused');
    await first.getByRole('button', { name: 'Resume', exact: true }).click();
    for (const page of [h.host, ...h.phones]) await page.getByRole('dialog', { name: 'Paused', exact: true }).waitFor({ state: 'hidden' });
    await shots('resumed');
  });
  await h.step('Quit to picker', async () => {
    await first.getByRole('button', { name: 'Menu', exact: true }).click();
    await first.getByRole('button', { name: 'Quit to picker', exact: true }).click();
    await h.host.getByRole('main', { name: 'Game picker', exact: true }).waitFor();
    await shots('quit-picker');
  });
  await h.step('Select and start Rabakz', async () => {
    await first.getByRole('button', { name: 'Next', exact: true }).click();
    await h.host.locator('[data-game="rabakz"][data-focused="true"]').waitFor();
    await first.getByRole('button', { name: 'Select', exact: true }).click();
    await h.host.locator('.game-setup-mirror [data-field]').first().waitFor();
    await first.locator('.phone-game-setup [data-field]').first().waitFor();
    await shots('rabakz-settings');
    await first.getByRole('button', { name: 'Start', exact: true }).click();
    await h.host.getByText('Question 1 of 10', { exact: true }).waitFor();
    await first.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="answer"] button').first().waitFor();
    await shots('rabakz-question-1');
  });
  await h.step('Rabakz wrong answer holds, then correct answer and reveal', async () => {
    // Independent shipped-bank oracle: locate both options by text, never by seed position.
    /** @type {{ prompt: string, options: string[], answer: string }[]} */
    const bank = [];
    for (const file of await readdir('content/rabakz/src/questions')) {
      if (!file.endsWith('.json') || file === 'index.json') continue;
      /** @type {unknown} */
      const raw = JSON.parse(await readFile(`content/rabakz/src/questions/${file}`, 'utf8'));
      const data = /** @type {{ questions: { prompt: string, options: string[], answer: string }[] }} */ (raw);
      bank.push(...data.questions);
    }
    const prompt = (await h.host.locator('.rz-question').innerText()).trim();
    const question = bank.find(q => q.prompt === prompt);
    assert.ok(question, 'Visible question exists in shipped bank');
    const wrong = question.options.find(option => option !== question.answer);
    assert.ok(wrong, 'Question has a wrong option');
    await second.getByRole('button', { name: wrong, exact: true }).click();
    await second.getByText('Locked out', { exact: true }).waitFor();
    await h.host.locator('.rz-seat').filter({ hasText: 'Player 2' }).getByLabel('Locked out', { exact: true }).waitFor();
    await h.host.locator('.rz-option[data-wrong="true"]').filter({ hasText: wrong }).waitFor();
    assert.equal(await h.host.locator('[data-reveal="true"]').count(), 0);
    await shots('rabakz-answered');
    await first.getByRole('button', { name: question.answer, exact: true }).click();
    await h.host.locator('[data-reveal="true"]').waitFor({ timeout: 45000 });
    await h.host.locator('.rz-seat').filter({ hasText: 'Player 1' }).getByText('100 pts', { exact: true }).waitFor();
    await first.getByText('Score 100', { exact: true }).waitFor();
    await first.getByText('Right', { exact: true }).waitFor();
    await second.getByText('Wrong', { exact: true }).waitFor();
    await shots('rabakz-reveal');
  });
  assert.deepEqual(h.errors.filter(e => e.kind === 'pageerror'), []);
  h.assertNoUnexpectedErrors();
}
