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
  await fingers.dispose(); expect(detached).toBe(true); expect(events.at(-1)?.type).toBe('touchCancel');
});
