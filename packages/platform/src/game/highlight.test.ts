import { expect, it } from 'vitest';
import { rejectAction, checkLayout, layoutFor, tapSignature } from './layout';
import type { ControllerLayout } from './layout';
import { sameLayout } from '../session/compare';
import { placeLayout } from './phone-placement';
it('TR-055 generic highlight validates, publishes and preserves input meaning', () => {
  const layout: ControllerLayout = { revision: 0, controls: [{ kind: 'stick', id: 'move' }, { kind: 'button', id: 'cross', button: 'face-bottom', label: 'Pick up' }] };
  const highlighted: ControllerLayout = { ...layout, controls: layout.controls.map(c => ({ ...c, highlighted: true })) };
  expect(checkLayout(highlighted)).toEqual([]);
  expect(checkLayout({ ...layout, controls: [{ ...layout.controls[0], highlighted: 'gold' }] }).length).toBeGreaterThan(0);
  expect(tapSignature(layout)).toEqual(tapSignature(highlighted));
  expect(sameLayout(layout, highlighted)).toBe(false);
  expect(sameLayout(highlighted, { ...highlighted, controls: highlighted.controls.map(c => ({ ...c })) })).toBe(true);
});
it('TR-055 generic header controls retain audience, revision and action checks outside play packing', () => {
  const layout: ControllerLayout = { revision: 2, controls: [
    { kind: 'text', id: 'header-heading', text: 'Step 1 of 4', tone: 'note' },
    { kind: 'options', id: 'header-action', audience: 'leader', options: [{ id: 'skip', label: 'Skip tutorial' }] },
    { kind: 'stick', id: 'move', highlighted: true },
  ] };
  expect(checkLayout(layout)).toEqual([]);
  expect(layoutFor(layout, false).controls.some(c => c.id === 'header-action')).toBe(false);
  const action = { player: 'p1', control: 'header-action', value: 'skip', revision: 2 };
  expect(rejectAction(layout, action, true)).toBeNull();
  expect(rejectAction(layout, { ...action, revision: 1 }, true)).not.toBeNull();
  expect(rejectAction(layout, action, false)).not.toBeNull();
  for (const viewport of [{ width: 667, height: 375 }, { width: 844, height: 390 }, { width: 932, height: 430 }]) {
    const placed = placeLayout(layout, { width: viewport.width, height: viewport.height - 76 }, true, {}, viewport);
    expect(placed.fits).toBe(true); expect(placed.parts.map(p => p.control.id)).toEqual(['move']);
  }
});
