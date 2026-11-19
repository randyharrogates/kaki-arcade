import { expect, it } from 'vitest';
import { meta } from './meta';
it('CTRL-009 declares local TV seat participation', () => {
  expect(meta.localSeat).toBe('play');
});
