import type { VNode } from 'preact';
import { crossfade, reducedMotion, THEMES } from '@kaki/ui';
import { useLayoutEffect, useRef } from 'preact/hooks';

export function GameFinalHint({ theme = THEMES.console, keyboard }: { theme?: typeof THEMES.console | undefined; keyboard: boolean }): VNode<{ children: VNode<{ style: { color: string; fontSize: string }; children: string }> }> {
  const layer = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reducedMotion() || !layer.current?.animate) return;
    const motion = crossfade().incoming;
    const slow = import.meta.env.DEV ? Math.max(1, Number(new URLSearchParams(location.search).get('slow')) || 1) : 1;
    motion.options.duration *= slow;
    const animation = layer.current.animate(motion.keyframes, motion.options);
    return () => { animation.cancel(); };
  }, []);
  return <div ref={layer} class="game-final-layer"><p class="game-final-hint" style={{ color: theme.background.secondary, fontSize: 'var(--ka-type-34)' }}>{keyboard ? 'Enter: Continue' : 'The leader continues on their phone'}</p></div>;
}
