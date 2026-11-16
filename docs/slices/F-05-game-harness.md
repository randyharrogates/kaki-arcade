# F-05 — Headless game harness

Requirements: PLAT-030, NFR-TEST. Branch: issue/F-05-game-harness. No commit requested.

Goal: build and test games without the console, using its shared drive path.

Acceptance: deterministic fixed-step matches; serialisable concurrent scripts; seeded,
layout-aware bots and optional membership chaos; JSON recordings with first-divergence
public-view diagnostics; stable bounded text and phase timelines; a Node CLI.

Verification: fixture whole matches at minimum and maximum counts, scripts and bots,
replay, altered rules, taps, pause and membership tests; pnpm verify. Headless evidence
is text, with no screenshots or DOM. Tests added here never write files.

Out of scope: F-05b dev page, game rules, contracts, dependencies, trackers and commits.

## Close-out — review-fix round 1

Changes remain uncommitted in the supplied worktree, as requested. Requirements remain
PLAT-030 and NFR-TEST. No dependencies, contracts, trackers, lockfile or product-game code
changed. This is headless tooling; no player UI or screenshot is claimed.

1. **Partly fixed; timing target remains open.** `kaki-match-2` keeps setup, inputs/lifecycle
   events and one full sim-core state hash per event. Unchanged sampled ticks are run-length
   encoded, including reconstruction of their sequence counters. Default per-step views are
   gone; `viewEvery: N` opts into a public snapshot every N simulation steps. A 12,600-step,
   eight-player run produces **243,819 bytes** of unindented JSON (0.244 MB), with one run and
   12,600 hashes. The automated long-run fixture asserts size below 1.5 MB, structure and
   replay, without a timing assertion. Replay can reconstruct both public views using
   `{ referenceGame: originalBuild }`; exact stored snapshots are fallback diagnostics.
   Without the original implementation or an exact snapshot, the diagnostic explicitly says
   the old view is unavailable: a hash cannot reconstruct it.
   Reviewer benchmark, three warm-ups then nine samples, median: raw driveStep **151.534 ms**;
   raw plus the required per-step hash **473.551 ms**; harness **502.336 ms**. Harness overhead
   against raw is **231.50%**, failing the requested <15%. Against raw plus identical hashes,
   the remaining harness overhead is about 6.08%, but that is **not** the acceptance baseline.
   The shared hash cost is retained rather than weakening determinism checking. See Requests.
2. **Fixed.** CLI/register moved to `packages/platform/scripts/`; `tsconfig.node.json` is
   referenced by the package project and uses Node types only there. Shared fixtures are
   excluded from the library build. `scripts/node-boundary.test.ts` compiles a virtual source
   importing the runtime and harness and requires exactly the missing-setTimeout/process
   diagnostics. A real temporary source compiled through `tsconfig.lib.json` also failed:
   TS2304 for setTimeout and TS2591 for process; output is in review-node-boundary.txt.
   Obsolete ignored CLI/register/fixture build outputs were removed.
3. **Fixed.** stick, tilt and press refuse undrawn inputs with player/step/input context;
   a final `evenIfRefused` boolean or script flag bypasses call-time refusal. Sampling still
   zeros undrawn axes and releases undrawn held buttons, using the audience-filtered current
   layout. Drawn-but-disabled held buttons still arrive. Releases always work.
4. **Fixed.** Leadership is sticky and explicit: the first supplied player leads, disconnect
   does not transfer it, leave passes it to the lowest remaining seat, `setLeader(id)` hands
   it over explicitly. Reconnect and lower-seat joins never reclaim it. This replaces the
   lowest-connected-seat rule. The harness does not model the room's timed grace expiry.
5. **Fixed.** Finished stick scripts reset once. A manual stick call immediately after the
   final scripted step can replace the pending reset; later manual calls also keep working.
6. **Fixed.** MatchOptions accepts `headline(publicView)`; transition to `isOver` always adds
   a terminal timeline entry even when that headline is unchanged.
7. **Fixed.** CLI supports --record, --settings, --teams and --context, checks loaded meta.id,
   and exports injectable `main(args, io)`. Its test records and replays via in-memory IO;
   no subprocess and no repository writes are used by that test.
8. **Fixed.** `step(n)` returns the steps actually taken. `blocked` exposes paused, roster
   short, empty team, over, or null; step stops at game over. `until` includes the reason.
9. **Fixed.** `state` is a documented test-only initialisation door, cloned on creation and
   encoded once in recordings. It bypasses init, with normal setup validation still applied.
10. **Fixed.** Exported `parseRecording(json)` validates envelopes, setup, run counts, hash
    cadence, decoded Maps/actions/frames, initial crafted state and snapshot positions.
11. **Fixed.** Bots support `pressDisabled: true` for drawn disabled held buttons and read
    match connection state on every attempt, including manual reconnect and leave.
12. **Fixed.** Replay diagnostics opt into `{ diff: 'state' }` or
    `{ diff: 'private', player: 'p1' }`; default diffs remain public only. Original-build
    reference hashes are checked before reporting reconstructed expected views.
13. **Fixed.** Shared Dots/Picks subjects moved to `src/test-fixtures/*.fixture.ts`, with no
    test-runner imports or suites. Existing fixture/conformance consumers import these modules;
    the harness no longer imports any test file. Existing checks/timeouts are unchanged.
14. **Fixed.** Scripts support `tapIfOffered` and `until.predicates`, requiring all conditions.
    A conditionless until is rejected promptly.

Usage and compatibility notes are in `packages/platform/src/harness/README.md`. The
experimental v1 recording format is replaced by v2; `step` now returns a count, so callers
must retain the match instead of assigning a chained `step` result.

## Requests

- **Performance remains a blocker for item 1.** The existing shared sim-core hash alone
  exceeds the allowed overhead on the reviewer's fixture benchmark. The integrator/shared
  sim-core owner should optimise that hash path (or authorise an expanded lane to do so),
  preserving full-state sensitivity and in-place/mixed-state support. No hash cadence,
  requirement, check or existing timeout was loosened. Rerun the committed evidence benchmark
  on the integrator's quiet machine; the <15% target remains unmet here.
- **Game-owner tests:** add the reviewer's drafted harness suites at these exact paths;
  **each describe needs `{ timeout: 60_000 }`**. Copies of the supplied drafts are preserved
  under `uat/evidence/F-05-game-harness/review-drafts/`. Adapt JSON loading to
  `parseRecording` as appropriate; no platform-to-game dependency should be introduced.
  1. `games/rabakz/src/rules/harness.test.ts` — add `rabakz.harness.test.ts`: synthetic
     questions, scripted/bot whole matches at 1/8 players, teams, secret/audience checks and
     replay. Use normal selected-question context.
  2. `games/peek-poker/src/rules/harness.test.ts` — add `peek-poker.harness.test.ts`:
     scripted/bot three-round matches at 1/8 players, picks/lock/reveal, secrets and replay.
  3. `games/tabao-rush/src/harness.test.ts` — add `tabao-rush.harness.test.ts`:
     scripted/bot movement through ROUND_STEPS at 1/8 players, finite positions, co-op results
     and replay. Bots keep disabled held buttons off by default.
- Claude/integrator retains independent review, real-game suite integration and shared tracker
  updates. No commit, push, merge, deployment, dependency install or node_modules edit performed.

## Verification and evidence

- `review-performance.json`, generated by `review-benchmark.ts`, records all timing samples
  and recording size for the real Tabao fixture from the reviewer benchmark. It is evidence,
  not a flaky timing assertion. Sandbox sysctl access blocked the standard memcheck helper;
  `memory_pressure`/`vm_stat` were read directly (41% available of 16 GB before the run).
- `review-node-boundary.txt` contains the actual compile-fail output; the temporary source
  was removed. `scripts/node-boundary.test.ts` provides automated coverage.
- `review-tests.txt` and `review-verify.txt` hold final focused and full verification output.
- Existing game timing reports generated during verification are restored to HEAD bytes;
  they are outside this issue's lane.

Final `VITEST_MAX_WORKERS=2 pnpm verify` exited 0: **64 files passed, 2,077 tests passed,
one existing skip**. Workspace/typecheck/lint/design lint/build/budget/trace passed.
The reduced total versus the original build reflects removal of imported duplicate suites.
The focused harness/Node suite passed **30 tests across four files**. Item 1's timing target
is not an assertion in verification and remains open despite the green verification result.

## Close-out — review-fix round 2

Requirements: PLAT-030, NFR-TEST. Changes are left in the supplied worktree, uncommitted,
as requested. This section supersedes round 1's per-event hashing design and its request
to optimise sim-core hashing. No sim-core, dependencies, node_modules, lockfile, shared
trackers, check thresholds or time limits were changed.

- `record: false` records no events and computes no hashes, including at initialisation.
  `recording()` then throws. CLI play selects this mode unless `--record` is supplied.
- Recording defaults to `hashEvery: 60`, with initial, lifecycle and final checkpoints.
  Calling `recording()` midway adds its final checkpoint to the returned copy only.
  The v3 envelope stores checkpoint event/step positions explicitly; optional views and
  exact sampled inputs remain available. `--hash-every N` exposes cadence in the CLI.
- Replay without a reference reports the first mismatching checkpoint, inclusive step
  span and recomputed checkpoint public view. With a verified original-build reference,
  both builds rerun the failing span step by step to find the exact first differing event
  and its diff. Sparse hashes cannot catch a difference that disappears between checkpoints.
  `hashEvery: 1` preserves exact-step detection without the original implementation.
  README documents these limits, public/explicit sensitive diagnostics and v3 compatibility.
- Normal match steps borrow the input buffer's sampled Map; lower-seat joins/reconnects
  restore seat order explicitly. Connection metadata is rebuilt on lifecycle changes.
  Current layouts are still checked at each step, including audience changes.
- New `checkpoints.test.ts` covers zero hash calls in non-recording mode, default cadence,
  final checkpoints across continued play, lifecycle positions, malformed checkpoints,
  checkpoint versus exact diagnostics, in-place states and an incorrect reference build.
  Existing exact-hash-count and transient-divergence harness tests explicitly select
  `hashEvery: 1`; assertions and time limits are retained. No wall-clock assertion was added.

### Audit of the four game contract test files

Compared against pre-round-1 commit `1aceb7e`; see `game-test-audit.txt` in the evidence folder.

- `conformance-support.test.ts`: Dots/Picks value/type imports now point to the extracted
  `test-fixtures/*.fixture.ts` modules. Source discovery follows those moved fixture files
  instead of the former `fixtures/*.test.ts` paths. The incidental rewrite removing
  `dirname`/`HERE` and changing the `ALL` source-root expression has been reverted in round 2.
  All scenario/helper code after source discovery is byte-identical. No assertion,
  scenario or expected value changed; the remaining changes are references to moved fixtures.
- `conformance.test.ts`: only the `nullPrivateDots`/`redealDots` import path changed.
  Every other line is identical.
- `fixtures/dots.test.ts`: fixture types, constants, rules/module and the `nullPrivateDots`/
  `redealDots` variants moved to `test-fixtures/dots.fixture.ts`. Imports were adjusted for
  that move. The complete test `describe` block is byte-identical (ignoring trailing
  whitespace); no assertion, scenario or expected value changed.
- `fixtures/picks.test.ts`: fixture types, constants/data, rules/module and secret helpers
  moved to `test-fixtures/picks.fixture.ts`. Imports were adjusted for that move. The complete
  test `describe` block is byte-identical (ignoring trailing whitespace); no assertion,
  scenario or expected value changed.

### Requests

Claude/integrator retains independent review, game-owner suite integration from round 1,
and shared tracker updates. No commit, push, merge or deployment performed.

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
