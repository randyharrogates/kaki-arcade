import { expect, it, vi } from 'vitest';
import { hostCounts } from './counts';
function fixture() {
  const send = vi.fn<(body: string) => Promise<boolean>>(() => Promise.resolve(true)); const beacon = vi.fn(() => true); const cancel = vi.fn();
  return { counts: hostCounts({ send, beacon, cancel }), send, beacon, cancel };
}
it('DATA-003 batches once at match end and drains before page hide', () => {
  const { counts, send, beacon } = fixture();
  counts.begin(); counts.add('error:host:session');
  for (let n = 0; n < 600; n++) counts.frame(16);
  counts.hide(); expect(beacon).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
  counts.end(); counts.end(); counts.hide();
  expect(send).toHaveBeenCalledTimes(1); expect(JSON.parse(send.mock.calls[0]?.[0] ?? '{}')).toEqual({ 'error:host:session': 1, 'perf:host-frame-p95:le17': 1 });
  expect(beacon).not.toHaveBeenCalled();
  counts.add('reconnect:signal'); counts.hide(); counts.hide(); expect(beacon).toHaveBeenCalledTimes(1);
});
it('disables after a failure with no retry, cancels requests before play', async () => {
  const send = vi.fn(() => Promise.resolve(false)); const beacon = vi.fn(() => true); const cancel = vi.fn();
  const counts = hostCounts({ send, beacon, cancel });
  counts.begin(); counts.add('error:host:load'); counts.end(); await Promise.resolve();
  counts.begin(); counts.add('reconnect:signal'); counts.end(); counts.hide();
  expect(send).toHaveBeenCalledTimes(1); expect(beacon).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledTimes(2);
});

it.each([[17, 'le17'], [17.1, 'le34'], [34, 'le34'], [34.1, 'le50'], [50, 'le50'], [50.1, 'gt50']] as const)('uses the fixed p95 band for %s ms', (ms, band) => {
  const { counts, send } = fixture(); counts.begin();
  for (let n = 0; n < 600; n++) counts.frame(ms);
  counts.end(); expect(JSON.parse(send.mock.calls[0]?.[0] ?? '{}')).toEqual({ [`perf:host-frame-p95:${band}`]: 1 });
});
it('does not report insufficient frames and turns off if beacon throws', () => {
  const send = vi.fn(() => Promise.resolve(true)); const beacon = vi.fn(() => { throw new Error('offline'); });
  const counts = hostCounts({ send, beacon, cancel: () => undefined });
  counts.begin(); counts.frame(16); counts.end(); expect(send).not.toHaveBeenCalled();
  counts.add('error:host:session'); counts.hide(); counts.add('reconnect:signal'); counts.hide(); expect(beacon).toHaveBeenCalledTimes(1);
});

it('DATA-003 stop discards an abandoned match frame band', () => {
  const send = vi.fn(() => Promise.resolve(true)); const beacon = vi.fn<(body: string) => boolean>(() => true);
  const counts = hostCounts({ send, beacon, cancel: () => undefined });
  counts.begin();
  for (let n = 0; n < 600; n++) counts.frame(16);
  counts.stop(); counts.end(); counts.hide();
  expect(send).not.toHaveBeenCalled(); expect(beacon).not.toHaveBeenCalled();
  counts.add('reconnect:signal'); counts.hide();
  expect(JSON.parse(beacon.mock.calls[0]?.[0] ?? '{}')).toEqual({ 'reconnect:signal': 1 });
});
