# Track P — Peek Poker

Spec: `../games/peek-poker.md`. Turn-based with secrets on the phones.

**Owns:** `games/peek-poker`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story P1 — We memorise the grid, pick in secret, and the best hand wins



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| P-01 | Rules (pure): deal, memorise and pick timers, secret picks, random fill, swap twists, match of 3, 5 or 7 rounds, mid-match join, solo | PP-001 to PP-006, PP-010 to PP-013, PP-022 | F-04 | 1 | merged |
| P-02 | Hand evaluator and scoring, including the speed rule for tied best hands | PP-007, PP-009 | F-04 | 1 | merged |
| P-03 | Controller: "watch the TV", private 4 × 4 pick grid with tap (no D-pad, D-062(5), D-164), lock in, own hand at the reveal | PP-005, PP-020 | P-01, K-05 | 2 | todo |
| P-04 | Big-screen table: grid, shared cards, flips with masks, swaps on arcs, lock-in markers, reveal with picks marked | PP-003, PP-004, PP-008, PP-021, PP-030, PP-031 | P-01, A-08, F-06 | 2 | done |
| P-05 | Scoreboard between rounds, podium, solo personal best | PP-032, PP-012 | P-04, C-13 | 2 | todo |
| P-06 | Load the table (P-04) in the console: register the host screen and view key in the game registry, as Rabakz does, with the card atlas and fonts decoded and warmed before the round starts (nothing loads during play); found by P-03's UAT, where the TV shows "This game's screen is not built yet" | PP-030, PP-031, PLAT-033 | P-04, C-10 | 2 | todo |
| P-07 | Full-match UAT in the real console, including a check that no pick reaches the big screen or another phone early | PP-001 to PP-032, PLAT-033 | P-03 to P-06, C-15 | 3 | todo |

## Carried from reviews

- **From P-01:** during the scoreboard and end phases the phone still reads "Your hand"; P-03
  or P-05 should word it for scores. The kit's five-round scenario ends one step inside its
  step limit: raise the limit if any timing changes. Reveal (8 s), scoreboard (5 s) and swap
  (2 s) durations are provisional until seen on a screen (D-069).
