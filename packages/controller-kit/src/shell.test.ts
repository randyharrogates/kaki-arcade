import { describe, it, expect, vi } from 'vitest';
import type { VNode } from 'preact';
import { ControllerShell } from './shell';
vi.mock('preact/hooks', () => ({ useState: () => ['released', vi.fn()], useEffect: vi.fn() }));
import { PLAYER_COLOURS } from '@kaki/ui';
import { headerModel } from './model';
import { installPageLock } from './lock';
import { keepScreenAwake } from './wake';
import type { WakeState, WakeSentinel } from './wake';
class Page {
  hidden = false;
  readonly pointers = new Set<() => void>();
  pointer() { for (const listener of this.pointers) listener(); }
  readonly listeners = new Set<() => void>();
  addEventListener(type: 'visibilitychange' | 'pointerdown', listener: () => void) { (type === 'pointerdown' ? this.pointers : this.listeners).add(listener); }
  removeEventListener(type: 'visibilitychange' | 'pointerdown', listener: () => void) { (type === 'pointerdown' ? this.pointers : this.listeners).delete(listener); }
  change(hidden: boolean) { this.hidden = hidden; for (const listener of this.listeners) listener(); }
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function fixture() {
  const page = new Page(); const states: WakeState[] = []; const locks: (WakeSentinel & { releases: number; listeners: Set<() => void> })[] = [];
  const nav = { wakeLock: { request: () => {
    const lock = { releases: 0, listeners: new Set<() => void>(),
      release() { this.releases++; return Promise.resolve(); },
      addEventListener(_type: 'release', fn: () => void) { this.listeners.add(fn); },
      removeEventListener(_type: 'release', fn: () => void) { this.listeners.delete(fn); } };
    locks.push(lock); return Promise.resolve(lock);
  } } };
  return { page, states, locks, nav, present: (s: WakeState) => states.push(s) };
}
describe('CTRL-004/008 controller helpers', () => {
  it('models all seats, full nickname and distinct connection words/icons', () => {
    for (const colour of PLAYER_COLOURS) for (const link of ['connected', 'reconnecting', 'lost'] as const) {
      const model = headerModel(colour.seat, 'WWWWWWWWWWWW', link);
      expect(model).toMatchObject({ seat: colour.seat, colour: colour.colour, name: 'WWWWWWWWWWWW' });
      expect(model.word.toLowerCase()).toBe(link); expect(model.icon).toBeTruthy();
    }
  });
  it('installs non-passive guards and removes the exact listeners/options', () => {
    const adds: unknown[][] = []; const removes: unknown[][] = [];
    const target = { addEventListener: (...args: unknown[]) => { adds.push(args); }, removeEventListener: (...args: unknown[]) => { removes.push(args); } };
    const stop = installPageLock(target);
    for (const [type, fn, options] of adds) {
      expect(options).toEqual({ passive: false, capture: false });
      const event = new Event(String(type), { cancelable: true });
      Object.defineProperty(event, 'touches', { value: [1, 2] });
      (fn as (e: Event) => void)(event); expect(event.defaultPrevented).toBe(true);
    }
    const single = new Event('touchmove', { cancelable: true }); Object.defineProperty(single, 'touches', { value: [1] });
    (adds[0]?.[1] as (e: Event) => void)(single); expect(single.defaultPrevented).toBe(false);
    const nonCancelable = new Event('touchmove');
    Object.defineProperty(nonCancelable, 'touches', { value: [1, 2] });
    const prevent = vi.spyOn(nonCancelable, 'preventDefault');
    expect(() => { (adds[0]?.[1] as (e: Event) => void)(nonCancelable); }).not.toThrow();
    expect(prevent).not.toHaveBeenCalled();
    stop(); expect(removes).toEqual(adds);
  });
  it('acquires, releases hidden, reacquires visible and cleans up without leaks', async () => {
    const f = fixture(); const stop = keepScreenAwake(f.nav, f.page, f.present);
    await flush(); expect(f.states.at(-1)).toBe('held');
    f.page.change(true); expect(f.locks[0]?.releases).toBe(1); expect(f.states.at(-1)).toBe('released');
    f.page.change(false); await flush(); expect(f.locks).toHaveLength(2);
    stop(); expect(f.page.listeners.size).toBe(0); expect(f.locks.every(l => l.releases === 1 && l.listeners.size === 0)).toBe(true);
    f.page.change(false); await flush(); expect(f.locks).toHaveLength(2);
  });
  it('handles unsupported and rejected requests', async () => {
    const f = fixture(); const stop = keepScreenAwake({}, f.page, f.present); expect(f.states).toEqual(['unavailable']); stop();
    const reject = keepScreenAwake({ wakeLock: { request: () => Promise.reject(new Error('denied')) } }, f.page, f.present);
    await flush(); expect(f.states.at(-1)).toBe('unavailable'); reject();
  });
  it('releases a pending acquisition after disposal and does not report stale state', async () => {
    const f = fixture(); const stop = keepScreenAwake(f.nav, f.page, f.present); stop(); await flush();
    expect(f.states).toEqual([]); expect(f.locks[0]?.releases).toBe(1);
  });
  it('deduplicates pending requests and reports browser revocation', async () => {
    const f = fixture(); const stop = keepScreenAwake(f.nav, f.page, f.present);
    f.page.change(false); await flush(); expect(f.locks).toHaveLength(1);
    for (const fn of f.locks[0]?.listeners ?? []) fn();
    expect(f.states.at(-1)).toBe('unavailable'); stop();
  });
  it('keeps the page locked until the last mount unmounts, preserving a prior class', () => {
    for (const prior of [false, true]) {
      const target = new EventTarget(); const classes = new Set(prior ? ['ka-controller-locked'] : []);
      const root = { classList: { contains: (s: string) => classes.has(s), add: (s: string) => { classes.add(s); }, remove: (s: string) => { classes.delete(s); } } };
      const first = installPageLock(target, root); const second = installPageLock(target, root);
      const prevented = () => { const e = new Event('contextmenu', { cancelable: true }); target.dispatchEvent(e); return e.defaultPrevented; };
      expect(prevented()).toBe(true); first(); first();
      expect(classes.has('ka-controller-locked')).toBe(true); expect(prevented()).toBe(true);
      second(); expect(classes.has('ka-controller-locked')).toBe(prior); expect(prevented()).toBe(false);
    }
  });
  it('retries a visible rejection once per visibility cycle, including a pending visibility race', async () => {
    for (const race of [false, true]) {
      const page = new Page(); let requests = 0; let reject: (error: Error) => void = () => undefined;
      const stop = keepScreenAwake({ wakeLock: { request: () => { requests++; return new Promise<WakeSentinel>((_resolve, fail) => { reject = fail; }); } } }, page, () => undefined);
      if (race) { page.change(true); page.change(false); }
      page.pointer(); expect(requests).toBe(1);
      reject(new Error('denied')); await flush(); page.pointer(); expect(requests).toBe(2);
      reject(new Error('denied again')); await flush(); page.pointer(); page.pointer(); expect(requests).toBe(2);
      page.change(false); expect(requests).toBe(3);
      stop(); reject(new Error('disposed')); await flush();
      expect(page.pointers.size).toBe(0); expect(page.listeners.size).toBe(0);
    }
  });

});

it.each(['connected', 'reconnecting', 'lost'] as const)('CTRL-008 heading preserves the %s status word', link => {
  const tree = ControllerShell({ seat: 1, name: 'Fern', heading: 'Choose a picture', link });
  const nodes: VNode[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object' || !('props' in node)) return;
    const vnode = node as VNode<{ children?: unknown }>;
    nodes.push(vnode);
    const children = vnode.props.children;
    for (const child of Array.isArray(children) ? children : [children]) walk(child);
  };
  walk(tree);
  const word = nodes.find(n => (n.props as { class?: string }).class === 'ka-controller-word');
  expect(word?.props).toMatchObject({ children: link.charAt(0).toUpperCase() + link.slice(1) });
  const status = nodes.find(n => (n.props as { role?: string; class?: string }).class === 'ka-controller-link' && (n.props as { role?: string }).role === 'status');
  expect(status?.props).toMatchObject({ role: 'status' });
  expect(nodes.filter(n => (n.props as { class?: string }).class === 'ka-controller-link')).toHaveLength(1);
  expect(nodes.filter(n => (n.props as { class?: string }).class === 'ka-controller-connection')).toHaveLength(1);
  const heading = nodes.find(n => (n.props as { class?: string }).class === 'ka-controller-heading');
  expect(heading?.props).toMatchObject({ children: 'Choose a picture' });
  expect((heading?.props as { role?: string }).role).toBeUndefined();
});
