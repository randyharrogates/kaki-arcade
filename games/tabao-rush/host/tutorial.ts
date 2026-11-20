import { arc, easing, crossfade, pulse, reducedMotion, duration, exitDuration, space } from '../../../packages/ui/src/index';
import { TUTORIAL_STEPS, TUTORIAL_TARGETS } from '../src/rules/tutorial';
import { projectX, projectY, TILE, DEPTH } from './model';
import type { View } from './model';
import './tutorial.css';
export const TUTORIAL_OFFSET = Math.round((1920 - 1187) / 2);
/** DOM text sits over the same sprite renderer; only a step change creates motion. */
export function createTutorial(root: HTMLElement) {
  const layer = document.createElement('section'); layer.className = 'tr-tutorial';
  layer.setAttribute('aria-label', 'Tutorial'); layer.hidden = true;

  const rail = document.createElement('div'); rail.className = 'tr-tutorial-rail';
  const count = document.createElement('span'); count.className = 'tr-tutorial-count'; count.textContent = 'Tutorial · about 60 seconds';
  const titles = document.createElement('div'); titles.className = 'tr-tutorial-titles';
  const instruction = document.createElement('p'); instruction.className = 'tr-tutorial-instruction';
  const list = document.createElement('ol'); list.className = 'tr-tutorial-steps';
  const rows = TUTORIAL_STEPS.map((step, index) => {
    const row = document.createElement('li');
    const number = document.createElement('span'); number.className = 'tr-tutorial-number'; number.textContent = String(index + 1);
    row.append(number, document.createTextNode(step.row)); list.append(row); return row;
  });
  const hint = document.createElement('p'); hint.className = 'tr-tutorial-hint'; hint.textContent = 'Leader: Skip on your phone';
  rail.append(count, titles, instruction, list, hint);
  const ring = document.createElement('div'); ring.className = 'tr-tutorial-ring'; ring.setAttribute('aria-hidden', 'true');
  const boards = [11, 13].map(() => { const node = ring.cloneNode() as HTMLDivElement; layer.append(node); return node; });
  ring.classList.add('tr-tutorial-main');
  layer.append(ring, rail); root.append(layer);
  let lastLeader: boolean | undefined;
  let cachedWidth = -1, cachedHeight = -1, wasVisible = false;
  let previous = -1, point = { x: 0, y: 0 };
  const animations = new Map<Animation, HTMLElement>();
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const stopMotion = () => { if (media.matches) { animations.forEach((_, a) => { a.cancel(); }); animations.clear(); layer.hidden = !wasVisible; titles.querySelectorAll('h1').forEach((node, index, nodes) => { if (index < nodes.length - 1) node.remove(); }); } };
  media.addEventListener('change', stopMotion);
  function animate(node: HTMLElement, motion: ReturnType<typeof pulse>, finish?: () => void) {
    if (!motion.options.duration) { finish?.(); return; }
    const animation = node.animate(motion.keyframes, motion.options); animations.set(animation, node);
    void animation.finished.then(() => { animations.delete(animation); finish?.(); animation.cancel(); }, () => { animations.delete(animation); });
  }
  function arrival(node: HTMLElement) { const motion = pulse(); motion.options.easing = easing.out; animate(node, motion); }
  return {
    update(view: View, width: number, height: number, localLeader = false) {
      const visible = view.phase === 'tutorial' && view.tutorial !== undefined;
      if (lastLeader !== localLeader) { lastLeader = localLeader; hint.textContent = localLeader ? 'Leader: press K or Back to skip' : 'Leader: Skip on your phone'; }
      if (visible !== wasVisible) {
        wasVisible = visible;
        if (visible) layer.hidden = false;
        const distance = space[34];
        animate(rail, { keyframes: visible ? [{ opacity: 0, transform: `translateX(${String(distance)}px)` }, { opacity: 1, transform: 'translateX(0)' }] : [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${String(distance)}px)` }], options: { duration: reducedMotion() ? 0 : visible ? duration.base : exitDuration('base'), delay: 0, easing: easing.out, fill: 'both' }, style: {} }, () => { if (!wasVisible) layer.hidden = true; });
      }
      if (!visible) { previous = -1; return; }
      const scale = Math.min(width / 1920, height / 1080);
      if (width !== cachedWidth || height !== cachedHeight) {
        cachedWidth = width; cachedHeight = height;
        layer.style.top = `${String((height - 1080 * scale) / 2)}px`;
        layer.style.transform = `translateX(-50%) scale(${String(scale)})`;
      }
      const step = view.tutorial.step;
      if (previous === step) return;
      animations.forEach((node, animation) => { if (node !== rail) { animation.cancel(); animations.delete(animation); } });
      const copy = TUTORIAL_STEPS[step]; if (!copy) return;
      layer.dataset.step = String(step + 1);
      const old = titles.querySelector<HTMLHeadingElement>('h1:last-child');
      titles.querySelectorAll('h1').forEach(node => { if (node !== old) node.remove(); });
      const title = document.createElement('h1'); title.textContent = copy.title; titles.append(title);
      instruction.textContent = copy.instruction;
      const tile = TUTORIAL_TARGETS[step] ?? TUTORIAL_TARGETS[0];
      const destination = { x: projectX(tile % view.level.width, view.level.width) - TUTORIAL_OFFSET,
        y: projectY(Math.floor(tile / view.level.width), view.level.height) };
      ring.style.width = `${String(TILE + 2 * space[13])}px`; ring.style.height = `${String(TILE * DEPTH + 2 * space[13])}px`;
      ring.style.left = `${String(destination.x - space[13])}px`; ring.style.top = `${String(destination.y - space[13])}px`;
      boards.forEach((node, index) => {
        node.hidden = step !== 2;
        if (step === 2 && !reducedMotion()) arrival(node);
        const tile = [11, 13][index] ?? 11;
        node.style.cssText = ring.style.cssText;
        node.style.left = `${String(projectX(tile % view.level.width, view.level.width) - TUTORIAL_OFFSET - space[13])}px`;
        node.style.top = `${String(projectY(Math.floor(tile / view.level.width), view.level.height) - space[13])}px`;
      });
      if (previous >= 0 && !reducedMotion()) {
        const move = arc(point, destination); move.options.easing = easing.inOut;
        // The element's base is already at its destination; offset the whole sampled arc.
        move.keyframes = move.keyframes.map(frame => ({ ...frame, transform: `translate(${String(point.x - destination.x)}px, ${String(point.y - destination.y)}px) ${String(frame.transform)}` }));
        animate(ring, move, () => { arrival(ring); });
        const fade = crossfade(); animate(title, fade.incoming);
        if (old) animate(old, crossfade({ exitOnly: true }).outgoing, () => { old.remove(); });
      } else { old?.remove(); if (!reducedMotion()) arrival(ring); }
      rows.forEach((row, index) => {
        row.dataset.state = index < step ? 'done' : index === step ? 'current' : 'next';
        const number = row.querySelector('span');
        if (number) { number.textContent = index < step ? '✓' : String(index + 1); if (index === step - 1 && previous >= 0) animate(number, pulse()); }
      });
      point = destination; previous = step;
    },
    destroy() { media.removeEventListener('change', stopMotion); animations.forEach((_, a) => { a.cancel(); }); layer.remove(); },
  };
}
