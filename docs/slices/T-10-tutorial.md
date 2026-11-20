# T-10 — First-run tutorial

## Goal and requirements

TR-055: teach movement, pickup, action and placement in a skippable playable tutorial after T-09’s cook picker. PLAT-030/PLAT-031: generic first-in-room context, controller emphasis and header hook. PLAT-032: pure deterministic simulation. CTRL-005/CTRL-008 and NN-5: existing controller input, token sizing and reduced motion.

## Acceptance and implementation

- `SetupContext.firstInRoom` is optional and read-only; absence means false. The host derives it from its existing per-seat completed-round totals, using own-property presence for the selected game, including zero scores. Both contextual settings and match init receive it. No new storage or persistence key.
- T-09’s choices and Ready flow remain intact. First-in-room matches enter a small eight-spawn kitchen after Ready. Four steps wait for every participating cook; a disconnected cook counts as done. Only the connected seated leader may skip. The first real round resets the kitchen and cooking clock and preserves chosen heads and player identities.
- Tutorial movement, crate pickup, held chopping, retrieval and placement use the real game transitions. No tutorial orders, displayed timer, score, stars, burning or fires. The chopping-only level has no cooking heat source.
- TV: existing T-07 sprite renderer, unchanged tile/cook scale, centred in the 1187 px primary region; 733 px secondary region with the chosen board B rail. DOM text uses 89/34/21 px tokens. Gold ring uses an 8 px token border and an ease-in-out arc. Title crossfade and completed tick pulse occur once per step. Reduced motion changes state immediately and cancels running motion.
- Phone: existing stick and four face buttons remain mounted. `highlighted?: boolean` adds gold emphasis without changing input meaning. Generic header hook consumes existing text/one-option controls named `header-heading` and `header-action`, retaining audience and action validation. Leader alone receives Skip tutorial.
- Room fact edge accepted by the replacement brief: reloading the TV after finishing or skipping the tutorial but before completing a real round shows the tutorial again. The leader can skip it. Completing a real round suppresses it for the room, including after restoring the existing host snapshot.

## Source precedence applied

The round brief directs the worker to follow the game rules and DESIGN when they disagree and record each case:

- Rice is cooked in a rice cooker; it is not a choppable ingredient. The tutorial uses cucumber from a Cucumber crate, which the existing Chop rules accept. Phone/TV copy names cucumber.
- A real serving station accepts a completed recipe, not an unplated chopped ingredient. The final lesson uses a counter labelled Serve and the real cross placement rule. Completed practice portions are removed after placement so every cook can use it. This teaches placement; serving a full recipe remains part of the real round.
- The real Chop station requires cross to put down the ingredient, held circle to process it, and cross to retrieve it. Instructions include these necessary actions rather than implying circle processes held food.
- DESIGN fixes motion tokens at 233 ms for base transitions and exits at 0.8 of entrances. The title uses the slow token (377 ms incoming, 302 ms outgoing), with exitOnly on the outgoing title. The ring uses the existing longer arc token and chosen ease-in-out curve.
- Long instructions wrap at 34 px within the rail rather than shrinking below the decided TV type size to force one line. Colours, surface treatment and phone target floors come from current tokens, taking precedence over older illustrative board values.

## Tests

Written simulation tests: `src/rules/tutorial.test.ts` covers 1/4/8 cook completion, leader skip at every step, disconnect and leave, deterministic restored state, no deadline, no orders or score, and firstInRoom gating. `src/tutorial-conformance.test.ts` covers first-run scenarios at 1/4/8 cooks with disconnect and skip through the shared kit. Existing picker/play conformance remains in place.

Generic tests: `packages/platform/src/game/highlight.test.ts` covers schema validation, unchanged tap meaning, output comparison, header audience/action checks and phone packing; `packages/controller-kit/src/layout-renderer.test.ts` checks stable highlighted nodes. `apps/web/src/first-in-room.test.ts` covers new room, completed zero-score round, different game and C-22 snapshot restore.

DOM tests, written for the integrator: `apps/web/src/tabao-tutorial.dom.test.ts`, covering every step at TV 1920×1080 and 1280×720, phone 667×375/844×390/932×430, leader/non-leader, target floors, highlight, safe bounds and reduced-motion state changes. It also checks normal ring easing.

## UAT

The integrator commits and runs UAT for the review fixes (round13 is the reviewed baseline):

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- T-10-tutorial --phones 3 --out round14
```

`uat/slices/T-10-tutorial.mjs` pairs three real phones, readies the picker, captures each TV lesson at 1920 and Move at 1280, captures leader and non-leader at 844×390 on each lesson, drives all three cooks through all four lessons using real phone pointer input, waits for the real round to finish and checks Play again has no tutorial. A fresh room covers reduced motion and leader skip at step two. Both move transitions have frame strips. The only dev observation is a read-only public renderer snapshot; no simulation state is injected.

## Close-out

Branch: `issue/T-10-tutorial-r2`. No commit, verify, UAT, perf, install or Blender run by this worker, as required by the round briefs. Screenshot and performance acceptance are recorded by the integrator below. Earlier checks are recorded in `uat/evidence/T-10-tutorial/round1c-checks.md`; round-2 fixes and the earlier sandbox load-gate blocker are recorded in `uat/evidence/T-10-tutorial/round2-checks.md`. Round 2b removes the load gate by explicit user instruction; results and additional fixes are recorded in `uat/evidence/T-10-tutorial/round2b-checks.md`.

Round 3 fixes the leader-only header height regression: the skip action uses the existing compact Menu pill with a 144 × 55 px absolute touch target, and reserves only horizontal space. Added a CSS height contract test and leader/non-leader DOM height comparisons without changing face floors or fit thresholds. The integrator’s DOM build stubs remain intact. Round-3 check results are recorded in `uat/evidence/T-10-tutorial/round3-checks.md`.

All five permitted round-2b and round-3 checks passed. Implementation is awaiting the integrator’s DOM/UAT run, visual inspection and independent review. TR-055 is not ready to mark done.

## Requests

- Run the written DOM tests and three-phone UAT; inspect every still and both strips. No UAT execution or screenshots were authorised for this worker.
- Cucumber and counter placement substitutions are accepted for round 2. No recipe rules were weakened for a tutorial exception.

## Round 4 — integration with final T-09 (TR-055, CTRL-009, PLAT-006)

The tutorial conformance fixture was out of date with final T-09's all-ready
rule. Its tick-zero-only Ready script could meet an all-disconnected membership
replay tick, which correctly leaves the picker open. Returning cooks were never
readied, and the tick-two-only skip could also miss the tutorial. The fixture now
reads each phone's current controls on every step, readies only unselected Ready
options and sends Skip only from the current leader when offered. The explicit
tick-two disconnect remains. The kit, game rules and minimum-player expectations
are unchanged; the full conformance run, including join/leave replay, passes.

The two host-keyboard failures and the Rabakz load-failure setup failure were
exact mock-argument mismatches introduced by T-10's optional first-in-room
argument. Their existing behaviour assertions remain; the expected calls now
also require `true` for the new room's first-in-room fact (and an explicit
`undefined` settings argument for starts without settings). Production host,
first-in-room, setup and local-input code needed no change. D-287's TV single-option
taps, once-per-press handling, held-at-bind suppression and quick-tap latch retain
their existing tests and implementation.

Files changed: `games/tabao-rush/src/tutorial-conformance.test.ts`,
`apps/web/src/host-keyboard.test.ts`, `apps/web/src/game-setup.test.ts` and this note.

Checks run sequentially with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false` and a
600-second timeout per command:

- Requested Vitest selection, with two workers and all three exclusions: passed,
  151 files, 2,208 tests passed / one skipped, 304.63 seconds.
- `pnpm exec tsc -b`: passed, 1.90 seconds; no new emitted files outside `dist`.
- Requested ESLint paths with `--max-warnings 0`: passed, 18.64 seconds.
- `pnpm run lint:design`: passed, 550 files scanned, 0.34 seconds.

Close-out / Requests: no commit, verify, UAT, installation or DOM test run.
Integrator should run `apps/web/src/tabao-tutorial.dom.test.ts`,
`apps/web/src/tabao-cook-picker.dom.test.ts`,
`apps/web/src/tabao-cook-picker-motion.dom.test.ts` and
`apps/web/src/host-keyboard.dom.test.ts`, then perform the outstanding UAT and
visual review. This round alone does not establish visual acceptance of TR-055.

## Round 5 — main merge resolution (TR-055, PLAT-025)

Resolved all six conflicted web files in place, retaining both the room's
first-game tutorial fact and C-21/D-285 late-join team assignment. The shared
signature is `start(gameId, room, settings, options?: { firstInRoom?: boolean;
assignTeam?: (seat: number, team: TeamId) => void })`; `setup` retains its third
optional `firstInRoom` argument. The browser forwards both start options and
preserves `allowsRunningJoin`. The adapter overlays `firstInRoom` on the prepared
context and conditionally forwards `assignTeam` to `createSession`.

The host passes both options in one call for selected settings and defaults
(`chosenSettings.get(gameId)` is undefined for defaults). It retains the team
assignment closure, post-load `.then` guards, adapter join-policy query and
metadata fallback. All conflicted start expectations assert both options; the
late-join test double and adapter test use the same signature. No existing
assertions were removed.

Checks ran one at a time with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false` and a
600-second timeout per command:

- Requested Vitest selection, two workers and three exclusions: passed, 162 files,
  2,442 tests passed / one skipped, 253.34 seconds.
- `pnpm exec tsc -b`: passed; no emitted files outside `dist` were found.
- Requested ESLint paths with `--max-warnings 0`: passed on rerun. The initial
  run flagged six unsafe `any` assignments from `expect.any(Function)` in object
  matchers; casting those matcher values to `unknown` fixed lint without changing
  runtime assertions.
- `git diff --check`: passed. The requested conflict-marker grep printed nothing.

Close-out / Requests: no commit, verify, UAT, installation or DOM test run.
Staging the resolutions was blocked by the sandbox: it cannot create the Git
index lock in the parent repository's `.git/worktrees/T-10` directory. The merge
remains in progress; the integrator must stage the eight edited web files and
this note to record the resolutions.

Integrator should run `apps/web/src/tabao-tutorial.dom.test.ts`,
`apps/web/src/tabao-cook-picker.dom.test.ts`,
`apps/web/src/tabao-cook-picker-motion.dom.test.ts`,
`apps/web/src/host-keyboard.dom.test.ts`, `apps/web/src/late-join.dom.test.ts`,
`apps/web/src/game-setup.dom.test.ts` and
`apps/web/src/game-setup-host.dom.test.ts`, then perform the outstanding UAT and
visual review. This round does not establish visual acceptance of TR-055.

## Round 7 — second-pick investigation (TR-055)

The reported ignored Ready presses have **not been reproduced or fixed in
production code**. No platform/controller behaviour was changed on an
unconfirmed diagnosis.

Added `games/tabao-rush/src/replay-picker.test.ts`: three players complete the
first pick, skip the tutorial, complete a shortened real round, and all Ready
successfully in a second session in the same room. A second test verifies that
each Ready acknowledgement advances the game layout revision and replaying an
old Ready cannot toggle the player back to unready.

Before any production change, a temporary investigation test also exercised two
matches through the actual web host, session adapter, session links,
`viewChannel` and phone models, with asynchronous message delivery. Both picks
succeeded. That experiment rules out a simple private-view/layout revision reset
on this path, but does not reproduce browser event wiring, asset loading delays
or rendering. It was not retained because importing the web application into a
game's test compilation would cross its TypeScript project boundary.

There is a separate ambiguity in the UAT retry: its loop can make **zero**
presses when `.tr-cook-picker[hidden]` matches an outgoing first-round screen.
New phone layouts are published before host screen preparation finishes, and
the shell retains outgoing screens during a crossfade. This is a plausible
explanation for the first two phones being plain Ready and the third selected;
it is not established by the existing stills. The UAT script retains the retry
and now fails immediately with the phone number and actual press count if no
acknowledgement was observed. A hidden picker alone is only accepted after at
least one press; it no longer masks a zero-press failure. No UAT was run.

Close-out / Requests: TR-055 remains unresolved for the reported browser
failure. The integrator needs a trace of actual Ready pointer events and sent
`rev`/`viewRev` values, the matching host receipts, and whether the retry made
zero presses. Run `apps/web/src/tabao-tutorial.dom.test.ts`,
`apps/web/src/tabao-cook-picker.dom.test.ts`,
`apps/web/src/tabao-cook-picker-motion.dom.test.ts`,
`apps/web/src/session-adapter.controller-lock-swap.dom.test.ts` and
`apps/web/src/phone-controller-resize.dom.test.ts`, then the outstanding UAT and
visual review. No trackers, commits, verify, UAT or installations were performed.

Checks ran one at a time with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false` and
a 600-second timeout for each command:

- Requested Vitest selection with two workers and all three exclusions: passed,
  221 files, 3,540 tests passed / one skipped, 372.21 seconds. The final two new
  picker tests also passed separately (one file, two tests).
- `pnpm exec tsc -b`: passed; no new emitted files outside `dist` were found.
- Requested ESLint paths with `--max-warnings 0`: passed.
- `pnpm run lint:design`: passed, 567 files scanned.

## Round 8b — finish review fixes (TR-055, TR-056, CTRL-005)

Continued the preserved round-8 changes on `issue/T-10-tutorial-r2`.

- Must 1: fixed root-stage backdrop (fill, dots, caption), separate transparent kitchen textures, whole-pixel offset; renderer regression and composite UAT pixel/caption assertions.
- Must 2: Pick up no longer selects `header-action`. The local leader skips with K or pad Back; Back leaves only in the lobby. Generic local-leader presentation context selects the TV hint. Local-player and pad tests cover the separation.
- Must 3: current row uses panel ink and a highlight bar.
- Must 4: shared `Theme.highlight` / `--ka-highlight` replaces game-specific accent borrowing. Light themes use #805700; dark themes use #E0A63A. Contrast is checked at 3:1 against every backdrop treatment paint, with no new exceptions.
- Must 5: both kitchen textures and backdrop upload before readiness; level changes select cached textures without encoding the root backdrop. Station panels reserve space for all practice boards before readiness. Renderer tests assert no new textures or encodes at tutorial exit.
- Must 6: tutorial joiners lose spectator status and spawn when round one starts; rules regression covers join then skip.
- Should 2/3: Act copy explicitly says to retrieve the food; three chop boards are ringed, and the 1/4/8-cook completion test exercises all boards.
- Should 4/5/6/7: outgoing title uses exitOnly (377 ms incoming / 302 ms outgoing); rings outset by 13 px; phone highlight has raised stacking; rail right inset is 55 px.
- Should 8/9/10/13: rail fades/slides in with ease-out and a 20% shorter exit; kitchen uses the shared ease-in-out curve sampled before rendering; reduced motion jumps. Viewport style writes are cached, skip target assertions require 55 px, and arriving rings pulse once with ease-out.
- Should 12: branch and review-baseline/UAT instructions updated. Should 1 (Serve substitution) and 11 (21 px hints) remain integrator decision-log work, as requested.

All authorised final checks pass. Browser tests, UAT, visual acceptance and performance runs remain with the integrator. No joiner still was added; the rules regression supplies the permitted fallback. Existing round13 evidence is preserved and no new screenshot acceptance is claimed.

Close-out: no commits, tracker edits, installs, verify, browser, UAT or performance runs. TR-055 awaits integrator browser/UAT/performance evidence and independent review.

Requests: run `apps/web/src/tabao-tutorial.dom.test.ts`, `apps/web/src/tabao-cook-picker.dom.test.ts`, `apps/web/src/tabao-cook-picker-motion.dom.test.ts`, `apps/web/src/session-adapter.controller-lock-swap.dom.test.ts`, and `apps/web/src/phone-controller-resize.dom.test.ts`; run the round14 three-phone UAT command above, inspect the stills/strips and pixel checks, and capture the tutorial entry/exit motion and performance evidence.

Integrator DECISIONS text:
- Shared attention token `Theme.highlight` / `--ka-highlight`: #805700 for light console/Tabao themes and #E0A63A for dark Rabakz/Peek themes; at least 3:1 against controller backdrop treatments; tutorial rings and generic controller highlights consume it.
- TV-seat tutorial skip: leader-only K on keyboard or Back (pad button 8), independent of Pick up (Space/Enter/pad A); Escape remains pause, Back leaves only in the lobby, and TV hints distinguish a local leader from a phone leader.

## Round 9 — tutorial performance scenario (TR-055)

`?tutorial=1` on the renderer fixture now uses first-room match setup and readies all seeded cooks. The existing deterministic movement runs for 600 tutorial ticks; the leader then sends the real skip action, entering the real round. Normal fixture URLs retain their behaviour. `data-tr-phase` publishes tutorial/play. With `perf=1`, the tutorial waits for the scenario start hook so capture includes the first simulation tick.

`uat/perf/tabao-rush-tutorial.mjs` uses eight cooks and starts frame capture before that hook. It asserts tutorial entry and measures until at least 600 observed frames and 10 seconds in play, including the tutorial-to-round texture hand-off. Evaluations use 120-frame chunks; the total window is bounded to 3600 observed frames. This is diagnostic renderer evidence, not a busiest full-round or phone-latency assessment. The pure fixture helper has a deterministic eight-cook frame-600 regression test.

Close-out: no browser, perf, installs or commits run. Integrator command: `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm perf -- tabao-rush-tutorial --phones 8`. This is a hostPage scenario: eight scripted cooks, zero paired phones; `--phones 8` labels the output folder (`perf-8`) rather than creating phones. Check results are recorded below.

Requests: integrator runs this scenario on a quiet machine and reviews the hand-off capture; bare `pnpm perf` still supplies the separate simulation assessment requested by must-fix 5.

Round-9 checks (sequential, each with a 600-second subprocess timeout; `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`, `VITEST_MAX_WORKERS=2`):
- `pnpm exec vitest run games/tabao-rush --exclude '**/*.dom.test.ts' --exclude '**/layout-fixtures*' --exclude '**/team-polish*'`: passed, 40 files / 434 tests, 198.32 s; launch load 3.07.
- `pnpm exec tsc -b`: passed; launch load 5.69.
- ESLint on the four changed TS/MJS files with `--max-warnings 0`: passed; launch load 5.35.
- `git diff --check`: passed. Existing round13 and round8b evidence was preserved.

## Close-out (integrator, 2026-11-20)

- UAT on the merged tree: `uat/evidence/T-10-tutorial/round14/` (3 phones), every still and strip looked at; the visual-review table is in its REPORT.md.
- Perf: `uat/evidence/T-10-tutorial/perf-tutorial/` (8 scripted cooks, leader skip at tick 600, development build, headed Chromium): frames p95 18.0 ms, max 18.8 ms, no long tasks; PERF-001 not assessed. `pnpm perf`: PERF-040 passes for every game.
- Verify: verify4 passed after the Peek Poker cards were re-rendered for the new `themes.ts` input (pixels unchanged).
- Review: re-review clean (no must-fix). Follow-ups in T-10b: ring contrast on counters and overlapping board rings, the current-step row offset, the leader hint size, and moving the card tokens out of `themes.ts`. The level texture fallback goes to T-17.
