// RZ-003, RZ-005: real console, two paired phones, no injected game state.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
/** @param {HTMLElement[]} labels @returns {string[]} */
const longestFaults = labels => labels.length !== 4 ? [`${String(labels.length)} labels`] : [...(new Set(labels.map(label => getComputedStyle(label).fontSize)).size === 1 && new Set(labels.map(label => getComputedStyle(label).fontWeight)).size === 1 ? [] : ['mixed label sizes or weights']), ...labels.flatMap(label => {
  const style = getComputedStyle(label), n = label.textContent.length, box = label.getBoundingClientRect();
  const ok = n >= 38 && n <= 40 && ['21px', '34px'].includes(style.fontSize) && (style.fontSize !== '21px' || style.fontWeight === '700') && label.scrollWidth <= label.clientWidth + 1 && box.height <= 3 * parseFloat(style.lineHeight) + 1;
  return ok ? [] : [JSON.stringify({ text: label.textContent, n, size: style.fontSize, weight: style.fontWeight, scroll: label.scrollWidth, client: label.clientWidth, height: box.height, line: style.lineHeight })];
})];
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function phoneLayouts(h) {
  assert.ok(h.maxPhones >= 2, 'R-02 requires --phones 2');
  const phones = [await h.newPhone(), await h.newPhone()];
  const [leader, guest] = phones; assert.ok(leader && guest);
  // Read the shipped host bank as the test oracle; never send it to a phone.
  /** @type {{prompt:string, options:string[], answer:string}[]} */
  const bank = [];
  for (const file of await readdir('content/rabakz/src/questions')) {
    if (!file.endsWith('.json') || file === 'index.json') continue;
    /** @type {unknown} */
    const raw = JSON.parse(await readFile(`content/rabakz/src/questions/${file}`, 'utf8'));
    const data = /** @type {{ questions: {prompt:string, options:string[], answer:string}[] }} */ (raw);
    bank.push(...data.questions);
  }
  await h.createRoom();
  for (const [i, phone] of phones.entries()) {
    await phone.setViewportSize({ width: 844, height: 390 });
    await h.openJoin(phone, `Player ${String(i + 1)}`);
    await phone.getByRole('button', { name: 'Join', exact: true }).click();
    await h.waitSeated(phone, `Player ${String(i + 1)}`);
  }
  await leader.getByRole('button', { name: 'Pick a game', exact: true }).click();
  for (const target of ['peek-poker', 'rabakz']) {
    await leader.getByRole('button', { name: 'Next', exact: true }).click();
    await h.host.locator(`[data-game="${target}"][data-focused="true"]`).waitFor();
  }
  await leader.getByRole('button', { name: 'Select', exact: true }).click();
  await leader.getByRole('button', { name: 'Start', exact: true }).click();
  await h.host.locator('.rz-question').waitFor();
  /** @param {string} name */
  const capture = async name => {
    for (const [width, height] of [[667, 375], [844, 390]]) {
      assert.ok(width && height);
      for (const [i, phone] of phones.entries()) {
        assert.equal(await guest.getByRole('button', { name: 'Skip', exact: true }).count(), 0, 'Guest never sees Skip at a capture');
        assert.equal(await leader.getByRole('button', { name: 'Skip', exact: true }).count(), ['answering','locked-out','unlocked','locked-in','four-longest-options'].includes(name) ? 1 : 0, 'Leader Skip follows the question phase at every capture');
        await phone.setViewportSize({ width, height });
        await phone.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const failures = await phone.locator('.ka-layout-engine:not(.ka-layout-ghost) button').evaluateAll(buttons => buttons.flatMap(button => {
          const b = button.getBoundingClientRect();
          return b.width < 89 || b.height < 68 || b.left < 0 || b.top < 0 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1 ? [button.textContent] : [];
        }));
        assert.deepEqual(failures, [], 'In-play targets fit and meet 89 × 68 floors');
        const labelFaults = await phone.locator('.ka-layout-options button').evaluateAll(buttons => buttons.map(button => {
          const label = button.querySelector('span'); if (!label) return 'no label';
          const style = getComputedStyle(label), size = parseFloat(style.fontSize);
          const ok = [34, 21].includes(size) && label.scrollWidth <= label.clientWidth + 1 && label.getBoundingClientRect().height <= 3 * parseFloat(style.lineHeight) + 1;
          return ok ? '' : JSON.stringify({ text: label.textContent, size, scroll: label.scrollWidth, client: label.clientWidth, height: label.getBoundingClientRect().height, line: style.lineHeight, weight: style.fontWeight });
        }).filter(Boolean));
        if (labelFaults.length) await h.shot(`${name}-label-fault-${String(width)}`, phone);
        assert.deepEqual(labelFaults, [], `Option text uses 34 or 21 px and at most three lines (${name}, ${String(width)})`);
        assert.ok(await phone.locator('.ka-private-panel:not(.ka-private-ghost)').evaluateAll(panels => panels.every(panel => {
          const title = panel.querySelector('.ka-layout-title');
          if (!title) return true;
          const size = parseFloat(getComputedStyle(title).fontSize);
          return [...panel.querySelectorAll('.ka-layout-text, .ka-private-stat-value')].every(line => parseFloat(getComputedStyle(line).fontSize) <= size);
        })), 'Status is never smaller than following lines');
        if (name === 'four-longest-options') {
          // D-127: the group shares 34 px if every option fits, otherwise 21 px.
          // bold only at the 21 px step (round 13 scoped bold labels), regular at 34 px.
          assert.equal(await phone.getByRole('button', { name: 'Skip', exact: true }).count(), i === 0 ? 1 : 0);
          assert.ok(await phone.locator('[data-part="answer"] button > span').evaluateAll(labels => labels.length === 4 && new Set(labels.map(label => getComputedStyle(label).fontSize)).size === 1 && new Set(labels.map(label => getComputedStyle(label).fontWeight)).size === 1), 'Four longest options share one font size and weight');
          assert.deepEqual(await phone.locator('[data-part="answer"] button > span').evaluateAll(longestFaults), [], `Four longest options (${String(width)}, phone ${String(i + 1)})`);
        }
        await h.shot(`${name}-${String(width)}-phone${String(i + 1)}`, phone);
      }
      // Host time is deliberately held to retain this question phase.
      if (name !== 'four-longest-options') await h.shot(`${name}-${String(width)}-tv`, h.host, undefined, false);
    }
  };
  await h.host.clock.install();
  // Pause just ahead of the page's own clock: Node's Date can trail it, and pausing in the past throws.
  await h.host.clock.pauseAt(await h.host.evaluate(() => Date.now()) + 50);
  const prompt = (await h.host.locator('.rz-question').innerText()).trim();
  const q = bank.find(q => q.prompt === prompt); assert.ok(q, 'Visible question exists in shipped bank');
  const right = q.answer; assert.ok(right);
  const wrong = q.options.filter(text => text !== right); assert.ok(wrong[0] && wrong[1]);
  assert.equal(await guest.getByRole('button', { name: 'Skip', exact: true }).count(), 0);
  await capture('answering');
  // Console pause is distinct from holding the test clock above (C-15).
  for (const phone of phones) await phone.setViewportSize({width:667,height:375});
  await leader.getByRole('button',{name:'Menu',exact:true}).click();
  await h.host.clock.runFor(100);
  for (const [i,phone] of phones.entries()) {
    await phone.getByRole('dialog',{name:'Paused',exact:true}).waitFor();
    assert.equal(await phone.locator('.ka-private-panel:not(.ka-private-ghost)').isVisible(),true,'Strip remains beneath Paused veil');
    await h.shot(`console-paused-667-phone${String(i+1)}`,phone);
  }
  await leader.getByRole('button',{name:'Resume',exact:true}).click();
  await h.host.clock.runFor(100);
  for (const phone of phones) await phone.getByRole('dialog',{name:'Paused',exact:true}).waitFor({state:'hidden'});
  await leader.getByRole('button', { name: wrong[0], exact: true }).click();
  await h.host.clock.runFor(100);
  await leader.getByText('Locked out', { exact: true }).waitFor();
  await capture('locked-out');
  await guest.getByRole('button', { name: wrong[1], exact: true }).click();
  await h.host.clock.runFor(100);
  await leader.getByRole('button', { name: right, exact: true, disabled: false }).waitFor();
  await capture('unlocked');
  await leader.getByRole('button', { name: right, exact: true }).click();
  await h.host.clock.runFor(17);
  await leader.getByText('Locked in', { exact: true }).waitFor();
  await capture('locked-in');
  await h.host.clock.runFor(600);
  await leader.getByText('Right', { exact: true }).waitFor();
  await capture('right-reveal');
  await h.host.clock.runFor(4500);
  await h.host.locator('.rz-frame:not([data-reveal])').waitFor();
  await leader.getByRole('button', { name: 'Skip', exact: true }).click();
  await h.host.clock.runFor(600);
  await h.host.locator('.rz-frame[data-reveal]').waitFor();
  await capture('leader-skip-reveal');
  await h.host.clock.runFor(4500);
  for (let round = 3; round <= 5; round++) {
    await leader.getByRole('button',{name:'Skip',exact:true}).waitFor();
    await leader.getByRole('button',{name:'Skip',exact:true}).click();
    await h.host.clock.runFor(100);
    // Crossfade ghosts also carry the text for a moment; wait on the live private display.
    await leader.getByRole('region', { name: 'Private display' }).getByText('Skipped', { exact: true }).waitFor();
    await h.host.clock.runFor(4500);
    if (round === 5) {
      await leader.getByRole('button',{name:'Continue',exact:true}).waitFor();
      await capture('scoreboard-continue');
      await leader.getByRole('button',{name:'Continue',exact:true}).click();
      await h.host.clock.runFor(100);
    }
  }
  await h.host.clock.resume();
  // Separate deterministic presentation case: four 40-character labels, same game
  // views, shell and placement as the paired flow; no live match state is changed.
  const fixture = `/@fs${new URL('../../games/rabakz/dev/phone-long-options.html', import.meta.url).pathname}`;
  for (const [i, phone] of phones.entries()) {
    await phone.goto(`${h.origin}${fixture}?leader=${i === 0 ? '1' : '0'}`);
    await phone.waitForFunction(() => document.documentElement.dataset.rzReady === '1');
    await phone.locator('[data-part="answer"] button').first().waitFor();
    assert.equal(await phone.locator('[data-part="answer"] button').count(), 4);
    await phone.evaluate(() => document.fonts.ready);
  }
  await capture('four-longest-options');
  for (const phone of phones) assert.deepEqual(await phone.locator('[data-part="answer"] button > span').evaluateAll(longestFaults), [], 'Four longest options after capture');

  // Deterministic shipped-view stills supplement the paired gameplay flow.
  for (const state of ['scoreboard','over','waiting']) for (const [i,phone] of phones.entries()) {
    for (const [width,height] of [[667,375],[844,390]]) {
      assert.ok(width && height);
      await phone.setViewportSize({width,height});
      await phone.goto(`${h.origin}${fixture}?leader=${i === 0 ? '1' : '0'}&state=${state}`);
      await phone.waitForFunction(() => document.documentElement.dataset.rzReady === '1');
      await phone.getByText(state === 'waiting' ? 'You join at the next question' : '2nd · 700',{exact:true}).waitFor();
      assert.equal(await phone.getByRole('button',{name:'Continue',exact:true}).count(),state === 'scoreboard' && i === 0 ? 1 : 0);
      await h.shot(`${state}-${String(width)}-phone${String(i+1)}`,phone);
    }
  }

}
