# R-18 — TV reveal streak (round 2)

## Goal and requirements

RZ-008: show a sole winner's streak in the full-width TV reveal outcome.
RZ-006/RZ-030/RZ-031: preserve winner wording, fit, type and existing reveal motion.
The integrator's round-2 placement supersedes round 1's seat-tile proposal.

## Acceptance

- Streak 0/1 adds nothing; 2 adds ` · Streak 2`; 3 onwards also adds ` · +50 bonus`.
- Several winners, including team/tie wins, add nothing.
- Measure the complete outcome at the existing bold body token against the awards width;
  remove bonus first, then streak, if needed. Never shorten or compress a winner's name.
- Eight seats and twelve-character wide names fit at 1920×1080 and 1280×720.
- Seat tiles, publicView, scoreboard, podium and motion remain unchanged.

## UAT script

`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- R-18-tv-streak --phones 1`

Use worktree ports web 5800, signal 5801, UAT 5802. One real paired phone with a
12-character wide name wins three successive questions in the real console. The host-only
shipped-bank oracle identifies answers; the phone presses its actual buttons. Pause/advance
host time as R-08 does. Assert exact outcome and fit, and save settled reveals for wins 1,
2 and 3 at 1920×1080, plus win 3 at 1280×720. Evidence destination:
`uat/evidence/R-18-tv-streak/round1/` (run by the integrator; every still reviewed).

## Out of scope

Rules/scoring changes, private/public view changes, seat-tile changes, new tokens or motion.

## Close-out

Code: `games/rabakz/host/view-model.ts`, measured `revealOutcome` called by `screenModel`.
Tests: `games/rabakz/host/screen.test.ts`, `R-18 RZ-008 outcome streak`: 0–4 at
1/4/8 seats in FFA and team settings, multiple winners/nobody, longest wide names at both
sizes, measured fallback ordering and unchanged surface contrast ≥4.5:1.
UAT: `uat/slices/R-18-tv-streak.mjs`, run by the integrator into `round1/` (wins 1–3 at 1920, win 3 at 1280; reviewed). Integrator fixes at merge: the final-round bonus reads "+100 bonus" (review 1 must-fix, with a test that fails on the old code); diagnostic screen perf `perf-r18/` (median 16.7 ms, p95 16.7 ms, max 33.4 ms). The fallback is unit-tested only (12 wide characters plus the full suffix measure about 835 of 1808 px).
Verification (PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false on every pnpm command):

| Check | 1-minute load at launch | Result |
|---|---:|---|
| VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz | 4.47 | 18 files, 323 tests passed |
| pnpm exec tsc -b tsconfig.build.json | 5.23 | Passed, including UAT; emitted build files deleted |
| pnpm exec eslint games/rabakz uat/slices/R-18-tv-streak.mjs --max-warnings 0 | 8.19 | Clean, but invalid launch above limit; rerun below |
| Same ESLint command, load-gated rerun | 7.61 | Passed |
| pnpm run lint:design | 7.66 | Passed, 484 files |

`git diff --check` passed. No commit, verify, UAT, perf, install or tracker edits.
No command exceeded ten minutes.

## Requests

Integrator: run UAT, inspect evidence, complete full verification/review and record the delegated
placement decision at merge. The R-08 reference script was read from the sibling R-08
worktree because it is absent here.
