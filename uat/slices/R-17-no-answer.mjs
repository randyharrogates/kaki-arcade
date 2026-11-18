// RZ-005, RZ-007: solo skip and idle timeout through real paired phone input.
import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function noAnswer(h) {
  const phone = await h.newPhone();
  await phone.setViewportSize({ width: 844, height: 390 });
  // Install once before Start so the session's simulation uses the fake clock.
  await h.host.clock.install();
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
  await h.host.locator('.rz-question').waitFor();
  const live = phone.locator('.ka-private-panel:not(.ka-private-ghost)');
  /** @param {() => Promise<boolean>} ready @param {string} description */
  async function advanceUntil(ready, description) {
    for (let elapsed = 0; elapsed < 40000; elapsed += 100) {
      if (await ready()) return;
      await h.host.clock.runFor(100);
    }
    assert.fail(`Timed out waiting for ${description}`);
  }
  /** @param {string} title @param {string} name */
  async function revealStill(title, name) {
    await advanceUntil(async () => await live.getByText(title, { exact: true }).count() > 0, title);
    // Let phone crossfades finish in real time; keep the host within its reveal.
    await phone.waitForTimeout(1000);
    await live.getByText(title, { exact: true }).waitFor();
    assert.ok((await live.innerText()).includes('+0'), 'No answer or skip gains zero points');
    assert.equal(await phone.locator('.ka-private-ghost').count(), 0, 'Phone reveal has settled');
    await h.shot(name, phone);
  }
  await h.step('Solo skip shows Skipped', async () => {
    await phone.getByRole('button', { name: 'Skip', exact: true }).click();
    await revealStill('Skipped', '01-skipped-phone');
  });
  await h.step('Next question times out and shows No answer', async () => {
    await advanceUntil(async () =>
      await h.host.getByText('Question 2 of 10', { exact: true }).count() > 0 &&
      await phone.getByRole('button', { name: 'Skip', exact: true }).count() > 0,
    'second question');
    // No answer or Skip input: advance the installed clock to the idle reveal.
    await revealStill('No answer', '02-no-answer-phone');
    assert.equal(await live.getByText('Skipped', { exact: true }).count(), 0);
  }, 60000);
}
