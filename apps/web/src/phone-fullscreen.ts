/** CTRL-004 / D-297: observe the original gesture without changing control routing. */
export function installPhoneFullscreen(doc: Document, win: Window, inRoom: () => boolean, pathname: string): () => void {
  if (pathname.replace(/\/$/, '') !== '/play') return () => undefined;
  const landscape = win.matchMedia('(orientation: landscape)');
  let armed = true;
  let portraitExit = false;
  const fullscreenChange = (): void => {
    if (!doc.fullscreenElement) {
      if (landscape.matches && !portraitExit) armed = false;
      portraitExit = false;
    }
  };
  const portrait = (): void => {
    if (!landscape.matches) armed = true;
    if (!landscape.matches && doc.fullscreenElement) {
      portraitExit = true;
      try { void (doc.exitFullscreen() as Promise<void> | undefined)?.catch(() => { portraitExit = false; }); } catch { portraitExit = false; }
    }
  };
  const active = new Set<number>();
  const request = (event: PointerEvent): void => {
    if (!armed || !event.isTrusted || !inRoom() || !landscape.matches || !doc.fullscreenEnabled || doc.fullscreenElement) return;
    try { void (doc.documentElement.requestFullscreen({ navigationUI: 'hide' }) as Promise<void> | undefined)?.catch(() => undefined); } catch { /* Optional browser capability. */ }
  };
  const down = (event: PointerEvent): void => {
    if (!event.isTrusted) return;
    active.add(event.pointerId);
    if (event.pointerType === 'mouse') request(event);
  };
  const up = (event: PointerEvent): void => {
    if (!event.isTrusted) return;
    active.delete(event.pointerId);
    // Touch activation arrives on release; wait until a held stick is released too.
    if (event.pointerType !== 'mouse' && active.size === 0) request(event);
  };
  const cancel = (event: PointerEvent): void => { if (event.isTrusted) active.delete(event.pointerId); };
  const clear = (): void => { active.clear(); };
  const visibility = (): void => { if (doc.visibilityState === 'hidden') clear(); };
  win.addEventListener('blur', clear);
  win.addEventListener('pagehide', clear);
  doc.addEventListener('visibilitychange', visibility);
  doc.addEventListener('fullscreenchange', fullscreenChange);
  doc.addEventListener('pointerdown', down, { capture: true, passive: true });
  doc.addEventListener('pointerup', up, { capture: true, passive: true });
  doc.addEventListener('pointercancel', cancel, { capture: true, passive: true });
  landscape.addEventListener('change', portrait);
  return () => {
    doc.removeEventListener('pointerdown', down, true);
    doc.removeEventListener('pointerup', up, true);
    doc.removeEventListener('pointercancel', cancel, true);
    win.removeEventListener('blur', clear);
    win.removeEventListener('pagehide', clear);
    doc.removeEventListener('visibilitychange', visibility);
    doc.removeEventListener('fullscreenchange', fullscreenChange);
    active.clear();
    landscape.removeEventListener('change', portrait);
  };
}

/** The shared HTML entry must not advertise the phone installation on the TV. */
export function installPhoneManifest(doc: Document): () => void {
  const manifest = doc.createElement('link');
  manifest.rel = 'manifest'; manifest.href = '/manifest.webmanifest';
  const nodes: HTMLElement[] = [manifest];
  for (const name of ['apple-mobile-web-app-capable', 'mobile-web-app-capable']) {
    const meta = doc.createElement('meta'); meta.name = name; meta.content = 'yes'; nodes.push(meta);
  }
  doc.head.append(...nodes);
  return () => { nodes.forEach(node => { node.remove(); }); };
}
