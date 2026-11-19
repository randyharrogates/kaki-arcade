import { expect, it } from 'vitest';
import { validateHostMessage, validatePhoneMessage } from './channel';
it('PLAT-011 validates removal refusal and private join identity', () => {
  expect(validateHostMessage({ v: 1, t: 'refused', reason: 'removed' }).ok).toBe(true);
  for (const t of ['hello', 'resume']) {
    expect(validatePhoneMessage({ v: 1, t, name: null, seatToken: 's'.repeat(32), browserId: 'b'.repeat(32) }).ok).toBe(true);
    expect(validatePhoneMessage({ v: 1, t, name: null, seatToken: 's'.repeat(32), browserId: '' }).ok).toBe(false);
  }
});
