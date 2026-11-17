// Builds `tokens.css` from the typed tokens, so the stylesheet and the TypeScript can never
// disagree. `scripts/build.mjs` writes the file; `generated.test.ts` fails when the committed
// file differs from what this returns.

import { BUTTON_FLOOR, buttonSizeCss } from './buttons';
import type { ButtonKind } from './buttons';
import { DISABLED_FILL, DISABLED_INK, COLOUR_TOKEN_NAMES, COLOUR_TOKENS, colourTokenProperty, ON_COLOUR, SEAT_NUMERAL } from './colour';
import {
  GHOST_OPACITY,
  derivedDuration,
  duration,
  easing,
  ENTER_DISTANCE,
  EXIT_FACTOR,
  exitDuration,
  KNOB_STRETCH,
  POPOVER_START_SCALE,
  PRESS_SCALE,
  PULSE_SCALE,
  STAGGER_MS,
  TEMPOS,
} from './motion-tokens';
import { CARD_PERSPECTIVE, GOLDEN_ASPECT, GOLDEN_COLUMNS, GOLDEN_COLUMNS_REVERSED, PHI, phone, px, radius, SPACING, tv } from './scale';
import type { RadiusName } from './scale';
import { PEEK_POKER_CARDS, THEME_NAMES, THEMES } from './themes';
import type { Theme } from './themes';
import { fontStack, fontWeight, lineHeight, PHONE_TYPE_SIZES, TEAM_TEXT_WEIGHT, TV_TYPE_SIZES } from './type';

type Declaration = readonly [property: string, value: string];

function block(selector: string, declarations: readonly Declaration[], indent = ''): string {
  const lines = declarations.map(([property, value]) => `${indent}  ${property}: ${value};`);
  return [`${indent}${selector} {`, ...lines, `${indent}}`].join('\n');
}

const BUTTON_KINDS: readonly ButtonKind[] = ['face', 'inPlayWidth', 'inPlayHeight', 'minimum'];
const BUTTON_CSS_NAME = {
  face: 'face',
  inPlayWidth: 'in-play-width',
  inPlayHeight: 'in-play-height',
  minimum: 'minimum',
} as const satisfies Record<ButtonKind, string>;
const RADIUS_NAMES: readonly RadiusName[] = ['none', 'hairline', 'small', 'medium', 'corner', 'large', 'pill'];
const EASING_CSS_NAME = { out: 'out', inOut: 'in-out', in: 'in', linear: 'linear' } as const;

/** Declarations that are the same in every theme. */
export function sharedDeclarations(): Declaration[] {
  return [
    ['--ka-card-perspective', px(CARD_PERSPECTIVE)],
    ...SPACING.map((value): Declaration => [`--ka-space-${String(value)}`, px(value)]),
    ...RADIUS_NAMES.map((name): Declaration => [`--ka-radius-${name}`, px(radius[name])]),
    ['--ka-opacity-ghost', String(GHOST_OPACITY)],
    ['--ka-phi', String(PHI)],
    ['--ka-golden-columns', GOLDEN_COLUMNS],
    ['--ka-golden-columns-reversed', GOLDEN_COLUMNS_REVERSED],
    ['--ka-golden-aspect', GOLDEN_ASPECT],
    ['--ka-tv-width', px(tv.width)],
    ['--ka-tv-height', px(tv.height)],
    ['--ka-tv-safe-margin', px(tv.safeMargin)],
    ['--ka-phone-width', px(phone.width)],
    ['--ka-phone-height', px(phone.height)],
    ['--ka-font-display', fontStack.display],
    ['--ka-font-body', fontStack.body],
    ['--ka-font-mono', fontStack.mono],
    ['--ka-weight-regular', String(fontWeight.regular)],
    ['--ka-weight-medium', String(fontWeight.medium)],
    ['--ka-weight-bold', String(fontWeight.bold)],
    ['--ka-line-display', String(lineHeight.display)],
    ['--ka-line-body', String(lineHeight.body)],
    ...TV_TYPE_SIZES.map((size): Declaration => [`--ka-type-${String(size)}`, px(size)]),
    ...PHONE_TYPE_SIZES.map((size): Declaration => [`--ka-phone-type-${String(size)}`, px(size)]),
    ['--ka-on-colour', ON_COLOUR],
    ['--ka-disabled-fill', DISABLED_FILL],
    ['--ka-disabled-ink', DISABLED_INK],
    ['--ka-disabled-border', '#E0E0E0'],
    ['--ka-disabled-panel-treatment', 'linear-gradient(165deg, #B8B8B8, #ADADAD)'],
    ['--ka-disabled-card-back-treatment', 'repeating-linear-gradient(45deg, #C3C3C3 0 5px, transparent 5px 13px)'],
    ['--ka-seat-numeral', SEAT_NUMERAL],
    ['--ka-team-text-weight', String(TEAM_TEXT_WEIGHT)],
    ...COLOUR_TOKEN_NAMES.map((name): Declaration => [colourTokenProperty(name), COLOUR_TOKENS[name]]),
    ...BUTTON_KINDS.flatMap((kind): Declaration[] => [
      [`--ka-button-${BUTTON_CSS_NAME[kind]}-floor`, px(BUTTON_FLOOR[kind])],
      [`--ka-button-${BUTTON_CSS_NAME[kind]}`, buttonSizeCss(kind, 'vh')],
    ]),
    ...TEMPOS.map((tempo): Declaration => [`--ka-duration-${tempo}`, `${String(duration[tempo])}ms`]),
    ...TEMPOS.map((tempo): Declaration => [`--ka-duration-${tempo}-exit`, `${String(exitDuration(tempo))}ms`]),
    ['--ka-duration-arc', `${String(derivedDuration.arc)}ms`],
    ['--ka-duration-count-up', `${String(derivedDuration.countUp)}ms`],
    ['--ka-exit-factor', String(EXIT_FACTOR)],
    ...(['out', 'inOut', 'in'] as const).map(
      (name): Declaration => [`--ka-ease-${EASING_CSS_NAME[name]}`, easing[name]],
    ),
    ['--ka-stagger', `${String(STAGGER_MS)}ms`],
    ['--ka-press-scale', String(PRESS_SCALE)],
    ['--ka-popover-start-scale', String(POPOVER_START_SCALE)],
    ['--ka-knob-stretch', String(KNOB_STRETCH)],
    ['--ka-enter-distance', px(ENTER_DISTANCE)],
    ['--ka-pulse-scale', String(PULSE_SCALE)],
    ['--ka-card-back', PEEK_POKER_CARDS.back.colour],
    ['--ka-card-back-treatment', PEEK_POKER_CARDS.back.treatment.image],
    ['--ka-card-back-border', PEEK_POKER_CARDS.back.border],
    ['--ka-card-face-treatment', PEEK_POKER_CARDS.face.treatment.image],
    ['--ka-suit-spades', PEEK_POKER_CARDS.suits.spades],
    ['--ka-suit-hearts', PEEK_POKER_CARDS.suits.hearts],
    ['--ka-suit-diamonds', PEEK_POKER_CARDS.suits.diamonds],
    ['--ka-suit-clubs', PEEK_POKER_CARDS.suits.clubs],
  ];
}

/** Declarations that change with the theme. */
export function themeDeclarations(theme: Theme): Declaration[] {
  const edge = theme.panel.edge;
  return [
    ['--ka-bg', theme.background.colour],
    ['--ka-bg-treatment', theme.background.treatment.image],
    ['--ka-bg-treatment-size', theme.background.treatment.size],
    ['--ka-bg-treatment-position', theme.background.treatment.position],
    ['--ka-ink', theme.background.ink],
    ['--ka-secondary', theme.background.secondary],
    ['--ka-panel-from', theme.panel.from],
    ['--ka-panel-to', theme.panel.to],
    ['--ka-panel-treatment', theme.panel.treatment.image],
    ['--ka-panel-edge-colour', edge.colour],
    ['--ka-panel-edge', `${px(edge.width)} ${edge.style} ${edge.colour}`],
    ['--ka-panel-ink', theme.panel.ink],
    ['--ka-panel-secondary', theme.panel.secondary],
    ['--ka-accent', theme.accent.fill],
    ['--ka-accent-ink', theme.accent.ink],
    ['--ka-stick-outline', theme.stickOutline],
    ['--ka-chip', theme.chip.fill],
    ['--ka-chip-ink', theme.chip.ink],
  ];
}

/** Durations and delays that collapse to nothing under reduced motion. States are kept. */
export function reducedMotionDeclarations(): Declaration[] {
  return [
    ...TEMPOS.map((tempo): Declaration => [`--ka-duration-${tempo}`, '0ms']),
    ...TEMPOS.map((tempo): Declaration => [`--ka-duration-${tempo}-exit`, '0ms']),
    ['--ka-duration-arc', '0ms'],
    ['--ka-duration-count-up', '0ms'],
    ['--ka-stagger', '0ms'],
    ['--ka-enter-distance', '0'],
    ['--ka-pulse-scale', '1'],
  ];
}

const HEADER = `/*
 * Kaki Arcade design tokens. GENERATED: do not edit.
 * Source: packages/ui/src/*.ts (docs/DESIGN.md section 4). Rebuild with
 *   node packages/ui/scripts/build.mjs
 *
 * Use: put data-theme="console|rabakz|peek-poker|tabao-rush" on the screen's root element
 * and read the --ka-* properties. With no data-theme the console theme applies.
 */`;

const RECIPES = `/* One treatment per surface: use these instead of writing a background by hand. */
.ka-surface {
  background-color: var(--ka-bg);
  background-image: var(--ka-bg-treatment);
  background-size: var(--ka-bg-treatment-size);
  background-position: var(--ka-bg-treatment-position);
  color: var(--ka-ink);
  font-family: var(--ka-font-body);
}
.ka-panel {
  background-color: var(--ka-panel-to);
  background-image: var(--ka-panel-treatment);
  border: var(--ka-panel-edge);
  border-radius: var(--ka-radius-corner);
  color: var(--ka-panel-ink);
}
.ka-chip {
  background-color: var(--ka-chip);
  border-radius: var(--ka-radius-pill);
  color: var(--ka-chip-ink);
  font-family: var(--ka-font-mono);
  font-weight: var(--ka-weight-bold);
}
.ka-pressable {
  transition: transform var(--ka-duration-fast) var(--ka-ease-out);
}
.ka-pressable:active,
.ka-pressable[data-pressed="true"] {
  transition: none;
  transform: scale(var(--ka-press-scale));
}`;

/** The whole of `tokens.css`. */
export function renderTokensCss(): string {
  const themeBlocks = THEME_NAMES.map((name) => {
    const selector = name === 'console' ? ':root,\n[data-theme="console"]' : `[data-theme="${name}"]`;
    return `/* ${THEMES[name].label} */\n${block(selector, themeDeclarations(THEMES[name]))}`;
  });
  const reduced = [
    '/* Reduced motion, handled once here: movement is dropped, state changes are kept. */',
    '@media (prefers-reduced-motion: reduce) {',
    block(':root', reducedMotionDeclarations(), '  '),
    '}',
  ].join('\n');
  // Custom properties accept unknown units, so the svh override must be feature-gated.
  const smallViewport = '@supports (height: 100svh) {\n' + block(':root',
    BUTTON_KINDS.map((kind): Declaration => [`--ka-button-${BUTTON_CSS_NAME[kind]}`, buttonSizeCss(kind)]), '  ') + '\n}';
  return [HEADER, block(':root', sharedDeclarations()), smallViewport, ...themeBlocks, reduced, RECIPES].join('\n\n') + '\n';
}
