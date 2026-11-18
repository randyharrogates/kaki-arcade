import { retainOutgoing } from './fade-layers';
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Tempo } from '@kaki/ui';
import { crossfade, enter, exit } from '@kaki/ui';
import { lobbyMotion } from './lobby-motion';

/** Wipes coalesce; crossfades present the latest state immediately, retaining outgoing ink. */
function MaskOverlap({ identity, children, row, index = 0, fade = false }: {
  identity: string; children: ComponentChildren; row?: boolean; index?: number; fade?: boolean;
}) {
  const [frames, setFrames] = useState({ identity, current: children, old: null as ComponentChildren });
  const latest = useRef(children);
  const animating = useRef(true);
  const incoming = useRef<HTMLDivElement>(null);
  const outgoing = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (frames.identity === identity) latest.current = children;
    else if (fade || !animating.current) setFrames({ identity, current: children, old: latest.current });
  }, [identity, children, frames, fade]);
  useLayoutEffect(() => {
    const element = incoming.current;
    latest.current = frames.current;
    if ((fade && !frames.old) || !element?.animate) { animating.current = false; setFrames(f => f.old ? { ...f, old: null } : f); return; }
    animating.current = true;
    const { incoming: motion, outgoing: oldMotion } = fade ? { incoming: enter({ kind: 'fade', tempo: 'slow' }), outgoing: exit({ kind: 'fade', tempo: 'slow' }) } : lobbyMotion(row ?? false, index);
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
    {frames.old && <div class="outgoing" ref={outgoing} aria-hidden="true" inert>{frames.old}</div>}
    <div class="incoming" ref={incoming}>{frames.identity === identity ? children : latest.current}</div>
  </div>;
}

/** Each outgoing layer owns its exit, including when another heading arrives mid-fade. */
export function Overlap(props: Omit<Parameters<typeof MaskOverlap>[0], 'children'> & { children: ComponentChildren | ((active: boolean) => ComponentChildren); surface?: boolean; tempo?: Tempo }) {
  return props.fade ? <FadeOverlap tempo={props.tempo ?? 'slow'} identity={props.identity} surface={props.surface ?? false}>{props.children}</FadeOverlap> : <MaskOverlap identity={props.identity} row={props.row ?? false} index={props.index ?? 0} children={renderLayer(props.children, true)}/>;
}
function renderLayer(content: LayerContent, active: boolean): ComponentChildren {
  return typeof content === 'function' ? (content as (active: boolean) => ComponentChildren)(active) : content;
}
type LayerContent = ComponentChildren | ((active: boolean) => ComponentChildren);
function FadeOverlap({ identity, children, surface = false, tempo = 'slow' }: { identity: string; children: LayerContent; surface?: boolean; tempo?: Tempo }) {
  const [layers, setLayers] = useState<{ id: number; content: LayerContent }[]>([]);
  const current = useRef({ identity, children, id: 0 });
  if (current.current.identity !== identity) {
    const previous = current.current;
    setLayers(old => retainOutgoing(old, { id: previous.id, content: previous.children }));
    current.current = { identity, children, id: previous.id + 1 };
  } else current.current.children = children;
  return <div class="overlap">
    {[...layers.map(layer => <FadeLayer tempo={tempo} key={layer.id} surface={surface} outgoing done={() => { setLayers(old => old.filter(item => item.id !== layer.id)); }}>{layer.content}</FadeLayer>),
      <FadeLayer tempo={tempo} key={current.current.id} surface={surface} initial={current.current.id === 0}>{children}</FadeLayer>] }
  </div>;
}
function FadeLayer({ children, outgoing = false, initial = false, surface = false, tempo = 'slow', done }: { children: LayerContent; surface?: boolean; outgoing?: boolean; initial?: boolean; done?: () => void; tempo?: Tempo }) {
  const element = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (initial && !outgoing) return;
    if (!element.current?.animate) { done?.(); return; }
    const motion = surface ? crossfade()[outgoing ? 'outgoing' : 'incoming'] : (outgoing ? exit : enter)({ kind: 'fade', tempo });
    const slow = import.meta.env.DEV ? Math.max(1, Number(new URLSearchParams(location.search).get('slow')) || 1) : 1;
    motion.options.duration *= slow;
    const animation = element.current.animate(motion.keyframes, motion.options);
    animation.onfinish = () => { done?.(); };
    return () => { animation.cancel(); };
  }, [outgoing]);
  return <div ref={element} class={`${outgoing ? 'outgoing' : 'incoming'}${surface ? ' ka-surface' : ''}`} aria-hidden={outgoing || undefined} inert={outgoing || undefined}>{renderLayer(children, !outgoing)}</div>;
}
