# C-10 review fix round 2

Scope: PLAT-023, PLAT-025, PLAT-031 and NET-001, under D-082 from the integrator's main checkout.
This runner draws nothing; independent review and visual/integration UAT remain with Claude.

All R1–R9 pass in session/c10-round2.test.ts. R1/R2 run TV frames during the pause, then
verify the release/press required by discardEdges. R3 repeats pause/resume and reconnects.
R4 accepts old cosmetic wire revisions until the game revision changes. R5 preserves both
frozen teams even when the room changes all seats to red, without duplicate joins. R6 retains
seats through null/reset teams with zero leaves and zero extra joins. R7/R8 prove the exact
120-second shortage and recovery. R9 verifies seat reuse and delivery to the new connection.
R6's original leave/rejoin expectation and the old round-1 team-refresh assertion were updated
to D-082; no check configuration, threshold or existing timeout was changed.

Both real-game replay ports pass across joins, leave, disconnect and pause, with final hash
equality and no seat tokens. Both send ports pass. Identity/shape comparison regressions pass,
as do stand-in and real-game diagnostic structure assertions. See tests-round2.txt.

## Heap measurement

The same c10r2-perf test was run against HEAD's round-1 session runner, copied temporarily to
baseline.fixture.ts, then against the fixed runner. The temporary files were removed. Each
session has eight phones, the real input buffer/loop, 500 warm-up steps and 6,000 measured
steps. The stand-in steps in place, returns constant layout/private/public objects, and uses
a transport that retains only the initial eight layout/view sends. Inputs use prebuilt ids
and axes. The optional recordInput sink retains nothing. global.gc() runs immediately before
each measured region when exposed; figures are heapUsed difference divided by 6,000, with no
post-run GC. Commands used NODE_OPTIONS=--max-semi-space-size=256, VITEST_MAX_WORKERS=2 and
`pnpm exec vitest run <probe> --execArgv=--expose-gc`, with C10_PERF_EVIDENCE naming the
corresponding evidence file.

| Eight-phone stand-in | Before B/step | After B/step |
| --- | ---: | ---: |
| No recorder | 1,024.94 | 935.85 |
| Non-retaining recordInput | 1,114.69 | 769.99 |

These are observed net heap growth, including buffer/loop/runtime overhead and possible GC/JIT
noise; they are not exact allocation counts or a zero-allocation claim for the whole runner.
The comparison-only allocation claim is by code reading in the slice note. Raw figures,
including real Tabao/Peek timings and send counts, are in heap-before-collected-round2.txt and
heap-after-collected-round2.txt. Timing is diagnostic on a shared machine, not browser budget
or quiet-machine performance evidence. There are no wall-clock assertions.

The memory helper could not read its sysctl inside the sandbox; memory_pressure and vm_stat
were read directly. No system or repository settings were changed.

## Verification

`VITEST_MAX_WORKERS=2 pnpm verify` passed: 87 files, 2,346 tests passed and one existing
skip. Build passed (no bundles/assets yet); trace check passed for 152 requirements.
`git diff --check` passed. See verify-round2.txt for the full run and its build/trace tail.
Changes are left in the tree, uncommitted, for the integrator's review.
