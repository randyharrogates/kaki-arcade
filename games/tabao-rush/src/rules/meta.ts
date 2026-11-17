import type { GameMeta } from '@kaki/platform';

/** Picker metadata: no simulation or content imports. */
export const meta: GameMeta = {
    id: 'tabao-rush',
    name: 'Tabao Rush',
    blurb: 'Move together around a Singapore hawker stall.',
    players: { min: 1, max: 8 },
    teams: 'none',
    coop: true,
    solo: true,
  };
