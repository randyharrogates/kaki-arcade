import { expect, it } from 'vitest';
import { sessionRegistrations } from './game-registry';
import { ConsoleScreen, publicViewKey } from '../../../games/peek-poker/host';
it('PP-030 PP-031 registers the public-only console table', async () => {
  const registration = sessionRegistrations['peek-poker'];
  expect(await registration?.screen?.()).toBe(ConsoleScreen);
  expect(await registration?.viewKey?.()).toBe(publicViewKey);
});
