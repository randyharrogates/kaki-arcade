import { COLOUR_TOKENS } from '../../../packages/ui/src/index';
import type { PokerPublicView } from './view-model';
/** Equal totals share competition places; seat orders display only. */
export function scoreboardModel(view: PokerPublicView) {
  return view.players.map(p => ({ id: p.id, name: p.name, seat: p.seat,
    colour: COLOUR_TOKENS[p.colour], score: p.score,
    place: 1 + view.players.filter(other => other.score > p.score).length,
    tied: view.players.filter(other => other.score === p.score).length > 1,
  })).sort((a,b) => b.score-a.score || a.seat-b.seat);
}
