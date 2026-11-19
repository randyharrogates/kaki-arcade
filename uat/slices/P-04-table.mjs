import assert from 'node:assert/strict';
import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
const demo = `/@fs${new URL('../../games/peek-poker/dev/index.html', import.meta.url).pathname}`;
/** PP-003/004/008/021/030/031. Integrator runs and visually reviews every output. */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function table(h) {
  await h.host.setViewportSize({width:1920,height:1080});
  for (const players of [1,4,8]) {
    await h.host.goto(`${h.origin}${demo}?players=${String(players)}`);
    await h.host.waitForFunction(()=>document.documentElement.dataset.ppReady === '1');
    await h.host.evaluate(()=>document.fonts.ready);
    for (const phase of ['memorise','picking','locked','swap','reveal']) await h.step(`${String(players)} seats: ${phase}`,async()=>{
      await h.host.evaluate(name=>{(/** @type {{__ppState(phase:string,at?:number):void}} */ (/** @type {unknown} */ (window))).__ppState(name,2500);},phase);
      await h.host.locator(`[data-phase="${phase === 'picking' || phase === 'locked' ? 'pick' : phase}"]`).waitFor();
      assert.equal(await h.host.locator('.pp-player').count(),players);
      assert.equal(await h.host.locator('.pp-shared-cards [data-face-down="true"]').count(),phase === 'memorise' ? 3 : 0);
      // Seat marks share the canvas face transform; drawTable tests count their ink.
      assert.equal(await h.host.locator('.pp-hands li').count(),phase === 'reveal' ? players : 0);
      await h.shot(`${String(players)}-${phase}`);
    });
  }
  /** @type {[string,string,string,number[]][]} */
  const strips = [
    ['flip','memorise','picking',[0,150.380042,188.5,220,283,377]],
    ['swap','locked','swap',[0,400,800,1200,1600,2000]],
    ['reveal','locked','reveal',[0,94,188.5,226.619958,283,377]],
  ];
  for (const [name,from,to,times] of strips) {
    await h.host.evaluate(phase=>{(/** @type {{__ppState(phase:string,at?:number):void}} */ (/** @type {unknown} */ (window))).__ppState(phase,2500);},from);
    await h.host.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
    await h.frameStrip(name,h.host,{frames:times.length,everyMs:0,clip:{x:500,y:80,width:1365,height:945},checkFrame:async index=>{
      await h.host.evaluate(({phase,at})=>{(/** @type {{__ppState(phase:string,at?:number):void}} */ (/** @type {unknown} */ (window))).__ppState(phase,at);},{phase:to,at:times[index]});
      await h.host.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
    }});
  }
  await h.host.goto(`${h.origin}${demo}?players=8&swap=rows`);
  await h.host.waitForFunction(()=>document.documentElement.dataset.ppReady === '1');
  await h.frameStrip('round-4-row-swap',h.host,{frames:6,everyMs:0,clip:{x:500,y:80,width:1365,height:945},checkFrame:async index=>{
    await h.host.evaluate(at=>{(/** @type {{__ppState(phase:string,at?:number):void}} */ (/** @type {unknown} */ (window))).__ppState('swap',at);},index*400);
  }});
  await h.host.evaluate(()=>{(/** @type {{__ppState(phase:string,at?:number):void}} */ (/** @type {unknown} */ (window))).__ppState('picking',2500);});
  await h.host.evaluate(()=>{(/** @type {{__ppState(phase:string,at?:number):void}} */ (/** @type {unknown} */ (window))).__ppState('locked');});
  await h.frameStrip('lock-in-pulse',h.host,{frames:5,everyMs:94});
  await h.host.emulateMedia({reducedMotion:'reduce'});
  await h.host.goto(`${h.origin}${demo}?players=8`);
  await h.host.waitForFunction(()=>document.documentElement.dataset.ppReady === '1');
  for(const phase of ['memorise','swap','locked','reveal']) {
    await h.host.evaluate(name=>{(/** @type {{__ppState(phase:string,at?:number):void}} */ (/** @type {unknown} */ (window))).__ppState(name,0);},phase);
    await h.shot(`reduced-${phase}`);
  }
  await h.host.emulateMedia({reducedMotion:'no-preference'});
  await h.host.goto(`${h.origin}${demo}?players=8`);
  await h.host.waitForFunction(()=>document.documentElement.dataset.ppReady === '1');
  await h.host.evaluate(()=>{const w=/** @type {{__ppState(phase:string,at?:number):void}} */ (/** @type {unknown} */ (window));w.__ppState('locked',2500);w.__ppState('reveal',280);});
  const wipe=await h.shot('hands-wipe',h.host,{x:1250,y:80,width:615,height:945},false);
  await copyFile(join(h.evidence,wipe.file),join(h.evidence,'54-hands-wipe.jpg'));
}
