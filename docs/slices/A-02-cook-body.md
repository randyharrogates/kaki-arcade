# A-02 — Cook body

Requirements: TR-060, NN-4; movement context TR-009/TR-010 and D-072.
Branch: `issue/A-02-cook-body`. Decisions: D-037, D-044, D-139, D-142,
D-144, D-154 and D-163. Round 6 implementation and focused checks are recorded
below; fresh rendering and finished-art acceptance remain with the integrator.

## What changed

- Added Blender-free `cook_poses.py`: nine actions, 56 samples per direction,
  448 body samples plus matching masks, eight directions, shared carry/walk gait,
  smoothstep station keys, anticipation channels and release metadata. D-154's
  stride is 0.72 tiles with three contact samples and one flight sample per step.
  Forward is world -Y, so stance compensation adds +0.09 world Y per sample;
  forward displacement is exactly -0.09 tiles. The spine rises during flight.
- Reworked `cook.py` into action/head jobs with fixed 256 px frames, sampled
  LINEAR Blender keys, hand empties, knife/spatula/extinguisher geometry and a
  nozzle empty. Tool meshes follow the right arm; the extinguisher pose brings
  the supporting left hand across. Tools remain untinted depth occluders.
- Each job stages its own folder and publishes with rename/rollback. Body jobs
  render temporary cap heads for composition validation without publishing them.
  Each body mask is checked against pre-shadow alpha. Rig checks cover evaluated
  height, parenting, direction projection, canvas margins, compensated stance
  motion, foot lift, station foot stability and head-anchor jumps.
- Frames carry head/root/hands anchors and handsInFront, plus the extinguisher
  nozzle. Body and mask records share these values. Published check-only mode
  builds/checks the rig, validates PNG hashes and requires the frame lists and
  validation records to agree, without writing or rendering.
- Added frameFiles merging, optional animation fields and --no-pack to the asset
  pipeline. The existing multi-frame lossy-page guard remains. Cook jobs have no
  config input or config write. Cards/items job and set entries are unchanged.
- Retired the spike source folder, job, set and round. Added nine body jobs and
  the cap-head job, two lossless sets, 18 body/mask animations and two head clips.
  Body timeouts use logical samples (count × 8), with masks/reference/comparison
  included in the 2 s per-sample allowance: idle/extinguish 240 s; six-frame
  actions 360 s; eight-frame actions 420 s; cap heads 120 s.
- Added Pillow-only cook strips: body/tint/composed sheets, light/dark at 1×/2×,
  root/hands markers, frame labels, ground-speed strips, turn and mask sheets,
  and the lower-body carry/walk difference. Missing action lists are skipped.
- Updated ART-PIPELINE §5 and §9 with job execution and runtime frame semantics.

## Commands and results

Before each test/typecheck command the observed one-minute load from `uptime`
was below 8 (observed 3.60–7.38). Only the requested checks were run.
Evidence: `uat/evidence/A-02-cook-body/`.

The original round-1 command table has been retired because several logs it
cited were deleted in round 4. Retained evidence in this folder is
`py-compile.txt`, `tsc.txt`, `eslint.txt`, `design-lint.txt` and
`unchanged-entries.txt`; these are historical results, not round-6 checks.
`round4-checks.txt` records round 4, and `round5/` contains the existing composed
JPG sheets and `motion.json`. Current focused-check logs and analytic measurements
are under `round6/`, as listed below. No rendering was performed in round 6.

## Close-out

TR-060 / NN-4 implementation and focused checks are complete in the authorised
paths. These checks establish the authored pose/manifest/pixel-tool contracts;
they do not establish rendered art quality or measured no-slide acceptance.
Blender API execution, current mask containment, composition, visual readability
and final packed budgets require integrator rendering. Independent review and rendered acceptance are still required.

## Requests / integrator render order

Run from the repository root outside the sandbox, with the usual load/memory
precautions. These commands are instructions, not commands run by this slice.

1. `python3 tools/assets/pipeline.py --render --only cook-head-cap --no-pack`
2. `python3 tools/assets/pipeline.py --render --only cook-body-idle --no-pack`
3. `python3 tools/assets/pipeline.py --render --only cook-body-walk --no-pack`
4. Stop and generate strips with
   `python3 tools/assets/cook_strips.py --out uat/evidence/A-02-cook-body/strips`.
   Open the walk ground-speed strips in s/e/ne/n on both grounds at both scales.
   Check contact, flight, head registration, silhouette and apron/cap tint.
   Present the D-154 stride alternatives as the integrator's comparison artifact
   before accepting the final visual choice; changing stride/stance invalidates
   every cook job through the shared pose input, and the plan config must match.
5. Render each remaining job separately with
   `python3 tools/assets/pipeline.py --render --only <id> --no-pack`:
   cook-body-carry-walk, cook-body-chop, cook-body-stir, cook-body-wash,
   cook-body-serve, cook-body-throw, cook-body-extinguish.
6. Regenerate and open all strips, especially carry-minus-walk below the hips,
   the tools and nozzle, head composition, masks and one-shot release timing.
   Run published cook --check-only for every selected job, with its matching
   --action/--heads and --out arguments. Investigate any render validation failure;
   do not bypass the first full body-mask containment check inherited from S-02.
7. Re-stamp items through the requested job path:
   `python3 tools/assets/pipeline.py --render --only items --no-pack`.
8. Pack with `python3 tools/assets/pipeline.py`, inspect the full/half manifests
   and PERF-023/024 totals, then perform the independent review and art UAT.
   D-154's lossless cook storage remains a budget risk before stations/backgrounds.

The integrator owns shared trackers, rendered evidence, review, commit and merge.

## Round 2

TR-060 / NN-4, D-154: replaced the four work-action poses after reviewing the
round-1 strips and the integrator's screen-space measurements. Chop now raises
its knife arm above the shoulder, strikes with a small spine lean and hip dip,
and compensates both leg locations so the feet remain planted. Stir follows a
horizontal circuit with a small spine twist. Wash uses opposing lateral hand
strokes with shoulder sway and depth variation for the side views. Extinguish
holds the tool low and sweeps the spine through ±25 degrees, with arm recoil;
the existing arm-parented nozzle follows this motion. Serve and throw are unchanged.
All channels retain smoothstep easing between bounded keys, with matching loop
boundary keys. Counts, fps, release frames, loop flags, rig dimensions, camera,
anchor definitions and jobs are unchanged.

Added a Blender-free equivalent of the vertical-bone transforms and fixed TV
camera projection. Pure tests measure the rendered sample positions, requiring
at least 13 px hands travel for every work action in every direction, including
both hands and nozzle for extinguish. They also check zero projected foot slide,
matching loop boundary poses, and channel bounds between successive keys.

`cook_strips.py` now writes `<out>/motion.json`, keyed by action and direction,
with `anchor`, `travelPx` (maximum pairwise distance) and `maxChangedPixels`
(greatest difference from frame zero). Pixel measurements use unannotated RGBA
body frames including tools, and count a pixel once when any channel differs by
strictly more than 24/255. `--check-motion` exits 1 for any missing work-action
sample group or any travel below 13 px / changed count below 400. Synthetic tests
cover exact acceptance boundaries, strict pixel thresholds, alpha changes and
missing directions. Ordinary strip generation still skips absent actions.

All six authorised checks passed; the one-minute load was below 8 before every
invocation (observed 3.11–4.43). Results:

| Command | Result |
|---|---|
| `python3 -m unittest discover -s tools/blender -p 'test_cook_poses.py'` | PASS, 5 tests |
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | PASS, 43 tests |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | PASS, 2 files / 5 tests |
| `pnpm exec tsc -b tsconfig.build.json` | PASS, exit 0 |
| `pnpm exec eslint tools/assets` | PASS, exit 0 |
| `pnpm run lint:design` | PASS, 377 files |

### Round 2 close-out and requests

No Blender, render pipeline, memory check, UAT, performance command, install,
whole-suite verification, commit or merge was run. No source or distribution
renders were edited. Projected motion passes the pure checks; actual 400-pixel
acceptance, canvas containment, head occlusion and finished action readability
remain for the integrator to measure on renders. Loop boundary means time
`count` equals time zero; the final published sample precedes that boundary.

Integrator render order (commands not run here):

1. `python3 tools/assets/pipeline.py --render --only cook-body-chop --no-pack`
2. `python3 tools/assets/pipeline.py --render --only cook-body-stir --no-pack`
3. `python3 tools/assets/pipeline.py --render --only cook-body-wash --no-pack`
4. `python3 tools/assets/pipeline.py --render --only cook-body-extinguish --no-pack`

Then run `python3 tools/assets/cook_strips.py --out
uat/evidence/A-02-cook-body/round2 --check-motion`, inspect all eight directions
in the resulting strips, and review `motion.json`. The check requires all four
work actions to have been rendered. Shared pose input freshness will invalidate
other cook jobs, although their choreography is unchanged.

## Round 3

TR-060 / NN-4, D-154: added sampled head-socket counter-rotation for every
action. The solver inverts the inherited hips/spine/head XYZ rotation after
smoothstep sampling, preserving the shoulder-driven head-anchor translation.
Round 2's body lean, twist, dip, arm/nozzle paths and leg compensation are
unchanged. The actual rig chain in `cook.py` is hips → spine → head →
head_socket; the meshes attach to head_socket. All four bones have parallel
vertical rest bases, with local Y along world Z.

Added an independent matrix-composition test for all nine actions, eight
directions and every frame, plus eighth-frame samples and loop endpoints.
The test includes the rig direction rotation and vertical rest basis and
requires the world head rotation to match rest within 0.5 degrees. A combined,
noncommuting hips/spine/head fixture checks rotation order and inversion.
The authored-channel bounds test excludes the derived socket; its rotation is
covered by the world-orientation invariant. Existing 13 px travel, planted
feet, easing, loop and gait checks still pass.

Inspected `cook.py` build, head rendering and comparison paths: both the
separate head and full reference use the same `K.cook('matte', 'cap',
same_body=True, ...)` meshes. Separate heads are rendered at idle frame zero
for each direction; the reference uses the action frame for that direction.
No reference-head mismatch was found by inspection. `cook.py` and its IoU ≥
0.95 / every silhouette pixel within 2 px checks are unchanged. No Blender was
run, so actual rendered composition and ≥400 changed pixels remain for the
integrator to measure. The existing pixel-motion acceptance tests remain in
the passing asset suite; synthetic tests do not establish rendered acceptance.

Commands and results are recorded in
`uat/evidence/A-02-cook-body/round3/checks.txt`. Before each invocation the
one-minute load from `uptime` was below 8. The initial pose test run exposed
that socket rotation was still being checked against uncorrected authored
keys; the bounds assertion was adjusted as described above and the suite rerun.

All six authorised checks passed (pre-command load 3.22–7.16):

| Command | Result |
|---|---|
| `python3 -m unittest discover -s tools/blender -p 'test_cook_poses.py'` | PASS, 6 tests |
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | PASS, 43 tests |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | PASS, 2 files / 5 tests |
| `pnpm exec tsc -b tsconfig.build.json` | PASS, exit 0 |
| `pnpm exec eslint tools/assets` | PASS, exit 0 |
| `pnpm run lint:design` | PASS, 377 files |

### Round 3 close-out and requests

Render separately in this order (instructions for the integrator, not run here):

1. `python3 tools/assets/pipeline.py --render --only cook-body-chop --no-pack`
2. `python3 tools/assets/pipeline.py --render --only cook-body-stir --no-pack`
3. `python3 tools/assets/pipeline.py --render --only cook-body-wash --no-pack`
4. `python3 tools/assets/pipeline.py --render --only cook-body-extinguish --no-pack`

Review composition and `motion.json` for all eight directions: ≥13 px hand/nozzle
travel, ≥400 changed pixels and planted feet. Shared pose input freshness also
invalidates other cook jobs. Finished-art acceptance remains with the integrator.
No Blender, memory-check script, render pipeline, UAT, performance command,
whole-suite verification, install, commit or merge was run.


## Round 4

TR-060 / NN-4; D-154 and D-163. Replaced all arm-root translation, including
carry, with bounded rotations around the actual shoulder. The pure torso-volume
test checks both shoulder heads in every authored key of every action. Spine
lean/twist supplies the work gestures; hips/legs retain planted-foot compensation.
Throw now winds back and up with a spine twist, then extends the right wrist
outside the cap's lateral silhouette at frame 3. Serve reaches forward with both
hands at frame 3. Smoothstep keys and linear rendered samples retain bounded
motion without overshoot. The item follows `throwHand` (also `hands` during
throw); its depth flag follows that wrist too. After release it follows the game's
arc, independently of the arm's settle. Published types and ART-PIPELINE §9 state
this contract. Body and mask records share it.

Idle lifts the chest/shoulders 0.055 tiles with a 0.010-tile weight shift and
small arm rotations. The socket validation now permits this bounded breath.
Wash alternates equal-length strokes every sample; the supporting extinguisher
arm holds a fixed grip relative to the canister throughout the spine sweep.
The canister now sits below the throwing wrist, leaving that hand at the handle
and the other hand against its body. Pure tests check grip overlap at eighth-frame
intervals. The former knife handle used K.limb's two dark spherical end caps;
a single bevelled handle removes those extra round masses around the raised hand.
The integrator must confirm the reported double-blob appearance is gone in render.

`--check-motion` now includes serve/throw, using unannotated tinted body + cap
composition from frame zero to releaseFrame, all eight directions, >=13 px anchor
travel and >=400 changed pixels. Idle uses the chest/head socket, >=2 px travel
and >=100 changed pixels. The strict >24/255 per-RGBA-channel changed-pixel rule
is unchanged. Missing head/mask/anchor coverage fails. Synthetic tests cover
release-only sampling, composition use, missing coverage, exact boundaries,
multiply tint including fractional mask alpha, JPG/PNG dimensions, and full
source-frame containment in enlarged ground-speed cells. The cook Vitest wrapper
asserts the nine-test count and OK. A Blender-free frame-record test checks that
throw and mask hands/depth follow the right wrist while serve uses the midpoint.

Contact sheets default to quality-85 JPG at 1×; `--format png` requests 1× PNG.
Masks-only sheets also stay at 1×. Removed round1/round2 PNG evidence, round3 2×
PNGs and stale check-stale.txt, pose-tests.txt, asset-tests.txt and vitest.txt;
text motion/LOOK results and round3 1× sheets remain. `git rm` was attempted but
the sandbox cannot write the parent worktree Git index; deletions are present
in the working tree and need staging by the integrator.

### Round 4 close-out and requests

All cook jobs are stale because cook_poses.py is a shared input. Render in this
order, one job per invocation of `python3 tools/assets/pipeline.py --render
--only <id> --no-pack` (instructions only; no rendering was run here):

1. cook-head-cap
2. cook-body-idle
3. cook-body-walk
4. cook-body-carry-walk
5. cook-body-throw
6. cook-body-serve
7. cook-body-chop
8. cook-body-stir
9. cook-body-wash
10. cook-body-extinguish

Then generate `python3 tools/assets/cook_strips.py --out
uat/evidence/A-02-cook-body/round4 --check-motion`. Open every composed direction,
especially n/ne throw and n serve at wind-up/release, wash side-view shoulders,
the knife hand and both extinguisher grips. Check idle visibility, wash rhythm,
head registration, masks, canvas bounds and the unclipped ground-speed sheets.
Write fresh render/check evidence, check published jobs and pack only after those
reviews. Pure projection checks cannot prove cap occlusion or finished TV reading.
No Blender, memory-check script, render pipeline, UAT, performance run, install,
whole-suite verification, commit or merge was run.

Round 4 final checks (all PASS; one-minute load below 8 before every invocation):

| Command | Result |
|---|---|
| `python3 -m unittest tools/blender/test_cook_poses.py` | 9 tests |
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | 47 tests |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | 2 files / 5 tests |
| `pnpm exec tsc -b tsconfig.build.json` | exit 0 |
| `pnpm exec eslint tools --max-warnings 0` | exit 0 |
| `pnpm run lint:design` | 393 files; exit 0 |

Results are recorded in `uat/evidence/A-02-cook-body/round4-checks.txt`.
Initial pose checks caught and prompted corrections to supporting-hand contact,
throw projection and idle visibility; the final nine-test run also checks the
throw wrist is behind/above the shoulder at wind-up and beyond the lateral cap
radius at release. Rendered changed-pixel acceptance remains unmeasured here.

## Round 5

TR-060 / NN-4; D-154 and D-163. Reduced serve's anticipatory spine lean
from -0.060 to -0.025 radians and throw's from -0.150 to -0.100 radians.
The forward torso movement is now shared more evenly between the two sampled
reach/release steps. Arm wind-up, extension, reach endpoints, frame counts,
fps and releaseFrame (3, at the throwing arm's extension) are unchanged.
Smoothstep interpolation remains bounded with no overshoot. Extinguish needs
no change: its spine sweep rotates around the vertical socket axis.

Added a pure Python head-socket position solver and a regression test for every
action, direction and consecutive published frame, including the wrap pair for
loops. This models the anchor actually checked by cook.py's rig_checks:
`socket(rig)` is the head socket, not a hand. It uses the same rigid bone rest
origins and orthographic projection at 120 pixels per tile; it is an analytic
pixel calculation, not a conservative hand-motion bound. Assertions protect
its assumptions about hips, head and spine transforms. The round-4 serve
prediction is within 0.000006 px of Blender's reported 6.284328753 px (floating
point rig evaluation differs slightly). Blender remains the final authority.
The 6 px limit in cook.py is unchanged. Updated the Vitest wrapper's expected
Python test count from nine to ten.

Maximum head-anchor step in pixels across all eight directions (loop closure
included where applicable):

| Action | Round 4 | Round 5 |
|---|---:|---:|
| idle | 2.169615 | 2.169615 |
| walk | 1.080000 | 1.080000 |
| carry-walk | 1.080000 | 1.080000 |
| chop | 1.926831 | 1.926831 |
| stir | 0.000000 | 0.000000 |
| wash | 0.000000 | 0.000000 |
| serve | 6.284323 | 5.572631 |
| throw | 6.700054 | 5.806351 |
| extinguish | 0.000000 | 0.000000 |

### Round 5 close-out and requests

The existing all-direction >=13 px work/serve/throw travel checks, idle >=2 px,
wind-up/extension, grip, foot stability and bounded-channel checks still pass.
Rendered >=400 changed pixels (idle >=100), canvas containment, composition
and visual readability require integrator rendering and inspection.

Integrator render order: **cook-body-serve, cook-body-throw,
cook-body-extinguish**. Only serve and throw have changed sampled poses.
However, cook_poses.py is a shared hashed input, so the pipeline will mark
**cook-head-cap, cook-body-idle, cook-body-walk, cook-body-carry-walk,
cook-body-chop, cook-body-stir and cook-body-wash** stale too; refresh those
jobs after the three priority jobs through the normal pipeline. Regenerate the
motion report/contact sheets and inspect the release poses and all-direction
thresholds. No generated assets were edited here.

Only the five requested checks were run, with one-minute load below 8 before
each invocation. No Blender, memcheck, render pipeline, UAT, performance run,
install, commit or merge was performed. Results:

| Command | Result |
|---|---|
| `python3 -m unittest tools/blender/test_cook_poses.py` | PASS, 10 tests |
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | PASS, 47 tests |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | PASS, 2 files / 5 tests after updating the wrapper count |
| `pnpm exec eslint tools --max-warnings 0` | PASS, exit 0 |
| `pnpm run lint:design` | PASS |

## Round 6

TR-060 / NN-4; D-154 and D-163. Addressed S1, S2, S3, S4, S8 and S9.

- **S1:** replaced the every-frame wash flip with three-frame out/mid/back
  strokes, adding a bounded depth circuit to distinguish return samples. All
  channels remain bounded by their keys, including at loop closure.
- **S2:** replaced chop's cap-hidden high raise with a low retraction of the
  knife hand, retaining the strike, dip and six-frame timing. The frame-1
  cap-envelope test leaves >=6 px of the spherical hand below a conservative
  shell/brim projection in every direction. This protects partial visibility,
  not whole-hand clearance; exact silhouettes still need Blender.
- **S3:** holds the canister laterally, with a free balancing hand. The fixed
  shoulder rig cannot maintain the old two-handed grip at this reach; the grip
  test is replaced by an all-frame/all-direction canister visibility bound.
  A sampled canister surface point must clear the enclosing torso, head/shell
  and brim discs simultaneously by >=1 px. ART-PIPELINE §9 documents the
  geometry and the remaining render checks.
- **S4:** every action now measures tinted body + tinted cap composition;
  hidden body-only shadow motion cannot count. Missing heads, masks or anchors
  fail coverage. All motion thresholds and release-only sampling are unchanged.
  A synthetic test asserts compositing and missing-head coverage for all actions.
- **S8:** packing now shares identical pixels only when frame semantics also
  match, rewrites animation slots to the canonical ID and retains direct-ID
  aliases at the same rectangle. Tests cover repeated slots, multiple pages,
  unchanged timing/input config and equal art with distinct anchors. Idle and
  extinguish retain three distinct poses/four slots; slots 1 and 3 can share.
  Pure unique-pose checks cover every action and direction (wash must have six).
- **S9:** ART-PIPELINE §9 and manifest.d.ts call `throwHand` the throwing hand;
  the key and anatomical rig names remain unchanged.

Analytic before/after measurements (120 px/tile; both wrists, every direction,
loop closure included; values differ slightly from the review's rendered-anchor
measurements). Full data: `round6/pose-metrics.json`.

| Measurement | Round 5 | Round 6 |
|---|---:|---:|
| Wash unique samples per direction | 2 | 6 |
| Wash maximum hand step | 42.874 px | 22.814 px |
| Chop maximum hand step | 43.898 px | 42.634 px |
| Chop minimum hands diameter | 13.059 px | 19.825 px |
| Raised-hand lower-edge cap margin (minimum) | -38.822 px | 8.386 px |
| Canister exposed-point envelope margin (minimum) | -31.642 px | 1.992 px |
| Wash minimum hands diameter | 36.300 px | 36.300 px |
| Extinguish minimum hands diameter | 16.963 px | 20.664 px |
| Identical four-slot idle/extinguish tiles per direction and layer | 4 | 3 |
| Motion-report actions using cap composition | 2 / 9 | 9 / 9 |

The tile count is the exact-repeat expectation, verified with synthetic pack
fixtures; fresh production PNGs must confirm equality. The packer uses actual
pixels and semantics, so near-equal frames are never silently collapsed.

### Round 6 close-out and requests

Priority stale render jobs: **cook-body-wash, cook-body-chop,
cook-body-extinguish**. Idle's sampled frames have not changed; regenerate its
pack to share repeats. The shared cook_poses.py input also makes **cook-head-cap,
cook-body-idle, cook-body-walk, cook-body-carry-walk, cook-body-stir,
cook-body-serve and cook-body-throw** stale to the pipeline. The integrator must
refresh those jobs, regenerate all composited strips/motion.json and repack.
Inspect every knife/canister direction (including e/w and north diagonals), the
low chop gesture, free balancing hand, smooth wash loop and canvas bounds.
Rendered >=400 changed pixels (idle >=100), actual visibility/readability and
finished-art acceptance remain with the integrator. Round-5 sheets are historical.

Closed the stale opening status and replaced the round-1 table's deleted-file
references with retained evidence. No Blender, render pipeline, memcheck, UAT,
performance, install, whole-suite verification, commit or merge was run.

Only the five requested commands were run, with one-minute load below 8 before
each invocation. Logs are in `uat/evidence/A-02-cook-body/round6/`.

| Command | Result | Log |
|---|---|---|
| `python3 -m unittest tools/blender/test_cook_poses.py` | PASS, 12 tests | `round6/pose-tests.txt` |
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | PASS, 49 tests | `round6/asset-tests.txt` |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | PASS, 2 files / 5 tests | `round6/vitest.txt` |
| `pnpm exec eslint tools --max-warnings 0` | PASS, exit 0 | `round6/eslint.txt` |
| `pnpm run lint:design` | PASS, exit 0 | `round6/design-lint.txt` |

Final invocation loads, in table order: 3.50, 3.86, 3.99, 3.60 and 4.51.

## Integrator close-out (2026-11-18)

- Renders: all ten cook-body jobs re-rendered for round 6, one at a time, every job exit 0
  (wash 67 s, chop 94 s, walk 176 s, carry-walk 106 s, stir 160 s, serve 73 s; the rest under
  the 300 s timeout). `pipeline.py --check-stale` clean; pack exit 0;
  `cook_strips.py --out uat/evidence/A-02-cook-body/round6 --check-motion` passed on composited
  frames (body plus tinted cap head).
- Looked at by the integrator: the raw round-6 frames for extinguish, chop and wash, and the
  composited extinguish and chop sheets at 1×. The canister shows from every direction, the knife
  stays clear of the cap, wash has six distinct poses.
- `pnpm verify` passed on the branch with main merged.
- Independent re-review: ready to merge. Two art points are carried to Randy rather than fixed
  here (D-167): the knife hand passes behind the torso for one frame of chop in most directions,
  and extinguish is now a one-handed hold with the arm out to the side.
- Budget: Tabao Rush art at full size 5.14 MB of the 8 MB level budget (half size 1.72 MB);
  decoded 52.8 MB of 256 MB. Cook sets stay lossless; the storage choice goes to Randy after this
  merge.
