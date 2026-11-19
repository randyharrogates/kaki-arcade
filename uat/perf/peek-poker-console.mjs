import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { actionTiming } from '../../tools/perf/action-timing.js';
/** PERF-001/010/012, PP-031: full real-console match, shared browser harness. */
/** @type {import('../../tools/perf/browser.ts').Scenario} */
const scenario = {
  name: 'peek-poker-console',
  busiestRound: true,
  async run(h, capture) {
    /** @type {import('playwright').Page[]} */
    const phones = [];
    for (let i = 0; i < h.maxPhones; i++) {
      const phone = await h.newPhone(); phones.push(phone);
      await phone.setViewportSize({ width: 844, height: 390 });
      const name = `Player ${String(i + 1)}`;
      await h.openJoin(phone, name);
      await phone.getByRole('button', { name: 'Join', exact: true }).click();
      await h.waitSeated(phone, name);
    }
    const leader = phones[0]; if (!leader) throw Error('At least one phone is required');
    const press = await actionTiming(h, capture, phones);
    try {
    await h.step('Picker → start Peek Poker', async () => {
      await leader.getByRole('button', { name: 'Pick a game', exact: true }).click();
      await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
      await leader.getByRole('button', { name: 'Next', exact: true }).click();
      await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
      await leader.getByRole('button', { name: 'Select', exact: true }).click();
      // Integrator decision: the whole five-round match is the measured round.
      await leader.getByRole('button', { name: 'Start', exact: true }).click();
      await h.host.locator('.pp-table[data-phase="memorise"]').waitFor();
      await capture.roundStart();
    });
    for (let round = 1; round <= 5; round++) {
      await h.step(`Round ${String(round)} memorise → pick`, async () => {
        await h.host.getByText(`Round ${String(round)} of 5`, { exact: true }).waitFor();
        // Observe each phone leaving the previous round before accepting its next grid.
        // The private Seconds block distinguishes memorise from swap's Watch the TV.
        for (const phone of phones) {
          await phone.locator('.ka-layout-engine:not(.ka-layout-ghost)').getByText('Watch the TV', { exact: true }).waitFor();
          await phone.getByText('Seconds', { exact: true }).waitFor();
        }
        await h.host.locator('.pp-table[data-phase="pick"]').waitFor({ timeout: 90000 });
      }, 100000);
      await h.step('All phones pick and lock in → reveal', async () => {
        const pickStart = performance.now();
        for (const [index, phone] of phones.entries()) {
          await h.host.getByText(`Round ${String(round)} of 5`, { exact: true }).waitFor();
          const cards = phone.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button');
          await cards.nth(15).waitFor();
          await phone.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button[aria-pressed="true"]').first().waitFor({ state: 'hidden' });
          // Four real presses per phone/round = 160 grid observations at eight phones.
          for (const [cell, selected] of /** @type {[number, boolean][]} */ ([[0, true], [0, false], [0, true], [1, true]])) {
            const target = cards.nth(cell);
            if (press) await press(phone, target, `seat-${String(index + 1)}`, 'grid', cell);
            else await target.click();
            await target.locator(`xpath=self::*[@aria-pressed="${String(selected)}"]`).waitFor();
          }
        }
        // Retain 15 seconds of each legal 20-second pick window; do not alter timers.
        await h.host.waitForTimeout(Math.max(0, 15000 - (performance.now() - pickStart)));
        for (const phone of phones) {
          const lock = phone.getByRole('button', { name: 'Lock in', exact: true });
          // Bound the click to this pick window; never let Playwright retry in a later round.
          await lock.click({ timeout: 2000 });
          // The final lock can immediately reveal, replacing Locked in with the own hand.
          await phone.locator('.ka-layout-engine:not(.ka-layout-ghost)').getByText('Locked in', { exact: true })
            .or(phone.locator('.ka-layout-engine:not(.ka-layout-ghost) .ka-private-block:not(.ka-private-ghost)').getByText('Points', { exact: true })).first().waitFor({ timeout: 2000 });
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
      await capture.roundEnd();
    },90000);
    } finally {
      if (press) await writeFile(join(h.evidence, 'actions.json'), JSON.stringify(await h.host.evaluate(() => window.__perfAcceptedActions ?? []), null, 2) + '\n');
    }
    // Harness retains phones for direct-path statistics and cleanup.
  },
};
export default scenario;
