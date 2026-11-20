# Track T — Tabao Rush

Spec: `../games/tabao-rush.md`. The large game. Rules are split so several agents can work at once on a shared state shape agreed in T-01.

**Owns:** `games/tabao-rush`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story T1 — We cook and serve together in one kitchen

Wave 1 issues are pure rules with unit tests; nothing is drawn.

| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| T-01 | State shape, movement on the next step with no smoothing, 8-way facing, soft collisions that never deadlock, the station a cook would use | TR-002, TR-020, TR-021, TR-022 | F-04 | 1 | merged |
| T-02 | Items: carry one thing, crates, counters, passing, throwing and catching | TR-002, TR-009, TR-023 | T-01 | 1 | merged |
| T-03 | Stations and timers: chop, wok, pot, grill, rice, drinks, plating, sink, bin; burning with a warning; fires that start, spread and are put out | TR-007, TR-008, TR-010, TR-030 | T-01 | 1 | merged |
| T-04 | Recipes for the 7 dishes, plating, serving, rejection with a reason | TR-003, TR-004, TR-040 | T-02, T-03 | 1 | merged |
| T-05 | Orders, patience, score and tips, stars, scaling by player count, round timer | TR-001, TR-004, TR-005, TR-006 | T-04 | 1 | merged |
| T-06 | Level format and loader: collision map, station anchors, twists; a validator that every level fits the screen with no scrolling | TR-050, TR-057 | T-01 | 1 | merged |
| T-07 | Big-screen renderer: baked background, sprites from atlases, body plus head, interpolation for everything not player-controlled, HUD and order cards | TR-001, TR-004, TR-030, TR-031, TR-061, TR-062, PERF-001 | T-05, S-04, A-02, F-06 | 2 | merged 2026-11-19, in progress (review 8 clean; closure blocked on a production PERF-001 run; step icons A-11, cue sprite A-05, heads beyond the cap and picker T-09; T-07b closed review 1 and the review-8 should-fixes) |
| T-07b | T-07 follow-ups: south-facing held-item evidence at the north counter, seat markers drawn nearer-on-top with a 3 px ink edge and real-glyph centring, ≤ 9 px marker overlap at minimum separation accepted (D-291), reachable-function allocation and string scan, real-font recipe-step check | TR-001, TR-004, TR-030, TR-061, PERF-001 | T-07 | 2 | done (merged 2026-11-19; round15-uat, perf-merged; D-291) |
| T-08 | Controller layout: stick, A, B, X, Y, Start; the optional wok shake follows as T-08b once K-06 lands (D-280) | TR-020 | T-01, K-04 | 2 | done (merged 2026-11-20; round6; D-306) |
| T-08b | Optional shake for the wok on the Tabao Rush controller, with the button as the fallback | TR-020, CTRL-007 | T-08, K-06 | 3 | todo |
| T-09 | Cook picker before a round: 8 characters, no two players the same | TR-064 | T-07, A-03 | 2 | merged 2026-11-19, in progress (round11, review clean; closure waits on perf on the merged tree, a still that shows the badge fade and a real pad; D-287) |
| T-10 | First-run tutorial, skippable | TR-055 | T-07 | 2 | done (merged 2026-11-20; round14; perf-tutorial; D-311) |
| T-10b | Tutorial polish from the T-10 review: a ring that reads on counter tiles (light core, ink edge, contrast-tested) and one outline around the three chop boards; every step row aligned; the leader hint at 34 px; the Peek Poker card tokens in their own file so the cards job no longer depends on all of `themes.ts` (D-311) | TR-055 | T-10 | 3 | todo |
| T-17 | One level, one dish, 1 and 8 players, end to end in the real console, with a quiet-machine performance run | TR-051, TR-056, PERF-001, PERF-010, PERF-024 | T-07 to T-10, C-15 | 3 | todo |

## Story T2 — There is a whole game of levels, and I can play it alone



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| T-11 | The 8 co-op levels across the four venues, dishes introduced gradually, fires from level 5 | TR-040, TR-050, TR-010 | T-17, A-06 | 3 | todo |
| T-12 | Bots that do useful work, keep out of doorways and yield to people | TR-053 | T-17 | 3 | todo |
| T-13 | Level select with saved stars | TR-054 | T-11 | 3 | todo |
| T-15 | Sound effects and a music loop per venue, with volume controls | TR-063 | T-17 | 3 | todo |
| T-16 | Tuning with playtests: thresholds, order rate, bot difficulty | TR-005, TR-006 | T-11, T-12 | 3 | todo |

## Story T3 — Two teams race in mirrored kitchens



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| T-14 | Versus: 3 arenas side by side on one screen, team colour themes, normalised scoring, the cross-kitchen interactions chosen on board 3 | TR-052, TR-058, PLAT-025 | T-17, C-11, G-03 | 3 | todo |
| T-18 | The renderer draws served dishes from the composition fields (portion anchors, containment footprints, outline flags) in `assets/src/pipeline.json`; half-detail metadata anchors are not halved (ART-PIPELINE §10) | TR-041, TR-040 | T-07, A-10 | 3 | merged 2026-11-19, in progress (closure owes a legible held dish and the 3 m TV check; D-286) |

## Carried from reviews

- **From T-01:** every movement constant is provisional (walk speed 3 tiles a second, dead zone
  0.12, cook radius 0.20, overlap 0.04, reach 0.85, step-aside at walk speed) and the
  step-aside rule is invented steering: show both to Randy on a real screen as a design choice
  (D-072). The 210-second round counter is scaffolding for the conformance kit; T-05 replaces
  it. Measure a real browser round, including garbage-collection pauses, in `pnpm perf` (F-08).
  Add the reviewer's nine wall-lean variants to the movement tests when movement is next touched.
- **From T-02:** item rules are D-078, all provisional until seen on a screen (catch radius
  0.2, constant 23-step flight even for very short throws, the jump from flight end to resting
  tile, how floor piles read). At most 127 items plus one per counter tile can exist. The
  leave-drop and floor fallbacks pick the nearest floor tile with no reachability check: T-06's
  level validator must cover split kitchens. The refusal to throw in a round's last 23 steps is
  scaffolding for T-05, which must keep "no flight outlives the round". Cross label wording is
  T-08's. Plates in the versus sabo: OQ-029 (T-14). The solo convex-corner movement test was
  cut from 200 random maps to 32 to stop timeouts under load.
- **For T-04 (from the T-03 review):** recipes need: a plate that holds several contents or a
  combining rule (chicken rice, satay with cucumber, rojak, kaya toast with a drink); a pot
  holding two ingredients in sequence and a bowl (laksa); a mix action (rojak) and a spread
  action (kaya toast); a cup for kopi and teh; a clean-plate supply and dish rack, and a source
  of dirty plates; rice portions; station filters by ingredient; a serving counter. Items carry
  their process history (D-080 f). **For T-06:** forbid a crate tile with a station type;
  require an extinguisher when fires are on; levels may state fire neighbours.
- **From T-03 (round 2):** fire does not spread round the corner of an L-shaped counter run:
  T-06 levels state `fireNeighbours` where that matters, and should check the extinguisher
  rack is within about 15 tiles of every station. T-06's validator owns "fires need an
  extinguisher" (today it is refused at the first step, not at init). T-04 clears a plate's
  history when it goes dirty (it grows by one entry per wash). If the last fire goes out in the
  step a new one starts, the fire clock does not restart. All station timings are D-080 and
  provisional until seen on a screen.
- **From T-05 (orders), for T-06:** set `allowedDishes`, `roundSeconds` and `soloThresholds`
  per level; 8-cook levels need enough plates and chopping boards (4 plates cap a round near
  34 to 46 plated dishes). **For T-07:** show up to 6 order cards; after a crew shrinks the
  board can briefly hold more than the new cap; events last one step and are cleared when the
  round ends; `refused.dish` can be null; the view carries queue, patience, warning, score,
  tips, timer, stars and thresholds. **For T-14:** nothing assigns `Cook.kitchen` yet, so a
  two-kitchen level scales each kitchen as solo: assign it at spawn or join and add a
  two-kitchen scaling test that does not set it by hand. **For T-16:** OQ-032.
- **From T-04 (recipes), for T-05:** `stationCross` calls `checkRecipe(held)` with no allowed
  list: pass in the open orders. "Not ordered" is checked last, so a dish that is both wrong
  and not ordered reports its defect. A served event names the drink and carries the step.
  Containers still in transit at round end stay in `returns`. **For T-06:** one reachable
  return counter per kitchen; one rack per container kind with its kind set; keep serving
  counters, racks and return counters out of `fireNeighbours`; the validator owns "a level
  needs a return counter" (thrown in `prepareStations` today); keep rack contents bounded;
  the fixtures' return counter at tile 0 cannot be walked to. **Tidy:** restore the 8-cook
  serve journey or assert a served dish inside the kit script; route `separateCup` through
  `relocate`. **For T-07:** fire hands a separated cup to whichever empty-handed cook is
  aiming at the station, which will look odd. All counts and timings are D-085 and D-087,
  provisional until seen on a screen.
- **From T-06 (levels).** **For T-07:** confirm the 144 px HUD and 120 px prop reservation on
  a rendered frame (15 tiles leaves 5 px margins); stations carry `facing`; give the
  `missing-return-counter` reason player wording; the early size refusal hard-codes 15 and 6
  instead of `SCREEN_FIT`. **For T-11:** the eight real levels with venues; twist behaviour
  (the validator refuses every twist kind until then); layouts with enough chopping boards
  and plating counters for eight cooks (D-093 j); a co-op split kitchen is one kitchen on two
  floor regions, which the connected-floor rule forbids today; station ids unique ignoring
  case. **For T-13:** never list the two test kitchens to players. **For T-14:** per-kitchen
  connectivity and a kitchen-aware floor fallback; refuse a team value outside the two teams;
  one or two interaction forms per arena. **For T-16:** the chopping floor hard-codes the
  eight-cook crew factor and 24 s instead of calling the scaling function. **For T-17:** when
  the game's `init` loads a real level the existing conformance test covers it; the kit was
  run by the reviewer on both test kitchens at 1 and 8 cooks and passes, but is not in the
  suite for them (8 s or more each).
