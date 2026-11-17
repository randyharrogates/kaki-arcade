export type WakeState = 'held' | 'released' | 'unavailable';
export interface WakeSentinel {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
  removeEventListener(type: 'release', listener: () => void): void;
}
export interface WakeNavigator { readonly wakeLock?: { request(type: 'screen'): Promise<WakeSentinel> } }
export interface VisibilityTarget {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange' | 'pointerdown', listener: () => void): void;
  removeEventListener(type: 'visibilitychange' | 'pointerdown', listener: () => void): void;
}
/** No timers; one request at a time. Late resolutions are released even after disposal. */
export function keepScreenAwake(nav: WakeNavigator, page: VisibilityTarget, present: (state: WakeState) => void): () => void {
  let active = true;
  let pending = false;
  let retry = false;
  let retryUsed = false;
  let sentinel: WakeSentinel | undefined;
  const report = (state: WakeState): void => { if (active) present(state); };
  const released = (): void => {
    sentinel?.removeEventListener('release', released);
    sentinel = undefined;
    retry = !retryUsed;
    report(page.hidden ? 'released' : 'unavailable');
  };
  const release = (): void => {
    const old = sentinel; sentinel = undefined;
    old?.removeEventListener('release', released);
    void old?.release().catch(() => undefined);
  };
  const acquire = (): void => {
    if (!active) return;
    if (page.hidden) { release(); report('released'); return; }
    if (pending || sentinel) return;
    if (!nav.wakeLock) { report('unavailable'); return; }
    pending = true;
    void nav.wakeLock.request('screen').then(next => {
      pending = false;
      if (!active || page.hidden) {
        void next.release().catch(() => undefined);
        if (active) report('released');
        return;
      }
      sentinel = next; next.addEventListener('release', released); report('held');
    }, () => { pending = false; retry = !retryUsed; report(page.hidden ? 'released' : 'unavailable'); });
  };
  const visibility = (): void => { retryUsed = false; retry = true; acquire(); };
  const pointer = (): void => {
    if (!retry || retryUsed || page.hidden || pending || sentinel) return;
    retry = false; retryUsed = true; acquire();
  };
  page.addEventListener('visibilitychange', visibility);
  page.addEventListener('pointerdown', pointer); acquire();
  return () => { active = false; page.removeEventListener('visibilitychange', visibility); page.removeEventListener('pointerdown', pointer); release(); };
}
