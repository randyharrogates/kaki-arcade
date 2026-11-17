# C-13 part 1 — Host storage and detail benchmark

## Scope and readings

DATA-002, PERF-001 and PERF-002; supporting DATA-001, DATA-003 and PLAT-006.
Round 3 reads the MAIN checkout's D-111, D-113 and OQ-036 (2026-11-17), alongside
CLAUDE.md, AGENTS.md, WORKFLOW, PLAN, HANDOFF, PRD and STATUS. This part draws
nothing; UI, renderer integration and game-owned codecs remain outside this lane.
No dependency, shared tracker, contract or evidence-folder edits.

Proposed ARCHITECTURE sentence for the integrator:
“Host-device scores, stars and settings live behind injected, versioned codecs in
`packages/platform/src/storage`; only the host shell opens that backend, at explicit
between-round or idle-settings save points, never through phone or server transports.”

## Implementation choices

- `host-store.ts` uses an injected lazy backend. Reads return null for absent,
  corrupt, invalid or future-version records. Reporting is local, once per key/reason,
  and cannot interrupt play. Explicit save points return saved/not-saved with a reason;
  no timer, render, session or simulation path writes automatically.
- Platform/game/name namespaces are separate. Generic pure migration remains supported
  without writing on read. A save refuses to overwrite a newer stored schema version
  (`newer-version`), preserving the original bytes. Corrupt records can be replaced.
- The encoded record cap is per-schema `maxBytes`, default 16 KiB, enforced on read
  and write. This is a small-write guard, not a performance budget. Rabakz's RZ-015
  recently-seen list, drawn from 1,500+ questions, needs a larger cap or compact encoding.
  Actual game-owned schemas, best-score/star update rules and adapters remain for integration.
- Settings start at version 1 with no migration: auto/full/lower (default auto) and an
  optional measurement. Cache keys include an eight-hex UA hash, screen width/height,
  devicePixelRatio and refresh rate from the separate idle probe, rounded to the nearest common display rate.
  No unused measurement date is stored. A fresh cadence probe supplies the current median
  before cache reuse; changed screen, DPR, refresh or UA requires remeasurement.
  Explicit overrides win. An unmatched/missing cache defaults to full, per OQ-036.
- Production storage's transitive local import graph is checked for protocol/netcode/
  transport imports; protocol source imports are checked for storage/platform imports.
  This checks dependency direction, not a security boundary against deliberate payload copying.

## Benchmark measurement and integration

D-111 uses the requestAnimationFrame callback timestamp directly, never a clock read
inside the callback. The runner calls the injected `work(): void` once per callback.
It discards the first ten callbacks plus the interval leading into the measurement
baseline, allowing initial lobby paint and JIT warm-up to settle. It then records
120 intervals (131 callbacks total, approximately two seconds plus warm-up at 60 Hz).
The warm-up length and sample count are sampling choices, not new budgets.

The decision reports nearest-rank median/p95 and maximum without changing caller input.
A dropped interval exceeds 1.5 × median. Full requires at most 5% drops and maximum
at most 50 ms. D-113 additionally requires workload median at most 20.5 ms: steady 50 Hz is full,
while steady 45 Hz is lower.
Otherwise lower is selected; its budget flag checks at most 5% drops against the
33.3 ms cadence (intervals exceeding 1.5 × 33.3 ms), maximum at most 100 ms.
Lower remains the floor if even that check fails.

OQ-036: until a representative renderer workload exists, invoking the runner without
work returns no workload measurement. Its decision is full, valid=false, reason
`no workload yet`. Auto must never cache this verdict. The exported runner comment
states this contract. With work, hidden/empty/non-finite/non-positive samples are invalid;
never cache invalid decisions. Subscribe to visibilitychange so hide then show between
frames still invalidates. Cancellation on lobby activity/navigation is idempotent.
Adapters deliver callbacks asynchronously like rAF and own listener cleanup.

The host shell must save only a valid measurement at an idle/between-round save point.
The authenticated leader controls overrides (PLAT-006); the primitive has no room identity.
Real browser private-mode behaviour, gameplay costs, three-minute rounds, TCL Q65,
input delay and actual lower-detail rendering still require integrator evidence.
OQ-036 leaves the representative workload and when it should run unresolved.

## Validation

Focused command: `pnpm exec vitest run packages/platform/src/storage`.
Tests pin quantised/jittered 60 Hz, 120 Hz, 10% drops, a post-warm-up 60 ms hitch,
warm-up-only hitches, 30 Hz, distinct median/p95/p99, strict drop comparison,
inclusive 5% and max limits, lower-budget floor, workload count, timestamp sampling,
visibility/cancellation and no-workload invalidity. Storage tests cover isolation,
future-version reads/writes, permissive-codec safeJson rejection, quota/blocked access,
per-schema caps, generic migration, schema v1, import direction and cache discriminators.

Mutation checks temporarily alter production code and run only the focused command;
all changes are restored. Checks cover strict drop equality, 5% equality, 50/100 ms
max equality, removed warm-up, future-version save protection and screen-width key.

## Close-out

Code: storage/host-store.ts (DATA-002), storage/settings.ts (DATA-002/PERF-002),
storage/benchmark.ts (PERF-001/PERF-002), exported by platform src/index.ts.
Tests: storage/storage.test.ts and storage/benchmark.test.ts. No visible UAT claimed;
Claude/integrator owns independent review, browser integration and real-device evidence.
Local commit was attempted with requirement IDs, but the sandbox denied creation of
MAIN's `.git/worktrees/C-13/index.lock`; the integrator must commit the changes.

## Requests

Integrator: adopt the proposed ARCHITECTURE sentence if appropriate; provide the
representative renderer workload under OQ-036 and wire settings/leader authorisation,
cache probes and game-owned codecs. No dependency, budget or design exceptions requested.

## Round 2 final verification

`VITEST_MAX_WORKERS=2 pnpm verify` ran once. Workspace and typecheck passed;
ESLint stopped the invocation with 12 errors in the changed code (non-null assertions,
empty test stubs, unbound optional method assertion and a meaningless void expression).
Those reported patterns were corrected afterwards. The final focused run passes:
**2 files, 16 tests**, 195 ms. All seven temporary mutations were killed and restored.

Verify tail: **12 problems (12 errors, 0 warnings)**, **ELIFECYCLE exit code 1**.
Design lint, full tests, build and trace were not reached. No recipes timeout occurred,
so no isolated recipes retry was run. The full command was not repeated, respecting
the requested single invocation. Final lint/full-workspace verification remains for
the integrator; this is not a claim of a passing full verify.
Log: `/tmp/C-13-round2-verify.log` (temporary session log, no evidence writes).

## Round 3 (D-113)

Added `probeIdleCadence`: ten discarded callbacks, a baseline, then 30 idle intervals
using the same rAF timestamp sampler and visibility/cancellation handling. It returns
median and refresh rate, or null for an invalid probe. Common refresh keys are
50, 60, 75, 90, 100, 120, 144, 165 and 240 Hz. `createDetailMeasurement` combines a
valid workload verdict with that idle refresh key; the workload median never supplies it.
The host integrator must use this helper after an idle probe at an explicit save point.
No representative workload is invented and no-workload auto still defaults to full.

Tests pin 50/45/60 Hz and the inclusive 20.5 ms boundary, idle 16/17 ms keys at 60 Hz,
a stored lower verdict from a 30 Hz workload reusing the idle key, and future-version
reads with a permissive migration. Warm-up uses literal 10; import graph paths derive
from the test URL. Focused validation: 2 files, 18 tests passed.
The proposed ARCHITECTURE sentence above remains for the integrator.

Round 3 full verification ran once: workspace check and typecheck passed; ESLint
stopped on one unbound-method error at benchmark.ts:65. The cancellation wrapper
was changed to an arrow that calls the method on its runner. Final focused tests
passed again (2 files, 18 tests). Full verification was not repeated as requested;
design lint, full tests, build and trace remain unverified. No recipes timeout occurred.
Verify tail: `1 problem (1 error, 0 warnings)`; `ELIFECYCLE` exit code 1.
Log: `/tmp/C-13-round3-verify.log`. No evidence-folder writes or visible UAT claimed.
