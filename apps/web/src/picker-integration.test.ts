import { expect, it, vi } from 'vitest';
import { createHostTransport, createPhoneTransport } from '@kaki/netcode';
import { Clock, MemoryStorage, CODE, SECRET, SignalRoom, PeerHub, settle } from '../../../packages/platform/src/reconnect/testing.fixture';
import { createHost } from './host';
import { createPhone } from './phone';
import type { PhoneView } from './phone';
import type { PickerInput } from '@kaki/protocol';

it('PLAT-020/021/006/009 real host and two phones pick, watch, back, start, hand over, leave and reload', async () => {
  const clock = new Clock(); const signal = new SignalRoom(clock); const hub = new PeerHub(clock);
  const storage = new MemoryStorage(); let serial = 0;
  const session = { start: vi.fn(() => Promise.resolve()), updateRoom: vi.fn(), stop: vi.fn() };
  function makeHost() {
    return createHost({ clock, storage, session, mintToken: () => `seat-${String(++serial).padStart(27, '0')}`,
      async dial(credentials, callbacks, register) {
        const transport = await createHostTransport({ baseUrl: 'https://signal', clock, socket: signal.socket, factory: hub.factory,
          ...(credentials ? { credentials } : {}), fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ code: CODE, hostToken: SECRET }) }),
          onRoom: () => undefined, onPeer: (id, peer) => { callbacks.peer(id, peer); },
          onControl: (message, _identity, id) => { callbacks.control(id, message); },
          onPairingState: () => undefined,
          onState: (state, id) => { if (state === 'closed') callbacks.dropped(id); }, onLink: () => undefined, onError: () => undefined,
        });
        register(() => { transport.stop(); });
        return { ...transport, reopened: Boolean(credentials) };
      },
    }, () => undefined);
  }
  let host = makeHost(); await host.start(); await settle(clock);
  const views: PhoneView[] = [];
  const phoneStorage = [new MemoryStorage(), new MemoryStorage()];
  const makePhone = (index: number) => createPhone({ clock, storage: phoneStorage[index] ?? new MemoryStorage(), dial(options) {
    return createPhoneTransport({ ...options, externalRetry: true, baseUrl: 'https://signal', clock, socket: signal.socket, factory: hub.factory,
      onControl: message => { options.onControl(message); }, onLink: () => undefined,
      onSignal: message => { if (message.t === 'host') options.onHost(message.present); },
    });
  } }, null, view => { views[index] = view; });
  const phones = [makePhone(0), makePhone(1)];
  const reloadLeader = async () => {
    const screen = host.picker.screen;
    phones[0]?.stop(); await settle(clock); phones[0] = makePhone(0); await settle(clock);
    expect(views[0]?.picker?.screen).toBe(screen); expect(views[0]?.leader).toBe(true);
  };
  for (const [index, phone] of phones.entries()) { phone.join(CODE, `Player ${String(index + 1)}`); await settle(clock); }
  expect(views.slice(0, 2).map(view => view.leader)).toEqual([true, false]);
  expect(views[0]?.picker?.screen).toBe('lobby');
  const act = async (input: PickerInput, index = 0) => { clock.advance(150); phones[index]?.pickerInput(input); await settle(clock); };
  await act('open', 1); expect(host.picker.screen).toBe('lobby');
  await act('open'); expect(host.picker.screen).toBe('picker');
  await reloadLeader();
  const revision = host.picker.revision;
  phones[1]?.changeName(); phones[1]?.saveName('New Player'); await settle(clock);
  expect(host.picker.revision).toBe(revision);
  const extra = makePhone(2); extra.join(CODE, 'Third'); await settle(clock);
  expect(host.room.players).toHaveLength(3); expect(views[2]?.picker?.screen).toBe('picker');
  extra.leave(); extra.stop(); await settle(clock);
  const first = host.picker.focus;
  await act('next'); expect(host.picker.focus).not.toBe(first);
  expect(views[1]?.picker?.game?.id).toBe(host.picker.focus);
  expect(views[1]?.picker?.leaderName).toBe('Player 1');
  await act('select'); expect(host.picker.screen).toBe('start'); await reloadLeader();
  await act('back'); expect(host.picker.screen).toBe('picker');
  await act('select'); await act('start'); expect(host.picker.screen).toBe('starting');
  expect(session.start).toHaveBeenCalledTimes(1);
  expect(session.start).toHaveBeenLastCalledWith(host.picker.focus, expect.objectContaining({ players: host.room.players, phase: 'lobby' }), undefined, expect.any(Function));
  expect(host.room.phase).toBe('playing');
  await reloadLeader();
  await act('start'); expect(session.start).toHaveBeenCalledTimes(1);
  host.sessionEvent({ type: 'results', results: { mode: 'players', players: [] } });
  host.returnToPicker(); await settle(clock);
  // Real departure transfers authority; the departed phone cannot select.
  phones[0]?.leave(); await settle(clock);
  expect(views.slice(0, 2).map(view => view.leader)).toEqual([false, true]);
  const before = host.picker;
  const oldLeader = host.room.players.find(p => p.seat === 1);
  host.leaderInput(oldLeader?.connectionId ?? '', 'select'); expect(host.picker).toBe(before);
  await act('previous', 1); expect(host.picker.focus).not.toBe(before.focus);
  phones[0]?.join(CODE, 'Player 1'); await settle(clock);
  phones[1]?.leave(); await settle(clock);
  expect(views[0]?.leader).toBe(true); expect(views[0]?.picker?.leaderName).toBe('Player 1');
  await act('select'); expect(host.picker.screen).toBe('start');
  host.stop(); await settle(clock); host = makeHost(); await host.start(); await settle(clock);
  expect(host.picker.screen).toBe('lobby'); expect(host.room.players).toHaveLength(1);
  for (let second = 0; second < 3; second++) { clock.advance(1000); await settle(clock); }
  expect(views[0]?.picker?.screen).toBe('lobby');
  expect(JSON.stringify(views)).not.toContain('seatToken');
  for (const phone of phones) phone.stop(); host.stop();
});
