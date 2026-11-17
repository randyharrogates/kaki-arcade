import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { placeLayout } from './layout-placement';
import { layoutFixtures } from '../../../apps/web/src/layout-fixtures';
import { labelTypeStep, measureLabelTypeStep, measureOptionWidth } from './layout-label';
it('keeps fitting labels at 34, including an exact fit (D-127)', () => {
  expect(labelTypeStep({ width:100,height:34 },{ width:100,height:34 })).toBe(34);
  expect(labelTypeStep({ width:89,height:34 },{ width:144,height:68 })).toBe(34);
});
it('steps labels to 21 for either measured overflow dimension (D-127)', () => {
  expect(labelTypeStep({ width:145,height:34 },{ width:144,height:68 })).toBe(21);
  expect(labelTypeStep({ width:144,height:136 },{ width:144,height:100 })).toBe(21);
});

function measureFixture(naturalWidth: number, wrappedHeight: number, columnGap = '13px', padding = '13px', buttonWidth = 217, buttonHeight = 68, wordWidth = 0) {
  const style = { cssText:'',flex:'',width:'',whiteSpace:'' };
  const label = {
    style, clientWidth:55, scrollWidth:wordWidth,
    getBoundingClientRect:() => ({ width:style.width === 'max-content' ? naturalWidth : 123,height:style.whiteSpace === 'nowrap' ? 34 : wrappedHeight }),
  } as unknown as HTMLElement;
  const button = {
    clientWidth:buttonWidth,clientHeight:buttonHeight,
    querySelector:() => ({ getBoundingClientRect:() => ({ width:55 }) }),
  } as unknown as HTMLButtonElement;
  vi.stubGlobal('getComputedStyle',() => ({ paddingLeft:padding,paddingRight:padding,paddingTop:'5px',paddingBottom:'5px',columnGap }));
  try { return measureLabelTypeStep(button,label); }
  finally { vi.unstubAllGlobals(); }
}
it('CTRL-002 keeps Lock in at 34 when its natural width fits the button beside its face', () => {
  // 217 - 26 padding - 55 face - 13 gap = 123, despite a 55 px flex span.
  expect(measureFixture(110,34)).toBe(34);
  expect(measureFixture(123,34)).toBe(34);
});
it('CTRL-002 steps long answers to 21 and measures wrapped height within the button', () => {
  // Modular Interface of Digital Instruments exceeds the one-line 34 px space.
  expect(measureFixture(680,204)).toBe(21);
  expect(measureFixture(110,68)).toBe(21);
});
it('CTRL-002 keeps the only-child span nowrap at step 34 and permits wrapping only at 21', () => {
  const css = readFileSync(new URL('./layout.css',import.meta.url),'utf8');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const whiteSpace = (step:string) => rules.filter(([,selector]) => selector?.includes('.ka-layout-options > :only-child') && (!selector.includes('[data-label-step=') || selector.includes(`[data-label-step="${step}"]`)))
    .flatMap(([, ,body]) => [...(body ?? '').matchAll(/white-space:\s*(\w+)/g)].map(match => match[1])).at(-1);
  expect(whiteSpace('34')).toBe('normal');
  expect(whiteSpace('21')).toBe('normal');
});

it('CTRL-002 treats normal gaps and non-finite padding as zero and retains step 34', () => {
  expect(measureFixture(130,34,'normal')).toBe(34);
  expect(measureFixture(150,34,'normal','auto')).toBe(34);
});
it('CTRL-002 never steps down when any input dimension is non-finite', () => {
  for (const invalid of [NaN,Infinity,-Infinity]) {
    for (const dimension of ['width','height'] as const) {
      expect(labelTypeStep({ width:680,height:204,[dimension]:invalid },{ width:123,height:58 })).toBe(34);
      expect(labelTypeStep({ width:680,height:204 },{ width:123,height:58,[dimension]:invalid })).toBe(34);
    }
  }
});
it('CTRL-002 gives step-21 labels the remaining flex width instead of their shrunk intrinsic width', () => {
  const css = readFileSync(new URL('./layout.css',import.meta.url),'utf8');
  expect(css).toMatch(/\.ka-layout-target\[data-label-step="21"\] > span\s*\{[^}]*flex: 0 1 auto;[^}]*white-space: normal;/);
});

it('CTRL-002 selects 21 for Modular Interface of Digital Instruments in a 667 answer button', () => {
  // Two columns: (667 - 2 * 13 outer margins - 13 gap) / 2 = 314.
  // Mock font bounds; the browser UAT remains responsible for actual font fit.
  const available = { width:314 - 10 - 55 - 13,height:134 - 10 };
  expect(measureFixture(680,170,'13px','5px',314,134)).toBe(21);
  // At 21 px the measured four-line label uses 84 px of the content height.
  expect(220).toBeLessThanOrEqual(available.width);
  expect(84).toBeLessThanOrEqual(available.height);
});

function optionFixture(step: 21 | 34, liveWidth: number, finite = true) {
  const original = `font-size: ${String(step)}px; width: ${String(liveWidth)}px;`;
  const style = { cssText:original, fontSize:`${String(step)}px`, flex:'1 1 0', width:`${String(liveWidth)}px`, whiteSpace:'normal' };
  const label = { style, getBoundingClientRect:() => ({
    width:style.fontSize === 'var(--ka-phone-type-34)' && style.flex === 'none'
      && style.width === 'max-content' && style.whiteSpace === 'nowrap' ? 110 : liveWidth,
  }) } as unknown as HTMLElement;
  const button = { querySelector:() => ({ getBoundingClientRect:() => ({ width:55 }) }) } as unknown as HTMLElement;
  vi.stubGlobal('getComputedStyle',() => ({
    columnGap:finite ? '13px' : 'normal', paddingLeft:finite ? '13px' : 'auto',
    paddingRight:finite ? '13px' : 'Infinity', borderLeftWidth:finite ? '3px' : 'auto', borderRightWidth:finite ? '3px' : 'NaN',
  }));
  try {
    const width = measureOptionWidth(button,label);
    expect(style.cssText).toBe(original);
    return width;
  } finally { vi.unstubAllGlobals(); }
}
it('CTRL-002 measures the same natural option width at either live type step and span width', () => {
  for (const step of [21,34] as const) {
    for (const width of [44,55,110,200]) expect(optionFixture(step,width)).toBe(210);
  }
});
it('CTRL-002 makes option gap, padding and border reads finite-safe', () => {
  expect(optionFixture(21,44,false)).toBe(165);
});
it('CTRL-002 gives the 667 × 307 picker its natural 34 px Lock in width', () => {
  const picker = layoutFixtures.picker;
  if (!picker) throw new Error('Missing picker fixture');
  const width = optionFixture(21,44);
  const placement = placeLayout(picker,{ width:667,height:307 },false,{ lock:width },{ width:667,height:375 });
  const action = placement.parts.find(p => p.control.id === 'lock');
  expect(placement.fits).toBe(true);
  expect(action?.width).toBe(210);
  expect(labelTypeStep({ width:110,height:34 },{
    width:(action?.width ?? 0)-26-6-55-13,height:(action?.height ?? 0)-10-6,
  })).toBe(34);
});

it('CTRL-003 keeps a two-line 34 px label when its wrapped height fits', () => { expect(measureFixture(200,68,'13px','5px',217,100)).toBe(34); });

it('CTRL-003 steps down when Instruments overflows a wrapped span despite fitting height', () => {
  expect(measureFixture(680,120,'13px','5px',225,170,204)).toBe(21);
});
