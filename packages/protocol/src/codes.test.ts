import { expect, it } from 'vitest';
import { CODE_ALPHABET, CODE_LENGTH } from './index';
it('PLAT-003 exports the eight-character unambiguous room code format', () => {
  expect(CODE_LENGTH).toBe(8);
  expect(CODE_ALPHABET).toBe('23456789BCDFGHJKMNPQRSTVWXYZ');
  expect(new Set(CODE_ALPHABET).size).toBe(CODE_ALPHABET.length);
});
