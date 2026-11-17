import { describe, expect, it, vi } from 'vitest';
import { stickHandlers, installStickCancellation } from './stick';
import { routeStick, stickModel } from './stick-model';
import type { StickEvent, StickPointer } from './stick-model';
const area = { left: 10, top: 20, width: 233, height: 233 };
const anchor = { x: 100, y: 100 };
const model = (x: number, y = 0) => stickModel(area, anchor, { x: anchor.x + x, y: anchor.y + y });
describe('CTRL-005 / PERF-012 stick', () => {
  it('centres exactly and suppresses radial jitter without altering visual tracking', () => {
    expect(model(0).vector).toEqual({ x: 0, y: 0 });
    expect(model(3, 4).vector).toEqual({ x: 0, y: 0 });
    expect(model(3, 4).offset).toEqual({ x: 3, y: 4 });
    expect(model(30).vector.x).toBe(0.5);
  });
  it('tracks 1:1 to the edge and stretches by 12% in travel direction', () => {
    expect(model(55).offset).toEqual({ x: 55, y: 0 });
    expect(model(55).vector).toEqual({ x: 1, y: 0 });
    expect(model(55).stretch).toBeCloseTo(1.12);
    expect(model(0).stretch).toBe(1);
    expect(model(3, 4).stretch).toBe(1);
    expect(model(30).stretch).toBeCloseTo(1.06);
    expect(model(0, -55).angle).toBeCloseTo(-Math.PI / 2);
  });
  it('rubber-bands beyond the edge while keeping diagonal vectors inside the unit circle', () => {
    const diagonal = model(200, 200);
    expect(Math.hypot(diagonal.vector.x, diagonal.vector.y)).toBeCloseTo(1);
    expect(diagonal.vector.x).toBeCloseTo(1 / Math.sqrt(2));
    expect(diagonal.vector.y).toBeCloseTo(1 / Math.sqrt(2));
    expect(Math.hypot(model(30, 40).vector.x, model(30, 40).vector.y)).toBeCloseTo((50 - 5) / 50);
    const beyond = model(110); expect(beyond.offset.x).toBeGreaterThan(55); expect(beyond.offset.x).toBeLessThan(110);
    expect(beyond.offset.x).toBeLessThan(55 * 1.25);
    for (const x of [-200, -55, 0, 55, 200]) for (const y of [-200, 0, 200]) {
      const result = model(x, y); expect(Math.hypot(result.vector.x, result.vector.y)).toBeLessThanOrEqual(1);
    }
    expect(stickModel({ ...area, width: 0 }, anchor, anchor).offset).toEqual({ x: 0, y: 0 });
  });
  it('routes only the first pointer, ignores second release, and emits zero on owner up/cancel', () => {
    for (const release of ['up', 'cancel'] as const) {
      let state: StickPointer | null = null;
      const send = (type: StickEvent['type'], pointerId: number, x = 100) => {
        const result = routeStick(state, { type, pointerId, position: { x, y: 100 }, area }); state = result.state; return result.output;
      };
      expect(send('down', 1)?.vector).toEqual({ x: 0, y: 0 });
      expect(send('down', 2)).toBeNull(); expect(send('move', 2, 155)).toBeNull(); expect(send('up', 2)).toBeNull();
      expect(state).toMatchObject({ pointerId: 1 }); expect(send('move', 1, 155)?.vector.x).toBe(1);
      expect(send(release, 1)?.vector).toEqual({ x: 0, y: 0 }); expect(state).toBeNull();
      expect(send('move', 1)).toBeNull(); expect(send('down', 2)?.vector.x).toBe(0);
    }
  });
  it('does not acquire outside the area', () => {
    expect(routeStick(null, { type: 'down', pointerId: 1, position: { x: 0, y: 0 }, area }).state).toBeNull();
  });
});

describe('CTRL-005 component routing', () => {
  function fixture() {
    const captured = new Set<number>();
    const root = { getBoundingClientRect: vi.fn(() => area), clientLeft: 3, clientTop: 3, dataset: {},
      setPointerCapture: (id: number) => { captured.add(id); }, hasPointerCapture: (id: number) => captured.has(id),
      releasePointerCapture: vi.fn((id: number) => { captured.delete(id); }) };
    const base = { style: {} }; const knob = { style: { transform: '' } }; const change = vi.fn();
    const routing = stickHandlers(root as unknown as HTMLDivElement, base as HTMLDivElement, knob as HTMLDivElement, change, () => false);
    const send = (type: StickEvent['type'], id = 1, x = 100) => { routing.handle(type, { pointerId: id, clientX: x, clientY: 100 } as PointerEvent); };
    return { root, base, knob, change, routing, send };
  }
  it('routes pointercancel and lost capture through owner cancellation once, ignoring other pointers', () => {
    for (const path of ['onPointerCancel', 'onLostPointerCapture'] as const) {
      const f = fixture(); f.send('down'); f.send('move', 1, 155);
      f.routing[path]({ pointerId: 2 } as PointerEvent); expect(f.change).toHaveBeenLastCalledWith({ x: 1, y: 0 });
      f.routing[path]({ pointerId: 1 } as PointerEvent); f.routing[path]({ pointerId: 1 } as PointerEvent);
      expect(f.change).toHaveBeenCalledTimes(3);
      expect(f.change).toHaveBeenLastCalledWith({ x: 0, y: 0 });
      expect(f.knob.style.transform, path).toContain('translate(0px, 0px)');
      expect(f.root.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1);
      expect(f.root.getBoundingClientRect).toHaveBeenCalledTimes(1);
    }
  });
  it('cancels hidden, blur and pagehide and removes listeners', () => {
    for (const type of ['visibilitychange', 'blur', 'pagehide', 'resize']) {
      const f = fixture(); const doc = Object.assign(new EventTarget(), { hidden: false }); const win = new EventTarget();
      const stop = installStickCancellation(doc, win, f.routing.cancel);
      f.send('down'); f.send('move', 1, 155);
      doc.dispatchEvent(new Event('visibilitychange')); expect(f.change).toHaveBeenLastCalledWith({ x: 1, y: 0 });
      doc.hidden = true; (type === 'visibilitychange' ? doc : win).dispatchEvent(new Event(type));
      expect(f.change).toHaveBeenLastCalledWith({ x: 0, y: 0 });
      expect(f.knob.style.transform).toContain('translate(0px, 0px)');
      expect(f.root.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1);
      stop(); f.send('down'); const calls = f.change.mock.calls.length;
      for (const event of ['blur', 'pagehide', 'resize']) win.dispatchEvent(new Event(event));
      doc.dispatchEvent(new Event('visibilitychange'));
      expect(f.change).toHaveBeenCalledTimes(calls); expect(f.root.dataset).toEqual({ held: 'true' });
    }
  });
  it('does nothing when cancelling without an owner or when capture fails', () => {
    const f = fixture(); f.routing.cancel(); expect(f.change).not.toHaveBeenCalled();
    f.root.setPointerCapture = () => { throw new Error('capture failed'); };
    f.send('down'); f.send('move'); f.routing.cancel();
    expect(f.change).not.toHaveBeenCalled(); expect(f.root.dataset).toEqual({});
  });
  it('keeps the stretch axis on release', () => {
    const f = fixture(); f.send('down');
    f.routing.handle('move', { pointerId: 1, clientX: 100, clientY: 150 } as PointerEvent);
    f.send('up'); expect(f.knob.style.transform).toContain(`rotate(${String(Math.PI / 2)}rad)`);
  });
  it('insets the base inside the padding box using the actual area position', () => {
    // The area's border box starts at (10, 20) with a 3 px outline, so its padding box starts at (13, 23).
    const position = (f: ReturnType<typeof fixture>) => {
      const style = f.base.style as Record<string, string | undefined>;
      return { x: parseFloat(style.left ?? ''), y: parseFloat(style.top ?? '') };
    };
    const free = fixture(); free.send('down', 1, 100);
    expect(position(free)).toEqual({ x: 100 - 13, y: 100 - 23 });
    const corner = fixture(); corner.routing.handle('down', { pointerId: 1, clientX: 14, clientY: 24 } as PointerEvent);
    // Clamped one radius inside the padding box: (13 + 55, 23 + 55), drawn relative to the padding box.
    expect(position(corner)).toEqual({ x: 55, y: 55 });
  });
  it('keeps edge and corner landings continuous on a 1 px move', () => {
    for (const position of [{ x: 11, y: 120 }, { x: 242, y: 120 }, { x: 120, y: 21 }, { x: 120, y: 252 }, { x: 31, y: 41 }]) {
      const down = routeStick(null, { type: 'down', pointerId: 1, position, area });
      if (!down.output) throw new Error('Missing down output');
      expect(Math.hypot(down.output.vector.x, down.output.vector.y)).toBeGreaterThan(0);
      const move = routeStick(down.state, { type: 'move', pointerId: 1, position: { x: position.x + 1, y: position.y }, area });
      if (!move.output) throw new Error('Missing move output');
      expect(Math.hypot(move.output.vector.x - down.output.vector.x, move.output.vector.y - down.output.vector.y)).toBeLessThanOrEqual(0.021);
      expect(move.state?.anchor).toEqual(down.state?.anchor);
    }
    expect(routeStick(null, { type: 'down', pointerId: 1, position: anchor, area }).output?.vector).toEqual({ x: 0, y: 0 });
  });
  it('clamps edge anchors to one radius inside the area', () => {
    for (const position of [{ x: 11, y: 21 }, { x: 242, y: 252 }]) {
      const result = routeStick(null, { type: 'down', pointerId: 1, position, area });
      const state = result.state; expect(state).not.toBeNull(); if (!state) return;
      expect(state.anchor.x - 55).toBeGreaterThanOrEqual(area.left);
      expect(state.anchor.y - 55).toBeGreaterThanOrEqual(area.top);
      expect(state.anchor.x + 55).toBeLessThanOrEqual(area.left + area.width);
      expect(state.anchor.y + 55).toBeLessThanOrEqual(area.top + area.height);
    }
  });
});
