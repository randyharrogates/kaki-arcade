# Track P — Peek Poker

Spec: `../games/peek-poker.md`. Turn-based with secrets on the phones.

**Owns:** `games/peek-poker`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story P1 — We memorise the grid, pick in secret, and the best hand wins



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| P-01 | Rules (pure): deal, memorise and pick timers, secret picks, random fill, swap twists, match of 3, 5 or 7 rounds, mid-match join, solo | PP-001 to PP-006, PP-010 to PP-013, PP-022 | F-04 | 1 | merged |
| P-02 | Hand evaluator and scoring, including the speed rule for tied best hands | PP-007, PP-009 | F-04 | 1 | merged |
| P-03 | Controller: "watch the TV", private 4 × 4 pick grid with tap (no D-pad, D-062(5), D-164), lock in, own hand at the reveal | PP-005, PP-020 | P-01, K-05 | 2 | merged 2026-11-18 |
| P-04 | Big-screen table: grid, shared cards, flips with masks, swaps on arcs, lock-in markers, reveal with picks marked | PP-003, PP-004, PP-008, PP-021, PP-030, PP-031 | P-01, A-08, F-06 | 2 | done |
| P-05 | Scoreboard between rounds, podium, solo personal best | PP-032, PP-012 | P-04, C-13 | 2 | done (merged 2026-11-18; D-208–D-211) |
| P-06 | Load the table (P-04) in the console: register the host screen and view key in the game registry, as Rabakz does, with the card atlas and fonts decoded and warmed before the round starts (nothing loads during play); found by P-03's UAT, where the TV shows "This game's screen is not built yet" | PP-030, PP-031, PLAT-033 | P-04, C-10 | 2 | merged 2026-11-18 |
| P-07 | Full-match UAT in the real console, including a check that no pick reaches the big screen or another phone early | PP-001 to PP-032, PLAT-033 | P-03 to P-06, C-15 | 3 | done (merged 2026-11-18; final-round copy → P-10; tied-hand order → P-11, D-223) |
| P-10 | The scoreboard after the last round said "Next round in 5 seconds"; it now says "Final scores in 5 seconds" (refines D-209); DOM test for round === totalRounds | PP-032 | P-05 | 3 | done (merged 2026-11-18; D-256) |
| P-11 | Tied hands at the reveal: equal hands ordered by this round's points, then lock-in time (random fills last), seat only as the final tiebreak; change `rankedHands` (`games/peek-poker/src/rules/round.ts`) and its unit test, and update P-07's UAT pin (`uat/slices/P-07-full-match.mjs`) to the new order (D-223) | PP-008, PP-009 | P-07 | 3 | done (merged 2026-11-19; D-261) |

## Carried from reviews

- **From P-01:** during the scoreboard and end phases the phone still reads "Your hand"; P-03
  or P-05 should word it for scores. The kit's five-round scenario ends one step inside its
  step limit: raise the limit if any timing changes. Reveal (8 s), scoreboard (5 s) and swap
  (2 s) durations are provisional until seen on a screen (D-069).
| P-08 | Publish the card atlas WebP files in the production build so the manifest's relative atlas URLs resolve; today Start fails in production and the TV returns to the picker | PP-030, PP-031, PERF-020 | P-06 | 3 | merged |
| P-09 | Assessed performance run of a full 5-round console match at 8 phones on a quiet machine (a round of at least 180 s for PERF-001; input and feedback instrumented for PERF-010/012), on a production build once P-08 lands | PERF-001, PERF-010, PERF-012, PP-031 | P-06, P-08 | 3 | todo |
| P-10 | Shared cards hidden while memorising: the 3 shared cards are dealt face down on the TV during memorise and flip face up as the grid flips face down (same flip art and timing), then stay up; phones and public view never show them early (D-296) | PP-004, PP-020, PP-031 | P-07 | 3 | todo |

### Carried from P-06's review (2026-11-18)

- P-05: when the scoreboard or podium draws new public fields, add them to `sameTable` (`games/peek-poker/host/Screen.tsx`) and to its field-mutation test; otherwise `publicViewKey` will not change and the TV will not refresh. (done in P-05: `Screen.test.ts` mutates `soloBest` and `newBest`)
- P-04/P-07: seat-marker coverage with five or more players on one card (OQ-043); check how often it happens in P-07's full match with varied picks.
- Shell: re-apply the room and re-check failure after the readiness await (`apps/web/src/session-adapter.ts`, start), with a test.
