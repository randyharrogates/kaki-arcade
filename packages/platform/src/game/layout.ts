// The controller layout schema and the private view schema (PLAT-031, CTRL-002, CTRL-003).
//
// A game never draws on a phone. It says which parts it wants, as plain data; the controller
// kit draws them. Neither imports the other. Two payloads go to each phone:
//
//   ControllerLayout   the controls the phone shows NOW: sticks and buttons (held inputs,
//                      sampled every step) and things to tap (options, a grid, cards, a swipe
//                      area), which come back as `PlayerAction`s.
//   PrivateView        what only that phone shows beside its controls: text, cards, figures,
//                      a small read-only grid.
//
// Both travel as JSON with a size cap (4,096 and 8,192 bytes) and must fit a phone held
// sideways at the sizes the owner chose on board 4 (docs/DESIGN.md section 4.4, D-047, D-051,
// D-053). `PHONE` holds those sizes and `packPhone` lays a layout out in real rows and
// columns: it passes only if every part can be placed at or above its floor.
import { charCount, jsonProblem, jsonSize } from './json';
import { BUTTON } from './types';
import type { ColourToken, PlayerAction } from './types';
/**
 * The four face buttons, named by where they sit in the diamond. On the phone they carry the
 * shapes in `FACE_SHAPE` (D-047), drawn in the kit's own colours; no button has a letter.
 */
export type FaceButton = 'face-bottom' | 'face-right' | 'face-left' | 'face-top';
export type PadButton = FaceButton | 'shoulder-left' | 'shoulder-right';
export type Shape = 'cross' | 'circle' | 'square' | 'triangle';
/** The shape drawn on each face button: cross at the bottom, circle right, square left, triangle top. */
export const FACE_SHAPE: Readonly<Record<FaceButton, Shape>> = {
  'face-bottom': 'cross',
  'face-right': 'circle',
  'face-left': 'square',
  'face-top': 'triangle',
};
/** The bit of the frame's button mask each pad button sets. */
export const PAD_BUTTON_BIT: Readonly<Record<PadButton, number>> = {
  'face-bottom': BUTTON.FACE_BOTTOM,
  'face-right': BUTTON.FACE_RIGHT,
  'face-left': BUTTON.FACE_LEFT,
  'face-top': BUTTON.FACE_TOP,
  'shoulder-left': BUTTON.SHOULDER_LEFT,
  'shoulder-right': BUTTON.SHOULDER_RIGHT,
};
/**
 * Whose phone shows a part. `everyone` (the default), only the room `leader` (PLAT-006), or
 * everyone but the leader (`not-leader`: "The leader is setting up"). A phone never receives
 * a part it is not the audience of, and a tap from outside the audience never reaches a game.
 */
export type Audience = 'everyone' | 'leader' | 'not-leader';
interface ControlBase {
  /** Names the control in a `PlayerAction`. Unique within the layout. */
  readonly id: string;
  readonly audience?: Audience;
}
/** The left stick. Read it from `frame.axes[AXIS.STICK_X]` and `[AXIS.STICK_Y]`. */
export interface StickControl extends ControlBase {
  readonly kind: 'stick';
}
/** The D-pad. Read `BUTTON.DPAD_UP`, `DPAD_DOWN`, `DPAD_LEFT` and `DPAD_RIGHT` from the frame. */
export interface DpadControl extends ControlBase {
  readonly kind: 'dpad';
}
/** A held button. Read `PAD_BUTTON_BIT[button]` from the frame with `isHeld` or `wasPressed`. */
export interface ButtonControl extends ControlBase {
  readonly kind: 'button';
  readonly button: PadButton;
  /** What the button does now, in a word or two: "Pick up", "Chop". */
  readonly label: string;
  /** Overrides the colour the theme gives this button. */
  readonly colour?: ColourToken;
  /** Drawn but dimmed; the press still arrives in the frame and the game ignores it. */
  readonly disabled?: boolean;
}
/** One shake model: read wire bit 11 (BUTTON.SHAKE). `button` is the accessible alternative, which must also be in the layout (CTRL-007). */
export interface ShakeControl extends ControlBase {
  readonly kind: 'shake';
  readonly button: PadButton;
}
/** Tilt. Read it from `frame.axes[AXIS.TILT_X]` and `[AXIS.TILT_Y]`. */
export interface TiltControl extends ControlBase {
  readonly kind: 'tilt';
}
export type SwipeDirection = 'up' | 'down' | 'left' | 'right';
/** A swipe area. Each swipe is an action whose value is the direction. */
export interface SwipeControl extends ControlBase {
  readonly kind: 'swipe';
  readonly label?: string;
}
export type ItemState = 'plain' | 'selected' | 'disabled';
export interface OptionItem {
  /** The action's value when this option is tapped. Unique within the control. */
  readonly id: string;
  readonly label: string;
  /** Draw it with this face button's shape and colour, as on the TV (RZ-003, D-050). */
  readonly face?: FaceButton;
  readonly colour?: ColourToken;
  readonly state?: ItemState;
  /** The D-pad cursor is on this item. Separate from `state`: a selected item can have it. */
  readonly focus?: boolean;
}
/** Large buttons to tap, one action per tap: answers, a vote, "Next". */
export interface OptionsControl extends ControlBase {
  readonly kind: 'options';
  readonly options: readonly OptionItem[];
  /** 144 px tall targets, as on the decided Lock in button. */
  readonly size?: 'large';
}
export interface GridCell {
  readonly label?: string;
  readonly colour?: ColourToken;
  readonly state?: ItemState;
  /** The D-pad cursor is on this cell (PP section 2). */
  readonly focus?: boolean;
}
/** A grid of cells to tap. The action's value is the cell's index, row by row from 0. */
export interface GridControl extends ControlBase {
  readonly kind: 'grid';
  readonly rows: number;
  readonly cols: number;
  /** Exactly `rows * cols` cells. */
  readonly cells: readonly GridCell[];
}
export interface CardItem {
  /** The action's value when the card is tapped. Unique within the row. */
  readonly id: string;
  /** The rank or short name: "Q", "10". */
  readonly label: string;
  /** A named mark the kit can draw beside the label: "spade", "heart". */
  readonly mark?: string;
  readonly colour?: ColourToken;
  readonly faceDown?: boolean;
  readonly state?: ItemState;
  readonly focus?: boolean;
}
/** A row of cards. Tapping one is an action only when `tappable` is true. */
export interface CardsControl extends ControlBase {
  readonly kind: 'cards';
  readonly cards: readonly CardItem[];
  readonly tappable?: boolean;
}
/** Words on the phone: "Watch the TV", "The leader is setting up". */
export interface TextControl extends ControlBase {
  readonly kind: 'text';
  readonly text: string;
  readonly tone?: 'title' | 'body' | 'note';
}
export type LayoutControl =
  | StickControl
  | DpadControl
  | ButtonControl
  | ShakeControl
  | TiltControl
  | SwipeControl
  | OptionsControl
  | GridControl
  | CardsControl
  | TextControl;
export interface ControllerLayout {
  /**
   * A whole number, PER PLAYER, that never goes down during a match. It goes UP when what
   * this player can tap changes (a new question, a new phase, different options) and ONLY
   * then: a tap made against an older revision is dropped, so a bump for any other reason
   * (another player's answer, a countdown, an option greyed out) would throw away a press
   * that was still good. The kit fails a revision that changes while `tapSignature` does not, unless
   * the
   * previous layout offered no tappable control (nothing could have been in flight).
   * Text-only transitions may bump revision; once taps exist, keep it stable until their
   * meaning changes. Disabled-state changes alone do not change a tap's meaning.
   */
  readonly revision: number;
  readonly controls: readonly LayoutControl[];
}
interface BlockBase {
  readonly audience?: Audience;
}
export type PanelBlock = BlockBase &
  (
    | {
        readonly kind: 'text';
        readonly text: string;
        readonly tone?: 'title' | 'body' | 'note';
      }
    | {
        readonly kind: 'cards';
        readonly cards: readonly CardItem[];
      }
    /** A named figure: "Streak 3", "Points 100". */
    | {
        readonly kind: 'stat';
        readonly label: string;
        readonly value: string | number;
      }
    /** A grid to look at, not to tap. */
    | {
        readonly kind: 'grid';
        readonly rows: number;
        readonly cols: number;
        readonly cells: readonly GridCell[];
      }
  );
/** What only one phone shows beside its controls. */
export interface PrivateView {
  /** Per-player content revision; must change when blocks change; needless bumps are allowed. Host compares revisions, never JSON. */
  readonly revision: number;
  readonly blocks: readonly PanelBlock[];
}
/**
 * The phone, in px at 844 by 390, as decided on board 4 (`tools/boards/board4_template.html`)
 * and in docs/DESIGN.md section 4.4. Every number here is either read off that board or is
 * one of the three floors; the comment on each says which.
 */
export const PHONE = {
  width: 844,
  height: 390,
  /** Board 4: 13 px margin; the seat-and-name bar ends at 50 px and play starts at 63 px. */
  play: { width: 818, height: 314 },
  /** Board 4: 21 px between columns (`ppB`), 13 px between rows (`.pbtns`), 8 px in a grid. */
  columnGap: 21,
  rowGap: 13,
  gridGap: 8,
  /** FLOOR (D-051): a face button is at least 110 px. */
  face: 110,
  /** FLOOR (D-053): any other control tapped during play is at least 89 px wide, 68 px tall. */
  inPlay: { width: 89, height: 68 },
  /** FLOOR (D-051): nothing tappable is under 55 px. */
  tappable: 55,
  /** Board 4: the diamond of four face buttons is a 300 px square (`.abxy`). */
  diamond: 300,
  /** Board 4: the floating stick is drawn 178 px across. A swipe area gets the same. */
  stick: 178,
  /** Board 4 `.pbtn`: 21 px padding each side; a 55 px shape and a 13 px gap when it has one. */
  optionPadding: 42,
  optionShape: 68,
  /** Board 4: Lock in is 144 px; taken as the narrowest an option button may be. */
  optionWidth: 144,
  /** Board 4 `.mini`: a card to look at is 68 by 93 px. A card to tap keeps that shape at 89 wide. */
  card: { width: 68, height: 93 },
  cardTappable: { width: 89, height: 122 },
  /** A cell of a grid that is only looked at. Derived: one 34 px line. */
  cellShown: 34,
  /**
   * Text. Body is 21 px on a 34 px line, a title 34 px on 55, a note 15 px on 21 (board 4).
   * Derived: an average letter is 0.57 of the type size (12, 19 and 8 px), and an option's
   * text may wrap to three lines of 21 px inside its 68 px (R-10's limit for long options).
   */
  line: { body: 34, title: 55, note: 21 },
  letter: { body: 12, title: 19, note: 8 },
  optionLines: 3,
  /** The narrowest column that text may be set in beside a grid (board 4 `ppB` gives it 198). */
  infoColumn: 144,
} as const;
/** Limits on counts and lengths, and the byte caps the protocol carries. */
export const PHONE_LIMITS = {
  width: PHONE.width,
  height: PHONE.height,
  play: PHONE.play,
  face: PHONE.face,
  inPlay: PHONE.inPlay,
  menu: PHONE.tappable,
  layoutBytes: 4096,
  privateViewBytes: 8192,
  controls: 13,
  blocks: 8,
  optionsPerControl: 8,
  cardsPerRow: 8,
  gridRows: Math.floor((PHONE.play.height + PHONE.gridGap) / (PHONE.inPlay.height + PHONE.gridGap)),
  gridCols: Math.floor((PHONE.play.width + PHONE.gridGap) / (PHONE.inPlay.width + PHONE.gridGap)),
  shownGridRows: Math.floor(
    (PHONE.play.height + PHONE.gridGap) / (PHONE.cellShown + PHONE.gridGap),
  ),
  shownGridCols: Math.floor((PHONE.play.width + PHONE.gridGap) / (PHONE.cellShown + PHONE.gridGap)),
  idLength: 21,
  buttonLabel: 13,
  optionLabel: 40,
  cellLabel: 3,
  cardLabel: 5,
  markLength: 13,
  textLength: 120,
  statLabel: 21,
  statValue: 13,
} as const;
const ID_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN_SHAPE = /^(?:seat-[1-8]|team-(?:red|blue)|shape-(?:cross|circle|square|triangle))$/;
const FACE_BUTTONS: readonly string[] = ['face-bottom', 'face-right', 'face-left', 'face-top'];
const PAD_BUTTONS: readonly string[] = [...FACE_BUTTONS, 'shoulder-left', 'shoulder-right'];
const ITEM_STATES: readonly string[] = ['plain', 'selected', 'disabled'];
const TONES: readonly string[] = ['title', 'body', 'note'];
const SWIPES: readonly string[] = ['up', 'down', 'left', 'right'];
const AUDIENCES: readonly string[] = ['everyone', 'leader', 'not-leader'];
const CONTROL_KEYS: Record<LayoutControl['kind'], readonly string[]> = {
  stick: [],
  dpad: [],
  button: ['button', 'label', 'colour', 'disabled'],
  shake: ['button'],
  tilt: [],
  swipe: ['label'],
  options: ['options', 'size'],
  grid: ['rows', 'cols', 'cells'],
  cards: ['cards', 'tappable'],
  text: ['text', 'tone'],
};
const BLOCK_KEYS: Record<PanelBlock['kind'], readonly string[]> = {
  text: ['text', 'tone'],
  cards: ['cards'],
  stat: ['label', 'value'],
  grid: ['rows', 'cols', 'cells'],
};
type Loose = Record<string, unknown>;
function isObject(value: unknown): value is Loose {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isWhole(value: unknown, min: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min;
}
/** Collects problems with a prefix, so every message says where it is. */
class Problems {
  readonly list: string[] = [];
  add(where: string, what: string): void {
    this.list.push(`${where}: ${what}`);
  }
  text(where: string, value: unknown, max: number, required = true): void {
    if (value === undefined && !required) return;
    if (typeof value !== 'string') this.add(where, 'must be text');
    else if (required && value.trim() === '') this.add(where, 'must not be empty');
    else if (charCount(value) > max)
      this.add(
        where,
        `is ${String(charCount(value))} characters; the most that fits is ${String(max)}`,
      );
  }
  oneOf(where: string, value: unknown, allowed: readonly string[], required = true): void {
    if (value === undefined && !required) return;
    if (typeof value !== 'string' || !allowed.includes(value))
      this.add(where, `must be one of ${allowed.join(', ')}`);
  }
  token(where: string, value: unknown): void {
    if (value === undefined) return;
    if (typeof value !== 'string' || !TOKEN_SHAPE.test(value)) {
      this.add(
        where,
        'must be the name of a colour token (lower-case words joined by ' +
          'hyphens), never a colour value',
      );
    }
  }
  flag(where: string, value: unknown): void {
    if (value !== undefined && typeof value !== 'boolean') this.add(where, 'must be true or false');
  }
  id(where: string, value: unknown): value is string {
    if (
      typeof value !== 'string' ||
      !ID_SHAPE.test(value) ||
      value.length > PHONE_LIMITS.idLength
    ) {
      this.add(
        where,
        'id must be lower-case letters, digits and hyphens, at most ' +
          String(PHONE_LIMITS.idLength) +
          ' characters',
      );
      return false;
    }
    return true;
  }
  keys(where: string, value: Loose, allowed: readonly string[]): void {
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) this.add(where, `"${key}" is not part of the schema`);
    }
  }
}
function checkCells(problems: Problems, where: string, source: Loose): void {
  const { rows, cols, cells } = source;
  const maxRows = 'id' in source ? PHONE_LIMITS.gridRows : PHONE_LIMITS.shownGridRows;
  const maxCols = 'id' in source ? PHONE_LIMITS.gridCols : PHONE_LIMITS.shownGridCols;
  if (!isWhole(rows, 1) || rows > maxRows)
    problems.add(where, `rows must be a whole number from 1 to ${String(maxRows)}`);
  if (!isWhole(cols, 1) || cols > maxCols)
    problems.add(where, `cols must be a whole number from 1 to ${String(maxCols)}`);
  if (!Array.isArray(cells)) {
    problems.add(where, 'cells must be a list');
    return;
  }
  if (isWhole(rows, 1) && isWhole(cols, 1) && cells.length !== rows * cols) {
    problems.add(
      where,
      `has ${String(cells.length)} cells; rows times cols is ${String(rows * cols)}`,
    );
  }
  (cells as unknown[]).forEach((cell, index) => {
    const at = `${where} cell ${String(index)}`;
    if (!isObject(cell)) {
      problems.add(at, 'must be an object');
      return;
    }
    problems.keys(at, cell, ['label', 'colour', 'state', 'focus']);
    problems.flag(`${at} focus`, cell.focus);
    problems.text(`${at} label`, cell.label, PHONE_LIMITS.cellLabel, false);
    problems.token(`${at} colour`, cell.colour);
    problems.oneOf(`${at} state`, cell.state, ITEM_STATES, false);
  });
}
function checkCards(problems: Problems, where: string, cards: unknown): void {
  if (!Array.isArray(cards)) {
    problems.add(where, 'cards must be a list');
    return;
  }
  if (cards.length > PHONE_LIMITS.cardsPerRow)
    problems.add(
      where,
      `has ${String(cards.length)} cards; a row holds ${String(PHONE_LIMITS.cardsPerRow)}`,
    );
  const seen = new Set<unknown>();
  (cards as unknown[]).forEach((card, index) => {
    const at = `${where} card ${String(index)}`;
    if (!isObject(card)) {
      problems.add(at, 'must be an object');
      return;
    }
    problems.keys(at, card, ['id', 'label', 'mark', 'colour', 'faceDown', 'state', 'focus']);
    problems.flag(`${at} focus`, card.focus);
    if (problems.id(at, card.id)) {
      if (seen.has(card.id)) problems.add(at, `id "${card.id}" is used twice`);
      seen.add(card.id);
    }
    problems.text(`${at} label`, card.label, PHONE_LIMITS.cardLabel, card.faceDown !== true);
    problems.text(`${at} mark`, card.mark, PHONE_LIMITS.markLength, false);
    problems.token(`${at} colour`, card.colour);
    problems.flag(`${at} faceDown`, card.faceDown);
    problems.oneOf(`${at} state`, card.state, ITEM_STATES, false);
  });
}
function checkControl(problems: Problems, where: string, control: Loose): void {
  const kind = control.kind as LayoutControl['kind'];
  problems.keys(where, control, ['kind', 'id', 'audience', ...CONTROL_KEYS[kind]]);
  problems.oneOf(`${where} audience`, control.audience, AUDIENCES, false);
  switch (kind) {
    case 'stick':
    case 'dpad':
    case 'tilt':
      break;
    case 'button':
      problems.oneOf(`${where} button`, control.button, PAD_BUTTONS);
      problems.text(`${where} label`, control.label, PHONE_LIMITS.buttonLabel);
      problems.token(`${where} colour`, control.colour);
      problems.flag(`${where} disabled`, control.disabled);
      break;
    case 'shake':
      problems.oneOf(`${where} button`, control.button, PAD_BUTTONS);
      break;
    case 'swipe':
      problems.text(`${where} label`, control.label, PHONE_LIMITS.buttonLabel, false);
      break;
    case 'options': {
      problems.oneOf(`${where} size`, control.size, ['large'], false);
      const options = control.options;
      if (!Array.isArray(options) || options.length === 0) {
        problems.add(where, 'options must be a list of at least one');
        break;
      }
      if (options.length > PHONE_LIMITS.optionsPerControl) {
        problems.add(
          where,
          'has ' +
            String(options.length) +
            ' options; the most that fits is ' +
            String(PHONE_LIMITS.optionsPerControl),
        );
      }
      const seen = new Set<unknown>();
      (options as unknown[]).forEach((option, index) => {
        const at = `${where} option ${String(index)}`;
        if (!isObject(option)) {
          problems.add(at, 'must be an object');
          return;
        }
        problems.keys(at, option, ['id', 'label', 'face', 'colour', 'state', 'focus']);
        problems.flag(`${at} focus`, option.focus);
        if (problems.id(at, option.id)) {
          if (seen.has(option.id)) problems.add(at, `id "${option.id}" is used twice`);
          seen.add(option.id);
        }
        problems.text(`${at} label`, option.label, PHONE_LIMITS.optionLabel);
        problems.oneOf(`${at} face`, option.face, FACE_BUTTONS, false);
        problems.token(`${at} colour`, option.colour);
        problems.oneOf(`${at} state`, option.state, ITEM_STATES, false);
      });
      break;
    }
    case 'grid':
      checkCells(problems, where, control);
      break;
    case 'cards':
      checkCards(problems, where, control.cards);
      problems.flag(`${where} tappable`, control.tappable);
      break;
    case 'text':
      problems.text(`${where} text`, control.text, PHONE_LIMITS.textLength);
      problems.oneOf(`${where} tone`, control.tone, TONES, false);
      break;
  }
}
/**
 * Everything wrong with a controller layout, one line each; empty when it is sound. Checks
 * that it is plain JSON within 4,096 bytes, that every control and every field is part of the
 * schema, the per-part limits in `PHONE_LIMITS`, and that no part appears more often than a
 * phone has of it (one stick, one D-pad, each button once).
 */
export function checkLayout(layout: unknown): string[] {
  const notJson = jsonProblem(layout, 'layout');
  if (notJson !== null) return [notJson];
  if (!isObject(layout)) return ['layout: must be an object'];
  const problems = new Problems();
  problems.keys('layout', layout, ['revision', 'controls']);
  if (!isWhole(layout.revision, 0))
    problems.add('layout', 'revision must be a whole number of at least 0');
  const controls = layout.controls;
  if (!Array.isArray(controls)) {
    problems.add('layout', 'controls must be a list');
    return problems.list;
  }
  if (controls.length > PHONE_LIMITS.controls)
    problems.add(
      'layout',
      'has ' + String(controls.length) + ' controls; the most is ' + String(PHONE_LIMITS.controls),
    );
  const ids = new Set<unknown>();
  const once = new Map<string, number>();
  const buttons = new Set<unknown>();
  const shakes: {
    where: string;
    button: unknown;
  }[] = [];
  (controls as unknown[]).forEach((control, index) => {
    if (!isObject(control)) {
      problems.add(`control ${String(index)}`, 'must be an object');
      return;
    }
    const where = `control ${String(index)} (${typeof control.id === 'string' ? control.id : '?'})`;
    if (typeof control.kind !== 'string' || !Object.hasOwn(CONTROL_KEYS, control.kind)) {
      problems.add(
        where,
        'kind ' +
          JSON.stringify(control.kind) +
          ' is not in the schema; use one of ' +
          Object.keys(CONTROL_KEYS).join(', '),
      );
      return;
    }
    if (problems.id(where, control.id)) {
      if (ids.has(control.id)) problems.add(where, 'id is used twice');
      ids.add(control.id);
    }
    checkControl(problems, where, control);
    const single = control.kind === 'button' ? `button ${String(control.button)}` : control.kind;
    if (['stick', 'dpad', 'tilt', 'swipe', 'shake', 'button'].includes(control.kind))
      once.set(single, (once.get(single) ?? 0) + 1);
    if (control.kind === 'button') buttons.add(control.button);
    if (control.kind === 'shake') shakes.push({ where, button: control.button });
  });
  for (const [part, count] of once) {
    if (count > 1) problems.add('layout', `has ${String(count)} of "${part}"; a phone has one`);
  }
  for (const shake of shakes) {
    if (!buttons.has(shake.button))
      problems.add(
        shake.where,
        'needs button ' +
          String(shake.button) +
          ' in the layout too, for players who cannot shake (CTRL-007)',
      );
  }
  const bytes = jsonSize(layout);
  if (bytes > PHONE_LIMITS.layoutBytes)
    problems.add(
      'layout',
      'is ' +
        String(bytes) +
        ' bytes; the most the protocol carries is ' +
        String(PHONE_LIMITS.layoutBytes),
    );
  return problems.list;
}
/** Everything wrong with a private view, one line each. `null` (nothing to show) is sound. */
export function checkPrivateView(view: unknown): string[] {
  if (view === null) return [];
  const notJson = jsonProblem(view, 'private view');
  if (notJson !== null) return [notJson];
  if (!isObject(view)) return ['private view: must be an object or null'];
  const problems = new Problems();
  problems.keys('private view', view, ['revision', 'blocks']);
  if (!isWhole(view.revision, 0)) problems.add('private view', 'revision must be a whole number');
  const blocks = view.blocks;
  if (!Array.isArray(blocks)) {
    problems.add('private view', 'blocks must be a list');
    return problems.list;
  }
  if (blocks.length > PHONE_LIMITS.blocks)
    problems.add(
      'private view',
      `has ${String(blocks.length)} blocks; the most is ${String(PHONE_LIMITS.blocks)}`,
    );
  (blocks as unknown[]).forEach((block, index) => {
    const where = `block ${String(index)}`;
    if (!isObject(block)) {
      problems.add(where, 'must be an object');
      return;
    }
    if (typeof block.kind !== 'string' || !Object.hasOwn(BLOCK_KEYS, block.kind)) {
      problems.add(
        where,
        'kind ' +
          JSON.stringify(block.kind) +
          ' is not in the schema; use one of ' +
          Object.keys(BLOCK_KEYS).join(', '),
      );
      return;
    }
    const kind = block.kind as PanelBlock['kind'];
    problems.keys(where, block, ['kind', 'audience', ...BLOCK_KEYS[kind]]);
    problems.oneOf(`${where} audience`, block.audience, AUDIENCES, false);
    switch (kind) {
      case 'text':
        problems.text(`${where} text`, block.text, PHONE_LIMITS.textLength);
        problems.oneOf(`${where} tone`, block.tone, TONES, false);
        break;
      case 'cards':
        checkCards(problems, where, block.cards);
        break;
      case 'stat':
        problems.text(`${where} label`, block.label, PHONE_LIMITS.statLabel);
        if (typeof block.value === 'number') break;
        problems.text(`${where} value`, block.value, PHONE_LIMITS.statValue);
        break;
      case 'grid':
        checkCells(problems, where, block);
        break;
    }
  });
  const bytes = jsonSize(view);
  if (bytes > PHONE_LIMITS.privateViewBytes) {
    problems.add(
      'private view',
      'is ' +
        String(bytes) +
        ' bytes; the most the protocol carries is ' +
        String(PHONE_LIMITS.privateViewBytes),
    );
  }
  return problems.list;
}
function inAudience(
  part: {
    readonly audience?: Audience;
  },
  isLeader: boolean,
): boolean {
  return (
    part.audience === undefined ||
    part.audience === 'everyone' ||
    (part.audience === 'leader') === isLeader
  );
}
/** The layout as one phone receives it: only the controls that phone is the audience of. */
export function layoutFor(layout: ControllerLayout, isLeader: boolean): ControllerLayout {
  if (layout.controls.every((control) => inAudience(control, isLeader))) return layout;
  return {
    revision: layout.revision,
    controls: layout.controls.filter((control) => inAudience(control, isLeader)),
  };
}
/** The private view as one phone receives it: only the blocks that phone is the audience of. */
export function privateViewFor(view: PrivateView | null, isLeader: boolean): PrivateView | null {
  if (view === null || view.blocks.every((block) => inAudience(block, isLeader))) return view;
  return {
    revision: view.revision,
    blocks: view.blocks.filter((block) => inAudience(block, isLeader)),
  };
}
interface Box {
  readonly what: string;
  readonly width: number;
  readonly height: number;
}
/** The narrowest an option may be: room for its text on up to three lines, never under 144 px. */
function optionWidth(option: OptionItem): number {
  const longest = Math.max(0, ...option.label.split(/\s+/).map(charCount));
  const letters =
    Math.max(longest, Math.ceil(charCount(option.label) / PHONE.optionLines)) * PHONE.letter.body;
  return Math.max(
    PHONE.optionWidth,
    PHONE.optionPadding + (option.face === undefined ? 0 : PHONE.optionShape) + letters,
  );
}
function gridBox(
  what: string,
  rows: number,
  cols: number,
  cell: {
    width: number;
    height: number;
  },
): Box {
  return {
    what,
    width: cols * cell.width + (cols - 1) * PHONE.gridGap,
    height: rows * cell.height + (rows - 1) * PHONE.gridGap,
  };
}
function cardsBox(
  what: string,
  count: number,
  card: {
    width: number;
    height: number;
  },
): Box {
  return {
    what,
    width: Math.max(0, count * card.width + (count - 1) * PHONE.rowGap),
    height: count === 0 ? 0 : card.height,
  };
}
/** Lines of text set in a column of the given width. */
function textHeight(text: string, tone: 'title' | 'body' | 'note', width: number): number {
  const perLine = Math.max(1, Math.floor(width / PHONE.letter[tone]));
  return Math.max(1, Math.ceil(charCount(text) / perLine)) * PHONE.line[tone];
}
function stack(heights: readonly number[]): number {
  return (
    heights.reduce((sum, height) => sum + height, 0) +
    Math.max(0, heights.length - 1) * PHONE.rowGap
  );
}
/** Minimum rectangular footprint in real pixels; packing must also include gaps. */
export function footprintOf(part: LayoutControl | PanelBlock): {
  width: number;
  height: number;
} {
  if (part.kind === 'grid')
    return gridBox(
      'grid',
      part.rows,
      part.cols,
      'id' in part ? PHONE.inPlay : { width: PHONE.cellShown, height: PHONE.cellShown },
    );
  if (part.kind === 'stick' || part.kind === 'swipe')
    return { width: PHONE.stick, height: PHONE.stick };
  if (part.kind === 'dpad')
    return { width: 3 * PHONE.inPlay.width, height: 3 * PHONE.inPlay.height };
  if (part.kind === 'button')
    return part.button.startsWith('face')
      ? { width: PHONE.face, height: PHONE.face }
      : PHONE.inPlay;
  if (part.kind === 'options') {
    const columns = Math.min(2, part.options.length);
    const rows = Math.ceil(part.options.length / Math.max(1, columns));
    const width = Math.max(0, ...part.options.map(optionWidth));
    const height = part.size === 'large' ? PHONE.optionWidth : PHONE.inPlay.height;
    return {
      width: columns * width + Math.max(0, columns - 1) * PHONE.rowGap,
      height: rows * height + Math.max(0, rows - 1) * PHONE.rowGap,
    };
  }
  if (part.kind === 'cards')
    return cardsBox(
      'cards',
      part.cards.length,
      'tappable' in part && part.tappable ? PHONE.cardTappable : PHONE.card,
    );
  if (part.kind === 'shake' || part.kind === 'tilt') return { width: 0, height: 0 };
  return { width: PHONE.infoColumn, height: PHONE.line.body };
}
export interface Packing {
  readonly fits: boolean;
  /** The least width and height the parts need, laid out as described on `packPhone`. */
  readonly width: number;
  readonly height: number;
  /** When it does not fit: what is too wide or too tall, with the sums. */
  readonly problems: readonly string[];
}
/**
 * Lays one phone's parts out inside the 818 by 314 px play area, each at its smallest allowed
 * size, and says whether they fit. The arrangement is the one board 4 uses:
 *
 *   [ moving ]  [ words ]  [ panel ]  [ buttons ]      columns, 21 px apart
 *
 * - MOVING, on the left: stick (178 square), D-pad (three 89 by 68 px arms each way: 267 by
 *   204) and swipe area (178 square), side by side.
 * - BUTTONS, on the right: one face button is 110 px, two are 233 by 110, three or four are
 *   the 300 px diamond; shoulder buttons (89 by 68) stack in a column beside them.
 * - PANEL, in the middle, stacked 13 px apart: each options control as rows of buttons 68 px
 *   tall and at least 144 px wide (wider for long text); a tappable grid with 89 by 68 px
 *   cells 8 px apart; cards 68 by 93 (89 by 122 if tappable); a read-only grid of 34 px cells.
 * - WORDS (text and figures): either on top of the panel, or in a column of their own at
 *   least 144 px wide beside it, whichever fits (board 4's Peek Poker picker does the latter).
 *
 * It fits if the columns' widths with their gaps are within 818 and every column's height is
 * within 314. Nothing is ever shrunk below a floor to make it fit.
 */
export function packPhone(layout: ControllerLayout, view: PrivateView | null): Packing {
  const moving: Box[] = [];
  const panel: ((width: number) => Box)[] = [];
  const words: ((width: number) => number)[] = [];
  let faces = 0;
  let shoulders = 0;
  const addWords = (text: string, tone: 'title' | 'body' | 'note'): void => {
    words.push((width) => textHeight(text, tone, width));
  };
  const addCards = (what: string, cards: readonly CardItem[], tappable: boolean): void => {
    const box = cardsBox(what, cards.length, tappable ? PHONE.cardTappable : PHONE.card);
    panel.push(() => box);
  };
  for (const control of layout.controls) {
    switch (control.kind) {
      case 'stick':
      case 'swipe':
        moving.push({ what: control.kind, width: PHONE.stick, height: PHONE.stick });
        break;
      case 'dpad':
        moving.push({
          what: 'D-pad',
          width: 3 * PHONE.inPlay.width,
          height: 3 * PHONE.inPlay.height,
        });
        break;
      case 'button':
        if (control.button.startsWith('face')) faces += 1;
        else shoulders += 1;
        break;
      case 'shake':
      case 'tilt':
        break;
      case 'options': {
        const widest = control.options.reduce(
          (most, option) => Math.max(most, optionWidth(option)),
          0,
        );
        const count = control.options.length;
        panel.push((width) => {
          const columns = Math.max(
            1,
            Math.min(2, count, Math.floor((width + PHONE.rowGap) / (widest + PHONE.rowGap))),
          );
          const rows = Math.ceil(count / columns);
          const height = control.size === 'large' ? PHONE.optionWidth : PHONE.inPlay.height;
          return {
            what: `options "${control.id}"`,
            width: columns * widest + (columns - 1) * PHONE.rowGap,
            height: rows * height + (rows - 1) * PHONE.rowGap,
          };
        });
        break;
      }
      case 'grid': {
        const box = gridBox(`grid "${control.id}"`, control.rows, control.cols, PHONE.inPlay);
        panel.push(() => box);
        break;
      }
      case 'cards':
        addCards(`cards "${control.id}"`, control.cards, control.tappable === true);
        break;
      case 'text':
        addWords(control.text, control.tone ?? 'body');
        break;
    }
  }
  for (const block of view?.blocks ?? []) {
    switch (block.kind) {
      case 'text':
        addWords(block.text, block.tone ?? 'body');
        break;
      case 'stat':
        addWords(`${block.label} ${String(block.value)}`, 'body');
        break;
      case 'cards':
        addCards('cards', block.cards, false);
        break;
      case 'grid': {
        const box = gridBox('grid', block.rows, block.cols, {
          width: PHONE.cellShown,
          height: PHONE.cellShown,
        });
        panel.push(() => box);
        break;
      }
    }
  }
  const buttons: Box[] = [];
  if (faces === 1) buttons.push({ what: 'face button', width: PHONE.face, height: PHONE.face });
  else if (faces === 2)
    buttons.push({
      what: 'face buttons',
      width: 2 * PHONE.face + PHONE.rowGap,
      height: PHONE.face,
    });
  else if (faces > 2)
    buttons.push({ what: 'face buttons', width: PHONE.diamond, height: PHONE.diamond });
  if (shoulders > 0)
    buttons.push({
      what: 'shoulder buttons',
      width: PHONE.inPlay.width,
      height: stack(new Array<number>(shoulders).fill(PHONE.inPlay.height)),
    });
  const sides = [...moving, ...buttons];
  const sideWidth = sides.reduce((sum, box) => sum + box.width, 0);
  const sideHeight = sides.reduce((most, box) => Math.max(most, box.height), 0);
  /** One arrangement: words on top of the panel, or in their own column. */
  const arrange = (wordsBeside: boolean, separatePanels = false): Packing => {
    const hasPanel = panel.length > 0 || (!wordsBeside && words.length > 0);
    const wordsColumn = wordsBeside && words.length > 0;
    const columns =
      sides.length +
      (hasPanel ? (separatePanels ? Math.max(1, panel.length) : 1) : 0) +
      (wordsColumn ? 1 : 0);
    const gaps = Math.max(0, columns - 1) * PHONE.columnGap;
    const wordsWidth = wordsColumn ? PHONE.infoColumn : 0;
    const room = PHONE.play.width - sideWidth - wordsWidth - gaps;
    const problems: string[] = [];
    // The panel is given all the room that is left; a part may need more than that.
    const panelWidth = hasPanel ? Math.max(room, 0) : 0;
    const boxes = panel.map((measure) =>
      measure(separatePanels ? PHONE.optionWidth : Math.max(panelWidth, 1)),
    );
    const panelNeeds = separatePanels
      ? boxes.reduce((sum, box) => sum + box.width, 0)
      : boxes.reduce(
          (most, box) => Math.max(most, box.width),
          hasPanel && !wordsBeside && words.length > 0 ? PHONE.infoColumn : 0,
        );
    const wordsHeights = words.map((measure) =>
      measure(wordsBeside ? PHONE.infoColumn : Math.max(panelWidth, PHONE.infoColumn)),
    );
    const panelHeight = separatePanels
      ? Math.max(0, ...boxes.map((box) => box.height))
      : stack([...(wordsBeside ? [] : wordsHeights), ...boxes.map((box) => box.height)]);
    const wordsHeight = wordsBeside ? stack(wordsHeights) : 0;
    const width = sideWidth + wordsWidth + gaps + panelNeeds;
    const height = Math.max(sideHeight, panelHeight, wordsHeight);
    if (width > PHONE.play.width) {
      const parts = [
        ...sides.map((box) => `${box.what} ${String(box.width)}`),
        ...(wordsColumn ? [`words ${String(wordsWidth)}`] : []),
      ];
      const widest = boxes.reduce<Box | null>(
        (most, box) => (most === null || box.width > most.width ? box : most),
        null,
      );
      if (hasPanel) parts.push(`${widest?.what ?? 'words'} ${String(panelNeeds)}`);
      problems.push(
        'needs ' +
          String(width) +
          ' px across (' +
          parts.join(' + ') +
          ' + ' +
          String(columns - 1) +
          ' gaps of ' +
          String(PHONE.columnGap) +
          '); the play area is ' +
          String(PHONE.play.width) +
          ' px wide',
      );
    }
    if (height > PHONE.play.height) {
      const tallest =
        sideHeight >= panelHeight && sideHeight >= wordsHeight
          ? sides.reduce<Box | null>(
              (most, box) => (most === null || box.height > most.height ? box : most),
              null,
            )
          : null;
      const what =
        tallest !== null
          ? tallest.what
          : wordsHeight > panelHeight
            ? 'the words in their column'
            : [
                ...(wordsBeside || words.length === 0 ? [] : ['words']),
                ...boxes.map((box) => `${box.what} ${String(box.height)}`),
              ].join(' + ') +
              ' with ' +
              String(PHONE.rowGap) +
              ' px between';
      problems.push(
        'needs ' +
          String(height) +
          ' px down (' +
          what +
          '); the play area is ' +
          String(PHONE.play.height) +
          ' px tall',
      );
    }
    return { fits: problems.length === 0, width, height, problems };
  };
  const onTop = arrange(false);
  if (onTop.fits) return onTop;
  const beside = arrange(true);
  if (beside.fits) return beside;
  const separate = arrange(true, true);
  return separate.fits ? separate : onTop;
}
/**
 * Do a layout and a private view (both already sound by `checkLayout` and `checkPrivateView`)
 * fit one phone at the decided sizes? Checked twice, as the leader's phone and as anyone
 * else's, since each sees a different set of parts.
 */
export function checkPhoneFit(layout: ControllerLayout, view: PrivateView | null): string[] {
  const problems: string[] = [];
  const varies = [...layout.controls, ...(view?.blocks ?? [])].some(
    (part) => part.audience !== undefined && part.audience !== 'everyone',
  );
  for (const isLeader of varies ? [false, true] : [false]) {
    const packing = packPhone(layoutFor(layout, isLeader), privateViewFor(view, isLeader));
    const whose = varies
      ? isLeader
        ? " on the leader's phone"
        : " on a phone that is not the leader's"
      : '';
    for (const problem of packing.problems)
      problems.push(
        'does not fit a ' +
          String(PHONE.width) +
          ' by ' +
          String(PHONE.height) +
          ' phone' +
          whose +
          ': ' +
          problem,
      );
  }
  return problems;
}
/**
 * Why a tap must not reach the game, or null when it may. The host applies this to every
 * action against the layout the game returns for the current state (`driveStep` does it).
 */
export function rejectAction(
  layout: ControllerLayout,
  action: PlayerAction,
  isLeader: boolean,
): string | null {
  if (action.revision !== layout.revision)
    return (
      'made against revision ' +
      String(action.revision) +
      '; the layout is now at ' +
      String(layout.revision)
    );
  const control = layout.controls.find((candidate) => candidate.id === action.control);
  if (control === undefined) return `no control "${action.control}" in the layout`;
  if (!inAudience(control, isLeader))
    return control.audience === 'leader'
      ? `"${control.id}" is the leader's`
      : `"${control.id}" is not for the leader`;
  const value = action.value;
  switch (control.kind) {
    case 'options': {
      const option = control.options.find((candidate) => candidate.id === value);
      if (option === undefined) return `"${control.id}" has no option ${JSON.stringify(value)}`;
      return option.state === 'disabled' ? `option "${option.id}" is disabled` : null;
    }
    case 'grid': {
      const cell =
        typeof value === 'number' && Number.isInteger(value) ? control.cells[value] : undefined;
      if (cell === undefined) return `"${control.id}" has no cell ${JSON.stringify(value)}`;
      return cell.state === 'disabled' ? `cell ${String(value)} is disabled` : null;
    }
    case 'cards': {
      if (control.tappable !== true) return `the cards in "${control.id}" cannot be tapped`;
      const card = control.cards.find((candidate) => candidate.id === value);
      if (card === undefined) return `"${control.id}" has no card ${JSON.stringify(value)}`;
      return card.state === 'disabled' ? `card "${card.id}" is disabled` : null;
    }
    case 'swipe':
      return typeof value === 'string' && SWIPES.includes(value)
        ? null
        : `a swipe is up, down, left or right, not ${JSON.stringify(value)}`;
    case 'stick':
    case 'dpad':
    case 'button':
    case 'shake':
    case 'tilt':
    case 'text':
      return `"${control.id}" is a ${control.kind}; it is not tapped`;
  }
}
/**
 * What the tappable parts of a layout offer, as text. A player's `revision` must change
 * exactly when this does: if it changes and the revision does not, a late tap could mean
 * something else; if the revision changes and this does not, a good tap is thrown away.
 * Left out on purpose: which items are selected, disabled or under the cursor (a tap on a
 * disabled item is dropped anyway, and a buzzer race must not lose a press because another
 * option was greyed), and everything about held controls and text.
 */
export function tapSignature(layout: ControllerLayout): string {
  const parts: unknown[] = [];
  for (const control of layout.controls) {
    const audience = control.audience ?? 'everyone';
    switch (control.kind) {
      case 'options':
        parts.push([
          control.id,
          audience,
          control.options.map((option) => [option.id, option.label]),
        ]);
        break;
      case 'grid':
        parts.push([
          control.id,
          audience,
          control.rows,
          control.cols,
          control.cells.map((cell) => cell.label ?? ''),
        ]);
        break;
      case 'cards':
        if (control.tappable === true)
          parts.push([
            control.id,
            audience,
            control.cards.map((card) => [card.id, card.label, card.faceDown === true]),
          ]);
        break;
      case 'swipe':
        parts.push([control.id, audience]);
        break;
      case 'stick':
      case 'dpad':
      case 'button':
      case 'shake':
      case 'tilt':
      case 'text':
        break;
    }
  }
  return JSON.stringify(parts);
}
