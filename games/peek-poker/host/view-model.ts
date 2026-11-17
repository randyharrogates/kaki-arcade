import { COLOUR_TOKENS, space, tv } from '../../../packages/ui/src/index';
import type { peekPoker } from '../src/index';
export type PokerPublicView = ReturnType<typeof peekPoker.publicView>;
export const CARD = { width: 176, height: 231, contentWidth: 150, contentHeight: 205 } as const;
export const GRID = { width: CARD.contentWidth * 4 + space[21] * 3, height: CARD.contentHeight * 4 + space[21] * 3 };
export const gridPoint = (index: number) => ({ x: (tv.width-GRID.width)/2 + CARD.contentWidth/2 + (index % 4) * (CARD.contentWidth + space[21]), y: (tv.height-GRID.height)/2 + CARD.contentHeight/2 + Math.floor(index / 4) * (CARD.contentHeight + space[21]) });
export function frameId(code: string) { return `card-${code.replace('T', '10').toLowerCase()}`; }
export function swapDestination(index: number, swap: PokerPublicView['swap']) {
  if (!swap) return index;
  const unit = swap.kind === 'rows' ? Math.floor(index / 4) : index;
  const target = unit === swap.from ? swap.to : unit === swap.to ? swap.from : unit;
  return swap.kind === 'rows' ? target * 4 + index % 4 : target;
}
export function screenModel(view: PokerPublicView) {
  const reveal = ['reveal', 'scoreboard', 'over'].includes(view.phase);
  const players = [...view.players].sort((a,b) => a.seat-b.seat).map(p => ({
    id: p.id, name: p.name, seat: p.seat, colour: COLOUR_TOKENS[p.colour], status: p.waiting ? 'Next round' : view.phase === 'pick' ? p.locked ? 'Picked' : 'Picking' : '',
  }));
  return {
    phase: view.phase, round: view.round, totalRounds: view.totalRounds, seconds: view.seconds, reveal, players,
    label: view.phase === 'memorise' ? 'Memorise the cards' : view.phase === 'swap' ? 'Watch the swap' : reveal ? 'The reveal' : 'Pick two cards',
    shared: view.shared.map(frameId), swap: view.swap,
    grid: Array.from({length:16}, (_, index) => ({ index, point: gridPoint(index),
      frame: view.grid?.[index] ? frameId(view.grid[index]) : 'card-back',
      destination: gridPoint(swapDestination(index, view.swap)),
      marks: reveal ? players.filter(p => view.players.find(source => source.id === p.id)?.picks?.includes(index)) : [],
    })),
    hands: reveal ? view.hands.map(h => ({ ...h, player: players.find(p => p.id === h.id) })) : [],
  };
}
export type ScreenModel = ReturnType<typeof screenModel>;
