/// <reference lib="dom" />
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { duration, easing, exitDuration } from '../../../packages/ui/src/index';
import { EMPTY_SETUP } from '../../../packages/platform/src/index';
import { tabaoRush } from '../src/rules/game';
import { createCookPicker } from './cook-picker';
import type { View } from './model';

// Only the DOM operations the picker needs; animation calls remain observable.
class ElementStub {
  className = '';
  style = {};
  dataset = {};
  hidden = false;
  children: ElementStub[] = [];
  animate = vi.fn();
  setAttribute = vi.fn();
  append(...children: ElementStub[]) { this.children.push(...children); }
  querySelector(selector: string): ElementStub | undefined {
    return this.children.find(child => `.${child.className}` === selector);
  }
}

afterEach(() => vi.unstubAllGlobals());

it.each([false, true])('TR-064 badge entrance stays visible with reduced motion %s', reduced => {
  vi.stubGlobal('document', { createElement: () => new ElementStub() });
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  const root = new ElementStub();
  const picker = createCookPicker(root as unknown as HTMLElement, new Map());
  const state = tabaoRush.init(42, [{ id: 'p1', seat: 1, name: 'Cook', colour: 'seat-1' }], {}, EMPTY_SETUP);
  const view = tabaoRush.publicView(state) as View;
  picker.update(view, 1920, 1080);
  const badge = root.children[0]?.children[1]?.children[0]?.querySelector('.tr-cook-seat');
  expect(badge).toBeDefined();
  expect(badge).toHaveProperty('textContent', '1');
  if (reduced) {
    expect(badge?.animate).not.toHaveBeenCalled();
  } else {
    expect(badge?.animate).toHaveBeenCalledExactlyOnceWith(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration.fast, easing: easing.out, iterations: 1, fill: 'none' },
    );
    expect(Number.isFinite(duration.fast)).toBe(true);
    expect(duration.fast).toBeGreaterThan(0);
  }
  picker.update(view, 1920, 1080);
  expect(badge?.animate).toHaveBeenCalledTimes(reduced ? 0 : 1);
  const css = readFileSync(new URL('./cook-picker.css', import.meta.url), 'utf8');
  const resting = /\.tr-cook-seat\s*\{([^}]+)\}/.exec(css)?.[1];
  expect(resting).toMatch(/\bopacity:\s*1\s*;/);
  expect(resting).not.toMatch(/\banimation:/);
  expect(css).not.toContain('@keyframes');
});

it.each([false, true])('TR-064 picker exit fades once and hides on completion (reduced=%s)', async reduced => {
  vi.stubGlobal('document', { createElement: () => new ElementStub() });
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  const root = new ElementStub();
  const picker = createCookPicker(root as unknown as HTMLElement, new Map());
  const state = tabaoRush.init(42, [{ id: 'p1', seat: 1, name: 'Cook', colour: 'seat-1' }], {}, EMPTY_SETUP);
  const view = tabaoRush.publicView(state) as View;
  picker.update(view, 1920, 1080);
  const screen = root.children[0]; if (!screen) throw Error('Missing screen');
  let finish = () => { /* Assigned by the exit promise. */ };
  screen.animate.mockReturnValue({ finished: new Promise<void>(resolve => { finish = resolve; }) });
  const playing = { ...view, phase: 'play' as const };
  picker.update(playing, 1920, 1080);
  picker.update(playing, 1920, 1080);
  expect(screen.hidden).toBe(reduced);
  if (reduced) expect(screen.animate).not.toHaveBeenCalled();
  else {
    expect(screen.animate).toHaveBeenCalledTimes(1);
    expect(screen.animate.mock.calls[0]?.[0]).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(screen.animate.mock.calls[0]?.[1]).toMatchObject({ duration: exitDuration('slow') });
    finish(); await Promise.resolve(); expect(screen.hidden).toBe(true);
  }
});

it.each([false, true])('TR-064 first play view leaves the picker hidden (reduced=%s)', reduced => {
  vi.stubGlobal('document', { createElement: () => new ElementStub() });
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  const root = new ElementStub();
  const picker = createCookPicker(root as unknown as HTMLElement, new Map());
  expect(root.children[0]?.hidden).toBe(true);
  const state = tabaoRush.init(42, [], {}, EMPTY_SETUP);
  picker.update({ ...tabaoRush.publicView(state) as View, phase: 'play' }, 1920, 1080);
  expect(root.children[0]?.hidden).toBe(true);
  expect(root.children[0]?.animate).not.toHaveBeenCalled();
});
