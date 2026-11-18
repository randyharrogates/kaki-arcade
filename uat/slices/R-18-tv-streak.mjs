// RZ-008: real console, one phone, three consecutive wins.
import assert from 'node:assert/strict';

/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function tvStreak(h) {
  assert.equal(h.maxPhones, 1, 'Use --phones 1');
  await h.createRoom();
  const phone = await h.newPhone();
  await h.openJoin(phone, 'WWWWWWWWWWWW');
  await phone.getByRole('button', { name: 'Join', exact: true }).click();
  await h.waitSeated(phone, 'WWWWWWWWWWWW');
  /** @param {string} name */
  const click = async name => phone.getByRole('button', { name, exact: true }).click();
  await click('Pick a game');
  for (const id of ['peek-poker', 'rabakz']) {
    await click('Next'); await h.host.locator(`[data-game="${id}"][data-focused="true"]`).waitFor();
  }
  await click('Select');
  await phone.getByRole('region', { name: 'Game settings' }).waitFor();
  // Independent oracle from shipped content on the host only, as in R-08.
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
  await h.host.clock.install();
  try {
    await click('Start');
    await h.host.locator('.rz-question').waitFor();
    await h.host.clock.pauseAt(await h.host.evaluate(() => Date.now()) + 50);
    for (let win = 1; win <= 3; win++) await h.step(`Win ${String(win)}: TV streak`, async () => {
      // During the crossfade the heading also holds the outgoing question in an aria-hidden .rz-old copy; read only the live text.
      const prompt = await h.host.locator('.rz-question').getByRole('heading', { level: 1 }).evaluate(el => {
        const live = /** @type {HTMLElement} */ (el.cloneNode(true));
        for (const old of live.querySelectorAll('.rz-old')) old.remove();
        return live.textContent.trim();
      });
      // The TV typesets headings (no-break spaces, soft hyphens); compare on normalised text.
      const plain = (/** @type {string} */ s) => s.replace(/\u00AD/g, '').replace(/\s+/g, ' ').trim();
      const right = Object.entries(answers).find(([p]) => plain(p) === plain(prompt))?.[1];
      assert.ok(right, `Shipped answer for ${JSON.stringify(prompt)}`);
      await click(right);
      for (let i = 0; i < 30 && !(await h.host.locator('.rz-frame[data-reveal="true"]').count()); i++) {
        await h.host.clock.runFor(100); await phone.waitForTimeout(30);
      }
      await h.host.locator('.rz-frame[data-reveal="true"]').waitFor();
      await h.host.clock.runFor(800);
      const expected = 'WWWWWWWWWWWW got it' + (win === 1 ? '' : ` · Streak ${String(win)}` + (win === 3 ? ' · +50 bonus' : ''));
      for (const [width, height] of win === 3 ? [[1920, 1080], [1280, 720]] : [[1920, 1080]]) {
        assert.ok(width && height);
        await h.host.setViewportSize({ width, height });
        // Advance resize listeners and settle existing reveal animations without expiring the reveal.
        await h.host.clock.runFor(100);
        await h.host.evaluate(async () => {
          await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined)));
        });
        assert.equal(await h.host.locator('.rz-outcome').innerText(), expected);
        assert.equal(await h.host.locator('.rz-frame').getAttribute('data-fit'), 'fits');
        assert.ok(await h.host.locator('.rz-outcome .rz-copy').first().evaluate(el => el.scrollWidth <= el.clientWidth));
        await h.shot(`win-${String(win)}-tv-${String(width)}`, h.host, undefined, false);
      }
      if (win < 3) {
        for (let i = 0; i < 60 && await h.host.locator('.rz-frame[data-reveal="true"]').count(); i++) await h.host.clock.runFor(100);
        await phone.getByRole('button', { name: 'Skip', exact: true }).waitFor();
      }
    });
  } finally { await h.host.clock.resume(); }
}
