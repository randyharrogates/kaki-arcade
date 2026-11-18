/** @type {import('../../tools/perf/browser.ts').Scenario} */
const scenario={
  name:'tabao-rush-screen',
  hostPage:`/@fs${new URL('../../games/tabao-rush/dev/index.html',import.meta.url).pathname}?perf=1&players=8`,
  frameReason:'Seeded scripted eight-cook simulation is diagnostic until a busiest-round capture is reviewed',
  inputReason:'Host-only scripted inputs have no phone transport latency',
  feedbackReason:'No phone feedback in this renderer scenario',
  async run(h){
    await h.host.waitForFunction(()=>document.documentElement.dataset.trReady==='1');
    await h.step('Eight cooks: real simulation',async()=>{
      // 1800 frames (30 s at 60 Hz) in six 300-frame calls: one call may not exceed the harness's 15 s evaluate limit.
      for(let chunk=0;chunk<6;chunk++)await h.host.evaluate(async()=>{for(let frame=0;frame<300;frame++)await new Promise(resolve=>requestAnimationFrame(resolve));});
    });
  },
};
export default scenario;
