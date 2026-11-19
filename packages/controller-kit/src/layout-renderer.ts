/// <reference lib="dom" />
import { createElement as h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { SHAPE_BUTTONS, SHAPE_STROKE, colourTokenVar, crossfade, pulse, press, pressScale, cardTurn, reducedMotion } from '@kaki/ui';
import { PRIVATE_TEXT_STEPS, PRIVATE_STAT_STEPS } from '@kaki/platform/private-placement';
import { PHONE } from '@kaki/platform/layout';
import type { Size } from '@kaki/ui';
import { Stick } from './stick';
import { DPad } from './buttons';
import { bindControlEvents, controlHit, vibratePress } from './button-input';
import { placeController, privateBlocks } from './private-panel';
import { observeLabelGroup, labelMeasurementSignature, labelCellBox, measureOptionWidth } from './layout-label';
import { faceShape, layoutOutput, revisionProblem, layoutTapSignature } from './layout-types';
import type { Item, Layout, LayoutPart, LayoutOutput, LayoutValue, PrivateView, PanelBlock } from './layout-types';
/** Watch the animation timeline so a late first frame cannot shorten a fade.
 * A stationary timeline still gets bounded cleanup in background windows. */
function fadeFallback(animation:Animation | undefined, end:number, finish:() => void) {
  const frame = 1000 / 60;
  let previous = animation?.currentTime;
  let timer:ReturnType<typeof setTimeout>;
  const check = () => {
    const current = animation?.currentTime;
    if (typeof current === 'number' && current !== previous && current < end) {
      previous = current;
      timer = setTimeout(check,end-current+frame);
    } else finish();
  };
  timer = setTimeout(check,end+frame);
  return () => { clearTimeout(timer); };
}
export interface LayoutEngineProps { images?: Readonly<Record<string, string>>; layout: Layout; privateView?: PrivateView | null; area: Size; viewport: Size; isLeader?: boolean; onOutput: (output: LayoutOutput) => void; onRevisionProblem?: (problem: string) => void }
function shape(face: keyof typeof faceShape | undefined) {
  if (!face) return null;
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, h('path', { d: SHAPE_BUTTONS[faceShape[face]].path, 'stroke-width': SHAPE_STROKE }));
}
function Picture({ url, mask, colour, label }: { url?: string | undefined; mask?: string | undefined; colour?: Item['colour']; label: string }) {
  const [loaded, setLoaded] = useState(false);
  useLayoutEffect(() => { setLoaded(false); }, [url]);
  return h('span', { class: 'ka-layout-picture' }, !loaded && h('span', null, label), url && h('img', { src: url, alt: '', style: { visibility: loaded ? 'visible' : 'hidden' }, onLoad: () => { setLoaded(true); }, onError: () => { setLoaded(false); } }), loaded && mask && colour && h('span', { class: 'ka-layout-picture-tint', style: { backgroundColor: colourTokenVar(colour), maskImage: `url("${mask}")` } }));
}
function Target(props: { box?:Size; selectionFade?: boolean; id: string; label: string; content?: ComponentChildren; item?: Item; face?: keyof typeof faceShape; disabled?: boolean; held?: boolean; output(phase: LayoutOutput['phase'], value: LayoutValue): void; value: LayoutValue }) {
  const root = useRef<HTMLButtonElement>(null);
  const latest = useRef(props); latest.current = props;
  const disabled = props.disabled === true || props.item?.state === 'disabled';
  const selected = props.item?.state === 'selected';
  const previousSelection = useRef(selected);
  const outgoingSelection = useRef<HTMLElement | null>(null);
  if (previousSelection.current !== selected) {
    outgoingSelection.current = props.selectionFade ? root.current?.cloneNode(true) as HTMLElement | null : null;
    previousSelection.current = selected;
  }
  useLayoutEffect(() => {
    const node = root.current, old = outgoingSelection.current;
    outgoingSelection.current = null;
    if (!node || !old || reducedMotion()) return;
    old.removeAttribute('data-target'); old.removeAttribute('data-control');
    old.classList.add('ka-layout-ghost'); old.removeAttribute('aria-pressed'); old.removeAttribute('data-state');
    old.inert = true; old.setAttribute('aria-hidden', 'true');
    Object.assign(old.style, { position: 'absolute', left: `${String(node.offsetLeft)}px`, top: `${String(node.offsetTop)}px`, width: `${String(node.offsetWidth)}px`, height: `${String(node.offsetHeight)}px`, pointerEvents: 'none' });
    node.parentElement?.append(old);
    const motion = crossfade();
    const incoming = node.animate(motion.incoming.keyframes, motion.incoming.options);
    const outgoing = old.animate(motion.outgoing.keyframes, motion.outgoing.options);
    const cleanup = () => { old.remove(); incoming.cancel(); outgoing.cancel(); };
    void outgoing.finished.then(cleanup, cleanup);
    return cleanup;
  }, [selected]);

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
  return h('button', { ref: root, type: 'button', class: `ka-layout-target${props.item?.image ? ' ka-layout-picture-cell' : ''}${props.item?.faceDown ? ' ka-layout-card-back' : ''}${props.face && !props.item?.faceDown ? ` ka-kit-${faceShape[props.face]}` : ''}${props.held && props.face && !props.item?.faceDown ? ' ka-layout-face' : ''}`, 'data-target': props.id, 'data-control': props.id, 'data-held': 'false', 'data-state': props.item?.state ?? 'plain', 'data-focus': String(props.item?.focus === true), 'aria-disabled':disabled, 'aria-label': props.label, 'aria-pressed': props.item?.state === undefined ? undefined : props.item.state === 'selected', style: props.item?.colour && !props.item.image && !disabled && !props.item.faceDown ? { background: colourTokenVar(props.item.colour) } : undefined }, props.item?.faceDown ? null : shape(props.face), h('span', null, props.item?.faceDown ? null : props.content ?? props.label), props.item?.badge && h('span', { class: 'ka-layout-badge', style: { backgroundColor: colourTokenVar(props.item.badge.colour) }, 'aria-label': `Seat ${props.item.badge.text}${props.item.badge.tick ? ', Ready' : ''}` }, props.item.badge.text, props.item.badge.tick && h('span', { class: 'ka-layout-ready', 'aria-hidden': 'true' }, '✓')));
}
function Part({ control: c, layout, output, width, height, gap, readOnly = false, images }: { images?: Readonly<Record<string,string>> | undefined; readOnly?:boolean; control: LayoutPart; layout: Layout; output: LayoutEngineProps['onOutput']; width:number; height:number; gap:number }) {
  const group = useRef<HTMLDivElement>(null);
  const measurement = labelMeasurementSignature(c,width,height,gap,readOnly);
  useLayoutEffect(() => {
    if (!group.current || readOnly || (c.kind !== 'options' && c.kind !== 'grid')) return;
    const columns = c.kind === 'grid' ? c.cols : Math.min(2,c.options.length);
    const rows = c.kind === 'grid' ? c.rows : Math.ceil(c.options.length/2);
    return observeLabelGroup(group.current,labelCellBox(c.kind,width,height,columns,rows,gap));
  }, [measurement]);
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
    const selectionFade = (c.kind === 'grid' && items.some(cell => cell.image !== undefined)) || (c.kind === 'options' && items.length === 1);
    content = h('div', { ref:group, class:`ka-layout-items ka-layout-${c.kind}`, 'data-single-option': c.kind === 'options' && items.length === 1 ? 'true' : undefined, style: { gridTemplateColumns: c.kind === 'cards' ? `repeat(${String(items.length)}, 1fr)` : `repeat(${String(c.kind === 'grid' ? c.cols : Math.min(2,items.length))}, 1fr)` } }, ...items.map((item,index) => {
      const label = item.faceDown ? c.kind === 'grid' ? `Card ${String(index+1)}` : 'Hidden card' : item.label ?? '';
      const mark = ({ spade:'♠',heart:'♥',club:'♣',diamond:'♦' } as Record<string,string>)[item.mark ?? ''] ?? item.mark;
      const content = item.image ? h(Picture, { url: images?.[item.image], mask: images?.[`${item.image}-mask`], ...(item.colour ? { colour: item.colour } : {}), label }) : c.kind === 'cards' && !item.faceDown ? h('span',{ class:'ka-layout-card-face' },h('span',null,item.label),h('span',null,mark)) : item.faceDown ? null : label;
      if ((c.kind === 'cards' && !c.tappable) || (c.kind === 'grid' && readOnly)) return h('div', { key:item.id ?? index, class:'ka-layout-card', 'data-state':item.state, 'data-focus':String(item.focus === true), style:item.colour && !item.faceDown ? { background:colourTokenVar(item.colour) } : undefined, 'aria-label':label, ...(item.faceDown ? { role:'img', class:'ka-layout-card ka-layout-card-back' } : {}) },c.kind === 'grid' ? h('span',{ class:'ka-private-grid-label' },content) : content);
      const columns = c.kind === 'grid' ? c.cols : c.kind === 'options' ? Math.min(2,items.length) : items.length;
      const rows = c.kind === 'grid' ? c.rows : c.kind === 'options' ? Math.ceil(items.length/2) : 1;
      return h(Target, { ...(c.kind === 'options' || c.kind === 'grid' ? { box:labelCellBox(c.kind,width,height,columns,rows,gap) } : {}), selectionFade, key:item.id ?? index, id:`${c.id}:${item.id ?? String(index)}`, label:label || `Cell ${String(index+1)}`, content, item, value:c.kind === 'grid' ? index : item.id ?? '', output:send, ...(item.face ? { face:item.face } : {}) });
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
  const title = block.kind === 'text' && block.tone === 'title' ? block.text : null;
  useLayoutEffect(() => {
    const node = root.current?.querySelector('.ka-layout-title > span');
    if (!title || !node || reducedMotion()) return;
    const motion = pulse();
    const animation = node.animate(motion.keyframes,motion.options);
    return () => { animation.cancel(); };
  }, [title]);
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
  const layoutFade = useRef<(() => void) | null>(null);
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
    const labels = [...node.querySelectorAll<HTMLElement>('.ka-layout-options[data-single-option="true"] > button[data-control] > span, .ka-layout-text > span')];
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
          const span = node.querySelector('span');
          if (fitsBox(node) && (!node.classList.contains('ka-layout-title') || !span || fitsBox(span) && span.offsetWidth <= node.clientWidth && span.offsetHeight <= node.clientHeight)) return true;
        }
        return false;
      };
      const labels = [...panel.querySelectorAll<HTMLElement>('.ka-layout-text')];
      const stats = [...panel.querySelectorAll<HTMLElement>('.ka-private-stat-value')];
      const grids = [...panel.querySelectorAll<HTMLElement>('.ka-private-grid-label')];
      const titles = labels.filter(node => node.classList.contains('ka-layout-title'));
      const titlesFit = titles.map(node => choose(node,PRIVATE_TEXT_STEPS)).every(Boolean);
      const titleSize = Math.min(Infinity,...titles.map(node => parseFloat(getComputedStyle(node).fontSize)));
      const textFits = labels.filter(node => !titles.includes(node)).map(node => choose(node,
        (node.classList.contains('ka-layout-note') ? [13] : !titles.length ? PRIVATE_TEXT_STEPS : node.classList.contains('ka-layout-body') ? [21,13] : PRIVATE_TEXT_STEPS).filter(step => step <= titleSize))).every(Boolean) && titlesFit;
      const statFits = stats.map(node => choose(node,PRIVATE_STAT_STEPS.filter(step => step <= titleSize))).every(Boolean);
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
    // A full-layout exit already includes the outgoing private panel.
    // Do not render a second copy of it inside the incoming layout.
    if (!old || !panel || snapshot.current || reducedMotion()) return;
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
        active = false; fallback(); privateFades.current.delete(finish);
        animation.cancel(); leaving.cancel(); outgoing.remove(); Object.assign(incoming.style,original); measurePrivate.current?.();
      };
      const fallback = fadeFallback(animation,motion.incoming.options.duration + motion.incoming.options.delay,finish);
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
    layoutFade.current?.();
    privateFades.current.forEach(finish => { finish(); });
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
          // Gradients with auto size use their painting box. Copy that box too,
          // rather than resizing the felt to the shorter play area.
          left: `${String(origin.left-box.left)}px`, top: `${String(origin.top-box.top)}px`,
          width: `${String(origin.width)}px`, height: `${String(origin.height)}px`,
          right: 'auto', bottom: 'auto',
          // Resolve auto gradients so private crossfade covers can reuse the
          // same image size even when their own boxes are smaller.
          backgroundSize: css.backgroundSize.split(',').map(size => size.trim() === 'auto' || size.trim() === 'auto auto' ? `${String(origin.width)}px ${String(origin.height)}px` : size.trim()).join(', '),
          backgroundPosition: css.backgroundPosition,
        });
      }
    };
    refreshSurface();
    const observer = new ResizeObserver(refreshSurface);
    observer.observe(node);
    const shell = node.closest('.ka-controller-shell');
    const themeObserver = new MutationObserver(refreshSurface);
    if (shell) {
      observer.observe(shell);
      themeObserver.observe(shell, { attributes: true, attributeFilter: ['data-theme'] });
    }
    window.addEventListener('resize',refreshSurface);
    return () => { observer.disconnect(); themeObserver.disconnect(); window.removeEventListener('resize',refreshSurface); };
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
        const animations: Animation[] = [];
        const ids = new Set(priorControls.current.map(c => c.id));
        node.querySelectorAll<HTMLElement>('[data-part]').forEach(el => { if (!ids.has(el.dataset.part ?? '')) animations.push(el.animate(motion.incoming.keyframes,motion.incoming.options)); });
        const cover = surface?.animate(motion.incoming.keyframes,motion.incoming.options);
        if (cover) animations.push(cover);
        animations.push(old.animate(motion.outgoing.keyframes,motion.outgoing.options));
        // Keep the outgoing snapshot until the incoming surface is fully opaque.
        let active = true;
        const finish = () => {
          if (!active) return;
          active = false; fallback(); old.remove();
          animations.forEach(animation => { animation.cancel(); });
          layoutFade.current = null;
        };
        const fallback = fadeFallback(cover,motion.incoming.options.duration + motion.incoming.options.delay,finish);
        layoutFade.current = finish;
        void (cover?.finished ?? Promise.resolve()).then(finish,finish);
      } else old.remove();
    }
    priorControls.current = props.layout.controls;
    snapshot.current = null;
  }, [transition]);
  useLayoutEffect(() => () => { layoutFade.current?.(); privateFades.current.forEach(finish => { finish(); }); root.current?.parentElement?.querySelectorAll('.ka-layout-ghost, .ka-private-ghost').forEach(el => { el.remove(); }); }, []);
  return h('div', { ref:root, class:'ka-layout-engine', 'data-picture-grid': String(props.layout.controls.some(c => c.kind === 'grid' && c.cells.some(cell => cell.image))), 'data-fits':String(placement.fits && panelFits), 'data-margin':String(placement.margin), 'data-gap':String(placement.gap), style:{ width:`${String(props.area.width)}px`,height:`${String(props.area.height)}px`, '--layout-gap':`var(--ka-space-${String(placement.gap)})`, '--layout-grid-gap':`var(--ka-space-${String(placement.gap === 5 ? 5 : 8)})` }, 'data-revision':props.layout.revision }, h('div', { class:'ka-layout-surface', 'aria-hidden':'true' }), placement.panel && placement.fits && h('section',{ class:'ka-private-panel','aria-label':'Private display',style:{ flexDirection:placement.metrics.widths ? 'row' : 'column',left:`${String(placement.panel.left)}px`,top:`${String(placement.panel.top)}px`,width:`${String(placement.panel.width)}px`,height:`${String(placement.panel.height)}px` } },...privateBlocks(props.privateView,props.isLeader ?? false).map((block,index) => h('div',{ key:index,class:'ka-private-block',style:{ ...(placement.metrics.widths ? { width:`${String(placement.metrics.widths[index] ?? 0)}px` } : {}),height:`${String(placement.metrics.heights[index] ?? 0)}px`,...(block.kind === 'grid' ? { width:`${String(((placement.metrics.heights[index] ?? 0)-(block.rows-1)*(placement.gap === 5 ? 5 : 8))/block.rows*block.cols+(block.cols-1)*(placement.gap === 5 ? 5 : 8))}px`,alignSelf:'center' } : {}),...(block.kind === 'cards' ? { width:`${String(block.cards.length*(placement.metrics.heights[index] ?? 0)*PHONE.card.width/PHONE.card.height+Math.max(0,block.cards.length-1)*placement.gap)}px`,alignSelf:'center' } : {}), '--private-card-type':`var(--ka-phone-type-${(placement.metrics.heights[index] ?? 0) < PHONE.card.height ? '21' : '34'})`, '--private-stat-value':`var(--ka-phone-type-${String(placement.metrics.steps[index] ?? 21)})`  } },h(PrivateBlock,{ block,layout:props.layout,gap:placement.gap,images:props.images })))), ...placement.parts.map(p => h('div', { key:`${p.control.id}:${p.control.kind}${p.control.kind === 'button' ? p.control.button : ''}`, 'data-part':p.control.id, class:'ka-layout-part', style:{ left:`${String(p.left)}px`,top:`${String(p.top)}px`,width:`${String(p.width)}px`,height:`${String(p.height)}px`, '--control-size':`${String((p.width-2*placement.gap)/3)}px`, '--control-height':`${String((p.height-2*placement.gap)/3)}px` } },h(Part,{ control:p.control,layout:props.layout,output:props.onOutput,width:p.width,height:p.height,gap:placement.gap,images:props.images }))));
}
