import { expect, it } from 'vitest';
import type { HostMessage } from '@kaki/protocol';
import { createRoom, publicRoom } from '../room/room';
import { createReconnectRoom } from './host-room';
import { Clock } from './testing.fixture';
function setup() {
  const clock = new Clock(); let serial = 0;
  const sent = new Map<string, HostMessage[]>(); const closed: string[] = [];
  const notices: string[] = [];
  const host = createReconnectRoom({ claimed: name => notices.push(name), room: createRoom(), clock, mintToken: () => `private-token-${String(++serial).padStart(20, '0')}` });
  function attach(id: string) { sent.set(id, []); host.attach(id, { sendHost(m) { sent.get(id)?.push(m); return true; }, bindIdentity() { /* Host input binding is separate. */ }, close() { closed.push(id); host.dropped(id); } }); }
  for (const [id, name] of [['one', 'Mei'], ['two', 'Randy'], ['three', 'Cloud']]) { if (!id || !name) throw new Error('Missing fixture'); attach(id); host.receive(id, { v: 1, t: 'hello', name, browserId: `private-browser-${id}` }); }
  return { host, clock, sent, closed, attach, notices };
}
it('PLAT-034 offers only disconnected names; fresh-browser choice restores the seat and prevents a racing claim', () => {
  const f = setup(); f.host.dropped('two'); f.attach('fresh');
  f.host.receive('fresh', { v: 1, t: 'hello', name: 'New', browserId: 'fresh-browser-123456' });
  expect(f.sent.get('fresh')?.at(-1)).toMatchObject({ t: 'view', view: { kind: 'rejoin-seats', players: [{ seat: 2, colour: 1, name: 'Randy' }] } });
  const claim = (seat: number | null) => { f.host.receive('fresh', { v: 1, t: 'action', rev: 0, viewRev: null, data: { control: 'rejoin-seat', seat } }); };
  claim(1); expect(f.host.room.players.find(p => p.seat === 1)?.connectionId).toBe('one');
  claim(2); expect(f.host.room.players.find(p => p.seat === 2)).toMatchObject({ connectionId: 'fresh', name: 'Randy', disconnectedAt: null });
  expect(f.host.room.players).toHaveLength(3); f.host.stop();
});
it('PLAT-034 same-browser stale takeover closes the old connection; stale callbacks cannot drop the winner', () => {
  const f = setup(); f.attach('new-tab');
  f.host.receive('new-tab', { v: 1, t: 'hello', name: 'Randy', browserId: 'private-browser-two' });
  expect(f.closed).toEqual(['two']); f.host.dropped('two');
  expect(f.host.room.players.find(p => p.seat === 2)).toMatchObject({ connectionId: 'new-tab', name: 'Randy', disconnectedAt: null });
  f.host.stop();
});
it('PLAT-034 I’m new retains ordinary admission and cannot steal an offline seat', () => {
  const f = setup(); f.host.dropped('two'); f.attach('fresh');
  f.host.receive('fresh', { v: 1, t: 'hello', name: 'New', browserId: 'fresh-browser-123456' });
  f.host.receive('fresh', { v: 1, t: 'action', rev: 0, viewRev: null, data: { control: 'rejoin-seat', seat: null } });
  expect(f.host.room.players.find(p => p.connectionId === 'fresh')).toMatchObject({ seat: 4, name: 'New' });
  expect(f.host.room.players.find(p => p.seat === 2)?.disconnectedAt).not.toBeNull(); f.host.stop();
});
it('PLAT-011 PLAT-034 walks outbound room/admission messages for three phones: only own seat notice contains its token', () => {
  const f = setup(); f.host.dropped('two'); f.attach('fresh');
  f.host.receive('fresh', { v: 1, t: 'hello', name: 'New', browserId: 'fresh-browser-123456' });
  const original = f.host.room.players;
  f.host.receive('fresh', { v: 1, t: 'action', rev: 0, viewRev: null, data: { control: 'rejoin-seat', seat: 2 } });
  const players = f.host.room.players;
  expect(players.find(p => p.seat === 2)?.claimedBy).toBe('fresh-browser-123456');
  const allTokens = [...original, ...players].map(p => p.seatToken);
  function walk(value: unknown, forbidden: readonly string[]): void {
    if (typeof value === 'string') { for (const secret of forbidden) if (secret) expect(value).not.toContain(secret); }
    else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) { expect(key).not.toBe('claimedBy'); expect(key).not.toBe('browserId'); expect(key).not.toBe('seatToken'); walk(child, forbidden); }
  }
  for (const [id, messages] of f.sent) for (const message of messages) {
    const ownTokens = [...original, ...players].filter(p => p.connectionId === id).map(p => p.seatToken);
    const forbidden = [...players.flatMap(p => [p.browserId ?? '', p.claimedBy ?? '']), ...allTokens.filter(t => !ownTokens.includes(t))];
    if (message.t === 'seat') { const { seatToken, ...safe } = message; expect(ownTokens).toContain(seatToken); walk(safe, forbidden); }
    else walk(message, forbidden);
  }
  walk(publicRoom(f.host.room), [...players.flatMap(p => [p.browserId ?? '', p.claimedBy ?? '']), ...allTokens]); f.host.stop();
});

it.each(['lobby', 'playing'] as const)('PLAT-034 rotates claim tokens in %s, keeps the original browser and leader, and announces each claim once', phase => {
  const f = setup();
  f.host.host({ type: 'phase', phase, allowRunningJoin: false });
  const original = f.host.room.players[0];
  if (!original) throw new Error('Missing leader');
  f.host.dropped('one'); f.attach('fresh');
  f.host.receive('fresh', { v: 1, t: 'hello', name: 'New', browserId: 'fresh-browser-123456' });
  const claim = { v: 1, t: 'action', rev: 0, viewRev: null, data: { control: 'rejoin-seat', seat: 1 } };
  f.host.receive('fresh', claim); f.host.receive('fresh', claim);
  const claimed = f.host.room.players[0];
  expect(claimed?.seatToken).not.toBe(original.seatToken);
  expect(JSON.stringify(f.sent.get('fresh'))).not.toContain(original.seatToken);
  expect(f.host.room.leader).toBe(1);
  expect(f.notices).toEqual(['Mei']);
  f.attach('old-token');
  f.host.receive('old-token', { v: 1, t: 'resume', seatToken: original.seatToken });
  expect(f.sent.get('old-token')).toContainEqual({ v: 1, t: 'refused', reason: 'seat-expired' });
  f.attach('claimer-resume');
  f.host.receive('claimer-resume', { v: 1, t: 'resume', seatToken: claimed?.seatToken, browserId: 'fresh-browser-123456' });
  expect(f.host.room.players[0]?.browserId).toBe(original.browserId);
  f.attach('original');
  f.host.receive('original', { v: 1, t: 'resume', seatToken: original.seatToken, browserId: original.browserId });
  expect(f.closed).toContain('fresh');
  expect(f.closed).toContain('claimer-resume');
  expect(f.host.room.players[0]).toMatchObject({ connectionId: 'original', browserId: original.browserId });
  expect(f.notices).toEqual(['Mei']);
  f.attach('revoked');
  f.host.receive('revoked', { v: 1, t: 'resume', seatToken: claimed?.seatToken, browserId: 'fresh-browser-123456' });
  expect(f.sent.get('revoked')).toContainEqual({ v: 1, t: 'refused', reason: 'seat-expired' });
  f.host.dropped('original'); f.attach('next');
  f.host.receive('next', { v: 1, t: 'hello', name: null, browserId: 'another-browser-123456' });
  f.host.receive('next', claim);
  expect(f.notices).toEqual(['Mei', 'Mei']);
  f.host.stop();
});

it('PLAT-011 refuses a name claim without a browser identity', () => {
  const f = setup(); f.host.dropped('two'); f.attach('anonymous');
  f.host.receive('anonymous', { v: 1, t: 'hello', name: 'New' });
  f.host.receive('anonymous', { v: 1, t: 'action', rev: 0, viewRev: null, data: { control: 'rejoin-seat', seat: 2 } });
  expect(f.sent.get('anonymous')).toContainEqual({ v: 1, t: 'refused', reason: 'seat-expired' });
  expect(f.host.room.players[1]?.disconnectedAt).not.toBeNull(); f.host.stop();
});
it.each([false, true])('PLAT-011 removed claimer receives no name list after owner retake=%s', retake => {
  const f = setup(); f.host.dropped('two'); f.attach('fresh');
  const browserId = 'fresh-browser-123456';
  f.host.receive('fresh', { v: 1, t: 'hello', name: 'New', browserId });
  f.host.receive('fresh', { v: 1, t: 'action', rev: 0, viewRev: null, data: { control: 'rejoin-seat', seat: 2 } });
  if (retake) {
    f.attach('owner'); f.host.receive('owner', { v: 1, t: 'hello', name: 'Randy', browserId: 'private-browser-two' });
  }
  f.host.host({ type: 'remove', seat: 2 }); f.host.dropped('three');
  f.attach('removed'); f.host.receive('removed', { v: 1, t: 'hello', name: 'New', browserId });
  expect(f.sent.get('removed')).toContainEqual({ v: 1, t: 'refused', reason: 'removed' });
  expect(f.sent.get('removed')?.some(m => m.t === 'view')).toBe(false);
  f.host.stop();
});
it('PLAT-011 sends removed refusal when removal races a pending name choice', () => {
  const f = setup(); f.host.dropped('two'); f.attach('fresh');
  const browserId = 'fresh-browser-123456';
  f.host.receive('fresh', { v: 1, t: 'hello', name: 'New', browserId });
  const claim = { v: 1, t: 'action', rev: 0, viewRev: null, data: { control: 'rejoin-seat', seat: 2 } };
  f.host.receive('fresh', claim); f.host.dropped('fresh'); f.attach('pending');
  f.host.receive('pending', { v: 1, t: 'hello', name: 'New', browserId });
  f.host.host({ type: 'remove', seat: 2 });
  f.sent.set('pending', []); f.host.receive('pending', claim);
  expect(f.sent.get('pending')).toContainEqual({ v: 1, t: 'refused', reason: 'removed' });
  expect(f.sent.get('pending')?.some(m => m.t === 'view')).toBe(false); f.host.stop();
});
