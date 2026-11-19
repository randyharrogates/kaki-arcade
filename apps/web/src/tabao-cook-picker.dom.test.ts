import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from 'vite';
import { expect, it } from 'vitest';
it('TR-064 phone and TV picker bounds, image fallback, badges and Ready targets',async()=>{
  const path=(p:string)=>fileURLToPath(new URL(p,import.meta.url));
  const entry=path('./picker-dom.fixture.ts');
  const bundle=await build({configFile:false,resolve:{alias:[{find:/^preact$/,replacement:createRequire(import.meta.url).resolve('preact')}]},build:{write:false,target:'esnext',lib:{entry,formats:['es']}},plugins:[{name:'picker-dom',resolveId:id=>id===entry?id:undefined,load:id=>id===entry?`
    import {h,render} from 'preact';
    import {LayoutEngine} from '${path('../../../packages/controller-kit/src/layout-renderer.ts')}';
    import {tabaoRush} from '${path('../../../games/tabao-rush/src/rules/game.ts')}';
    import {EMPTY_SETUP,createTick} from '${path('../../../packages/platform/src/index.ts')}';
    import {createCookPicker} from '${path('../../../games/tabao-rush/host/cook-picker.ts')}';
    const players=Array.from({length:8},(_,i)=>({id:'p'+(i+1),seat:i+1,name:'Cook '+(i+1),colour:'seat-'+(i+1)}));
    let state=tabaoRush.init(42,players,{},EMPTY_SETUP);
    window.phone=()=>render(h(LayoutEngine,{layout:tabaoRush.controllerLayout(state,'p1'),area:{width:innerWidth-26,height:innerHeight-76},viewport:{width:innerWidth,height:innerHeight},onOutput:output=>{state=tabaoRush.step(state,createTick({actions:[{player:'p1',control:output.control,value:output.value,revision:0}]}),1000/60);window.phone();}}),document.body);
    window.playTv=()=>{render(null,document.body); document.body.replaceChildren(); const picker=createCookPicker(document.body,new Map());picker.update({...tabaoRush.publicView(state),phase:'play'},innerWidth,innerHeight);};
    window.tv=()=>{render(null,document.body); const picker=createCookPicker(document.body,new Map());picker.update(tabaoRush.publicView(state),innerWidth,innerHeight);};
  `:undefined}]});
  const output=Array.isArray(bundle)?bundle[0]:bundle;
  if(!output || !('output' in output))throw Error('bundle');
  const chunk=output.output.find(c=>c.type==='chunk');if(!chunk)throw Error('chunk');
  const browser=await chromium.launch({headless:true});
  try {
    for(const [width,height] of [[667,375],[844,390],[932,430],[1920,1080],[1280,720]] as const) {
      const page=await browser.newPage({viewport:{width,height},reducedMotion:width===844?'no-preference':'reduce'});
      for(const file of ['../../../packages/ui/tokens.css','../../../packages/controller-kit/src/layout.css','../../../games/tabao-rush/host/cook-picker.css'])await page.addStyleTag({content:await readFile(path(file),'utf8')});
      await page.addStyleTag({content:'body { margin:0; }'});
      await page.addScriptTag({type:'module',content:chunk.code});
      await page.waitForFunction(()=>Reflect.has(window,'phone'));
      await page.evaluate(phone=>{(Reflect.get(window,phone?'phone':'tv') as ()=>void)();},width<1000);
      if(width<1000) {
        expect(await page.locator('.ka-layout-engine').getAttribute('data-fits')).toBe('true');
        expect(await page.getByRole('button',{name:'Cap',exact:true}).getAttribute('aria-pressed')).toBe('true');
        expect(await page.locator('.ka-layout-picture').count()).toBe(8);
        expect(await page.locator('.ka-layout-badge').count()).toBe(8);
        expect(await page.getByRole('button',{name:'Ready',exact:true}).evaluate(n=>getComputedStyle(n).fontSize)).toBe('21px');
        expect(await page.locator('.ka-layout-note').last().evaluate(n=>getComputedStyle(n).fontSize)).toBe('13px');
        expect(await page.locator('.ka-layout-grid button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.width>=55&&r.height>=55;}))).toBe(true);
        const ready = page.getByRole('button',{name:'Ready',exact:true});
        const plain = await ready.evaluate(n=>({background:getComputedStyle(n).background,color:getComputedStyle(n).color}));
        await ready.hover(); await page.mouse.down();
        const selected = page.getByRole('button',{name:'Ready ✓',exact:true});
        expect(await selected.getAttribute('aria-pressed')).toBe('true');
        if(width===844) expect(await selected.evaluate(n=>n.getAnimations().some(a=>{
          const frames=(a.effect as KeyframeEffect).getKeyframes();
          return frames.some(frame=>frame.opacity==='0') && frames.every(frame=>frame.transform===undefined);
        }))).toBe(true);
        await page.mouse.up();
        await page.waitForTimeout(300);
        expect(await selected.evaluate(n=>({background:getComputedStyle(n).background,color:getComputedStyle(n).color}))).not.toEqual(plain);
        expect(await page.locator('.ka-layout-ready').evaluate(n=>{
          const tick=n.getBoundingClientRect(),badge=n.parentElement?.getBoundingClientRect();
          const numeral=n.parentElement?.firstChild;
          if(!badge || numeral?.nodeType!==Node.TEXT_NODE) return false;
          const range=document.createRange(); range.selectNodeContents(numeral);
          const text=range.getBoundingClientRect();
          if(tick.left<text.right && tick.right>text.left && tick.top<text.bottom && tick.bottom>text.top) return false;
          return tick.left>=badge.left && tick.top>=badge.top && tick.right<=badge.right && tick.bottom<=badge.bottom;
        })).toBe(true);

      } else expect(await page.locator('.tr-cook-card').count()).toBe(8);
      expect(await page.locator(width<1000?'.ka-layout-part':'.tr-cook-card').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}))).toBe(true);
      if(width>=1000) {
        await page.evaluate(()=>{(Reflect.get(window,'playTv') as ()=>void)();});
        expect(await page.locator('.tr-cook-picker').evaluate(n=>(n as HTMLElement).hidden)).toBe(true);
      }
      await page.close();
    }
  } finally {await browser.close();}
},30000);
