import { placeController } from './private-placement';
// The conformance kit (PLAT-030 to PLAT-033, PLAT-025): what every game must pass before it
// is put in front of the console. A game's own test file calls it:
//
//   import * as fs from 'node:fs';
//   it('passes the conformance kit', () => {
//     assertConformance(myGame, scenarios, { sources: readSources(fs, rulesFolder) });
//   });
//
// The kit plays each scenario through a real, reused sim-core input buffer, looking at every
// view at every step, then replays what it recorded in several ways: from the recording, from
// a saved copy, from another seed, from a reloaded state, with every tap one step late, and
// with players joining, dropping and leaving down to the fewest the game allows.
// `runConformance` returns a report; `assertConformance` throws an Error holding the report
// when anything failed. The list of checks is `CONFORMANCE_CHECKS`. Nothing here imports a
// test runner.
import {
  cloneState,
  createInputBuffer,
  createRecorder,
  createRng,
  decodeRecording,
  decodeState,
  deepFreeze,
  encodeRecording,
  encodeState,
  forkRng,
  hashState,
  nextChance,
  nextFloatBetween,
  nextInt,
  replay,
} from '@kaki/sim-core';
import type { InputBuffer, RngState, SampledInput } from '@kaki/sim-core';
import { acceptedActions, applyMembership, driveStep, stepChecked } from './drive';
import type { Tick } from './drive';
import { charCount, findSecret, firstDifference, jsonEqual, jsonProblem } from './json';
import {
  PAD_BUTTON_BIT,
  checkLayout,
  checkPhoneFit,
  checkPrivateView,
  layoutFor,
  privateViewFor,
  rejectAction,
  tapSignature,
} from './layout';
import type { ControllerLayout, LayoutControl, PrivateView } from './layout';
import { scanSources } from './purity';
import type { PurityOptions, SourceFile } from './purity';
import { checkSettingsSchema, mergeSettings, settingsSchema, validateSettings } from './settings';
import type { AnySettingField } from './settings';
import { AXIS, AXIS_COUNT, BUTTON, SEAT_COLOURS, STEP_MS, stepModeOf, teamsInUse } from './types';
import type {
  ButtonName,
  GameModule,
  GameOf,
  InitContext,
  JsonValue,
  PlayerAction,
  PlayerId,
  PlayerInfo,
  Results,
  Secret,
  TeamId,
} from './types';
/** D-132: conformance and the phone engine call the same pure placement. */
export function checkPrivatePhoneFit(layout: ControllerLayout, view: PrivateView | null, area = { width:667,height:307 }, viewport = { width:area.width,height:area.height+68 }): string[] {
  for (const leader of [false,true]) {
    if (!placeController(layout,view,area,leader,{},viewport).fits) return [`D-132: layout plus private view cannot fit a ${String(area.width)} × ${String(area.height)} play area with control floors, 13 px wrapped text and 55 px private cards (${leader ? 'leader' : 'non-leader'})`];
  }
  return [];
}
export const CONFORMANCE_CHECKS = [
  ['meta', 'Picker details are complete and consistent'],
  ['settings', 'The settings schema is sound and its defaults validate'],
  ['purity', 'The source has no clock, timer or unseeded randomness'],
  ['init', 'A match starts for every player count, with and without teams'],
  ['runs', 'init, step, hooks and views never throw'],
  ['determinism', 'The same seed, players, settings and inputs give the same state at every step'],
  ['seed', 'A different seed gives a different run'],
  ['replay', 'A saved recording replays to the same hashes (sim-core recorder)'],
  ['reload', 'State survives encodeState and decodeState mid-run and the run goes on identically'],
  ['clone', 'step(cloneState(s)) equals step(s)'],
  ['previous-state', 'A finished step is not changed by the next one (real, reused input buffer)'],
  ['sharing', 'Non-trivial returns-new steps share objects with their input'],
  ['private-revision', 'Private view revisions change whenever their content changes'],
  ['state-contract', 'step treats its state and inputs as its stepMode promises'],
  ['views-json', 'Views are plain JSON within the byte caps'],
  ['views-pure', 'Views are pure: equal when called twice, and the state is untouched'],
  [
    'layout',
    'Layouts fit a phone at the decided sizes; a revision changes ' +
      'exactly when the taps on offer do',
  ],
  ['repeat-taps', 'A tap the next layout would refuse does nothing if it arrives in the same step'],
  [
    'late-taps',
    'A tap that arrives one step late is not dropped while the taps on ' + 'offer are unchanged',
  ],
  ['secrets', 'No secret reaches the TV or another phone, plainly or in disguise'],
  ['join-leave', 'Joining, dropping and leaving mid-match never throws and never changes a score'],
  [
    'min-players',
    'A whole match is played at the fewest and the most players; ' +
      'leaving never throws, even to nobody',
  ],
  ['pause', 'A pause changes nothing'],
  ['results', 'Results and saved data are complete and well ordered'],
  ['assets', 'Nothing loads during play'],
] as const;
export type CheckId = (typeof CONFORMANCE_CHECKS)[number][0];
/** The kit runs each scenario for at least this many steps (33 seconds of play). */
export const MIN_STEPS = 2000;
const MAX_LISTED = 5;
const PAUSE_LENGTH = 30;
const SEQ_MODULUS = 65536;
// Available in supported browsers and the Node test runner; no DOM types in this package.
declare const performance: {
  now(): number;
};
/** What one phone is holding. It stays as it is until a later tick changes it. */
export interface PadState {
  readonly buttons?: readonly ButtonName[];
  readonly stick?: readonly [number, number];
  readonly tilt?: readonly [number, number];
}
export interface ScenarioTap {
  readonly player: PlayerId;
  readonly control: string;
  readonly value?: string | number;
  /** Filled in from the phone's current layout when left out. */
  readonly revision?: number;
}
/** What a script wants to happen in one step. Leave out whatever does not change. */
export interface ScenarioTick {
  readonly pads?: Readonly<Record<PlayerId, PadState>>;
  readonly actions?: readonly ScenarioTap[];
  /** How many new players join at this step. The kit seats them and, with teams, places them. */
  readonly join?: number;
  readonly leave?: readonly PlayerId[];
  readonly leader?: PlayerId;
  /** Players whose phone is away during this step. They send nothing. */
  readonly disconnected?: readonly PlayerId[];
}
/** What a script may look at: exactly what the people in the room could. */
export interface ScriptContext {
  readonly step: number;
  readonly players: readonly PlayerInfo[];
  readonly leader: PlayerId | null;
  readonly over: boolean;
  readonly publicView: unknown;
  /** The player's layout as their phone has it (only the parts they are the audience of). */
  readonly layout: (player: PlayerId) => ControllerLayout;
  readonly privateView: (player: PlayerId) => PrivateView | null;
  /** Seeded randomness for the script. Same scenario, same draws. */
  readonly rng: RngState;
}
/** Must be a pure function of its context: the kit relies on a scenario being repeatable. */
export type Script = (context: ScriptContext) => ScenarioTick | undefined;
export interface Scenario<Settings extends object = Record<string, never>> {
  readonly name: string;
  /** Players at the start. The scenarios must include the game's fewest and its most. */
  readonly players: number;
  /** Play in teams. Default: only when the game requires teams. */
  readonly teams?: boolean;
  readonly seed?: number;
  /** Laid over the schema's defaults. */
  readonly settings?: Partial<Settings>;
  /** Default and minimum 2,000. */
  readonly steps?: number;
  /** Default: `fuzzScript()`, which moves sticks, presses buttons and taps whatever is offered. */
  readonly script?: Script;
  /** The parsed `data` assets `preload` names, by key. */
  readonly data?: Readonly<Record<string, JsonValue>>;
  readonly saved?: JsonValue;
}
export interface ConformanceOptions extends PurityOptions {
  /** Negative-fixture fast exit after 60 probe steps. Unreached checks stay not-run. */
  readonly stopOnFailure?: readonly CheckId[];
  /** The game's rules source, from `readSources(fs, folder)`. */
  readonly sources: readonly SourceFile[];
  /** `data` assets for the start-up check, and for scenarios that give none. */
  readonly data?: Readonly<Record<string, JsonValue>>;
}
export interface CheckResult {
  readonly id: CheckId;
  readonly title: string;
  /** `not-run`: nothing got far enough to apply it, usually because an earlier check stopped the scenario. */
  readonly status: 'pass' | 'fail' | 'not-run' | 'not-applicable';
  /** How many times the check was applied. */
  readonly applied: number;
  /** The first few kinds of failure, each saying where. */
  readonly failures: readonly string[];
  /** All failures, including those not listed. */
  readonly failureCount: number;
}
export interface ScenarioSummary {
  readonly name: string;
  readonly players: number;
  readonly teams: boolean;
  readonly steps: number;
  readonly membershipReplay?: { readonly steps: number; readonly overAtStep: number };
  /** The step at which `isOver` first held, or -1. */
  readonly overAtStep: number;
  /** False when a failure stopped the scenario before its last step. */
  readonly complete: boolean;
  readonly finalHash: string;
  /** Only the game step, excluding kit inspection; milliseconds. Allocations are not measurable portably. */
  readonly stepTime: {
    readonly mean: number;
    readonly worst: number;
    readonly p95: number;
  };
}
export interface ConformanceReport {
  readonly game: string;
  readonly stepMode: string;
  readonly ok: boolean;
  readonly checks: readonly CheckResult[];
  readonly scenarios: readonly ScenarioSummary[];
}
// ---------------------------------------------------------------------------------------------
class Ledger {
  private readonly inapplicable = new Set<CheckId>();
  notApplicable(check: CheckId): void { this.inapplicable.add(check); }
  private readonly applied = new Map<CheckId, number>();
  private readonly failures = new Map<CheckId, string[]>();
  private readonly counts = new Map<CheckId, number>();
  private readonly kinds = new Map<CheckId, Set<string>>();
  ran(check: CheckId): void {
    this.applied.set(check, (this.applied.get(check) ?? 0) + 1);
  }
  fail(check: CheckId, where: string, message: string): void {
    this.ran(check);
    this.counts.set(check, (this.counts.get(check) ?? 0) + 1);
    const list = this.failures.get(check) ?? [];
    this.failures.set(check, list);
    // List each KIND of failure once (the same sentence with other numbers is the same kind),
    // so that a fault repeated at every step does not hide a second, different fault.
    const kind = message.replace(/\d+/g, '0');
    const kinds = this.kinds.get(check) ?? new Set<string>();
    this.kinds.set(check, kinds);
    if (kinds.has(kind)) return;
    kinds.add(kind);
    if (list.length < MAX_LISTED) list.push(where === '' ? message : `${where}: ${message}`);
  }
  failed(check: CheckId): boolean {
    return (this.counts.get(check) ?? 0) > 0;
  }
  results(): CheckResult[] {
    return CONFORMANCE_CHECKS.map(([id, title]) => {
      const applied = this.applied.get(id) ?? 0;
      const failures = [...(this.failures.get(id) ?? [])];
      const failureCount = this.counts.get(id) ?? 0;
      const status = failureCount > 0 ? 'fail' : applied === 0 ? (this.inapplicable.has(id) ? 'not-applicable' : 'not-run') : 'pass';
      return { id, title, status, applied, failures, failureCount };
    });
  }
}
function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
/** Did this error come from writing to something `deepFreeze` froze? */
function isFrozenWrite(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    new RegExp(
      'read only|read-only|not extensible|Cannot ' +
        '(?:assign|add|delete|define|redefine)|is frozen|object is not ' +
        'extensible|Attempted to assign',
      'i',
    ).test(error.message)
  );
}
function makePlayer(seat: number, team: TeamId | undefined): PlayerInfo {
  const base = {
    id: `p${String(seat)}`,
    seat,
    name: `Player ${String(seat)}`,
    colour: SEAT_COLOURS[seat - 1] ?? 'seat-1',
  };
  return Object.freeze(team === undefined ? base : { ...base, team });
}
/** `count` players in seats 1 upwards; with teams, odd seats in team 0 and even seats in team 1. */
export function makePlayers(count: number, teams: boolean): PlayerInfo[] {
  const players: PlayerInfo[] = [];
  for (let seat = 1; seat <= count; seat += 1)
    players.push(makePlayer(seat, teams ? (((seat - 1) % 2) as TeamId) : undefined));
  return players;
}
function padMask(pad: PadState | undefined): number {
  let mask = 0;
  for (const name of pad?.buttons ?? []) mask |= 1 << BUTTON[name];
  return mask >>> 0;
}
function padAxes(pad: PadState | undefined, out: number[]): number[] {
  out[AXIS.STICK_X] = pad?.stick?.[0] ?? 0;
  out[AXIS.STICK_Y] = pad?.stick?.[1] ?? 0;
  out[AXIS.TILT_X] = pad?.tilt?.[0] ?? 0;
  out[AXIS.TILT_Y] = pad?.tilt?.[1] ?? 0;
  return out;
}
const DPAD: readonly ButtonName[] = ['DPAD_UP', 'DPAD_DOWN', 'DPAD_LEFT', 'DPAD_RIGHT'];
const BUTTON_NAME_OF_BIT = new Map<number, ButtonName>(
  (Object.keys(BUTTON) as ButtonName[]).map((name) => [BUTTON[name], name]),
);
/** Every tap a layout offers right now: each enabled option, cell, card and swipe direction. */
export function tapsOffered(controls: readonly LayoutControl[]): {
  control: string;
  value: string | number;
}[] {
  const taps: {
    control: string;
    value: string | number;
  }[] = [];
  for (const control of controls) {
    if (control.kind === 'options') {
      for (const option of control.options)
        if (option.state !== 'disabled') taps.push({ control: control.id, value: option.id });
    } else if (control.kind === 'grid') {
      control.cells.forEach((cell, index) => {
        if (cell.state !== 'disabled') taps.push({ control: control.id, value: index });
      });
    } else if (control.kind === 'cards' && control.tappable === true) {
      for (const card of control.cards)
        if (card.state !== 'disabled') taps.push({ control: control.id, value: card.id });
    } else if (control.kind === 'swipe') {
      for (const direction of ['up', 'down', 'left', 'right'])
        taps.push({ control: control.id, value: direction });
    }
  }
  return taps;
}
export interface FuzzOptions {
  /** Chance per player per step of a tap on something tappable. Default 0.05. */
  readonly tapChance?: number;
  /** Chance that a tapping player taps two or three things in that one step. Default 0.3. */
  readonly burstChance?: number;
  /** Chance per player per step that what they hold changes. Default 0.1. */
  readonly padChance?: number;
  /** Chance per player per step of a tap that the host must drop (stale or made up). Default 0.01. */
  readonly junkChance?: number;
}
/**
 * A script that behaves like a room of restless players: sticks wander, buttons in the layout
 * are pressed and let go, and anything tappable gets tapped, sometimes two or three taps from
 * one player in a single step, all from the scenario's seed.
 */
export function fuzzScript(options: FuzzOptions = {}): Script {
  const tapChance = options.tapChance ?? 0.05;
  const burstChance = options.burstChance ?? 0.3;
  const padChance = options.padChance ?? 0.1;
  const junkChance = options.junkChance ?? 0.01;
  return ({ players, layout, rng }) => {
    const pads: Record<PlayerId, PadState> = {};
    const actions: ScenarioTap[] = [];
    for (const player of players) {
      const controls = layout(player.id).controls;
      if (nextChance(rng, padChance)) {
        const buttons: ButtonName[] = [];
        let stick: [number, number] = [0, 0];
        let tilt: [number, number] = [0, 0];
        for (const control of controls) {
          if (control.kind === 'button' && nextChance(rng, 0.3)) {
            const name = BUTTON_NAME_OF_BIT.get(PAD_BUTTON_BIT[control.button]);
            if (name !== undefined) buttons.push(name);
          } else if (control.kind === 'dpad' && nextChance(rng, 0.5)) {
            buttons.push(DPAD[nextInt(rng, 0, 3)] ?? 'DPAD_UP');
          } else if (control.kind === 'stick' && nextChance(rng, 0.8)) {
            stick = [nextFloatBetween(rng, -1, 1), nextFloatBetween(rng, -1, 1)];
          } else if (control.kind === 'tilt') {
            tilt = [nextFloatBetween(rng, -1, 1), nextFloatBetween(rng, -1, 1)];
          }
        }
        pads[player.id] = { buttons, stick, tilt };
      }
      if (nextChance(rng, tapChance)) {
        const taps = tapsOffered(controls);
        const count = taps.length === 0 ? 0 : nextChance(rng, burstChance) ? nextInt(rng, 2, 3) : 1;
        for (let i = 0; i < count; i += 1) {
          const tap = taps[nextInt(rng, 0, taps.length - 1)];
          if (tap !== undefined) actions.push({ player: player.id, ...tap });
        }
      }
      if (nextChance(rng, junkChance)) {
        const first = controls[0];
        if (nextChance(rng, 0.5) || first === undefined)
          actions.push({ player: player.id, control: 'no-such-control', value: 0 });
        else
          actions.push({
            player: player.id,
            control: first.id,
            value: 0,
            revision: layout(player.id).revision + 1,
          });
      }
    }
    return { pads, actions };
  };
}
/** What `results` must look like for these players. Returns problems, one line each. */
export function checkResults(results: unknown, players: readonly PlayerInfo[]): string[] {
  const notJson = jsonProblem(results, 'results');
  if (notJson !== null) return [notJson];
  const problems: string[] = [];
  const loose = results as {
    players?: unknown;
  } | null;
  if (loose === null || typeof loose !== 'object' || !Array.isArray(loose.players))
    return ['results must be an object with a players list'];
  const value = results as Results;
  const teams = teamsInUse(players) || (players.length === 0 && value.mode === 'teams');
  if (!['players', 'teams', 'coop'].includes(value.mode))
    return [`results.mode is ${JSON.stringify(value.mode)}; it must be players, teams or coop`];
  if (value.mode === 'teams' && !teams)
    problems.push('results.mode is teams, but the match is not played in teams');
  if (value.mode === 'players' && teams)
    problems.push(
      'the match is played in teams, so results.mode must be teams (or coop), not players',
    );
  if (Object.hasOwn(value, 'save'))
    problems.push('results.save is not read: return what the host should keep from save(state)');
  const ranked = (
    kind: string,
    rows: readonly {
      place: number;
      score: number;
    }[],
    label: (index: number) => string,
  ): void => {
    rows.forEach((row, index) => {
      if (typeof row.score !== 'number' || !Number.isFinite(row.score))
        problems.push(`${label(index)} has no score`);
      if (!Number.isInteger(row.place) || row.place < 1)
        problems.push(
          label(index) +
            ' has place ' +
            JSON.stringify(row.place) +
            '; places are whole numbers from 1',
        );
      if (value.mode === 'coop' && kind === 'players') {
        if (row.place !== 1)
          problems.push(
            `${label(index)} has place ${String(row.place)}; in coop every player has place 1`,
          );
        if (typeof value.score === 'number' && row.score !== value.score) {
          problems.push(
            label(index) +
              ' has score ' +
              String(row.score) +
              "; in coop every player's score is the shared score, " +
              String(value.score),
          );
        }
        return;
      }
      const before = rows[index - 1];
      if (before === undefined) {
        if (row.place !== 1)
          problems.push(
            label(index) +
              ' is listed first with place ' +
              String(row.place) +
              '; the best place is 1',
          );
      } else if (row.score === before.score) {
        if (row.place !== before.place) {
          problems.push(
            label(index) +
              ' has the same score as the row above but place ' +
              String(row.place) +
              ', not ' +
              String(before.place) +
              ': equal scores share a place',
          );
        }
      } else if (row.place === before.place) {
        problems.push(
          label(index) +
            ' shares place ' +
            String(row.place) +
            ' with the row above but has a different score',
        );
      } else if (row.place !== index + 1) {
        problems.push(
          label(index) +
            ' has place ' +
            String(row.place) +
            '; after ' +
            String(index) +
            ' better rows it must be ' +
            String(index + 1) +
            ' (or share the place above)',
        );
      } else if (row.score > before.score) {
        problems.push(`${label(index)} is placed below the row above but has a higher score`);
      }
    });
  };
  const seen = new Set<string>();
  for (const row of value.players) {
    if (typeof row.joinedMidGame !== 'boolean')
      problems.push(`player ${row.id} needs joinedMidGame`);
    if (seen.has(row.id)) problems.push(`player ${row.id} is listed twice`);
    seen.add(row.id);
    if (!players.some((player) => player.id === row.id))
      problems.push(`player ${row.id} is listed but is not in the match`);
  }
  for (const player of players) {
    if (!seen.has(player.id))
      problems.push(`player ${player.id} is in the match but missing from the results`);
  }
  ranked('players', value.players, (index) => `player ${value.players[index]?.id ?? '?'}`);
  if (teams) {
    const rows = value.teams;
    if (
      rows?.length !== 2 ||
      !rows.some((row) => row.team === 0) ||
      !rows.some((row) => row.team === 1)
    ) {
      problems.push(
        'the match is played in teams, so results.teams must list team 0 ' +
          'and team 1, once each',
      );
    } else ranked('teams', rows, (index) => `team ${String(rows[index]?.team)}`);
  } else if (value.teams !== undefined)
    problems.push('results.teams is present, but the match is not played in teams');
  if (value.mode === 'coop' && (typeof value.score !== 'number' || !Number.isFinite(value.score)))
    problems.push('in coop, results.score must be the shared score');
  if (value.mode !== 'coop' && value.score !== undefined)
    problems.push('results.score is only for coop');
  return problems;
}
function scoresOf(results: Results): Map<PlayerId, number> {
  return new Map(results.players.map((row) => [row.id, row.score]));
}
/** The path at which `state` holds one of the host's borrowed objects, or null. */
function findBorrowed(
  value: unknown,
  borrowed: ReadonlySet<object>,
  path: string,
  seen: Set<object>,
): string | null {
  if (value === null || typeof value !== 'object') return null;
  if (borrowed.has(value)) return path;
  if (seen.has(value) || ArrayBuffer.isView(value)) return null;
  seen.add(value);
  if (value instanceof Map) {
    for (const [key, entry] of value as Map<unknown, unknown>) {
      const found =
        findBorrowed(key, borrowed, `${path}<key>`, seen) ??
        findBorrowed(entry, borrowed, `${path}<${String(key)}>`, seen);
      if (found !== null) return found;
    }
    return null;
  }
  if (value instanceof Set) {
    for (const entry of value as Set<unknown>) {
      const found = findBorrowed(entry, borrowed, `${path}<entry>`, seen);
      if (found !== null) return found;
    }
    return null;
  }
  for (const [key, entry] of Object.entries(value)) {
    const found = findBorrowed(
      entry,
      borrowed,
      Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`,
      seen,
    );
    if (found !== null) return found;
  }
  return null;
}
// ---------------------------------------------------------------------------------------------
interface Views {
  readonly publicView: unknown;
  readonly layouts: Map<PlayerId, ControllerLayout>;
  readonly privates: Map<PlayerId, PrivateView | null>;
  readonly ok: boolean;
}
interface Played {
  readonly summary: ScenarioSummary;
  readonly seed: number;
  readonly players: readonly PlayerInfo[];
  readonly settings: object;
  readonly context: InitContext;
  readonly recording: ReturnType<typeof createRecorder<unknown, Tick>>['recording'];
  /** Encoded states captured mid-run, with the number of steps taken before each. */
  readonly snapshots: readonly {
    after: number;
    text: string;
  }[];
  readonly complete: boolean;
}
interface RepeatTap<State> {
  readonly before: State;
  readonly inputs: Tick;
  readonly first: PlayerAction;
}
class Kit<State> {
  readonly ledger = new Ledger();
  private readonly frozen: boolean;
  /** True once any state of any scenario declared a secret. */
  private sawSecrets = false;
  private readonly layoutChecks = new Map<string, readonly string[]>();
  constructor(
    private readonly module: GameOf<State>,
    private readonly options: ConformanceOptions,
  ) {
    this.frozen = stepModeOf(module) === 'returns-new';
  }
  private freeze<T>(value: T): T {
    return this.frozen ? deepFreeze(value) : value;
  }
  // -- static checks ---------------------------------------------------------------------------
  meta(): void {
    const { ledger } = this;
    const meta = this.module.meta;
    ledger.ran('meta');
    const bad = (message: string): void => {
      ledger.fail('meta', 'meta', message);
    };
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(meta.id))
      bad(`id ${JSON.stringify(meta.id)} must be lower-case letters, digits and hyphens`);
    if (typeof meta.name !== 'string' || meta.name.trim() === '') bad('name is empty');
    if (typeof meta.blurb !== 'string' || meta.blurb.trim() === '' || charCount(meta.blurb) > 89)
      bad('blurb must be one line of 1 to 89 characters');
    const { min, max } = meta.players;
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 8 || min > max)
      bad(`players ${String(min)} to ${String(max)} must lie within 1 to 8`);
    if (!['none', 'optional', 'required'].includes(meta.teams))
      bad(`teams is ${JSON.stringify(meta.teams)}; it must be none, optional or required`);
    if (meta.teams !== 'none' && max < 2) bad('a game with teams needs room for two players');
    if (meta.solo !== (min === 1))
      bad(
        'solo is ' +
          String(meta.solo) +
          ' but the fewest players is ' +
          String(min) +
          '; solo must be true exactly when one player can play',
      );
    if (typeof meta.coop !== 'boolean') bad('coop must be true or false');
    if (this.module.tinyStateReason?.trim() === '') {
      bad('tinyStateReason must explain why the state is genuinely tiny');
    }
    const mode: unknown = this.module.stepMode;
    if (mode !== undefined && mode !== 'returns-new' && mode !== 'in-place')
      bad(`stepMode is ${JSON.stringify(mode)}; it must be returns-new or in-place`);
  }
  private teamVariants(): boolean[] {
    const teams = this.module.meta.teams;
    return teams === 'none' ? [false] : teams === 'required' ? [true] : [false, true];
  }
  /** What a game knows before a match: the data `preload(null)` names, what was saved, teams. */
  private setupContext(
    where: string,
    data: Readonly<Record<string, JsonValue>> | undefined,
    saved: JsonValue | undefined,
    teams: boolean,
  ): InitContext | null {
    const { ledger, module } = this;
    const given = data ?? this.options.data ?? {};
    try {
      for (const asset of module.preload?.(null) ?? []) {
        ledger.ran('assets');
        if (asset.kind !== 'data')
          ledger.fail(
            'assets',
            where,
            'preload names "' +
              asset.key +
              '" of kind ' +
              asset.kind +
              '; only data is loaded before a match',
          );
        else if (!Object.hasOwn(given, asset.key)) {
          ledger.fail(
            'assets',
            where,
            'preload(null) names "' +
              asset.key +
              ('" but the kit was given no such data: pass the parsed file in ' + 'data'),
          );
          return null;
        }
      }
    } catch (error) {
      ledger.fail('runs', where, `preload(null) threw ${describeError(error)}`);
      return null;
    }
    // Frozen, so a game that keeps what it was handed instead of copying it finds out at once.
    return deepFreeze(cloneState({ data: given, saved: saved ?? null, teams }));
  }
  settings(): void {
    const { ledger, module } = this;
    for (const teams of this.teamVariants()) {
      const where = teams ? 'with teams on' : '';
      ledger.ran('settings');
      const context = this.setupContext(`settings ${where}`, undefined, undefined, teams);
      if (context === null) {
        ledger.fail('settings', where, 'the settings could not be drawn (see "assets" or "runs")');
        continue;
      }
      try {
        const schema = settingsSchema(module, context);
        const problems = checkSettingsSchema(
          schema as {
            fields: readonly AnySettingField[];
          },
        );
        for (const problem of problems) ledger.fail('settings', where, problem);
        if (problems.length > 0) continue;
        const result = validateSettings(schema, mergeSettings(schema, {}));
        if (!result.ok)
          ledger.fail(
            'settings',
            where === '' ? 'defaults' : `defaults ${where}`,
            `do not validate: ${result.errors.join('; ')}`,
          );
      } catch (error) {
        ledger.fail(
          'settings',
          where,
          `building the settings schema threw ${describeError(error)}`,
        );
      }
    }
  }
  purity(): void {
    const { ledger } = this;
    if (this.options.sources.length === 0) {
      ledger.fail(
        'purity',
        '',
        'no source files were given: pass sources: readSources(fs, <the rules folder>)',
      );
      return;
    }
    ledger.ran('purity');
    for (const finding of scanSources(this.options.sources, this.options)) {
      ledger.fail('purity', `${finding.file}:${String(finding.line)}`, `uses ${finding.what}`);
    }
  }
  // -- views -----------------------------------------------------------------------------------
  /**
   * Calls every view for every player, twice, and applies every view check. `salt` varies the
   * scramble from step to step; 0 leaves the scramble out (only while the same paused state
   * is looked at again and again).
   */
  private inspect(
    state: State,
    players: readonly PlayerInfo[],
    where: string,
    salt: number,
    hashBefore: string,
  ): Views {
    const { ledger, module } = this;
    const layouts = new Map<PlayerId, ControllerLayout>();
    const privates = new Map<PlayerId, PrivateView | null>();
    let ok = true;
    const guard = <T>(what: string, call: () => T): T | undefined => {
      ledger.ran('runs');
      try {
        return call();
      } catch (error) {
        ok = false;
        if (isFrozenWrite(error))
          ledger.fail(
            'views-pure',
            where,
            `${what} tried to change the state: ${describeError(error)}`,
          );
        else ledger.fail('runs', where, `${what} threw ${describeError(error)}`);
        return undefined;
      }
    };
    const twice = <T>(what: string, call: () => T): T | undefined => {
      const first = guard(what, call);
      if (first === undefined) return undefined;
      ledger.ran('views-json');
      const problem = jsonProblem(first, what);
      if (problem !== null) {
        ok = false;
        ledger.fail('views-json', where, problem);
        return undefined;
      }
      const second = guard(what, call);
      ledger.ran('views-pure');
      if (second !== undefined && !jsonEqual(first, second)) {
        ledger.fail(
          'views-pure',
          where,
          what +
            (' gave two different answers for the same state; first difference ' + 'at ') +
            (firstDifference(first, second, what) ?? what),
        );
      }
      return first;
    };
    const publicView: unknown = twice('publicView', () => module.publicView(state));
    for (const player of players) {
      const who = `(${player.id})`;
      const layout = twice(`controllerLayout${who}`, () =>
        module.controllerLayout(state, player.id),
      );
      const view = twice(`privateView${who}`, () => module.privateView(state, player.id));
      if (layout === undefined || view === undefined) {
        ok = false;
        continue;
      }
      ledger.ran('layout');
      // Validation depends only on these already-checked JSON values, not on state or time.
      // Cache the result, never the views: secret checks still walk every view every step.
      const key = JSON.stringify([layout, view]);
      let problems = this.layoutChecks.get(key);
      if (problems === undefined) {
        const found = [...checkLayout(layout), ...checkPrivateView(view)];
        if (found.length === 0) found.push(...(view?.blocks.length ? checkPrivatePhoneFit(layout, view) : checkPhoneFit(layout, view)));
        if (this.layoutChecks.size >= 512) this.layoutChecks.clear();
        this.layoutChecks.set(key, found);
        problems = found;
      }
      for (const problem of problems) {
        const size = problem.includes('bytes; the most the protocol');
        ledger.fail(size ? 'views-json' : 'layout', `${where}, ${player.id}`, problem);
      }
      if (problems.some(problem => !problem.startsWith('D-132:'))) {
        ok = false;
        continue;
      }
      layouts.set(player.id, layout);
      privates.set(player.id, view);
    }
    const results = guard('results', () => module.results(state));
    const over: unknown = guard('isOver', () => module.isOver(state));
    if (results !== undefined) {
      ledger.ran('results');
      for (const problem of checkResults(results, players)) ledger.fail('results', where, problem);
    }
    if (typeof over !== 'boolean' && over !== undefined)
      ledger.fail('results', where, 'isOver must return true or false');
    if (module.save !== undefined) twice('save', () => module.save?.(state) ?? null);
    const secrets = guard('secrets', () => module.secrets(state));
    if (secrets !== undefined && ok) {
      ledger.ran('secrets');
      for (const secret of secrets) {
        const look = (view: unknown, name: string): void => {
          if (view === undefined) return;
          const found = findSecret(secret, view, name);
          if (found !== null)
            ledger.fail(
              'secrets',
              where,
              'the secret "' +
                secret.label +
                '" (owner ' +
                (secret.owner ?? 'nobody') +
                ') is visible at ' +
                found,
            );
        };
        look(publicView, 'publicView');
        look(results, 'results');
        for (const player of players) {
          if (player.id === secret.owner) continue;
          look(layouts.get(player.id), `controllerLayout(${player.id})`);
          look(privates.get(player.id), `privateView(${player.id})`);
        }
      }
      if (secrets.length > 0) {
        this.sawSecrets = true;
        if (salt > 0)
          this.scramble(state, players, where, salt, hashBefore, secrets, {
            publicView,
            layouts,
            privates,
            ok,
          });
      }
    }
    ledger.ran('views-pure');
    if (hashState(state) !== hashBefore) {
      ok = false;
      ledger.fail(
        'views-pure',
        where,
        'the state hash changed while only views, results, isOver, save, ' +
          'secrets and scrambleSecrets were being called',
      );
    }
    return { publicView, layouts, privates, ok };
  }
  /**
   * The disguised-leak check. For the TV and for each player in turn: change everything
   * hidden from that viewer, and require the viewer's views not to change at all.
   */
  private scramble(
    state: State,
    players: readonly PlayerInfo[],
    where: string,
    salt: number,
    hash: string,
    secrets: readonly Secret[],
    views: Views,
  ): void {
    const { ledger, module } = this;
    const scramble = module.scrambleSecrets?.bind(module);
    if (scramble === undefined) return;
    for (const viewer of [null, ...players.map((player) => player.id)]) {
      const hidden = secrets.filter((secret) => viewer === null || secret.owner !== viewer);
      if (hidden.length === 0) continue;
      const name = viewer ?? 'the TV';
      let other: State;
      let theirs: readonly Secret[];
      try {
        other = scramble(state, viewer, salt);
        theirs = module.secrets(other);
        if (hashState(other) === hash) {
          ledger.fail(
            'secrets',
            where,
            'scrambleSecrets for ' +
              name +
              ' returned the state unchanged although ' +
              String(hidden.length) +
              ' secrets are hidden from them: it must change every one',
          );
          continue;
        }
      } catch (error) {
        ledger.fail('runs', where, `scrambleSecrets for ${name} threw ${describeError(error)}`);
        continue;
      }
      for (const secret of hidden) {
        if (
          !theirs.some(
            (after) =>
              after.owner === secret.owner &&
              after.label === secret.label &&
              !jsonEqual(after.value, secret.value),
          )
        ) {
          ledger.fail(
            'secrets',
            where,
            'scrambleSecrets for ' +
              name +
              ' left the secret "' +
              secret.label +
              '" as it was: a leak of it could not be seen',
          );
        }
      }
      const compare = (what: string, mine: unknown, call: () => unknown): void => {
        let after: unknown;
        try {
          after = call();
        } catch (error) {
          ledger.fail(
            'runs',
            where,
            `${what} of the scrambled state threw ${describeError(error)}`,
          );
          return;
        }
        if (mine !== undefined && !jsonEqual(mine, after)) {
          ledger.fail(
            'secrets',
            where,
            what +
              ' changes when only things hidden from ' +
              name +
              ' change (scrambleSecrets); it depends on a secret at ' +
              (firstDifference(mine, after, what) ?? what) +
              ('. Stop declaring a secret once it can be worked out from the ' +
                'screen (for example three wrong options marked)'),
          );
        }
      };
      if (viewer === null) {
        compare('publicView', views.publicView, () => module.publicView(other));
        compare('results', module.results(state), () => module.results(other));
      } else {
        compare(`controllerLayout(${viewer})`, views.layouts.get(viewer), () =>
          module.controllerLayout(other, viewer),
        );
        compare(`privateView(${viewer})`, views.privates.get(viewer), () =>
          module.privateView(other, viewer),
        );
      }
    }
  }
  private checkAssets(state: State, where: string, known: Set<string> | null): Set<string> | null {
    const { ledger, module } = this;
    let manifest: unknown;
    try {
      manifest = module.assets(state);
    } catch (error) {
      ledger.fail('runs', where, `assets threw ${describeError(error)}`);
      return known;
    }
    ledger.ran('assets');
    const problem = jsonProblem(manifest, 'assets');
    if (problem !== null || !Array.isArray(manifest)) {
      ledger.fail('assets', where, problem ?? 'assets must return a list');
      return known;
    }
    const keys = new Set<string>();
    for (const entry of manifest as {
      key?: unknown;
      kind?: unknown;
    }[]) {
      if (
        typeof entry.key !== 'string' ||
        entry.key === '' ||
        !['data', 'image', 'atlas', 'audio', 'font'].includes(entry.kind as string)
      ) {
        ledger.fail(
          'assets',
          where,
          'asset ' +
            JSON.stringify(entry) +
            ' needs a key and a kind of data, image, atlas, audio or font',
        );
        continue;
      }
      if (keys.has(entry.key)) ledger.fail('assets', where, `asset "${entry.key}" is listed twice`);
      keys.add(entry.key);
      if (known !== null && !known.has(entry.key)) {
        ledger.fail(
          'assets',
          where,
          'asset "' +
            entry.key +
            ('" was not in the list given before the match started, so it would ' +
              'load during play'),
        );
      }
    }
    return known ?? keys;
  }
  // -- starting a match ------------------------------------------------------------------------
  private start(
    where: string,
    seed: number,
    players: readonly PlayerInfo[],
    changes: object,
    data: Readonly<Record<string, JsonValue>> | undefined,
    saved: JsonValue | undefined,
  ): {
    state: State;
    settings: object;
    context: InitContext;
  } | null {
    const { ledger, module } = this;
    const context = this.setupContext(where, data, saved, teamsInUse(players));
    if (context === null) return null;
    try {
      const schema = settingsSchema(module, context);
      const merged = validateSettings(schema, mergeSettings(schema, changes));
      if (!merged.ok) {
        ledger.fail(
          'settings',
          where,
          `the scenario's settings do not validate: ${merged.errors.join('; ')}`,
        );
        return null;
      }
      const settings = deepFreeze(cloneState(merged.settings as object));
      for (const asset of module.preload?.(settings) ?? []) {
        ledger.ran('assets');
        if (asset.kind !== 'data')
          ledger.fail(
            'assets',
            where,
            'preload names "' +
              asset.key +
              '" of kind ' +
              asset.kind +
              '; only data is loaded before a match',
          );
        else if (!Object.hasOwn(context.data, asset.key)) {
          ledger.fail(
            'assets',
            where,
            'preload names "' +
              asset.key +
              ('" but the scenario\'s data has no such key: give the kit the ' + 'parsed file'),
          );
          return null;
        }
      }
      const state = module.init(seed, deepFreeze(cloneState(players)), settings, context);
      hashState(state);
      return { state, settings, context };
    } catch (error) {
      ledger.fail('runs', where, `init threw ${describeError(error)}`);
      return null;
    }
  }
  private emptyTick(leader: PlayerId | null): Tick {
    return {
      frames: new Map(),
      actions: [],
      leader,
      disconnected: [],
      connected: new Map(),
      joined: [],
      departed: [],
    };
  }
  /** `init` for every player count, with and without teams; one look at every view; one step. */
  startUp(): void {
    const { ledger, module } = this;
    const { min, max } = module.meta.players;
    for (const teams of this.teamVariants()) {
      for (let count = teams ? Math.max(min, 2) : min; count <= max; count += 1) {
        const where =
          'init with ' +
          String(count) +
          ' player' +
          (count === 1 ? '' : 's') +
          (teams ? ' in teams' : '');
        ledger.ran('init');
        const players = makePlayers(count, teams);
        const started = this.start(where, 7 + count, players, {}, this.options.data, undefined);
        if (started === null) {
          ledger.fail(
            'init',
            where,
            'the match did not start (see "runs", "settings" or "assets")',
          );
          continue;
        }
        let state = started.state;
        try {
          const hash = hashState(state);
          const decoded = decodeState(JSON.parse(JSON.stringify(encodeState(state))));
          if (hashState(decoded) !== hash)
            ledger.fail(
              'init',
              where,
              'the first state does not survive encodeState and decodeState',
            );
          this.freeze(state);
          this.inspect(state, players, where, 1, hash);
          if (module.isOver(state))
            ledger.fail('init', where, 'isOver is already true before the first step');
          this.checkAssets(state, where, null);
          state = driveStep(module, state, this.emptyTick(players[0]?.id ?? null), STEP_MS);
          hashState(state);
        } catch (error) {
          if (this.frozen && isFrozenWrite(error)) {
            ledger.fail(
              'state-contract',
              where,
              'the state or the inputs were changed in place, which returns-new ' +
                'forbids (copy what you change): ' +
                describeError(error),
            );
          } else ledger.fail('init', where, `the first step threw ${describeError(error)}`);
        }
      }
    }
  }
  // -- the fewest players, and fewer still -----------------------------------------------------
  /**
   * On a copy of the state: everyone leaves, one at a time, in an order drawn from the seed
   * (so a team empties before the match does). `leave` must not throw even for the last
   * player or the last of a team, an unknown id is ignored, and the views, results, isOver
   * and save must still answer for whoever is left. Then the fewest players the game takes
   * join again and one step is taken, as the console would resume.
   */
  private emptyOut(
    state: State,
    hash: string,
    roster: readonly PlayerInfo[],
    teams: boolean,
    where: string,
    rng: RngState,
  ): void {
    const { ledger, module } = this;
    ledger.ran('min-players');
    try {
      let branch = this.freeze(cloneState(state));
      if (hashState(module.leave(branch, 'nobody-with-this-id')) !== hash) {
        ledger.fail(
          'min-players',
          where,
          'leave of an id that is not in the match changed the state; it must be ignored',
        );
      }
      branch = this.freeze(cloneState(state));
      const left: PlayerInfo[] = [...roster];
      while (left.length > 0) {
        const [gone] = left.splice(nextInt(rng, 0, left.length - 1), 1);
        if (gone === undefined) break;
        const what = `when ${gone.id} left, leaving ${String(left.length)}`;
        try {
          const scores = scoresOf(module.results(branch));
          branch = this.freeze(module.leave(branch, gone.id));
          for (const row of module.results(branch).players) {
            if (scores.get(row.id) !== row.score)
              ledger.fail(
                'min-players',
                where,
                `${row.id}'s score changed when ${gone.id} left; leave must not score`,
              );
          }
        } catch (error) {
          ledger.fail(
            'min-players',
            where,
            'leave threw ' +
              what +
              ': ' +
              describeError(error) +
              (' (leave must never throw; the console pauses a match that is ' +
                'short of players)'),
          );
          return;
        }
        try {
          module.publicView(branch);
          module.isOver(branch);
          module.save?.(branch);
          module.secrets(branch);
          for (const player of left) {
            module.controllerLayout(branch, player.id);
            module.privateView(branch, player.id);
          }
          for (const problem of checkResults(module.results(branch), left))
            ledger.fail('min-players', where, `${what}, ${problem}`);
        } catch (error) {
          ledger.fail(
            'min-players',
            where,
            'a view threw ' +
              what +
              ': ' +
              describeError(error) +
              ' (the console still shows the match while it waits for players)',
          );
          return;
        }
      }
      // The console resumes only once the match has its fewest players again, one in each team.
      const back = Math.max(module.meta.players.min, teams ? 2 : 1);
      const returned: PlayerInfo[] = [];
      for (let seat = 1; seat <= back; seat += 1) {
        const player = Object.freeze({
          ...makePlayer(seat, teams ? (((seat - 1) % 2) as TeamId) : undefined),
          id: roster.find((player) => player.seat === seat)?.id ?? `back${String(seat)}`,
        });
        returned.push(player);
        branch = this.freeze(module.join(branch, player));
      }
      branch = driveStep(module, branch, this.emptyTick(returned[0]?.id ?? null), STEP_MS);
      for (const problem of checkResults(module.results(branch), returned))
        ledger.fail(
          'min-players',
          where,
          `after everyone left and ${String(back)} joined, ${problem}`,
        );
    } catch (error) {
      ledger.fail(
        'min-players',
        where,
        `after everyone left, joining again and stepping threw ${describeError(error)}`,
      );
    }
  }
  // -- playing a scenario ----------------------------------------------------------------------
  /**
   * Plays a scenario. With `moving`, the same scenario is played with people joining, their
   * phones dropping and returning, and leaving one by one until only the game's fewest are
   * left, after which it plays on to the end.
   */
  play(scenario: Scenario<object>, index: number, moving: boolean): Played | null {
    const { ledger, module, frozen } = this;
    const steps = Math.max(scenario.steps ?? MIN_STEPS, MIN_STEPS);
    const teams = scenario.teams ?? module.meta.teams === 'required';
    const label = `scenario "${scenario.name}"${moving ? ' with players joining and leaving' : ''}`;
    const seed = scenario.seed ?? 1000 + index;
    const { min, max } = module.meta.players;
    if (!Number.isInteger(scenario.players) || scenario.players < min || scenario.players > max) {
      ledger.fail(
        'init',
        label,
        'asks for ' +
          String(scenario.players) +
          ' players; the game takes ' +
          String(min) +
          ' to ' +
          String(max),
      );
      return null;
    }
    if (teams && (module.meta.teams === 'none' || scenario.players < 2)) {
      ledger.fail(
        'init',
        label,
        'asks for teams, which need a game that has them and at least two players',
      );
      return null;
    }
    const firstPlayers = makePlayers(scenario.players, teams);
    const started = this.start(
      label,
      seed,
      firstPlayers,
      scenario.settings ?? {},
      scenario.data,
      scenario.saved,
    );
    if (started === null) return null;
    let state = started.state;
    let hash = hashState(state);
    this.freeze(state);
    const roster: PlayerInfo[] = [...firstPlayers];
    let leader: PlayerId | null = roster[0]?.id ?? null;
    const script = scenario.script ?? fuzzScript();
    const scriptRng = forkRng(createRng(seed), 'kit-script');
    const kitRng = forkRng(createRng(seed), moving ? 'kit-moving' : 'kit-events');
    const buffer: InputBuffer<PlayerId> = createInputBuffer<PlayerId>({
      axisCount: AXIS_COUNT,
      seqModulus: SEQ_MODULUS,
      staleAfterSteps: 15,
    });
    const pads = new Map<PlayerId, PadState>();
    const seqs = new Map<PlayerId, number>();
    for (const player of roster) buffer.add(player.id);
    const axes: number[] = [0, 0, 0, 0];
    const recorder = createRecorder<unknown, Tick>({ seed, stepMs: STEP_MS });
    const snapshots: {
      after: number;
      text: string;
    }[] = [];
    const snapshotAt = new Set([Math.floor(steps / 3), Math.floor((2 * steps) / 3)]);
    const pauseAt = new Set([
      nextInt(kitRng, 1, 90),
      nextInt(kitRng, 1, steps - 1),
      Math.floor(steps / 2),
    ]);
    const emptyAt = new Set([0, steps - 2, steps - 1]);
    for (let part = 0; part < 20; part += 1) {
      emptyAt.add(
        nextInt(
          kitRng,
          Math.floor((part * steps) / 20),
          Math.max(0, Math.floor(((part + 1) * steps) / 20) - 1),
        ),
      );
    }
    const phaseProbes = new Set<string>();
    const times: number[] = [];
    const checkedModule = {
      ...module,
      step: (input: State, inputs: Parameters<typeof module.step>[1], dt: number): State => {
        const began = performance.now();
        const result = module.step(input, inputs, dt);
        times.push(performance.now() - began);
        return result;
      },
    };

    const privateRevisions = new Map<PlayerId, { revision: number; content: unknown } | null>();
    const assetKeys = this.checkAssets(state, `${label}, before the first step`, null);
    const revisions = new Map<
      PlayerId,
      {
        revision: number;
        signature: string;
        tappable: boolean;
      }
    >();
    // Moving: the room fills and churns, then empties to the fewest players and plays on.
    const floor = Math.max(min, teams ? 2 : 1);
    const churnAt = new Set<number>([1, steps - 3]);
    for (let part = 0; part < 20; part += 1) {
      churnAt.add(
        nextInt(
          kitRng,
          Math.floor((part * steps) / 20),
          Math.max(1, Math.floor(((part + 1) * steps) / 20) - 2),
        ),
      );
    }
    const away = new Map<PlayerId, number>();
    let overAtStep = -1;
    let complete = true;
    let unshared = 0;
    let performed = 0;
    const limit = moving ? Math.max(steps, Math.min(steps * 4, 40000)) : steps;
    for (let t = 0; t < limit; t += 1) {
      if (t >= steps && overAtStep !== -1) break;
      performed = t + 1;
      const where = `${label}, step ${String(t)}`;
      // A pause: nothing is stepped; whatever `pause` hides must come back exactly.
      if (pauseAt.has(t)) {
        try {
          let paused = module.pause === undefined ? state : module.pause(state);
          const pausedHash = hashState(paused);
          this.freeze(paused);
          for (let i = 0; i < PAUSE_LENGTH; i += 1)
            this.inspect(paused, roster, `${where}, paused`, i === 0 ? 1 : 0, pausedHash);
          paused = module.resume === undefined ? paused : module.resume(paused);
          ledger.ran('pause');
          if (hashState(paused) !== hash)
            ledger.fail(
              'pause',
              where,
              'after pause, ' +
                String(PAUSE_LENGTH) +
                (' idle steps and resume, the state is not what it was before the ' + 'pause'),
            );
          else state = paused;
          this.freeze(state);
        } catch (error) {
          if (isFrozenWrite(error))
            ledger.fail(
              'state-contract',
              where,
              `pause or resume changed the state it was given: ${describeError(error)}`,
            );
          else ledger.fail('pause', where, `pause or resume threw ${describeError(error)}`);
        }
      }
      if (emptyAt.has(t)) this.emptyOut(state, hash, roster, teams, where, kitRng);
      // 1. Everything anyone can see, checked, at every step.
      const views = this.inspect(state, roster, where, 1 + (t % 3), hash);
      // Probe every newly exposed layout/phase, even if it lasts only one step.
      const phase = JSON.stringify([
        (
          views.publicView as {
            phase?: unknown;
          } | null
        )?.phase,
        [
          ...new Set(
            [...views.layouts.values()].map((layout) =>
              layout.controls.map((control) => `${control.kind}:${control.id}`).join(','),
            ),
          ),
        ].sort(),
      ]);
      if (!phaseProbes.has(phase)) {
        phaseProbes.add(phase);
        this.emptyOut(state, hash, roster, teams, where, kitRng);
      }
      if (!views.ok) {
        complete = false;
        break;
      }
      for (const player of roster) {
        const layout = views.layouts.get(player.id);
        if (layout === undefined) continue;
        const signature = tapSignature(layout);
        const privateView = views.privates.get(player.id) ?? null;
        // Store a detached signature: in-place games may reuse their private-view objects.
        const privateNow =
          privateView === null
            ? null
            : {
                revision: privateView.revision,
                content: JSON.parse(JSON.stringify(privateView.blocks)) as unknown,
              };
        const privateBefore = privateRevisions.get(player.id);
        ledger.notApplicable('private-revision');
        if (privateBefore !== null && privateBefore !== undefined && privateNow !== null) {
          ledger.ran('private-revision');
          const changed = !jsonEqual(privateBefore.content, privateNow.content);
          if (
            changed && privateBefore.revision === privateNow.revision
          ) {
            ledger.fail(
              'private-revision',
              where,
              `${player.id}: private revision must change when content changes`,
            );
          }
        }
        privateRevisions.set(player.id, privateNow);
        const before = revisions.get(player.id);
        if (before !== undefined) {
          const at = `${where}, ${player.id}`;
          if (layout.revision < before.revision)
            ledger.fail(
              'layout',
              at,
              `revision went down from ${String(before.revision)} to ${String(layout.revision)}`,
            );
          else if (layout.revision === before.revision && signature !== before.signature) {
            ledger.fail(
              'layout',
              at,
              'what can be tapped changed but revision stayed at ' +
                String(layout.revision) +
                ': a late tap could now mean something else',
            );
          } else if (
            layout.revision !== before.revision &&
            signature === before.signature &&
            before.tappable
          ) {
            ledger.fail(
              'layout',
              at,
              'revision went from ' +
                String(before.revision) +
                ' to ' +
                String(layout.revision) +
                ' although what ' +
                player.id +
                (' can tap did not change: a press already on its way is thrown ' +
                  'away for nothing (keep a revision per player and raise it only ' +
                  "when that player's taps change)"),
            );
          }
        }
        revisions.set(player.id, {
          revision: layout.revision,
          signature,
          tappable: tapsOffered(layout.controls).length > 0,
        });
      }
      if (t % 30 === 0) this.checkAssets(state, where, assetKeys);
      let over = false;
      try {
        over = module.isOver(state);
      } catch {
        // Reported by inspect.
      }
      if (over && overAtStep === -1) overAtStep = t;
      if (!over && overAtStep !== -1)
        ledger.fail(
          'results',
          where,
          `isOver was true at step ${String(overAtStep)} and is false again`,
        );
      // 2. What the room does this step.
      let wanted: ScenarioTick;
      try {
        wanted =
          script({
            step: t,
            players: roster,
            leader,
            over,
            publicView: views.publicView,
            layout: (id) =>
              layoutFor(views.layouts.get(id) ?? { revision: 0, controls: [] }, id === leader),
            privateView: (id) => privateViewFor(views.privates.get(id) ?? null, id === leader),
            rng: scriptRng,
          }) ?? {};
      } catch (error) {
        ledger.fail('runs', where, `the scenario's own script threw ${describeError(error)}`);
        complete = false;
        break;
      }
      const departed: PlayerId[] = [...(moving && t >= steps ? [] : wanted.leave ?? [])].filter((id) =>
        roster.some((player) => player.id === id),
      );
      let joins = moving && t >= steps ? 0 : wanted.join ?? 0;
      if (moving) {
        const leaver = (): PlayerInfo | undefined => {
          const candidates = roster.filter(
            (player) =>
              !departed.includes(player.id) &&
              (!teams || roster.filter((other) => other.team === player.team).length > 1),
          );
          return roster.length - departed.length > floor
            ? candidates[nextInt(kitRng, 0, Math.max(candidates.length - 1, 0))]
            : undefined;
        };
        let leaving: PlayerInfo | undefined;
        if (t === 0) {
          // Reach the minimum before playing, so even a very short match exercises it.
          const keep = teams
            ? [
                ...roster.filter((p) => p.team === 0).slice(0, 1),
                ...roster.filter((p) => p.team === 1).slice(0, 1),
              ]
            : roster.slice(0, floor);
          for (const player of roster) {
            if (keep.length >= floor) break;
            if (!keep.includes(player)) keep.push(player);
          }
          for (const player of roster)
            if (!keep.includes(player) && !departed.includes(player.id)) departed.push(player.id);
        } else if (churnAt.has(t)) {
          if (roster.length >= max) leaving = leaver();
          joins += 1;
        } else if ((churnAt.has(t - 1) || t >= steps - max - 1) && roster.length > floor) {
          leaving = leaver();
        }
        if (leaving !== undefined) departed.push(leaving.id);
        // Phones drop and come back; a returning phone is a new data channel (sim-core rule 3).
        for (const [id, until] of away) {
          if (until > t && roster.some((player) => player.id === id)) continue;
          away.delete(id);
          if (buffer.has(id)) buffer.reset(id);
        }
        if (nextChance(kitRng, 0.01)) {
          const dropped = roster[nextInt(kitRng, 0, Math.max(roster.length - 1, 0))];
          if (dropped !== undefined && !away.has(dropped.id))
            away.set(dropped.id, t + nextInt(kitRng, 5, 90));
        }
      }
      for (const id of departed) {
        roster.splice(
          roster.findIndex((player) => player.id === id),
          1,
        );
        buffer.remove(id);
        pads.delete(id);
        revisions.delete(id);
        away.delete(id);
      }
      const joined: PlayerInfo[] = [];
      for (let i = 0; i < joins && roster.length < max; i += 1) {
        let seat = 1;
        while (roster.some((player) => player.seat === seat)) seat += 1;
        const size = (team: TeamId): number =>
          roster.filter((player) => player.team === team).length;
        const player = makePlayer(seat, teams ? (size(0) <= size(1) ? 0 : 1) : undefined);
        // A returning seat number gets a fresh id, as a new phone would.
        const fresh = Object.freeze({ ...player, id: `${player.id}-s${String(t)}` });
        roster.push(fresh);
        roster.sort((a, b) => a.seat - b.seat);
        joined.push(fresh);
        buffer.add(fresh.id);
      }
      if (wanted.leader !== undefined && roster.some((player) => player.id === wanted.leader))
        leader = wanted.leader;
      if (leader === null || !roster.some((player) => player.id === leader))
        leader = roster[0]?.id ?? null;
      if (
        roster.length < floor ||
        (teams && (!roster.some((p) => p.team === 0) || !roster.some((p) => p.team === 1)))
      ) {
        ledger.fail(
          'min-players',
          where,
          'the scenario went below the supported minimum or emptied a team; ' +
            'the console pauses here and never steps this state',
        );
        complete = false;
        break;
      }
      if (
        !moving &&
        (scenario.players === min || scenario.players === max) &&
        roster.length !== scenario.players
      ) {
        ledger.fail(
          'min-players',
          where,
          'an endpoint scenario must play a whole match at its stated player ' +
            'count; use the separate join/leave replay for membership changes',
        );
      }
      const disconnected: PlayerId[] = roster
        .filter(
          (player) => away.has(player.id) || wanted.disconnected?.includes(player.id) === true,
        )
        .map((player) => player.id);
      for (const [id, pad] of Object.entries(wanted.pads ?? {})) {
        if (!buffer.has(id) || disconnected.includes(id)) continue;
        pads.set(id, pad);
        const seq = ((seqs.get(id) ?? -1) + 1) % SEQ_MODULUS;
        seqs.set(id, seq);
        buffer.receive(id, seq, padMask(pad), padAxes(pad, axes));
      }
      // A phone that is holding something keeps sending, so the buffer never thinks it stale.
      // One that has dropped sends nothing, and the buffer lets go for it after 15 steps.
      for (const [id, pad] of pads) {
        if (disconnected.includes(id)) {
          pads.delete(id);
          continue;
        }
        if (
          wanted.pads?.[id] !== undefined ||
          (padMask(pad) === 0 && pad.stick === undefined && pad.tilt === undefined)
        )
          continue;
        const seq = ((seqs.get(id) ?? -1) + 1) % SEQ_MODULUS;
        seqs.set(id, seq);
        buffer.receive(id, seq, padMask(pad), padAxes(pad, axes));
      }
      const actions: PlayerAction[] = (wanted.actions ?? [])
        .filter((action) => !disconnected.includes(action.player))
        .map((action) => ({
          player: action.player,
          control: action.control,
          ...(action.value === undefined ? {} : { value: action.value }),
          revision: action.revision ?? views.layouts.get(action.player)?.revision ?? 0,
        }));
      // 3. The host samples its buffer. The frames are the buffer's own, reused next step.
      const sampled = buffer.sample();
      const frames = new Map<PlayerId, SampledInput>();
      for (const player of roster) {
        const frame = sampled.get(player.id);
        if (frame !== undefined && !disconnected.includes(player.id)) frames.set(player.id, frame);
      }
      ledger.ran('previous-state');
      if (hashState(state) !== hash) {
        ledger.fail(
          'previous-state',
          where,
          'the state changed when the input buffer was sampled for the next ' +
            'step: it holds a sampled frame (copy it with copyFrame)',
        );
        complete = false;
        break;
      }
      const tick: Tick = {
        frames,
        actions,
        leader,
        disconnected,
        connected: new Map(roster.map((player) => [player.id, !disconnected.includes(player.id)])),
        joined,
        departed,
      };
      const tickHash = hashState(tick);
      // 4. The same step on a copy, for the clone check.
      let cloneHash: string;
      try {
        cloneHash = hashState(driveStep(module, cloneState(state), cloneState(tick), STEP_MS));
      } catch (error) {
        ledger.fail('runs', where, `step on a copy of the state threw ${describeError(error)}`);
        complete = false;
        break;
      }
      // 5. The real step: membership first, with every score watched.
      let next: State;
      let repeat: RepeatTap<State> | null = null;
      try {
        let current = state;
        if (joined.length > 0 || departed.length > 0) {
          const beforeResults = module.results(state);
          const before = scoresOf(beforeResults);
          current = applyMembership(module, state, tick);
          const currentHash = hashState(current);
          this.freeze(current);
          ledger.ran('join-leave');
          const afterResults = module.results(current);
          const after = scoresOf(afterResults);
          for (const problem of checkResults(afterResults, roster)) {
            ledger.fail('join-leave', where, problem);
          }
          if (beforeResults.mode === 'coop' && beforeResults.score !== afterResults.score) {
            ledger.fail('join-leave', where, 'joining or leaving changed the shared score');
          }
          const who = [...departed, ...joined.map((player) => player.id)].join(', ');
          for (const [id, score] of before) {
            if (!departed.includes(id) && after.get(id) !== score) {
              ledger.fail(
                'join-leave',
                where,
                id +
                  "'s score went from " +
                  String(score) +
                  ' to ' +
                  String(after.get(id)) +
                  ' when ' +
                  who +
                  ' joined or left: joining and leaving must not score',
              );
            }
          }
          for (const player of joined) {
            if (t > 0 && !afterResults.players.find((row) => row.id === player.id)?.joinedMidGame) {
              ledger.fail('join-leave', where, `${player.id} must be marked joinedMidGame`);
            }
            if (afterResults.mode !== 'coop' && after.get(player.id) !== 0)
              ledger.fail(
                'join-leave',
                where,
                player.id +
                  ' joined with a score of ' +
                  String(after.get(player.id)) +
                  '; a newcomer starts at 0',
              );
          }
          if (frozen && current === state && currentHash !== hash)
            ledger.fail('state-contract', where, 'join or leave changed the state in place');
        }
        // Keep a branch before an accepted tap; try refused taps from either control later.
        const through = actions.length === 0 ? actions : acceptedActions(module, current, tick);
        const first = through[nextInt(kitRng, 0, Math.max(through.length - 1, 0))];
        if (first !== undefined) {
          repeat = { before: cloneState(current), inputs: cloneState(tick), first };
        }
        next = stepChecked(checkedModule, current, tick, STEP_MS);
        if (frozen && module.tinyStateReason === undefined && through.length === 0 &&
            tick.joined.length === 0 && tick.departed.length === 0 && objectsIn(current).size >= 8) {
          ledger.ran('sharing');
          unshared = sharesObject(next, objectsIn(current)) ? 0 : unshared + 1;
          if (unshared >= 30) ledger.fail('sharing', where,
            '30 consecutive non-trivial steps copied every object; share unchanged parts');
        } else {
          unshared = 0;
          ledger.notApplicable('sharing');
        }
      } catch (error) {
        if (frozen && isFrozenWrite(error)) {
          ledger.fail(
            'state-contract',
            where,
            'the state or the inputs were changed in place, which returns-new ' +
              'forbids (copy what you change): ' +
              describeError(error),
          );
        } else ledger.fail('runs', where, `step threw ${describeError(error)}`);
        complete = false;
        break;
      }
      // 6. What the step did to things that were not its to change.
      ledger.ran('runs');
      ledger.ran('state-contract');
      if (hashState(tick) !== tickHash)
        ledger.fail('state-contract', where, 'the step changed its inputs');
      const borrowed = new Set<object>([
        tick,
        frames,
        actions,
        joined,
        departed,
        disconnected,
        ...actions,
      ]);
      for (const frame of frames.values()) borrowed.add(frame).add(frame.axes);
      const kept = findBorrowed(next, borrowed, 'state', new Set());
      if (kept !== null) {
        ledger.fail(
          'previous-state',
          where,
          kept +
            (" is one of the host's own input objects, which are reused next " +
              'step: copy it (copyFrame, or spread the action)'),
        );
        complete = false;
        break;
      }
      if (frozen) {
        ledger.ran('previous-state');
        if (hashState(state) !== hash) {
          ledger.fail(
            'previous-state',
            where,
            'the state given to the step was changed by it (a typed array, or ' +
              'something reached round the freeze)',
          );
        }
      }
      // 7. Record, compare with the copy, move on.
      try {
        recorder.record(tick, next);
      } catch (error) {
        ledger.fail(
          'runs',
          where,
          `the state after the step is not plain data: ${describeError(error)}`,
        );
        complete = false;
        break;
      }
      const nextHash = recorder.recording.hashes.at(-1) ?? '';
      ledger.ran('clone');
      if (cloneHash !== nextHash) {
        ledger.fail(
          'clone',
          where,
          'stepping a copy of the state gave a different result: the rules ' +
            'depend on object identity or on something outside the state',
        );
      }
      if (frozen && next === state && nextHash !== hash)
        ledger.fail('state-contract', where, 'the step returned the object it was given, changed');
      // 8. The repeat tap. If the layout AFTER this step would refuse it, then delivering it
      // at the end of this same step (which a host that did not filter would do) must change
      // nothing: a locked-out player cannot answer, and nobody scores twice.
      ledger.notApplicable('repeat-taps');
      if (repeat !== null && cloneHash === nextHash)
        this.repeatTap(repeat, next, nextHash, leader, where);
      state = next;
      hash = nextHash;
      this.freeze(state);
      if (t >= 60 && this.options.stopOnFailure?.some((check) => ledger.failed(check)) === true) {
        complete = false;
        break;
      }
      if (snapshotAt.has(t + 1))
        snapshots.push({ after: t + 1, text: JSON.stringify(encodeState(state)) });
    }
    if (complete) {
      const where = `${label}, at the end`;
      this.inspect(state, roster, where, 1, hash);
      this.checkAssets(state, where, assetKeys);
      try {
        if (module.isOver(state) && overAtStep === -1) overAtStep = performed;
      } catch {
        // Reported by inspect.
      }
      if (moving) {
        ledger.ran('min-players');
        if (overAtStep === -1)
          ledger.fail(
            'min-players',
            label,
            'the join/leave replay did not play on to the end at the minimum',
          );
        if (roster.length !== floor) {
          ledger.fail(
            'min-players',
            label,
            'the kit could not bring the match down to ' +
              String(floor) +
              ' players; ' +
              String(roster.length) +
              ' were left',
          );
        }
      }
    }
    return {
      summary: {
        name: scenario.name,
        players: scenario.players,
        teams,
        steps: performed,
        overAtStep,
        complete,
        finalHash: hash,
        stepTime: timing(times),
      },
      seed,
      players: firstPlayers,
      settings: started.settings,
      context: started.context,
      recording: recorder.recording,
      snapshots,
      complete,
    };
  }
  private repeatTap(
    repeat: RepeatTap<State>,
    next: State,
    nextHash: string,
    leader: PlayerId | null,
    where: string,
  ): void {
    const { ledger, module } = this;
    const { first } = repeat;
    try {
      const after = module.controllerLayout(next, first.player);
      const through = acceptedActions(module, repeat.before, repeat.inputs);
      const before = layoutFor(
        module.controllerLayout(repeat.before, first.player),
        first.player === leader,
      );
      const offered = tapsOffered(before.controls);
      for (const tap of offered) {
        const candidate = { ...first, ...tap, revision: after.revision };
        if (rejectAction(after, candidate, first.player === leader) === null) continue;
        ledger.ran('repeat-taps');
        const again = { ...candidate, revision: first.revision };
        const doubled = module.step(
          this.freeze(cloneState(repeat.before)),
          this.freeze({ ...repeat.inputs, actions: [...through, again] }),
          STEP_MS,
        );
        if (hashState(doubled) !== nextHash) {
          ledger.fail(
            'repeat-taps',
            where,
            first.player +
              ' tapped "' +
              first.control +
              '", then "' +
              again.control +
              '"; a second tap refused by the new layout changed the result',
          );
        }
      }
    } catch (error) {
      ledger.fail(
        'repeat-taps',
        where,
        `a second tap on "${first.control}" in the same step threw ${describeError(error)}`,
      );
    }
  }
  /** Everything that is checked by running the recorded ticks again. */
  rerun(played: Played, full: boolean): void {
    const { ledger, module, frozen } = this;
    const label = `scenario "${played.summary.name}"`;
    const init = (seed: number): State =>
      module.init(seed, deepFreeze(cloneState(played.players)), played.settings, played.context);
    const plain = (state: State, tick: Tick, dtMs: number): State =>
      driveStep(module, state, tick, dtMs);
    const strict = (state: State, tick: Tick, dtMs: number): State =>
      driveStep(module, frozen ? deepFreeze(state) : state, frozen ? deepFreeze(tick) : tick, dtMs);
    const recording = played.recording;
    ledger.ran('determinism');
    let last: State | null = null;
    try {
      const again = replay(recording, init, plain);
      last = again.state;
      if (!again.matches) {
        ledger.fail(
          'determinism',
          label,
          'a second run from the same seed and inputs first differs at step ' +
            String(again.firstMismatchStep - 1),
        );
      }
    } catch (error) {
      ledger.fail(
        'determinism',
        label,
        `a second run from the same seed and inputs threw ${describeError(error)}`,
      );
    }
    ledger.ran('replay');
    try {
      const saved = decodeRecording<Tick>(JSON.parse(JSON.stringify(encodeRecording(recording))));
      const again = replay(saved, init, strict);
      if (!again.matches)
        ledger.fail(
          'replay',
          label,
          'the recording, saved and loaded, first differs at step ' +
            String(again.firstMismatchStep - 1),
        );
    } catch (error) {
      ledger.fail('replay', label, `replaying the saved recording threw ${describeError(error)}`);
    }
    for (const snapshot of played.snapshots) {
      ledger.ran('reload');
      const where = `${label}, reloaded after step ${String(snapshot.after - 1)}`;
      try {
        let state = decodeState(JSON.parse(snapshot.text)) as State;
        if (hashState(state) !== recording.hashes[snapshot.after - 1]) {
          ledger.fail(
            'reload',
            where,
            'the state has a different hash after encodeState, JSON and decodeState',
          );
          continue;
        }
        for (let i = snapshot.after; i < recording.inputs.length; i += 1) {
          const tick = recording.inputs[i];
          if (tick === undefined) break;
          state = plain(state, tick, STEP_MS);
          if (hashState(state) !== recording.hashes[i]) {
            ledger.fail('reload', where, `the run went a different way from step ${String(i)}`);
            break;
          }
        }
      } catch (error) {
        ledger.fail('reload', where, `threw ${describeError(error)}`);
      }
    }
    if (!full) return;
    ledger.ran('seed');
    try {
      const other = replay({ ...recording, seed: played.seed + 1 }, init, plain);
      if (other.matches)
        ledger.fail(
          'seed',
          label,
          'seed ' +
            String(played.seed + 1) +
            ' gave exactly the same run as seed ' +
            String(played.seed) +
            ': the game ignores its seed',
        );
    } catch (error) {
      ledger.fail(
        'runs',
        label,
        'the same inputs with another seed threw ' +
          describeError(error) +
          ' (a step must cope with any input the host can deliver)',
      );
    }
    // What the game asks the host to keep must start the next match.
    if (module.save !== undefined && last !== null) {
      ledger.ran('results');
      try {
        const kept = module.save(last);
        const problem = jsonProblem(kept, 'save');
        if (problem !== null) ledger.fail('results', label, problem);
        else
          module.init(
            played.seed,
            deepFreeze(cloneState(played.players)),
            played.settings,
            deepFreeze(cloneState({ ...played.context, saved: kept })),
          );
      } catch (error) {
        ledger.fail(
          'results',
          label,
          'a new match given what save returned at the end of this one threw ' +
            describeError(error),
        );
      }
    }
    this.late(played, init);
  }
  /**
   * Every tap again, one step late, carrying the revision its phone had when it was made (a
   * slow link). Layout checks enforce stable transport revisions. Independently, once a
   * delayed tap is accepted, its numeric revision must not affect the game outcome.
   */
  private late(played: Played, init: (seed: number) => State): void {
    const { ledger, module } = this;
    const label = `scenario "${played.summary.name}", every tap one step late`;
    ledger.notApplicable('late-taps');
    interface Held {
      readonly action: PlayerAction;
    }
    let held: Held[] = [];
    let heldCount = 0;
    let acceptedCount = 0;
    try {
      let state = this.freeze(init(played.seed));
      const present = new Set(played.players.map((player) => player.id));
      played.recording.inputs.forEach((tick, t) => {
        for (const id of tick.departed) present.delete(id);
        for (const player of tick.joined) present.add(player.id);
        const current = this.freeze(applyMembership(module, state, tick));
        for (const id of present) {
          if (tapsOffered(module.controllerLayout(current, id).controls).length > 0)
            ledger.ran('late-taps');
        }
        const delivered: PlayerAction[] = [];
        for (const { action } of held) {
          if (!present.has(action.player)) continue;
          delivered.push(action);
        }
        // The taps made now: valid against this run's own layouts, to arrive next step.
        held = [];
        for (const made of tick.actions) {
          if (!present.has(made.player)) continue;
          const layout = module.controllerLayout(current, made.player);
          const action = { ...made, revision: layout.revision };
          if (rejectAction(layout, action, made.player === tick.leader) === null)
            held.push({ action });
        }
        heldCount += held.length;
        const accepted = acceptedActions(module, current, { ...tick, actions: delivered });
        acceptedCount += accepted.length;
        if (accepted.length > 0) ledger.ran('late-taps');
        const normalized = accepted.map((action) => ({ ...action, revision: 0 }));
        const independent =
          accepted.length > 0
            ? hashState(
                module.step(
                  this.freeze(cloneState(current)),
                  this.freeze({ ...tick, actions: normalized }),
                  STEP_MS,
                ),
              )
            : null;
        const next = stepChecked(module, current, { ...tick, actions: delivered }, STEP_MS);
        if (independent !== null && independent !== hashState(next)) {
          ledger.fail(
            'late-taps',
            `${label}, step ${String(t)}`,
            'accepted delayed taps depend on revision metadata; rules must use ' +
              'their control and value',
          );
        }
        state = this.freeze(next);
      });
      if (heldCount > 0 && acceptedCount === 0) {
        ledger.fail('late-taps', label,
          'every tap one step late was dropped; keep changing text out of tappable ' +
          'controls or do not bump the revision for cosmetic label changes');
      }
    } catch (error) {
      ledger.fail('runs', label, `threw ${describeError(error)}`);
    }
  }
  /** What only the whole run can say. */
  finish(summaries: readonly ScenarioSummary[]): void {
    const { ledger, module } = this;
    const { min, max } = module.meta.players;
    if (summaries.length === 0 || !summaries.every((summary) => summary.complete)) return;
    ledger.ran('results');
    if (summaries.every((summary) => summary.overAtStep === -1)) {
      ledger.fail(
        'results',
        '',
        'no scenario reached the end of a match (isOver never held), so ' +
          'final results were never checked: add a scenario that finishes',
      );
    }
    ledger.ran('min-players');
    const ends: [number, string][] =
      min === max
        ? [[min, 'only']]
        : [
            [min, 'fewest'],
            [max, 'most'],
          ];
    for (const [count, word] of ends) {
      const at = summaries.filter((summary) => summary.players === count);
      const players = `${String(count)} player${count === 1 ? '' : 's'}`;
      if (at.length === 0)
        ledger.fail(
          'min-players',
          '',
          'no scenario starts with ' +
            players +
            ', the ' +
            word +
            ' this game takes: add one, and make it play a whole match',
        );
      else if (at.every((summary) => summary.overAtStep === -1))
        ledger.fail(
          'min-players',
          '',
          `no scenario with ${players} (the ${word}) played a whole match: isOver never held`,
        );
    }
    ledger.ran('secrets');
    if (this.sawSecrets && module.scrambleSecrets === undefined) {
      ledger.fail(
        'secrets',
        '',
        'the game declares secrets but has no scrambleSecrets, so a secret ' +
          'leaking as a count, a flag or an order could not be seen: write ' +
          'it',
      );
    }
  }
}
/**
 * Runs every check on a game. `scenarios` say who plays and for how long; with no script a
 * scenario is played by `fuzzScript`. They must include the game's fewest and most players,
 * each playing a whole match.
 */
export function runConformance<State, Settings extends object>(
  module: GameModule<State, Settings>,
  scenarios: readonly Scenario<Settings>[],
  options: ConformanceOptions,
): ConformanceReport {
  const kit = new Kit<State>(module, options);
  const summaries: ScenarioSummary[] = [];
  kit.meta();
  kit.settings();
  kit.purity();
  if (!kit.ledger.failed('meta') && !kit.ledger.failed('settings')) {
    kit.startUp();
    if (scenarios.length === 0) kit.ledger.fail('determinism', '', 'no scenarios were given');
    scenarios.forEach((scenario, index) => {
      const played = kit.play(scenario, index, false);
      if (played === null) return;
      if (!played.complete) { summaries.push(played.summary); return; }
      kit.rerun(played, true);
      const moved = kit.play(scenario, index, true);
      summaries.push({ ...played.summary, ...(moved === null ? {} : { membershipReplay: { steps: moved.summary.steps, overAtStep: moved.summary.overAtStep } }) });
      if (moved?.complete === true)
        kit.rerun(
          {
            ...moved,
            summary: {
              ...moved.summary,
              name: `${moved.summary.name} with players joining and leaving`,
            },
          },
          false,
        );
    });
    kit.finish(summaries);
  }
  const checks = kit.ledger.results();
  // A check that was never applied proves nothing, so it cannot count towards a pass.
  return {
    game: module.meta.id,
    stepMode: stepModeOf(module),
    ok: checks.every((check) => check.status === 'pass' || check.status === 'not-applicable'),
    checks,
    scenarios: summaries,
  };
}
/** The report as text, one line per check and the failures beneath. */
export function formatReport(report: ConformanceReport): string {
  const lines: string[] = [
    'Conformance kit: ' +
      report.game +
      ' (' +
      report.stepMode +
      ') ' +
      (report.ok ? 'PASSES' : 'FAILS'),
  ];
  for (const scenario of report.scenarios) {
    lines.push(
      `    step ms: mean ${scenario.stepTime.mean.toFixed(4)}, ` +
        ('p95 ' +
          scenario.stepTime.p95.toFixed(4) +
          ', worst ' +
          scenario.stepTime.worst.toFixed(4) +
          '; ') +
        'allocation counts unavailable (report only)',
    );
    const end = !scenario.complete
      ? 'STOPPED EARLY by a failure'
      : scenario.overAtStep === -1
        ? 'match not finished'
        : `over at step ${String(scenario.overAtStep)}`;
    lines.push(
      '  scenario "' +
        scenario.name +
        '": ' +
        String(scenario.players) +
        ' player' +
        (scenario.players === 1 ? '' : 's') +
        (scenario.teams ? ' in teams' : '') +
        ', ' +
        String(scenario.steps) +
        ' steps, ' +
        end +
        ', final hash ' +
        scenario.finalHash,
    );
  }
  for (const scenario of report.scenarios) {
    if (scenario.membershipReplay !== undefined) lines.push(`  membership replay "${scenario.name}": ${String(scenario.membershipReplay.steps)} steps, over at step ${String(scenario.membershipReplay.overAtStep)}`);
  }
  for (const check of report.checks) {
    const mark = check.status === 'not-applicable' ? ' N/A' : check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'FAIL' : ' -- ';
    const applied =
      check.status === 'not-applicable' ? 'not applicable: nothing to examine' : check.status === 'not-run'
        ? 'not run: nothing got far enough to apply it'
        : `applied ${String(check.applied)} times`;
    lines.push(`  ${mark}  ${check.id.padEnd(15)} ${check.title} (${applied})`);
    for (const failure of check.failures) lines.push(`        - ${failure}`);
    if (check.failureCount > check.failures.length)
      lines.push(`        ... ${String(check.failureCount)} failures in all`);
  }
  return lines.join('\n');
}
/** As `runConformance`, but throws an Error carrying the formatted report unless everything passes. */
export function assertConformance<State, Settings extends object>(
  module: GameModule<State, Settings>,
  scenarios: readonly Scenario<Settings>[],
  options: ConformanceOptions,
): ConformanceReport {
  const report = runConformance(module, scenarios, options);
  if (!report.ok) throw new Error(formatReport(report));
  return report;
}
/** All reachable state objects, including Map keys/values and Set entries. */
function objectsIn(value: unknown, seen = new Set<object>()): Set<object> {
  if (value === null || typeof value !== 'object' || seen.has(value)) return seen;
  seen.add(value);
  if (value instanceof Map) {
    for (const [key, item] of value) {
      objectsIn(key, seen);
      objectsIn(item, seen);
    }
  } else if (value instanceof Set) {
    for (const item of value) objectsIn(item, seen);
  } else {
    for (const item of Object.values(value)) objectsIn(item, seen);
  }
  return seen;
}
function timing(times: number[]): {
  mean: number;
  worst: number;
  p95: number;
} {
  const sorted = [...times].sort((a, b) => a - b);
  return {
    mean: times.reduce((sum, value) => sum + value, 0) / Math.max(1, times.length),
    worst: sorted.at(-1) ?? 0,
    p95: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0,
  };
}

/** Stop as soon as sharing is established; do not allocate a second complete object graph. */
function sharesObject(
  value: unknown,
  known: ReadonlySet<object>,
  seen = new Set<object>(),
): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (known.has(value)) return true;
  if (seen.has(value)) return false;
  seen.add(value);
  if (value instanceof Map) {
    for (const [key, item] of value) {
      if (sharesObject(key, known, seen) || sharesObject(item, known, seen)) return true;
    }
  } else if (value instanceof Set) {
    for (const item of value) if (sharesObject(item, known, seen)) return true;
  } else {
    for (const item of Object.values(value)) if (sharesObject(item, known, seen)) return true;
  }
  return false;
}
