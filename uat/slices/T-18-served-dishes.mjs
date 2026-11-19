import assert from 'node:assert/strict';
const demo=`/@fs${new URL('../../games/tabao-rush/dev/index.html',import.meta.url).pathname}`;
/** TR-040, TR-041: seven complete dishes, partial rice plate, held plate and serving counter. @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function servedDishes(h){
  for(const detail of ['full','half'])for(const [width,height] of /** @type {const} */ ([[1920,1080],[1280,720]]))for(const drink of ['kopi','teh'])await h.step(`${detail} ${drink} servings at ${String(width)}`,async()=>{
    await h.host.setViewportSize({width,height});
    await h.host.goto(`${h.origin}${demo}?players=1&detail=${detail}`);
    await h.host.waitForFunction(()=>document.documentElement.dataset.trReady==='1');
    await h.host.evaluate(name=>{(/** @type {{__trState(name:string):void}} */(/** @type {unknown} */(window))).__trState(name);},drink==='teh'?'served-dishes-teh':'served-dishes');
    await h.host.waitForTimeout(250);
    assert.equal(await h.host.locator('canvas').count(),1);
    assert.equal(await h.host.locator('[data-tr-pool-overflow]').getAttribute('data-tr-pool-overflow'),'0');
    await h.shot(`${detail}-${drink}-${String(width)}-served-dishes`);
    if(drink==='kopi'){
      await h.host.evaluate(()=>{(/** @type {{__trState(name:string):void}} */(/** @type {unknown} */(window))).__trState('held-dish');});
      await h.host.waitForTimeout(250);
      await h.shot(`${detail}-${String(width)}-held-dish`);
    }
  });
}
