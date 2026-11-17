import { it, expect } from 'vitest';
import type { Page } from 'playwright';
import { thumbs } from './thumb.js';

it('sends simultaneous trusted CDP fingers and keeps the held button down while the stick moves (NFR-TEST)', async () => {
  const events: { type: string; touchPoints: { id: number; x: number; y: number }[] }[] = [];
  let detached = false;
  const page = { context: () => ({ newCDPSession: () => Promise.resolve({
    send: (_method: string, params: typeof events[number]) => { events.push(params); return Promise.resolve(); },
    detach: () => { detached = true; return Promise.resolve(); },
  }) }) } as unknown as Page;
  const fingers = await thumbs(page);
  await fingers.down({ x: 100, y: 200 });
  await fingers.down({ x: 700, y: 200 }, 2);
  await fingers.move([{ x: 200, y: 200 }], { steps: 2, everyMs: 0 });
  await fingers.up(1); await fingers.up(2);
  expect(events.map(e => e.type)).toEqual(['touchStart', 'touchStart', 'touchMove', 'touchMove', 'touchMove', 'touchEnd']);
  expect(events[2]?.touchPoints).toMatchObject([{ id: 1, x: 150, y: 200 }, { id: 2, x: 700, y: 200 }]);
  expect(events[4]?.touchPoints).toMatchObject([{ id: 2, x: 700, y: 200 }]);
  expect(events[5]?.touchPoints).toEqual([]);
  await expect(fingers.up()).rejects.toThrow('not down');
  await fingers.tap({ x: 1, y: 2 }); await fingers.hold({ x: 2, y: 3 }, 0);
  // All fingers are up: CDP rejects a touchCancel with no touch in progress, so none is sent.
  const before = events.length;
  await fingers.dispose(); expect(detached).toBe(true); expect(events.length).toBe(before);
});

it('cancels a finger still down when disposed (NFR-TEST)', async () => {
  const events: { type: string }[] = [];
  const page = { context: () => ({ newCDPSession: () => Promise.resolve({
    send: (_method: string, params: { type: string }) => { events.push(params); return Promise.resolve(); },
    detach: () => Promise.resolve(),
  }) }) } as unknown as Page;
  const fingers = await thumbs(page);
  await fingers.down({ x: 10, y: 20 });
  await fingers.dispose();
  expect(events.map(e => e.type)).toEqual(['touchStart', 'touchCancel']);
});

it('does not retain a failed down, and always detaches after a failed cancellation (NFR-TEST)', async () => {
  let failStart = true, detached = 0; const events: string[] = [];
  const page = { context: () => ({ newCDPSession: () => Promise.resolve({
    send: (_method: string, params: { type: string }) => { events.push(params.type); return params.type === 'touchCancel' || failStart ? Promise.reject(new Error('send failed')) : Promise.resolve(); },
    detach: () => { detached++; return Promise.resolve(); },
  }) }) } as unknown as Page;
  const fingers = await thumbs(page);
  await expect(fingers.down({ x: 1, y: 1 })).rejects.toThrow('send failed');
  await fingers.dispose(); expect(events).toEqual(['touchStart']); expect(detached).toBe(1);
  failStart = false;
  await fingers.down({ x: 1, y: 1 });
  await expect(fingers.dispose()).rejects.toThrow('send failed'); expect(detached).toBe(2);
});
