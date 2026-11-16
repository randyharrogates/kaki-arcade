# F-05 review-fix round 1 evidence (PLAT-030, NFR-TEST)

Overall: functional regression checks and repository verification pass. **Item 1 remains
partially open: the <15% raw-driveStep overhead target fails.** No performance threshold
or existing test timeout was changed.

- Recording size: **243,819 bytes** (0.244 MB), eight real Tabao players, seed 42, held stick
  (1, 0.3), 210 seconds / 12,600 steps, one encoded tick run and one hash per step. Default
  snapshots are empty. The automated real-time fixture also asserts <1.5 MB, hash count,
  RLE structure and JSON replay. No timing assertion is in the suite.
- Timings: three warm-ups, nine samples, medians: raw driveStep **151.534 ms**, raw plus
  per-step hash **473.551 ms**, full harness **502.336 ms**. Overhead against raw is
  **231.50%**, above 15%. The shared hash is the dominant measured cost; no cadence was
  reduced. Against raw plus the same hash the remaining cost is 6.08%, but the required
  comparison is raw and therefore fails. All samples: `review-performance.json`.
- Reproduce: `node --import ./packages/platform/scripts/register.ts
  uat/evidence/F-05-game-harness/review-benchmark.ts` from the repository root. This script
  uses the reviewer's real-game fixture; it adds no platform package dependency. The
  standard memory helper could not read sandboxed sysctl; direct memory_pressure reported
  41% available of 16 GB and vm_stat was inspected before the measurement.
- Source Node isolation: `review-node-boundary.txt` records a real source probe compiled
  through the platform library config: TS2304 (setTimeout) and TS2591 (process), expected
  exit 2. Probe removed. `scripts/node-boundary.test.ts` asserts both diagnostics after
  importing runtime and harness. CLI/register live in the separate Node project; shared
  fixtures are excluded from the library output. Obsolete ignored emitted files removed.
- Inputs/leadership/scripts: review regressions cover refusal and sanitisation of undrawn
  held inputs, drawn disabled buttons, layout transitions, sticky/explicit leadership,
  finished-script reset, manual replacement, multi-condition until and tapIfOffered.
- Replay: public expected/actual views are recomputed with an original-build reference;
  its hash is checked. Missing reference/snapshot is reported explicitly. State/private
  diffs require opt-in. JSON parsing, hash cadence, optional snapshots, lifecycle replay,
  sequence-counter reconstruction and crafted initial states are checked.
- CLI: main runs in-process against injected in-memory readers/writers/loaders. It records
  and replays its own JSON, supplies settings/context/teams and rejects module-id mismatch.
  That test starts no subprocess and writes no files.
- Bots/advancement: disabled-button option, manual reconnect/leave, actual step counts and
  paused/roster/team/over reasons have regression coverage. Current-layout sampling remains
  on the shared drive path and real input buffer.
- Shared fixture modules contain no test suites; harness imports no test file. Source-scan
  checks and all existing test timeouts were preserved. Lower overall test count reflects
  eliminating suites formerly run through imported test files.

`review-tests.txt`: focused harness/Node suite, **30 passed in four files**.
`review-verify.txt`: `VITEST_MAX_WORKERS=2 pnpm verify`, exit 0: **64 files passed,
2,077 tests passed, one existing skip**. Workspace, typecheck, lint, design lint, build,
budget and trace passed. The green verify result does not satisfy the open timing target.

The slice note requests integration of the three supplied game-owner drafts, preserved
under `review-drafts/`, at the exact target paths, each describe using a 60-second timeout.
No product-game harness suite was added in this lane. Existing generated Tabao conformance
reports were restored to HEAD bytes. No commit, push, merge, dependency install,
node_modules modification, deployment or tracker edit was performed.

## Review-fix round 2 — supersedes round-1 hashing/performance

Zero-hash non-recording mode, checkpoint cadence and replay-span/refinement diagnostics pass
the regression suite. Game contract test audit is in `game-test-audit.txt`; no assertions,
scenarios or expected values changed. The incidental source-root rewrite was reverted.

### Round-2 benchmark and verification

Eight players, 210 simulated seconds (12,600 steps), real Tabao Rush fixture, seed 42,
all sticks held at (1, 0.3). Three warm-up rounds then nine samples; median elapsed time
includes match setup and stepping, with JSON serialisation measured separately for size.
No test or build ran concurrently with the final benchmark. Memory was 47% available
before the run. These local measurements are evidence, not test assertions.

| Mode | Median time | Recording bytes |
|---|---:|---:|
| raw | 157.097 ms | 0 |
| not recording | 178.482 ms | 0 |
| hashEvery 60 | 189.815 ms | 15,603 |
| hashEvery 1 | 501.969 ms | 675,207 |

Raw and non-recording modes produce no recording (0 bytes). Non-recording overhead
against raw driveStep is **13.61%**, meeting the under-15% aim
in this run. Sparse and dense recordings contain 210 and 12,600 checkpoints respectively.
Full sample arrays and sizes: `review-performance.json`; reproducible script:
`review-benchmark.ts`. Integrator quiet-machine confirmation remains appropriate.

`VITEST_MAX_WORKERS=2 pnpm verify` exited 0. Tail:

```text
 Test Files  65 passed (65)
      Tests  2082 passed | 1 skipped (2083)
$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
no bundles yet
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 58 in progress, 1 later, 93 not started
trace check passed
```

Focused harness/CLI verification passed 35 tests across five files (`review-tests.txt`).
Complete verification output: `review-verify.txt`. Generated T-01 conformance evidence
was restored to HEAD bytes after verification; it is outside this lane.

## Correction at merge (integrator)

The recording sizes above are for scripted, steady inputs (one stick held still for the whole
round). With seeded bots, whose stick changes every step, an 8-player 210 s Tabao Rush round
records to about 12.3 MB at `hashEvery 60` (13.0 MB at 1), and Peek Poker with bots to about
190 KB, as measured in review round 2. A compact input encoding is carried as F-05c.
