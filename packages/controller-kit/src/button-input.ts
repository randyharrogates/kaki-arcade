export interface ButtonCallbacks {
  onPress(id: string): void;
  onRelease(id: string): void;
}
/** Each pointer owns one control; a control releases when its last owner leaves. */
export function buttonRouter(callbacks: ButtonCallbacks) {
  const pointers = new Map<number, string>();
  const route = (pointer: number, id: string | null) => {
    const old = pointers.get(pointer);
    if (old === id) return;
    if (old !== undefined) { pointers.delete(pointer); if (![...pointers.values()].includes(old)) callbacks.onRelease(old); }
    if (id !== null) {
      const held = [...pointers.values()].includes(id);
      pointers.set(pointer, id); if (!held) callbacks.onPress(id);
    }
  };
  return { route, clear() { for (const pointer of [...pointers.keys()]) route(pointer, null); } };
}
export interface Vibrator { vibrate?: (duration: number) => unknown }
/** A brief tactile tick; vibration is optional and may be denied by browser policy. */
export function vibratePress(host: Vibrator = typeof navigator === 'undefined' ? {} : navigator): void {
  try { host.vibrate?.(HAPTIC_TICK_MS); } catch { /* Optional hardware capability. */ }
}

/** UI has no haptic token; a short hardware tick, for integrator token review. */
export const HAPTIC_TICK_MS = 10;
/** Recover layout geometry around its unchanged centre, even during release animation. */
export function unscaledBox(box: { left: number; top: number; width: number; height: number }, width: number, height: number) {
  return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height };
}
interface ControlTarget extends EventTarget { setPointerCapture(id: number): void }
/** Controls' DOM event wiring, injectable so every release route is tested without a DOM. */
export function bindControlEvents(node: ControlTarget, windowTarget: EventTarget, documentTarget: EventTarget & { readonly hidden: boolean }, options: ButtonCallbacks & { hit(event: PointerEvent): string | null; slide?: boolean }) {
  const active = new Map<number, string | null>();
  const router = buttonRouter(options);
  const down = (raw: Event) => {
    const event = raw as PointerEvent;
    if (event.button !== 0) return;
    const id = options.hit(event);
    if (!id && !options.slide) return;
    event.preventDefault(); active.set(event.pointerId, id);
    node.setPointerCapture(event.pointerId); router.route(event.pointerId, id);
  };
  const move = (raw: Event) => {
    const event = raw as PointerEvent;
    if (!active.has(event.pointerId)) return;
    const id = options.hit(event), original = active.get(event.pointerId);
    router.route(event.pointerId, options.slide || id === original ? id : null);
    if (!options.slide && id !== original) active.delete(event.pointerId);
  };
  const release = (raw: Event) => { const event = raw as PointerEvent; active.delete(event.pointerId); router.route(event.pointerId, null); };
  const clear = () => { active.clear(); router.clear(); };
  const hidden = () => { if (documentTarget.hidden) clear(); };
  const releases = ['pointerup', 'pointercancel', 'lostpointercapture'];
  node.addEventListener('pointerdown', down); node.addEventListener('pointermove', move);
  for (const type of releases) node.addEventListener(type, release);
  windowTarget.addEventListener('blur', clear); documentTarget.addEventListener('visibilitychange', hidden);
  return () => {
    clear(); node.removeEventListener('pointerdown', down); node.removeEventListener('pointermove', move);
    for (const type of releases) node.removeEventListener(type, release);
    windowTarget.removeEventListener('blur', clear); documentTarget.removeEventListener('visibilitychange', hidden);
  };
}

/** Hit current DOM buttons using layout bounds, including while visually scaled. */
export function controlHit(buttons: Iterable<Pick<HTMLButtonElement, 'getBoundingClientRect' | 'offsetWidth' | 'offsetHeight' | 'dataset'>>, event: Pick<PointerEvent, 'clientX' | 'clientY'>, circular: boolean): string | null {
  return [...buttons].find(button => {
    const box = unscaledBox(button.getBoundingClientRect(), button.offsetWidth, button.offsetHeight);
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    return x >= 0 && x < 1 && y >= 0 && y < 1 && (!circular || Math.hypot(x - 0.5, y - 0.5) <= 0.5);
  })?.dataset.control ?? null;
}
