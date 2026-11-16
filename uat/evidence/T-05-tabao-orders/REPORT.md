# T-05 — review round 1 rules evidence

Branch: `issue/T-05-tabao-orders`. Requirements TR-001, TR-004, TR-005, TR-006.
Pure simulation only; nothing is drawn and no visual UAT is claimed.

D-091 (integration checkout) replaces the initial tuning; OQ-032 reserves playtest tuning.
The complete numerical tables and T-06/T-07 hand-off are in
`docs/slices/T-05-tabao-orders.md`.

| Review item | Assertion / evidence |
|---|---|
| 1: departure star exploit | Attack J2: eight cooks, 1,700 points, seven leave at the last step; still one star, thresholds 1,060/2,110/3,170. Cook-step test checks the interpolated threshold at every step. |
| 2–4: recipe values, tips, patience, expiry | Seven explicit D-091 rows assert recipe data, proportional tips, patience and actual clamped expiry deltas; last-quarter warning boundary retained. |
| 5: fixed crew curve, cap and bases | Eight literal expected interval/cap/threshold rows; custom solo-base hook; Round 2 corrects the departure rule: every open card remains; arrivals wait until the board drains below the new cap, without changing score or future RNG. |
| 6: empty board | Both service and expiry of the last card refill within 180 steps; generated dish and RNG match the next ordinary stream draw. |
| 7: kitchen-local scaling | Attack K1 asserts red/blue independent streams and 1/3-cook caps and thresholds. A single co-op kitchen counts everyone. |
| 8: frozen events | Final-step events survive for that step, clear on the first frozen call, and later frozen calls return the same state. |
| 9: self-contained bounded events | B1 asserts seat plus refused dish/counter. Fuzz asserts at most 20 order and eight service events per step; defect refusals carry dish null. |
| 10: conformance speed | All kit checks and both 1/8-cook scenarios retained. Test-only level now lasts 80 seconds / 4,800 steps, reaches final results and asserts actual crate-to-service and expiry. No check or existing time limit changed. |
| 11: hand-off | Slice note replaces the initial requests with D-091/OQ-032 and lists T-06 content/supply and T-07 view/card/event needs. |
| Full rounds | 1/2/4/8 cooks: real crate-to-service journey, 12,600-step endpoint, independent ruled score arithmetic, exact delta ledger and final thresholds. |
| Fuzz/replay | All 1–8 cooks with membership churn: score nonnegative and equal to event deltas, queue ≤ min(n+1,6), event bounds, unique orders/items, container conservation and timer bounds. Separate pure save/reload replay preserves hashes. |
| Bounded work | Inventory enumeration proxy guard retained, including 6,000 resting slots. No retained event history or runtime power function. |

The thirteen original attacks are ported into `rules/attack.rev.test.ts`, using assertions
of the ruled behaviour. Performance logs report simulation steps after 600 warm-up steps;
these do not measure browser rendering or frame budgets. Kit and aimed-fuzz evidence is
written only with `T05_EVIDENCE=1`. No dependencies, package files, lockfile, node_modules,
shared trackers or external contracts changed.

## Final results

PASS: `T05_EVIDENCE=1 VITEST_MAX_WORKERS=2 pnpm verify`, exit 0.
113 files passed; 2,732 tests passed, one skipped (2,733 total), 272.51 seconds.
Workspace, typecheck, ESLint, design lint, build/budgets and trace all passed.
Full output: `verify.txt`. All 37 order tests and all 13 ported attacks pass.
Attack output and fuzz counts are saved in `attack-results.txt`.

J2: before and after seven last-step departures, 1,700 points earn one star;
thresholds remain 1,060 / 2,110 / 3,170. All eight churn fuzz runs have zero stale
terminal events; maximum observed queues are 1, 2, 3, 4, 5, 6, 6, 6.

| Simulation workload | Mean ms | p95 ms | p99 ms | Worst ms |
|---|---:|---:|---:|---:|
| Busy eight cooks, attack L1 run 1 | 0.0137 | 0.0163 | 0.0224 | 0.719 |
| Busy eight cooks, attack L1 run 2 | 0.0131 | 0.0149 | 0.0197 | 0.761 |
| Aimed eight-cook round, 12,000 measured steps | 0.01435 | — | — | 1.50204 |
| Kit one cook | 0.0051 | 0.0071 | — | 0.1683 |
| Kit eight cooks | 0.0156 | 0.0205 | — | 2.8209 |

Both busy attack runs report zero steps above 1 ms. All workload times above come
from the final full verify run; kit scenarios and membership replays end at step 4,800.
The isolated conformance test passes in 34.49 seconds (35.58 seconds process wall time),
down from the reviewer’s 87 seconds, with the existing 120-second limit unchanged.
The complete timing is recorded in `conformance-timing.txt`.

Independent Claude review, integration and screen tuning remain with the integrator.

## Review round 2

Requirements TR-001, TR-004, TR-005, TR-006. R1–R9 are ruled assertions in
`games/tabao-rush/src/rules/attack-r2.rev.test.ts`.

| Attack | Result checked |
|---|---|
| R1 | Late departures retain eight-cook thresholds. |
| R2 | Early departures use exact elapsed crew average. |
| R3 | Spectator join/leave preserves orders. |
| R4 | Late joiners spectate; solo thresholds remain. |
| R5 | Zero-cook stretch stays finite; fractional scaling stays monotonic. |
| R6 | Unassigned two-kitchen cooks document solo fallback; co-op counts every cook regardless of assignment field. T-14 must supply production assignment. |
| R7 | All six cards survive seven departures; no silent expiry; arrivals pause and the newest retained card can be served. |
| R8 | Expiry reports actual clamped loss; unrecognised refused dish is null. |
| R9 | Eight cooks reach six cards with 273-step arrivals and normal expiry. |

Focused regression run: 11 passed (nine attacks plus service/refill and service/expiry
drain tests); see `attack-r2-results.txt`. Full verification: `verify-r2.txt`.

Round 2 final `VITEST_MAX_WORKERS=2 pnpm verify`: exit 0; 114 test files passed,
2,742 tests passed, one skipped. Build/budget hook and trace check passed
(152 requirements). Full log: `uat/evidence/T-05-tabao-orders/verify-r2.txt`.
