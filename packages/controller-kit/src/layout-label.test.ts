import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import type { VNode } from 'preact';
import { LayoutEngine } from './layout-renderer';
import type { LayoutPart } from './layout-types';
import { placeLayout } from './layout-placement';
import { layoutFixtures } from '../../../apps/web/src/layout-fixtures';
import { observeLabelGroup, labelCellBox, measureLabelGroup, labelTypeStep, measureLabelTypeStep, measureLabelLineWidth, measureOptionWidth } from './layout-label';
const hooks = vi.hoisted(() => ({index:0,refs:[] as {current:unknown}[],effects:[] as {run:()=>undefined | (()=>void);deps:readonly unknown[]}[]}));
vi.mock('preact/hooks',() => ({
  useMemo:(compute:()=>unknown) => compute(),
  useState:(initial:unknown) => [initial,()=>{ /* no state updates in this fixture */ }],
  useRef:(initial:unknown) => hooks.refs[hooks.index++] ?? (hooks.refs[hooks.index-1] = {current:initial}),
  useLayoutEffect:(run:()=>undefined | (()=>void),deps:readonly unknown[]) => { hooks.effects.push({run,deps}); },
}));
function children<P>(node:VNode<P>): VNode[] {
  const value = (node.props as {children?:VNode | VNode[]}).children;
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}
it('keeps fitting labels at 34, including an exact fit (D-127)', () => {
  expect(labelTypeStep({ width:100,height:34 },{ width:100,height:34 })).toBe(34);
  expect(labelTypeStep({ width:89,height:34 },{ width:144,height:68 })).toBe(34);
});
it('steps labels to 21 for either measured overflow dimension (D-127)', () => {
  expect(labelTypeStep({ width:145,height:34 },{ width:144,height:68 })).toBe(21);
  expect(labelTypeStep({ width:144,height:136 },{ width:144,height:100 })).toBe(21);
});

function measureFixture(naturalWidth: number, wrappedHeight: number, columnGap = '13px', padding = '13px', buttonWidth = 217, buttonHeight = 68, wordWidth = 0, clientWidth = 55) {
  const style = { cssText:'',flex:'',width:'',whiteSpace:'' };
  const label = {
    style, clientWidth, scrollWidth:wordWidth,
    getBoundingClientRect:() => ({ width:style.width === 'max-content' ? naturalWidth : 123,height:style.whiteSpace === 'nowrap' ? 34 : wrappedHeight }),
  } as unknown as HTMLElement;
  const button = {
    clientWidth:buttonWidth,clientHeight:buttonHeight,
    getBoundingClientRect:() => ({width:buttonWidth}),
    querySelector:() => ({ getBoundingClientRect:() => ({ width:55 }) }),
  } as unknown as HTMLButtonElement;
  vi.stubGlobal('getComputedStyle',() => ({ paddingLeft:padding,paddingRight:padding,paddingTop:'5px',paddingBottom:'5px',columnGap,lineHeight:'34px' }));
  try { return measureLabelTypeStep(button,label); }
  finally { vi.unstubAllGlobals(); }
}
it('CTRL-002 keeps Lock in at 34 when its natural width fits the button beside its face', () => {
  // 217 - 26 padding - 55 face - 13 gap = 123, despite a 55 px flex span.
  expect(measureFixture(110,34)).toBe(34);
  expect(measureFixture(123,34)).toBe(34);
});
it('CTRL-002 steps long answers to 21 and measures wrapped height within the button', () => {
  // Modular Interface of Digital Instruments exceeds the one-line 34 px space.
  expect(measureFixture(680,204)).toBe(21);
  expect(measureFixture(110,68)).toBe(21);
});
it('CTRL-002 keeps the only-child span nowrap at step 34 and permits wrapping only at 21', () => {
  const css = readFileSync(new URL('./layout.css',import.meta.url),'utf8');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const whiteSpace = (step:string) => rules.filter(([,selector]) => selector?.includes(".ka-layout-options[data-single-option='true'] > button") && (!selector.includes('[data-label-step=') || selector.includes(`[data-label-step="${step}"]`)))
    .flatMap(([, ,body]) => [...(body ?? '').matchAll(/white-space:\s*(\w+)/g)].map(match => match[1])).at(-1);
  expect(whiteSpace('34')).toBe('normal');
  expect(whiteSpace('21')).toBe('normal');
});

it('CTRL-002 treats normal gaps and non-finite padding as zero and retains step 34', () => {
  expect(measureFixture(130,34,'normal')).toBe(34);
  expect(measureFixture(150,34,'normal','auto')).toBe(34);
});
it('CTRL-002 never steps down when any input dimension is non-finite', () => {
  for (const invalid of [NaN,Infinity,-Infinity]) {
    for (const dimension of ['width','height'] as const) {
      expect(labelTypeStep({ width:680,height:204,[dimension]:invalid },{ width:123,height:58 })).toBe(34);
      expect(labelTypeStep({ width:680,height:204 },{ width:123,height:58,[dimension]:invalid })).toBe(34);
    }
  }
});
it('CTRL-002 gives step-21 labels the remaining flex width instead of their shrunk intrinsic width', () => {
  const css = readFileSync(new URL('./layout.css',import.meta.url),'utf8');
  expect(css).toMatch(/\.ka-layout-target\[data-label-step="21"\] > span\s*\{[^}]*flex: 0 1 auto;[^}]*white-space: normal;/);
});

it('CTRL-002 selects 21 for Modular Interface of Digital Instruments in a 667 answer button', () => {
  // Two columns: (667 - 2 * 13 outer margins - 13 gap) / 2 = 314.
  // Mock font bounds; the browser UAT remains responsible for actual font fit.
  const available = { width:314 - 10 - 55 - 13,height:134 - 10 };
  expect(measureFixture(680,170,'13px','5px',314,134)).toBe(21);
  // At 21 px the measured four-line label uses 84 px of the content height.
  expect(220).toBeLessThanOrEqual(available.width);
  expect(84).toBeLessThanOrEqual(available.height);
});

function optionFixture(step: 21 | 34, liveWidth: number, finite = true) {
  const original = `font-size: ${String(step)}px; width: ${String(liveWidth)}px;`;
  const style = { cssText:original, fontSize:`${String(step)}px`, flex:'1 1 0', width:`${String(liveWidth)}px`, whiteSpace:'normal' };
  const label = { style, getBoundingClientRect:() => ({
    width:style.fontSize === 'var(--ka-phone-type-34)' && style.flex === 'none'
      && style.width === 'max-content' && style.whiteSpace === 'nowrap' ? 110 : liveWidth,
  }) } as unknown as HTMLElement;
  const button = { getBoundingClientRect:() => ({width:217}), querySelector:() => ({ getBoundingClientRect:() => ({ width:55 }) }) } as unknown as HTMLElement;
  vi.stubGlobal('getComputedStyle',() => ({
    columnGap:finite ? '13px' : 'normal', paddingLeft:finite ? '13px' : 'auto',
    paddingRight:finite ? '13px' : 'Infinity', borderLeftWidth:finite ? '3px' : 'auto', borderRightWidth:finite ? '3px' : 'NaN',
  }));
  try {
    const width = measureOptionWidth(button,label);
    expect(style.cssText).toBe(original);
    return width;
  } finally { vi.unstubAllGlobals(); }
}
it('CTRL-002 measures the same natural option width at either live type step and span width', () => {
  for (const step of [21,34] as const) {
    for (const width of [44,55,110,200]) expect(optionFixture(step,width)).toBe(210);
  }
});
it('CTRL-002 makes option gap, padding and border reads finite-safe', () => {
  expect(optionFixture(21,44,false)).toBe(165);
});
it('CTRL-002 gives the 667 × 307 picker its natural 34 px Lock in width', () => {
  const picker = layoutFixtures.picker;
  if (!picker) throw new Error('Missing picker fixture');
  const width = optionFixture(21,44);
  const placement = placeLayout(picker,{ width:667,height:307 },false,{ lock:width },{ width:667,height:375 });
  const action = placement.parts.find(p => p.control.id === 'lock');
  expect(placement.fits).toBe(true);
  expect(action?.width).toBe(210);
  expect(labelTypeStep({ width:110,height:34 },{
    width:(action?.width ?? 0)-26-6-55-13,height:(action?.height ?? 0)-10-6,
  })).toBe(34);
});

it('CTRL-003 keeps a two-line 34 px label when its wrapped height fits', () => { expect(measureFixture(200,68,'13px','5px',217,100)).toBe(34); });

it('CTRL-003 steps down when Instruments overflows a wrapped span despite fitting height', () => {
  expect(measureFixture(680,120,'13px','5px',225,170,204)).toBe(21);
});

it('RZ-003 RZ-005 uses the bold token for 21 px option labels on colour', () => {
  const css = readFileSync(new URL('./layout.css',import.meta.url),'utf8');
  expect(css).toMatch(/\.ka-layout-target\[class\*='ka-kit-'\]\[data-label-step="21"\] > span[^{}]*\{\s*font-weight:var\(--ka-weight-bold\)/);
});

it('CTRL-003 measures identical line widths and type steps during press scale', () => {
  let scale = 1;
  const style = {cssText:'',width:'',whiteSpace:''};
  const label = {style,scrollWidth:110,scrollHeight:34,getBoundingClientRect:() => ({width:110*scale,height:34*scale})} as unknown as HTMLElement;
  const button = {offsetWidth:217,clientWidth:211,clientHeight:68,
    getBoundingClientRect:() => ({width:217*scale}),
    querySelector:() => ({getBoundingClientRect:() => ({width:55*scale})}),
  } as unknown as HTMLButtonElement;
  vi.stubGlobal('getComputedStyle',() => ({paddingLeft:'13px',paddingRight:'13px',paddingTop:'5px',paddingBottom:'5px',columnGap:'13px'}));
  vi.stubGlobal('document',{createRange:() => ({selectNodeContents:() => { /* Mock range content. */ },getClientRects:() => [{width:110*scale}]})});
  try {
    const normal = {width:measureLabelLineWidth(button,label),step:measureLabelTypeStep(button,label)};
    scale = 0.97;
    expect({width:measureLabelLineWidth(button,label),step:measureLabelTypeStep(button,label)}).toEqual(normal);
  } finally { vi.unstubAllGlobals(); }
});

it('RZ-003 RZ-005 retains 34 when a fitting probe rounds up its CSSOM width', () => {
  // Fractional column/scale geometry leaves just under 323 px for the label.
  // CSSOM rounds both clientWidth and scrollWidth to 323; neither overflows.
  for (const width of [400.99999,401]) {
    expect(measureFixture(350,68,'13px','5px',width,110,323,323)).toBe(34);
  }
  // A real unbreakable word still overflows the same probe.
  expect(measureFixture(350,68,'13px','5px',400.99999,110,324,323)).toBe(21);
});

it('CTRL-003 measures placed boxes independently of stale live geometry and transforms', () => {
  const probeStyle = {width:'',whiteSpace:''};
  const remove = vi.fn();
  const probe = {style:probeStyle,textContent:'',remove,clientWidth:319,scrollWidth:319,
    clientHeight:44,scrollHeight:44,
    getBoundingClientRect:() => ({width:probeStyle.width === 'max-content' ? 286 : parseFloat(probeStyle.width),height:probeStyle.whiteSpace === 'nowrap' || parseFloat(probeStyle.width) > 300 ? 44 : 100}),
  };
  const label = {textContent:'Christopher Walken'} as HTMLElement;
  const button = {clientWidth:1,clientHeight:1,querySelector:() => ({})} as unknown as HTMLButtonElement;
  vi.stubGlobal('getComputedStyle',() => ({width:'55px',fontSize:'34px',lineHeight:'44px',
    borderLeftWidth:'3px',borderRightWidth:'3px',borderTopWidth:'3px',borderBottomWidth:'3px',
    paddingLeft:'5px',paddingRight:'5px',paddingTop:'5px',paddingBottom:'5px',columnGap:'13px'}));
  vi.stubGlobal('document',{createElement:() => probe,body:{append:vi.fn()}});
  try {
    expect(measureLabelTypeStep(button,label,{width:314,height:110})).toBe(21);
    // No live button size, range or transform is read after placement changes.
    probe.clientWidth = probe.scrollWidth = 319;
    expect(measureLabelTypeStep(button,label,{width:402.5,height:110})).toBe(34);
    expect(remove).toHaveBeenCalledTimes(2);
  } finally { vi.unstubAllGlobals(); }
});

it('CTRL-003 shares measured steps within each group and restores 34 after resize', () => {
  let narrow = false;
  const buttons = Array.from({ length:4 },(_,index) => {
    const label = { style:{},textContent:String(index) };
    return { style:{},dataset:{labelStep:'34'},querySelector:(selector:string) => selector === ':scope > span' ? label : null,
      getBoundingClientRect:() => ({width:300}),label };
  });
  const single = { ...buttons[0],style:{},dataset:{labelStep:'34'} };
  const probeStyle = {width:'',whiteSpace:''};
  const probe = { style:probeStyle,textContent:'',remove:vi.fn(),clientWidth:100,scrollWidth:100,clientHeight:34,scrollHeight:34,
    getBoundingClientRect:() => ({width:200,height:probeStyle.whiteSpace === 'nowrap' ? 34 : narrow && probe.textContent === '2' ? 136 : 68}),
  };
  vi.stubGlobal('getComputedStyle',() => ({fontSize:'34px',width:'300px'}));
  vi.stubGlobal('document',{createElement:() => { const copy = { ...probe,style:{width:'',whiteSpace:''} }; copy.getBoundingClientRect = () => ({width:200,height:copy.style.whiteSpace === 'nowrap' ? 34 : narrow && copy.textContent === '2' ? 136 : 68}); return copy; },body:{append:vi.fn()},
    createRange:() => ({selectNodeContents:vi.fn(),getClientRects:() => [{width:100}]})});
  const group = buttons as unknown as HTMLButtonElement[];
  try {
    const box = {width:300,height:100};
    measureLabelGroup(group,box);
    expect(buttons.map(button => button.dataset.labelStep)).toEqual(['34','34','34','34']);
    narrow = true;
    measureLabelGroup(group,{...box,width:200});
    expect(buttons.map(button => button.dataset.labelStep)).toEqual(['21','21','21','21']);
    // A separate single-control group retains its own measurement.
    measureLabelGroup([single as unknown as HTMLButtonElement],box);
    expect(single.dataset.labelStep).toBe('34');
    expect(buttons.map(button => button.dataset.labelStep)).toEqual(['21','21','21','21']);
    narrow = false;
    measureLabelGroup(group,box);
    expect(buttons.map(button => button.dataset.labelStep)).toEqual(['34','34','34','34']);
    expect(probe.remove).toHaveBeenCalledTimes(26);
  } finally { vi.unstubAllGlobals(); }
});

it('CTRL-003 limits 34 px option labels to three measured lines even in a tall box', () => {
  expect(measureFixture(680,102,'13px','5px',314,250)).toBe(34);
  expect(measureFixture(680,136,'13px','5px',314,250)).toBe(21);
});

it('CTRL-003 measures grid cells using the drawn gap', () => {
  expect(labelCellBox('grid',400,400,4,4,13)).toEqual({width:94,height:94});
  expect(labelCellBox('grid',400,400,4,4,5)).toEqual({width:96.25,height:96.25});
  expect(labelCellBox('options',400,400,2,2,13)).toEqual({width:193.5,height:193.5});
});

it('CTRL-003 D-205 schedules one 16-target group pass per trigger and remeasures theme line-height', async () => {
  let lineHeight = 34;
  const buttons = Array.from({length:16},() => ({style:{},dataset:{labelStep:'34'},
    getBoundingClientRect:() => ({width:300}),label:{style:{},textContent:'two lines'},querySelector(selector:string) { return selector === ':scope > span' ? this.label : null; }}));
  const mount = vi.fn();
  let frame:(() => void) | undefined;
  const flush = () => { const callback = frame; frame = undefined; callback?.(); };
  let resize = () => { /* supplied by observer */ }, theme = () => { /* supplied by observer */ };
  let ready:() => void = () => { /* supplied by promise */ };
  const fonts = Object.assign(new EventTarget(),{status:'loaded',ready:new Promise<void>(resolve => { ready = resolve; })});
  const shell = {};
  const group = {querySelectorAll:() => buttons,closest:() => shell} as unknown as HTMLElement;
  vi.stubGlobal('requestAnimationFrame',(callback:() => void) => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.stubGlobal('ResizeObserver',class { constructor(callback:() => void) { resize = callback; } observe() { resize(); } disconnect() { /* mock cleanup */ } });
  vi.stubGlobal('MutationObserver',class { constructor(callback:() => void) { theme = callback; } observe() { /* manual notification */ } disconnect() { /* mock cleanup */ } });
  vi.stubGlobal('window',new EventTarget());
  vi.stubGlobal('getComputedStyle',() => ({fontSize:'34px',lineHeight:`${String(lineHeight)}px`,width:'300px'}));
  vi.stubGlobal('document',{fonts,body:{append:mount},createElement:() => {
    const probe = {style:{width:'',whiteSpace:''},textContent:'',remove:vi.fn(),scrollWidth:0,clientWidth:300,scrollHeight:0,clientHeight:100,
      getBoundingClientRect:() => ({width:200,height:probe.style.whiteSpace === 'nowrap' ? lineHeight : 2*lineHeight})}; return probe;
  },createRange:() => ({selectNodeContents:vi.fn(),getClientRects:() => [{width:100}]})});
  let control: Extract<LayoutPart,{kind:'grid'}> = {kind:'grid',id:'grid',cols:4,rows:4,cells:buttons.map(() => ({label:'two lines',state:'plain' as const}))};
  let dependency:readonly unknown[] | undefined, cleanup:(()=>void) | undefined;
  hooks.refs = []; hooks.index = 0;
  const rerender = () => {
    hooks.index = 0; hooks.effects = [];
    const tree = LayoutEngine({layout:{revision:1,controls:[control]},area:{width:844,height:322},viewport:{width:844,height:390},onOutput:()=>{ /* no inputs */ }});
    const wrapper = children(tree)[1];
    const part = wrapper && children(wrapper)[0];
    if (!part || typeof part.type !== 'function') throw new Error('Missing Part');
    hooks.index = 10; hooks.effects = [];
    (part.type as (props:unknown)=>VNode)(part.props);
    const ref = hooks.refs[10], effect = hooks.effects[0];
    if (!ref || !effect) throw new Error('Missing group owner');
    ref.current = group;
    if (!dependency || effect.deps.some((value,index)=>value !== dependency?.[index])) {
      cleanup?.();
      const dispose = effect.run();
      cleanup = typeof dispose === 'function' ? dispose : undefined;
      dependency = effect.deps;
    }
  };
  rerender();
  try {
    // The placed box is measured in the layout effect, before any RAF.
    expect(mount).toHaveBeenCalledTimes(32);
    ready(); await Promise.resolve(); flush(); expect(mount).toHaveBeenCalledTimes(32);
    control = {...control,cells:control.cells.map(cell => ({...cell,state:'selected' as const}))};
    rerender(); flush(); expect(mount).toHaveBeenCalledTimes(32);
    control = {...control,cells:control.cells.map(cell => ({...cell,label:'changed label'}))};
    buttons.forEach(button => { button.label.textContent = 'changed label'; });
    rerender(); flush(); expect(mount).toHaveBeenCalledTimes(64);
    cleanup?.();
    // Continue exercising subsequent notifications on a fresh installed owner.
    cleanup = observeLabelGroup(group,{width:300,height:86.5});
    mount.mockClear();
    resize(); resize(); flush(); expect(mount).toHaveBeenCalledTimes(32);
    expect(buttons.every(button => button.dataset.labelStep === '34')).toBe(true);
    fonts.dispatchEvent(new Event('loadingdone')); flush(); expect(mount).toHaveBeenCalledTimes(64);
    resize(); flush(); expect(mount).toHaveBeenCalledTimes(96);
    window.dispatchEvent(new Event('resize')); flush(); expect(mount).toHaveBeenCalledTimes(128);
    lineHeight = 44; theme(); theme(); flush(); expect(mount).toHaveBeenCalledTimes(160);
    cleanup();
    expect(buttons.every(button => button.dataset.labelStep === '21')).toBe(true);
  } finally { cleanup?.(); vi.unstubAllGlobals(); }
});

it('RZ-003 D-205 restores four two-line names to 34 before the placed group paints', () => {
  const names = ['Christopher Walken','Jerry Springer','David Hasselhoff','Patrick Swayze'];
  const buttons = names.map(textContent => ({style:{},dataset:{labelStep:'21'},
    label:{style:{},textContent},getBoundingClientRect:() => ({width:402.5}),
    querySelector(selector:string) { return selector === ':scope > span' ? this.label : {}; }}));
  const frame = vi.fn();
  const mounts: unknown[] = [];
  vi.stubGlobal('requestAnimationFrame',frame);
  vi.stubGlobal('ResizeObserver',class { observe() { /* no notification yet */ } disconnect() { /* cleanup */ } });
  vi.stubGlobal('MutationObserver',class { observe() { /* no notification yet */ } disconnect() { /* cleanup */ } });
  vi.stubGlobal('window',new EventTarget());
  vi.stubGlobal('getComputedStyle',() => ({fontSize:'34px',lineHeight:'44px',width:'55px',
    borderLeftWidth:'3px',borderRightWidth:'3px',borderTopWidth:'3px',borderBottomWidth:'3px',
    paddingLeft:'5px',paddingRight:'5px',paddingTop:'5px',paddingBottom:'5px',columnGap:'13px'}));
  vi.stubGlobal('document',{fonts:Object.assign(new EventTarget(),{ready:new Promise<void>(() => { /* pending until after paint */ })}),
    body:{append:(probe:unknown) => mounts.push(probe)},createElement:() => {
      const probe = {style:{width:'',whiteSpace:''},textContent:'',remove:vi.fn(),
        clientWidth:319,scrollWidth:319,clientHeight:88,scrollHeight:88,
        getBoundingClientRect:() => {
          // All eight probes must be mounted before the first geometry read.
          expect(mounts).toHaveLength(8);
          return {width:probe.style.whiteSpace === 'nowrap' ? 463 : parseFloat(probe.style.width),
            height:probe.style.whiteSpace === 'nowrap' ? 44 : 88};
        }};
      return probe;
    },createRange:() => ({selectNodeContents:vi.fn(),getClientRects:() => [{width:280}]})});
  const group = {querySelectorAll:() => buttons,closest:() => null} as unknown as HTMLElement;
  try {
    const dispose = observeLabelGroup(group,labelCellBox('options',818,233,2,2,13));
    expect(buttons.map(button => button.dataset.labelStep)).toEqual(['34','34','34','34']);
    expect(frame).not.toHaveBeenCalled();
    dispose();
  } finally { vi.unstubAllGlobals(); }
});

it('CTRL-003 does no style, probe or range work for face-down empty labels', () => {
  const read = vi.fn();
  vi.stubGlobal('getComputedStyle',read);
  const button = {querySelector:() => ({textContent:''})} as unknown as HTMLButtonElement;
  try { measureLabelGroup([button],{width:89,height:68}); expect(read).not.toHaveBeenCalled(); }
  finally { vi.unstubAllGlobals(); }
});
