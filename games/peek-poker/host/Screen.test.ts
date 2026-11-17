import { expect, it } from 'vitest';
import { drawTable, fitName, sameTable, SWAP_MS, swapProgress, handsClip, swapArcHeight } from './Screen';
import { CARD, GRID, screenModel } from './view-model';
import { scenario } from './scenarios';
import { peekPoker } from '../src';
import { duration, space, tv, perpendicularArcPoint, cardLift } from '../../../packages/ui/src';
import type { CardDeck } from './assets';
function mock() {
  const images:{id:string;x:number;y:number}[]=[], marks:string[]=[], outlines:number[][]=[], translations:number[][]=[], scales:number[][]=[], texts:{text:string;args:number[];font:string}[]=[];
  const ctx={clearRect(){ /* Context operation has no observable ink in this mock. */ },drawImage(image:{id:string},x:number,y:number){images.push({id:image.id,x,y});},save(){ /* Context operation has no observable ink in this mock. */ },restore(){ /* Context operation has no observable ink in this mock. */ },translate(...args:number[]){translations.push(args);},scale(...args:number[]){scales.push(args);},beginPath(){ /* Context operation has no observable ink in this mock. */ },rect(){ /* Context operation has no observable ink in this mock. */ },roundRect(){ /* Context operation has no observable ink in this mock. */ },fill(){ /* Shadow path. */ },clip(){ /* Context operation has no observable ink in this mock. */ },fillRect(){ /* Context operation has no observable ink in this mock. */ },fillText(this:CanvasRenderingContext2D,text:string,...args:number[]){marks.push(text);texts.push({text,args,font:this.font});},strokeRect(...args:number[]){outlines.push(args);}} as unknown as CanvasRenderingContext2D;
  const frames=new Map<string,HTMLCanvasElement>();
  for(const id of ['card-back',...Array.from({length:5},(_,i)=>`card-flip-${String(i)}`),...screenModel(peekPoker.publicView(scenario('reveal'))).grid.map(c=>c.frame)]) frames.set(id,{id} as unknown as HTMLCanvasElement);
  return {ctx,images,marks,outlines,translations,scales,texts,deck:{frames,faces:frames} as CardDeck};
}
it.each([
  {kind:'cards',from:1,to:13}, {kind:'cards',from:5,to:10},
  {kind:'cards',from:5,to:6}, {kind:'rows',from:0,to:3},
] as const)('PP-031 $kind $from to $to follows opposite bounded arcs above stationary cards',swap=>{
  const state=scenario('swap');state.swaps=[swap];
  const model=screenModel(peekPoker.publicView(state));
  const isMoving=(c:typeof model.grid[number])=>c.point.x !== c.destination.x || c.point.y !== c.destination.y;
  const moved=model.grid.filter(isMoving), stationary=model.grid.filter(c=>!isMoving(c));
  const projections=moved.map(()=>-1);
  for(let i=0;i<=40;i++) {
    const m=mock();drawTable(m.ctx,model,model,m.deck,SWAP_MS*i/40,false);
    const draws=m.images.slice(stationary.length);
    for(let j=0;j<moved.length;j++) {
      const source=moved[j],draw=draws[j];if(!source || !draw) throw Error('missing moving card');
      const dx=source.destination.x-source.point.x,dy=source.destination.y-source.point.y;
      const x=draw.x+176/2-source.point.x,y=draw.y+231/2-source.point.y;
      const t=(x*dx+y*dy)/(dx*dx+dy*dy);
      expect(t).toBeGreaterThanOrEqual((projections[j] ?? 0)-1e-12);expect(t).toBeGreaterThanOrEqual(-1e-12);expect(t).toBeLessThanOrEqual(1+1e-12);projections[j]=t;
      if(i === 20) expect(Math.abs(x*dy-y*dx)).toBeGreaterThan(0);
      for(let k=j+1;k<draws.length;k++) {const other=draws[k];if(!other) throw Error('other');expect(draw.x !== other.x || draw.y !== other.y).toBe(true);}
    }
    expect(m.images.slice(0,stationary.length).map(d=>[d.x+176/2,d.y+231/2])).toEqual(stationary.map(c=>[c.point.x,c.point.y]));
  }
});
it.each([1,4,8])('PP-031 keeps full swap sprites within grid gaps at %i players',players=>{
  for(const swap of [{kind:'rows',from:0,to:3},{kind:'cards',from:0,to:15}] as const) {
    const state=scenario('swap',players);state.swaps=[swap];
    const model=screenModel(peekPoker.publicView(state));
    const moved=model.grid.filter(c=>c.point.x !== c.destination.x || c.point.y !== c.destination.y);
    const stationary=model.grid.length-moved.length;
    const left=(tv.width-GRID.width)/2-space[55],top=(tv.height-GRID.height)/2-space[55];
    const right=(tv.width+GRID.width)/2+space[55],bottom=(tv.height+GRID.height)/2+space[55];
    for(let step=0;step<=20;step++) {
      const m=mock();drawTable(m.ctx,model,model,m.deck,SWAP_MS*step/20,false);
      const draws=m.images.slice(stationary);
      expect(draws).toHaveLength(moved.length);
      for(const [index,draw] of draws.entries()) {
        expect(draw.x).toBeGreaterThanOrEqual(left);
        expect(draw.y).toBeGreaterThanOrEqual(top);
        expect(draw.x+CARD.width).toBeLessThanOrEqual(right);
        expect(draw.y+CARD.height).toBeLessThanOrEqual(bottom);
        for(const other of draws.slice(index+1)) expect(draw.x !== other.x || draw.y !== other.y).toBe(true);
        if(step === 0 || step === 20) {
          const card=moved[index];if(!card) throw Error('missing moving card');
          const point=step === 0 ? card.point : card.destination;
          expect([draw.x,draw.y]).toEqual([point.x-CARD.width/2,point.y-CARD.height/2]);
        }
      }
    }
  }
});
it('PP-008 turns from back through edge to face; marks never appear on backs',()=>{
  const model=screenModel(peekPoker.publicView(scenario('reveal'))),previous=screenModel(peekPoker.publicView(scenario('locked')));
  for(const [time,sample,marked] of [[0,4,false],[duration.slow/2,2,false],[duration.slow*0.8,0,true]] as const) {const m=mock();drawTable(m.ctx,model,previous,m.deck,time,false);expect(m.images[0]?.id).toBe(`card-flip-${String(sample)}`);expect(m.marks.length>0).toBe(marked);}
});
it('PP-031 reduced swap draws destinations and both outlines for the duration',()=>{
  const model=screenModel(peekPoker.publicView(scenario('swap')));const m=mock();drawTable(m.ctx,model,model,m.deck,0,true);expect(m.outlines).toHaveLength(2);expect(m.marks).toEqual(['Swapped','Swapped']);expect(m.texts.every(t=>t.args[2]===CARD.contentWidth-2*space[8])).toBe(true);
  const card=model.grid[5];expect(card).toBeDefined();expect(m.images[14]?.x).toBe((card?.destination.x ?? 0)-176/2);
  const done=mock();drawTable(done.ctx,model,model,done.deck,SWAP_MS,true);expect(done.outlines).toHaveLength(0);
});
it('PP-008 reduced reveal immediately shows faces and all marks',()=>{const m=mock(),model=screenModel(peekPoker.publicView(scenario('reveal')));drawTable(m.ctx,model,screenModel(peekPoker.publicView(scenario('locked'))),m.deck,0,true);expect(m.images.every(i=>!i.id.includes('flip') && i.id !== 'card-back')).toBe(true);expect(m.marks).toHaveLength(16);});
it('PP-021 fits a twelve-character name beside the measured hand inside the safe area',()=>{const measureText=(text:string)=>({width:text.length*17});const available=518-measureText('Three of a kind · 16 pts').width-13;const name=fitName({measureText} as Pick<CanvasRenderingContext2D,'measureText'>,'ABCDEFGHIJKL',available);expect(name.endsWith('…')).toBe(true);expect(measureText(name).width).toBeLessThanOrEqual(available);});

it('PP-021 compares equivalent snapshots without rebuilding their render model',()=>{
  const view=peekPoker.publicView(scenario('reveal'));
  const copy=structuredClone(view);expect(sameTable(view,copy)).toBe(true);
  const player=copy.players[0];if(!player) throw Error('player');player.name='Changed';expect(sameTable(view,copy)).toBe(false);
});

it('PP-031 uses one ease with bounded peak speed across 100 samples',()=>{
  const model=screenModel(peekPoker.publicView(scenario('swap'))),card=model.grid.find(c=>c.point.x!==c.destination.x || c.point.y!==c.destination.y);if(!card) throw Error('card');
  const points=Array.from({length:101},(_,i)=>perpendicularArcPoint(card.point,card.destination,swapProgress(card,false,i*20),34));
  const speeds=points.slice(1).map((p,i)=>Math.hypot(p.x-(points[i]?.x ?? 0),p.y-(points[i]?.y ?? 0)));
  expect(Math.max(...speeds)).toBeLessThanOrEqual(3*speeds.reduce((a,b)=>a+b,0)/100);
  expect(swapProgress(card,false,500)).toBeCloseTo(0.0707967,6);expect(swapProgress(card,false,1500)).toBeCloseTo(0.9292033,6);
});
it('PP-031 bounds both row directions to 3.5 times average speed',()=>{
  const state=scenario('swap');state.swaps=[{kind:'rows',from:0,to:3}];
  const model=screenModel(peekPoker.publicView(state));
  for(const card of model.grid.filter(c=>c.destination.y!==c.point.y)) {
    const points=Array.from({length:101},(_,i)=>{const p=swapProgress(card,true,i*20);return perpendicularArcPoint(card.point,card.destination,p,swapArcHeight(card,true,p));});
    const speeds=points.slice(1).map((p,i)=>Math.hypot(p.x-(points[i]?.x ?? 0),p.y-(points[i]?.y ?? 0)));
    expect(Math.max(...speeds)).toBeLessThanOrEqual(3.5*speeds.reduce((a,b)=>a+b,0)/100);
  }
});
it('PP-008 wipes hands after edge-on and immediately for reduced motion',()=>{
  expect(handsClip(0,false)).toBe('inset(0 0 100% 0)');expect(handsClip(duration.slow/2,false)).toBe('inset(0 0 100% 0)');
  expect(Number(handsClip(duration.slow*0.75,false).split(' ')[2]?.replace('%',''))).toBeCloseTo(50,8);expect(handsClip(duration.slow,false)).toBe('inset(0 0 0% 0)');expect(handsClip(0,true)).toBe('inset(0 0 0% 0)');
});
it('PP-031 staggers row departure and ends exactly at the destination',()=>{
 const state=scenario('swap');state.swaps=[{kind:'rows',from:0,to:3}];const model=screenModel(peekPoker.publicView(state));
 const down=model.grid.find(c=>c.destination.y>c.point.y),up=model.grid.find(c=>c.destination.y<c.point.y);if(!down || !up) throw Error('rows');
 expect(swapProgress(down,true,400)).toBeGreaterThan(0);expect(swapProgress(up,true,400)).toBe(0);
 expect(swapProgress(down,true,1600)).toBe(1);expect(swapProgress(up,true,2000)).toBe(1);
 expect(1+(cardLift.scale-1)*Math.sin(Math.PI*0)).toBe(1);
});

it('PP-031 sampled row rectangles overlap by at most half and lifted cards paint last',()=>{
 const state=scenario('swap');state.swaps=[{kind:'rows',from:0,to:3}];const model=screenModel(peekPoker.publicView(state));
 const down=model.grid.filter(c=>c.destination.y>c.point.y),up=model.grid.filter(c=>c.destination.y<c.point.y);
 for(let step=0;step<=100;step++) {
  const time=step*20,m=mock();drawTable(m.ctx,model,model,m.deck,time,false);
  for(let col=0;col<4;col++) {
   const a=down[col],b=up[col];if(!a || !b) throw Error('column');
   const pa=perpendicularArcPoint(a.point,a.destination,swapProgress(a,true,time),swapArcHeight(a,true,swapProgress(a,true,time))),t=swapProgress(b,true,time),pb=perpendicularArcPoint(b.point,b.destination,t,swapArcHeight(b,true,t));
   const scale=t>0 && t<1 ? 1+0.05*Math.sin(Math.PI*t) : 1;
   const overlapX=Math.max(0,Math.min(pa.x+CARD.contentWidth/2,pb.x+CARD.contentWidth*scale/2)-Math.max(pa.x-CARD.contentWidth/2,pb.x-CARD.contentWidth*scale/2));
   const overlapY=Math.max(0,Math.min(pa.y+CARD.contentHeight/2,pb.y+CARD.contentHeight*scale/2)-Math.max(pa.y-CARD.contentHeight/2,pb.y-CARD.contentHeight*scale/2));
   expect(overlapX*overlapY).toBeLessThanOrEqual(CARD.contentWidth*CARD.contentHeight/2);
  }
  expect(m.images.slice(-4).map(d=>d.y+CARD.height/2)).toEqual(up.map(c=>perpendicularArcPoint(c.point,c.destination,swapProgress(c,true,time),swapArcHeight(c,true,swapProgress(c,true,time))).y));
  if(step===100) expect(m.scales).toEqual([]);
 }
});
it('PP-008 aligns the face overlay with the baked 45 degree lift',()=>{
 const previous=screenModel(peekPoker.publicView(scenario('memorise'))),model=screenModel(peekPoker.publicView(scenario('locked'))),m=mock();
 drawTable(m.ctx,model,previous,m.deck,duration.slow*0.35,false);
 expect(m.images[0]?.id).toBe('card-flip-1');expect(m.translations[0]?.[1]).toBeCloseTo((model.grid[0]?.point.y ?? 0)-6*Math.SQRT1_2,9);
});
it.each([1,4,8])('PP-008 lays out %i bold seat digits without text squashing',count=>{
 const model=screenModel(peekPoker.publicView(scenario('reveal'))),card=model.grid[5];if(!card) throw Error('card');card.marks=card.marks.slice(0,count);for(const other of model.grid) if(other!==card) other.marks=[];
 const m=mock();drawTable(m.ctx,model,model,m.deck,500,true);
 const digits=m.texts.filter(t=>card.marks.some(p=>String(p.seat)===t.text));
 expect(digits.every(t=>t.args.length===2 && t.font.startsWith('700 '))).toBe(true);
 const ys=new Set(digits.map(t=>t.args[1]));expect(ys.size).toBe(count>4 ? 2 : 1);
});
