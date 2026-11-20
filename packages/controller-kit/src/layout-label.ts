/// <reference lib="dom" />
import { space } from '@kaki/ui';
import { PRIVATE_TEXT_STEPS } from '@kaki/platform/private-placement';
import type { Size } from '@kaki/ui';
import type { LayoutPart } from './layout-types';
/** D-127: measured label bounds at 34 px select the next phone type step on overflow. */
export function labelTypeStep(measured: Size, available: Size): 34 | 21 {
  if (![measured.width, measured.height, available.width, available.height].every(Number.isFinite)) return 34;
  return measured.width <= available.width && measured.height <= available.height ? 34 : 21;
}

function px(value: string | number): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Convert viewport measurements back to layout pixels during press scale. */
export function layoutScale(button: HTMLElement): number {
  const width = button.getBoundingClientRect().width;
  const css = getComputedStyle(button);
  const layoutWidth = px(css.width) + (css.boxSizing === 'content-box' ? px(css.paddingLeft)+px(css.paddingRight)+px(css.borderLeftWidth)+px(css.borderRightWidth) : 0) || button.offsetWidth;
  return width && layoutWidth ? layoutWidth/width : 1;
}
export function measureLabelLineWidth(button: HTMLElement, label: HTMLElement): number {
  const range = document.createRange(); range.selectNodeContents(label);
  const width = Math.max(0,...[...range.getClientRects()].map(r => r.width))*layoutScale(button);
  // Restore the browser's layout subpixel precision before rounding to pixels.
  return Math.ceil(Math.round(width*64)/64);
}

/** @internal Test-only legacy single-target oracle; production uses measureLabelGroup. */
export function measureLabelTypeStep(button: HTMLButtonElement, label: HTMLElement, box?: Size): 34 | 21 {
  const css = getComputedStyle(button);
  const scale = box ? 1 : layoutScale(button);
  const icon = button.querySelector('svg');
  const available = {
    width: (box ? box.width-px(css.borderLeftWidth)-px(css.borderRightWidth) : px(button.clientWidth)) - px(css.paddingLeft) - px(css.paddingRight)
      - (icon ? (box ? px(getComputedStyle(icon).width) : px(icon.getBoundingClientRect().width)*scale) + px(css.columnGap) : 0),
    height: (box ? box.height-px(css.borderTopWidth)-px(css.borderBottomWidth) : px(button.clientHeight)) - px(css.paddingTop) - px(css.paddingBottom),
  };
  // A detached-from-grid probe has explicit layout pixels and no ancestor transforms.
  // Copy computed typography before mounting outside the live stepped/animated tree.
  const probe = box ? document.createElement('span') : label;
  if (box) {
    const text = getComputedStyle(label);
    Object.assign(probe.style, { position:'fixed',left:'0',top:'0',visibility:'hidden',
      pointerEvents:'none', fontFamily:text.fontFamily,fontSize:css.fontSize,
      fontWeight:text.fontWeight,fontStyle:text.fontStyle,lineHeight:text.lineHeight,
      letterSpacing:text.letterSpacing,wordSpacing:text.wordSpacing,
      overflowWrap:text.overflowWrap,wordBreak:text.wordBreak,maxWidth:'none' });
    probe.textContent = label.textContent;
    document.body.append(probe);
  }
  const originalStyle = probe.style.cssText;
  try {
    // The span's current clientWidth may be much smaller than the button's label space.
    Object.assign(probe.style, { flex:'none', width:'max-content', whiteSpace:'nowrap' });
    const rect = probe.getBoundingClientRect();
    const natural = {width:rect.width*scale,height:rect.height*scale};
    Object.assign(probe.style, { width:`${String(Math.max(0,available.width))}px`, whiteSpace:'normal' });
    const wrappedHeight = probe.getBoundingClientRect().height*scale;
    const lineHeight = px(getComputedStyle(probe).lineHeight);
    if (lineHeight) available.height = Math.min(available.height,3*lineHeight);
    // Labels no wider than the contract option floor retain a single line. Longer answers may wrap under D-127.
    if (natural.width <= space[144] && natural.width > available.width) return 21;
    // CSSOM scroll/client dimensions are rounded integers. A fitting fractional
    // probe can therefore have scrollWidth > available.width without overflow.
    // Compare like units before promoting scroll bounds to an overflow signal.
    const overflowWidth = probe.scrollWidth > probe.clientWidth ? probe.scrollWidth : 0;
    const overflowHeight = probe.scrollHeight > probe.clientHeight ? probe.scrollHeight : 0;
    return labelTypeStep({ width:Math.max(Math.min(natural.width,available.width),overflowWidth),height:Math.max(natural.height,wrappedHeight,overflowHeight) },available);
  } finally {
    if (box) probe.remove();
    else probe.style.cssText = originalStyle;
  }
}

/** Placement uses the natural 34 px option width, never the live stepped flex width. */
export function measureOptionWidth(button: HTMLElement, label: HTMLElement): number {
  const css = getComputedStyle(button);
  const scale = layoutScale(button);
  const icon = button.querySelector('svg');
  const originalStyle = label.style.cssText;
  try {
    Object.assign(label.style, {
      fontSize:'var(--ka-phone-type-34)', flex:'none', width:'max-content', whiteSpace:'nowrap',
    });
    return Math.ceil(px(label.getBoundingClientRect().width)*scale
      + (icon ? px(icon.getBoundingClientRect().width)*scale + px(css.columnGap) : 0)
      + px(css.paddingLeft) + px(css.paddingRight) + px(css.borderLeftWidth) + px(css.borderRightWidth));
  } finally {
    label.style.cssText = originalStyle;
  }
}

/** D-127: one placed options/grid group shares its smallest measured type step. */
export function measureLabelGroup(buttons: readonly HTMLButtonElement[], box?: Size): void {
  const targets = buttons.flatMap(button => {
    const label = button.querySelector<HTMLElement>(':scope > span');
    return label?.textContent ? [{ button,label }] : [];
  });
  // Reset the whole group before probing: the 21 px bold rule must not leak
  // into a fresh 34 px measurement after a placement or viewport change.
  targets.forEach(({ button,label }) => {
    button.dataset.labelStep = '34';
    button.style.fontSize = 'var(--ka-phone-type-34)';
    label.style.width = 'fit-content';
  });
  // Snapshot typography together, then mount both natural and wrapped probes.
  // No probe write is interleaved with another target's geometry read.
  const inputs = targets.map(({ button,label }) => {
    const css = getComputedStyle(button), text = getComputedStyle(label);
    const icon = button.querySelector('svg');
    const available = {
      width:(box?.width ?? button.clientWidth)- (box ? px(css.borderLeftWidth)+px(css.borderRightWidth) : 0)
        -px(css.paddingLeft)-px(css.paddingRight)-(icon ? px(getComputedStyle(icon).width)+px(css.columnGap) : 0),
      height:(box?.height ?? button.clientHeight)-(box ? px(css.borderTopWidth)+px(css.borderBottomWidth) : 0)-px(css.paddingTop)-px(css.paddingBottom),
    };
    return { label,available,typography:{ fontFamily:text.fontFamily,fontSize:css.fontSize,fontWeight:text.fontWeight,
      fontStyle:text.fontStyle,lineHeight:text.lineHeight,letterSpacing:text.letterSpacing,wordSpacing:text.wordSpacing,
      overflowWrap:text.overflowWrap,wordBreak:text.wordBreak } };
  });
  const probes = inputs.map(input => {
    const make = (wrapped:boolean) => {
      const probe = document.createElement('span');
      Object.assign(probe.style,input.typography,{ position:'fixed',left:'0',top:'0',visibility:'hidden',pointerEvents:'none',
        flex:'none',maxWidth:'none',width:wrapped ? `${String(Math.max(0,input.available.width))}px` : 'max-content',whiteSpace:wrapped ? 'normal' : 'nowrap' });
      probe.textContent = input.label.textContent;
      document.body.append(probe);
      return probe;
    };
    return { ...input,natural:make(false),wrapped:make(true) };
  });
  let steps: (34 | 21)[];
  try {
    steps = probes.map(({ natural,wrapped,available,typography }) => {
      const bounds = natural.getBoundingClientRect(), height = wrapped.getBoundingClientRect().height;
      const lineHeight = px(typography.lineHeight);
      const limit = { ...available,height:lineHeight ? Math.min(available.height,3*lineHeight) : available.height };
      if (bounds.width <= space[144] && bounds.width > available.width) return 21;
      return labelTypeStep({ width:Math.max(Math.min(bounds.width,available.width),wrapped.scrollWidth > wrapped.clientWidth ? wrapped.scrollWidth : 0),
        height:Math.max(bounds.height,height,wrapped.scrollHeight > wrapped.clientHeight ? wrapped.scrollHeight : 0) },limit);
    });
  } finally { probes.forEach(({ natural,wrapped }) => { natural.remove(); wrapped.remove(); }); }
  const step = steps.includes(21) ? '21' : '34';
  targets.forEach(({ button }) => {
    button.dataset.labelStep = step;
    button.style.fontSize = `var(--ka-phone-type-${step})`;
  });
  const widths = targets.map(({ button,label }) => measureLabelLineWidth(button,label));
  targets.forEach(({ label },index) => {
    const width = widths[index];
    if (width) label.style.width = `${String(Math.ceil(width))}px`;
  });
}

/** The interactive grid draws the 5/8 gap, independently of placement spacing. */
export function labelCellBox(kind:'options' | 'grid', width:number, height:number, columns:number, rows:number, gap:number): Size {
  const drawnGap = kind === 'grid' ? (gap === 5 ? 5 : 8) : gap;
  return { width:(width-(columns-1)*drawnGap)/columns,height:(height-(rows-1)*drawnGap)/rows };
}

/** D-205: one owner and one frame-deduplicated pass per placed group. */
export function observeLabelGroup(group:HTMLElement, box:Size): () => void {
  let active = true, frame:number | undefined;
  const invalidate = () => {
    if (!active || frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      measureLabelGroup([...group.querySelectorAll<HTMLButtonElement>(':scope > button')],box);
    });
  };
  // ResizeObserver delivers an initial notification even without a size change.
  // The synchronous install pass already covers that initial geometry.
  let initialResize = true;
  const observer = new ResizeObserver(() => {
    if (initialResize) { initialResize = false; return; }
    invalidate();
  }); observer.observe(group);
  const theme = new MutationObserver(invalidate);
  const shell = group.closest('.ka-controller-shell');
  if (shell) theme.observe(shell,{ attributes:true,attributeFilter:['data-theme'] });
  if (document.fonts.status !== 'loaded') void document.fonts.ready.then(invalidate);
  document.fonts.addEventListener('loadingdone',invalidate);
  window.addEventListener('resize',invalidate);
  // Part installs this owner in a layout effect after placement changes. Measure
  // before paint so keyed targets cannot expose the previous box's 21 px step
  // while the first RAF is still pending. Later notifications remain deduplicated.
  measureLabelGroup([...group.querySelectorAll<HTMLButtonElement>(':scope > button')],box);
  return () => {
    active = false;
    if (frame !== undefined) cancelAnimationFrame(frame);
    observer.disconnect(); theme.disconnect();
    document.fonts.removeEventListener('loadingdone',invalidate);
    window.removeEventListener('resize',invalidate);
  };
}

/** Only inputs which change measured typography/content or the placed cell box. */
export function labelMeasurementSignature(control:LayoutPart, width:number, height:number, gap:number, readOnly:boolean): string {
  if (control.kind !== 'options' && control.kind !== 'grid') return JSON.stringify([control.kind,readOnly]);
  const items = control.kind === 'options' ? control.options : control.cells;
  return JSON.stringify([control.kind,readOnly,width,height,gap,
    control.kind === 'grid' ? [control.cols,control.rows] : [Math.min(2,items.length),Math.ceil(items.length/2)],
    items.map(item => [item.id,item.label,item.face,item.faceDown,item.colour,item.state === 'disabled'])]);
}

/** One status strip shares its smallest measured title step. Called on content,
 * font or box changes by the panel observer, never by an animation loop. */
export function measureTitleGroup(titles: readonly HTMLElement[], fits: (node: HTMLElement) => boolean): boolean {
  const steps = titles.map(node => {
    for (const step of PRIVATE_TEXT_STEPS) {
      node.style.fontSize = `var(--ka-phone-type-${String(step)})`;
      if (fits(node)) return step;
    }
    return 0;
  });
  const step = Math.min(34,...steps);
  titles.forEach(node => { node.style.fontSize = `var(--ka-phone-type-${String(step || 13)})`; });
  return step > 0 && titles.every(fits);
}
