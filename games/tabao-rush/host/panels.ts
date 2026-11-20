/* eslint-disable @typescript-eslint/prefer-for-of -- Indexed hot loops avoid iterator allocation. */
import { fittedText, nameText, displayName, rejectionText, nameInset } from './text';
import { cueLayout, drawCue, hasCue, levelBox, rejectionBox, markerPosition, markerBand, filledCells, placeCue, cuePulse } from './station-cue';
import { Container, Sprite, Texture } from 'pixi.js';
import { THEMES } from '../../../packages/ui/src/themes';
import { ON_COLOUR, SEAT_NUMERAL, SHAPE_BUTTONS } from '../../../packages/ui/src/colour';
import { fontStack, tvType } from '../../../packages/ui/src/type';
import { duration, exitDuration, bezierAt, bezier, POPOVER_START_SCALE, PULSE_SCALE } from '../../../packages/ui/src/motion-tokens';
import { projectX, projectY, orderUrgency, TILE, DEPTH } from './model';
import type { View } from './model';
import type { Assets } from './assets';
import { RECIPE_LABELS, ViewModel, playerFor, colourFor } from './view-model';
const theme=THEMES['tabao-rush'];
export const MARKER_RADIUS=19.5,MARKER_LINE_WIDTH=3,MARKER_OUTER_RADIUS=MARKER_RADIUS+MARKER_LINE_WIDTH/2,MARKER_NUMERAL_SIZE=34;
export const CARD_LAYOUT={x:55,y:881,width:178,height:144,gap:13};
const CARD=CARD_LAYOUT.width,GAP=CARD_LAYOUT.gap,HEIGHT=CARD_LAYOUT.height,STATION_WIDTH=TILE;
export function hudPanelBox(out:{x:number;y:number;width:number;height:number},right:number,width:number){out.x=right-width;out.y=923;out.width=width;out.height=102;}
export function hudPanelWidth(ctx:CanvasRenderingContext2D,value:string,label:string,secondary=''):number {
  ctx.font=`55px ${fontStack.display}`;const width=ctx.measureText(value).width;
  ctx.font=`34px ${fontStack.body}`;
  return Math.ceil(Math.max(width,ctx.measureText(label).width,ctx.measureText(secondary).width))+2*34;
}
const hudWidths=[377,377,377],hudHeights=[102,102,102];
const entranceCurve=Array.from({length:duration.base+1},(_,i)=>bezierAt(bezier.out,i/duration.base));
const moveCurve=Array.from({length:duration.base+1},(_,i)=>bezierAt(bezier.inOut,i/duration.base));
const exitCurve=Array.from({length:duration.base+1},(_,i)=>bezierAt(bezier.in,i/duration.base));
function raster(width:number,height:number){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  const texture=Texture.from(canvas);
  // Pixi sprites subscribe to frame/UV updates only for dynamic textures. Source uploads alone
  // leave the rendered quad using the old width while getBounds reads the new orig width.
  texture.dynamic=true;const sprite=new Sprite(texture);
  return {canvas,ctx,texture,sprite};
}
export function paper(ctx:CanvasRenderingContext2D,w:number,h:number){
  ctx.clearRect(0,0,w,h);const gradient=ctx.createLinearGradient(0,0,w,h);gradient.addColorStop(0,theme.panel.from);gradient.addColorStop(1,theme.panel.to);
  ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(0,0,w,h,13);ctx.fill();ctx.strokeStyle=theme.panel.edge.colour;ctx.lineWidth=theme.panel.edge.width;ctx.setLineDash([8,5]);ctx.beginPath();ctx.roundRect(0,0,w,h,13);ctx.stroke();ctx.setLineDash([]);
}
function text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size:number,width:number,display=false){ctx.fillStyle=theme.panel.ink;fittedText(ctx,value,x,y,size,width,display);}
/** Fix the texture view while retaining its preallocated canvas/source. */
export function setHudWidth(texture:Texture,width:number){texture.noFrame=false;texture.frame.width=width;texture.orig.width=width;texture.update();}
/** Separate raster regions. Position/scale changes never upload text again. */
export function createPanels(stage:Container,assets:Assets,stationCount:number){
  const layer=new Container();stage.addChild(layer);layer.zIndex=100000;
  const vm=new ViewModel();
  const cueGeometries=new Map(Array.from(assets.frames,([id,packed])=>[id.replace(/^station-/,''),cueLayout(packed.frame.anchors)]));
  const defaultGeometry=cueLayout();
  const layoutWidths=new Float64Array(3);
  let hudX=1920-55-178-178-233-2*13;
  const hud=Array.from({length:3},(_,i)=>{const w=hudWidths[i] ?? 178,h=hudHeights[i] ?? 102;const region=raster(w,h);layer.addChild(region.sprite);region.sprite.pivot.set(w/2,h/2);region.sprite.position.set(hudX+w/2,1080-55-h/2);hudX+=w+13;return {...region,drawnWidth:0,drawnBox:{x:0,y:0,width:0,height:0}};});
  const cards=Array.from({length:12},()=>{const region=raster(CARD,HEIGHT);const group=new Container();const icon=new Sprite();group.addChild(region.sprite,icon);layer.addChild(group);group.visible=false;return {...region,sprite:group,icon,id:-1,kitchen:'',dish:'',patience:-1,warning:false,urgency:-1,seen:false,exiting:false,arrival:0,fromX:0,fromY:0,toX:0,toY:0,moved:0,exitAt:0};});
  const stations=Array.from({length:stationCount},()=>{const region=raster(STATION_WIDTH,TILE*DEPTH);stage.addChild(region.sprite);const cue=raster(TILE,TILE*DEPTH);stage.addChild(cue.sprite);cue.sprite.zIndex=20000;const note=raster(377,144);stage.addChild(note.sprite);note.sprite.zIndex=20002;return {...region,cue,note,geometry:cueLayout(),worldCue:cueLayout(),noteBox:{x:0,y:0,width:0,height:0},cells:-1,nameLevel:undefined as View['level']|undefined,nameTile:-1,nameType:'',notePending:false,doneAt:-1000,noteWidth:0,noteHeight:0,status:'',fire:false,warning:false,rejection:'',rejectionRef:null as View['stations'][number]['rejection'],tile:-1,type:''};});
  const seats=Array.from({length:8},()=>{const region=raster(55,55);stage.addChild(region.sprite);region.sprite.zIndex=30000;return {...region,colour:'',seat:-1};});
  const pops=Array.from({length:12},()=>{const r=raster(377,55);layer.addChild(r.sprite);r.sprite.visible=false;return {...r,step:-1000,kitchen:'',order:-1,x:0,y:0};});
  const obstacles=Array.from({length:23+2*stationCount},()=>({x:-10000,y:-10000,width:0,height:0}));
  const screenBounds={x:5,y:5,width:1910,height:1070};
  let bounds=levelBox(1,1),band=-Infinity;
  let currentView:View|undefined;
  let level:View['level']|undefined;
  let hudSeconds=-1,hudScore=-1,hudStars=-1,servedAt=-1000,triggerX=0,triggerY=0,tick=0;
  function fitHud(index:number,value:string,label:string,secondary=''){
    const r=hud[index];if(!r)return;
    const width=hudPanelWidth(r.ctx,value,label,secondary);
    r.drawnWidth=width;layoutWidths[index]=width;setHudWidth(r.texture,width);
    let x=1920-55;for(let i=hud.length-1;i>=0;i--){const panel=hud[i];if(!panel)continue;const w=panel.texture.frame.width;panel.sprite.pivot.set(w/2,panel.canvas.height/2);panel.sprite.position.set(x-w/2,1080-55-panel.canvas.height/2);hudPanelBox(panel.drawnBox,x,w);x-=w+13;}
  }
  function update(view:View,reduced:boolean){
    layer.visible = view.phase !== 'tutorial';
    const levelChanged=level!==view.level;
    currentView=view;
    if(level!==view.level||view.tick<tick){for(let cardIndex=0;cardIndex<cards.length;cardIndex++){const card=cards[cardIndex];if(!card)continue;card.sprite.visible=false;card.id=-1;}servedAt=-1000;for(let pi=0;pi<pops.length;pi++){const pop=pops[pi];if(pop){pop.sprite.visible=false;pop.step=-1000;}}}
    vm.update(view);tick=view.tick;
    if(level!==view.level){level=view.level;bounds=levelBox(level.width,level.height);let serving=0;for(let i=0;i<level.tiles.length;i++){const tile=level.tiles[i];if(tile?.kind==='station'&&tile.stationType==='serving'){serving=i;break;}}triggerX=projectX(serving%level.width+0.5,level.width);triggerY=projectY(Math.floor(serving/level.width)+0.5,level.height);}
    for(let eventIndex=0;eventIndex<view.orderEvents.length;eventIndex++){const event=view.orderEvents[eventIndex];if(event?.type==='served')servedAt=event.step;}
    if(hudSeconds!==vm.seconds){const r=hud[0];if(r){fitHud(0,`${String(Math.floor(vm.seconds/60))}:${String(vm.seconds%60).padStart(2,'0')}`,'Time');paper(r.ctx,r.texture.frame.width,102);text(r.ctx,'Time',34,34,34,110);text(r.ctx,`${String(Math.floor(vm.seconds/60))}:${String(vm.seconds%60).padStart(2,'0')}`,34,89,55,r.texture.frame.width-68,true);r.texture.source.update();}hudSeconds=vm.seconds;}
    if(hudScore!==vm.score){const r=hud[1];if(r){fitHud(1,String(vm.score),'Score');paper(r.ctx,r.texture.frame.width,102);text(r.ctx,'Score',34,34,34,110);text(r.ctx,String(vm.score),34,89,55,r.texture.frame.width-68,true);r.texture.source.update();}hudScore=vm.score;}
    if(hudStars!==vm.stars){const r=hud[2];if(r){fitHud(2,'★★★','Stars');paper(r.ctx,r.texture.frame.width,102);text(r.ctx,'Stars',34,34,34,165);for(let i=0;i<3;i++){r.ctx.globalAlpha=i<vm.stars?1:0.3;text(r.ctx,'★',34+i*(r.texture.frame.width-68)/3,89,55,(r.texture.frame.width-68)/3,true);}r.ctx.globalAlpha=1;r.texture.source.update();}hudStars=vm.stars;}
    for(let i=0;i<cards.length;i++){const card=cards[i];if(card)card.seen=false;}
    let index=0;
    for(let ki=0;ki<view.kitchens.length;ki++){const kitchen=view.kitchens[ki];if(!kitchen)continue;for(let oi=0;oi<kitchen.orders.length;oi++){const order=kitchen.orders[oi];if(!order)continue;
      if(index>=6)break;
      let card:typeof cards[number]|undefined;for(let ci=0;ci<cards.length;ci++){const candidate=cards[ci];if(candidate?.id===order.id&&candidate.kitchen===kitchen.id&&candidate.dish===order.dish&&!candidate.seen){card=candidate;break;}}
      if(!card){for(let ci=0;ci<cards.length;ci++){const candidate=cards[ci];if(candidate?.sprite.visible===false){card=candidate;break;}}if(!card)continue;card.id=order.id;card.kitchen=kitchen.id;card.dish=order.dish;card.icon.visible=false;card.patience=-1;card.arrival=order.arrivalStep;card.fromX=triggerX;card.fromY=triggerY;card.toX=55+index*(CARD+GAP);card.toY=1080-55-HEIGHT;card.moved=order.arrivalStep;card.exiting=false;}
      const x=55+index*(CARD+GAP),y=1080-55-HEIGHT;index++;card.seen=true;
      if(card.toX!==x||card.toY!==y){card.fromX=card.sprite.x;card.fromY=card.sprite.y;card.toX=x;card.toY=y;card.moved=tick;}
      card.sprite.visible=true;
      const patience=Math.ceil(order.remaining/order.total*89),urgency=orderUrgency(order.remaining,order.total);
      if(card.patience!==patience||card.urgency!==urgency){
        paper(card.ctx,CARD,HEIGHT);const recipe=RECIPE_LABELS.get(order.dish);
        text(card.ctx,recipe?.name ?? order.dish,8,34,34,CARD-16,true);
        card.ctx.fillStyle=theme.panel.ink;fittedText(card.ctx,recipe?.steps ?? '',8,89,21,CARD-55,false,tvType.label);
        if(urgency===2){const c=card.ctx,x=CARD-34-8,y=HEIGHT-55;c.strokeStyle=theme.panel.ink;c.lineWidth=5;c.beginPath();c.moveTo(x+17,y);c.lineTo(x+34,y+34);c.lineTo(x,y+34);c.closePath();c.stroke();c.beginPath();c.moveTo(x+17,y+8);c.lineTo(x+17,y+21);c.stroke();c.fillStyle=theme.panel.ink;c.fillRect(x+15,y+26,5,5);}
        card.ctx.fillStyle=THEMES.console.panel.edge.colour;card.ctx.fillRect(8,HEIGHT-21,CARD-16,13);
        card.ctx.fillStyle=urgency===2?SHAPE_BUTTONS.cross.colour:urgency===1?SHAPE_BUTTONS.square.colour:SHAPE_BUTTONS.triangle.colour;
        card.ctx.fillRect(8,HEIGHT-21,(CARD-16)*patience/89,13);
        card.texture.source.update();card.patience=patience;card.warning=order.warning;card.urgency=urgency;
      }
    }
    }
    for(let ei=0;ei<view.orderEvents.length;ei++){
      const event=view.orderEvents[ei];if(event?.type!=='served')continue;
      let known=false;for(let pi=0;pi<pops.length;pi++){const pop=pops[pi];if(pop?.step===event.step&&pop.kitchen===event.kitchen&&pop.order===event.order)known=true;}
      if(known)continue;
      for(let pi=0;pi<pops.length;pi++){const pop=pops[pi];if(!pop||pop.sprite.visible)continue;
        pop.step=event.step;pop.kitchen=event.kitchen;pop.order=event.order;pop.x=55;pop.y=1080-55-HEIGHT;
        for(let ci=0;ci<cards.length;ci++){const card=cards[ci];if(card?.id===event.order&&card.kitchen===event.kitchen){pop.x=card.toX;pop.y=card.toY;break;}}
        pop.ctx.clearRect(0,0,377,55);pop.ctx.fillStyle=theme.panel.ink;pop.ctx.font=`bold 34px ${fontStack.body}`;
        pop.ctx.fillText(`+${String(event.points)}${event.tip?` · tip +${String(event.tip)}`:''}`,0,34);
        pop.texture.source.update();pop.sprite.visible=true;break;
      }
    }
    for(let ci=0;ci<cards.length;ci++){const card=cards[ci];if(card&&card.sprite.visible&&!card.seen&&!card.exiting){card.exiting=true;card.exitAt=tick;card.fromX=card.sprite.x;card.fromY=card.sprite.y;}}
    for(let i=0;i<stations.length;i++){
      const r=stations[i],station=view.stations[i];if(!r)continue;r.sprite.visible=!!station;if(!station){r.cue.sprite.visible=false;r.note.sprite.visible=false;continue;}
      const rejection=station.rejection===r.rejectionRef?r.rejection:station.rejection?rejectionText(station.rejection):'';
      r.rejectionRef=station.rejection;
      if(r.nameLevel!==view.level||r.nameTile!==station.tile||r.nameType!==station.type){
        const left=nameInset(view.level,station.tile,-1),right=nameInset(view.level,station.tile,1),name=displayName(station.type);
        r.ctx.clearRect(0,0,STATION_WIDTH,TILE*DEPTH);
        r.ctx.fillStyle=THEMES.console.chip.fill;r.ctx.fillRect(0,68,TILE,34);r.ctx.fillStyle=ON_COLOUR;nameText(r.ctx,name,left,100,TILE-left-right,1);
        r.texture.source.update();r.nameLevel=view.level;r.nameTile=station.tile;r.nameType=station.type;
      }
      const cells=filledCells(station.status,station.total?station.progress/station.total:0);
      if(levelChanged||r.type!==station.type||r.status!==station.status||r.fire!==station.fire||r.cells!==cells){
        if(station.status==='done'&&r.status!==''&&r.status!=='done'&&!levelChanged)r.doneAt=tick;else if(levelChanged||r.status==='')r.doneAt=-1000;
        const geometry=cueGeometries.get(station.type);
        r.geometry=geometry ?? defaultGeometry;
        drawCue(r.cue.ctx,r.geometry,station.status,station.fire,station.total?station.progress/station.total:0);r.cue.texture.source.update();
        r.status=station.status;r.fire=station.fire;r.cells=cells;r.type=station.type;
      }
      if(r.rejection!==rejection){
        r.note.ctx.clearRect(0,0,377,144);if(rejection){
          r.note.ctx.font=`34px ${fontStack.body}`;
          r.noteWidth=Math.min(377,Math.ceil(r.note.ctx.measureText(rejection).width)+26);r.noteHeight=r.noteWidth<377?55:102;
          paper(r.note.ctx,r.noteWidth,r.noteHeight);text(r.note.ctx,rejection,13,34,34,r.noteWidth-26);setHudWidth(r.note.texture,r.noteWidth);
          r.note.texture.frame.height=r.noteHeight;r.note.texture.orig.height=r.noteHeight;r.note.texture.update();
        }
        r.note.texture.source.update();r.rejection=rejection;r.notePending=!!rejection;
      }
      const column=station.tile%view.level.width;
      r.sprite.position.set(projectX(column,view.level.width),projectY(Math.floor(station.tile/view.level.width),view.level.height));r.sprite.zIndex=(r.sprite.y+TILE*DEPTH/2)*10;
      r.cue.sprite.visible=hasCue(station.type,station.total);
      const g=r.geometry;
      placeCue(r.worldCue,g,r.sprite.x,r.sprite.y,station.tile<view.level.width?screenBounds:bounds);
      const pivotX=g.bar.x+g.bar.width/2,pivotY=(g.bar.y+g.bar.height-g.plaque.y)/2;
      r.cue.sprite.pivot.set(pivotX,pivotY);r.cue.sprite.position.set(r.worldCue.bar.x+g.bar.width/2,r.worldCue.plaque.y+pivotY);
      r.note.sprite.visible=!!station.rejection;
      r.tile=station.tile;

    }
    if(levelChanged)band=markerBand(stations,view.level.width);
    for(let i=0;i<seats.length;i++){const r=seats[i],cook=view.cooks[i];if(!r)continue;r.sprite.visible=!!cook;if(!cook)continue;
      const player=playerFor(view,cook.id),colour=colourFor(view,i),seat=player?.seat ?? i+1;
      if(colour!==r.colour||seat!==r.seat){r.ctx.clearRect(0,0,55,55);r.ctx.fillStyle=colour;r.ctx.beginPath();r.ctx.arc(55/2,55/2,MARKER_RADIUS,0,Math.PI*2);r.ctx.fill();r.ctx.strokeStyle=THEMES.console.panel.ink;r.ctx.lineWidth=MARKER_LINE_WIDTH;r.ctx.stroke();r.ctx.fillStyle=SEAT_NUMERAL;r.ctx.font=`bold ${String(MARKER_NUMERAL_SIZE)}px ${fontStack.body}`;r.ctx.textAlign='center';const numeral=String(seat),glyph=r.ctx.measureText(numeral);r.ctx.fillText(numeral,55/2,55/2+(glyph.actualBoundingBoxAscent-glyph.actualBoundingBoxDescent)/2);r.texture.source.update();r.colour=colour;r.seat=seat;}
      const markerY=projectY(cook.y,view.level.height)-144+55/2;
      const marker=markerPosition(markerY,band);
      r.sprite.position.set(projectX(cook.x,view.level.width)-55/2,marker-55/2);
      r.sprite.zIndex=30000+projectY(cook.y,view.level.height);
    }
    render(tick,reduced);
  }
  function positionNotes(){
    const view=currentView;if(!view)return;
    for(let i=0;i<stations.length;i++){const r=stations[i];if(!r)continue;
      if(r.note.sprite.visible&&r.notePending){
        for(let oi=0;oi<obstacles.length;oi++){const box=obstacles[oi];if(!box)continue;
          const card=oi<12?cards[oi]:undefined,h=oi>=12&&oi<15?hud[oi-12]:undefined,cook=oi>=15&&oi<23?view.cooks[oi-15]:undefined;
          const cue=oi>=23&&oi<23+stations.length?stations[oi-23]:undefined;
          const counter=oi>=23+stations.length?view.stations[oi-23-stations.length]:undefined;
          if(counter){box.x=projectX(counter.tile%view.level.width+0.5,view.level.width)+21-34;box.y=projectY(Math.floor(counter.tile/view.level.width)+0.5,view.level.height)-34-34;box.width=68;box.height=68;continue;}
          if(cue?.cue.sprite.visible){const p=cue.worldCue.plaque,b=cue.worldCue.bar,cx=b.x+b.width/2,cy=(p.y+b.y+b.height)/2;box.x=cx-b.width*PULSE_SCALE/2;box.y=cy-(b.y+b.height-p.y)*PULSE_SCALE/2;box.width=b.width*PULSE_SCALE;box.height=(b.y+b.height-p.y)*PULSE_SCALE;continue;}
          box.x=card?.sprite.visible?card.sprite.x:h?h.sprite.x-h.texture.frame.width*(h.sprite.scale.x||1)/2:cook?projectX(cook.x,view.level.width)-34:-10000;
          box.y=card?.sprite.visible?card.sprite.y:h?h.sprite.y-51*(h.sprite.scale.y||1):cook?projectY(cook.y,view.level.height)-144:-10000;
          box.width=card?.sprite.visible?CARD:h?h.texture.frame.width*(h.sprite.scale.x||1):cook?68:0;box.height=card?.sprite.visible?HEIGHT:h?102*(h.sprite.scale.y||1):cook?144:0;
        }
        rejectionBox(r.noteBox,bounds,r.tile,view.level.width,view.level.height,r.noteWidth,r.noteHeight,obstacles);
        r.note.sprite.position.set(r.noteBox.x,r.noteBox.y);r.notePending=false;
      }
    }
  }
  function render(nowTick:number,reduced:boolean){
    for(let cardIndex=0;cardIndex<cards.length;cardIndex++){const card=cards[cardIndex];if(!card)continue;if(!card.sprite.visible)continue;
      const elapsed=(nowTick-(card.exiting?card.exitAt:card.moved))*1000/60;
      const progress=reduced?1:Math.max(0,Math.min(1,elapsed/(card.exiting?exitDuration('base'):duration.base)));
      const curve=card.exiting?exitCurve:card.arrival===card.moved?entranceCurve:moveCurve;
      const ease=curve[Math.round(progress*duration.base)] ?? 1;
      const x=card.exiting?triggerX:card.toX,y=card.exiting?triggerY:card.toY;
      card.sprite.position.set(card.fromX+(x-card.fromX)*ease,card.fromY+(y-card.fromY)*ease);
      card.sprite.scale.set(card.exiting?1-(1-POPOVER_START_SCALE)*ease:card.arrival===card.moved?POPOVER_START_SCALE+(1-POPOVER_START_SCALE)*ease:1);
      card.sprite.alpha=card.exiting?1-ease:1;
      if(card.exiting&&progress===1){card.sprite.visible=false;card.id=-1;}
    }
    for(let pi=0;pi<pops.length;pi++){const pop=pops[pi];if(!pop?.sprite.visible)continue;
      const elapsed=(nowTick-pop.step)*1000/60,progress=Math.max(0,Math.min(1,elapsed/duration.slow));
      const ease=entranceCurve[Math.round(progress*duration.base)] ?? 1;
      pop.sprite.position.set(pop.x,1080-55-HEIGHT-55+(reduced?0:21*(1-ease)));pop.sprite.alpha=reduced?1:Math.max(0,1-(elapsed-duration.slow-1000)/exitDuration('base'));
      if(elapsed>=(reduced?1000:duration.slow+1000+exitDuration('base')))pop.sprite.visible=false;
    }
    const age=(nowTick-servedAt)*1000/60/duration.base;
    hud[1]?.sprite.scale.set(reduced||age<0||age>=1?1:1+(PULSE_SCALE-1)*Math.sin(age*Math.PI));
    for(let si=0;si<stations.length;si++){const station=stations[si];if(!station)continue;
      station.cue.sprite.scale.set(cuePulse(station.status==='done'?(nowTick-station.doneAt)*1000/60:-1,reduced));
    }
    positionNotes();
  }
  return {update,render,vm,hud,stations,layoutWidths,textures:[...pops.map(r=>r.texture),...hud.map(r=>r.texture),...cards.map(r=>r.texture),...stations.flatMap(r=>[r.texture,r.cue.texture,r.note.texture]),...seats.map(r=>r.texture)],destroy(){for(const r of pops)r.texture.destroy(true);for(const r of hud)r.texture.destroy(true);for(const r of cards)r.texture.destroy(true);for(const r of stations){r.texture.destroy(true);r.cue.texture.destroy(true);r.note.texture.destroy(true);}for(const r of seats)r.texture.destroy(true);}};
}
