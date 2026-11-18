/** PP-030/031, PLAT-033: real console round, measured by the shared browser harness. */
/** @type {import('../../tools/perf/browser.ts').Scenario} */
const scenario = {
  name: 'peek-poker-console',
  frameReason: 'A full console match including scoreboard and podium is diagnostic, not a busiest 180-second round',
  inputReason: 'Controller inputs are exercised without instrumented apply timestamps',
  feedbackReason: 'Controller feedback is not instrumented in this table diagnostic',
  async run(h) {
    /** @type {import('playwright').Page[]} */
    const phones = [];
    try {
      for (let i = 0; i < h.maxPhones; i++) {
        const phone = await h.newPhone(); phones.push(phone);
        await phone.setViewportSize({ width: 844, height: 390 });
        const name = `Player ${String(i + 1)}`;
        await h.openJoin(phone, name);
        await phone.getByRole('button', { name: 'Join', exact: true }).click();
        await h.waitSeated(phone, name);
      }
      const leader = phones[0]; if (!leader) throw Error('At least one phone is required');
      await h.step('Picker → start Peek Poker', async () => {
        await leader.getByRole('button', { name: 'Pick a game', exact: true }).click();
        await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
        await leader.getByRole('button', { name: 'Next', exact: true }).click();
        await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
        await leader.getByRole('button', { name: 'Select', exact: true }).click();
        await leader.getByRole('button', { name: 'Start', exact: true }).click();
        await h.host.locator('.pp-table[data-phase="memorise"]').waitFor();
      });
      for(let round=1;round<=5;round++) {
      await h.step('Memorise → pick', async () => {
        await h.host.locator('.pp-table[data-phase="pick"]').waitFor({ timeout: 90000 });
      }, 100000);
      await h.step('All phones pick and lock in → reveal', async () => {
        for (const phone of phones) {
          const cards = phone.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button');
          await cards.nth(0).click();
          await phone.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button[aria-pressed="true"]').nth(0).waitFor();
          await cards.nth(1).click();
          await phone.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button[aria-pressed="true"]').nth(1).waitFor();
          await phone.getByRole('button', { name: 'Lock in', exact: true }).click();
        }
        await h.host.locator('.pp-table[data-phase="reveal"]').waitFor({ timeout: 60000 });
        await h.host.evaluate(async () => {
          for (let frame = 0; frame < 130; frame++) await new Promise(resolve => requestAnimationFrame(resolve));
        });
      }, 90000);
      await h.step(`Round ${String(round)} scoreboard`, async () => {
        await h.host.locator('.pp-table[data-phase="scoreboard"]').waitFor({timeout:60000});
        await h.host.evaluate(async()=>{for(let frame=0;frame<60;frame++) await new Promise(resolve=>requestAnimationFrame(resolve));});
      },90000);
      }
      await h.step('Final podium (over)', async () => {
        await h.host.locator('.pp-table[data-phase="over"]').waitFor({timeout:60000});
        await h.host.evaluate(async()=>{for(let frame=0;frame<130;frame++) await new Promise(resolve=>requestAnimationFrame(resolve));});
      },90000);
    } finally { for (const phone of phones) await phone.close(); }
  },
};
export default scenario;
