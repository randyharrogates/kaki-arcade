# C-20 — Conformance correctness-test reliability

Requirement IDs: PLAT-030–033, PERF-023, PERF-024 (follows issue F-04).

Goal: keep whole-match correctness checks reliable on loaded machines without changing any performance budget or weakening conformance coverage.

Acceptance: every test invoking the kit directly or through its fixture helpers has an explicit shared per-test timeout; redundant work is reduced while retaining all checks; individual before/after timings and the requested validation results are recorded below.

Scope: platform game conformance kit/test support, its tests, and the six game test files named in the brief. No global timeout, gameplay, performance budgets, dependencies, trackers or contracts changed. The round-specific user brief overrides the normal workflow's verify/UAT/commit steps.

## Changes

- Added a bounded, per-kit phone-fit cache keyed by complete controls and private blocks, excluding only the top-level revisions. Full-value schema/revision/byte-cap validation still runs through the original cache before placement is considered. Fresh views, purity, secrets and revision checks remain on every step. Both successful and failed placement results are cached; null and empty private content remain distinct keys.
- Reused one object-graph traversal for each eligible step's state-size and structural-sharing checks. The minimum graph size, consecutive-copy threshold and failure remain unchanged.
- Exported `CONFORMANCE_TEST_TIMEOUT_MS = 552000` from the test-only `@kaki/platform/kit` entry and applied it explicitly to all 62 conformance test instances (61 declarations, including two `it.each` cases), including `assertConformance` and fixture-helper callers. The registry-only support test does not run a match and needs no timeout. Existing suite timeouts for unrelated tests remain untouched.
- The constant is four times the slowest loaded baseline (recipe matches: 137,981 ms at load 7.89), rounded up to the next second: `ceil(137981 × 4 / 1000) × 1000 = 552000`. Its comment identifies a correctness-test wall-clock limit for loaded machines, not a performance budget. No `docs/PERFORMANCE.md` threshold or global Vitest configuration changed.

Every original scenario, simulation step, replay pass, probe and attack assertion is retained. No hashes or equality checks were removed.

## Individual measurements

Each test ran alone, in its own invocation of `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false VITEST_MAX_WORKERS=1 pnpm exec vitest run <file> --reporter=verbose -t <regex-escaped exact test name>`. The parameterised cases were measured separately. Durations below are Vitest test-body wall times, excluding process startup. Loads are the one-minute average at each launch. Every launch waited for load below 8; each Vitest process had a 600-second external limit.

These are single before/after observations under changing machine load, not a controlled benchmark or a performance-budget claim. The baseline reproduced the reported default-timeout defect: “round 3 permits needless private revisions” failed at 5,694 ms, load 6.15. All other individual baselines passed.

### `packages/platform/src/game/conformance.test.ts`

| Test | Before ms | Load | After ms | Load |
|---|---:|---:|---:|---:|
| passes Dots (real time, returns-new, optional teams) | 2680 | 4.28 | 1238 | 5.62 |
| passes Picks (turn-phased, in-place, secrets, data and a saved best) | 2641 | 4.25 | 1303 | 5.62 |
| gives the same report twice (the kit itself is deterministic) | 1749 | 4.25 | 914 | 5.65 |
| assertConformance throws the whole report | 484 | 4.31 | 249 | 5.65 |
| refuses a scenario the game cannot play, and a run with no scenarios | 51 | 4.31 | 27 | 5.65 |
| round 3 passes always-null private view | 2051 | 4.73 | 780 | 5.65 |
| round 3 passes full round re-deal | 2018 | 4.75 | 836 | 5.65 |
| round 3 lets a lone waiting joiner finish auto-skips beyond the scenario length | 2885 | 4.31 | 1220 | 5.44 |

### `packages/platform/src/game/conformance-attacks.test.ts`

| Test | Before ms | Load | After ms | Load |
|---|---:|---:|---:|---:|
| requires both endpoint scenarios and whole matches at the minimum | 1923 | 4.37 | 684 | 5.44 |
| requires leave to tolerate zero players and empty teams without scoring | 2065 | 4.50 | 805 | 5.44 |
| rejects a missing, identity, or partially effective scramble | 1219 | 4.50 | 490 | 5.44 |
| catches a disguised leak on just one other phone and only on some steps | 241 | 4.54 | 77 | 5.24 |
| catches uneven co-op scores, premature results.save and invalid save data | 106 | 4.54 | 39 | 5.24 |
| catches a global revision counter, including dropped in-flight taps | 98 | 4.54 | 47 | 5.24 |
| catches scoring twice or answering while locked in a single step | 1020 | 4.54 | 581 | 5.24 |
| review attack: stepping after the match is over must still be safe | 283 | 4.49 | 143 | 5.24 |
| review attacks: Map mutation, input frames retained in a closure, and sorting a view in place | 1228 | 4.85 | 469 | 5.24 |
| round 2 catches late joins, last leaves, copies, results leaks and lock then pick | 3529 | 4.85 | 1026 | 5.24 |
| round 2 checks private revisions and delayed outcomes independently | 1496 | 5.90 | 515 | 5.22 |
| round 2 allows co-op late joiners sharing the existing score | 4772 | 5.91 | 1953 | 5.22 |
| round 2 allows text-only layout revisions when no tap could be in flight | 3086 | 6.08 | 1416 | 5.22 |
| round 3 permits needless private revisions | 5694 (timeout) | 6.15 | 1329 | 5.05 |
| round 2 repeat probes respect the original control audience | 2039 | 6.38 | 1311 | 5.05 |
| fails when cosmetic labels and revisions change every step and drop all delayed taps | 1172 | 6.27 | 930 | 4.80 |

### `packages/platform/src/game/conformance-broken.test.ts`

| Test | Before ms | Load | After ms | Load |
|---|---:|---:|---:|---:|
| a returns-new step that changes the state it was given | 32 | 6.27 | 19 | 4.80 |
| a returns-new step that writes into a typed array, which freezing cannot stop | 1005 | 6.27 | 628 | 4.80 |
| Math.random in a step: caught by the replay checks and by the source scan | 945 | 6.09 | 600 | 4.80 |
| a module-level counter: state that lives outside the state | 1183 | 6.09 | 596 | 4.80 |
| a secret in the public view | 143 | 6.88 | 66 | 5.22 |
| a secret in disguise (how many have picked): only scrambleSecrets can see it | 222 | 6.88 | 119 | 5.22 |
| a secret in another player's private view and in another player's layout | 254 | 6.88 | 113 | 5.22 |
| a sampled input frame stored in the state | 36 | 7.85 | 22 | 5.22 |
| an action object kept by an in-place game | 45 | 7.85 | 39 | 5.22 |
| a step that changes its inputs | 132 | 7.85 | 79 | 5.22 |
| a view that is not JSON | 51 | 7.85 | 33 | 5.28 |
| state whose behaviour depends on two fields being the same object | 1614 | 7.94 | 761 | 5.28 |
| state that does not survive a host reload | 1919 | 7.94 | 944 | 5.28 |
| a layout over the byte cap, over what a phone holds, or outside the schema | 63 | 7.75 | 38 | 5.28 |
| a layout whose taps change meaning without a new revision | 132 | 7.75 | 65 | 5.90 |
| a score that changes when someone else leaves | 1080 | 7.75 | 629 | 5.90 |
| a join that throws | 771 | 7.60 | 514 | 5.90 |
| a game that ignores its seed | 1057 | 7.60 | 640 | 5.90 |
| a pause that leaves a mark | 1092 | 7.60 | 750 | 5.90 |
| results that are not total or not in order | 2568 | 7.40 | 1418 | 5.75 |
| an asset first named during play | 1366 | 7.60 | 824 | 5.75 |
| a view that is not pure | 1374 | 7.60 | 727 | 5.69 |
| a step that throws on something the host can deliver | 73 | 7.64 | 60 | 5.69 |
| PLAT-008 rejects missing and non-boolean mid-game join declarations | 20 | 7.64 | 19 | 5.69 |
| picker details and settings that do not hold together | 16 | 7.64 | 12 | 5.69 |
| a game that cannot start with every player count it claims | 1095 | 7.64 | 825 | 5.69 |
| a game that keeps the generator it was handed in a frozen state and draws from it | 27 | 7.56 | 32 | 5.63 |
| an honest in-place copy of Dots also passes | 2556 | 7.56 | 2243 | 5.63 |
| coverage probes for sustained copies and private revision changes | 371 | 7.51 | 390 | 5.63 |

### `packages/platform/src/game/conformance-private.test.ts`

| Test | Before ms | Load | After ms | Load |
|---|---:|---:|---:|---:|
| CTRL-003 D-132 accepts a picker plus wrapped private note at 667 × 307 | 632 | 7.51 | 719 | 6.22 |
| CTRL-003 D-132 rejects impossible combinations through conformance | 34 | 7.51 | 37 | 6.22 |
| CTRL-002 control-only grids and eight cards retain the main phone contract | 1021 | 7.51 | 1568 | 6.22 |

### `games/peek-poker/src/rules/conformance.test.ts`

| Test | Before ms | Load | After ms | Load |
|---|---:|---:|---:|---:|
| PP-001 PP-005 PP-012 PP-013 conformance at minimum and maximum counts | 40810 | 7.31 | 59415 | 6.36 |

### `games/rabakz/src/rules/rules.test.ts`

| Test | Before ms | Load | After ms | Load |
|---|---:|---:|---:|---:|
| RZ-001 RZ-012 passes conformance at minimum and maximum in FFA and teams | 32618 | 7.47 | 29507 | 7.92 |

### `games/tabao-rush/src/conformance.test.ts`

| Test | Before ms | Load | After ms | Load |
|---|---:|---:|---:|---:|
| TR-002 TR-009 TR-023 TR-020 TR-021 TR-022 passes whole-match conformance at 1 and 8 players | 59243 | 6.14 | 43793 | 7.22 |

### `games/tabao-rush/src/rules/orders.test.ts`

| Test | Before ms | Load | After ms | Load |
|---|---:|---:|---:|---:|
| conformance retains all scenarios: ordered service AND expiry at 1 and 8 cooks | 58381 | 7.49 | 64495 | 5.99 |

### `games/tabao-rush/src/rules/recipes.test.ts`

| Test | Before ms | Load | After ms | Load |
|---|---:|---:|---:|---:|
| passes the unchanged conformance kit at 1 and 8 cooks with cooking and serving inputs | 137981 | 7.89 | 128288 | 7.92 |

### `games/tabao-rush/src/rules/stations.test.ts`

| Test | Before ms | Load | After ms | Load |
|---|---:|---:|---:|---:|
| TR-007 TR-008 TR-010 TR-030 station work passes unmodified conformance kit at 1 and 8 players | 38290 | 7.94 | 71544 | 7.96 |

## Requested validation

All pnpm invocations used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`. Each launch waited for one-minute load below 8 and had a 600-second external process limit. No verify, UAT, performance harness, install or commit was run.

| Command | Launch load | Wall seconds | Result |
|---|---:|---:|---|
| `pnpm exec vitest run packages/platform games` (`VITEST_MAX_WORKERS=2`) | 5.78 | 430.02 | PASS |
| `pnpm exec tsc -b tsconfig.build.json --clean` | 7.89 | 0.69 | PASS |
| `pnpm exec tsc -b tsconfig.build.json` | 7.89 | 18.02 | PASS |
| `pnpm exec tsc -b tsconfig.build.json --clean` | 7.98 | 0.43 | PASS |
| `pnpm exec eslint packages/platform games --max-warnings 0` | 7.98 | 17.12 | PASS |

## Close-out

Implementation and the requested validation are complete. All 62 individual post-change runs passed. The two-worker suite passed 103 files: 1,861 tests passed and one existing opt-in benchmark test was skipped (`benchmark.test.ts`, gated by `KAKI_BENCHMARK=1`); no conformance or attack test was skipped. Its complete broken-game coverage assertion passed. The clean TypeScript build and ESLint passed; the post-build clean removed emitted files. `git diff --check` passed. No command reached the 10-minute process limit. Only the authorised files changed, and nothing was committed.

Awaiting Claude's independent review and integration. Individual raw console logs and machine-readable measurements are in `/tmp/c20-before*.log`, `/tmp/c20-after*.log`, `/tmp/c20-{before,after}.json`; validation logs are in `/tmp/c20-check-*.log`. This note preserves the complete durations and launch loads within the authorised repository paths. No evidence files were written outside the scope allowed by this round's brief.

## Requests

Claude to perform independent review and integration. No commit was made, as requested.


## Round 2 — individual limits and repeated traversal work

Requirements remain PLAT-030–033 (PERF-023/024 for the pipeline test; F-04 is the earlier issue); the authorised scope additionally includes `tools/assets/pipeline.test.ts`. Round 1 above is a historical record; the changes below supersede its shared 552-second limit.

### Limits

`packages/platform/src/game/kit.ts:30` exports `conformanceTimeout(measuredLoadedMs)`: `max(15_000, ceil(4 × measuredLoadedMs / 1000) × 1000)`. Each of the 62 conformance instances now supplies its own measured duration, visible beside its declaration (the two formerly parameterised cases carry separate durations). The input is the larger of that test's round-1 before/after measurements above, so a slower observation is not discarded. Most tests receive the 15-second floor; larger tests retain measured headroom. The one-line correctness wall-clock / loaded-machine / non-performance-budget comment remains. No global configuration or performance threshold changed.

For the asset packing Python suite, both `spawnSync` and its enclosing test use the same 156,000 ms limit, calculated from the reported 39,000 ms observation at load 10.9. A fresh measurement this round was lower: 80 Python tests in 29.842 s (30.02 s process wall time), launch load 4.08. Using the larger observation gives headroom for the reported load failure. The status assertion now reports whether the child was killed, its status, signal, configured timeout, spawn error (including ETIMEDOUT), and stderr. Other Python child suites retain their existing limits.

### Why main passed long tests but timed out the attack

The long tests were **not using the default five-second timeout**. Before round 1 (`de38b1ba^`), `games/rabakz/src/rules/rules.test.ts:360` explicitly passed `120000` as the conformance test's last argument; `games/tabao-rush/src/rules/recipes.test.ts:303` set `{ timeout: 240000 }` on its enclosing `describe`, inherited by the recipe test. The attack declaration had neither a test override nor an enclosing suite override, so its 6.7-second run exceeded the default 5,000 ms. Round 1 replaced these conformance limits with the shared constant; round 2 sizes them separately.

`vitest.config.ts:4–10` defines one root run, with no `testTimeout`, projects, or per-project timeout settings. All three test bodies are synchronous. That does **not** exempt them from timeouts in the installed Vitest 4.1.12: `node_modules/.pnpm/@vitest+runner@4.1.12/node_modules/@vitest/runner/dist/chunk-artifact.js:1734` selects the test/suite option or the configured default. Its `withTimeout` at lines 2261–2312 installs a timer, then checks elapsed wall time again in `resolve` (2291) after either a synchronous return (2311) or promise resolution (2309). A synchronous body blocks the timer while running, but is still failed after returning if it ran too long. The larger existing overrides, rather than synchronous execution, explain the passes. An infinite synchronous loop still requires an external process deadline; each command here has a 600-second deadline.

### Recipes work retained and reduced

Inspected the recipe fixture, per-step checks, recorder, hashes, JSON snapshot/reload and all reruns. The fixture still supplies both 1- and 8-cook cooking/service scenarios, each with `ROUND_STEPS + 1` steps. `runConformance` still plays each ordinary scenario, replays it, plays the membership-changing variant, and replays that; all clone steps, view/purity checks, hashes, recorded inputs, snapshots, reloads, delayed/repeated-tap probes and attack checks remain. Caching state hashes across game callbacks would hide mutations (including typed-array writes that freezing cannot stop), and shortening matches or removing reruns would remove existing coverage, so neither was done.

A safe repeated allocation was removed from `packages/platform/src/game/conformance.ts:540`: the borrowed-input graph walk used to build a complete diagnostic path at every recursive visit, including all primitive fields of the large static level on every step. It now constructs paths only while unwinding a found violation, and uses `Object.keys` plus indexed values instead of allocating an entry pair for every property. It visits the same objects in the same order, retains the borrowed-object/typed-array/cycle rules, and reports the same paths. No cache or sampling was introduced.


Fresh individual comparison (`VITEST_MAX_WORKERS=1`, same exact-name filter and verbose reporter):

| Recipes conformance | Launch load | Test body ms | Process wall s | Result |
|---|---:|---:|---:|---|
| Round-2 baseline, before traversal change | 4.08 | 67,832 | 68.55 | PASS |
| After traversal change | 7.60 | 60,767 | 61.37 | PASS |

This is 7,065 ms (10.4%) lower in these observations. The round-1 137,981 / 128,288 ms loaded observations remain above for context; neither their difference from this baseline nor this single before/after pair establishes a controlled speedup. Loads and concurrent machine work differ. No recipe test fixture, scenario, match length or game implementation changed.


### Round-2 requested validation

Every pnpm invocation used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`. Launches waited for one-minute load below 8; actual commands had a 600-second external deadline. The two isolated recipes runs used `VITEST_MAX_WORKERS=1` and a verbose exact-name filter. The full requested run used `VITEST_MAX_WORKERS=2`.

| Command | Launch load | Wall seconds | Result |
|---|---:|---:|---|
| `pnpm exec vitest run packages/platform games tools/assets` (two workers) | 4.42 | 335.85 | PASS |
| `pnpm exec tsc -b tsconfig.build.json --clean` (before) | 7.75 | 0.30 | PASS |
| `pnpm exec tsc -b tsconfig.build.json` | 7.75 | 20.98 | PASS |
| `pnpm exec tsc -b tsconfig.build.json --clean` (after) | 7.79 | 0.38 | PASS |
| `pnpm exec eslint packages/platform games tools/assets --max-warnings 0` | 7.79 | 29.91 | PASS |

The full suite passed 105 files: 1,867 tests passed, with one existing opt-in benchmark skipped; no conformance or attack case was skipped in that full run. This includes the complete broken-game coverage assertion and Python asset pipeline. The isolated recipe measurements intentionally selected only the conformance test; their other 28 tests were filtered out, then included in the full run. TypeScript and ESLint passed; the second clean removed build emissions. `git diff --check` passed. No command reached ten minutes. No verify, UAT, perf, install, merge or commit was run.

Raw logs are `/tmp/c20-r2-{recipes-before,recipes-after,python-baseline,vitest,tsc-clean-before,tsc,tsc-clean-after,eslint}.log`; exact launch loads, wall times and statuses are in `/tmp/c20-r2-results.jsonl`. This note preserves the results within the authorised repo scope.

### Round-2 Close-out and Requests

All four requested changes/investigations and the specified checks are complete. Changes remain uncommitted on the provided issue branch for Claude's independent review and integration. No additional scope or dependencies requested.

## Integrator close-out (2026-11-19)

Review 1 was clean. At merge the integrator: dropped the platform import from `tools/assets/pipeline.test.ts` (156 s written directly, 4 × 39 s), gave that test a 13 s margin over its child's limit so a killed child is reported as killed, gave the other three Python children the same failure message, and reworded the recipes comment (the conformance test carries its own limit; the describe's 240 s covers the rest). Timing words: 6.7 s was the attack test inside a loaded `pnpm verify`; 5,694 ms is the same test run alone. The fixture-game conformance tests got about twice as fast; the whole-match game tests did not get measurably cheaper and pass because their limits are larger (D-259). Verify passed every test stage on this branch (243 files, 4,047 tests); its build stage failed only on a missing `assets/dist` in the worktree, and passed once main's packed assets were copied in.
