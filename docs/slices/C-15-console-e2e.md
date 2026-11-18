# C-15 — Console end to end

## Goal and plan

Exercise the browser console through its normal module interface with eight landscape phones,
without depending on a real game's art. Read the brief, PRD, architecture, workflow, lane,
UAT and performance rules; reuse the C-16, C-16b, C-12 and K-05 harness conventions. Build a
development fixture, script the real room flow, repair necessary console defects with regression
tests, then run only the four checks authorised in the brief. The brief explicitly replaces the
usual verify/UAT/commit loop for this worktree: no verify, UAT, perf, install or commit is run.

Branch: `issue/C-15-console-e2e`. Ports: web 5230, signal 5231; 5232 reserved for UAT.

## Fixture

`apps/web/src/console-e2e.fixture.tsx` exports a typed GameModule and a public-view-only TV
screen. Eight per-seat input counters, a fixed-step counter and seeded private strings provide
unambiguous assertions. Advance uses the normal layout action path. Sixteen accepted inputs
finish a co-operative round; a ten-minute step limit also ends it. Metadata, settings, init,
step, join, leave, public/private views, layout, results, assets, secret declarations and secret
scrambling implement the interface. Optional preload, save and pause hooks are unnecessary:
there are no assets or saved game data and the platform freezes simulation when paused.

The registry and deterministic seed 15 are gated by both `import.meta.env.DEV` and
`/host?fixture=console-e2e`. Only that explicitly flagged development host replaces its catalogue
with the fixture. Normal development and production pickers retain the three real games.
No fixture knowledge was added to platform, netcode or controller-kit.

## Requirements and proof map

These are implemented assertions, not claims of visually accepted UAT. All screenshot and strip
paths below refer to the integrator run under `uat/evidence/C-15-console-e2e/round5-p8/`.

| Clause | Code / automated proof | Pending browser proof |
| --- | --- | --- |
| NN-1: TV and phones run in browsers; no player install | Existing host and `/play`; script uses isolated browser contexts and real pairing/WebRTC | All steps and stills |
| NN-2: phone controller, up to eight players | Fixture counts each seat's Advance; `console-e2e.test.ts` tests eight inputs | Eight seated; all eight send inputs; TV total 8; phone 1 and 8 stills at 844 × 390 |
| PLAT-030: one documented module interface; no room/pairing/transport/lobby changes to add a game | Typed fixture; normal registry, loading and session adapter; gate tests | Leader selects and starts through picker, controls update public view |
| PLAT-031/032 supporting interface and purity clauses | Fixture determinism, privacy, asset and result assertions; no clock/random/network in simulation | Private text is in its own phone DOM and absent from TV and all seven other phones |
| PLAT-033: all three v1 games use this interface with no private back doors | Existing real-game registrations and session replay tests remain in the authorised suite | C-15 proves the shared console seam only; full real-game acceptance remains R-08/P-07/T-17 |
| PLAT-023: any player pauses; leader resumes/quits | Authenticated host command tests and phone command tests; existing session pause tests | Keyboard pause → leader phone resume; phone 8 pause → keyboard resume; frozen step assertion; pause/resume strips |
| PLAT-007: return within two minutes restores same seat and state | Existing reconnect/session tests; new fixture private counter | Phone 8 reload preserves seat 8, private text/counter and Advance; all seven others monitored for disconnect notices; next input increments TV total |
| PLAT-009: phones report host loss and reconnect; running round lost; room, players, prior scores restored | Existing host-store restore tests; new host integration test checkpoints completed scores once, then reloads during a subsequent round | Complete a 16-input round, start another, reload host; observe Host disconnected; same room code, all eight acknowledged seats, prior scores unchanged, no old private view/layout; fresh round starts at zero; TV and phone recovery strips (separate real mid-play reloads to avoid concurrent strip builders) |
| PLAT-023: quit to picker retains room players | Existing host tests plus normal quit path | Reduced-motion quit, picker stills, then lobby verifies all eight seats |
| D-099 / D-095 f host follow-up | Host and transport expiry tests; transient/persistent ICE tests | Reset real signalling storage while channels remain open; Advance still works; quit offers Create a new room; no code offered |
| K-05 / CTRL-003 real-room privacy follow-up | Fixture per-owner isolation test and existing session privacy tests | All eight unique secrets checked against every other phone and TV, again after phone recovery |

PRD PLAT-009 states: “A running round is lost; the room, players and scores so far are restored.”
ARCHITECTURE §5 states: “The restored room returns to the lobby and the running match is lost
for every game (PLAT-009, OQ-031).” The slice deliberately asserts that behaviour; it does not
persist a simulation, controller layout or private view across host reload.

Timings: the script writes `recovery-timings.json` for phone reconnect and host recovery and
records each join through the harness. PERF-021 is asserted at ≤5 seconds per join. There is
no recovery-duration budget in PERFORMANCE.md; the 120-second PLAT-007 seat hold is checked
separately and is not labelled a performance budget. The integrator’s round6-p8 run recorded reconnect 151.8 ms and host recovery
2181.6 ms (round5-p8: 129.6 ms and 2132.5 ms); visual acceptance is in round6-p8 and round7-p8's REPORT.md.

## Defects found and fixed

1. Host transport closed every peer on room-not-found/room-expired, and the host retired the
   simulation on expiry. Preserve linked play, clear the dead code/checkpoint, reject new
   peers and keep pause/resume available. Quit returns to the expired-room lobby with a new
   room action. Results can be viewed before returning to that lobby. A genuine replacement
   host still retires the losing tab; this does not weaken D-066 authentication.
2. Transient ICE disconnected immediately closed the host peer. The shared peer now waits
   three seconds, cancels on recovery and closes on persistent loss; failed/closed and data
   channel close remain immediate. Existing netcode state-event expectations were updated.
3. The real phone controller had no console pause/resume button. Add a token-styled console
   button, report Host disconnected on loss, reject unauthenticated commands and enforce
   connected-leader-only resume. The generic action envelope is unchanged.
4. Host snapshots carried score/result fields but app session results never updated them.
   Completed results now checkpoint scores once; duplicate results cannot double-count.
   Interrupted-round points are not added. Restore keeps the completed scores.
5. Remove obsolete development picker layouts A/C and their layout query switch (D-109).

## Follow-up triage

- C-console ~148 and ~159: D-099 and host D-095 f are in scope and were missing; handled above.
  Phone-side retention of open data channels on gone/expired/not-allowed already existed and
  its tests remain. The ICE grace gap is also handled.
- K-controller ~47: in scope; the new real-room script checks every phone, exceeding the
  requested two-phone privacy assertion. Execution and visual review remain outstanding.
- R-rabakz ~59: its `./host` screen and public-view key are already registered by main in
  `game-registry.ts`; no additional game renderer wiring is needed.
- C-console ~121: D-109's obsolete development layouts are removed. Focus arcs, mask-edge
  half-glyphs/ring interruptions, outgoing heading dimming, status reveal ordering and blurb
  clipping require animation geometry/sequencing or rendered assessment, not token-only
  changes. Deferred under the brief's small-and-token-only condition.
- R-rabakz ~60: reveal-during-wipe replay, seat entrances and correctness pulse ordering need
  game renderer sequencing changes in the R lane. They are not token-only; deferred.

## Follow-ups for the integrator

- Run the exact UAT command below outside this sandbox; open every still and strip, including
  the Menu chip, both shared veils, all three phone sizes and reduced-motion quit. No new
  screenshots were generated or visually accepted here; the integrator owns round5-p8
  review. Investigate any script assertions before accepting the slice.
- Re-run the six Chromium-backed unit tests outside the sandbox (names/results below).
- Quiet-machine performance assessment and real-device work remain integrator-owned.
- PLAT-033 still needs the real-game end-to-end slices; this fixture cannot close that clause.
- Retain the deferred C-09 focus/mask polish and Rabakz reveal ordering work described above.
- Review the three-second ICE grace and console action names as integration choices. No
  protocol contract or dependency changes are requested.

## Validation

All checks were started only after `uptime` reported one-minute load below 8. Final
TypeScript, ESLint and design lint checks passed. The final broad Vitest rerun reports 1743 passed, 1 skipped and 6 failed (101 passing test
files, 6 failing files). All six failures are the sandbox Chromium launches listed below;
all non-browser tests, including the new regression tests, pass. An earlier run saw a platform
conformance timeout when machine load rose above 49 after the run had started; that test
passed on the final rerun started at load 5.71. No threshold was changed.

Chromium could not launch in this sandbox: `bootstrap_check_in ... Permission denied (1100)`.
The affected tests are in:

- `apps/web/src/Overlap.dom.test.ts`
- `apps/web/src/PeekPoker.dom.test.ts`
- `apps/web/src/host-keyboard.dom.test.ts`
- `apps/web/src/layout-fixtures.test.ts` (the Chromium-backed selected-card inset test)
- `apps/web/src/phone-coverage.dom.test.ts`
- `apps/web/src/team-polish.test.ts` (the Chromium-backed headed-halves render test)

Commands used (only the authorised four check commands):

```sh
VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src packages/platform packages/netcode packages/controller-kit tools/uat
pnpm exec tsc -b tsconfig.build.json
pnpm exec eslint apps/web/src packages uat/slices tools/uat --max-warnings 0
pnpm run lint:design
```

Rounds 1–2 design lint: 420 files scanned. No UAT or performance run was performed
by the builder; evidence inspection began in round 3.

Exact UAT command (provided for the integrator; not run here):

```sh
KAKI_PORT_WEB=5230 KAKI_PORT_SIGNAL=5231 pnpm uat -- C-15-console-e2e --phones 8 --max-mb 64 --out round5-p8
```

The harness owns the UAT process and does not bind a third UAT listener; 5232 stays reserved.
The larger evidence allowance covers all TV/phone 1/phone 8 stills and full recovery strips.

## Close-out and Requests

### Round 2 — keyboard DOM fixture

The round-1 score checkpoint in `host.ts` now reads `event.results.players` when
handling completed results (PLAT-009). The keyboard DOM fixture injected four
`{ type: 'results' }` events without the required payload. `SessionEvent` already
requires `results` (`packages/platform/src/session/index.ts:32`), and the real
session emits it. The fixture is generated JavaScript inside a string, so these
invalid calls escaped TypeScript. Its last progress marker remained `phones`,
but the crash occurs later at the first synthetic results event, after the 24
quality updates. This is a fixture defect exposed by correct C-15 score persistence;
the product API and product code are unchanged in round 2. All four synthetic
events now provide `{ mode: 'players', players: [] }`, preserving the keyboard,
results-navigation and board-3 assertions.

Picker scope confirmed: D-109 chose start-screen layout B and retained A/C only
for development. The explicit C-09 follow-up in `docs/backlog/C-console.md:119–120`
says to remove the development-only A/C options, `picker-demo.css` rules and
`layout` demo parameter in C-15. Their round-1 removal is therefore within scope;
they have not been restored.

Round-2 validation (one-minute load before each command: 3.78, 4.52, 4.48,
4.49 respectively):

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src packages/netcode`:
  574 passed; six failed solely at sandbox-denied Chromium launch
  (`bootstrap_check_in ... Permission denied (1100)`), across 44 passing and
  six failing files. The corrected keyboard fixture bundles successfully;
  browser execution remains unverified here.
- `pnpm exec tsc -b tsconfig.build.json`: passed.
- `pnpm exec eslint apps/web/src packages uat/slices tools/uat --max-warnings 0`:
  passed.
- `pnpm run lint:design`: passed, 420 files scanned.

Integrator must rerun outside the sandbox, with one-minute load below 8:

```sh
VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src packages/netcode
```

This reruns the corrected `host-keyboard.dom.test.ts` and all six Chromium-backed
files listed above, including the eight tests from the integrator's
previous run. No verify, UAT, perf, Blender, install or commit was run in round 2.

Implementation ready for integration checks, not closed or visually accepted. Requirement
proof is mapped above. In rounds 1–2, no shared trackers, requirements, architecture, contracts, lockfile or
game-track files were changed. No dependency, push, deployment, merge or commit.

Requests: integrator execution and visual review of UAT; sandbox-free Chromium checks; the
listed motion work stays with the integrator/owning track. No approval is required to review
or run the authorised integration work.


### Round 3 — shared phone states and closed-room follow-up

PLAT-023 / DESIGN §4.4: replace the label-swapping button with Menu in the ID bar.
Menu pauses; the shared Paused veil offers leader-only Resume and Quit to picker,
plus “Only the leader can quit.” Quit uses the same host session command as TV Quit
to picker. The connection-loss veil shows “Reconnecting…”, “Your seat is kept for
2 minutes.” and the full “Host disconnected” wording (PLAT-009). Both veils block
and dim the underlying controls. State announcements use phone-live. Menu and veil
buttons have minimum 89 × 68 targets; spacing and motion use UI tokens. Veils use
233 ms ease-out entrances and 186 ms exits, with reduced-motion swaps.

D-099 / D-095 f: hide TV join/picker hints in closed-room. After play, the existing
picker-state reason reports closure; every phone shows “This room has closed” and
“Join the new room on the TV.” with no leader picker. No protocol contract changed.
Tests cover the host's closure message, both phone roles and script assertions of
TV hints and all eight closed-room phone states. ARCHITECTURE §5 now describes the
three-second ICE grace, closed-room behaviour and cumulative completed-round scores.

Host validates incoming controls once for host routing; console-* controls are consumed
before session.control. Freed/expired seats lose cumulative scores, with regressions
for both paths. Per-game score storage would change snapshot keys, restore and UAT
assertions beyond one line; scores remain cumulative across games for now.

C-09 tidy: the demo UAT matrix is B only; remove the obsolete layout URL parameter
and production guard, and guard against Console test / ConsoleE2e / console-e2e.fixture.

Evidence: use the integrator-owned round5-p8 run for current evidence; this
historical round-3 implementation note does not claim acceptance of that run.
The updated UAT script waits for the game
surface transition before reload strips, observes host loss on all eight phones, captures
Menu at 667×375, 844×390 and 932×430, both veils and every closed-room phone. The
phone coverage browser test checks target geometry and disabled/inert controls at all
three sizes. UAT remains integrator-owned and was not run here.

Round-3 final validation (one-minute load below 8 before each command):

| Authorised command | Final result | Starting load |
| --- | --- | --- |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src packages/platform packages/netcode packages/controller-kit` | 1722 passed, 1 skipped, 6 failed; 97 passing files, 6 failing files | 5.77 |
| `pnpm exec tsc -b tsconfig.build.json` | Passed | 7.69 |
| `pnpm exec eslint apps/web/src packages uat/slices tools/uat --max-warnings 0` | Passed | 7.53 |
| `pnpm run lint:design` | Passed; 420 files scanned | 7.12 |

All six final Vitest failures occur before browser assertions at Chromium launch:
`bootstrap_check_in ... Permission denied (1100)` / SIGTRAP. Files under apps/web/src:
Overlap.dom.test.ts, PeekPoker.dom.test.ts, host-keyboard.dom.test.ts,
layout-fixtures.test.ts, phone-coverage.dom.test.ts and team-polish.test.ts.
All non-browser regressions pass, including closed-room roles, console consumption,
leader quit/resume and score removal on leave/expiry. The final Menu hit-area CSS
refinement was checked by design lint; rendered geometry remains blocked by Chromium.
Earlier type errors, a raw-colour design finding and two test assertions were corrected
before the final results above. Checks were held while external load exceeded 8.
No verify, UAT, perf, install or commit was run.

Exact updated UAT command (not run):

```sh
KAKI_PORT_WEB=5230 KAKI_PORT_SIGNAL=5231 pnpm uat -- C-15-console-e2e --phones 8 --max-mb 64 --out round5-p8
```

Close-out: implementation and regression coverage updated; browser acceptance is pending.
Requests: integrator runs and reviews round5-p8 and reruns any sandbox-blocked Chromium
tests. No shared trackers, PRD, DESIGN, PERFORMANCE, DECISIONS, backlog, contracts,
lockfile or dependencies changed. No commit.


### Round 4 — phone target geometry (PP-005, PLAT-025, PLAT-023)

Only `apps/web/src/phone.css` changes. No tests or thresholds were weakened.
The reported phone-coverage line 128 checks the **Paused veil actions**, rather
than the earlier card-grid geometry assertions. Give the overlap, both transition
layers and dialog definite absolute viewport boxes, avoiding percentage heights
through intrinsically sized grid tracks. Resume and Quit are non-shrinking
144 × 68 and 233 × 68 targets with a 13 px gap. Disabled states retain those boxes.
The header reserves one 34 px content row (47 px with padding and border); Menu
remains in that ID bar, out of flow. Its ink uses the board-4 compact chip treatment
(5 px vertical / 13 px horizontal padding); its existing 89 × 68 hit area is kept.
D-051 therefore remains satisfied even under the stricter existing Menu test.
Team actions now explicitly reserve a 55 px minimum width and cannot flex-shrink:
Done previously depended on its short label's intrinsic width.

Calculated CSS geometry, **not browser measurements** (zero safe-area insets,
landscape, no fonts downloaded by the DOM fixtures). Boxes below are
`(x, y, width, height)` in CSS pixels; rounding is illustrative, not a tolerance
change. The shell and each veil cover `(0, 0, W, H)`.

| Viewport | Header | Menu hit area | Paused Resume | Paused Quit |
| --- | --- | --- | --- | --- |
| 667 × 375 | (0, 0, 667, 47) | (565, 0, 89, 68) | (138.5, 172.55, 144, 68) | (295.5, 172.55, 233, 68) |
| 844 × 390 | (0, 0, 844, 47) | (742, 0, 89, 68) | (227, 180.05, 144, 68) | (384, 180.05, 233, 68) |
| 932 × 430 | (0, 0, 932, 47) | (830, 0, 89, 68) | (271, 200.05, 144, 68) | (428, 200.05, 233, 68) |

Paused content height = 55 heading + 13 gap + 68 actions + 13 gap +
13 × 1.3 note = 165.9. Action row width = 144 + 13 + 233 = 390.
These calculations apply during both overlapping layers, for both leader states.
The reconnecting text uses the same definite viewport box.

The game play area starts at y=47. If wake lock is unavailable, its 13 × 1.3 + 5
notice takes 21.9 px; this is the smaller canvas. The unchanged packer then gives:

| Viewport | Play box | Grid size / cell size | Grid vertical bounds |
| --- | --- | --- | --- |
| 667 × 375 | (0, 47, 667, 306.1) | 371 × 287 / 89 × 68 (5 px gaps) | 56.55–343.55 |
| 844 × 390 | (0, 47, 844, 321.1) | 380 × 296 / 89 × 68 (8 px gaps) | 59.55–355.55 |
| 932 × 430 | (0, 47, 932, 361.1) | 380 × 296 / 89 × 68 (8 px gaps) | 79.55–375.55 |

Grid horizontal placement depends on the measured Lock in label width; packing
reserves both grid and at least 144 × 144 action inside the 667 px minimum width.
With wake lock available, play heights are 328 / 343 / 383; the preferred
380 × 296 grid fits all three, with vertical bounds 63–359 / 70.5–366.5 /
90.5–386.5. No new header row is taken from either canvas.

For the team DOM fixture, page padding is 13, ID header 55 and header gap 8.
The content box is `(13, 76, W−26, H−89)`. The worst roster has three rows:
21 heading + 5 gap + 3 × 55 targets + 2 × 8 gaps = 207 px; the action row
is 55 px. The centred moving group is therefore 262 px high:

| Viewport | Moves box (worst three-row roster) | Action row box |
| --- | --- | --- |
| 667 × 375 | (13, 88, 641, 207) | (13, 295, 641, 55) |
| 844 × 390 | (13, 95.5, 818, 207) | (13, 302.5, 818, 55) |
| 932 × 430 | (13, 115.5, 906, 207) | (13, 322.5, 906, 55) |

Done is at least 55 × 55; Back and Start retain intrinsic label widths with the
same minimum. All share the action row y. Their combined natural widths plus
16 px gaps fit the 641 px minimum row; widths depend on the system monospace
font, so exact browser x/width measurements remain integrator-owned. Roster
columns are at least (641−24)/4 = 154.25 px in the most divided case. Fewer
roster rows reduce the group height. Refusal text occupies the existing heading
row and adds no height.

Round-4 checks, each started after one-minute load below 8:

- Vitest (load 5.44): 463 passed; six Chromium tests **not run**, failing immediately
  because the executable under `/nonexistent` is absent. No Chromium launched.
- TypeScript (6.99): passed.
- ESLint (6.38): passed.
- Design lint (5.85): passed, 420 files scanned.

Only the four requested check commands ran. No verify, UAT, perf, install or
commit. Browser geometry and visual acceptance remain for the integrator; no
rendered measurements or screenshots are claimed here.

### Round 5 — restore phone button font inheritance (PLAT-025, PLAT-023)

Restore `font: inherit` on `.phone-page button`. Keep the compact board-4
monospace font on Menu only, adding `.phone-page .phone-session-button` so
that its font and chip padding win over the general phone-button selector.
Veil actions retain their existing inherited 21 px body font.

The seventh test layout is count=8, width=667, redCount=1. Each team receives
one column per three players (rounded up), so the 1/7 split needs 1+3=4
columns. With 641 px available and three 8 px gaps, each button is about
154.25 px wide; the earlier four-player layouts need two columns and yield
316.5 px. The narrow layout is intentional. The round-3 global font shorthand
changed buttons to monospace, while the name fitter measures the body font
inherited by `.phone-team-moves`. That mismatch explains the reported 151 px
rendered label inside 138 px. Restoring inheritance aligns the fitter and label
font families and preserves the existing 21 px minimum. The team-actions
minimum-width/non-shrinking rule applies to a separate flex row; it does not
take columns or width from the move grid. No grid or fitting thresholds changed.

Checks started at one-minute loads 1.83 / 3.13 / 2.96 / 2.96 respectively:

- Requested Vitest command: 463 passed. Six Chromium tests **not run** because
  the browser executable under `/nonexistent` is absent; no browser launched.
  Includes `team-polish.test.ts` and `phone-coverage.dom.test.ts`.
- TypeScript: passed.
- ESLint: passed.
- Design lint: passed, 420 files scanned.

Close-out: CSS fix complete; rendered fit requires the integrator's Chromium
rerun. Requests: rerun the two named browser files and confirm full-name fit
in the 154 px case. No verify, UAT, perf, install or commit was run; no
restricted documents, contracts, dependencies or lockfile changed.

### Round 6 — Menu pill and non-leader Paused actions (PLAT-023, PLAT-025)

Remove Menu's ka-panel class and replace its pseudo-element with a measurable
phone-session-pill span. The button has a transparent background, zero border,
zero padding and no shadow; its 89 × 68 hit box stays out of flow. The pill uses
13 px bold monospace, 5 / 13 px padding and the pill-radius/chip tokens. Its
centre sits at the ID row centre (5 + 34/2 = 22 px), beside Connected. The
phone-coverage browser assertion now checks the pill top/bottom against the ID
bar, retaining every existing assertion, including the independent hit-area check.

Both roles now share the filled Resume and white ghost Quit treatment. Disabled
non-leader actions retain their native disabled behaviour and shapes, with opacity
1 − ka-opacity-ghost (0.92). The grey disabled override is removed; the leader-only
quit explanation remains visible to everyone. Action targets remain 144 × 68 and
233 × 68, separated by 13 px.

Calculated geometry only, with zero safe-area insets, settled controls and default
tokens; Chromium measurements remain integrator-owned. All three ID bars span
(0, 0, viewport width, 47). Pill height is 13 × 1.3 + 10 = 26.9 px, with vertical
bounds 8.55–35.45, above the header rule. Its width depends on the system monospace
font; the horizontal centre is listed instead of claiming measured glyph widths.

| Phone viewport | Menu hit box (x, y, width, height) | Pill centre (x, y) | Resume box | Quit box |
| --- | --- | --- | --- | --- |
| 667 × 375 | (565, 0, 89, 68) | (609.5, 22) | (138.5, 172.55, 144, 68) | (295.5, 172.55, 233, 68) |
| 844 × 390 | (742, 0, 89, 68) | (786.5, 22) | (227, 180.05, 144, 68) | (384, 180.05, 233, 68) |
| 932 × 430 | (830, 0, 89, 68) | (874.5, 22) | (271, 200.05, 144, 68) | (428, 200.05, 233, 68) |

Checks started after uptime one-minute loads 2.25 / 2.45 / 2.73 / 3.30:

- Requested Vitest command with PLAYWRIGHT_BROWSERS_PATH=/nonexistent and
  VITEST_MAX_WORKERS=2: 463 passed; six browser tests not run because the executable
  is absent (runner reports six launch failures). No Chromium launched.
- TypeScript: passed.
- ESLint: passed.
- Design lint: passed, 420 files scanned.

Close-out: both reported visual faults addressed in code; browser assertions and
rendered appearance await the integrator. No verify, UAT, perf, install or commit
was run. No restricted documents, contracts, lockfile or dependencies changed.
Requests: integrator reruns browser tests and reviews all eight phones in round5-p8,
including the pill containment and both roles' Paused action treatments.

### Round 7 — nonpainting Menu target and game-control separation (PP-005, PLAT-023)

Keep the preferred 89 × 68 Menu target and 47 px ID bar. No game control
intersects it at the three requested sizes: the grid is horizontally clear,
and Lock in starts below y=68. No minimum-area interpretation of D-051 is used.
The pill remains inside the ID bar. Correct the Menu selector from `.phone-page`
to `.phone-game-page`: the game root has only the latter class, so the previous
transparent styling did not apply and the global button minimum height could win.
Explicitly suppress the hit area's outline
except on :focus-visible; its background, border and shadow remain unpainted.

The coverage test's first-painter predicate now recognises zero-alpha colours
independently of their RGB channels/reference serialisation, and still counts
background images, visible borders, shadows and outlines as paint. The felt
colour, treatment, alignment predicates and every existing assertion are unchanged.
A new assertion checks all 17 active layout targets against Menu at every size.

Calculated CSS boxes below are not browser measurements. Zero safe-area insets,
settled layout, unavailable wake lock (the DOM fixture's smaller canvas): the
wake notice uses 13 × 1.3 + 5 = 21.9 px. Let B be Lock in's natural packed width:
max(144, ceil(measured 34 px “Lock in” label width + 32)). The 32 is two
13 px horizontal paddings plus two 3 px borders. Font-dependent B must not be
reported as a measured constant. The packer centres the grid unless the action
column requires it to shift left.

All boxes are (x, y, width, height). Each grid formula enumerates all 16 controls
with column c and row r independently taking 0, 1, 2, 3.

| Viewport | Menu | Each card | Lock in |
| --- | --- | --- | --- |
| 667 × 375 | (565, 0, 89, 68) | (min(148, 283−B)+94c, 56.55+73r, 89, 68) | (659−B, 128.05, B, 144) |
| 844 × 390 | (742, 0, 89, 68) | (min(232, 438−B)+97c, 59.55+76r, 89, 68) | (831−B, 135.55, B, 144) |
| 932 × 430 | (830, 0, 89, 68) | (min(276, 526−B)+97c, 79.55+76r, 89, 68) | (919−B, 155.55, B, 144) |

For example, at the 144 px action floor, the card x positions are
139/233/327/421, 232/329/426/523 and 276/373/470/567 respectively;
Lock in x is 515, 687 and 775. Separation does not depend on that example:
the rightmost card edge is at most 519, 612 and 656, below Menu's left
565, 742 and 830. Lock in's top is always greater than Menu's bottom 68.

With wake lock available, the preferred 13 px margins/gaps fit all three sizes.
Cards are (min((W−380)/2, W−406−B)+97c, Y+76r, 89, 68), with
Y=63/70.5/90.5. Lock in is (W−13−B, Z, B, 144), with
Z=139/146.5/166.5. These also remain clear of Menu. The header and game
canvas are unchanged, preserving the inputs to team-polish and K-09 geometry;
their browser assertions still require integrator execution.

Round-7 validation: Vitest 463 passed; six Chromium-backed tests **not run**
(the runner reports immediate missing-executable launch failures under
/nonexistent). TypeScript, ESLint and design lint passed. Starting one-minute
loads: Vitest 3.42 (final CSS rerun 3.05), TypeScript 3.78, ESLint 3.78,
design lint 3.88 (final CSS rerun 2.75). Only the four authorised check commands
were used. No verify, UAT, perf, install or commit. No screenshots or rendered
geometry are claimed. Close-out: ready for integrator browser checks. Requests:
rerun phone-coverage and team-polish in Chromium, retaining every existing check.

### Round 8 — Paused primary and ghost actions (PLAT-023)

Correct the Paused action selector scope to `.phone-game-page` and remove the
panel painter from both buttons. Resume uses `--ka-accent` / `--ka-accent-ink`
(Board 4 `--k-acc` / `--k-acci`); Quit uses transparent fill and
`--ka-on-colour` text with a 3 px solid border. Both use token weight 700 and
radius 13. Existing target sizes (89 × 68 minimum), press scale 0.97,
leader restrictions and “Only the leader can quit.” remain. Disabled buttons
retain their individual paint at `1 - --ka-opacity-ghost` = 0.92 opacity.
The existing three-size, two-role DOM test now checks computed accent fill,
transparent ghost fill, no gradient, solid 3 px borders and disabled opacity.

WCAG sRGB relative-luminance calculations (not browser measurements):
Resume on-accent/accent ratios are console and Tabao Rush 5.95:1,
Rabakz 8.00:1, Peek Poker 6.13:1. White ghost text and border on the veil
are at least 12.39:1: composite 92% `--ka-seat-numeral` (#2B2118) over
white, the brightest possible backing. At disabled 0.92 opacity that ghost
contrast is at least 10.75:1. All exceed 4.5:1.

Validation: 463 Vitest tests passed; six Chromium-backed tests **not run**
(immediate missing-executable launch failures under /nonexistent), including
the new computed-style assertions. TypeScript, ESLint and design lint passed
(420 files). Final command starting one-minute loads: Vitest 3.07,
TypeScript 2.90, ESLint 2.93, design lint 2.71. Design lint initially caught
a raw transparent-colour literal in the assertion; it now uses a computed
transparent reference instead. Only the four authorised check commands ran.
No verify, UAT, perf, install, node_modules linking or commit.

Close-out: code and DOM assertions ready for integrator review. Requests:
run the Chromium checks and review the rendered leader/non-leader Paused
buttons; no new screenshots or visual acceptance are claimed here. Current
evidence is round5-p8 and remains integrator-owned.

### Round 9 — veil stacking, shared closed-room copy and picker wording (PLAT-009, PLAT-023)

The shared phone veil layer now has z-index 3, above the Menu target at 2;
no existing UI z-index token is defined. Menu retains its disabled state while
Paused or Reconnecting is shown, preventing activation. Round 10 adds focus
transfer into the veil. The Chromium
phone console test now checks, for both leader roles at all three sizes, that
`document.elementFromPoint` at the Menu pill centre lands inside the Paused
veil and that Menu is disabled. Round 10 replaces the disabled-button focus assertion with
explicit focus entry and restoration checks.

`team-setup.ts` exports one `CLOSED_ROOM_REASON`, used by the host sender,
phone receiver and their tests. The phone action, DOM assertions, UAT selectors
and this note now say “Quit to picker”, matching the existing `10-quit-picker`
destination. “Only the leader can quit.” remains unchanged. The user's existing
UAT edit removing the post-quit reconnect allowance is preserved.

Validation: 504 Vitest tests passed. Twelve Chromium tests **not run**: launch
failed immediately because the executable under `/nonexistent` is unavailable;
the new hit-test assertions await integrator execution. ESLint passed with no
warnings; design lint passed (450 files). One-minute starting loads were 2.92
for Vitest, 3.46 for ESLint and 3.32 for design lint, all below 8.
`pnpm exec tsc -b tsconfig.build.json` was not run: referenced library configs
emit declarations/maps, conflicting with the explicit no-emission instruction.
No verify, UAT, perf, install, node_modules linking or commit was run.

Close-out: round-9 changes ready for review. Requests: integrator runs the
Chromium tests and TypeScript check; no browser or visual acceptance is claimed.


### Round 10 — veil focus entry and restoration (PLAT-023, D-051)

`phone-route.tsx` moves focus into the incoming phone veil in a layout effect:
Resume for a connected leader, otherwise the dialog itself (`tabIndex=-1`),
including Reconnecting. Focus tracking remembers whether focus was inside the
veil; closing it restores Menu only in that case. Outgoing transition layers
are excluded from focus entry. Focus never waits for animation, so reduced
motion uses the same immediate behaviour.

`phone-coverage.dom.test.ts` replaces the disabled-button `.focus()` assertion
with actual active-element containment and leader/non-leader target assertions.
Both roles close Paused and assert Menu receives focus; Reconnecting also checks
dialog focus and Menu restoration. Existing geometry, paint and hit tests remain.

All evidence references in this note now use the integrator's round5-p8 run.
Reported timings are reconnect 129.6 ms and host recovery 2132.5 ms. No evidence
folder files were edited and no new browser or visual acceptance is claimed.

Checks, each started with uptime one-minute load below 8:

| Authorised command | Result | Starting load |
| --- | --- | --- |
| `PLAYWRIGHT_BROWSERS_PATH=/nonexistent VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src` | 504 passed; 12 browser tests not run (immediate missing-Chromium launch failures) | 6.62 |
| `pnpm exec tsc -b tsconfig.build.json` | Passed; no new source-side .js/.js.map/.d.ts files remained | 5.91 |
| `pnpm exec eslint apps/web/src --max-warnings 0` | Passed | 5.54 |
| `pnpm run lint:design` | Passed; 450 files scanned | 6.27 |

Close-out: requested focus fix, assertions and slice-note corrections complete.
Requests: integrator runs Chromium assertions and reviews focus behaviour for
both roles and veils. Evidence README, VALIDATION and REPORT remain untouched.
No verify, UAT, perf, install, node_modules linking or commit was run. No restricted
documents, contracts, dependencies or lockfile changed.

### Integrator, after round 10 (2026-11-18)

- Real Chromium: the 12 apps/web browser tests passed; `phone-coverage.dom.test.ts` passed three runs in a row.
- `round6-p8/` reviewed image by image. Closing review found a browser focus ring on the non-leader Connection lost veil (still 63). Fixed at merge with `.phone-game-veil:focus { outline: none; }` and a Chromium assertion, re-shot as `round7-p8/` (62–63 clean).
- PERF-020 controller cold start at round 10: median 171 ms against 2,000 ms (5 runs, CPU 4×), `uat/evidence/C-15-console-e2e/perf-r10-startup.json`.
- Earlier lines in this note that name round5-p8 or say the README, VALIDATION and REPORT are untouched are superseded by this section.
