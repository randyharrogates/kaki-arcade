// Colours that are the same in every theme: players, teams and the four shapes
// (docs/DESIGN.md §4.2 and §4.4, D-047, D-048, D-050). This package is the only place a raw
// colour may be written.

/** Seat numerals use dark ink on every player colour (D-056). */
export const SEAT_NUMERAL = '#2B2118';

/** Text and symbols drawn on a team, shape or chip colour. */
export const ON_COLOUR = '#FFFFFF';

export const SEAT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type SeatNumber = (typeof SEAT_NUMBERS)[number];

export interface PlayerColour {
  /** 1 to 8. Always shown with the colour, so players are told apart without colour. */
  readonly seat: SeatNumber;
  readonly token: ColourTokenName;
  readonly colour: string;
}

/** Player colours by seat, 1 to 8. */
export const PLAYER_COLOURS = [
  { seat: 1, token: 'seat-1', colour: '#D9483B' },
  { seat: 2, token: 'seat-2', colour: '#2F7FD6' },
  { seat: 3, token: 'seat-3', colour: '#F2B21B' },
  { seat: 4, token: 'seat-4', colour: '#39A85B' },
  { seat: 5, token: 'seat-5', colour: '#8E5BD0' },
  { seat: 6, token: 'seat-6', colour: '#F07C2A' },
  { seat: 7, token: 'seat-7', colour: '#22A6A6' },
  { seat: 8, token: 'seat-8', colour: '#D95C9A' },
] as const satisfies readonly PlayerColour[];

export const TEAM_NAMES = ['red', 'blue'] as const;
export type TeamName = (typeof TEAM_NAMES)[number];

export interface TeamTheme {
  readonly team: TeamName;
  readonly token: ColourTokenName;
  /** What players see written: the team is never told by colour alone. */
  readonly label: string;
  readonly colour: string;
}

/** The two team themes. */
export const TEAM_THEMES = {
  red: { team: 'red', token: 'team-red', label: 'Red team', colour: '#D9483B' },
  blue: { team: 'blue', token: 'team-blue', label: 'Blue team', colour: '#2F7FD6' },
} as const satisfies Record<TeamName, TeamTheme>;

export const SHAPE_NAMES = ['cross', 'circle', 'square', 'triangle'] as const;
export type ShapeName = (typeof SHAPE_NAMES)[number];

export interface ShapeButton {
  readonly shape: ShapeName;
  readonly token: ColourTokenName;
  readonly colour: string;
  /** Where the button sits in the diamond of four. */
  readonly position: 'bottom' | 'right' | 'left' | 'top';
  /**
   * The shape as an SVG path on a 24 × 24 box, drawn by us. Stroke it in `ON_COLOUR` with
   * round caps and joins and no fill. No letter goes with it.
   */
  readonly path: string;
}

/**
 * The four face buttons and the four Rabakz answers: one shape and one colour each, in Kaki
 * Arcade's own colours, with no letters.
 */
export const SHAPE_BUTTONS = {
  cross: { shape: 'cross', token: 'shape-cross', colour: '#D9483B', position: 'bottom', path: 'M5 5 19 19M19 5 5 19' },
  circle: {
    shape: 'circle',
    token: 'shape-circle',
    colour: '#2F7FD6',
    position: 'right',
    path: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z',
  },
  square: { shape: 'square', token: 'shape-square', colour: '#B87D0C', position: 'left', path: 'M4 4H20V20H4Z' },
  triangle: { shape: 'triangle', token: 'shape-triangle', colour: '#2E9A5B', position: 'top', path: 'M12 4 21 20H3Z' },
} as const satisfies Record<ShapeName, ShapeButton>;

/** Stroke width for a shape on its 24 × 24 box. */
export const SHAPE_STROKE = 3;

/**
 * Every colour a controller layout or a game may ask for by name. The game interface carries
 * these names, never colour values.
 */
export const COLOUR_TOKEN_NAMES = [
  'seat-1',
  'seat-2',
  'seat-3',
  'seat-4',
  'seat-5',
  'seat-6',
  'seat-7',
  'seat-8',
  'team-red',
  'team-blue',
  'shape-cross',
  'shape-circle',
  'shape-square',
  'shape-triangle',
] as const;
export type ColourTokenName = (typeof COLOUR_TOKEN_NAMES)[number];

/** Each named colour token and its value. */
export const COLOUR_TOKENS = {
  'seat-1': PLAYER_COLOURS[0].colour,
  'seat-2': PLAYER_COLOURS[1].colour,
  'seat-3': PLAYER_COLOURS[2].colour,
  'seat-4': PLAYER_COLOURS[3].colour,
  'seat-5': PLAYER_COLOURS[4].colour,
  'seat-6': PLAYER_COLOURS[5].colour,
  'seat-7': PLAYER_COLOURS[6].colour,
  'seat-8': PLAYER_COLOURS[7].colour,
  'team-red': TEAM_THEMES.red.colour,
  'team-blue': TEAM_THEMES.blue.colour,
  'shape-cross': SHAPE_BUTTONS.cross.colour,
  'shape-circle': SHAPE_BUTTONS.circle.colour,
  'shape-square': SHAPE_BUTTONS.square.colour,
  'shape-triangle': SHAPE_BUTTONS.triangle.colour,
} as const satisfies Record<ColourTokenName, string>;

const TOKEN_NAME_SET: ReadonlySet<string> = new Set(COLOUR_TOKEN_NAMES);

/** True when `value` is one of the names in `COLOUR_TOKEN_NAMES`. */
export function isColourTokenName(value: unknown): value is ColourTokenName {
  return typeof value === 'string' && TOKEN_NAME_SET.has(value);
}

/** The CSS custom property that holds a named colour, for example `--ka-seat-3`. */
export function colourTokenProperty(name: ColourTokenName): string {
  return `--ka-${name}`;
}

/** A named colour as a CSS value, for example `var(--ka-seat-3)`. */
export function colourTokenVar(name: ColourTokenName): string {
  return `var(${colourTokenProperty(name)})`;
}

/** The token name for a seat. */
export function seatToken(seat: SeatNumber): ColourTokenName {
  return `seat-${String(seat)}` as ColourTokenName;
}

/** The colour for a seat, 1 to 8. */
export function playerColour(seat: SeatNumber): string {
  return COLOUR_TOKENS[seatToken(seat)];
}

/** D-125: opaque grey disabled controls with readable, reduced-contrast ink. */
export const DISABLED_FILL = '#B8B8B8';
export const DISABLED_INK = '#3F3F3F';
