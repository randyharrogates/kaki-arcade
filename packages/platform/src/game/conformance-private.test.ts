import { conformanceTimeout } from './kit';
import { placeController,textHeight,textWidth,panelMetrics,optionLabelStep,controlContentFits } from './private-placement';
import { expect,it } from 'vitest';
import { checkPrivatePhoneFit,runConformance } from './conformance';
import { dots } from '../test-fixtures/dots.fixture';
import { layoutFixtures } from '../../../../apps/web/src/layout-fixtures';
import { privateFixtures } from '../../../../apps/web/src/private-fixtures';
const picker = layoutFixtures.picker;
const note = privateFixtures.picker;
if (!picker || !note) throw new Error('Missing private picker fixtures');
it('CTRL-003 D-132 accepts a picker plus wrapped private note at 667 × 307', { timeout: conformanceTimeout(719) }, () => {
  expect(checkPrivatePhoneFit(picker,note)).toEqual([]);
  const report = runConformance({ ...dots,controllerLayout:() => picker,privateView:() => note },[{ name:'fitting private panel',players:2 }],{ sources:[],stopOnFailure:['layout'] });
  expect(report.checks.find(c => c.id === 'layout')?.status).toBe('pass');
});
it('CTRL-003 D-132 rejects impossible combinations through conformance', { timeout: conformanceTimeout(37) }, () => {
  const view = { revision:1,blocks:[{ kind:'cards' as const,cards:Array.from({ length:8 },(_,i) => ({ id:String(i),label:'Q' })) }] };
  const report = runConformance({ ...dots,controllerLayout:() => picker,privateView:() => view },[{ name:'impossible private panel',players:2 }],{ sources:[],stopOnFailure:['layout'] });
  expect(report.checks.find(c => c.id === 'layout')?.failures.join(' ')).toContain('D-132: layout plus private view cannot fit a 667 × 307');
});

it('CTRL-003 every fitting fixture reserves measured content within its boxes', () => {
  for (const [width,height] of [[667,307],[667,375],[844,390],[932,430]] as const) {
    for (const layout of Object.values(layoutFixtures)) for (const view of Object.values(privateFixtures)) for (const leader of [false,true]) {
      const placed = placeController(layout,view,{ width,height },leader,{}, { width,height:height+68 });
      if (!placed.fits || !placed.panel) continue;
      const boxes = [...placed.parts,placed.panel];
      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(box.left+box.width).toBeLessThanOrEqual(width);
        expect(box.top+box.height).toBeLessThanOrEqual(height);
      }
      boxes.forEach((a,i) => { boxes.slice(i+1).forEach(b => {
        // Circular face targets in the diamond have overlapping bounding squares.
        if ('control' in a && 'control' in b && a.control.kind === 'button' && b.control.kind === 'button' && a.control.button.startsWith('face') && b.control.button.startsWith('face')) {
          expect(Math.hypot(a.left+a.width/2-b.left-b.width/2,a.top+a.height/2-b.top-b.height/2)).toBeGreaterThanOrEqual((a.width+b.width)/2);
          return;
        }
        expect(a.left < b.left+b.width-0.01 && b.left < a.left+a.width-0.01 && a.top < b.top+b.height-0.01 && b.top < a.top+a.height-0.01,JSON.stringify({layout,view,width,height,leader,a,b})).toBe(false);
      }); });
      const blocks = view.blocks.filter(b => !b.audience || b.audience === 'everyone' || (b.audience === 'leader') === leader);
      blocks.forEach((block,i) => {
        if (block.kind === 'stat') expect(textWidth(String(block.value),placed.metrics.steps[i] ?? 21)).toBeLessThanOrEqual(placed.panel.width);
      });
      for (const part of placed.parts) {
        const c = part.control;
        if (c.kind === 'text') expect(textHeight(c.text,{ title:34,body:21,note:13 }[c.tone ?? 'body'],part.width,true),JSON.stringify({ text:c.text,width:part.width,height:part.height,tone:c.tone })).toBeLessThanOrEqual(part.height);
        if (c.kind !== 'options') continue;
        const columns = Math.min(2,c.options.length), rows = Math.ceil(c.options.length/2);
        for (const option of c.options) {
          const buttonWidth = (part.width-(columns-1)*placed.gap)/columns;
          const buttonHeight = (part.height-(rows-1)*placed.gap)/rows;
          const step = optionLabelStep(option.label,buttonWidth,buttonHeight,Boolean(option.face),c.options.length === 1);
          expect(step).not.toBeNull();
          const available = buttonWidth-(c.options.length === 1 ? 28 : 12)-(option.face ? step === 34 ? 68 : 34 : 0);
          for (const word of option.label.split(/\s+/)) expect(textWidth(word,step ?? 21)).toBeLessThanOrEqual(available);
        }
      }
    }
  }
});
it('CTRL-002 long answers reserve three lines beside their glyph before private content', () => {
  const layout = layoutFixtures['long-answer'];
  if (!layout) throw new Error('Missing long answer');
  for (const width of [667,844,932]) {
    const p = placeController(layout,note,{ width,height:307 },false,{}, { width,height:375 });
    expect(p.fits).toBe(true);
    const part = p.parts[0];
    expect(part?.width).toBeGreaterThan(350);
  }
});
it('CTRL-002 eight long options keep their content floor beside private text', () => {
  const layout = { revision:1,controls:[{ kind:'options' as const,id:'eight',options:Array.from({ length:8 },(_,i) => ({ id:String(i),label:'Word '.repeat(8).trim() })) }] };
  const p = placeController(layout,privateFixtures.text,{ width:667,height:307 },false,{}, { width:667,height:375 });
  expect(p.parts[0]?.width).toBeGreaterThan(450);
  if (p.fits) expect(textHeight(layout.controls[0]?.options[0]?.label ?? '',21,((p.parts[0]?.width ?? 0)-p.gap)/2-12,true)).toBeLessThanOrEqual((307-2*p.margin-3*p.gap)/4-12);
});
it('CTRL-002 a long text control with options reserves its full column height', () => {
  const layout = { revision:1,controls:[{ kind:'text' as const,id:'words',text:'Word '.repeat(24).trim() },...picker.controls.filter(c => c.kind === 'options')] };
  const p = placeController(layout,note,{ width:667,height:307 },false,{}, { width:667,height:375 });
  const part = p.parts.find(p => p.control.id === 'words');
  expect(part).toBeDefined();
  expect(part?.width).toBeGreaterThan(144);
  expect(!p.fits || textHeight('Word '.repeat(24).trim(),21,part?.width ?? 0) <= (part?.height ?? 0)).toBe(true);
});

it('CTRL-003 stat figures step down as whole lines and reject a too-narrow floor', () => {
  const blocks = [{ kind:'stat' as const,label:'Round points',value:12345 }];
  const metrics = panelMetrics(blocks,100,300,13);
  expect(metrics.fits).toBe(true);
  expect(metrics.steps).toEqual([21]);
  expect(textWidth('12345',metrics.steps[0] ?? 21)).toBeLessThanOrEqual(100);
  expect(panelMetrics(blocks,60,300,13).fits).toBe(false);
});
it('CTRL-002 control-only grids and eight cards retain the main phone contract', { timeout: conformanceTimeout(1568) }, () => {
  const layouts = [
    { revision:1,controls:[{ kind:'grid' as const,id:'big-grid',rows:3,cols:8,cells:Array.from({ length:24 },(_,i) => ({ label:String(i) })) }] },
    { revision:1,controls:[{ kind:'cards' as const,id:'cards8',cards:Array.from({ length:8 },(_,i) => ({ id:String(i),label:'Q' })) }] },
  ];
  for (const layout of layouts) {
    const report = runConformance({ ...dots,controllerLayout:() => layout,privateView:() => null },[{ name:'control-only legacy fit',players:2 }],{ sources:[],stopOnFailure:['layout'] });
    expect(report.checks.find(c => c.id === 'layout')?.status,JSON.stringify(report.checks.find(c => c.id === 'layout'))).toBe('pass');
  }
});

it('CTRL-003 D-132 long-answer and Your picks are secret fit whole words at both phone heights', () => {
  const layout = layoutFixtures['long-answer'];
  if (!layout) throw new Error('Missing long answer');
  for (const height of [375,307]) {
    const p = placeController(layout,note,{ width:667,height },false,{}, { width:667,height:375 });
    expect(p.fits).toBe(true);
    expect(checkPrivatePhoneFit(layout,note,{ width:667,height })).toEqual([]);
    const part = p.parts.find(part => part.control.kind === 'options');
    if (part?.control.kind !== 'options') throw new Error('Missing options');
    const width = (part.width-p.gap)/2, buttonHeight = (part.height-p.gap)/2;
    const label = 'Modular Interface of Digital Instruments';
    expect(part.control.options[0]?.label).toBe(label);
    expect(optionLabelStep(label,width,buttonHeight,true)).toBe(21);
    expect(textWidth('Instruments',21)+34+12).toBeLessThanOrEqual(width);
    expect(textHeight(label,34,width-68-12,true)).toBeGreaterThan(buttonHeight-12);
  }
});
it('CTRL-003 unbreakable options step down or reject rather than overflow', () => {
  const word = 'Supercalifragilistic';
  expect(optionLabelStep(word,260,160,true)).toBe(21);
  expect(optionLabelStep(word.repeat(8),260,160,true)).toBeNull();
  const layout = { revision:1,controls:[{ kind:'options' as const,id:'words',options:[{ id:'a',label:word.repeat(8),face:'face-left' as const }] }] };
  expect(placeController(layout,note,{ width:667,height:307 },false,{}, { width:667,height:375 }).fits).toBe(false);
  expect(checkPrivatePhoneFit(layout,note).length).toBeGreaterThan(0);
});
it('CTRL-003 text, private text, stat labels and both grids reject unbreakable words outside their floors', () => {
  const word = 'Supercalifragilistic'.repeat(10);
  expect(controlContentFits([{ control:{ kind:'text',id:'t',text:word },left:0,top:0,width:100,height:300 }],8)).toBe(false);
  expect(controlContentFits([{ control:{ kind:'grid',id:'g',rows:1,cols:1,cells:[{ label:word }] },left:0,top:0,width:89,height:89 }],8)).toBe(false);
  for (const block of [{ kind:'text' as const,text:word },{ kind:'stat' as const,label:word,value:1 },{ kind:'grid' as const,rows:1,cols:1,cells:[{ label:word }] }]) {
    expect(panelMetrics([block],100,300,8).fits).toBe(false);
  }
  const grid = [{ kind:'grid' as const,rows:1,cols:1,cells:[{ label:'Supercalifragilistic' }] }];
  const metrics = panelMetrics(grid,200,300,8);
  expect(metrics.fits).toBe(true);
  expect(metrics.heights[0]).toBeGreaterThanOrEqual(textWidth('Supercalifragilistic',13)+12);
  expect(panelMetrics([{ kind:'text',text:'Supercalifragilistic' }],150,300,8).steps).toEqual([13]);
});

it('CTRL-003 D-140 text-control whole words allow exactly one px of overhang', () => {
  const text = 'Title', width = textWidth(text,34);
  const fits = (available:number) => controlContentFits([{ control:{ kind:'text',id:'title',tone:'title',text },left:0,top:0,width:available,height:100 }],13);
  expect(fits(width-1)).toBe(true);
  expect(fits(width-1.1)).toBe(false);
});
it('CTRL-003 D-140 private grid metrics choose one largest step for all labels', () => {
  const block = { kind:'grid' as const,rows:1,cols:2,cells:[{ label:'I' },{ label:'Kitchen' }] };
  const metrics = panelMetrics([block],240,150,13);
  expect(metrics.fits).toBe(true);
  const cell = (metrics.heights[0] ?? 0);
  const step = [34,21,13].find(size => block.cells.every(c => textHeight(c.label,size,cell-12,true) <= cell-12));
  expect(metrics.steps[0]).toBe(step);
});

it('CTRL-003 rejects every-kind controls with text strip views at every phone size', () => {
  for (const [width,height] of [[667,307],[667,375],[844,390],[932,430]])
    for (const name of ['text','long-text','picker']) for (const leader of [false,true]) {
      const layout = layoutFixtures.every, view = privateFixtures[name];
      if (!layout || !view || !width || !height) throw new Error('Missing fixture');
      expect(placeController(layout,view,{width,height},leader,{}, {width,height:height+68}).fits).toBe(false);
    }
});

it('RZ-003 CTRL-003 caps short guest answers at 34 in the actual placed grid', () => {
  const labels = ['Christopher Walken','David Hasselhoff','Jerry Springer','Patrick Swayze'];
  const layout = {revision:1,controls:[{kind:'options' as const,id:'answer',options:labels.map((label,i) => ({id:String(i),label,face:'face-bottom' as const}))}]};
  const placed = placeController(layout,{revision:1,blocks:[{kind:'text',tone:'note',text:'Score 0'}]},{width:844,height:322},false,{}, {width:844,height:390});
  expect(placed.fits).toBe(true);
  const grid = placed.parts[0];
  if (!grid) throw new Error('Missing grid');
  expect(grid).toMatchObject({left:13,top:81,width:813,height:228});
  for (const label of labels) expect(optionLabelStep(label,(grid.width-placed.gap)/2,(grid.height-placed.gap)/2,true)).toBe(34);
});
