# P-13-steady-mode UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node --expose-gc tools/perf/run.mjs peek-poker-console --phones 8 --slice P-13-steady-mode --out perf-merged`
Commit: `39c7758aaac0da8ef5a7faf72b566c9474b833ef`
Viewports: 

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1220.9 | completed |
| Picker → start Peek Poker | 1634.4 | completed |
| Round 1 memorise → pick | 19972.8 | completed |
| All phones pick and lock in → reveal | 17677.9 | completed |
| Round 1 scoreboard | 6825.8 | completed |
| Round 2 memorise → pick | 20250.4 | completed |
| All phones pick and lock in → reveal | 17584.8 | completed |
| Round 2 scoreboard | 7313.1 | completed |
| Round 3 memorise → pick | 17726.1 | completed |
| All phones pick and lock in → reveal | 17652.2 | completed |
| Round 3 scoreboard | 6844.3 | completed |
| Round 4 memorise → pick | 16232.1 | completed |
| All phones pick and lock in → reveal | 17591.5 | completed |
| Round 4 scoreboard | 6824.8 | completed |
| Round 5 memorise → pick | 16237.4 | completed |
| All phones pick and lock in → reveal | 17633.5 | completed |
| Round 5 scoreboard | 6842.8 | completed |
| Final podium (over) | 6712.9 | completed |

Expected errors (count):
- 1 × host: Failed to load resource: the server responded with a status of 404 (Not Found)



| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
