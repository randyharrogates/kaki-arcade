import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from 'vite';
import { expect, it } from 'vitest';

it('PERF-012 CTRL-003 measures Peek Poker 4×4 and Rabakz options within a quarter frame', async () => {
  const path = (relative:string) => fileURLToPath(new URL(relative,import.meta.url));
  const entry = path('./kit-label-performance-fixture.ts');
  const bundle = await build({configFile:false,build:{write:false,target:'esnext',minify:false,
    lib:{entry,formats:['es']}},plugins:[{
    name:'kit-label-performance-fixture',
    resolveId(id) { return id === entry ? id : undefined; },
    load(id) {
      if (id !== entry) return;
      return `
        import { h, render } from 'preact';
        import { ControllerShell, LayoutEngine } from '${path('../../../packages/controller-kit/src/index.ts')}';
        import { measureLabelGroup, observeLabelGroup } from '${path('../../../packages/controller-kit/src/layout-label.ts')}';
        import { peekPoker } from '${path('../../../games/peek-poker/src/index.ts')}';
        import { scenario } from '${path('../../../games/peek-poker/host/scenarios.ts')}';
        import { rabakz, questionData, QUESTION_DATA } from '${path('../../../games/rabakz/src/index.ts')}';
        const pp = scenario('picking');
        const player = pp.players[0].info.id;
        const rz = rabakz.init(42,[{id:'one',name:'Player 1',seat:1,colour:'seat-1'}],
          {length:10,difficulty:'mixed'},{ firstInRoom: false, saved: null, teams: false, data:{[QUESTION_DATA]:questionData(
            Array.from({length:10},(_,i)=>({id:String(i),prompt:'Which?',
              options:['Christopher Walken','David Hasselhoff','Jerry Springer','Patrick Swayze'],
              correct:0,category:'General',difficulty:'easy',type:'multiple-choice',region:'general'})))}});
        let container;
        window.mountKit = game => {
          if (container) {
            render(null,container);
            container.remove();
          }
          container = document.createElement('div');
          document.body.append(container);
          render(h(ControllerShell,{seat:1,name:'Player 1',link:'connected',theme:game},
            h(LayoutEngine,{layout:game === 'peek-poker' ? peekPoker.controllerLayout(pp,player) : rabakz.controllerLayout({...rz,phase:'question'},'one'),
              area:{width:844,height:322},viewport:{width:844,height:390},isLeader:false,onOutput:()=>{}})),container);
        };
        window.timeKit = game => {
          const group = document.querySelector(game === 'peek-poker' ? '.ka-layout-grid' : '[data-part="answer"] .ka-layout-options');
          const buttons = [...group.querySelectorAll(':scope > button')];
          const box = {width:buttons[0].offsetWidth,height:buttons[0].offsetHeight};
          const start = performance.now();
          measureLabelGroup(buttons,box);
          const pass = performance.now()-start;
          const installStart = performance.now();
          const dispose = observeLabelGroup(group,box);
          const install = performance.now()-installStart;
          dispose();
          return {pass,install,targets:buttons.length,labels:buttons.filter(button=>button.querySelector(':scope > span').textContent).length};
        };
      `;
    },
  }]});
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing bundle');
  const chunk = output.output.find(item => item.type === 'chunk');
  if (!chunk) throw new Error('Missing fixture code');
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:844,height:390},reducedMotion:'reduce'});
    const css = await Promise.all(['../../../packages/ui/tokens.css','../../../packages/controller-kit/src/shell.css',
      '../../../packages/controller-kit/src/layout.css','../../../games/rabakz/controller.css'].map(file=>readFile(path(file),'utf8')));
    await page.addStyleTag({content:css.join('\n')});
    await page.addScriptTag({type:'module',content:chunk.code});
    await page.waitForFunction(()=>Reflect.has(window,'mountKit'));
    let throttled = false;
    try {
      const session = await page.context().newCDPSession(page);
      await session.send('Emulation.setCPUThrottlingRate',{rate:4});
      throttled = true;
    } catch { /* Runners without CDP must meet the stricter unthrottled budget. */ }
    const budget = throttled ? 4 : 1;
    for (const game of ['peek-poker','rabakz']) {
      const samples = [];
      for (let sample = 0; sample < 7; sample++) {
        await page.evaluate(game => { (Reflect.get(window,'mountKit') as (game:string)=>void)(game); },game);
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        });
        const result = await page.evaluate(game =>
          (Reflect.get(window,'timeKit') as (game:string)=>{pass:number;install:number;targets:number;labels:number})(game),game);
        samples.push(result);
      }
      const median = (values:number[]) => {
        const middle = [...values].sort((a,b)=>a-b)[3];
        if (values.length !== 7 || middle === undefined) throw new Error('Expected seven timing samples');
        return middle;
      };
      const passes = samples.map(result=>result.pass);
      const installs = samples.map(result=>result.install);
      const passMedian = median(passes);
      const installMedian = median(installs);
      process.stdout.write(`PERF-012 ${game} CPU=${throttled ? '4x' : '1x'} pass=[${passes.join(', ')}] ms median=${String(passMedian)} ms install=[${installs.join(', ')}] ms median=${String(installMedian)} ms budget<${String(budget)} ms sample ceiling=${String(3*budget)} ms\n`);
      for (const result of samples) {
        expect(result.targets).toBe(game === 'peek-poker' ? 16 : 4);
        expect(result.labels).toBe(game === 'peek-poker' ? 0 : 4);
        expect(result.pass,`${game} measureLabelGroup sample`).toBeLessThanOrEqual(3*budget);
        expect(result.install,`${game} observeLabelGroup install sample`).toBeLessThanOrEqual(3*budget);
      }
      expect(passMedian,`${game} measureLabelGroup median`).toBeLessThan(budget);
      expect(installMedian,`${game} observeLabelGroup install median`).toBeLessThan(budget);
    }
  } finally { await browser.close(); }
},30000);
