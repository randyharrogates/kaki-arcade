/// <reference lib="dom" />
import { space } from '@kaki/ui';
import type { Size } from '@kaki/ui';
/** D-127: measured label bounds at 34 px select the next phone type step on overflow. */
export function labelTypeStep(measured: Size, available: Size): 34 | 21 {
  if (![measured.width, measured.height, available.width, available.height].every(Number.isFinite)) return 34;
  return measured.width <= available.width && measured.height <= available.height ? 34 : 21;
}

function px(value: string | number): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Measure at the caller's 34 px font, independently of the live span's flex shrink. */
export function measureLabelTypeStep(button: HTMLButtonElement, label: HTMLElement): 34 | 21 {
  const css = getComputedStyle(button);
  const icon = button.querySelector('svg');
  const available = {
    width: px(button.clientWidth) - px(css.paddingLeft) - px(css.paddingRight)
      - (icon ? px(icon.getBoundingClientRect().width) + px(css.columnGap) : 0),
    height: px(button.clientHeight) - px(css.paddingTop) - px(css.paddingBottom),
  };
  const originalStyle = label.style.cssText;
  try {
    // The span's current clientWidth may be much smaller than the button's label space.
    Object.assign(label.style, { flex:'none', width:'max-content', whiteSpace:'nowrap' });
    const natural = label.getBoundingClientRect();
    Object.assign(label.style, { width:`${String(Math.max(0,available.width))}px`, whiteSpace:'normal' });
    const wrappedHeight = label.getBoundingClientRect().height;
    // Labels no wider than the contract option floor retain a single line. Longer answers may wrap under D-127.
    if (natural.width <= space[144] && natural.width > available.width) return 21;
    return labelTypeStep({ width:Math.max(Math.min(natural.width,available.width),label.scrollWidth || 0),height:Math.max(natural.height,wrappedHeight,(label.scrollHeight || 0)) },available);
  } finally {
    label.style.cssText = originalStyle;
  }
}

/** Placement uses the natural 34 px option width, never the live stepped flex width. */
export function measureOptionWidth(button: HTMLElement, label: HTMLElement): number {
  const css = getComputedStyle(button);
  const icon = button.querySelector('svg');
  const originalStyle = label.style.cssText;
  try {
    Object.assign(label.style, {
      fontSize:'var(--ka-phone-type-34)', flex:'none', width:'max-content', whiteSpace:'nowrap',
    });
    return Math.ceil(px(label.getBoundingClientRect().width)
      + (icon ? px(icon.getBoundingClientRect().width) + px(css.columnGap) : 0)
      + px(css.paddingLeft) + px(css.paddingRight) + px(css.borderLeftWidth) + px(css.borderRightWidth));
  } finally {
    label.style.cssText = originalStyle;
  }
}
