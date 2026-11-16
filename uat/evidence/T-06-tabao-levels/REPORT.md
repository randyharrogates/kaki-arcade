# T-06 evidence

Pure data and simulation only; no screenshots apply. See verify.txt for complete automated output and targeted.txt for the fast rule checks. The slice note records all provisional choices and limitations.

Checks: malformed inputs, each validation family, JSON loader round-trip, unique equipment,
initial cook kitchen assignment, two-kitchen scaling, full-round conformance and determinism
at one and eight cooks for each shipped level. Step measurement compares the existing fixture
with the loaded all-dish kitchen after a 600-step warm-up over a complete 210-second round.

| Validator rule | Evidence |
|---|---|
| Object shape, id/name, positive safe grid, exact collision map | Table-driven malformed definitions |
| Fixed projected footprint inside DESIGN safe area | Oversized map rejected; both shipped layouts accepted |
| One/two unique kitchens; known, distinct dishes | Bad kitchen/dish definitions rejected |
| Station ids/tiles distinct; floor anchors; known kitchen and facing | Duplicate/blocked/malformed station cases |
| Crates have known ingredients and no station type | Unknown ingredient and dual-kind crate cases |
| Eight distinct, walkable spawn tiles with kitchen/facing | Missing, duplicate and blocked spawn cases |
| All floor connects to all spawns; each anchor has reachable access | Split floor and unreachable-anchor cases |
| Recipe equipment, ingredient crates, typed container racks | Required station/crate/rack removal cases |
| Exactly one reachable return per kitchen and sink for dirty containers | Return/sink removal; two-kitchen loader test |
| Rack stock 0–4 plates or 0–2 bowls/cups; only racks declare stock | Missing kind, excessive and misplaced stock cases |
| Plate supply and chopping capacity cover eight-cook three-star arithmetic | Raised target and short-round cases |
| Positive increasing star thresholds; 60–600 s round | Bad threshold and non-finite length cases |
| Fires only from level five; one reachable extinguisher within 15 walking edges | Early fire, missing extinguisher and long route cases |
| Explicit fire graph links burnable stations only | Safe-station fire edge rejected; runtime also filters inferred edges |
| Twist discriminants and station/kitchen/tile references | All eight hook shapes and broken references checked |
| Catalogue level ids unique | Duplicate catalogue entry rejected |

First full verification passed (115 files, 2,789 tests, one pre-existing skipped test), including
both full-round conformance runs. The initial separate conformance attempt failed only its
purity source-path configuration: scanning two roots independently made cross-folder imports
look external. Scanning the common src root corrected the test setup; no purity rule changed.
The final verification includes the last metadata and invalid-crew assertions.

Timing is pure simulation CPU time in this environment, not browser frame time or TV UAT.
The step algorithm has no validation/compilation work added. The comparison includes different
station counts and cannot establish identical CPU cost; it measures whether the added level
machinery has material cost. No existing performance limit was changed.

Final result: `VITEST_MAX_WORKERS=2 pnpm verify` exited 0. All 115 test files passed;
2,791 tests passed and one pre-existing test was skipped. Build, design lint, typecheck, ESLint,
workspace and trace checks passed. The two shipped levels each completed 12,600 steps at one
and eight cooks, with deterministic replay and membership replay. All 49 T-06 cases pass in
that run; targeted.txt separately reruns the 47 non-conformance cases after defensive JSON
guards were tightened, and lint-final.txt records the final lint pass. The final build also
reruns typecheck. The screen footprint remains a provisional geometry check, not visual UAT.

Eight-cook idle step measurements from final verify (600 warm-up steps, 12,000 measured):

| Initialisation | Mean ms | p95 ms | Worst ms |
|---|---:|---:|---:|
| Existing legacy fixture | 0.0067 | 0.0073 | 0.571 |
| Loaded all-dish kitchen | 0.0078 | 0.0083 | 0.565 |

The 0.0010 ms p95 difference includes a larger station index; the simulation step algorithm
has no added loader/validator work. These are diagnostics, not browser frame-budget evidence.
No existing limit was changed.

Final verify tail:

```text
Test Files  115 passed (115)
Tests  2791 passed | 1 skipped (2792)
$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
no bundles yet
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 74 in progress, 1 later, 77 not started
trace check passed
```
