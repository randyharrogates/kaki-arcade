import type { GameMeta } from '@kaki/platform';

/** Picker metadata: no simulation or content imports. */
export const meta: GameMeta = { id: 'rabakz', name: 'Rabakz', blurb: 'Race to the right answer.',
    players: { min: 1, max: 8 }, teams: 'optional', coop: false, solo: true, midGameJoin: true };
