// WCAG 2 contrast, and the list of text and background pairs every theme declares
// (docs/DESIGN.md §2 "check contrast" and §6 "text contrast holds over the treatment").

import { SEAT_NUMERAL, ON_COLOUR, PLAYER_COLOURS, SHAPE_BUTTONS, SHAPE_NAMES, TEAM_NAMES, TEAM_THEMES } from './colour';
import { PEEK_POKER_CARDS, THEME_NAMES, THEMES } from './themes';
import type { Theme } from './themes';

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** Reads `#RRGGBB`. Anything else is an error: tokens are written one way. */
export function parseHex(colour: string): Rgb {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour);
  if (match === null) throw new Error(`not a #RRGGBB colour: ${colour}`);
  const [, r = '', g = '', b = ''] = match;
  return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
}

export function toHex(colour: Rgb): string {
  const part = (value: number): string => Math.round(value).toString(16).padStart(2, '0').toUpperCase();
  return `#${part(colour.r)}${part(colour.g)}${part(colour.b)}`;
}

/** `top` at the given opacity over `base`, as the opaque colour that ends up on screen. */
export function blend(top: string, opacity: number, base: string): string {
  const a = parseHex(top);
  const b = parseHex(base);
  const mix = (x: number, y: number): number => x * opacity + y * (1 - opacity);
  return toHex({ r: mix(a.r, b.r), g: mix(a.g, b.g), b: mix(a.b, b.b) });
}

/** Relative luminance, 0 (black) to 1 (white). */
export function luminance(colour: string): number {
  const { r, g, b } = parseHex(colour);
  const linear = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `body` text needs 4.5 : 1. `large` text (24 px, or 19 px bold) and symbols need 3 : 1. */
export type ContrastUse = 'body' | 'large';

export const CONTRAST_MINIMUM = { body: 4.5, large: 3 } as const satisfies Record<ContrastUse, number>;

export interface ContrastPair {
  /** Stable name, for example `rabakz: secondary on background`. */
  readonly id: string;
  readonly text: string;
  readonly background: string;
  readonly use: ContrastUse;
}

export interface ContrastResult extends ContrastPair {
  readonly ratio: number;
  readonly minimum: number;
  readonly pass: boolean;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/** Every text and background pair one theme declares, over the base and over the treatment. */
export function themeContrastPairs(theme: Theme): ContrastPair[] {
  const pairs: ContrastPair[] = [];
  const add = (what: string, text: string, where: string, backgrounds: readonly string[], use: ContrastUse): void => {
    unique(backgrounds).forEach((background, index) => {
      const part = index === 0 ? where : `${where} (treatment ${background})`;
      pairs.push({ id: `${theme.name}: ${what} on ${part}`, text, background, use });
    });
  };
  const background = [theme.background.colour, ...theme.background.treatment.paints];
  const panel = [theme.panel.from, ...theme.panel.treatment.paints];
  add('ink', theme.background.ink, 'background', background, 'body');
  add('secondary', theme.background.secondary, 'background', background, 'body');
  add('ink', theme.panel.ink, 'panel', panel, 'body');
  add('secondary', theme.panel.secondary, 'panel', panel, 'body');
  add('accent text', theme.accent.ink, 'accent fill', [theme.accent.fill], 'body');
  add('stick outline', theme.stickOutline, 'background', background, 'large');
  add('chip text', theme.chip.ink, 'chip', [theme.chip.fill], 'body');
  return pairs;
}

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;

/**
 * Dark numerals on players, white text on teams, white shapes, and suits on card faces.
 * Seat numbers, shapes and suit marks are large symbols. Team text is at least 21 px
 * and bold (TEAM_TEXT_WEIGHT, D-056), qualifying for the 3 : 1 large-text minimum.
 */
export function fixedContrastPairs(): ContrastPair[] {
  return [
    ...SUITS.flatMap((suit): ContrastPair[] =>
      [PEEK_POKER_CARDS.face.from, PEEK_POKER_CARDS.face.to].map((background) => ({
        id: `${suit} on card face ${background}`,
        text: PEEK_POKER_CARDS.suits[suit],
        background,
        use: 'large',
      })),
    ),
    // Badge fill against the shared marble base; the white ring is retained separately.
    ...PLAYER_COLOURS.map((player): ContrastPair => ({
      id: `${player.token} fill on marble`,
      text: player.colour,
      background: THEMES.console.background.colour,
      use: 'large',
    })),
    ...PLAYER_COLOURS.map(
      (player): ContrastPair => ({
        id: `numeral on ${player.token}`,
        text: SEAT_NUMERAL,
        background: player.colour,
        use: 'large',
      }),
    ),
    ...TEAM_NAMES.map(
      (team): ContrastPair => ({
        id: `white on ${TEAM_THEMES[team].token}`,
        text: ON_COLOUR,
        background: TEAM_THEMES[team].colour,
        use: 'large',
      }),
    ),
    ...SHAPE_NAMES.map(
      (shape): ContrastPair => ({
        id: `white on ${SHAPE_BUTTONS[shape].token}`,
        text: ON_COLOUR,
        background: SHAPE_BUTTONS[shape].colour,
        use: 'large',
      }),
    ),
  ];
}

/** Every declared pair: all four themes, then the fixed colours. */
export function allContrastPairs(): ContrastPair[] {
  return [...THEME_NAMES.flatMap((name) => themeContrastPairs(THEMES[name])), ...fixedContrastPairs()];
}

export function measure(pair: ContrastPair): ContrastResult {
  const ratio = contrastRatio(pair.text, pair.background);
  const minimum = CONTRAST_MINIMUM[pair.use];
  return { ...pair, ratio, minimum, pass: ratio >= minimum };
}
