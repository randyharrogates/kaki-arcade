/** @type {import('../../tools/perf/browser.ts').Scenario} */
const scenario={
  name:'tabao-rush-tutorial',
  hostPage:`/@fs${new URL('../../games/tabao-rush/dev/index.html',import.meta.url).pathname}?perf=1&players=8&tutorial=1`,
  frameReason:'TR-055 diagnostic: eight scripted cooks, 600 tutorial ticks then leader skip; captures tutorial-to-round texture hand-off and at least 600 frames / 10 seconds of play, not a busiest full round',
  inputReason:'Host-only scripted inputs and leader skip; no phone transport latency',
  feedbackReason:'No phone feedback in this tutorial renderer scenario',
  async run(h,capture){
    await h.host.waitForFunction(()=>document.documentElement.dataset.trReady==='1');
    if(await h.host.evaluate(()=>document.documentElement.dataset.trPhase)!=='tutorial')throw new Error('Expected tutorial before capture');
    await capture.roundStart();
    await h.host.evaluate(()=>{
      const fixture=/** @type {Window & {__trRun?:()=>void}} */(window);
      if(!fixture.__trRun)throw new Error('Missing renderer start hook');
      fixture.__trRun();
    });
    await h.step('Tutorial, leader skip and real-round texture hand-off',async()=>{
      let playFrames=0,playMs=0;
      // Each evaluate waits at most 120 rAFs (~2 s at 60 Hz), below the 15 s limit.
      for(let chunk=0;chunk<30;chunk++){
        const sample=await h.host.evaluate(async()=>{
          let frames=0,ms=0;
          for(let frame=0;frame<120;frame++){
            const before=performance.now();
            const wasPlay=document.documentElement.dataset.trPhase==='play';
            await new Promise(resolve=>requestAnimationFrame(resolve));
            if(wasPlay&&document.documentElement.dataset.trPhase==='play'){frames++;ms+=performance.now()-before;}
          }
          return {frames,ms};
        });
        playFrames+=sample.frames;playMs+=sample.ms;
        if(playFrames>=600&&playMs>=10000)break;
      }
      if(playFrames<600||playMs<10000)throw new Error('Tutorial did not exit with 600 frames and 10 s of real play inside the capture window');
    },90000);
    await capture.roundEnd();
  },
};
export default scenario;
