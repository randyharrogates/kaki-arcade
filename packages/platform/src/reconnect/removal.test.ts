import { expect, it } from 'vitest';
import type { HostMessage } from '@kaki/protocol';
import { createRoom } from '../room/room';
import { createReconnectRoom } from './host-room';
import { Clock } from './testing.fixture';
it('PLAT-011 routes authorised phone removal, notifies and closes only the target, and refuses new connections', () => {
  const clock = new Clock(); let token = 0;
  const updated: number[][] = [];
  const host = createReconnectRoom({ room: createRoom(), clock, mintToken: () => String(++token).repeat(32), session: { updateRoom: room => { updated.push(room.players.map(p => p.seat)); } } });
  const messages: HostMessage[][] = [[], [], []]; const closed: number[] = [];
  for (let i = 0; i < 3; i++) {
    host.attach(String(i), { sendHost: m => { messages[i]?.push(m); return true; }, bindIdentity() { /* No input binding in this fake. */ }, close() { closed.push(i); host.dropped(String(i)); } });
    host.receive(String(i), { v: 1, t: 'hello', name: null, browserId: String(i).repeat(32) });
  }
  const remove = (actor: string, seat: number) => { host.receive(actor, { v: 1, t: 'action', rev: 0, viewRev: null, data: { control: 'remove-player', seat } }); };
  remove('1', 3); remove('0', 1);
  expect(host.room.players).toHaveLength(3);
  remove('0', 3);
  expect(host.room.players).toHaveLength(2);
  expect(updated.at(-1)).toEqual([1, 2]);
  expect(closed).toEqual([2]);
  expect(messages[2]?.at(-1)).toEqual({ v: 1, t: 'refused', reason: 'removed' });
  const fresh: HostMessage[] = [];
  host.attach('fresh', { sendHost: m => { fresh.push(m); return true; }, bindIdentity() { /* No input binding in this fake. */ }, close() { /* Refused peer has no resources. */ } });
  host.receive('fresh', { v: 1, t: 'hello', name: null, browserId: '2'.repeat(32) });
  expect(fresh).toContainEqual({ v: 1, t: 'refused', reason: 'removed' });
  host.receive('fresh', { v: 1, t: 'resume', seatToken: '3'.repeat(32), browserId: '9'.repeat(32) });
  expect(fresh.filter(m => m.t === 'refused')).toHaveLength(2);
  for (const list of messages) for (const message of list) {
    expect(JSON.stringify(message)).not.toContain('browserId');
    expect(JSON.stringify(message)).not.toContain('blocked');
  }
  host.stop();
});
