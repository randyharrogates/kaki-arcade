import { expect, it, vi } from 'vitest';
import { pickerAnimation, pickerRects, pickerFocusAnimation, pickerFocusKeyframes, pickerLayout } from './picker-animation';

const small = { left: 0, top: 0, width: 100, height: 100 };
const large = { left: 0, top: 0, width: 300, height: 200 };
function fixture() {
  const styles = new Map<string, string>();
  const style = new Proxy({ removeProperty(key: string) { styles.delete(key === 'z-index' ? 'zIndex' : key); } }, {
    set(_target, key, value: string) { styles.set(String(key), value); return true; },
  });
  const animations: { onfinish: (() => void) | null; oncancel: (() => void) | null; cancel: ReturnType<typeof vi.fn>; commitStyles: ReturnType<typeof vi.fn> }[] = [];
  const animate = vi.fn(() => {
    const animation = { onfinish: null, oncancel: null, cancel: vi.fn(), commitStyles: vi.fn() };
    animations.push(animation); return animation;
  });
  const tile = { style, animate } as unknown as HTMLElement;
  const removeAttribute = vi.fn();
  const content = { style: {}, removeAttribute } as unknown as HTMLElement;
  let clip = 'inset(0px 100px 50px 0px round 0px)';
  return { controller: pickerAnimation(tile, content, () => clip), styles, removeAttribute, animations, animate, setClip(value: string) { clip = value; } };
}
it.each([true, false])('PLAT-020 releases clip fill and temporary layout on finish/cancel (opening=%s)', opening => {
  for (const event of ['onfinish', 'oncancel'] as const) {
    const f = fixture(); const done = vi.fn();
    f.controller.start(opening ? small : large, opening ? large : small, 1, opening, 1, done);
    const animation = f.animations[0]; if (!animation) throw new Error('Missing animation');
    animation[event]?.();
    expect(animation.cancel).toHaveBeenCalledOnce();
    expect(animation.commitStyles).not.toHaveBeenCalled();
    expect(f.styles.size).toBe(0); expect(f.removeAttribute).toHaveBeenCalledWith('style'); expect(done).toHaveBeenCalledOnce();
  }
});
it.each([true, false])('PLAT-020 reverses from the current visible rectangle without a blank frame (%s)', opening => {
  const f = fixture(); f.controller.start(opening ? small : large, opening ? large : small, 1, opening, 1, () => undefined);
  const visible = f.controller.interrupt(); if (!visible) throw new Error('Missing visible rectangle');
  expect(visible).toEqual({ left: 0, top: 0, width: 200, height: 150 });
  f.controller.start(visible, opening ? small : large, 1, !opening, 1, () => undefined);
  const frames = f.animate.mock.calls as unknown as [Record<string, string>[], { fill: string }][];
  expect(frames[1]?.[0][0]?.clipPath).toBe(opening ? 'inset(0px 0px 0px 0px round 13px)' : 'inset(0px 100px 50px 0px round 13px)');
  expect(frames[1]?.[1].fill).toBe('both');
});
it('PLAT-020 cleans resize/unmount and converts visible CSS insets at host scale', () => {
  const f = fixture(); f.controller.start(small, large, 2, true, 1, () => undefined);
  f.setClip('inset(0px 50px 25px 0px round 0px)');
  expect(f.controller.interrupt()?.width).toBe(200);
  f.controller.start(small, large, 1, true, 1, () => undefined);
  f.controller.clear(); f.controller.clear(); expect(f.styles.size).toBe(0);
});
it('PLAT-020 reduced motion applies the final layout without creating a mask', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  try { const f = fixture(); const done = vi.fn(); f.controller.start(large, small, 1, false, 10, done);
    expect(f.animate).not.toHaveBeenCalled(); expect(f.styles.size).toBe(0); expect(done).toHaveBeenCalledOnce();
  } finally { vi.unstubAllGlobals(); }
});

it.each([
  ['inset(10px)', { left: 10, top: 10, width: 280, height: 180 }],
  ['inset(10px 20px)', { left: 20, top: 10, width: 260, height: 180 }],
  ['inset(0px 50px 25px round 13px)', { left: 50, top: 0, width: 200, height: 175 }],
] as const)('PLAT-020 reads computed CSS shorthand %s before reversing', (clip, visible) => {
  const f = fixture(); f.controller.start(small, large, 1, true, 1, () => undefined);
  f.setClip(clip); expect(f.controller.interrupt()).toEqual(visible);
});
it('PLAT-020 resumes a same-state render from its visible rectangle and ignores retired cancel handlers', () => {
  const f = fixture(); f.controller.start(small, large, 1, true, 1, () => undefined);
  const old = f.animations[0]; if (!old) throw new Error('Missing animation');
  const visible = f.controller.interrupt(); if (!visible) throw new Error('Missing visible rectangle');
  f.controller.start(visible, large, 1, true, 1, () => undefined);
  expect(old.oncancel).toBeNull(); expect(old.onfinish).toBeNull();
  expect(f.styles.size).toBeGreaterThan(0);
  f.controller.clear(); expect(f.styles.size).toBe(0);
});

it('PLAT-020 reads every currently painted focus box before restarting an interrupted move', () => {
  const reads: string[] = [];
  const visible = { left: 70, top: 20, width: 180, height: 140 } as DOMRect;
  const tiles = new Map(['a', 'b', 'c'].map(id => [id, {
    getBoundingClientRect: () => { reads.push(id); return visible; },
  } as unknown as HTMLElement]));
  const boxes = pickerRects(tiles);
  expect(reads).toEqual(['a', 'b', 'c']);
  const f = fixture();
  const tile = { animate: f.animate } as unknown as HTMLElement;
  const content = { style: {}, removeAttribute: f.removeAttribute } as unknown as HTMLElement;
  const animation = pickerFocusAnimation(tile, content, boxes.get('b') ?? small, large, { duration: 377 });
  expect(f.animate.mock.calls[0]).toBeDefined();
  const calls = f.animate.mock.calls as unknown as [Record<string, string>[], unknown][];
  expect(calls[0]?.[0][0]).toMatchObject({ transform: 'translate(70px, 20px)', width: '180px', height: '140px' });
  expect(animation).toBeDefined();
});

it('PLAT-020 resize cancellation clears focus content geometry as well as normal completion', () => {
  const f = fixture();
  const tile = { animate: f.animate } as unknown as HTMLElement;
  const content = { style: {}, removeAttribute: f.removeAttribute } as unknown as HTMLElement;
  pickerFocusAnimation(tile, content, small, large, { duration: 377 });
  f.animations[0]?.oncancel?.();
  expect(f.removeAttribute).toHaveBeenCalledWith('style');
});

it('PLAT-020 a retired focus cancel event cannot clear the replacement move geometry', () => {
  const f = fixture();
  const tile = { animate: f.animate } as unknown as HTMLElement;
  const content = { style: {}, removeAttribute: f.removeAttribute } as unknown as HTMLElement;
  pickerFocusAnimation(tile, content, small, large, { duration: 377 });
  const retired = f.animations[0]?.oncancel;
  pickerFocusAnimation(tile, content, large, small, { duration: 377 });
  retired?.();
  expect(f.removeAttribute).not.toHaveBeenCalled();
  f.animations[1]?.oncancel?.();
  expect(f.removeAttribute).toHaveBeenCalledOnce();
});

it.each([60, 144])('PLAT-020 painted focus rect survives three presses interrupted at %d ms', elapsed => {
  let layout = { left: 55, top: 230, width: 1098, height: 795 };
  let active: { from: typeof layout; to: typeof layout } | undefined;
  let progress = 0;
  const frames: Record<string, string>[][] = [];
  const read = () => {
    if (!active) return { ...layout } as DOMRect;
    const box = { ...layout };
    for (const key of ['left', 'top', 'width', 'height'] as const)
      box[key] = active.from[key] + (active.to[key] - active.from[key]) * progress;
    // Position is relative to the CURRENT grid base, as in a real animated element.
    box.left += layout.left - active.to.left;
    box.top += layout.top - active.to.top;
    return box as DOMRect;
  };
  const tile = {
    dataset: {}, style: {}, getBoundingClientRect: read,
    animate(keyframes: Record<string, string>[]) {
      frames.push(keyframes);
      const first = keyframes[0]; if (!first) throw new Error('Missing first frame');
      const delta = first.transform?.match(/-?[\d.]+/g)?.map(Number) ?? [];
      active = { from: { left: layout.left + (delta[0] ?? 0), top: layout.top + (delta[1] ?? 0),
        width: parseFloat(first.width ?? ''), height: parseFloat(first.height ?? '') }, to: { ...layout } };
      progress = 0;
      return { cancel() { active = undefined; }, onfinish: null, oncancel: null };
    },
  } as unknown as HTMLElement;
  Object.defineProperty(tile.style, 'gridColumn', { set(value: string) {
    layout = value === '1' ? { left: 55, top: 230, width: 1098, height: 795 }
      : { left: 1187, top: 230, width: 678, height: 380 };
  } });
  const tiles = new Map([['a', tile]]);
  let animation: Animation | undefined;
  for (const focus of ['b', 'a', 'b']) {
    progress = elapsed / 377;
    const painted = pickerRects(tiles).get('a');
    if (!painted) throw new Error('Missing painted box');
    animation?.cancel();
    const target = pickerLayout(tiles, focus, false).get('a');
    if (!target) throw new Error('Missing layout box');
    animation = pickerFocusAnimation(tile, null, painted, target, { duration: 377 });
    const firstPaint = read();
    for (const key of ['left', 'top', 'width', 'height'] as const)
      expect(firstPaint[key] - painted[key]).toBeCloseTo(0, 10);
    expect(firstPaint.left).toBeGreaterThanOrEqual(55);
    expect(firstPaint.left + firstPaint.width).toBeLessThanOrEqual(1865);
  }
  expect(frames).toHaveLength(3);
});

it('PLAT-020 uses the real 1080p single-move rectangles without tile-derived scaling', () => {
  const primary = { left: 55, top: 230, width: 1098, height: 795 };
  const side = { left: 1187, top: 230, width: 678, height: 380 };
  const third = { left: 1187, top: 645, width: 678, height: 380 };
  const anchor = { justifySelf: 'start', alignSelf: 'start' };
  expect(pickerFocusKeyframes(primary, side)).toEqual([
    { transform: 'translate(-1132px, 0px)', width: '1098px', height: '795px', ...anchor },
    { transform: 'none', width: '678px', height: '380px', ...anchor },
  ]);
  expect(pickerFocusKeyframes(side, primary)).toEqual([
    { transform: 'translate(1132px, 0px)', width: '678px', height: '380px', ...anchor },
    { transform: 'none', width: '1098px', height: '795px', ...anchor },
  ]);
  expect(pickerFocusKeyframes(third, third)).toBeUndefined();
  expect(pickerFocusKeyframes(third, { ...third, left: third.left + 0.5 })).toBeUndefined();
  const f = fixture();
  const tile = { animate: f.animate } as unknown as HTMLElement;
  const content = { style: {}, removeAttribute: f.removeAttribute } as unknown as HTMLElement;
  expect(pickerFocusAnimation(tile, content, third, third, { duration: 377 })).toBeUndefined();
  expect(f.animate).not.toHaveBeenCalled();
  pickerFocusAnimation(tile, content, side, primary, { duration: 377 });
  expect(content.style).toMatchObject({ width: '1098px', height: '795px' });
});
