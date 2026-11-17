/// <reference lib="dom" />
import { createElement as h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { routeStick } from './stick-model';
import type { StickPointer, Vector, StickEvent } from './stick-model';

export interface StickProps { onChange: (vector: Vector) => void }
/** Imperative routing shared by the component and DOM-free routing tests. */
export function stickHandlers(area: HTMLDivElement, disc: HTMLDivElement, thumb: HTMLDivElement, change: StickProps['onChange'], reduced: () => boolean) {
  let state: StickPointer | null = null;
  let lastAngle = 0;
  const handle = (type: StickEvent['type'], event: PointerEvent) => {
    if (type === 'down' && event.pointerType === 'mouse' && event.button !== 0) return;
    const bounds = type === 'down' && !state ? area.getBoundingClientRect() : null;
    const rect = bounds ? { left: bounds.left + area.clientLeft, top: bounds.top + area.clientTop,
      width: bounds.width - 2 * area.clientLeft, height: bounds.height - 2 * area.clientTop } : state?.area;
    if (!rect) return;
    const result = routeStick(state, { type, pointerId: event.pointerId, position: { x: event.clientX, y: event.clientY }, area: rect });
    if (!result.output) return;
    if (event.cancelable) event.preventDefault();
    if (type === 'down' && result.state) {
      try { area.setPointerCapture(event.pointerId); } catch { return; }
    }
    state = result.state;
    if (type === 'down' && state) {
      disc.style.left = `${String(state.anchor.x - rect.left)}px`;
      disc.style.top = `${String(state.anchor.y - rect.top)}px`;
      disc.style.width = disc.style.height = `${String(result.output.radius * 2)}px`;
    }
    area.dataset.held = String(state !== null);
    const output = result.output;
    if (state) lastAngle = output.angle;
    const angle = lastAngle;
    thumb.style.transform = `translate(${String(output.offset.x)}px, ${String(output.offset.y)}px) rotate(${String(angle)}rad) scaleX(${String(reduced() ? 1 : output.stretch)}) rotate(${String(-angle)}rad)`;
    if (!state && area.hasPointerCapture(event.pointerId)) area.releasePointerCapture(event.pointerId);
    change(output.vector);
  };
  const cancel = () => {
    if (state) handle('cancel', { pointerId: state.pointerId, clientX: state.anchor.x, clientY: state.anchor.y } as PointerEvent);
  };
  const pointerCancel = (event: PointerEvent) => { handle('cancel', event); };
  return { handle, cancel, onPointerCancel: pointerCancel, onLostPointerCapture: pointerCancel };
}
export function installStickCancellation(doc: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>, win: Pick<Window, 'addEventListener' | 'removeEventListener'>, cancel: () => void) {
  const visibility = () => { if (doc.hidden) cancel(); };
  doc.addEventListener('visibilitychange', visibility);
  win.addEventListener('blur', cancel); win.addEventListener('pagehide', cancel); win.addEventListener('resize', cancel);
  return () => {
    doc.removeEventListener('visibilitychange', visibility);
    win.removeEventListener('blur', cancel); win.removeEventListener('pagehide', cancel); win.removeEventListener('resize', cancel);
  };
}
/** Import stick.css alongside this component. No state/render or rAF in the input path. */
export function Stick({ onChange }: StickProps) {
  const root = useRef<HTMLDivElement>(null); const base = useRef<HTMLDivElement>(null); const knob = useRef<HTMLDivElement>(null);
  const handlers = useRef<ReturnType<typeof stickHandlers> | null>(null);
  const callback = useRef(onChange); callback.current = onChange;
  useEffect(() => {
    if (!root.current || !base.current || !knob.current) return;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = query.matches;
    const update = () => { reduced = query.matches; };
    query.addEventListener('change', update);
    const routing = stickHandlers(root.current, base.current, knob.current, vector => { callback.current(vector); }, () => reduced);
    handlers.current = routing;
    const stop = installStickCancellation(document, window, routing.cancel);
    return () => { stop(); query.removeEventListener('change', update); routing.cancel(); handlers.current = null; };
  }, []);
  const handle = (type: StickEvent['type'], event: PointerEvent) => { handlers.current?.handle(type, event); };
  return h('div', { ref: root, class: 'ka-stick', 'data-held': 'false', 'aria-label': 'Left stick',
    onPointerDown: (e: PointerEvent) => { handle('down', e); }, onPointerMove: (e: PointerEvent) => { handle('move', e); },
    onPointerUp: (e: PointerEvent) => { handle('up', e); }, onPointerCancel: (e: PointerEvent) => { handlers.current?.onPointerCancel(e); },
    onLostPointerCapture: (e: PointerEvent) => { handlers.current?.onLostPointerCapture(e); } },
  h('div', { ref: base, class: 'ka-stick-base', 'aria-hidden': 'true' }, h('div', { ref: knob, class: 'ka-stick-knob' })));
}
