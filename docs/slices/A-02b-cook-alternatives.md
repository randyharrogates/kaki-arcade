# A-02b cook alternatives — TR-060 / NN-4 / D-167

## Close-out: round 6 code ready; integrator chop render required

D-172 adopted the side raise as the default and retired the alternative jobs.
Round 6 restores shoulder contact and adds body-only island validation. The
committed chop PNGs still fail that validation; see round 6 below. Earlier rounds
are historical evidence, superseded by rounds 5–6.

## Chop: seven-direction centre clearance; SE exception

A further bounded search tried lower lateral reaches, arm rotations and torso
lean/turn combinations. A local search for all-eight clearance still left
intersections; this is not a mathematical proof of impossibility. The retained
candidate moves the knife wrist outwards and upwards to the cook's right, then
returns to the lower side position, with the original arm length, zero shoulder
translation and planted feet. Torso rotation channels stay below 25 degrees.
The clip remains six frames at 10 fps, with smooth interpolation and no overshoot.
The minimum projected knife-wrist travel over the six authored frames is
**14.2891 px**, exceeding the 13 px anchor threshold in every direction.

The test asserts wrist-centre clearance against the torso and both cap bounds
in **S, E, NE, N, NW, W and SW**, at every eighth frame including loop closure.
The smallest positive separation is approximately **0.5136 px** (NW torso,
frame 0.25). This is centre clearance, not whole-hand clearance or a rendered
visibility claim.

**SE remains an explicit exception:** the deepest wrist-centre penetration into
the conservative cap shell is **10.55595354 px**, at frame 0 (also the lower
hold and loop closure). The spherical hand's diameter is **24.35357787 px**, so
this penetration is **43.3446% of its diameter**. Including the hand radius gives
a conservative hand-edge penetration of **22.73274248 px**, **93.3446% of the
diameter**. These are linear support-envelope measurements, not occluded pixel
area. The test caps centre penetration at **10.555954 px** for every SE sample
and every silhouette; the allowance is not applied to the other seven views.
Measurements are saved in `uat/evidence/A-02b-cook-alternatives/round2-clearance.json`.
Randy must see this limitation beside the default render.

Bounds use the rotating torso ellipsoid with radii
`(.30,.26,.30) * TOY_SCALE + .015` tiles. The cap has an upright radius-.47 dome
clipped at 0.18 tiles above the moving head centre, plus a brim ellipsoid with
radii `(.252,.203,.024)` centred `(0,-.349,.203)` relative to that centre.
Exact support functions are sampled at 360 separating-line angles per view.
The test now transforms torso axes and follows the head centre, accounting for
the alternative's torso movement. It checks centres as in round 1; it does not
establish clearance from every apron detail or full-hand silhouettes.

## Extinguisher

The round-1 alternative is unchanged: right wrist at the hose root/handle,
left palm at the canister body, fixed shoulders and a ±20-degree torso sweep.
At every eighth frame including closure, the left wrist remains within .080 tiles
of the canister centre and the right within .105 tiles. These are centre-distance
bounds, not rendered grip/contact findings.

No alternative has been rendered or visually inspected. Actual prop/hand hiding
by direction therefore remains unverified. The round-1 conservative torso-disc
estimate contains the sampled canister in S and SE throughout, E in frames 0/1/3,
and SW in frames 1/2/3. Overlap alone does not establish occlusion or depth order.
N, NE and NW have sampled surface points outside that disc; review real composites.

## Requests / integrator commands

Render one job at a time, then inspect all eight composited directions beside the
defaults, explicitly showing the SE chop limitation to Randy:

```sh
python3 tools/assets/pipeline.py --render --only cook-body-chop-alt --no-pack
python3 tools/assets/pipeline.py --render --only cook-body-extinguish-alt --no-pack
python3 tools/assets/cook_strips.py --variant chop-alt --out uat/evidence/A-02b-cook-alternatives/chop --check-motion
python3 tools/assets/cook_strips.py --variant extinguish-alt --out uat/evidence/A-02b-cook-alternatives/extinguish --check-motion
```

Outputs go to `assets/src/tabao-rush/cook-body-alt/chop` and `.../extinguish`.
The round-4 composited thresholds remain ≥13 px anchor travel and ≥400 changed
pixels with the strict >24/255 channel difference. Only analytic wrist travel
was established here; composited pixel motion, prop orientation, canvas bounds
and visual quality await the integrator's render. No Blender, render, UAT,
whole-suite verification, dependency installation, commit or merge was performed.

## Round-2 verification

One-minute load was below 8 before every test/lint invocation. Final command
loads in table order: 7.72, 6.69, 5.47, 5.19, 5.19 and 5.34.

| Command | Result |
| --- | --- |
| `python3 -m unittest tools/blender/test_cook_poses.py` | PASS: 14 tests |
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | PASS: 53 tests |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | PASS: 2 files, 5 tests |
| `pnpm exec eslint tools --max-warnings 0` | PASS: exit 0 |
| `pnpm run lint:design` | PASS: 400 files |
| `python3 tools/assets/pipeline.py --check-stale` | All 12 existing jobs fresh; only the two unrendered alternative jobs stale (missing outputs). Exit 1 reflects those permitted alternative exceptions. |

Logs: `round2-asset-tests.txt`, `round2-vitest.txt` and `round2-freshness.txt`
under `uat/evidence/A-02b-cook-alternatives/`. The first asset-suite run exposed
two temporary-root CLI fixture errors in runtime alternative loading; fixed by
scoping the extension to the actual repository config path, then both Python and
Vitest asset suites passed.

## Round 3 — head-anchor movement (TR-060; D-167)

Reduced the raised chop pose's torso excursion from the lower pose by 15%,
retaining the round-2 arm arc, planted feet and six-frame timing. The pure camera
prediction now gives a maximum consecutive head-socket jump of **5.36240165 px**
across all eight directions, including loop closure; extinguish-alt gives **0 px**.
Both are bounded by the new **5.5 px** test, below cook.py's 6 px validation limit.
The test documents the matching orthographic camera projection and guards the
rigid-transform assumptions. Restoring the exact round-2 raised spine key makes
that same assertion fail: **6.34396583 px**, matching the integrator's Blender
failure to seven decimal places. This negative regression runs inside the test.
The asset Vitest wrapper's expected Python test count is updated from 14 to 15.

The existing eighth-frame silhouette assertions still pass: seven directions
clear, minimum centre separation **0.57180188 px**; SE centre penetration remains
**10.55595354 px**, no worse than round 2. Minimum wrist travel is **13.96821918 px**
across directions, above 13 px. These remain analytic centre/support measurements,
not rendered visibility or pixel-motion findings. Measurements are saved in
`uat/evidence/A-02b-cook-alternatives/round3-motion.json`.

### Round-3 checks

One-minute `uptime` load was below 8 immediately before every invocation, including
retries. Final loads in table order: 4.75, 4.53, 3.73, 3.47, 3.43, 3.43.

| Command | Result |
| --- | --- |
| `python3 -m unittest tools/blender/test_cook_poses.py` | PASS: 15 tests |
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | PASS: 53 tests |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | PASS: 2 files, 5 tests |
| `pnpm exec eslint tools --max-warnings 0` | PASS: exit 0 |
| `pnpm run lint:design` | PASS: 400 files |
| `python3 tools/assets/pipeline.py --check-stale` | All 12 existing jobs fresh; exit 1 for alternative jobs: chop missing `chop-s-0.png`, extinguish content stamp differs |

Initial checks caught an overly precise comparison to Blender floating-point
output (5.1e-9 px difference) and the asset wrapper's old test count; both corrected
and the affected checks passed on rerun. The 5.5 px limit was unchanged.

### Close-out and Requests

Round-3 code is ready for integrator review. Freshness cannot exit 0 for the
alternative jobs without regenerating their outputs/stamps; rendering and hand
editing assets are prohibited for this round. Existing jobs remain fresh. No
Blender, render, memcheck, broad verification, UAT, install, commit or merge ran.
The integrator should render the alternatives and inspect all eight directions
using the commands above, retaining the explicit SE limitation beside the default.

## Round 4 — arm-driven chop and published-anchor regression (TR-060; D-167)

The torso now holds the exact lower-pose transform throughout the chop; the head
socket and supporting hand are stationary. The knife arm rotates through a larger
outward/up reach and returns fully to the original lower pose at frame 3. Six
frames, 10 fps, interpolation and planted feet are unchanged. The current toy rig
has one rigid arm bone, not separate elbow/wrist joints: its shoulder, limb mesh
and wrist move together. To supply the reach independently of the torso, the
raised shoulder translates `(.189493, .019855, .103033)` tiles in the spine frame,
a maximum excursion of **0.21660475 tiles**, bounded by **0.22** in the test.
This intentionally replaces round 2's zero knife-shoulder translation invariant;
arm length/scale stay unchanged. The render must establish whether this shoulder
excursion still looks attached and natural. No rendered visibility claim is made.

The old predictor measured only the knife wrist. `cook.py::frame_record` actually
publishes `hands` as the midpoint of both wrists, explaining the integrator's
6.1–7.4 px values exactly. The new pure test uses `projected_anchors` with the
same 120 px/tile orthographic camera as the head test. It asserts both the
published midpoint and knife wrist travel at least **15 px** in every direction.
It restores the exact round-3 keys as a negative control, proves the assertion
fails, and additionally proves the published anchor is below 13 px in all eight
views. Extinguish-alt remains unchanged and is checked against the actual
`cook_strips.MOTION_THRESHOLDS` gate: **13 px nozzle travel** (`motion_report`
selects nozzle for extinguish, rather than the two-hand midpoint). Composited
changed-pixel counts still require renders; the ≥400 threshold is unchanged.

All values below are predicted pixels. Head is the maximum consecutive step,
including closure; hand/nozzle travel is the diameter over rendered frame samples.
Both alternatives have zero head movement in every direction.

| Direction | Chop head | Chop published hands | Chop knife wrist | Round-3 published hands | Extinguish nozzle |
| --- | ---: | ---: | ---: | ---: | ---: |
| S | 0 | 18.61322 | 37.22644 | 7.03939 | 24.12362 |
| SE | 0 | 23.51017 | 47.02034 | 7.44773 | 21.80071 |
| E | 0 | 25.66712 | 51.33424 | 6.95005 | 22.31985 |
| NE | 0 | 25.27561 | 50.55122 | 6.08014 | 24.59377 |
| N | 0 | 25.45839 | 50.91679 | 6.40163 | 24.12362 |
| NW | 0 | 25.39424 | 50.78848 | 7.29909 | 21.80071 |
| W | 0 | 22.07777 | 44.15554 | 7.33317 | 22.31985 |
| SW | 0 | 17.44589 | 34.89177 | 6.84829 | 24.59377 |

The existing exact-support tests retain the seven-direction torso/cap centre
clearance assertions at every eighth frame through closure. Minimum separation
is **0.57180188 px** (NW). SE's maximum centre penetration remains
**10.55595354 px**, within the unchanged **10.555954 px** bound from round 2.
These remain centre-envelope measurements, not whole-hand clearance or occlusion
area. Full predictions, including extinguish wrist/midpoint values, are in
`uat/evidence/A-02b-cook-alternatives/round4-motion.json`.

### Round-4 checks

Only the requested validation commands ran. One-minute `uptime` load was below 8
immediately before every invocation, including retries. Final loads are below;
logs are `round4-<name>.txt` in `uat/evidence/A-02b-cook-alternatives/`.

| Command | Load | Result / log name |
| --- | ---: | --- |
| `python3 -m unittest tools/blender/test_cook_poses.py` | 6.83 | PASS: 16 tests (`poses`) |
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | 7.46 | PASS: 53 tests (`asset-tests`) |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | 7.05 | PASS: 2 files, 5 tests (`vitest`) |
| `pnpm exec eslint tools --max-warnings 0` | 6.56 | PASS: exit 0 (`eslint`) |
| `pnpm run lint:design` | 6.24 | PASS: 400 files (`design-lint`) |
| `python3 tools/assets/pipeline.py --check-stale` | 5.66 | All 12 existing default jobs fresh. Exit 1: both alternative stamps differ (`freshness`). |

The Vitest wrapper now expects 16 choreography tests. The first new-test runs
also asserted extinguish's unused midpoint against 13 px; corrected to the actual
nozzle gate after checking `motion_report`, and the temporary sweep change was
reverted. Extinguish choreography has no final change.

### Close-out and Requests

Round-4 source and pure predictions are ready for integrator review. Default
`cook.py`, `cook_poses.py`, `kalib.py`, source assets, generated assets and stamps
are untouched; all 12 existing default jobs remain fresh. The freshness command
cannot exit 0 while the alternatives have outdated stamps without rendering or
hand-editing assets, both explicitly prohibited here. Its exit 1 is reported,
not suppressed or converted into a pass.

Integrator: render both alternatives, run the composited motion checks above,
and inspect all eight directions beside the defaults, especially shoulder
attachment/shape during the larger reach and the explicit SE overlap limitation.
Pixel-change coverage, actual visibility and visual quality remain unverified.
No Blender, render, memcheck, broad verification, UAT, install, commit or merge ran.

## Round 5 — adopted defaults and checked q90 atlases (TR-060; D-172)

D-172 supersedes the evidence-only/default-immutability instructions in rounds
1–4 above. The exact round-4 side-raise keys now live in `cook_poses.py` as the
default chop: head and supporting hand stationary, six frames at 10 fps, predicted
published-hand travel 17.45–25.67 px. The round-4 pure regressions now exercise the
default, including the round-2 head-step and round-3 hand-travel negative controls,
.22-tile shoulder bound and eighth-frame silhouette checks with the unchanged
SE exception. The obsolete overhead cap test is replaced by the stationary
head/support-hand test; the old key pin now pins the adopted chop and unchanged
one-handed extinguisher. The chop has three unique sampled poses because frames
0, 3, 4 and 5 hold the lower pose. Extinguish-alt, chop-alt, their modules, runtime
job extension and diagnostic `--variant` options are removed.

The packer applies lossy WebP q90 to body and heads, including full/half and mask
frames. Source config stays untouched as requested: the policy overrides its
historical lossless declarations on a private copy during packing, and writes
the effective encoding/quality in the manifest. Only the cook sets bypass the
multi-frame lossy guard; other sets retain it.

Each decoded atlas is checked against its lossless packing canvas after bleed
(and after premultiplied BOX reduction for half size). The metric is the **maximum
of the R/G/B channel mean absolute differences over source alpha=255 pixels**,
bounded at **3.0 in 8-bit values (3/255)**. Maximum alpha difference over **all
pixels is exactly 0**. Partially transparent RGB is excluded; empty opaque masks
have RGB error zero. Failure raises before writing that atlas. A regression using
the existing lossless `chop-s-1.png` passes q90 (RGB MAE 1.72826627; alpha max 0)
and rejects q50 at the same bound. Tests also cover altered alpha, multi-frame
cook pages, both detail levels and preservation of the caller's config. Fresh
round-5 atlases have not been packed or visually reviewed here; the integrator's
pack must satisfy the per-atlas check and unchanged PERF-023/024 budgets.

### Integrator render and pack commands / Requests

`cook-body-chop` must be re-rendered: its pose changed. Other action/head pixels
are unchanged by this round, but **all ten cook jobs are stale** because each
hashes `tools/blender/cook_poses.py` in `extraInputs`. No stamp was hand-edited.
Items and cards remain fresh: the shared source config and their stamp inputs
were not changed. To refresh all cook stamps through actual rendering, run jobs
sequentially (commands below are for the integrator; not run in this worktree):

```sh
python3 tools/assets/pipeline.py --render --only cook-body-chop --no-pack
for job in cook-body-idle cook-body-walk cook-body-carry-walk cook-body-stir cook-body-wash cook-body-serve cook-body-throw cook-body-extinguish cook-head-cap; do
  python3 tools/assets/pipeline.py --render --only "$job" --no-pack
done
python3 tools/assets/pipeline.py
python3 tools/assets/cook_strips.py --out uat/evidence/A-02b-cook-alternatives/round5 --check-motion
```

Open all eight composited facings, masks and motion strips for acceptance. D-172
selects the side raise; analytic support bounds still do not prove rendered
whole-hand visibility or a natural shoulder attachment. Review packed q90 pages
at both sizes. No rendered round-5 visibility or transfer-size claim is made.

### Round-5 checks / Close-out

Only the five requested validation commands ran. `uptime` one-minute loads were
below 8 immediately before every invocation. Final results:

| Command | Load | Result |
| --- | ---: | --- |
| `python3 -m unittest tools/blender/test_cook_poses.py` | 3.77 | PASS: 16 tests |
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | 5.20 | PASS: 52 tests |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | 3.70 | PASS: 2 files, 5 tests |
| `pnpm exec eslint tools --max-warnings 0` | 3.80 | PASS: exit 0 |
| `pnpm run lint:design` | 3.80 | PASS: 416 files |

Logs: `round5-{poses,assets,vitest,eslint,design}.txt` under
`uat/evidence/A-02b-cook-alternatives/`. The initial pose run exposed two old
overhead invariants (zero shoulder translation and six unique chop poses); both
now reflect the adopted round-4 keys, retaining the explicit reach bound.
Code is ready for integrator review; render/pack/visual acceptance remains pending.
No Blender, pipeline render, memcheck, broad verification, UAT, perf, install,
asset hand edit, commit or merge was performed.

## Round 6 — attached shoulder and reproducible sources (TR-060; D-172)

The raised shoulder offset is now **(.065, .019855, .025)** tiles, replacing
(.189493, .019855, .103033). The rigid arm rotation is unchanged: the wrist is
more than .10 tiles beside and .04 tiles above its shoulder in torso space.
The sleeve sphere (kalib arm radius .07 × 1.35 × toy scale) overlaps the actual
unpadded torso ellipsoid. An exact outside point-to-ellipsoid distance test minus
the sleeve radius checks both shoulders of every action at eighth-frame samples,
including closure. The former detached offset is a negative control. Fixed head,
supporting hand, no-overshoot bounds and ≥15 px published hands travel remain
checked. The historical seven-view cap-clearance prediction now applies only
to the unchanged lower hold; the attached raise requires fresh visual review.

`cook_strips.py --check-motion` now also checks every body-only frame of every
action, including walk/carry-walk and all one-shot samples. It requires exactly
one 8-connected component of alpha >16/255 with at least 20 pixels. The alpha
threshold excludes faint shadow/edge tails; the dust allowance is smaller than
a shoulder at 120 px/tile and cannot hide the observed 1,300+ pixel arm islands.
A synthetic regression checks diagonal connectivity, detached components, dust,
empty frames and the alpha threshold. `--out` is optional for check-only use.

Before changing the pose, the check failed (exit 1) on the current committed
PNGs: chop-s-1 [7190, 1401], chop-se-1 [7016, 1436], chop-e-1 [7275, 1375],
and chop-ne-1 [7620, 1329]. Each pair lists retained component sizes in pixels.
Log: `uat/evidence/A-02b-cook-alternatives/round6-islands-before.txt`.
These PNGs remain unchanged and require re-rendering; this is an expected failure,
not rendered acceptance of the new pose.

Removed the entire unreproducible `assets/src/tabao-rush/cook-body-alt/` tree;
evidence strips remain. `git rm -r` was attempted but the sandbox denies writing
the Git index outside this worktree; working-tree deletions are unstaged.
The stamp regression no longer reads evidence JSON: it compares current digest
against an injected source change and verifies the stale reason. Cook freshness
is intentionally pending integrator rendering. Added `COOK_QUALITY = 90` beside
`COOK_RGB_MAE` and documented the D-172 override at the packing policy. Both early
lossless-only passages in ART-PIPELINE now name the checked q90 cook exception;
the detailed D-172 explanation remains. The optional smaller-lossless fallback
was deferred to keep encoding policy and manifest semantics unchanged.

### Close-out and Requests

The integrator **must re-render chop**, then run the island/motion check and
inspect all eight body-only and composited directions. Exact render command:

```sh
python3 tools/assets/pipeline.py --render --only cook-body-chop --no-pack
```

Other cook jobs also hash cook_poses.py and need their stamps refreshed through
the normal integrator rendering process. No source PNG was hand-edited. No
Blender, render, pack, verify, UAT, perf, install or commit ran here.

### Round-6 checks

The one-minute load was below 8 before every permitted validation invocation.

| Command | Result |
| --- | --- |
| `python3 -m unittest discover -s tools/blender -p 'test_*.py'` | PASS: 19 tests; final start load 6.70 |
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | PASS: 74 tests; start load 6.39 |
| `python3 tools/assets/cook_strips.py --check-motion` | Expected FAIL: exit 1, four detached chop frame-1 islands listed above; ran before pose changes |
| `pnpm exec eslint tools --max-warnings 0` | PASS: exit 0; start load 7.75 |

Two earlier Blender-free suite runs failed during development: the first exposed
the raised cap-clearance prediction superseded above; the second exposed an
incorrect .10-tile vertical assertion. The unchanged arm rotation gives
.048749 tiles above the shoulder, so the final direct side-raise check requires
>.04 tiles vertically and >.10 laterally. Both were corrected before the final
19-test pass. Rendered attachment/visibility still awaits the integrator.
