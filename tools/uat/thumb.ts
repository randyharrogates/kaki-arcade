import type { Page, CDPSession } from 'playwright';
import { setTimeout as delay } from 'node:timers/promises';
import { thumbPath } from './core.js';
import type { Point } from './core.js';

/** CDP emits trusted touch events; Chromium derives pointer events from them. */
export async function thumbs(page: Page) {
  const session: CDPSession = await page.context().newCDPSession(page);
  const active = new Map<number, Point>();
  const send = async (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel') => {
    await session.send('Input.dispatchTouchEvent', { type, touchPoints: [...active].map(([id, point]) => ({ id, ...point, radiusX: 8, radiusY: 8, force: 1 })) });
  };
  const down = async (point: Point, id = 1) => { if (active.has(id)) throw new Error('Finger already down'); active.set(id, point); await send('touchStart'); };
  const up = async (id = 1) => { if (!active.delete(id)) throw new Error('Finger is not down'); await send(active.size ? 'touchMove' : 'touchEnd'); };
  const move = async (points: Point[], { id = 1, steps = 10, everyMs = 16 } = {}) => {
    const start = active.get(id); if (!start) throw new Error('Finger is not down');
    for (const point of thumbPath([start, ...points], steps).slice(1)) { active.set(id, point); await send('touchMove'); await delay(everyMs); }
  };
  const hold = async (point: Point, ms = 500, id = 1) => { await down(point, id); try { await delay(ms); } finally { await up(id); } };
  return { down, move, up, hold, tap: (point: Point, id = 1) => hold(point, 50, id),
    async drag(points: Point[], options = {}) { const start = points[0]; if (!start) throw new Error('Empty drag'); await down(start); try { await move(points.slice(1), options); } finally { await up(); } },
    async dispose() { active.clear(); await send('touchCancel'); await session.detach(); } };
}
