import * as countsModule from './counts';
import type { CountDelivery } from './counts';
import { createRoom } from '@kaki/platform';
import type { loadGame } from './game-registry';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { createHostTransport } from '@kaki/netcode';
import { browserDependencies, retryAfterDelay } from './browser';
import type { DialCallbacks } from './host';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('browser error mapping with injected transport (PLAT-009)', () => {
  function fixture() {
    vi.stubGlobal('window', { setTimeout, clearTimeout, location: { origin: 'https://arcade.example' } });
    let options: Parameters<typeof createHostTransport>[0] | undefined;
    const credentials = { code: 'H7KQ9MXR', hostToken: 'private-host-token' };
    const stop = vi.fn();
    const factory = vi.fn<typeof createHostTransport>(input => {
      options = input;
      return Promise.resolve({ credentials, stop, peers: new Map(), send: () => true, iceExpiresAt: 0, refreshIceIfExpired: () => false, refreshIce: () => false });
    });
    const callbacks = { peer: vi.fn(), control: vi.fn(), dropped: vi.fn(), quality: vi.fn(), state: vi.fn(), retryAfter: vi.fn() } satisfies DialCallbacks;
    return { deps: browserDependencies('', factory), credentials, callbacks, get options() { if (!options) throw new Error('No transport'); return options; } };
  }
  it.each([['not-allowed', 'replaced'], ['room-not-found', 'expired'], ['room-expired', 'expired'], ['socket-unavailable', 'unreachable']])('maps %s to %s during restore', async (error, state) => {
    const f = fixture(); const pending = f.deps.dial(f.credentials, f.callbacks, () => undefined);
    f.options.onError(error);
    await expect(pending).rejects.toThrow(error);
    expect(f.callbacks.state).toHaveBeenCalledWith(state);
  });
  it('publishes socket-unavailable after the dial has resolved', async () => {
    const f = fixture(); const pending = f.deps.dial(undefined, f.callbacks, () => undefined);
    f.options.onRoom({ v: 1, t: 'created', ...f.credentials, reopened: false, ice: { servers: [], ttlS: 0, relay: 'available' } });
    await pending;
    f.options.onError('socket-unavailable');
    expect(f.callbacks.state).toHaveBeenLastCalledWith('unreachable');
  });
  it('preserves a creation 429 Retry-After for the host retry scheduler', async () => {
    const f = fixture(); vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 429, headers: { 'Retry-After': '120' } }))));
    const pending = f.deps.dial(undefined, f.callbacks, () => undefined);
    const response = f.options.fetch('https://arcade.example/rooms', { method: 'POST' });
    await expect(response).rejects.toMatchObject({ retryAfterMs: 120000 });
    expect(f.callbacks.retryAfter).toHaveBeenCalledWith(120000);
    f.options.onError('socket-unavailable'); await expect(pending).rejects.toThrow();
  });
});

it('accepts Retry-After seconds and dates, with a safe fallback for invalid headers', () => {
  expect(retryAfterDelay('120', 0)).toBe(120000);
  expect(retryAfterDelay('Thu, 01 Jan 1970 00:02:00 GMT', 0)).toBe(120000);
  expect(retryAfterDelay('bad-date', 0)).toBe(60000);
  expect(retryAfterDelay(null, 0)).toBe(60000);
  expect(retryAfterDelay('0', 0)).toBe(1000);
});

it.each(['nonsense', '2147484', '99999999999999999999999999'])('phone Retry-After safely bounds %s', value => {
  expect(retryAfterDelay(value, 100000, 30000)).toBe(30000);
});

it.each([Infinity, 30000])('PLAT-009 past and zero Retry-After use the minimum with cap %s', cap => {
  for (const value of ['0', '-1', 'Thu, 01 Jan 1970 00:00:00 GMT']) expect(retryAfterDelay(value, 100000, cap)).toBe(1000);
});

it('PLAT-020 prefetches once on Select, shares the pending load with Start, and retries rejection', async () => {
  const loader = vi.fn<typeof loadGame>().mockRejectedValue(new Error('offline'));
  const session = browserDependencies('', undefined, loader).session;
  const pending = session?.prefetch?.('rabakz');
  const starting = session?.start('rabakz', createRoom());
  await expect(pending).rejects.toThrow('offline');
  await expect(starting).rejects.toThrow('offline');
  await expect(session?.start('rabakz', createRoom())).rejects.toThrow('offline');
  expect(loader).toHaveBeenCalledTimes(2);
});

function countFixture() {
  const windowEvents = new EventTarget(); const documentEvents = new EventTarget();
  vi.stubGlobal('window', Object.assign(windowEvents, { setTimeout, clearTimeout, location: { origin: 'https://arcade.example' } }));
  vi.stubGlobal('document', Object.assign(documentEvents, { visibilityState: 'hidden' }));
  const fetch = vi.fn<typeof globalThis.fetch>(() => Promise.resolve(new Response(null, { status: 204 }))); vi.stubGlobal('fetch', fetch);
  let delivery: CountDelivery | undefined;
  const original = countsModule.hostCounts;
  vi.spyOn(countsModule, 'hostCounts').mockImplementation(input => { delivery = input; return original(input); });
  const loader = vi.fn<typeof loadGame>().mockRejectedValue(new Error('offline'));
  let options: Parameters<typeof createHostTransport>[0] | undefined;
  const factory = vi.fn<typeof createHostTransport>(input => {
    options = input;
    return Promise.resolve({ credentials: { code: 'H7KQ9MXR', hostToken: 'secret' }, stop: vi.fn(), peers: new Map(), send: () => true, iceExpiresAt: 0, refreshIceIfExpired: () => false, refreshIce: () => false });
  });
  const deps = browserDependencies('https://signal.example/', factory, loader);
  const unsubscribe = deps.lifecycle?.subscribe(() => undefined);
  return { deps, loader, fetch, windowEvents, documentEvents, unsubscribe,
    get delivery() { if (!delivery) throw new Error('No delivery'); return delivery; },
    get options() { if (!options) throw new Error('No transport'); return options; } };
}
it('DATA-003 counts fetch omits credentials/referrer and aborts after two seconds', async () => {
  const f = countFixture(); const timeout = vi.spyOn(AbortSignal, 'timeout');
  const fetch = vi.fn<typeof globalThis.fetch>((_url, init) => {
    expect(init?.signal?.aborted).toBe(false); return Promise.resolve(new Response(null, { status: 204 }));
  }); vi.stubGlobal('fetch', fetch);
  expect(await f.delivery.send('{"reconnect:signal":1}')).toBe(true);
  expect(fetch).toHaveBeenCalledWith('https://signal.example/counts', expect.objectContaining({ method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', body: '{"reconnect:signal":1}' }));
  expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  expect(timeout).toHaveBeenCalledWith(2000);
  f.unsubscribe?.();
});
it('DATA-003 wires load, reconnect and unavailable counts to drained lifecycle keepalive fetches', async () => {
  const f = countFixture();
  await expect(f.deps.session?.start('rabakz', createRoom())).rejects.toThrow('offline');
  const callbacks = { peer: vi.fn(), control: vi.fn(), dropped: vi.fn(), quality: vi.fn(), state: vi.fn() } satisfies DialCallbacks;
  const pending = f.deps.dial(undefined, callbacks, () => undefined);
  f.options.onPairingState?.('connected'); f.options.onPairingState?.('reconnecting'); f.options.onError('socket-unavailable');
  await expect(pending).rejects.toThrow('socket-unavailable');
  f.documentEvents.dispatchEvent(new Event('visibilitychange'));
  expect(f.fetch).toHaveBeenCalledTimes(1);
  const call = f.fetch.mock.calls[0];
  expect(call).toBeDefined();
  const [url, init] = call ?? [];
  expect(url).toBe('https://signal.example/counts');
  expect(typeof init?.body).toBe('string');
  expect(init).toEqual({ method: 'POST', body: init?.body, keepalive: true, credentials: 'omit', referrerPolicy: 'no-referrer' });
  // A string body uses the browser's text/plain content type without preflight.
  expect(JSON.parse(init?.body as string)).toEqual({ 'error:host:load': 1, 'reconnect:signal': 1, 'error:signal:unavailable': 1 });
  f.windowEvents.dispatchEvent(new Event('pagehide')); expect(f.fetch).toHaveBeenCalledTimes(1);
  await expect(f.deps.session?.start('rabakz', createRoom())).rejects.toThrow();
  f.windowEvents.dispatchEvent(new Event('pagehide')); expect(f.fetch).toHaveBeenCalledTimes(2);
  f.unsubscribe?.();
});
it('DATA-003 ignores Cancelled starts but still counts load failures', async () => {
  const f = countFixture(); f.loader.mockRejectedValueOnce(new Error('Cancelled'));
  await expect(f.deps.session?.start('rabakz', createRoom())).rejects.toThrow('Cancelled');
  f.windowEvents.dispatchEvent(new Event('pagehide')); expect(f.fetch).not.toHaveBeenCalled();
  await expect(f.deps.session?.start('rabakz', createRoom())).rejects.toThrow('offline');
  f.windowEvents.dispatchEvent(new Event('pagehide'));
  expect(JSON.parse(f.fetch.mock.calls[0]?.[1]?.body as string)).toEqual({ 'error:host:load': 1 }); f.unsubscribe?.();
});

it('DATA-003 visible visibilitychange sends nothing and preserves the pending batch', async () => {
  const f = countFixture();
  await expect(f.deps.session?.start('rabakz', createRoom())).rejects.toThrow('offline');
  Object.assign(f.documentEvents, { visibilityState: 'visible' });
  f.documentEvents.dispatchEvent(new Event('visibilitychange'));
  expect(f.fetch).not.toHaveBeenCalled();
  Object.assign(f.documentEvents, { visibilityState: 'hidden' });
  f.documentEvents.dispatchEvent(new Event('visibilitychange'));
  expect(f.fetch).toHaveBeenCalledTimes(1); f.unsubscribe?.();
});
it.each(['throw', 'reject', 'refuse'])('DATA-003 disables hide delivery after fetch %s', async failure => {
  const f = countFixture();
  if (failure === 'throw') f.fetch.mockImplementation(() => { throw new Error('offline'); });
  else if (failure === 'reject') f.fetch.mockRejectedValue(new Error('offline'));
  else f.fetch.mockResolvedValue(new Response(null, { status: 503 }));
  await expect(f.deps.session?.start('rabakz', createRoom())).rejects.toThrow('offline');
  f.windowEvents.dispatchEvent(new Event('pagehide'));
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  await expect(f.deps.session?.start('rabakz', createRoom())).rejects.toThrow('offline');
  f.windowEvents.dispatchEvent(new Event('pagehide'));
  expect(f.fetch).toHaveBeenCalledTimes(1); f.unsubscribe?.();
});
it('DATA-003 counts one reconnect:signal per signalling outage, not per retry or failed first connect', () => {
  const f = countFixture();
  const callbacks = { peer: vi.fn(), control: vi.fn(), dropped: vi.fn(), quality: vi.fn(), state: vi.fn() } satisfies DialCallbacks;
  void f.deps.dial(undefined, callbacks, () => undefined).catch(() => undefined);
  for (const state of ['reconnecting', 'connecting', 'connected', 'reconnecting', 'reconnecting', 'reconnecting',
    'reconnecting', 'connected', 'reconnecting', 'reconnecting'] as const) f.options.onPairingState?.(state);
  expect(callbacks.state.mock.calls.filter(([s]) => s === 'reconnecting')).toHaveLength(7);
  Object.assign(f.documentEvents, { visibilityState: 'hidden' });
  f.documentEvents.dispatchEvent(new Event('visibilitychange'));
  expect(JSON.parse(f.fetch.mock.calls[0]?.[1]?.body as string)).toEqual({ 'reconnect:signal': 2 });
  f.unsubscribe?.();
});
