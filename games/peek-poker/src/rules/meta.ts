import type { GameMeta } from '@kaki/platform';

/** Picker metadata: no simulation or content imports. */
export const meta: GameMeta = {
    id: 'peek-poker', name: 'Peek Poker',
    blurb: 'Memorise the grid, then pick two cards to make the best hand.',
    players: { min: 1, max: 8 }, teams: 'none', coop: false, solo: true, localSeat: 'watch', midGameJoin: true,
  };
