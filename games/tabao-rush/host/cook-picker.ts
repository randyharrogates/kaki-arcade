import { colourTokenVar, crossfade, duration, easing, reducedMotion } from '../../../packages/ui/src/index';
import { HEADS } from '../src/rules/cook-picker';
import type { View } from './model';
import './cook-picker.css';
export function createCookPicker(root: HTMLElement, portraits: ReadonlyMap<string,string>) {
  const screen = document.createElement('section'); screen.className = 'tr-cook-picker'; screen.setAttribute('aria-label', 'Cook picker');
  const heading = document.createElement('h1'); heading.textContent = 'Pick your cook on your phone'; screen.append(heading);
  const grid = document.createElement('div'); grid.className = 'tr-cook-grid'; screen.append(grid);
  const cells = HEADS.map(head => {
    const cell = document.createElement('div'); cell.className = 'tr-cook-card';
    const image = document.createElement('img'); image.src = portraits.get(head) ?? ''; image.alt = head;
    const tint = document.createElement('span'); tint.className = 'tr-cook-apron';
    const mask = portraits.get(`${head}-mask`); if (mask) tint.style.maskImage = `url("${mask}")`; else tint.hidden = true;
    cell.append(image,tint); grid.append(cell); return cell;
  });
  screen.hidden = true;
  root.append(screen);
  let key = '', visible = false;
  return {
    update(view: View, width: number, height: number) {
      screen.style.transform = `translateX(-50%) scale(${String(Math.min(width/1920,height/1080))})`;
      const picking = view.phase === 'pick';
      if (visible && !picking && !reducedMotion()) {
        const motion = crossfade({ exitOnly: true });
        void screen.animate(motion.outgoing.keyframes,motion.outgoing.options).finished.then(() => { if (!visible) screen.hidden = true; }, () => { /* Destroy cancels the fade. */ });
      } else if (picking || reducedMotion()) screen.hidden = !picking;
      visible = picking;
      const nextKey = JSON.stringify([view.picks,view.players]);
      if (key === nextKey) return; key = nextKey;
      cells.forEach((cell,index) => {
        const pick = view.picks?.find(p => p.head === index);
        const player = view.players.find(p => p.id === pick?.player);
        cell.dataset.taken = String(Boolean(player));
        const tint = cell.querySelector<HTMLElement>('.tr-cook-apron');
        if (tint) { tint.hidden = !player; if (player) tint.style.backgroundColor = colourTokenVar(player.team === undefined ? player.colour : player.team === 0 ? 'team-red' : 'team-blue'); }
        const badgeKey = JSON.stringify([player?.seat,player?.colour,pick?.ready]);
        if (cell.dataset.badgeKey === badgeKey) return;
        cell.dataset.badgeKey = badgeKey;
        cell.querySelector('.tr-cook-seat')?.remove();
        if (player) {
          const badge = document.createElement('span'); badge.className = 'tr-cook-seat'; badge.style.backgroundColor = colourTokenVar(player.colour);
          badge.textContent = `${String(player.seat)}${pick?.ready ? ' ✓' : ''}`; badge.setAttribute('aria-label',`Seat ${String(player.seat)}${pick?.ready ? ', Ready' : ''}`); cell.append(badge);
          if (!reducedMotion()) {
            badge.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration.fast, easing: easing.out, iterations: 1, fill: 'none' });
          }
        }
      });
    },
    destroy() { screen.remove(); },
  };
}
