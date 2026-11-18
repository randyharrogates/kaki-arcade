# A-10 — Tabao Rush dish art polish

TR-041, preserving TR-040 coverage; D-141 and D-145. Source-only hand-off on
`issue/A-10-dish-polish`. The integrator owns rendering, visual review and commits.

## Changes and acceptance

| Item | Before | Scripted replacement and pure checks |
|---|---|---|
| Rojak | Separated ingredients crossed by thin, twig-like dressing | One bounded mixed topping bridges the recipe's three portion slots: six fruit/vegetable chunks, four fried-dough chunks, seven broad dark sauce patches and nine crushed-peanut pieces. Raised centre, staggered fruit/vegetable positions and varied angles replace rows and sauce strands. Tests require all three recipe ingredients, ≥10 substantial mixed chunks, ≥20 topping parts, bounded mound and no sauce curves. |
| Turnip | Thin nearly white strips/shards | Eight warm cuboids, minimum dimension 0.07 world units, ochre cut faces and darker edges. Face/ceramic material contrast >2:1, edge/face >1.5:1. The minimum horizontal dimension projects to >8 px in its plate portion. Applies to chopped loose and served turnip, including rojak and future uses. No new dish or recipe is added. |
| Chicken rice | Five pale peg-like ellipsoids | Five low broad cut slices fanned through 0.72 radians, each with a warm cut face and contrasting skin strip. Tests pin count, aspect, differing orientations, both materials and >4 px slice width at the plate portion scale. |
| Broth on plate | Bare orange puddle | The liquid portion has an enclosing ceramic rim, within the previous 0.245-world-unit radius. It therefore remains rimmed in generic plate, bowl and cup servings; laksa still uses its bowl. Tests require every broth recipe to use a bowl, a closed ring outside the liquid and its scale-adjusted width. D-141 plate drink side cups remain unchanged. |
| Cup contents | Pale, finely divided contents disappear at 0.36 | Warmer rice surface with eight grain accents instead of 24; three broader noodle strands instead of five thin ones; stronger turnip/chicken surfaces and compact staggered produce. Both kopi and teh now have a rim highlight. Tests compute authored sRGB relative-luminance contrast ≥1.25:1 for each ready food's broad surface against ceramic, and preserve kopi/teh contrast >2:1. This is a material guard, not a rendered-pixel or accessibility claim. |
| Serving metadata | Undocumented coordinate/selection contract | ART-PIPELINE §10 documents all three fields, generic/fixed/served selection, source-pixel anchors, world projection, unitless scales, transform order, atlas trim and baked outline restrictions. No game reader or metadata change in assets/src is included. |
| Evidence | No comprehensive native-size sheet | `tools/assets/item_sheet.py` writes labelled native 1× and exact nearest-neighbour 4× 1920 × 1080 pages on light/dark counter tones. Includes every dish, portion, clean/dirty container, drink variant and ready portion in all three containers. Records hashes and refuses stale renders or an existing run directory. Tests cover inventory, transformations, pixel sizes and stale-render refusal. |

All new colours reuse the existing items palette and DESIGN's ceramic/counter
family. Geometry is original, deterministic and reproducible from Python; no new
dependency, frame ID, source PNG, generated atlas or game rule is introduced.
Existing recipe-to-art coverage and outline/containment tolerances remain intact.

## Integrator rendering and evidence

The **`items` render job is stale** because its source script changed. No other
render script/input is changed by A-10. Regenerate the complete job (its loose
states, portions, dish references and seven icons), not isolated PNGs. Refresh
`containmentFootprints` from the newly rendered PNGs and check bakedOutline flags;
do not substitute geometric or downscaled footprints. These asset metadata changes
are intentionally left to the integrator alongside the render, per the brief.

After rendering and publication, from the repository root:

`python3 tools/assets/item_sheet.py round1`

Output: `uat/evidence/A-10-dish-polish/round1/`, with `light-1x-*.png`,
`dark-1x-*.png`, matching `*-4x-*.png` and `sheet.json`. Open **every** page at
100% and record findings. The script is implemented and unit-tested here; no
fresh art sheet or visual pass is claimed before the integrator renders.

Review rojak's mixed mound and visible shares of every required layer, turnip
edges against the plate, chicken fan/skin at 1×, broth rim on plate and all cup
contents. Also inspect fixed/composed kaya cups and both drinks, all icon
silhouettes, containment and the satay rim tolerance from A-04 round 12 (two
pixels). Readability at 3 m on the real TV remains the visual acceptance test.

No new canvases or runtime geometry are added. Broader silhouettes and more rojak
parts **could grow the trimmed items atlas and its encoded size**. The existing
2048 × 2048 page limit, PERF-023 ≤8 MB transferred per level and PERF-024 ≤256 MB
decoded per round remain binding. Actual new sizes are unknown until the integrator
renders and packs. The source checks do not establish an art-budget pass.

## Validation

Only the five checks authorised in the brief are run, each after `uptime` reports
a 1-minute load below 8. Results are recorded in
`uat/evidence/A-10-dish-polish/source-checks/REPORT.md`.
No Blender, render command, UAT, full verify, full-suite Vitest, performance run,
install, memcheck, commit or merge is performed.

## Close-out

TR-041 source implementation, regression tests, metadata documentation and the
sheet generator are ready for integrator review. TR-040's seven-dish and reachable
appearance coverage is preserved. Rendering, fresh containment/visibility/icon
validation, visual acceptance and final atlas budgets remain open.

## Requests

- Integrator must create **proposed T-18 — Read item serving composition metadata
  in the Tabao Rush renderer (TR-041; D-141/D-145)**, depending on T-07 and A-10:
  consume servedComposition, contentCompositions, portionScales and bakedOutline;
  use the actual served drink and honour source anchors/trim. Add runtime tests
  for plate kopi/teh, generic cup food, rimmed broth and both served-drink dishes.
  T-18 is a proposed identifier, not an already-created issue; the backlog is untouched.
- Integrator: render `items`, refresh pixel metadata, run the sheet command,
  inspect every page and complete independent review and budget validation.

## Round 2 — portion visibility and icon margin (TR-041; D-145)

The integrator's round-1 render failed: rojak portion 0 (pineapple) had visible
share **2.86%**, below the unchanged **4%** render minimum. The closest icons were
chicken rice / rojak: rendered IoU **0.7068**, projected **0.7036**. Distinctness
fails above **0.90**; the new pure regression guard requires **≤0.75**, retaining
at least 0.15 margin rather than approaching that limit.

The mixed dressing cap now uses 0.60 of its former linear scale about its existing
anchor. This pulls its fruit, vegetables, dough, broad sauce lobes and peanuts
inwards together, preserving the raised, connected mixed heap rather than moving
ingredients into separate piles. The cucumber portion grows from 0.42 to 0.56;
shrinking the cap alone left too little of that portion visible. Anchors, recipe
layers and runtime thresholds are unchanged. Cucumber is a shared portion, so
chicken rice and satay also receive the broader slices and require visual review.

`tools/assets/item_projection.py` captures the actual primitive builders and their
transforms without Blender. It projects `u=x`, `v=y*sin(elevation)+z*cos(elevation)`
at 60° for portions, using the rounded manifest anchor translations and 4× samples
at 120 px/world unit. Convex box corners omit bevels; ellipsoids
use sampled surfaces and pineapple strands use sampled spheres. Later portion
masks occlude earlier ones in the same painter order as the runtime composition.
Shares divide by the full dish silhouette, including an approximate outer plate
and its one-pixel rim. For the food-only chicken rice / rojak icons, elevation is
55°, each union is centred and fitted to 80% of 55px, then the production pure
raster helper supplies alpha coverage thresholding and the one-pixel rim.

| Pure geometry prediction | Round 1 | Round 2 |
|---|---:|---:|
| Pineapple visible share | 4.0070% | 7.9791% |
| Turnip visible share | 13.5605% | 18.9596% |
| Cucumber visible share | 0.8434% | 6.2535% |
| Dressing visible share | 36.3517% | 13.0979% |
| Chicken rice / rojak icon IoU | 0.686261 | 0.715709 |

The tests assert **every share ≥5%** and **icon IoU ≤0.75**. These estimates do not
model evaluated bevels, lighting or exact rendered alpha. In particular, the
round-1 pineapple prediction exceeded its rendered value by 1.15 percentage
points; the new layout keeps additional headroom. These are smoke checks, not a
claim of fresh rendered acceptance. No shape cue is added solely for distinctness:
the icon still has 0.1843 predicted margin below the 0.90 limit.

Round-2 validation and load readings are in
`uat/evidence/A-10-dish-polish/source-checks/ROUND-2.md`. All five authorised
commands pass. No render, generated asset edit, commit or merge was performed.
The integrator must regenerate the complete `items` job, refresh pixel metadata,
inspect the 1× sheet (including the smaller peanut details), and confirm all
rendered shares ≥5%, icon distinctness, containment and atlas budgets before
close-out. The existing Requests above remain open.

## Round 3 — rendered metadata, slices and review coverage (TR-041; D-145)

Added `pipeline.py --refresh-item-metadata` and ran it against the committed
round-2 PNGs: footprints and ink flags now describe those pixels. It must run
again after rendering. Chicken is now five overlapping fanned shingles, about
0.13 × 0.20 × 0.03 world units, with a thin skin band along local +X's long edge.
Tests require width/height ≥2, length/width ≤2 and the band's orientation/offset.
Rice/cucumber anchors and the plate footprint stay fixed; rendered containment
and visibility remain the gate.

Turnip defaults to cream, with warm-beige sides and a darker edge. Tan and lilac
are render-time alternatives for Randy, selected only in items.py through
`KAKI_TURNIP_STYLE`. Lilac has a cream face and one muted purple skin edge.
The material smoke bound is side/ceramic >2:1 and edge/face >1.5:1, rather than
requiring the pale top to contrast. No option is claimed visually accepted.

Evidence now includes separate loose-items and icons pages on both counters at
1× and 4×; icons retain their native 55px canvas. The committed icon smoke guard
covers all 21 dish pairs at IoU <0.75. The renderer also enforces this tighter
bound for every pair via its closest-pair check. Geometry visibility predictions
and icon source checks are smoke checks; the rendered check is the gate.
ART-PIPELINE §10 explains halfRule's nested-anchor exception; §11 covers sheets.

Historical round-3 commands (not executed here); use the Round 4 commands below.
From the repository root:

```sh
for option in tan cream lilac; do
  KAKI_TURNIP_STYLE="$option" blender -b --factory-startup -P tools/blender/items.py -- --out "/private/tmp/A-10-turnip-$option"
done
# Build and show Randy an artifact from those scratch renders before recording a choice.
python3 tools/assets/pipeline.py --render --only items --no-pack
python3 tools/assets/pipeline.py --refresh-item-metadata
python3 tools/assets/pipeline.py
python3 tools/assets/item_sheet.py round2
```

### Close-out and Requests

Source changes and committed-pixel metadata are ready for review. Integrator:
render the options for Randy, render the default, refresh metadata, pack, generate
round2 sheets and inspect every page. Rendered visibility, all icon pairs,
containment and atlas budgets must pass. The earlier T-18 request remains open.
No rendering, PNG edit, commit or merge was performed here. Round-3 authorised
check results are recorded in source-checks/ROUND-3.md.


## Round 4 — readable chicken and composition predictor (TR-041; D-145)

The integrator's first round-3 scratch render failed `check_portion_visibility`:
dropping chicken portion 1 still passed colour composition. The former pure guard
checked rojak coverage and icon silhouettes, so it could not catch this risk.

Chicken remains five flat, shingled, fanned slices with pale cut faces and a golden
skin band along local +X's long edge. Slice extents grow from approximately
0.13 × 0.20 × 0.03 to 0.17 × 0.27 × 0.04 world units; plated scale grows from
0.55 to 0.62. The skin band grows from 0.018 to 0.030. Height order reverses so
the skin edge lies above the neighbouring slice, instead of tucking under it;
lower/right slices are built first. Existing anchors, palette and recipe layers
stay fixed. A pure corner check keeps every chicken cut and band inside the
plate's 0.31-world-unit footprint. Rice and cucumber remain separately visible.

The predictor now captures authored colours, projects at 4×, downsamples to native
89px and calls production `composition_difference` on each complete dish and its
dropped/shifted alternatives. Every portion must have >5% visible share and a drop
mean-channel difference >7.5 (25% above production's 6 threshold), independently
of the fraction-over-40 gate. All four ±10px X/Y shifts must exceed 6 as well.
Tests project **all seven dishes**; all 21 projected icon pairs and all 21 committed
icon pairs must remain below 0.75. Flat kway-teow ribbons now use their actual
sheet normals, half-width and 0.009 solidify thickness rather than sphere tubes;
vessel silhouettes use the authored lathe profile and cup handle.

The regression reconstructs round-3 slice dimensions, heights, scale and band
width under patches and proves the identical >7.5 drop assertion fails: round-3
chicken predicts **6.826707**, with only **5.015254** for its weakest shift. The
first source-suite run also failed the positive new drop assertion on unmodified
round-3 geometry (`6.8267066766691675 not greater than 7.5`). This identifies the
missing safety margin; it does not claim to reproduce Blender's pixel score.

Predictions for the final default (cream turnip), using the maximum mean absolute
RGBA channel as the difference, on the production 0–255 scale:

| Dish | Portion | Visible share | Drop difference | Minimum 10px shift difference |
|---|---|---:|---:|---:|
| chicken-rice | rice | 19.95% | 13.968 | 7.247 |
| chicken-rice | chicken | 16.71% | 16.070 | 12.995 |
| chicken-rice | cucumber | 8.31% | 10.131 | 11.812 |
| char-kway-teow | kway-teow | 33.15% | 60.305 | 49.609 |
| satay | cucumber | 7.48% | 9.558 | 10.596 |
| satay | satay | 25.29% | 34.623 | 20.110 |
| laksa | laksa-broth | 49.22% | 65.739 | 40.976 |
| laksa | noodles | 20.47% | 13.208 | 13.402 |
| rojak | pineapple | 7.95% | 12.542 | 12.656 |
| rojak | turnip | 19.05% | 16.144 | 15.059 |
| rojak | cucumber | 6.24% | 7.894 | 8.306 |
| rojak | rojak-dressing | 13.06% | 16.795 | 18.815 |
| kaya-toast | bread | 19.05% | 28.566 | 16.202 |
| kaya-toast | drink-side | 16.26% | 12.243 | 15.415 |
| kopi-teh | kopi | 54.52% | 93.374 | 66.847 |

Closest projected icon pair: chicken rice / char kway teow, **0.745707** (<0.75).
The predictor omits lighting, bevels, evaluated curve surfaces and rendered ink;
base containers use an approximate ellipse, while portion vessels/icons use the
lathe hull. Primitive painter order approximates intra-portion depth. These are
source smoke predictions, not a rendered or visual acceptance claim. The icon
margin is small and must be checked in fresh renders. No production threshold is
weakened. Each rendered portion must still pass the unchanged visibility, drop
and all four shift checks.

### Integrator commands (not executed here)

From the repository root, use fresh scratch output paths for this round:

```sh
for option in tan cream lilac; do
  KAKI_TURNIP_STYLE="$option" blender -b --factory-startup -P tools/blender/items.py -- --out "/private/tmp/A-10-round4-turnip-$option"
done
# Build and show Randy an artifact from these scratch renders, then record his choice.
# Set this to Randy's selected option before regenerating the published job.
selected_turnip=cream
KAKI_TURNIP_STYLE="$selected_turnip" python3 tools/assets/pipeline.py --render --only items --no-pack
python3 tools/assets/pipeline.py --refresh-item-metadata
python3 tools/assets/pipeline.py
python3 tools/assets/item_sheet.py round4
```

### Close-out and Requests

Round-4 source and pure regression work is ready for integrator review. All five
authorised checks and load readings are recorded in
`uat/evidence/A-10-dish-polish/source-checks/ROUND-4.md`. No Blender/render, PNG edit,
full verify, whole-suite Vitest, UAT, performance run, install, memcheck, commit or
merge was performed. Integrator: render all options, obtain the turnip choice,
regenerate the complete items job, refresh metadata, pack, inspect every round4
sheet and confirm rendered containment, per-portion checks, icon pairs and atlas
budgets. The earlier T-18 request remains open.


## Round 5 — metadata-independent items freshness (TR-041)

Round 4 committed a successful render, but refreshing pixel-derived containment
footprints changed pipeline.json after the stamp was written. Packing succeeded;
the sheet correctly refused the resulting stale stamp. The items stamp now omits
only containmentFootprints on the tabao-rush-items set and bakedOutline on its
frames. All other config fields and source inputs remain significant. Other jobs
retain their existing byte-based stamps. Tests cover derived-field freshness,
real config/source/argument staleness, restoration to freshness and authenticated
legacy migration refusing changed sources or output bytes.

The committed round-4 legacy stamp was authenticated against its committed source
files and pre-refresh parent config, then migrated without rendering. Current real
inputs and every declared output byte matched that commit. Only the stamp changed;
no PNG or metadata was edited. The reproducible integrator sequence is:

```sh
python3 tools/assets/pipeline.py --migrate-items-stamp 240c5c75beda81255ffd8fc3391b581472fe8d80
python3 tools/assets/pipeline.py --check-stale --only items
python3 tools/assets/pipeline.py --refresh-item-metadata
python3 tools/assets/pipeline.py
python3 tools/assets/item_sheet.py round5
```

For future source changes, use the Round 4 render command, then refresh, pack and
sheet once. Migration refuses changed real inputs rather than claiming those
pixels came from new settings. ART-PIPELINE documents the exact exclusion and
migration contract. The five authorised checks and their load gates are recorded
in source-checks/ROUND-5.md.

### Close-out and Requests

Pipeline fault fixed; integrator still owns packing, sheet generation, visual
review and atlas budgets. The earlier T-18 request remains open. No Blender,
render, PNG edit, full verify, whole-suite Vitest, UAT, performance run, install,
memcheck, commit or merge was performed in Round 5.
