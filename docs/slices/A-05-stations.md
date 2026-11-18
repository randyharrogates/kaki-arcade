# A-05 — Stations

TR-030, TR-031, TR-010. Branch `issue/A-05-stations`.

## Plan and acceptance

Author script-only rounded matte toy fixtures using board 1C's day light,
60° orthographic camera and 120 px/tile. Share animated overlays across fixtures,
keep food separate, and publish placements for T-07. Pure tests cover simulation
coverage, geometry bounds, metadata, freshness inputs and packing. Integrator
renders, packs, opens every review image, publishes options and runs visual UAT.
No Blender, render, packing CLI, verify, UAT, perf, install or commit is run by
this issue agent, as explicitly instructed in the brief.

## Fixture and state inventory

| Simulation kind / fixture | Recognition geometry | State coverage |
| --- | --- | --- |
| chop | handled wooden board | empty, working, done, on-fire |
| wok | shallow wok with pale steel interior and lateral handle | all five |
| pot | low wide pot with lid, knob and two side handles | all five |
| grill | seven broad grate bars | all five |
| rice | tall rounded cooker, domed lid and contrasting front panel | all five |
| drinks | two tall brewing vessels and spout | empty, working, done, on-fire |
| plating | single plate on worktop | empty, working, done, on-fire |
| sink | recessed basin and raised tap | empty, working, done, on-fire |
| bin | tall square bin and dark opening | empty, on-fire |
| serving | hatch uprights and lintel | empty; fire-safe |
| dish-rack | three stacked plates and rack uprights | empty; fire-safe |
| return-counter | dirty plate on counter | empty; fire-safe |
| ingredient-crate | wood crate with four neutral stock placeholders | no supported states; not a simulated station |

All five = empty, working, done, burning, on-fire. Only reachable states are
provided. Passive stations show empty only; bin can catch fire by spread.
Ingredient crates are level tiles, not `StationType`; T-07 substitutes actual
item sprites for placeholder stock.
The extinguisher is carried equipment, not a new station type.

## Readability argument and review (superseded by round 8)

Empty = open tray outline; working = hourglass; done = broad tick; burning =
warning triangle with exclamation plus smoke; on-fire = jagged flame silhouette
only; T-07 places A-07 effect-fire at anchors.fire [96,120]. Each icon has an ink/cream dual-contrast plaque with a
34 px interior, independent of hue. The progress track is 89 × 13 px with eight
separate outlined cells. Eight independent fill sprites add occupied blocks
left to right: `floor(clamp(progress / total, 0, 1) * 8)`. At completion switch to
the done tick. The bar's length and block count provide the non-colour cue.

These dimensions are an authoring argument, **not a proven 3 m visual pass**.
The integrator must inspect silhouette, clipping, cue overlap, matte lighting,
contrast and progress discrimination on the rendered 1×/4× light/dark sheets,
all greyscale sheets, and all five 1920 × 1080 TV check frames per theme. View
native-size TV frames full-screen at 3 m; do not enlarge them to claim success.
The sheet labels are diagnostic captions, not gameplay text. Examine progress
at all nine fill levels and both four-frame effect strips. Reduced motion uses
smoke-2 and retains the shape cue; lower detail retains the static effects
needed to communicate fire even when optional particles are disabled.

## Source and runtime metadata (superseded by round 8)

`tools/blender/station_geometry.py` is the pure source for every fixture shape,
palette, footprint, effect sample and placement; `stations.py` builds it using
`kalib.py`. Each job writes its own PNGs and `frames.json`, never pipeline.json.
The pipeline stamps its declared outputs only after success. All helper bytes
are explicit fingerprint inputs. No .blend or hand-made generated asset is needed.

31 frames: 13 bodies, five cues, track, eight progress fills and four smoke samples. No flame animation. All use an untrimmed 192 × 192 canvas, with anchor `root` at
[96,128]. Named `item`, `progress`, `cue`, `effect` anchors are source pixels;
`footprint` is a world-space [left, back, width, depth] rectangle. Metadata is
preserved under the packer's existing `metadata` field. `stateLayers` names
initial layer frame IDs; smoke animation replace their initial sample.
Draw every overlay at the body's root (all frames share the same coordinate
system), then draw food by aligning its own anchor to `item`. The named overlay
anchors identify feature positions, not additional translations. Layer order: body, food, fire, effect, progress, cue. Effects may cover food but must clear the plaque. Never show both a baked static body and
the body sprite. A-06 can import `geometry()` to bake the body and static shadow;
only state layers then need runtime draws. Shadows are not added at runtime.

The manifest's existing halfRule halves rects, sourceSize, trim and named anchors;
footprint and state IDs stay unchanged. A half-detail canvas therefore draws at
2× its stored size to maintain the same TV geometry. T-07 consumes this metadata;
no renderer or contract is modified in A-05.

## Budget estimate

Use **lossless**, as required for hard-edge, multi-frame sprite pages. D-172's
lossy cook work is separate and is not extended to station pages. All 31 full
192 px squares total 1,142,784 pixels (4.36 MiB raw RGBA); half detail is a quarter
of that area. Packing padding and page shape add overhead; the synthetic test
caps full decoded allocation at 16 MiB and requires pages ≤2048 px. Actual trimmed
art should be considerably smaller. Planning allowance: 0.15–0.5 MB transfer and
under 16 MiB decoded full detail, pending rendered measurement. Against the brief's
~2.0/8 MB current transfer baseline, the upper estimate leaves ~5.5 MB for levels,
heads and other art. This is an estimate, not measured compliance. Full and half
round reports from the integrator's pack are authoritative for PERF-023/024.

## Choices for the integrator

Use choices-{light,dark}-1x.png and their 4x/greyscale versions. Round 4 below
supersedes the earlier layout/cue/motion recommendations. Supply --fire for the
actual A-07 composite; missing fire is explicitly marked, never visual acceptance.

## Integrator commands

Run one render job at a time with the normal memory/load checks. These commands
render only that stale job and deliberately do not pack incomplete other sets:

```sh
python3 tools/assets/pipeline.py --render --only station-chop --no-pack
python3 tools/assets/pipeline.py --render --only station-wok --no-pack
python3 tools/assets/pipeline.py --render --only station-pot --no-pack
python3 tools/assets/pipeline.py --render --only station-grill --no-pack
python3 tools/assets/pipeline.py --render --only station-rice --no-pack
python3 tools/assets/pipeline.py --render --only station-drinks --no-pack
python3 tools/assets/pipeline.py --render --only station-plating --no-pack
python3 tools/assets/pipeline.py --render --only station-sink --no-pack
python3 tools/assets/pipeline.py --render --only station-bin --no-pack
python3 tools/assets/pipeline.py --render --only station-serving --no-pack
python3 tools/assets/pipeline.py --render --only station-dish-rack --no-pack
python3 tools/assets/pipeline.py --render --only station-return-counter --no-pack
python3 tools/assets/pipeline.py --render --only station-ingredient-crate --no-pack
python3 tools/assets/pipeline.py --render --only station-overlays --no-pack
python3 tools/assets/pipeline.py
python3 tools/assets/station_strips.py --fire assets/src/tabao-rush/effects/fire/fire-0.png --steam assets/src/tabao-rush/effects/steam/steam-3.png --out uat/evidence/A-05-stations/rendered
```

## Open questions and Requests

- Validate the cue plaque and 13 px track at 3 m, especially half-detail rendering.
  Increase authored geometry and rerender if Randy cannot distinguish progress.
- Final geometry, per-kind food height and layering need A-06/T-07 scene review.
- Round 2 scopes the items config digest to `tabao-rush-items`, excluding
  `containmentFootprints` and per-frame `bakedOutline` as before. Items and its
  imports read no global pipeline settings. Items will be stale once after this
  change (expected: one re-render). Station jobs read no pipeline config; their
  script, geometry, kalib and arguments remain their render inputs. Nothing else
  needs re-rendering because of this change. Legacy raw-config hashing is retained
  for authenticated migration checks.
- Source outputs and stamps are present from the integrator’s round-3 render; round-4 refresh is pending.
  Publishing, visual approval, full verify and measured budgets remain outstanding.

## Close-out

Implementation provided for TR-030/031/010 in `station_geometry.py`, `stations.py`,
`station_strips.py` and station pipeline jobs. Tests: `StationGeometryTests` and
`StationPipelineTests`, plus existing permitted suites. Evidence/status:
`uat/evidence/A-05-stations/REPORT.md`. No claim of completed visual acceptance;
no tracker edits, dependency changes, commit or generated render assets.

Final permitted checks: Blender pure suite **20 passed**; assets suite **72 passed**;
ESLint tools **passed**. Freshness exits 1 with 14 missing station jobs and the
existing items config-hash mismatch; all other existing jobs fresh. Detailed
results/load checks and synthetic decoded numbers are in the evidence report.

Simulation-to-art selection for T-07: `fire` takes priority → on-fire; `burnt` → burning; otherwise use the public empty/working/done status. The
`warning` flag has no A-05 art; A-07 sparks remain the warning effect. Actual food
appearance remains an item-sprite responsibility. Zero `total` never divides:
select the public status first and fill progress only for working with total >0.

Round 2 pure regression checks: Blender suite **20 passed**; assets suite
**73 passed**. The orchestration fixture now supplies the owned items set rather
than an empty config because scoped hashing validates exactly one such set.
Unrelated set/job/pack-setting changes leave items and station digests unchanged;
authored item fields and station geometry/kalib/arguments invalidate their jobs.
Freshness exits 1: items `content stamp differs`, 14 station jobs `missing output`,
and all 11 other jobs fresh. No render or stamp migration was performed.

## Round 3 review fixes (superseded by round 8) (TR-030, TR-031, TR-010)

M1: screen_box passes rotation into rbox in stations.py. kalib.py is unchanged
against base; cards, items and cook jobs require no rerender for this fix.
Rendered-pixel anchor regression reads real PNG alpha bounds and frames.json;
stale round-2 pixels are expected to fail until station-overlays is rerendered.

M2: working is a closed five-point bow-tie hourglass, covered by a pure AST test.
M3: no flame animation or job outputs remain. On-fire stateLayers contains only
station-cue-on-fire. T-07 draws A-07 effect-fire at anchors.fire [96,120];
never stack another station fire. Burning smoke uses independent matte/transparent
shader mixes at .38 opacity and mid-grey #888888, following A-07's particle
approach. Puffs translate upwards with constant dimensions, without size flicker.
M4/M5: station_strips prepares food-loaded native/4x A/B light/dark/greyscale
boards, labels previous measured costs (not new measurements), and static-zero
versus 8 fps smoke strips plus animated GIFs. Randy's choice remains open.
S1: low wide two-handled pot and taller cooker with domed lid/front panel.
S2: cue remains [96,24] pending rendered overlap review. The 42 px outer plaque
begins at y=3; lifting it 13 px would clip 10 px off the canvas. Do not silently
lift it. If corrected pixels still overlap tall fixtures, integrator must resolve
canvas/fixture placement and preserve A's 34 px separation before approval.
S3: whole 8x8 cell fills; half-detail evidence generator includes all nine levels.
S4: crate []; serving/rack/return empty+done; bin omits impossible working;
plating keeps working because stationAction performs timed assembly there.
S5: 34x34 plaque interior, 42x42 outer with 4 px border is the explicit exception.
The 89 px track retains 10.5 px pitch: 8 px cells at 13 px pitch require 99 px
before any border, and would break B's 89:55 comparison. Costs/draw calls are
identical between A and B because only placement changes.
S6: no commits or generated-output changes by this agent, per round-3 instruction.
Existing item PNG/stamp modifications and untracked station/evidence files were
present at entry and have been left in place. Integrator owns rendering and commit.

### Round 3 rerender jobs

For each job below, sequentially run
`python3 tools/assets/pipeline.py --render --only <job> --no-pack`:

- station-chop
- station-wok
- station-pot
- station-grill
- station-rice
- station-drinks
- station-plating
- station-sink
- station-bin
- station-serving
- station-dish-rack
- station-return-counter
- station-ingredient-crate
- station-overlays

Then pack with `python3 tools/assets/pipeline.py` and regenerate evidence with
`python3 tools/assets/station_strips.py --fire assets/src/tabao-rush/effects/fire/fire-0.png --steam assets/src/tabao-rush/effects/steam/steam-3.png --out uat/evidence/A-05-stations/rendered`.
Obsolete flame PNGs from the previous render are no longer referenced by
frames.json or the job; round 4 deletes those obsolete source files.

### Round 3 Close-out and Requests

Code and pure tests supplied; render/visual acceptance remains open. Integrator:
rerender jobs, run rendered-pixel regression, inspect every new evidence image,
check S2 overlaps and greyscale pot/rice recognition at 1x, measure refreshed
full/half atlas budgets, and publish the combined cue/layout/motion choice to
Randy. No choice or requirement completion is recorded by this issue agent.

Round 3 permitted check results: pure Blender **22 passed**; TypeScript build
**passed**; assets **75 tests with six failing rendered-pixel subtests** against
old PNGs; Vitest **577 passed, one failed** (the assets-suite wrapper, same stale
PNG failures). All starts had 1-minute load below 8. Rendering is deliberately
left to the integrator; tests must be rerun after corrected overlays exist.

## Round 4 (historical; superseded by round 8) (TR-030, TR-031, TR-010)

31 frames; no A-05 flame animation. Four orphan flame PNGs deleted. Source
outputs exist from round 3; refreshed round-4 pixels and metadata await integrator.
kalib.py is unchanged. Only the fourteen station jobs listed above need rendering.
Body metadata now emits layerOrder: body, food, effect, progress, cue. State layer
IDs remain references, not painter order. All authored overlays share the root;
food aligns its own declared item anchor to station item. A-07 fire aligns origin
[48,77] to effect [96,120]. Smoke geometry moves down 40px with that anchor and
has reducedMotionFrame station-smoke-0. Pure bounds tests cover every burnable kind.
The on-fire path including its stroke radius stays within y11–37.

Choice 1 shows A/B on wok, pot, rice and plating with anchored food, plus cream
and gold fills on an ink track. A covers only the top edge of food. Choice 2 shows
all five cues, no on-fire cue (A-07 flame silhouette is the cue), and a phi plaque:
outer 68:42 and interior 55:34. Exceptions explicitly offered: 42px square outer,
34px interior, 4px border; 10.5px cell pitch; phi plaque 6.5px horizontal / 4px
vertical border. B compares 89px width to 55px separation. Replacement polarity
and plaque pixels need a replacement pack measurement; placement alone costs no bytes.
Choice 3 is still-only: eight packed smoke frames require changing pipeline.json's
declared outputs/animation, outside this brief's paths. The current four-frame loop
is not recommended. No equal-byte claim is made. Still needs one packed frame.
Packed half-atlas evidence reconstructs trim/sourceSize and draws at 2x.

Measured round-3 station full: 222,986 B transfer / 1,232,064 B decoded
(0.22 MB / 1.23 MB); half 66,430 B / 308,016 B. Branch round: 5,362,668 B
transfer / 54,042,864 B decoded. These precede round 4; remeasure after packing.

### Close-out and Requests

Integrator: render fourteen station jobs, pack, supply an actual A-07 fire frame
with --fire to station_strips, review every output and publish the choices. TV at
3m, tall-fixture cue overlap and kind recognition remain open. A-06 follow-up:
static bodies may be baked into level backgrounds rather than charged as sprites.
A-07 owner should remove its stale claim that A-05 supplies animated flames.
No Blender, verify, UAT, perf, install, dependency link or commit run in round 4.

Round-4 final checks: assets 75 passed; station geometry 8 passed; Vitest 2 files /
5 tests passed; ESLint passed. Every start was below load 8. No cook-body failure.
See REPORT.md for measured start loads and the distinction from reviewer results.

## Round 5–6 (TR-030, TR-031, TR-010)

This section supersedes historical placements, smoke descriptions, state sets and
measured costs above. Integrator decisions (a)–(e), logged at merge under D-142:
states the rules reach only; separate fire anchor [96,120] with effect at the
food [96,77]; closed vessels hide food; light bin lip against #2B2118 (contrast
10.4–10.6:1); three-tongue on-fire glyph inside y 11–37 and the burning base
on the inner border. Plaque layers at depths 1.975 / 2 / 2.025 / 2.05.

The integrator resolved the steam/bar conflict by removing effectClip and
effectFade. Painter order is body, food, fire, effect, progress, cue. Steam,
sparks and smoke rise behind the bar and plaque without clipping or fading.
Burning draws no bar. Smoke uses overlapping translucent shells, growing lobes,
13.5 px upward travel over four samples, and diminishing opacity upward and over
the loop. Its authored bounds stay below the plaque's y46 edge. Rendered bounds,
visible steam counts and still/loop visual comparison are recorded below from review 7.

Working shows raw food (chopped kway teow on wok); done shows finished food;
burning shows burnt food. Pot and rice stay closed. Drinks item anchor is
[96,101], in front of the urns; its effect remains [96,77]. Progress and cue rows
are sourced from station_geometry.py constants. Source layerOrder names fire; round 7 adds it to the packed metadata allowlist.

T-07 mapping: stationViews status `burnt` → burning cue, `fire` → on-fire cue;
`warning` has no A-05 art and is left to A-07 sparks. Static bodies may move into
A-06's baked backgrounds. Art palette additionally includes wood #C7A16A and
smoke #888888; these are art colours, not UI tokens. Costs: see REPORT.md.

Choice-3 PNG cells are labelled. Reduced motion displays smoke-still-*.png in
place of the GIF using picture/source. Each board option names its φ proportions
(or says none); costs print numeric transfer and decoded bytes.

### Round 6 Close-out and Requests

Code and committed-file pixel regressions supplied. Integrator must render all
15 station jobs (shared source fingerprints changed), pack, then run station_strips
with local A-07 fire-0.png and steam-3.png (round 7 supersedes the frame-1 sample). No strips generated before rendering.
Review the plaque's four edges, steam on all automatic stations, smoke travel and
still/loop comparison, drinks seating, and the refreshed board before review 7.
Round-6 measured numbers are recorded below; visual acceptance remains pending. No tracker edits,
Blender, verify, UAT, perf, installation, dependency linking or commit in round 6.

## Round 8 (TR-030, TR-031, TR-010)

This section supersedes earlier placements, state sets, smoke recommendations,
render requests and cost statements. The integrator renders round 8 and regenerates
the sheets. Round 7's images were committed; they use steam-3 and smoke-2 for reduced
motion. Round 8 changes progress materials to unlit scene-linear emission with
Standard view transform: gold #E0A63A; ink #2B2118. Measured round-7 track (64,53,47)
and empty mark (70,58,50) fail the ink ±8 tolerance, so both also become unlit.
Cream cells use the same unlit transform to retain the authored palette.

The board uses explicit ink recolours for A/B ink comparisons, and polarity=None
for A / gold (shipped), the single shipped-gold baseline. The former second gold
row is an ink repeat. Smoke cells are labelled smoke-1 (loop) and smoke-2 (still).
The unused boardOnly key is removed; a test excludes phi output frameFiles from
all sets. Phi remains a render job for the comparison board.

Round-7 measurements (review 8; historical baseline, not round-8 acceptance):
- Station page 374×780: 206,564 B transfer / 1,166,880 B decoded.
- Half page 187×390: 56,454 B / 291,720 B decoded.
- A-05 tree Tabao Rush: 2,268,240 / 8,000,000 B (PERF-023),
  52,178,336 / 256,000,000 B (PERF-024); half 968,356 / 13,044,584 B.
  These cap-only-head totals are not merged-tree totals.
- Steam-3 visible pixels differing by ≥8 levels on both grounds:
  wok / pot / grill / rice = 114 / 170 / 150 / 179; floors 110 / 165 / 145 / 175.
  Steam is mostly hidden behind the bar and plaque and reads weakly on pale wok.
- Gold fill centre (59,58): (221,184,126), the lit tone superseded by round 8.
- Smoke tops 63 / 59 / 54 / 49, 14 px rise; frame 0/3 masks differ by 495 px.
  GIF frames versus smoke-2 still: 426 / 331 / 20 / 350 px light,
  430 / 334 / 21 / 357 px dark. Reduced motion uses smoke-2.
- Plaque is 42 px on the TV; cells 8 px, pitch 10.5 px, empty mark 4 px.

Round-8 pack record — integrator fills these slots from the regenerated pack:
- Station full: 374×780, 206,300 B transfer / 1,166,880 B decoded.
- Station half: 187×390, 56,578 B transfer / 291,720 B decoded.
- Tabao Rush on this branch (merged with main, all Tabao Rush atlases): full 2,426,954 B transfer / 55,408,032 B decoded; half 1,046,240 B / 13,852,008 B. The pack reports PERF-023/024 passed (9 atlases in the whole pack, 8 of them Tabao Rush; manifest 391,445 B).
- Gold: progress cells on the sources median (225,167,58); on the light and dark station sheets (224,166,58); on the light and dark overlay sheets (225,167,58), all within ±6 of #E0A63A. Ink track median (44,34,25), within ±8 of #2B2118. The cue plaques' ring reads (59–63, 50–53, 42–46) after shading; the plaque is not part of this palette target.
- Integrator looked at stations-light-1x, overlays-dark, tv-3m-burning-dark and progress-half-light-greyscale: every station's cue reads at native size on screen (the 3 m TV check is owed); filled cells are flat gold on the ink track and in greyscale the empty cells keep their ink mark, so 0/8 to 8/8 stay distinct without colour. A human 3 m check on a real TV is still owed (S-05).
- Steam-3 visible pixels by the floors' own method (`test_stations.py`, bar and plaque boxes excluded, ≥8 levels on both grounds): wok / pot / grill / rice = 114 / 170 / 150 / 179 of 187, unchanged from round 7 and above the floors 110 / 165 / 145 / 175 (review 9 recount).

Smoke frame 3→0 resets down 14 px; fade masks the jump, retained as a T-07 caveat.
Visual acceptance and merged verification belong to the integrator.


**T-07 contract:** [ART-PIPELINE.md — Station frames](../ART-PIPELINE.md#station-frames)
is authoritative: all 31 frames have an untrimmed 192×192 canvas, top-left pixel
origin, +x right/+y down, 120 px per tile; anchor = anchors.root [96,128], the
floor-centre 60° projection shared with cueLayout. Draw top-left = rootScreen −
anchor×s + trim×s, size rect×s, s = tilePx/120; every overlay shares the body root.
Named anchors are feature positions (offset = anchors.X − anchors.root), never
extra translations; move cue, track and cells by one shared delta. Use the doc's
alpha >128 root-relative opaque boxes for collision, not padded rects: plaque
−22..+21 / −126..−83, ink ring ±21 / −125..−83, track −45..+44 /
−76..−64, cell centres −37+10.5·i / −70 (8×8 gold, 4×4 ink marks). The doc
records constant collision boxes 44×44 and 90×14, 5–6 px plaque/bar gap, block
−126..−63, pulse 1.05 about −94.5 → −127.6..−61.4, north floor edge −52,
pulsed top 75.6 px above it, plaque bottom 30 px above it, bar 25..11 px above it,
back-top edge −91 with 8–9 px overlap, and about 76 px of the 203 px north margin
needed at 1920 (check HUD). Align A-07 fire origin [48,77] to fire [96,120],
root −8 (flame x ±27, y −78..−4, ≥4 px plaque clearance); steam [32,53] and
sparks [32,48] to effect [96,77], root −51; food's own anchor to item [96,77],
drinks [96,101]. Draw metadata.layerOrder body, food, fire, effect, progress,
cue; stateLayers names base layers, add progress 0..N−1 with
N=floor(clamp(p/total,0,1)·8), switching to done at 8. Burning starts smoke-0,
plays smoke at 8 fps loop, reduced motion uses reducedMotionFrame smoke-2.
State precedence is fire→on-fire, burnt→burning, otherwise public status;
warning uses A-07 sparks. Half detail halves rect, trim, sourceSize and every
anchor: root [48,64], cue [48,12], progress [48,29], fire [48,60], effect/item
[48,38.5]; draw at 2×.

The earlier “effect point” instruction now means anchors.fire, not anchors.effect.
Known A-06/T-07 scene issue: plates are baked into dish rack (three), plating (one)
and return counter (dirty plate) bodies, even where the rack/counter may be empty.
Smoke frame 3→0 resets down 14 px; fade masks the jump; retain this T-07 caveat.

### Round 8 Close-out and Requests

No Blender, pipeline renders, verify, UAT, perf, install or commit run by Codex.
Integrator: render the stale station jobs, pack, regenerate sheets/board, inspect
all outputs including gold/ink palette samples and greyscale progress, fill the
round-8 measurement slots above, and run merged verification. Human 3 m readability,
tall fixtures, plate occupancy and merged totals remain integrator work.


Round-8 permitted checks (pyenv 3.11.5): Blender unit tests 35 passed (launch
load 5.0322); station assets 11 tests, three expected palette subtest failures
against committed lit PNGs (launch load 4.9492); check-stale exit 1 (launch load
4.9492), exactly the 15 station jobs below stale by changed content stamp; all
other jobs fresh. Palette failures require station-overlays rendering.

Integrator commands, sequentially, with the normal load/memory checks:

```sh
python3 tools/assets/pipeline.py --render --only station-chop --no-pack
python3 tools/assets/pipeline.py --render --only station-wok --no-pack
python3 tools/assets/pipeline.py --render --only station-pot --no-pack
python3 tools/assets/pipeline.py --render --only station-grill --no-pack
python3 tools/assets/pipeline.py --render --only station-rice --no-pack
python3 tools/assets/pipeline.py --render --only station-drinks --no-pack
python3 tools/assets/pipeline.py --render --only station-plating --no-pack
python3 tools/assets/pipeline.py --render --only station-sink --no-pack
python3 tools/assets/pipeline.py --render --only station-bin --no-pack
python3 tools/assets/pipeline.py --render --only station-serving --no-pack
python3 tools/assets/pipeline.py --render --only station-dish-rack --no-pack
python3 tools/assets/pipeline.py --render --only station-return-counter --no-pack
python3 tools/assets/pipeline.py --render --only station-ingredient-crate --no-pack
python3 tools/assets/pipeline.py --render --only station-overlays --no-pack
python3 tools/assets/pipeline.py --render --only station-phi --no-pack
python3 tools/assets/pipeline.py
python3 tools/assets/station_strips.py --fire assets/src/tabao-rush/effects/fire/fire-0.png --steam assets/src/tabao-rush/effects/steam/steam-3.png --out uat/evidence/A-05-stations/rendered
```

The last command regenerates station/overlay/TV/half/choice sheets, smoke GIFs
and stills, and design-gate board images and HTML together.

Station retest after board-caption assertions: launch load 3.6431; 11 tests,
only the same three expected committed-palette subtest failures.

### Review 9 (integrator, at merge)

Review 9 found the art clean; its must-fix (REPORT slots) and text should-fixes are applied here. Accepted as known, not re-rendered:
- The board's "B / ink repeat" row duplicates "B / ink (89:55)", and the sheet caption still says "replacement estimate"; the board is the record of the gate, so it is left as rendered.
- The plaque ring is still lit (about (59–63, 50–53, 42–46)) while the bar's track is unlit (44,34,25): a slight brown step, accepted.
- `kalib.render` still assigns the AgX look after `stations.py` sets Standard; today the assignment fails harmlessly, and `test_committed_progress_palette` catches a change.
- The crate's ink rails vanish on the dark ground; for the A-06 scene review if a level floor is that dark.
- Earlier rounds' sections (round-4 refresh, round-1/2 check results, round-4 layer order) are historical.
