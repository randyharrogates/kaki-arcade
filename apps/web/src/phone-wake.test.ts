import { expect, it, vi } from 'vitest';
import { pageWake, shellAfterWake } from './phone-wake';
it('C-16 handoff waits for a pending wake request and its release', async () => {
  let resolve: (value: WakeLockSentinel) => void = () => undefined;
  const release = vi.fn(() => Promise.resolve());
  const request = vi.fn(() => new Promise<WakeLockSentinel>(done => { resolve = done; }));
  const wake = pageWake({ wakeLock: { request } }, () => true);
  wake.acquire(); wake.acquire(); expect(request).toHaveBeenCalledOnce();
  const stopped = wake.stop(); let finished = false; void stopped.then(() => { finished = true; });
  await Promise.resolve(); expect(finished).toBe(false);
  resolve({ release } as unknown as WakeLockSentinel); await stopped;
  expect(release).toHaveBeenCalledOnce(); wake.acquire(); expect(request).toHaveBeenCalledOnce();
});

it('a release rejection still completes the shell handoff', async () => {
  const release = vi.fn().mockRejectedValue(new Error('released elsewhere'));
  const wake = pageWake({ wakeLock: { request: () => Promise.resolve({ release } as unknown as WakeLockSentinel) } }, () => true);
  wake.acquire(); await Promise.resolve(); await Promise.resolve();
  const mount = vi.fn(); shellAfterWake(wake.stop(), mount);
  await vi.waitFor(() => { expect(mount).toHaveBeenCalledOnce(); });
  expect(release).toHaveBeenCalledOnce();
});
it('handoff handles a rejecting promise and its effect cleanup prevents stale mounting', async () => {
  const mount = vi.fn(); shellAfterWake(Promise.reject(new Error('release')), mount);
  await vi.waitFor(() => { expect(mount).toHaveBeenCalledOnce(); });
  const cancelled = vi.fn(); const cancel = shellAfterWake(Promise.resolve(), cancelled); cancel();
  await Promise.resolve(); await Promise.resolve(); expect(cancelled).not.toHaveBeenCalled();
});
