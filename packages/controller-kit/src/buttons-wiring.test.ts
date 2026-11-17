import { expect, it, vi } from 'vitest';
import { ShoulderButton } from './buttons';

const hooks = vi.hoisted(() => ({ refs: [] as { current: unknown }[], index: 0, effect: undefined as (() => undefined | (() => void)) | undefined }));
vi.mock('preact/hooks', () => ({
  useRef: (initial: unknown) => hooks.refs[hooks.index++] ?? (hooks.refs[hooks.index - 1] = { current: initial }),
  useLayoutEffect: (effect: () => undefined | (() => void)) => { hooks.effect ??= effect; },
}));
it('routes a ShoulderButton press to its changed id after rerender', () => {
  class Root extends EventTarget {
    button = { dataset: { control: 'L', held: 'false' }, offsetWidth: 89, offsetHeight: 68,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 89, height: 68 }),
      getAnimations: () => [], animate: vi.fn(), style: { transform: '' } };
    querySelectorAll() { return [this.button]; }
    setPointerCapture() { /* Browser stub. */ }
  }
  const root = new Root(), onPress = vi.fn(), onRelease = vi.fn();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
  const render = (id: 'L' | 'R') => {
    hooks.index = 0;
    const vnode = ShoulderButton({ id, onPress, onRelease });
    (vnode.type as (props: typeof vnode.props) => unknown)(vnode.props);
    // Emulate Preact replacing the keyed button when its id changes.
    root.button = { ...root.button, dataset: { control: id, held: 'false' } };
  };
  let dispose: undefined | (() => void);
  try {
    render('L');
    const rootRef = hooks.refs[0]; if (!rootRef) throw new Error('Missing root ref');
    rootRef.current = root; dispose = hooks.effect?.();
    render('R');
    const event = new Event('pointerdown', { cancelable: true });
    Object.assign(event, { button: 0, pointerId: 1, clientX: 44, clientY: 34 });
    root.dispatchEvent(event);
    expect(onPress).toHaveBeenCalledExactlyOnceWith('R');
    expect(root.button.dataset.held).toBe('true');
  } finally { dispose?.(); vi.unstubAllGlobals(); }
});

it('Controls reads slide again after rerender', () => {
  hooks.refs = []; hooks.index = 0; hooks.effect = undefined;
  class Root extends EventTarget {
    buttons = ['L', 'R'].map((id, index) => ({ dataset: { control: id, held: 'false' },
      offsetWidth: 89, offsetHeight: 68,
      getBoundingClientRect: () => ({ left: index * 100, top: 0, width: 89, height: 68 }),
      getAnimations: () => [], animate: vi.fn(), style: { transform: '' } }));
    querySelectorAll() { return this.buttons; }
    setPointerCapture() { /* Browser stub. */ }
  }
  const root = new Root(), onPress = vi.fn(), onRelease = vi.fn();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
  const render = (slide: boolean) => {
    hooks.index = 0;
    const vnode = ShoulderButton({ id: 'L', onPress, onRelease });
    (vnode.type as (props: typeof vnode.props & { slide: boolean }) => unknown)({ ...vnode.props, slide });
  };
  const send = (type: string, clientX: number) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { button: 0, pointerId: 1, clientX, clientY: 34 }); root.dispatchEvent(event);
  };
  let dispose: undefined | (() => void);
  try {
    render(false);
    const ref = hooks.refs[0]; if (!ref) throw new Error('Missing root ref');
    ref.current = root;
    const effect = hooks.effect as (() => undefined | (() => void)) | undefined;
    dispose = effect?.();
    send('pointerdown', 44);
    render(true);
    send('pointermove', 144);
    expect(onRelease).toHaveBeenCalledExactlyOnceWith('L');
    expect(onPress.mock.calls).toEqual([['L'], ['R']]);
    expect(root.buttons[1]?.dataset.held).toBe('true');
  } finally { dispose?.(); vi.unstubAllGlobals(); }
});
