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
});
