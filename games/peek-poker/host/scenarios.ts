import { PLAYER_COLOURS } from '../../../packages/ui/src/index';
import { peekPoker } from '../src/index';
import { finishSwap, reveal } from '../src/rules/round';
import type { State } from '../src/index';

export const PHASES = ['memorise', 'swap', 'picking', 'locked', 'reveal'] as const;
export type DemoPhase = typeof PHASES[number];

/** Seeded round-three fixture; hidden cards really exchange before picks are scored. */
export function scenario(phase: DemoPhase, count = 8, rowSwap = false): State {
  const names = ['Aisha', 'Ben', 'Cheryl', 'Dinesh', 'Eve', 'Farah', 'Gavin', 'Hana'];
  const players = PLAYER_COLOURS.slice(0, count).map(p => ({
    id: `p${String(p.seat)}`, name: names[p.seat - 1] ?? 'Player', seat: p.seat, colour: p.token,
  }));
  const initial = { ...peekPoker.init(404, players, { rounds: 5 }, { data: {}, saved: null, teams: false }), round: rowSwap ? 4 : 3, left: 720 };
  if (phase === 'memorise') return initial;
  const swapping: State = { ...initial, phase: 'swap', left: 120,
    swaps: [rowSwap ? {kind:'rows',from:0,to:3} : { kind: 'cards', from: 5, to: 10 }], swapIndex: 0 };
  if (phase === 'swap') return swapping;
  const picking = finishSwap(swapping);
  const state: State = { ...picking,
    players: picking.players.map((p, i) => ({ ...p, picks: [5, i === 0 ? 10 : 6],
      locked: phase !== 'picking' && (i % 2 === 0 || phase === 'reveal'), lockOrder: i })),
  };
  return phase === 'reveal' ? reveal(state) : state;
}
