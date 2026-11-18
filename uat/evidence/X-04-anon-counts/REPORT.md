# X-04 check evidence — Round 2

Scope: DATA-003, DATA-001, NN-3. No performance-budget verdict.

The integrator reports that the five browser test files (Overlap.dom.test.ts,
PeekPoker.dom.test.ts, host-keyboard.dom.test.ts, layout-fixtures.test.ts and
team-polish.test.ts) and protocol tests pass outside the sandbox: **112 files,
2,214 tests passed**. This is integrator-supplied evidence, distinct from the local
Round 2 run below.

Only these prescribed checks were executed locally; each Vitest/TypeScript launch
followed an uptime check with one-minute load below 8:

| Command | Local Round 2 result | Log |
|---|---|---|
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/signal packages/protocol packages/netcode packages/platform apps/web/src` | 107 files passed; 2,215 tests passed, 1 skipped; 5 existing browser tests failed at Chromium launch; exit 1. | `vitest-round2.txt` |
| `pnpm exec tsc -b tsconfig.build.json` | Pass, exit 0. | `typecheck-round2.txt` |
| `pnpm exec eslint apps/signal packages/protocol packages/netcode packages/platform apps/web/src --max-warnings 0` | Pass, exit 0 after correcting new test lint errors. | `eslint-round2.txt` |
| `pnpm run lint:design` | Pass, exit 0; 422 files scanned. | `design-lint-round2.txt` |

The five local failures are Chromium MachPortRendezvousServer / bootstrap_check_in
permission failures in the same browser files listed above. No tests were skipped
or changed to hide this restriction. All other selected files, including protocol
and the new Round 2 regressions, passed locally.

Round 2 covers the shared IPv6 /48 budget across 64 distinct /64 clients, EDGE_LIMIT
using the counts hash before admission/storage, quiet 400/413/429/503 refusals,
fetch credentials/referrer/timeout settings, lifecycle beacon wiring and draining,
all three browser count increments, cancelled-start exclusion and a spy that fails
if phone construction/lifecycle calls hostCounts.

For the privacy page and ops: error:signal:unavailable under-counts by design because
it is sent to the server that was unreachable; a failed send switches collection off.
Counts gathered before pairing is ready are sent on a later hide or match end.
Daily totals have no expiry.

Existing limiter COST lines remain in the Round 1 vitest.txt. An admitted IPv4 batch
uses two limiter fetches (rotation windows), IPv6 four (also /48), and one daily
aggregate fetch with one read/write. Cached admission refusals use no Durable Object
calls; the optional EDGE_LIMIT is checked first. This is local functional evidence,
not a production bill.

No UAT, verify, perf, memcheck, Blender, install, wrangler, deployment or commit.
Independent review remains with the integrator.
