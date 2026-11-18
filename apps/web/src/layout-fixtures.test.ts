import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { expect,it } from 'vitest';
import { layoutFixtures } from './layout-fixtures';

it('PP-005 CTRL-005 exposes the unshaped large Peek Poker pick fixture', () => {
  const fixture = layoutFixtures['peek-pick'];
  expect(fixture?.controls).toHaveLength(2);
  const grid = fixture?.controls[0], lock = fixture?.controls[1];
  if (grid?.kind !== 'grid' || lock?.kind !== 'options') throw new Error('Missing pick controls');
  expect([grid.rows,grid.cols,grid.cells.length]).toEqual([4,4,16]);
  expect(grid.cells.every(c => c.faceDown && c.label === undefined && c.mark === undefined)).toBe(true);
  expect(grid.cells.filter(c => c.state === 'selected')).toHaveLength(2);
  expect(lock.size).toBe('large');
  expect(lock.options).toEqual([{ id:'lock',label:'Lock in' }]);
});

it('PP-005 CTRL-003 computes the same selected card-back inset inside and outside a private panel', async () => {
  const browser = await chromium.launch({ headless:true });
  try {
    const page = await browser.newPage();
    const css = readFileSync(new URL('../../../packages/controller-kit/src/layout.css',import.meta.url),'utf8');
    const tokens = readFileSync(new URL('../../../packages/ui/tokens.css',import.meta.url),'utf8');
    await page.setContent(`<style>${tokens}${css}</style><div class="ka-layout-grid"><button class="ka-layout-target ka-layout-card-back" data-state="selected"></button></div><div class="ka-private-panel"><div class="ka-layout-grid"><button class="ka-layout-target ka-layout-card-back" data-state="selected"></button></div></div>`);
    expect(await page.locator('button').evaluateAll(nodes => nodes.map(node => {
      const css = getComputedStyle(node);
      return { offset:css.outlineOffset,width:css.outlineWidth };
    }))).toEqual([{ offset:'-13px',width:'5px' },{ offset:'-13px',width:'5px' }]);
  } finally { await browser.close(); }
}, 30000);

it('PP-005 D-218 centres anonymous selection ticks without changing card geometry', async () => {
  const browser = await chromium.launch({ headless:true });
  try {
    const page = await browser.newPage();
    const css = readFileSync(new URL('../../../packages/controller-kit/src/layout.css',import.meta.url),'utf8');
    const tokens = readFileSync(new URL('../../../packages/ui/tokens.css',import.meta.url),'utf8');
    await page.setContent(`<style>${tokens}${css}</style><div data-theme="peek-poker" style="width:89px;height:89px"><button class="ka-layout-target ka-layout-card-back" data-state="plain" aria-pressed="false"></button></div><div style="width:89px;height:89px"><button class="ka-layout-target" data-state="selected" aria-pressed="true">A</button></div>`);
    const back = page.locator('.ka-layout-card-back');
    const sample = () => back.evaluate(node => {
      const disc = getComputedStyle(node,'::before'), tick = getComputedStyle(node,'::after'), card = getComputedStyle(node);
      const luminance = (colour:string) => {
        const rgb = (colour.match(/[\d.]+/g) ?? []).slice(0,3).map(n => {
          const v = Number(n)/255; return v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4;
        });
        return (rgb[0] ?? 0)*0.2126+(rgb[1] ?? 0)*0.7152+(rgb[2] ?? 0)*0.0722;
      };
      const contrast = (a:string,b:string) => (Math.max(luminance(a),luminance(b))+0.05)/(Math.min(luminance(a),luminance(b))+0.05);
      return { disc:disc.width,tick:tick.width,discHeight:disc.height,tickHeight:tick.height,
        inset:[disc.top,disc.right,disc.bottom,disc.left],margin:[disc.marginTop,disc.marginRight,disc.marginBottom,disc.marginLeft],
        opacity:[disc.opacity,tick.opacity],duration:disc.transitionDuration,easing:disc.transitionTimingFunction,mask:tick.maskImage,
        contrast:contrast(disc.backgroundColor,card.backgroundColor),inkContrast:contrast(tick.backgroundColor,disc.backgroundColor),
        outline:card.outlineColor, border:card.borderTopColor,transform:disc.transform };
    });
    const box = await back.boundingBox();
    expect((await sample()).opacity).toEqual(['0','0']);
    expect((await sample()).transform).toBe('matrix(0.95, 0, 0, 0.95, 0, 0)');
    const face = await page.locator('button').nth(1).evaluate(node => ({ before:getComputedStyle(node,'::before').content,after:getComputedStyle(node,'::after').content,outline:getComputedStyle(node).outlineColor }));
    await back.evaluate(node => { node.setAttribute('data-state','selected'); node.setAttribute('aria-pressed','true'); });
    await back.evaluate(async node => { await Promise.all(node.getAnimations({subtree:true}).map(a => a.finished)); });
    const selected = await sample();
    expect(selected).toMatchObject({disc:'34px',discHeight:'34px',tick:'21px',tickHeight:'21px',opacity:['1','1'],duration:'0.144s',outline:selected.border});
    expect(selected.inset).toEqual(['0px','0px','0px','0px']);
    expect(selected.margin[0]).toBe(selected.margin[2]); expect(selected.margin[1]).toBe(selected.margin[3]);
    expect(selected.mask).toContain('data:image/svg+xml');
    expect(selected.contrast).toBeGreaterThanOrEqual(5.1); expect(selected.inkContrast).toBeGreaterThanOrEqual(5.1);
    expect(await back.boundingBox()).toEqual(box);
    await back.evaluate(node => { node.setAttribute('data-state','plain'); node.setAttribute('aria-pressed','false'); });
    expect((await sample()).duration).toBe('0.115s, 0.115s');
    await back.evaluate(async node => { await Promise.all(node.getAnimations({subtree:true}).map(a => a.finished)); });
    expect((await sample()).opacity).toEqual(['0','0']);
    await page.emulateMedia({reducedMotion:'reduce'});
    for (const state of ['selected','plain']) {
      await back.evaluate((node,state) => { node.setAttribute('data-state',state); },state);
      expect((await sample()).duration).toBe('0s');
      expect((await sample()).opacity).toEqual(state === 'selected' ? ['1','1'] : ['0','0']);
    }
    expect(await page.locator('button').nth(1).evaluate(node => ({ before:getComputedStyle(node,'::before').content,after:getComputedStyle(node,'::after').content,outline:getComputedStyle(node).outlineColor }))).toEqual(face);
  } finally { await browser.close(); }
},30000);
