# T-01 review-fix round 2 evidence

Original build and round 1 are committed; round 2 remains uncommitted for independent review.
The reviewer's attack files under `attacks-r2/` were readable and consulted.

## Per-item results

1. **Pass — TR-022 wall-lean head-on:** step-aside now requires cook contact on the stick's
   dominant axis. The minor axis may be wall-blocked and no forward wall-clear gate is
   required; lateral sweeps retain wall and cook collision checks. The exact one-row repro
   and the two-row bottom-wall repro both pass within 1,200 steps: a beyond x 12, b below x 2.
   Each step checks wall clearance and minimum centre distance 0.36.
2. **Pass — TR-021 first press:** prior facing is used for hysteresis only if the previous
   step's requested velocity was non-zero. Resting south plus a 60-degree stick selects
   southeast immediately. A previously held stick retains hysteresis; release and dead-zone
   input both reset it for the next press. Existing 600-step boundary-noise and pinned-highlight
   regressions pass.
3. **Pass — preserved movement coverage:** 200 random solo maps × 600 steps and both convex
   corner repros retain zero displacement outside the stick's per-axis bounds. All-eight
   corridor, doorway and B1 re-aimed 4v4 doorway cases pass. Added reviewer idle-push and
   three-cook dead-end exit regressions check clearance/separation every step. Existing
   60,000-step seeded invariants and contact-state progress probes also pass.

`movement-tests.txt`: 23 tests passed. Full verification regenerated `conformance.txt` and
`conformance.json`: 22 checks pass, 3 N/A, none failed or not run. Both endpoint matches and
membership replays end at step 12,600.

## Kit step times

Milliseconds, from this successful verification (rounded as in `conformance.txt`):

| Players | End step | Mean | p95 | Worst |
|---|---|---|---|---|
| 1 | 12600 | 0.0010 | 0.0017 | 0.0190 |
| 8 | 12600 | 0.0067 | 0.0097 | 0.3791 |

These are Node movement-slice measurements; browser/TV performance and visual judgement of
steering/tuning remain with later UAT. Nothing is rendered, so there are no screenshots.
The slice note retains the A4 input-policy limitation and Requests.

## Verify

`VITEST_MAX_WORKERS=2 pnpm verify` exited 0. No checks, thresholds or time limits changed.
`verify-first-attempt.txt` remains historical evidence from the original build.

```text
Test Files  50 passed (50)
      Tests  1887 passed | 1 skipped (1888)
   Start at  21:58:20
   Duration  32.05s (transform 493ms, setup 0ms, import 1.73s, tests 58.85s, environment 2ms)

$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
no bundles yet
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 31 in progress, 1 later, 120 not started
trace check passed
```

Only authorised movement sources/tests, the slice note and evidence changed. No dependencies,
shared trackers, specs, contracts or lockfile changed. No commit, push, merge or deployment.
