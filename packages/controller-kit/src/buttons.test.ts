import { describe, it, expect } from 'vitest';
import { controlSizes } from './button-sizing';
import { buttonRouter, bindControlEvents, controlHit, unscaledBox, vibratePress } from './button-input';
describe('K-03 controls', () => {
  it.each([[667, 375], [844, 390], [932, 430]])('keeps D-051 floors at %s × %s', (width, height) => {
    const size = controlSizes({ width, height });
    expect(size.face).toBeGreaterThanOrEqual(110);
    expect(size.inPlayWidth).toBeGreaterThanOrEqual(89);
    expect(size.inPlayHeight).toBeGreaterThanOrEqual(68);
    expect(size.minimum).toBeGreaterThanOrEqual(55);
    if (width > 844) expect(size.face).toBeGreaterThan(110);
  });
  it('sizes from the viewport with the real header-reduced play area', () => {
    expect(controlSizes({ width: 932, height: 430 }, { width: 932, height: 385 }).face).toBe(121);
    expect(controlSizes({ width: 844, height: 390 }, { width: 844, height: 345 }).face).toBe(110);
  });
  it('shrinks a height-limited layout to fit while retaining floors', () => {
    const size = controlSizes({ width: 1200, height: 600 }, { width: 1200, height: 350 });
    expect(size.face).toBeGreaterThanOrEqual(110);
    expect(size.face).toBeLessThan(156);
    expect(size.face + 2 * ((size.face + 5) / Math.SQRT2 + 13) + 26).toBeLessThanOrEqual(350);
    expect(4 * size.inPlayHeight + 65).toBeLessThanOrEqual(350);
    expect(size.inPlayWidth).toBeGreaterThanOrEqual(89);
    expect(size.inPlayHeight).toBeGreaterThanOrEqual(68);
    expect(size.minimum).toBeGreaterThanOrEqual(55);
  });
  it('routes independent fingers, slide-off, cancellation and D-pad switches', () => {
    const events: string[] = [];
    const router = buttonRouter({ onPress: id => events.push(`+${id}`), onRelease: id => events.push(`-${id}`) });
    router.route(1, 'Cross'); router.route(2, 'Circle'); router.route(3, 'Cross');
    expect(events).toEqual(['+Cross', '+Circle']);
    router.route(1, null); expect(events).toEqual(['+Cross', '+Circle']); router.route(3, null); router.route(4, 'Up'); router.route(4, 'Right');
    expect(events).toEqual(['+Cross', '+Circle', '-Cross', '+Up', '-Up', '+Right']);
    router.clear(); expect(events.slice(-2)).toEqual(['-Circle', '-Right']);
    router.clear(); expect(events).toHaveLength(8);
  });
  it('guards missing, refusing and throwing vibration implementations', () => {
    expect(() => { vibratePress({}); }).not.toThrow();
    expect(() => { vibratePress({ vibrate: () => { throw new Error('denied'); } }); }).not.toThrow();
    let duration = 0; vibratePress({ vibrate: ms => { duration = ms; return false; } }); expect(duration).toBe(10);
  });
});

class Target extends EventTarget { hidden = false; setPointerCapture() { /* Stub browser capture. */ } }
function pointer(target: Target, type: string, id = 1, clientX = 0, clientY = 0) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { button: 0, pointerId: id, clientX, clientY }); target.dispatchEvent(event);
}
describe('Controls event binding (CTRL-005, CTRL-006)', () => {
  it.each(['pointercancel', 'lostpointercapture', 'blur', 'visibilitychange', 'unmount'])('clears held state and calls release on %s', type => {
    const node = new Target(), win = new Target(), doc = new Target();
    const held = new Set<string>(), releases: string[] = [];
    const dispose = bindControlEvents(node, win, doc, { hit: () => 'Cross', onPress: id => { held.add(id); }, onRelease: id => { held.delete(id); releases.push(id); } });
    pointer(node, 'pointerdown'); expect([...held]).toEqual(['Cross']);
    if (type === 'unmount') dispose();
    else if (type === 'blur') win.dispatchEvent(new Event(type));
    else if (type === 'visibilitychange') { doc.hidden = true; doc.dispatchEvent(new Event(type)); }
    else pointer(node, type);
    expect([...held]).toEqual([]); expect(releases).toEqual(['Cross']);
    pointer(node, 'pointermove'); expect([...held]).toEqual([]);
    dispose(); expect(releases).toEqual(['Cross']);
  });
  function emptyLanding(x: number, y: number, direction: string, endX: number, endY: number) {
    const node = new Target(), held = new Set<string>();
    const buttons = [
      ['Up', 100, 0], ['Left', 0, 100], ['Right', 200, 100], ['Down', 100, 200],
    ].map(([id, left, top]) => ({ dataset: { control: String(id) }, offsetWidth: 89, offsetHeight: 68,
      getBoundingClientRect: () => ({ left: Number(left), top: Number(top), width: 89, height: 68 }) as DOMRect }));
    const dispose = bindControlEvents(node, new Target(), new Target(), { slide: true,
      hit: event => controlHit(buttons, event, false),
      onPress: id => { held.add(id); }, onRelease: id => { held.delete(id); } });
    pointer(node, 'pointerdown', 1, x, y); expect([...held]).toEqual([]);
    pointer(node, 'pointermove', 1, endX, endY); expect([...held]).toEqual([direction]);
    dispose(); expect(held.size).toBe(0);
  }
  it('lands in the empty centre then slides onto Right', () => { emptyLanding(144, 134, 'Right', 244, 134); });
  it('lands in an empty corner then slides onto Up', () => { emptyLanding(5, 5, 'Up', 144, 34); });
  it('lands in the gap above Left then slides onto Left', () => { emptyLanding(44, 89, 'Left', 44, 134); });
  it('keeps a shared control held until its last finger lifts', () => {
    const events: string[] = []; const router = buttonRouter({ onPress: id => events.push(`+${id}`), onRelease: id => events.push(`-${id}`) });
    router.route(1, 'L'); router.route(2, 'L'); router.route(1, null); expect(events).toEqual(['+L']);
    router.route(2, null); expect(events).toEqual(['+L', '-L']);
  });
  it('holds a scaled face at its unscaled rim through production hit testing', () => {
    const node = new Target(), held = new Set<string>();
    let scaled = false;
    const button = { dataset: { control: 'Cross' }, offsetWidth: 110, offsetHeight: 110,
      getBoundingClientRect: () => scaled
        ? { left: 1.65, top: 1.65, width: 106.7, height: 106.7 } as DOMRect
        : { left: 0, top: 0, width: 110, height: 110 } as DOMRect };
    const dispose = bindControlEvents(node, new Target(), new Target(), {
      hit: event => controlHit([button], event, true),
      onPress: id => { held.add(id); scaled = true; }, onRelease: id => { held.delete(id); },
    });
    pointer(node, 'pointerdown', 1, 108, 55);
    pointer(node, 'pointermove', 1, 109, 55);
    expect([...held]).toEqual(['Cross']);
    dispose();
  });
  it('keeps the unscaled rim inside the hit geometry during a press', () => {
    const box = unscaledBox({ left: 1.65, top: 1.65, width: 106.7, height: 106.7 }, 110, 110);
    expect(box.left).toBeCloseTo(0); expect(box.top).toBeCloseTo(0); expect(box.width).toBe(110);
    expect(1 >= box.left && 1 < box.left + box.width).toBe(true);
  });
});
