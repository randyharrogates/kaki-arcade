import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from 'vite';
import { expect, it } from 'vitest';

it('RZ-031 PLAT-022 shared status type, success-only pulse and reduced motion', async () => {
  const path = (relative:string) => fileURLToPath(new URL(relative,import.meta.url));
  const entry = path('./phone-polish-fixture.ts');
  const built = await build({configFile:false,build:{write:false,target:'esnext',lib:{entry,formats:['es']}},plugins:[{
    name:'phone-polish-fixture',resolveId:id => id === entry ? id : undefined,
    load:id => id === entry ? `import {h,render} from 'preact';
      import {ControllerShell,LayoutEngine} from '${path('../../../packages/controller-kit/src/index.ts')}';
      let revision=0;
      window.draw = (titles,scoreboard=false) => { revision++; return render(h(ControllerShell,{seat:1,name:'Player',link:'connected',theme:'rabakz'},
        h(LayoutEngine,{layout:{revision,controls:scoreboard?[{kind:'options',id:'continue',audience:'leader',options:[{id:'next',label:'Continue'}]}]:[]},isLeader:true,privateView:{revision,blocks:scoreboard?[{kind:'stat',label:'Place',value:'=1st'},{kind:'text',tone:'body',text:'Blue team'},{kind:'stat',label:'Score',value:100}]:titles.map(text=>({kind:'text',tone:'title',text}))},
        area:{width:innerWidth,height:innerHeight-68},viewport:{width:innerWidth,height:innerHeight},onOutput:()=>{}})),document.body); };` : undefined,
  }]});
  const output = Array.isArray(built) ? built[0] : built;
  if (!output || !('output' in output)) throw new Error('Missing build');
  const chunk = output.output.find(item => item.type === 'chunk');
  if (!chunk) throw new Error('Missing fixture');
  const css = (await Promise.all(['../../../packages/ui/tokens.css','../../../packages/controller-kit/src/shell.css',
    '../../../packages/controller-kit/src/layout.css','../../../games/rabakz/controller.css'].map(file => readFile(path(file),'utf8')))).join('\n');
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:667,height:375}});
    await page.addStyleTag({content:css});
    await page.evaluate(() => {
      const candidate: unknown = Reflect.get(Element.prototype,'animate');
      const animate = candidate as Element['animate'];
      Element.prototype.animate = function (...args) {
        const animation = animate.apply(this,args);
        if (this.matches('.ka-layout-title > span') && JSON.stringify(args[0]).includes('1.05')) {
          animation.pause(); animation.currentTime = 0;
        }
        return animation;
      };
    });
    await page.addScriptTag({type:'module',content:chunk.code});
    await page.waitForFunction(() => typeof Reflect.get(window,'draw') === 'function');
    const draw = async (titles:string[],scoreboard=false) => page.evaluate(({titles,scoreboard}) => {
      const draw = Reflect.get(window,'draw') as (titles:string[],scoreboard:boolean) => void;
      draw(titles,scoreboard);
    },{titles,scoreboard});
    // Outgoing blocks keep crossfading inside the live panel; skip anything within a ghost.
    const live = '.ka-private-panel:not(.ka-private-ghost)';
    const liveTitle = '.ka-layout-title:not(.ka-private-ghost *)';
    for (const reduced of [false,true]) {
      await page.emulateMedia({reducedMotion:reduced ? 'reduce' : 'no-preference'});
      for (const title of ['Right','Wrong','Locked out',"Time's up",'Watch the TV']) {
        await draw([title]);
        expect(await page.locator(`${live} ${liveTitle} > span`).textContent()).toBe(title);
        const pulses = await page.locator(`${live} ${liveTitle} > span`).evaluate(node => node.getAnimations().filter(animation =>
          animation.effect instanceof KeyframeEffect && animation.effect.getKeyframes().some(frame => String(frame.transform).includes('1.05'))).length);
        expect(pulses).toBe(!reduced && title === 'Right' ? 1 : 0);
        if (title === 'Wrong' || title === 'Locked out') {
          expect(await page.locator(`${live} ${liveTitle} > span`).evaluate(node => node.getAnimations().length)).toBe(0);
        }
      }
    }
    // RZ-016/RZ-032: longest real team name and tied Place beside leader Continue.
    await page.setViewportSize({width:667,height:375});
    await draw([],true);
    const next = page.getByRole('button',{name:'Continue',exact:true});
    await next.waitFor();
    expect(await page.locator(live).innerText()).toContain('Blue team');
    expect(await page.locator(live).innerText()).toContain('=1st');
    await expect.poll(() => page.locator('.ka-layout-engine').getAttribute('data-fits')).toBe('true');
    await expect.poll(() => page.locator(`${live} .ka-private-stat > span, ${live} .ka-layout-text > span, .ka-layout-options > button`).evaluateAll(nodes =>
      nodes.length > 0 && nodes.every(node => node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight &&
        node.getBoundingClientRect().right <= innerWidth && node.getBoundingClientRect().bottom <= innerHeight))).toBe(true);
    expect(await next.evaluate(node => node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight)).toBe(true);
    for (const width of [667,844,932]) {
      await page.setViewportSize({width,height:375});
      await draw(['Right','You join at the next question']);
      const titles = page.locator(`${live} ${liveTitle}`);
      await expect.poll(() => titles.evaluateAll(nodes => new Set(nodes.map(node => getComputedStyle(node).fontSize)).size)).toBe(1);
      expect(await page.locator(live).isVisible()).toBe(true);
      expect(await titles.evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight))).toBe(true);
    }
  } finally { await browser.close(); }
},30000);
