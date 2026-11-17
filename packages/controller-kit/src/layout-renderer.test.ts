import { afterEach, expect, it, vi } from 'vitest';
import type { VNode } from 'preact';
import { LayoutEngine } from './layout-renderer';
import type { Layout, LayoutOutput } from './layout-types';
const hooks = vi.hoisted(() => ({ refs:[] as { current:unknown }[], index:0, effects:[] as (() => undefined | (() => void))[] }));
vi.mock('preact/hooks',() => ({
  useMemo:(compute:() => unknown) => compute(),
  useRef:(initial:unknown) => hooks.refs[hooks.index++] ?? (hooks.refs[hooks.index-1] = { current:initial }),
  useState:(initial:unknown) => [initial,vi.fn()],
  useLayoutEffect:(effect:() => undefined | (() => void)) => { hooks.effects.push(effect); },
}));
afterEach(() => { hooks.refs = []; hooks.index = 0; hooks.effects = []; vi.unstubAllGlobals(); });
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
  const effect = hooks.effects.at(-2); const dispose = effect?.();
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
