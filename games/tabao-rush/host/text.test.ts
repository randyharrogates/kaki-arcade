import { expect, it } from 'vitest';
import { tvType } from '../../../packages/ui/src/type';
import { fittedText, nameText, processing, rejectionText } from './text';
it('wraps names at 34 and never paints a word beyond its region (TR-001, TR-030)',()=>{
  const drawn:{value:string;font:string}[]=[];
  const stub={font:'',measureText(value:string){return {width:value.length*17};},fillText(value:string){drawn.push({value,font:stub.font});}};
  const ctx=stub as unknown as CanvasRenderingContext2D;
  fittedText(ctx,'Chicken rice',0,34,34,150);
  expect(drawn.map(d=>d.value)).toEqual(['Chicken','rice']);expect(drawn.every(d=>d.font.startsWith('34px'))).toBe(true);
  drawn.length=0;fittedText(ctx,'impossiblylongword',0,34,34,107);expect(drawn).toEqual([]);
  fittedText(ctx,'Chop Rice Plate',0,21,21,100,false,21);expect(drawn).toEqual([]);
});
it('includes rice processing and gives each rejection a distinct plain reason (TR-004, TR-030)',()=>{
  expect(processing.has('rice')).toBe(true);
  const codes=['not-ordered','wrong-container','missing-ingredient','missing-step','extra-step','extra-ingredient','burnt','unknown-combination','nothing-to-serve','missing-return-counter','dirty'] as const;
  const reasons=codes.map(code=>rejectionText({code,ingredient:'cucumber',step:'chop'}));
  expect(new Set(reasons).size).toBe(codes.length);expect(reasons).toContain('Missing cucumber');expect(reasons).toContain('Plate is dirty');
});

function canvasText(){
  const drawn:{value:string;size:number;width:number}[]=[];
  const stub={font:'',measureText(value:string){return {width:value.length*parseFloat(stub.font)*0.47};},fillText(value:string){drawn.push({value,size:parseFloat(stub.font),width:stub.measureText(value).width});}};
  return {ctx:stub as unknown as CanvasRenderingContext2D,drawn};
}
it.each(['Extinguisher','Cucumber','Pineapple'])('fits the whole name %s inside its tile using the largest fitting token (TR-001, TR-030)',value=>{
  const {ctx,drawn}=canvasText();
  nameText(ctx,value,0,34,120);
  expect(drawn).toHaveLength(1);
  expect(drawn[0]?.value).toBe(value);
  expect(drawn[0]?.size).toBe(tvType.label);
  expect(drawn[0]?.width).toBeLessThanOrEqual(120);
  expect(value.length*tvType.body*0.47).toBeGreaterThan(120);
});
it('wraps a two-word tile name before considering a smaller token (TR-001, TR-030)',()=>{
  const {ctx,drawn}=canvasText();
  nameText(ctx,'Rice pot',0,34,120);
  expect(drawn.map(d=>d.value)).toEqual(['Rice','pot']);
  expect(drawn.every(d=>d.size===tvType.body&&d.width<=120)).toBe(true);
});
it('keeps dish names and rejection notes out of the name shrink path (TR-001, TR-030)',()=>{
  const {ctx,drawn}=canvasText();
  for(const value of ['Chicken rice','Empty','Work','Done','Burnt','Fire','Not on the order board']){
    drawn.length=0;
    fittedText(ctx,value,0,34,tvType.body,351);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.every(d=>d.size===tvType.body)).toBe(true);
  }
  drawn.length=0;
  fittedText(ctx,'Extinguisher',0,34,tvType.body,120);
  expect(drawn).toEqual([]); // The default path cannot opt into the names exception.
});

import { LEVELS } from '../src/levels/catalogue';
import { displayName, nameInset } from './text';
import { RECIPE_LABELS } from './view-model';
it('fits every level station and crate with neighbour insets and one-line station bands (TR-001, TR-030)',()=>{
 for(const level of LEVELS)for(const station of level.stations){
  const {ctx,drawn}=canvasText();
  const tiles=Array.from({length:level.width*level.height},(_,tile)=>({kind:level.stations.some(s=>s.tile===tile)?'station':'floor'}));
  const grid={width:level.width,tiles};const width=120-nameInset(grid,station.tile,-1)-nameInset(grid,station.tile,1);
  const name=displayName(station.ingredient??station.kind);
  nameText(ctx,name,0,34,width,station.kind==='crate'?2:1);
  expect(drawn.map(d=>d.value).join(' '),name).toBe(name);expect(drawn.every(d=>d.width<=width)).toBe(true);
 }
});
it('fits every recipe name, step and rejection without omission (TR-001, TR-004)',()=>{
 for(const recipe of RECIPE_LABELS.values())for(const [value,size,width] of [[recipe.name,34,162],[recipe.steps,21,123]] as const){
 const {ctx,drawn}=canvasText();fittedText(ctx,value,0,size,size,width);expect(drawn.map(d=>d.value).join(' '),value).toBe(value);
 }
 for(const code of ['not-ordered','wrong-container','missing-ingredient','missing-step','extra-step','extra-ingredient','burnt','unknown-combination','nothing-to-serve','missing-return-counter','dirty'] as const){
 const value=rejectionText({code,ingredient:'cucumber',step:'chop'}),{ctx,drawn}=canvasText();fittedText(ctx,value,0,34,34,351);expect(drawn.map(d=>d.value).join(' ')).toBe(value);
 }
 expect(processing.has('serving')).toBe(false);
});
