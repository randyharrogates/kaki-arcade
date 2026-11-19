// PP-004, PP-020, PP-031: real console, three phones, observed public snapshots.
import assert from 'node:assert/strict';
/** @typedef {{phase:string,shared:string[]|null,sharedCount:number,sharedFaceDown:boolean,grid:string[]|null,hands:unknown[]}} View */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function sharedCards(h) {
  assert.equal(h.maxPhones,3,'Use --phones 3');
  await h.host.setViewportSize({width:1920,height:1080});
  await h.host.route('**/src/session-adapter.ts',async route=>{
    const response=await route.fetch(),source=await response.text();
    const marker=/publicView\(view\)\s*\{/;
    assert.ok(marker.test(source),'Public observation seam matches');
    await route.fulfill({response,body:source.replace(marker,'publicView(view) { window.p12View = structuredClone(view);')});
  });
  await h.createRoom();
  /** @type {import('playwright').Page[]} */ const phones=[];
  for(let i=0;i<3;i++) {
    const phone=await h.newPhone();phones.push(phone);
    await h.openJoin(phone,`Player ${String(i+1)}`);
    await phone.getByRole('button',{name:'Join',exact:true}).click();
    await h.waitSeated(phone,`Player ${String(i+1)}`);
  }
  const leader=phones[0];assert.ok(leader);
  await leader.getByRole('button',{name:'Pick a game',exact:true}).click();
  await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
  await leader.getByRole('button',{name:'Next',exact:true}).click();
  await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
  await leader.getByRole('button',{name:'Select',exact:true}).click();
  await leader.getByRole('button',{name:'Start',exact:true}).click();
  await h.host.locator('.pp-table[data-phase="memorise"]').waitFor();
  await h.host.clock.install();
  /** @param {string} phase */
  const advance=async phase=>{
    // 10 ms steps over up to 30 s: memorise lasts 20 s, and the first still or strip frame lands
    // within 10 ms of the phase change, well inside the 377 ms flip.
    for(let i=0;i<3000;i++) {
      if(await h.host.locator(`.pp-table[data-phase="${phase}"]`).count()) return;
      await h.host.clock.runFor(10);
    }
    throw Error(`Did not reach ${phase}`);
  };
  for(const reduced of [false,true]) {
    await h.host.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
    await advance('memorise');
    await h.step(`${reduced?'Reduced':'Normal'} memorise keeps shared faces secret`,async()=>{
      assert.ok(await h.host.evaluate(()=>{
        /** @type {unknown} */ const raw=Reflect.get(window,'p12View');
        const v=/** @type {View} */ (raw);
        return v.phase==='memorise' && v.shared===null && v.sharedCount===3 && v.sharedFaceDown && v.hands.length===0;
      }));
      assert.equal(await h.host.locator('.pp-shared-cards [data-face-down="true"]').count(),3);
      assert.equal(await h.host.locator('.pp-shared-cards').innerText(),'');
      assert.equal(await h.host.locator('.pp-hands li').count(),0);
      for(const phone of phones) {
        await phone.bringToFront();
        await phone.waitForFunction(()=>document.getAnimations().every(animation=>animation.playState!=='running'));
      }
      for(const phone of phones) assert.equal(await phone.locator('.ka-layout-card-face').count(),0);
      if(reduced) for(const [index,phone] of phones.entries()) await h.shot(`round2-memorise-phone${String(index+1)}`,phone,undefined,false);
      await h.shot(reduced?'reduced-memorise':'memorise',h.host,undefined,false);
    });
    await advance('pick');
    if(!reduced) {
      // The harness caps strips at twelve frames: together these cover 0–390 ms.
      await h.frameStrip('grid-hide-shared-reveal',h.host,{frames:8,everyMs:0,checkFrame:async index=>{if(index) await h.host.clock.runFor(30);}});
      await h.frameStrip('grid-hide-shared-reveal-end',h.host,{frames:6,everyMs:0,checkFrame:async()=>{await h.host.clock.runFor(30);}});
    }
    if(!reduced) await h.host.clock.runFor(400);
    assert.ok(await h.host.evaluate(()=>{
        /** @type {unknown} */ const raw=Reflect.get(window,'p12View');
        const v=/** @type {View} */ (raw);return v.grid===null && v.shared?.length===3 && !v.sharedFaceDown;}));
    assert.equal(await h.host.locator('.pp-shared-cards [data-face-down="false"]').count(),3);
    await h.shot(reduced?'reduced-pick':'just-after-flip',h.host,undefined,false);
    await h.host.clock.runFor(1000);
    await h.shot(reduced?'reduced-pick-settled':'pick',h.host,undefined,false);
    if(!reduced) {await advance('reveal');await advance('scoreboard');await advance('memorise');}
  }
  await h.host.clock.resume();
}
