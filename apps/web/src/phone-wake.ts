/** Serialises ownership: a shell is mounted only after the page's request and release finish. */
export function pageWake(navigator: Partial<Pick<Navigator, 'wakeLock'>>, visible: () => boolean) {
  let held: WakeLockSentinel | undefined;
  let pending: Promise<void> | undefined;
  let active = true;
  return {
    acquire(): void {
      if (held?.released) held = undefined;
      if (!active || !visible() || held || pending || !navigator.wakeLock) return;
      pending = navigator.wakeLock.request('screen').then(async next => {
        if (active) held = next; else await next.release();
      }).catch(() => undefined).finally(() => { pending = undefined; });
    },
    async stop(): Promise<void> { active = false; await pending; try { await held?.release(); } catch { /* A rejected release must not block the controller. */ } finally { held = undefined; } },
  };
}

/** Effect logic without DOM: mount after handoff, including a failed release; honour cleanup. */
export function shellAfterWake(release: Promise<void>, mount: () => void): () => void {
  let active = true;
  void release.catch(() => undefined).then(() => { if (active) mount(); });
  return () => { active = false; };
}
