# T-01 — Tabao Rush movement

Branch: `issue/T-01-tabao-movement`. The original build and review-fix round 1 are committed. Review-fix round 2
is left uncommitted in the worktree as requested, ready for independent review.

## Goal and acceptance

Implement pure movement/state for TR-002 (movement only), TR-020, TR-021 and TR-022.
No rendering or assets. Stick velocity applies on the next step, release stops it, collisions
preserve walls and minimum separation, facing/targeting are stable, and cook traffic progresses.
Randy authorised the default 210-second counter from TR-005 solely as interface scaffolding;
T-05 owns the completed round rules, orders, scores and stars. Results currently share score 0.

## Implementation and future seams

`games/tabao-rush/src/rules/state.ts` holds plain tile-map, cook and participant state.
Static station anchors have stable string identifiers. `level.ts` supplies a tiny original
fixture, not launch content. Movement changes only cooks; the level, players, generator and
unchanged cooks are shared. Scratch buffers are overwritten before each call and reject more
than eight cooks. Input uses `normaliseAxes` from sim-core with a reused output tuple.

Walls use square footprints, cooks circular footprints; axis sweeps stop at contact and slide.
Sweeps report wall or cook failure. Right-hand sidestepping requires cook contact on the stick's dominant axis and low forward
progress. It remains available while the other axis leans on a wall; lateral sweeps enforce
wall clearance without requiring the requested forward footprint to be wall-clear.
Soft separation never subtracts forward velocity. Processing priority rotates by tick.
The step-aside rule is invented steering and must be shown to Randy on a screen.

`target.ts` uses eight clockwise sectors from east. Under D-072, facing retains its current
sector until the stick exceeds its edge by more than 8 degrees while the previous step
already had stick input, and persists on release. The first press from rest selects the nearest
sector; prior requested velocity records deflection even when movement is blocked.
Position still follows the stick immediately. The first faced tile boundary within reach is
highlighted if it is a counter/station; intervening floor or wall gives null. Exact corner
ties choose the x-adjacent tile. The renderer and later interaction use the same `targetTile`.

`game.ts` exports the actual co-op module for 1–8 players. Pre-step joins get free spawns;
later joins spectate. Leaves remove cooks/participants, including the leader and last player.
Private views are null; assets/secrets empty. Layout declares the stick and four disabled
face controls in board-4 positions. The console owns Menu and controller presentation.

T-02 adds items/carried references, T-03 runtime stations keyed by `stationId`, T-04/T-05
recipes/orders/scores/lifecycle as independent state branches. T-06 owns level loading,
T-12 bots and T-14 versus. None is implemented here.

## Tuning (D-072)

Every tuning value below is **provisional until judged on a screen** and shown to Randy.

| Constant/rule | Value | Status |
|---|---|---|
| WALK_SPEED | 3 tiles/second | provisional until judged on a screen |
| STICK_DEAD_ZONE | 0.12 radial, inclusive | provisional until judged on a screen |
| COOK_RADIUS | 0.20 tile | provisional until judged on a screen |
| ALLOWED_OVERLAP | 0.04 tile | provisional until judged on a screen |
| MIN_SEPARATION | 0.36 tile, derived | provisional until judged on a screen |
| SOFT_SEPARATION / spawn clearance | 0.46 tile | provisional until judged on a screen |
| SOFT_PUSH | 0.008 tile/axis/step | provisional until judged on a screen |
| STATION_REACH | 0.85 tile | provisional until judged on a screen |
| FACING_HYSTERESIS | 8 degrees beyond 22.5-degree sector edge | provisional until judged on a screen |
| SIDESTEP | walk speed / 60 = 0.05 tile/step | provisional until judged on a screen |
| Sidestep activation | forward progress below 0.25 of requested | provisional until judged on a screen |

Numerical implementation tolerances: 16 bisection iterations, collision squared-distance
slack 1e-12, target corner tie tolerance 1e-12. These are precision choices, not player tuning.

## Close-out

| Requirement | Code in `games/tabao-rush/src/rules/` | Assertions |
|---|---|---|
| TR-002 movement | state, level, movement, target | tile serialisation, eight facing directions, wall/counter/station slides, membership |
| TR-020 | movement | next-step response/reversal/release, dead zone, normalisation/non-finite input, deterministic immutable sharing, solo displacement property |
| TR-021 | target, movement | reachable target, corner tie, no targeting through walls/floor, 600-step boundary noise and pinned highlight stability, immediate deliberate turn |
| TR-022 | movement | soft separation, tangent sweeps, corridor/doorway passage, offset and wall-leaning head-on pairs, dead-end exit, idle push, re-aimed four-against-four doorway, seeded invariants and bounded progress |

The solo property covers 200 seeded random maps × 600 steps plus both reported convex-corner
reproductions. Every displacement axis retains the stick sign and is bounded by |velocity|/60.
The 60,000-step, eight-cook seeded run asserts clearance/separation and one-step free progress.
It also forks actual near-contact states with a resting blocker and holds the subject's input
for 120 steps, asserting net forward progress where the destination beyond is wall-clear.
These probes isolate the pair; they do not prove progress against arbitrary changing inputs
from six other players. Each seed must exercise contact probes. Dedicated corridor/doorway
cases keep all eight cooks and assert every cook passes, including B1 re-aimed arrivals.

The actual exported module passes whole-match conformance at 1 and 8 players, ending at step
12,600, including membership replays. Evidence is in `uat/evidence/T-01-tabao-movement/`:
`movement-tests.txt`, `conformance.txt`, `conformance.json`, `verify.txt`, and `REPORT.md`.
There are no screenshots because nothing is drawn. Independent visual UAT remains later work.
No dependencies, contracts, trackers, specs or lockfile changed. No push, merge or deployment.

## Requests

1. Show all provisional movement tuning and the invented right-hand step-aside rule to Randy
   in the rendered game; D-072 governs this round (read from the primary checkout).
2. Reviewer's A4 input policy aims at the doorway centre until beyond its opposite side. It
   can reverse a cook before it gets through, and deadlocks in this scenario. The ported B1
   policy holds the through direction while in the doorway column and all eight pass.
   Decide whether A4's converging/reversing inputs need additional traffic behaviour later;
   no universal deadlock-freedom claim is made for arbitrary opposing player inputs.
3. Controller owner supplies floating-stick presentation and reserved Menu. T-05 replaces
   the round scaffold and activates waiting joiners; T-14 adds versus metadata/scenarios;
   T-02/T-03 consume the highlighted target for interaction.
4. Performance owner measures a real browser round and collector pauses. Node kit step times
   are movement-slice evidence only, not real-browser/TV performance approval.

## Final verification

See `REPORT.md` for the regenerated kit timing and full verification tail for this round.

## Review-fix round 2

TR-022: dominant-axis cook contact now enables step-aside even when the minor axis hits a
wall. Removed the forward wall-clear gate; both lateral axis sweeps still enforce walls and
0.36 minimum centre distance. The reported (3, 1.8)/(9, 1.8) sticks (1, 0.3)/(-1, 0.3)
pass within 1,200 steps (a beyond x 12, b below x 2), also along the bottom wall of a
two-row room. Tests assert wall/separation invariants every step. Reviewer idle-push and
three-cook dead-end exit cases are retained as regressions. Solo random-map per-axis bounds,
both round-1 corners, head-on corridor and all-eight doorway cases remain covered.

TR-021: previous facing is supplied to hysteresis only when the prior requested velocity
was non-zero. At rest facing south, a first 60-degree press selects southeast. A held stick
still retains south within hysteresis; release or dead-zone input resets that behaviour for
the next press. Existing noisy-boundary and pinned-highlight regressions remain covered.

Reviewer attack files were readable and consulted. No tuning, checks or time limits changed.
See evidence `movement-tests.txt`, `verify.txt` and `REPORT.md` for this round's results.
