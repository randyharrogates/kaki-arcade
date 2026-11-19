import { expect, it } from 'vitest';
import { createHostTransport, createPhoneTransport } from '@kaki/netcode';
import { Clock, MemoryStorage, CODE, SECRET, SignalRoom, PeerHub, settle } from '../../../packages/platform/src/reconnect/testing.fixture';
import { createHost } from './host';
import { localPlayer } from './local-player';
import { createPhone } from './phone';
import type { PhoneMessage } from '@kaki/protocol';
import { viewChannel } from './view-channel';
import type { PhoneView, PhoneDependencies } from './phone';

it('PLAT-011: real app wiring removes by TV then leader and refuses reload and fresh hello', async () => {
  const clock = new Clock(); const signal = new SignalRoom(clock); const hub = new PeerHub(clock);
  const socket = signal.socket;
  const channels = new Map<string, ReturnType<typeof viewChannel>>();
  const phonePeers = new Map<number, { sendPhone(message: PhoneMessage): boolean }>();
  const hostStorage = new MemoryStorage();
  function makeHost() {
    return createHost({ clock, storage: hostStorage, mintToken: () => `seat-${String(++serial).padStart(27, '0')}`,
      async dial(credentials, callbacks, register) {
        const transport = await createHostTransport({ baseUrl: 'https://signal', clock, socket, factory: hub.factory,
          ...(credentials ? { credentials } : {}), fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ code: CODE, hostToken: SECRET }) }),
          onRoom: () => undefined, onPeer: (id, peer) => {
            const channel = viewChannel(); channels.set(id, channel);
            const wrapped = { ...peer, sendHost: (message: Parameters<typeof peer.sendHost>[0]) => channel.send(message, (next, revisioned) => peer.sendHost(next, revisioned)) };
            callbacks.peer(id, wrapped);
          },
          onControl: (message, _identity, id) => { callbacks.control(id, channels.get(id)?.receive(message) ?? null); },
          onPairingState: state => {
            if (state === 'reconnecting') callbacks.state('reconnecting');
            if (state === 'connected') callbacks.state('ready');
          },
          onState: (state, id) => { if (state === 'closed') callbacks.dropped(id); }, onLink: (quality, id) => { callbacks.quality(id, quality); }, onError: () => undefined,
        });
        register(() => { transport.stop(); });
        return { ...transport, reopened: Boolean(credentials) };
      },
    }, () => undefined);
  }
  let serial = 0; const host = makeHost(); await host.start(); await settle(clock);
  const stores: MemoryStorage[] = []; const views: PhoneView[] = []; const phones: ReturnType<typeof createPhone>[] = [];
  function makePhone(index: number) {
    const storage = stores[index] ?? new MemoryStorage(); stores[index] = storage;
    const deps: PhoneDependencies = { browserId: `browser-${String(index).padStart(24, '0')}`, clock, storage, dial(options, feedback) {
      return createPhoneTransport({ ...options, externalRetry: true,
        upgradeStatus: () => { feedback.unreachable(); return Promise.reject(new Error('offline')); },
        baseUrl: 'https://signal', clock, socket, factory: hub.factory,
        onPeer: peer => { phonePeers.set(index, peer); options.onPeer(peer); },
        onControl: message => { options.onControl(message); }, onLink: () => undefined,
        onSignal: message => { if (message.t === 'host') options.onHost(message.present); },
      });
    } };
    return createPhone(deps, null, view => { views[index] = view; });
  }
  try {
    for (let index = 0; index < 3; index++) {
      const phone = makePhone(index); phones.push(phone);
      phone.join(CODE, ['Fern', 'Moss', 'Cloud'][index] ?? 'Player'); await settle(clock);
    }
    expect(views.map(view => view.state)).toEqual(['lobby', 'lobby', 'lobby']);
    phones[1]?.removePlayer(1); await settle(clock);
    expect(host.room.players).toHaveLength(3);
    // A forged action also reaches the host's room authority and is ignored.
    phonePeers.get(1)?.sendPhone({ v: 1, t: 'action', rev: 0, viewRev: null, data: { control: 'remove-player', seat: 1 } });
    await settle(clock); expect(host.room.players).toHaveLength(3);
    host.removePlayer(3); await settle(clock);
    expect(views[2]?.state).toBe('removed');
    expect(host.room.players.map(player => player.seat)).toEqual([1, 2]);
    expect(views[0]).toMatchObject({ leader: true, players: [{ seat: 1, name: 'Fern' }, { seat: 2, name: 'Moss' }] });
    phones[0]?.pickerInput('open'); await settle(clock);
    clock.advance(1000); phones[0]?.pickerInput('previous'); await settle(clock);
    clock.advance(1000); phones[0]?.pickerInput('select'); await settle(clock);
    expect(host.teamSetup?.screen).toBe('choice');
    host.joinLocal(localPlayer()); await settle(clock);
    expect(views[0]?.players?.map(player => player.seat)).toEqual([1, 2]);
    host.leaveLocal(); await settle(clock);
    const enabled = host.teamSetup?.enabled;
    phones[0]?.teamInput('teams-toggle'); await settle(clock);
    expect(host.teamSetup?.enabled).toBe(!enabled);
    phones[0]?.removePlayer(2); await settle(clock);
    expect(views[1]?.state).toBe('removed');
    expect(host.room.players.map(player => player.seat)).toEqual([1]);
    for (const index of [1, 2]) {
      phones[index]?.stop(); phones[index] = makePhone(index); await settle(clock);
      expect(views[index]?.state).toBe('removed');
      phones[index].stop(); stores[index] = new MemoryStorage();
      phones[index] = makePhone(index); phones[index].join(CODE, 'Return'); await settle(clock);
      expect(views[index]?.state).toBe('removed');
    }
  } finally { for (const phone of phones) phone.stop(); host.stop(); }
});
