/// <reference lib="dom" />
import { createElement as h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { SHAPE_BUTTONS, SHAPE_STROKE, colourTokenVar, crossfade, press, pressScale, cardTurn, reducedMotion } from '@kaki/ui';
import { PRIVATE_TEXT_STEPS, PRIVATE_STAT_STEPS, optionLabelStep } from '@kaki/platform/private-placement';
import { PHONE } from '@kaki/platform/layout';
import type { Size } from '@kaki/ui';
import { Stick } from './stick';
import { DPad } from './buttons';
import { bindControlEvents, controlHit, vibratePress } from './button-input';
import { placeController, privateBlocks } from './private-panel';
import { measureLabelTypeStep, measureOptionWidth } from './layout-label';
import { faceShape, layoutOutput, revisionProblem, layoutTapSignature } from './layout-types';
import type { Item, Layout, LayoutPart, LayoutOutput, LayoutValue, PrivateView, PanelBlock } from './layout-types';
export interface LayoutEngineProps { layout: Layout; privateView?: PrivateView | null; area: Size; viewport: Size; isLeader?: boolean; onOutput: (output: LayoutOutput) => void; onRevisionProblem?: (problem: string) => void }
function shape(face: keyof typeof faceShape | undefined) {
  if (!face) return null;
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, h('path', { d: SHAPE_BUTTONS[faceShape[face]].path, 'stroke-width': SHAPE_STROKE }));
}
function Target(props: { labelStep?:34|21; id: string; label: string; content?: ComponentChildren; item?: Item; face?: keyof typeof faceShape; disabled?: boolean; held?: boolean; output(phase: LayoutOutput['phase'], value: LayoutValue): void; value: LayoutValue }) {
  const root = useRef<HTMLButtonElement>(null);
  const latest = useRef(props); latest.current = props;
  const disabled = props.disabled === true || props.item?.state === 'disabled';
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    let release: (() => void) | undefined;
    const feedback = (held: boolean) => {
      node.getAnimations().forEach(a => { a.cancel(); });
      node.style.transform = `scale(${String(pressScale(held))})`;
      node.dataset.held = String(held);
      if (!held) { const motion = press(false); if (motion.options.duration) node.animate(motion.keyframes, motion.options); }
    };
    return bindControlEvents(node, window, document, {
      hit: event => (latest.current.item?.state === 'disabled' && !latest.current.held) ? null : controlHit([node], event, Boolean(latest.current.face && latest.current.held)),
      onPress: () => {
        const p = latest.current;
        feedback(true); vibratePress();
        if (p.held) { p.output('press', true); release = () => { p.output('release', false); }; }
        else p.output('choose', p.value);
      },
      onRelease: () => { feedback(false); release?.(); release = undefined; },
    });
  }, []);
  useLayoutEffect(() => {
    const button = root.current;
    const label = button?.querySelector<HTMLElement>(':scope > span');
    if (!button || !label || !button.closest('.ka-layout-options, .ka-layout-grid')) return;
    const measure = () => {
      button.dataset.labelStep = '34';
      button.style.fontSize = 'var(--ka-phone-type-34)';
      label.style.width = 'fit-content';
      button.dataset.labelStep = String(Math.min(props.labelStep ?? 34,measureLabelTypeStep(button,label)));
      button.style.fontSize = `var(--ka-phone-type-${button.dataset.labelStep})`;
      // Shrink the wrapped span to its longest rendered line so the shape sits
      // beside the text rather than beside an otherwise empty full-width span.
      const range = document.createRange(); range.selectNodeContents(label);
      const lineWidth = Math.max(0,...[...range.getClientRects()].map(r => r.width));
      if (lineWidth) label.style.width = `${String(Math.ceil(lineWidth))}px`;

    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(button);
    let active = true; void document.fonts.ready.then(() => { if (active) measure(); });
    document.fonts.addEventListener('loadingdone',measure);
    return () => { active = false; observer.disconnect(); document.fonts.removeEventListener('loadingdone',measure); };
  }, [props.labelStep,props.label, props.face]);
  return h('button', { ref: root, type: 'button', class: `ka-layout-target${props.item?.faceDown ? ' ka-layout-card-back' : ''}${props.face && !props.item?.faceDown ? ` ka-kit-${faceShape[props.face]}` : ''}${props.held && props.face && !props.item?.faceDown ? ' ka-layout-face' : ''}`, 'data-target': props.id, 'data-control': props.id, 'data-held': 'false', 'data-state': props.item?.state ?? 'plain', 'data-focus': String(props.item?.focus === true), 'aria-disabled':disabled, 'aria-label': props.label, 'aria-pressed': props.item?.state === undefined ? undefined : props.item.state === 'selected', style: props.item?.colour && !disabled && !props.item.faceDown ? { background: colourTokenVar(props.item.colour) } : undefined }, props.item?.faceDown ? null : shape(props.face), h('span', null, props.item?.faceDown ? null : props.content ?? props.label));
}
function Part({ control: c, layout, output, width, height, gap, readOnly = false }: { readOnly?:boolean; control: LayoutPart; layout: Layout; output: LayoutEngineProps['onOutput']; width:number; height:number; gap:number }) {
  const send = (phase: LayoutOutput['phase'], value: LayoutValue) => { output(layoutOutput(layout,c.id,phase,value)); };
  const latest = useRef(send); latest.current = send;
  const gesture = useRef<typeof send | null>(null);
  const directions = useRef(new Map<string,typeof send>());
  let content: ComponentChildren = null;
  if (c.kind === 'stick') content = h(Stick, { onChange: vector => {
    gesture.current ??= latest.current;
    gesture.current('change',vector);
    if (!vector.x && !vector.y) gesture.current = null;
  } });
  if (c.kind === 'dpad') content = h(DPad, { size:(width-2*gap)/3, height:(height-2*gap)/3, onPress: direction => { directions.current.set(direction,send); send('press',direction.toLowerCase()); }, onRelease: direction => { directions.current.get(direction)?.('release',direction.toLowerCase()); directions.current.delete(direction); } });
  if (c.kind === 'button') content = h(Target, { id:c.id, label:c.label, disabled:c.disabled === true, held:true, value:true, output:send, item: c.colour ? { colour:c.colour } : {}, ...(c.button.startsWith('face') ? { face:c.button as keyof typeof faceShape } : {}) });
  if (c.kind === 'text') content = h('div', { class:`ka-layout-text ka-layout-${c.tone ?? 'body'}` }, h('span',null,c.text));
  if (c.kind === 'options' || c.kind === 'grid' || c.kind === 'cards') {
    const items = c.kind === 'options' ? c.options : c.kind === 'grid' ? c.cells : c.cards;
    content = h('div', { class:`ka-layout-items ka-layout-${c.kind}`, style: { gridTemplateColumns: c.kind === 'cards' ? `repeat(${String(items.length)}, 1fr)` : `repeat(${String(c.kind === 'grid' ? c.cols : Math.min(2,items.length))}, 1fr)` } }, ...items.map((item,index) => {
      const label = item.faceDown ? c.kind === 'grid' ? `Card ${String(index+1)}` : 'Hidden card' : item.label ?? '';
      const mark = ({ spade:'♠',heart:'♥',club:'♣',diamond:'♦' } as Record<string,string>)[item.mark ?? ''] ?? item.mark;
      const content = c.kind === 'cards' && !item.faceDown ? h('span',{ class:'ka-layout-card-face' },h('span',null,item.label),h('span',null,mark)) : item.faceDown ? null : label;
      if ((c.kind === 'cards' && !c.tappable) || (c.kind === 'grid' && readOnly)) return h('div', { key:item.id ?? index, class:'ka-layout-card', 'data-state':item.state, 'data-focus':String(item.focus === true), style:item.colour && !item.faceDown ? { background:colourTokenVar(item.colour) } : undefined, 'aria-label':label, ...(item.faceDown ? { role:'img', class:'ka-layout-card ka-layout-card-back' } : {}) },c.kind === 'grid' ? h('span',{ class:'ka-private-grid-label' },content) : content);
      const columns = c.kind === 'grid' ? c.cols : c.kind === 'options' ? Math.min(2,items.length) : items.length;
      const rows = c.kind === 'grid' ? c.rows : c.kind === 'options' ? Math.ceil(items.length/2) : 1;
      const labelStep = c.kind === 'options' ? optionLabelStep(label,(width-(columns-1)*gap)/columns,(height-(rows-1)*gap)/rows,Boolean(item.face),items.length === 1) ?? 21 : undefined;
      return h(Target, { ...(labelStep ? { labelStep } : {}), key:item.id ?? index, id:`${c.id}:${item.id ?? String(index)}`, label:label || `Cell ${String(index+1)}`, content, item, value:c.kind === 'grid' ? index : item.id ?? '', output:send, ...(item.face ? { face:item.face } : {}) });
    }));
  }
  // Sensor and gesture acquisition belongs to K-06; these declarations draw no fake input.
  return h('div', { class:'ka-layout-content', 'data-kind':c.kind },content);
}
function PrivateBlock({ block,layout,gap }: { block:PanelBlock; layout:Layout; gap:number }) {
  const root = useRef<HTMLDivElement>(null);
  const oldCards = useRef<readonly Item[]>([]);
  const cardSnapshots = useRef<HTMLElement[]>([]);
  useLayoutEffect(() => {
    root.current?.querySelectorAll('.ka-private-card-side').forEach(node => { node.remove(); });
    const cards = [...(root.current?.querySelectorAll<HTMLElement>('.ka-layout-card') ?? [])];
    cards.forEach(node => { node.getAnimations().forEach(animation => { animation.cancel(); }); });
    const nextSnapshots = cards.map(node => node.cloneNode(true) as HTMLElement);
    if (block.kind === 'cards') {
      block.cards.forEach((card,index) => {
        const node = cards[index], back = cardSnapshots.current[index];
        if (node && back && !card.faceDown && oldCards.current.find(c => c.id === card.id)?.faceDown && !reducedMotion()) {
          // The outgoing side stays on the same turning object until it is edge-on.
          Object.assign(back.style,{ position:'absolute',inset:'0',width:'100%',height:'100%' });
          back.classList.add('ka-private-card-side');
          back.inert = true; back.setAttribute('aria-hidden','true');
          node.append(back);
          const motion = cardTurn();
          const turn = node.animate(motion.card.keyframes,motion.card.options);
          back.animate(motion.back.keyframes,motion.back.options);
          node.querySelector('.ka-layout-card-face')?.animate(motion.face.keyframes,motion.face.options);
          void turn.finished.then(() => { back.remove(); },() => { back.remove(); });
        }
      });
      oldCards.current = block.cards;
    }
    cardSnapshots.current = nextSnapshots;
  }, [block]);
  if (block.kind === 'stat') return h('div',{ class:'ka-private-stat' },h('span',{ class:'ka-private-stat-label' },block.label),h('span',{ class:'ka-private-stat-value' },String(block.value)));
  const control: LayoutPart = { ...block,id:'private:block' };
  return h('div',{ ref:root,class:'ka-layout-content' },h(Part,{ control,layout,readOnly:true,output:() => { /* Read-only blocks cannot emit input. */ },width:0,height:0,gap }));
}
/** Stable keys preserve held controls. Removed parts unmount and release before their inert
 * visual snapshot exits; snapshots can never produce input. Import layout.css too. */
export function LayoutEngine(props: LayoutEngineProps) {
  const root = useRef<HTMLDivElement>(null);
  const [panelFits,setPanelFits] = useState(true);
  const measurePrivate = useRef<(() => void) | null>(null);
  const previous = useRef<Layout | null>(null);
  const snapshot = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const problem = previous.current ? revisionProblem(previous.current,props.layout) : null;
    if (problem) props.onRevisionProblem?.(problem);
    previous.current = props.layout;
  }, [props.layout,props.onRevisionProblem]);
  // A single option needs its unwrapped label, icon, gaps, padding and borders.
  // Measure the real font rather than estimating character widths.
  const presentation = useMemo(() => props.layout.controls.map(c => `${c.id}:${c.kind}:${c.kind === 'text' ? `${c.tone ?? 'body'}:${c.text}` : c.kind === 'options' ? c.options.map(o => `${o.face ?? ''}:${o.label}`).join('|') : ''}`).join('|'), [props.layout]);
  const [optionWidths, setOptionWidths] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const labels = [...node.querySelectorAll<HTMLElement>('.ka-layout-options > :only-child > span, .ka-layout-text > span')];
    const measure = () => {
      const widths: Record<string, number> = {};
      labels.forEach(label => {
        if (label.parentElement?.classList.contains('ka-layout-text')) {
          const id = label.closest<HTMLElement>('[data-part]')?.dataset.part;
          if (id) widths[id] = label.scrollHeight;
          return;
        }
        const button = label.parentElement;
        const id = button?.closest<HTMLElement>('[data-part]')?.dataset.part;
        if (!button || !id) return;
        widths[id] = measureOptionWidth(button,label);
      });
      setOptionWidths(old => Object.keys(old).length === Object.keys(widths).length && Object.entries(widths).every(([key,value]) => old[key] === value) ? old : widths);
    };
    measure();
    const observer = new ResizeObserver(measure);
    labels.forEach(label => { observer.observe(label); });
    let active = true; void document.fonts.ready.then(() => { if (active) measure(); });
    document.fonts.addEventListener('loadingdone',measure);
    return () => { active = false; observer.disconnect(); document.fonts.removeEventListener('loadingdone',measure); };
  }, [presentation,props.area.width,props.isLeader]);
  const placement = placeController(props.layout,props.privateView,props.area,props.isLeader ?? false,optionWidths,props.viewport);
  useLayoutEffect(() => {
    const panel = root.current?.querySelector<HTMLElement>(':scope > .ka-private-panel:not(.ka-private-ghost)');
    if (!panel) { setPanelFits(true); return; }
    const measure = () => {
      // Decoration must not influence descendant queries or the panel scroll box.
      const ghosts = [...panel.querySelectorAll<HTMLElement>('.ka-private-ghost')];
      const anchors = ghosts.map(ghost => { const anchor = document.createComment('private ghost'); ghost.replaceWith(anchor); return anchor; });
      panel.style.visibility = 'hidden';
      const fitsBox = (node:HTMLElement) => node.scrollHeight <= node.clientHeight && node.scrollWidth <= node.clientWidth;
      const choose = (node:HTMLElement,steps:readonly number[]) => {
        for (const step of steps) {
          node.style.fontSize = `var(--ka-phone-type-${String(step)})`;
          if (fitsBox(node)) return true;
        }
        return false;
      };
      const labels = [...panel.querySelectorAll<HTMLElement>('.ka-layout-text')];
      const stats = [...panel.querySelectorAll<HTMLElement>('.ka-private-stat-value')];
      const grids = [...panel.querySelectorAll<HTMLElement>('.ka-private-grid-label')];
      const textFits = labels.map(node => choose(node,PRIVATE_TEXT_STEPS)).every(Boolean);
      const statFits = stats.map(node => choose(node,PRIVATE_STAT_STEPS)).every(Boolean);
      const gridFits = [...panel.querySelectorAll<HTMLElement>('.ka-layout-grid')].every(grid => {
        const labels = grids.filter(label => grid.contains(label));
        return PRIVATE_TEXT_STEPS.some(step => {
          labels.forEach(label => { label.style.fontSize = `var(--ka-phone-type-${String(step)})`; });
          return labels.every(fitsBox);
        });
      });
      const statLabelsFit = [...panel.querySelectorAll<HTMLElement>('.ka-private-stat-label')].every(fitsBox);
      const fits = textFits && statFits && gridFits && statLabelsFit && fitsBox(panel);
      ghosts.forEach((ghost,index) => { anchors[index]?.replaceWith(ghost); });
      panel.style.visibility = fits ? '' : 'hidden';
      setPanelFits(fits);
    };
    measurePrivate.current = measure;
    measure();
    const observer = new ResizeObserver(measure); observer.observe(panel);
    let active = true; void document.fonts.ready.then(() => { if (active) measure(); });
    document.fonts.addEventListener('loadingdone',measure);
    return () => { measurePrivate.current = null; active = false; observer.disconnect(); document.fonts.removeEventListener('loadingdone',measure); };
  }, [props.privateView,props.area.width,props.area.height,props.isLeader,placement.panel?.width]);
  const blocks = privateBlocks(props.privateView,props.isLeader ?? false);
  const privateTransition = JSON.stringify(blocks);
  const privateFades = useRef(new Set<() => void>());
  const privateSnapshot = useRef<{ node:HTMLElement | null; reveal:boolean; changed:number[]; kinds:PanelBlock['kind'][] } | null>(null);
  const capturedPrivate = useRef({ key:privateTransition,blocks });
  if (capturedPrivate.current.key !== privateTransition) {
    privateFades.current.forEach(finish => { finish(); });
    const reveal = blocks.some((block,index) => {
      const before = capturedPrivate.current.blocks[index];
      return block.kind === 'cards' && before?.kind === 'cards' && block.cards.some(card => !card.faceDown && before.cards.find(old => old.id === card.id)?.faceDown);
    });
    const changed = Array.from({ length:Math.max(blocks.length,capturedPrivate.current.blocks.length) },(_,index) => JSON.stringify(blocks[index]) !== JSON.stringify(capturedPrivate.current.blocks[index]) ? index : -1).filter(index => index >= 0);
    privateSnapshot.current = { changed,kinds:capturedPrivate.current.blocks.map(block => block.kind),node:root.current?.querySelector<HTMLElement>(':scope > .ka-private-panel:not(.ka-private-ghost)')?.cloneNode(true) as HTMLElement | null,reveal };
    const live = root.current?.querySelector<HTMLElement>(':scope > .ka-private-panel:not(.ka-private-ghost)');
    [...(privateSnapshot.current.node?.children ?? [])].forEach((node,index) => {
      const source = live?.children[index];
      if (node instanceof HTMLElement && source instanceof HTMLElement) Object.assign(node.style,{ left:`${String(source.offsetLeft)}px`,top:`${String(source.offsetTop)}px`,width:`${String(source.offsetWidth)}px`,height:`${String(source.offsetHeight)}px` });
    });
    capturedPrivate.current = { key:privateTransition,blocks };
  }
  useLayoutEffect(() => {
    const panel = root.current?.querySelector<HTMLElement>(':scope > .ka-private-panel:not(.ka-private-ghost)');
    const captured = privateSnapshot.current;
    const old = captured?.node;
    privateSnapshot.current = null;
    if (!old || !panel || reducedMotion()) return;
    const motion = crossfade();
    const oldBlocks = [...old.children].filter(node => !node.classList.contains('ka-private-ghost'));
    const newBlocks = [...panel.children].filter(node => !node.classList.contains('ka-private-ghost'));
    const arrangementChanged = captured.kinds.some((kind,index) => kind !== blocks[index]?.kind) || (['left','top','width','height'] as const).some(property => old.style[property] !== panel.style[property]) || oldBlocks.length !== newBlocks.length || oldBlocks.some((node,index) => {
      const incoming = newBlocks[index];
      return !(node instanceof HTMLElement) || !(incoming instanceof HTMLElement) ||
        node.style.left !== `${String(incoming.offsetLeft)}px` || node.style.top !== `${String(incoming.offsetTop)}px` ||
        node.style.width !== `${String(incoming.offsetWidth)}px` || node.style.height !== `${String(incoming.offsetHeight)}px`;
    });
    // Stable card arrangements reveal by turning the same object.
    if (captured.reveal && !arrangementChanged) return;
    const fade = (outgoing:HTMLElement,incoming:HTMLElement,container:HTMLElement) => {
      outgoing.classList.add('ka-private-ghost'); outgoing.inert = true; outgoing.setAttribute('aria-hidden','true');
      const surface = root.current?.querySelector<HTMLElement>('.ka-layout-surface');
      const original = { position:incoming.style.position,zIndex:incoming.style.zIndex,backgroundColor:incoming.style.backgroundColor,backgroundImage:incoming.style.backgroundImage,backgroundSize:incoming.style.backgroundSize,backgroundPosition:incoming.style.backgroundPosition };
      if (surface) {
        const css = getComputedStyle(surface), origin = surface.getBoundingClientRect(), box = incoming.getBoundingClientRect();
        Object.assign(incoming.style,{ zIndex:'1',backgroundColor:css.backgroundColor,backgroundImage:css.backgroundImage,backgroundSize:css.backgroundSize,backgroundPosition:css.backgroundPosition.split(',').map(position => {
          const [x = '0px',y = '0px'] = position.trim().split(/\s+(?![^()]*\))/);
          return `calc(${x} - ${String(box.left-origin.left)}px) calc(${y} - ${String(box.top-origin.top)}px)`;
        }).join(',') });
        if (incoming !== panel) incoming.style.position = 'relative';
      }
      container.insertBefore(outgoing,incoming);
      if (incoming === panel && surface) {
        const css = getComputedStyle(surface), origin = surface.getBoundingClientRect(), box = outgoing.getBoundingClientRect();
        Object.assign(outgoing.style,{ backgroundColor:css.backgroundColor,backgroundImage:css.backgroundImage,backgroundSize:css.backgroundSize,backgroundPosition:css.backgroundPosition.split(',').map(position => {
          const [x = '0px',y = '0px'] = position.trim().split(/\s+(?![^()]*\))/);
          return `calc(${x} - ${String(box.left-origin.left)}px) calc(${y} - ${String(box.top-origin.top)}px)`;
        }).join(',') });
      }
      outgoing.style.zIndex = '0';
      const animation = incoming.animate(motion.incoming.keyframes,motion.incoming.options);
      const leaving = outgoing.animate(motion.outgoing.keyframes,motion.outgoing.options);
      let active = true;
      const finish = () => {
        if (!active) return;
        active = false; privateFades.current.delete(finish);
        animation.cancel(); leaving.cancel(); outgoing.remove(); Object.assign(incoming.style,original); measurePrivate.current?.();
      };
      privateFades.current.add(finish);
      void animation.finished.then(finish,finish);
    };
    if (arrangementChanged && root.current) {
      fade(old,panel,root.current);
      return;
    }
    captured.changed.forEach(index => {
      const outgoing = oldBlocks[index], incoming = newBlocks[index];
      if (!(outgoing instanceof HTMLElement) || !(incoming instanceof HTMLElement)) return;
      outgoing.classList.add('ka-private-ghost'); outgoing.inert = true; outgoing.setAttribute('aria-hidden','true');
      Object.assign(outgoing.style,{ position:'absolute',left:`${String(incoming.offsetLeft)}px`,top:`${String(incoming.offsetTop)}px`,width:`${String(incoming.offsetWidth)}px`,height:`${String(incoming.offsetHeight)}px` });
      fade(outgoing,incoming,panel);
    });
  }, [privateTransition]);
  const transition = useMemo(() => layoutTapSignature(props.layout) + props.layout.controls.map(c => `${c.id}:${c.kind}:${c.audience ?? 'everyone'}:${c.kind === 'button' ? c.button : ''}`).join('|'), [props.layout]);
  // Capture the outgoing DOM only when its tap meaning changes, before reconciliation.
  const capturedTransition = useRef(transition);
  if (capturedTransition.current !== transition) {
    snapshot.current = root.current?.cloneNode(true) as HTMLElement | null;
    capturedTransition.current = transition;
  }
  const previousTransition = useRef(transition);
  const priorControls = useRef<readonly LayoutPart[]>([]);
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    // Repaint the shell's single treatment at the same origin, including its header offset.
    // An opaque base prevents multiple translucent patterns accumulating during overlap.
    const refreshSurface = () => {
      const surface = node.querySelector<HTMLElement>('.ka-layout-surface');
      const shell = node.closest('.ka-controller-shell') ?? node.parentElement;
      if (surface && shell) {
        const css = getComputedStyle(shell);
        const origin = shell.getBoundingClientRect(), box = node.getBoundingClientRect();
        Object.assign(surface.style, {
          backgroundColor: css.backgroundColor, backgroundImage: css.backgroundImage,
          backgroundSize: css.backgroundSize,
          backgroundPosition: css.backgroundPosition.split(',').map(position => {
            const [x = '0px', y = '0px'] = position.trim().split(/\s+/);
            return `calc(${x} + ${String(origin.left-box.left)}px) calc(${y} + ${String(origin.top-box.top)}px)`;
          }).join(','),
        });
      }
    };
    refreshSurface();
    const observer = new ResizeObserver(refreshSurface);
    observer.observe(node);
    const shell = node.closest('.ka-controller-shell');
    if (shell) observer.observe(shell);
    window.addEventListener('resize',refreshSurface);
    return () => { observer.disconnect(); window.removeEventListener('resize',refreshSurface); };
  }, []);
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const surface = node.querySelector<HTMLElement>('.ka-layout-surface');
    const changed = previousTransition.current !== transition;
    previousTransition.current = transition;
    if (changed && snapshot.current) {
      const old = snapshot.current;
      old.classList.add('ka-layout-ghost'); old.inert = true; old.setAttribute('aria-hidden','true');
      old.querySelectorAll('[data-control], [data-target]').forEach(el => { el.removeAttribute('data-control'); el.removeAttribute('data-target'); });
      node.parentElement?.insertBefore(old,node);
      const motion = crossfade();
      if (motion.incoming.options.duration) {
        // Only entering controls fade; surviving held controls stay fully opaque and track 1:1.
        const ids = new Set(priorControls.current.map(c => c.id));
        node.querySelectorAll<HTMLElement>('[data-part]').forEach(el => { if (!ids.has(el.dataset.part ?? '')) el.animate(motion.incoming.keyframes,motion.incoming.options); });
        const cover = surface?.animate(motion.incoming.keyframes,motion.incoming.options);
        old.animate(motion.outgoing.keyframes,motion.outgoing.options);
        // Keep the outgoing snapshot until the incoming surface is fully opaque.
        void (cover?.finished ?? Promise.resolve()).then(() => { old.remove(); },() => { old.remove(); });
      } else old.remove();
    }
    priorControls.current = props.layout.controls;
    snapshot.current = null;
  }, [transition]);
  useLayoutEffect(() => () => { privateFades.current.forEach(finish => { finish(); }); root.current?.parentElement?.querySelectorAll('.ka-layout-ghost, .ka-private-ghost').forEach(el => { el.remove(); }); }, []);
  return h('div', { ref:root, class:'ka-layout-engine', 'data-fits':String(placement.fits && panelFits), 'data-margin':String(placement.margin), 'data-gap':String(placement.gap), style:{ width:`${String(props.area.width)}px`,height:`${String(props.area.height)}px`, '--layout-gap':`var(--ka-space-${String(placement.gap)})`, '--layout-grid-gap':`var(--ka-space-${String(placement.gap === 5 ? 5 : 8)})` }, 'data-revision':props.layout.revision }, h('div', { class:'ka-layout-surface', 'aria-hidden':'true' }), placement.panel && placement.fits && h('section',{ class:'ka-private-panel','aria-label':'Private display',style:{ left:`${String(placement.panel.left)}px`,top:`${String(placement.panel.top)}px`,width:`${String(placement.panel.width)}px`,height:`${String(placement.panel.height)}px` } },...privateBlocks(props.privateView,props.isLeader ?? false).map((block,index) => h('div',{ key:index,class:'ka-private-block',style:{ height:`${String(placement.metrics.heights[index] ?? 0)}px`,...(block.kind === 'grid' ? { width:`${String(((placement.metrics.heights[index] ?? 0)-(block.rows-1)*(placement.gap === 5 ? 5 : 8))/block.rows*block.cols+(block.cols-1)*(placement.gap === 5 ? 5 : 8))}px`,alignSelf:'center' } : {}),...(block.kind === 'cards' ? { width:`${String(block.cards.length*(placement.metrics.heights[index] ?? 0)*PHONE.card.width/PHONE.card.height+Math.max(0,block.cards.length-1)*placement.gap)}px`,alignSelf:'center' } : {}), '--private-card-type':`var(--ka-phone-type-${(placement.metrics.heights[index] ?? 0) < PHONE.card.height ? '21' : '34'})`, '--private-stat-value':`var(--ka-phone-type-${String(placement.metrics.steps[index] ?? 21)})`  } },h(PrivateBlock,{ block,layout:props.layout,gap:placement.gap })))), ...placement.parts.map(p => h('div', { key:`${p.control.id}:${p.control.kind}${p.control.kind === 'button' ? p.control.button : ''}`, 'data-part':p.control.id, class:'ka-layout-part', style:{ left:`${String(p.left)}px`,top:`${String(p.top)}px`,width:`${String(p.width)}px`,height:`${String(p.height)}px`, '--control-size':`${String((p.width-2*placement.gap)/3)}px`, '--control-height':`${String((p.height-2*placement.gap)/3)}px` } },h(Part,{ control:p.control,layout:props.layout,output:props.onOutput,width:p.width,height:p.height,gap:placement.gap }))));
}
