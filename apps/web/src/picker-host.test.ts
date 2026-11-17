import { duration } from '@kaki/ui';
import { expect, it, vi } from 'vitest';
import { createHostSnapshotStore, createRoom } from '@kaki/platform';
import { Clock, MemoryStorage, CODE, SECRET } from './testing.fixture';
import { createHost } from './host';
import type { DialCallbacks } from './host';
import { validGameSelection, loadGame } from './game-registry';
import { settingsSchema, mergeSettings } from '@kaki/platform';

it.each(['picker', 'start', 'starting'] as const)('PLAT-009 restores the room to lobby after reload from %s', async screen => {
  const clock = new Clock(); const storage = new MemoryStorage(); let cb: DialCallbacks | undefined;
  const session = { start: vi.fn(() => Promise.resolve()) };
  const deps = { clock, storage, session, mintToken: () => SECRET,
    dial: (_credentials: unknown, callbacks: DialCallbacks) => { cb = callbacks; return Promise.resolve({ credentials: { code: CODE, hostToken: SECRET }, reopened: true, stop() { /* No transport in this pure host test. */ } }); } };
  let host = createHost(deps, () => undefined); await host.start();
  cb?.peer('one', { sendHost: () => true, bindIdentity() { /* Pure fixture. */ }, close() { /* Pure fixture. */ } });
  cb?.control('one', { v: 1, t: 'hello', name: 'Fern' });
  host.leaderInput('one', 'open');
  if (screen !== 'picker') { clock.advance(150); host.leaderInput('one', 'select'); }
  if (screen === 'starting') { clock.advance(150); host.leaderInput('one', 'start'); }
  expect(host.picker.screen).toBe(screen);
  const before = host.picker;
  host.leaderInput('intruder', 'back'); expect(host.picker).toBe(before);
  host.stop();
  host = createHost(deps, () => undefined); await host.start();
  expect(host.picker.screen).toBe('lobby'); expect(host.room.players[0]?.name).toBe('Fern');
  expect(session.start).toHaveBeenCalledTimes(screen === 'starting' ? 1 : 0);
  host.stop();
});
it('PLAT-020 validates stored selections against installed module schemas', async () => {
  expect(validGameSelection('unknown', {})).toBe(false);
  await loadGame('tabao-rush');
  const { tabaoRush: game } = await import('../../../games/tabao-rush/src/index');
  expect(validGameSelection(game.meta.id, { unknown: 'bad' })).toBe(false);
  const schema = settingsSchema(game, { data: {}, saved: null, teams: false });
  const settings = mergeSettings(schema, {});
  expect(validGameSelection(game.meta.id, settings)).toBe(true);
  const clock = new Clock(); const storage = new MemoryStorage();
  const store = createHostSnapshotStore({ clock, storage, validateSelection: validGameSelection });
  expect(store.write({ credentials: { code: CODE, hostToken: SECRET }, createdAt: clock.now(), room: createRoom(), scores: {}, results: [], selection: { id: game.meta.id, settings, saved: null } })).toBe(true);
  expect(store.read()?.selection?.id).toBe(game.meta.id);
});

it('PLAT-020 coalesces flooded inputs without immediate publishing and recovers a failed loader on both screens', async () => {
  const clock = new Clock(); let cb: DialCallbacks | undefined;
  const messages: unknown[] = []; const changed = vi.fn(); let serial = 0;
  const session = { prefetch: vi.fn(() => Promise.resolve()), start: vi.fn(() => Promise.reject(new Error('offline'))) };
  const host = createHost({ clock, storage: new MemoryStorage(), session, mintToken: () => `seat-${String(++serial).padStart(27, '0')}`,
    dial: (_credentials, callbacks) => { cb = callbacks; return Promise.resolve({ credentials: { code: CODE, hostToken: SECRET }, reopened: false, stop() { /* Fixture transport. */ } }); } }, changed);
  await host.start();
  cb?.peer('one', { sendHost(message) { messages.push(message); return true; }, bindIdentity() { /* Fixture peer. */ }, close() { /* Fixture peer. */ } });
  cb?.control('one', { v: 1, t: 'hello', name: 'Fern' });
  host.leaderInput('one', 'open'); const count = messages.length; const renders = changed.mock.calls.length;
  host.leaderInput('one', 'next'); host.leaderInput('one', 'select');
  expect(messages).toHaveLength(count); expect(changed).toHaveBeenCalledTimes(renders); expect(host.picker.screen).toBe('picker');
  clock.advance(duration.fast - 1); host.leaderInput('one', 'select'); expect(messages).toHaveLength(count); expect(changed).toHaveBeenCalledTimes(renders);
  clock.advance(1); expect(session.prefetch).toHaveBeenCalledWith('peek-poker');
  clock.advance(150); host.leaderInput('one', 'start'); expect(host.picker.screen).toBe('starting');
  cb?.peer('two', { sendHost: () => true, bindIdentity() { /* Fixture. */ }, close() { /* Fixture. */ } });
  cb?.control('two', { v: 1, t: 'hello', name: 'Leaf' });
  expect(host.room.players).toHaveLength(2);
  await Promise.resolve(); await Promise.resolve();
  expect(host.picker.screen).toBe('start'); expect(host.picker.error).toBe('Could not load Peek Poker. Try again.');
  expect(messages.at(-1)).toMatchObject({ t: 'picker-state', failed: true, screen: 'start', reason: host.picker.error });
  host.stop();
});

it('PLAT-006/020 keeps the held leader for the grace, hands over afterwards, and ignores rename/refusal revisions', async () => {
  const clock = new Clock(); let cb: DialCallbacks | undefined; let serial = 0;
  const host = createHost({ clock, storage: new MemoryStorage(), mintToken: () => `seat-${String(++serial).padStart(27, '0')}`,
    dial: (_credentials, callbacks) => { cb = callbacks; return Promise.resolve({ credentials: { code: CODE, hostToken: SECRET }, reopened: false, stop() { /* Fixture. */ } }); } }, () => undefined);
  await host.start();
  for (const id of ['one', 'two', 'bad']) cb?.peer(id, { sendHost: () => true, bindIdentity() { /* Fixture. */ }, close() { /* Fixture. */ } });
  cb?.control('one', { v: 1, t: 'hello', name: 'Fern' }); cb?.control('two', { v: 1, t: 'hello', name: 'Leaf' });
  host.leaderInput('one', 'open'); const revision = host.picker.revision;
  cb?.control('two', { v: 1, t: 'set-name', name: 'Tree' });
  cb?.control('bad', { v: 1, t: 'hello', name: '' });
  expect(host.picker.revision).toBe(revision);
  clock.advance(150); host.leaderInput('one', 'next', revision); expect(host.picker.revision).toBe(revision + 1);
  cb?.dropped('one'); clock.advance(9999); expect(host.room.leader).toBe(1);
  clock.advance(1); expect(host.room.leader).toBe(2);
  expect(host.picker.screen).toBe('picker');
  host.leaderInput('two', 'select'); expect(host.picker.screen).toBe('start'); host.stop();
});

async function trailingFixture() {
  const clock = new Clock(); let callbacks: DialCallbacks | undefined;
  const changed = vi.fn(); let serial = 0;
  const host = createHost({ clock, storage: new MemoryStorage(), mintToken: () => `seat-${String(++serial).padStart(27, '0')}`,
    dial: (_credentials, cb) => { callbacks = cb; return Promise.resolve({ credentials: { code: CODE, hostToken: SECRET }, reopened: false, stop() { /* Fixture. */ } }); } }, changed);
  await host.start();
  for (const id of ['one', 'two']) {
    callbacks?.peer(id, { sendHost: () => true, bindIdentity() { /* Fixture. */ }, close() { /* Fixture. */ } });
    callbacks?.control(id, { v: 1, t: 'hello', name: id });
  }
  host.leaderInput('one', 'open'); clock.advance(duration.fast);
  return { host, clock, changed, callbacks };
}
it('PLAT-020 applies Back then Select 20ms apart in order', async () => {
  const { host, clock } = await trailingFixture();
  host.leaderInput('one', 'select'); clock.advance(duration.fast);
  host.leaderInput('one', 'back'); clock.advance(20); host.leaderInput('one', 'select');
  expect(host.picker.screen).toBe('picker'); clock.advance(duration.fast - 20);
  expect(host.picker.screen).toBe('start'); host.stop();
});
it('PLAT-020 bounds 100 Next presses to the game count, at most one publication per window', async () => {
  const { host, clock, changed } = await trailingFixture();
  host.leaderInput('one', 'next'); const count = changed.mock.calls.length;
  for (let i = 0; i < 100; i++) host.leaderInput('one', 'next');
  expect(changed).toHaveBeenCalledTimes(count);
  clock.advance(duration.fast); expect(changed).toHaveBeenCalledTimes(count + 1);
  clock.advance(duration.fast); expect(changed).toHaveBeenCalledTimes(count + 1); host.stop();
});
it('PLAT-020 drops queued input after its leader loses the lead', async () => {
  const { host, clock } = await trailingFixture();
  host.leaderInput('one', 'next'); host.leaderInput('one', 'select');
  const before = host.picker;
  host.roomInput({ type: 'disconnect', seat: 1 }); clock.advance(10000);
  expect(host.picker.screen).toBe('picker');
  clock.advance(duration.fast);
  expect(host.picker).toMatchObject({ screen: before.screen, focus: before.focus });
  expect(host.picker.screen).toBe('picker'); host.stop();
});

it('PLAT-020 keeps navigation before the latest queued action', async () => {
  const { host, clock } = await trailingFixture();
  host.leaderInput('one', 'next'); host.leaderInput('one', 'select'); host.leaderInput('one', 'open');
  clock.advance(duration.fast); expect(host.picker.screen).toBe('picker'); host.stop();
});

it('PLAT-020 keeps three quick Next presses and drops a phone stale revision', async () => {
  const { host, clock, callbacks } = await trailingFixture();
  const original = host.picker.focus;
  const stale = host.picker.revision;
  host.leaderInput('one', 'next');
  host.leaderInput('one', 'next');
  host.leaderInput('one', 'next');
  callbacks?.control('one', { v: 1, t: 'picker-input', input: 'select', revision: stale });
  clock.advance(duration.fast);
  expect(host.picker.focus).toBe(original);
  expect(host.picker.screen).toBe('picker');
  host.stop();
});

it('PLAT-020 applies bounded navigation around the latest action in arrival order', async () => {
  const { host, clock } = await trailingFixture();
  host.leaderInput('one', 'next');
  host.leaderInput('one', 'next');
  host.leaderInput('one', 'select');
  host.leaderInput('one', 'next');
  clock.advance(duration.fast);
  expect(host.picker.screen).toBe('start');
  expect(host.picker.focus).toBe('rabakz');
  host.stop();
});

it('PLAT-020 counts five quick Next presses modulo three games', async () => {
  const { host, clock } = await trailingFixture();
  for (let i = 0; i < 5; i++) host.leaderInput('one', 'next');
  clock.advance(duration.fast);
  expect(host.picker.focus).toBe('rabakz');
  host.stop();
});
