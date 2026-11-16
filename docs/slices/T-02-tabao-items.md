# T-02 — Tabao Rush items

Branch: `issue/T-02-tabao-items`. The original build is committed; review-fix round 1 is
committed on the issue branch in this worktree as requested. No push, merge, dependencies or contract edits.

## Goal and acceptance

Pure carrying (TR-002), throwing/catching (TR-009), counter passing (TR-023), and matching
pickup highlights (TR-021). Cross uses the preceding state's target before movement.
Conserve items, require sampled button presses, publish every flight, bound round growth,
and retain deterministic immutable steps and T-01 movement invariants. No renderer, cooking,
orders, scoring or lifecycle implementation belongs to this slice.

## D-078 rulings implemented

Read D-078 from the primary checkout's `docs/DECISIONS.md`; this worktree lacks that entry.
These replace the original fourteen proposed spec additions:

| Ruling | Result |
|---|---|
| a | Crates give one raw ingredient to empty hands per cross press and refuse while at least 24 items are on the floor. |
| b | Counters hold one item; cross picks up or places, without swapping. |
| c | Cross never puts down on the floor. Empty hands with no target recover the oldest item on the cook's tile. Public cooks expose its ID as `floorItem`, otherwise null. |
| d | Throws use `secondsToSteps(0.377)` = 23 steps, from the D-051 slow token, up to four tiles, over counters and clipped before walls, stations and boundaries. |
| e | Flight creation always survives into a published step before catching. Only empty-handed teammates within the swept segment's cook radius can catch; throwers cannot catch their own item. |
| f | Choose and store the free endpoint counter or last free floor tile walking back along the clipped path. The public flight endpoint lies on its stored resting tile. |
| g | Buttons act only through sampled frames, ascending seat, cross before triangle. Button taps are ignored. |
| h | Leaving preserves the item and existing flights. Drop from the cook's position using the resting rule, then the nearest available floor fallback if that point is occupied. |
| i | Only raw/chopped ingredients can be thrown. Plates, dishes and equipment remain held. TR-058's dirty-plate conflict remains OQ-029, owned by the integrator. |

## Implementation

`rules/state.ts` stores authoritative location indexes in `inventory`: held references by cook,
counter references by tile, floor piles by tile, floor count and a separate active-flight list.
`items(state)` flattens and orders these only for publication and inspection, never for a step.
`heldItem` and targeted counter/floor lookups are direct. Relocation copies affected indexes
and the affected pile/flight list, never a full item population. Resting items are never scanned
by flight resolution. Item payloads and untouched state branches retain identity.

Flights reserve their stored resting tiles until caught or landed. Another throw chooses a
previous free tile, and counter placement waits while that counter is reserved. This prevents
published endpoints changing or counter items being overwritten during flight. When every
floor tile on a throw's path is occupied/reserved, the emergency conservation fallback piles
at its starting floor point; it does not jump across a wall. A leave has no flight path and
uses `floorTile` to prefer an available floor tile, with centre-distance and row-major ties;
if the entire kitchen is occupied it conserves on a pile. Split-kitchen reachability is below.

`game.ts` applies sampled interactions before movement, advances the clock, then resolves
existing flights against post-movement cooks. Newly created flights skip that resolution.
The constant timing and start/end/rest data remain unchanged until resolution. The final
23-step throw refusal remains round-lifecycle scaffolding, not a final round-end rule.

## Close-out — review-fix round 1

| Review item | Code and automated evidence |
|---|---|
| 1, growth and work | `items.ts`, `state.ts`; `rules/review/review.test.ts` runs eight cooks mashing cross+triangle at crates for all 12,600 steps; bounds item count and flight/index sizes; synthetic 60-floor/eight-flight scenario forbids floor/hand enumeration and asserts exactly 64 hand lookups per step. Timings are recorded, never asserted. |
| 2, visible flights | `landItems`; `rules/review/edge.test.ts` covers point-blank held, floor-pickup and counter-pickup chains; first published state is always flight, subsequent step can catch. |
| 3, time | `THROW_STEPS = secondsToSteps(0.377)`; explicit 23-step assertion and final-step landing/refusal tests. |
| 4, contract/order | Deleted action processing; original tap tests now use frames; reversed frame insertion order still awards a contested counter item to the lower seat; cross+triangle can create and throw together; taps cannot double a sampled cross. |
| 5, resting | Stored `rest` and matching flight `end`; both-direction occupied-counter regressions, occupied-floor/leave recovery, reservations and conservation. Replaces the former nearest-floor claim for ordinary throws. |
| 6, floor highlight | `floorPickup`, public `floorItem`; oldest-item, held-hand, highlighted-counter priority and no-floor-placement tests. |
| 7, reviewer scripts | Reviewer's four maps retained in `rules/review/maps.ts`; assertion-based fuzz at 1–8 cooks covers conservation, immutable flight data, correct presses/targets, create-and-throw, caught-segment radius, unexplained hand transfers and blocked paths. Edge tests cover radius misses, full hands, crate pickups before catches, leavers, moving throws and occupied endpoints. Original full-round seeded replay tests remain. |
| 8, T-01 regressions | Convex-corner test keeps its explicit corner cases and 600 steps per map, reduces random maps from 200 to 32, with no timeout change. Conformance evidence writes require `T01_EVIDENCE=1` or `T02_EVIDENCE=1`; performance evidence requires `T02_EVIDENCE=1`. No normal test writes tracked evidence. |
| 9, slice | This note records D-078, committed-build status, actual implementation, validation and only the remaining follow-ups. |

Evidence: `uat/evidence/T-02-tabao-items/conformance.{json,txt}`,
`review-performance.json`, `review-worst-case.json`, `review-verify.txt`,
`review-verify-no-evidence.txt`, and `REPORT.md`. These are pure-simulation checks;
Claude's independent review and screen UAT remain required before integration.

## Requests

1. T-05: replace the last-23-steps throw refusal when implementing the final round lifecycle.
2. Screen UAT: judge catch radius and constant flight duration, including shortened throws.
3. T-06: define `floorTile` reachability for split kitchens.
4. T-08: settle controller button label wording.

## Validation

Final kit, timing and verification results are recorded in the evidence report.

Both evidence-enabled and ordinary `VITEST_MAX_WORKERS=2 pnpm verify` passed:
60 files, 2,070 tests passed, one skipped; build/budgets and trace check passed.
The kit passes solo/eight-cook full matches and membership replays. Whole-round abuse
peaks at 112 items (bound 216); maximum block mean 0.010280 ms, slowest step 0.367625 ms.
The 60-floor/eight-flight case averages 0.008091 ms, worst 0.056708 ms.
Ordinary verification preserved an identical digest of the tracked diff and every untracked
file's contents. Exact logs, kit timings and digest are in the evidence report.
