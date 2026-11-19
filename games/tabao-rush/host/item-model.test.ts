/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Texture } from 'pixi.js';
import { servedDishes } from '../dev/served-dishes.fixture';
import { CAPACITY, RECIPES, checkRecipe } from '../src/rules/recipes';
import { createItemModels, itemDrawCap } from './item-model';
import type { Assets, Frame, Layer } from './assets';
const manifest=JSON.parse(readFileSync(new URL('../../../assets/dist/manifest.json',import.meta.url),'utf8')) as {atlases:{frames:Record<string,Frame>}[]};
function assets(divisor=1):Assets{return {frames:new Map(manifest.atlases.flatMap(a=>Object.entries(a.frames).map(([id,frame])=>[id,{frame,texture:Texture.EMPTY}] as const))),animations:new Map(),divisor,destroy(){/* Test textures are shared. */}};}
describe('T-18 serving compositions (TR-040, TR-041)',()=>{
  for(const divisor of [1,2])for(const drink of ['kopi','teh'])it(`draws all seven dishes in order at detail divisor ${String(divisor)} with ${drink}`,()=>{
    const a=assets(divisor),model=createItemModels(a);
    for(const [index,item] of servedDishes(drink).entries()){
      const recipe=RECIPES[index];expect(recipe).toBeDefined();expect(checkRecipe(item)).toEqual({dish:recipe?.id});
      const metadata=a.frames.get(`dish-${recipe?.id ?? ''}-plated`)?.frame.metadata;
      const base=a.frames.get(metadata?.servedComposition?.container ?? `container-${recipe?.container ?? ''}-clean`);
      const layers=metadata?.servedComposition?.variants[drink] ?? metadata?.composition ?? [];
      const result=model(item);expect(result.used).toBe(layers.length+1);expect(result.draws[0]?.packed).toBe(base);
      for(const [i,layer] of [...layers].sort((x,y)=>x.order-y.order).entries()){
        const destination=layer.anchor ?? base?.frame.anchors[layer.slot ?? ''] ?? base?.frame.anchor;
        expect(result.draws[i+1]).toMatchObject({packed:a.frames.get(layer.frame),x:(destination?.[0] ?? 0)-(base?.frame.anchor[0] ?? 0),y:(destination?.[1] ?? 0)-(base?.frame.anchor[1] ?? 0),scale:layer.scale ?? 1});
      }
      const draws=result.draws,first=draws[0];for(let frame=0;frame<60;frame++){expect(model({...item,place:{kind:'floor',tile:frame}})).toBe(result);expect(result.draws).toBe(draws);expect(draws[0]).toBe(first);}
    }
  });
  it('draws only present partial contents, overrides and generic scales at both details',()=>{
    for(const divisor of [1,2]){
      const a=assets(divisor),model=createItemModels(a);
      for(const item of servedDishes('teh')){
        const partial={...item,kind:'dirty-plate' as const,contents:item.contents?.slice(0,1) ?? [],processes:[]};
        const result=model(partial),base=result.draws[0]?.packed;expect(base).toBeDefined();
        const food=partial.contents[0],ingredient=food?.ingredient ?? '';
        const expected:Layer[]=[...(base?.frame.metadata.contentCompositions?.[ingredient] ?? [{frame:`portion-${ingredient}-${food?.processes?.includes('spread')?'spread':food?.kind ?? ''}`,slot:ingredient,scale:base?.frame.metadata.portionScales?.[ingredient] ?? 1,order:0}])];
        if(partial.cup)expected.push(...(base?.frame.metadata.contentCompositions?.[partial.cup.contents?.[0]?.ingredient ?? ''] ?? []));
        expected.sort((a,b)=>a.order-b.order);
        expect(result.used).toBe(expected.length+1);
        for(const [index,layer] of expected.entries()){
          const destination=layer.anchor ?? base?.frame.anchors[layer.slot ?? ''] ?? base?.frame.anchor;
          expect(a.frames.has(layer.frame)).toBe(true);
          expect(result.draws[index+1]).toMatchObject({packed:a.frames.get(layer.frame),x:(destination?.[0] ?? 0)-(base?.frame.anchor[0] ?? 0),y:(destination?.[1] ?? 0)-(base?.frame.anchor[1] ?? 0),scale:layer.scale ?? 1});
        }
      }
    }
  });
  it('sorts unsorted layers stably, gives explicit anchors precedence and rebuilds only on content change',()=>{
    const a=assets(),base=a.frames.get('container-plate-clean');if(!base)throw new Error('Missing plate');
    const layers:Layer[]=[{frame:'portion-rice-cooked',order:30,slot:'rice',anchor:[50,60],scale:0.7},{frame:'portion-chicken-chopped',order:10,slot:'chicken'},{frame:'portion-cucumber-chopped',order:10,slot:'cucumber'}];
    a.frames.set('container-plate-clean',{...base,frame:{...base.frame,metadata:{...base.frame.metadata,contentCompositions:{rice:layers}}}});
    const model=createItemModels(a),item=servedDishes()[0];if(!item)throw new Error('Missing dish');
    const partial={...item,contents:item.contents?.slice(0,1) ?? []},result=model(partial);
    expect(result.draws.slice(1,result.used).map(d=>d.order)).toEqual([10,10,30]);
    expect(result.draws[3]).toMatchObject({x:5.5,y:15.5,scale:0.7});
    expect(result.draws[1]?.packed).toBe(a.frames.get('portion-chicken-chopped'));
    expect(model({...partial,contents:[]})).toBe(result);expect(result.used).toBe(1);
  });
});

it('derives a safe cap from manifest layers and recipe container capacities (TR-040, TR-041)',()=>{
  const a=assets(),cap=itemDrawCap(a);expect(cap).toBe(9);
  // Bound every partial composition, including repeated overrides and side cups:
  // the rules charge a side cup one of the container's content slots.
  for(const container of ['plate','bowl','cup'] as const)for(const status of ['clean','dirty']){
    const metadata=a.frames.get(`container-${container}-${status}`)?.frame.metadata;
    const largest=Math.max(1,...Object.values(metadata?.contentCompositions ?? {}).map(list=>list.length));
    expect(1+CAPACITY[container]*largest).toBeLessThanOrEqual(cap);
  }
  for(const {frame} of a.frames.values())for(const list of [frame.metadata.composition ?? [],...Object.values(frame.metadata.servedComposition?.variants ?? {})])expect(1+list.length).toBeLessThanOrEqual(cap);
  for(const drink of ['kopi','teh'])for(const item of servedDishes(drink))expect(createItemModels(a)(item).overflow).toBe(0);
});
it('counts every layer exceeding draw storage (TR-040, TR-041)',()=>{
  const a=assets(),item=servedDishes()[0];if(!item)throw new Error('Dish');
  const pool={overflow:0},model=createItemModels(a,1,pool),result=model(item);
  expect(result.used).toBe(1);expect(result.overflow).toBe(3);expect(pool.overflow).toBe(3);
  model({...item,place:{kind:'floor',tile:1}});expect(pool.overflow).toBe(3);
});
