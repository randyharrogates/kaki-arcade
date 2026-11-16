# T-06 — Tabao Rush level data and loader

Goal: author and validate kitchens before constructing the pure initial simulation.

Requirements: TR-050 and TR-057 (format, two seed layouts and validation; eight final levels
remain T-11), TR-006 (crew assignment before scoring); supporting TR-003, TR-008, TR-010,
TR-040, TR-051, TR-052 and TR-058 data hooks only.

Acceptance: two JSON-serialisable kitchens validate; unknown malformed JSON produces plain
problems; recipes determine required crates, equipment and racks; all spawns reach stations;
returns are per kitchen; supply and screen constraints are checked; bounded rounds are deterministic
at one and eight cooks. Initial equipment has unique identities. Validation never runs in step.

UAT: run the levels tests and whole workspace verify; inspect the text outputs in
`uat/evidence/T-06-tabao-levels/`. Nothing is drawn, so no screenshots apply.

Out of scope: renderer, twist behaviour, eight final launch layouts, versus behaviour and tuning.
The two data layouts are original perimeter workspaces with an open shared floor. Legacy
movement/recipe fixtures retain their coordinates and default equipment; their oversized maps
are intentionally not promoted to authored levels. The obsolete review assertion that missing
returns throw during station preparation changes to assert safe inspection, as requested.
The loader refuses invalid definitions and the legacy service path retains a dish without
awarding points when its return counter is missing.

## D-093 rulings

D-093 replaces the provisional T-06 rules. Footprints reserve 144 px for the HUD and 120 px
for prop height, using 120 px tiles and 0.866 depth, capped at 15 × 6. Rounds are 60–600 s;
seed rounds remain 210 s with D-091's 200/400/600 solo star base. Each kitchen needs at least
one clean container of every required kind and at least six clean plates for plated dishes.
There is no no-reuse rule. Chopping boards × roundSeconds / 3 must cover the worst chop count
of all orders that can arrive at eight cooks (including the initial order).

Applying that chopping floor requires two boards in Kopitiam and three in Zi char. These are
still test kitchens: the added boards satisfy the sanity floor, not eight-cook throughput or
three-star fairness. Each has only one plating counter. D-093 j leaves the eight real layouts
and playability to T-11. All floor remains connected until kitchen-aware fallbacks exist.

All twist kinds are refused with a plain no-behaviour problem. Typed hooks and tightened
references remain for T-11. The renamed Zi char test kitchen promises no shared-wok behaviour.
Venues carry the four D-093 names through compilation. Fire starts only at ordinal five or
later; one extinguisher must be within 15 four-way edges between access tiles of burnable
stations. No-fire levels allow zero or one extinguisher.

## ASCII maps

Legend: X wall, . floor, 1–8 spawns, C ingredient crate, K chop, R rice, D drinks, L plating,
V serving, T return, S sink, B bin, # container rack, W wok, G grill, P pot, E extinguisher.
Rack kinds and ingredients are in catalogue.ts; maps are also emitted by review.test.ts.

Kopitiam first shift (11 × 6, venue kopitiam):

```text
XCCCCKRKDLX
...........
.12345678..
...........
...........
XVTSB#####X
```

Zi char test kitchen (15 × 6, venue zi char):

```text
XCCCCCCCCCCCKKX
#.............#
#12345678.....E
#..............
#..............
XRKWGPLDVTSB##X
```

## Requests — for T-07, T-11, T-13, T-14

- T-07: confirm the 144 + 120 px reservation on an actual rendered frame. Fifteen 120 px
  tiles leave only 5 px beyond each 55 px horizontal margin; confirm sprite bounds too.
- T-11: twists need real behaviour before they count toward TR-050. D-093 j: these seeds are
  test kitchens; real layouts need enough boards and plating counters for eight cooks and
  must be played before claiming three-star fairness. Never list seed levels to players.
- T-13/T-14: require per-kitchen connectivity and a kitchen-aware floor fallback before
  disconnected kitchens. Assign kitchens by team; the loader now uses PlayerInfo.team (0/1
  indexes the two kitchen ids), falling back to spawn index only without a team assignment.
- T-14: implement one or two interaction forms per arena; typed hooks alone are not behaviour.

## Close-out

Review round 1 replaces the slow full-round kit runs with one bounded 3,000-step simulation
per level and crew size. Each performs real serving, returns and expiry, then compares a
JSON reload replay. Format/refusal, source purity and deterministic loader checks remain.
Reviewer attack, timing, serve and map probes are ported into assertions in levels tests.
The public package exports validated loading; raw compile stays available only from its
module for internal fixtures. Missing legacy return counters retain the dish, award no points,
and emit a missing-return-counter refusal and station rejection.

No shared trackers, dependencies, package manifests or lockfiles changed. Independent Claude
review and renderer/TV UAT remain with the lead. Verification output and timings are recorded
in `uat/evidence/T-06-tabao-levels/REVIEW-1.md` and accompanying logs.
