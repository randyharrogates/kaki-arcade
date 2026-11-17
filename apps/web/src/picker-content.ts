import { easing } from '@kaki/ui';
import { crossfade } from '@kaki/ui';

/** Freeze only the root geometry; snapshot attributes retain the old layout selectors. */
export function freezePickerContent(content: HTMLElement): HTMLElement {
  const copy = content.cloneNode(true) as HTMLElement;
  const css = getComputedStyle(content);
  copy.dataset.snapshot = content.parentElement?.dataset.expanded ?? 'false';
  copy.dataset.snapshotFocused = content.parentElement?.dataset.focused ?? 'false';
  copy.setAttribute('aria-hidden', 'true'); copy.inert = true;
  Object.assign(copy.style, { position: 'absolute', left: '0', top: '0', margin: '0',
    width: css.width, height: css.height, pointerEvents: 'none' });
  return copy;
}

/** One vertical boundary, in tile-local pixels, for differently sized copies. */
export function pickerContentMasks(incomingWidth: number, outgoingWidth: number, progress: number) {
  const boundary = Math.max(incomingWidth, outgoingWidth) * progress;
  return {
    incoming: `inset(0 ${String(incomingWidth - boundary)}px 0 0)`,
    outgoing: `inset(0 0 0 ${String(boundary)}px)`,
  };
}

export function wipePickerContent(content: HTMLElement, old: HTMLElement, duration: number): Animation[] {
  content.parentElement?.append(old);
  // Both roots stay bottom-left anchored even while their tile translates/resizes.
  Object.assign(content.style, { left: '0', top: 'auto', bottom: '0' });
  Object.assign(old.style, { left: '0', top: 'auto', bottom: '0' });
  const options = { ...crossfade().incoming.options, duration, delay: 0, easing: easing.out };
  const masks = [0, 1].map(progress => pickerContentMasks(content.offsetWidth || 1, old.offsetWidth || 1, progress));
  const incoming = content.animate(masks.map(mask => ({ clipPath: mask.incoming })), options);
  // No opacity animation: outgoing ink remains full until the boundary passes it.
  const outgoing = old.animate(masks.map(mask => ({ clipPath: mask.outgoing })), options);
  // Both are created in the same task on the same timeline, so they start together.
  // Do not copy startTime: it is null while an animation is pending, and assigning
  // null holds the outgoing copy fully visible for the whole move.
  const clear = () => { old.remove(); incoming.cancel(); outgoing.cancel(); };
  incoming.onfinish = clear;
  incoming.oncancel = () => { old.remove(); outgoing.cancel(); };
  return [incoming, outgoing];
}
