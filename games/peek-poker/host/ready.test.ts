import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { preloadCards } from './assets';
import { prepareTable, signalTableReady, TABLE_FONTS } from './ready';
import { pulse, fontStack } from '../../../packages/ui/src/index';

const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};};
afterEach(()=>vi.unstubAllGlobals());
it('PP-003 readiness awaits every atlas decode, font load, sprite upload and mounted warm-up',async()=>{
  const ids=['card-back',...Array.from({length:5},(_,i)=>`card-flip-${String(i)}`),...'a23456789tjqk'.split('').flatMap(r=>'shdc'.split('').map(s=>`card-${r==='t'?'10':r}${s}`))];
  const frame={sourceSize:[176,231],rect:[0,0,176,231],trim:[0,0],anchors:{centre:[88,115]},anchor:[88,115]};
  const atlases=[ids.slice(0,30),ids.slice(30)].map((keys,i)=>({set:'peek-poker-cards',full:{file:`atlas-${String(i)}.webp`},frames:Object.fromEntries(keys.map(id=>[id,frame]))}));
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:()=>({atlases})}));
  vi.stubGlobal('location',{href:'https://example.test/'});
  const decodes=[deferred(),deferred()];let count=0;
  vi.stubGlobal('Image',class {src='';decode(){return decodes[count++]?.promise;}});
  const draws=vi.fn(),loadGates=TABLE_FONTS.map(()=>deferred());
  const load=vi.fn((...args:[string,string])=>loadGates[TABLE_FONTS.indexOf(args[0] as typeof TABLE_FONTS[number])]?.promise);
  const fontsReady=deferred();
  vi.stubGlobal('document',{fonts:{load,ready:fontsReady.promise},createElement:()=>({width:0,height:0,getContext:()=>({drawImage:draws,getImageData:()=>({data:new Uint8ClampedArray(4)}),putImageData:vi.fn(),fillText:vi.fn()})})});
  const warmGate=deferred(),warm=vi.fn(()=>warmGate.promise),dataset:DOMStringMap={};
  const pending=signalTableReady(async()=>prepareTable(await preloadCards('/manifest.json'),warm),dataset);
  await vi.waitFor(()=>{expect(count).toBe(1);});expect(dataset.ppReady).toBeUndefined();expect(load).not.toHaveBeenCalled();
  decodes[0]?.resolve();await vi.waitFor(()=>{expect(count).toBe(2);});expect(load).not.toHaveBeenCalled();
  decodes[1]?.resolve();await vi.waitFor(()=>{expect(load).toHaveBeenCalledTimes(TABLE_FONTS.length);});
  expect(load.mock.calls.map(c=>c[0])).toEqual([...TABLE_FONTS]);
  for(const gate of loadGates) gate.resolve();await Promise.resolve();expect(warm).not.toHaveBeenCalled();
  fontsReady.resolve();await vi.waitFor(()=>{expect(warm).toHaveBeenCalledOnce();});
  // 58 restored frames, mask, 52 masked faces (two draws each), then all 110 uploads.
  expect(draws).toHaveBeenCalledTimes(58+1+52*2+110);
  expect(dataset.ppReady).toBeUndefined();warmGate.resolve();await pending;expect(dataset.ppReady).toBe('1');
});
it('PP-003 covers styles and canvas font weights and keeps demo readiness behind preparation',()=>{
  const css=readFileSync(new URL('./screen.css',import.meta.url),'utf8');
  const families=[...css.matchAll(/var\(--ka-font-(\w+)\)/g)].map(m=>m[1]);
  for(const family of families) expect(TABLE_FONTS.some(font=>font.includes(fontStack[family as keyof typeof fontStack]))).toBe(true);
  expect(TABLE_FONTS).toContain(`700 34px ${fontStack.body}`);
  expect(TABLE_FONTS).toContain(`400 34px ${fontStack.body}`);
  const demo=readFileSync(new URL('./demo.tsx',import.meta.url),'utf8');
  expect(demo).toContain('await signalTableReady(()=>screen.ready(');
  expect(demo).not.toContain("ppReady='1'");
  for(const keyframe of pulse({reduced:false}).keyframes) expect(Object.keys(keyframe).every(k=>['transform','opacity','offset'].includes(k))).toBe(true);
});
it('PP-003 failed preparation never signals ready',async()=>{
  const dataset:DOMStringMap={ppReady:'1'};
  await expect(signalTableReady(()=>Promise.reject(Error('decode failed')),dataset)).rejects.toThrow('decode failed');
  expect(dataset.ppReady).toBeUndefined();
});
