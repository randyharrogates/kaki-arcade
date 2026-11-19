# R-20 — Team podium, round 1

## Goal and requirements

RZ-012, RZ-016, RZ-032: put every finalist on the appropriate shared podium step,
with teams placed by authoritative totals and their members ordered by individual score.

Backlog scope, verbatim:

> Rabakz TV results: in team mode a podium step per team place (one "Tied for first" step when the teams tie), each listing its players by score with no place numbers; in free-for-all every tied player stands on their step, "Tied for first" when everyone ties; names at 34 px or more; DOM tests at 2, 4 and 8 players; built on C-18 round 4's layout (D-221, D-224, D-233)

## Implementation and acceptance

- The final model groups competition places without capping tied members. Team
  members retain descending score order, with seats breaking display-order ties.
- Team steps include the team name, token colour, total and member rows without
  individual place numbers. Tied teams share one labelled step with two team columns.
- Free-for-all podium places retain every tied member; groups larger than two
  use two columns within their step. Lower places appear once in the remaining list.
- Names, individual points, team names and totals use the 34 px TV body floor.
  Twelve-character wide-name scenarios exercise the existing ellipsis policy.
- The body stays centred above C-18's shared final hint reserve. Steps retain
  the 30 ms stagger, slow duration and ease-out mask entrance; reduced motion
  renders the same state without that animation.
- Scoreboards and solo finals retain their existing presentation. Late unteamed
  players remain visible after the team podium with an explicit No team label.
- CSS additions are isolated in the R-20 block at the end of screen.css.

## Tests and UAT

Unit coverage checks authoritative team places, team ties, mixed individual scores,
everyone tied, complete membership, body centring and entrance motion at 2/4/8 players.
Obsolete assertions for the capped podium and separate team list are replaced.

`apps/web/src/rabakz-podium.dom.test.ts` checks both modes, two-way and all-player
ties, balanced and 7–1 teams, 2/4/8 players and both 1920 × 1080 and 1280 × 720.
It calls the existing overflow checker, checks membership, shared-step labels,
the 34 px font floor and clearance above the shell hint. C-18's Rabakz DOM
assertions now expect members within steps. The integrator runs DOM tests.

The UAT slice uses the existing Rabakz dev scenarios. At both viewport sizes it
captures distinct teams, tied teams, two-way free-for-all ties, everyone tied,
eight-player free-for-all and eight-player teams (distinct and tied). An additional
still covers reduced motion. Evidence basenames contain only letters, digits and
hyphens. No new shared UAT helpers or scenarios are needed.

Run from this worktree:

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- R-20-team-podium --phones 1 --out round1
```

Use the worktree's assigned web/signal/UAT ports 5820/5821/5822. Open every still
and motion strip before accepting the visual result.

## Validation

All pnpm checks used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; Vitest used
`VITEST_MAX_WORKERS=2`. Every executed check finished within ten minutes.

| Check | 1-minute load at launch | Result |
| --- | --- | --- |
| Requested Rabakz unit selection, first | 5.41 | 324 passed, 3 failed: obsolete team-list assertions and overflow surface coverage; corrected. |
| TypeScript build, first | 6.23 | Passed, including the checked-JavaScript UAT slice. |
| Unit rerun gate | 10.58 | No pnpm process launched; waited for load below 8. |
| Requested Rabakz unit selection, rerun | 7.46 | 18 files, 324 tests passed. |
| TypeScript build, final | 6.09 | Passed, including final DOM test sources and UAT slice. |
| Requested ESLint selection | 6.78 | Passed, no warnings. |
| Design lint | 6.76 | Passed, 508 files scanned. |
| Requested Rabakz unit selection, final | 6.54 | 18 files, 325 tests passed in 45.81 s, including the additional all-results-fixture check. |

The exact unit selection was `pnpm exec vitest run games/rabakz --exclude
'**/*.dom.test.ts' --exclude '**/layout-fixtures.test.ts' --exclude
'**/team-polish.test.ts'`. TypeScript used `pnpm exec tsc -b tsconfig.build.json`;
ESLint used `pnpm exec eslint games/rabakz uat/slices/R-20-team-podium.mjs
--max-warnings 0`; design lint used `pnpm run lint:design`.

After validation, 1,030 generated TypeScript outputs and build-info files were
deleted using TypeScript's project output list. Tracked sources and the generated
content bank were preserved. `git diff --check` passes. No DOM test or UAT was run;
there are no new screenshots or visual acceptance claims. Check logs are small
files at `/tmp/r20-vitest.log`, `/tmp/r20-vitest-rerun.log`,
`/tmp/r20-vitest-final.log`, `/tmp/r20-tsc.log`, `/tmp/r20-tsc-final.log`,
`/tmp/r20-eslint.log` and `/tmp/r20-design.log`.

No verify, UAT, performance run, install or commit is performed by this issue agent.

## Close-out

Implementation is ready for the integrator's checks and independent review, subject
to the validation results below. Close-out: the integrator commits and runs UAT to round1.
No brief conflict with the PRD, game rules or DESIGN was found.

## Requests

Run the new Rabakz podium DOM test and updated final-hint DOM test, run the UAT
command above, inspect every still, and review before integration. Shared trackers
and evidence reports remain the integrator's responsibility.

## Round 2 — overflow corrections

RZ-012, RZ-016, RZ-032. The integrator's round-1 Chromium report exposed three
layout defects; the overflow checker and DOM assertions are unchanged. The
integrator's uncommitted `document.fonts.ready` wait is preserved.

- The results title now has the question header's 13 px descender clearance.
  The results body is absolutely positioned, so its position is unchanged.
- The final frame now supplies `--rz-name-fr` (1.618fr). Without it, the inherited
  ranked-row grid declaration was invalid and lower free-for-all rows stacked
  their cells vertically. The final score area also has only one column because
  final rows have no gained-points cell.
- The final frame supplies the body line-height variable as well. Team totals
  use a centred, single-line flex row: a grid had put the Score span and anonymous
  “ pts” text into separate rows inside a 55 px box. Preserved whitespace keeps
  the word space between those flex items.
- Member geometry budgets `max(55, 34 × 1.3 + 2 × 5)` = 55 px, accounting for
  the badge, body line and font clearance. CSS uses the same 55/34/5 tokens.
  Names keep ellipsis only on `.rz-rank-name`, where the checker recognises it.

These fixes apply identically to both viewport scales and keyboard states. Team
4–4 and 7–1, distinct and tied, keep their existing member counts and height
budgets; free-for-all shared steps and the lower ranked list retain all players.
The largest seven-member team occupies 7 × 55 px; the all-player free-for-all tie
uses four rows in two columns. No type is scaled below 34 px on the artboard.
The C-18 centred body, golden-ratio columns, podium heights, hint band and entrance
motion remain unchanged.

Round-2 checks run sequentially without load gating, as requested. No Chromium,
UAT, verify, performance, install or commit is run by this issue agent.

| Round-2 check | Result |
| --- | --- |
| Requested Rabakz unit selection, `VITEST_MAX_WORKERS=2` | Passed: 18 files, 325 tests; 57.67 s. |
| `pnpm exec tsc -b tsconfig.build.json` | Passed, including DOM sources and the checked-JavaScript UAT slice. No newly created emit files remained; pre-existing outputs were preserved. |
| Requested Rabakz/UAT ESLint selection | Passed, no warnings. |
| `pnpm run lint:design` | Passed. |
| `git diff --check` | Passed. |
| Chromium DOM matrix / UAT | Not run: integrator-owned browser validation. |

Small check logs: `/tmp/r20-r2-vitest.log`, `/tmp/r20-r2-tsc.log`,
`/tmp/r20-r2-eslint.log`, `/tmp/r20-r2-design.log`. Every check completed within
ten minutes. There were no requirement or architecture conflicts.

Round-2 Close-out: layout corrections are ready for independent review and the
integrator's Chromium run. No claim of measured zero overflow is made without
that run. The integrator commits and runs UAT; the round-1 command above remains
available with `--out round1`.

Round-2 Requests: rerun `apps/web/src/rabakz-podium.dom.test.ts` across its full
72-case matrix, run the existing final-hint DOM test, and inspect the UAT stills
before accepting this layout. No shared trackers or evidence reports were edited.

## Round 3 — readable worst-case podium names

RZ-012, RZ-016, RZ-032. Reviewed the integrator's
`round1/05-host-failure.png`: six third-place players occupied two narrow
columns while the centred body left substantial unused vertical room.

Free-for-all steps now list members in one column. The geometry budgets every
55 px member row, so six third-place players use 330 px and an eight-player
first-place tie uses 440 px. The body grows upwards and downwards around its
existing centre, above the hint reserve; relative step heights remain 144/89/55.
Team columns, 1.618 name/score splits, 34 px type, token gaps and motion remain.
Individual podium scores omit the repeated visible “pts” suffix and retain an
accessible points label. This gives each of the three narrow steps enough name
width without reducing the name, badge or score type. Team totals retain “pts”.
No overflow-checker rules were changed.

The DOM fixture explicitly sets every name to `WWWWWWWWWWWWW` (13 W's),
preserves `document.fonts.ready`, and adds the eight-player, three-step `podium`
scenario alongside the existing tie cases. Its 76 cases retain both viewport
sizes and keyboard states. A unit regression checks the six-member single
column and its complete height budget. Browser fit awaits the integrator's run.

Round-3 checks run one at a time, without load gating. No browser DOM test,
verify, UAT, perf, install or commit is run by this issue agent.

Round-3 Close-out and Requests: **the integrator runs DOM tests, verify and UAT to round2**.
Use `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- R-20-team-podium --phones 1 --out round2`,
inspect every still, and obtain independent review before integration.

| Round-3 check | Result |
| --- | --- |
| Requested Rabakz unit selection, initial | Passed: 18 files, 325 tests; 44.09 s. |
| Requested Rabakz unit selection, final including height regression | Passed: 18 files, 326 tests; 49.83 s. |
| `pnpm exec tsc -b tsconfig.build.json` | Passed, including DOM sources and checked-JavaScript UAT. No newly emitted output files remained; pre-existing outputs preserved. |
| Requested Rabakz/UAT ESLint selection | Passed, no warnings. |
| `pnpm run lint:design` | Passed. |
| `git diff --check` | Passed. |
| DOM matrix / verify / UAT | Not run; the integrator runs DOM tests, verify and UAT to round2. |

Logs: `/tmp/r20-r3-vitest.log`, `/tmp/r20-r3-vitest-final.log`,
`/tmp/r20-r3-tsc.log`, `/tmp/r20-r3-eslint.log`, `/tmp/r20-r3-design.log`.
Every check finished within ten minutes. No brief conflicts were found.

## Round 3 — review fixes

RZ-012, RZ-016, RZ-032. This section records the requested review-fix round;
prior round headings above are retained as history.

- C-18 UAT now counts all finalists, checks both team titles and totals, and
  checks the winning or shared tied step using the R-20 structure.
- The tied-team fixture explicitly assigns 300 points to each team's first
  member and zero to its remaining members, matching both 300-point totals at
  four and eight players. A regression checks member-sum conservation for every
  podium team fixture at both counts. Alternating winners was tried first, but
  the doubled final question made the totals unequal; the explicit fixture
  approach permitted by the brief is used instead.
- Final team totals animate from the standings baseline, with a unit regression.
  The C-18 round-4 colour mark beside the name replaces the filled header pill;
  the total stays above the members. Header descender padding is final-only.
- The DOM size matrix now includes 3840 × 2160 for the same fit, centring and
  hint-clearance assertions. The unused ResultsFrame measure prop and dead
  podium CSS variables are removed.
- R-20 UAT adds late unteamed, 7–1 teams, partial ties, tied second place and
  non-final team scoreboard stills at 1920 and 1280. Each uses the existing
  overflow check. A playable single-winner split fixture supplies the 7–1 case.
  The entrance strip is composed in the slice so labels use the paused animation
  currentTime rather than the harness's wall-clock capture time.

Checks ran one at a time without load gating, all within ten minutes:

| Review-fix check | Result |
| --- | --- |
| Requested games/rabakz + apps/web Vitest selection, initial | 861 passed, 3 failed: the attempted alternating-winner fixture was unequal; corrected. |
| Same Vitest selection, final, VITEST_MAX_WORKERS=2 | Passed: 70 files, 864 tests; 47.22 s. |
| TypeScript build, including both checked-JavaScript UAT slices | Passed. Output-list cleanup found no newly created emit files; pre-existing outputs preserved. |
| Requested ESLint selection, including both UAT slices | Passed, zero warnings. |
| Design lint | Passed. |
| git diff --check | Passed. |

All pnpm commands used PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false. Logs:
`/tmp/r20-review-vitest.log`, `/tmp/r20-review-vitest-final.log`,
`/tmp/r20-review-tsc.log`, `/tmp/r20-review-eslint.log`,
`/tmp/r20-review-design.log`.

Round-3 review-fix Close-out: changes are ready for independent review. No DOM
checks, verify, UAT, perf, install or commit were run. No new visual evidence or
measured browser-fit claim is made. No brief conflicts were found.

Round-3 review-fix Requests: the integrator runs the DOM tests, verify, UAT and
perf, inspects every still and strip, and commits. Exact UAT commands from this
worktree (web 5820, signal 5821; assigned UAT port 5822):

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5820 KAKI_PORT_SIGNAL=5821 pnpm uat -- R-20-team-podium --phones 1 --out round3
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5820 KAKI_PORT_SIGNAL=5821 pnpm uat -- C-18-final-hint --phones 8 --out round3
```

## Round 4 — scoreboard header scroll clearance

RZ-032. Opened `round3/05-host-failure.png` and read the round-3 checker
comparisons. The offending surface is the results title span,
`.rz-results .rz-header > :first-child`, containing “Scoreboard” and the inline
`.rz-round-label`. The failure is **scroll overflow of the header**, not text ink
outside it: all four ink comparisons fit, but its scroll extent reaches y=120
(65 px high) against y=55–110 (55 px high). The display title uses a 55 px,
line-height-1 line without the clearance already applied to finals.

Extended the existing `--ka-space-13` bottom clearance from final titles to every
results title. The header now contains the display font's scroll extent within
its 68 px box. Scoreboard content below it flows down by 13 px; absolutely
positioned final bodies retain their positions. No checker, tolerance, type size
or token was changed. This uses the existing phi spacing scale.

Source audit: solo, free-for-all and team scoreboards share ResultsFrame and the
same title span; solo finals and free-for-all/team podiums already used this
clearance and retain it. Question and reveal screens share Screen's header;
both heading and category copy branches already reserve 13 px below their
lines, including outgoing copies. Their existing geometry regression remains.
A new results unit regression covers scoreboard, team/tied scoreboards, solo
finals and free-for-all/team podium markup and the reported scroll budget.

A small standalone Playwright inspection was attempted, but Chromium could not
launch in this sandbox (`bootstrap_check_in ... Permission denied (1100)`). No
browser measurements were obtained; source audit and the existing failure
measurements underpin this correction. No DOM test or UAT was run.

| Round-4 check | Result |
| --- | --- |
| Requested Rabakz Vitest selection, VITEST_MAX_WORKERS=2 | Passed: 18 files, 329 tests; 41.07 s. |
| `pnpm exec tsc -b tsconfig.build.json` | Passed. |
| `pnpm exec tsc -b tsconfig.build.json --clean` | Passed. |
| `pnpm exec eslint games/rabakz --max-warnings 0` | Passed, zero warnings. |
| `pnpm run lint:design` | Passed. |
| `git diff --check` | Passed. |

Checks ran one at a time, each with a ten-minute deadline and
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`. Logs:
`/tmp/r20-r4-vitest.log`, `/tmp/r20-r4-tsc.log`,
`/tmp/r20-r4-tsc-clean.log`, `/tmp/r20-r4-eslint.log`,
`/tmp/r20-r4-design.log`. No verify, UAT, install or commit was performed.
Sparse-checkout settings and shared trackers were left alone.

Round-4 Close-out: correction and unit regression are ready for independent
review; measured browser fit remains pending.

Round-4 Requests: the integrator runs `apps/web/src/rabakz-podium.dom.test.ts`
and `apps/web/src/final-hint.dom.test.ts`. Also inspect the existing
`games/rabakz/dev/overflow.html` matrix for question/reveal, solo, free-for-all
and teams at all three sizes, including **overhang** findings, then rerun R-20
UAT and inspect every frame. No brief conflicts were found.

## Round 5 — follow-ups after review 2

RZ-012, RZ-016, RZ-032. The integrator merged main (R-16, commit
`2d7146f1`) and changed both Results headers to `h1`, with the results unit
expectation updated accordingly. Those integrator changes are preserved.

- R-08 full-match UAT now reads team names and totals from `[data-final-team]`,
  `[data-final-team-title]` and `[data-final-team-total]`, stripping “ pts”. It
  compares the same expected Red team / Blue team scores and all player scores.
  The existing player, free-for-all and solo selectors match Results.tsx.
- The podium DOM matrix adds one assertion requiring a `.rz-team-mark` within
  every team title and a transparent computed title background. This guards
  against the filled team pill returning.
- R-20 UAT appends the real eight-player `scoreboard` and
  `scoreboard-teams-late` fixtures to the existing cases. Both use the same
  font-ready wait and overflow check at 1920 × 1080 and 1280 × 720.

Round-5 Close-out: source changes are ready for review; checks are recorded below.
No DOM tests, UAT, verify, install or commit were run, and no new screenshot or
browser-fit claim is made.

Round-5 Requests: the integrator runs `apps/web/src/rabakz-podium.dom.test.ts`
and `apps/web/src/final-hint.dom.test.ts`, runs both affected UAT slices and
inspects the resulting stills, including the added scoreboard cases.

All requested checks ran one at a time and completed within ten minutes, with
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false` on every pnpm invocation.

| Round-5 check | Result |
| --- | --- |
| Requested Rabakz unit selection, `VITEST_MAX_WORKERS=2` | Passed: 19 files, 335 tests; 34.15 s. |
| `pnpm exec tsc -b` | Passed, including rerun after the lint comment. No new emitted files outside dist required removal. |
| Requested ESLint selection (Rabakz, both UAT slices, podium DOM source), `--max-warnings 0` | Passed, including final rerun; zero warnings. |
| `pnpm run lint:design` | Initially flagged the test's literal transparent colour. Added a supported line-level reason: it asserts browser-computed transparency rather than styling a surface. Final run passed: 520 files. |
| `git diff --check` | Passed. |
| DOM tests / UAT / verify | Not run, as requested. |
