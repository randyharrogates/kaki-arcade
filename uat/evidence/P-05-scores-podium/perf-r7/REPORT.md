# P-05-scores-podium UAT evidence

Visual review: Claude (review 2), transcribed from P-05.review2.md.

Command: `node --expose-gc tools/perf/run.mjs peek-poker-console --phones 8 --headless --slice P-05-scores-podium --out perf-r7`
Commit: `462c7788bb07e1fb149d4a24723916da059abd45`
Viewports: 

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1227.9 | completed |
| Picker → start Peek Poker | 1199.8 | completed |
| Memorise → pick | 19943.7 | completed |
| All phones pick and lock in → reveal | 3157.4 | completed |
| Round 1 scoreboard | 6841.5 | completed |
| Memorise → pick | 20419.4 | completed |
| All phones pick and lock in → reveal | 3095.3 | completed |
| Round 2 scoreboard | 7310.9 | completed |
| Memorise → pick | 17870.6 | completed |
| All phones pick and lock in → reveal | 3107.6 | completed |
| Round 3 scoreboard | 7296.5 | completed |
| Memorise → pick | 15849.6 | completed |
| All phones pick and lock in → reveal | 3113.5 | completed |
| Round 4 scoreboard | 7309.6 | completed |
| Memorise → pick | 15872.7 | completed |
| All phones pick and lock in → reveal | 3088.6 | completed |
| Round 5 scoreboard | 7316.7 | completed |
| Final podium (over) | 5964.6 | completed |

Expected errors (count):
None



| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Diagnostic 8-phone console match through five scoreboards and the podium (development build, headless, load 3.1→6.2): frames median 16.7 ms, p95 16.8 ms, max 33.3 ms, 0 over 50 ms, 0 long tasks; the 33 ms frames fall in Start preparation and round-1 memorise, none in scoreboard or podium; budgets not assessed | diagnostic | perf.json |

Current. Round 8 adds no per-frame work: Screen.update returns early on an unchanged view, so updateResultBest runs only on a view change.
