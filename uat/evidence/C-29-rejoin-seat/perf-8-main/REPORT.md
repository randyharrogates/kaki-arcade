# C-29-rejoin-seat UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node --expose-gc tools/perf/run.mjs peek-poker-console --phones 8 --build production --slice C-29-rejoin-seat --out perf-8-main`
Commit: `98e9f3acadbbf9e301313fe0d4625c4451ae452a`
Viewports: 

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 969.4 | completed |
| Picker → start Peek Poker | 1341.5 | completed |
| Round 1 memorise → pick | 19930.3 | completed |
| All phones pick and lock in → reveal | 17491.2 | completed |
| Round 1 scoreboard | 7327.8 | completed |
| Round 2 memorise → pick | 19753.9 | completed |
| All phones pick and lock in → reveal | 17501.1 | completed |
| Round 2 scoreboard | 6826.8 | completed |
| Round 3 memorise → pick | 18225.6 | completed |
| All phones pick and lock in → reveal | 17429.2 | completed |
| Round 3 scoreboard | 6826.4 | completed |
| Round 4 memorise → pick | 16232.0 | completed |
| All phones pick and lock in → reveal | 17473.6 | completed |
| Round 4 scoreboard | 6841.7 | completed |
| Round 5 memorise → pick | 16208.0 | completed |
| All phones pick and lock in → reveal | 17449.5 | completed |
| Round 5 scoreboard | 6844.3 | completed |
| Final podium (over) | 6682.6 | completed |

Expected errors (count):
None



| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
