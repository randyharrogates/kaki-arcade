# P-09-perf-match UAT evidence

Host browser: chrome 157.0.8103.80
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node --expose-gc tools/perf/run.mjs peek-poker-console --phones 8 --host-browser chrome --slice P-09-perf-match --out perf-development-b`
Commit: `ffa56bf5160d3c8e62fc56d82ba53c85b1e42452`
Viewports: 

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 950.2 | completed |
| Picker → start Peek Poker | 1602.6 | completed |
| Round 1 memorise → pick | 19963.6 | completed |
| All phones pick and lock in → reveal | 17598.2 | completed |
| Round 1 scoreboard | 6821.4 | completed |
| Round 2 memorise → pick | 20234.7 | completed |
| All phones pick and lock in → reveal | 17595.6 | completed |
| Round 2 scoreboard | 7314.0 | completed |
| Round 3 memorise → pick | 17720.7 | completed |
| All phones pick and lock in → reveal | 17650.3 | completed |
| Round 3 scoreboard | 6825.3 | completed |
| Round 4 memorise → pick | 16250.0 | completed |
| All phones pick and lock in → reveal | 17584.1 | completed |
| Round 4 scoreboard | 6845.2 | completed |
| Round 5 memorise → pick | 16233.8 | completed |
| All phones pick and lock in → reveal | 17561.6 | completed |
| Round 5 scoreboard | 6842.0 | completed |
| Final podium (over) | 6708.6 | completed |

Expected errors (count):
- 1 × host: Failed to load resource: the server responded with a status of 404 (Not Found)
- 1 × phone1: Failed to load resource: the server responded with a status of 404 (Not Found)
- 1 × phone2: Failed to load resource: the server responded with a status of 404 (Not Found)
- 1 × phone3: Failed to load resource: the server responded with a status of 404 (Not Found)
- 1 × phone4: Failed to load resource: the server responded with a status of 404 (Not Found)
- 1 × phone5: Failed to load resource: the server responded with a status of 404 (Not Found)
- 1 × phone6: Failed to load resource: the server responded with a status of 404 (Not Found)
- 1 × phone7: Failed to load resource: the server responded with a status of 404 (Not Found)
- 1 × phone8: Failed to load resource: the server responded with a status of 404 (Not Found)



| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator review (2026-11-20)

- The run has no screenshots by design; I read PERF.md, perf.json and run.json.
- Commit ffa56bf5. That is after main's P-12/K-12 docs commits but before C-28 (a shell hint fade only), so this is pre-merge evidence for the final main tree.
- Production run (frames only): 223 s, median 16.7 ms, p95 18.3 ms against the 16.7 ms PERF-001 budget, max 33.3 ms, no long tasks. PERF-001 is not assessed: macOS reports no display rate, and the measured rate is 59.9 Hz. On a 60 Hz display the raw p95 would be over budget.
- Development run: input p95 17.5 ms against the 50 ms PERF-010 budget, so it passes on direct local links. Pressed feedback came on the next frame for 160 of 160 presses (PERF-012). The frame p95 here was 18.2 ms.
- All five rounds completed, with each pick phase held 15 s and the lock-in to reveal about 17.6 s each round. The round-2 early lock from the earlier run did not recur.
