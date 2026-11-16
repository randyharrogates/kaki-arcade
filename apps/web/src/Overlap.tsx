import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { lobbyMotion } from './lobby-motion';

/** Finish each wipe before presenting a newer identity; interruptions coalesce to the latest. */
export function Overlap({ identity, children, row, index = 0 }: {
  identity: string; children: ComponentChildren; row?: boolean; index?: number;
}) {
  const [frames, setFrames] = useState({ identity, current: children, old: null as ComponentChildren });
  const latest = useRef(children);
  const animating = useRef(true);
  const incoming = useRef<HTMLDivElement>(null);
  const outgoing = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (frames.identity === identity) latest.current = children;
    else if (!animating.current) setFrames({ identity, current: children, old: latest.current });
  }, [identity, children, frames]);
  useLayoutEffect(() => {
    const element = incoming.current;
    latest.current = frames.current;
    if (!element?.animate) { animating.current = false; setFrames(f => f.old ? { ...f, old: null } : f); return; }
    animating.current = true;
    const { incoming: motion, outgoing: oldMotion } = lobbyMotion(row ?? false, index);
    const slow = import.meta.env.DEV ? Math.max(1, Number(new URLSearchParams(location.search).get('slow')) || 1) : 1;
    motion.options.duration = motion.options.duration * slow;
    oldMotion.options.duration = oldMotion.options.duration * slow;
    motion.options.delay *= slow;
    oldMotion.options.delay *= slow;
    const animation = element.animate(motion.keyframes, motion.options);
    const oldAnimation = outgoing.current?.animate(oldMotion.keyframes, oldMotion.options);
    animation.onfinish = () => { animating.current = false; setFrames(f => ({ ...f, old: null })); };
    return () => { animation.cancel(); oldAnimation?.cancel(); };
    // Each identity owns its timing, even if a newer update arrives during its wipe.
  }, [frames.identity]);
  return <div class="overlap">
    {frames.old && <div class="outgoing" ref={outgoing} aria-hidden="true">{frames.old}</div>}
    <div class="incoming" ref={incoming}>{frames.identity === identity ? children : latest.current}</div>
  </div>;
}
