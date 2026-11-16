import { PLAYER_COLOURS } from '@kaki/ui';
import { expect, it } from 'vitest';
import { createHostTransport, createPhoneTransport } from '@kaki/netcode';
import { createPhoneSeatStore } from '@kaki/platform';
import { Clock, MemoryStorage, CODE, SECRET, SignalRoom, PeerHub, settle } from '../../../packages/platform/src/reconnect/testing.fixture';
import { createHost } from './host';
import { createPhone } from './phone';
import { lobbyView } from './view-model';
import type { LobbyView } from './view-model';
import type { PhoneView, PhoneDependencies } from './phone';

it.each(['room-not-found', 'room-expired', 'not-allowed'])('PLAT-002/003/004/007/009/010: live signalling %s, rename and unattended resume (probes A/B)', async reason => {
  const clock = new Clock(); const signal = new SignalRoom(clock); const hub = new PeerHub(clock);
  let offline = false;
  const socket: typeof signal.socket = (url, protocols) => {
    if (offline) throw new Error('Pairing server offline');
    return signal.socket(url, protocols);
  };
  const hostFrames: LobbyView[] = [];
  const dialTimes: number[][] = [];
  const hostStorage = new MemoryStorage();
  let hostView: LobbyView | undefined;
  function makeHost() {
    return createHost({ clock, storage: hostStorage, mintToken: () => `seat-${String(++serial).padStart(27, '0')}`,
      async dial(credentials, callbacks, register) {
        const transport = await createHostTransport({ baseUrl: 'https://signal', clock, socket, factory: hub.factory,
          ...(credentials ? { credentials } : {}), fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ code: CODE, hostToken: SECRET }) }),
          onRoom: () => undefined, onPeer: (id, peer) => { callbacks.peer(id, peer); },
          onControl: (message, _identity, id) => { callbacks.control(id, message); },
          onPairingState: state => {
            if (state === 'reconnecting') callbacks.state('reconnecting');
            if (state === 'connected') callbacks.state('ready');
          },
          onState: (state, id) => { if (state === 'closed') callbacks.dropped(id); }, onLink: (quality, id) => { callbacks.quality(id, quality); }, onError: () => undefined,
        });
        register(() => { transport.stop(); });
        return { ...transport, reopened: Boolean(credentials) };
      },
    }, input => { hostView = lobbyView({ ...input, origin: 'https://arcade' }, clock); hostFrames.push(hostView); });
  }
  let serial = 0; let host = makeHost(); await host.start(); await settle(clock);
  const stores: MemoryStorage[] = []; const views: PhoneView[] = []; const phones: ReturnType<typeof createPhone>[] = [];
  function makePhone(index: number) {
    const storage = stores[index] ?? new MemoryStorage(); stores[index] = storage;
    const deps: PhoneDependencies = { clock, storage, dial(options, feedback) {
      (dialTimes[index] ??= []).push(clock.now());
      return createPhoneTransport({ ...options, externalRetry: true,
        upgradeStatus: () => { feedback.unreachable(); return Promise.reject(new Error('offline')); },
        baseUrl: 'https://signal', clock, socket, factory: hub.factory,
        onControl: message => { options.onControl(message); }, onLink: () => undefined,
        onSignal: message => { if (message.t === 'host') options.onHost(message.present); },
      });
    } };
    return createPhone(deps, null, view => { views[index] = view; });
  }
  for (let index = 0; index < 9; index++) {
    const phone = makePhone(index); phones.push(phone); phone.join(CODE, index === 1 ? 'Player 1' : index === 2 ? 'fuck' : `Player ${String(index + 1)}`); await settle(clock);
  }
  const firstOccupied = hostFrames.find(frame => frame.seats[0]?.occupied)?.seats[0];
  expect(firstOccupied).toEqual({
    dimmed: false, held: false, holdSeconds: null, number: 1, colour: PLAYER_COLOURS[0].colour,
    name: 'Player 1', occupied: true, leader: true, connection: 'Connected', icon: '',
  });
  expect(views[0]).toMatchObject({ state: 'lobby', seat: 1, leader: true });
  expect(views[1]).toMatchObject({ state: 'name-taken', name: 'Player 1 2' });
  expect(views[2]).toMatchObject({ state: 'name-replaced', name: 'Player 3' });
  expect(views[7]).toMatchObject({ state: 'lobby', seat: 8 });
  expect(views[8]?.title).toBe('This room is full');
  // D-095 f: the real transport must preserve RTC, storage and presentation.
  const beforeRefusals = views.map(view => ({ ...view }));
  for (const socket of [...signal.live.values()].slice(1)) socket.onmessage?.({ data: JSON.stringify({ v: 1, t: 'error', code: reason, retryAfterS: null }) });
  await settle(clock); expect(views).toEqual(beforeRefusals);
  const previousDials = dialTimes[3]?.length;
  phones[3]?.changeName(); phones[3]?.join('BCDF2346', 'Dora');
  phones[3]?.saveName('Dora'); await settle(clock);
  expect(dialTimes[3]).toHaveLength(previousDials ?? 0);
  expect(hostView?.seats[3]).toMatchObject({ name: 'Dora', held: false });
  clock.advance(1000); await settle(clock);
  expect(hostView?.seats[0]).toMatchObject({ occupied: true, name: 'Player 1', connection: 'Good' });
  // Drop signalling only: the browser uses externalRetry, unlike the original simulation.
  const beforeOutage = views.map(view => ({ ...view }));
  offline = true;
  // Host signalling disappears first, so phones receive host-absent while RTC is healthy.
  const sockets = [...signal.live.values()];
  sockets[0]?.close(); await settle(clock);
  expect(views).toEqual(beforeOutage);
  for (const socket of sockets.slice(1)) socket.close();
  await settle(clock);
  const channels = [...hub.pcs.values()].flatMap(pc => pc.channels).filter(channel => channel.readyState === 'open');
  expect(channels).toHaveLength(32);
  expect(hostView?.pairing).toBe('reconnecting');
  for (let second = 0; second < 120; second++) { clock.advance(1000); await settle(clock); }
  expect(views).toEqual(beforeOutage);
  expect(channels.every(channel => channel.readyState === 'open')).toBe(true);
  expect(hostView?.seats.every(seat => seat.occupied && !seat.held)).toBe(true);
  phones[0]?.changeName(); phones[0]?.saveName('Randy'); await settle(clock);
  expect(hostView?.seats[0]).toEqual({ ...firstOccupied, name: 'Randy', connection: 'Good', icon: 'good' });
  expect(hostFrames.filter(frame => frame.seats[0]?.name === 'Randy').every(frame => frame.seats[0]?.occupied)).toBe(true);

  // Lose one real channel during the outage; only its seat is held.
  const droppedAt = clock.now();
  channels[0]?.close(); await settle(clock);
  expect(hostView?.seats.filter(seat => seat.held).map(seat => seat.number)).toEqual([1]);
  expect(views[0]?.state).toBe('host-disconnected');
  for (let tick = 0; tick < 248; tick++) { clock.advance(250); await settle(clock); }
  expect(views[0]?.state).toBe('unreachable');
  expect(dialTimes[0]?.filter(time => time > droppedAt).map(time => time - droppedAt)).toEqual([1000, 3000, 7000, 15000, 31000, 61000]);
  expect(hostView?.seats.filter(seat => seat.held).map(seat => seat.number)).toEqual([1]);
  expect(views.slice(1, 8).map(view => ({ ...view, leader: false }))).toEqual(beforeOutage.slice(1, 8));
  expect(views[1]?.leader).toBe(true); // Normal leader grace elapsed after the real channel loss.
  offline = false;
  for (let second = 0; second < 40; second++) { clock.advance(1000); await settle(clock); }
  expect(views[0]).toMatchObject({ state: 'lobby', seat: 1, name: 'Randy' });
  expect(hostView?.seats.filter(seat => seat.held)).toHaveLength(0);
  const store = stores[0]; if (!store) throw new Error('Missing store');
  const secret = createPhoneSeatStore(store).read()?.seatToken;
  expect(secret).toBeTruthy(); expect(JSON.stringify(views)).not.toContain(secret);
  phones[0]?.stop(); await settle(clock); phones[0] = makePhone(0); await settle(clock);
  expect(views[0]).toMatchObject({ state: 'lobby', seat: 1, name: 'Randy' });
  // Probe C: an open rename must yield to channel loss, and never send Ghost.
  phones[0].changeName(); expect(views[0]?.renaming).toBe(true);
  host.stop(); await settle(clock);
  expect(views[0]).toMatchObject({ state: 'host-disconnected', renaming: false, connected: false });
  phones[0].saveName('Ghost'); await settle(clock);
  host = makeHost(); await host.start(); await settle(clock);
  for (let i = 0; i < 3; i++) { clock.advance(1000); await settle(clock); }
  expect(views[0]).toMatchObject({ state: 'lobby', seat: 1, name: 'Randy' });
  expect(views[0]?.renaming).toBe(false);
  expect(hostView?.seats[0]?.name).toBe('Randy');
  for (const phone of phones) phone.stop(); host.stop();
});
