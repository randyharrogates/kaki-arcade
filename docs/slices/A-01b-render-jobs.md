# A-01b with A-01d — render jobs

Supports NN-4, PERF-023 and PERF-024. Round 2 addresses the independent review;
review is still pending. Scope: orchestration, freshness and encoding validation.

## What changed and why

- Blender runs in its own session with a positive integer `timeoutSeconds`
  (default 300). Any `BaseException` from waiting, including KeyboardInterrupt
  and timeout, kills the process group with SIGKILL, waits and re-raises.
- Required unique job ids identify split jobs independently of scripts. Existing
  ids are `cook-spike` and `cards`; `--only` takes an id and unknown ids list the
  valid choices. Duplicate ids and colliding stamp paths are rejected.
- Stamps are `.<id>.render-stamp.json` beside the first declared output. Renamed
  the two committed stamps and recomputed their digests using the pipeline's
  test-safe `render_job` helper, after checking every declared output exists.
  No Blender was launched and outputs are unchanged. Cook now declares
  `tools/blender/kalib.py`, which it imports; its only intervening kalib change
  was the addition of `srgb_hexc`, so no cook rerender was needed.
- Freshness hashes the script, every input and extra input (relative path and
  bytes), and arguments with length-framed SHA-256 records. A failed rerender
  removes the old stamp before launch. A successful render hashes inputs again
  because cook publishes anchor metadata to pipeline.json.
- Regression tests start from a successful render and then fail or time out a
  changed-input rerender, asserting the old stamp is gone. They also check
  freshness after a stub render appends to its own input, identical-byte input
  renaming, KeyboardInterrupt cleanup/propagation, required/duplicate ids,
  collision rejection, split-script stamp separation and CLI validation.
- `--check-stale` exits non-zero if any selected job is stale and reports all
  selected jobs. `--render --check-stale` is refused by argument parsing.
- The earlier A-01d guard remains: lossy pages must contain only one frame;
  multi-frame pages use lossless encoding.
- ART-PIPELINE.md describes the new ids, stamps, gating and split-job advice.
  Evidence is saved as `.txt`, since `*.log` files are ignored.

Known cost: a job declaring the whole `pipeline.json` becomes stale whenever
any art issue edits that file. All declared input bytes remain significant.
For A-02, measure representative frame time including masks, setup/publication
and a machine-load margin; set a measured limit or split jobs with unique ids
and separate outputs. The 300-second default is not a whole-body render budget.

## Commands and results

Before each test/typecheck command, `uptime` showed 1-minute load below 8
(observed 2.42–5.09). Only the requested checks were run:

| Command | Result | Evidence in `uat/evidence/A-01b-render-jobs/` |
|---|---|---|
| `python3 -m py_compile tools/assets/pipeline.py` | PASS, exit 0 | `py-compile.txt` |
| `python3 -m unittest discover -s tools/assets -p "test_*.py"` | PASS, 22 tests | `python-unittest.txt` |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | PASS, 1 file / 3 tests | `vitest.txt` |
| `pnpm exec tsc -b tsconfig.build.json` | PASS, exit 0 | `tsc.txt` |
| `pnpm run lint:design` | PASS, 377 files | `design-lint.txt` |
| `python3 tools/assets/pipeline.py --check-stale` | PASS, both jobs fresh | `check-stale.txt` |

The first Python run identified older fixtures lacking the newly required ids;
those fixtures were updated and the final runs pass. Vitest's wrapper invokes
Python asset and card-validation tests. All Blender and memcheck operations in
orchestration tests are stubbed. No real render, memcheck, UAT, browser,
whole-suite check, install, commit or merge was run.

## Close-out

NN-4 / PERF-023 / PERF-024: implementation in `tools/assets/pipeline.py`, job
configuration and renamed stamps in `assets/src/`, orchestration tests in
`tools/assets/test_pipeline.py` and `test_render_jobs.py`, with the focused
Vitest wrapper updated to expect 22 Python tests. Evidence is linked above.
Requested checks pass; independent review and real process/visual acceptance
remain with the integrator. This is orchestration evidence, not completed art UAT.

## Requests / integrator checks

- Review independently and verify real interruption/timeout process cleanup
  outside this sandbox, then inspect a selected job and its fresh report.
- Confirm A-02's measured limit or splitting before rendering it.
- Update shared trackers and perform integration/UAT under the lead's workflow.

## Integrator check, round 2 (2026-11-18)

- Merged main (A-04): `pipeline.json` now has three jobs with ids `cook-spike`, `cards` and `items`;
  A-04's `tools/blender/` input-path rule moved into `render_job`; A-04's render-contract test stubs
  `run_blender`; A-04's item-folder test allows `.items.render-stamp.json`.
- Stamps: `items` stamped from current inputs (round 12 of A-04 changed outline-flag metadata only;
  its review found no pixel change); `cook-spike` re-stamped because the merge changed
  `pipeline.json`, which it declares (the known cost). `--check-stale`: all three fresh, exit 0.
- Real timeout: with `timeoutSeconds: 5` on `cards` and its stamp removed, `--render --only cards`
  exited 1 after 5 s with "cards.py: render timed out after 5 seconds; process group killed"; no
  Blender process remained and no stamp was written. The test edit and frames were restored.
  Log: `uat/evidence/A-01b-render-jobs/integrator-timeout.txt`.
- Tests: Python 32 OK; Vitest tools/assets and tools/items.test.ts 9 passed.
