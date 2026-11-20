import type { HostRecordSchema } from '@kaki/platform';
export interface PokerBests { rising: number; steady: number }
/** Version 1 accepts the original record so the game's read can migrate it. */
export type PokerRecord = { best: number } | { bests: PokerBests };
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function score(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
export const pokerRecordSchema: HostRecordSchema<PokerRecord> = {
  version: 1,
  validate(value: unknown): value is PokerRecord {
    if (!object(value) || Object.keys(value).length !== 1) return false;
    if ('best' in value) return score(value.best);
    return object(value.bests) && Object.keys(value.bests).length === 2
      && score(value.bests.rising) && score(value.bests.steady);
  },
};
export function readPokerBests(value: unknown): PokerBests {
  if (!pokerRecordSchema.validate(value)) return { rising: 0, steady: 0 };
  return 'best' in value ? { rising: value.best, steady: 0 } : { ...value.bests };
}
