import { enter, pulse, SEAT_NUMERAL } from '../../../packages/ui/src/index';
import { scoreboardModel } from './standings';
import type { PokerPublicView } from './view-model';
export function resultsBoard(root: HTMLElement, view: PokerPublicView, reduced: boolean) {
  const board=scoreboardModel(view), final=view.phase === 'over';
  root.replaceChildren();
  const summary=document.createElement('div');summary.className='pp-summary';
  const label=document.createElement('span');label.textContent=final ? 'Peek Poker · final scores' : `Scores · round ${String(view.round)} of ${String(view.totalRounds)}`;
  const title=document.createElement('h1');
  const winners=board.filter(p=>p.place === 1);
  title.textContent=final && view.players.length === 1 ? 'Match complete' : winners.length === 1 ? `${winners[0]?.name ?? ''} ${final ? 'wins!' : 'leads'}` : `${String(winners.length)} players share first`;
  const score=document.createElement('strong');score.className='pp-winning-score';score.textContent=String(board[0]?.score ?? 0);
  const winnerLine=document.createElement('div');winnerLine.className='pp-winner-line';
  for(const p of winners) {const seat=document.createElement('b');seat.className='pp-seat';seat.style.background=p.colour;seat.style.color=SEAT_NUMERAL;seat.textContent=String(p.seat);seat.title=p.name;winnerLine.append(seat);}
  winnerLine.append(score);summary.append(label,title,winnerLine);

  if(!final) {const hint=document.createElement('p');hint.textContent=view.round === view.totalRounds ? 'Final scores in 5 seconds' : 'Next round in 5 seconds';summary.append(hint);}
  const list=document.createElement('ol');list.className='pp-score-list';list.setAttribute('aria-label',final ? 'Final podium' : 'Running scoreboard');
  board.forEach((p,index)=>{const row=document.createElement('li');row.className='pp-score-row';
    const place=document.createElement('strong');place.textContent=`${p.tied ? '=' : ''}${String(p.place)}`;
    const seat=document.createElement('b');seat.className='pp-seat';seat.style.background=p.colour;seat.style.color=SEAT_NUMERAL;seat.textContent=String(p.seat);
    const name=document.createElement('span');name.className='pp-name';name.textContent=p.name;name.title=p.name;
    const points=document.createElement('strong');points.textContent=String(p.score);row.append(place,seat,name,points);list.append(row);
    if(!reduced) {const motion=enter({kind:'row',index,reduced:false});row.animate(motion.keyframes,motion.options);}
  });root.append(summary,list);updateResultBest(root,view,reduced);
}

/** Update save confirmation without replacing the podium or restarting its entrances. */
export function updateResultBest(root: HTMLElement, view: PokerPublicView, reduced: boolean) {
  let best=root.querySelector<HTMLElement>('.pp-result-best');
  if(view.soloBest === null || (!view.newBest && view.soloBest <= 0)) {best?.remove();return;}
  const text=view.newBest ? `New best · ${String(view.players[0]?.score ?? 0)}` : `Best ${String(view.soloBest)}`;
  if(best?.textContent === text) return;
  if(!best) {best=document.createElement('p');best.className='pp-result-best';root.querySelector('.pp-winner-line')?.after(best);}
  best.textContent=text;
  if(view.newBest && !reduced) {
    const rows=root.querySelectorAll('.pp-score-row');
    const entrance=enter({kind:'row',index:Math.max(0,rows.length-1),reduced:false});
    const animation=rows[rows.length-1]?.getAnimations()[0];
    // A pending entrance has not advanced yet; a missing entrance is already settled.
    const elapsed=animation ? Number(animation.currentTime ?? 0) : entrance.options.delay+entrance.options.duration;
    const delay=Math.max(0,entrance.options.delay+entrance.options.duration-elapsed);
    const motion=pulse({reduced:false});best.animate(motion.keyframes,{...motion.options,delay});
  }
}
