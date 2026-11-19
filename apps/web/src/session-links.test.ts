import { expect, it, vi } from 'vitest';
import type { SessionTransportEvent } from '@kaki/platform';
import { applyPhoneEvent, createRoom } from '@kaki/platform';
import { createInputBuffer } from '@kaki/sim-core';
import type { HostInput } from '@kaki/netcode';
import type { SessionPeer } from './session-links';
import { sessionLinks } from './session-links';
it('C-16 uses authenticated links for control output, revisions, taps and binary inputs (NET-001)', () => {
  const links = sessionLinks();
  const room = applyPhoneEvent(createRoom(), { deviceId: 'd', connectionId: 'a' }, { type: 'join', name: 'Fern', seatToken: '1'.repeat(32) }, 0).state;
  const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 });
  let input: HostInput | undefined;
  const sendHost = vi.fn<SessionPeer['sendHost']>(() => true); const receive = vi.fn();
  links.peer('a', { sendHost, bindInput(next) { input = next; } }); links.setup(room, buffer);
  const unsubscribe = links.transport.subscribe(receive);
  expect(input?.receiveInput({ seq: 0, stickX: 0, stickY: 0, tilt: null, buttons: 16, history: [] })).toBe(true);
  expect(buffer.sample().get('seat-1')?.pressed).toBe(16);
  links.transport.sendLayout('a', { revision: 2, controls: [] });
  links.transport.sendPrivateView('a', { revision: 3, blocks: [] });
  expect(sendHost.mock.calls.map(([m]) => m)).toEqual([
    { v: 1, t: 'layout', rev: 0, layout: { revision: 0, controls: [] } },
    { v: 1, t: 'view', rev: 0, view: { revision: 0, blocks: [] } },
  ]);
  const action = { v: 1, t: 'action', rev: 0, viewRev: 0, data: { control: 'answer', value: 1 } };
  links.control('stranger', action); links.control('a', { ...action, viewRev: 2 }); expect(receive).not.toHaveBeenCalled();
  links.control('a', action); expect(receive).toHaveBeenLastCalledWith({ type: 'tap', connectionId: 'a', action: { revision: 2, control: 'answer', value: 1 } });
  links.dropped('a'); expect(receive).toHaveBeenLastCalledWith({ type: 'connection', connectionId: 'a', connected: false });
  expect(input?.receiveInput({ seq: 1, stickX: 0, stickY: 0, tilt: null, buttons: 16, history: [] })).toBe(false);
  unsubscribe(); links.stop();
});

it('per-phone view counters increment by one across clears, retries and game revisions', () => {
  const links = sessionLinks();
  const room = applyPhoneEvent(createRoom(), { deviceId: 'd', connectionId: 'a' }, { type: 'join', name: 'Fern', seatToken: '1'.repeat(32) }, 0).state;
  const sendHost = vi.fn<SessionPeer['sendHost']>(() => true); const receive = vi.fn();
  links.peer('a', { sendHost, bindInput() { /* No controller in this test. */ } });
  links.setup(room, createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 }));
  const unsubscribe = links.transport.subscribe(receive);
  links.transport.sendLayout('a', { revision: 0, controls: [] });
  links.transport.sendPrivateView('a', { revision: 99, blocks: [] });
  links.transport.sendPrivateView('a', null);
  links.control('a', { v: 1, t: 'action', rev: 0, viewRev: 1, data: { control: 'skip' } });
  expect(receive).toHaveBeenCalledOnce();
  sendHost.mockReturnValueOnce(false); links.transport.sendPrivateView('a', { revision: 400, blocks: [] });
  links.transport.sendPrivateView('a', { revision: 400, blocks: [] });
  unsubscribe(); links.transport.subscribe(receive); links.transport.sendPrivateView('a', null);
  expect(sendHost.mock.calls.map(([message]) => message.t === 'view' ? message.rev : -1)).toEqual([-1, 0, 1, 2, 2, 3]);
  links.stop();
});
it('bind rejects disconnected and nonmember peers; control rejects a stranger with a valid viewRev', () => {
  const links = sessionLinks();
  const room = applyPhoneEvent(createRoom(), { deviceId: 'd', connectionId: 'a' }, { type: 'join', name: 'Fern', seatToken: '1'.repeat(32) }, 0).state;
  const buffer = createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 });
  const bind = vi.fn(); const stranger = vi.fn(); const receive = vi.fn(); let bound: HostInput | undefined;
  links.peer('a', { sendHost: () => true, bindInput(next) { bound = next; bind(); } });
  links.peer('stranger', { sendHost: () => true, bindInput: stranger });
  links.setup({ ...room, players: room.players.map(p => ({ ...p, disconnectedAt: 10 })) }, buffer);
  links.transport.subscribe(receive); expect(bind).not.toHaveBeenCalled(); expect(stranger).not.toHaveBeenCalled();
  links.updateRoom(room); expect(bind).toHaveBeenCalledOnce();
  links.transport.sendPrivateView('stranger', null);
  links.control('stranger', { v: 1, t: 'action', rev: 0, viewRev: 0, data: { control: 'answer', value: 1 } });
  expect(receive).not.toHaveBeenCalled();
  links.updateRoom({ ...room, players: [] });
  expect(bound?.receiveInput({ seq: 1, stickX: 0, stickY: 0, tilt: null, buttons: 16, history: [] })).toBe(false);
  links.stop();
});

it('PLAT-022 start, results, picker, start again deliver fresh layout revisions on the same phones', () => {
  const links = sessionLinks();
  let room = createRoom();
  for (const id of ['a', 'b']) room = applyPhoneEvent(room, { deviceId: id, connectionId: id }, { type: 'join', name: id, seatToken: id.repeat(32) }, 0).state;
  const delivered = new Map<string, number[]>();
  for (const id of ['a', 'b']) {
    delivered.set(id, []);
    links.peer(id, { bindInput() { /* No binary inputs in this case. */ }, sendHost(message) {
      if (message.t === 'layout') {
        const revisions = delivered.get(id);
        if (!revisions) throw new Error('Missing phone');
        if (message.rev <= (revisions.at(-1) ?? -1)) return false;
        revisions.push(message.rev);
      }
      return true;
    } });
  }
  links.setup(room, createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 }));
  let unsubscribe = links.transport.subscribe(() => undefined);
  for (const id of ['a', 'b']) links.transport.sendLayout(id, { revision: 1, controls: [] });
  links.updateRoom({ ...room, phase: 'results' }); unsubscribe();
  links.updateRoom({ ...room, phase: 'lobby' });
  const receive = vi.fn(); unsubscribe = links.transport.subscribe(receive);
  for (const id of ['a', 'b']) {
    links.transport.sendPrivateView(id, null);
    expect(links.transport.sendLayout(id, { revision: 1, controls: [] })).toBe(true);
    links.control(id, { v: 1, t: 'action', rev: 0, viewRev: 0, data: { control: 'answer' } });
    links.control(id, { v: 1, t: 'action', rev: 1, viewRev: 0, data: { control: 'answer' } });
    expect(delivered.get(id)).toEqual([0, 1]);
  }
  expect(receive).toHaveBeenCalledTimes(2);
  expect(receive).toHaveBeenCalledWith({ type: 'tap', connectionId: 'a', action: { control: 'answer', revision: 1 } });
  unsubscribe(); links.stop();
});

it('PLAT-022 failed layout sends do not count and drop restarts the counter', () => {
  const links = sessionLinks(); const sendHost = vi.fn<SessionPeer['sendHost']>(() => true);
  const peer = { sendHost, bindInput() { /* No binary input in this test. */ } }; links.peer('a', peer);
  const layout = { revision: 42, controls: [] };
  sendHost.mockReturnValueOnce(false);
  expect(links.transport.sendLayout('a', layout)).toBe(false);
  expect(links.transport.sendLayout('a', layout)).toBe(true);
  links.transport.sendLayout('a', layout); links.dropped('a'); links.peer('a', peer); links.transport.sendLayout('a', layout);
  expect(sendHost.mock.calls.map(([message]) => message)).toMatchObject([{ rev: 0, layout: { revision: 0 } }, { rev: 0, layout: { revision: 0 } }, { rev: 1, layout: { revision: 1 } }, { rev: 0, layout: { revision: 0 } }]);
  links.stop();
});

it('CTRL-009 local controls use the phone layout, view and scalar validation', () => {
  const links = sessionLinks();
  const room = applyPhoneEvent(createRoom(), { deviceId: 'tv', connectionId: 'tv' }, { type: 'join', name: 'TV', seatToken: '1'.repeat(32) }, 0).state;
  let send: ((message: unknown) => void) | undefined;
  links.peer('tv', { sendHost: () => true, bindInput() { /* No binary inputs. */ }, bindControl(next) { send = message => { next(message as Parameters<typeof next>[0]); }; } });
  links.setup(room, createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 }));
  const receive = vi.fn<(event: SessionTransportEvent) => void>(); links.transport.subscribe(receive);
  links.transport.sendLayout('tv', { revision: 7, controls: [] });
  links.transport.sendPrivateView('tv', null);
  const action = { v: 1, t: 'action', rev: 0, viewRev: 0, data: { control: 'ready', value: 'ready' } };
  send?.({ ...action, rev: 7 });
  send?.({ ...action, viewRev: 1 });
  for (const value of [true, null, {}, []]) send?.({ ...action, data: { control: 'ready', value } });
  expect(receive).not.toHaveBeenCalled();
  for (const value of ['ready', 1]) send?.({ ...action, data: { control: 'ready', value } });
  expect(receive.mock.calls.map(([event]) => event.type === 'tap' ? event.action : null)).toEqual([
    { control: 'ready', revision: 7, value: 'ready' }, { control: 'ready', revision: 7, value: 1 },
  ]);
  links.stop(); send?.(action); expect(receive).toHaveBeenCalledTimes(2);
});
