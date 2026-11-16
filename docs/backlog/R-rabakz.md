# Track R — Rabakz (trivia night)

Spec: `../games/rabakz.md`. The simplest game: a good first full pass through the game interface.

**Owns:** `games/rabakz`, `content/rabakz`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story R1 — We answer the same question at once and fast right answers win



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| R-01 | Rules (pure): match flow, answer timing, lock-in, scoring with speed, streak and double final round, teams by average, mid-match join, ties | RZ-001, RZ-004, RZ-006 to RZ-009, RZ-012, RZ-014, RZ-016, RZ-026 | F-04 | 1 | todo |
| R-02 | Controller layouts and private views: setup, answer buttons, locked in, reveal | RZ-003, RZ-005 | R-01, K-05 | 2 | todo |
| R-03 | Big-screen question and reveal views: text at reading size, option shapes, timer, who has answered | RZ-003, RZ-005, RZ-006, RZ-030, RZ-031, RZ-034 | R-01, F-06 | 2 | todo |
| R-04 | Setup screen: length, categories, difficulty, free-for-all or teams | RZ-001, RZ-010, RZ-011, RZ-012 | R-03 | 2 | todo |
| R-05 | Scoreboard every 5 questions, podium, team totals | RZ-032 | R-03 | 2 | todo |
| R-06 | Solo best per length and recently-seen questions on the host device | RZ-013, RZ-015 | R-01, C-13 | 2 | todo |
| R-07 | Sound effects | RZ-033 | R-03 | 3 | todo |
| R-08 | Full-match UAT in the real console: 1 player, 8 players, teams, a phone reloading mid-question | RZ-001 to RZ-034, PLAT-033 | R-02 to R-06, C-15 | 3 | todo |

## Story R2 — There are enough good questions for many nights

Content work. It needs no code from other tracks and starts in Wave 0.

| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| R-10 | Question schema, build and validation script, per-category chunks loaded before a match | RZ-020, RZ-022 | F-01 | 0 | todo |
| R-11 | Import the Open Trivia Database: licence and attribution recorded, length filter, all-ages screen, difficulty mapped | RZ-021, RZ-023, RZ-024 | R-10 | 0 | todo |
| R-12 | Singapore pack: at least 200 questions written by Claude, each with a source note | RZ-021, RZ-024 | R-10 | 1 | todo |
| R-13 | Picture questions: at least 60, with real photographs under a free licence (licence and credit recorded per image) or Codex-generated images checked for accuracy, as Randy chooses on board 2; each Codex use logged in `DECISIONS.md` | RZ-002, RZ-024, RZ-025 | R-10, G-02 | 2 | todo |
| R-14 | Randy spot-checks the Singapore pack and a sample of the rest | RZ-021, RZ-023 | R-11, R-12 | 3 | todo |
