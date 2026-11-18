import { expect, it } from 'vitest';
import { COUNT_KINDS, validateCounts } from './counts';
it('DATA-003 accepts only closed kind keys and bounded positive integers', () => {
  for (const kind of COUNT_KINDS) expect(validateCounts({ [kind]: 1 })).toBe(true);
  for (const value of [null, [], {}, 'error', { unknown: 1 }]) expect(validateCounts(value)).toBe(false);
  for (const value of [0, -1, 1.5, NaN, Infinity, 65536, '1', {}, []]) expect(validateCounts({ [COUNT_KINDS[0]]: value })).toBe(false);
});
it.each(['nickname', 'room', 'code', 'seat', 'ip', 'userAgent', 'deviceId', 'timestamp', 'day', 'stack', 'message', '__proto__', 'constructor'])('DATA-001 rejects extra field %s', field => {
  expect(validateCounts(JSON.parse(`{"error:host:session":1,"${field}":1}`))).toBe(false);
  expect(validateCounts({ [field]: 'free text' })).toBe(false);
});
