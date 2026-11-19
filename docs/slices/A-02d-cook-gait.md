# A-02d round 3 — Cook gait readability (TR-060)

Round 1 is committed at e8f8f159; main was merged at 48f2a3d8.
The integrator subsequently re-rendered only cook-body-walk and
cook-body-carry-walk using cook_walk.py with cook_gait.py. All other jobs are
byte-identical. Round 3 updates records and review artifacts without Blender,
re-rendering, UAT, verify, installs or commits.

The walk-only renderer isolates gait changes from the original cook.py and
cook_poses.py. Non-walk pose samples are now pinned in
`tools/blender/fixtures/cook_non_walk_poses.json`, generated from the current
cook_poses.py at eighth-frame intervals. The test pins cook.py with SHA-256;
no test invokes git or depends on the moving main ref.

## Pre-render geometry

Run `python3 tools/assets/cook_gait_geometry.py` to reproduce
`uat/evidence/A-02d-cook-gait/round-2-geometry.json`. Values are maximum pairwise
projected hand-origin distances over the eight samples, using the existing pure
rig geometry and 120 px/tile orthographic projection, before rasterisation.

| Facing | Walk L / R px | Carry-walk L / R px |
|---|---:|---:|
| s | 13.35 / 10.76 | 11.87 / 11.87 |
| se | 15.24 / 9.97 | 12.14 / 12.07 |
| e | 17.58 / 9.51 | 12.58 / 12.37 |
| ne | 17.59 / 10.19 | 13.04 / 13.04 |
| n | 16.95 / 11.24 | 12.90 / 12.90 |
| nw | 17.59 / 11.31 | 13.04 / 13.04 |
| w | 17.58 / 11.28 | 12.37 / 12.58 |
| sw | 15.24 / 11.29 | 12.07 / 12.14 |

Head sideways travel is 15.25 px s/n, 12.00 px diagonally, 8.75 px e/w.
Feet measure 20.2–21.6 px in the fresh rendered gate. All rendered walk
thresholds now pass; see the close-out below. No gate thresholds changed.

## Close-out and Requests

The fresh rendered walk gate passes: feet 20.2–21.6 px (≥15), hands
9.5–17.6 px (≥8), head sideways 8.8 px east/west and 12.0–15.2 px elsewhere
(≥8). Opposite-phase changes are ≥5,322 px against a required 1.5× idle of
at most 4,752; largest head-anchor step is 5.56 px (≤6).

The built torso circuit is ±0.05 tiles sideways and fore-and-aft once per
stride, spine pitch/yaw ±0.04 rad with no roll, and bob 0–0.03 tiles once per
stride (lowest frame 0, highest frame 4). Smoothstep keys have no overshoot.
Walk arm swing drops from ±0.18 to ±0.06 rad; carried hands ride the torso.

Cook-body atlases add 62,440 B transferred (1,805,164 B total) and 1,838,304 B
decoded (50,818,800 B total). Page 2 grows from 1560×1954 to 2046×1954.
Tabao Rush totals 2,491,936 / 8,000,000 B transferred and
57,289,584 / 256,000,000 B decoded: PERF-023/024 pass.

Comparison sheets have been regenerated from committed renders with the original
baseline 36b26c07561d991e3bba671edf7380d7b481b187, and the eight board PNGs
updated. Board copy states the actual gait, cost and separately rendered west
views. Missing landmarks explicitly fail the gate and have a regression test.

- Asset unit tests: PASS, 112 tests, one skip.
- Blender-free unit tests: PASS, 43 tests.
- Targeted Vitest (`tools/assets/pipeline.test.ts`, two workers, 600 s limit):
  PASS, six tests, 105.87 s.
- `pipeline.py --check-stale`: PASS, exit 0.
- `git diff --check`: PASS.
- Heads review: PASS, exit 0; socket/difference validation and production
  packing passed PERF-023/024 (10 atlases).

Round-3 command logs are not committed (`*.log` is ignored); the results are recorded above. After the merge with main (c9aebd1d) a fresh pack gives the Tabao Rush round 2,491,936 / 8,000,000 B sent and 57,289,584 / 256,000,000 B decoded; the asset tests and the stale check pass on the merged tree.

Heads review output is under `uat/evidence/A-02d-cook-gait/heads-review/`.
See [REPORT.md](../../uat/evidence/A-02d-cook-gait/REPORT.md) for output patterns
and complete evidence. Integrator: inspect cap 4× strips and play-grey 3 m
images, then present the board to Randy. No further rendering is requested.
