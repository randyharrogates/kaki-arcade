import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Overlap } from './Overlap';
import type { HostScreen, MountedHostScreen, ScreenProps } from './session-adapter';

/** Mount imperative renderers once; await their preparation before simulation. */
export function HostGameScreen({ Screen, ready, starting, ...options }: ScreenProps & { Screen: HostScreen; ready?: ((error?: unknown) => void) | undefined; starting?: ComponentChildren }) {
  if ('mount' in Screen) return <MountedScreen Screen={Screen} ready={ready} starting={starting} {...options}/>;
  return <Screen {...options}/>;
}
function MountedScreen({ Screen, ready, starting, ...options }: ScreenProps & { Screen: MountedHostScreen; ready?: ((error?: unknown) => void) | undefined; starting?: ComponentChildren }) {
  const [loading, setLoading] = useState(true);
  const root = useMemo(() => document.createElement('div'), [Screen]);
  const mounted = useRef<ReturnType<MountedHostScreen['mount']> | undefined>(undefined);
  useLayoutEffect(() => {
    let active = true;
    const screen = Screen.mount(root, options);
    mounted.current = screen;
    void screen.ready.then(() => { if (active) { setLoading(false); ready?.(); } }, (error: unknown) => { if (active) ready?.(error); });
    return () => { active = false; mounted.current = undefined; screen.destroy(); };
  }, [Screen, root]);
  useLayoutEffect(() => { mounted.current?.update(options); }, [options.view, options.width, options.height, options.sound, options.soundHistory, options.detail]);
  const attach = (element: HTMLDivElement | null): void => { if (element) element.appendChild(root); };
  return <div class="mounted-game-screen">
    {loading && <div class="mounted-game-preparation" ref={attach}/>}
    <Overlap fade surface identity={loading ? 'starting' : 'ready'}>{loading ? starting : <div ref={attach}/>}</Overlap>
  </div>;
}
