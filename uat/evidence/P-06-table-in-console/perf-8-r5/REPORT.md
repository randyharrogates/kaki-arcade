Kept copy of the gitignored `perf-8/` run (PERFORMANCE.md §4). Integrator note, 2026-11-18:
Headed development run, 8 phones, d6c7ad40: completed; budgets not assessed (one round, not 180 s; inputs not instrumented).
Round only (memorise to settled reveal): 1,428 frames, median 16.7 ms, p95 17.4 ms, max 17.7 ms, none over 50 ms.
The 233 ms frame and the 222 ms long task fall in preparation behind "Starting…", before the round. Diagnostic, not a pass (D-182).

# P-06-table-in-console UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node --expose-gc tools/perf/run.mjs peek-poker-console --phones 8 --slice P-06-table-in-console`
Commit: `d6c7ad40c6a95cef3eb033d36b429cafca44ffcc`
Viewports: 

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1192.3 | completed |
| Picker → start Peek Poker | 1324.6 | completed |
| Memorise → pick | 20380.3 | completed |
| All phones pick and lock in → reveal | 3151.1 | completed |

Expected errors (count):
- 1 × host: Failed to load resource: the server responded with a status of 404 (Not Found)



| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
