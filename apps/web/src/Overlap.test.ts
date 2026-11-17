import type { ComponentChildren, VNode } from 'preact';
import { beforeEach, expect, it, vi } from 'vitest';
import { Overlap } from './Overlap';
const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock('preact/hooks', () => ({
  useState(initial: unknown) {
    const index = hooks.cursor++;
    hooks.slots[index] ??= initial;
    return [hooks.slots[index], (update: (old: unknown) => unknown) => { hooks.slots[index] = update(hooks.slots[index]); }];
  },
  useRef(initial: unknown) {
    const index = hooks.cursor++;
    hooks.slots[index] ??= { current: initial };
    return hooks.slots[index];
  },
  useLayoutEffect() { /* FadeOverlap stores snapshots during render; layer effects run in the browser. */ },
}));
beforeEach(() => { hooks.slots = []; hooks.cursor = 0; });
function render(identity: string, children: string) {
  hooks.cursor = 0;
  const node = Overlap({ identity, children, fade: true });
  return (node.type as (props: { identity: string; children: ComponentChildren }) => VNode)(node.props as { identity: string; children: ComponentChildren });
}
function text(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(text);
  if (node && typeof node === 'object' && 'props' in node) return text((node as VNode).props.children);
  return [];
}
it('NN-5 renders old and new headings together, retaining an unfinished outgoing heading on interruption', () => {
  render('picker', 'Pick a game');
  render('start', 'Fern starts on their phone');
  expect(text(render('start', 'Fern starts on their phone'))).toEqual(['Pick a game', 'Fern starts on their phone']);
  render('starting', 'Starting…');
  expect(text(render('starting', 'Starting…'))).toEqual(['Pick a game', 'Fern starts on their phone', 'Starting…']);
});
