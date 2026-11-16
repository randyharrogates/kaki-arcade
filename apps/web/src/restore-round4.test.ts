import { afterEach, expect, it, vi } from 'vitest';
import { createHostSnapshotStore, createRoom, HOST_STORAGE_KEY } from '@kaki/platform';
import { Clock, MemoryStorage, CODE, SECRET, SimSocket, settle } from './testing.fixture';
import { browserDependencies } from './browser';
import { createHost } from './host';
import { lobbyView } from './view-model';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each([404, 410, 0, 'network', 429, 'bare404', 503] as const)('restore probe %s has one retry owner (PLAT-009)', async status => {
  const clock = new Clock();
  const storage = new MemoryStorage();
  createHostSnapshotStore({ storage, clock, validateSelection: () => false }).write({
    credentials: { code: CODE, hostToken: SECRET }, createdAt: clock.now(),
    room: createRoom(), scores: {}, results: [], selection: null,
  });
  const listeners = new Set<() => void>();
  const online = (): void => { for (const callback of [...listeners]) callback(); };
  vi.spyOn(Date, 'now').mockImplementation(() => clock.now());
  vi.stubGlobal('window', {
    location: { origin: 'http://localhost:5150' }, sessionStorage: storage,
    setTimeout: (cb: () => void, ms: number) => clock.schedule(cb, ms),
    clearTimeout: (id: number) => { clock.cancel(id); },
    addEventListener: (_event: string, cb: () => void) => { listeners.add(cb); },
    removeEventListener: (_event: string, cb: () => void) => { listeners.delete(cb); },
  });
  let opens = 0;
  const openedAt: number[] = [];
  const probes = vi.fn(() => status === 'network' ? Promise.reject(new TypeError('offline')) :
    Promise.resolve({ status: status === 'bare404' ? 404 : status, headers: new Headers({ 'Retry-After': '120', ...(status === 'bare404' ? {} : { 'X-Kaki-Room': 'gone' }) }) }));
  vi.stubGlobal('fetch', probes);
  vi.stubGlobal('WebSocket', class extends SimSocket {
    constructor() {
      super(() => undefined, () => undefined);
      opens++; openedAt.push(clock.now());
      clock.schedule(() => {
        const error = this.onerror; const close = this.onclose;
        error?.(); close?.(); // Browsers report both for a refused upgrade.
      }, 0);
    }
  });
  let view: ReturnType<typeof lobbyView> | undefined;
  const deps = browserDependencies('http://localhost:5151');
  // Lifecycle is unrelated to this transport regression.
  delete deps.lifecycle;
  const host = createHost(deps, input => { view = lobbyView({ ...input, origin: 'http://localhost:5150' }); });
  void host.start();
  await settle(clock);
  if (status === 404 || status === 410) {
    expect(view).toMatchObject({ pairing: 'expired' });
    expect(JSON.stringify(view)).toContain('This room has expired');
    expect(view?.newRoom).toBe(true);
    expect(storage.getItem(HOST_STORAGE_KEY)).toBeNull();
    online();
  } else {
    expect(view).toMatchObject({ pairing: 'unreachable' });
    expect(storage.getItem(HOST_STORAGE_KEY)).not.toBeNull();
  }
  for (let second = 0; second < 60; second++) { clock.advance(1000); await settle(clock); }
  const expected = status === 404 || status === 410 || status === 429 ? 1 : 6;
  expect(opens).toBe(expected);
  expect(probes).toHaveBeenCalledTimes(expected);
  if (status === 'network' || status === 0) {
    expect(openedAt.map(at => at - 1000)).toEqual([0, 1000, 3000, 7000, 15000, 31000]);
    online(); await settle(clock);
    expect(opens).toBe(7);
  }
  if (status === 429) { online(); await settle(clock); expect(opens).toBe(1); }
  host.stop();
});
