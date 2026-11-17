/// <reference lib="dom" />
type LockTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
const locks = new WeakMap<LockTarget, { count: number; stop: () => void }>();
/** CSS does the normal locking; these cancel browser gestures CSS cannot reliably cover. */
export function installPageLock(target: LockTarget, root?: { classList: Pick<DOMTokenList, 'contains' | 'add' | 'remove'> }): () => void {
  const existing = locks.get(target);
  if (existing) { existing.count++; return disposer(target); }
  const hadLock = root?.classList.contains('ka-controller-locked');
  root?.classList.add('ka-controller-locked');
  const options = { passive: false, capture: false };
  const cancel = (event: Event): void => { event.preventDefault(); };
  const multiTouch = (event: Event): void => {
    if ((event as TouchEvent).touches.length > 1) event.preventDefault();
  };
  const listeners = [['touchmove', multiTouch], ['gesturestart', cancel], ['dblclick', cancel], ['contextmenu', cancel]] as const;
  for (const [type, listener] of listeners) target.addEventListener(type, listener, options);
  locks.set(target, { count: 1, stop: () => {
    for (const [type, listener] of listeners) target.removeEventListener(type, listener, options);
    if (!hadLock) root?.classList.remove('ka-controller-locked');
  } });
  return disposer(target);
}

function disposer(target: LockTarget): () => void {
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    const lock = locks.get(target);
    if (lock && --lock.count === 0) { lock.stop(); locks.delete(target); }
  };
}
