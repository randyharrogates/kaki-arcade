import { createRequire } from 'node:module';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
it('PP-032 board 3 scoreboard and final fit both TV sizes with eight tied players',async()=>{
  const entry=fileURLToPath(new URL('../../../games/peek-poker/host/p05-fixture.ts',import.meta.url));
  const screen=fileURLToPath(new URL('../../../games/peek-poker/host/Screen.tsx',import.meta.url));
  const scenarios=fileURLToPath(new URL('../../../games/peek-poker/host/scenarios.ts',import.meta.url));
  const rules=fileURLToPath(new URL('../../../games/peek-poker/src/index.ts',import.meta.url));
  const hint=fileURLToPath(new URL('./game-final-hint.tsx',import.meta.url));
  const bundle=await build({configFile:false,resolve:{alias:[{find:/^preact$/,replacement:createRequire(import.meta.url).resolve('preact')}]},oxc:{jsx:{runtime:'automatic',importSource:'preact'}},build:{write:false,target:'esnext',lib:{entry,formats:['es']}},plugins:[{name:'p05-fixture',resolveId(id){return id === entry ? id : undefined;},load(id){if(id !== entry) return undefined;return `
    import {render,h} from 'preact';import {GameFinalHint} from '${hint}';
    import {PeekPokerScreen} from '${screen}';import {scenario} from '${scenarios}';import {peekPoker} from '${rules}';
    const screen=PeekPokerScreen(document.body,{frames:new Map(),faces:new Map()});
    const hintRoot=document.createElement('div');document.body.append(hintRoot);
    const resize=()=>document.documentElement.style.setProperty('--screen-scale',String(Math.min(innerWidth/1920,innerHeight/1080)));resize();addEventListener('resize',resize);
    window.draw=(phase,best=null,newBest=false,reduced=true,solo=false)=>{render(phase === 'over' ? h(GameFinalHint,{keyboard:false}) : null,hintRoot);const state=scenario('reveal',best === null && !solo ? 8 : 1);state.phase=phase;state.players.forEach(p=>{p.score=89;p.info.name='ABCDEFGHIJKL';});screen.update({view:{...peekPoker.publicView(state),soloBest:best,newBest},width:innerWidth,height:innerHeight,reduced});};
  `;}}]});
  const output=Array.isArray(bundle) ? bundle[0] : bundle;
  if(!output || !('output' in output)) throw Error('bundle');
  const chunk=output.output.find(c=>c.type === 'chunk');if(!chunk) throw Error('chunk');
  const browser=await chromium.launch({headless:true});
  try {
    for(const size of [{width:1920,height:1080},{width:1280,height:720}]) {
      const page=await browser.newPage({viewport:size});
      for(const path of ['../../../packages/ui/tokens.css','../../../games/peek-poker/host/screen.css','./style.css']) await page.addStyleTag({content:await readFile(fileURLToPath(new URL(path,import.meta.url)),'utf8')});
      await page.addScriptTag({type:'module',content:chunk.code});await page.waitForFunction(()=>Reflect.has(window,'draw'));
      for(const phase of ['scoreboard','over']) {
        await page.evaluate(p=>{(Reflect.get(window,'draw') as (phase:string)=>void)(p);},phase);
        expect(await page.locator('.pp-score-row').count()).toBe(8);
        expect(await page.locator('.pp-score-row > strong:first-child').allTextContents()).toEqual(Array(8).fill('=1'));
        expect(await page.locator('.pp-results').evaluate(node=>{
          const rects=[...node.querySelectorAll('.pp-score-row,.pp-summary')].map(n=>n.getBoundingClientRect());
          const columns=getComputedStyle(node).gridTemplateColumns.split(' ').map(Number.parseFloat);
          return {fits:rects.every(r=>r.top>=0 && r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight),ratio:(columns[1] ?? 0)/(columns[0] ?? 1),scroll:document.documentElement.scrollHeight>innerHeight};
        })).toMatchObject({fits:true,scroll:false});
        if(phase === 'over') {
          expect(await page.locator('.game-final-hint').count()).toBe(1);
          expect(await page.locator('.game-final-hint').evaluate(n=>n.getBoundingClientRect().height)).toBeCloseTo(34*size.width/1920);
          expect(await page.locator('.game-final-hint').evaluate(hint=>{
            const h=hint.getBoundingClientRect();
            return [...document.querySelectorAll('.pp-score-row,.pp-summary')].every(row=>{const r=row.getBoundingClientRect();return r.right<=h.left || r.left>=h.right || r.bottom<h.top || r.top>h.bottom;});
          })).toBe(true);
          expect(await page.getByText('Leader can continue').count()).toBe(0);
        }
        const ratio=await page.locator('.pp-results').evaluate(n=>{const c=getComputedStyle(n).gridTemplateColumns.split(' ').map(Number.parseFloat);return (c[1] ?? 0)/(c[0] ?? 1);});expect(ratio).toBeCloseTo(1.618,2);
      }
      await page.evaluate(()=>{(Reflect.get(window,'draw') as (phase:string,best:number|null,newBest:boolean,reduced:boolean,solo?:boolean)=>void)('over',null,false,true,true);});
      expect(await page.locator('.pp-summary h1').textContent()).toBe('Match complete');
      await page.evaluate(()=>{(Reflect.get(window,'draw') as (phase:string,best:number|null,newBest:boolean,reduced:boolean,solo?:boolean)=>void)('over',0,true,true);});
      expect(await page.evaluate(()=>document.getAnimations().length)).toBe(0);
      const motion = await page.evaluate(()=>{
        const draw=Reflect.get(window,'draw') as (phase:string,best:number|null,newBest:boolean,reduced:boolean)=>void;
        draw('scoreboard',0,false,true);
        draw('over',0,false,false);
        const rows=[...document.querySelectorAll('.pp-score-row')];
        const animations=rows.flatMap(row=>row.getAnimations());
        animations.forEach(animation=>{animation.pause();animation.currentTime=0;});
        const times=animations.map(animation=>animation.currentTime);
        draw('over',0,true,false);
        return {sameRows:rows.every((row,i)=>row === document.querySelectorAll('.pp-score-row')[i]),
          sameAnimations:animations.every((animation,i)=>animation === rows.flatMap(row=>row.getAnimations())[i] && animation.currentTime === times[i]),
          delay:document.querySelector('.pp-result-best')?.getAnimations()[0]?.effect?.getTiming().delay,entranceEnd:animations[0]?.effect?.getComputedTiming().endTime,rows:animatedCount(),pulse:document.querySelector('.pp-result-best')?.getAnimations().length};
        function animatedCount(){return animations.length;}
      });
      expect(motion).toMatchObject({sameRows:true,sameAnimations:true,rows:1,pulse:1});
      expect(motion.delay).toBe(motion.entranceEnd);
      // Resize the mounted final frame without publishing or redrawing a view.
      await page.setViewportSize({width:1920,height:1080});
      await page.evaluate(()=>{(Reflect.get(window,'draw') as (phase:string)=>void)('over');});
      await page.setViewportSize({width:1280,height:720});
      await expect.poll(()=>page.locator('.pp-score-row').evaluateAll(rows=>rows.every(row=>{
        const r=row.getBoundingClientRect();return r.left>=0 && r.top>=0 && r.right<=innerWidth && r.bottom<=innerHeight;
      }))).toBe(true);
      for(const phase of ['scoreboard','over']) for(const [best,newBest,expected] of [[0,false,null],[21,false,'Best 21'],[0,true,'New best · 89']] as const) {
        await page.evaluate(({phase,best,newBest})=>{(Reflect.get(window,'draw') as (phase:string,best:number,newBest:boolean)=>void)(phase,best,newBest);},{phase,best,newBest});
        if(expected !== null) expect(await page.locator('.pp-winner-line').evaluate(node=>node.nextElementSibling?.classList.contains('pp-result-best'))).toBe(true);
        if(expected !== null && phase === 'scoreboard') expect(await page.locator('.pp-result-best').evaluate(node=>node.nextElementSibling?.textContent)).toBe('Next round in 5 seconds');
        const lines=await page.locator('.pp-summary p').allTextContents();
        expect(lines.filter(line=>/best/i.test(line))).toEqual(expected === null ? [] : [expected]);
      }
      for(const phase of ['memorise','pick']) {
        await page.evaluate(phase=>{(Reflect.get(window,'draw') as (phase:string,best:number)=>void)(phase,21);},phase);
        expect(await page.locator('.pp-best').evaluate(best=>{
          const b=best.getBoundingClientRect();return [...document.querySelectorAll('.pp-player,.pp-hands')].every(node=>{const r=node.getBoundingClientRect();return r.right<=b.left || r.left>=b.right || r.bottom<=b.top || r.top>=b.bottom;});
        })).toBe(true);
      }
      await page.close();
    }
  } finally {await browser.close();}
},30000);
it('PP-032 felt and panel text contrast meets 4.5:1 across both surface endpoints',async()=>{
  const css=await readFile(fileURLToPath(new URL('../../../packages/ui/tokens.css',import.meta.url)),'utf8');
  const theme=css.split('[data-theme="peek-poker"] {')[1]?.split('}')[0];
  if(!theme) throw Error('theme');
  const colour=(token:string)=>{const hex=new RegExp(`${token}: #([A-Fa-f0-9]{6})`).exec(theme)?.[1];if(!hex) throw Error(token);return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);};
  const luminance=(rgb:number[])=>rgb.reduce((total,c,i)=>total+(c<=0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4)*([0.2126,0.7152,0.0722][i] ?? 0),0);
  const contrast=(a:number[],b:number[])=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
  // Felt grain is white at 4% alpha; check its brightest endpoint as well.
  for(const surface of [colour('--ka-bg'),colour('--ka-bg').map(c=>c*0.96+0.04)]) expect(contrast(colour('--ka-ink'),surface)).toBeGreaterThanOrEqual(4.5);
  for(const token of ['--ka-panel-from','--ka-panel-to']) expect(contrast(colour('--ka-panel-ink'),colour(token))).toBeGreaterThanOrEqual(4.5);
});

it('PP-032 P-10 scoreboard announces the next round or final scores and the podium has neither countdown',async()=>{
  const entry=fileURLToPath(new URL('../../../games/peek-poker/host/p10-fixture.ts',import.meta.url));
  const results=fileURLToPath(new URL('../../../games/peek-poker/host/results.ts',import.meta.url));
  const scenarios=fileURLToPath(new URL('../../../games/peek-poker/host/scenarios.ts',import.meta.url));
  const rules=fileURLToPath(new URL('../../../games/peek-poker/src/index.ts',import.meta.url));
  const bundle=await build({configFile:false,resolve:{alias:[{find:/^preact$/,replacement:createRequire(import.meta.url).resolve('preact')}]},oxc:{jsx:{runtime:'automatic',importSource:'preact'}},build:{write:false,target:'esnext',lib:{entry,formats:['es']}},plugins:[{name:'p10-fixture',resolveId(id){return id === entry ? id : undefined;},load(id){if(id !== entry) return undefined;return `
    import {resultsBoard} from '${results}';import {scenario} from '${scenarios}';import {peekPoker} from '${rules}';
    window.draw=(round,totalRounds,phase)=>{const state=scenario('reveal',1);resultsBoard(document.body,{...peekPoker.publicView(state),round,totalRounds,phase},true);};
  `;}}]});
  const output=Array.isArray(bundle) ? bundle[0] : bundle;
  if(!output || !('output' in output)) throw Error('bundle');
  const chunk=output.output.find(c=>c.type === 'chunk');if(!chunk) throw Error('chunk');
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();
    await page.addScriptTag({type:'module',content:chunk.code});
    await page.waitForFunction(()=>Reflect.has(window,'draw'));
    for(const [round,totalRounds,phase,expected] of [
      [1,5,'scoreboard','Next round in 5 seconds'],
      [4,5,'scoreboard','Next round in 5 seconds'],
      [5,5,'scoreboard','Final scores in 5 seconds'],
      [3,3,'scoreboard','Final scores in 5 seconds'],
      [5,5,'over',null],
    ] as const) {
      await page.evaluate(({round,totalRounds,phase})=>{
        (Reflect.get(window,'draw') as (round:number,totalRounds:number,phase:string)=>void)(round,totalRounds,phase);
      },{round,totalRounds,phase});
      expect(await page.locator('.pp-summary > span').textContent()).toBe(phase === 'over' ? 'Peek Poker · final scores' : `Scores · round ${String(round)} of ${String(totalRounds)}`);
      expect(await page.locator('ol').getAttribute('aria-label')).toBe(phase === 'over' ? 'Final podium' : 'Running scoreboard');
      const lines=await page.locator('.pp-summary p').allTextContents();
      expect(lines.filter(line=>line === 'Next round in 5 seconds' || line === 'Final scores in 5 seconds')).toEqual(expected === null ? [] : [expected]);
    }
  } finally {await browser.close();}
},30000);
