# T-03 — Tabao Rush stations

## Goal and acceptance

Implement TR-007, TR-008, TR-010 and TR-030 as pure station mechanisms, preserving
TR-002/TR-009/TR-020/TR-021/TR-022/TR-023. Test station acceptance, held versus autonomous
work, warnings, irreversible burning, fire cause/spread/extinguishing, indexed conservation,
seeded replay/reload and bounded full-round work. Run whole-match conformance with station
work at one and eight seats and save text evidence. Nothing is drawn; no screenshots apply.

Out of scope: recipes, plating combinations, serving, orders, scores, launch levels and UI.

## Mechanisms and integration seams

`rules/stations.ts` prepares a tile-keyed station index once, advances integer timers, and
publishes renderer/sound data. `state.ts` adds optional `stationType` on station tiles,
`firesEnabled` and `extinguisherTile` on levels. Untyped anchors and ingredient crates retain
T-01/T-02 behaviour. `Station` and `StationType` are exported from the game package.
A station's single content reference is authoritative. Its item's existing `counter` location
tag identifies the station tile; it is indexed in `state.stations[tile].content`, never also
in `inventory.counters`. This preserves the existing exhaustive ItemLocation consumers.
All other location indexes, movement constants, flight rules and floor cap remain unchanged.

Cross loads an empty station or takes its completed/burnt output with empty hands. Circle
works with empty hands, or with the extinguisher at a fire. Sampled frames resolve in stored
ascending seat order, cross then circle then triangle, against pre-step targets. Actions run
before timers and movement, so loading and working may both progress in that step. At most
one cook contributes work to a station per step. Pressed or held circle counts for this step.

| Station | Input | Progress / output |
|---|---|---|
| Chop | raw ingredient | Hold circle for 180 steps; same item becomes chopped |
| Wok | raw/chopped ingredient | 300 timer steps; same item becomes cooked; circle stirring advances 2 rather than 1 step |
| Pot | raw/chopped ingredient | 300 autonomous steps; same item becomes cooked |
| Grill | raw/chopped ingredient | 300 timer steps; stops at 150 until one circle turn; resumes autonomously |
| Rice | raw/chopped ingredient | 300 autonomous steps; same item becomes cooked |
| Drinks | raw kopi/teh | Hold circle for 180 steps; same ingredient becomes cooked |
| Plating | clean plate, chopped/cooked ingredient, dish | One-slot storage; no processing or combinations; immediately retrievable |
| Sink | dirty-plate | Hold circle for 180 steps; same item becomes plate, held at sink until collected |
| Bin | raw/chopped/cooked/burnt food | Cross destroys it immediately; no persistent contents |

No recipe filtering, cups/bowls, assembled dishes, serving, dirty-plate generation or orders
are implemented. T-04 can supply dirty plates and compose the generic output mechanisms.

Conservation now means: setup equipment and crate issuance introduce identities; station
processing changes kind but retains identity and ingredient; bin disposal destroys an item;
a fire destroys the affected station's food, as TR-010 expressly states. Plates survive fire.
No other action creates or destroys an item. Burnt items cannot enter any processing station,
be thrown or change kind again, and can only be carried to the bin before ignition.

The public station view has ID, tile, type, contents, progress and total steps, status
(empty/working/done/burnt/fire), warning/fire flags, grill turn state, and extinguishing
progress/total. It excludes internal neighbours and work timestamps. Everything is step data.

## Ruled behaviour — D-080

D-080 (2026-11-16), read in full from the main checkout's decision log, governs this
slice. Circle taps and holds count. Held work completes atomically before the next seat's
input. One kitchen spread clock ignites one neighbour of the oldest eligible fire every
360 steps; typed stations may be separated by one plain counter, and crates are excluded.
`Level.fireNeighbours` is the explicit T-06 override. Fire-enabled levels require a rack;
throws cannot land on it. Bins refuse plates and, pending T-04's plate model, dishes.
Items retain ordered plain-data `processes`; public views expose that history, `worker`
(seat or null), `fireIn` (remaining steps or null) and `fireInTotal`.

## Close-out

| Requirement | Production paths | Named automated evidence in `rules/stations.test.ts` |
|---|---|---|
| TR-007 | stations, items, state | every station accepts; held chop/pull/wash; automatic stations finish/warn/burn; grill turn and wok stirring; empty-hand work; 1–8 seeded full rounds |
| TR-008 | stations, state | input matrix; held wash resumes and yields clean plate; fire preserves plates; seeded transformation checks |
| TR-010 | stations, items, state | exact ignition/spread boundaries; equipment-only extinguish and interruption; easy-level fire suppression; plate preservation; rack/flight reservation; each seeded ignition has a cause and an extinguishing branch |
| TR-030 | stations, game | one-slot contents/progress; public warning data; plating view; station conformance at 1 and 8 cooks; seeded index bounds and full-round abuse |
| TR-021 regression | items, game | pre-step highlight, reversed input insertion order, ascending seats, cross/circle/triangle, one contribution, pressed and held circle |

The new tests retain all existing inputs and conformance scenarios. Review regression tests extend the existing station suite. New conformance scenarios use the exported module's methods with only an init
fixture selecting a typed test level and initial ingredient; the same input script is separately asserted to complete chopping at both player counts. Seeds cover each count 1–8 for 12,600 steps, compare
replay hashes, encode/decode the state mid-run and check movement, conservation, transitions,
capacity, progress conditions, fire cause/extinguishability, and every location index.

The abuse fixture adds eight occupied holding stations to T-02's eight-crate button mashing;
bin work is instantaneous. Test-only replenishment keeps cooking timers busy without adding
identities and is excluded from measured calls. A separate probe forbids enumeration of
floor/counter/hand indexes with eight flights and compares 60 versus 6,000 resting items.
Production work walks stations, bounded-degree neighbours, cooks (at most eight) and flights;
there is no elapsed-round registry or per-step `items()` call. Publication alone flattens items.

Evidence and final verification: `uat/evidence/T-03-tabao-stations/REPORT.md`,
`station-tests.txt`, `conformance.{txt,json}`, `performance.json` and `verify.txt`.
Independent review and visual/browser performance UAT remain with the integrator.
No dependencies, external contracts, shared trackers, specs or lockfiles changed.

## Requests (integration)

- Judge D-080's provisional timings on a screen.
- Kaya toast: confirm the recipe needs a turn under the grill rule.
- T-04: implement the seven recipes, vessels, mixing/spreading, multi-ingredient pots,
  multi-item plates, clean-plate supply, serving/rejection and dirty-plate return; a binned
  plated dish must leave its plate.
- T-06: level format/loader, station anchors and twists, screen-fit and reachability validation;
  populate the explicit fire-neighbour hook and validate accessible extinguisher racks.

## Review-fix round 1

A01–A16 and A02b are real assertions in `attacks.test.ts`, with additional shared-clock,
rack/bin and chop-then-grill history regressions. The reviewer's seeded fuzz and busy-kitchen
performance workload are in `fuzz.test.ts`; conservation includes exactly one extinguisher,
no extinguisher flights/station contents/ghost holders/non-floor floor locations, ordered
history prefixes, index identity, reload and no unfinished station output. The seeded fire
rescue branches walk to equipment and press cross, then walk to the fire and hold circle.
The eight-seat kit fixture includes fire, rack pickup, bin disposal and a grill turn.
Final results are recorded in the evidence report alongside verification output.

Final review verification: `VITEST_MAX_WORKERS=2 pnpm verify` passed: 70 files,
2,285 tests passed, one skipped; typecheck, ESLint, design lint, build/budgets and trace passed.
All 42 T-03 tests pass, including A01–A16/A02b. Fuzz covers 512,363 cook-steps.
Both kit scenarios pass. Reviewer workload worst step: 11.460250 ms; eight-seat kit
worst step: 1.9634 ms (Node observations; screen timing judgement remains open).
