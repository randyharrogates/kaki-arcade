# P-12-shared-cards UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node --expose-gc tools/perf/run.mjs peek-poker-console --phones 8 --slice P-12-shared-cards --out perf-8`
Commit: `cea706ab7058975b277de4fc69c2195b52181448`
Viewports: 

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 997.7 | completed |
| Picker → start Peek Poker | 1825.6 | completed |
| Round 1 memorise → pick | 19935.1 | completed |
| All phones pick and lock in → reveal | 17679.9 | completed |
| Round 1 scoreboard | 6825.4 | completed |
| Round 2 memorise → pick | 20267.0 | completed |
| All phones pick and lock in → reveal | 17604.5 | completed |
| Round 2 scoreboard | 6824.6 | completed |
| Round 3 memorise → pick | 18236.9 | completed |
| All phones pick and lock in → reveal | 17559.4 | completed |
| Round 3 scoreboard | 6844.3 | completed |
| Round 4 memorise → pick | 16207.5 | completed |
| All phones pick and lock in → reveal | 17595.9 | completed |
| Round 4 scoreboard | 6827.1 | completed |
| Round 5 memorise → pick | 16241.9 | completed |
| All phones pick and lock in → reveal | 17560.9 | completed |
| Round 5 scoreboard | 6827.8 | completed |
| Final podium (over) | 6683.9 | completed |

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
