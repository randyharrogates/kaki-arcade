import { expect, it } from 'vitest';
import { meta } from './meta';
it('CTRL-009 declares local TV seat participation', () => {
  expect(meta.localSeat).toBe('watch');
});

import { defaultSettings, settingsSchema, validateSettings, EMPTY_SETUP } from '@kaki/platform';
import { peekPoker } from './game';
it('PP-033 defaults to Rising and rejects unknown difficulty values', () => {
  const schema = settingsSchema(peekPoker, EMPTY_SETUP);
  expect(defaultSettings(schema)).toEqual({ rounds: 5, difficulty: 'rising' });
  for (const difficulty of ['rising', 'steady']) {
    expect(validateSettings(schema, { rounds: 5, difficulty }).ok).toBe(true);
  }
  for (const difficulty of ['unknown', 'Steady', 0, null]) {
    expect(validateSettings(schema, { rounds: 5, difficulty }).ok).toBe(false);
  }
});
