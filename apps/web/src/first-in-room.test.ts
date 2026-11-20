import { expect, it } from 'vitest';
import { createHostSnapshotStore, createRoom, restoreHost } from '@kaki/platform';
import { firstInRoom } from './first-in-room';
it('TR-055 derives firstInRoom per game from existing completed totals and C-22 restore', async () => {
  const game = 'tabao-rush';
  expect(firstInRoom({}, game)).toBe(true);
  const scores = { 'seat-1': { [game]: 0 } };
  expect(firstInRoom(scores, game)).toBe(false); expect(firstInRoom(scores, 'peek-poker')).toBe(true);
  const values = new Map<string, string>();
  const store = createHostSnapshotStore({ storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } }, clock: { now: () => 1000, schedule: () => 1, cancel: () => undefined }, validateSelection: () => true });
  const credentials = { code: 'H7KQ9MXR', hostToken: 'host-private-value-1234567890123456' };
  expect(store.write({ credentials, createdAt: 1000, room: createRoom(), scores, results: [], selection: null }, true)).toBe(true);
  const restored = await restoreHost({ store, clock: { now: () => 1000, schedule: () => 1, cancel: () => undefined }, reopen: () => Promise.resolve({ ...credentials, reopened: true, link: { stop() { /* Fixture has no socket. */ } } }) });
  expect(restored).not.toBeNull(); expect(firstInRoom(restored && 'scores' in restored ? restored.scores : {}, game)).toBe(false);
});
