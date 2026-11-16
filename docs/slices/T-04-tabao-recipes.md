# T-04 — Tabao Rush recipes, review-fix round 2

Branch: `issue/T-04-tabao-recipes`. Review fixes are ready for Claude’s review.

## Goal and authority

Implement TR-003, the serving/rejection portion of TR-004 and the rules portion of TR-040.
D-085 and D-087 (2026-11-17), read in full from the primary checkout's `docs/DECISIONS.md`, replace
the previous provisional recipe decisions. No shared trackers, contracts, package manifests,
lockfile or dependencies are changed. No rendering, orders, scoring or launch levels are added.

## Ruled recipes

| Dish | Ingredient preparation | Assembly / container |
|---|---|---|
| Chicken rice | rice cooker; chop chicken; chop cucumber | plate |
| Char kway teow | chop kway-teow, then wok | plate |
| Satay | chop satay, then grill with one turn; chop cucumber | plate |
| Laksa | finish broth in pot, then add raw noodles to complete immediately | bowl |
| Rojak | chop pineapple, turnip and cucumber | mix for 1 s on plating counter; plate |
| Kaya toast set | grill bread with one turn, then spread for 1 s on plating counter; pull kopi or teh | plate with one filled cup on it |
| Kopi / teh | pull either drink | cup |

D-085 applies step order per ingredient; independent ingredients may be prepared in any order.
A station accepts only the next step after the ingredient's exact recipe prefix. Plating refuses
loose raw food. Mix/spread retain interrupted work, publish progress and worker seat, and adding
food clears mix. Spread affects only grilled bread on the plate. Laksa has no second cycle.

Each rack's level data selects its single container kind: four plates, two bowls or two cups.
A matching clean empty container may be returned; taking needs one press and names the kind.
Containers and food retain identities. A plate can carry one filled cup, which remains a nested
container rather than becoming loose drink. Container capacity remains plate 4, bowl 2, cup 1.

Service consumes food and moves each container to a bounded transit queue for 5 s, then to the
kitchen's return counter as dirty. Empty-handed cross takes one dirty container. Return counters
hold any number (bounded by the initial finite container supply). Optional kitchen tags on station
level data route service to the matching kitchen's return counter. Station initialisation fails
clearly without a return counter or with ambiguous/missing kitchen returns. Serving counters,
racks and returns have no fire neighbours and never ignite through normal simulation. Fire
empties a dish and dirties its plate and attached cup. Sink/bin preserve container identities.

Rejections follow D-085 i: nothing to serve, dirty, burnt, wrong container, unknown dish,
missing ingredient, extra ingredient, missing step (ingredient and step), extra step
(ingredient). They preserve the offered item and display for 3 s. The optional allowed-dish
list defaults to all seven and adds `not-ordered` for T-05. Served events identify kopi/teh
and the simulation step. Events remain bounded to the preceding step's attempts.

## Validation

Reviewer sources are ported to `rules/{scen,rack,fuzz,perf}.rev.test.ts` with a shared
`review-fixture.ts` helper (not a test file). R1–R16 assert ruled outcomes. Perf probes record
figures without wall-clock assertions. Existing invariant suites and their time limits remain;
fixtures now supply valid next-step inputs and return stations. Conservation includes nested
cup IDs, their food and containers in transit. Existing no-resting-population scans remain.

All seven journeys use walking and sampled button presses exclusively after initialisation.
They obtain the correct rack container in one press, prepare, assemble, serve, collect a delayed
dirty return, wash and return it. Toast uses a second plating counter to fill its cup before
placing it on the toast plate. One/eight-cook journeys also supply the unchanged conformance kit.
Seeded 210-second runs check source/loss rules, capacities, indexes, determinism and codec reload.

Evidence: `uat/evidence/T-04-tabao-recipes/REPORT.md`, verification log, reviewer results,
conformance report and performance figures. No screenshot, screen UAT, independent Claude
review or browser performance approval is claimed for this renderer-free slice.

## Requests

- Judge timings and container counts on a screen, including whether 1 s mix/spread feels right.
- For T-05: give `stationCross` the open orders; `not-ordered` is checked last. The served
  event names the drink. Containers still in transit at round end stay in `returns`.
- For T-06: provide one reachable return counter per kitchen and one rack per container kind
  with its kind set. Keep serving counters, racks and return counters out of `fireNeighbours`.
  The validator should own the “level requires a return counter” check that `prepareStations`
  throws today. The review fixtures’ return counter at tile 0 cannot be walked to.

D-087 prevents half-prepared food entering containers, permits noodles in finished unburnt
broth in a pot or bowl, and makes toast without its filled cup report missing ingredient: drink.
Empty-handed cross at plating lifts and names the cup on an incomplete or emptied set; a complete toast set still lifts as a unit for service. Bin, sink and fire detach cups with
container identities and clean/dirty state preserved. Plating content changes reset its timing.
The conformance test reuses one recorded journey and omits unused mechanisms from its kitchen fixture, with all kit scenarios retained and unchanged limits.
Performance probes now retain transit queues and measure returns arriving at the counter. Public views index transit IDs once, avoiding a queue search for every returned item.

## Close-out

TR-003 / serving TR-004 / rules TR-040: `rules/recipes.ts`, `stations.ts`, `state.ts`,
`items.ts`; seven recipe journeys, defect/rejection tests and reviewer R1–R16, seeded
conservation/reload, conformance and bounded-work probes. Final results are recorded in the
linked evidence folder. Claude retains integration, independent review and shared tracker updates.
