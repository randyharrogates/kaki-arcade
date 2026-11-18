import { expect, it } from 'vitest';
import { pokerRecordSchema } from './records';
import { peekPoker } from '../src';
import { makePlayers } from '@kaki/platform/kit';

it('PP-012 record schema accepts only a non-negative safe integer best', () => {
  const state = peekPoker.init(42, makePlayers(1, false), { rounds: 3 }, { data: {}, saved: { best: 10 }, teams: false });
  expect(peekPoker.save?.(state)).toEqual({ best: 10 });
  expect(pokerRecordSchema.validate(peekPoker.save?.(state))).toBe(true);
  expect(pokerRecordSchema.version).toBe(1);
  expect(pokerRecordSchema.validate({ best: 0 })).toBe(true);
  for (const invalid of [null, { best: -1 }, { best: 1.5 }, { best: Infinity }, { best: 1, extra: 0 }]) {
    expect(pokerRecordSchema.validate(invalid)).toBe(false);
  }
});
