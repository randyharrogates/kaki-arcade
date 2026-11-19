import * as countsModule from './counts';
import { afterEach, expect, it, vi } from 'vitest';
import { createPhoneSeatStore } from '@kaki/platform';
import { phoneBrowserDependencies } from './phone-browser';
import { createPhone, phoneView } from './phone';
import { Clock, MemoryStorage, CODE, SECRET, SimSocket, settle } from './testing.fixture';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it.each([['gone', 404, true], ['bare404', 404, false], ['proxy', 503, false], ['limited', 429, false], ['network', 0, false]] as const)('PLAT-009 browser probe %s preserves the signed-gone boundary and retry pace', async (kind, status, gone) => {
  const clock = new Clock(); const storage = new MemoryStorage();
  createPhoneSeatStore(storage).write({ code: CODE, seatToken: SECRET, nickname: 'Fern', roomToken: null, droppedAt: null });
  vi.spyOn(Date, 'now').mockImplementation(() => clock.now());
  vi.stubGlobal('window', { setTimeout: (callback: () => void, ms: number) => clock.schedule(callback, ms), clearTimeout: (id: number) => { clock.cancel(id); } });
  vi.stubGlobal('sessionStorage', storage); vi.stubGlobal('location', { origin: 'http://web' });
  vi.stubGlobal('fetch', vi.fn(() => kind === 'network' ? Promise.reject(new Error('offline')) : Promise.resolve(new Response('', {
    status, headers: { ...(gone ? { 'X-Kaki-Room': 'gone' } : {}), ...(kind === 'limited' ? { 'Retry-After': '120' } : {}) },
  }))));
  const times: number[] = [];
  vi.stubGlobal('WebSocket', class extends SimSocket {
    constructor() {
      super(() => undefined, () => undefined); times.push(clock.now());
      clock.schedule(() => { this.onerror?.(); this.onclose?.(); }, 0);
    }
  });
  const deps = phoneBrowserDependencies('http://signal'); delete deps.lifecycle;
  let view = phoneView('entry'); const phone = createPhone(deps, null, next => { view = next; });
  await settle(clock);
  expect(view.state).toBe(gone ? 'room-gone' : 'unreachable');
  for (let i = 0; i < 60; i++) { clock.advance(1000); await settle(clock); }
  if (gone) expect(times).toHaveLength(1);
  else if (kind === 'limited') expect(times.map(at => at - 1000)).toEqual([0, 30000, 60000]);
  else expect(times.map(at => at - 1000)).toEqual([0, 1000, 3000, 7000, 15000, 31000]);
  expect(createPhoneSeatStore(storage).read()?.seatToken ?? null).toBe(gone ? null : SECRET);
  expect(JSON.stringify(view)).not.toContain(SECRET); phone.stop();
});

it('DATA-003 phones send no counts when hidden or shown', () => {
  const hostCounts = vi.spyOn(countsModule, 'hostCounts');
  const listeners = new Map<string, () => void>();
  const fetch = vi.fn(); const beacon = vi.fn();
  vi.stubGlobal('fetch', fetch); vi.stubGlobal('navigator', { sendBeacon: beacon });
  vi.stubGlobal('window', { addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: vi.fn() });
  vi.stubGlobal('document', { hidden: true, addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: vi.fn() });
  const deps = phoneBrowserDependencies('http://signal');
  const unsubscribe = deps.lifecycle?.subscribe(() => undefined);
  listeners.get('visibilitychange')?.(); listeners.get('pagehide')?.(); listeners.get('pageshow')?.();
  expect(hostCounts).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(beacon).not.toHaveBeenCalled(); unsubscribe?.();
});

it('PLAT-011 browser identity persists once in localStorage, with a stable per-tab fallback', () => {
  const local = new MemoryStorage();
  vi.stubGlobal('localStorage', local);
  const first = phoneBrowserDependencies('').browserId;
  expect(first).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
  expect(local.getItem('kaki.device')).toBe(first);
  expect(phoneBrowserDependencies('').browserId).toBe(first);
  const stored = 'other-browser-identity-123456';
  local.setItem('kaki.device', stored);
  expect(phoneBrowserDependencies('').browserId).toBe(stored);
  vi.stubGlobal('localStorage', { getItem() { throw new Error('denied'); } });
  const fallback = phoneBrowserDependencies('').browserId;
  expect(phoneBrowserDependencies('').browserId).toBe(fallback);
});

it('PLAT-011 creates a LAN browser identity without randomUUID', async () => {
  vi.resetModules();
  vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(17) });
  vi.stubGlobal('localStorage', new MemoryStorage());
  const { phoneBrowserDependencies: dependencies } = await import('./phone-browser');
  expect(dependencies('').browserId).toBe('11'.repeat(32));
});
