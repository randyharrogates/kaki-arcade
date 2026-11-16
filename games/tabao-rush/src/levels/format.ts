import type { Container, Facing, StationType } from '../rules/state';

export interface Anchor {
  readonly id: string;
  readonly tile: number;
  readonly facing: Facing;
  readonly kitchen: string;
  readonly kind: StationType | 'crate' | 'extinguisher';
  readonly ingredient?: string;
  readonly container?: Container;
  /** Initial clean containers; bounded by the rack's kind. */
  readonly stock?: number;
}
export type Twist =
  | { readonly kind: 'split-kitchen'; readonly kitchens: readonly string[] }
  | { readonly kind: 'moving-trolley'; readonly path: readonly number[] }
  | { readonly kind: 'rain-slick'; readonly tiles: readonly number[] }
  | { readonly kind: 'shared-wok'; readonly station: string }
  | { readonly kind: 'shared-pantry' | 'trade-across' | 'gold-order' | 'sabo'; readonly tiles: readonly number[] };
export interface LevelDefinition {
  readonly id: string;
  readonly name: string;
  readonly venue: 'kopitiam' | 'hawker centre' | 'pasar malam' | 'zi char';
  readonly width: number;
  readonly height: number;
  /** Row-major floor, wall or counter. Anchors replace floor cells at load time. */
  readonly collision: readonly ('floor' | 'wall' | 'counter')[];
  readonly kitchens: readonly string[];
  readonly spawns: readonly { readonly tile: number; readonly kitchen: string; readonly facing: Facing }[];
  readonly stations: readonly Anchor[];
  readonly twists: readonly Twist[];
  readonly allowedDishes: readonly string[];
  readonly roundSeconds: number;
  readonly soloThresholds: readonly [number, number, number];
  readonly ordinal: number;
  readonly firesEnabled: boolean;
  readonly fireNeighbours?: Readonly<Record<number, readonly number[]>>;
}
