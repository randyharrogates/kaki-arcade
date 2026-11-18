import type { GameMeta, RoomState } from '@kaki/platform';
import { expect, it, vi } from 'vitest';
import { createHost } from './host';
import type { DialCallbacks } from './host';
import { Clock, MemoryStorage, CODE, SECRET } from './testing.fixture';
vi.mock('./game-registry', async original => {
  const actual = await original<{ gameMetas: readonly GameMeta[] }>();
  return { ...actual, gameMetas: [{ id: 'required-fixture', name: 'Required teams', blurb: 'Test', players: { min: 2, max: 8 }, teams: 'required', coop: false, solo: false, midGameJoin: false }] };
});
it('PLAT-025 required metadata inserts setup and prevents duplicate initialisation', async () => {
  const clock = new Clock(); let cb: DialCallbacks | undefined; let serial = 0;
  const start = vi.fn<(id: string, room: RoomState) => Promise<void>>(() => Promise.resolve());
  const host = createHost({ clock, storage: new MemoryStorage(), session: { start }, mintToken: () => String(++serial).padStart(32, '0'), dial: (_credentials, callbacks) => { cb = callbacks; return Promise.resolve({ credentials: { code: CODE, hostToken: SECRET }, reopened: false, stop() { /* Fixture. */ } }); } }, () => undefined);
  await host.start();
  for (const id of ['one', 'two']) {
    cb?.peer(id, { sendHost: () => true, close() { /* Fixture. */ }, bindIdentity() { /* Fixture. */ } });
    cb?.control(id, { v: 1, t: 'hello', name: id });
  }
  for (const action of ['open', 'select', 'start'] as const) { clock.advance(150); host.leaderInput('one', action); }
  expect(host.teamSetup?.screen).toBe('teams'); expect(start).not.toHaveBeenCalled();
  host.teamInput('one', 'teams-start'); host.teamInput('one', 'teams-start');
  expect(start).toHaveBeenCalledOnce(); expect(start.mock.calls[0]?.[1].players.map(p => p.team)).toEqual(['red', 'blue']); host.stop();
});
