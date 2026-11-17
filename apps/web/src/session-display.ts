import type { SessionDisplay } from './session-adapter';
/** The simulation publishes to its screen subscriber, outside the lobby's state tree. */
export function sessionDisplayStore() {
  let value: SessionDisplay | null = null;
  const listeners = new Set<(display: SessionDisplay | null) => void>();
  return {
    get: () => value,
    publish(next: SessionDisplay | null) { value = next; for (const listener of listeners) listener(next); },
    subscribe(listener: (display: SessionDisplay | null) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
