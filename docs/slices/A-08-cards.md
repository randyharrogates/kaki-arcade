# A-08 — Cards, Stage 2 final deck (PP-030, PP-031)

## Stage 1 history — scope and design gate

Stage 1 only: A Classic, B TV first, C Golden ratio. No final assets, runtime code,
tracker changes or selected face style. The explicit issue brief and CLAUDE rule 8 authorise
these scripts; ART-PIPELINE §6's older Claude-only scripting sentence is superseded by that
brief. Randy must choose from actual rendered options before Stage 2.

## Files and reproduction

- `tools/blender/board_cards.py`: Blender 5.2, shared kalib matte/day lighting, 60°
  orthographic camera, one rounded paper card with thickness, generated suit polygons and
  Blender's built-in Bfont. No downloads. Four K1 suit colours; phone's red diagonal back.
- `tools/boards/build_board_cards.py`: existing Pillow dependency; lossless WebP sheets,
  greyscale checks, five-frame B strip, 1080p table mocks, angular proxies and cost JSON.
- `tools/boards/board_cards_template.html`: fixed 1440 × 890 comparison board, three options,
  back and flip strip. Native proxy links accompany smaller board previews.

Run from repository root:

```sh
blender -b --factory-startup -P tools/blender/board_cards.py -- --out tools/boards/out/cards
python3 tools/boards/build_board_cards.py --out tools/boards/out/cards
```

Open `tools/boards/out/cards/board_cards.html`. Outputs are repository-ignored by the `tools/boards/out/` entry in `.gitignore`
(previous rounds relied on a local ignore). Both scripts reject output destinations outside this issue's folder.
No outputs are written to `uat/evidence` or `assets/dist`.

## Proportions, motion and readability assumptions

A/B match board 3's 150 × 205 card display box. C uses a true 1 : 1.618 model and
1.618 : 1 central rank/suit region heights; at the same 205 px table height it narrows to
127 px rather than overflowing the four-row layout. Classic Q uses an original geometric
crown instead of borrowed court art. Rows on the face sheets are A / 10 / Q; columns are
spade / heart / diamond / club.

B's five frames sample a 377 ms monotonic smoothstep turn at 0, 25, 50, 75, 100%.
The silhouette occludes the artwork at 90°; the back replaces the face across that edge.
A small sinusoidal lift supplies an arc without overshoot. These are review frames, not a
runtime mask implementation. Reduced motion should show the destination immediately.

The 3 m proxy assumes a 55-inch 16:9 TV at 3 m (about 23° wide), sampled at an explicit
50 pixels per degree. The full 1080p table is downsampled before cropping. This is a
repeatable comparison, not a calibrated observer test; board previews are scaled again
for space, so use native links and then test on the physical TV. Twelve example faces
occupy three rows, with four backs in the fourth. Side panels are layout context only.

## Cost model

Each option needs one ≤2048 × 2048 atlas for 52 faces + back + five shared B flip frames,
including 4 px padding per cell. A/B render tiles are 158 × 218; C is 158 × 251.
One decoded RGBA page is 16 MiB, below PERF-024's 256 MB whole-round ceiling, leaving
other assets to be counted. The complete deck is **not rendered** in Stage 1.

The composer estimates lossless WebP transfer as the mean of the twelve measured face
samples ×52, plus measured back/five flip frames, then adds 25% allowance. It flags
estimates above 8 MB or decoded memory above 256 MB. PERF-023's 8 MB is expressly a
Tabao Rush level budget: here it is only a comparison ceiling, not a new Peek Poker budget.
Actual atlas compression and the complete round must be checked after selection.
No defensible measured WebP estimate is available until Blender runs successfully.

## Validation and limitations

- Python compilation passed for both scripts.
- Compose smoke check passed with temporary synthetic fixtures: three sheets, greyscale
  checks, 1080p tables, angular views, strip, complete HTML substitutions and one atlas per
  option. Synthetic fixtures and outputs were removed; they are not design evidence.
- `pnpm run lint:design` passed (tools templates are outside its normal app scan).
- Blender 5.2.3 starts but crashes with exit 139 before script execution. Its log is
  `tools/boards/out/cards/render.log`; startup wrote the crash report to the OS temp folder.
  The required memory precheck also cannot read `sysctl hw.memsize` in this sandbox.
  No actual card renders or board screenshots were produced or visually approved.
- Round 1 external run: Blender 5.2.3, exit 0, 8.7 s. Supplied A/B sheets,
  C sheet, B ace, back and flip strip were opened: A/B were unusable camera crops,
  C showed the cards but was noisy; the back and flip frames were also cropped.
  The source's A/B orthographic scale was `205/15053` instead of a card-sized span.
  A zoomed into pips, paper and crown edges; B zoomed into paper or central artwork.
  B's white ace was a paper close-up, not a missing texture or style-specific exposure.
  All three styles already assign paper/ink geometry materials through the same path;
  there is no face image texture to lose. The shared paper noise feeds Base Color.
- Round 2 fixes the framing with one height/aspect/gutter rule (including back and
  flips), retaining C's camera, lights and Standard exposure explicitly at 0/gamma 1.
  All 42 small frames now use 64 Cycles samples and OpenImageDenoise, replacing four
  samples without denoising. This targets the five-minute M3 ceiling; actual duration
  and appearance need an external rerun and are not claimed verified here.
- Round 2 checks all 36 saved PNGs using Blender's image reader. Display luminance
  standard deviation must be at least .025, mean between .05 and .985, and opaque
  coverage between .70 and .99. Transparent gutters are excluded from luminance so
  they cannot make a blank paper tile appear varied. A failure exits the Blender
  process with status 1 even without `--python-exit-code`. Edge-on flips are excluded.
  Only a completed passing run writes `render_validation.json` with metrics, duration
  and hashes of all 42 inputs; the composer rejects missing or changed inputs.
- Round 2 validation is limited by request to Python compilation of both scripts.
  No Blender render, composer smoke run or full verification was run in Round 2.

## Close-out

Implementation prepared for the Stage 1 human gate, not approved final art. Recommendation
is provisionally B: it devotes most of the readable surface to rank and suit while keeping
the decided grid size. A has smaller reading targets; C loses width at the same grid height.
This recommendation needs rendered comparison and the physical 3 m test.

## Requests

Integrator: run the two commands above outside this sandbox, inspect every face and flip
frame, check the complete 1440 × 890 board for clipping, record actual render duration and
review measured sample-based costs in `costs.json`. Present the board to Randy and record
his choice in the shared decision log. Stage 2 stays gated.
Round 2 specifically needs a fresh successful `render_validation.json`; the supplied
Round 1 files cannot compose with the repaired composer. Confirm the 64-sample run stays
below five minutes on the M3 and review all greyscale and 3 m views again.

Local commit is blocked by sandbox permissions: `git add` cannot create
`/Users/randy/projects/personal/web-apps/kaki-arcade/.git/worktrees/A-08/index.lock`.
Integrator should commit these four files on `issue/A-08-cards` with
`feat(art): add Stage 1 card options board (PP-030, PP-031)` after review.

`pnpm verify` passed workspace, typecheck, ESLint and design lint, then was externally
terminated with SIGTERM (exit 143) during `vitest run`; it did not reach build/trace.
Full verification is incomplete, not a passing run. See ignored `verify.log` in the output
folder. Re-run `pnpm verify` outside this sandbox before integration.

## Round 3 — PP-030, PP-031

Inspected the integrator's round2-faces.jpg and all three saved sheets, back, flip
strip and generated HTML. The external Round 2 render passed its old checks in 60 s;
that pass did not establish correct framing or clean tile edges.

1. Replaced the assumed orthographic span with projection-calibrated framing at
   150 px card width: A/B tiles 176 × 231, C 176 × 269, including 13 px nominal
   margins. Faces, back and flip frames share this camera calibration. Neutral
   transparent shadow layers follow the same card and are baked into its alpha.
   Cost labels and atlas counts derive from the new measured input dimensions.
2. The saturated lines exist in the supplied rendered sheets, while the composer
   only copies RGBA tiles and draws no sheet grid. Shared lighting creates only
   lights/world, not coloured helper objects or neighbouring cards. The precise
   Blender raster fault cannot be proven without rerendering. Removed overlapping
   coplanar ink, explicitly triangulated concave boundaries, and disabled render
   borders/compositor/sequencer so these cannot contaminate sprite boundaries.
   Validation now rejects saturated visible colour or any alpha > .02 in the
   outer five pixels of every face, back and flip frame. Validation version 2
   prevents composing the old inputs. This needs external confirmation.
3. Clubs and spades use a 2D radial union of their origin-sharing lobes and stem,
   producing one triangulated outline, with no overlapping internal surfaces.
   Hearts already have one outline. Printed ink uses a flat emission material.
4. A queens use a separate original three-point crown above a large suit, without
   an overlapping paper cutout, gradient or copied portrait.
5. Sheet assembly checks equal tile sizes and uses an explicit four-column,
   three-row grid with 8 px gaps. C uses taller rows with identical column positions.
6. The 1440 × 890 HTML uses K1 felt #1D5741 and its single 4%-white diagonal
   weave, with K1 text/edge colours. Enlarged face previews retain all twelve
   faces per option; back, B flip strip and each option's 3 m proxy remain visible.
   The TV mock weave now uses the matching #265E49 paint.

Validation: only `python3 -m py_compile tools/blender/board_cards.py
 tools/boards/build_board_cards.py` and `pnpm run lint:design` were run; both passed.
No Blender, composer, verify, vitest or UAT run. Generated output files were not
changed. Integrator must rerender and compose externally, inspect all margins,
club outlines, queens and flip silhouettes, and confirm the board fits at 100%.


## Round 4 — PP-030, PP-031

Opened the supplied cards3-faces.jpg and 1440 × 890 cards3-board.png. The
integrator reports the repaired polygon tessellation rendered in 37.6 s and passed
Round 3 checks. That render still shows the reported A/B ink collisions and the
incorrect flip presentation; C is visually clean.

1. A tens now use a compact 4-2-4 pip field, with two columns of four and two
   centre pips. The field clears both index columns and leaves an index-height
   vertical margin below/above the corner ranks.
2. A crowns are horizontally centred inside the central field, inset from both
   corner indices. Reduced the large A ace/queen suits too: their bounding boxes
   otherwise intersect the small corner suits even when the silhouettes differ.
3. B uses the same measured rank region for A, 10 and Q. Actual Bfont bounds,
   including the Q tail, fit that region; the suit starts .08 card units below
   the measured rank bottom on every face. C layout is unchanged.
4. Flip rotation now composes the camera-facing tilt with the card-local Y turn,
   giving a genuinely edge-on, thickness-bearing midpoint. The footer shows all
   five frames in order with individual 0 / 25 / 50 / 75 / 100 % captions; the
   separate reference card is labelled Back. The saved strip retains the same order.
5. Before each face can render, every rank, corner suit, pip and crown is tagged
   and its actual geometry bounding box checked against every other ink object in
   card coordinates. Positive-area intersections raise with face/object/bounds
   diagnostics and use the existing enforced non-zero process exit. Paper,
   shadows and back decoration are excluded. Validation manifest version 3 makes
   the composer reject older renders that did not run this check.

Round 4 validation: only Python compilation of both scripts and
`pnpm run lint:design` were run; both passed. No Blender, composer, verify,
vitest or UAT run; no generated outputs changed.

### Close-out

Round 4 implementation is ready for integrator rendering and review. Actual
Blender font bounds, overlap-check results and final board appearance remain
unverified in this sandbox.

### Requests

Integrator: rerender and compose externally; review all 36 faces and all five
flip frames, confirm the 50% thin edge and caption order, and inspect the full
1440 × 890 board. A fresh version-3 validation manifest is required.

## Stage 2 — style B final deck (PP-030, PP-031)

The explicit Stage 2 brief selects integrator choice B, “TV first” (D-133 on main,
settled). It authorises this implementation without another confirmation.
Stage 1 source and historical notes above remain intact. ART-PIPELINE §6's older
Claude-only scripting sentence is superseded by the explicit brief and CLAUDE rule 8.

### Files and reproduction

- `tools/blender/cards.py` imports the stage-1 model, suit geometry, matte/day lighting,
  ink measurement and pixel checks from `board_cards.py`; keep both and `kalib.py`
  together. Only B is rendered. Ranks use the bundled D-150 DM Sans Bold font.
- `assets/src/pipeline.json` adds the lossless `peek-poker-cards` set and
  `peek-poker` preload round, preserving the existing empty round.
- `assets/src/peek-poker/cards/` contains the integrator-rendered 58 frames and
  validation JSON. The committed frames are the integrator’s round 7 DM Sans render (c007644).

From repository root, `pnpm assets --render` renders stale production cards and
packs the full and half lossless WebP atlases. The job is registered in
`assets/src/pipeline.json`, declares all 58 PNGs plus validation JSON, and includes
`cards.py`, `board_cards.py`, `kalib.py`, the pixel/token helpers and
`packages/ui/src/themes.ts` and the DM Sans TTF in its staleness inputs. The output argument is
`peek-poker/cards`, relative to the job cwd `assets/src`. `pnpm assets`
alone packs existing frames. The integrator must memory-check before rendering.
Never hand-edit `assets/dist`.

### Frames and drawing contract for P-04

All **58** PNG source frames are **176 × 231 px**, containing a **150 × 205 px**
card at 1080p, with nominal 13 px transparent margins and baked soft shadow.
This is board 3's ppB card size, not a new layout size. Anchor is the card centre,
**[88, 115.5]** in untrimmed source coordinates. Place that anchor at the table
cell centre; do not stretch the sprite to the card's 150 × 205 content box.
The packer trims alpha and records `sourceSize`, `trim`, `anchor` and named
`anchors.centre`; restore source placement using those fields. Half-detail
coordinates and draw dimensions scale by 0.5, including the anchor.

IDs are lowercase because A-01's `safe_name` rejects uppercase:

- `card-{rank}{suit}`: ranks `a,2,3,4,5,6,7,8,9,10,j,q,k`, suits
  `s,h,d,c` (spade, heart, diamond, club); e.g. `card-as`, `card-10h`.
- `card-back`: token #B5371F red with #C15743 diagonal stripes. Integrator Round 4
  measured back (181,55,31) and stripe (193,87,67).
- `card-flip-0` through `card-flip-4`: shared neutral face → edge → back,
  sampled at 0, 25, 50, 75 and 100% of angular progress. The neutral face is blank
  paper, deliberately carrying no rank/suit identity. Do not show it alone as
  a player's known face.

Ranks 2–9 have one large rank over one suit, without pip fields. J/Q/K retain
that layout plus small original flat pennant/crown/battlement badges below the
central suit. Every actual face runs the inherited ink-overlap check again
*after* adding its court badge. Suit outlines distinguish all four by shape. In greyscale, hearts, diamonds
and clubs share essentially the same grey; colour/luminance alone does not
distinguish them.

Flip integration: duration **377 ms**, ease-in-out **cubic-bezier(.65,0,.35,1)**.
Sample angles are **0°, 45°, 90°, 135°, 180°**. Forward order is 0→4;
reverse order reveals the face. Apply easing at runtime to angular progress;
the baked samples are equally spaced in angle, not elapsed time.
For continuous motion use angle `pi * easedProgress`; horizontal projection is
`abs(cos(angle))`, with the baked lift corresponding to `6*sin(pi*easedProgress)`
screen pixels upward. All frames retain the centre anchor, so no per-frame
anchor compensation is needed.

For the first half, P-04 draws the neutral frame (paper and baked shadow), then
composes the actual face over the paper, horizontally scaled about its centre
by `cos(angle)` and translated by the same lift. Clip that overlay to the opaque
paper silhouette, excluding shadow alpha: an offscreen mask made at preload
from the neutral frame's alpha ≥ .95 suffices; do not multiply the face by the
soft shadow alpha. This also avoids drawing a second shadow. At the midpoint,
the mask has zero width and hides all face ink; change side there, at 90°.
The second half uses the back frames. Continuous turns can transform neutral
`card-flip-0` / `card-back` with the same projection and lift, using frame 2 for
the thickness-bearing midpoint; the five baked frames are reference samples
and can also drive a stepped flip. Do not interpolate atlas UVs across frames.
Reduced motion draws the destination face/back immediately. No runtime light,
blur, new raster helper or new dependency is introduced by this slice.

### Measured costs (integrator render, round 7, DM Sans)

The packed atlas measures **1926 × 1100**, **915,460 B full**
and **235,742 B half** transferred. Decoded RGBA costs are **8,474,400 B full**
and **2,118,600 B half**, **10,593,000 B combined**. Load only the chosen detail.
These measurements describe the committed DM Sans render (round 7). The earlier
JetBrains render (round 6) was 886,554 B full and 228,136 B half.
PERF-023/024 limits remain unchanged.

### Close-out

The committed render is integrator round 7 (DM Sans, D-150). PP-031 is partial: A-08 supplies
frames and the drawing contract; flips, swaps and the reveal at runtime are P-04.
Round 6 re-review was not clean; review round 4 below replaces its typography. Each face inherits the stage-1 coverage/luminance/variance check;
every frame retains transparent-edge and saturated-edge checks plus explicit
size/nonempty checks. Backs check coverage, variance and dominant red. Flip frames use angle-specific
coverage windows; neutral paper checks its token mean and variation. Failure removes any previous validation pass at startup, exits
non-zero, and writes no new pass. Only all 58 successful frames produce
`render_validation.json` with source dimensions, anchors, metrics and hashes.
The packer does not consume that validation file: integrator review must check
it before packing. No Blender, UAT or production packing was run by this agent; the integrator
rendered and packed round 7. Historical checks are recorded below. No tracker, contract, lockfile or budget was changed.

### Requests

None; see "Integrator render, round 7" at the end.


## Stage 2 Round 2 — deck geometry preflight (PP-030, PP-031)

The integrator's partial render exposed a J corner rank/corner suit collision in
inherited geometry, before the extra court badge was added. Stage 2 now defers
that inherited early-exit check until its final layout is complete. Stage 1 is
unchanged. Both corner ranks on every face fit the corresponding measured
stage-1 Q index bounds (including inverted bottom-right bounds). All central
ranks fit x ±.21, y .02–.40; central suits fit x ±.21, y −.39–−.06. J/Q/K badges
retain their original distinct outlines at y −.56–−.43, with separate named
objects. This reserves space between the suit and each badge.

The minimum AABB distance between the stage-1 A Q crown and all four corner
ink objects, measured across all suits using the unchanged Q indices, sets the
required clearance. Every central rank, suit and court badge must meet that
clearance from both corner indices, for all 52 faces, including 2–9 and 10.
Every pair of ink objects also retains the positive-area overlap check. All
violations are collected across every pair and face and reported together with
face names, object names and bounds before a non-zero exit. Normal rendering
runs this complete preflight before rendering any frame and invalidates an old
render manifest before preflight.

Dry run (no rendering, output directory creation or file writes):

```sh
blender -b --factory-startup -P tools/blender/cards.py -- --check-only
```

Expected script output, alongside Blender's own startup/shutdown messages:

```text
CARDS CHECK: 52 faces validated; no ink overlaps; corner clearance >= 0.050000 card units.
CARDS CHECK: flip geometry widths (px): 150.000, 108.718, 3.750, 108.718, 150.000
CARDS CHECK: check-only complete; no frames rendered or files written.
```

The integrator’s real check-only output measured clearance 0.050000 card units
and widths 150.000, 108.718, 3.750, 108.718, 150.000 px. On failure the full
list replaces the success messages.

Render after a passing dry run:

```sh
blender -b --factory-startup -P tools/blender/cards.py -- --out assets/src/peek-poker/cards
```

### Close-out

Only `python3 -m py_compile tools/blender/cards.py` was run and passed.
No Blender, pnpm verify, vitest, UAT or pack command was run. The integrator subsequently rendered and reviewed this geometry.

### Requests

Completed by subsequent integrator renders; see rounds 4–6 below.

## Stage 2 Round 3 — flip angle sampling (PP-030, PP-031)

Opened the supplied round-2 atlas. Faces and back are accepted by the integrator,
who reports 63.8 s rendering, one 1980 × 1100 atlas, 706,290 bytes and passing
PERF-023/024. No changes were made to their geometry, materials or framing.

Cause: the script sampled the move easing at quarter elapsed times before
computing the turn. Those samples are about 13° and 167°, whose projected
widths are nearly full size. The card-local Y axis, parent transform and fixed
camera were already correct; there are no rotation keyframes or per-frame fits.

The five frames now sample angular progress directly: 0°, 45°, 90°, 135°,
180°. The camera-facing X tilt precedes each local Y turn. Neutral face remains
visible before the edge and the back after it; the back geometry's facing
orientation is compensated by subtracting 180° after the side change. The
existing .08-unit sinusoidal lift and shared face camera calibration remain.
The drawing contract above now distinguishes angular samples from runtime easing.

Both normal rendering and `--check-only` project evaluated opaque mesh vertices,
including Solidify thickness, through the same fixed face camera. Each width
must match `abs(cos(angle)) * faceWidth` within 5%; the midpoint must match
the .025-unit paper thickness (3.75 px) within 3 px. Transparent shadow meshes
are excluded. Saved PNGs independently measure occupied columns at alpha ≥ .95
against the rendered `card-as` opaque width with the same tolerances. Alpha
trimmed atlas rectangles include shadow and are not opaque widths. Failures
exit non-zero before a passing validation manifest can be written. Version 5
records geometry and rendered width metrics, expected widths and tolerances.

### Close-out

Only `python3 -m py_compile tools/blender/cards.py` was run and passed.
No Blender, pnpm verify, vitest, UAT or packing was run. Changes are limited to
`tools/blender/cards.py` and this note.

### Requests

Completed by subsequent integrator renders. The round-3 render also re-rendered
S-02’s cook-spike frames: 22 frames changed by at most 1 level; hashes were consistent.


## Stage 2 Round 4 — token paint and render validation (PP-030, PP-031)

1. Face paper now emits the #FFFFFF → #F3EEE3 soft gradient, replacing lit
   console-marble noise. Pale paper must vary and its mean RGB must lie within
   3 levels of (249, 246.5, 241); uniformly white paper fails.
2. Back red #B5371F and stripe #C15743 use emission. Stripes sit just 0.0001
   units above red to avoid z-fighting and cast no shadows. Dominant back RGB
   must be within 3 levels of (181,55,31), cover at least 25% of opaque pixels,
   and have nontrivial luminance variance.
3. Card token materials use the new exact sRGB helper; legacy kalib.hexc is
   unchanged for other scripts.
4. Back and flip coverage checks now reject missing/shrunken frames; flip
   coverage follows each angle, including a narrow midpoint window. Neutral
   frames also check paper colour and variation. Existing width checks remain.
5. PNG luminance uses already encoded image.pixels directly, removing double
   encoding; full-face mean must lie between .05 and .98, with stddev > .025.
6. `pnpm assets --render` registers cards and watches both imported helpers.
   The shared geometry docstring explains the production check_ink patch.
7. Version 6 production validation hashes decoded RGBA8 pixels (Blender's bottom
   row first), ignoring PNG metadata. Board validation version 4 and its compositor also hash decoded pixels.
8. Board footer captions and paragraphs now use 13 px.
9. Corrected current stage, existing frames, colour/greyscale claims, measured
   prior atlas costs, check-only output, eased lift progress and repository ignore.

### Close-out

Round 4 was subsequently rendered and re-reviewed by the integrator; measured
colours and atlas costs are recorded below. This agent did not render or pack. Only the three commands listed below were run for
validation, all passed:

```sh
python3 -m py_compile tools/blender/cards.py tools/blender/board_cards.py tools/blender/kalib.py tools/assets/pipeline.py
VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets
pnpm run lint:design
```

Vitest: one file, two tests passed (including the existing Python asset tests).
Design lint: 331 files scanned.

### Requests

Completed by integrator rounds 4 and 5 below.


## Integrator render, round 4

The integrator rendered all 58 frames and packed the atlas. Re-review found the
paper, back, stripes and inks on token; checks rejected blank, black, magenta,
shrunken and wrong-colour frames. The render job path and remaining validation
weaknesses prevented a clean review.

Measured colours: back **(181,55,31)**, stripe **(193,87,67)**; paper
**(254,254,253)** at top to **(243,239,228)** at bottom; spade **(34,32,27)**,
heart **(217,72,59)**, diamond **(47,127,214)**, club **(46,154,91)**.
Atlas: **1926 × 1100**, **958,452 B full**, **246,514 B half** transferred;
decoded **8,474,400 + 2,118,600 B**. Check-only measured widths **150.000,
108.718, 3.750, 108.718, 150.000 px**, clearance **0.050000** card units.
These historical Round 4 measurements are superseded by Round 5 below.

## Stage 2 Round 5 — render orchestration and pixel checks (PP-030, PP-031)

1. Corrected the job’s `--out` to `peek-poker/cards` for cwd `assets/src`.
   From repository root the integrator runs `pnpm assets --render`; a second
   unchanged run skips rendering. Stubbed subprocess coverage checks all 58
   PNGs plus validation JSON and invalidation by every shared input.
2. Extracted Blender-free pixel logic to `card_checks.py`. Paper requires the
   top interior band to average at least 6 byte levels lighter than the bottom;
   only fully opaque pale interior pixels enter the bands. Back stripes must
   occupy 12–45% of opaque pixels within ±3 of (193,87,67); pixels darker than
   the red are capped at 0.5%. Mutation tests reject uniform paper with varied
   antialiased edges, reversed paper, absent stripes and dark stripe outlines.
3. Reversed stripe slope; integrator fix d3723af completes the paper blend
   as 0.15·(1−x) + 0.85·y.
4. `card_tokens.py` reads the PEEK_POKER_CARDS block in `themes.ts` at runtime;
   material colours are no longer copied literals. Helpers and the token source
   participate in incremental staleness.
5. Replaced stale figures and pending-render claims with the integrator’s Round 4
   evidence above. All costs and colours must be re-measured after Round 5.

### Close-out

Python compilation passed. Pytest was attempted but is unavailable (`No module
named pytest`); tests run with the standard-library unittest runner instead.
Pipeline: 15 tests passed. Pixel checks: 3 tests passed. Scoped Vitest: two tests
passed. Design lint passed. Exact validation commands:

```sh
python3 -m py_compile tools/blender/cards.py tools/blender/board_cards.py tools/blender/kalib.py tools/assets/pipeline.py
python3 -m pytest tools/assets/test_pipeline.py
python3 -m pytest tools/blender/test_card_checks.py
python3 -m unittest discover -s tools/assets -p test_pipeline.py
python3 -m unittest discover -s tools/blender -p test_card_checks.py
VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets
pnpm run lint:design
```

### Requests

Round 5 rendering and packing are complete. Current requests appear below.
No Blender, browser, UAT, whole-suite Vitest or `pnpm verify` was run here.


## Integrator render, round 5

The historical Round 5 render used d3723af (paper gradient
0.15·(1−x) + 0.85·y) and 3c784df (back stripe share acceptance 12–45%).
Supplied costs: **948,708 B full**, **243,104 B half** transferred;
**8,474,400 + 2,118,600 B decoded**. These precede this round’s source changes.

## Review round 3 — D-147 font and merged pipeline (PP-030, PP-031)

- Cards use a declarative pipeline.json render job with repository-relative
  extraInputs for helpers, themes.ts and the bundled font. Generic render()
  consumes these inputs. The cook job is preserved; the card test isolates its
  own job and checks invalidation by every input, including the font.
- All ranks used JetBrains Mono Bold via bpy.data.fonts.load. Corner indices
  fitted explicit interior bounds independently. The nominal region did not equal
  cap height. Corrected measurements (re-review after round 4, ink runs at 1080p): central ranks
  56 px, the central 10 44 px, corner indices 15–19 px and the 10's corner index 7 px (the round-3
  review's "40 px" and "33–36 px" were mismeasured). Existing overlap and corner clearance checks stayed active.
- Pixel checks derive back, stripe and expected paper colours from TOKENS.
  Asset Vitest now runs the exact three Blender-free pixel tests too.
- Stripe spacing and width multiply by √2 to match perpendicular CSS distances.
  Clipped polygons below one square screen pixel are discarded.

### Close-out

PP-031 is partial: A-08 supplies frames and the drawing contract; flips, swaps
and the reveal at runtime are P-04.

All six requested checks remain unrun because the required pre-command gate
failed: tools/agents/memcheck.sh agent in the main worktree could not read
sysctl (Operation not permitted), then hit an arithmetic error and never said
ok. uptime reported 1-minute load 3.51, below 8. No Blender, rendering, packing,
browser, UAT, install, commit or merge was performed.

### Requests

Superseded by integrator render round 6 and review round 4 below.


## Integrator render, round 6

The integrator rendered the JetBrains deck and packed **1926 × 1100** atlases:
**886,554 B full**, **228,136 B half** transferred;
**8,474,400 + 2,118,600 B decoded**. After the first render failed the ink check
on the four 10s, the integrator narrowed the central 10 region to **±0.205**.
Re-review was **not clean**: central caps and especially the 10 indices shrank.
These are historical JetBrains measurements, not DM Sans costs.

## Review round 4 — D-150 shared DM Sans caps (PP-030, PP-031)

All central and corner ranks now load the supplied DM Sans Bold; its OFL.txt is
retained. The render job watches that TTF and the unused JetBrains source folder
is removed. The cook render job is unchanged.

Production measures all 13 ranks at font size 1, then takes the largest single
font size that fits every rank in each role. Both corner indices share one size;
all central ranks share another. Q’s tail and round overshoots constrain the
common size rather than shrinking individual ranks. The 10 uses
`curve.space_character` calibrated from measured widths to retain a positive
24/700-of-cap ink gap (equivalent to .75 advance spacing), with no independent
size or horizontal scaling. Calibration handles both additive and proportional
Blender spacing implementations.
Corner regions are 0.20 × 0.15 units, centred at x ±0.36, leaving a 0.04-unit
outer margin and inner edges at ±0.26. The central region is x ±0.21,
y 0.02–0.50. All pairwise overlap checks and the 0.05-unit corner clearance
remain mandatory for all 52 faces before rendering.

Cap measurement uses the flat A ink height at the common size, at 150 px per
card unit (the tilted face normal points at the camera). Preflight prints the
measured card-unit and 1080p pixel heights for both roles; successful rendering
also records them under `rankCapHeights` in `render_validation.json`.
No Blender measurements are claimed here because this round explicitly forbids
running Blender. Font-table measurements are A cap 700 units and Q full height
822 units at 1000 units/em; the corner height limit therefore implies
**19.16 px cap height** (round 2 measured 24–27 px, its 10 21 px). The font-table width of 10 at 75% advance is 900 units
(364 × .75 + 658 − 31), implying a width-limited **49.00 px central cap**
(0.42 / 900 × 700 × 150). The pair retains a 24-unit horizontal ink gap
(364 × .75 + 46 − 295). These are source-derived measurements, not rendered
pixel measurements; the integrator’s evaluated preflight records actual values
for the installed Blender version, including `tenCharacterSpacing`.

### Close-out

All six permitted checks passed, each started only after `uptime` reported a
1-minute load below 8. No memcheck, Blender invocation, render, browser, UAT,
production packing, install, commit or merge was performed.

| Command | Result | Start load |
| --- | --- | ---: |
| `python3 -m py_compile tools/blender/cards.py tools/blender/board_cards.py tools/blender/card_checks.py tools/assets/pipeline.py` | Passed | 7.89 |
| `python3 -m unittest discover -s tools/assets -p "test_*.py"` | 15 passed | 7.29 |
| `python3 -m unittest discover -s tools/blender -p test_card_checks.py` | 3 passed | 7.67 |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | 1 file, 3 passed | 7.67 |
| `pnpm exec tsc -b tsconfig.build.json` | Passed | 7.56 |
| `pnpm run lint:design` | Passed, 367 files scanned | 7.84 |

Evidence: `uat/evidence/A-08-cards/round4/codex/checks.txt` and
`uat/evidence/A-08-cards/round4/codex/font-measurements.md`.
The integrator-provided DM Sans TTF and licence are committed with this round.

### Requests

Done by the integrator in round 7 below. PP-031’s runtime flips, swaps and reveals remain
P-04’s work.

## Integrator render, round 7 (DM Sans, D-150)

`python3 tools/assets/pipeline.py --render`, exit 0, 197 s. Preflight: corner index cap height
19.16 px and central cap height 49.00 px at 1080p for every rank, the 10 included (10 character
spacing 0.75); 52 faces validated, no ink overlaps, corner clearance ≥ 0.05; flip widths
150 / 108.7 / 3.75 / 108.7 / 150 px. Atlas 1926 × 1100: 915,460 B full, 235,742 B half,
8,474,400 + 2,118,600 B decoded; PERF-023/024 pass. Re-review measured indices 19 px on every
rank (Q 21 px with tail) and central ranks 49 px (10: 51; Q: 57 with tail). The trade against
round 2: central ranks 56 → 49 px and indices 24–27 → 19 px, because one shared size must fit the
widest rank; both stay above PP-030 and the 34 px rule. Evidence: `uat/evidence/A-08-cards/round4/`
(the Codex checks are in `round4/codex/`). The render also re-ran S-02's cook job (the pipeline
decides staleness by modification time); those files were restored from main, unchanged.

