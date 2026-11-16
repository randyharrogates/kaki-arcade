import { expect, it } from 'vitest';
import { createPhonePairing } from '@kaki/netcode';
import { createPhoneReconnect, createPhoneSeatStore } from '@kaki/platform';
import { Clock, CODE, MemoryStorage, SECRET, SimSocket, settle } from './testing.fixture';
it.each([404, 410])('PLAT-009 phone rejoin stops after an unknown-room probe %s', async status => {
  const clock = new Clock(); const store = createPhoneSeatStore(new MemoryStorage());
  store.write({ code: CODE, seatToken: SECRET, nickname: 'Guest', roomToken: null, droppedAt: null });
  let sockets = 0; let probes = 0;
  const driver = createPhoneReconnect({ clock, store, state: () => undefined,
    dial(options) {
      return createPhonePairing({ ...options, clock, baseUrl: 'https://signal',
        onMessage: () => undefined,
        upgradeStatus: () => { probes++; return Promise.resolve({ status, gone: true }); },
        socket: () => {
          sockets++;
          const socket = new SimSocket(() => undefined, () => undefined);
          clock.schedule(() => socket.onerror?.(), 0);
          return socket;
        },
      });
    },
  });
  await settle(clock);
  clock.advance(60000); await settle(clock); driver.wake();
  expect(driver.state).toBe('room-gone');
  expect(store.read()).toBeNull();
  expect(sockets).toBe(1); expect(probes).toBe(1);
  driver.stop();
});

it.each([404, 410, 503])('PLAT-009 phone retains a saved seat on unsigned probe %s', async status => {
  const clock = new Clock(); const store = createPhoneSeatStore(new MemoryStorage());
  store.write({ code: CODE, seatToken: SECRET, nickname: 'Guest', roomToken: null, droppedAt: null });
  const driver = createPhoneReconnect({ clock, store, state: () => undefined,
    dial(options) {
      return createPhonePairing({ ...options, clock, baseUrl: 'https://signal', onMessage: () => undefined,
        upgradeStatus: () => Promise.resolve({ status }),
        socket: () => {
          const socket = new SimSocket(() => undefined, () => undefined);
          clock.schedule(() => socket.onerror?.(), 0); return socket;
        },
      });
    },
  });
  for (let second = 0; second < 60; second++) { clock.advance(1000); await settle(clock); }
  expect(driver.state).not.toBe('room-gone');
  expect(store.read()?.seatToken).toBe(SECRET);
  driver.stop();
});
