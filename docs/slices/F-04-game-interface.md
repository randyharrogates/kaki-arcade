# Slice F-04 — The game interface and the conformance kit

Issue F-04 in `docs/backlog/F-foundation.md`, wave 1. Branch `issue/F-04-game-interface`.

## Goal

The contract every game is written against, in `packages/platform/src/game/`: the `GameModule`
type, the settings schema, team support, the controller layout schema, the private view schema,
the one function that steps a game (`driveStep`), and a conformance kit that a game's own test
file calls. Pure TypeScript, no DOM, no npm dependency, nothing imported from `@kaki/protocol`.

## Requirement IDs

- PLAT-030. Covered: partly. Which part: One documented interface; a game imports only
  `@kaki/platform` and `@kaki/sim-core`. Proved here on two fixture games; `done` needs the console
  built against it with no game-specific code (track C).

- PLAT-031. Covered: partly. Which part: The interface covers metadata, player range, layout per
  player and phase, the step, the public view the TV draws from, the private view and results. The
  drawing itself is each game's host view (wave 2).

- PLAT-032. Covered: partly. Which part: The kit proves determinism behaviourally (replay hashes)
  for any module handed to it. `done` needs the three games to pass it.

- PLAT-025. Covered: partly. Which part: Players carry an optional team (0 or 1) and a seat colour
  token; `meta.teams`; results can rank teams; nothing assumes teams. The lobby's team split is
  C-11.

- PLAT-033. Covered: partly. Which part: The schema is shown to fit all three games' phones
  (`layout.test.ts`), and the two fixtures differ in kind (real time and shared space with teams;
  turn-phased with secrets). `done` needs the three real games.


## Acceptance

1. `GameModule<State, Settings, View>` has: `meta` (id, name, blurb, players min and max, teams,
   coop, solo), `settings`, `init`, `step`, `publicView`, `privateView`, `controllerLayout`,
   `join`, `leave`, optional `pause` and `resume`, `isOver`, `results`, `assets`, optional
   `preload`, `secrets`, `scrambleSecrets` whenever secrets exist, optional `save`, optional `stepMode`.
2. The settings schema has choice, multi-choice, toggle and number-with-steps fields with
   defaults; `defaultSettings`, `validateSettings`, `checkSettingsSchema`; a field's kind is
   tied to the settings type at compile time.
3. Teams: `PlayerInfo.team` is optional; `teamsInUse`; `Results` has `players`, `teams` or
   `coop` mode; the kit starts every game with and without teams where it supports them.
4. `stepMode` is `returns-new` by default (owner's ruling D-048) with `in-place` as an escape
   hatch; the kit freezes state and inputs for the first and runs every other check for both.
   A benchmark at Tabao Rush's size compares in-place, structural sharing and whole copy.
5. `runConformance(module, scenarios, options)` returns a report and `assertConformance`
   throws it. Twenty-five named checks (list below). Both fixtures pass all twenty-five.
6. For every check there is a deliberately broken variant of a fixture that the kit fails,
   with a message naming the fault.
7. Layout and private view are plain data with stated limits for a 844 by 390 phone and the
   byte caps 4,096 and 8,192; controls are named by position, never by letter.
8. The source scan skips comments and strings and allows deterministic `Math` members.
9. `pnpm verify` passes completely.

## Evidence (nothing a player sees)

`uat/evidence/F-04-game-interface/`: `verify.txt` (the whole of `pnpm verify`),
`kit-output.txt` (the kit's report on both fixtures and on each broken variant),
`benchmark.txt` (the final verification benchmark), `platform-tests.txt` (every test by name), `REPORT.md`.

## Out of scope

- The host loop, pause screen, lobby team split, reconnect, results chrome (track C).
- Drawing a layout (track K) and drawing a public view (each game, wave 2).
- The dev harness (F-05). It should call `driveStep` and `fuzzScript` from here.
- Wire messages (F-02). Layout and private view are defined here as plain data.
- Colour token values (F-06). Only token names appear here.

---

## How to write a game against this interface (tracks R, P and T)

**Where things go.** Rules live in `games/<id>/src/rules/` (or `sim/`, `levels/`), which the
design lint skips. Import only from `@kaki/sim-core`, `@kaki/platform` and your own folder.

**The module.** Export one `GameModule<State, Settings, View>`:

```ts
export const game: GameModule<State, Settings, View> = {
  meta: { id: 'peek-poker', name: 'Peek Poker', blurb: '…', players: { min: 1, max: 8 }, teams:
    'none', coop: false, solo: true },
  settings: { fields: [{ kind: 'choice', id: 'rounds', label: 'Rounds', options: [...], default: 5 }] },
  init(seed, players, settings, context) { ... },      // createRng(seed); keep the generator in State
  step(state, inputs, dtMs) { ... },                   // returns a NEW state sharing what did not change
  join(state, player) { ... }, leave(state, playerId) { ... },
  publicView(state) { ... },                           // plain JSON; all the TV may know
  privateView(state, playerId) { ... },                // PrivateView with revision | null; only that phone
  controllerLayout(state, playerId) { ... },           // ControllerLayout with a revision
  isOver(state) { ... }, results(state) { ... },
  assets(state) { ... }, secrets(state) { ... },
};
```

**The ten rules the kit will hold you to.**

1. **`step` never changes what it is given.** Start from `{ ...state }` and copy only the
   parts you change; share the rest. Before the first draw of a step, `rng = cloneRng(state.rng)`.
   Never copy the whole state (`cloneState` in `step` costs 25 times more, see below).
2. **Time is whole steps.** Use `STEPS_PER_SECOND` (60) and `secondsToSteps`; decrement a step
  counter, never subtract milliseconds. A 0.25 s window is exactly 15 steps. No clock, no timer, no
  `Math.random`.
3. **Inputs are borrowed.** `inputs.frames` and its frames are reused by the host. Read them;
   to keep one, `copyFrame(frame)`. A player with no frame is holding nothing.
4. **Held controls come in frames, taps come as actions.** Stick: `frame.axes[AXIS.STICK_X]`,
   `[AXIS.STICK_Y]` through `normaliseAxes`. Buttons: `isHeld(frame, BUTTON.FACE_BOTTOM)` or
   `PAD_BUTTON_BIT['face-bottom']`. Options, grid cells, cards and swipes arrive in
   `inputs.actions` as `{ player, control, value }`, already checked against the layout you
   returned for this state: right revision, existing control, offered value, not disabled,
   and the control's `audience` (`everyone`, `leader`, `not-leader`). Only the FIRST accepted tap
     from each player on each control reaches one step; invalid taps do not consume that slot, and
     later valid taps on it are discarded, never queued. Different controls can both arrive, so
     check the player's lock-out between actions. Use actions for anything that must not be
   applied late (an answer to the previous question).
5. **Keep a revision per player. Bump it only when that player's `tapSignature` changes** (new
  question, new tappable set). Never decrease it. Another player's wrong answer, countdowns,
  selection and disabled flags need no bump. The kit also delays taps one step with their original
  revision. Layout checks enforce unchanged signatures; the independent delayed-tap check
  ensures accepted tap outcomes do not depend on numeric revision metadata.
  If the previous layout offered no tappable control, a needless revision bump is allowed.
  Private views have separate per-player revisions: change whenever their blocks change; needless bumps are allowed because no private-view block can be tapped. Unlike layout revisions, there is no in-flight tap to invalidate.
  The host compares these revisions, never JSON.
6. **Buttons are named by position**: `face-bottom`, `face-right`, `face-left`, `face-top`,
   `shoulder-left`, `shoulder-right`. They show cross (bottom), circle (right), square (left),
     triangle (top), in our own colours.
7. **Colours are token names** (`seat-3`, `team-red`), never values.
8. **Say what is hidden.** `secrets(state)` lists it with its owner (`null`: nobody). Use
   `value` for unmistakable things (a card code, an answer's text) and `match(value, path)` for
   small numbers. If your secrets are choices among things everyone can see (which cell was
   picked, which option is right), write `scrambleSecrets` whenever ANY secret exists: it is the check that
   catches a secret leaking in disguise.
9. **`join` and `leave` never touch another player's score**, and `results(state)` lists
   exactly the players now in the match, at any step. A joiner who must wait still gets a
   layout (a line of text). Mark players seated after the first step `joinedMidGame`.
   Competitive newcomers start at zero; co-op newcomers share the unchanged team score.
10. **`assets(state)` on the first state names everything** the match can show. `preload`
    names JSON that `init` needs (a question bank); it arrives in `context.data`.
    `context.saved` is what your last `save(state)` asked the host to keep.

**Teams.** Whether a match is in teams is the lobby's question, not a setting. Read it from
the players: `teamsInUse(players)`. With teams on, `results` must have `mode: 'teams'` and
both teams in `teams`. Co-op is `mode: 'coop'` with a shared `score`.

**Pause.** The console pauses by not calling `step`. Write `pause` and `resume` only to hide
something (Peek Poker's cards while memorising); `resume(pause(s))` must equal `s`.

**The test.**

```ts
import * as fs from 'node:fs';
import { assertConformance, readSources } from '@kaki/platform/kit';

it('passes the conformance kit', () => {
  assertConformance(game, [
    { name: 'eight players', players: 8 },                       // played by fuzzScript()
    { name: 'a full match', players: 4, script: myScript },      // must reach isOver
    { name: 'teams', players: 6, teams: true },
  ], { sources: readSources(fs, new URL('./rules', import.meta.url).pathname) });
});
```

A scenario runs at least 2,000 steps. With no `script` the kit plays it with `fuzzScript`
(sticks wander, buttons in the layout are pressed, anything tappable is tapped, a few stale
taps are thrown in). A script sees only what the room sees (`publicView`, each phone's layout
and private view) and returns pads, taps, joins and leaves. Scenarios must include both
  `meta.players.min` and `meta.players.max`, each finishing
a whole match. The join/leave replay starts at the minimum, churns throughout play, and
finishes at the minimum. After churn it may continue to four times the scenario length, capped at 40,000 total steps (a longer explicit scenario still runs its promised length). Allow enough steps in each scenario to finish an ordinary match; the extra allowance covers waiting joiners and auto-skips. Separate branches leave to zero and rejoin across the run and phases.
Use short settings so it finishes.

**Per game.**

- **Rabakz (R-01).** Answers are an `options` control with `face` set, so a late answer to
  the last question is dropped by revision. The 0.25 s window is 15 whole steps, using
    `secondsToSteps(0.25)`. Lock-out
  is `state: 'disabled'` on that player's options. Skip is an `audience: 'leader'` options control.
  The right option is a secret with owner `null`: use `match` on the path and write
  `scrambleSecrets` (R-10's request that the kit catch a `correct` field is met this way).
  Question chunks come through `preload` and `context.data`; recently seen questions and the
  solo best through `context.saved` and `save(state)`. Add `@kaki/content-rabakz` to
  `allowImports` if rules import the selector.
- **Peek Poker (P-01).** The pick grid is a `grid` control (4 by 4) with the player's own
  picks `selected`; Lock in is a 144 px options target (`size: 'large'`); a grid cell may have
    `focus: true` for a cursor independently of its selection. Face-down card faces are `value`
  secrets (owner `null`); picks need `scrambleSecrets`. `pause` should hide the grid while
  memorising. Hand at the reveal: a `cards` block in the private view.
- **Tabao Rush (T-01).** `stick`, four face buttons, optional `shake` (which needs its button
  in the layout too). Keep timers as "done at tick N", not counters, and stations as objects
  that change only on events, so a step shares nearly everything. `secrets` returns `[]`.
  Versus is teams on; co-op is `mode: 'coop'`. Joiners get a text layout until the next round.

---

## The state contract and its cost

`stepMode` is `returns-new` unless a module says `in-place`. Under `returns-new` the kit
deep-freezes the state before every `step`, `join`, `leave`, `pause` and `resume`, runs a
second replay with the inputs frozen too, and hashes the old state after the step (which
catches typed arrays, which cannot be frozen). Returning the very object given is allowed and
means nothing changed. Under `in-place` nothing is frozen; every other check still runs,
including the one that a sampled frame or action object is not kept in the state.

Benchmark (`packages/platform/src/game/benchmark.test.ts`): one made-up kitchen of 8 cooks,
40 stations, 40 items and 5 orders, the same rules written each way, all ending in the same
state hash. 10,000 steps a batch, best of 5 batches, three runs on the dev Mac (M3, Node 24)
with other agents running:

| Step written as | Time per step | Share of a 16.7 ms step | Heap growth per step | At 60 steps a second |
|---|---|---|---|---|
| in-place | 0.32 to 0.35 µs | 0.002% | 0 to 11 bytes | about 1 KB |
| returns-new, sharing unchanged parts | 0.60 to 0.74 µs | 0.004% | about 2,650 bytes | 155 KB |
| returns-new, every object copied by hand | 1.31 to 1.38 µs | 0.008% | about 7,540 bytes | 442 KB |
| returns-new, `cloneState` of the whole state | 15.9 to 16.7 µs | 0.10% | about 23,800 bytes | 1.4 MB |

How to read it: the modelled kitchen is a hard case for sharing (every cook moves, 8 stations
and all 5 orders change a counter every step). Sharing costs about 0.3 µs a step more than
in-place and creates about 2.6 KB of short-lived objects a step. Bytes are heap growth between
samples and are a floor. What this does **not** measure is the pause when the browser's
collector clears those objects on the TV: that is for the performance harness (F-08) with the
real game, as D-048 requires.

## The checks

- `meta`. What it requires: Picker details complete; players within 1 to 8; solo true exactly when
  min is 1. Broken variant that fails it: solo claimed for a 2-to-9-player game.

- `settings`. What it requires: Schema sound; defaults validate. Broken variant that fails it: a
  default off the steps.

- `purity`. What it requires: No clock, timer, unseeded randomness or outside import in the source.
  Broken variant that fails it: `Math.random`.

- `init`. What it requires: Starts for every count from min to max, without and with teams. Broken
  variant that fails it: fails for eight.

- `runs`. What it requires: `init`, `step`, hooks and views never throw. Broken variant that fails
  it: `join` throws; `step` throws after a lock-in.

- `determinism`. What it requires: Second run from the same recording: same hash at each of 2,000 or
  more steps. Broken variant that fails it: `Math.random`; a counter outside the state.

- `seed`. What it requires: Another seed gives a different run. Broken variant that fails it: seed
  ignored.

- `replay`. What it requires: The recording, through `encodeRecording`, JSON and `decodeRecording`,
  replays with `replay()`. Broken variant that fails it: `Math.random`.

- `reload`. What it requires: State through `encodeState`, JSON, `decodeState` at two points
  mid-run; the rest of the run matches. Broken variant that fails it: a shared reference a reload
  breaks.

- `clone`. What it requires: `step(cloneState(s))` equals `step(s)` at every step. Broken variant
  that fails it: identity-dependent state.

- `previous-state`. What it requires: Old state's hash unchanged after the next sample and step; no
  host input object in the state. Broken variant that fails it: sampled frame kept; action object
  kept; typed array written.

- `state-contract`. What it requires: `returns-new`: nothing given is changed. Both modes: inputs
  unchanged. Broken variant that fails it: mutation in a `returns-new` step; inputs reversed.

- `views-json`. What it requires: Views are plain JSON; layout at most 4,096 bytes, private view
  8,192. Broken variant that fails it: a Map, NaN, `undefined`; an oversized layout.

- `views-pure`. What it requires: Each view called twice is equal; state hash unchanged. Broken
  variant that fails it: a view that counts calls; a view that writes.

- `layout`. What it requires: Only schema controls and fields; physical packing; per-player
  revisions. Broken variant that fails it: invented control, raw colour; oversized grid; stuck or
  global revision.

- `repeat-taps`. What it requires: A second tap after lock-out cannot change the outcome. Broken
  variant that fails it: buzzer scores twice.

- `late-taps`. What it requires: Accepted delayed taps have an outcome independent of revision
  metadata. Broken variant that fails it: rules use accepted revision as game data.

- `min-players`. What it requires: Whole matches at both endpoints; leave to zero/empty team is
  safe. Broken variant that fails it: missing endpoint, late solo throw, empty room/team throws.

- `secrets`. What it requires: No declared secret in the public view or another player's views;
  `scrambleSecrets` leaves each viewer's views identical. Broken variant that fails it: pick on the
  TV; a sum of picks; seal in private views; pick in a layout.

- `join-leave`. What it requires: The scenario replayed with players joining and leaving at seeded
  steps: no throw, no other score changes. Broken variant that fails it: leaving shares out a point.

- `pause`. What it requires: `pause`, 30 idle looks, `resume`: same hash as before. Broken variant
  that fails it: resume does not undo pause.

- `results`. What it requires: Every current player once; places and scores in order; teams when in
  teams; a match finishes and stays finished. Broken variant that fails it: seat order; a player
  missing; no team rows; never over; over then not.

- `assets`. What it requires: `preload` is data only; `assets` never names something new during
  play. Broken variant that fails it: a late asset.


A check that nothing got far enough to apply is reported as not run, and the report is then
not a pass.

## The limits for a 844 by 390 phone

Board 4 and D-047 to D-053 in the newer main checkout are the source. The play rectangle is
818 × 314 px: 13 px side/bottom margins, play starts at y=63. The console's 55 × 55 Menu
fits in the reserved top bar at y=8. It is not a game control and never enters game inputs.

`PHONE` / `PHONE_LIMITS` publish real pixel floors. `footprintOf` returns dimensions;
`packPhone` checks actual rows and columns, including 8 px grid gaps, 13 px row gaps and
21 px column gaps. It tries stacked panels and adjacent panels, with words above or beside.
It accepts only a placement at the floors; it is a conservative supported arrangement,
not a solver for arbitrary free-form layouts. Track K must honour these arrangements.

- Tabao Rush. Arithmetic inside the play rectangle: floating stick 178 square + 21 gap + 300 square
  diamond = 499 × 300; each of the four circles is 110 square; Menu is in the reserved bar.

- Peek Poker picker. Arithmetic inside the play rectangle: 4 × 89 + 3 × 8 = 380 wide; 4 × 68 + 3 × 8
  = 296 tall. A 144-wide instruction column + 21 + 380 + 21 + 144-square Lock in = 710 × 296.

- Rabakz. Arithmetic inside the play rectangle: four answers in two columns/two rows, each at least
  144 × 68; long text increases width; shaped long answers in the test need 278 × 68 each, so 569 ×
  149.


Other in-play taps never fall below 89 × 68; face buttons never below 110 square; nothing
tappable falls below 55. A 5 × 12 tap grid alone needs 1156 × 372 and fails both axes.
All five requested crowded examples fail. Byte caps remain 4096 for layout and 8192 for
private view. Grid count caps are derived per axis: at most 4 × 8 tappable cells or 7 × 19 read-only
  cells in isolation. Combined layouts still have to pass physical packing.

## Decisions made inside the lane

- Taps are `actions` checked by `driveStep`, not by each game. Why: One place rejects stale
  revisions, unknown controls, disabled items and non-leader taps, so games never see them and a
  recording replays the same filtering.

- Join, leave and leader travel in the tick. Why: A recording of ticks then replays a whole match,
  membership included.

- Team play is the lobby's switch, not a game setting. Why: The kit can then start any game with and
  without teams without knowing its settings; PLAT-025 puts the split in the console anyway.

- `results` must work at any step. Why: Scoreboards between rounds, and the join/leave score check
  needs it.

- State is stored through `encodeState`. Why: F-03 left the choice to F-04. Maps and typed arrays
  are allowed in state; the host must save with `encodeState` (PLAT-009).

- `scrambleSecrets` added beside the asked-for `secrets` list. Why: A value search cannot tell a
  secret 5 from seat 5, and cannot see a disguised leak. Both real games with secrets have
  small-number secrets. Required whenever secrets exist.

- `preload`, `context.data`, `context.saved`, `save(state)`. Why: RZ-020, RZ-013, RZ-015, PP-012 and
  TR-054 all need loaded data or host-saved data; without a door in the interface each game would
  make its own (PLAT-033).

- A `multi` settings field. Why: RZ-010 (any set of categories).

- The kit takes `node:fs` from the caller. Why: The package's library code has no Node types.

- Greying an item needs no new revision. Why: A buzzer race must not drop an answer because another
  option was marked wrong 10 ms earlier.


---

## Close-out

### Requirement → code → tests → evidence

All code is under `packages/platform/src/game/`.

- PLAT-030. Code: `types.ts` (`GameModule`), `drive.ts`, `index.ts`, `../index.ts`. Tests:
  `drive.test.ts`; `conformance.test.ts > the conformance kit on the fixture games`. Evidence:
  `kit-output.txt` "Dots, as written", "Picks, as written".

- PLAT-031. Code: `types.ts`, `settings.ts`, `layout.ts`. Tests: `settings.test.ts`,
  `layout.test.ts` (`the schema fits the three games`, `checkLayout`, `checkPrivateView`,
  `tapSignature`), `conformance.test.ts > checkResults`. Evidence: `platform-tests.txt`.

- PLAT-032. Code: `conformance.ts`, `purity.ts`, `json.ts`. Tests: `conformance.test.ts > the kit
  catches each kind of broken game` (57 broken variants plus the review attacks), `purity.test.ts`,
  `json.test.ts`. Evidence: `kit-output.txt` every "BROKEN" section.

- PLAT-025. Code: `types.ts` (`PlayerInfo.team`, `teamsInUse`, `Results`), `conformance.ts`
  (`startUp`, `checkResults`). Tests: `drive.test.ts > small helpers`; `conformance.test.ts >
  checkResults > accepts teams`; Dots scenario "two teams of two". Evidence: `kit-output.txt` line
  "4 players in teams".

- PLAT-033. Code: `fixtures/dots.test.ts`, `fixtures/picks.test.ts`. Tests: their own rule tests;
  `layout.test.ts > the schema fits the three games`. Evidence: `kit-output.txt`.

- OQ-030 / D-048. Code: `types.ts` (`StepMode`, `stepModeOf`), `benchmark.test.ts`. Tests:
  `benchmark.test.ts`. Evidence: `benchmark.txt`, `verify.txt`.


All five rows should stay `in progress`: each needs the real games or the console.

### Acceptance

All nine statements pass; the file for each is in `uat/evidence/F-04-game-interface/REPORT.md`.

### Dependencies

None added. No lockfile or config change.

### Requests

1. **`docs/ARCHITECTURE.md` §3.** Replace the code block and the rules beneath it with:

   ````
   Every game is a module exporting (exact types: `packages/platform/src/game/types.ts`):

   ```ts
   interface GameModule<State, Settings, View> {
     meta: { id; name; blurb; players: { min; max }; teams: 'none' | 'optional' | 'required'; coop; solo };
     stepMode?: 'returns-new' | 'in-place';                        // default returns-new (D-048)
     settings: SettingsSchema<Settings> | ((context: SetupContext) => SettingsSchema<Settings>);
       // what the leader chooses before play
     preload?(settings: Settings | null): AssetManifest;           // before settings, then init
     save?(state: State): JsonValue;                              // persistence at any time
     init(seed: number, players: PlayerInfo[], settings: Settings, context: InitContext): State;
     step(state: State, inputs: StepInputs, dtMs: number): State;  // pure, deterministic
     join(state: State, player: PlayerInfo): State;                // mid-match (PLAT-008)
     leave(state: State, player: PlayerId): State;
     pause?(state: State): State;  resume?(state: State): State;
     publicView(state: State): View;                               // what the big screen draws from
     privateView(state: State, player: PlayerId): PrivateView | null;
     controllerLayout(state: State, player: PlayerId): ControllerLayout;   // with a revision
     isOver(state: State): boolean;
     results(state: State): Results;                               // players, teams or coop; at any step
     assets(state: State): AssetManifest;                          // everything loaded before the first step
     secrets(state: State): Secret[];
     scrambleSecrets?(state: State, viewer: PlayerId | null, salt: number): State;
   }
   ```

   `StepInputs` is `{ frames: ReadonlyMap<PlayerId, SampledInput>; actions: PlayerAction[]; leader:
     PlayerId | null; connected: ReadonlyMap<PlayerId, boolean>; disconnected: PlayerId[] }`.
   Held controls (stick, buttons) arrive in `frames`; taps on options, grid cells and cards
   arrive in `actions`, already checked against the layout's revision.

   Rules:

   - `step` has no access to the DOM, network, timers or `Math.random`. All randomness comes
     from the seed. It returns a new state that shares its unchanged parts with the old one
     and never changes the state or inputs it was given (D-048); `in-place` is an escape hatch.
   - The host steps a game only through `driveStep(module, state, tick, dtMs)`: leavers, then
     joiners, then taps that still fit the layout, then one `step`. A recording of ticks
     replays a match exactly.
   - The big screen renders from `publicView` and may show `results` at any step. `publicView` is plain JSON.
   - Secrets exist only in `State` on the host and in that player's `privateView` and
     `controllerLayout`. A game declares them in `secrets` and the kit searches for them.
   - Whether a match is played in teams is the lobby's choice for a game whose `meta.teams`
     is `optional`; a game reads it from its players (`teamsInUse`).
   - Game state is saved with `encodeState` (PLAT-009).
   - The platform owns: joining, seats, teams, pause, reconnect, leaving, the picker and
     results chrome.
   - Every game passes the conformance kit (`runConformance`; the checks are listed in
     `docs/slices/F-04-game-interface.md`). The types are a contract: changed only by the
     integrator (`PLAN.md` §2).
   ````

   §5 "Input model" should say buttons are named by position (`BUTTON` in `types.ts`) and that
   the buffer carries 4 axes (stick x, y; tilt x, y).
2. **F-02 (protocol).** (a) Carry `PlayerAction` as `{ control, value?, revision }` on the
   reliable channel; the host adds `player`. (b) Cross-check the exact wire-aligned bit table in
     Review round 2 below; axes remain four. (c) The caps this
   kit enforces are 4,096 and 8,192 bytes of UTF-8 JSON; if the protocol counts differently,
   say so.
3. **Track C (host).** Step games only through `driveStep`; send each phone
   `layoutFor(layout, isLeader)`; save state with `encodeState`; load `preload` data then
   `assets(firstState)` before the first step; store `save(state)` whenever needed;
   keep the buffer rules from F-03. Offer a "Teams" switch in the lobby for `meta.teams ===
   'optional'`. Pause below `meta.players.min` or if a team empties. Apply membership first and do
     not step until enough players rejoin. The kit exercises leaves to zero and empty teams; leave
     must never throw or score.
4. **Track K.** Draw from `LayoutControl` and `PanelBlock`; `PHONE_LIMITS` and `footprintOf`
   are the decided sizes, checked against the newer main checkout board 4. Send each phone
     `privateViewFor(view, isLeader)` as well as `layoutFor`. The host supplies `inputs.frames` in
     ascending seat order, and `inputs.connected` maps each seated player to a boolean; disconnected
     players send no frames or actions and must not hold up a lock-out.
5. **F-06 (tokens).** Define `seat-1` to `seat-8`, `team-red`, `team-blue` and `shape-cross`,
  `shape-circle`, `shape-square`, `shape-triangle`. Those are the only colour tokens accepted, at
  type and runtime level.
6. **F-05 (dev harness).** Reuse `driveStep`, `fuzzScript`, `makePlayers`, `createTick`.
7. **Root config.** Add `"./kit": "./src/game/kit.ts"` to platform package exports.
   `package.json` is outside this lane. Root runtime exports now exclude the kit and source scan.
   Tests should import from `@kaki/platform/kit`. (a) A `"./game"` subpath export for
     `@kaki/platform` would let games
   avoid importing the console's future room code; not needed yet. (b) The lint for pure code
   asked for by F-03 is still wanted; the kit's scan covers only folders passed to it.
8. **`docs/TRACEABILITY.md`.** PLAT-030, 031, 032, 025, 033 can take the paths above.
9. **Game specs.** Use shapes cross, circle, square and triangle by position throughout; update any
  older letter-based control tables during integration.

### Remaining integration work

- The host, renderer and real games remain outside this lane. They must adopt the contract above.
- Value searches can match innocent small numbers: provide `value` plus a path-aware `match`.
- The source scan is an accident detector, not a parser or an adversarial security boundary.
- Benchmark heap growth is a floor; collector pauses on the TV still need F-08.

## Review round 1

- 1 Phone limits. Change and proof: Replaced area cells with physical rows/columns and decided
  floors. Tests accept all three decided screens and reject all five crowded layouts. Arithmetic is
  above; no floor needed bending.

- 2 Repeat taps. Change and proof: `driveStep` keeps only the first accepted tap per
  player/control/step. Fuzz sends bursts of two or three. Direct filtering test and broken buzzer
  scoring twice/while locked are caught.

- 3 Revisions. Change and proof: Exact per-player signature/revision checks; one-step delayed taps
  retain their revision and compare outcomes with refreshed revisions when signatures agree. Broken
  global revision fails layout (round 2 separates delayed outcome checks). Waiting fixture players
  now keep stable
  revisions.

- 4 Disguised secrets. Change and proof: Scramble required if any scenario ever declares secrets;
  state hash and every declared hidden value must change. Deep search and scramble comparisons run
  every step for TV and every other phone. Count, disabled flag, one-phone intermittent leak,
  missing/identity/partial scramble variants fail.

- 5 Minimum players. Change and proof: Require whole matches at both endpoints. Membership replay
  reaches minimum before play and plays to the end. Separate seeded branches empty teams and the
  whole room without stepping below minimum; leave cannot score or throw. Broken late solo failure,
  empty room and empty team variants fail.

- 6 Step units. Change and proof: Export 60 `STEPS_PER_SECOND`, `secondsToSteps`, `STEP_MS`,
  `stepsToSeconds`; 0.25 s is tested as exactly 15. Both fixture timers now count steps.

- 7 Connectivity. Change and proof: Step inputs carry `connected: ReadonlyMap<PlayerId, boolean>`
  plus the disconnected list. Kit simulates drops/returns and omits their frames/actions. Documented
  for lock-out rules.

- 8 Results/save. Change and proof: Equal scores must share a place; every co-op player agrees with
  the shared score. Replaced `results.save` with optional pure `save(state)`, callable any time, so
  early exits can persist without overloading a scoreboard. Obsolete results.save is rejected, never
  used for persistence. Uneven co-op, split ties and invalid saves are caught.

- 9 Settings context. Change and proof: Fixed or context-built settings; `preload(null)` before
  settings, then `preload(settings)` before init. Context includes loaded data, saved state and
  teams. Optional contextual fields are typed and tested.

- 10 Layout/input details. Change and proof: Audience on every control/panel, private-view
  filtering, focus independent of selection, documented ascending seat order (including rejoin),
  exercised by the kit.

- 11 Purity. Change and proof: Justified same-line `// purity-ok: reason` escape. Scan flags
  fetch/navigator/process, async/await, module-level let/var and comparator-free sort/toSorted;
  regression tests cover all.

- 12 Shapes/tokens. Change and proof: Shape-position mapping and exact seat/team/shape token
  vocabulary exported and checked; no letter button names accepted.


The independent review's attack file was readable. Its identity scramble, one-player failure,
co-op mismatch, early save and post-over failure ideas were adapted into local variants;
existing fixtures also cover outside-state counters, retained inputs, identity-dependent reload,
seed misuse and view mutation. An aggregate assertion requires a caught broken variant for
all 23 original kit checks (25 after round 2). No dependency, protocol import, DOM or timer was introduced.

Timing and final verification are recorded in `uat/evidence/F-04-game-interface/REPORT.md`.


## Review round 2

Read D-062 from main and the reviewer's three game skeletons, test attacks and `r2/broken.txt`.
The local variants use only generic Dots/Picks rules; no real game rules were copied into platform.
Changes remain uncommitted. The runtime export no longer reaches the conformance kit or source scanner.

- **M1 — Membership throughout play.** Twenty seeded strata cover the whole run, plus final
  steps and each newly exposed phase/control structure. Branches leave to zero and rejoin,
  including after `isOver`; moving replays churn throughout and finish at the minimum.
  Broken join-after-round-one and last-leave-after-round-one variants are caught.
- **M2 — Mid-game results.** Required boolean `PlayerResult.joinedMidGame`, set by games for
  players seated after the first step. Competitive newcomers start at zero. Every co-op
  player, including a newcomer, shares the team score; joining must preserve it.
  Both fixtures implement the flag. A co-op Dots scenario joins at step 900; the honest
  game passes and its zero-score-joiner variant fails.
- **M3 — Different-control taps.** After an accepted tap, append initially offered taps from
  the same and other controls. A tap refused by the resulting layout must change nothing.
  The generic lock-then-pick variant is caught. A passing fixture protects leader-only audiences.
- **M4 — Empty phone exception.** A needless layout revision fails only if the previous
  layout offered a tappable control: otherwise nothing can be in flight. Content changes
  still require a bump, and revisions never decrease. Text-only changing screens pass.
- **M5 — Results are public.** Search every result, including player/team/top-level extras,
  for secrets. TV scramble comparisons include results. Hidden-answer extras and disguised
  per-player pick counts both fail.
- **S1 — Performance.** Reports give each scenario's game-step mean, worst and 95th percentile
  in milliseconds. Timing excludes host filtering and kit work. Allocation counts cannot
  be measured portably and are report-only; benchmark heap growth remains an estimate.
  A returns-new step whose input has at least eight reachable objects must share an object
  with it. The whole-state-copy variant fails. Genuinely tiny states may set
  `tinyStateReason` to a non-empty explanation; this opt-out affects only sharing.
  Negative fixtures can request `stopOnFailure` for named checks after 60 probe steps;
  those reports explicitly stop early and unreached checks remain not-run. Passing games
  still run every promised step and replay. This avoids repeatedly proving a known failure.
  The benchmark batch gets a 15-second test timeout; its 100-microsecond step limits stay fixed.
- **S2 — Purity.** Browser globals, storage, network constructors and typeof-window branches
  are refused; globalThis reads permit only the listed pure built-ins. The lexer records
  actual comments, so a string containing `purity-ok` cannot excuse code. Pure maths,
  including sin/cos/exp/pow/atan2/hypot, remains allowed. Determinism means "same inputs,
  same result on the same browser engine" (D-062).
- **S3 — Independent delayed taps.** Compare accepted delayed actions against the same
  actions with normalized revision metadata. After host acceptance, rules must use control
  and value, never a numeric revision as game data. Its own broken variant fails late-taps
  while layout passes. Stale revision policy is checked by layout, without duplicating it.
- **S4 — Coverage assertion.** Plain `pnpm verify` requires a caught broken variant for every
  check. The evidence variable only controls file output.
- **S5 — Repeat semantics.** The post-step refusal test ignores revision. A global revision
  counter fails layout, and does not spuriously fail repeat-taps or late-taps.
- **S6 — Size estimates.** Option widths include the longest unbreakable word. `footprintOf`
  returns the complete options block, in at most two columns, including row/column gaps.
- **S7 — Private revisions.** Every non-null private view carries numeric `revision`, per
  player. Changed blocks require a new revision; unchanged blocks require the same revision;
  it cannot go down. Both missing bumps and needless bumps have caught variants. The host
  compares revisions, never JSON; private-view audience filtering preserves the revision.
- **S8 — Wire bits.** The one `BUTTON` position table names the protocol file it must match.
  The exact positions below require an integration cross-check; there is no protocol import.
- **S9 — Inferred secrets.** Stop declaring a secret once screen content lets it be worked
  out: if three of four options are marked wrong, the remaining right option is public.
  The scramble failure message explains this rule. Declare secrets only while hidden.
- **S10 — Separate kit.** `packages/platform/src/game/kit.ts` exports the kit. Runtime exports
  exclude it. The package subpath export is a Request because package.json is outside this lane.

Exact wire table for the integrator (values are bit positions; masks are `1 << position`):

| Protocol name | Position/function name | Bit |
| --- | --- | --- |
| up | DPAD_UP | 0 |
| down | DPAD_DOWN | 1 |
| left | DPAD_LEFT | 2 |
| right | DPAD_RIGHT | 3 |
| a | FACE_BOTTOM / cross | 4 |
| b | FACE_RIGHT / circle | 5 |
| x | FACE_LEFT / square | 6 |
| y | FACE_TOP / triangle | 7 |
| l | SHOULDER_LEFT | 8 |
| r | SHOULDER_RIGHT | 9 |
| start | START | 10 |
| shake | SHAKE | 11 |

### Remaining Requests after round 2

- Integrator: add the `./kit` package export and a wire-table cross-check against
  `packages/protocol/src/input.ts`; keep its 4096/8192 byte and depth limits aligned.
- Host/controller: adopt per-player private revisions and `joinedMidGame`, co-op join scores,
  positional button bits, and the precise layout-revision rule above. Compare revisions,
  never serialized view JSON. The game interface remains independent of protocol imports.
- Peek Poker spec: remove the D-pad cursor. D-062 confirms tap-to-pick plus Lock in (board 4B);
  a D-pad does not fit beside that grid at the floors. Replace letters with shapes in specs.
- Game authors: bots (TR-053) belong inside the game's own state, per D-062; no bot API here.
- The earlier Requests for host, renderer, tokens, harness and shared tracker/spec updates
  remain with their owners. No shared requirement document was changed in this lane.
- The final conformance test bodies took 34.565 seconds on this run, exceeding the requested
  approximately 25-second contribution. Runtimes varied markedly across retries; validate on
  a stable runner. No performance threshold was relaxed. See the evidence REPORT for all timings.
- F-08 still measures real-browser collector pauses. Heap estimates and kit step timings do
  not claim to count allocations or replace the performance harness.

Final counts, timings and the verification tail are in the regenerated evidence REPORT.md.

## Review round 3

- **N1:** Reports distinguish `N/A` (nothing to examine) from `not-run` (unreached).
  Applicable checks still must pass. Checks that can be N/A are `private-revision` (no consecutive
  non-null private views), `sharing` (no eligible returns-new step), `repeat-taps` (no offered tap
  refused after a step), and `late-taps` (no accepted delayed tap). Other checks always have
  something to validate on a completed scenario, including empty secrets/assets lists and
  identity pause/resume. The review's always-null kitchen case is ported to generic Dots.
- **N2:** Sharing fails only after 30 consecutive non-trivial steps (at least eight reachable
  input objects), with no accepted tap or membership change, each sharing no object with its
  input. Any other step resets the streak. The review's full new-deal case is ported to Dots:
  every round replaces all objects, including the generator and seats. It passes; sustained
  deep copies remain a caught broken variant. In-place and explained tiny-state exemptions remain.
- **N3:** Churn replays continue after their scenario length until `isOver`, up to four times
  that length, capped at 40,000 total steps. Authors should allow the normal match length in
  their scenario; waiting joiners get that bounded extra allowance. A solo Picks replay with
  long auto-skips proves completion beyond 2,000 steps.
- **N4:** Private content changing without a revision change fails. Needless private revision
  bumps are allowed. Layout revisions retain their stricter rule because taps carry them.
- **N5:** A tap that the layout after the step refuses for that player must have no effect,
  even on a different control. A leader action in the step that closes a window must not wipe
  that window's result; a refused press must not let a second press count.
- **N6:** START (bit 10) belongs to the console: driveStep strips it from held, pressed and
  released before game rules see frames, preserving the borrowed originals. There is exactly
  one shake model: a ShakeControl reads the wire's SHAKE bit 11; its named button is the
  accessible alternative. No second shake event or action model exists.
- **7:** `@kaki/platform/kit` now resolves through the package's `./kit` export. The kit remains
  absent from the main runtime entry. This completes the round-2 package-export Request;
  the wire integration cross-check remains with the integrator.
- **8:** Conformance tests are split into fixture passes, broken variants, review attacks and
  shared fixture/registry support. Workers can run the subjects concurrently. Plain verify
  still asserts caught broken variants cover all 25 checks; filtered `-t` runs skip only that
  aggregate assertion. `KAKI_BENCHMARK=1` enables the timing evidence run; the fast sharing
  correctness assertion always runs. Evidence output is independent of coverage enforcement.

Round-3 counts, timings and verification tail are in the regenerated evidence REPORT.md.
This section supersedes round-2 claims about needless private bumps and one-step sharing.

## Review round 4

- Delayed taps are applicable whenever the replay offers a tappable control. The kit counts
  taps held for delayed delivery and accepted delayed taps separately. If taps were held but
  none was accepted across the run, `late-taps` fails with “every tap one step late was
  dropped”. Its guidance tells authors to keep changing text out of tappable controls or
  not to bump the revision for cosmetic label changes. N/A means no tappable control existed.
- A broken Picks variant changes answer labels every step and bumps the revision for each
  change. It now fails `late-taps` instead of slipping through as N/A. The review repro was
  readable; this fixture reproduces its ticking-label fault using generic Picks rules.
- Reviewed `private-revision`, `repeat-taps` and `sharing`: their eligibility is independent
  of whether an examined operation succeeds. They need consecutive non-null private views,
  an offered tap refused by the next layout, and eligible returns-new steps respectively.
  No matching acceptance-based N/A gap was found. The always-null-private-view fixture still
  passes with private-revision N/A, and all honest fixtures remain required to pass.

This supersedes round 3's definition of late-taps N/A. Counts, timings and the final verify
output are in the regenerated evidence REPORT.md.
