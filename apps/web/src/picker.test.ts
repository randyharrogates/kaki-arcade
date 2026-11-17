import { expect, it } from 'vitest';
import { createRoom, pickerView, initialPicker } from '@kaki/platform';
import { validateHostMessage } from '@kaki/protocol';
import { gameMetas } from './game-registry';
it.each(gameMetas)('PLAT-020 real $name metadata passes the picker protocol', game => {
  expect(game.blurb.length).toBeLessThanOrEqual(89);
  expect(validateHostMessage(pickerView({ ...initialPicker(gameMetas), screen: 'picker', focus: game.id }, createRoom(), gameMetas)).ok).toBe(true);
});

it('PLAT-020 demo focus advances twice from the current input', async () => {
  const { pickerDemo, pickerDemoChange } = await import('./picker-demo');
  const params = new URLSearchParams('change=focus');
  const first = pickerDemoChange(pickerDemo(params), params);
  const second = pickerDemoChange(first, params);
  expect(first.picker?.focus).toBe('peek-poker');
  expect(second.picker?.focus).toBe('rabakz');
  expect(second.picker?.revision).toBe((first.picker?.revision ?? 0) + 1);
});
