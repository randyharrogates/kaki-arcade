// Test-only structural adapter: platform's runtime has no netcode import/dependency.
import { expect, it } from 'vitest';
import type { Peer } from '../../../netcode/src/peer';
import { createHostInput } from '../../../netcode/src/input-receiver';
import type { HostInput } from '../../../netcode/src/input-receiver';
import type { HostMessage, Json } from '@kaki/protocol';
import { createInputBuffer } from '@kaki/sim-core';
import { createSession } from './index';
import { fixture } from './session.fixture';
import { createRoom, applyPhoneEvent } from '../room/room';
import { EMPTY_SETUP, STEP_MS } from '../game';
import type { SessionTransport } from './index';

function adapter(peer: Pick<Peer, 'sendHost'>, receiver: HostInput): SessionTransport {
  let viewRevision = 0;
  return {
    sendLayout(_connection, layout) { return peer.sendHost({ v: 1, t: 'layout', rev: layout.revision, layout: layout as unknown as Json }); },
    sendPrivateView(_connection, view) { return peer.sendHost({ v: 1, t: 'view', rev: viewRevision++, view: view as unknown as Json }); },
    fence(_connection, sequence) { if (sequence === null) receiver.pause(); else receiver.acknowledgeResume(sequence); },
    status() { /* Shell supplies room-state and pending wire acknowledgement. */ },
    subscribe() { return () => { /* Shell owns callbacks. */ }; },
  };
}
it('NET-001 PLAT-023 netcode peer and resume-fence types fit; delayed history cannot cross barrier', () => {
  const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15 });
  const input = createHostInput(buffer, 'seat-1');
  const sent: HostMessage[] = [];
  const transport = adapter({ sendHost(message) { sent.push(message); return true; } }, input);
  transport.sendLayout('c1', { revision: 0, controls: [] }); transport.sendPrivateView('c1', null);
  expect(sent.map(s => s.t)).toEqual(['layout', 'view']);
  transport.fence('c1', null);
  const packet = { seq: 9, stickX: 0, stickY: 0, tilt: null, buttons: 1, history: [] };
  expect(input.receiveInput(packet)).toBe(false);
  transport.fence('c1', 10);
  expect(input.receiveInput(packet)).toBe(false);
  expect(input.receiveInput({ ...packet, seq: 10, buttons: 0 })).toBe(true);
  expect(buffer.sample().get('seat-1')?.pressed).toBe(0);
});

it('NET-001 real host receiver adapter runs a session without a resume acknowledgement', () => {
  const room = applyPhoneEvent(createRoom(), { deviceId: 'd1', connectionId: 'c1' },
    { type: 'join', name: 'Guest', seatToken: '1'.repeat(32) }, 0).state;
  const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15 });
  const input = createHostInput(buffer, 'seat-1');
  const transport = adapter({ sendHost() { return true; } }, input);
  const session = createSession({ game: fixture, settings: { steps: 30 }, seed: 1, room, context: EMPTY_SETUP, buffer, transport,
    publicView() { /* TV */ }, event() { /* Shell */ } });
  session.pause('seat-1'); session.resume('seat-1');
  expect(input.receiveInput({ seq: 0, stickX: 0, stickY: 0, tilt: null, buttons: 1, history: [] })).toBe(true);
  session.advance(STEP_MS);
  expect(session.state?.presses).toBe(1);
});
