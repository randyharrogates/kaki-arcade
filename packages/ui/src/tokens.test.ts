import { describe, expect, it } from 'vitest';
import {
  BUTTON_FLOOR,
  buttonSize,
  buttonSizeCss,
  buttonSizes,
  COLOUR_TOKEN_NAMES,
  COLOUR_TOKENS,
  colourTokenVar,
  fontStack,
  GOLDEN_COLUMNS,
  inPlaySize,
  goldenHeight,
  goldenSplit,
  goldenWidth,
  isColourTokenName,
  isThemeName,
  PHI,
  PHONE_TYPE_SIZES,
  phoneScale,
  PLAYER_COLOURS,
  playerColour,
  radius,
  safeArea,
  seatToken,
  SHAPE_BUTTONS,
  SHAPE_NAMES,
  SPACING,
  space,
  TEAM_THEMES,
  THEME_NAMES,
  THEMES,
  tv,
  TV_TYPE_SIZES,
  tvType,
} from './index';

const HEX = /^#[0-9A-F]{6}$/;

describe('spacing, radii and the golden ratio (DESIGN §1)', () => {
  it('has exactly the φ scale, widened by D-050', () => {
    expect([...SPACING]).toEqual([0, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]);
    for (const value of SPACING) expect(space[value]).toBe(value);
  });

  it('keeps every corner radius on the radius scale', () => {
    const allowed = new Set([0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 9999]);
    for (const value of Object.values(radius)) expect(allowed.has(value)).toBe(true);
    expect(radius.corner).toBe(13);
  });

  it('splits 1.618 : 1 in whole pixels that add up', () => {
    for (const [total, gap] of [
      [1810, 34],
      [1810, 0],
      [844, 13],
      [970, 21],
      [1, 0],
    ] as const) {
      const { primary, secondary } = goldenSplit(total, gap);
      expect(primary + secondary).toBe(total - gap);
      expect(Number.isInteger(primary) && Number.isInteger(secondary)).toBe(true);
      if (total > 100) expect(primary / secondary).toBeCloseTo(PHI, 1);
    }
    expect(goldenSplit(1810, 34)).toEqual({ primary: 1098, secondary: 678 });
    expect(GOLDEN_COLUMNS).toBe('1.618fr 1fr');
    expect(goldenHeight(1618)).toBe(1000);
    expect(goldenWidth(1000)).toBe(1618);
  });

  it('gives the TV a 55 px safe margin', () => {
    expect(tv).toEqual({ width: 1920, height: 1080, safeMargin: 55 });
    expect(safeArea()).toEqual({ left: 55, top: 55, width: 1810, height: 970 });
  });
});

describe('lettering (DESIGN §4.2)', () => {
  it('has the five TV sizes and reads in play at 34 px or more', () => {
    expect([...TV_TYPE_SIZES]).toEqual([21, 34, 55, 89, 144]);
    expect(Object.values(tvType)).toEqual([...TV_TYPE_SIZES]);
    expect(tvType.body).toBe(34);
    expect([...PHONE_TYPE_SIZES]).toEqual([13, 21, 34, 55, 89]);
  });

  it('names the three families first, with real fallbacks and no remote font', () => {
    expect(fontStack.display.startsWith('"DM Serif Display", ')).toBe(true);
    expect(fontStack.body.startsWith('"DM Sans", ')).toBe(true);
    expect(fontStack.mono.startsWith('"JetBrains Mono", ')).toBe(true);
    expect(fontStack.display.endsWith(', serif')).toBe(true);
    expect(fontStack.body.endsWith(', sans-serif')).toBe(true);
    expect(fontStack.mono.endsWith(', monospace')).toBe(true);
    for (const stack of Object.values(fontStack)) {
      expect(stack.split(',').length).toBeGreaterThanOrEqual(4);
      expect(stack).not.toMatch(/https?:|url\(/);
    }
  });
});

describe('players, teams and shapes (DESIGN §4.2, §4.4, D-047, D-048, D-050)', () => {
  it('has the eight player colours in seat order', () => {
    expect(PLAYER_COLOURS.map((player) => player.colour)).toEqual([
      '#D9483B',
      '#2F7FD6',
      '#F2B21B',
      '#39A85B',
      '#8E5BD0',
      '#F07C2A',
      '#22A6A6',
      '#D95C9A',
    ]);
    PLAYER_COLOURS.forEach((player, index) => {
      expect(player.seat).toBe(index + 1);
      expect(player.token).toBe(seatToken(player.seat));
      expect(playerColour(player.seat)).toBe(player.colour);
    });
  });

  it('has the two team themes', () => {
    expect(TEAM_THEMES.red.colour).toBe('#D9483B');
    expect(TEAM_THEMES.blue.colour).toBe('#2F7FD6');
  });

  it('maps cross, circle, square, triangle to red, blue, amber, green and bottom, right, left, top', () => {
    expect([...SHAPE_NAMES]).toEqual(['cross', 'circle', 'square', 'triangle']);
    expect(SHAPE_NAMES.map((shape) => [SHAPE_BUTTONS[shape].colour, SHAPE_BUTTONS[shape].position])).toEqual([
      ['#D9483B', 'bottom'],
      ['#2F7FD6', 'right'],
      ['#B87D0C', 'left'],
      ['#2E9A5B', 'top'],
    ]);
    for (const shape of SHAPE_NAMES) expect(SHAPE_BUTTONS[shape].path).toMatch(/^M[\d .a-zA-Z-]+$/);
  });

  it('carries no letters on the shape buttons', () => {
    for (const shape of SHAPE_NAMES) expect(Object.keys(SHAPE_BUTTONS[shape]).sort()).toEqual(['colour', 'path', 'position', 'shape', 'token']);
  });

  it('exports the list of colour token names a layout may use', () => {
    expect([...COLOUR_TOKEN_NAMES]).toEqual([
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
    ]);
    expect(Object.keys(COLOUR_TOKENS)).toEqual([...COLOUR_TOKEN_NAMES]);
    for (const name of COLOUR_TOKEN_NAMES) {
      expect(isColourTokenName(name)).toBe(true);
      expect(COLOUR_TOKENS[name]).toMatch(HEX);
      expect(colourTokenVar(name)).toBe(`var(--ka-${name})`);
    }
    for (const bad of ['seat-0', 'seat-9', 'team-green', 'shape-star', '#D9483B', '', 3, null, undefined]) {
      expect(isColourTokenName(bad)).toBe(false);
    }
  });
});

describe('themes (DESIGN §4.2, D-042, D-043)', () => {
  it('has the console and one theme per game, each a complete set', () => {
    expect([...THEME_NAMES]).toEqual(['console', 'rabakz', 'peek-poker', 'tabao-rush']);
    for (const name of THEME_NAMES) {
      const theme = THEMES[name];
      expect(theme.name).toBe(name);
      expect(isThemeName(name)).toBe(true);
      const colours = [
        theme.background.colour,
        theme.background.ink,
        theme.background.secondary,
        theme.panel.from,
        theme.panel.to,
        theme.panel.edge.colour,
        theme.panel.ink,
        theme.panel.secondary,
        theme.accent.fill,
        theme.accent.ink,
        theme.chip.fill,
        theme.chip.ink,
        ...theme.background.treatment.paints,
        ...theme.panel.treatment.paints,
      ];
      for (const colour of colours) expect(colour).toMatch(HEX);
      expect(theme.panel.edge.width).toBe(3);
    }
    expect(isThemeName('landing')).toBe(false);
  });

  it('gives every surface exactly one treatment', () => {
    for (const name of THEME_NAMES) {
      for (const treatment of [THEMES[name].background.treatment, THEMES[name].panel.treatment]) {
        expect(treatment.image).toMatch(/gradient\(/);
        expect(treatment.image).not.toBe('none');
        // One recipe: every layer of the image is the same kind of gradient.
        const kinds = new Set(treatment.image.match(/(?:repeating-)?(?:linear|radial)-gradient/g));
        expect(kinds.size).toBe(1);
      }
    }
  });

  it('holds the decided values', () => {
    expect(THEMES.console.background.colour).toBe('#EFEAE2');
    expect(THEMES.console.panel.edge.colour).toBe('#D8CDBB');
    expect(THEMES.console.accent.fill).toBe('#B5371F');
    expect(THEMES.console.chip.fill).toBe('#6B4426');
    expect(THEMES.rabakz.background.colour).toBe('#4A1F3D');
    expect(THEMES.rabakz.background.treatment.paints).toEqual(['#5C2A4D']);
    expect(THEMES.rabakz.accent.fill).toBe('#FF9DB8');
    expect(THEMES.rabakz.chip.fill).toBe('#7A3563');
    expect(THEMES['peek-poker'].background.colour).toBe('#1D5741');
    expect(THEMES['peek-poker'].accent.fill).toBe('#E0A63A');
    expect(THEMES['tabao-rush'].panel.ink).toBe('#8E2A18');
    expect(THEMES['tabao-rush'].panel.edge).toEqual({ width: 3, style: 'dashed', colour: '#B5371F' });
    expect(THEMES['tabao-rush'].background).toEqual(THEMES.console.background);
  });
});

const FLOORS = { face: 110, inPlayWidth: 89, inPlayHeight: 68, minimum: 55 };

describe('button-size floors (DESIGN §4.4, D-051, D-053)', () => {
  it('holds face 110, in play 89 wide by 68 tall, and 55 for anything tappable, at 844 × 390', () => {
    expect(BUTTON_FLOOR).toEqual(FLOORS);
    expect(buttonSizes({ width: 844, height: 390 })).toEqual(FLOORS);
    expect(inPlaySize({ width: 844, height: 390 })).toEqual({ width: 89, height: 68 });
    expect(inPlaySize({ width: 1688, height: 780 })).toEqual({ width: 178, height: 136 });
  });

  it('grows with the phone and never goes under the floor', () => {
    expect(phoneScale({ width: 932, height: 430 })).toBeCloseTo(430 / 390, 5);
    expect(buttonSize('face', { width: 932, height: 430 })).toBe(121);
    expect(buttonSize('face', { width: 1688, height: 780 })).toBe(220);
    // The tighter side decides, so the button still fits.
    expect(buttonSize('face', { width: 2000, height: 390 })).toBe(110);
    // Smaller phones and nonsense sizes keep the floor.
    expect(buttonSizes({ width: 667, height: 375 })).toEqual(FLOORS);
    expect(buttonSizes({ width: 0, height: 0 })).toEqual(FLOORS);
    expect(buttonSize('minimum', { width: Number.NaN, height: 390 })).toBe(55);
  });

  it('reads a portrait size as landscape', () => {
    expect(buttonSize('face', { width: 430, height: 932 })).toBe(121);
  });

  it('states the same rule in CSS', () => {
    expect(buttonSizeCss('face')).toBe('max(110px, min(calc(max(100vw, 100svh) * 110 / 844), calc(min(100vw, 100svh) * 110 / 390)))');
    expect(buttonSizeCss('inPlayHeight')).toBe('max(68px, min(calc(max(100vw, 100svh) * 68 / 844), calc(min(100vw, 100svh) * 68 / 390)))');
  });
});
