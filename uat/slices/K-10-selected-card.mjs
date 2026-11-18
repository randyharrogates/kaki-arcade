// PP-005 D-218: real pairing and private picks; settled CSS-resolution stills.
import assert from 'node:assert/strict';

/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function selectedCard(h) {
  assert.equal(h.maxPhones,2,'Use --phones 2');
  const endpoint = new RegExp('^'+h.signalOrigin.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/^http/,'(?:https?|wss?)')+'/rooms/[A-Z0-9]{8}/host$');
  /** @type {import('playwright').Page[]} */
  const phones = [];
  await h.step('Room created and two phones seated through real pairing',async () => {
  h.expectError(/^Failed to load resource: the server responded with a status of 426 \(Upgrade Required\)$/, 'host', endpoint);
  h.expectError(/^net::ERR_ABORTED$/, 'host', endpoint);
  await h.createRoom();
  for (let i=0;i<2;i++) {
    const phone = await h.newPhone(); phones.push(phone);
    await phone.setViewportSize({width:667,height:375});
    const screenshot = phone.screenshot.bind(phone);
    phone.screenshot = options => screenshot({...options,scale:'css'});
    await h.openJoin(phone,`Player ${String(i+1)}`);
    await phone.getByRole('button',{name:'Join',exact:true}).click();
    await h.waitSeated(phone,`Player ${String(i+1)}`);
  }
  });
  const leader = phones[0], other = phones[1]; assert.ok(leader && other);
  await h.step('PP-005: start Peek Poker and reach the private pick phase',async () => {
    await leader.getByRole('button',{name:'Pick a game',exact:true}).click();
    await leader.getByRole('button',{name:'Next',exact:true}).click();
    await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
    await leader.getByRole('button',{name:'Select',exact:true}).click();
    await leader.getByRole('button',{name:'Start',exact:true}).click();
    await h.host.locator('.pp-table[data-phase="memorise"]').waitFor();
    await h.host.clock.install();
    await h.host.clock.pauseAt(await h.host.evaluate(() => new Date(Date.now()+50)));
    for(let i=0;i<250;i++) {
      if(await h.host.locator('.pp-table[data-phase="pick"]').count()) break;
      await h.host.clock.runFor(100);
    }
    await leader.locator('.ka-layout-engine:not(.ka-layout-ghost) .ka-layout-card-back').nth(15).waitFor();
  });
  /** The host is authoritative and its clock is paused (the pick timer must not run out mid-check): step it until the phone shows n picks. @param {number} n */
  const settlePicks = async n => {
    for (let i = 0; i < 100; i++) {
      if (await leader.locator('.ka-layout-engine:not(.ka-layout-ghost) .ka-layout-card-back[aria-pressed="true"]').count() === n) return;
      await h.host.clock.runFor(50); await leader.waitForTimeout(20);
    }
    assert.fail(`PP-005: phone did not show ${String(n)} selected`);
  };
  try {
    // Peek Poker phones play in landscape (D-164, P-07): the two common phone sizes turned sideways.
    for(const size of [{width:667,height:375},{width:844,height:390}]) {
      await leader.setViewportSize(size);
      // Start each size from no selection, so the clicks below select rather than toggle off.
      const pressed = leader.locator('.ka-layout-engine:not(.ka-layout-ghost) button.ka-layout-card-back[aria-pressed="true"]');
      while(await pressed.count()) { await pressed.first().click(); await h.host.clock.runFor(50); await leader.waitForTimeout(50); }
      for(const count of [1,2]) {
        await h.step(`PP-005: ${String(size.width)} × ${String(size.height)}, ${String(count)} selected`,async () => {
          const cards = leader.locator('.ka-layout-engine:not(.ka-layout-ghost) button.ka-layout-card-back');
          await cards.nth(count-1).click();
          await settlePicks(count);
          await leader.evaluate(async () => { await document.fonts.ready; await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))); });
          const states = await cards.evaluateAll(nodes => nodes.map(node => ({selected:node.getAttribute('aria-pressed')==='true',state:node.getAttribute('data-state'),disc:getComputedStyle(node,'::before').opacity,tick:getComputedStyle(node,'::after').opacity,discSize:getComputedStyle(node,'::before').width,tickSize:getComputedStyle(node,'::after').width,text:node.textContent,mask:getComputedStyle(node,'::after').maskImage})));
          assert.equal(states.length,16);
          assert.equal(states.filter(s=>s.selected).length,count);
          for(const s of states) {
            assert.equal(s.state,s.selected?'selected':'plain');
            assert.equal(s.disc,s.selected?'1':'0'); assert.equal(s.tick,s.disc);
            assert.equal(s.discSize,'34px'); assert.equal(s.tickSize,'21px');
            assert.ok(s.mask.includes('data:image/svg+xml')); assert.equal(s.text,'');
          }
          assert.equal(await other.locator('.ka-layout-card-back[aria-pressed="true"]').count(),0);
          await h.shot(`phone1-${String(size.width)}x${String(size.height)}-${String(count)}-selected`,leader,undefined,false);
        });
      }
      // Return to no picks through real inputs before the second viewport.
      const selected = leader.locator('.ka-layout-engine:not(.ka-layout-ghost) button.ka-layout-card-back[aria-pressed="true"]');
      for (let n = await selected.count(); n > 0; n--) { await selected.first().click(); await settlePicks(n - 1); }
    }
  } finally { await h.host.clock.resume(); }
}
