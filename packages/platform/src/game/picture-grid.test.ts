import { expect, it } from 'vitest';
import { checkLayout } from './layout';
import type { ControllerLayout } from './layout';
import { placeLayout } from './phone-placement';
const grid = (cell: unknown) => ({ revision:0,controls:[{kind:'grid',id:'pictures',rows:1,cols:1,cells:[cell]}] });
it('CTRL-003 validates picture labels and token badges', () => {
  expect(checkLayout(grid({image:'portrait',label:'Portrait',badge:{colour:'seat-1',text:'1',tick:true}}))).toEqual([]);
  for(const cell of [{image:'portrait'}, {image:'portrait',label:'Portrait',badge:{colour:'red',text:'1'}}, {image:'portrait',label:'Portrait',badge:{colour:'seat-1',text:'123'}}, {image:'portrait',label:'Portrait',faceDown:true}]) expect(checkLayout(grid(cell)).length).toBeGreaterThan(0);
});
it.each([[667,375],[844,390],[932,430]])('CTRL-003 picture grid fits %i by %i with primary/secondary proportions', (width,height) => {
  const layout:ControllerLayout = {revision:0,controls:[
    {kind:'text',id:'heading',text:'Choose a picture',tone:'note'},
    {kind:'grid',id:'pictures',rows:2,cols:4,cells:Array.from({length:8},()=>({image:'portrait',label:'Picture'}))},
    {kind:'text',id:'title',text:'Tap a picture',tone:'title'},
    {kind:'text',id:'note',text:'Choose one of the pictures.',tone:'note'},
    {kind:'options',id:'confirm',options:[{id:'confirm',label:'Ready'}]},
  ]};
  const area = {width:width-26,height:height-76};
  const placed = placeLayout(layout,area,false,{}, {width,height});
  expect(placed.fits).toBe(true);
  const image=placed.parts.find(p=>p.control.kind==='grid'), title=placed.parts.find(p=>p.control.id==='title');
  expect(image && title && image.width/title.width).toBeCloseTo(1.618);
  for(const part of placed.parts) { expect(part.top).toBeGreaterThanOrEqual(0);expect(part.left+part.width).toBeLessThanOrEqual(area.width);expect(part.top+part.height).toBeLessThanOrEqual(area.height); }
});
