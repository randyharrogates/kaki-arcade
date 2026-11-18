/** PERF-023/024. Straight alpha; no mipmaps (two-pixel guards only protect base levels).
 * Half detail divides all geometric coordinates, including named anchors, by two.
 * Restore logical full coordinates for gameplay; metadata is unchanged. */
export type Direction = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
export interface SizeTotals { bytes: number; gpuBytes: number }
export interface DetailFile extends SizeTotals { file: string; width: number; height: number }
export interface Frame {
  rect: [number, number, number, number];
  sourceSize: [number, number]; trim: [number, number]; anchor: [number, number];
  /** Cook throwHand is the throwing hand; hands uses that wrist during throw,
   * otherwise the midpoint. Follow through releaseFrame, then use an item arc. */
  anchors: Record<string, [number, number]> & { throwHand?: [number, number] }; metadata: Record<string, unknown>;
}
/** Walk-type frames advance by distance: floor(distance × 8 / strideTiles) mod 8,
 * rather than by fps. */
export type Animation = { action: string; fps: number; loop?: boolean; strideTiles?: number; releaseFrame?: number } & (
  { directions: Record<Direction, string[]>; frames?: never } |
  { frames: string[]; directions?: never }
);
export interface Atlas {
  full: DetailFile; half: DetailFile; id: string; layer: string;
  set: string; frames: Record<string, Frame>; wastedArea: number;
}
export interface Totals { full: SizeTotals; half: SizeTotals }
export interface DataFile { file: string; source: string; bytes: number; sha256: string }
export interface AssetManifest {
  version: 1; alphaMode: 'straight'; mipmaps: false; halfRule: string;
  atlases: Atlas[]; totals: Totals;
  sets: Record<string, { anchors: string[]; layers: string[]; metadata: string[]; encoding: 'lossless' | 'lossy'; quality: number; atlases: string[]; animations: Animation[]; totals: Totals }>;
  rounds: Record<string, { sets: string[]; atlases: string[]; files: DataFile[]; collisionMap?: string; stationAnchors?: string; totals: Totals }>;
}
