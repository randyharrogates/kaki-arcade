import type { RoomState } from '@kaki/platform';
import { expect, it, vi } from 'vitest';
import type { HostMessage } from '@kaki/protocol';
import { createHost } from './host';
import type { DialCallbacks } from './host';
import { Clock, MemoryStorage, CODE, SECRET } from './testing.fixture';
async function fixture(count = 4) {
  const clock = new Clock(); let callbacks: DialCallbacks | undefined; let serial = 0;
  const messages: HostMessage[] = [];
  const privateMessages = new Map<string, HostMessage[]>();
  const session = { start: vi.fn<(id: string, room: RoomState) => Promise<void>>(() => Promise.resolve()) };
  const host = createHost({ clock, storage: new MemoryStorage(), session, mintToken: () => String(++serial).padStart(32, '0'), dial: (_c, cb) => { callbacks = cb; return Promise.resolve({ credentials: { code: CODE, hostToken: SECRET }, reopened: false, stop() { /* Fixture. */ } }); } }, () => undefined);
  await host.start();
  function join(id: string) {
    callbacks?.peer(id, { sendHost(m) { messages.push(m); const own = privateMessages.get(id) ?? []; own.push(m); privateMessages.set(id, own); return true; }, bindIdentity() { /* Fixture. */ }, close() { /* Fixture. */ } });
    callbacks?.control(id, { v: 1, t: 'hello', name: id });
  }
  for (let i = 1; i <= count; i++) join(`p${String(i)}`);
  function input(action: 'open' | 'next' | 'select' | 'start' | 'back') { clock.advance(150); host.leaderInput('p1', action); }
  input('open'); input('next'); input('next'); input('select');
  return { host, session, callbacks, clock, messages, privateMessages, input, join };
}
it('PLAT-025 optional defaults off, skips setup and clears a previous split', async () => {
  const f = await fixture(); expect(f.host.teamSetup).toMatchObject({ screen: 'choice', enabled: false });
  f.input('start'); expect(f.session.start).toHaveBeenCalledOnce(); expect(f.host.teamSetup).toBeNull();
  expect(f.session.start.mock.calls[0]).toBeDefined(); f.host.stop();
});
it('PLAT-025 host authenticates switches and leader moves, fences stale actions, and starts with teams', async () => {
  const f = await fixture();
  f.host.teamInput('p2', 'teams-toggle'); expect(f.host.teamSetup?.enabled).toBe(false);
  f.host.teamInput('p1', 'teams-toggle'); f.input('start');
  expect(f.session.start).not.toHaveBeenCalled(); expect(f.host.teamSetup?.players.map(p => p.team)).toEqual([0, 1, 0, 1]);
  f.host.teamInput('stranger', 'teams-switch');
  f.host.teamInput('p2', 'teams-move', 'seat-1'); expect(f.host.teamSetup?.players[0]?.team).toBe(0);
  const stale = f.host.teamSetup?.revision;
  f.host.teamInput('p1', 'teams-switch'); expect(f.host.teamSetup?.players[0]?.team).toBe(1);
  f.callbacks?.control('p3', { v: 1, t: 'action', rev: 0, viewRev: stale, data: { control: 'teams-switch' } });
  expect(f.host.teamSetup?.players[2]?.team).toBe(0);
  f.host.teamInput('p3', 'teams-switch'); expect(f.host.teamSetup?.error).toContain('at least one');
  f.host.teamInput('p1', 'teams-move', 'seat-2'); expect(f.host.teamSetup?.players[1]?.team).toBe(0);
  f.join('p5'); expect(f.host.teamSetup?.players[4]?.team).toBe(0);
  f.callbacks?.control('p5', { v: 1, t: 'leave' }); expect(f.host.teamSetup?.players).toHaveLength(4);
  f.host.teamInput('p2', 'teams-start'); expect(f.session.start).not.toHaveBeenCalled();
  f.host.teamInput('p1', 'teams-start'); expect(f.session.start).toHaveBeenCalledOnce();
  expect(f.session.start.mock.calls[0]?.[0]).toBe('rabakz');
  expect(f.session.start.mock.calls[0]?.[1].players.map(p => ({ seat: p.seat, team: p.team }))).toEqual([{ seat: 1, team: 'blue' }, { seat: 2, team: 'red' }, { seat: 3, team: 'red' }, { seat: 4, team: 'blue' }]);
  expect(JSON.stringify(f.messages.filter(m => m.t === 'view'))).not.toContain('seatToken');
  f.host.stop();
});
it('PLAT-025 eight-player switches and leader moves succeed, returning to picker discards the split', async () => {
  const f = await fixture(8); f.host.teamInput('p1', 'teams-toggle'); f.input('start');
  f.host.teamInput('p2', 'teams-switch'); expect(f.host.teamSetup?.players[1]?.team).toBe(0);
  f.host.teamInput('p1', 'teams-move', 'seat-4'); expect(f.host.teamSetup?.players[3]?.team).toBe(0);
  expect(f.host.teamSetup?.players).toHaveLength(8); expect(f.host.teamSetup?.error).toBeNull();
  f.host.teamInput('p1', 'teams-back'); expect(f.host.teamSetup).toBeNull(); expect(f.host.picker.screen).toBe('picker');
  f.input('select'); expect(f.host.teamSetup?.enabled).toBe(false); f.host.stop();
});
it('PLAT-025 none metadata skips team choice and setup', async () => {
  const f = await fixture(); f.input('back'); f.input('back');
  f.host.leaderInput('p1', 'open'); f.clock.advance(150);
  // Reopen retains Rabakz focus; move back once to Peek Poker.
  f.host.leaderInput('p1', 'previous'); f.clock.advance(150);
  f.host.leaderInput('p1', 'select'); f.clock.advance(150);
  expect(f.host.teamSetup).toBeNull(); f.host.leaderInput('p1', 'start');
  expect(f.session.start).toHaveBeenCalledOnce(); f.host.stop();
});

it('PLAT-025 refusals are private and attributed on TV; leader moves notify the target until their next action', async () => {
  const f = await fixture(); f.host.teamInput('p1', 'teams-toggle'); f.input('start');
  f.host.teamInput('p1', 'teams-switch'); f.host.teamInput('p3', 'teams-switch');
  const view = (id: string) => f.privateMessages.get(id)?.filter(m => m.t === 'view').at(-1);
  expect(view('p3')).toMatchObject({ view: { notice: 'Red needs at least one player.', refused: true, error: null } });
  expect(view('p2')).toMatchObject({ view: { error: null } });
  expect(JSON.stringify(view('p2'))).not.toContain('needs at least');
  expect(f.host.teamSetup?.error).toBe("p3 can't leave Red: it needs at least one player.");
  f.host.teamInput('p3', 'teams-dismiss'); expect(f.host.teamSetup?.error).toBeNull();
  f.host.teamInput('p3', 'teams-switch'); expect(f.host.teamSetup?.error).toBe("p3 can't leave Red: it needs at least one player.");
  f.host.teamInput('p1', 'teams-move', 'seat-2');
  expect(view('p2')).toMatchObject({ view: { notice: 'p1 moved you to Red.', refused: false } });
  expect(f.host.teamSetup?.error).toBeNull();
  f.host.teamInput('p2', 'teams-switch'); expect(JSON.stringify(view('p2'))).not.toContain('moved you');
  f.host.stop();
});
it.each(['again', 'continue'] as const)('PLAT-025 retains team choice and reconciles last split after results: %s', async path => {
  const f = await fixture(); f.host.teamInput('p1', 'teams-toggle'); f.input('start');
  f.host.teamInput('p1', 'teams-switch'); f.host.teamInput('p1', 'teams-start'); await Promise.resolve();
  f.host.sessionEvent({ type: 'results', results: { mode: 'players', players: [] } });
  f.callbacks?.control('p4', { v: 1, t: 'leave' }); f.join('p5');
  if (path === 'continue') {
    f.host.continueResults(); expect(f.host.teamSetup).toMatchObject({ screen: 'choice', enabled: true });
    f.input('start');
  } else f.host.playAgain();
  expect(f.host.teamSetup).toMatchObject({ screen: 'teams', enabled: true });
  expect(f.host.teamSetup?.players.find(p => p.seat === 1)?.team).toBe(1);
  expect(f.host.teamSetup?.players).toHaveLength(4);
  f.host.teamInput('p1', 'teams-start');
  expect(f.session.start).toHaveBeenCalledTimes(2);
  expect(f.session.start.mock.calls[1]?.[1].players.every(p => p.team !== null)).toBe(true);
  f.host.stop();
});

it('PLAT-025 the retained results toggle can turn teams off for the rematch', async () => {
  const f = await fixture(); f.host.teamInput('p1', 'teams-toggle'); f.input('start');
  f.host.teamInput('p1', 'teams-start'); await Promise.resolve();
  f.host.sessionEvent({ type: 'results', results: { mode: 'players', players: [] } });
  f.host.continueResults(); f.host.teamInput('p1', 'teams-toggle'); f.input('start');
  expect(f.session.start).toHaveBeenCalledTimes(2);
  expect(f.host.teamSetup).toBeNull();
  expect(f.session.start.mock.calls[1]?.[1].players.every(p => p.team === null)).toBe(true);
  f.host.stop();
});
