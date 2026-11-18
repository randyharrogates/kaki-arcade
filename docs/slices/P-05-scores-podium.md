# P-05 — Scores and podium (PP-032, PP-012)

## Plan and choices

Keep the existing deterministic reveal → scoreboard (5 seconds) → next memorise / over
transition. Render board 3 Results as drawn: winner and score on the narrower left, the full
ranked table on the wider right, 1 : 1.618. The integrator's round 2 correction supersedes the
round 1 brief. Use Peek Poker felt tokens, 34 / 55 typography, token spacing and the UI row
entrance (30 ms stagger, ease-out), with motion omitted under reduced motion. Ties use shared
competition places; seats order equal rows without breaking the tie. Names ellipsise only in
the table, with the full name retained in title text.

Round 7 uses the shell's D-195 record registration: version 1 `{ best }` under
`kaki.host-device.game.peek-poker.progress-v1`, read afresh at Start. Pure state keeps
`bestAtStart`, `recordable` and solo eligibility; save returns the initial best unless a
completed solo-throughout match improves it. Round 8 keeps publicView.newBest false and
claims New best only through pure savedView after successful persistence. The best line
updates and pulses independently of podium rows. Unreadable storage hides best copy while
the single-player final still says Match complete.

## Files and claims → source

- PP-032 TV: `games/peek-poker/host/standings.ts`, `results.ts`, `Screen.tsx`, `screen.css`.
  Full table, shared places, narrower winner column, scaled 1920 × 1080 artboard.
- PP-012 / DATA-002: `src/records.ts` exports the pure schema (`host/records.ts` re-exports it);
  `src/rules/{state,game,views}.ts` carries the starting best and post-save savedView.
- Phone own place and score: `src/rules/views.ts`; no other player's private data is copied.
- Shell integration: `apps/web/src/game-registry.ts` registers the existing host screen,
  public view key, final screen and D-195 record codec / savedView. The shared session loader
  and adapter remain unchanged; there is no Peek Poker finish callback.
- Final phone hook: `apps/web/src/phone.ts`, `phone-route.tsx`, `phone-private.test.ts`.
  The shell cleared the final private view on Results. Retain only Place / Score stats in
  local phone state, clear on a new match, lobby or disconnection, and render with Results.
- Unit coverage: `host/standings.test.ts`, `records.test.ts`, and phone-private test.
- Browser geometry and token contrast coverage: `apps/web/src/poker-results.dom.test.ts` at 1920 × 1080
  and 1280 × 720, eight tied players. Browser tests are supplied, not executed here.
- Integrator UAT: `uat/slices/P-05-scores-podium.mjs`, run with 1 and 3 phones. Seed-only
  interception makes both solo matches identical deals: unlocked first, locked second
  guarantees improvement. With three phones the leader locks; the other two tie for second.
  Screenshots cover both TV sizes and phones; all need visual review.

## Validation and Close-out

Round 3 fixed the host project boundary: web references Peek Poker's host tsconfig and
imports its host entry; the Preact adapter now lives in `apps/web/src/poker-session-screen.tsx`,
where Preact is already available. UI imports follow the existing relative source pattern.
The Vite DOM test moved to `apps/web/src/poker-results.dom.test.ts`, whose existing test
project supplies Vite types. No dependencies, lockfile or node_modules links changed.

Completed the PlayerResult fixture with joinedMidGame, bound the records finish callback,
removed redundant optional chains after narrowing, and made the UAT record parse unknown
before asserting its complete schema. No any, ignored errors or disabled rules were added.
The first test run exposed an obsolete no-stats expectation and a private revision defect:
waiting players now advance revisions when scoreboard/final data appears, and departures
advance surviving players' private revisions when their displayed place can change.
Scoring, phase durations and displayed results remain unchanged.

All commands were preceded by uptime with 1-minute load below 8 (final runs 3.70–4.00):

- `PLAYWRIGHT_BROWSERS_PATH=/nonexistent VITEST_MAX_WORKERS=2 pnpm exec vitest run games/peek-poker apps/web/src`:
  exit 1; 606 passed, 12 browser tests could not run because Chromium is unavailable.
  56 test files passed; 12 failed at browser launch. Conformance passed.
- `pnpm exec tsc -b tsconfig.build.json`: exit 0.
- `pnpm exec eslint games/peek-poker apps/web/src uat/slices --max-warnings 0`: exit 0.
- `pnpm run lint:design`: exit 0, 444 files scanned.

No verify, UAT, perf, install, node_modules linking or commit was performed. No emitted
JavaScript or declaration files were added beside host sources. Browser geometry and
screenshots remain unverified.

## Requests / open work

Integrator: run the Chromium tests and UAT twice, then inspect screenshots and both-size fit. Browser
contrast assertions check the felt grain endpoint and both panel gradient endpoints; visual
and actual DOM execution remain unverified. Performance budgets remain unmeasured here.
Review the small shell lifecycle hooks alongside the game implementation. No code is imported
from Rabakz and no shared component was moved. No platform change is needed for this slice.

## Round 4 — P-06 console integration

Follow Rabakz: the game renderer draws both scoreboard and final results, with
`finalScreen: true` retaining the podium until Continue hands off to shell results.
P-06's ConsoleScreen mounts the existing PeekPokerScreen results board: narrow winner
summary left, wider ranked table right (1 : 1.618), token row entrances with 30 ms
stagger and reduced-motion handling. The between-round summary now names the leader
or shared first place. Removed poker-session-screen.tsx and its obsolete preload hook
from session-loading.ts; the console's mounted readiness gate owns card preparation.
The registry already uses ConsoleScreen/publicViewKey and needs no further change.
Solo records, the finish hook, host-device storage and phone place/score views remain.

The renderer's shared sameTable comparison already includes score, soloBest and
newBest. Exported it from console.ts and documented these drawn fields. Added these
fields to the existing mutation test and exercised publicViewKey updates for both
scoreboard and over, including stable equivalent snapshots.

UAT now targets .pp-table phase markup, waits for the expanded Select screen before
Start, uses P-06's active phone grid buttons and explicitly observes reveal before
scoreboard. Retains two deterministic solo matches and the three-phone tied podium.
Only the leader locks in the three-phone run so the other two share second; the first
solo run deliberately leaves complete picks unlocked to establish a lower record.

### Close-out

Allowed commands started at 1-minute load below 8 (3.29–4.52):
- Vitest: exit 1; 635 passed, 13 browser tests not run (Chromium launch unavailable).
- TypeScript build: not run. The exact requested build command emits JavaScript and
  declarations under the current configs, conflicting with the no-emit instruction.
- ESLint: exit 0.
- Design lint: exit 0, 454 files scanned.

No commit, verify, UAT, perf, install or node_modules linking performed. Existing
round1-p1 evidence deletions were present before this round and were left untouched.

### Requests

Integrator: resolve the build/no-emit command conflict, run typechecking, Chromium
checks and UAT with 1 and 3 phones; inspect both TV sizes and phone results. Browser
layout, motion and screenshot assertions remain unverified in this sandbox.

## Round 5 — resize and empty solo record

The results rows remain children of the fixed 1920 × 1080 table. Its scale was
only refreshed by renderer updates; the mounted renderer had no resize handler.
Added a resize listener which reapplies the latest snapshot at the current viewport
size, including an otherwise idle scoreboard or final podium, and removes it on
destroy. No results rows or scoring layout moved outside the board.

The summary treated every non-null soloBest as a displayable record, including the
zero sentinel for no stored best. It now omits that line unless the stored best is
positive or newBest is true. The table's best label also omits zero. Positive Best
and New best copy remain unchanged; record loading and saving are untouched.

Extended the Chromium results DOM test to resize a mounted final board from
1920 × 1080 to 1280 × 720 without another view publication and assert every row
is inside the viewport. Added scoreboard and podium assertions for absent Best 0,
positive Best 21 and New best · 89.

### Close-out

Each allowed command started after uptime reported 1-minute load below 8
(5.44–6.61; initial Vitest load 5.55):
- Vitest: exit 1; 635 passed, 13 browser tests not run because Chromium is unavailable.
- TypeScript build: exit 0. No generated JavaScript, maps or declarations appeared
  beside the issue's sources (host/style.d.ts is an existing tracked source).
- ESLint: exit 0.
- Design lint: exit 0; 454 files scanned.

No commit, verify, UAT, perf, install or node_modules linking performed. Existing
round2-p1 and round2-p3 evidence directories were left untouched.

### Requests

Integrator: run the Chromium regression and solo UAT, and inspect the resized final
podium and empty-record scoreboard. Browser geometry and the precise runtime path
that missed the shell's resize update cannot be confirmed in this sandbox.

## Round 6 — review 1 follow-up (PP-012, PP-032)

The in-play Best label now uses type-34 explicitly. The final results board reserves
89 + 55 artboard pixels at the bottom for the shell hint, and omits the game's
own hand-off line. Scoreboards retain Next round in 5 seconds. New best pulses
once using the shared UI pulse helper; reduced motion skips the animation.
Phone places carry the tie marker in the existing string stat value (=2), avoiding
a contract change. Joining during scores advances surviving private revisions
because it can change their tie marker. Results hides Teams when none are offered.

UAT accepts 1, 3 or 8 phones. It captures the host scoreboard before phones,
match-2 memorise/pick tables at both TV sizes, a match-2 memorise phone, the
8-row podium beside the mounted shell hint, and six-frame strips seeking the
real row entrances and New best pulse. Geometry checks cover the Best label
against players/hands and the final hint against podium rows/summary. The DOM
fixture mounts GameFinalHint at both TV sizes. Performance now plays all five
rounds and records scoreboard and over phases using the existing harness steps.
Round1-p1 is marked superseded. No new screenshots or performance claims are made.

### Close-out

Only authorised checks ran, each below 1-minute load 8:
- Vitest launches: 4.10, 4.74, 3.88, 3.98. Initial runs caught and fixed fixture
  issues and the join/tie revision defect. Final: 159 passed; one DOM test blocked
  only by the deliberately unavailable Chromium executable. Fixture bundle passed.
- TypeScript build: loads 4.80 and 3.25, both exit 0.
- ESLint launches: 4.05 (eight void-arrow errors, fixed), 3.90 and 3.23 (both exit 0).
- Design lint: load 3.97, exit 0, 454 files scanned.

No verify, UAT, perf, install, node_modules linking or commit. No generated JS,
maps or declarations appeared beside the issue sources; tracked host/style.d.ts
is retained. Existing untracked round3-p1 evidence is untouched.

### Requests

Integrator: run Chromium geometry tests, UAT with 1, 3 and 8 phones and the
8-phone performance diagnostic; inspect all stills and strips and frame p95/worst.
Phone paint remains deferred to P-08; record-store changes remain deferred to R-06.
All prohibited record/session/controller-kit files remain untouched.

## Round 7 — R-06 host-device records (PP-012, DATA-002)

Peek Poker now registers its version-1 record codec with the shell, with an empty
`{ best: 0 }` and an identity `savedView`. The shell's existing `prepareMatch`
reads the record on every Start, and its results/quit path is the sole writer.
Removed the Peek Poker-only loader hook, adapter option and `pokerRecords` store
wrapper. The schema and `PokerRecord` remain in `host/records.ts`; the host exports
the schema for registration. No store design changes or migration were needed.

`save(state)` uses `bestAtStart` and only improves it after a completed match that
stayed solo and still has exactly one player. Rules tests cover quit, a lower
score, a tie, improvement, multiplayer and joining then leaving. Codec tests
validate `save(state)` output. Unreadable storage carries `recordable: false`,
which suppresses `soloBest` and `newBest` during play and at completion. Removed
unused result extras and pointed standings persistence tests at `save()`.
The UAT key is now `kaki.host-device.game.peek-poker.progress-v1`, checked against
`apps/web/src/session-storage.ts`. No old finish-hook assertion remains in the
app tests; unrelated animation and fixture `finish` helpers remain.

Validation (1-minute `uptime` load at each launch; all below 8):

- Requested Vitest command, with `PLAYWRIGHT_BROWSERS_PATH=/nonexistent` and
  `VITEST_MAX_WORKERS=2`: load 2.85, 18 files / 184 tests passed; after moving
  lifecycle coverage into the rules tests, load 5.29, 18 / 184 passed.
- `pnpm exec tsc -b tsconfig.build.json`: loads 3.10 and 5.29, passed.
- Requested ESLint command: loads 5.34 and 5.26, passed.
- `pnpm run lint:design`: load 5.43, passed (467 files).

Final codec-test check results are recorded below. No emitted `.js`, `.js.map`
or `.d.ts` beside sources were found after TypeScript. No verify, UAT, perf,
install, linking, merge or commit was run.

### Close-out and Requests

Round 7 implements the nine record-store migration steps. Browser/UAT and
performance review remain with the integrator, as requested. Prior visual
review work is outside this round's changes.

Final codec-test checks: requested Vitest command at load 5.69 passed (18 files,
184 tests); TypeScript at load 7.08 passed; requested ESLint at load 7.04 passed.
The final source changes do not affect the design-lint result above.

## Round 8 — review 2 (PP-012, PP-032, DATA-002)

New best comes only from pure savedView after a successful write for a recordable,
solo-throughout, completed single-player improvement. Tests cover failed writes, tie,
lower score, multiplayer, unreadable storage, improvement and unfinished matches.
DOM coverage checks row/animation identity across confirmation, reduced and normal motion,
and the unreadable solo title. The pulse anchors at the left edge. ARCHITECTURE §4 records
the temporary Place/Score convention. Strip labels now use animation seek time.

### Round-7 visual review

Claude review 2's REPORT rows are transcribed into r7-p1, r7-p3, r7-p8 and perf-r7.
They record readable phone stats, tied places, both TV sizes and eight-row 720p clearance
(43 px). Perf-r7 remains diagnostic: 16.7 ms median, 33.3 ms max, no frames over 50 ms or
long tasks. Premature New best and sideways pulse drift required fixes; r8 supersedes
r7-p1 for the New best claim. No new visual or performance run here.

### Close-out and Requests

Round-8 UAT: `uat/evidence/P-05-scores-podium/r8-p1/` and `r8-p3/` (commit ecfb3b7f), visually reviewed by Claude (review 3). r7-p8 stands for eight phones; perf-r7 stands (diagnostic). Review 3 ran the four P-05 Chromium DOM tests (5 passed, load 3.42) and the Node set with phone-private (20 files, 192 passed, load 2.94).

Round-8 validation (1-minute load immediately before each launch):

| Check | Load | Result |
|---|---:|---|
| Requested Vitest command, first run | 4.48 | 191 passed, 1 stale publicView assertion failed; corrected to savedView |
| Requested Vitest command, final run | 4.07 | 20 files, 192 tests passed |
| TypeScript, first / final | 4.41 / 4.00 | passed / passed |
| Requested ESLint, first / final | 4.20 / 3.83 | 7 DOM-test typing/style errors; corrected / passed |
| Design lint | 4.08 | passed, 470 files scanned |

No generated `.js`, `.js.map` or `.d.ts` appeared beside sources; existing tracked style
declarations remain. `git diff --check` passed. The Place/Score convention is D-210.


## Round 9 — review 3 (PP-012, PP-032, DATA-002)

Best copy sits directly after the winning score on scoreboards and solo finals, before
any countdown hint. The New best pulse waits for the last row entrance to settle using
the existing entrance duration and stagger (D-208); reduced motion omits animation.
The UAT waits for save-confirmed New best copy and seeks the pulse from its delay on a
settled board, retaining seek-time labels. DOM assertions cover order and pulse delay;
registry coverage checks a completed solo improvement and identity for a tie.
Old evidence supersession text now matches review 3; the Place/Score convention is D-210.

### Close-out and Requests

Round-9 validation (1-minute uptime load at each launch, all below 8):

| Check | Load | Result |
|---|---:|---|
| Requested Vitest set, unavailable browser path, two workers | 3.64 | 18 files, 171 tests passed; no browser tests selected |
| TypeScript, initial / final | 3.50 / 3.51 | passed / passed |
| Requested ESLint, initial / corrected / final | 3.74 / 3.65 / 3.79 | unnecessary Number conversion found / passed / passed |
| Design lint | 3.68 | passed, 470 files scanned |

No emitted `.js`, `.js.map` or `.d.ts` appeared beside scoped sources; the existing
tracked `host/style.d.ts` remains. The new DOM assertions await Chromium execution.
No commit, verify, UAT, perf, install or node_modules linking.
Integrator: run the P-05 Chromium tests and solo UAT, inspect the Best-before-hint order
and both pulse strips on the settled podium at both TV sizes.

## Round 9 UAT (integrator)

`uat/evidence/P-05-scores-podium/r9-p1/` at 29d794d0, looked at by the integrator: "Best 12" sits under the score above the hint (18); both pulse strips start on a settled board, left edge fixed at x 57, peak +9 px at 180 ms, at rest by 360 ms (measured). The four P-05 Chromium DOM tests passed (5/5). r8-p3 and r7-p8 stand for 3 and 8 phones (no multiplayer drawing changed in round 9).
