import { expect, it, vi } from 'vitest';
import { createHost } from './host';
import type { DialCallbacks } from './host';
import { Clock, MemoryStorage, CODE, SECRET } from './testing.fixture';
import type { HostMessage } from '@kaki/protocol';

vi.mock('./game-registry', () => ({
  gameMetas: [true, false].map((midGameJoin, i) => ({ id: `fixture-${String(i)}`, name: 'Fixture',
    blurb: 'Test', players: { min: 1, max: 8 }, teams: 'optional', coop: false, solo: true, midGameJoin })),
  validGameSelection: () => false, sessionRegistrations: {},
}));

it.each([{ localSeat: 'play', midGameJoin: true, teams: false }, { localSeat: 'play', midGameJoin: false, teams: false }, { localSeat: 'play', midGameJoin: true, teams: true }])('PLAT-008 host applies declaration and team policy %j and releases a held phone on quit', async ({ midGameJoin, teams }) => {
  const allowed = midGameJoin && !teams;
  const clock = new Clock(); let callbacks: DialCallbacks | undefined; let serial = 0;
  const updateRoom = vi.fn();
  const host = createHost({ clock, storage: new MemoryStorage(), mintToken: () => String(++serial).repeat(32),
    session: { start: () => Promise.resolve(), updateRoom },
    dial: (_credentials, cb) => { callbacks = cb; return Promise.resolve({ credentials: { code: CODE, hostToken: SECRET }, reopened: false, stop() { /* Fake wire. */ } }); },
  }, () => undefined);
  await host.start();
  const messages: HostMessage[] = [];
  const attach = (id: string) => callbacks?.peer(id, { sendHost(message) { messages.push(message); return true; }, bindIdentity() { /* Fake wire. */ }, close() { /* Fake wire. */ } });
  attach('one'); callbacks?.control('one', { v: 1, t: 'hello', name: 'Fern' });
  const act = (action: 'open' | 'next' | 'select' | 'start') => { clock.advance(150); host.leaderInput('one', action); };
  if (teams) { attach('partner'); callbacks?.control('partner', { v: 1, t: 'hello', name: 'Partner' }); }
  const initialPlayers = teams ? 2 : 1;
  act('open'); if (!midGameJoin) act('next'); act('select');
  if (teams) host.teamInput('one', 'teams-toggle');
  act('start');
  if (teams) host.teamInput('one', 'teams-start');
  await Promise.resolve(); await Promise.resolve();
  expect(host.room).toMatchObject({ phase: 'playing', allowRunningJoin: allowed });
  host.sessionEvent({ type: 'paused', paused: true });
  expect(host.room).toMatchObject({ phase: 'paused', allowRunningJoin: allowed });
  host.sessionEvent({ type: 'paused', paused: false });
  expect(host.room.allowRunningJoin).toBe(allowed);
  attach('two'); callbacks?.control('two', { v: 1, t: 'hello', name: 'Moss' });
  expect(host.room.players).toHaveLength(initialPlayers + (allowed ? 1 : 0));
  if (!allowed) expect(messages).toContainEqual({ v: 1, t: 'refused', reason: 'game-running' });
  host.sessionEvent({ type: 'picker' });
  expect(host.picker.screen).toBe('picker');
  expect(host.room.players).toHaveLength(initialPlayers + 1);
  expect(updateRoom).toHaveBeenLastCalledWith(host.room);
  host.stop();
});
