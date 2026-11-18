# P-10 — Final scoreboard copy (PP-032), rounds 1–2

## Goal and acceptance

The last running scoreboard announces the final scores rather than another round.
Earlier scoreboards retain “Next round in 5 seconds”; the last uses “Final scores
in 5 seconds”. The over podium shows neither line. Cover rounds 1, 4 and 5 of 5
and round 3 of 3 with DOM assertions.

## Changes and timing

`games/peek-poker/host/results.ts` selects the hint by round === totalRounds,
inside the existing non-over guard. `src/rules/round.ts` sets SCOREBOARD_STEPS
to secondsToSteps(5); `game.ts` uses it after every reveal, including the last,
then enters over after the last scoreboard. Five seconds is therefore correct.
Phone controller copy in `src/rules/views.ts` is “Scores on the TV” for every
scoreboard, so it is unchanged. D-209 and D-210 were read; the brief explicitly
supersedes D-209's last-scoreboard copy while retaining the final hand-off.

## UAT script (run: `uat/evidence/P-10-final-scoreboard/round1-p1/`)

`uat/slices/P-10-final-scoreboard.mjs` joins one real phone, selects Peek Poker
through the console, and plays five rounds with real picks and Lock in. Host
clock control speeds the real simulation without replacing rules or views.
It asserts scoreboard headings and hints, unchanged phone copy, and no countdown
on the podium. At 1920 × 1080 it captures round-4 and round-5 TV stills after
600 ms of host time and a bounded finite-animation settling wait adapted from
P-07. Evidence needs integrator execution and visual review.

Command:

```sh
KAKI_PORT_WEB=5990 KAKI_PORT_SIGNAL=5991 pnpm uat -- P-10-final-scoreboard --phones 1 --out round1-p1
```

## Close-out

Only the authorised checks ran. One-minute uptime load at every launch:

| Check | Load | Result |
|---|---:|---|
| VITEST_MAX_WORKERS=2 pnpm exec vitest run games/peek-poker | 3.14 | Passed: 15 files, 154 tests |
| pnpm exec tsc -b tsconfig.build.json, initial | 4.61 | Failed: accidentally copied unused P-07 helper referenced view; removed |
| pnpm exec tsc -b tsconfig.build.json, final | 4.09 | Passed |
| Requested ESLint, initial | 4.45 | Failed: same copied helper; removed |
| Requested ESLint, final | 4.00 | Passed |
| pnpm run lint:design | 4.09 | Passed: 484 files |

No generated JS, maps or declarations appeared beside Peek Poker sources;
existing tracked host/style.d.ts remains. No verify, UAT, perf, install, linking
or commit was performed. No command reached the ten-minute limit.

## Round 2

The user authorised `apps/web/src/poker-results.dom.test.ts` for P-10.
Appended one DOM test covering rounds 1, 4 and 5 of 5, round 3 of 3,
and the over podium showing neither countdown. It checks the scoreboard heading,
countdown and podium identity. Existing tests and formatting are unchanged;
round-1 implementation and UAT script are preserved.

| Check | One-minute load at launch | Result |
|---|---:|---|
| VITEST_MAX_WORKERS=2 pnpm exec vitest run games/peek-poker apps/web/src/poker-results.dom.test.ts | 3.17 | 15 files passed, 1 failed; 155 tests passed, 2 failed |
| pnpm exec tsc -b tsconfig.build.json | 5.02 | Passed; no new adjacent JS, maps or declarations to remove |
| pnpm exec eslint games/peek-poker apps/web/src/poker-results.dom.test.ts uat/slices/P-10-final-scoreboard.mjs --max-warnings 0 | 4.94 | Passed |
| pnpm run lint:design | 4.86 | Passed: 484 files |

Both Vitest failures were at Chromium launch, before DOM assertions: the existing
board test and the appended P-10 test. macOS denied Chromium's Mach port
bootstrap_check_in (Permission denied 1100) under the execution sandbox. The
154 Peek Poker tests and existing contrast test passed. The browser test bundles
built successfully, but DOM behaviour remains unverified here. No command hit the
ten-minute limit. Remaining checks waited while load was above 8 (observed 10.55).

## Close-out

The DOM test was blocked only by the implementation sandbox; it passes in `pnpm verify` (integrator, 2026-11-18). The UAT ran at 1 phone and both TV stills were looked at (review 1). The round tables in REPORT.md show only "Create room" because the rounds are not wrapped in steps; that is a reporting gap, not a missing check. Decision D-256 (refines D-209).
