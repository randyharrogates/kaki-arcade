import { expect,it } from 'vitest';
import { layoutFixtures } from '../../../../apps/web/src/layout-fixtures';
import { placeLayout } from './phone-placement';
import { placeController,optionLabelStep,textWidth } from './private-placement';
import type { Layout } from './phone-placement-types';

const labels = [
  'Modular Interface of Digital Instruments','South Dakota, Minnesota, Nebraska, Iowa',
  'Trump Intl. Hotel & Tower, United States','Musical Interface of Digital Instruments',
  'Cretaceous-Paleogene','Cognitive-Behavioral Therapy','Leningrad-Novgorod Offensive','Newcastle-Upon-Tyne',
];
const fixture = (words:readonly string[]):Layout => ({ revision:1,controls:[
  { kind:'options',id:'answer',options:words.map((label,i) => ({ id:String(i),label,face:'face-bottom' })) },
  { kind:'options',id:'skip',audience:'leader',options:[{ id:'skip',label:'Skip' }] },
] });
const sizes = [{ width:667,height:375 },{ width:844,height:390 }];
function snapshots(pack = placeLayout) {
  return Object.fromEntries(Object.entries(layoutFixtures).filter(([name]) => name !== 'peek-pick').map(([name,layout]) => {
    const values = sizes.flatMap(area => [false,true].map(leader => pack(layout,area,leader,{},area)));
    let hash = 2166136261;
    for (const char of JSON.stringify(values)) hash = Math.imul(hash ^ char.charCodeAt(0),16777619) >>> 0;
    return [name,hash];
  }));
}

it('CTRL-002 captures every existing layout fixture placement', () => {
  // Frozen fingerprints of full pre-K-09 placements (parts, fits, margins, gaps, required).
  const before = {
    "cards": 2005821451,
    "disabled-faces": 2840821495,
    "disabled-options": 631658731,
    "dpad-only": 714148047,
    "empty": 4041900605,
    "every": 2729780365,
    "hidden-cards": 3123328833,
    "long-answer": 788675435,
    "options": 3857562527,
    "picker": 2575486781,
    "readonly-hidden-cards": 3323293509,
    "selected-picker": 383203509,
    "shoulders": 3637006945,
    "stick-faces": 404667747,
    "text-only": 3748736629,
    "watch": 3748736629
  };
  const after = snapshots();
  expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
  for (const [name,hash] of Object.entries(before)) {
    // These are the only catalogue layouts with a lone option beside another part.
    if (name === 'picker' || name === 'selected-picker') expect(after[name]).not.toBe(hash);
    else expect(after[name],name).toBe(hash);
  }
});

it('CTRL-002 reduces gaps only for option label overflow, retaining margins', () => {
  for (const [width,gap] of [[520,13],[506,8],[502,5],[490,5]] as const) {
    const layout = fixture(Array.from({ length:4 },() => 'W'.repeat(10)));
    const area = { width,height:375 };
    const placement = placeLayout(layout,area,false,{},area);
    expect(placement.margin).toBe(13);
    expect(placement.gap).toBe(gap);
    const part = placement.parts[0];
    expect(part).toBeDefined();
    if (!part) return;
    const fits = optionLabelStep('W'.repeat(10),(part.width-gap)/2,(part.height-gap)/2,true);
    expect(fits === null).toBe(width === 490);
  }
});
it('CTRL-002 preserves non-leader and standalone option placement', () => {
  for (const area of sizes) {
    const layout = fixture(labels.slice(0,4));
    const nonLeader = placeLayout(layout,area,false,{},area);
    expect(nonLeader.gap).toBe(13);
    expect(nonLeader.parts).toEqual([{ control:layout.controls[0],left:13,top:13,width:area.width-26,height:area.height-26 }]);
    const single:Layout = { revision:1,controls:layout.controls.slice(1) };
    const standalone = placeLayout(single,area,true,{},area);
    expect(standalone.gap).toBe(13);
    expect(standalone.parts).toEqual([{ control:single.controls[0],left:13,top:(area.height-68)/2,width:area.width-26,height:68 }]);
  }
});

it('CTRL-002 gives a neighbouring lone option its natural label width and preserves floors', () => {
  for (const area of sizes) for (const words of [labels.slice(0,4),labels.slice(4)]) {
    const layout = fixture(words);
    const placement = placeLayout(layout,area,true,{},area);
    const skip = placement.parts.find(p => p.control.id === 'skip');
    expect(skip?.width).toBe(Math.max(89,Math.ceil(textWidth('Skip',21)+32)));
    for (const part of placement.parts) {
      const c = part.control;
      if (c.kind !== 'options') continue;
      const columns = Math.min(2,c.options.length), rows = Math.ceil(c.options.length/2);
      const width = (part.width-(columns-1)*placement.gap)/columns;
      const height = (part.height-(rows-1)*placement.gap)/rows;
      expect(width).toBeGreaterThanOrEqual(89);
      if (c.id === 'answer') expect(width).toBe(area.width === 667 ? (words[0] === labels[0] ? 263 : 271) : 351.5);
      expect(height).toBeGreaterThanOrEqual(68);
      for (const option of c.options) expect(optionLabelStep(option.label,width,height,Boolean(option.face),columns === 1)).not.toBeNull();
    }
  }
});

it('CTRL-002 honours measured natural labels at the compact step, including faces and padding', () => {
  const layout = fixture(labels.slice(0,4)), area = sizes[0];
  if (!area) throw new Error('Missing size');
  for (const measured of [100,110,200]) {
    const placement = placeLayout(layout,area,true,{ skip:measured },area);
    expect(placement.parts.find(p => p.control.id === 'skip')?.width).toBe(Math.max(89,Math.ceil((measured-32)*21/34+32)));
  }
});

it('CTRL-002 retains natural measured widths for large lone targets beside a grid', () => {
  const layout = layoutFixtures.picker;
  if (!layout) throw new Error('Missing picker');
  const area = { width:667,height:307 };
  expect(placeLayout(layout,area,false,{ lock:210 },{ width:667,height:375 }).parts.find(p => p.control.id === 'lock')?.width).toBe(210);
});

it('CTRL-002 shares spare width among the other parts, including text, without growing the lone option', () => {
  const label = 'Continue';
  const layout:Layout = { revision:1,controls:[
    { kind:'stick',id:'move' },
    { kind:'text',id:'note',text:'Ready',tone:'note' },
    { kind:'options',id:'continue',options:[{ id:'next',label }] },
  ] };
  const area = { width:844,height:390 };
  const placed = placeLayout(layout,area,false,{},area);
  const [stick,note,action] = placed.parts;
  expect(placed.fits).toBe(true);
  expect(action?.width).toBe(Math.max(89,Math.ceil(textWidth(label,21)+32)));
  expect((stick?.width ?? 0)-178).toBe((note?.width ?? 0)-144);
  expect((action?.left ?? 0)+(action?.width ?? 0)).toBe(area.width-13);
});

it('PP-005 CTRL-005 D-164 keeps the Peek Poker pick action large and all sixteen cells in the play area', () => {
  const layout:Layout = { revision:1,controls:[
    { kind:'grid',id:'grid',rows:4,cols:4,cells:Array.from({ length:16 },() => ({ faceDown:true })) },
    { kind:'options',id:'lock',size:'large',options:[{ id:'go',label:'Lock in' }] },
  ] };
  for (const viewport of sizes) {
    const area = { width:viewport.width,height:viewport.height-68 };
    for (const widths of [{},{ lock:100 },{ lock:210 }]) {
      const placed = placeLayout(layout,area,false,widths,viewport);
      expect(placed.fits).toBe(true);
      expect(placed.margin).toBe(viewport.width === 667 ? 8 : 13);
      expect(placed.gap).toBe(viewport.width === 667 ? 5 : 13);
      const [grid,action] = placed.parts;
      if (!grid || !action) throw new Error('Missing picker parts');
      expect(action.width).toBe(widths.lock === 210 ? 210 : widths.lock === 100 ? 144 : 146);
      expect(action.height).toBe(144);
      const gridGap = placed.gap === 5 ? 5 : 8;
      expect((grid.width-3*gridGap)/4).toBe(89);
      expect((grid.height-3*gridGap)/4).toBe(68);
      for (const part of placed.parts) {
        expect(part.left).toBeGreaterThanOrEqual(8);
        expect(part.top).toBeGreaterThanOrEqual(8);
        expect(part.left+part.width).toBeLessThanOrEqual(area.width-8);
        expect(part.top+part.height).toBeLessThanOrEqual(area.height-8);
      }
    }
  }
});
it('CTRL-002 CTRL-003 CTRL-005 D-164 retains the large lone width floor beside other controls and private panels', () => {
  const layout:Layout = { revision:1,controls:[
    { kind:'text',id:'note',text:'Pick',tone:'note' },
    { kind:'options',id:'lock',size:'large',options:[{ id:'go',label:'Go' }] },
  ] };
  for (const area of sizes) {
    const action = placeLayout(layout,area,false,{},area).parts.find(p => p.control.id === 'lock');
    expect(action?.width).toBe(144);
    expect(action?.height).toBe(144);
    const withPanel = placeController(layout,{ revision:1,blocks:[{ kind:'text',text:'Ready' }] },area,false,{},area);
    expect(withPanel.fits).toBe(true);
    expect(withPanel.parts.find(p => p.control.id === 'lock')?.width).toBe(144);
  }
});

it('CTRL-002 CTRL-005 exercises lone face allowances at natural and measured widths', () => {
  for (const size of [undefined,'large'] as const) {
    const layout:Layout = { revision:1,controls:[{ kind:'text',id:'note',text:'Ready',tone:'note' },
      { kind:'options',id:'next',...(size ? { size } : {}),options:[{ id:'go',label:'Continue',face:'face-bottom' }] }] };
    const area = { width:844,height:390 }, step = size === 'large' ? 34 : 21;
    for (const measured of [undefined,240]) {
      const widths = measured === undefined ? {} : { next:measured };
      const placed = placeLayout(layout,area,false,widths,area);
      const label = measured === undefined ? textWidth('Continue',step) : (measured-32-68)*step/34;
      expect(placed.fits).toBe(true);
      expect(placed.parts.find(p => p.control.id === 'next')?.width).toBe(Math.max(size === 'large' ? 144 : 89,Math.ceil(label+32+(step === 34 ? 68 : 34))));
    }
  }
});

it('CTRL-002 CTRL-003 CTRL-005 fits the Rabakz leader answers, natural Skip and stat panel', () => {
  for (const viewport of sizes) {
    const words = labels.slice(0,4);
    const area = { width:viewport.width,height:viewport.height-68 };
    const view = { revision:1,blocks:[
      { kind:'stat' as const,label:'Score',value:0 },{ kind:'stat' as const,label:'Streak',value:0 },
      { kind:'stat' as const,label:'Points gained',value:0 },{ kind:'text' as const,text:'Watch the screen' },
    ] };
    const placed = placeController(fixture(words),view,area,true,{},viewport);
    expect(placed.fits,JSON.stringify({ viewport,words,placed })).toBe(true);
    expect(placed.metrics?.fits).toBe(true);
    expect(placed.parts.find(p => p.control.id === 'skip')?.width).toBe(89);
    const panel = placed.panel;
    if (!panel) throw new Error('Missing stat panel');
    expect(panel.left+panel.width).toBeLessThanOrEqual(area.width-placed.margin);
    expect(panel.top+panel.height).toBeLessThanOrEqual(area.height-placed.margin);
    expect(panel.width).toBeGreaterThan(0);
    for (const part of placed.parts) {
      expect(part.left+part.width).toBeLessThanOrEqual(panel.left-placed.gap);
      if (part.control.kind !== 'options') continue;
      const columns = Math.min(2,part.control.options.length), rows = Math.ceil(part.control.options.length/2);
      const width = (part.width-(columns-1)*placed.gap)/columns, height = (part.height-(rows-1)*placed.gap)/rows;
      expect(width).toBeGreaterThanOrEqual(89);
      expect(height).toBeGreaterThanOrEqual(68);
      for (const option of part.control.options) expect(optionLabelStep(option.label,width,height,Boolean(option.face),columns === 1)).not.toBeNull();
    }
  }
});
