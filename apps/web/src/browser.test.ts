import { afterEach, describe, expect, it, vi } from 'vitest';
import type { createHostTransport } from '@kaki/netcode';
import { browserDependencies, retryAfterDelay } from './browser';
import type { DialCallbacks } from './host';

afterEach(() => { vi.unstubAllGlobals(); });
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
