# C-22 — Scores per game

## Goal and requirement

PLAT-009, D-226: keep completed-round cumulative per-seat scores separately by game
metadata id across a host reload. Preserve C-15's room, seats, teams, leader and last
results recovery; every running match is still lost and restore returns to the lobby.

## Changes and acceptance

- The host snapshot stores `scores[seatId][gameId]`, using the selected game's module
  metadata id. A completed result adds only to that game's total, once per results
  screen. There is no game-specific platform logic or new UI.
- Extended the existing C-15 host reload regression: two games have distinct totals,
  a repeated completed round accumulates only in its game, duplicate results count
  once, and a subsequent interrupted round adds nothing. Reload preserves both totals
  and the last results unchanged and returns to the lobby.
- Extended leave and expiry regressions to populate two games before freeing the seat;
  both paths remove all of that seat's scores before a new player occupies it.
- The snapshot codec validates nested finite totals. Legacy numeric per-seat totals
  load with their scores dropped, preserving room identity and last results. Such
  totals may already mix several games; the last selection cannot reliably identify
  which game earned them. A regression covers this migration without a version bump.
- Existing reconnect fixtures now use nested scores.
- Updated the existing C-15 UAT snapshot assertions (the brief's explicit exception
  to the path scope): parse the complete JSON score object rather than a regex that
  stops at the first closing brace, and wait for the fixture game's nested total.

## UAT and stills

No new UAT slice or stills: the change affects stored data only and adds no visible
behaviour. The existing C-15 UAT assertions were updated but UAT was not run, as
instructed. No verify, perf, install, dependency changes or commit.

## Validation

Every pnpm command uses
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`. Vitest uses `VITEST_MAX_WORKERS=2`.
An initial typecheck launch mistakenly started at load 9.04 and was interrupted;
it is not accepted as validation. Subsequent check launches use a load guard.

## Close-out and Requests

Implementation and test changes reviewed against the partial round-1 diff. Final
validation and any sandbox limitations are recorded below. Integrator owns independent
review and any browser-backed reruns outside the sandbox.

### Round 1b results

| Command | One-minute load at launch | Result |
| --- | --- | --- |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web packages/platform` | 3.66 | 1,606 passed, 1 skipped, 25 failed across 18 files; all failures are sandbox restrictions (24 Chromium launches denied with Mach port permission errors; `pages/legal.dom.test.ts` denied a localhost listener with EPERM). Score/reload regressions passed. |
| Clean `pnpm exec tsc -b tsconfig.build.json` | 5.81 | Failed: three out-of-scope game reconnect fixtures still supply numeric scores (listed below). Emitted files deleted with `tsc -b tsconfig.build.json --clean` afterwards. |

The initial typecheck attempt at load 9.04 was interrupted (exit 130). Guarded
attempts at 8.63 (typecheck) and 18.92 (ESLint) did not launch their checks.
ESLint also waited without launching at load 21.59. No command ran for ten minutes.

Requests: update `const scores` in `games/rabakz/src/reconnect.test.ts:82`,
`games/peek-poker/src/reconnect.test.ts:75` and
`games/tabao-rush/src/reconnect.test.ts:75` to
`{ 'seat-1': { [game.meta.id]: 83 }, 'seat-2': { [game.meta.id]: 42 } }`.
These fixtures are outside the authorised paths; no game-track file was changed.
Rerun the clean workspace typecheck after those fixture updates, and rerun browser
checks outside the sandbox. No product behaviour requires changing for those failures.

ESLint (`pnpm exec eslint apps/web packages/platform --max-warnings 0`) first
launched at load 7.41 and found the partial test's forbidden non-null assertion.
Replaced it with an explicit result entry containing the same values; the final
ESLint run launched at load 7.75 and passed with zero warnings. No product code
changed after the Vitest/typecheck runs. `git diff --check` also passes.

Close-out: in-scope implementation complete; integration remains blocked on the
three game-owned fixture updates for a clean workspace typecheck and sandbox-free
browser test execution. No commit was made.
