// The console theme and the three game themes (docs/DESIGN.md §4.2, D-042, D-043). Values
// are the `.tC`, `.tR1`, `.tK1` and `.tT1` blocks of `tools/boards/board2b_template.html`
// and `tools/boards/board4_template.html`. A game theme changes colours and the surface
// pattern only: lettering, corners, spacing and the panel shape are shared.

import { ON_COLOUR } from './colour';
import { EDGE_WIDTH } from './scale';

export const THEME_NAMES = ['console', 'rabakz', 'peek-poker', 'tabao-rush'] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

/** The ONE treatment a surface carries, as a CSS background recipe over its base colour. */
export interface Treatment {
  /** What it is, in words. */
  readonly name: string;
  /** `background-image`. */
  readonly image: string;
  /** `background-size`. */
  readonly size: string;
  /** `background-position`. */
  readonly position: string;
  /**
   * The solid colours the treatment paints over the base, as they end up on screen. Text
   * contrast is checked against each of them as well as against the base.
   */
  readonly paints: readonly string[];
}

export interface Edge {
  readonly width: number;
  readonly style: 'solid' | 'dashed';
  readonly colour: string;
}

export interface Theme {
  readonly name: ThemeName;
  /** What the theme is called on the boards. */
  readonly label: string;
  /** The screen itself: what fills the TV and the phone behind everything. */
  readonly background: {
    readonly colour: string;
    readonly treatment: Treatment;
    /** Text on the background. */
    readonly ink: string;
    /** Secondary text on the background. */
    readonly secondary: string;
  };
  /** Cards and panels standing on the background. */
  readonly panel: {
    /** The panel's treatment is a soft gradient between these two. */
    readonly from: string;
    readonly to: string;
    readonly treatment: Treatment;
    readonly edge: Edge;
    /** Text on a panel. */
    readonly ink: string;
    /** Secondary text on a panel. */
    readonly secondary: string;
  };
  /** The main action: its fill and the text on that fill. */
  readonly accent: {
    readonly fill: string;
    readonly ink: string;
  };
  /** Outline of the floating stick area (D-056). */
  readonly stickOutline: string;
  /** Small pills: room code, labels, counters. */
  readonly chip: {
    readonly fill: string;
    readonly ink: string;
  };
}

const PANEL_ANGLE = '165deg';

function panelTreatment(from: string, to: string): Treatment {
  return {
    name: 'soft paper gradient',
    image: `linear-gradient(${PANEL_ANGLE}, ${from}, ${to})`,
    size: 'auto',
    position: '0 0',
    paints: [from, to],
  };
}

/** Terrazzo speckle on white marble: three chips of stone on an 89 px tile. */
const MARBLE: Treatment = {
  name: 'terrazzo speckle',
  image: [
    'radial-gradient(circle at 20% 30%, #D6CBBB 0 6px, transparent 6.5px)',
    'radial-gradient(circle at 72% 62%, #C7B6A2 0 4px, transparent 4.5px)',
    'radial-gradient(circle at 44% 86%, #B9C6B6 0 5px, transparent 5.5px)',
  ].join(', '),
  size: '89px 89px',
  position: '0 0',
  paints: ['#D6CBBB', '#C7B6A2', '#B9C6B6'],
};

const consoleTheme: Theme = {
  name: 'console',
  label: 'Marble table',
  background: { colour: '#EFEAE2', treatment: MARBLE, ink: '#2B2118', secondary: '#706151' },
  panel: {
    from: '#FFFFFF',
    to: '#F6F1E7',
    treatment: panelTreatment('#FFFFFF', '#F6F1E7'),
    edge: { width: EDGE_WIDTH, style: 'solid', colour: '#D8CDBB' },
    ink: '#2B2118',
    secondary: '#706151',
  },
  accent: { fill: '#B5371F', ink: ON_COLOUR },
  stickOutline: '#6B4426',
  chip: { fill: '#6B4426', ink: ON_COLOUR },
};

const rabakzTheme: Theme = {
  name: 'rabakz',
  label: 'R1 Bandung',
  background: {
    colour: '#4A1F3D',
    treatment: {
      name: 'halftone dots',
      image: 'radial-gradient(#5C2A4D 7px, transparent 7.5px), radial-gradient(#5C2A4D 7px, transparent 7.5px)',
      size: '42px 42px',
      position: '0 0, 21px 21px',
      paints: ['#5C2A4D'],
    },
    ink: '#FFF1F4',
    secondary: '#E9B7C8',
  },
  panel: {
    from: '#FFFFFF',
    to: '#FBEFF2',
    treatment: panelTreatment('#FFFFFF', '#FBEFF2'),
    edge: { width: EDGE_WIDTH, style: 'solid', colour: '#F2C9D6' },
    ink: '#3A1730',
    secondary: '#7D5670',
  },
  accent: { fill: '#FF9DB8', ink: '#3A1730' },
  stickOutline: '#E9B7C8',
  chip: { fill: '#7A3563', ink: ON_COLOUR },
};

const peekPokerTheme: Theme = {
  name: 'peek-poker',
  label: 'K1 Green baize',
  background: {
    colour: '#1D5741',
    treatment: {
      name: 'fine diagonal weave',
      image: 'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.04) 0 2px, transparent 2px 5px)',
      size: 'auto',
      position: '0 0',
      // White at 4% over the felt.
      paints: ['#265E49'],
    },
    ink: '#F6EFE2',
    secondary: '#BFE3D2',
  },
  panel: {
    from: '#FFFFFF',
    to: '#F6F1E7',
    treatment: panelTreatment('#FFFFFF', '#F6F1E7'),
    edge: { width: EDGE_WIDTH, style: 'solid', colour: '#CFE3D8' },
    ink: '#17352A',
    secondary: '#597469',
  },
  accent: { fill: '#E0A63A', ink: '#17352A' },
  stickOutline: '#BFE3D2',
  chip: { fill: '#14402F', ink: ON_COLOUR },
};

const tabaoRushTheme: Theme = {
  name: 'tabao-rush',
  label: 'T1 Order chit',
  // The kitchen keeps its rendered look. This background is the phone controller and any
  // screen that is not the kitchen: the console marble.
  background: { colour: '#EFEAE2', treatment: MARBLE, ink: '#2B2118', secondary: '#706151' },
  panel: {
    from: '#FFFFFF',
    to: '#FBF7F0',
    treatment: panelTreatment('#FFFFFF', '#FBF7F0'),
    edge: { width: EDGE_WIDTH, style: 'dashed', colour: '#B5371F' },
    ink: '#8E2A18',
    secondary: '#8E2A18',
  },
  accent: { fill: '#B5371F', ink: ON_COLOUR },
  stickOutline: '#B5371F',
  chip: { fill: '#B5371F', ink: ON_COLOUR },
};

/** The four themes by name. */
export const THEMES = {
  console: consoleTheme,
  rabakz: rabakzTheme,
  'peek-poker': peekPokerTheme,
  'tabao-rush': tabaoRushTheme,
} as const satisfies Record<ThemeName, Theme>;

/** The value of the `data-theme` attribute that selects a theme. */
export function themeAttribute(name: ThemeName): { readonly 'data-theme': ThemeName } {
  return { 'data-theme': name };
}

const THEME_NAME_SET: ReadonlySet<string> = new Set(THEME_NAMES);

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && THEME_NAME_SET.has(value);
}

/** Peek Poker's cards (K1): the back, the face and the four suit colours. */
export const PEEK_POKER_CARDS = {
  back: {
    colour: '#B5371F',
    treatment: {
      name: 'diagonal stripe',
      image: 'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.16) 0 5px, transparent 5px 13px)',
      size: 'auto',
      position: '0 0',
      // White at 16% over the card red.
      paints: ['#C15743'],
    } satisfies Treatment,
    border: ON_COLOUR,
  },
  face: {
    from: '#FFFFFF',
    to: '#F3EEE3',
    treatment: {
      name: 'soft paper gradient',
      image: 'linear-gradient(170deg, #FFFFFF, #F3EEE3)',
      size: 'auto',
      position: '0 0',
      paints: ['#FFFFFF', '#F3EEE3'],
    } satisfies Treatment,
  },
  suits: {
    spades: '#22201B',
    hearts: '#D9483B',
    diamonds: '#2F7FD6',
    clubs: '#2E9A5B',
  },
} as const;
