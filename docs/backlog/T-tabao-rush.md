# Track T — Tabao Rush

Spec: `../games/tabao-rush.md`. The large game. Rules are split so several agents can work at once on a shared state shape agreed in T-01.

**Owns:** `games/tabao-rush`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story T1 — We cook and serve together in one kitchen

Wave 1 issues are pure rules with unit tests; nothing is drawn.

| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| T-01 | State shape, movement on the next step with no smoothing, 8-way facing, soft collisions that never deadlock, the station a cook would use | TR-002, TR-020, TR-021, TR-022 | F-04 | 1 | todo |
| T-02 | Items: carry one thing, crates, counters, passing, throwing and catching | TR-002, TR-009, TR-023 | T-01 | 1 | todo |
| T-03 | Stations and timers: chop, wok, pot, grill, rice, drinks, plating, sink, bin; burning with a warning; fires that start, spread and are put out | TR-007, TR-008, TR-010, TR-030 | T-01 | 1 | todo |
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
