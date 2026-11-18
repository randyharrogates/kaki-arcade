# A-07 — Effects

TR-009, TR-010, TR-062. Branch `issue/A-07-effects`.

## Plan and files

Use original script-built matte rounded lobes under board 1C day lights,
60° orthographic camera, 120 px/tile. Author tiny reusable clips, publish job-local
frame lists, then let the integrator render, pack and review real pixels.
`tools/blender/effect_geometry.py` holds pure deterministic samples and metadata;
`effects.py` renders through Blender; `test_effect_geometry.py` checks periodicity,
finite geometry and canvas bounds. `assets/src/pipeline.json` adds only the effects
set, round membership and five jobs. `tools/assets/test_effect_jobs.py` checks that
wiring. `tools/assets/effect_strips.py` writes review artifacts. No stamping code,
contracts, trackers, dependencies or generated dist files are changed.

## Requirement clauses → proof

- TR-009: a single soft ground ellipse; metadata gives origin and an example
  height-dependent scale/opacity rule. T-07 keeps its position on the ground XY
  projection while the ingredient follows its simulation arc. Art never authors
  flight time, range, catching, landing or eligibility.
- TR-010: four-frame broad orange flame with an amber core, plus directional
  extinguisher spray. Frame zero retains a substantial fire silhouette. T-07
  starts spray only while circle is held with extinguisher and stops immediately
  on release; no held-input easing. Simulation owns spread and extinguish timers.
- TR-062: rising particles follow monotonic paths (sparks use a ballistic arc);
  no wobble, spring or overshoot. Transparent particle births/deaths make the
  mathematical endpoint match the first sample without storing a duplicate.
  Pure tests establish periodicity; the rendered last/first seam still needs review.
  Reduced motion freezes frame zero for active steam/sparks/fire/spray; removal
  immediately communicates the state change. The shadow remains static in place
  when reduced-motion flight is suppressed by the renderer.

## T-07 placement and A-05 fit

All PNGs are straight alpha; use normal source-over for every effect, including
sparks/fire. No additive washout on marble, bloom or runtime blur. The shadow's
nested alpha ellipses bake the soft edge. All world effects use the shared camera;
rounded camera-facing lobes keep the small silhouettes readable.

`frames.json` has an anchor and named `origin` in untrimmed top-left pixel
coordinates. Align that origin with the station effect point (steam/sparks/fire),
cook `nozzle` (spray), or thrown ingredient ground point (shadow). Account for
atlas trim before placement. Animations carry fps and loop. Frame metadata carries
blend mode, reduced-motion frame ID, direction convention and shadow height rule.
The packer's halfRule halves anchors and canvas geometry; metadata strings do not
change. Draw half pixels at twice stored size to retain TV geometry.

Spray uses ONE rotatable four-frame 96 px sequence, originating at [13,48] and
pointing screen-right. This avoids 32 frames for eight views. For world facing
angle theta measured from +X toward +Y, rotate in screen coordinates by
atan2(-sin(theta)*sin(60°), cos(theta)); translate to the nozzle, then draw.
Its stylised pale foam has no directional highlights that need eight renders.
T-07 may foreshorten length by sqrt(cos(theta)^2 + .75*sin(theta)^2) if desired;
this is a placement choice, not a different atlas. Shadow origin is [32,32];
steam [32,53], sparks [32,48], fire [48,77].

Read `git show issue/A-05-stations:docs/slices/A-05-stations.md`: A-05 supplies
four animated flame samples plus a static jagged on-fire cue plaque. **T-07 should
draw A-07 fire in place of A-05 animated flames**, preserving A-05's static cue.
Never stack both animated fires. Keep A-05 smoke for its warning/burnt-food state;
A-07 steam means cooking, not burning. A-05's root-relative feature anchor must be
converted to the screen position before aligning A-07's independent origin.
Removing unused A-05 flame atlas entries is an integrator follow-up, not edited here.

## Budget estimate

17 frames: steam/sparks 4 × 64² each, fire/spray 4 × 96² each, shadow 1 × 64².
Total 110,592 full pixels = 442,368 decoded bytes (0.422 MiB) before packing;
half detail is 27,648 pixels = 110,592 bytes (0.105 MiB). A conservative single
512² atlas allowance is 1 MiB decoded full / 0.25 MiB half; actual pack dimensions,
padding and page fragmentation must be measured. Lossless transfer estimate is
0.05–0.25 MB full, below 0.1 MB half, **not measured compliance**. PERF-023 allows
8 MB transferred for the complete level, PERF-024 256 MB decoded for the round;
these additions share those budgets with all other art. Reuse across all stations;
no per-station variants, runtime textures or runtime lighting. One draw per active
effect. Preload before the round. Half outputs come from the existing packer.

## Choices for the integrator

Run strips after rendering; publish real `*-animated.gif` alongside `*-static.png`
to Randy, plus all 1×/4× light/dark sheets. Both options use the same atlas bytes;
static draws skip frame changes. The preview panel uses 233:144 golden-ratio
proportions. These are options awaiting review, not an approved visual choice.
Inspect the final/first pair and GIF motion, silhouette, native-size light/dark
contrast and half-detail fire at 3 m. A permanent core is an authoring argument,
not proof of readability. Test spray rotation at all eight nozzle directions in
T-07; no renderer integration or rendered visual claim is included in this issue.

## Integrator commands

Run jobs sequentially with normal load/memory checks:

```sh
python3 tools/assets/pipeline.py --render --only effect-steam --no-pack
python3 tools/assets/pipeline.py --render --only effect-sparks --no-pack
python3 tools/assets/pipeline.py --render --only effect-fire --no-pack
python3 tools/assets/pipeline.py --render --only effect-spray --no-pack
python3 tools/assets/pipeline.py --render --only effect-shadow --no-pack
python3 tools/assets/pipeline.py
python3 tools/assets/effect_strips.py --out uat/evidence/A-07-effects/rendered
```

## Close-out and Requests

Implementation only; no Blender, render, CLI pack, verify, UAT, perf, install or
commit was run, per explicit brief overriding the generic repo close-out loop.
Allowed asset tests may exercise their existing synthetic pack fixtures. Results
and freshness output are recorded in `uat/evidence/A-07-effects/REPORT.md`.
Integrator must render and open all artifacts, resolve Randy's visual option,
measure packed round budgets and run required final verification/UAT. Confirm
fire readability and spray/nozzle alignment before acceptance. The existing items
stamp becomes stale when config changes; A-05's separate stamping work owns the
resolution. No restamp is attempted here.

Final permitted checks: Blender pure suite **17 passed**; assets suite **71 passed**
after updating its existing exact round-membership assertion in
`tools/assets/test_cook_body.py`; ESLint **passed**. Freshness exits 1 as expected
for five missing effects outputs and the items config-stamp mismatch. All other
existing jobs are fresh. Each check was launched with 1-minute load below 8.

## Round 2 — fire revision (TR-010, TR-062)

Replaced fire ellipsoid particles and the opaque base blob with three overlapping
teardrop mesh tongues. Cubic sides meet at pointed tips; nested gold `#E0A63A`,
orange `#F07C2A` and red `#B5371F` layers retain a translucent outer edge. Fire
alone uses unlit, colour-managed palette materials to avoid lighting washout.
The feet stay fixed while tongue height and lean follow independent sinusoidal
phases; no sprite scaling or bouncing. Frame zero includes the gold core; round-2 review found its left tip partly
hidden by the central tongue. Four 96 px frames, 8 fps, origin [48,77], metadata and pixel budgets
are unchanged. Other effects retain their existing geometry and materials.

Close-out: pure tests cover palette, unique pointed tips, fixed feet, bounds,
frame deformation and smooth periodic derivatives at the wrap. The integrator subsequently re-rendered all five jobs and replaced the six fire
review images. Non-fire source pixels are identical; source bytes differ only by
Date/RenderTime PNG text. Integrator and reviewer looked at the round-2 images;
fire passed readability and loop review. Full atlas: 37,510 B / 174,240 B decoded;
half: 14,378 B / 43,560 B decoded. All effects stamps were fresh; items was stale.
The implementation agent ran no Blender, pipeline, verify, UAT, perf, install,
node_modules linking or commit.

Requests: A-07 is the only fire look; T-07 draws `effect-fire` at the station effect
anchor and A-05 drops its flames, per the round-two brief (superseding the earlier
A-05 placement discussion). Re-render `effect-fire` for visual review. Shared
`effects.py` / `effect_geometry.py` fingerprints also invalidate `effect-steam`,
`effect-sparks`, `effect-spray` and `effect-shadow`: re-render those jobs to refresh
stamps, then rebuild strips and inspect 96 px light/dark and last-to-first motion.

Round-two permitted checks: Vitest **41 files / 578 tests passed**; Blender pure
suite **19 passed**; assets suite **71 passed**. Each started at 1-minute load
below 8 (2.45 / 2.54 / 2.57 respectively). See the issue evidence report.

## Round 3 — review fixes (TR-009, TR-010, TR-041, TR-062)

Items now hash only their own job/set config (excluding pixel-derived metadata)
and declared file inputs; a regression test adds an unrelated set/job/round entry.
Vitest now runs the four effect geometry tests. Effect rendering explicitly uses
Cycles seed 0, strips Date/RenderTime text chunks in its own staging without
recompressing pixels, and shifts fire by half a cycle so both side tips lean
outward in frame 0. Periodicity, deformation bounds and fixed feet remain tested.

Close-out: rendered by the integrator 2026-11-18; see REPORT.md Round 3.

Done by the integrator: the five effects and items were rendered with Blender, packed, and the
strips rebuilt. All 17 jobs are fresh; items are pixel-identical except one pixel off by one level
in container-plate-dirty. Follow-ups: A-07b (unlit sparks with an edge-red rim, full PNG text strip,
shadow grain; `effect_strips.py` must not reset `review.json`) and A-01c (items seed and threads).

Round-three permitted checks: assets **72 passed** (`test_cook_body` passed),
effect geometry **4 passed**, Vitest `tools/assets` **2 files / 6 tests passed**,
ESLint **passed**. Each launched with one-minute load below 8; initial assets
fixture failure and successful rerun are recorded in REPORT.md.
