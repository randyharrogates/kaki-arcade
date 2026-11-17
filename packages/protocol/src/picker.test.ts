import { expect, it } from 'vitest';
import { PICKER_INPUTS, PICKER_SCREENS, validateHostMessage, validatePhoneMessage, decodePhoneMessage, decodeHostMessage } from './channel';
it.each(PICKER_INPUTS)('PLAT-020 validates leader picker input %s', input => {
  expect(validatePhoneMessage({ v: 1, t: 'picker-input', revision: 0, input }).ok).toBe(true);
});
it.each([-1, 0.5, NaN, '0', null, undefined])('rejects invalid picker revision %s', revision => {
  expect(validatePhoneMessage({ v: 1, t: 'picker-input', revision, input: 'select' }).ok).toBe(false);
});
it('rejects unknown actions, bad versions, oversized and malformed JSON', () => {
  for (const input of ['pause', '', null, {}, ['select']]) expect(validatePhoneMessage({ v: 1, t: 'picker-input', revision: 0, input }).ok).toBe(false);
  expect(validatePhoneMessage({ v: 2, t: 'picker-input', revision: 0, input: 'start' }).ok).toBe(false);
  expect(decodePhoneMessage('{').ok).toBe(false);
  expect(decodeHostMessage('x'.repeat(100000)).ok).toBe(false);
});
it.each(PICKER_SCREENS)('validates public picker state %s without game state', screen => {
  const state = { v: 1, t: 'picker-state', failed: false, revision: 1, screen, leaderName: 'Fern',
    game: { id: 'a-game', name: 'A game', blurb: 'Play together.', min: 1, max: 8 }, reason: null };
  expect(validateHostMessage(state)).toEqual({ ok: true, value: state });
  for (const game of [{ ...state.game, min: 8, max: 1 }, { ...state.game, min: 0 }, { ...state.game, max: 9 }, { ...state.game, id: '../bad' }, { ...state.game, blurb: 'x'.repeat(90) }]) expect(validateHostMessage({ ...state, game }).ok).toBe(false);
  expect(validateHostMessage({ ...state, screen: 'secret' }).ok).toBe(false);
  for (const failed of [undefined, null, 1, 'true']) expect(validateHostMessage({ ...state, failed }).ok).toBe(false);
  expect(validateHostMessage({ ...state, failed: true }).ok).toBe(true);
});
