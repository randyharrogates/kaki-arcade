# C-18 — Final-screen hand-off band

Requirements: PLAT-022, PLAT-024, PP-032, RZ-032.

Goal: keep the shell hand-off at the same artboard proportions as each final board,
with every ranking row clear of its reserved foot.

Acceptance: at 1920 × 1080, 1280 × 720 and 3840 × 2160, both hint variants
use the board scale; eight-player Peek Poker and eight-player free-for-all/team Rabakz rankings
remain above the hint. No duplicate final-screen hand-off remains.

Changes: `FINAL_HINT_BAND` in UI tokens is 55 + 34 artboard px, exported to CSS.
The shell uses the existing `--screen-scale` on a centred 1920 × 1080 layer;
the hint has an explicit 34 px line and 55 px bottom inset. Peek Poker replaces
its temporary 89 + 55 reserve with the shared band (D-209).
Rabakz removes its final "Leader can continue" text because it duplicates the
shell instruction. Its scoreboard keeps its automatic-continuation information.
Rabakz centres final content in the area above the band without body scaling.
Tied-team finals recover 46 px through token gaps, keeping ranked text at 34 px
and reducing the eight-player body from 880.8 px to 842.8 px (847 px available).

Tests: the existing Peek Poker DOM test checks hint height and nonintersection;
a new Rabakz DOM test checks eight players with teams, including tied teams,
both hint variants and all three TV sizes. The Rabakz centring assertion now
uses the shared band and the occupied unscaled body height.

UAT: `uat/slices/C-18-final-hint.mjs` pairs eight real phones through the harness,
selects each game through the leader phone and reaches finals using the real rules'
timeouts and automatic scoreboard continuation, accelerated by Playwright's host
clock. Rabakz enables teams through the phone setup. Each match captures the phone
hint first, then a harmless Shift key selects the keyboard hint, at all three sizes.
The slice reads DOM geometry and checks eight player rows, team marks, hint scale
and nonintersection. The untied match dynamically imports `virtual:rabakz-bank` on the host as an
answer oracle (R-08 precedent). It mounts no fixture.
Run (integrator):

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5260 KAKI_PORT_SIGNAL=5261 pnpm uat -- C-18-final-hint --phones 8 --timeout-min 20 --out round4
```

## Close-out and Requests

Validation results are recorded below. Round-4 evidence and review-2 acceptance
are now recorded; round 5 applies only review 2 should-fixes 1, 2, 3 and 6.
No UAT, perf, verify, dependency installation or commit was run in round 5.

Round 2 validation, in the requested order (1-minute `uptime` load at launch):

| Check | Load | Result |
| --- | --- | --- |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web games/peek-poker games/rabakz` | 3.08 | 969 passed, 26 failed; 84 files passed, 19 failed, 42.09 s. Every failure is a Chromium launch or localhost-listener sandbox restriction (`bootstrap_check_in` permission denied / `listen EPERM`), including both final-layout DOM tests. |
| `pnpm exec tsc -b tsconfig.build.json` | 6.25 | No diagnostics; no source-adjacent `.js`, `.js.map` or `.d.ts` outputs found. |
| `pnpm exec eslint apps/web games/peek-poker games/rabakz packages/ui uat/slices/C-18-final-hint.mjs --max-warnings 0` | 6.75 | Passed, exit 0. |
| `pnpm run lint:design` | 6.62 | Passed, exit 0. |

All commands finished within ten minutes. `git diff --check` is clean. Check logs
are `/tmp/c18-vitest.log`, `/tmp/c18-tsc.log`, `/tmp/c18-eslint.log` and
`/tmp/c18-design.log`. No UAT stills were generated or visually reviewed in this
round. The integrator must run the harness slice above and rerun browser tests
in an environment that permits Chromium and localhost listeners before closure.
Round 2 changes were subsequently committed by the integrator.


## Round 3 — PLAT-022, PLAT-024, RZ-032 Rabakz final ranking reserve

The final layout now budgets against `FINAL_HINT_BAND` before choosing row gaps,
list separation and empty podium surface height. It keeps 13 artboard px below the
body for the row entrance travel. Round 3 retained 55 px row boxes but scaled every eight-player tied-team body,
reducing row text to about 32.7 px. Review 1 rejected that approach; round 4
below supersedes it and restores the 34 px minimum.
No Peek Poker product code or CSS changes.

Coverage: `apps/web/src/final-hint.dom.test.ts` extends the existing Chromium layout
approach to eight-player free-for-all, 4–4 teams and 7–1 teams, tied and untied team
scores, both hint variants and all three sizes. Free-for-all has two tied winners
on the podium plus six ranked rows; team finals have eight ranked rows, two team
headers and a team podium. Geometry includes the podium as well as every list row.
`games/rabakz/host/results.test.ts` also checks the rendered layout properties
without Chromium, including the full row entrance travel and the minimum type floor.
Historical geometry assertions now reflect the reduced final-screen budget.

The UAT runs Peek Poker, Rabakz free-for-all, then Rabakz teams via the R-08-style
phone Teams toggle and Pick a side setup. Every size/hint check is in `h.step`,
which captures a failure still. It lets the final crossfade/row entrances settle
before counting rows and checks the podium together with the list.

Round 3 validation results follow. Browser acceptance and new UAT evidence remain
for the integrator; no UAT, verify, perf, installation, links or commits were run.


| Round 3 check | 1-minute load at launch | Result |
| --- | --- | --- |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz apps/web` (first) | 3.39 | 813 passed, 29 failed in 73.03 s: 26 sandbox failures and 3 historical height assertions, subsequently corrected. |
| Same Vitest command (rerun) | 6.58 | 816 passed, 26 sandbox failures in 40.97 s; all Rabakz results tests pass. |
| `pnpm exec tsc -b tsconfig.build.json` (first) | 5.58 | Failed on the new fixture's exact optional team property; corrected by preserving the absent property and literal team IDs. |
| Same TypeScript command (rerun) | 5.47 | Passed, exit 0. No generated source-adjacent outputs: the three declarations found are tracked source files. |
| `pnpm exec eslint games/rabakz apps/web uat/slices/C-18-final-hint.mjs --max-warnings 0` | 5.37 | Passed, exit 0. |
| `pnpm run lint:design` | 4.64 | Passed, exit 0. |

Every command finished within ten minutes. Logs: `/tmp/c18-r3-vitest.log`,
`/tmp/c18-r3-vitest-final.log`, `/tmp/c18-r3-tsc.log`,
`/tmp/c18-r3-tsc-final.log`, `/tmp/c18-r3-eslint.log`, `/tmp/c18-r3-design.log`.
`git diff --check` passes. Existing untracked round-2 evidence was preserved.

Sandbox failures requiring an integrator rerun (all under `apps/web/src/`):

- `final-hint.dom.test.ts` — the expanded Rabakz final geometry test.
- `Overlap.dom.test.ts`, `PeekPoker.dom.test.ts`, `game-setup-host.dom.test.ts`,
  `game-setup.dom.test.ts`, `host-keyboard.dom.test.ts`, `host-peek-poker.dom.test.ts`.
- `kit-label-performance.dom.test.ts`, `late-join.dom.test.ts`, `layout-fixtures.test.ts`,
  `pause-panel.dom.test.ts`, `phone-coverage.dom.test.ts`, `phone-setup.dom.test.ts`.
- `poker-results.dom.test.ts`, `rabakz-phone.dom.test.ts` (eight parameterised tests),
  `shell-imagery.dom.test.ts`, `team-polish.test.ts`, `pages/tv-help.dom.test.ts`.
- `pages/legal.dom.test.ts` — localhost listener rejected with `listen EPERM`.

The other browser failures stop at Chromium launch with Mach-port
`bootstrap_check_in ... Permission denied`. They do not reach geometry assertions.
The existing R-08 teams still was inspected as defect context; no new screenshots
were generated or accepted. Request: run the expanded Chromium DOM test and the
updated UAT at all three sizes, inspect every still, then review before integration.
Round 3 changes were subsequently committed by the integrator (current base 7320646c).


## Round 4 — PLAT-022, PLAT-024, PP-032, RZ-032

Removed the final-body transform and its top-left transform origin. All final
bodies remain full width and centre vertically in the 847 px region above the
shell band. Tied-team geometry recovers 46 artboard px: member gaps 13 → 0
(save 26 across the two stacked members and surface), player gaps 5 → 0
(save 10), and group-label extra gaps 5 → 0 (save 10). The layout spends 8 px of that saving on podium-to-list separation, a net
38 px recovery: 880.8 → 842.8 px,
leaving 4.2 px spare in the region; the centred final row ends at 975.9 px,
15.1 px above the hint. Names, places, scores and group labels keep 34 px or larger
text. The late-unteamed fixture also fits within 847 px, retaining its 5 px
separation. The podium name padding and 55 px minimum surface stay intact.

Tests require no transform, 34 px row text, band clearance and centring for
2/4/8-player team finals, including 8-player 4–4 and 7–1 tied and untied scores.
Historical podium/list separation uses exact scenario snapshots again and scenario maxima use an
inline snapshot. Requirement tags now identify results and keyboard continuation,
plus the game-specific final podia.

The UAT preserves all previous steps and adds an eight-phone untied teams match
(three different phones answer correctly using R-08's shipped-bank oracle),
a one-phone final and a four-phone final. New stills use 1920 × 1080 and both
hint variants, with the harness's default settled-still wait. The untied case
asserts different team totals and highlighted rows. Existing eight-phone tied
and free-for-all matches still cover all three viewport sizes.

Integrator validation after round 3, recorded by review 1: at load 7.55,
`final-hint.dom.test.ts`, `results.test.ts`, `game-final-hint.test.ts` and
`poker-results.dom.test.ts` passed (4 files, 34 tests). Round-3 UAT completed all
24 steps without errors; all 18 stills settled. The reviewer inspected stills
01–18 (some via contact sheets) and the 4K band crops, confirming clearance but
finding the body scaling defect. Those pictures cover tied eight-player teams.

Round-4 UAT completed all 36 steps without errors, with all 24 stills settled.
Review 2 is clean: the reviewer opened or measured the stills listed in the round4
evidence report and confirmed the body scale, centring and band clearance fixes.
Review 2 also records a Vitest pass at load 7.61: 11 files, 177 tests in 6.1 s
(`games/rabakz/host`, `apps/web/src/final-hint.dom.test.ts`,
`apps/web/src/game-final-hint.test.ts`), including Chromium DOM coverage.

No perf run is needed because this change is static layout with no frame loop.
Round-4 code and evidence were committed by the integrator before review 2.

Round 4 validation (all pnpm commands prefixed with
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; Vitest capped at two workers):

| Check | 1-minute load at launch | Result |
| --- | --- | --- |
| Initial Vitest launch | 9.03 | Stopped immediately after discovering load had risen above 8 since the prior reading (5.99). Subsequent launches used an automatic load gate. |
| Requested Vitest selection, first guarded run | 7.92 | 441 passed, 4 failed: browser sandbox plus three layout expectations/fixtures, corrected. |
| Same selection, second guarded run | 7.96 | 442 passed, 3 failed: browser sandbox plus two exact body-height expectations, corrected to include the restored 8 px podium/list gap. |
| Same selection, final guarded run | 5.48 | 444 passed, 1 failed; 34 files passed, 1 failed, 59.69 s. Only `apps/web/src/final-hint.dom.test.ts` is blocked at Chromium launch (`bootstrap_check_in ... Permission denied`); no browser geometry assertion ran. All Rabakz and Peek Poker tests passed. |
| TypeScript build, first | 7.30 | Literal token inference rejected variable geometry gaps; corrected with explicit numeric gap types. |
| TypeScript build, rerun | 6.09 | Passed, including the checked-JavaScript UAT slice. No source-adjacent emitted files found; tracked declarations preserved. |
| Requested ESLint selection, first | 6.94 | One unsafe JSON assignment in the UAT oracle; corrected by narrowing from `unknown`. |
| Requested ESLint selection, rerun | 6.56 | Passed, exit 0. |
| Design lint | 6.51 | Passed; 485 files scanned. |

Logs: `/tmp/c18-r4-vitest.log`, `/tmp/c18-r4-vitest-final.log`,
`/tmp/c18-r4-vitest-rerun.log`, `/tmp/c18-r4-tsc.log`,
`/tmp/c18-r4-tsc-rerun.log`, `/tmp/c18-r4-eslint.log`,
`/tmp/c18-r4-eslint-rerun.log`, `/tmp/c18-r4-design.log`.
Review 2 subsequently passed the Chromium test outside this sandbox.

All completed checks finished within ten minutes; none required a timeout stop.
`git diff --check` passes. The round4 REPORT.md now records the attributed review.


## Round 5 — review-2 merge-time should-fixes

Corrected the two remaining PLAT-022 comment tags, refreshed this note and the
attributed round4 evidence report, removed obsolete body-scale assertions,
compared final fit failures against the 847 px final region, and extended the
DOM font check to group labels and podium points. The expanded DOM check is
outside this round's requested Vitest selection.

All pnpm commands used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`.

| Check | 1-minute load at launch | Result |
| --- | --- | --- |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz/host games/peek-poker/host packages/ui` | 4.57 | Passed: 19 files, 282 tests; 4.32 s. |
| `pnpm exec tsc -b tsconfig.build.json` | 4.76 | Passed, no diagnostics; no newly emitted files to delete. |
| `pnpm exec eslint games/rabakz/host games/peek-poker/host packages/ui --max-warnings 0` | 5.67 | Passed, exit 0. |
| `pnpm run lint:design` | 5.54 | Passed; 485 files scanned. |

All checks finished within ten minutes. Logs: `/tmp/c18-r5-vitest.log`,
`/tmp/c18-r5-tsc.log`, `/tmp/c18-r5-eslint.log`, `/tmp/c18-r5-design.log`.
`git diff --check` passes. Changes are left uncommitted as requested.
