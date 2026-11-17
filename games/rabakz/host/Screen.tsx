import { useContext, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { createContext } from 'preact';
import type { ComponentChildren } from 'preact';
import { motionGeometry, countUpAt, countUpDuration, GHOST_OPACITY, STAGGER_MS, duration, exitDuration, easing, reducedMotion, SEAT_NUMERAL, SHAPE_STROKE, space } from '@kaki/ui';
import type { Motion } from '@kaki/ui';
import { createFitCache, cssLength, screenModel, screenScale, viewportStyle, fallbackMeasure as fallback } from './view-model';
import type { MeasureText, RabakzPublicView, ScreenModel } from './view-model';
import './screen.css';



// Every inline property rejects bare numbers, including less obvious lengths such
// as gridAutoRows. Measured lengths enter through cssLength's px string type.
export function inlineStyle(value: Record<string, string>) { return value; }

function play(element: HTMLElement | null, motion: Motion, slow: number) {
  if (motion.options.duration === 0 || element?.closest('[inert]')) return;
  return element?.animate(motion.keyframes, { ...motion.options,
    duration: motion.options.duration * slow, delay: motion.options.delay * slow });
}

interface Box { x: number; y: number; width: number; height: number }
/** Geometry is installed immediately; layout changes are masked as one block. */
function MovingBox({ box, className, children, visible = true, style = {} }: {
  box: Box; className: string; children: ComponentChildren; reduced: boolean; slow: number;
  visible?: boolean; style?: Record<string, string>;
}) {
  return <div class={className} aria-hidden={!visible || undefined} style={inlineStyle({
    left: cssLength(box.x), top: cssLength(box.y), width: cssLength(box.width), height: cssLength(box.height),
    display: visible ? '' : 'none', ...style,
  })}>{children}</div>;
}

export function layoutIdentity(model: ScreenModel) {
  return JSON.stringify([model.picture, model.fit.boxes, model.fit.fontSize, model.options.map(o => o.fontSize)]);
}
export function blockMasks() {
  return {
    incoming: [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0)' }],
    outgoing: [{ clipPath: 'inset(0)' }, { clipPath: 'inset(0 0 0 100%)' }],
  };
}
const BlockMotion = createContext(false);
export function needsBlockWipe(before: ScreenModel, after: ScreenModel) {
  return before.questionId !== after.questionId && layoutIdentity(before) !== layoutIdentity(after);
}
export function successFrames() { return [{ opacity: 0 }, { opacity: 1, offset: motionGeometry.pulsePeak }, { opacity: 0 }]; }

/** Cancelling a wipe releases its retained snapshot unless `releaseOnCancel` says a newer
 *  question has already replaced it (a second change during a wipe gets its own wipe). */
export function animateBlockWipe(incoming: Pick<HTMLElement, 'animate'> | null, outgoing: Pick<HTMLElement, 'animate'> | null, slow: number, clear: () => void, releaseOnCancel: () => boolean = () => true) {
  const frames = blockMasks();
  const options = { duration: duration.slow * slow, easing: easing.inOut, fill: 'both' as const };
  const enter = incoming?.animate(frames.incoming, options);
  const exit = outgoing?.animate(frames.outgoing, options);
  if (enter) enter.onfinish = clear;
  else clear();
  return () => { enter?.cancel(); exit?.cancel(); if (releaseOnCancel()) clear(); };
}

function QuestionBlock({ model, reduced, slow }: { model: ScreenModel; reduced: boolean; slow: number }) {
  const last = useRef(model);
  const [old, setOld] = useState<ScreenModel | null>(null);
  const incoming = useRef<HTMLDivElement>(null);
  const outgoing = useRef<HTMLDivElement>(null);
  const changed = needsBlockWipe(last.current, model);
  const reducedNow = useRef(reduced);
  reducedNow.current = reduced;
  useLayoutEffect(() => {
    if (changed && !reduced) setOld(last.current);
    last.current = model;
  }, [model, changed, reduced]);
  useLayoutEffect(() => {
    if (!old || reduced) return;
    // Only a motion-preference change releases the snapshot on cancel; a newer question keeps its own.
    return animateBlockWipe(incoming.current, outgoing.current, slow, () => { setOld(null); }, () => reducedNow.current !== reduced);
  }, [old, reduced, slow]);
  const contents = (m: ScreenModel, quiet: boolean) => <>
    <MovingBox className="rz-question" box={m.fit.boxes.prompt} reduced={quiet} slow={slow}>
      <h1 style={inlineStyle({ fontSize: m.fit.fontSize, height: m.fit.promptHeight })}><Copy identity={m.prompt} reduced={quiet} slow={slow}><span style={inlineStyle({ fontSize: m.fit.fontSize })}>{m.prompt}</span></Copy></h1>
    </MovingBox>
    <MovingBox className="rz-media" box={m.fit.boxes.media} reduced={quiet} slow={slow} visible={m.picture}><div role="img" aria-label="Neutral framed picture slot. Photograph pending R-13."><Copy identity={m.pictureLabel} reduced={quiet} slow={slow}>{m.pictureLabel}</Copy></div></MovingBox>
    <OptionGrid model={m} reduced={quiet} slow={slow} />
  </>;
  return <>
    {old && !reduced && <div ref={outgoing} class="rz-block rz-block-old" aria-hidden="true" inert>{contents(old, true)}</div>}
    <div ref={incoming} class="rz-block" data-block-mask={!reduced && (changed || old !== null) || undefined}><BlockMotion.Provider value={!reduced && (changed || old !== null)}>{contents(model, reduced)}</BlockMotion.Provider></div>
  </>;
}

function OptionGrid({ model, reduced, slow }: { model: ScreenModel; reduced: boolean; slow: number }) {
  const bounds = model.fit.boxes.options;
  const width = (bounds.width - space[21]) / 2;
  return <>{model.options.map(option => <MovingBox key={option.index} className="rz-card-box" box={{ x: bounds.x + (option.index % 2) * (width + space[21]), y: bounds.y + Math.floor(option.index / 2) * (model.fit.optionHeight + space[21]), width, height: model.fit.optionHeight }} reduced={reduced} slow={slow} style={inlineStyle({ '--rz-marks-height': cssLength(model.fit.marksHeight) })}>
    <Option questionId={model.questionId} identity={model.identity} option={option} reveal={model.reveal} reduced={reduced} slow={slow} />
  </MovingBox>)}</>;
}

/** A masked question may reveal before its block finishes; remember the unseen transition. */
export function revealTransition(previous: { questionId: string; active: boolean }, questionId: string, active: boolean, blocked: boolean) {
  if (previous.questionId !== questionId) { previous.questionId = questionId; if (blocked) previous.active = false; }
  if (blocked) return null;
  const was = previous.active;
  previous.active = active;
  return was === active ? null : { was };
}

function RevealSurface({ questionId, active, correct, reduced, slow }: { questionId: string; active: boolean; correct: boolean; reduced: boolean; slow: number }) {
  const root = useRef<HTMLDivElement>(null);
  const previous = useRef({ questionId, active: false });
  const blocked = useContext(BlockMotion);
  useLayoutEffect(() => {
    const transition = revealTransition(previous.current, questionId, active, blocked);
    if (!transition || reduced || root.current?.closest('[inert], [data-block-mask]')) return;
    const { was } = transition;
    const animation = root.current?.animate([
      { clipPath: was ? 'inset(0)' : 'inset(0 100% 0 0)' },
      { clipPath: active ? 'inset(0)' : 'inset(0 100% 0 0)' },
    ], { duration: (active ? duration.slow : exitDuration('slow')) * slow, easing: active ? easing.out : easing.in });
    return () => { animation?.cancel(); };
  }, [active, reduced, slow, blocked, questionId]);
  return <div ref={root} class="rz-reveal-surface" data-correct={correct || undefined} aria-hidden="true" style={inlineStyle({ clipPath: active ? 'inset(0)' : 'inset(0 100% 0 0)' })}>{correct && !reduced && <div class="rz-pulse-ring" />}</div>;
}

function Score({ from, to, reduced, slow, frozenAt, index }: { index: number; from: number; to: number; reduced: boolean; slow: number; frozenAt?: number | undefined }) {
  const root = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(reduced ? to : from);
  useLayoutEffect(() => {
    if (root.current?.closest('[inert]')) { setValue(to); return; }
    if (frozenAt !== undefined) { setValue(countUpAt(from, to, Math.max(0, frozenAt / slow - index * STAGGER_MS), { reduced })); return; }
    let frame = 0;
    let start: number | undefined;
    const update = (now: number) => {
      start ??= now;
      setValue(countUpAt(from, to, Math.max(0, (now - start) / slow - index * STAGGER_MS), { reduced }));
      if (now - start < (countUpDuration({ reduced }) + index * STAGGER_MS) * slow) frame = requestAnimationFrame(update);
    };
    if (reduced) setValue(to);
    else frame = requestAnimationFrame(update);
    return () => { cancelAnimationFrame(frame); };
  }, [from, to, reduced, slow, frozenAt, index]);
  return <span ref={root}>{value}</span>;
}

function Option({ questionId, option, identity, reduced, slow, reveal }: { questionId: string; reveal: boolean; identity: string; option: ScreenModel['options'][number]; reduced: boolean; slow: number }) {
  const root = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  const blocked = useContext(BlockMotion);
  useLayoutEffect(() => {
    if (reduced || root.current?.closest('[inert], [data-block-mask]')) return;
    const animation = root.current?.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0)' }], { duration: duration.slow * slow, delay: option.index * STAGGER_MS * slow, easing: easing.out, fill: 'both' });
    return () => { animation?.cancel(); };
  }, [option.index, reduced, slow]);
  useLayoutEffect(() => {
    if (!option.correct || reduced || blocked || root.current?.closest('[inert], [data-block-mask]')) return;
    const animation = mark.current?.animate([
      { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' },
    ], { duration: duration.slow * slow, easing: easing.out, fill: 'both' });
    const motion: Motion = { style: {}, keyframes: successFrames(), options: { duration: duration.slow, delay: duration.slow - STAGGER_MS, easing: easing.inOut, fill: 'both' } };
    const confirmation = option.success ? play(root.current?.querySelector<HTMLElement>('.rz-pulse-ring') ?? null, motion, slow) : undefined;
    return () => { animation?.cancel(); confirmation?.cancel(); };
  }, [option.correct, option.success, reduced, slow, blocked, questionId]);
  return <div ref={root} class="rz-option" style={inlineStyle({ '--rz-success-colour': option.symbol.colour })} data-wrong={option.wrong || undefined} data-correct={option.correct || undefined}>
    <RevealSurface questionId={questionId} active={option.correct || option.wrong || reveal} correct={option.correct} reduced={reduced} slow={slow} />
    <svg class="rz-shape" viewBox="0 0 24 24" role="img" aria-label={option.shape} style={inlineStyle({ color: option.wrong || (reveal && !option.correct) ? option.dimColour : option.symbol.colour })}>
      <path d={option.symbol.path} fill="none" stroke="currentColor" stroke-width={SHAPE_STROKE} stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <div class="rz-option-text" style={inlineStyle({ fontSize: option.fontSize })}><Copy identity={option.text} reduced={reduced} slow={slow}><span style={inlineStyle({ fontSize: option.fontSize })}>{option.text}</span></Copy></div>
    <div class="rz-marks"><Copy fill identity={identity} reduced={reduced} slow={slow}>
      {option.wrong && !option.correct && <span class="rz-wrong">⊘ Wrong</span>}
      {option.correct && <span ref={mark} class="rz-correct">✓ Correct</span>}
      {option.chosenBy.length > 0 && <span class="rz-choices" aria-label="Seats that chose this option">{option.chosenBy.map((p, index) => <MaskedChoice reduced={reduced} slow={slow} index={index} key={p.seat}><span class="rz-seat-number" key={p.seat} style={inlineStyle({ background: p.colour, color: SEAT_NUMERAL })}>{p.seat}</span></MaskedChoice>)}</span>}
    </Copy></div>
  </div>;
}

function MaskedChoice({ children, reduced, slow, index }: { children: ComponentChildren; reduced: boolean; slow: number; index: number }) {
  const root = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (reduced || root.current?.closest('[inert], [data-block-mask]')) return;
    const animation = root.current?.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0)' }], { duration: duration.slow * slow, delay: (index + 1) * STAGGER_MS * slow, easing: easing.out, fill: 'both' });
    return () => { animation?.cancel(); };
  }, [reduced, slow, index]);
  return <span ref={root}>{children}</span>;
}

function SeatSlot({ player, children, reduced, slow }: { player: ScreenModel['players'][number] | undefined; children: (p: ScreenModel['players'][number]) => ComponentChildren; reduced: boolean; slow: number }) {
  const retained = useRef(player);
  if (player) retained.current = player;
  const p = player ?? retained.current;
  return p ? <div class="rz-seat-slot" style={inlineStyle({ gridColumn: String((p.seat - 1) % 4 + 1), gridRow: String(Math.floor((p.seat - 1) / 4) + 1) })}><Copy identity={player ? p.id : 'departed'} reduced={reduced} slow={slow}>{player ? children(player) : null}</Copy></div> : null;
}

/** This component accepts a public snapshot only; never the simulation State. */
export function QuestionFrame({ model, reduced = reducedMotion(), slow = 1, frozenAt }: {
  model: ScreenModel; reduced?: boolean; slow?: number; frozenAt?: number | undefined;
}) {
  const seats = <footer class="rz-footer">
      <div class="rz-outcome"><Copy identity={model.reveal ? model.identity : 'Players'} reduced={reduced} slow={slow}>{model.reveal ? model.outcome : 'Players'}</Copy></div>
      <div class="rz-seats">{Array.from({ length: 8 }, (_, index) => <SeatSlot key={index} player={model.players.find(p => p.seat === index + 1)} reduced={reduced} slow={slow}>{p => <div class="rz-seat-row" style={inlineStyle({ gridColumn: String((p.seat - 1) % 4 + 1), gridRow: String(Math.floor((p.seat - 1) / 4) + 1) })}><div class="rz-seat">
        <span class="rz-seat-number" style={inlineStyle({ background: p.colour, color: SEAT_NUMERAL })}>{p.seat}</span>
        <div class="rz-seat-name"><Copy identity={p.name} reduced={reduced} slow={slow}>{Array.from(p.name).slice(0, -1).join('')}<span class="rz-name-tail">{Array.from(p.name).at(-1)}<span class="rz-winner"><Copy identity={String(model.reveal && model.winners.includes(p.id))} reduced={reduced} slow={slow}><span aria-hidden={!model.reveal || !model.winners.includes(p.id) || undefined} aria-label={model.reveal && model.winners.includes(p.id) ? "Winner" : undefined} style={inlineStyle({ clipPath: model.reveal && model.winners.includes(p.id) ? 'inset(0)' : 'inset(0 100% 0 0)' })}>✓</span></Copy></span></span></Copy></div>
        <div class="rz-seat-status" aria-label={!model.reveal && p.lockedOut ? 'Locked out' : undefined}><Copy identity={model.reveal ? model.identity : p.status} reduced={reduced} slow={slow}>{model.reveal ? <>
          {p.wonLabel && <span class="rz-gained">{p.wonLabel} </span>}<span><Score index={index} from={p.score - p.gained} to={p.score} reduced={reduced} slow={slow} frozenAt={frozenAt} /> pts</span>
        </> : <>{p.status === 'Locked out' ? '⊘ ' : p.status === 'Thinking' ? '••• ' : '→ '}{p.status}</>}</Copy></div>
      </div></div>}</SeatSlot>)}</div>
    </footer>;
  const moving = { reduced, slow };
  return <section class="rz-frame" data-theme="rabakz" data-reveal={model.reveal || undefined} data-picture={model.picture || undefined}>
    <header class="rz-header"><span><Copy identity={model.heading} reduced={reduced} slow={slow}>{model.heading}</Copy></span><span><Copy identity={model.category} reduced={reduced} slow={slow}>{model.category}</Copy></span></header>
    <QuestionBlock model={model} reduced={reduced} slow={slow} />
    <MovingBox className="rz-player-strip" box={model.fit.boxes.awards} {...moving}>{seats}</MovingBox>
  </section>;

}

/** Each persistent surface masks its copy; outgoing text becomes a ghost. */
function Copy({ identity, children, reduced, slow, fill = false }: { identity: string; children: ComponentChildren; reduced: boolean; slow: number; fill?: boolean }) {
  const last = useRef({ identity, children });
  const [old, setOld] = useState<ComponentChildren>(null);
  const [change, setChange] = useState(0);
  const incoming = useRef<HTMLDivElement>(null);
  const outgoing = useRef<HTMLDivElement>(null);
  const measured = useRef({ width: '100%', height: '100%' });
  const oldBounds = useRef(measured.current);
  // Inside a block wipe the whole block changes by one mask (D-105 a), so its copy does not mask again.
  const blocked = useContext(BlockMotion);
  useLayoutEffect(() => {
    if (last.current.identity !== identity && !reduced && !blocked) {
      oldBounds.current = measured.current;
      setOld(last.current.children);
      setChange(value => value + 1);
    }
    last.current = { identity, children };
    if (incoming.current) measured.current = { width: cssLength(incoming.current.offsetWidth), height: cssLength(incoming.current.offsetHeight) };
  }, [identity, children]);
  useLayoutEffect(() => {
    if (!change || reduced) return;
    const options = { duration: duration.slow * slow, easing: easing.out, fill: 'both' as const };
    const animation = incoming.current?.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0)' }], options);
    const ghost = outgoing.current?.animate([{ clipPath: 'inset(0)', opacity: 1 }, { clipPath: 'inset(33.333% 0 0 0)', opacity: GHOST_OPACITY, offset: 1 / 3 }, { clipPath: 'inset(100% 0 0 0)', opacity: GHOST_OPACITY }], { ...options, duration: exitDuration('slow') * slow });
    if (animation) animation.onfinish = () => { setOld(null); };
    else setOld(null);
    return () => { animation?.cancel(); ghost?.cancel(); };
  }, [change, reduced, slow]);
  return <div class="rz-copy">{old && <div class="rz-old" ref={outgoing} aria-hidden="true" inert style={inlineStyle(fill ? { width: '100%', height: '100%' } : oldBounds.current)}>{old}</div>}<div ref={incoming}>{children}</div></div>;
}

/** Loading a registered face may reject; retain the already measured fallback. */
export function loadScreenFonts(fonts: { ready: Promise<unknown>; load: (name: string) => Promise<unknown> }, names: { display: string; body: string }, loaded: () => void) {
  return fonts.ready.then(async () => {
    await Promise.all([fonts.load(`89px ${names.display}`), fonts.load(`700 55px ${names.body}`)]);
    loaded();
  }).catch(() => { /* Keep the current fallback fit when a face cannot load. */ });
}

export function RabakzScreen({ view, width, height, reduced = reducedMotion(), slow = 1, frozenAt }: {
  view: RabakzPublicView; width: number; height: number; reduced?: boolean; slow?: number; frozenAt?: number | undefined;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [fontEpoch, setFontEpoch] = useState(0);
  const [measure, setMeasure] = useState<MeasureText>(() => fallback);
  useLayoutEffect(() => {
    const element = viewport.current;
    const context = document.createElement('canvas').getContext('2d');
    if (!element || !context) return;
    const styles = getComputedStyle(element);
    const fonts = { display: styles.getPropertyValue('--ka-font-display'), body: styles.getPropertyValue('--ka-font-body') };
    const refresh = () => { setMeasure(() => (text: string, size: number, face: 'display' | 'body') => {
      context.font = `${face === 'body' ? '700 ' : ''}${String(size)}px ${fonts[face]}`;
      return context.measureText(text).width;
    }); };
    refresh();
    let active = true;
    void loadScreenFonts(document.fonts, fonts, () => {
      if (active) { refresh(); setFontEpoch(epoch => epoch + 1); }
    });
    return () => { active = false; };
  }, []);
  const retained = useRef<ScreenModel | null>(null);
  const [fitCache] = useState(() => createFitCache());
  const model = screenModel(view, measure, view.question ? fitCache(view.question, width, height, measure, fontEpoch) : undefined) ?? retained.current;
  if (model) retained.current = model;
  if (!model) return null;
  return <div ref={viewport} class="rz-viewport" data-theme="rabakz" style={viewportStyle(width, height)}>
    <div class="rz-artboard" style={inlineStyle({ transform: `translate(-50%, -50%) scale(${String(screenScale(width, height))})` })}>
      <QuestionFrame model={model} reduced={reduced} slow={slow} frozenAt={frozenAt} />
    </div>
  </div>;
}
