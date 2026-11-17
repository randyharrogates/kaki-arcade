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
