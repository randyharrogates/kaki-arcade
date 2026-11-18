import { resultsBoard, updateResultBest } from './results';
import { must } from '../src/rules/invariant';
import { perpendicularArcPoint, bezierAt, bezier, cardTurnAt, duration, pulse, SEAT_NUMERAL, tv, space, EDGE_WIDTH, radius, fontStack, cardLift } from '../../../packages/ui/src/index';
import { SWAP_SECONDS } from '../src/rules/round';
import type { CardDeck } from './assets';
import { prepareTable } from './ready';
import { CARD, GRID, screenModel } from './view-model';
import type { PokerPublicView, ScreenModel } from './view-model';
import './screen.css';

export const SWAP_MS = SWAP_SECONDS * 1000;
export interface TableLayout { grid: {x:number;y:number}; shared: {x:number;y:number}[]; edge:string; shadow:string }
const defaultLayout:TableLayout={grid:{x:0,y:0},shared:[],edge:SEAT_NUMERAL,shadow:SEAT_NUMERAL};
const arcScratch={x:0,y:0};
/** Bound the entire sprite, including its shadow border, within the grid's side gaps.
 * The straight path stays inside the endpoint rectangle; reserve the remaining
 * clearance for each component of the perpendicular bow. */
export function swapArcHeight(card:ScreenModel['grid'][number], rows:boolean, progress=0.5) {
  const dx=card.destination.x-card.point.x,dy=card.destination.y-card.point.y;
  const length=Math.hypot(dx,dy);
  const horizontal=space[55]-(CARD.width-CARD.contentWidth)/2;
  const vertical=space[55]-(CARD.height-CARD.contentHeight)/2;
  const height=Math.min(rows ? space[55] : space[233],
    dy ? horizontal*length/Math.abs(dy) : Infinity,
    dx ? vertical*length/Math.abs(dx) : Infinity);
  // Hold the row bow near its clearance limit while the staggered rows cross.
  return rows && progress>0 && progress<1 ? height*Math.min(1,4*Math.sin(Math.PI*progress))/Math.sin(Math.PI*progress) : height;
}
function sprite(ctx:CanvasRenderingContext2D,deck:CardDeck,id:string,x:number,y:number) {
  const frame=deck.frames.get(id);
  if(frame) ctx.drawImage(frame,x-CARD.width/2,y-CARD.height/2,CARD.width,CARD.height);
}
const flipKeys=['card-flip-0','card-flip-1','card-flip-2','card-flip-3','card-flip-4'] as const;
const markFont=`700 ${String(space[34])}px ${fontStack.body}`;
const labelFont=`${String(space[34])}px ${fontStack.body}`;
const turnOptions={reduced:false};
const turnScratch={side:'back' as 'back'|'face',width:1};
function moving(model:ScreenModel,card:ScreenModel['grid'][number]) {return model.phase === 'swap' && (card.point.x !== card.destination.x || card.point.y !== card.destination.y);}
export function swapProgress(card:ScreenModel['grid'][number], rows:boolean, elapsed:number) {
  return bezierAt(bezier.inOut,Math.max(0,Math.min(1,(elapsed-(rows && card.destination.y<card.point.y ? SWAP_MS*0.2 : 0))/(SWAP_MS*(rows ? 0.8 : 1)))));
}
export function handsClip(elapsed:number,reduced:boolean) {
  const p=reduced ? 1 : bezierAt(bezier.inOut,Math.max(0,Math.min(1,(elapsed-duration.slow/2)/(duration.slow/2))));
  return `inset(0 0 ${String((1-p)*100)}% 0)`;
}
function paintCard(ctx:CanvasRenderingContext2D,model:ScreenModel,previous:ScreenModel,deck:CardDeck,elapsed:number,reduced:boolean,layout:TableLayout,card:ScreenModel['grid'][number]) {
  const hide=previous.phase === 'memorise' && model.phase !== 'memorise' && !model.reveal;
  const reveal=model.reveal && !previous.reveal;
  const rows=model.swap?.kind === 'rows';
  const progress=reduced ? 1 : swapProgress(card,rows,elapsed);
  let x=card.point.x,y=card.point.y;
  if(moving(model,card)) {const p=perpendicularArcPoint(card.point,card.destination,progress,swapArcHeight(card,rows,progress),arcScratch);x=p.x;y=p.y;}
  x+=layout.grid.x;y+=layout.grid.y;
  const lift=rows && moving(model,card) && card.destination.y<card.point.y && progress>0 && progress<1 ? Math.sin(Math.PI*progress) : 0;
  if(lift) {
    ctx.save();ctx.globalAlpha=cardLift.shadowAlpha*lift;ctx.fillStyle=layout.shadow;
    ctx.translate(x,y+cardLift.shadowY);ctx.scale(cardLift.shadowScale,cardLift.shadowScale);
    ctx.beginPath();ctx.roundRect(-CARD.contentWidth/2,-CARD.contentHeight/2,CARD.contentWidth,CARD.contentHeight,radius.corner);ctx.fill();ctx.restore();
    ctx.save();ctx.translate(x,y);ctx.scale(1+(cardLift.scale-1)*lift,1+(cardLift.scale-1)*lift);ctx.translate(-x,-y);
  }
  const turning=(hide || reveal) && !reduced && elapsed<duration.slow;
  const angular=bezierAt(bezier.inOut,Math.min(1,elapsed/duration.slow));
  const sample=Math.round((hide ? angular : 1-angular)*4);
  const turn=cardTurnAt(1-sample/4,turnOptions,turnScratch);
  sprite(ctx,deck,turning ? must(flipKeys[sample]) : card.frame,x,y);
  if((turning && turn.side === 'face' && turn.width>0) || (!turning && model.reveal)) {
    ctx.save();ctx.translate(x,y-(turning ? 6*Math.sin(Math.PI*sample/4) : 0));ctx.scale(turning ? turn.width : 1,1);
    ctx.beginPath();ctx.roundRect(-CARD.contentWidth/2,-CARD.contentHeight/2,CARD.contentWidth,CARD.contentHeight,radius.corner);ctx.clip();
    if(turning) {const face=deck.faces.get(hide ? must(previous.grid[card.index]).frame : card.frame);if(face) ctx.drawImage(face,-CARD.width/2,-CARD.height/2,CARD.width,CARD.height);}
    if(model.reveal) for(let i=0;i<card.marks.length;i++) {
      const player=must(card.marks[i]),columns=Math.min(4,card.marks.length),w=CARD.contentWidth/columns;
      const left=-CARD.contentWidth/2+(i%4)*w,top=CARD.contentHeight/2-space[34]*(card.marks.length>4 ? 2 : 1)+Math.floor(i/4)*space[34];
      ctx.fillStyle=player.colour;ctx.fillRect(left,top,w,space[34]);ctx.fillStyle=SEAT_NUMERAL;ctx.font=markFont;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(player.seat),left+w/2,top+space[34]/2);
    }
    ctx.restore();
  }
  if(lift) ctx.restore();
  if(reduced && moving(model,card) && elapsed<SWAP_MS) {
    ctx.strokeStyle=layout.edge;ctx.lineWidth=EDGE_WIDTH;ctx.strokeRect(x-CARD.contentWidth/2-EDGE_WIDTH,y-CARD.contentHeight/2-EDGE_WIDTH,CARD.contentWidth+2*EDGE_WIDTH,CARD.contentHeight+2*EDGE_WIDTH);
    const top=y+CARD.contentHeight/2-space[55];
    ctx.fillStyle=layout.edge;ctx.fillRect(x-CARD.contentWidth/2,top,CARD.contentWidth,space[55]);ctx.fillStyle=SEAT_NUMERAL;ctx.font=labelFont;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Swapped',x,top+space[55]/2,CARD.contentWidth-2*space[8]);
  }
}
export function drawTable(ctx:CanvasRenderingContext2D,model:ScreenModel,previous:ScreenModel,deck:CardDeck,elapsed:number,reduced:boolean,layout=defaultLayout) {
  ctx.clearRect(0,0,tv.width,tv.height);
  for(let i=0;i<model.shared.length;i++) {const p=layout.shared[i];if(p) sprite(ctx,deck,must(model.shared[i]),p.x,p.y);}
  for(let pass=0;pass<3;pass++) for(const card of model.grid) {
    const layer=!moving(model,card) ? 0 : model.swap?.kind === 'rows' && card.destination.y<card.point.y ? 2 : 1;
    if(layer === pass) paintCard(ctx,model,previous,deck,elapsed,reduced,layout,card);
  }
}
export function fitName(ctx:Pick<CanvasRenderingContext2D,'measureText'>, name:string, available:number) {
  if(ctx.measureText(name).width <= available) return name;
  let end=name.length;
  while(end && ctx.measureText(`${name.slice(0,end)}…`).width > available) end--;
  return end ? `${name.slice(0,end)}…` : '';
}
/** Drawing key: phase/round/totalRounds/seconds; grid and shared card codes;
 * swap kind/from/to; player id/name/seat/colour/score/waiting/locked/picks; soloBest/newBest; hand
 * id/name/points and ordering. These feed screenModel, canvas and mounted rows.
 * Hand.cards and other simulation metadata are not drawn. Keep this list and
 * the field-mutation test aligned when the table gains visible fields. */
export function sameTable(a:PokerPublicView|undefined,b:PokerPublicView):boolean {
  if(a === b) return true;
  if(!a) return false;
  if(a.soloBest !== b.soloBest || a.newBest !== b.newBest) return false;
  if(a.phase !== b.phase || a.round !== b.round || a.totalRounds !== b.totalRounds || a.seconds !== b.seconds || a.swap?.kind !== b.swap?.kind || a.swap?.from !== b.swap?.from || a.swap?.to !== b.swap?.to) return false;
  if((a.grid === null) !== (b.grid === null)) return false;
  for(let i=0;i<16;i++) if(a.grid?.[i] !== b.grid?.[i]) return false;
  for(let i=0;i<3;i++) if(a.shared[i] !== b.shared[i]) return false;
  if(a.players.length !== b.players.length || a.hands.length !== b.hands.length) return false;
  for(let i=0;i<a.players.length;i++) {
    const p=must(a.players[i]),q=must(b.players[i]);
    if(p.id !== q.id || p.name !== q.name || p.seat !== q.seat || p.colour !== q.colour || p.score !== q.score || p.waiting !== q.waiting || p.locked !== q.locked || p.picks?.length !== q.picks?.length) return false;
    for(let j=0;j<(p.picks?.length ?? 0);j++) if(p.picks?.[j] !== q.picks?.[j]) return false;
  }
  for(let i=0;i<a.hands.length;i++) {const p=must(a.hands[i]),q=must(b.hands[i]);if(p.id !== q.id || p.name !== q.name || p.points !== q.points) return false;}
  return true;
}
export interface ScreenOptions {view:PokerPublicView;width:number;height:number;reduced?:boolean;at?:number}
/** Mount once and feed public snapshots. Layout boxes supply canvas coordinates. */
export function PeekPokerScreen(root: HTMLElement, deck: CardDeck) {
  root.innerHTML='<div class="pp-viewport"><section class="pp-table" data-theme="peek-poker"><canvas width="1920" height="1080"></canvas><aside class="pp-players"></aside><div class="pp-grid"></div><aside class="pp-side"><h1></h1><div class="pp-shared"><p>Shared cards</p><div class="pp-shared-cards"><i></i><i></i><i></i></div></div><div class="pp-timer"><strong></strong><span></span></div><ol class="pp-hands"></ol></aside></section></div>';
  const table=must(root.querySelector<HTMLElement>('.pp-table')), canvas=must(root.querySelector('canvas')), context=must(canvas.getContext('2d'));
  const divisor=deck.divisor ?? 1;canvas.width=tv.width/divisor;canvas.height=tv.height/divisor;context.scale(1/divisor,1/divisor);
  table.style.setProperty('--pp-card-width',`${String(CARD.contentWidth)}px`);table.style.setProperty('--pp-card-height',`${String(CARD.contentHeight)}px`);
  table.style.setProperty('--pp-grid-width',`${String(GRID.width)}px`);table.style.setProperty('--pp-grid-height',`${String(GRID.height)}px`);
  const results=document.createElement('section');results.className='pp-results';table.append(results);
  const best=document.createElement('p');best.className='pp-best';table.append(best);
  const seats=must(root.querySelector('.pp-players')), hands=must(root.querySelector<HTMLElement>('.pp-hands'));
  const heading=must(root.querySelector('h1')), seconds=must(root.querySelector('.pp-timer strong')), label=must(root.querySelector('.pp-timer span'));
  const grid=must(root.querySelector<HTMLElement>('.pp-grid')), shared=[...root.querySelectorAll<HTMLElement>('.pp-shared-cards i')];
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  let last:ScreenModel|undefined, before:ScreenModel|undefined, key='', frame=0, started=0, snapshot:PokerPublicView|undefined;
  let oldWidth=0,oldHeight=0,oldQuiet=false,oldAt:number|undefined;
  let handsKey='', resultsKey='';
  const rows=new Map<string,{row:HTMLDivElement;name:HTMLSpanElement;status:HTMLSpanElement;locked:boolean}>();
  let current:ScreenOptions|undefined;
  function update(options:ScreenOptions) {
    const {view,width,height,at}=options;const quiet=options.reduced ?? media.matches;
    if(sameTable(snapshot,view) && oldWidth === width && oldHeight === height && oldQuiet === quiet && oldAt === at) return;
    current=options;oldWidth=width;oldHeight=height;oldQuiet=quiet;oldAt=at;
    const model=sameTable(snapshot,view) && last ? last : screenModel(view);snapshot=view;
    const nextKey=`${String(model.round)}:${model.phase}:${JSON.stringify(model.swap)}`;
    if(nextKey !== key || (model.phase === 'swap' && last && model.seconds > last.seconds)) {before=last ?? model;started=performance.now();key=nextKey;}
    last=model;cancelAnimationFrame(frame);
    const scale=Math.min(width/tv.width,height/tv.height);table.style.transform=`translate(-50%, -50%) scale(${String(scale)})`;table.dataset.phase=model.phase;
    best.textContent=view.soloBest !== null && view.soloBest > 0 ? `Best ${String(view.soloBest)}` : '';
    if(view.phase === 'scoreboard' || view.phase === 'over') {
      const nextResults=JSON.stringify([view.phase,view.round,view.players.map(p=>[p.id,p.name,p.seat,p.colour,p.score]),view.soloBest,quiet]);
      if(nextResults !== resultsKey) {resultsKey=nextResults;resultsBoard(results,view,quiet);} else updateResultBest(results,view,quiet);
      return;
    }
    resultsKey='';
    canvas.setAttribute('aria-label',`${model.label}: sixteen grid cards and three shared cards`);
    for(const [id,entry] of rows) if(!model.players.some(p=>p.id === id)) {entry.row.remove();rows.delete(id);}
    for(const player of model.players) {
      let entry=rows.get(player.id);
      if(!entry) {const row=document.createElement('div');row.className='pp-player';const badge=document.createElement('b');badge.className='pp-seat';badge.textContent=String(player.seat);badge.style.background=player.colour;badge.style.color=SEAT_NUMERAL;const name=document.createElement('span');name.className='pp-name';const status=document.createElement('span');row.append(badge,name,status);seats.append(row);entry={row,name,status,locked:false};rows.set(player.id,entry);}
      if(entry.name.textContent !== player.name) entry.name.textContent=player.name;
      if(entry.status.textContent !== player.status) entry.status.textContent=player.status;
      if(!quiet && !entry.locked && player.status === 'Picked') {const m=pulse({reduced:false});entry.row.animate(m.keyframes,m.options);}
      entry.locked=player.status === 'Picked';
    }
    heading.textContent=`Round ${String(model.round)} of ${String(model.totalRounds)}`;seconds.textContent=String(model.seconds);label.textContent=model.label;
    const rect=table.getBoundingClientRect();
    const point=(node:HTMLElement)=>{const r=node.getBoundingClientRect();return {x:(r.left-rect.left+r.width/2)/scale,y:(r.top-rect.top+r.height/2)/scale};};
    const handsWidth=must(hands.parentElement).getBoundingClientRect().width/scale;
    const nextHands=JSON.stringify(model.hands);
    if(nextHands !== handsKey) {handsKey=nextHands;hands.replaceChildren();context.font=getComputedStyle(hands).font;
      for(const [rank,hand] of model.hands.entries()) {const li=document.createElement('li'),name=document.createElement('span'),detail=document.createElement('span');name.className='pp-hand-name';const text=`${hand.name} · ${String(hand.points)} ${hand.points === 1 ? 'pt' : 'pts'}`;detail.textContent=text;const prefix=`${String(rank+1)}. `;name.textContent=prefix+fitName(context,hand.player?.name ?? '',handsWidth-context.measureText(text+prefix).width-space[13]);li.append(name,detail);hands.append(li);}
    }
    const gp=point(grid);const layout:TableLayout={grid:{x:gp.x-tv.width/2,y:gp.y-tv.height/2},shared:shared.map(point),edge:getComputedStyle(table).getPropertyValue('--ka-panel-edge-colour'),shadow:getComputedStyle(table).getPropertyValue('--ka-ink')};
    const draw=(now:number)=>{const elapsed=at ?? now-started;drawTable(context,model,before ?? model,deck,elapsed,quiet,layout);
      hands.style.clipPath=model.reveal && !before?.reveal ? handsClip(elapsed,quiet) : handsClip(duration.slow,true);
      if(at === undefined && elapsed < (model.phase === 'swap' ? SWAP_MS : duration.slow)) frame=requestAnimationFrame(draw);
    };draw(performance.now());
  }
  // Final snapshots can remain mounted without another simulation publication.
  const resize=()=>{if(current) update({...current,width:innerWidth,height:innerHeight});};
  window.addEventListener('resize',resize);
  const preference=()=>{if(media.matches) for(const animation of table.getAnimations({subtree:true})) animation.cancel();if(current) update(current);};media.addEventListener('change',preference);
  async function ready(options:ScreenOptions) {
    await prepareTable(deck,async()=>{
      // Keep the real rows mounted and rasterised while the host shows its loading UI.
      // Opacity zero / display:none would let Chromium skip this work.
      table.style.opacity='0.01';
      const view=options.view;
      const players=view.players.map(p=>({...p,waiting:false,locked:false}));
      update({...options,view:{...view,phase:'pick',players},at:duration.slow});
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{resolve();})));
      update({...options,reduced:false,view:{...view,phase:'pick',players:players.map(p=>({...p,locked:true}))},at:duration.slow});
      await Promise.all(table.getAnimations({subtree:true}).map(a=>a.finished));
      // Exercise the hands mask, canvas numeral glyphs and reduced swap band too.
      update({...options,view:{...view,phase:'reveal',players:players.map(p=>({...p,picks:[0,1]})),hands:players.map(p=>({id:p.id,name:'Three of a kind',points:16,cards:[]}))},at:duration.slow*0.75});
      await new Promise<void>(resolve=>requestAnimationFrame(()=>{resolve();}));
      update({...options,reduced:true,view:{...view,phase:'swap',swap:{kind:'rows',from:0,to:3}},at:0});
      await new Promise<void>(resolve=>requestAnimationFrame(()=>{resolve();}));
      // Reset clocks and lock history so the first real transition still pulses once.
      snapshot=undefined;last=undefined;before=undefined;key='';handsKey='';
      for(const entry of rows.values()) entry.locked=false;
      update(options);
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{resolve();})));
      table.style.removeProperty('opacity');
    });
  }
  return {update,ready,destroy(){window.removeEventListener('resize',resize);cancelAnimationFrame(frame);media.removeEventListener('change',preference);root.replaceChildren();}};
}
