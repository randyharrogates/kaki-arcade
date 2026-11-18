import { expect, it } from 'vitest';
import { placeController, privateBlocks } from './private-panel';
import { privateFixtures } from '../../../apps/web/src/private-fixtures';
import { layoutFixtures } from '../../../apps/web/src/layout-fixtures';
const picker = layoutFixtures.picker;
if (!picker) throw new Error('Missing picker');
it('CTRL-003 filters leader and non-leader blocks', () => {
  const view = { revision:1,blocks:[{ kind:'text' as const,text:'leader',audience:'leader' as const },{ kind:'text' as const,text:'other',audience:'not-leader' as const }] };
  expect(privateBlocks(view,true)).toEqual([view.blocks[0]]);
  expect(privateBlocks(view,false)).toEqual([view.blocks[1]]);
});
it('CTRL-003 places all read-only fixtures and empty panels at phone sizes', () => {
  for (const width of [667,844,932]) for (const view of Object.values(privateFixtures)) {
    const result = placeController({ revision:1,controls:[] },view,{ width,height:307 },false,{}, { width,height:375 });
    expect(result.fits).toBe(true);
    expect(Boolean(result.panel)).toBe(view.blocks.length > 0);
  }
});
it('CTRL-003 preserves picker floors and never overlaps a panel even when it cannot fit', () => {
  const layout = picker;
  for (const width of [667,844,932]) {
    const result = placeController(layout,privateFixtures.picker,{ width,height:307 },false,{}, { width,height:375 });
    expect(result.panel).not.toBeNull();
    for (const part of result.parts) expect(part.left+part.width).toBeLessThanOrEqual((result.panel?.left ?? 0)-result.gap);
    expect(result.parts.find(p => p.control.kind === 'grid')?.height).toBeGreaterThanOrEqual(287);
  }
  expect(placeController(layout,privateFixtures.grid,{ width:400,height:100 },false,{}, { width:667,height:375 }).fits).toBe(false);
});
it('CTRL-003 caps a long picker action at the space beside the grid', () => {
  const result = placeController(picker,null,{ width:667,height:307 },false,{ lock:2000 },{ width:667,height:375 });
  expect(result.fits).toBe(true);
  expect((result.parts.find(p => p.control.id === 'lock')?.width ?? Infinity)).toBeLessThan(300);
});
it('CTRL-003 D-132 fits the combined picker at all requested play areas', () => {
  for (const [width,height] of [[667,307],[667,375],[844,390],[932,430]] as const) {
    const result = placeController(picker,privateFixtures.picker,{ width,height },false,{ lock:2000 },{ width,height:height+68 });
    expect(result.fits).toBe(true);
    expect((result.panel?.left ?? 0)+(result.panel?.width ?? 0)).toBeLessThanOrEqual(width-result.margin);
    expect(result.parts.find(p => p.control.id === 'lock')?.width).toBe(144);
  }
});
it('CTRL-003 D-132 grows cards, steps text and rejects the card floor overflow', () => {
  const cards = placeController({ revision:1,controls:[] },privateFixtures.cards,{ width:667,height:307 },false,{}, { width:667,height:375 });
  expect((cards.metrics?.heights[0] ?? 0)*68/93).toBe(144);
  const view = { revision:1,blocks:[{ kind:'text' as const,text:'A'.repeat(100) }] };
  const result = placeController(picker,view,{ width:667,height:307 },false,{}, { width:667,height:375 });
  expect(result.fits).toBe(false); // No permitted step can contain this unbreakable word.
  expect(placeController(picker,privateFixtures.cards,{ width:550,height:307 },false,{}, { width:667,height:375 }).fits).toBe(false);
});

it('CTRL-003 respects title/body/note hierarchy and stats their own intermediate steps', () => {
  const empty = { revision:1,controls:[] };
  const text = placeController(empty,privateFixtures.text,{ width:667,height:307 },false,{}, { width:667,height:375 });
  expect(text.metrics?.steps).toEqual([34,21,13]);
  const stats = placeController(empty,privateFixtures.rabakz,{ width:667,height:375 },false,{}, { width:667,height:375 });
  expect(stats.fits).toBe(true);
  expect(stats.metrics?.steps.slice(0,3)).toContain(55);
  expect(stats.metrics?.steps.slice(0,3).every(s => s >= 34)).toBe(true);
});

it('RZ-003 RZ-005 keeps untitled panel text at the original 34 px ceiling', () => {
  const result = placeController({revision:1,controls:[]},{revision:1,blocks:[{kind:'text',text:'Watch the TV'},{kind:'text',text:'Flush'}]}, {width:667,height:307},false,{}, {width:667,height:375});
  expect(result.metrics?.steps).toEqual([34,34]);
});

it('PP-020 reveal notes reserve 13 px text while Points retains its large fit steps', () => {
  const view = { revision:1,blocks:[
    { kind:'cards' as const,cards:Array.from({ length:5 },(_,i) => ({ id:String(i),label:'10',mark:'heart' })) },
    { kind:'text' as const,text:'High card' },
    { kind:'stat' as const,label:'Points',value:3 },
    { kind:'text' as const,tone:'note' as const,text:'Missing picks were filled at random' },
  ] };
  for (const [width,height] of [[667,307],[844,322],[932,362]] as const) {
    const result = placeController({ revision:1,controls:[] },view,{ width,height },false,{}, { width,height:height+68 });
    expect(result.fits).toBe(true);
    expect(result.metrics?.steps[2]).toBe(width === 932 ? 89 : 55);
    expect(result.metrics?.steps[3]).toBe(13);
  }
});
