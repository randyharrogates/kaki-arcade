# R-05 — Rabakz scoreboard (RZ-032)

## Readings and scope

Read CLAUDE.md, AGENTS.md, HANDOFF, PRD, STATUS, WORKFLOW, PLAN §§5–6,
R backlog R-05 and From R-03, the Rabakz spec including the full controls phase
 table and RZ-032, DECISIONS D-057, D-071 and subsequent timing readings,
D-096, D-097, D-105 and D-106, DESIGN (especially §3 shared result expansion and §4 Bandung),
ARCHITECTURE Game host views, PERFORMANCE, merged host screen/model/demo/tests
and the public rules model, flow and views. Requirement: RZ-032.

The request explicitly overrides the generic commit/evidence instructions: changes
remain uncommitted, no UAT script or evidence directory writes. No contracts,
dependencies, exemptions, timings, limits or rules transitions changed. Correct reveal length: **4 seconds**, as D-071 and `src/rules/flow.ts` specify
(`REVEAL_STEPS = secondsToSteps(4)`). The earlier brief’s 8 seconds was incorrect;
the nearby 8-second decision D-069 concerns Peek Poker. No rules timing changes. Existing 20-second automatic
scoreboard continuation and leader-only continuation remain authoritative;
these views draw public phases without a second timer.

## Chosen layout and capture URLs (D-112)

Layout A is the only shipped layout: one full-width ranked list. The integrator
selected it in main's DECISIONS D-112 (2026-11-17). B/C remain recoverable from
the round-4 commit; their leader panel, two-column geometry, fitting modes, CSS,
screen prop and demo URL option have been removed in round 5.

All existing dev states remain available. Use
`/@fs/Users/randy/projects/personal/web-apps/kaki-arcade-wt/R-05/games/rabakz/dev/index.html?state=scoreboard&players=8&at=3000`,
substituting any existing state, player count 1–8, or from/to transition.
No layout option is needed. Await fonts.ready and rzReady.
Results states: scoreboard, scoreboard-next, scoreboard-teams, scoreboard-ties,
podium, podium-teams, podium-ties. Target viewports: 1280×720, 1920×1080,
3840×2160. The overflow detector remains available as window.__rzOverflow().

A uses at most eight player rows, no leader panel, no images, no new font or
dependency. Existing count-up, staggered row entrances, shared masks, podium entrance and
reduced-motion handling remain. These are structural costs; no browser frame
budget or physical-TV legibility pass is inferred from unit tests.

## Validation

Host-only tests: 73 passed (existing screen tests plus standings tests). Existing
question-only scenario assertions now select question/reveal fixtures; results
fixtures are covered by the RZ-032 model tests. No assertion or limit weakened.
`VITEST_MAX_WORKERS=2 pnpm verify` passed (exit 0): 151 test files,
3293 tests passed, 1 skipped; duration 266.67s. Two additional results-fixture /
long-name tests were added while that run was in flight; the final isolated host
run passes all 73 tests. Latest typecheck, host ESLint and design lint also pass.
The full run’s build/typecheck ran after the final code changes.
`VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/dev.test.ts` passed alone:
5 tests, 1.11s. No launcher sandbox failure this run. No recipes timeout, so no
isolated recipes rerun was needed. Earlier implementation failures were corrected;
an obsolete full run was cancelled to remove contention.

Verify tail:

```text
Test Files  151 passed (151)
Tests       3293 passed | 1 skipped (3294)
PERF-022 host: 215380 bytes raw, 73026 bytes gzip / 1500000
PERF-020 controller (shared entry): 215380 bytes raw, 73026 bytes gzip / 300000
PERF-022 deploy: 215380 bytes raw, 73026 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 90 in progress, 1 later, 61 not started
trace check passed
```

`git diff --check` passed. All changed paths are in the authorised host lane or
this slice note. No commit, push, merge, evidence writes or dependency changes.

## Close-out

RZ-032 code: host/standings.ts, Results.tsx, Screen.tsx, screen.css;
fixtures: scenarios.ts and demo.tsx; tests: standings.test.ts, results.test.ts,
overflow.test.ts, categories.test.ts (RZ-003), and screen.test.ts.
Automated tests cover ties, competition placings, previous-board deltas, team
ordering/grouping, solo/top-three partition, private-field allowlist, list bounds
and source-level token motion. No DOM environment added.

Not closed: integrator review, photographed browser fit/legibility at all three
resolutions, reduced motion toggled mid-transition, shared expansion visual
continuity, quiet-machine performance and real-device UAT. Existing R-03 caveats
(reveal during wipe and unexplained historical long frame) remain unproven here.

## Requests

Integrator: resolve the brief’s 8-second reveal versus D-071/flow.ts 4-second
reveal discrepancy in the rules lane; present A/B/C rendered options to Randy; run captures above and
quiet-machine performance, review the retained-host history limitation, and
record the eventual choice in DECISIONS/shared trackers. No user decision is
assumed by the B development default.


## Round 2 corrections (RZ-032)

Read round1/REPORT.md and opened r05-a.jpg and r05-b.jpg. A remains one list;
B retains a measured **1.618 : 1** leader/list split excluding the 21 px gap;
C retains two columns above four players. The 1080p artboard and R-03 scaling
remain authoritative; row fitting now receives the same browser canvas measure
as question fitting, with a conservative fallback before fonts load. Name wrapping,
total width, line height and padding are reserved before choosing 55 or 34 px.
Number widths reserve the token face's 0.6 em fixed advance as well as the body
measurement. Podium fitting measures each shared step's member grid and chooses
the same reading steps; remaining players use the 34 px reading size.

| Measurement | 1280 × 720 | 1920 × 1080 | 3840 × 2160 |
|---|---:|---:|---:|
| Reading floor (R-03 option floor) | 22.67 px | 34 px | 68 px |
| Larger fitted type | 36.67 px | 55 px | 110 px |
| Row height cap (1–2 players) | 155.33 px | 233 px | 466 px |
| A/B, eight players, no teams | 71.58 px | 107.375 px | 214.75 px |
| A/B, eight players, teams | 66.82 px | 100.225 px | 200.45 px |
| C, eight players, no teams | 146.5 px | 219.75 px | 439.5 px |
| C, eight players, teams | 136.97 px | 205.45 px | 410.9 px |
| Podium placing numerals | 59.33 px | 89 px | 178 px |
| Solo final total | 96 px | 144 px | 288 px |

Results use all available safe height (894 px at 1080p, less 57.2 px for team
summary). Rows grow to a 233 px maximum; the resulting block centres vertically
when short. B/C explicitly allocate separate name and total grid rows, use
normal 1.3 line height, and reserve padding. The lowest eight-player team B row
has 100.225 px against 98.4 px needed for two 34 px lines plus padding. Names can
wrap at the reading floor; their measured line count participates in fitting.

The podium places first in the centre, second left, third right, including a
vacant third column for two entries. A tie shares one step, with competition
placings preserved. Step surfaces measure 233, 233/φ, 233/φ² px at 1080p;
large placing numerals sit on the steps and names/totals above. Team finals put
authoritative team totals on the steps. Solo finals show one large total.
The round-1 boundary masks, keyed rank arc, count-up, expansion and reduced-motion
handling remain; shared steps enter with token ease-out, rise and stagger.

JetBrains Mono Regular is bundled locally in host/ with its SIL OFL licence
(copied unchanged from the installed font; 273900 bytes). CSS registers the token
family and results request it before refitting. Totals, changes and placing
numerals use that face with tabular numerals. No network or dependency is needed.
This adds a font transfer, subject to existing build budgets.

`window.__rzOverflow()` now uses host/overflow.ts. The selector-list test checks
every results-specific class against Results.tsx. Child bounds, scroll extents
and text ranges cover rows, totals, leader, team summary, steps, members and solo
results. **It now reports the round-1 clipping by construction:** the second
line extending below an old B/C row lies outside the selected .rz-rank bounds;
previously only .rz-option was selected. Integrator browser confirmation remains.

Round-2 evidence: `uat/evidence/R-05-rabakz-scoreboard/round2/REPORT.md`.
Browser captures cannot run here: dev-server listen EPERM and Chromium Mach
bootstrap permission denial. No visual pass or quiet-machine performance claim.

### Round 2 Close-out

Fixes 1–5 implemented in host/Results.tsx, Screen.tsx, screen.css, demo.tsx,
overflow.ts; regression tests in standings.test.ts and overflow.test.ts.
Final host-only tests: **76 passed**. Final host ESLint, design lint (298 files),
workspace typecheck and `git diff --check` passed. Full
`VITEST_MAX_WORKERS=2 pnpm verify` completed with exit 0 (one verify at a time).
The first run stopped on a team-entry type error, corrected before this run.
The final host checks cover the podium measurement/seat additions made during
the full run; the full run's final build/typecheck also ran after those edits.

```text
Test Files  152 passed (152)
Tests       3296 passed | 1 skipped (3297)
Duration    226.55s
PERF-022 host: 215380 bytes raw, 73026 bytes gzip / 1500000
PERF-020 controller (shared entry): 215380 bytes raw, 73026 bytes gzip / 300000
PERF-022 deploy: 215380 bytes raw, 73026 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 90 in progress, 1 later, 61 not started
trace check passed
```

These shared-entry build numbers do not measure the host-only font's transfer
in a future integrated game route. The local font is 273900 raw bytes; no quiet
machine browser performance claim is made. Changes remain uncommitted under
the round-1 hand-back convention.

### Round 2 Requests

Fix 6 remains **unimplemented** pending an answer to the scope question. Existing
rules State has no scoreboard history; views.ts alone cannot recover a previous
scoreboard total. Authorise model.ts and flow.ts (plus a test in the host lane)
to initialise previousScore at zero, capture current scores when departing each
scoreboard, expose previousScore in publicView, then compute deltas exclusively
from that public field. No private answer history should be used. Existing host
history remains only until this required rules change is authorised.


## Round 3 corrections (RZ-032)

Removed host/JetBrainsMono-Regular.ttf, its licence and the @font-face rule.
Token mono families and tabular numerals remain. Results measure the actual mono
face (including system fallback) through the existing canvas measurement path;
fonts.ready and loadScreenFonts still trigger refitting. No font transfer is
owned by this game; packages/ui will supply the three token faces separately.

model.ts declares optional scoreboard snapshots (absence means zero before the
first board). flow.ts rotates them on entry every five questions, without
changing timings or continuation. views.ts exposes previousScore per player and
previousTeamScores. standings.ts computes deltas and prior ranks from these
public totals; Screen.tsx has no component score-history path. No answer or
private history enters the snapshots. Round 2's Fix 6 scope request is resolved
by the round 3 authorisation; the bundled-font and mounted-host limitations
above are historical and superseded by this section.

Rules tests cover first/tenth-question scoreboard snapshots, individual and
team baselines, JSON saved-state restoration and continuation. Host tests cover
fresh-view deltas, fallback font readiness and removal of the memory path.

### Round 3 Close-out

`pnpm exec vitest run games/rabakz`: **9 files, 163 tests passed**.
One final `VITEST_MAX_WORKERS=2 pnpm verify` ran alone and exited **1**.
Workspace, TypeScript, ESLint and design lint passed. The sole suite failure was
untouched `games/tabao-rush/src/rules/recipes.test.ts:303`: conformance test timed
out at its existing 120000ms limit. No timeout or unrelated code was changed;
no verify or unrelated-test rerun was started. Build and trace were not reached.

Verify tail:

```text
FAIL games/tabao-rush/src/rules/recipes.test.ts:303
Error: Test timed out in 120000ms.
Test Files  1 failed | 151 passed (152)
Tests       1 failed | 3298 passed | 1 skipped (3300)
Duration    461.05s
[ELIFECYCLE] Test failed. See above for more details.
[ELIFECYCLE] Command failed with exit code 1.
```

`git diff --check` passed. Changes remain uncommitted under the existing hand-back
convention. No uat/evidence writes, dependency changes or shared tracker edits.

### Round 3 Requests

Integrator review and browser/real-TV visual and performance checks remain.
No evidence from the removed round2 folder is relied on for this round.

## Round 4 corrections (RZ-032)

Read round3/REPORT.md and opened both r05b-a.jpg and r05b-b.jpg. No evidence
files were written. A/C scoreboard layout and rules are unchanged.

The overcrowding was a partition bug: filtering place <= 3 included six tied
third-place players on the third step in the eight-player fixture. podiumSteps
now takes three displayed entries and puts every remaining entry in the lower
ranked region, retaining competition placing numbers, including ties. Two
players use the full podium region; four/eight use a vertical 1.618 : 1 split,
with a 21 px gap. The lower region has its own absolute containing block and
uses A's row geometry and measured fitting. Final rows show placing, seat,
name and total, omit the question delta, and remove vertical padding so the
55 px seat fits even in the five-row lower region. Tied entries among the first
three still share a step; other tied entries retain the same placing below.

Solo name and total have bounded grid tracks, wrapping and explicit body line
height at their own font sizes. Podium members also use their own line height;
step numerals fit their step height instead of overflowing the third step.
Team podium identities use the authoritative Red/Blue team name plus a square
team-colour mark with no numeral; colours no longer come from a team member's
seat. B retains its horizontal golden split, fits name and total in separate
columns, puts change/team beneath total, and uses 8 px column gaps. Its leader
panel contains only the name and total at 89 px.

All sizes below scale with the existing R-03 artboard:

| Size | 1280 × 720 | 1920 × 1080 | 3840 × 2160 |
|---|---:|---:|---:|
| Reading floor / B eight-player type | 22.67 px | 34 px | 68 px |
| Podium region with rest | 359.69 px | 539.54 px | 1079.08 px |
| Lower list region | 222.31 px | 333.46 px | 666.92 px |
| Eight-player lower list row | 41.80 px | 62.69 px | 125.38 px |
| B leader type | 59.33 px | 89 px | 178 px |
| Solo name / total | 36.67 / 96 px | 55 / 144 px | 110 / 288 px |

Tests exercise the actual 2/4/8-player fixtures (including the tied-third case),
vertical/full-podium decisions, region separation and row bounds at all three
scales, B fitting at the reading floor, and named team colours. The overflow
selector inventory includes the lower region and team mark. Detector tests
exercise child, text-range and scroll overflow for body/podium/lower-region
containers and clean podium/lower-region bounds.

Browser launch was attempted, but Chromium exited with macOS Mach bootstrap
permission denied (1100). Thus no new rendered fit or __rzOverflow() zero claim
is made here. Integrator must check podium 2/4/8, solo and team podium at 720p,
1080p and 4K, and B with eight twelve-W names.

### Round 4 Close-out

Development run: `pnpm exec vitest run games/rabakz` passed 9 files / 166 tests
before the final compact-fitting test. The single final
`VITEST_MAX_WORKERS=2 pnpm verify` included all final code and tests. Workspace,
TypeScript, ESLint and design lint passed. All Rabakz tests passed. Only the
unchanged Tabao Rush recipes conformance test failed at its 120000 ms timeout.
No parallel verify was run and no timeout was changed. Build and trace were not
reached; the full verify result remains exit 1.

```text
FAIL games/tabao-rush/src/rules/recipes.test.ts:303
Error: Test timed out in 120000ms.
Test Files  1 failed | 151 passed (152)
Tests       1 failed | 3302 passed | 1 skipped (3304)
Duration    397.11s
[ELIFECYCLE] Command failed with exit code 1.
```

As requested, reran only `pnpm exec vitest run
games/tabao-rush/src/rules/recipes.test.ts` after verify finished:

```text
Test Files  1 passed (1)
Tests       29 passed (29)
Duration    102.53s
```

`git diff --check` passed. No evidence writes, shared tracker edits, rules
changes or dependencies. Browser visual/overflow confirmation remains pending.

### Round 4 Requests

Integrator: photograph B and podium/solo/team finals at all three target sizes,
check __rzOverflow() is zero for podium 2/4/8, review and integrate. Build/trace
still need a successful integrator verification following the isolated recipes
pass; no second full verification was run here.

Commit blocked by filesystem permissions: `git add` could not create
`kaki-arcade/.git/worktrees/R-05/index.lock` (Operation not permitted). Changes
remain unstaged and uncommitted for the integrator; no push or merge attempted.


## Round 5 final corrections (RZ-032)

Read main's `docs/DECISIONS.md` D-112 at the explicitly supplied main-worktree
path and `round4/REPORT.md`. D-112 selects A: one top-to-bottom list. Removed B
and C rendering, leader panel, two-column/stacked/compact row fitting, layout
switch prop, data-layout, ratio CSS variables, related CSS and B-only tests.
The demo retains every state, transition, player-count, motion and overflow
control; only its layout query option was removed.

Solo totals now reserve 5 px padding above and below their body line box rather
than hiding overflow. Step numeral fitting reserves the same 10 px of vertical
headroom inside its fixed step surface, avoiding the fractional 4K line-box
overrun. The overflow detector's bounds, range and scroll checks are unchanged;
only its obsolete leader selector was removed.

Final lower-list rows always use five slots, aligned to the top. Four-player
and eight-player finals therefore have identical row heights. Existing 2/4/8
podium geometry tests remain; a new rendered VNode-tree regression checks one
full-width list and one row per player across all scoreboard states/counts.
A separate regression checks identical four/eight-player final row geometry.

| Reading (artboard-scaled) | 1280×720 | 1920×1080 | 3840×2160 |
|---|---:|---:|---:|
| Final lower-list row, 4 or 8 players | 41.80 px | 62.69 px | 125.38 px |
| Lower-list first-row offset | 0 px | 0 px | 0 px |
| Solo total line box including padding | 131.47 px | 197.20 px | 394.40 px |
| Solo total type | 96 px | 144 px | 288 px |
| Third-step numeral type | 40.51 px | 60.76 px | 121.53 px |

These readings are calculated geometry, not browser measurements. Per the
round-5 command restriction only the Rabakz Vitest run is used during work;
no browser capture or UAT evidence is written. The requested zero-overflow
matrix needs integrator browser confirmation at all three sizes.

### Round 5 Close-out

Development: `pnpm exec vitest run games/rabakz` passed 10 files / 168 tests.
The single final `VITEST_MAX_WORKERS=2 pnpm verify` exited **0**. Workspace,
TypeScript, ESLint, design lint, full tests, build budgets and trace passed.
The recipes timeout did not recur; no isolated rerun was needed.

Verify tail:

```text
Test Files  153 passed (153)
Tests       3304 passed | 1 skipped (3305)
Duration    359.92s
PERF-022 host: 215762 bytes raw, 73144 bytes gzip / 1500000
PERF-020 controller (shared entry): 215762 bytes raw, 73144 bytes gzip / 300000
PERF-022 deploy: 215762 bytes raw, 73144 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 90 in progress, 1 later, 61 not started
trace check passed
```

No evidence writes, shared tracker edits, dependencies or rules changes.
Staging was attempted on issue/R-05-rabakz-scoreboard but Git could not create
main's .git/worktrees/R-05/index.lock (Operation not permitted). Files remain
unstaged and uncommitted; no push, merge or rebase attempted.

### Round 5 Requests

Integrator: confirm __rzOverflow() returns an empty array for every retained
dev state at 1280×720, 1920×1080 and 3840×2160, inspect the solo and 2/4/8-player
podiums, and perform the browser/physical-TV performance review. Commit the
reviewed changes from an environment permitted to write the worktree Git index.

## Round 6 visual pass (RZ-032, D-114)

Read main's DECISIONS D-114 at the supplied main-worktree path, CLAUDE.md,
WORKFLOW, PLAN, HANDOFF, PRD, STATUS, DESIGN §§1–4 and the UI scale, type,
theme, CSS and motion tokens. The integrator amendment removes the earlier
missing-token questions: no dividers, existing 165° panel gradient and no
letter-spacing. No new token, dependency or shared-document change.

Scoreboard has a 55 px display heading, inline 34 px round label and 21 px
secondary hint. Points / This round headings appear once. Fixed 89 px rows
sit on plum with 13 px gaps; only first-place rows (including ties) carry the
existing gradient and 3 px inset edge. Names ellipsise, totals use mono 55,
non-zero changes use mono 34 rose pills; zero changes have no pill. Placing
uses display 55; seat numerals retain dark ink. Name / score tracks use PHI.
Team summaries use two gradient panels in the token golden split, leading
team first; each row identifies its team with a 21 px colour square and an
accessible team name. Rest-of-field finals reuse the rows, reserving five
fixed slots below the podium. Step type now uses only 89 or 55 px tokens.
Solo total remains 144 px. Row entrances use enter(kind: row), with 13 px
rise, opacity, base duration and 30 ms stagger. Each chip pulses once after
its row lands. Reduced motion skips both; existing host overlap remains.

The overflow detector covers the new containers. Only player-name text with
actual overflow:hidden, text-overflow:ellipsis and white-space:nowrap is
excluded from hidden-range/scroll reports; its element bounds remain checked.
A regression proves removing the ellipsis restores overflow failures.

| Calculated reading | 1280×720 | 1920×1080 | 3840×2160 |
|---|---:|---:|---:|
| Row height | 59.33 px | 89 px | 178 px |
| Row gap | 8.67 px | 13 px | 26 px |
| Row name / total | 36.67 px | 55 px | 110 px |
| Chip / team name / round label | 22.67 px | 34 px | 68 px |
| Secondary heading / hint | 14 px | 21 px | 42 px |
| Eight-row block | 535.33 px | 803 px | 1606 px |
| Team scoreboard list region | 537.47 px | 806.2 px | 1612.4 px |
| Final lower-list region | 331.33 px | 497 px | 994 px |
| Final podium region with rest | 266.67 px | 400 px | 800 px |

These are calculated artboard readings, not browser measurements. Reading
content stays at 34 px or larger; the specified secondary labels use 21 px.
Per the command restriction, no browser/UAT command or evidence write was run.
The complete __rzOverflow() matrix remains for integrator browser confirmation.

### Round 6 Close-out

Final permitted Rabakz run: 10 files / **174 tests passed**, duration 25.45s.
Tests cover the golden column tracks, leader/tied leader treatment, zero change,
both team panel orders and ties, actual mocked-WAAPI row/pulse timing, reduced
motion, eight-player team bounds, fixed final rows and bounded name ellipsis.

The single `VITEST_MAX_WORKERS=2 pnpm verify` exited **1** at ESLint after
workspace check and TypeScript passed. ESLint found six meaningless void
expressions in compatibility helpers and one unnecessary type assertion in the
new hooks fixture. Removed the expressions using typed helper overloads, and
replaced the assertion with an explicitly typed fixture. The subsequent Rabakz
run passed. Also reserved body line boxes for row text/column labels and the
team mono total; updated calculated readings above accordingly. No second
full verification was run, respecting the once-only instruction. Final lint,
design lint, full tests, build and trace therefore remain unverified. The recipes
suite was not reached, so there was no recipes timeout or isolated rerun.

Verify tail (before the corrections):

```text
Results.tsx: six @typescript-eslint/no-meaningless-void-operator errors
results.test.ts: one @typescript-eslint/no-unnecessary-type-assertion error
7 problems (7 errors, 0 warnings)
[ELIFECYCLE] Command failed with exit code 1.
```

`git diff --check` passed. No evidence writes, dependencies, shared tracker or
rules changes. Browser overflow, visual review and performance are not claimed.

### Round 6 Requests

Integrator: inspect every dev state at 1280×720, 1920×1080 and 3840×2160,
confirm __rzOverflow() returns [], review reduced motion and frame continuity,
and publish the D-114 visual artifact for Randy. Quiet-machine performance
and physical-TV reading checks remain integrator work.

Round-6 staging was attempted on `issue/R-05-rabakz-scoreboard`; Git could not
create main's `.git/worktrees/R-05/index.lock` (Operation not permitted).
Changes remain unstaged and uncommitted. Integrator must commit after review.

## Round 7 final fixes (RZ-032, RZ-030)

The shared ranked-row/heading grid now reserves an 89 px placing track instead
of 55 px. Placing text also has 13 px inline padding to keep the right-aligned
display face's ink inside its element. This applies equally to scoreboard and
podium lower-list rows. Type size remains unchanged, no overflow is hidden,
and the overflow detector is unchanged. Regression checks cover the shared
track and glyph padding without clipping or a type-size override.

The question model now resolves category IDs through host/categories.ts.
The bank does contain player-facing titles in each
content/rabakz/src/questions/*.json file, but public questions carry only the ID.
The small host lookup copies those metadata titles without importing question
payloads/private answers into the screen. categories.test.ts checks the complete
set of 16 IDs and exact titles against every bank file, and checks the screen
model for each, including arts-and-literature → Arts and literature.

### Round 7 Close-out

Permitted checks: `pnpm exec vitest run games/rabakz` passed 11 files / 176 tests;
`pnpm exec tsc -b games/rabakz` and `pnpm exec eslint games/rabakz` passed.
Initial checks caught an invalid test fixture name and a test regexp lint rule;
both were corrected before the final checks. No full verify, browser/UAT command,
evidence write, dependency change or shared tracker edit. Changes remain
uncommitted under the existing hand-back convention.

### Round 7 Requests

Integrator: run every dev-page state at 1280×720, 1920×1080 and 3840×2160 and
confirm __rzOverflow() returns []; run full verification. Browser zero-overflow
results cannot be claimed from the permitted unit/type/lint checks alone.

## Round 8 corrections (RZ-030, RZ-032, RZ-034)

Read round5/REPORT.md, DESIGN §§1–4 and §6, Rabakz RZ-032/RZ-034 and main
checkout DECISIONS D-112/D-114. The round-8 brief supplies the integrator's design
decisions under D-057 and overrides full verification and evidence generation.

1. Team finals retain the team podium and all players in the ranked list below.
2. Null/unset teams normalise to unteamed players, ordered after both groups and
   marked “No team”. Grouped rows use the placing within their team.
3. Podium steps are selected by actual competition placing, with two stacked
   names maximum on each step; further ties lead the lower list. Tied steps and
   rows carry “=”. Partial-tie fixtures cover 1,1,3, 1,2,2 at four/eight players
   and 300,300,200,100,100,50,40,30. podiumFit returns null on impossible
   geometry and the rendered podium exposes data-fit="failed".
4. Solo results pair the name with the coloured, numbered seat badge.
5. Continue hints and column headings now use 34 px. The hint derives seconds
   from SCOREBOARD_STEPS and STEP_MS; the heading is “Gained”. Podium names and
   points use 55 px, placing numerals use the display face at 55/34 px. Step
   surfaces reserve the minimum reading line box, including 5 px vertical padding.
6. The perf scenario now cycles eight-player team scoreboard and team finals,
   with question → scoreboard and final-question reveal → final transitions.
7. Podium names stay on one ellipsised line; badges remain centred with names,
   and points share their centre axis. All final lists reuse the row design at
   34 px, with 55 px rows and 8 px gaps; eight rows occupy 496 px. The podium
   uses only occupied steps. Final content packs downwards, placing spare space
   above the header, including two-player and team finals.
8. ResultsBoundary uses overlapping slow opacity crossfades. Removed the
   fictional expansion from scoreboard row zero on reveal → final.
9. Team panels include gained chips using the same row chip styling.
10. Removed rankMotion, oldBox, rowFit, ignored rowPosition overloads, PlayerRow's
    measure prop, --rz-row-type and duplicate/dead result CSS. Correction to
    historical notes: ranked rows enter with staggered rises; **rank arcs were
    not wired to the rendered rows**, and are not claimed for this implementation.
11. Removed obsolete source-grep motion/history assertions; behaviour coverage
    checks row animations, crossfade keyframes, player membership, team placing,
    ties, impossible fit and solo identity. Line-fit tests compute textLines;
    independent numeric scale expectations cover the final eight-row geometry.
    The placing regression pins both inline and integrator-added vertical padding.
    The placing track is 144 px so the added equality sign has glyph headroom.
12. Overflow findings expose kind="truncated" for ellipsised names; the detector
    also checks the frame against the artboard. Both have regression tests.
13. Podium placing uses the display face, matching row placing.
14. Dev states add podium-tie-first, podium-tie-second, podium-partial-ties,
    scoreboard-teams-late and podium-teams-late. Existing scoreboard-next is
    the question-10 scoreboard with gained distinct from total; all question
    fixtures now carry the real technology category ID.

### Round 8 Close-out

Permitted checks: `pnpm exec vitest run games/rabakz` passed 11 files / 185 tests;
`pnpm exec tsc -b games/rabakz`, `pnpm exec eslint games/rabakz` and
`pnpm run lint:design` passed (301 files). No full verify, browser capture,
perf run or evidence write. No dependency, contract, lockfile, shared tracker,
rules timing or unrelated-game change. Changes remain uncommitted under the
round-7 hand-back convention.

### Round 8 Requests

Integrator: run the extended perf scenario; inspect every state and transition
at 720p/1080p/4K, including partial ties, tied teams and late joiners; run full
verification and independent review. Expected ellipsis now yields “truncated”
findings, so distinguish these from kind="overflow" when reviewing captures.
No browser fit, zero-overflow, physical-TV reading or performance pass is claimed.

## Round 9 final-results layout (RZ-032, RZ-034)

The integrator's D-057/D-114 brief supersedes round 8's bottom-packed finals.
The shared scoreboard/final header remains at the safe-margin top, including
solo's “Final results”. Only the final body is positioned: its occupied podium
and list height is centred in the 910 px region below the header and 5 px gap.
The podium/list separation is 34 px; the list reserves only occupied rows.

Occupied steps retain 2nd/1st/3rd order, equal widths, 21 px gaps, two names
maximum and a shared baseline. Steps are 89/144/55 px respectively, with the
leader-row gradient, corner and inset edge. Names are 55 px on one ellipsised
line; points are mono 34 px. Round 9 originally used display line height for names. Superseded by rounds
12–14: names and points use body line height, with padded names and explicit
member gaps. Tied-team finals with the round-14 group labels exceed the budget
and report failed; the earlier fit claim is withdrawn. Members end 13 px above the step. Placing remains
display 55 px for first and 34 px otherwise, including equality signs.
Final list rows retain the scoreboard column split and team grouping, with
34 px text and no leader panels. Unteamed final rows show “–” and “No team”
after both teams. Solo retains its badge/name, has mono 34 px points and no step.

### Round 9 Close-out

Permitted checks: `pnpm exec vitest run games/rabakz` passed 11 files / 187 tests;
`pnpm exec tsc -b games/rabakz`, `pnpm exec eslint games/rabakz` and
`pnpm run lint:design` passed (301 files). Tests cover calculated geometry at
720p, 1080p and 4K, fixed shared header styling, centring, step heights,
podium/list separation and the unteamed placing. These are unit geometry and
VNode/CSS assertions, not browser measurements. No full verify, browser/UAT,
performance command or evidence write. Changes remain uncommitted under the
round-8 hand-back convention.

### Round 9 Requests

Integrator: inspect the revised final results at all three target resolutions,
including tied teams, partial ties and solo; run independent review and full
verification. Round-8 scoreboard appearance and behaviour are retained.

## Round 10 podium font bounds (RZ-032)

The individual podium's numbered seat badge inherits 55 px type with a 1.0
line box. Its mono font content bounds extend beyond that box, explaining
why even short, uncut names produce text/scroll findings on rz-podium-name
and then its ancestors; the team mark has no numeral. The ellipsised name's
own 1.0 line box also needs vertical font headroom. Added 5 px scale padding
to the podium name span. This expands the containing flex row to 65 px and
contains the centred badge's text bounds. A compensating -10 px top margin
on points preserves the existing member stack height, points position, step
heights, shared baseline, podium/list separation and body centring. No type
size reduction, additional clipping or geometry-model change.

The detector already classifies installed rz-rank-name ellipsis as truncated
and excludes its hidden text ranges when inspecting ancestors. Kept that
logic intact; extended its regression through all six podium ancestors to
prove only the single truncated finding survives. Other text and scroll
failures remain failures.

### Round 10 Close-out

Added games/rabakz/dev/overflow.html: open it through the existing dev server
at /games/rabakz/dev/overflow.html. It runs the existing __rzOverflow detector
in an iframe at 1280 × 720, 1920 × 1080 and 3840 × 2160 for every SCENARIOS
entry and 1/2/4/8 players. It waits for fonts, dev readiness and two animation
frames with reduced motion and a frozen final animation time. The page reports
an exact overflow count, all failures and truncated names with scenario,
player count and resolution; raw results are window.__rzMatrix. It writes no
files. The current export has 35 entries (420 cases), rather than the brief's
36; the check imports the export directly so additions cannot be missed.

Browser matrix result: **not run; zero overflow and the actual truncated-name
list are not verified**. This turn used only the four permitted check commands;
no browser/server command or UAT/evidence write was run. Browser confirmation
must be performed by the integrator using the page above. No sandbox browser
launch was attempted, so browser availability is not claimed either way.

Permitted checks: pnpm exec vitest run games/rabakz (11 files / 187 tests),
pnpm exec tsc -b games/rabakz, pnpm exec eslint games/rabakz and pnpm run
lint:design (302 files). No full verify, dependencies, shared trackers or
lockfile changes. Changes remain uncommitted under the round-9 hand-back
convention.

### Round 10 Requests

Integrator: run the matrix page and record its exact overflow count and listed
truncated names; inspect the padded glyphs against the accepted round-9 layout.
A browser zero-overflow pass is intentionally not claimed from unit tests.

## Round 11 matrix findings (RZ-032, RZ-034)

A. The podium badge/name flex row was only max-width constrained inside a
centred grid item. Its intrinsic name sizing did not reliably reserve the
remaining column width for the ellipsis. The row now occupies the column
width; its name child explicitly has min-width: 0 and may shrink around the
fixed badge and gap. Existing hidden overflow, nowrap and ellipsis remain on
the name span. Short badge/name groups remain centred. No step, member-stack,
points, list, header or body geometry changed. CSS regression assertions cover
these constraints; the existing detector regression covers truncation without
propagation through the podium ancestors.

B. DOM element and Range rectangles already share viewport coordinates, but
the detector compared them with an unscaled 1 viewport-pixel allowance. At
2× this became only 0.5 CSS px. The detector now derives screen scale from
the transformed frame width divided by offsetWidth and scales the existing
1 CSS px tolerance for child, text and artboard bounds. Scroll/client checks
remain in CSS pixels with their original allowance. A regression uses scaled
frames at 2/3×, 1× and 2×: 0.8 CSS px rounding/overhang is accepted, 2 CSS px
child/text overflow is rejected, and real scroll overflow is still rejected.

C. An empty team already has total 0 and no members in the standings model.
Its unchipped +0 inherited the team panel's display line height, unlike a
nonzero delta whose chip padding contains the mono font bounds. The unchipped
team delta now uses body line height, retaining its centre within the unchanged
panel height. A regression checks the one-player scenario's empty team, zero
total, zero delta without a chip, single occupied member row and line-height
rule. Browser confirmation of these font bounds remains with the integrator.

### Round 11 Close-out

Only the requested checks ran: `pnpm exec vitest run games/rabakz` passed
11 files / 190 tests; `pnpm exec tsc -b games/rabakz`,
`pnpm exec eslint games/rabakz` and `pnpm run lint:design` passed (302 files).
No full verify, browser matrix, UAT, performance run or evidence writes.
Changes remain uncommitted under the round-10 hand-back convention.

### Round 11 Requests

Integrator: rerun games/rabakz/dev/overflow.html and inspect the same layouts.
The prior 420-case browser matrix is not claimed to pass from unit tests.

## Round 12 measured font-bound corrections (RZ-032)

1. Podium name rows now use the existing body line-height token (1.3),
   retaining 55 px name type. The actual text span is rz-rank-name: its
   min-width: 0, overflow: hidden, text-overflow: ellipsis and nowrap rules
   remain applied directly to the text holder, with the fixed badge outside it.
2. The detector accepts installed ellipsis on either rz-rank-name or
   rz-podium-name and uses the same selector pair in the text walker. Regression
   cases for both names report one truncated finding without ancestor text
   overflow; removing the installed ellipsis restores failures.
3. Viewport tolerance is Math.max(1, scale); scroll checks retain CSS-pixel
   units. Ranked-row totals and deltas receive 5 px block padding. The 55 px
   total occupies 81.5 px within the unchanged 89 px scoreboard row; final-row
   text occupies 54.2 px within the unchanged 55 px row. Padding is scoped to
   ranked rows to preserve team-panel and podium geometry.
4. Unit regressions cover scaled frames at 0.667, 1 and 2, including overhang
   exceeding one CSS pixel but under one viewport pixel at 720p, real overflow,
   both installed name ellipsis classes, podium body line height and unchanged
   scoreboard/final row heights.

### Round 12 Close-out

Permitted checks passed: pnpm exec vitest run games/rabakz (11 files / 192
 tests), pnpm exec tsc -b games/rabakz, pnpm exec eslint games/rabakz and
pnpm run lint:design (302 files). Initial detector mock incompatibilities were
corrected before the final passing run. No full verify, browser matrix, UAT,
performance run or evidence writes. Changes remain uncommitted under the
round-11 hand-back convention.

### Round 12 Requests

Integrator: rerun the browser matrix, including the two-player tied-first
podium and 720p scoreboards. Unit checks do not establish a browser fit pass.

## Round 13 podium line-box geometry (RZ-032)

Podium fitting and rendered region heights now share podiumStepHeight. Each
member reserves the real name line (55 × lineHeight.body + two space-5 padding
edges = 81.5 px), a space-5 gap, and the points line (34 × lineHeight.body =
44.2 px): 130.7 px total. CSS supplies that gap and removes the negative points
margin. Step surfaces retain 144, 89 and 55 px heights beneath the members;
member and surface separation remains 13 px.

The final list chooses the first fitting gap from 8, 5 and 0 px, preserving
all type and row heights. Two names on first place plus five list rows occupy
431.4 + 34 + 307 = 772.4 artboard px, or 514.9 viewport px at 1280 × 720,
within the 606.7 px below the header. Tied team finals with eight list rows
need zero row gap: 431.4 + 34 + 440 = 905.4 px within the 910 px artboard
budget. The block remains centred below the header.

Regression tests derive name, points, member and step heights from UI tokens,
check all seven final scenarios with 2/4/8 players at the three target scales,
and reject the old display-line geometry through podiumFit. The tied-team
regression also checks the actual final row bottom against the body height.

### Round 13 Close-out

Passed only the requested checks: pnpm exec vitest run games/rabakz (11 files,
193 tests), pnpm exec tsc -b games/rabakz, pnpm exec eslint games/rabakz and
pnpm run lint:design (302 files). No full verify, browser matrix, UAT,
performance run or evidence writes. Changes remain uncommitted under the
round-12 hand-back convention.

### Round 13 Requests

Integrator: rerun and inspect the 420-case browser matrix, especially all seven
final-results scenarios and tied team finals at 720p. These token geometry
checks do not establish a browser overflow pass.

## Round 14 re-review (RZ-003, RZ-030, RZ-032, RZ-034)

Unteamed players now show “–” on scoreboard and final paths, never receive a
leader panel, and retain the surface-appropriate secondary colour safety net.
Team lists include 34 px labelled colour-square group rows, with No team last.
Within-team placings are retained; white player panels identify only overall
room leaders. Team scoreboard rows use the shared 55 px/34 px ranked-row layout
to reserve space for the labels. ResultsBoundary now animates the incoming and
outgoing motions returned directly by @kaki/ui crossfade({ reduced }), retaining
the outgoing full opacity and shared timing. The separate question wipe still
uses exitDuration; crossfade itself currently gives both layers the slow duration.

Podium numerals use 34 px. Podium line height, name padding, player/member gaps
and column gaps share TS geometry constants installed as CSS properties.
Layout includes group-label heights and compares the complete final body with
the space below the header. Reduced list gaps report data-fit="tight"; an
oversized body reports failed. In particular, the required tied-team labels can
make the final exceed the available height even at zero gap; this is exposed,
not claimed as fitting. The matrix records every data-fit and counts all values
other than fits as failures, alongside overflow findings.

The detector retains vertical scroll checks on ellipsised elements, checks
headers and seat badges, and detects overlapping siblings in rows, steps and
podiums. Regression tests cover vertical clipping and sibling overlap. New
results fixtures include 陈美玲 and 🦊Fox; new capture states are
podium-teams-tie, podium-solo, podium-unicode and scoreboard-unicode. Capture
all SCENARIOS at 1/2/4/8 players and 1280×720, 1920×1080 and 3840×2160;
podium-solo deliberately stays at one player. The browser matrix is the guard
for rendered geometry; unit geometry checks cannot establish browser fit.

Removed unused podiumModel and its obsolete tests/export. Late fixtures remove
the departed member's score from the current team total; historical scoreboard
baselines intentionally describe the earlier membership. REPORT wording
correction: results fixtures use twelve-W nicknames, the nickname limit, rather
than a longer invented limit. No REPORT or other evidence file was edited.

### Round 14 Close-out

Final checks passed: `pnpm exec vitest run games/rabakz content/rabakz`
(20 files / 448 tests), `pnpm exec tsc -b games/rabakz`,
`pnpm exec eslint games/rabakz`, and `pnpm run lint:design` (302 files).
The runtime crossfade regression compares both animation calls with the shared
helper and checks reduced motion. `git diff --check` passed. Only the four
requested validation commands were used. No full verify, browser matrix, screenshots, performance
run, evidence writes, shared tracker edits or dependency changes. Hand-back
continues the existing uncommitted convention.

### Round 14 Requests

Integrator: rerun the browser matrix and shots, including the four new states,
and review explicit tight/failed fit statuses. Tied-team final fit remains a
visible matrix failure requiring integrator layout review within D-114.

## Round 15 revised detector rule (RZ-032)

D-057: glyph ranges outside a checked box and scroll overflow are failures only
when the text element or an ancestor through the frame clips (including ellipsis),
when an overhanging range intersects a visible sibling/cousin box, or when ink
leaves the frame's padded artboard safe area. The collision test uses the same
scaled rectangle intersection tolerance as round 14 and excludes ancestors and
descendants. Hidden peers do not create collisions. Other text/scroll findings
have kind `overhang`; the matrix retains them on each case without adding them
to its overflow failure count. Existing child-box, frame/artboard, sibling-box
collision and vertical scroll checks for ellipsised names remain in place.

The display line-height token is 1: a 55 px title therefore has a 55 px line box.
The serif font's ascent plus descent can occupy 75 px and extend beyond that
box into empty space. This alone is informational, so the header and its type
remain unchanged. Regression cases cover that geometry in empty space, beside
siblings/cousins, inside clipping/ellipsis parents, against the safe area, beside
a hidden peer and alongside ancestor/descendant boxes.

### Round 15 Close-out

Passed the requested checks: `pnpm exec vitest run games/rabakz content/rabakz`
(20 files / 457 tests), `pnpm exec tsc -b games/rabakz`,
`pnpm exec eslint games/rabakz` and `pnpm run lint:design` (302 files).
No full verify or evidence writes. Changes remain uncommitted under the round-14
hand-back convention.

### Round 15 Requests

Integrator: rerun the browser matrix and inspect both overflow failures and
informational overhang findings. Unit geometry checks do not establish browser fit.

Round 16 (RZ-032): ink entering frame padding is informational overhang; only ink beyond the artboard edge (or frame border box without an artboard), with the existing tolerance, fails the boundary check; regression tests cover both boundaries.

## Round 17 results header clearance (RZ-032, RZ-034)

Every results header now has a space-21 bottom margin, before column headings
or team totals. Absolute final bodies use the same token in their top and height
budgets. The final region is 970 − 55 − 21 = 894 artboard px. Scoreboards also
reserve their existing internal space-5 between column headings and rows, plus
team totals where present. No type sizes or player-row heights changed.

`TITLE_DESCENDER_RATIO = 10 / 55` records the integrator's Chromium measurement
for DM Serif Display: a 55 px title line at y=55..110 has content extending to
120, i.e. 10 px below its box (content height 75 px including the upper overhang).
The token-derived test asserts space-21 clears `tvType.title × lineHeight.display
× TITLE_DESCENDER_RATIO` at 2/3×, 1× and 2×; it checks normal/team scoreboard
budgets and podium/solo origins. This is measured content-area clearance, not a
new browser measurement or a claim of visual UAT approval.

The brief's 905.4 px figure predates the round-14 team group labels. Including
two 49.2 px labels, the old tied-team final was 1003.8 px with the 34 px
podium/list gap and zero row gap. List gaps alone cannot make that fit. For a
single tied-team step only, empty step-surface height is selected in φ steps
144 → 89 → 55, retaining the existing 55 px surface floor. This does not shrink
member content, font sizes, badges or list rows. Smaller finals keep the full
surface. The podium/list separation also selects 34 → 21 → 13 → 8 → 5 → 0;
row gaps retain the existing 8 → 5 → 0 choices.

The eight-player tied-team final now uses a 55 px surface, a 13 px podium/list
gap and zero row gap: 342.4 + 13 + 98.4 + 440 = **893.8 px of 894 px**.
The same selected surface is passed to rendering, podium height and podium fit.
Tests assert that exact budget and retain a deliberately oversized list whose
body exceeds 894 px and must report `data-fit="failed"`.

### Round 17 Close-out

Passed: `pnpm exec vitest run games/rabakz content/rabakz` (20 files / 462 tests),
`pnpm exec tsc -b games/rabakz`, `pnpm exec eslint games/rabakz`, and
`pnpm run lint:design` only. No full verify or writes to `uat/evidence`.
Changes remain uncommitted under the round-16 hand-back convention.

### Round 17 Requests

Integrator: rerun and inspect the Chromium matrix, especially header clearance
and the compressed tied-team step at 720p. The 0.2 px worst-case budget margin
is arithmetic; browser fit remains for integration review.

## Round 18 question clearance and truthful podium geometry (RZ-030, RZ-031, RZ-032, RZ-034)

Questions and reveals now share the results space-21 header clearance. Their
available body is 894 artboard px, including a 504 px prompt/options/picture
region, space-13 separation and the unchanged 377 px player strip. Prompt
upper font headroom is reserved in both the model and h1 padding (21/13/8 px
for 89/55/34 px type); this prevents the prompt's upper text range undoing the
header clearance. Internal prompt/answer gaps select 13 → 8 → 5 → 0 as needed.
QuestionFrame exposes data-fit="failed" when the computed content cannot fit.
Regression checks cover every question/reveal fixture at all three scales and
reject deliberately impossible copy. Type, answer content and footer floors
remain unchanged.

Screen.tsx already lays out a fixed 1920 × 1080 artboard and applies one uniform
screenScale transform. Retained that model instead of adding a second responsive
budget. The compressed step's placing inherited 55 px type: its padded body
line needed 81.5 px inside a 55 px surface. All placings now use the round-14
34 px type, with explicit regular weight, needing 54.2 px including padding.
The existing surface/gap compression remains authoritative. The regression
checks the 720p scale as well as 1080p/4K, the surface content floor and the
complete tied-team body. No type or row height falls below its floor.

Token geometry (viewport px, not new Chromium measurements):

| Region | 1280 × 720 | 1920 × 1080 |
|---|---:|---:|
| Question/reveal body budget | 596 | 894 |
| Prompt/options/picture region | 336 | 504 |
| Player strip | 251.33 | 377 |
| Eight-player tied-team podium | 228.27 | 342.4 |
| Eight-player tied-team final body | 595.87 | 893.8 |
| Largest two-member first-place podium with full surface | 287.6 | 431.4 |

Collision peers now require their own text or a control/content-box identity.
Aria-hidden/presentation/decorative peers and boxes covering the whole frame
are excluded. The regression accepts title overhang over full-frame decoration
and aria-hidden text, while visible sibling/cousin text still fails. Clipping,
artboard bounds, related-node exclusions and actual scroll checks remain.

### Round 18 Close-out

Only the requested validation commands: `pnpm exec vitest run games/rabakz
content/rabakz` (20 files / 466 tests), `pnpm exec tsc -b games/rabakz`,
`pnpm exec eslint games/rabakz`, and `pnpm run lint:design` (302 files).
No full verify, browser run or writes to uat/evidence. Changes remain
uncommitted under the round-17 hand-back convention.

### Round 18 Requests

Integrator: rerun the Chromium matrix and inspect question/reveal upper font
clearance and the compressed tied-team surface at each resolution. These unit
budgets do not claim a new browser overflow or physical-TV legibility pass.

Round 20 (RZ-032): round 19 was reverted after enlarged pixels confirmed no clipped glyphs; exclude `.rz-copy`/`.rz-old` swap masks from clipping ancestors because the measured 75 px is reserved font ascent/descent, retaining other clipping, ellipsis, collision and artboard checks.

## Round 21 (RZ-032, RZ-034)

Removed the redundant unteamed group heading and its reserved height; the row's
inline "No team" tag remains. Every results scenario at requested counts 1, 2,
4 and 8 must now avoid data-fit="failed" (tight is accepted). Eight-player
podium-teams-late is 893.8 px, with tightened gaps, against the 894 px budget;
its minimum occupied content with zero list gaps is 880.8 px. Side-by-side
tied teams were unnecessary.

Worst-case body heights across the four counts (artboard px; solo reserves
the full body rather than measuring its text):
- 894: podium, podium-partial-ties, podium-solo, podium-teams-late,
  podium-tie-first, podium-tie-second, podium-ties, podium-unicode.
- 893.8: podium-teams-tie.
- 860.1: podium-teams.
- 844.8: scoreboard, scoreboard-next, scoreboard-teams-late, scoreboard-ties,
  scoreboard-unicode.
- 768.3: scoreboard-teams.

Split PlayerRow compact sizing/type from final delta suppression. Team
scoreboard rows keep gained chips; final rows hide deltas. Regression fixtures
derive leader expectations directly from raw scores, with an unteamed overall
leader and unequal team maxima, then a teamed overall leader. All-zero
individual and team scoreboards have no leader panels.

Swap masks now exempt only vertically bounded font content-area overhang
(10/55 of the font size per edge); horizontal clipping and excess vertical
overhang fail. Collision, safe-area and other ancestor clipping checks remain.
Added the actual Jack Ü prompt from content/rabakz/src/questions/music.json
to SCENARIOS for the matrix and integrator stills.

The Results.tsx overhang figure was measured on a Chromium fallback face,
not DM Serif Display: design font binaries are not in this repository. The
specific fallback family was not recorded in the earlier measurement.
The code comment now states fallback face. Loaded design fonts will require
new browser measurements.

The overflow matrix already exposed each case's fit array in __rzMatrix.
Pinned that contract in a test; the report now separates failed fit cases
from tight cases and lists tight cases explicitly.

### Round 21 Close-out and Requests

Validation: VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz content/rabakz
(20 files, 476 tests); pnpm exec tsc -b games/rabakz; pnpm exec eslint
games/rabakz; pnpm run lint:design. No full verify or writes to uat/evidence.
Changes remain uncommitted under the round-20 hand-back convention.
Integrator: rerun and visually inspect the browser matrix and Jack Ü stills;
these heights are unit-tested geometry, not new browser measurements.


## Round 22 (RZ-030 to RZ-034, D-128)

Prompt fitting now reserves a bottom spacing token as well as upper headroom:
21/13/8 px at 89/55/34 px type. Both are included in promptHeight and applied
inside the prompt copy mask, to incoming and outgoing copy. The 55 px two-line
Jack Ü prompt is now 136 px (110 + 13 + 13); the non-picture fixture is 131 px
(89 + 21 + 21), the picture fixtures 81 px (55 + 13 + 13), and both longest
prompt fixtures 152 px (4 × 34 + 8 + 8). Candidate selection retains media,
prompt and answer type before reducing internal spacing. Longest copy can use
zero extra prompt/options gap because its bottom allowance is already inside
the prompt box. Every question/reveal fixture still fits; option bottoms are
y=635, before the unchanged player strip. These are fallback-measure unit
heights, not fresh browser measurements.

The detector now selects .rz-question, its h1 and its .rz-copy. Hidden swap
masks no longer excuse font overhang outside their actual bounds. Clipping is
checked against each ancestor's bounds and overflow axes; tests cover both a
clipped vertical range and a padded mask that contains it. Opened the supplied
round8/r05-desc.png read-only and confirmed the flattened lower glyph edges.

The every-results-scenario test now compares end-phase team body height with
the actual ranked-region offset plus last-row bottom. It also checks the
space-5 minimum separation before unteamed rows, retaining the inline No team
tag. The separation participates in all fitting budgets. The late-joiner
final remains 893.8 px, with the reduced podium/list gap compensating for the
new separation. Its centred body ends at y=1024.9 of the y=1025 boundary:
the integrator's late-joiner final ends flush at 1024 of 1025. There is no
meaningful spare bottom margin. The 894 values in the maxima snapshot for
single-player and solo cases are full-region reserves, not measured text
content heights (including the one-player late-team fixture).

data-compact returned solely as a row-size marker: team scoreboard and final
rows share the 55 px row/34 px type geometry, while final separately controls
delta suppression. It does not restore layout B; D-112's single full-width
ranked list remains the chosen layout.

### Round 22 Close-out and Requests

Validation: VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz content/rabakz
(20 files, 478 tests); pnpm exec tsc -b games/rabakz; pnpm exec eslint
games/rabakz; pnpm run lint:design. No full verify, shared tracker edits or
writes to uat/evidence. No dependencies added. Integrator: rerun prompt stills
and the overflow matrix with the stricter mask checks; unit geometry is not a
browser fit approval.

Committed as c15be93 (round 22). The initial sandboxed commit attempt failed;
the integrator subsequently committed the changes.

## Round 23 header mask clearance (RZ-032, RZ-034)

Read round9/REPORT.md and opened r05r22-head.png read-only: the Q tail is
whole. The detector compares Range.getClientRects (font content area, not
actual glyph ink) to each hidden ancestor's getBoundingClientRect. The header
is flex; its first span is blockified, uses 55 px display type / line-height 1,
and contains block .rz-copy > div with overflow:hidden on .rz-copy at rest.
The previous fixture's fallback content area is y=45..120 against the header
line and unpadded copy mask y=55..110. This explains the detector finding but
is not evidence of clipped visible glyph ink. Fresh Chromium geometry could
not be captured: launch fails with Mach bootstrap permission denied (1100).

Reserved space-13 headroom and descender padding in both incoming and outgoing
header copy. Negative space-13 block margins compensate the padding: the mask
is y=42..123 while the text baseline and the header's 55 px layout height stay
unchanged. The φ spacing scale’s space-21 header gap is retained. This conservative mask
clearance contains even the entire font content area without weakening the
round-22 detector or changing the prompt checks. Regression logs the compared
boxes at 2/3, 1 and 2 scale; the old box fails, the new box produces only the
informational header overhang. These are derived fixture coordinates, not new
browser measurements or glyph-ink measurements.

### Round 23 Close-out and Requests

Validation passed: VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz
content/rabakz (20 files, 481 tests), pnpm exec tsc -b games/rabakz,
pnpm exec eslint games/rabakz, pnpm run lint:design (331 files), and
git diff --check. No full verify, dependencies,
shared tracker edits or writes to uat/evidence. Committed as 1e32c82 (round 23).
Integrator: rerun the browser matrix; review header swap masks and unchanged
baseline/gap. The supplied pixels establish whole glyphs before this change;
no new rendered-browser pass is claimed here.

## Round 24 detector geometry (RZ-032, RZ-034)

Reverted round 23's header-only padding and compensating margins. Round 22's
prompt headroom/descender padding and prompt selectors remain unchanged.
The header's Range rectangle includes font content leading beyond its 55 px
line; treating that as ink clipping produced the round-22 alarm. Round 23
then enlarged the copy children outside the unchanged header layout box,
producing the reported child-bound alarms without a visible improvement.

Header copy/old masks now allow the loaded font's measured content leading:
(fontBoundingBoxAscent + fontBoundingBoxDescent - computed line-height) / 2,
scaled into viewport pixels, plus at most 1 viewport px for rounding. This
allowance is vertical only and limited to header swap masks. Other ancestors,
artboard edges, collisions and prompt masks retain their checks. Horizontal
header clipping and vertical excess beyond leading plus 1 px still fail.

Every finding includes comparisons with named measured and boundary elements,
top/bottom/left/right rounded to 0.1 px, vertical allowance and tolerance.
Anonymous elements use their tag name. Scroll findings also include scaled
scroll/client boxes. __rzMatrix retains all findings as well as its existing
filtered overflow/overhang arrays.

### Round 24 Close-out and Requests

Regression tests use the supplied 75 px content-area / 55 px header-line
geometry at 1280, 1920 and 3840, including fractional edges, excess vertical
clipping and horizontal clipping. The two-line Jack Ü prompt without bottom
padding fails at all three scales; adding descender padding passes the mask
check. These are geometry unit tests, not fresh browser measurements.

Validation: 20 Rabakz/content test files, 481 tests; Rabakz tsc and ESLint;
design lint and git diff --check. Full pnpm verify was initially blocked
by controller-kit missing preact modules and DOM types; the integrator resolved
that environment issue and verification subsequently passed. Evidence: uat/evidence/R-05-rabakz-scoreboard/round24/REPORT.md.
The integrator reran the browser matrix; round 11 confirms the clipped Q tail. No fresh browser pass is claimed. No dependencies or shared
trackers changed.

Committed as 3ecc82b (round 24), after the initial sandboxed commit attempt
was denied access to the primary repository's worktree index.

## Rounds 22–25 consolidated Close-out and Requests (RZ-030 to RZ-034)

Round 22 is committed as c15be93, round 23 as 1e32c82 and round 24 as
3ecc82b. Integrator commit 7ed7328 corrected the performance scenario test to
expect the team screens and 1600 callbacks. The old controller-kit environment
block was resolved; the historical round-24 blocked statement above has been
corrected. Round 11's integrator review supersedes the earlier claim of whole
header glyphs: its 8× Q crop shows the clipped tail. Opened that crop in round 25.

Round 25 gives incoming and outgoing header copy 5px top and 8px bottom
padding inside its own box. At 1920 the header/mask was y=55..110, height 55;
it is now y=55..123, height 68. The line moves down 5px. The external gap
changes from 21 to 8px: 55+21 = 68+8 = 76, so the prompt remains at y=131
and the combined header clearance budget remains unchanged. No negative
margins. Results have no copy swap and retain their original 21px gap. Prompt copy gets 5px
inline padding, including .rz-old; its container starts 5px earlier and is
10px wider, retaining the advance position and wrapping width.

Removed the font-content half-leading allowance. Single-line header ranges
are converted to loaded-face ink bounds using canvas actualBoundingBox metrics
and the font ascent to locate the baseline; missing metrics fall back to strict
Range checks. Header copy masks are explicitly selected. A 3px ink overrun
fails even with 10px half-leading at 1280, 1920 and 3840. Collision checks exempt
only opposite incoming/outgoing branches of the same copy mask; independent
copy and other text remain obstacles.

Browser UAT after round 25 is recorded by the integrator in
uat/evidence/R-05-rabakz-scoreboard/round12/REPORT.md: header and prompt ink
are whole at 1280, 1920 and 3840, the negative control catches header clipping,
and the matrix has 480 states with zero overflow or fit failures. The dimensions
above describe round 25, before the round 26 alignment correction.
No dependencies or shared trackers changed.

Round 25 focused validation: 3 files, 131 tests passed. Committed as 94c8b51.

Final round 25 verification passed: `VITEST_MAX_WORKERS=2 pnpm verify` in a
terminal-backed run, 161 test files / 3471 passed and 1 skipped; workspace,
typecheck, ESLint, design lint, build/transfer budgets and trace all passed.
Final focused tests: 131 passed. Whitespace check passed.

## Round 26 header alignment and vertical ink regression (RZ-030 to RZ-034)

Header incoming and outgoing copy now use zero top padding and space-13 bottom
padding, retaining the space-8 header margin. At 1920, CSS gives a header/mask
box y=55..123 (68 px), with the heading line y=55..110 and prompt starting at
131. The line-to-prompt gap is 21 px (13 + 8); the supplied Q ink bottom 112.5
is inside the mask ending at 123. Category copy receives the same bottom
clearance so flex centring keeps its ink aligned with the original heading
line, rather than moving it down 6.5 px. Both copy branches share these rules.

The three-scale ink regression now explicitly checks vertical ink bottom 113
against mask bottom 110 (overflow), then bottom 109 (passes). Horizontal
3 px clipping and the padded header/prompt checks remain.

### Round 26 Close-out and Requests

Validation passed: `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz`
(11 files, 229 tests), `pnpm exec tsc -b`, `pnpm exec eslint games/rabakz/host`,
and `pnpm run lint:design` (331 files scanned). The initial unit run found
a top overrun in the new pass-case fixture; varying ink descent instead keeps
its top inside the mask and the corrected run passes. No browser or UAT run,
evidence writes, tracker edits or dependencies. Integrator review remains required.

Round 26 commit attempt was blocked: the sandbox cannot create the primary
repository’s `.git/worktrees/R-05/index.lock` (Operation not permitted).
Integrator: commit the four changed files with RZ-030 to RZ-034 after review.
