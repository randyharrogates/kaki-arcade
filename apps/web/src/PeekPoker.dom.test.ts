import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import { readFile } from 'node:fs/promises';
it('PP-021 pulses lock-in once, skips unchanged DOM and keeps reduced state changes',async()=>{
  const entry=fileURLToPath(new URL('./pp-dom-fixture.ts',import.meta.url));
  const screen=fileURLToPath(new URL('../../../games/peek-poker/host/Screen.tsx',import.meta.url));
  const scenarios=fileURLToPath(new URL('../../../games/peek-poker/host/scenarios.ts',import.meta.url));
  const rules=fileURLToPath(new URL('../../../games/peek-poker/src/index.ts',import.meta.url));
  const bundle=await build({configFile:false,build:{write:false,target:'esnext',lib:{entry,formats:['es']}},plugins:[{name:'pp-fixture',resolveId(id){if(id === entry) return id;return undefined;},load(id){if(id !== entry) return;return `
    import {PeekPokerScreen} from '${screen}';import {scenario} from '${scenarios}';import {peekPoker} from '${rules}';
    const root=document.createElement('div');document.body.append(root);
    const screen=PeekPokerScreen(root,{frames:new Map(),faces:new Map()});
    const update=(phase,reduced=false)=>{const view=peekPoker.publicView(scenario(phase));if(phase === 'reveal'){for(const p of view.players)p.name='ABCDEFGHIJKL';for(const h of view.hands){h.name='Three of a kind';h.points=16;}}screen.update({view,width:1920,height:1080,reduced,at:0});};
    update('picking');update('locked');const pulse=root.getAnimations({subtree:true}).length;
    const observer=new MutationObserver(()=>{});observer.observe(root,{subtree:true,childList:true,attributes:true,characterData:true});update('locked');const mutations=observer.takeRecords().length;
    update('reveal');const hand=root.querySelector('.pp-hands li');update('reveal');const sameHand=hand === root.querySelector('.pp-hands li');const fitted=[...root.querySelectorAll('.pp-hands li')].every(li=>li.lastElementChild.getBoundingClientRect().right<=1865 && li.getBoundingClientRect().bottom<=1025) && [...root.querySelectorAll('.pp-hand-name')].every(n=>n.textContent.endsWith('…'));
    for(const a of root.getAnimations({subtree:true})) a.cancel();update('picking',true);update('locked',true);
    window.ppResult={pulse,mutations,sameHand,fitted,reducedPulses:root.getAnimations({subtree:true}).length,status:root.querySelector('.pp-player span:last-child').textContent};
  `;}}]});
  const browser=await chromium.launch({headless:true});
  try {const page=await browser.newPage({viewport:{width:1920,height:1080}});const output=Array.isArray(bundle) ? bundle[0] : bundle;if(!output || !('output' in output)) throw Error('bundle');const chunk=output.output.find(c=>c.type === 'chunk');if(!chunk) throw Error('chunk');await page.addStyleTag({content:await readFile(fileURLToPath(new URL('../../../packages/ui/tokens.css',import.meta.url)),'utf8')});await page.addStyleTag({content:await readFile(fileURLToPath(new URL('../../../games/peek-poker/host/screen.css',import.meta.url)),'utf8')});await page.addScriptTag({type:'module',content:chunk.code});await page.waitForFunction(()=>Reflect.has(window,'ppResult'));expect(await page.evaluate(()=>Reflect.get(window,'ppResult') as unknown)).toEqual({pulse:4,mutations:0,sameHand:true,fitted:true,reducedPulses:0,status:'Picked'});} finally {await browser.close();}
},30000);
