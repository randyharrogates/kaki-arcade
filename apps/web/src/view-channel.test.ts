import { expect, it } from 'vitest';
import type { HostMessage } from '@kaki/protocol';
import { viewChannel } from './view-channel';
it('PLAT-025 shell and session views share wire revisions; stale actions cannot cross the boundary', () => {
  const channel = viewChannel(); const sent: HostMessage[] = [];
  const send = (m: HostMessage) => { sent.push(m); return true; };
  channel.send({ v: 1, t: 'view', rev: 1, view: { kind: 'team-setup' } }, send);
  const action = { v: 1, t: 'action', rev: 0, viewRev: 0, data: { control: 'teams-switch' } };
  expect(channel.receive(action)).toMatchObject({ viewRev: 1 });
  channel.send({ v: 1, t: 'view', rev: 1, view: null }, send);
  expect(sent.map(m => m.t === 'view' ? m.rev : -1)).toEqual([0, 1]);
  expect(channel.receive(action)).toBeNull();
  expect(channel.receive({ ...action, viewRev: 1 })).toMatchObject({ viewRev: 1 });
});

it('PLAT-011 room removal bypasses private-view revisions without admitting other stale actions', () => {
  const channel = viewChannel();
  channel.send({ v: 1, t: 'view', rev: 7, view: null }, () => true);
  const action = { v: 1, t: 'action', rev: 0, viewRev: null, data: { control: 'remove-player', seat: 2 } };
  expect(channel.receive(action)).toEqual(action);
  expect(channel.receive({ ...action, data: { control: 'teams-switch' } })).toBeNull();
  expect(channel.receive({ ...action, data: { control: 'console-quit' } })).toBeNull();
  expect(channel.receive({ ...action, viewRev: 9 })).toBeNull();
});

it('PLAT-011 roster views preserve the current game action revision', () => {
  const channel = viewChannel(); const sent: HostMessage[] = []; const revisionSpaces: (boolean | undefined)[] = [];
  const send = (message: HostMessage, revisioned?: boolean) => { sent.push(message); revisionSpaces.push(revisioned); return true; };
  channel.send({ v: 1, t: 'view', rev: 7, view: { kind: 'game' } }, send);
  channel.send({ v: 1, t: 'view', rev: 99, view: { kind: 'room-players', players: [] } }, send);
  expect(sent[1]).toMatchObject({ rev: 99 });
  expect(revisionSpaces).toEqual([undefined, false]);
  expect(channel.receive({ v: 1, t: 'action', rev: 0, viewRev: 0, data: { control: 'play' } })).toMatchObject({ viewRev: 7 });
});
