// The game interface (PLAT-030, PLAT-031, PLAT-032, PLAT-025, PLAT-033).
//
// A game is one object of type `GameModule`. The console (room, pairing, lobby, picker, pause,
// results chrome) knows nothing else about a game, and a game imports nothing from the console.
// Everything here is plain data or a pure function: no DOM, no network, no clock.
//
// How a match runs, as the host drives it:
//
//   1. `preload(null)` names data the settings screen needs (a question bank's index). The
//      picker reads `meta` and draws `settingsSchema(module, context).fields`; the leader chooses.
//   2. `preload(settings)` names data that must be in hand before `init` (the chunks chosen).
//   3. `init(seed, players, settings, context)` makes the first state.
//   4. `assets(state)` names every picture, atlas and sound the match can show. The host loads
//      them all before the first step: nothing loads during play.
//   5. Sixty times a second the host calls `driveStep` (see `drive.ts`), which applies anyone
//      who left or joined, drops taps that no longer fit the phone's layout, and calls `step`.
//      It does not call it while the room is paused, or while the match is short of players.
//   6. After each step the TV draws from `publicView(state)`; each phone is sent
//      `controllerLayout(state, player)` and `privateView(state, player)` when they change.
//   7. When `isOver(state)` the console shows `results(state)`. Whenever it likes, and at the
//      end, it stores `save(state)` on the host device.
//
// The conformance kit (`conformance.ts`) checks every promise written in this file.
import type { SampledInput } from '@kaki/sim-core';
import type { ControllerLayout, PrivateView } from './layout';
import type { SettingsSchema } from './settings';
/** Anything `JSON.stringify` keeps exactly. Views, layouts, results and saved data are this. */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };
/** A player's identity for the length of a room. Opaque to games. */
export type PlayerId = string;
/** The two teams (PLAT-025). The console gives each a name and a colour theme. */
export type TeamId = 0 | 1;
/**
 * The name of a design token in `packages/ui`, such as `seat-3` or `team-red`. Games name
 * colours; they never hold colour values. Only the decided seat, team and shape tokens.
 */
export type ColourToken =
  | `seat-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  | 'team-red'
  | 'team-blue'
  | `shape-${'cross' | 'circle' | 'square' | 'triangle'}`;
/** One player as a game is told about them. */
export interface PlayerInfo {
  readonly id: PlayerId;
  /** Seat number, 1 to 8, shown on the TV and the phone (PLAT-004). */
  readonly seat: number;
  readonly name: string;
  /** The seat's colour token, for example `seat-3`. */
  readonly colour: ColourToken;
  /**
   * The player's team, when the match is played in teams. Either every player has one or none
   * has: use `teamsInUse(players)`. A game must work when it is absent unless `meta.teams` is
   * `required`.
   */
  readonly team?: TeamId;
}
export interface GameMeta {
  /** Folder-style id, for example `peek-poker`. Lower-case letters, digits and hyphens. */
  readonly id: string;
  /** Shown in the picker (PLAT-020). */
  readonly name: string;
  /** One line for the picker, at most 89 characters. */
  readonly blurb: string;
  /** Supported player counts, both ends included, within 1 to 8 (PLAT-021). */
  readonly players: {
    readonly min: number;
    readonly max: number;
  };
  /**
   * `none`: never in teams. `optional`: the leader may turn teams on in the lobby.
   * `required`: always two teams. With teams on, each team has at least one player, so a team
   * match needs two players or more.
   */
  readonly teams: 'none' | 'optional' | 'required';
  /** Players work together for one shared score (in at least one way of playing). */
  readonly coop: boolean;
  /** Playable by one person alone. Must be true exactly when `players.min` is 1. */
  readonly solo: boolean;
  /**
   * PLAT-008: may a phone join while this game is running? `true`: the shell seats it at once and
   * calls `join`; the game keeps the joiner out of play, with a safe waiting layout and private
   * view, until its own next join point (for example the next question or round), then starts it
   * with the game's starting score. `false`: the phone waits for the lobby and is let in when the
   * TV returns to the picker, lobby or results. Each game spec says which (RZ-014, PP-013, TR-056).
   * While a match uses teams the host holds a new phone even when this is `true`, and lets it in
   * at the picker or results (D-202; which team a late joiner gets is OQ-048).
   */
  readonly midGameJoin: boolean;
  /** CTRL-009: local TV seats play, or watch without game membership or private output. */
  readonly localSeat: 'play' | 'watch';
}
/**
 * How `step`, `join`, `leave`, `pause` and `resume` treat the state they are given.
 *
 * - `returns-new` (the default, and the one to use): never changes the state or the inputs it
 *   was given; returns a new state that SHARES every part that did not change with the old
 *   one. It must not copy the whole state each step. Returning the very same object means
 *   "nothing changed". The kit freezes state and inputs before every call. Allowed by the
 *   owner's ruling D-048 (`docs/PERFORMANCE.md` section 2 as amended).
 * - `in-place`: an escape hatch. May change the state it was given and return it, creating
 *   no objects per step. The kit cannot freeze, and the host must copy whatever the renderer
 *   interpolates from.
 *
 * Measured costs of both are in `docs/slices/F-04-game-interface.md`.
 */
export type StepMode = 'returns-new' | 'in-place';
/** The mode a module runs in: `returns-new` unless it says otherwise. */
export function stepModeOf(module: { readonly stepMode?: StepMode }): StepMode {
  return module.stepMode ?? 'returns-new';
}
/** A tap on something in the phone's layout that is not a held input. */
export interface PlayerAction {
  readonly player: PlayerId;
  /** The `id` of the control that was tapped. */
  readonly control: string;
  /** Which option, grid cell (its index), card or swipe direction. */
  readonly value?: string | number;
  /** The `revision` of the layout the phone was showing when the tap was made. */
  readonly revision: number;
}
/** What one step is given besides the state. Borrowed: read it, never keep any part of it. */
export interface StepInputs {
  /**
   * Held inputs per player, as sampled from the input buffer: buttons by `BUTTON` bit, stick
   * in `axes[0]` and `axes[1]`, tilt in `axes[2]` and `axes[3]`. A player with no frame is
   * holding nothing. THE MAP AND ITS FRAMES ARE REUSED by the host on the next step: copy
   * with `copyFrame` anything to be kept, or the kit's previous-state check fails.
   *
   * ORDER: frames iterates in ascending seat order, including after a lower seat rejoins.
   * Rules that resolve simultaneous events should still use an explicit tie rule.
   */
  readonly frames: ReadonlyMap<PlayerId, SampledInput>;
  /**
   * Taps since the previous step, in the order the host received them. Before `step` sees
   * them, `driveStep` checks each against the layout the game returns FOR THE STATE GIVEN TO
   * THIS STEP (after anyone joined or left) and that player. A tap is delivered only if:
   *
   *   1. its revision is that layout's revision;
   *   2. the control exists, can be tapped, and offers the value, which is not disabled;
   *   3. the tapper is in the control's audience (the leader, or not the leader);
   *   4. no earlier tap in this same step, from the same player on the same control, was
   *      delivered.
   *
   * So a step sees AT MOST ONE tap per player per control: two presses of answer buttons in
   * one step arrive as the first one only, and the second is dropped, not kept for later.
   * Taps by one player on two DIFFERENT controls in one step can both arrive, each valid
   * against the same layout; the game applies them in order and checks its own state between
   * them (a lock-in followed by a pick must not change the pick). And a tap that the layout
   * AFTER this step would refuse must have no effect if it does arrive in this step: the kit
   * tries exactly that (check `repeat-taps`).
   */
  // After host acceptance, revision is transport metadata: rules use control and value only.
  readonly actions: readonly PlayerAction[];
  /** The room leader at this step (PLAT-006), or null if the room has none. */
  readonly leader: PlayerId | null;
  /**
   * Players still in the match whose phone is not connected at this step (asleep, reloading,
   * dropped) and who may yet return to their seat (PLAT-007). Usually empty. They send no
   * frames and no taps. A rule that waits for "everyone" (a lock-out that lifts when all
   * others have had a turn, a round that ends when all have locked in) should not wait for
   * them. A player who does not return is removed with `leave`.
   */
  readonly disconnected: readonly PlayerId[];
  /** Current connectivity for every seated player, including those sending no input. */
  readonly connected: ReadonlyMap<PlayerId, boolean>;
}
/** One file the host loads before play. `key` is a path under the game's asset folder. */
export interface Asset {
  readonly key: string;
  /** `data` is JSON and is the only kind handed to the game (see `SetupContext.data`). */
  readonly kind: 'data' | 'image' | 'atlas' | 'audio' | 'font';
}
export type AssetManifest = readonly Asset[];
/** What a game is given before a match exists: for its settings screen and for `init`. */
export interface SetupContext {
  /**
   * The parsed contents of every `data` asset named so far, by key: those from
   * `preload(null)` when the settings are being drawn, and also those from
   * `preload(settings)` by the time `init` is called.
   */
  readonly data: Readonly<Record<string, JsonValue>>;
  /**
   * What this game last asked the host device to keep (`save(state)`): personal bests,
   * stars per level and recently seen questions (DATA-002). Read on every Start;
   * saved after results and on quit to the picker. For registered game records, null
   * means unreadable (nothing is written that match); a missing record uses empty().
   * One key per game: `kaki.host-device.game.<id>.progress-v1`.
   */
  readonly saved: JsonValue;
  /** Whether the lobby's teams switch is on for this match (PLAT-025). */
  readonly teams: boolean;
}
/** The same thing, under the name `init` knows it by. */
export type InitContext = SetupContext;
export interface PlayerResult {
  readonly id: PlayerId;
  /**
   * 1 is best. Equal scores ALWAYS share a place, and the next place is skipped: 1, 1, 3
   * (RZ-016). A game that breaks ties puts the tie-break into the score it reports.
   */
  readonly place: number;
  /** Any finite number. In co-op, every player's score is the shared score. */
  readonly score: number;
  /** True for a player seated after the first simulation step (D-062). */
  readonly joinedMidGame: boolean;
  /** Anything else the results screen of this game shows for the player. */
  readonly extras?: JsonValue;
}
export interface TeamResult {
  readonly team: TeamId;
  readonly place: number;
  readonly score: number;
  readonly extras?: JsonValue;
}
/**
 * The standings. `results(state)` may be called at any step (a scoreboard between rounds) and
 * is final once `isOver(state)`. It is for showing; what the host keeps is `save(state)`.
 */
export interface Results {
  /**
   * What is ranked. `players`: each player for themselves. `teams`: the two teams, with the
   * players' own scores still listed. `coop`: nobody is ranked; every player has place 1 and
   * `score` is the shared score.
   */
  readonly mode: 'players' | 'teams' | 'coop';
  /** Every player now in the match, exactly once, best place first. */
  readonly players: readonly PlayerResult[];
  /** Both teams, best place first. Present exactly when the match is played in teams. */
  readonly teams?: readonly TeamResult[];
  /** The shared score. Present exactly when `mode` is `coop`. */
  readonly score?: number;
  /** Per-game extras for the results screen: stars, the best hand, a new personal best. */
  readonly extras?: JsonValue;
}
/**
 * Something a view must not show. `owner` is the one player allowed to see it, or null when
 * nobody may (a face-down card, the right answer). `value` is the hidden thing itself. The
 * kit searches `publicView`, `results` (including extras), and every other player's `privateView` and
 * `controllerLayout` at
 * every step:
 *
 * - with no `match`, the secret is found when any value or object key anywhere in a view
 *   equals `value`. A string of two or more characters is also found inside a longer string.
 *   Arrays and objects are compared whole. Right for things that are unmistakable: a card
 *   code, an answer's text.
 * - with `match`, the kit instead calls it for every value in the view with its path
 *   (`players[2].pick`); return true for a leak. Right when `value` is a small number that
 *   also turns up innocently.
 *
 * Neither search can see a secret that leaks in disguise (a count, a flag, an order). That
 * is what `scrambleSecrets` is for, and why a game with any secret must write it. The kit
 * also uses `value` to check that a scramble really changed the secret.
 */
export interface Secret {
  readonly owner: PlayerId | null;
  readonly label: string;
  readonly value: JsonValue;
  readonly match?: (found: JsonValue, path: string) => boolean;
}
/**
 * A game. `State` is the game's own plain data (anything `hashState` accepts; it is stored
 * through `encodeState`, so Maps and typed arrays are allowed). `Settings` is what the leader
 * chooses. `View` is what the TV draws from.
 */
export interface GameModule<
  State,
  Settings extends object = Record<string, never>,
  View = unknown,
> {
  readonly meta: GameMeta;
  /** Leave out for `returns-new`. */
  readonly stepMode?: StepMode;
  /** Opt out of the structural-sharing check only for genuinely tiny states. Explain why. */
  readonly tinyStateReason?: string;
  /**
   * What the leader may change before play. The console draws it without knowing the game.
   * Either a fixed schema, or a function of what is known before the match: loaded data (a
   * question bank's categories), what the host has saved (stars per level) and whether the
   * lobby's teams switch is on. Use `settingsSchema(module, context)` to read it.
   */
  readonly settings:
    SettingsSchema<Settings> | ((context: SetupContext) => SettingsSchema<Settings>);
  /**
   * `data` assets the game needs before play. Called twice: with `null` before the settings
   * screen is drawn (an index of categories), and with the chosen settings before `init`
   * (the chunks those settings need). Omit if the game needs neither.
   */
  preload?(settings: Settings | null): AssetManifest;
  /**
   * The first state. `seed` is a whole number from 0 to 2^53 - 1 and is the only source of
   * randomness (`createRng(seed)`; keep the generator in the state). `players` is in seat
   * order. Must work for every count from `meta.players.min` to `meta.players.max`.
   */
  init(
    seed: number,
    players: readonly PlayerInfo[],
    settings: Settings,
    context: InitContext,
  ): State;
  /**
   * One step. `dtMs` is always `STEP_MS` (1000 / 60): COUNT STEPS, do not add up
   * milliseconds, so that 0.25 s is exactly `secondsToSteps(0.25)` = 15 steps. Pure and
   * deterministic: same inputs, same result on the same browser engine. Never
   * throws on inputs the host can deliver. Keeps working after `isOver`. Never called while
   * the match has fewer players than `meta.players.min` or, in teams, an empty team.
   */
  step(state: State, inputs: StepInputs, dtMs: number): State;
  /**
   * A player arrives while the match is running (PLAT-008). Each game says what that means:
   * competitive joiners start at 0; co-op joiners share the team score. Joining must not
   * change any existing score or the shared score. Mark joinedMidGame after the first step.
   * With teams in use,
   * `player.team` is set.
   */
  join(state: State, player: PlayerInfo): State;
  /**
   * A player is gone for good (their two minutes to return ran out, or they quit). Must not
   * score: nobody's score changes. Must never throw, whoever leaves: the last player, or the
   * last of a team. An id that is not in the match is ignored.
   *
   * WHAT THE CONSOLE PROMISES IN RETURN: when a leave takes the match below
   * `meta.players.min`, or empties a team, the console pauses and does not call `step` again
   * until enough players have joined; if nobody does, it ends the match. In that state the
   * views, `results`, `isOver` and `save` must still answer without throwing.
   */
  leave(state: State, player: PlayerId): State;
  /**
   * The console pauses by not calling `step` (PLAT-023), so most games need neither hook.
   * `pause` lets a game hide what must not be studied while paused (cards being memorised);
   * `resume` must undo it exactly: `resume(pause(state))` has the same hash as `state`.
   */
  pause?(state: State): State;
  resume?(state: State): State;
  /** What the TV draws. Plain JSON. Pure: no change to the state, equal output for equal state. */
  publicView(state: State): View;
  /** What only this player's phone shows beside its controls, or null. At most 8,192 bytes. */
  privateView(state: State, player: PlayerId): PrivateView | null;
  /**
   * The controls this player's phone shows now. At most 4,096 bytes. Must work for any id,
   * including a player who has just joined and is waiting. `revision` is PER PLAYER: it goes
   * up when what THIS player can tap changes, and only then (see `ControllerLayout`).
   */
  controllerLayout(state: State, player: PlayerId): ControllerLayout;
  isOver(state: State): boolean;
  results(state: State): Results;
  /**
   * What the host device should keep for this game in place of what it held: bests, stars,
   * questions already seen. Optional. The console may call it AT ANY TIME (when the match
   * ends, when the leader quits to the picker, when the page is closing), so it must answer
   * for any state. It is handed back as `context.saved`. Plain JSON, pure.
   */
  save?(state: State): JsonValue;
  /**
   * Every picture, atlas, sound and font this match can show, whatever happens in it. Called
   * on the first state; the host loads the lot before the first step. It must never name
   * anything later that it did not name then (the kit checks).
   */
  assets(state: State): AssetManifest;
  /**
   * What is hidden now. Stop declaring a secret once the screen lets players work it out:
   * for example, marking three of four options wrong reveals the remaining right option.
   */
  secrets(state: State): readonly Secret[];
  /**
   * REQUIRED if `secrets` ever returns anything. Return a state in which everything hidden
   * from `viewer` (null: the TV) has been changed to something else it could equally have
   * been, using `salt` (a small whole number) to vary the choice, and everything `viewer`
   * may see is untouched. The kit then requires `viewer`'s views of the two states to be
   * identical, at every step, which is the only check that finds a secret leaking as a
   * count, a flag or an order. It also requires the state to really differ and every secret
   * hidden from `viewer` to have a new value. Must not change `state`.
   */
  scrambleSecrets?(state: State, viewer: PlayerId | null, salt: number): State;
}
/** A module with its type parameters forgotten, as the console holds a list of games. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameModule = GameModule<any, any>;
/** A game whose state type is known and whose settings type does not matter to the caller. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GameOf<State> = GameModule<State, any>;
/** True when the match is played in teams: every player carries a team. */
export function teamsInUse(players: readonly PlayerInfo[]): boolean {
  return players.length > 0 && players.every((player) => player.team !== undefined);
}
/** The players of one team, in seat order as given. */
export function teamPlayers(players: readonly PlayerInfo[], team: TeamId): PlayerInfo[] {
  return players.filter((player) => player.team === team);
}
/**
 * Bits of the button mask in a sampled frame, shared by every game and the controller kit:
 * `isHeld(frame, BUTTON.FACE_BOTTOM)`. Buttons are named by where they sit, never by a letter
 * or a symbol: what is printed on a face button belongs to each game's theme. The console's
 * pause button is not here; it is never given to a game.
 */
export const BUTTON = {
  // Bit positions: must match packages/protocol/src/input.ts BUTTON (D-062).
  DPAD_UP: 0,
  DPAD_DOWN: 1,
  DPAD_LEFT: 2,
  DPAD_RIGHT: 3,
  FACE_BOTTOM: 4,
  FACE_RIGHT: 5,
  FACE_LEFT: 6,
  FACE_TOP: 7,
  SHOULDER_LEFT: 8,
  SHOULDER_RIGHT: 9,
  START: 10,
  SHAKE: 11,
} as const;
export type ButtonName = keyof typeof BUTTON;
/** Where each analogue control writes in `frame.axes`. */
export const AXIS = { STICK_X: 0, STICK_Y: 1, TILT_X: 2, TILT_Y: 3 } as const;
/** How many axes the host's input buffer carries per controller. */
export const AXIS_COUNT = 4;
/** Colour tokens. `packages/ui` defines their values (F-06); games only name them. */
export const SEAT_COLOURS: readonly ColourToken[] = [
  'seat-1',
  'seat-2',
  'seat-3',
  'seat-4',
  'seat-5',
  'seat-6',
  'seat-7',
  'seat-8',
];
export const TEAM_COLOURS: readonly [ColourToken, ColourToken] = ['team-red', 'team-blue'];
export const SHAPE_COLOURS = {
  cross: 'shape-cross',
  circle: 'shape-circle',
  square: 'shape-square',
  triangle: 'shape-triangle',
} as const;
/** The simulation runs at this many steps a second, for every game. */
export const STEPS_PER_SECOND = 60;
/** The `dtMs` every step is given. */
export const STEP_MS = 1000 / STEPS_PER_SECOND;
/**
 * A length of time as a whole number of steps (0.25 s is 15; 30 s is 1,800). Keep timers in
 * the state as steps left, or as the step number at which something happens, and count them
 * with whole numbers: adding up `dtMs` drifts, because 1000 / 60 is not exact.
 */
export function secondsToSteps(seconds: number): number {
  return Math.round(seconds * STEPS_PER_SECOND);
}
/** Whole seconds left to show for a number of steps left (rounded up, never below 0). */
export function stepsToSeconds(steps: number): number {
  return Math.max(0, Math.ceil(steps / STEPS_PER_SECOND));
}
