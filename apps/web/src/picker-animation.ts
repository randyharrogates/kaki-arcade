import { expand, collapse } from '@kaki/ui';

interface Box { left: number; top: number; width: number; height: number }
const geometry = ['position', 'left', 'top', 'width', 'height', 'z-index', 'clip-path'];
/** Owns the temporary canvas and mask. Never commitStyles: the grid owns the end state. */
export function pickerAnimation(tile: HTMLElement, content: HTMLElement, readClip = () => getComputedStyle(tile).clipPath) {
  let active: Animation | undefined;
  let canvas: Box | undefined;
  let units = 1;
  let settled: (() => void) | undefined;
  function clear(): void {
    const animation = active;
    active = undefined;
    if (animation) { animation.onfinish = null; animation.oncancel = null; animation.cancel(); }
    canvas = undefined;
    for (const property of geometry) tile.style.removeProperty(property);
    content.removeAttribute('style');
    const done = settled; settled = undefined; done?.();
  }
  function visible(): Box | undefined {
    if (!canvas) return undefined;
    // Computed CSS serialises equal sides using the one/two/three-value shorthand.
    const sides = /^inset\(([^)]+)\)/.exec(readClip())?.[1]?.split('round')[0]?.trim().split(/\s+/).map(value => Number.parseFloat(value) * units);
    if (!sides?.length || sides.some(value => !Number.isFinite(value))) return canvas;
    const top = sides[0] ?? 0;
    const right = sides[1] ?? top;
    const bottom = sides[2] ?? top;
    const left = sides[3] ?? right;
    return { left: canvas.left + left, top: canvas.top + top, width: canvas.width - left - right, height: canvas.height - top - bottom };
  }
  return {
    clear,
    /** Read before cancelling or removing temporary layout, even on an opposite transition. */
    interrupt(): Box | undefined { const box = visible(); clear(); return box; },
    start(from: Box, to: Box, scale: number, opening: boolean, slow: number, done: () => void): void {
      clear(); settled = done; units = scale;
      canvas = { left: Math.min(from.left, to.left), top: Math.min(from.top, to.top),
        width: Math.max(from.left + from.width, to.left + to.width) - Math.min(from.left, to.left),
        height: Math.max(from.top + from.height, to.top + to.height) - Math.min(from.top, to.top) };
      const local = (box: Box) => ({ left: box.left / scale, top: box.top / scale, width: box.width / scale, height: box.height / scale });
      const motion = opening ? expand(local(from), local(canvas), { mode: 'clip' }) : collapse(local(to), local(canvas), { mode: 'clip' });
      motion.keyframes = [expand(local(from), local(canvas), { mode: 'clip', reduced: false }).keyframes[0] ?? {}, expand(local(to), local(canvas), { mode: 'clip', reduced: false }).keyframes[0] ?? {}];
      if (motion.options.duration === 0) { clear(); return; }
      Object.assign(tile.style, { position: 'absolute', left: `${String((canvas.left - to.left) / scale)}px`, top: `${String((canvas.top - to.top) / scale)}px`, width: `${String(canvas.width / scale)}px`, height: `${String(canvas.height / scale)}px`, zIndex: '2' });
      Object.assign(content.style, { position: 'absolute', left: `${String((to.left - canvas.left) / scale)}px`, top: `${String((to.top - canvas.top) / scale)}px`, width: `${String(to.width / scale)}px`, height: `${String(to.height / scale)}px` });
      motion.options.duration *= slow;
      // Fill holds the first frame until playback and the last until atomic cleanup.
      active = tile.animate(motion.keyframes, motion.options);
      active.onfinish = clear;
      active.oncancel = clear;
    },
  };
}

/** Read all moving tiles as one batch before cancelling any animation or changing layout. */
export function pickerRects(tiles: ReadonlyMap<string, HTMLElement>): Map<string, DOMRect> {
  return new Map([...tiles].map(([id, tile]) => [id, tile.getBoundingClientRect()]));
}

const focusOwners = new WeakMap<HTMLElement, Animation>();

/** CSS-pixel keyframes, anchored to the destination cell's top-left corner. */
export function pickerFocusKeyframes(from: Box, to: Box): Keyframe[] | undefined {
  if ((['left', 'top', 'width', 'height'] as const).every(key => Math.abs(from[key] - to[key]) <= 0.5)) return undefined;
  return [
    { transform: `translate(${String(from.left - to.left)}px, ${String(from.top - to.top)}px)`, width: `${String(from.width)}px`, height: `${String(from.height)}px`, justifySelf: 'start', alignSelf: 'start' },
    { transform: 'none', width: `${String(to.width)}px`, height: `${String(to.height)}px`, justifySelf: 'start', alignSelf: 'start' },
  ];
}

/** Focus movement starts at the last painted box, including an interrupted move. */
export function pickerFocusAnimation(tile: HTMLElement, content: HTMLElement | null, from: Box, to: Box,
  options: KeyframeAnimationOptions): Animation | undefined {
  const keyframes = pickerFocusKeyframes(from, to);
  if (!keyframes) return undefined;
  if (content) Object.assign(content.style, { position: 'absolute', left: '0', bottom: '0', top: 'auto',
    width: `${String(to.width)}px`, height: `${String(to.height)}px` });
  const animation = tile.animate(keyframes, options);
  focusOwners.set(tile, animation);
  const clear = () => {
    if (focusOwners.get(tile) === animation) {
      focusOwners.delete(tile); content?.removeAttribute('style');
    }
  };
  animation.oncancel = clear;
  animation.onfinish = () => { animation.cancel(); clear(); };
  return animation;
}

/** Apply every destination only after painted capture and cancellation; measure without transforms. */
export function pickerLayout(tiles: ReadonlyMap<string, HTMLElement>, focus: string, expanded: boolean): Map<string, DOMRect> {
  let row = 0;
  for (const [id, tile] of tiles) {
    const focused = id === focus;
    const detail = focused && expanded;
    tile.dataset.focused = String(focused);
    tile.dataset.expanded = String(detail);
    tile.style.gridColumn = detail ? '1 / -1' : focused ? '1' : '2';
    tile.style.gridRow = detail ? '1 / -1' : focused ? '1 / 3' : String(++row);
  }
  return pickerRects(tiles);
}
