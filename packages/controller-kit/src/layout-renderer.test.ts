import { afterEach, expect, it, vi } from 'vitest';
import type { VNode } from 'preact';
import { LayoutEngine } from './layout-renderer';
import type { Layout, LayoutOutput } from './layout-types';
const hooks = vi.hoisted(() => ({ updates:[] as unknown[], refs:[] as { current:unknown }[], index:0, effects:[] as (() => undefined | (() => void))[] }));
vi.mock('preact/hooks',() => ({
  useMemo:(compute:() => unknown) => compute(),
  useRef:(initial:unknown) => hooks.refs[hooks.index++] ?? (hooks.refs[hooks.index-1] = { current:initial }),
  useState:(initial:unknown) => [initial,(value:unknown) => { hooks.updates.push(value); }],
  useLayoutEffect:(effect:() => undefined | (() => void)) => { hooks.effects.push(effect); },
}));
afterEach(() => { hooks.updates = []; hooks.refs = []; hooks.index = 0; hooks.effects = []; vi.unstubAllGlobals(); });
function engine(layout:Layout,onOutput:(output:LayoutOutput) => void = vi.fn()) {
  hooks.index = 0; hooks.effects = [];
  return LayoutEngine({ layout,viewport:{ width:844,height:390 }, area:{ width:844,height:322 },onOutput });
}
function children<P>(node:VNode<P>): VNode[] {
  const value = (node.props as { children?:VNode | VNode[] }).children;
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}
function invoke(node:VNode): VNode {
  if (typeof node.type !== 'function') throw new Error('Expected component');
  return (node.type as (props:unknown) => VNode)(node.props);
}
it('CTRL-002 accepts a wire state-only revision bump through the engine', () => {
  const before:Layout = { revision:1,controls:[{ kind:'grid',id:'cells',rows:1,cols:1,cells:[{}] }] };
  engine(before); hooks.effects.forEach(effect => { effect(); });
  expect(() => engine({ revision:2,controls:[{ kind:'grid',id:'cells',rows:1,cols:1,cells:[{ state:'selected' }] }] })).not.toThrow();
  expect(children(engine(before))).toHaveLength(2);
});
it('CTRL-006 disabled held faces give feedback and release at the press revision after surviving a layout change', () => {
  const onOutput = vi.fn();
  const layout:Layout = { revision:1,controls:[{ kind:'button',id:'face',button:'face-top',label:'Act',disabled:true }] };
  const renderTarget = (input:Layout) => {
    const wrapper = children(engine(input,onOutput))[1]; if (!wrapper) throw new Error('No part');
    // Component hook storage belongs to each mounted instance.
    hooks.index = 10;
    const partNode = children(wrapper)[0]; if (!partNode) throw new Error('No content');
    const part = invoke(partNode);
    hooks.index = 20;
    const targetNode = children(part)[0]; if (!targetNode) throw new Error('No target');
    return invoke(targetNode);
  };
  const target = renderTarget(layout);
  expect((target.props as Record<string,unknown>)['aria-disabled']).toBe(true);
  expect((target.props as Record<string,unknown>).disabled).toBeUndefined();
  expect((target.props as Record<string,unknown>)['aria-pressed']).toBeUndefined();
  class Button extends EventTarget {
    dataset = { control:'face',held:'false' }; style = { transform:'' }; offsetWidth = 110; offsetHeight = 110;
    getBoundingClientRect() { return { left:0,top:0,width:110,height:110 }; }
    getAnimations() { return []; } animate = vi.fn(); setPointerCapture() { /* browser stub */ }
  }
  const button = new Button();
  vi.stubGlobal('window',new EventTarget()); vi.stubGlobal('document',Object.assign(new EventTarget(),{ hidden:false }));
  const ref = hooks.refs[20]; if (!ref) throw new Error('No target ref'); ref.current = button;
  const effect = hooks.effects.at(-1); const dispose = effect?.();
  const pointer = (type:string) => { const event = new Event(type,{ cancelable:true }); Object.assign(event,{ button:0,pointerId:1,clientX:55,clientY:55 }); button.dispatchEvent(event); };
  try {
    pointer('pointerdown'); expect(button.dataset.held).toBe('true'); expect(button.style.transform).toBe('scale(0.97)');
    renderTarget({ ...layout,revision:2 }); pointer('pointerup');
    expect(onOutput.mock.calls.map(call => call[0] as LayoutOutput)).toEqual([
      { control:'face',phase:'press',value:true,revision:1 },{ control:'face',phase:'release',value:false,revision:1 },
    ]);
  } finally { if (typeof dispose === 'function') dispose(); }
});

it('CTRL-002 D-pad releases retain the press revision across a surviving update', () => {
  const onOutput = vi.fn<(output:LayoutOutput) => void>();
  const pad = (revision:number) => {
    const wrapper = children(engine({ revision,controls:[{ kind:'dpad',id:'pad' }] },onOutput))[1];
    if (!wrapper) throw new Error('No wrapper');
    const part = children(wrapper)[0]; if (!part) throw new Error('No part');
    hooks.index = 10;
    const node = children(invoke(part))[0]; if (!node) throw new Error('No pad');
    return node.props as unknown as { onPress:(direction:string) => void; onRelease:(direction:string) => void };
  };
  pad(1).onPress('Up'); pad(2).onRelease('Up');
  expect(onOutput.mock.calls.map(call => call[0])).toEqual([
    { control:'pad',phase:'press',value:'up',revision:1 },{ control:'pad',phase:'release',value:'up',revision:1 },
  ]);
});

it('CTRL-002 leaves unlabelled cells blank and unshaped options plain', () => {
  const renderItems = (layout:Layout) => {
    const wrapper = children(engine(layout))[1]; if (!wrapper) throw new Error('No wrapper');
    const part = children(wrapper)[0]; if (!part) throw new Error('No part');
    hooks.index = 10;
    const items = children(invoke(part))[0]; if (!items) throw new Error('No items');
    const target = children(items)[0]; if (!target) throw new Error('No target');
    hooks.index = 20;
    return invoke(target);
  };
  const cell = renderItems({ revision:1,controls:[{ kind:'grid',id:'grid',rows:1,cols:1,cells:[{}] }] });
  expect((cell.props as Record<string,unknown>)['aria-label']).toBe('Cell 1');
  expect(children(cell).at(-1)?.props.children).toBe('');
  const option = renderItems({ revision:2,controls:[{ kind:'options',id:'options',options:[{ id:'a',label:'Answer',state:'selected' }] }] });
  expect((option.props as Record<string,unknown>).class).toBe('ka-layout-target');
  expect((option.props as Record<string,unknown>)['aria-pressed']).toBe(true);
});
it('CTRL-002 honours supplied area and reports a backwards revision outside render', () => {
  const layout:Layout = { revision:2,controls:[] };
  const vnode = engine(layout); hooks.effects.forEach(effect => { effect(); });
  expect((vnode.props as { style:Record<string,string> }).style.width).toBe('844px');
  const report = vi.fn(); hooks.index = 0; hooks.effects = [];
  expect(() => LayoutEngine({ layout:{ ...layout,revision:1 },viewport:{ width:844,height:390 }, area:{ width:600,height:300 },onOutput:vi.fn(),onRevisionProblem:report })).not.toThrow();
  expect(report).not.toHaveBeenCalled(); hooks.effects.forEach(effect => { effect(); });
  expect(report).toHaveBeenCalledWith('Layout revision must be a non-decreasing whole number');
});
it('CTRL-002 captures the current DOM only at a tap-signature swap', () => {
  const before:Layout = { revision:1,controls:[{ kind:'options',id:'options',options:[{ id:'a',label:'Answer' }] }] };
  engine(before);
  const cloneNode = vi.fn(() => ({}));
  const ref = hooks.refs[0]; if (!ref) throw new Error('No root');
  ref.current = { cloneNode,querySelector:() => null };
  engine({ ...before });
  engine({ ...before,revision:2 });
  expect(cloneNode).not.toHaveBeenCalled();
  engine({ revision:3,controls:[{ kind:'options',id:'options',options:[{ id:'b',label:'Changed answer' }] }] });
  expect(cloneNode).toHaveBeenCalledExactlyOnceWith(true);
});

it('CTRL-003 private-only score changes snapshot only the panel, never held controls', () => {
  const layout:Layout = { revision:1,controls:[{ kind:'stick',id:'move' }] };
  const render = (value:number) => { hooks.index = 0; hooks.effects = []; return LayoutEngine({ layout,privateView:{ revision:value,blocks:[{ kind:'stat',label:'Points',value }] },area:{ width:667,height:307 },viewport:{ width:667,height:375 },onOutput:vi.fn() }); };
  render(1);
  const cloneControls = vi.fn();
  const clonePanel = vi.fn(() => ({}));
  const ref = hooks.refs[0]; if (!ref) throw new Error('No root');
  ref.current = { cloneNode:cloneControls,querySelector:() => ({ cloneNode:clonePanel }) };
  render(2);
  expect(cloneControls).not.toHaveBeenCalled();
  expect(clonePanel).toHaveBeenCalledExactlyOnceWith(true);
});

// Exercise the actual fit and transition effects with DOM geometry that overflows
// only while an outgoing decorative block participates in scroll measurement.
import { privateFixtures } from '../../../apps/web/src/private-fixtures';
import { layoutFixtures } from '../../../apps/web/src/layout-fixtures';
import { placeController } from './private-panel';
class PrivateNode {
  style:Record<string,string> = {}; inert = false; children:PrivateNode[] = [];
  classes = new Set<string>(); parent:PrivateNode | null = null;
  classList = { contains:(name:string) => this.classes.has(name),add:(name:string) => { this.classes.add(name); } };
  getBoundingClientRect() { return { left:0,top:0 }; }
  offsetLeft = 0; offsetTop = 0; offsetWidth = 100; offsetHeight = 100;
  clientWidth = 100; clientHeight = 100;
  get scrollWidth() { return this.children.some(n => n.classes.has('ka-private-ghost')) ? 1000 : 100; }
  get scrollHeight() { return this.scrollWidth; }
  setAttribute() { /* inert snapshot metadata */ }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); }
  replaceWith(node:PrivateNode) { const parent = this.parent; if (parent) { parent.children[parent.children.indexOf(this)] = node; node.parent = parent; this.parent = null; } }
  append(node:PrivateNode) { node.remove(); this.children.push(node); node.parent = this; }
  insertBefore(node:PrivateNode,incoming:PrivateNode) { node.remove(); this.children.splice(this.children.indexOf(incoming),0,node); node.parent = this; }
  cloneNode():PrivateNode { const node = new PrivateNode(); this.children.forEach(child => { node.append(child.cloneNode()); }); return node; }
  querySelectorAll(selector:string):PrivateNode[] { return selector === '.ka-private-ghost' ? this.children.filter(n => n.classes.has('ka-private-ghost')) : []; }
  querySelector(selector:string) { return selector.includes('ka-private-panel') ? this.children[0] ?? null : null; }
  animations:{ finish:() => void; keyframes:unknown; options:unknown }[] = [];
  animate(keyframes:unknown,options:unknown) { let finish = () => { /* resolved by the test */ }; const finished = new Promise<void>(resolve => { finish = resolve; }); this.animations.push({ finish,keyframes,options }); return { finished,cancel:() => { finish(); } }; }
}
for (const [from,to] of [['cards','text'],['cards','stats'],['revealed','text'],['grid','text'],['stats','rabakz'],['rabakz','stats']] as const) it(`CTRL-003 motion ${from} -> ${to} ignores ghosts and remeasures on completion`, async () => {
  const fonts = Object.assign(new EventTarget(),{ ready:new Promise<void>(() => { /* fonts remain pending */ }) });
  vi.stubGlobal('document',{ fonts,createComment:() => new PrivateNode() });
  vi.stubGlobal('HTMLElement',PrivateNode);
  vi.stubGlobal('window',{ matchMedia:() => ({ matches:false }) });
  vi.stubGlobal('ResizeObserver',class { observe() { /* manual geometry */ } disconnect() { /* no observer */ } });
  const root = new PrivateNode(), panel = new PrivateNode(); root.append(panel);
  const render = (name:string) => {
    hooks.index = 0; hooks.effects = [];
    const view = privateFixtures[name]; if (!view) throw new Error(`Missing private fixture ${name}`);
    return LayoutEngine({ layout:{ revision:1,controls:[] },privateView:view,area:{ width:844,height:390 },viewport:{ width:844,height:390 },onOutput:vi.fn() });
  };
  render(from); const ref = hooks.refs[0]; if (!ref) throw new Error('Missing root'); ref.current = root;
  privateFixtures[from]?.blocks.forEach(() => { panel.append(new PrivateNode()); });
  render(to);
  panel.children = []; privateFixtures[to]?.blocks.forEach(() => { panel.append(new PrivateNode()); });
  // Fit effect precedes the crossfade effect; font completion can measure mid-fade.
  const fit = hooks.effects[2]?.(); hooks.effects[3]?.();
  expect(root.children.some(n => n.classes.has('ka-private-ghost')) || panel.children.some(n => n.classes.has('ka-private-ghost'))).toBe(true);
  fonts.dispatchEvent(new Event('loadingdone'));
  expect(panel.style.visibility).toBe('');
  const animations = [...root.children,...panel.children].flatMap(n => n.animations);
  expect(animations.length).toBeGreaterThan(0);
  panel.style.visibility = 'hidden'; // Completion must actively remeasure.
  animations.forEach(a => { a.finish(); }); await Promise.resolve();
  expect(panel.children.some(n => n.classes.has('ka-private-ghost'))).toBe(false);
  expect(panel.style.visibility).toBe('');
  expect(hooks.updates.at(-1)).toBe(true);
  if (typeof fit === 'function') fit();
});
it('CTRL-003 D-132 word-grid renderer mount agrees with pure placement at review sizes', () => {
  for (const [name,width,height] of [['stick-faces',667,375],['stick-faces',667,443],['shoulders',844,390]] as const) {
    const layout = layoutFixtures[name]; if (!layout) throw new Error(name);
    const area = { width,height:height-68 }, viewport = { width,height };
    const placed = placeController(layout,privateFixtures['grid-words'],area,false,{},viewport);
    hooks.index = 0; hooks.effects = [];
    const words = privateFixtures['grid-words']; if (!words) throw new Error('Missing grid-words fixture');
    const node = LayoutEngine({ layout,privateView:words,area,viewport,onOutput:vi.fn() });
    expect((node.props as unknown as Record<string,unknown>)['data-fits']).toBe(String(placed.fits));
    if (placed.fits && placed.panel) {
      const gridGap = placed.gap === 5 ? 5 : 8;
      const cell = ((placed.metrics.heights[0] ?? 0)-gridGap)/2;
      expect(cell-12).toBeGreaterThanOrEqual(59); // Chrome's measured Dumplings at 13 px.
      const label = new PrivateNode(); label.clientWidth = cell-12;
      // Model Chrome's measured word across the permitted type steps.
      Object.defineProperty(label,'scrollWidth',{ get:() => 59*Number(label.style.fontSize?.match(/type-(\d+)/)?.[1] ?? 13)/13 });
      Object.defineProperty(label,'scrollHeight',{ get:() => 13 });
      const panel = new PrivateNode();
      const grid = new PrivateNode();
      Object.assign(grid,{ contains:(node:PrivateNode) => node === label });
      panel.querySelectorAll = selector => selector === '.ka-private-grid-label' ? [label] : selector === '.ka-layout-grid' ? [grid] : [];
      const root = new PrivateNode(); root.append(panel);
      const ref = hooks.refs[0]; if (!ref) throw new Error('Missing root'); ref.current = root;
      vi.stubGlobal('document',{ fonts:Object.assign(new EventTarget(),{ ready:new Promise<void>(() => { /* pending */ }) }),createComment:() => new PrivateNode() });
      vi.stubGlobal('ResizeObserver',class { observe() { /* manual geometry */ } disconnect() { /* no observer */ } });
      const dispose = hooks.effects[2]?.();
      expect(hooks.updates.at(-1)).toBe(placed.fits);
      expect(panel.style.visibility).toBe('');
      if (typeof dispose === 'function') dispose();
    }
  }
});

it('CTRL-003 restores live styles before a second private change 90 ms into a fade', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('HTMLElement',PrivateNode);
  vi.stubGlobal('window',{ matchMedia:() => ({ matches:false }) });
  vi.stubGlobal('document',{ fonts:Object.assign(new EventTarget(),{ ready:new Promise<void>(() => { /* pending fonts */ }) }),createComment:() => new PrivateNode() });
  vi.stubGlobal('ResizeObserver',class { observe() { /* manual geometry */ } disconnect() { /* no observer */ } });
  const root = new PrivateNode(), panel = new PrivateNode(); root.append(panel); panel.append(new PrivateNode());
  const render = (name:string) => {
    hooks.index = 0; hooks.effects = [];
    LayoutEngine({ layout:{ revision:1,controls:[] },privateView:privateFixtures[name] ?? null,area:{ width:932,height:362 },viewport:{ width:932,height:430 },onOutput:vi.fn() });
  };
  const surface = new PrivateNode();
  root.querySelector = selector => selector === '.ka-layout-surface' ? surface : root.children.find(node => !node.classes.has('ka-private-ghost')) ?? null;
  vi.stubGlobal('getComputedStyle',() => ({ backgroundColor:'var(--ka-paper)',backgroundImage:'radial-gradient(black, transparent)',backgroundSize:'8px 8px',backgroundPosition:'0px 0px' }));
  render('picker'); const ref = hooks.refs[0]; if (!ref) throw new Error('Missing root'); ref.current = root;
  render('long-text'); hooks.effects[2]?.(); hooks.effects[3]?.();
  expect(panel.children.find(node => !node.classes.has('ka-private-ghost'))?.style.backgroundImage).toContain('radial-gradient');
  await vi.advanceTimersByTimeAsync(90);
  render('picker'); hooks.effects[2]?.(); hooks.effects[3]?.();
  [...root.children,...panel.children].flatMap(node => node.animations).forEach(animation => { animation.finish(); });
  await Promise.resolve();
  for (const node of [panel,...panel.children]) for (const property of ['backgroundImage','zIndex','position']) expect(node.style[property] ?? '').toBe('');
  expect(root.children.some(node => node.classes.has('ka-private-ghost'))).toBe(false);
  vi.useRealTimers();
});

it('CTRL-003 D-140 private grid labels share the largest step fitting every label', () => {
  const short = new PrivateNode(), long = new PrivateNode(), grid = new PrivateNode(), panel = new PrivateNode(), root = new PrivateNode();
  for (const [node,factor] of [[short,1],[long,4]] as const) {
    Object.defineProperty(node,'scrollWidth',{ get:() => factor*Number(node.style.fontSize?.match(/type-(\d+)/)?.[1] ?? 34) });
  }
  Object.assign(grid,{ contains:(node:PrivateNode) => node === short || node === long });
  panel.querySelectorAll = selector => selector === '.ka-layout-grid' ? [grid] : selector === '.ka-private-grid-label' ? [short,long] : [];
  root.append(panel);
  engine({ revision:1,controls:[] }); const ref = hooks.refs[0]; if (!ref) throw new Error('Missing root'); ref.current = root;
  vi.stubGlobal('document',{ fonts:Object.assign(new EventTarget(),{ ready:new Promise<void>(() => { /* pending */ }) }) });
  vi.stubGlobal('ResizeObserver',class { observe() { /* manual */ } disconnect() { /* manual */ } });
  hooks.effects[2]?.();
  expect(short.style.fontSize).toBe('var(--ka-phone-type-21)');
  expect(long.style.fontSize).toBe(short.style.fontSize);
  expect(hooks.updates.at(-1)).toBe(true);
});

it('PP-005 D-164 names face-down grid targets by row-major index and preserves selection', () => {
  const layout:Layout = { revision:1,controls:[{ kind:'grid',id:'grid',rows:4,cols:4,
    cells:Array.from({ length:16 },(_,i) => ({ faceDown:true,state:i === 5 ? 'selected' : 'plain' })) }] };
  const wrapper = children(engine(layout))[1]; if (!wrapper) throw new Error('No wrapper');
  const part = children(wrapper)[0]; if (!part) throw new Error('No part');
  hooks.index = 10;
  const items = children(invoke(part))[0]; if (!items) throw new Error('No grid');
  const targets = children(items);
  expect(targets).toHaveLength(16);
  targets.forEach((target,index) => {
    hooks.index = 20+index*4;
    const button = invoke(target), props = button.props as Record<string,unknown>;
    expect(props['aria-label']).toBe(`Card ${String(index+1)}`);
    expect(props['aria-pressed']).toBe(index === 5);
    expect(props.class).toContain('ka-layout-card-back');
    expect(children(button).at(-1)?.props.children).toBeNull();
  });
});

it('PP-020 private notes stay at 13 while Points fits at 89', () => {
  const note = new PrivateNode(), stat = new PrivateNode(), panel = new PrivateNode(), root = new PrivateNode();
  note.classes.add('ka-layout-note');
  panel.querySelectorAll = selector => selector === '.ka-layout-text' ? [note] : selector === '.ka-private-stat-value' ? [stat] : [];
  root.append(panel);
  const view = { revision:1,blocks:[{ kind:'text' as const,tone:'note' as const,text:'Missing picks were filled at random' },{ kind:'stat' as const,label:'Points',value:3 }] };
  const placed = placeController({ revision:1,controls:[] },view,{ width:844,height:322 },false,{}, { width:844,height:390 });
  expect(placed.metrics?.steps).toEqual([13,89]);
  LayoutEngine({ layout:{ revision:1,controls:[] },privateView:view,area:{ width:844,height:322 },viewport:{ width:844,height:390 },onOutput:vi.fn() });
  const ref = hooks.refs[0]; if (!ref) throw Error('Missing root'); ref.current = root;
  vi.stubGlobal('document',{ fonts:Object.assign(new EventTarget(),{ ready:new Promise<void>(() => { /* pending */ }) }) });
  vi.stubGlobal('ResizeObserver',class { observe() { /* manual */ } disconnect() { /* manual */ } });
  hooks.effects[2]?.();
  expect(note.style.fontSize).toBe('var(--ka-phone-type-13)');
  expect(stat.style.fontSize).toBe('var(--ka-phone-type-89)');
  expect(hooks.updates.at(-1)).toBe(true);
});

it('PP-005 copies the full shell felt box and retains its opaque paint during layout crossfade', () => {
  const surface = new PrivateNode(), root = new PrivateNode(), shell = new PrivateNode(), parent = new PrivateNode();
  const rect = { left:0,top:0,width:844,height:390 };
  shell.getBoundingClientRect = () => rect;
  root.getBoundingClientRect = () => ({ ...rect,top:55,height:322 });
  Object.assign(root,{ closest:() => shell,parentElement:parent });
  root.querySelector = () => surface;
  const old = new PrivateNode();
  Object.assign(root,{ cloneNode:() => old });
  vi.stubGlobal('window',Object.assign(new EventTarget(),{ matchMedia:() => ({ matches:false }) }));
  vi.stubGlobal('ResizeObserver',class { observe() { /* manual */ } disconnect() { /* manual */ } });
  let themeChanged = () => { /* observer callback */ };
  const observe = vi.fn(), disconnect = vi.fn();
  vi.stubGlobal('MutationObserver',class {
    constructor(callback:() => void) { themeChanged = callback; }
    observe = observe; disconnect = disconnect;
  });
  const paint = { backgroundColor:'var(--ka-bg)',backgroundImage:'var(--ka-bg-treatment)',backgroundSize:'auto',backgroundPosition:'0px 0px' };
  vi.stubGlobal('getComputedStyle',() => paint);
  engine({ revision:1,controls:[] });
  const ref = hooks.refs[0]; if (!ref) throw Error('Missing root'); ref.current = root;
  const dispose = hooks.effects[4]?.(); hooks.effects[5]?.();
  expect(surface.style).toMatchObject({ ...paint,backgroundSize:'844px 390px',left:'0px',top:'-55px',width:'844px',height:'390px' });
  engine({ revision:2,controls:[{ kind:'text',id:'watch',text:'Watch the TV' }] });
  hooks.effects[5]?.();
  expect(surface.animations).toHaveLength(1);
  // Opacity animates, but the covering background itself keeps the shell's opaque colour.
  expect(surface.style.backgroundColor).toBe(paint.backgroundColor);
  expect(surface.style.backgroundImage).toBe(paint.backgroundImage);
  expect(parent.children).toContain(old);
  expect(observe).toHaveBeenCalledWith(shell,{ attributes:true,attributeFilter:['data-theme'] });
  paint.backgroundColor = 'changed shell base'; paint.backgroundImage = 'changed shell treatment';
  themeChanged();
  expect(surface.style.backgroundColor).toBe(paint.backgroundColor);
  expect(surface.style.backgroundImage).toBe(paint.backgroundImage);
  expect(parent.children).toContain(old);
  if (typeof dispose === 'function') dispose();
  expect(disconnect).toHaveBeenCalledOnce();
});
it('CTRL-003 picture targets retain accessible names, label fallback and token badge metadata', () => {
  hooks.index = 0; hooks.effects = [];
  const node = LayoutEngine({ layout:{revision:0,controls:[{kind:'grid',id:'pictures',rows:1,cols:1,cells:[{image:'portrait',label:'Portrait',colour:'seat-2',badge:{colour:'seat-1',text:'1',tick:true}}]}]}, images:{portrait:'/picture.webp','portrait-mask':'/mask.webp'},area:{width:844,height:314},viewport:{width:844,height:390},onOutput:vi.fn() });
  const wrapper=children(node)[1]; if(!wrapper)throw Error('Missing part');
  hooks.index=10;
  const partNode=children(wrapper)[0]; if(!partNode)throw Error('Missing content');
  const part=invoke(partNode), grid=children(part)[0]; if(!grid)throw Error('Missing grid');
  const targetNode=children(grid)[0]; if(!targetNode)throw Error('Missing target');
  hooks.index=20;
  const target=invoke(targetNode);
  expect((target.props as Record<string,unknown>)['aria-label']).toBe('Portrait');
  const badge=children(target).find(n=>(n.props as Record<string,unknown>).class==='ka-layout-badge');
  expect((badge?.props as Record<string,unknown>)['aria-label']).toBe('Seat 1, Ready');
  const label=children(target)[0]; if(!label)throw Error('Missing label');
  const picture=children(label)[0]; if(!picture)throw Error('Missing picture');
  expect(picture.props).toMatchObject({url:'/picture.webp',mask:'/mask.webp',colour:'seat-2',label:'Portrait'});
  hooks.index=30;
  const fallback=invoke(picture);
  expect(children(fallback)[0]?.props).toMatchObject({children:'Portrait'});
});

it.each(['plain-grid', 'picture-grid', 'single-option', 'multi-option'])('CTRL-003 selection snapshots are scoped to picture grids and single options (%s)', kind => {
  const picture = kind === 'picture-grid';
  const fades = picture || kind === 'single-option';
  const renderTarget = (selected: boolean) => {
    let layout: Layout = { revision: 1, controls: [{ kind: 'grid', id: 'grid', rows: 4, cols: 4, cells: Array.from({ length: 16 }, () => ({ state: selected ? 'selected' : 'plain', ...(picture ? { image: 'cook' } : { faceDown: true }) })) }] };
    if (kind.endsWith('option')) layout = { revision: 1, controls: [{ kind: 'options', id: 'options', options: Array.from({ length: kind === 'single-option' ? 1 : 2 }, (_, index) => ({ id: String(index), label: String(index), state: selected ? 'selected' : 'plain' })) }] };
    const wrapper = children(engine(layout))[1]; if (!wrapper) throw Error('wrapper');
    const part = children(wrapper)[0]; if (!part) throw Error('part');
    hooks.index = 10;
    const grid = children(invoke(part))[0]; if (!grid) throw Error('grid');
    const target = children(grid)[0]; if (!target) throw Error('target');
    hooks.index = 20;
    invoke(target);
  };
  const attributes = new Map([['aria-pressed', 'false'], ['data-state', 'plain'], ['data-target', 'target'], ['data-control', 'control']]);
  const old = { style: {}, classList: { add: vi.fn() }, removeAttribute: (key: string) => attributes.delete(key), setAttribute: (key: string, value: string) => attributes.set(key, value), animate: () => ({ finished: new Promise(() => { /* keep the snapshot alive for inspection */ }), cancel: vi.fn() }), remove: vi.fn() };
  const append = vi.fn(), cloneNode = vi.fn(() => old);
  renderTarget(false);
  const ref = hooks.refs[20]; if (!ref) throw Error('ref');
  ref.current = { cloneNode, parentElement: { append }, animate: () => ({ cancel: vi.fn() }) };
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  renderTarget(true);
  hooks.effects.at(-2)?.();
  expect(cloneNode).toHaveBeenCalledTimes(fades ? 1 : 0);
  expect(append).toHaveBeenCalledTimes(fades ? 1 : 0);
  if (fades) {
    expect(old.classList.add).toHaveBeenCalledWith('ka-layout-ghost');
    for (const key of ['aria-pressed', 'data-state', 'data-target', 'data-control']) expect(attributes.has(key)).toBe(false);
    expect(attributes.get('aria-hidden')).toBe('true');
  }
  cloneNode.mockClear(); append.mockClear();
  renderTarget(false);
  hooks.effects.at(-2)?.();
  expect(append).toHaveBeenCalledTimes(fades ? 1 : 0);
});
