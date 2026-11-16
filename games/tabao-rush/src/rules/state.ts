import type { ColourToken, PlayerInfo } from '@kaki/platform';
import type { RngState } from '@kaki/sim-core';

/** Tile units; positive y is down the screen. All tuning is provisional for T-01. */
export const WALK_SPEED = 3;
export const STICK_DEAD_ZONE = 0.12;
export const COOK_RADIUS = 0.2;
export const ALLOWED_OVERLAP = 0.04;
export const MIN_SEPARATION = COOK_RADIUS * 2 - ALLOWED_OVERLAP;
export const SOFT_SEPARATION = 0.46;
export const SOFT_PUSH = 0.008;
export const STATION_REACH = 0.85;

export type Tile =
  | { readonly kind: 'floor' }
  | { readonly kind: 'wall' }
  | { readonly kind: 'counter' }
  | { readonly kind: 'station'; readonly stationId: string };

export interface Level {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  /** Row-major static data. Station behaviour belongs to T-03. */
  readonly tiles: readonly Tile[];
  readonly spawns: readonly { readonly x: number; readonly y: number }[];
}

/** Clockwise, starting east. Facing retains an 8-degree margin beyond sector edges (D-072). */
export type Facing = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Cook {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** Requested velocity in tiles/second; contact constrains actual displacement. */
  readonly vx: number;
  readonly vy: number;
  readonly facing: Facing;
  /** Row-major faced counter/station tile, or null. The highlight and later act share this. */
  readonly targetTile: number | null;
}

export interface Participant {
  readonly id: string;
  readonly seat: number;
  readonly name: string;
  readonly colour: ColourToken;
  readonly joinedMidGame: boolean;
  /** Mid-round joiners spectate; there is only one scaffold round. */
  readonly spectating: boolean;
}

export interface TabaoState {
  readonly rng: RngState;
  readonly level: Level;
  readonly players: readonly Participant[];
  readonly cooks: readonly Cook[];
  readonly tick: number;
  /** Interface scaffold only; T-05 replaces the round lifecycle and adds score/orders. */
  readonly endTick: number;
}

export function participant(player: PlayerInfo, tick: number): Participant {
  return {
    id: player.id,
    seat: player.seat,
    name: player.name,
    colour: player.colour,
    joinedMidGame: tick > 0,
    spectating: tick > 0,
  };
}
