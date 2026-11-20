import { expect, it, vi } from 'vitest';
import type { VNode } from 'preact';
import { LayoutEngine } from '../../../../packages/controller-kit/src/layout-renderer';
import { QUESTION_DATA, questionData, rabakz } from '../index';

// Inspect the shipped renderer's element tree without a browser. Effects only
// measure DOM text and bind input; placement and answer creation run in render.
vi.mock('preact/hooks', () => ({
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [initial, vi.fn()],
  useMemo: (compute: () => unknown) => compute(),
  useLayoutEffect: vi.fn(),
}));
function elements(value: unknown): VNode<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(elements);
  if (!value || typeof value !== 'object' || !('type' in value)) return [];
  const node = value as VNode<Record<string, unknown>>;
  if (typeof node.type === 'function') {
    return elements((node.type as (props: unknown) => unknown)(node.props));
  }
  return [node, ...elements(node.props.children)];
}
for (const [width, height] of [[667, 375], [844, 390]] as const) for (const leader of [true, false]) {
  it(`RZ-003 / RZ-005 renders four answer buttons under data-part="answer" at ${String(width)}, leader=${String(leader)}`, () => {
    const labels = [
      'Another long reply with forty characters',
  'These words fill the last lengthy option',
  'A lovely hot bowl of noodles with prawns',
  'The top place to meet friends for dinner',
];
    const state = rabakz.init(42, [{ id:'one', name:'Player 1', seat:1, colour:'seat-1' }],
      { length:10, difficulty:'mixed' }, { saved:null, teams:false, data:{
        [QUESTION_DATA]:questionData(Array.from({ length:10 }, (_, i) => ({
          id:String(i), prompt:'Long options', options:labels, correct:0,
          category:'General', difficulty:'easy', type:'multiple-choice', region:'general',
        }))),
      } });
    const tree = elements(LayoutEngine({ layout:rabakz.controllerLayout(state, 'one'),
      privateView:rabakz.privateView(state, 'one'), area:{ width, height:height - 68 },
      viewport:{ width, height }, isLeader:leader, onOutput:vi.fn() }));
    expect(tree[0]?.props['data-fits']).toBe('true');
    const parts = tree.filter(node => node.props['data-part'] === 'answer');
    expect(parts).toHaveLength(1); // One options part contains four answer targets.
    const buttons = elements(parts[0]?.props.children).filter(node => node.type === 'button');
    expect(buttons).toHaveLength(4);
    expect(buttons.map(node => node.props['aria-label']).sort()).toEqual([...labels].sort());
    expect(buttons.every(node => node.props['aria-disabled'] === false)).toBe(true);
    expect(tree.filter(node => node.type === 'button' && node.props['aria-label'] === 'Skip')).toHaveLength(leader ? 1 : 0);
  });
}

it('RZ-032 PLAT-022 renders Continue as words without an SVG', () => {
  const state = rabakz.init(42,[{id:'one',name:'Player 1',seat:1,colour:'seat-1'}],
    {length:10,difficulty:'mixed'},{saved:null,teams:false,data:{[QUESTION_DATA]:questionData(
      Array.from({length:10},(_,i) => ({id:String(i),prompt:'Which?',options:['1','2','3','4'],correct:0,
        category:'General',difficulty:'easy',type:'multiple-choice',region:'general'})))}});
  const scored = {...state,phase:'scoreboard' as const};
  const tree = elements(LayoutEngine({layout:rabakz.controllerLayout(scored,'one'),privateView:rabakz.privateView(scored,'one'),
    area:{width:667,height:307},viewport:{width:667,height:375},isLeader:true,onOutput:vi.fn()}));
  const button = tree.find(node => node.type === 'button' && node.props['aria-label'] === 'Continue');
  expect(button).toBeDefined();
  expect(elements(button?.props.children).some(node => node.type === 'svg')).toBe(false);
});
