/* eslint-disable @typescript-eslint/prefer-for-of -- Indexed composition loops. */
import { CAPACITY, checkRecipe, RECIPES } from '../src/rules/recipes';
import type { Item } from '../src/rules/state';
import { ITEM_CAP, itemFrame } from './model';
import type { Assets, Layer, Packed } from './assets';
const EMPTY:readonly Item[]=[];
/** Safe bound: each container slot may use its largest override; include the base.
 * Also cover every completed recipe/served variant in the loaded manifest. */
export function itemDrawCap(assets:Assets){
  let cap=1;
  for(const [id,{frame}] of assets.frames){
    const m=frame.metadata;
    cap=Math.max(cap,1+(m.composition?.length ?? 0));
    for(const list of Object.values(m.servedComposition?.variants ?? {}))cap=Math.max(cap,1+list.length);
    const container=RECIPES.find(r=>id.startsWith(`container-${r.container}-`))?.container;
    if(container){let layers=1;for(const list of Object.values(m.contentCompositions ?? {}))layers=Math.max(layers,list.length);cap=Math.max(cap,1+CAPACITY[container]*layers);}
  }
  return cap;
}
const NO_LAYERS:readonly Layer[]=[];
/** Content changes rebuild composition; movement reuses the same pooled drawing records. */
export function createItemModels(assets:Assets,cap=itemDrawCap(assets),pool?:{overflow:number}){
  const entries=Array.from({length:ITEM_CAP},()=>({id:-1,kind:'',ingredient:undefined as Item['ingredient'],container:undefined as Item['container'],contents:undefined as Item['contents'],cup:undefined as Item['cup'],processes:undefined as Item['processes'],used:0,overflow:0,draws:Array.from({length:cap},()=>({packed:undefined as Packed|undefined,x:0,y:0,scale:1,order:0}))}));
  const slots=new Map<number,number>();let next=0;
  return itemModel;
  function itemModel(item:Item){
    let slot=slots.get(item.id);
    if(slot===undefined){slot=next;next=(next+1)%ITEM_CAP;const old=entries[slot];if(old)slots.delete(old.id);slots.set(item.id,slot);}
    const model=entries[slot];if(!model)return invalidSlot();
    if(model.id===item.id&&model.kind===item.kind&&model.ingredient===item.ingredient&&model.container===item.container&&model.contents===item.contents&&model.cup===item.cup&&model.processes===item.processes)return model;
    return rebuild(model,item);
  }
  function rebuild(model:typeof entries[number],item:Item){
    model.id=item.id;model.kind=item.kind;model.ingredient=item.ingredient;model.container=item.container;model.contents=item.contents;model.cup=item.cup;model.processes=item.processes;model.used=0;model.overflow=0;
    const checked=checkRecipe(item),finished='dish' in checked?assets.frames.get(`dish-${checked.dish}-plated`):undefined;
    const served=finished?.frame.metadata.servedComposition;
    if(served){const base=assets.frames.get(served.container);add(model,base);let drink='kopi';for(let i=0,list=item.cup?.contents ?? item.contents ?? EMPTY;i<list.length;i++)if(list[i]?.ingredient==='kopi'||list[i]?.ingredient==='teh'){drink=list[i]?.ingredient ?? 'kopi';break;}layers(model,served.variants[drink] ?? NO_LAYERS,base);return model;}
    const composition=finished?.frame.metadata.composition;
    if(composition){let container='plate';for(let i=0;i<RECIPES.length;i++){const recipe=RECIPES[i];if(recipe&&'dish' in checked&&recipe.id===checked.dish){container=recipe.container;break;}}const base=assets.frames.get(`container-${container}-clean`);add(model,base);layers(model,composition,base);return model;}
    const base=finished ?? assets.frames.get(itemFrame(item));add(model,base);if(finished||!base)return model;
    for(let i=0,list=item.contents ?? EMPTY;i<list.length;i++){const food=list[i];if(!food)continue;const ingredient=food.ingredient ?? '',override=base.frame.metadata.contentCompositions?.[ingredient];if(override){layers(model,override,base);continue;}const destination=base.frame.anchors[ingredient] ?? base.frame.anchor;add(model,assets.frames.get(`portion-${ingredient}-${food.processes?.includes('spread')?'spread':food.kind}`),destination[0]-base.frame.anchor[0],destination[1]-base.frame.anchor[1],base.frame.metadata.portionScales?.[ingredient] ?? 1);}
    if(item.cup){const override=base.frame.metadata.contentCompositions?.[item.cup.contents?.[0]?.ingredient ?? ''];if(override)layers(model,override,base);else add(model,assets.frames.get('portion-side-cup-clean'),21);}
    return model;
  }
  function add(model:typeof entries[number],packed:Packed|undefined,x=0,y=0,scale=1,order=0){if(!packed)return;const draw=model.draws[model.used];if(!draw){model.overflow++;if(pool)pool.overflow++;return;}draw.packed=packed;draw.x=x;draw.y=y;draw.scale=scale;draw.order=order;model.used++;
    // Stable insertion into pooled records: equal orders retain metadata order.
    let index=model.used-1;while(index>1){const previous=model.draws[index-1];if(!previous||previous.order<=order)break;model.draws[index]=previous;index--;}model.draws[index]=draw;}
  function layers(model:typeof entries[number],list:readonly Layer[],base:Packed|undefined){if(!base)return;for(let i=0;i<list.length;i++){const layer=list[i];if(!layer)continue;const destination=layer.anchor ?? base.frame.anchors[layer.slot ?? ''] ?? base.frame.anchor;add(model,assets.frames.get(layer.frame),destination[0]-base.frame.anchor[0],destination[1]-base.frame.anchor[1],layer.scale ?? 1,layer.order);}}
}
function invalidSlot():never{throw new Error('Invalid item model slot');}
