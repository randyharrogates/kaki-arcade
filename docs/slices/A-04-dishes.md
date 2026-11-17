# A-04 — Ingredients, dishes and order icons (TR-040, TR-041)

## Scope and ownership

Original scripted hawker food in the chosen chunky toy, matte style. Item frames use
89 × 89 pixels, the 60° orthographic camera, 120 pixels/world unit and anchor
[44.5, 44.5]. Seven order icons use 55 × 55 pixels and the D-134 55° camera.
Reachable raw/chopped/cooked/burnt appearances and the bread spread history variant
are derived independently from the simulation in tools/items.test.ts. The manifest
and source directory contain exactly those frames, containers, dishes, icons and
portion layers. No new dependencies or external art are used.

The integrator owns commits for rounds 8 and 9, all Blender renders, evidence and
independent visual review. Round 8 was committed and rendered by the integrator.
Round 9 is a source-only hand-off for the integrator to render and commit; Codex
has made no commit. D-141 is recorded in docs/DECISIONS.md; remaining visual work is deferred under D-145.

## Round 8 and integrator review

Round 8 replaced rojak's lattice with short drizzles and peanut flecks, enlarged
turnip, added chicken skin caps, enlarged the kaya side cup, and introduced
servedComposition, contentCompositions and portionScales metadata. The integrator
moved the drink-side slot to (.15, .02, .06) and satay to (-.10, -.05, .05), updating
the matching pipeline anchors before rendering. The frame-edge alpha guard names
each clipped edge (left, right, bottom, top).

That render exposed a fixed kopi on teh kaya toast and two different cup silhouettes
for the fixed dish and the plate content override. The review measured portions
crossing the plate outline/rim: kaya side cup 9/15 pixels, plate drink override
24 pixels outside, and satay 9/4 pixels. These findings drive round 9.

## Round 9 changes

- Kaya toast now exports servedComposition per drink, with bread followed by exactly
  the plate contentCompositions cup/liquid layers. Teh selects portion-teh-cooked;
  kopi selects portion-kopi-cooked. Kopi-teh retains its cup-based variants.
- After rendering the canonical layers, the fixed kaya reference and the legacy
  portion-drink-side-clean are assembled from the published rimmed clean cup and
  kopi liquid. The fixed reference therefore uses exactly the same cup pixels as
  plate + contentCompositions.kopi. No second soft cup silhouette is used in it.
- Drink-side moves to **(.08, -.04, .06)**, giving PNG anchor **[54.5, 45.5]**.
  Both plate drink anchors and both clean/dirty content overrides match. Liquid
  anchors are **[54.5, 35.5]**; cup and liquid originally used scale 0.68; round 10 replaces them with final-size side frames used at scale 1.
- Satay moves to **(-.10, -.03, .05)**, giving PNG anchor **[32.5, 44.5]**.
  All stored slot anchors follow slot_anchor's rounded projection formula.
- New containment validation checks every accepted generic portion, every content
  override layer and every served-drink variant against the clean container's
  opaque pixels excluding rim ink. At most **two offending pixels per layer** are
  allowed, including off-canvas pixels. Errors identify the container, composition,
  layer and offending count. Rendering checks freshly generated PNG footprints
  before publishing; unit tests use full-resolution row-bitset footprints recorded
  in pipeline.json, preserving holes and rim pixels without Blender.
- The existing ≥4% visible-share check, every-layer removal/10 px shift rejection,
  colour composition check, silhouette check and frame-edge check remain in place.
  Unit tests exercise the moved satay and kaya layers with existing source pixels,
  verify the exact fixed cup composite, reject displaced overrides and pin both
  drink variants. The Python test-count assertion accepts any positive count.

## Round 9 validation (historical)

| Command | Result |
|---|---|
| `python3 -m py_compile tools/blender/items.py tools/assets/pipeline.py` | Passed, exit 0 |
| `python3 -m unittest discover -s tools/assets -p "test_*.py"` | Passed, 21 tests, exit 0 |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/items.test.ts tools/assets games/tabao-rush/src/rules` | Passed on exact-command retry: 262 tests in 19 files, exit 0, 252.33 s. First run: 261 passed, one unchanged recipe conformance test exceeded its 120-second timeout |
| `pnpm exec tsc -b tsconfig.build.json` | Passed, exit 0 |
| `pnpm exec eslint tools/items.test.ts tools/assets` | Passed, exit 0 |

The table above records historical round-9 validation.
Blender, browser, UAT, full verify, whole-suite Vitest, dependency installation and
node_modules copying/linking are excluded. The current tree includes the committed round-10 PNGs (3843872).

## Follow-up

Under D-145, move these remaining items to a follow-up issue:

- Rojak is not yet a mixed heap; dressing reads as twigs.
- Chopped turnip reads as white shards, nearly invisible on a white plate.
- Chicken in chicken rice reads as pegs at 1×.
- Broth on a bare plate reads as a puddle.
- Food in a cup at 0.36 scale is barely legible.
- servedComposition, contentCompositions and portionScales have no documentation
  in ART-PIPELINE.md and no game-code reader. Document their coordinate/scale and
  selection rules there, and create a track-T issue to consume them.
- Produce and review a 1× evidence sheet.

## Round 9 Close-out and Requests (historical)

Integrator: render round 9, inspect the pixels and the fresh containment, visible
share, colour and edge-check results, save evidence, then commit the source and
renders. Visual approval and render budgets remain the integrator's responsibility.
No new render or visual pass is claimed by this source-only hand-off. Commit and
merge ownership remains with the integrator.

## Round 10 — side-cup outline (TR-040, TR-041; D-141, D-145)

Initially handed off as a source-only change; subsequently rendered and committed
by the integrator in 3843872. Added `portion-side-cup-clean`,
`portion-side-kopi-cooked` and `portion-side-teh-cooked` to the Blender table,
manifest and declared render outputs. Their geometry is authored at 0.68 of the
full cup size on the same 89 px canvas, with anchor [44.5, 44.5]. The empty side
cup receives the normal raster rim pass **after** rendering at its final size.
Liquids receive no baked outline. Plate content overrides and both kaya served
variants use the new cup and liquid frames at scale 1. Cup placement remains
[54.5, 45.5], liquid placement [54.5, 35.5]. `finish_side_cup` consumes these same
layers for the fixed kaya reference and legacy drink-side portion.

Added explicit `bakedOutline` metadata, preserved in packed output. Coverage and
atlas packing reject non-unit scales on outlined frames in fixed compositions,
served variants, content overrides and generic portion slots. A unit test checks
both shrinking and enlarging across all four paths. Existing containment limits,
visibility and pixel checks remain strict. The containment unit test compares recorded footprints with committed PNGs before
checking containment. Round 12 refreshes all four side-portion records from those
PNGs; no substitute downscaled cup or invented footprint is supplied.

### Round 10 source hand-off validation (historical)

The prerequisite command `tools/agents/memcheck.sh agent`, executed from
`/Users/randy/projects/personal/web-apps/kaki-arcade`, failed with exit 1:
`sysctl: sysctl fmt -1 1024 1: Operation not permitted`, followed by an arithmetic
error because `hw.memsize` was unavailable. It never reported `ok to start`.
`uptime` reported 1-minute load 3.85 (under 8). No test or typecheck command was
started because the required memory gate could not pass in this sandbox.

All five requested commands remain unrun: Python py_compile, Python unittest
discovery, the targeted Vitest command with VITEST_MAX_WORKERS=2, build TypeScript
checking, and targeted ESLint. No render, browser, UAT, install, full verify,
commit or merge was run. At that hand-off the new PNGs were absent; they are now committed in 3843872.

### Round 10 source hand-off Close-out and Requests (historical)

Integrator: render the three new final-size frames and regenerate the fixed kaya
reference and legacy portion, refresh containmentFootprints from the new PNGs,
run the five authorised checks after a successful memory/load gate, and inspect
rim/handle continuity at 1× and fixed/composed cup equality. This hand-off claims
source changes only; automated and visual validation remain outstanding because
the sandbox cannot satisfy the mandatory memory prerequisite.

### Round 11 Close-out and Requests

TR-040/TR-041: the packing fixture now includes transitive composition frame
references. The pipeline reports a ValueError naming the owner and missing frame
instead of leaking a KeyError; regression coverage exercises fixed, content and
served compositions. The Vitest wrapper accepts a positive Python test count
instead of the stale literal 21, retaining exit-status and OK checks.

All five checks authorised for round 11 pass. Results and load readings are in
`uat/evidence/A-04-dishes/round11/REPORT.md`. No render or visual validation was
performed. Requests: integrator review; no additional implementation request.

## Round 12 — metadata and regression checks (TR-040, TR-041; D-145)

The round-10 render in commit 3843872 produced the side cup, kopi and teh side
portions at final size, used at scale 1. Atlas tabao-rush-items-0 was 254 × 940,
234,944 B encoded and 955,040 B decoded. These PNGs are committed.

Refreshed the legacy drink-side and all three final-size side footprints from
committed PNGs. Tests now compare every recorded footprint with its PNG before
containment validation, compare every item frame's bakedOutline flag with outline
ink in its PNG, and run all test classes when invoked directly. Plated dish flags
now reflect their rimmed render output. ART-PIPELINE.md documents bakedOutline.
The Vitest wrapper already has no redundant toContain('OK') in its pipeline test.

Removed the test-only export of finish: the coverage graph now exercises the
exported advanceStations completion transition with a completed station.

### Current-state Close-out and Requests

Metadata and regression fixes are ready for integrator review. No render or visual
approval is claimed in round 12; D-145 visual deferrals remain open. For A-10:
satay sits at the rim tolerance, with two offending pixels at (17,65) and (18,65).
Preserve and consume the documented bakedOutline flag and unit-scale restriction.
No commit or merge was made. Round-12 command results are recorded below.

| Command | Result | Pre-start 1-minute load |
|---|---|---|
| `python3 -m py_compile tools/blender/items.py tools/assets/pipeline.py tools/assets/test_pipeline.py` | Passed, exit 0 | 4.96 |
| `python3 -m unittest discover -s tools/assets -p "test_*.py"` | Passed, 25 tests, exit 0 | 4.96 |
| `python3 tools/assets/test_pipeline.py` | Passed, 25 tests, exit 0 | 5.02 |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/items.test.ts tools/assets games/tabao-rush/src/rules` | Passed, 263 tests in 19 files, 212.72 s, exit 0 | 7.59 |
| `pnpm exec tsc -b tsconfig.build.json` | Passed, exit 0 | 6.91 |
| `pnpm exec eslint tools/items.test.ts tools/assets games/tabao-rush/src/rules` | Passed, exit 0 | 6.92 |
| `pnpm run lint:design` | Passed, 377 files scanned, exit 0 | 6.85 |
