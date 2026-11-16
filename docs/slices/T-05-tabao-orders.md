# T-05 — Tabao Rush orders

Goal: pure order queues, patience, kitchen score/tips/stars and fixed-step round lifecycle.
Requirements: TR-001, TR-004, TR-005, TR-006 (rules only).

Acceptance: seeded bounded orders; defect-first refusal without consumption; oldest matching
service in seat order; expiry penalties and exact arithmetic; player-count scaling; spectating
joiners; exact round end; serialisable public data and deterministic reload; unchanged cooking
and item conservation; conformance at 1 and 8 cooks; full-round and bounded-work evidence.

Validation: unit journeys using sampled walking/buttons, full-round aimed fuzz, conformance,
and pnpm verify. Nothing is drawn, so evidence is text and timing data.
Out of scope: screen, launch levels, bots, versus scoring/sabotage, tuning through playtests.

## Integration boundaries

Claude owns independent review and integration. No shared tracker changes are made here.

## Implemented rules and sources

D-091 (read in full in the integration checkout's docs/DECISIONS.md) supersedes the
initial tuning. OQ-032 keeps these numbers provisional until screen playtests. TR-056
joiners spectate and share the team score; kopi and teh remain one recipe family under D-085.

| D-091 dish | Base points | Patience seconds | Maximum tip | Expiry loss before score clamp |
|---|---:|---:|---:|---:|
| Kopi / teh | 40 | 40 | 8 | 10 |
| Laksa | 80 | 55 | 16 | 20 |
| Char kway teow | 80 | 55 | 16 | 20 |
| Chicken rice | 100 | 60 | 20 | 25 |
| Satay | 100 | 60 | 20 | 25 |
| Kaya toast set | 120 | 75 | 24 | 30 |
| Rojak | 120 | 75 | 24 | 30 |

Tip = floor(base × 0.2 × remaining / total); patience warns in its last quarter.
Expiry reports the actual points lost, clamped to the available score. No combos.

The literal crew factors for 1–8 cooks are 1, 1.74, 2.41, 3.03, 3.62, 4.19, 4.74, 5.28.
Arrival interval is secondsToSteps(24 / factor), card cap min(n+1, 6), and star thresholds
are the level's solo bases (default 200/400/600) times factor, rounded to the nearest ten.
| Cooks | Factor | Arrival steps | Card cap | Default star thresholds |
|---:|---:|---:|---:|---|
| 1 | 1 | 1,440 | 2 | 200 / 400 / 600 |
| 2 | 1.74 | 828 | 3 | 350 / 700 / 1,040 |
| 3 | 2.41 | 598 | 4 | 480 / 960 / 1,450 |
| 4 | 3.03 | 475 | 5 | 610 / 1,210 / 1,820 |
| 5 | 3.62 | 398 | 6 | 720 / 1,450 / 2,170 |
| 6 | 4.19 | 344 | 6 | 840 / 1,680 / 2,510 |
| 7 | 4.74 | 304 | 6 | 950 / 1,900 / 2,840 |
| 8 | 5.28 | 273 | 6 | 1,060 / 2,110 / 3,170 |

Stars use accumulated cook-steps / elapsed steps per kitchen, interpolating between the
literal factors. Results at every step use that step's average; departures cannot instantly
lower thresholds. Each kitchen counts assigned cooks (`Cook.kitchen`); a single co-op
kitchen counts everyone. T-14 owns actual versus assignment and scoring integration.

First order opens at step zero. Named seeded kitchen streams draw uniformly from allowed
dishes; full queues skip draws, so the k-th generated dish is independent of play. Empty
boards schedule the next order within 180 steps. Existing scheduled slots remain unless
that empty-board deadline brings them forward. Service uses oldest matching order and seat
order, ahead of same-step expiry. At a crew reduction, retain every open card. No new
card arrives while the board is at or above the new cap; service and expiry drain it
to that cap. The board never exceeds six cards; IDs and RNG are retained.

The default round is 210 seconds / 12,600 steps. Open orders incur no final penalty.
Final-step events clear on the first frozen call; subsequent calls return the same state.
Served events include seat, dish, points, tip and delta; refused events include seat, counter,
dish (null for an unrecognisable/defective recipe) and reason; expired events include actual
penalty and delta. No retained event ledger. At most eight service events and twenty order
events per active step (two kitchens × six expiries plus eight cook actions).

## Requests

### For T-06

Supply per-level allowed dishes (`Level.allowedDishes`), round length (`Level.roundSeconds`),
and solo threshold base (`Level.soloThresholds`). Defaults are chicken rice, 210 seconds,
and [200, 400, 600]. Provide enough plates and chopping boards for eight-cook levels.

### For T-07

The public view exposes kitchens (orders with dish/id/arrival/remaining/total/warning,
score/tips/completed/expired, cooks, maximum/targetMaximum, stars and thresholds), timer
remaining/total, orderEvents and serviceEvents, plus existing cooks/items/stations and action
previews. Show up to six order cards per kitchen. After a crew shrinks the board can briefly
hold more cards than the new arrival cap (still at most six). Events are cleared once the
round ends. Events last one step; consume them each
step, including the final active step. Recipe names/data are exported as RECIPES rather than
repeated in snapshots. Refused dish is null when no valid recipe can be identified.

Claude owns independent review, screen/playtest judgement under OQ-032 and shared trackers.
No dependency or external contract changes are requested.

### For T-14

Assign `Cook.kitchen` at spawn or join, and add a two-kitchen scaling test that does not
set the field by hand. Production currently leaves it unset, so both kitchens on a
two-kitchen level count zero assigned cooks and scale as solo. Co-op counts every cook
regardless of that field. Versus assignment and gameplay remain outside T-05.

## Review round 1 validation

All thirteen reviewer attacks are ported into rules/attack.rev.test.ts as ruled assertions.
J2 asserts no star gained after seven of eight cooks leave at the last step. Added tests
cover interpolated averages at every step, the level base hook, empty-board service/expiry
refill and clearing final-step events. Table rows cite D-091; 1/2/4/8-cook full rounds check
base/tip/expiry arithmetic and final thresholds. Fuzz checks nonnegative score, exact delta
ledger, queue bound while cards drain, conservation, event bounds and deterministic reload.

Conformance retains both 1- and 8-cook scenarios and every kit check. The test-only level
now lasts 80 seconds / 4,800 steps: long enough for actual crate-to-service and expiry,
including whole-match final results, with shorter membership/reload replays. No time limit
or check was changed.

## Close-out

| Requirement | Code under games/tabao-rush/src/ | Tests in rules/orders.test.ts |
|---|---|---|
| TR-001 | rules/orders.ts, rules/state.ts, rules/game.ts | seeded stream/count comparison; patience/warning; queue saturation/downscale drain; public timer/thresholds |
| TR-004 | rules/orders.ts, rules/stations.ts | all seven base-point/tip rows; refusal/defect precedence; oldest/seat/expiry boundary; penalties; independent kitchens; real full-round journeys |
| TR-005 | rules/game.ts, rules/orders.ts | spec table; all star boundaries; results at zero/mid/end; exact endpoint and inert input/transit; level length hook |
| TR-006 | rules/orders.ts | eight curve rows; cook-step averaging; spectating join; queue drain bound; real rounds at 1/2/4/8 cooks |
| Cross-cutting | index.ts type exports, existing item/station mechanisms | 210 s aimed fuzz with actual completed order, conservation and score ledger; midpoint codec reload; inventory scan guard; unchanged conformance kit at 1/8 with actual service and expiry |

Evidence lives in `uat/evidence/T-05-tabao-orders/`: `verify.txt`, `conformance.txt`,
`performance.json`, `attack-results.txt`, `conformance-timing.txt`, and `REPORT.md`. The final verification counts and measured times are
recorded in REPORT.md. Nothing is drawn, so no screenshot or screen UAT is claimed.
Claude retains independent review, integration and shared tracker updates. No dependencies,
contracts, manifests, lockfile, trackers, movement/item constants or cooking sequences changed.
Review-round verification results and timing evidence are recorded in
`uat/evidence/T-05-tabao-orders/REPORT.md` and its linked logs.

Review round 1 final verify: 113 files passed; 2,732 tests passed, one skipped; exit 0.
All 37 order tests and 13 ported attacks pass. Isolated conformance: 34.49 s test time,
35.58 s process wall time, versus the reviewer's 87 s, with the 120 s limit unchanged.
Busy eight-cook attack mean/p95/p99/worst ms: run 1 = 0.0137/0.0163/0.0224/0.719;
run 2 = 0.0131/0.0149/0.0197/0.761. Full timing tables are in REPORT.md.

## Review round 2 validation

R1–R9 are ported into `rules/attack-r2.rev.test.ts` as assertions of ruled behaviour.
Departures preserve every open card and do not emit expiry or refusal events; the newest
retained card remains serviceable. Full boards skip draws until service or expiry drains
below the current cap. The restored drain test covers service/refill, and fuzz bounds each
step by max(previous board size, current crew cap), with an absolute maximum of six.
R6 records the unassigned two-kitchen fallback and checks co-op counts every cook even
with unrelated kitchen fields. No versus assignment was introduced.

Round 2 final `VITEST_MAX_WORKERS=2 pnpm verify`: exit 0; 114 test files passed,
2,742 tests passed, one skipped. Build/budget hook and trace check passed
(152 requirements). Full log: `uat/evidence/T-05-tabao-orders/verify-r2.txt`.
