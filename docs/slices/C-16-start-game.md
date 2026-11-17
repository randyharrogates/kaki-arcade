# C-16 — Start a game from the picker

## Goal and acceptance

Connect picker Start to the authoritative host session, public TV screen and phone shells.
Requirements: PLAT-022, PLAT-023 (in progress), PLAT-024, PLAT-030, PLAT-031, PLAT-033,
NN-1, NN-2; rendering and transfer constraints PERF-001 and PERF-020. Preparation and assets
finish before stepping. Authenticated seats send inputs and receive layouts/private views.
Results lead back to the picker with the same players; subscriptions and buffers stop cleanly.
Pause and quit screens belong to a later issue.

## Round 3 (2026-11-17, D-057)

Read the round 2 report, board 3 results source, DESIGN §1–6 and PLAT-022/024. This round
supersedes round 2's descriptions of results, layout revisions, heading interruptions,
serialised display keys, content resolution and verification/staging readiness.

1. `session-links.ts` gives layouts successful-send-only wire counters per connection, just
   like private views. Counters survive session unsubscribe/resubscribe; drops clear them.
   Both the envelope and layout revision use the wire counter. Taps must match that counter
   and are translated back to the current session revision. Regression tests cover both
   retained phone connections across start → results → picker → start and reject old taps.
2. Fade-mode `Overlap` retains each outgoing identity until its own exit finishes. Previously
   an interrupted crossfade replaced its still-visible outgoing line. The snapshot regression
   renders picker → start → starting without finishing the first exit and checks that all
   three headings remain. Motion checks pin overlapping opacity ramps and shorter exits.
3. Console results use the board's 1 : 1.618 columns: winner/name in the display face and
   seat/score on the left, every ranked player on the right. Text starts at 34 px; spacing,
   colours, type and the existing marble/panel surface treatments use UI tokens. The TV has
   cross/circle phone hints and no buttons. The leader's phone has both corresponding
   buttons. Enter plays again and Escape opens the picker; their visible hint appears only
   after keyboard use. Tests check the TV tree, keyboard actions, repeat suppression,
   authorisation and same-game/same-player restart. The existing start path supplies the
   same default settings and prepares a new seeded match.
4. A registry capability retains the game renderer at the end before console results. Rabakz
   uses this stage; the leader presses Continue (or Enter on the TV), after which both phone
   choices appear. Frame stepping has stopped. **This checkout's Rabakz renderer retains its
   final reveal; it does not yet draw R-05's podium.** The handoff preserves the game renderer
   for that separate work rather than implementing its artwork in C-16. The adapter test
   pins final-view → Continue → console results, including stop/cancel behaviour.
5. The bank resolver and virtual-module declaration now live in `@kaki/content-rabakz/session`,
   and the in-memory Vite builder lives at `@kaki/content-rabakz/vite`. The registry has one
   Rabakz registration and calls the content package's functions. Runtime self-hashing was
   removed: the content build validates and hashes the trusted bundled bank once; runtime
   selection checks readiness/quotas using the declared build metadata. No runtime byte
   integrity claim remains. Package export entries were added without dependencies or a
   lockfile change.
6. Rabakz exports a structural display key from its host entry. The adapter uses it instead
   of serialising the whole public view each simulation step. Other games retain structural
   comparison as a fallback. Unchanged-view tests still pin stable display identity.
7. Leaving `starting` through picker/room changes invalidates the load and stops the session.
   Tests expire the last seat during a pending start and reject its late completion.
8. Only the `open` picker input returns results to the picker. Parameterised tests reject
   previous/next/select/back as picker-return actions; `start` restarts the same game.
   Watcher/stranger/stale-input tests remain. Removed `emptyPreparation` from production and
   the duplicate controller-kit TypeScript reference. Test TypeScript now enables Preact
   JSX resolution for component unit tests.

## UAT readiness

Updated `uat/slices/C-16-start-game.mjs` for the integrator. It requests a header-only strip
at 100 ms intervals with slow=10 and asserts an incoming and outgoing heading both have
positive opacity in at least one sampled frame. It captures phone 2 at results, both phones
at the returned picker, then starts Rabakz again in the same room and checks/captures both
controllers. It also captures the game-owned end stage before Continue to console results.

No UAT or performance run was invoked this round, and no files under `uat/evidence` were
written. Captures listed above are script coverage awaiting execution and visual inspection,
not evidence that the screenshots exist or that visual acceptance has passed.

## Verification — round 3

- `pnpm exec vitest run apps/web tools/check_budgets.test.ts`: 27 files, 279 tests passed.
- `pnpm exec tsc -b tsconfig.build.json --pretty false`: passed.
- `pnpm exec eslint <changed TS/TSX/MJS files> --max-warnings 0`: passed.
- `pnpm run lint:design`: passed.
- `git diff --check`: passed.

These are the requested targeted checks. No full verify, production build, UAT or performance
run was performed. Earlier round 2 verification claims are historical, not this round's result.

## Requests

- Integrator: run the revised UAT and inspect the header strip, results layout, both phones,
  repeated same-room start, and keyboard hints; run independent review and quiet-machine
  performance before closure. Check the game-owned final stage again when R-05 is integrated.
- PLAT-022/023 remain in progress until UAT/review; pause/quit and real-device wake/network
  checks remain outside this round. D-099's netcode closure behaviour remains outside this lane.
- Future non-data asset manifests still require resolvers/decoding before RAF; present games
  declare no such assets. No contract or shared tracker was changed.

## Close-out

Branch: `issue/C-16-start-game`. Implementation and targeted checks are ready for independent
review; requirement closure awaits the integrator. No push, merge, deployment, dependency,
lockfile, shared tracker or evidence changes. Local commit status is recorded below.

Local staging was attempted after the checks passed. The sandbox denied creation of
`/Users/randy/projects/personal/web-apps/kaki-arcade/.git/worktrees/C-16/index.lock` with
“Operation not permitted”. Nothing was staged or committed. The integrator must stage and
commit on the issue branch, for example:
`fix(web): repeat sessions and console results (PLAT-022, PLAT-024, PLAT-031, NN-5)`.

## Round 4 (2026-11-17)

Read the round 3 integrator report and opened `39-host-rabakz-results-tv.jpg` and
`c16r3-28crop.jpg`. Fixed the three reported faults under PLAT-024 / NFR-A11Y:

- Console results announce one winner, two named first-place players, or the count of three
  or more tied players. Zero scores remain tied. Show up to four first-place seat badges,
  then the remaining count as `+n`.
- The summary score includes `point` / `points`, uses the mono face at 55 px, and has a 21 px
  gap from the badge group. Badges keep their own 55 px size rather than inheriting score size.
- The game-final hint explicitly uses the game's background secondary text token; Rabakz
  therefore uses secondary pink on plum at 34 px. A component test checks the actual colour
  against the base and every halftone paint with the existing contrast helper (at least 4.5:1).

Verification: requested Vitest run passed (28 files, 287 tests), build TypeScript passed,
ESLint on changed TS/TSX files passed, and design lint passed. Regression tests cover one
winner, singular point, two-way tie, zero tie, three-way tie, six-way badge overflow and score
spacing/type. No full verify, build, UAT or performance run; no evidence files written.

### Round 4 Close-out and Requests

Ready for independent review on `issue/C-16-start-game`. Integrator: rerun the 0–0 UAT and
inspect both the console summary and Rabakz final hint; visual acceptance and quiet-machine
performance remain yours. No shared trackers, contracts, dependencies or lockfile changed.

Local staging for round 4 was denied: the sandbox cannot create the parent repository's
`.git/worktrees/C-16/index.lock` (Operation not permitted). Nothing staged or committed.
Integrator commit suggestion: `fix(web): tied results and final hint contrast (PLAT-024, NFR-A11Y)`.

## Round 5 (2026-11-17, D-120)

Requirements: PLAT-022, PLAT-024, PLAT-030/031/033, NN-5, PERF-001 and RZ-032.
The request's copied D-120 supersedes the round 4 console sizes above.

1. `Overlap.tsx` renders current and outgoing fade layers in one flat keyed list. Whole
   host surfaces request the UI `crossfade()` (outgoing opacity held at one); transparent
   heading fades retain their shorter fading exit. `Overlap.dom.test.ts` bundles an in-memory
   browser fixture using real Preact hooks, counts screen mounts across the change and checks
   that its viewport remains in the outgoing layer at full opacity. No server, screenshots
   or evidence output is needed by this regression.
2. `host.test.ts` clears the stop spy immediately before the last-seat drop. The new pending
   start/back regression asserts stop and no late display/playing transition. `picker.ts`
   now accepts the leader's Back while starting only while the room remains in the lobby;
   platform tests also reject Back once playing.
3. Results name the game from `gameMetas`, constrain the chip to its own width and use
   144 px headline / 144 px badge / 89 px bold mono score. A tied headline is measured at
   144 px after layout, font readiness and resize; beyond three lines it steps to 89 px.
   `results.test.ts` covers the step boundary and the CSS sizes.
4. Results receive `active` from their overlap layer. A layout effect removes the keyboard
   listener synchronously when the layer becomes outgoing. The host's return action requires
   results phase and increments the load-attempt fence. Tests reject inactive keyboard
   registration and stale results actions during a new start. The picker integration fixture
   now ends its session before invoking the results-only return action.
5. Team results headline the winning Red/Blue team or their shared first place. Team totals
   precede player rankings; a teams fixture covers both a win and a tie (RZ-032).
6. Final-hint colours are registry capabilities. The hint component contains no game ids;
   Tabao Rush, Peek Poker and Rabakz each register their own theme. The Tabao Rush mapping
   has a regression alongside the existing Rabakz contrast check.
7. Session-link regression pins failed-send revision reuse and reset to zero after drop/resend,
   including the layout's own revision and the envelope counter.
8. Rabakz public display keys compare the view fields without allocating arrays or strings
   each tick, retaining a numeric key until a field changes. Tests pin unchanged copies,
   score changes and phase changes.
9. Choice-shape stroke width uses `SHAPE_STROKE` from UI tokens; the raw CSS width is removed.
10. The UAT strip starts concurrently with Continue and requires a visible outgoing Rabakz
    viewport within its first three sampled frames.

### Round 5 verification

Only the requested targeted checks were invoked. TypeScript passed. Final ESLint and design
lint results and the final Vitest count are recorded below. Earlier test attempts exposed
and fixed the missing starting/back transition, updated the results-only integration
fixture and corrected the new browser fixture's bundling setup. The initial unrestricted
worker run also hit conformance test timeouts; limiting Vitest to two workers resolved those
without changing a timeout or test threshold.

The browser regression cannot execute here: Chromium exits with SIGTRAP because the macOS
sandbox denies `bootstrap_check_in ... MachPortRendezvousServer` (Permission denied 1100).
The in-memory browser fixture bundles successfully. This is a failed browser launch, not a
passed mount assertion, and the test has not been disabled or skipped.

### Round 5 Close-out and Requests

Implementation is ready for independent review on `issue/C-16-start-game`; this is not a
clean-review or visual-acceptance claim. Integrator: run the DOM regression with browser
launch permitted, run the revised UAT and inspect the first transition frames and D-120
results (including team/tie layouts), then perform independent review and performance checks.
No full verify, production app build, UAT or performance run was invoked. No evidence files,
shared trackers, contracts, dependencies or lockfile were changed.

Final checks: `pnpm exec tsc -b tsconfig.build.json --pretty false` passed; ESLint on all
changed TS/TSX/MJS files passed; `pnpm run lint:design` passed (319 files); `git diff --check`
passed. The requested `pnpm exec vitest run apps/web packages/platform games/rabakz` was
repeated with `VITEST_MAX_WORKERS=2`: 1,413 passed, one existing skip, one browser-launch
failure as described above (73 files). No timeout or other threshold was changed.

Local staging was denied when Git tried to create the parent repository's
`.git/worktrees/C-16/index.lock` (Operation not permitted). Nothing staged or committed.
Integrator commit suggestion: `fix(web): preserve final screens and D-120 results (PLAT-022, PLAT-024, RZ-032, NN-5)`.

## Round 6 (2026-11-17)

Requirements: PLAT-022, PLAT-024 and NN-5. Read the round 5 integrator's look and
opened `c16r5-strip.jpg` and `24-strip-rabakz-start-crossfade.jpg`.

- Whole-screen `Overlap` layers now carry the existing `ka-surface` recipe: an opaque
  console cream base with its single token treatment. Game renderers continue painting their
  own opaque game surface above it. Heading layers remain transparent. The existing 4A
  crossfade holds outgoing opacity at one until the equal-duration incoming fade completes;
  the keyed outgoing renderer remains mounted until then.
- The browser mount regression loads the actual UI stylesheet and checks that the incoming
  layer has the console's opaque background and a treatment, alongside the existing outgoing
  mount/opacity assertions.
- UAT samples a lossless pixel at (1800, 1020), in the empty lower-right margin, for every
  start/results strip frame. It checks each RGB channel moves monotonically between endpoints
  (one integer level of rounding tolerance), remains within them, and finishes at cream for
  results or the computed game plum for start. Sampling/decoding stays in memory. The nine
  samples now span 4.8 seconds, covering the slowed 3.77-second 4A fade and start latency.
  The decoder page closes even on failure. Tabao Rush retains its placeholder strip.

### Round 6 Close-out and Requests

TypeScript (`pnpm exec tsc -b tsconfig.build.json --pretty false`), ESLint on the three
changed TS/TSX/MJS files, and `pnpm run lint:design` passed. Vitest results follow below.
Only the requested checks were run; no full verify, UAT or performance run. No evidence files
were written. Looking at the previous strip establishes the fault, not visual acceptance of
this revision. Integrator: run the revised UAT, inspect results and picker → game strips,
execute the browser regression with Chromium launch permitted, and review independently.

Staging was denied when Git tried to create the parent repository's
`.git/worktrees/C-16/index.lock` (Operation not permitted). Nothing was staged or committed.
Integrator commit suggestion: `fix(web): paint overlap screen surfaces (PLAT-022, PLAT-024, NN-5)`.

Final Vitest: `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web packages/platform games/rabakz`
finished with 1,413 passed, one existing skip and one browser-launch failure (73 files).
Chromium is denied `bootstrap_check_in ... MachPortRendezvousServer` by the macOS sandbox
(Permission denied 1100, SIGTRAP); the fixture bundles but its assertions cannot execute here.
An earlier unrestricted repeat also hit five timeouts in existing platform invariant/conformance
tests; these passed with two workers, without changing tests or thresholds.

## Round 7 (2026-11-17, D-123 and D-124)

Requirements: PLAT-022, PLAT-024, NN-5, NFR-A11Y and RZ-032.

- D-123 replaces the tie-only line count with the entire winner column's scrollHeight
  against clientHeight at 144 px. Any overflow takes one step to 89 px; character wrapping
  remains enabled. The column has a constrained minimum height and its children do not
  flex-shrink, so measurement includes their full content. Refit after headline/keyboard
  changes, font readiness and resize. Unit cases pin the boundary and reviewer measurements.
- UAT adds isolated presentation captures for Cloud Noodle alone, with its keyboard hint,
  a 30-character single word, a team result and a three-way tie. Every capture asserts the
  winner column's last child lies within the screen's safe margin. Both pixel strips now
  require a sampled channel more than 13 levels from both measured endpoints, rejecting cuts.
- The browser mount regression pins both outgoing animation opacity keyframes at one and
  retains its finally browser close, as required by D-124. Browser tests remain in the main
  suite; the requested sandbox run excludes every *.dom.test.ts file.
- Removed the unused Back-while-starting transition and its host regression; all picker inputs
  are inert during starting. The existing last-seat room-change regression still pins stop.
- Team badges and rows use UI team colour tokens and TEAM_THEMES labels. Fade-mode Overlap
  no longer constructs an unused active tree. A returnToPicker comment explains the load
  attempt fence before stopping and reopening the picker.

### Round 7 Close-out and Requests

Requested Vitest command passed: 75 files, 1,481 tests passed, one existing skip. Build
TypeScript, ESLint on all changed TS/TSX/MJS files and design lint (341 files) passed.
No full verify, UAT, performance run or browser-backed unit test was run. No evidence files
were written. Integrator: execute the browser regression and updated UAT, inspect all new
captures and both strips, and perform independent review. These are capture instructions,
not a visual acceptance claim. No shared trackers, contracts, dependencies or lockfile changed.

Round 7 staging was denied: Git cannot create the parent repository's
`.git/worktrees/C-16/index.lock` (Operation not permitted). Nothing staged or committed.
Integrator commit suggestion: `fix(web): fit results within safe area (PLAT-022, PLAT-024, NN-5, RZ-032)`.

## Round 8 (2026-11-17, D-126)

Requirements: PLAT-022, PLAT-023; console results also fulfil PLAT-024 and NFR-A11Y.
Randy authorised this additional round. D-126 supersedes round 7's scrollHeight fit.

- The layout effect tries 144 → 89 → 55 px synchronously before paint, stopping at the
  first size whose first child top and last child bottom fit the screen's computed safe
  padding. Coordinates account for screen scaling. Headline/name, keyboard and results-mode
  changes, font readiness and resize refit the column. No intermediate React state is painted.
- Keyboard copy is one line: “Enter: play again · Esc: back”. Both action hints share a row.
  The results grid row is minmax(0, 1fr); ranking gaps step from 13 to 8 px, saving 45 px
  across the ten rows of an eight-player team result.
- Stub-element effect tests exercise all three sizes, verify both boundary measurements and
  re-execute the effect with changed keyboard dependencies. UAT preserves the existing cases,
  Preact module URL discovery and origin handling, and adds named two-way ties, two maximum
  length names with/without keyboard, team tie with keyboard and eight-player teams. Each
  fixture checks both ends of both columns against the safe area.

Reviewer-measured worst cases before this revision (Chromium, 1920 × 1080; safe y 55–1025):
Cloud Noodle / Pebble Puff tie with keyboard at 89 px: top 19, bottom 1061;
Red team / Blue team tie with keyboard at 89 px: top 19, bottom 1061;
two 12-character tied names without keyboard: -9 / 1089, with keyboard: -70 / 1150.
Eight-player teams (two team rows plus eight player rows) ended at 1042; seven players fit.
These are the reviewer's baseline measurements, not new measurements of this revision.

### Round 8 Close-out and Requests

Passed `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web --exclude '**/*.dom.test.ts'`:
28 files, 321 tests. Passed `pnpm exec tsc -b tsconfig.build.json`, ESLint on changed TS/TSX/MJS
files, and `pnpm run lint:design` (341 files). No full verify, browser launch, UAT, performance
run or evidence writes. No shared trackers, contracts, dependencies or lockfile changed.
Integrator: run the DOM tests and expanded UAT, inspect the captures, and independently review
D-126 fit, including both safe boundaries. Visual acceptance remains pending that work.

Round 8 staging was denied: Git cannot create the parent repository's
`.git/worktrees/C-16/index.lock` (Operation not permitted). Nothing staged or committed.
Integrator commit suggestion: `fix(web): fit results within safe margins (PLAT-022, PLAT-023, PLAT-024)`.

## Round 9 (2026-11-17, D-130)

Requirements: PLAT-022, PLAT-023; results presentation also covers PLAT-024.
Randy authorised this round and supplied D-130 from main.

- Results columns use minmax(0, 1fr) / minmax(0, 1.618fr), with a zero minimum on
  the ranking and its name track. Ranking names stay on one line with ellipsis;
  each name's title retains the complete name. No wrapping increases row height.
- Up to four tied winners show four seat badges. Five or more show three seats and
  a matching circular +N badge using accent tokens. Keyboard copy is the one-line
  “Enter: play again · Esc: game picker”. Unit cases cover four, five, six and eight
  tied players, the aggregate count and the exact keyboard copy.
- Results-fit UAT now covers both 1920 × 1080 and 1280 × 720. Added Tamil and
  cuneiform/ligature ties, eight mixed wide names in a two-way tie and a team tie,
  and five/eight-way ties with keyboard hints. Assertions check both columns against
  horizontal and vertical safe margins, the winner's 1 : 1.618 share within 1 px,
  and the badge row plus every badge inside the winner column.

### Round 9 Close-out and Requests

Passed `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web --exclude '**/*.dom.test.ts'`:
28 files, 324 tests. Passed `pnpm exec tsc -b tsconfig.build.json`, ESLint on changed
TS/TSX/MJS files and `pnpm run lint:design` (341 files).
No full verify, DOM tests, browser launch, UAT or performance run; no evidence writes.
Integrator: run the expanded UAT and DOM tests, inspect captures at both viewports and
independently review D-130. Visual acceptance remains pending. No shared trackers,
contracts, dependencies or lockfile changed.

Round 9 staging was denied: Git cannot create the parent repository's
`.git/worktrees/C-16/index.lock` (Operation not permitted). Nothing staged or committed.
Integrator commit suggestion: `fix(web): constrain results columns and tied badges (PLAT-022, PLAT-023, PLAT-024)`.

## Round 10 (2026-11-17, D-131)

Requirements: PLAT-022, PLAT-023; results presentation also covers PLAT-024.
Randy supplied D-131 and authorised this round under round 9's rules.

- The before-paint fit exhausts named text at 144 → 89 → 55 px. If it still
  overflows, it retries from 144 with “N players share first” or “Player N wins!”.
  Team wording is retained. Each resize/font-ready fit retries names first, so names
  return whenever they fit. The headline describes itself through the full ranking
  list, whose complete names remain available to assistive technology.
- The +N badge uses --ka-chip / --ka-chip-ink and labels itself “N more players”.
- UAT adds Arabic-ligature-first cuneiform and Tamil ties and a single Arabic-ligature
  winner, all with keyboard hints. Both viewports assert safe margins and exact
  headline text, including unchanged named text for existing cases. Only the new
  1920 px cases capture stills; their 1280 px counterparts assert without captures.
- Unit tests cover fallback only after named 55 fails, restarting at 144 and settling
  at each allowed size, seat-number copy, tie copy, restoration of names on resize,
  the ranking description link and the aggregate badge tokens/accessible label.

### Round 10 Close-out and Requests

Passed `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web --exclude '**/*.dom.test.ts'`:
29 files, 382 tests. Passed ESLint on the three changed TS/TSX/MJS files and
`pnpm run lint:design` (350 files).
`pnpm verify` passed workspace checks but cannot pass typecheck: pre-existing merge
conflict markers in `apps/web/src/controller-demo.tsx` at lines 2, 5 and 11 (TS1185).
Those unrelated K-04 changes and all existing staged changes remain untouched.
No browser, UAT, DOM or performance run and no evidence writes, following round 9's
execution scope. Integrator: resolve the existing merge, run full verify and expanded
UAT, inspect captures and review D-131. Visual acceptance remains pending.
No shared trackers, contracts, dependencies or lockfile changed.

Round 10 staging was denied: Git cannot create the parent repository's
`.git/worktrees/C-16/index.lock` (Operation not permitted). Nothing from this round
was staged or committed. Integrator commit suggestion:
`fix(web): bound results headlines with seat and count fallback (PLAT-022, PLAT-023)`.

## Round 11 (2026-11-17, D-131)

Requirements: PLAT-022, PLAT-023. The integrator confirmed round 10 was not clean:
headline element boxes fitted while cuneiform glyph ink crossed the final-scores chip.
Opened the supplied p6-single-C-1920.png, crop6.png and crop5.png evidence.

- The D-131 fit now checks actual canvas ink ascent/descent for every rendered line,
  using DOM baseline probes in the computed font, alongside both column ends.
  Ink outside a line box rejects that size: names exhaust 144 → 89 → 55 before
  seat/count fallback retries. Headline paint also uses overflow: clip with the
  34 px token (--ka-space-34) as its safety margin (corrected in round 13).
- A visually hidden description preserves the original headline sentence through
  visual fallback. Tests follow aria-describedby and check its text content.
- Winner badges have a group role; +N has hidden “N more players” text and hides
  its visible glyphs from assistive technology.
- UAT adds the single cuneiform winner with keyboard hints at both viewports.
  Every results-fit case compares decoded chip pixels with the scoped headline
  visible and visibility:hidden, asserting identical pixels. D-131 bounded text
  is accepted when the new ink-aware fit requires it.
- Fake ink measurements cover ascent above and descent below a line box, plus
  multiple lines that fit. Existing fitting, fallback and accessibility cases pass.

### Round 11 Close-out and Requests

Only the four requested checks ran: targeted Vitest passed 2 files / 77 tests;
web TypeScript noEmit passed; targeted ESLint passed (3 files); design lint passed
(350 files scanned). Initial test/mock and lint failures were corrected before the
passing rerun. No verify, whole-suite tests, UAT or browser ran; no evidence writes.
Integrator: run UAT, inspect both viewports and independently review the ink-aware
D-131 behaviour before acceptance. Visual acceptance remains pending.

## Round 12 (2026-11-17, D-131)

Requirements: PLAT-022, PLAT-023. Opened the supplied round 10 and round 11
comparison JPGs; round 11's per-line-box ink bound caused the size regression.

- Ink now fits against chip bottom + 5 px through badge row top − 5 px,
  and the winner column's inline edges, in unscaled headline coordinates.
  Ascenders and descenders may cross line boxes inside that space. The 34 px
  paint clip margin covers the accepted 29 px overshoot within the flex gaps.
- Named sizes remain 144 → 89 → 55; fallback restarts from 144. Fake-measurer
  tests accept 144 px line-box overshoot, reject chip/badge/inline intrusion,
  and exercise fallback restarting at 144 after named ink fails at every step.
- Every results-fit case checks the allowed size steps. At 1920, bounded and
  Cloud Noodle headlines must be at least 89 px. The integrator's whole-pixel
  chip comparison and its >24-level changed-pixel threshold are unchanged.

### Round 12 Close-out and Requests

Only the four requested checks ran: targeted Vitest passed 2 files / 79 tests;
web TypeScript noEmit passed; targeted ESLint passed (3 files); design lint passed
(350 files scanned). No verify, whole-suite tests, browser or UAT; no evidence writes.
Expected at 1920 with hints: Cloud Noodle wins! 89 px; Player 1 wins! 144 px;
2 players share first 89 px; 8 players share first 89 px. These are expectations
from the descending fit and fixture geometry, not browser measurements this round.
Integrator: run the updated UAT and review font sizes and unchanged chip pixels.
No requests outside the authorised lane.


## Round 13 (2026-11-17, D-131)

Requirements: PLAT-022, PLAT-023. The integrator confirmed round 12 kept ink off
chip/badges but rejected fitting names. This round removes inline baseline markers.

- Read-only Range rectangles over Intl.Segmenter graphemes recover rendered lines;
  canvas font descent places each line on its existing baseline. No DOM insertion,
  normalisation or code-point splitting changes wrapping during measurement.
- Canvas ink bounds use chip bottom + 5 px and badge top − 5 px. Horizontal ink may
  overhang the column by the existing 34 px paint margin, bounded by the screen.
  A calculated inset clip uses exactly those four acceptance bounds. This replaces
  the uniform overflow clip, which could hide accepted ink or include neighbours.
- The hidden full-sentence description has aria-hidden=true. Only bounded fallback
  headings receive aria-describedby; named headings retain their own complete name.
- UAT adds Ajay Kumar, Qi / Yu, jumpy / gigi, Ah Beng / Siew Ling, 🍜 Noodle and
  😀😀😀. Every scenario at both viewports independently derives its exact expected
  sentence and size by trying visible, unclipped ink at 144 → 89 → 55. It compares
  shown/hidden full-screen pixels outside the chip/badge gap and horizontal paint
  bounds, and checks column ends. Larger candidates must fail before a smaller
  size is expected; all named candidates must fail before fallback is expected.
  Every selected headline also has identical full-screen pixels with/without clipping.
  The expected pairs are derived independently in the browser rather than accepting
  any of the three sizes or either sentence. Explicit 1920 pins require Ajay and
  Qi / Yu at 144, the ligature winner at 89, and cuneiform fallback at 144.

Expected sizes from the descending-fit logic (not browser measurements): Ajay Kumar
144, Qi and Yu 144, jumpy and gigi 89, Ah Beng and Siew Ling 89, 🍜 Noodle 144,
😀😀😀 144. Both viewports use the same 1920 × 1080 board and uniform scaling, so
these expectations are the same CSS sizes at 1920 and 1280; the independent pixel
oracle checks the actual rasterisation separately at each viewport.

### Round 13 Close-out and Requests

Only the requested validation commands ran. Targeted Vitest passed 2 files / 80 tests;
`pnpm exec tsc -b` and root `pnpm exec tsc -p tsconfig.json --noEmit` passed;
targeted ESLint passed (3 files); design lint passed (350 files scanned).
No verify, whole-suite Vitest, browser, UAT or evidence writes. No trackers,
dependencies or lockfile edits. Integrator: execute and inspect the expanded UAT,
including its maximal-size oracle and unclipped pixel equivalence; visual acceptance
remains pending. Changes remain in the authorised worktree for integration.
