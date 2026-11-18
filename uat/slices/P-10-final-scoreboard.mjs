import assert from 'node:assert/strict';
/** PP-032: real one-phone match; clock control changes elapsed time only. */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function finalScoreboard(h) {
  assert.equal(h.maxPhones,1,'Use --phones 1');
  await h.host.setViewportSize({width:1920,height:1080});
  /** @param {string} name @param {import('playwright').Page} page */
  const still = async (name,page) => {
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
        // Use the runner's clock: the host's page timers are deliberately paused.
        await new Promise(resolve => setTimeout(resolve,20));
      }
    };
    let timer;
    try {
      await Promise.race([settled(),new Promise((_,reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error(`Still ${name}: finite animations did not settle within 3000 ms`));
        },3000);
      })]);
    } finally { clearTimeout(timer); }
    await h.shot(name,page,undefined,false);
  };
  await h.createRoom();
  const phone=await h.newPhone();
  try {
    await h.openJoin(phone,'Player 1');
    await phone.getByRole('button',{name:'Join',exact:true}).click();
    await h.waitSeated(phone,'Player 1');
    await phone.getByRole('button',{name:'Pick a game',exact:true}).click();
    await phone.getByRole('button',{name:'Next',exact:true}).click();
    await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
    await phone.getByRole('button',{name:'Select',exact:true}).click();
    await h.host.locator('[data-game="peek-poker"][data-expanded="true"]').waitFor();
    await phone.getByRole('button',{name:'Start',exact:true}).click();
    await h.host.locator('.pp-table[data-phase="memorise"]').waitFor();
    await h.host.clock.install();
    await h.host.clock.pauseAt(await h.host.evaluate(()=>new Date(Date.now()+50)));
    /** @param {string} phase */
    const advance=async phase=>{
      for(let tick=0;tick<1000;tick++) {
        if(await h.host.locator(`.pp-table[data-phase="${phase}"]`).count()) return;
        await h.host.clock.runFor(100);
      }
      throw Error(`Did not reach ${phase}`);
    };
    for(let round=1;round<=5;round++) {
      await advance('pick');
      const grid=phone.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button');
      await grid.nth(0).click();await h.host.clock.runFor(100);
      await grid.nth(8).click();await h.host.clock.runFor(100);
      await phone.locator('[data-target="grid:8"][data-state="selected"]').waitFor();
      await phone.getByRole('button',{name:'Lock in',exact:true}).click();
      await h.host.clock.runFor(100);
      await advance('scoreboard');
      await h.host.getByText(`Scores · round ${String(round)} of 5`,{exact:true}).waitFor();
      const expected=round===5?'Final scores in 5 seconds':'Next round in 5 seconds';
      await h.host.getByText(expected,{exact:true}).waitFor();
      await phone.getByText('Scores on the TV',{exact:true}).waitFor();
      assert.equal(await phone.getByText(/Next round in/).count(),0);
      if(round>=4) {
        await h.host.clock.runFor(600);
        await still(`r${String(round)}-scoreboard-tv`,h.host);
      }
      await advance(round===5?'over':'memorise');
    }
    await h.host.getByRole('list',{name:'Final podium',exact:true}).waitFor();
    assert.equal(await h.host.getByText(/(?:Next round|Final scores) in 5 seconds/).count(),0);
  } finally {
    await h.host.clock.resume();
    await phone.close();
  }
}
