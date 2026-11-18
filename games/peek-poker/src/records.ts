import type { HostRecordSchema } from '@kaki/platform';
export interface PokerRecord { best: number }
export const pokerRecordSchema: HostRecordSchema<PokerRecord> = {
  version: 1,
  validate(value: unknown): value is PokerRecord {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      && Object.keys(value).length === 1 && 'best' in value
      && Number.isSafeInteger(value.best) && Number(value.best) >= 0;
  },
};
