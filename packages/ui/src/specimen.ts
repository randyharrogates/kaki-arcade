// Builds `specimen.html`: one self-contained page showing every token and every motion
// helper. `scripts/build.mjs` writes the file; `generated.test.ts` fails when the committed
// file differs from what this returns.
//
// The page carries no copy of the helpers. Each motion on it was computed here, at build
// time, by the real helpers in `motion.ts` (once as normal and once as reduced motion), and
// is embedded as data; the page's script only hands that data to `element.animate`.
//
// Address parameters: `theme=console|rabakz|peek-poker|tabao-rush`, `view=1|2|3` (one TV
// sheet) or `view=controller|answers` (phone), `rm=1` (force reduced motion), `freeze=0..1`
// (run every motion and hold it at that fraction, for frame strips).

import { BUTTON_FLOOR } from './buttons';
import { PLAYER_COLOURS, SHAPE_BUTTONS, SHAPE_NAMES, SHAPE_STROKE, TEAM_NAMES, TEAM_THEMES } from './colour';
import type { ShapeName } from './colour';
import { renderTokensCss } from './css';
import {
  arc,
  cardTurn,
  collapse,
  countUpAt,
  countUpDuration,
  crossfade,
  enter,
  exit,
  expand,
  press,
  pulse,
  pulseRing,
} from './motion';
import type { Motion } from './motion';
import { derivedDuration, duration, EXIT_FACTOR, exitDuration, KNOB_STRETCH, STAGGER_MS } from './motion-tokens';
import { goldenHeight, goldenSplit, phone, radius, safeArea, SPACING } from './scale';
import type { Rect } from './scale';
import { THEME_NAMES, THEMES } from './themes';
import { TV_TYPE_SIZES } from './type';

interface Step {
  /** Ms after the demo starts. */
  at: number;
  /** The `data-t` of the element to animate. */
  target: string;
  motion: Motion;
  /** Un-hide the element first. */
  show?: boolean;
  /** Hide the element when the motion finishes. */
  hide?: boolean;
}

interface CountDemo {
  target: string;
  frameMs: number;
  values: number[];
}

interface DemoSet {
  steps: Record<string, Step[]>;
  count: CountDemo;
}

// The motion sheet: five demos across the TV's safe area, 21 px apart.
const SAFE = safeArea();
const CELL_GAP = 21;
const CELL_WIDTH = Math.floor((SAFE.width - 4 * CELL_GAP) / 5);
const STAGE: Rect = { left: 0, top: 0, width: CELL_WIDTH - 2 * 3, height: goldenHeight(CELL_WIDTH - 2 * 3) };
const TILE = 89;
const TILE_GAP = 13;
const TILE_RECT: Rect = {
  left: (STAGE.width - TILE) / 2,
  top: (STAGE.height - TILE) / 2,
  width: TILE,
  height: TILE,
};
const ARC_FROM = { x: 34, y: 144 };
const ARC_TO = { x: 34 + 233, y: 144 };
const HOLD = 1100;
const ROWS = ['Mei Ling', 'Arjun', 'Siti', 'Wei Jie'];
const MENU_ROWS = ['10 questions', '30 questions', '50 questions'];
const SCORE_FROM = 300;
const SCORE_TO = 1250;
const FRAME_MS = 1000 / 60;

function demoSet(reduced: boolean): DemoSet {
  const r = { reduced };
  const hold = (ms: number): number => (reduced ? HOLD : ms + HOLD);
  const menuOrigin = { x: 21, y: 0 };
  const turn = cardTurn(r);
  const fade = crossfade(r);
  const total = countUpDuration(r);
  const frames = Math.ceil(total / FRAME_MS);
  const values: number[] = [];
  for (let i = 0; i <= frames; i += 1) values.push(countUpAt(SCORE_FROM, SCORE_TO, i * FRAME_MS, r));
  return {
    steps: {
      press: [
        { at: 0, target: 'press', motion: press(true, r) },
        { at: reduced ? 300 : duration.fast + 300, target: 'press', motion: press(false, r) },
      ],
      menu: [
        { at: 0, target: 'menu', motion: enter({ kind: 'popover', origin: menuOrigin, ...r }), show: true },
        ...MENU_ROWS.map(
          (_, index): Step => ({ at: 0, target: `menu-row-${String(index)}`, motion: enter({ kind: 'row', index, ...r }) }),
        ),
        {
          at: hold(duration.base),
          target: 'menu',
          motion: exit({ kind: 'popover', origin: menuOrigin, ...r }),
          hide: true,
        },
      ],
      stagger: ROWS.map(
        (_, index): Step => ({ at: 0, target: `row-${String(index)}`, motion: enter({ kind: 'row', index, ...r }) }),
      ),
      expand: [
        { at: 0, target: 'expand', motion: expand(TILE_RECT, STAGE, r) },
        { at: hold(duration.slow), target: 'expand', motion: collapse(TILE_RECT, STAGE, r) },
      ],
      arc: [{ at: 0, target: 'arc', motion: arc(ARC_FROM, ARC_TO, r) }],
      pulse: [
        { at: 0, target: 'pulse', motion: pulse(r) },
        { at: 0, target: 'pulse-ring', motion: pulseRing(r) },
      ],
      crossfade: [
        { at: 0, target: 'screen-old', motion: fade.outgoing },
        { at: 0, target: 'screen-new', motion: fade.incoming },
      ],
      card: [
        { at: 0, target: 'card', motion: turn.card },
        { at: 0, target: 'card-back', motion: turn.back },
        { at: 0, target: 'card-face', motion: turn.face },
      ],
    },
    count: { target: 'count', frameMs: FRAME_MS, values },
  };
}

function esc(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function shapeSvg(shape: ShapeName, size: number): string {
  const s = String(size);
  return `<svg class="shape" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="${SHAPE_BUTTONS[shape].path}" fill="none" stroke="var(--ka-on-colour)" stroke-width="${String(SHAPE_STROKE)}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const SHAPE_LABEL = { cross: 'Cross', circle: 'Circle', square: 'Square', triangle: 'Triangle' } as const satisfies Record<
  ShapeName,
  string
>;

const SPECIMEN_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; }
body { min-height: 100vh; font-size: var(--ka-type-21); line-height: var(--ka-line-body); }
h1, h2, h3, p { margin: 0; font-size: inherit; font-weight: var(--ka-weight-regular); }
.display { font-family: var(--ka-font-display); line-height: var(--ka-line-display); }
.mono { font-family: var(--ka-font-mono); font-weight: var(--ka-weight-bold); font-variant-numeric: tabular-nums; }
.secondary { color: var(--ka-secondary); }
.ka-panel .secondary { color: var(--ka-panel-secondary); }
.bold { font-weight: var(--ka-weight-bold); }
.col { display: flex; flex-direction: column; }
.row { display: flex; align-items: center; }

/* Sheets: each is one TV screen, 1920 x 1080 with the 55 px safe margin, and never scrolls. */
.sheet { width: var(--ka-tv-width); height: var(--ka-tv-height); padding: var(--ka-tv-safe-margin); overflow: hidden; display: flex; flex-direction: column; gap: var(--ka-space-34); }
.sheet-head { display: flex; align-items: center; justify-content: space-between; gap: var(--ka-space-34); }
.sheet-head h1 { font-size: var(--ka-type-55); }
.split { flex: 1; min-height: 0; display: grid; grid-template-columns: var(--ka-golden-columns); gap: var(--ka-space-34); }
.split > * { min-width: 0; min-height: 0; }
.themes { display: flex; gap: var(--ka-space-13); }
.btn { font: var(--ka-weight-bold) var(--ka-type-21) / 1 var(--ka-font-body); color: var(--ka-accent-ink); background-color: var(--ka-accent); border: 0; border-radius: var(--ka-radius-corner); min-height: var(--ka-button-minimum-floor); min-width: var(--ka-button-minimum-floor); padding: var(--ka-space-13) var(--ka-space-21); cursor: pointer; white-space: nowrap; }
.btn.quiet { background-color: var(--ka-chip); color: var(--ka-chip-ink); }
.btn[aria-pressed="true"] { background-color: var(--ka-accent); color: var(--ka-accent-ink); outline: 3px solid var(--ka-ink); outline-offset: 5px; }
.btn:focus-visible { outline: 3px solid var(--ka-ink); outline-offset: 5px; }
.ka-chip { display: inline-flex; align-items: center; padding: var(--ka-space-8) var(--ka-space-21); font-size: var(--ka-type-21); }

/* Sheet 1: lettering on the left, a panel on the right. */
.type { gap: var(--ka-space-21); }
.type .t144 { font-size: var(--ka-type-144); }
.type .t89 { font-size: var(--ka-type-89); line-height: 1; }
.type .t55 { font-size: var(--ka-type-55); }
.type .t34 { font-size: var(--ka-type-34); }
.type .t21 { font-size: var(--ka-type-21); }
.spacing { display: flex; align-items: flex-end; gap: var(--ka-space-8); }
.spacing div { display: flex; flex-direction: column; gap: var(--ka-space-8); }
.spacing i { display: block; height: var(--ka-space-34); background-color: var(--ka-chip); border-radius: var(--ka-radius-hairline); }
.panel-demo { padding: var(--ka-space-34); gap: var(--ka-space-21); align-items: flex-start; }
.panel-demo h2 { font-size: var(--ka-type-55); }
.panel-demo .t34 { font-size: var(--ka-type-34); }
.panel-demo .btn { font-size: var(--ka-type-34); padding: var(--ka-space-21) var(--ka-space-34); }
.swatches { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--ka-space-13) var(--ka-space-21); align-self: stretch; }
.swatches div { display: flex; align-items: center; gap: var(--ka-space-13); }
.swatches i { flex: none; width: var(--ka-space-55); height: var(--ka-space-55); border-radius: var(--ka-radius-corner); border: 3px solid var(--ka-panel-edge-colour); }
.radii { display: flex; gap: var(--ka-space-21); align-items: flex-end; }
.radii div { display: flex; flex-direction: column; align-items: center; gap: var(--ka-space-8); }
.cards { display: flex; align-items: center; gap: var(--ka-space-21); }
.cards .card { width: var(--ka-space-55); height: var(--ka-space-89); flex: none; }
.cards .card .front { opacity: 1; font-size: var(--ka-type-34); }
.cards .suit { font-size: var(--ka-type-55); line-height: 1; }
.radii i { display: block; width: var(--ka-space-89); height: var(--ka-space-55); background-color: var(--ka-chip); }

/* Sheet 2: the phone at true size, the fixed colours. */
.device { align-self: flex-start; border: 8px solid var(--ka-ink); border-radius: var(--ka-radius-large); overflow: hidden; }
.golden { display: grid; grid-template-columns: var(--ka-golden-columns); gap: var(--ka-space-34); }
.golden .ka-panel { height: var(--ka-space-89); display: grid; place-items: center; }
.floors { display: flex; align-items: center; gap: var(--ka-space-34); }
.floors div { display: flex; align-items: center; gap: var(--ka-space-13); }
.floors i { display: block; border-radius: var(--ka-radius-corner); background-color: var(--ka-chip); flex: none; }
.floors i.round { border-radius: 50%; }
.seats { display: grid; grid-template-columns: repeat(4, var(--ka-space-89)); gap: var(--ka-space-21) var(--ka-space-34); }
.badge { display: grid; place-items: center; border-radius: 50%; color: var(--ka-seat-numeral); border: 5px solid var(--ka-on-colour); font-family: var(--ka-font-mono); font-weight: var(--ka-weight-bold); line-height: 1; flex: none; }
.seats .badge { width: var(--ka-space-89); height: var(--ka-space-89); font-size: var(--ka-type-55); }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: var(--ka-space-21); }
.block { height: var(--ka-space-89); border-radius: var(--ka-radius-corner); display: flex; align-items: center; gap: var(--ka-space-21); padding: 0 var(--ka-space-21); color: var(--ka-on-colour); font-size: var(--ka-type-34); font-weight: var(--ka-team-text-weight); }
.fixed { gap: var(--ka-space-13); }
.fixed h2 { font-size: var(--ka-type-34); }
.fixed h2:not(:first-child) { margin-top: var(--ka-space-21); }

/* The phone: 844 x 390, landscape. */
.phone { --face: var(--ka-button-face-floor); --in-play-w: var(--ka-button-in-play-width-floor); --in-play-h: var(--ka-button-in-play-height-floor); --smallest: var(--ka-button-minimum-floor); --reach: calc(var(--face) * 89 / 110); position: relative; width: var(--ka-phone-width); height: var(--ka-phone-height); overflow: hidden; padding: var(--ka-space-13); display: flex; flex-direction: column; gap: var(--ka-space-13); font-size: var(--ka-phone-type-21); }
.idbar { display: flex; align-items: center; gap: var(--ka-space-13); height: var(--smallest); flex: none; }
.idbar .btn { min-height: var(--smallest); min-width: var(--smallest); }
.idbar .badge { width: var(--ka-space-34); height: var(--ka-space-34); font-size: var(--ka-phone-type-21); border-width: 3px; }
.idbar .btn { margin-left: auto; }
/* 1 : 1.618, stick side to button side. On a phone too narrow for that the stick side gives way: the buttons keep their sizes. */
.pad { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(min-content, 1.618fr); gap: var(--ka-space-13); }
.zone { border: 3px dashed var(--ka-stick-outline); border-radius: var(--ka-radius-large); display: flex; align-items: flex-end; justify-content: center; padding: var(--ka-space-13); font-size: var(--ka-phone-type-13); text-align: center; }
.controls { display: flex; align-items: center; justify-content: space-between; gap: var(--ka-space-13); padding: 0 var(--ka-space-13); }
.controls .btn { flex: none; }
.inplay { width: var(--in-play-w); height: var(--in-play-h); padding: 0; font-size: var(--ka-phone-type-21); }
.diamond { display: grid; place-items: center; width: calc(var(--reach) * 2 + var(--face)); height: calc(var(--reach) * 2 + var(--face)); flex: none; }
.face { grid-area: 1 / 1; width: var(--face); height: var(--face); border-radius: 50%; border: 0; padding: 0; display: grid; place-items: center; cursor: pointer; }
.face.top { translate: 0 calc(var(--reach) * -1); }
.face.bottom { translate: 0 var(--reach); }
.face.left { translate: calc(var(--reach) * -1) 0; }
.face.right { translate: var(--reach) 0; }
.answers { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: var(--ka-space-13); }
.answer { border: 0; border-radius: var(--ka-radius-corner); display: flex; align-items: center; gap: var(--ka-space-21); padding: 0 var(--ka-space-21); color: var(--ka-on-colour); font: var(--ka-weight-bold) var(--ka-phone-type-34) / 1 var(--ka-font-body); cursor: pointer; text-align: left; }
.phone-only { display: none; }
/* Shown on a real phone: the screen fills it and the buttons grow with it. */
.phone-only .phone { --face: var(--ka-button-face); --in-play-w: var(--ka-button-in-play-width); --in-play-h: var(--ka-button-in-play-height); --smallest: var(--ka-button-minimum); width: 100vw; height: 100vh; }

/* Sheet 3: every motion helper, live. */
.demos { display: grid; grid-template-columns: repeat(5, ${String(CELL_WIDTH)}px); gap: var(--ka-space-21); }
.demo { overflow: hidden; display: flex; flex-direction: column; }
.demo .body { padding: var(--ka-space-13); display: flex; align-items: center; justify-content: space-between; gap: var(--ka-space-13); }
.stage { position: relative; height: ${String(STAGE.height)}px; overflow: hidden; }
.stage.centre { display: grid; place-items: center; }
.stage.menu { display: flex; flex-direction: column; align-items: flex-start; padding: var(--ka-space-8); gap: var(--ka-space-5); }
.popover { padding: var(--ka-space-5); display: flex; flex-direction: column; gap: var(--ka-space-5); }
.popover div { height: var(--ka-space-34); padding: 0 var(--ka-space-13); display: flex; align-items: center; border-radius: var(--ka-radius-small); }
.stage.rows { display: flex; flex-direction: column; padding: var(--ka-space-13); gap: var(--ka-space-8); }
.stage.rows div { display: flex; align-items: center; gap: var(--ka-space-13); height: var(--ka-space-34); font-weight: var(--ka-weight-medium); }
.stage.rows .badge { width: var(--ka-space-34); height: var(--ka-space-34); font-size: var(--ka-type-21); border-width: 3px; }
.stage.tiles { display: flex; align-items: center; justify-content: center; gap: ${String(TILE_GAP)}px; }
.tile { width: ${String(TILE)}px; height: ${String(TILE)}px; display: grid; place-items: center; text-align: center; line-height: 1; }
.layer { position: absolute; inset: 0; display: grid; place-items: center; font-size: var(--ka-type-21); }
.layer span { max-width: var(--ka-space-89); text-align: center; }
.thrown { position: absolute; left: ${String(ARC_FROM.x)}px; top: ${String(ARC_FROM.y)}px; width: var(--ka-space-21); height: var(--ka-space-21); border-radius: var(--ka-radius-small); background-color: var(--ka-accent); }
.thrown.goal { background-color: transparent; border: 3px dashed var(--ka-chip); translate: ${String(ARC_TO.x - ARC_FROM.x)}px 0; }
.chit { grid-area: 1 / 1; padding: var(--ka-space-13) var(--ka-space-21); text-align: center; font-weight: var(--ka-weight-bold); line-height: 1.1; }
.ring { grid-area: 1 / 1; width: var(--ka-space-89); height: var(--ka-space-89); border-radius: 50%; border: 5px solid var(--ka-accent); opacity: 0; }
.score { font-size: var(--ka-type-55); }
.table { perspective: 610px; }
.card { position: relative; width: var(--ka-space-89); height: var(--ka-space-144); }
.card span { position: absolute; inset: 0; border-radius: var(--ka-radius-medium); display: grid; place-items: center; }
.card .back { background-color: var(--ka-card-back); background-image: var(--ka-card-back-treatment); border: 5px solid var(--ka-card-back-border); }
.card .front { background-image: var(--ka-card-face-treatment); color: var(--ka-suit-hearts); font-size: var(--ka-type-55); opacity: 0; }
.stage.stick { touch-action: none; cursor: grab; padding: var(--ka-space-13); display: grid; }
.stage.stick .zone { align-items: center; font-size: var(--ka-type-21); pointer-events: none; }
.knob-base, .knob { position: absolute; border-radius: 50%; pointer-events: none; opacity: 0; }
.knob-base { width: var(--ka-button-face-floor); height: var(--ka-button-face-floor); margin: calc(var(--ka-space-55) * -1) 0 0 calc(var(--ka-space-55) * -1); border: 3px solid var(--ka-chip); }
.knob { width: var(--ka-space-55); height: var(--ka-space-55); background-color: var(--ka-chip); translate: -50% -50%; }
.note { display: flex; flex-wrap: wrap; gap: var(--ka-space-13) var(--ka-space-34); font-size: var(--ka-type-21); }

/* One sheet at a time when the address asks for it. */
[data-view] .sheet, [data-view] .phone-only { display: none; }
[data-view="1"] .sheet[data-sheet="1"], [data-view="2"] .sheet[data-sheet="2"], [data-view="3"] .sheet[data-sheet="3"] { display: flex; }
[data-view="controller"] .phone-only[data-phone="controller"], [data-view="answers"] .phone-only[data-phone="answers"] { display: block; }

/* On a phone only the phone screens are shown, at true size. */
@media (max-width: 1100px), (max-height: 600px) {
  html:not([data-view]) .sheet { display: none; }
  html:not([data-view]) .phone-only { display: block; }
}
`;

function head(title: string): string {
  const buttons = THEME_NAMES.map(
    (name) =>
      `<button class="btn quiet ka-pressable" type="button" data-set-theme="${name}" aria-pressed="false">${esc(THEMES[name].label)}</button>`,
  ).join('');
  return `<header class="sheet-head"><h1 class="display">${esc(title)}</h1><nav class="themes" aria-label="Theme">${buttons}</nav></header>`;
}

function sheetType(): string {
  const samples: Record<(typeof TV_TYPE_SIZES)[number], string> = {
    144: '<p class="display t144">Kaki Arcade</p>',
    89: '<p class="mono t89">K7QP <span class="secondary">89</span></p>',
    55: '<p class="display t55">Tabao Rush · Peek Poker · Rabakz</p>',
    34: '<p class="t34">Anything players read in play is at least 34 px.</p>',
    21: '<p class="t21 secondary">Labels and captions are 21 px. This line is secondary text on the background.</p>',
  };
  const type = [...TV_TYPE_SIZES].reverse().map((size) => samples[size]).join('');
  const spacing = SPACING.filter((value) => value > 0)
    .map((value) => `<div><i style="width:${String(value)}px"></i><span class="mono">${String(value)}</span></div>`)
    .join('');
  const swatches = [
    ['Background', 'var(--ka-bg)'],
    ['Panel', 'var(--ka-panel-to)'],
    ['Edge', 'var(--ka-panel-edge-colour)'],
    ['Panel ink', 'var(--ka-panel-ink)'],
    ['Secondary', 'var(--ka-panel-secondary)'],
    ['Accent', 'var(--ka-accent)'],
    ['Chip', 'var(--ka-chip)'],
    ['Screen ink', 'var(--ka-ink)'],
  ]
    .map(([label = '', value = '']) => `<div><i style="background-color:${value}"></i><span>${esc(label)}</span></div>`)
    .join('');
  const radii = (['hairline', 'small', 'medium', 'corner', 'large'] as const)
    .map((name) => `<div><i style="border-radius:${String(radius[name])}px"></i><span class="mono">${String(radius[name])}</span></div>`)
    .join('');
  const suits = (
    [
      ['♠', 'spades'],
      ['♥', 'hearts'],
      ['♦', 'diamonds'],
      ['♣', 'clubs'],
    ] as const
  )
    .map(([glyph, suit]) => `<span class="suit" style="color:var(--ka-suit-${suit})">${glyph}</span>`)
    .join('');
  return `<section class="sheet" data-sheet="1">${head('Surfaces and lettering')}
<div class="split">
  <div class="col type">${type}
    <p class="t21">Spacing, in px</p>
    <div class="spacing">${spacing}</div>
    <p class="t21">Corners, in px. Panels, cards and buttons use 13.</p>
    <div class="radii">${radii}</div>
  </div>
  <div class="ka-panel col panel-demo">
    <h2 class="display">A panel</h2>
    <p class="t34">Text on a panel is ink.</p>
    <p class="secondary">Secondary text on a panel. The edge is 3 px.</p>
    <button class="btn ka-pressable" type="button">Start game</button>
    <span class="ka-chip">ROOM K7QP</span>
    <div class="swatches">${swatches}</div>
    <p class="secondary">Headings DM Serif Display, text DM Sans, codes and numbers JetBrains Mono.</p>
    <p class="t34">Peek Poker cards</p>
    <div class="cards"><div class="card"><span class="back"></span></div><div class="card"><span class="front display">7♥</span></div>${suits}</div>
  </div>
</div></section>`;
}

function phoneController(): string {
  const faces = SHAPE_NAMES.map((shape) => {
    const button = SHAPE_BUTTONS[shape];
    return `<button class="face ${button.position} ka-pressable" type="button" aria-label="${SHAPE_LABEL[shape]}" style="background-color:var(--ka-${button.token})">${shapeSvg(shape, 55)}</button>`;
  }).join('');
  return `<div class="phone ka-surface">
  <div class="idbar"><span class="badge" style="background-color:var(--ka-seat-3)">3</span><span class="bold">Ah Boy</span><button class="btn quiet ka-pressable" type="button">Menu</button></div>
  <div class="pad">
    <div class="zone">The stick appears where your thumb lands</div>
    <div class="controls"><button class="btn inplay ka-pressable" type="button">Ready</button><div class="diamond">${faces}</div></div>
  </div>
</div>`;
}

function phoneAnswers(): string {
  const words: Record<ShapeName, string> = { cross: 'Laksa', circle: 'Satay', square: 'Rojak', triangle: 'Chendol' };
  const answers = SHAPE_NAMES.map(
    (shape) =>
      `<button class="answer ka-pressable" type="button" style="background-color:var(--ka-${SHAPE_BUTTONS[shape].token})">${shapeSvg(shape, 55)}<span>${words[shape]}</span></button>`,
  ).join('');
  return `<div class="phone ka-surface">
  <div class="idbar"><span class="badge" style="background-color:var(--ka-seat-3)">3</span><span class="bold">Ah Boy</span><span class="secondary">Question 7 of 10</span></div>
  <div class="answers">${answers}</div>
</div>`;
}

function sheetColours(): string {
  const split = goldenSplit(goldenSplit(SAFE.width, 34).primary, 34);
  const seats = PLAYER_COLOURS.map(
    (player) => `<span class="badge" style="background-color:var(--ka-${player.token})">${String(player.seat)}</span>`,
  ).join('');
  const teams = TEAM_NAMES.map(
    (team) => `<div class="block" style="background-color:var(--ka-${TEAM_THEMES[team].token})">${TEAM_THEMES[team].label}</div>`,
  ).join('');
  const shapes = SHAPE_NAMES.map(
    (shape) =>
      `<div class="block" style="background-color:var(--ka-${SHAPE_BUTTONS[shape].token})">${shapeSvg(shape, 55)}<span>${SHAPE_LABEL[shape]}</span></div>`,
  ).join('');
  const floors = (
    [
      ['Face button', BUTTON_FLOOR.face, BUTTON_FLOOR.face, 'round'],
      ['In play', BUTTON_FLOOR.inPlayWidth, BUTTON_FLOOR.inPlayHeight, 'box'],
      ['Smallest', BUTTON_FLOOR.minimum, BUTTON_FLOOR.minimum, 'box'],
    ] as const
  )
    .map(
      ([label, width, height, shape]) =>
        `<div><i class="${shape}" style="width:${String(width)}px;height:${String(height)}px"></i><span>${label} <span class="mono">${width === height ? String(width) : `${String(width)} × ${String(height)}`}</span></span></div>`,
    )
    .join('');
  return `<section class="sheet" data-sheet="2">${head('Players, shapes and the phone')}
<div class="split">
  <div class="col" style="gap:var(--ka-space-21)">
    <div class="device">${phoneController()}</div>
    <p>The phone at true size, ${String(phone.width)} × ${String(phone.height)}. Buttons never go under these sizes, and grow with the phone.</p>
    <div class="floors">${floors}</div>
    <p>A 1.618 : 1 split of this column with a 34 px gap.</p>
    <div class="golden"><div class="ka-panel mono">${String(split.primary)}</div><div class="ka-panel mono">${String(split.secondary)}</div></div>
  </div>
  <div class="col fixed">
    <h2 class="display">Players, always with the seat number</h2>
    <div class="seats">${seats}</div>
    <h2 class="display">Teams</h2>
    <div class="pair">${teams}</div>
    <h2 class="display">Buttons and answers</h2>
    <div class="pair">${shapes}</div>
  </div>
</div></section>`;
}

function demo(name: string, title: string, stage: string): string {
  return `<article class="ka-panel demo">${stage}<div class="body"><h2 class="bold">${esc(title)}</h2><button class="btn ka-pressable" type="button" data-run="${name}">Replay</button></div></article>`;
}

function sheetMotion(): string {
  const closed = expand(TILE_RECT, STAGE, { reduced: false }).keyframes[0]?.clipPath ?? 'none';
  const rows = ROWS.map(
    (name, index) =>
      `<div data-t="row-${String(index)}"><span class="badge" style="background-color:var(--ka-seat-${String(index + 1)})">${String(index + 1)}</span>${esc(name)}</div>`,
  ).join('');
  const menuRows = MENU_ROWS.map((label, index) => `<div data-t="menu-row-${String(index)}">${esc(label)}</div>`).join('');
  const demos = [
    demo('press', 'Press', '<div class="stage centre ka-surface"><button class="btn" type="button" data-t="press">Start game</button></div>'),
    demo(
      'menu',
      'Enter and exit',
      `<div class="stage menu ka-surface"><button class="btn" type="button" data-run="menu">Match length</button><div class="ka-panel popover" data-t="menu" hidden>${menuRows}</div></div>`,
    ),
    demo('stagger', 'Rows, 30 ms apart', `<div class="stage rows ka-surface">${rows}</div>`),
    demo(
      'expand',
      'Tile opens',
      `<div class="stage tiles ka-surface"><div class="ka-panel tile">Tabao Rush</div><div class="ka-panel tile">Rabakz</div><div class="ka-panel tile" id="third-tile">Peek Poker</div><div class="layer ka-surface display" data-game-theme data-t="expand" style="clip-path:${String(closed)}"><span>Rabakz</span></div></div>`,
    ),
    demo('arc', 'Throw on an arc', '<div class="stage ka-surface"><i class="thrown goal"></i><i class="thrown" data-t="arc"></i></div>'),
    demo(
      'pulse',
      'Pulse',
      '<div class="stage centre ka-surface"><i class="ring" data-t="pulse-ring"></i><div class="ka-panel chit" data-t="pulse">Order served<br>+100</div></div>',
    ),
    demo('count', 'Count up', `<div class="stage centre ka-surface"><span class="mono score" data-t="count">${String(SCORE_TO)}</span></div>`),
    demo(
      'crossfade',
      'Screen change',
      '<div class="stage ka-surface"><div class="layer ka-surface display" data-t="screen-old"><span>Lobby</span></div><div class="layer ka-surface display" data-other-theme data-t="screen-new" style="opacity:0"><span>Rabakz</span></div></div>',
    ),
    demo(
      'card',
      'Card turn',
      '<div class="stage centre table ka-surface"><div class="card" data-t="card"><span class="back" data-t="card-back"></span><span class="front display" data-t="card-face">7♥</span></div></div>',
    ),
    `<article class="ka-panel demo"><div class="stage stick ka-surface" id="stick"><div class="zone">Drag here</div><i class="knob-base" id="knob-base"></i><i class="knob" id="knob"></i></div><div class="body"><h2 class="bold">Stick, held</h2><span class="mono">+${String(Math.round(KNOB_STRETCH * 100))}%</span></div></article>`,
  ].join('');
  const facts = [
    `fast ${String(duration.fast)} ms`,
    `base ${String(duration.base)} ms`,
    `slow ${String(duration.slow)} ms`,
    `exits × ${String(EXIT_FACTOR)} (${String(exitDuration('base'))} ms)`,
    `rows ${String(STAGGER_MS)} ms apart`,
    `throw ${String(derivedDuration.arc)} ms`,
    `count ${String(derivedDuration.countUp)} ms`,
  ]
    .map((fact) => `<span class="mono">${fact}</span>`)
    .join('');
  return `<section class="sheet" data-sheet="3">${head('Motion')}
<div class="row" style="gap:var(--ka-space-34)"><button class="btn ka-pressable" type="button" id="replay-all">Replay all</button><p id="rm-note" hidden>Reduced motion is on: each sample only changes state.</p></div>
<div class="demos">${demos}</div>
<div class="note">${facts}</div>
</section>`;
}

// The page's own script: plays the embedded motions. It computes nothing about them.
const SPECIMEN_SCRIPT = `
(function () {
  var data = JSON.parse(document.getElementById('motions').textContent);
  var root = document.documentElement;
  var query = new URLSearchParams(location.search);
  var themes = ${JSON.stringify(THEME_NAMES)};
  var reduced = query.get('rm') === '1' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var set = reduced ? data.reduced : data.normal;
  var timers = {};
  var raf = 0;

  function all(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function target(name) { return document.querySelector('[data-t="' + name + '"]'); }

  function setTheme(name) {
    if (themes.indexOf(name) < 0) return;
    root.setAttribute('data-theme', name);
    var other = name === 'rabakz' ? 'console' : 'rabakz';
    /* The tile that opens is a game other than the one whose theme the page is in. */
    var game = name === 'rabakz' ? 'peek-poker' : 'rabakz';
    all('[data-game-theme]').forEach(function (el) {
      el.setAttribute('data-theme', game);
      el.firstElementChild.textContent = game === 'rabakz' ? 'Rabakz' : 'Peek Poker';
    });
    document.getElementById('third-tile').textContent = game === 'rabakz' ? 'Peek Poker' : 'Rabakz';
    all('[data-other-theme]').forEach(function (el) {
      el.setAttribute('data-theme', other);
      el.firstElementChild.textContent = other === 'rabakz' ? 'Rabakz' : 'Lobby';
    });
    all('[data-set-theme]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-theme') === name)); });
  }

  function play(step) {
    var el = target(step.target);
    if (!el) return null;
    if (step.show) el.hidden = false;
    Object.keys(step.motion.style).forEach(function (key) { el.style[key] = step.motion.style[key]; });
    var animation = el.animate(step.motion.keyframes, step.motion.options);
    if (step.hide) animation.onfinish = function () { el.hidden = true; };
    return animation;
  }

  function runCount(freeze) {
    var el = target(set.count.target), values = set.count.values, last = values.length - 1;
    cancelAnimationFrame(raf);
    if (freeze !== null) { el.textContent = String(values[Math.round(freeze * last)]); return; }
    var start = performance.now();
    (function frame(now) {
      var index = Math.min(last, Math.floor((now - start) / set.count.frameMs));
      el.textContent = String(values[index]);
      if (index < last) raf = requestAnimationFrame(frame);
    })(start);
  }

  function run(name, freeze) {
    if (name === 'count') { runCount(freeze === undefined ? null : freeze); return; }
    var steps = set.steps[name];
    (timers[name] || []).forEach(clearTimeout);
    timers[name] = [];
    steps.forEach(function (step) {
      var el = target(step.target);
      if (!el) return;
      el.getAnimations().forEach(function (a) { a.cancel(); });
      if (step.show) el.hidden = true;
    });
    steps.forEach(function (step) {
      if (freeze !== undefined) {
        if (step.at > 0) return;
        var held = play(step);
        if (held) { held.pause(); held.currentTime = freeze * held.effect.getComputedTiming().endTime; }
      } else if (step.at === 0) play(step);
      else timers[name].push(setTimeout(function () { play(step); }, step.at));
    });
  }

  function runAll(freeze) { Object.keys(set.steps).concat('count').forEach(function (name) { run(name, freeze); }); }

  all('[data-set-theme]').forEach(function (b) { b.addEventListener('click', function () { setTheme(b.getAttribute('data-set-theme')); }); });
  all('[data-run]').forEach(function (b) { b.addEventListener('click', function () { run(b.getAttribute('data-run')); }); });
  document.getElementById('replay-all').addEventListener('click', function () { runAll(); });
  document.getElementById('rm-note').hidden = !reduced;

  /* The stick: follows the pointer exactly while held, then eases back and stops. */
  var pad = document.getElementById('stick'), base = document.getElementById('knob-base'), knob = document.getElementById('knob');
  var origin = null, reach = ${String(BUTTON_FLOOR.minimum)}, stretch = ${String(KNOB_STRETCH)};
  function place(el, x, y) { el.style.left = x + 'px'; el.style.top = y + 'px'; }
  pad.addEventListener('pointerdown', function (e) {
    var r = pad.getBoundingClientRect();
    pad.setPointerCapture(e.pointerId);
    knob.getAnimations().forEach(function (a) { a.cancel(); });
    origin = { x: e.clientX - r.left, y: e.clientY - r.top };
    place(base, origin.x, origin.y); place(knob, origin.x, origin.y);
    base.style.opacity = '1'; knob.style.opacity = '1'; knob.style.transform = 'none';
  });
  pad.addEventListener('pointermove', function (e) {
    if (!origin) return;
    var r = pad.getBoundingClientRect(), dx = e.clientX - r.left - origin.x, dy = e.clientY - r.top - origin.y, len = Math.hypot(dx, dy);
    if (len > reach) { dx *= reach / len; dy *= reach / len; len = reach; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + Math.atan2(dy, dx) + 'rad) scaleX(' + (1 + stretch * len / reach) + ')';
  });
  function release() {
    if (!origin) return;
    origin = null;
    var from = knob.style.transform;
    knob.style.transform = 'none';
    var back = knob.animate([{ transform: from }, { transform: 'none' }], set.release);
    back.onfinish = function () { if (!origin) { base.style.opacity = '0'; knob.style.opacity = '0'; } };
  }
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);

  setTheme(query.get('theme') || 'console');
  var view = query.get('view');
  if (view) root.setAttribute('data-view', view);
  var freeze = query.get('freeze');
  if (freeze !== null) runAll(Math.min(1, Math.max(0, Number(freeze) || 0)));
})();
`;

/** The whole of `specimen.html`. */
export function renderSpecimenHtml(): string {
  const release = (reduced: boolean): Motion['options'] => enter({ kind: 'fade', reduced }).options;
  const json = JSON.stringify({
    normal: { ...demoSet(false), release: release(false) },
    reduced: { ...demoSet(true), release: release(true) },
  }).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="en-GB" data-theme="console">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kaki Arcade design tokens</title>
<!-- GENERATED by packages/ui/scripts/build.mjs from packages/ui/src. Do not edit. -->
<style>
${renderTokensCss()}</style>
<style>${SPECIMEN_CSS}</style>
</head>
<body class="ka-surface">
${sheetType()}
${sheetColours()}
${sheetMotion()}
<section class="phone-only" data-phone="controller">${phoneController()}</section>
<section class="phone-only" data-phone="answers">${phoneAnswers()}</section>
<script type="application/json" id="motions">${json}</script>
<script>${SPECIMEN_SCRIPT}</script>
</body>
</html>
`;
}
