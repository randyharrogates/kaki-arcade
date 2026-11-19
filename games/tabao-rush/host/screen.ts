/* eslint-disable @typescript-eslint/prefer-for-of -- Indexed hot loops avoid iterator allocation. */
import { nameText, displayName, nameInset } from './text';
import { createItemModels, itemDrawCap } from './item-model';
import { ViewModel, colourFor, tintFor } from './view-model';
import { createPanels } from './panels';
// Registers renderer.prepare (PixiJS 8 adds it only through this extension), used to upload every texture before play.
import 'pixi.js/prepare';
import { Application, Container, Sprite, Texture } from 'pixi.js';
import { THEMES } from '../../../packages/ui/src/themes';
import { ON_COLOUR } from '../../../packages/ui/src/colour';
import { fontStack, tvType } from '../../../packages/ui/src/type';
import type { Item } from '../src/rules/state';
import { action, arcHeight, cookPosition, DIRECTIONS, FixedPool, flightProgress, ITEM_CAP, lerp, TILE, DEPTH, projectX, projectY } from './model';
import type { View } from './model';
import { preload } from './assets';
import type { Packed, Animation } from './assets';
const depthOrder=(a:Container,b:Container)=>a.zIndex-b.zIndex;
const NEUTRAL_TINT=Number.parseInt(ON_COLOUR.slice(1),16);
const theme = THEMES['tabao-rush'];
export interface Options { view: unknown; width: number; height: number; detail?: 'full' | 'half'; heads?: Readonly<Record<string,string>> }
interface Node { depth:number; sprite: Sprite; x: number; y: number; oldX: number; oldY: number; controlled: boolean; baseScale:number }
/** A single WebGL sprite scene. UI text is rasterised only at publication, never in RAF. */
export async function createScreen(root: HTMLElement, initial: Options, cancelled: () => boolean) {
  await Promise.all([document.fonts.load(`34px ${fontStack.body}`, 'Time Score Stars Tips 0123456789 ★☆'),document.fonts.load(`bold 34px ${fontStack.body}`),document.fonts.load(`55px ${fontStack.display}`, 'Time Score Stars Tips 0123456789 ★☆'),document.fonts.ready]);
  const assets = await preload(initial.detail ?? 'full');
  if (cancelled()) { assets.destroy(); return undefined; }
  const app = new Application();
  await app.init({ width: 1920, height: 1080, preference: 'webgl', autoStart: false, antialias: false });
  app.stop();
  if (cancelled()) { app.destroy(true); assets.destroy(); return undefined; }
  root.append(app.canvas); app.canvas.setAttribute('aria-label', 'Tabao Rush kitchen');
  const stage = new Container(); stage.sortableChildren=false; app.stage.addChild(stage);
  const background = new Sprite(); stage.addChild(background); background.zIndex=-1;
  const ITEM_DRAW_CAP=itemDrawCap(assets);
  const pool = new FixedPool<Node>(8 * 5 + ITEM_CAP * (ITEM_DRAW_CAP+1) + (initial.view as View).stations.length, () => {
    const sprite = new Sprite(); return { depth:0, sprite, x: 0, y: 0, oldX: 0, oldY: 0, controlled: false, baseScale:1 };
  });
  const panels=createPanels(stage,assets,(initial.view as View).stations.length);
  const itemModels=createItemModels(assets,ITEM_DRAW_CAP,pool);
  const cookClips=new Map<string,Animation>(),maskNames=new Map<string,string>();
  for(const [name,clip] of assets.animations)if(name.startsWith('tabao-rush-cook-body:')){cookClips.set(clip.action,clip);if(!clip.action.endsWith('-mask'))maskNames.set(clip.action,clip.action+'-mask');}
  const headFrames=Array.from({length:8},()=>({name:'',frames:Array<Packed|undefined>(8),masks:Array<Packed|undefined>(8)}));
  const fireAnimation=assets.animations.get('tabao-rush-effects:fire');
  const fireFrames=fireAnimation?.frames?.map(id=>assets.frames.get(id)) ?? [];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let heads=initial.heads;
  let view = initial.view as View, previous = view, publishedAt = performance.now(), frame = 0, destroyed = false;
  let viewportWidth=-1,viewportHeight=-1;
  let backgroundTexture: Texture | undefined;
  const distances=new Float64Array(8),poseStart=new Float64Array(8),poseActions=Array<string>(8).fill('idle');
  const vm=new ViewModel(pool.entries.length);
  function setDepth(node:Node,depth:number){node.depth=depth;}
  function worldX(x:number) { return projectX(x,view.level.width); }
  function worldY(y:number) { return projectY(y,view.level.height); }
  function place(packed: Packed | undefined, x: number, y: number, anchor: string | undefined, scale = 1, tint?: number, controlled = false, identity=0) {
    if (!packed) return;
    const n = pool.take(); if(!n)return; const f = packed.frame, a = (anchor===undefined?undefined:f.anchors[anchor]) ?? f.anchor;
    setDepth(n,y*10+pool.used/10000);if(!n.sprite.parent)stage.addChild(n.sprite); n.sprite.texture = packed.texture; n.sprite.visible = true; n.sprite.alpha=1;
    // bakedOutline pixels already contain ink; item sprites receive no extra outline.
    n.baseScale=scale*assets.divisor;n.sprite.pivot.set(0,0);n.sprite.scale.set(n.baseScale);n.sprite.tint=tint ?? NEUTRAL_TINT;
    // ART-PIPELINE §10: full-resolution source anchors (including nested anchors) at both details; scale before translation.
    n.x=x+(f.trim[0]-a[0])*scale;n.y=y+(f.trim[1]-a[1])*scale;
    const index=pool.used-1,slot=index*2,same=vm.ids[index]===identity;vm.ids[index]=identity; const oldX=vm.positions[slot],oldY=vm.positions[slot+1];n.oldX=same&&oldX!==undefined&&Number.isFinite(oldX)?oldX:n.x;n.oldY=same&&oldY!==undefined&&Number.isFinite(oldY)?oldY:n.y;vm.positions[slot]=n.x;vm.positions[slot+1]=n.y;n.controlled=controlled;
    n.sprite.position.set(n.x, n.y);
    return n;
  }
  function drawBackground() {
    backgroundTexture?.destroy(true);
    const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = THEMES.console.background.colour; ctx.fillRect(0,0,1920,1080);
    const paints=THEMES.console.background.treatment.paints;for(let y=0;y<1080;y+=89)for(let x=0;x<1920;x+=89){for(let i=0;i<paints.length;i++){ctx.fillStyle=paints[i] ?? THEMES.console.background.colour;ctx.beginPath();ctx.arc(x+89*(i+1)/(paints.length+1),y+89*(i%2?0.62:0.3),5,0,Math.PI*2);ctx.fill();}}
    root.style.backgroundImage=`url(${canvas.toDataURL()})`;
    ctx.strokeStyle = THEMES.console.panel.edge.colour;
    for (let i=0;i<view.level.tiles.length;i++) {
      const tile = view.level.tiles[i]; if (!tile) continue;
      const x=worldX(i%view.level.width), y=worldY(Math.floor(i/view.level.width));
      ctx.fillStyle = tile.kind === 'floor' ? THEMES.console.panel.to : THEMES.console.chip.fill;
      ctx.fillRect(x,y,TILE,TILE*DEPTH); ctx.strokeRect(x,y,TILE,TILE*DEPTH);
      if (i===view.level.extinguisherTile) { ctx.fillStyle=ON_COLOUR; nameText(ctx,'Extinguisher',x+nameInset(view.level,i,-1),y+34,TILE-nameInset(view.level,i,-1)-nameInset(view.level,i,1)); }
      if (tile.kind === 'station' && tile.ingredient) { ctx.fillStyle = ON_COLOUR; nameText(ctx,tile.ingredient==='rice'?'Rice':displayName(tile.ingredient),x+nameInset(view.level,i,-1),y+34,TILE-nameInset(view.level,i,-1)-nameInset(view.level,i,1)); }
    }
    for(let i=0;i<view.stations.length;i++){const station=view.stations[i];if(!station)continue;const x=worldX(station.tile%view.level.width),y=worldY(Math.floor(station.tile/view.level.width));ctx.fillStyle=THEMES.console.chip.fill;ctx.fillRect(x,y,TILE,TILE*DEPTH);}

    ctx.fillStyle = theme.panel.ink; ctx.font = `${String(tvType.label)}px ${fontStack.body}`;
    ctx.fillText('A-06 geometry placeholder · A-05 station placeholders · A-11 step-icon placeholders',55,55);
    backgroundTexture = Texture.from(canvas); background.texture=backgroundTexture;
  }
  function animation(actionName:string,direction:string,index:number) {
    const anim=cookClips.get(actionName), ids=anim?.directions?.[direction];
    if (!ids?.length || !anim) return undefined;
    const elapsed=Math.max(0,view.tick-(poseStart[index] ?? 0))/60;
    const sample=anim.strideTiles ? (distances[index] ?? 0)/anim.strideTiles*ids.length : elapsed*anim.fps;
    const slot=anim.loop ? Math.floor(sample)%ids.length : Math.min(ids.length-1,Math.floor(sample));
    return assets.frames.get(ids[slot] ?? '');
  }

  function cookIndex(id:string){for(let i=0;i<view.cooks.length;i++)if(view.cooks[i]?.id===id)return i;return -1;}
  function drawItems() {
    for (let itemIndex=0;itemIndex<view.items.length;itemIndex++) {
      const item=view.items[itemIndex];if(!item)continue;
      let x:number,y:number,controlled=false;
      if (item.place.kind==='held') {
        const index=cookIndex(item.place.cook);
        const cook=view.cooks[index]; if (!cook) continue;
        const body=animation(poseActions[index] ?? 'idle',DIRECTIONS[cook.facing],index);
        const hand=body?.frame.anchors.hands, rootAnchor=body?.frame.anchors.root;
        x=worldX(cook.x)+(hand && rootAnchor ? hand[0]-rootAnchor[0] : 0); y=worldY(cook.y)+(hand && rootAnchor ? hand[1]-rootAnchor[1] : -55); controlled=true;
      } else if (item.place.kind==='flight') {
        const p=flightProgress(item,view.tick);
        const groundX=worldX(lerp(item.place.start.x,item.place.end.x,p)),groundY=worldY(lerp(item.place.start.y,item.place.end.y,p));
        let handHeight=0;
        const thrower=cookIndex(item.place.thrower);
        const cook=view.cooks[thrower];
        const clip=assets.animations.get('tabao-rush-cook-body:throw');
        const release=cook?assets.frames.get(clip?.directions?.[DIRECTIONS[cook.facing]]?.[clip.releaseFrame ?? 0] ?? ''):undefined;
        const hand=release?.frame.anchors.throwHand,origin=release?.frame.anchors.root;
        if(hand && origin)handHeight=origin[1]-hand[1];
        const height=arcHeight(p)+handHeight*(1-p);
        const shadowFactor=1/(1+height/(TILE*0.5));
        const shadow=place(assets.frames.get('shadow-0'),groundX,groundY,'origin',shadowFactor,undefined,false,item.id*(ITEM_DRAW_CAP+1)+ITEM_DRAW_CAP+1);
        if(shadow){shadow.sprite.alpha=shadowFactor;setDepth(shadow,0);}
        x=worldX(lerp(item.place.start.x,item.place.end.x,p)); y=worldY(lerp(item.place.start.y,item.place.end.y,p))-height;
      } else { x=worldX(item.place.tile%view.level.width+0.5); y=worldY(Math.floor(item.place.tile/view.level.width)+0.5);if(item.place.kind==='counter'){x+=21;y-=34;} }
      const begin=pool.used;
      drawItem(item,x,y,controlled,item.place.kind==='counter');
      if(item.place.kind==='held'){
        const index=cookIndex(item.place.cook);
        const cook=view.cooks[index];
        for(let i=begin;i<pool.used;i++){const n=pool.entries[i];if(n && cook)setDepth(n,worldY(cook.y)*10+(animation(poseActions[index] ?? 'idle',DIRECTIONS[cook.facing],index)?.frame.metadata.handsInFront===false?-0.1:0.15)+(i-begin)/10000);}
      }
    }
  }
  function drawItem(item:Item,x:number,y:number,controlled:boolean,counter:boolean){
    const model=itemModels(item);let fit=1,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    if(counter){for(let i=0;i<model.used;i++){const d=model.draws[i],f=d?.packed?.frame;if(!d||!f)continue;const left=d.x+(f.trim[0]-f.anchor[0])*d.scale,top=d.y+(f.trim[1]-f.anchor[1])*d.scale;minX=Math.min(minX,left);minY=Math.min(minY,top);maxX=Math.max(maxX,left+f.rect[2]*d.scale);maxY=Math.max(maxY,top+f.rect[3]*d.scale);}fit=Math.min(1,55/(maxX-minX),34/(maxY-minY));x-=(minX+maxX)*fit/2;y-=(minY+maxY)*fit/2;}
    for(let i=0;i<model.used;i++){const draw=model.draws[i];if(draw){const node=place(draw.packed,x+draw.x*fit,y+draw.y*fit,undefined,draw.scale*fit,undefined,controlled,item.id*(ITEM_DRAW_CAP+1)+i+1);if(node)setDepth(node,y*10+i/10000);}}
  }
  let publishedCards=-1,publishedOverflow=-1;
  function update(options:Options) {
    const next=options.view as View;
    if(next.level!==view.level || next.tick<view.tick){poseActions.fill('idle');poseStart.fill(next.tick);distances.fill(0);vm.positions.fill(NaN);}
    const previousUsed=pool.used;
    heads=options.heads; previous=view; view=next; publishedAt=performance.now(); pool.reset();
    if(viewportWidth!==options.width||viewportHeight!==options.height){
    viewportWidth=options.width;viewportHeight=options.height;
    const fit=Math.min(options.width/1920,options.height/1080);
    app.canvas.style.display="block";app.canvas.style.margin=`${String((options.height-1080*fit)/2)}px auto`;
    app.canvas.style.width=`${String(1920*fit)}px`; app.canvas.style.height=`${String(1080*fit)}px`;
    }
    if(!backgroundTexture || previous.level!==view.level) drawBackground();
    for(let i=0;i<view.cooks.length;i++) {
      const cook=view.cooks[i]; if(!cook) continue;
      const direction=DIRECTIONS[cook.facing];
      const old=previous.cooks[i];
      if(old && next.tick>previous.tick)distances[i]=(distances[i] ?? 0)+Math.hypot(cook.x-old.x,cook.y-old.y);
      let act=action(view,i);
      const last=poseActions[i] ?? 'idle';
      if((last==='serve'||last==='throw') && view.tick-(poseStart[i] ?? 0)<30)act=last;
      if(last!==act){poseActions[i]=act;poseStart[i]=view.tick;}
      const body=animation(act,direction,i);
      const colour=colourFor(view,i);
      const tint=tintFor(colour), x=worldX(cook.x),y=worldY(cook.y);
      const cookBegin=pool.used;
      place(body,x,y,'root',1,undefined,true);
      place(animation(maskNames.get(act) ?? '',direction,i),x,y,'root',1,tint,true);
      const head=body?.frame.anchors.head, origin=body?.frame.anchors.root;
      if(head && origin) {
        const cached=headFrames[i],name=heads?.[cook.id] ?? 'cap';
        if(cached){if(cached.name!==name){cached.name=name;for(let d=0;d<DIRECTIONS.length;d++){const id=`head-${name}-${DIRECTIONS[d] ?? 'e'}`;cached.frames[d]=assets.frames.get(id);cached.masks[d]=assets.frames.get(id+'-mask');}}
          place(cached.frames[cook.facing],x+head[0]-origin[0],y+head[1]-origin[1],'head',1,undefined,true);
          place(cached.masks[cook.facing],x+head[0]-origin[0],y+head[1]-origin[1],'head',1,tint,true);
        }
      }
      for(let slot=cookBegin;slot<pool.used;slot++){const n=pool.entries[slot];if(n)setDepth(n,y*10+(slot-cookBegin)*0.1);}
    }
    drawItems();
    for(let stationIndex=0;stationIndex<view.stations.length;stationIndex++){const s=view.stations[stationIndex];if(s?.fire){const fire=place(fireFrames[motion.matches?0:Math.floor(view.tick/60*(fireAnimation?.fps ?? 0))%fireFrames.length],worldX(s.tile%view.level.width)+TILE-21,worldY(Math.floor(s.tile/view.level.width))+34,'origin',1,undefined,false,-10000-s.tile);if(fire)setDepth(fire,19999.5);}}
    panels.update(view,motion.matches);
    if((import.meta as ImportMeta & {env:{DEV:boolean}}).env.DEV){
      if(publishedCards!==panels.vm.count){root.dataset.trCards=String(panels.vm.count);publishedCards=panels.vm.count;}
      if(panels.vm.dirty){const hud=`[${String(panels.vm.seconds)},${String(panels.vm.score)},${String(panels.vm.tips)},${String(panels.vm.stars)}]`;if(root.dataset.trHud!==hud)root.dataset.trHud=hud;}
      if(publishedOverflow!==pool.overflow){root.dataset.trPoolOverflow=String(pool.overflow);publishedOverflow=pool.overflow;}
    }
    for(let i=0;i<Math.max(previousUsed,pool.used);i++){const n=pool.entries[i];if(n){n.sprite.visible=i<pool.used;if(i<pool.used&&n.sprite.zIndex!==n.depth)n.sprite.zIndex=n.depth;if(i>=pool.used&&n.sprite.parent)stage.removeChild(n.sprite);}}
    // Only active pool nodes remain attached; Pixi sorting stays disabled.
    stage.sortableChildren=false;
    // Sort only if their current order is no longer valid.
    let ordered=true;for(let i=1;i<stage.children.length;i++){const a=stage.children[i-1],b=stage.children[i];if(a&&b&&a.zIndex>b.zIndex){ordered=false;break;}}
    if(!ordered)stage.children.sort(depthOrder);

  }
  let pinned:number|undefined;
  if((import.meta as ImportMeta & {env:{DEV:boolean}}).env.DEV)Object.assign(root,{__trClock(ms:number|undefined){pinned=ms;}});
  function render(now:number) {
    if(pinned!==undefined)now=publishedAt+pinned;
    if(destroyed) return;
    const alpha=motion.matches?1:Math.min(1,(now-publishedAt)/(1000/60));
    for(let i=0;i<pool.used;i++) {
      const n=pool.entries[i];if(!n)continue;
      n.sprite.position.set(cookPosition(n.oldX,n.x,alpha,n.controlled),cookPosition(n.oldY,n.y,alpha,n.controlled));
    }
    panels.render(view.tick+(now-publishedAt)*60/1000,motion.matches);
    app.render(); frame=requestAnimationFrame(render);
  }
  if((import.meta as ImportMeta & {env:{DEV:boolean}}).env.DEV)root.dataset.trPoolCapacity=String(pool.entries.length);
  root.style.background=THEMES.console.background.colour;
  root.style.height="100%";
  update(initial);
  await app.renderer.prepare.upload([...Array.from(assets.frames.values(), packed => packed.texture),...panels.textures]);
  app.render(); // upload and draw every active texture before readiness
  frame=requestAnimationFrame(render);
  return { update, destroy() { destroyed=true; cancelAnimationFrame(frame); app.destroy(true,{children:true}); panels.destroy(); backgroundTexture?.destroy(true); assets.destroy(); }, capacity: pool.entries.length };
}
