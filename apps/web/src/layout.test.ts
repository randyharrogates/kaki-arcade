import { describe, expect, it } from 'vitest';
import { BUTTON_FLOOR as floor, faceFloor, contrastRatio, DISABLED_FILL, DISABLED_INK, space } from '@kaki/ui';
import { placeLayout as place } from '../../../packages/controller-kit/src/layout-placement';
import { layoutFixtures, nextWireLayout } from './layout-fixtures';
import { layoutOutput, revisionProblem, visibleParts } from '../../../packages/controller-kit/src/layout-types';
import type { Layout, LayoutPart, LayoutOutput } from '../../../packages/controller-kit/src/layout-types';
const placeLayout = (layout: Layout, area: { width:number; height:number }, leader = false, widths: Record<string,number> = {}, viewport = area) => place(layout,area,leader,widths,viewport);
const get = (name:string): Layout => { const value = layoutFixtures[name]; if (!value) throw new Error(name); return value; };
describe('CTRL-002 placement', () => {
  for (const [width,height] of [[667,354],[667,375],[844,390],[932,430]]) {
    if (!width || !height) continue;
    for (const name of ['stick-faces','options','picker','dpad-only','text-only','cards']) it(`${name} fits ${String(width)} × ${String(height)}`, () => {
      // Shell header is 34 px + 10 px padding + 3 px border. The function takes the remaining play area.
      const area = { width,height:height-47 };
      const result = placeLayout(get(name),area);
      expect(result.fits).toBe(true);
      for (const a of result.parts) {
        expect(a.left).toBeGreaterThanOrEqual(result.margin); expect(a.top).toBeGreaterThanOrEqual(result.margin);
        expect(a.left+a.width).toBeLessThanOrEqual(area.width-result.margin+0.001);
        expect(a.top+a.height).toBeLessThanOrEqual(area.height-result.margin+0.001);
        if (a.control.kind === 'button') { expect(a.width).toBeGreaterThanOrEqual(faceFloor({ width,height:375 })); expect(a.height).toBeGreaterThanOrEqual(faceFloor({ width,height:375 })); }
        if (a.control.kind === 'grid') {
          expect((a.width-(a.control.cols-1)*(result.gap === 5 ? 5 : 8))/a.control.cols).toBe(floor.inPlayWidth);
          expect((a.height-(a.control.rows-1)*(result.gap === 5 ? 5 : 8))/a.control.rows).toBe(floor.inPlayHeight);
        }
        if (a.control.kind === 'options') expect((a.height-(Math.ceil(a.control.options.length/2)-1)*result.gap)/Math.ceil(a.control.options.length/2)).toBeGreaterThanOrEqual(floor.inPlayHeight);
      }
      for (const [i,a] of result.parts.entries()) for (const b of result.parts.slice(i+1)) {
        const bothFaces = a.control.kind === 'button' && b.control.kind === 'button';
        const distance = bothFaces ? Math.hypot(a.left+a.width/2-b.left-b.width/2,a.top+a.height/2-b.top-b.height/2)-(a.width+b.width)/2 : Math.hypot(Math.max(a.left-b.left-b.width,b.left-a.left-a.width,0),Math.max(a.top-b.top-b.height,b.top-a.top-a.height,0));
        expect(distance).toBeGreaterThanOrEqual(result.gap-0.001);
      }
    });
  }
  it('grows the stick and options when fewer parts need the area', () => {
    const area = { width:844,height:340 };
    const many = placeLayout(get('stick-faces'),area).parts[0];
    const single = placeLayout({ revision:1,controls:[{ kind:'stick',id:'move' }] },area).parts[0];
    expect(single?.width).toBeGreaterThan(many?.width ?? Infinity);
    const options = get('picker').controls.filter(c => c.kind === 'options');
    expect(placeLayout({ revision:1,controls:options },area).parts[0]?.width).toBeGreaterThan(placeLayout(get('picker'),area).parts[1]?.width ?? Infinity);
  });
  it('keeps a lone face on the right in its fixed diamond position', () => {
    const result = placeLayout({ revision:1,controls:[{ kind:'button',id:'one',button:'face-right',label:'Act' }] },{ width:844,height:340 });
    const button = result.parts[0];
    expect(button?.left).toBeGreaterThan(844/2);
    expect((button?.left ?? 0)+(button?.width ?? 0)).toBe(844-space[13]);
  });
  it('centres text-only title, body and note vertically in tone order', () => {
    const result = placeLayout({ revision:1,controls:[
      { kind:'text',id:'note',text:'Note',tone:'note' },
      { kind:'text',id:'title',text:'Title',tone:'title' },
      { kind:'text',id:'body',text:'Body' },
    ] },{ width:844,height:343 });
    expect(result.fits).toBe(true);
    expect(result.parts.map(p => p.control.id)).toEqual(['title','body','note']);
    const first = result.parts[0], last = result.parts[2];
    expect(first?.top).toBe(343-(last?.top ?? 0)-(last?.height ?? 0));
    expect(first?.width).toBe(844-2*space[13]);
  });
  it('sizes the grid action from its measured label without compressing grid cells', () => {
    const result = placeLayout(get('picker'),{ width:667,height:343 },false,{ lock:233 });
    expect(result.fits).toBe(true);
    expect(result.parts[1]?.width).toBe(233);
    expect(result.parts[0]?.width).toBe(4*floor.inPlayWidth+3*space[8]);
    expect((result.parts[1]?.left ?? 0)-(result.parts[0]?.left ?? 0)-(result.parts[0]?.width ?? 0)).toBeGreaterThanOrEqual(space[13]);
  });
  it.each([[322,13,13,true],[312,8,8,true],[311,8,5,true],[307,8,5,true],[303,8,5,true],[302,8,5,false]] as const)('at play height %s selects margin %s, gap %s and fits=%s', (height,margin,gap,fits) => {
    const result = placeLayout(get('picker'),{ width:667,height },false,{ lock:233 });
    expect(result.margin).toBe(margin);
    expect(result.fits).toBe(fits);
    expect(result.gap).toBe(gap);
    expect(result.parts[0]?.height).toBe(4*floor.inPlayHeight+3*(gap === 5 ? 5 : 8));
    expect(result.parts[0]?.width).toBe(4*floor.inPlayWidth+3*(gap === 5 ? 5 : 8));
    if (fits) for (const part of result.parts) {
      expect(part.top).toBeGreaterThanOrEqual(margin);
      expect(part.top+part.height).toBeLessThanOrEqual(height-margin);
    }
  });
  it('reports when the measured note leaves too little height for the fixed grid', () => {
    const result = placeLayout(get('picker'),{ width:667,height:302 },false,{ lock:233 });
    expect(result.fits).toBe(false);
    expect(result.parts[0]?.height).toBe(4*floor.inPlayHeight+3*space[5]);
    expect((result.parts[0]?.top ?? 0)+(result.parts[0]?.height ?? 0)).toBeLessThanOrEqual(302);
  });
  it('reports impossible layouts without shrinking floors', () => { expect(placeLayout(get('every'),{ width:667,height:325 }).fits).toBe(false); });
  it('honours both audience exclusions', () => {
    const layout: Layout = { revision:1,controls:[{ kind:'text',id:'leader',text:'Leader',audience:'leader' },{ kind:'text',id:'others',text:'Others',audience:'not-leader' }] };
    expect(visibleParts(layout,true).map(c => c.id)).toEqual(['leader']);
    expect(visibleParts(layout,false).map(c => c.id)).toEqual(['others']);
  });
});
describe('CTRL-002 revision boundary', () => {
  it('carries the revision on every output kind for session filtering', () => {
    const layout = get('every');
    const cases: [string,LayoutOutput['phase'],LayoutOutput['value']][] = [['pick','press',true],['pick','release',false],['answers','choose','a'],['grid','choose',0],['hand','choose','q'],['move','change',{ x:1,y:0 }],['directions','press','up'],['directions','release','up']];
    for (const [id,phase,value] of cases) {
      const result = layoutOutput(layout,id,phase,value);
      expect(result).toEqual({ control:id,phase,value,revision:1 });
    }
  });
  it('requires a bump only when tap meaning changes', () => {
    const before = get('options');
    expect(revisionProblem(before,{ ...before,revision:2 })).toBeNull();
    expect(revisionProblem(before,{ ...get('watch'),revision:1 })).toBeNull();
    expect(revisionProblem(before,get('watch'))).toBeNull();
    const disabled: Layout = { ...before,controls:before.controls.map(c => c.kind === 'options' ? { ...c,options:c.options.map(item => ({ ...item,state:'disabled' })) } : c) };
    expect(revisionProblem(before,disabled)).toBeNull();
    expect(revisionProblem(before,{ ...before,revision:0 })).toMatch(/non-decreasing/);
    expect(revisionProblem(get('text-only'),{ ...get('text-only'),revision:2 })).toBeNull();
  });
});

it.each([7,8])('CTRL-002 keeps %s options above the row floor with ordered spacing fallback', count => {
  const layout: Layout = { revision:1,controls:[{ kind:'options',id:'choices',options:Array.from({ length:count },(_,i) => ({ id:String(i),label:String(i) })) }] };
  for (const [width,height,margin,gap] of [[667,307,8,5],[844,322,8,8],[932,362,13,13]]) {
    const result = placeLayout(layout,{ width:width ?? 0,height:height ?? 0 });
    expect(result.fits).toBe(true); expect(result.margin).toBe(margin); expect(result.gap).toBe(gap);
    expect(((result.parts[0]?.height ?? 0)-3*result.gap)/4).toBeGreaterThanOrEqual(68);
  }
  expect(placeLayout(layout,{ width:667,height:302 }).fits).toBe(false);
});
it('CTRL-002 uses the locked equal-axis diamond and grows faces and D-pad', () => {
  const small = placeLayout(get('stick-faces'),{ width:844,height:322 });
  const big = placeLayout(get('stick-faces'),{ width:1400,height:700 });
  const byFace = (button:string) => small.parts.find(p => p.control.kind === 'button' && p.control.button === button);
  const top = byFace('face-top'), right = byFace('face-right'), bottom = byFace('face-bottom'), left = byFace('face-left');
  expect(top && right && bottom && left).toBeTruthy();
  if (!top || !right || !bottom || !left) throw new Error('Missing faces');
  expect(top.left).toBeCloseTo(bottom.left); expect(left.top).toBeCloseTo(right.top);
  expect(right.left-top.left).toBeCloseTo(top.left-left.left);
  expect(right.top-top.top).toBeCloseTo(right.left-top.left);
  expect(bottom.top-right.top).toBeCloseTo(right.top-top.top);
  expect(right.left-top.left).toBeCloseTo(top.width*95/110);
  expect(big.parts.find(p => p.control.id === top.control.id)?.width).toBeGreaterThan(top.width);
  const pad = (width:number,height:number) => placeLayout(get('dpad-only'),{ width,height }).parts[0];
  const a = pad(844,322), b = pad(1600,900);
  expect(b?.width).toBeGreaterThan(a?.width ?? Infinity); expect(b?.height).toBeGreaterThan(a?.height ?? Infinity);
  expect(((b?.width ?? 0)-26)/((b?.height ?? 0)-26)).toBeCloseTo(89/68);
});
it('CTRL-002 fits stick, faces and shoulders with the first feasible spacing', () => {
  const result = placeLayout(get('shoulders'),{ width:844,height:322 });
  expect(result.fits).toBe(true); expect(result.margin).toBe(8); expect(result.gap).toBe(8);
  expect(result.parts.filter(p => p.control.kind === 'button')).toHaveLength(6);
});
it('CTRL-002 grows centred cards at their contract aspect without a width cap', () => {
  const result = placeLayout(get('cards'),{ width:932,height:700 });
  const row = result.parts[0]; if (!row) throw new Error('Missing row');
  const cardWidth = (row.width-result.gap)/2;
  expect(cardWidth).toBeGreaterThan(144); expect(cardWidth/row.height).toBeCloseTo(89/122);
  expect(row.left).toBeCloseTo((932-row.width)/2);
});

it('CTRL-002 demo follows state-only wire revisions', () => {
  const before = get('picker');
  const next = nextWireLayout(before,get('selected-picker'));
  expect(next.revision).toBe(2);
  expect(nextWireLayout(next,get('selected-picker')).revision).toBe(2);
});
it('CTRL-002 uses measured wrapped text heights', () => {
  const result = placeLayout({ revision:1,controls:[{ kind:'text',id:'title',text:'Title',tone:'title' },{ kind:'text',id:'body',text:'Wrapped body' }] },{ width:844,height:322 },false,{ title:41,body:102 });
  expect(result.parts.map(p => p.height)).toEqual([41,102]);
  expect(result.parts[0]?.top).toBeCloseTo((322-41-102-13)/2);
});


it.each([[667,89],[700,110*700/844],[843,110*843/844],[844,110],[932,110]])('CTRL-002 D-122 face floor at %s px is %s px', (width,expected) => {
  expect(faceFloor({ width,height:375 })).toBe(expected);
  // An impossible height exposes the floor rather than the preferred grown size.
  const result = placeLayout(get('stick-faces'),{ width,height:200 });
  expect(result.fits).toBe(false);
  const faces = result.parts.filter(p => p.control.kind === 'button' && p.control.button.startsWith('face'));
  expect(faces).toHaveLength(4);
  for (const face of faces) { expect(face.width).toBe(expected); expect(face.height).toBe(expected); }
});
it('CTRL-002 D-122 fits the Tabao-style diamond on a 667 × 375 phone including shell and wake note', () => {
  const result = placeLayout(get('stick-faces'),{ width:667,height:307 });
  expect(result.fits).toBe(true);
  expect(result.margin).toBe(13);
  for (const face of result.parts.filter(p => p.control.kind === 'button')) {
    expect(face.width).toBeGreaterThanOrEqual(89);
    expect(face.top+face.height).toBeLessThanOrEqual(307-result.margin+0.001);
  }
});


it('CTRL-002 D-125 disabled labels retain normal-text contrast', () => {
  expect(contrastRatio(DISABLED_INK,DISABLED_FILL)).toBeGreaterThanOrEqual(4.5);
});
it('CTRL-002 D-122 takes the floor from the phone rather than the 750 px play area', () => {
  const layout = get('disabled-faces');
  for (const [width,expected] of [[844,110],[667,89]] as const) {
    const result = placeLayout(layout,{ width:750,height:307 },false,{}, { width,height:375 });
    expect(Math.min(...result.parts.map(p => p.width))).toBeGreaterThanOrEqual(expected);
    expect(faceFloor({ width,height:375 })).toBe(expected);
  }
});
it('CTRL-002 every pair and triple of kit groups either fits with clearance or reports failure', () => {
  const groups = [
    [{ kind:'stick',id:'stick' }], [{ kind:'dpad',id:'dpad' }],
    get('disabled-faces').controls,
    get('shoulders').controls.filter(c => c.kind === 'button' && c.button.startsWith('shoulder')),
    get('options').controls, get('picker').controls,
    [{ kind:'cards',id:'three',tappable:true,cards:[{ id:'a',label:'A' },{ id:'b',label:'B' },{ id:'c',label:'C' }] }],
  ] satisfies readonly (readonly LayoutPart[])[];
  for (const [width,height] of [[667,307],[844,322],[932,362]] as const) {
    for (let i=0;i<groups.length;i++) for (let j=i+1;j<groups.length;j++) {
      for (const k of [-1,...Array.from({ length:groups.length-j-1 },(_,n) => j+1+n)]) {
        const first = groups[i], second = groups[j], third = k < 0 ? [] : groups[k];
        if (!first || !second || !third) throw new Error('Missing kit group');
        const controls = [...first,...second,...third];
        const result = placeLayout({ revision:1,controls },{ width,height },false,{}, { width,height:height+68 });
        if (!result.fits) continue;
        for (const [aIndex,a] of result.parts.entries()) for (const b of result.parts.slice(aIndex+1)) {
          const face = (c:typeof a) => c.control.kind === 'button' && c.control.button.startsWith('face');
          const distance = face(a) && face(b)
            ? Math.hypot(a.left+a.width/2-b.left-b.width/2,a.top+a.height/2-b.top-b.height/2)-(a.width+b.width)/2
            : Math.hypot(Math.max(a.left-b.left-b.width,b.left-a.left-a.width,0),Math.max(a.top-b.top-b.height,b.top-a.top-a.height,0));
          expect(distance,`${String(width)} × ${String(height)}: ${controls.map(c => c.id).join(',')}: ${a.control.id} / ${b.control.id}`).toBeGreaterThanOrEqual(result.gap-0.001);
        }
      }
    }
  }
});
