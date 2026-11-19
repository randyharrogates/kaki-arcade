import { afterEach, expect, it, vi } from 'vitest';
import type { VNode } from 'preact';
import { HostGameScreen } from './host-game-screen';
import type { MountedHostScreen, ScreenProps } from './session-adapter';

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], index: 0 }));
vi.mock('preact/hooks', () => ({
  useState: () => [true, vi.fn()],
  useRef: (initial: unknown) => hooks.slots[hooks.index++] ?? (hooks.slots[hooks.index - 1] = { current: initial }),
  useMemo: (make: () => unknown) => hooks.slots[hooks.index++] ?? (hooks.slots[hooks.index - 1] = make()),
  useCallback: (fn: unknown) => hooks.slots[hooks.index++] ?? (hooks.slots[hooks.index - 1] = fn),
  useLayoutEffect: vi.fn(),
}));
afterEach(() => { hooks.slots = []; hooks.index = 0; vi.unstubAllGlobals(); });
it('TR-064 PERF-001 changing MountedScreen props keeps its root attached', () => {
  const root = { parentNode: null as unknown };
  vi.stubGlobal('document', { createElement: () => root });
  const Screen: MountedHostScreen = { mount: vi.fn() };
  const render = (view: unknown) => {
    hooks.index = 0;
    const node = HostGameScreen({ Screen, view: view as never, width: 1920, height: 1080 });
    const tree = (node.type as (props: ScreenProps) => VNode)(node.props as ScreenProps);
    const preparation = (tree.props as { children: VNode[] }).children[0];
    return preparation?.ref as (element: HTMLDivElement | null) => void;
  };
  const element = { appendChild: vi.fn(() => { root.parentNode = element; }) };
  const attach = render({ phase: 'pick' });
  attach(element as unknown as HTMLDivElement);
  const next = render({ phase: 'play' });
  expect(next).toBe(attach);
  // Even a repeated ref application must not move an already attached renderer.
  next(element as unknown as HTMLDivElement);
  next(null);
  expect(element.appendChild).toHaveBeenCalledExactlyOnceWith(root);
});
