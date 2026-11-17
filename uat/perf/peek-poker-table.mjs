/** PP-003/004/008/021/030/031: host-only diagnostic. Integrator runs on a quiet machine. */
/** @type {import('../../tools/perf/browser.ts').Scenario} */
const scenario = {
  name:'peek-poker-table',
  hostPage:`/@fs${new URL('../../games/peek-poker/dev/index.html',import.meta.url).pathname}?players=8`,
  frameReason:'Repeated fixture transitions are diagnostic, not a real busiest 180-second round',
  inputReason:'Public fixtures have no controller-to-simulation apply point',
  feedbackReason:'Host-only scenario has no phone feedback',
  async run(h) {
    await h.host.waitForFunction(()=>document.documentElement.dataset.ppReady === '1');
    await h.host.evaluate(()=>document.fonts.ready);
    for(let repeat=0;repeat<5;repeat++) for(const phase of ['memorise','swap','picking','locked','reveal']) {
      await h.step(`Cycle ${String(repeat+1)}: ${phase}`,async()=>{
        await h.host.evaluate(name=>{(/** @type {{__ppState(phase:string,at?:number):void}} */ (/** @type {unknown} */ (window))).__ppState(name);},phase);
        await h.host.evaluate(async()=>{
          for(let frame=0;frame<130;frame++) await new Promise(resolve=>requestAnimationFrame(resolve));
        });
      });
    }
  },
};
export default scenario;
