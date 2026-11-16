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
  | { readonly kind: 'station'; readonly stationId: string; readonly ingredient?: string; readonly stationType?: StationType };

export interface Level {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  /** Row-major static data. Station behaviour belongs to T-03. */
  readonly tiles: readonly Tile[];
  readonly firesEnabled?: boolean;
  readonly extinguisherTile?: number;
  readonly fireNeighbours?: Readonly<Record<number, readonly number[]>>;
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

export interface Point { readonly x: number; readonly y: number }
export type ItemLocation =
  | { readonly kind: 'held'; readonly cook: string }
  | { readonly kind: 'counter'; readonly tile: number }
  | { readonly kind: 'floor'; readonly tile: number }
  | { readonly kind: 'flight'; readonly start: Point; readonly end: Point;
      readonly rest: { readonly kind: 'counter' | 'floor'; readonly tile: number };
      readonly startStep: number; readonly duration: number; readonly thrower: string };

/** Processing replaces kind in place, preserving identity and ingredient; carrying relocates. */
export interface Item {
  readonly id: number;
  readonly kind: 'raw' | 'chopped' | 'cooked' | 'burnt' | 'dirty-plate' | 'plate' | 'dish' | 'extinguisher';
  readonly ingredient?: string;
  /** Ordered completed processes; omitted on older/fixture items means no recorded steps. */
  readonly processes?: readonly StationType[];
  readonly place: ItemLocation;
}

export interface TabaoState {
  readonly fireSpreadClock?: number;
  readonly stations?: Readonly<Record<number, Station>>;
  readonly inventory: Inventory;
  /** Monotonic issuance count (crates plus initial equipment) and next item identity. */
  readonly nextItemId: number;
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

/** Location indexes are authoritative; flattening is only for publication and inspection. */
export interface Inventory {
  readonly held: Readonly<Record<string, Item | undefined>>;
  readonly counters: Readonly<Record<number, Item | undefined>>;
  readonly floor: Readonly<Record<number, readonly Item[] | undefined>>;
  readonly flights: readonly Item[];
  readonly floorCount: number;
  readonly reserved: Readonly<Record<number, number | undefined>>;
}

export function items(state: TabaoState): readonly Item[] {
  return [...Object.values(state.inventory.held).filter((i): i is Item => i !== undefined),
    ...Object.values(state.inventory.counters).filter((i): i is Item => i !== undefined),
    ...Object.values(state.inventory.floor).flatMap((pile) => pile ?? []),
    ...state.inventory.flights,
    ...Object.values(state.stations ?? {}).flatMap((s) => s.content ? [s.content] : [])].sort((a, b) => a.id - b.id);
}

export function inventory(entries: readonly Item[] = []): Inventory {
  const held: Record<string, Item> = {};
  const counters: Record<number, Item> = {};
  const floor: Record<number, Item[]> = {};
  const flights: Item[] = [];
  let floorCount = 0;
  const reserved: Record<number, number> = {};
  for (const item of entries) {
    const place = item.place;
    if (place.kind === 'held') held[place.cook] = item;
    else if (place.kind === 'counter') counters[place.tile] = item;
    else if (place.kind === 'floor') { (floor[place.tile] ??= []).push(item); floorCount++; }
    else { flights.push(item); reserved[place.rest.tile] = (reserved[place.rest.tile] ?? 0) + 1; }
  }
  return { held, counters, floor, flights, floorCount, reserved };
}

export type StationType = 'chop' | 'wok' | 'pot' | 'grill' | 'rice' | 'drinks' | 'plating' | 'sink' | 'bin';
export interface Station {
  readonly tile: number;
  readonly id: string;
  readonly type: StationType;
  readonly neighbours: readonly number[];
  readonly content: Item | null;
  readonly progress: number;
  readonly total: number;
  readonly doneAge: number;
  readonly burntAge: number;
  readonly warning: boolean;
  readonly fire: boolean;
  readonly fireAge: number;
  readonly extinguish: number;
  readonly workedAt: number;
  readonly worker?: number | null;
  readonly turned: boolean;
}
