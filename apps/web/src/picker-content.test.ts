import { expect, it, vi } from 'vitest';
import { easing } from '@kaki/ui';
import { freezePickerContent, pickerContentMasks, wipePickerContent } from './picker-content';

it('PLAT-020 keeps full ink on the outgoing copy and wipes both copies inside the move', () => {
  const incoming = { cancel: vi.fn(), onfinish: null as null | (() => void), oncancel: null as null | (() => void) };
  const outgoing = { cancel: vi.fn() };
  const append = vi.fn();
  const animateIncoming = vi.fn(() => incoming);
  const animateOutgoing = vi.fn(() => outgoing);
  const remove = vi.fn();
  const content = { style: {}, parentElement: { append }, animate: animateIncoming } as unknown as HTMLElement;
  const old = { style: {}, animate: animateOutgoing, remove } as unknown as HTMLElement;
  wipePickerContent(content, old, 240);
  expect(append).toHaveBeenCalledWith(old);
  const calls = animateOutgoing.mock.calls as unknown as [Record<string, unknown>[], { duration: number }][];
  expect(calls[0]?.[0].every(frame => !('opacity' in frame))).toBe(true);
  expect(calls[0]?.[1].duration).toBe(240);
  incoming.onfinish?.();
  expect(remove).toHaveBeenCalledOnce();
  expect(incoming.cancel).toHaveBeenCalledOnce(); expect(outgoing.cancel).toHaveBeenCalledOnce();
});

it('PLAT-020 removes the frozen outgoing layout when a move is interrupted', () => {
  const incoming = { cancel: vi.fn(), oncancel: null as null | (() => void) };
  const outgoing = { cancel: vi.fn() };
  const remove = vi.fn();
  const content = { style: {}, parentElement: { append: vi.fn() }, animate: () => incoming } as unknown as HTMLElement;
  const old = { style: {}, animate: () => outgoing, remove } as unknown as HTMLElement;
  wipePickerContent(content, old, 300);
  incoming.oncancel?.();
  expect(remove).toHaveBeenCalledOnce(); expect(outgoing.cancel).toHaveBeenCalledOnce();
});

it.each([[1098, 678], [678, 1098]])('PLAT-020 partitions tile-local x for widths %s and %s', (width, oldWidth) => {
  for (const progress of [0, 0.01, 0.15, 1 / 3, 0.5, 0.9, 1]) {
    const masks = pickerContentMasks(width, oldWidth, progress);
    const rightInset = Number(masks.incoming.split(' ')[1]?.replace('px', ''));
    const leftInset = Number(masks.outgoing.split(' ')[3]?.replace('px)', ''));
    // Convert both clip edges into their common tile coordinate space.
    const incomingRight = width - rightInset;
    expect(incomingRight).toBeCloseTo(leftInset, 10);
    expect(incomingRight).toBeCloseTo(Math.max(width, oldWidth) * progress, 10);
    expect(Math.max(0, incomingRight - leftInset)).toBeCloseTo(0, 10);
    expect(incomingRight + Math.max(width, oldWidth) - leftInset).toBeCloseTo(Math.max(width, oldWidth), 10);
  }
});

it('PLAT-020 uses identical mask timing and anchors on both copies', () => {
  const animation = () => ({ cancel: vi.fn(), onfinish: null, oncancel: null, startTime: 123 });
  const incoming = vi.fn(animation); const outgoing = vi.fn(animation);
  const content = { style: {}, offsetWidth: 1098, animate: incoming, parentElement: { append() { /* Fixture. */ } } };
  const old = { style: {}, offsetWidth: 678, animate: outgoing, remove() { /* Fixture. */ } };
  wipePickerContent(content as unknown as HTMLElement, old as unknown as HTMLElement, 377);
  const newCalls = incoming.mock.calls as unknown as [Keyframe[], KeyframeAnimationOptions][];
  const oldCalls = outgoing.mock.calls as unknown as [Keyframe[], KeyframeAnimationOptions][];
  expect(newCalls[0]?.[1]).toEqual(oldCalls[0]?.[1]);
  expect(newCalls[0]?.[1].easing).toBe(easing.out);
  expect(content.style).toEqual(old.style);
});

it('PLAT-020 freezes dimensions on the clone root without descendant computed-style writes', () => {
  const style = {}; const copy = { dataset: {}, style, setAttribute: vi.fn() };
  const content = { cloneNode: () => copy, parentElement: { dataset: { expanded: 'true', focused: 'true' } } };
  const computed = vi.fn(() => ({ width: '900px', height: '600px' }));
  vi.stubGlobal('getComputedStyle', computed);
  try {
    freezePickerContent(content as unknown as HTMLElement);
    expect(computed).toHaveBeenCalledOnce();
    expect(Object.keys(style)).toHaveLength(7);
    expect(style).toMatchObject({ width: '900px', height: '600px' });
    expect(copy.dataset).toEqual({ snapshot: 'true', snapshotFocused: 'true' });
  } finally { vi.unstubAllGlobals(); }
});
