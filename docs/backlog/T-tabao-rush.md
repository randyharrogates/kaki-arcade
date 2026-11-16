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
| T-04 | Recipes for the 7 dishes, plating, serving, rejection with a reason | TR-003, TR-004, TR-040 | T-02, T-03 | 1 | todo |
| T-05 | Orders, patience, score and tips, stars, scaling by player count, round timer | TR-001, TR-004, TR-005, TR-006 | T-04 | 1 | todo |
| T-06 | Level format and loader: collision map, station anchors, twists; a validator that every level fits the screen with no scrolling | TR-050, TR-057 | T-01 | 1 | todo |
| T-07 | Big-screen renderer: baked background, sprites from atlases, body plus head, interpolation for everything not player-controlled, HUD and order cards | TR-001, TR-030, TR-031, TR-061, TR-062, PERF-001 | T-05, S-04, A-02, F-06 | 2 | todo |
| T-08 | Controller layout: stick, A, B, X, Y, Start, optional shake for the wok | TR-020, CTRL-007 | T-01, K-06 | 2 | todo |
| T-09 | Cook picker before a round: 8 characters, no two players the same | TR-064 | T-07, A-03 | 2 | todo |
| T-10 | First-run tutorial, skippable | TR-055 | T-07 | 2 | todo |
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
