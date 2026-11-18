// Golden-ratio scale: spacing, radii, screen sizes and split helpers (docs/DESIGN.md §1, §4.3).

/** The golden ratio as the design rules write it. */
export const PHI = 1.618;

/** Every spacing value allowed, in px (docs/DESIGN.md §1, widened by D-050). */
export const SPACING = [0, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377] as const;
export type Spacing = (typeof SPACING)[number];

/** Spacing by its px value: `space[21]` is 21. Keys are the only spacing values there are. */
export const space = {
  0: 0,
  5: 5,
  8: 8,
  13: 13,
  21: 21,
  34: 34,
  55: 55,
  89: 89,
  144: 144,
  233: 233,
  377: 377,
} as const satisfies Record<Spacing, Spacing>;

/** A spacing value as a CSS length. */
export function px(value: number): string {
  return value === 0 ? '0' : `${String(value)}px`;
}

/** Corner radii in px. `corner` is the one used on panels, cards and buttons (§4.2). */
export const radius = {
  none: 0,
  hairline: 3,
  small: 5,
  medium: 8,
  corner: 13,
  large: 21,
  /** Fully rounded ends: chips and pills. */
  pill: 9999,
} as const;
export type RadiusName = keyof typeof radius;

/** Width of a panel's edge in px (§4.2: "a 3 px edge"). */
export const EDGE_WIDTH = 3;

/** The big screen: fixed 1920 × 1080 with a 55 px safe margin, never scrolling (§4.3). */
export const tv = {
  width: 1920,
  height: 1080,
  safeMargin: 55,
} as const;

/** The reference phone, landscape (board 4). Other phones scale from it. */
export const phone = {
  width: 844,
  height: 390,
} as const;

/** Design boards (§1). */
export const artboard = {
  width: 1440,
  height: 890,
} as const;

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** The area of a screen inside its safe margin. For the TV: 1810 × 970 at (55, 55). */
export function safeArea(screen: Size = tv, margin: number = tv.safeMargin): Rect {
  return {
    left: margin,
    top: margin,
    width: Math.max(0, screen.width - 2 * margin),
    height: Math.max(0, screen.height - 2 * margin),
  };
}

export interface GoldenSplit {
  /** The larger part. */
  readonly primary: number;
  /** The smaller part. primary : secondary is 1.618 : 1. */
  readonly secondary: number;
}

/**
 * Splits a length 1.618 : 1 after taking out the gap between the two parts.
 * Results are whole pixels and always add up to `total - gap`.
 */
export function goldenSplit(total: number, gap: Spacing = 0): GoldenSplit {
  const room = Math.max(0, total - gap);
  const secondary = Math.round(room / (PHI + 1));
  return { primary: room - secondary, secondary };
}

/** `grid-template-columns` (or rows) for a 1.618 : 1 split. */
export const GOLDEN_COLUMNS = '1.618fr 1fr';
/** The same split with the secondary part first. */
export const GOLDEN_COLUMNS_REVERSED = '1fr 1.618fr';

/** Height of a 1.618 : 1 media panel of the given width, in whole pixels. */
export function goldenHeight(width: number): number {
  return Math.round(width / PHI);
}

/** Width of a 1.618 : 1 media panel of the given height, in whole pixels. */
export function goldenWidth(height: number): number {
  return Math.round(height * PHI);
}

/** `aspect-ratio` for a media panel. */
export const GOLDEN_ASPECT = '1.618 / 1';

/** D-140: perspective distance for turning cards, in px. */
export const CARD_PERSPECTIVE = 610;

/** PLAT-022: final-screen hand-off band, measured from the artboard foot. */
export const FINAL_HINT_BAND = space[55] + space[34];
