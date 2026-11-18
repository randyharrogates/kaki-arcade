# Kaki Arcade — Art Pipeline (Blender)

Route D (PRD NN-4, `DESIGN.md` §4.1): art is modelled in Blender and rendered ahead of time to
sprites and backgrounds that the browser draws as flat images. The look is decided at the
design gate (board 1); this file is the process.

## 1. Setup

- Blender 5.2 LTS, installed on the dev Mac at `/Applications/Blender.app`, on `PATH` as
  `blender`.
- Driven headlessly by Python scripts in `tools/blender/`:
  `blender -b --factory-startup -P tools/blender/<script>.py -- <args>`
- No add-ons and no manual clicking: every asset must be reproducible from a script alone, so
  it can be rebuilt and reviewed. The script builds the scene; no `.blend` file is a source.
- `tools/blender/sample_stall.py` is the first-pass sample scene from the art comparison
  (simple solids, Cycles, about ten seconds a frame on the M3). It is a reference for the
  scripting approach, not a style.

## 2. What gets made

| Asset | Source | Output |
|---|---|---|
| Cook body | One rigged, animated model in the chunky toy style | Sprite frames: each action × 8 directions, a matching colour-mask frame for the player or team tint, and a head anchor point per frame |
| Cook heads | 8 character heads | One sprite per head × 8 directions, drawn on the body's head anchor |
| Dishes and ingredients | One model per item and state (raw, chopped, cooked, burnt, plated) | One sprite each, plus a small icon for order cards |
| Stations | One model per station and state | Sprites for the changing parts; the static body is baked into the level background |
| Levels | One scene per level | A baked background image, a collision map, and station anchor points exported as JSON |
| Cards (Peek Poker) | One card model, generated faces | Card face sprites and a back; flip frames |
| Effects | Small animated models | Short frame strips (steam, sparks, splash), baked soft shadows |

Cook actions (TR-060): idle, walk, carry-walk, chop, stir/toss, wash, serve, throw, extinguish.

## 3. Rules that protect performance

See `PERFORMANCE.md` for the budgets these serve.

- One camera angle and one light rig for every asset in a game, so sprites sit together.
  Orthographic camera; the tilt is chosen at the design gate.
  Exception (D-134): order-card icons are HUD pictures, not objects in the kitchen, and use a
  55° tilt so flat food reads at 55 px; they never sit beside world sprites.
- Characters render at a fixed pixel size per frame (chosen at the gate, expected about
  128 px) and are packed into atlases no larger than 2048 × 2048.
- Shadows and glows are rendered into the sprite or the background. Nothing is blurred or lit
  at runtime.
- Colour: render a neutral cook plus a mask of the tinted parts (apron and cap). The game
  multiplies the mask by the player's colour in co-op and the team's colour in versus.
- Outputs are WebP (lossy for backgrounds, lossless for sprites with hard edges), with
  half-resolution variants generated for lower-detail mode.
- `assets/dist/` is generated. Never hand-edit it; change the source or the script and rebuild.

## 4. Correct movement

"Characters move correctly" (NN-4) means:

- Walk cycles are authored so stride length matches movement speed. The game plays the cycle at
  a rate tied to actual ground speed, so feet do not slide.
- 8 facing directions are rendered from the same animation, so turning never changes
  proportions or timing.
- Carrying changes the upper body only; the legs keep the same cycle.
- Actions have a clear anticipation and settle with no overshoot (design motion rules).
- Every animation is checked in UAT with a frame-strip screenshot, not just in motion.

## 5. Build

`pnpm assets` (`tools/assets/pipeline.py`, A-01) packs rendered frames into atlases at full and
half size, writes the asset manifest the game loads from, and prints every round's size against
PERF-023 and PERF-024. Rendering is opt-in with `--render`, which runs the Blender scripts
after a memory check; it is slow, so it is not part of `pnpm verify`. Verify packs whatever is
in `assets/src` into a temporary folder and fails when a round is over budget. Needs Pillow
11.1.0 (`tools/assets/requirements.txt`).

Commands (from the repository root):

- `python3 tools/assets/pipeline.py --render` renders stale jobs, then packs every set.
- `python3 tools/assets/pipeline.py --render --only cards` renders only that job if
  stale, then still packs every set. Unknown job ids fail and list valid ids.
- `python3 tools/assets/pipeline.py --check-stale` reports each job as fresh or stale with
  its reason, without rendering or packing; it exits non-zero if any selected job is stale.
  Combining `--render` and `--check-stale` is refused. Add `--only cards` to inspect one job.

Each render job may set `timeoutSeconds` to a positive integer (default 300). On timeout or
interruption, the pipeline kills the Blender process group, waits and propagates the failure.
Timeout and missing-output errors name the job id, its script and the limit.
Cook rendering uses one job per action (`cook-body-idle`, `cook-body-walk`,
`cook-body-carry-walk`, `cook-body-chop`, `cook-body-stir`, `cook-body-wash`,
`cook-body-serve`, `cook-body-throw`, `cook-body-extinguish`) plus `cook-head-cap`.
Each action limit is `ceil(2.5 × (30 + 2.0 × frames) / 60) × 60` seconds, where
frames counts body samples across all eight directions (the per-sample allowance
includes masks, references and composition checks). The head limit is 120 s.
Each job publishes only its own folder; cook jobs do not write pipeline.json.
Use `--render --only <id> --no-pack` to render a selected stale job without packing
sets whose frames are still missing. `--no-pack` requires `--render`.
Each job requires a unique id and declared outputs; several jobs may use one script.

Freshness uses SHA-256 of the script, every declared input and extra input (paths and bytes),
and arguments, rather than modification times. A small JSON stamp named
`.<id>.render-stamp.json` sits beside the first declared output (for example
`assets/src/peek-poker/cards/.cards.render-stamp.json`). Commit it with the rendered
sources. It is written only after successful rendering and presence of every declared output;
post-render input bytes are hashed to capture any inputs updated during rendering.
Missing outputs, missing/invalid stamps or differing hashes make a job stale. Existing outputs
without stamps rerender once; checkouts that only change timestamps do not invalidate stamps.
For the `items` job only, the declared `pipeline.json` input is canonical JSON with
only `tabao-rush-items.containmentFootprints` and that set's per-frame `bakedOutline`
removed. These named fields describe published pixels and are written by metadata
refresh; they do not control rendering. Every other field (including fields in
other sets), script, declared input, extra input and argument remains significant.
Other jobs continue hashing the full declared config bytes. JSON formatting and
key order alone do not change the items config hash.
Duplicate ids and colliding stamp paths are rejected before rendering.

TR-041 legacy stamp migration (no Blender or PNG changes):

```sh
python3 tools/assets/pipeline.py --migrate-items-stamp 240c5c75beda81255ffd8fc3391b581472fe8d80
python3 tools/assets/pipeline.py --check-stale --only items
```

Migration authenticates the revision's legacy stamp using its committed sources
and either its config or its parent config (the round-4 render preceded metadata
refresh). It then requires all current real inputs and declared output bytes to
match that authenticated revision before writing the new items stamp. Changed
sources or settings refuse migration; it is not an unconditional restamp command.
The command can be repeated for that legacy revision. It neither packs nor renders.
Future renders write the new stamp directly: render → refresh → pack → sheet
needs only one render, even when refreshed footprints or ink flags change.

Lossy WebP is accepted only for pages containing a single frame (backgrounds). Multi-frame
pages must use lossless encoding to prevent neighbour bleed; this is checked per packed page,
including when a set spans several pages.

## 6. Where Codex comes in

Per PRD NN-9, Codex is used only where Claude cannot do the job. Expected cases: generated
raster images such as landing-page illustration, texture images for materials, or painted
backdrops. Each use is recorded in `DECISIONS.md` with the prompt and where the output went.
Since D-055, Codex also writes the models, rigs, animation scripts and pipeline code from Claude's
briefs; Claude plans, runs every Blender render (Blender cannot run in Codex's sandbox), looks at
the output and reviews.

## 7. Source files

The scripts in `tools/blender/` are the source. **`.blend` files are not committed and Git LFS
is not used** (Randy, 2026-11-16, D-054): a script may save a `.blend` for inspection, but it
is git-ignored and can be deleted at any time. Small hand-made inputs a script needs (a
texture, a reference image) go under `assets/src/` as ordinary files and count towards the
repository size, so keep them small.

## 8. Baked item outlines

`bakedOutline: true` means the frame PNG already contains the raster ink outline
(#2B2118, RGB 43,33,24; pixel checks allow ±2 per channel). This includes plated
dishes with rimmed bases and portions assembled from rimmed cup layers, as well
as frames receiving the rim pass directly. Liquids without ink leave the flag false
or absent. Packing preserves the flag in the runtime manifest.

The pipeline refuses an outlined frame used at any scale other than 1: shrinking
or enlarging baked ink changes its intended one-pixel width. The guard covers fixed
`composition`, `servedComposition` variants, `contentCompositions` overrides and
generic `portionScales`. Author and render smaller outlined objects at their final
pixel size, then compose them at scale 1. The side cup and its liquid layers follow
this rule; the liquid layers themselves contain no outline.

## 9. Cook body frames

TR-060 / NN-4: body ids are `<action>-<direction>-<frame>` and masks append `-mask`.
Directions are s, se, e, ne, n, nw, w, sw; frames are zero-based. Cap head ids are
`head-cap-<direction>` and `head-cap-<direction>-mask`. Every frame is 256 × 256 at
120 pixels per tile. Each action and the cap job publish a `frames.json` list; sets
load those source-relative lists through `frameFiles`, after any inline frames.

Coordinates are top-left pixels in the uncropped frame. `anchor` is the head socket;
`anchors.head` is the same point. Body frames also carry `anchors.root` (world origin)
and `anchors.hands` (the midpoint of the two hand empties, except during throw).
Body frames also publish `anchors.throwHand`, the throwing hand. During throw,
`anchors.hands` and its `handsInFront` depth use that same throwing wrist. Follow
`throwHand` through frame 3, release at its extension, then move the separate item
along a game-authored arc; never interpolate an item across the body's settle.
Extinguish frames add
`anchors.nozzle` at the extinguisher outlet. `handsInFront` says the hands are nearer
the camera than the spine head, so carried item sprites can be layered correctly.
Masks are separate frames with exactly the body's anchors and metadata.

Draw the head with its head anchor on the body frame's head anchor. The head's
colour mask uses the same placement. Apron and cap masks select the player/team
colour; tools stay black in the mask and never receive that tint.

Animations declare `loop`; serve and throw are one-shot clips with `releaseFrame: 3`.
`releaseFrame` is zero-based and marks when the held item is released. Walk and
carry-walk alone declare `strideTiles` (currently 0.72 per eight frames). Advance
those clips by ground distance: `floor(distance × 8 / strideTiles) mod 8`, rather
than by fps. Their fps describes the provisional 3 tiles/s speed; carrying changes
only the upper body. Feet stay fixed during idle and station actions.

Tools are baked into action frames: knife for chop, spatula for stir (pot stir and
wok toss), and a laterally held extinguisher for extinguish. Carried ingredients,
containers and dishes remain separate item sprites drawn at hands.

Review with `python3 tools/assets/cook_strips.py --out <evidence-directory>` after
rendering. It skips missing action lists, writes light/dark 1× JPG contact sheets
(quality 85; `--format png` opts into PNG at 1×), annotated
body/tint/head strips, masks, turns, ground-speed walk strips and the lower-body
carry-minus-walk difference. Inspect the walk ground-speed strips before rendering
the remaining actions; the pure pose checks cannot establish finished visual quality.

`--check-motion` requires all eight directions for chop, stir, wash, extinguish,
serve, throw and idle. Every action measures unannotated tinted body **with the
tinted cap composited**, including tools. This excludes motion in the body-only
head-shadow pixels hidden by the cap. Missing body/head masks or anchors fail
coverage. Work actions use every sample: at least 13 px anchor diameter and
400 changed pixels from sample zero. Serve and throw measure from
frame zero to `releaseFrame` only, with the same 13 px / 400 thresholds. Serve
tracks the hands midpoint; throw tracks `throwHand`. A missing head/mask or anchor
fails coverage. Idle tracks the chest's head socket, with lower thresholds of
2 px / 100 changed pixels for its gentle breath and weight shift. A changed pixel
has any RGBA channel difference strictly greater than 24/255, counted once.
Masks-only sheets always stay at 1×. Ground-speed cells include the full frame
plus maximum projected stride travel on each side, preventing moving cooks from
being clipped by the diagnostic viewport. Rendered acceptance still requires
opening all directions, especially the north-facing one-shots.

Round 6 pose bounds (TR-060 / NN-4, D-154 / D-163): wash uses three-frame
outward/return strokes, with bounded depth variation distinguishing all six
samples. Chop retracts the raised hand below the cap envelope. The pure test
checks frame 1 in every view against a .47-tile shell sphere clipped at +.18 Z
and a brim ellipsoid (.252, .203, .024) offset (0, -.349, +.203) from the
head centre, including shell thickness. At least 6 px of the spherical hand
extends below that envelope; it does not require the whole hand to clear it.
Extinguish holds the tool laterally with one hand; the other balances the sweep.
Fixed shoulders cannot keep the former two-handed grip at this lateral reach.
The test samples the canister ellipsoid and requires a point >=1 px outside
all three enclosing projected discs: torso (.34 tiles), head/shell (.47) and
brim (.252), for each frame/view. These bounds catch the reported hidden
raise/canister poses; Blender must establish exact silhouettes, arm occlusion,
canvas containment and readable chops/sweeps on the final composited sheets.

The packer canonicalises identical decoded pixels with identical frame semantics
(anchors, metadata, trim and source size), rewrites repeated animation slots to
the first stable frame ID and packs one tile. Original IDs remain aliases to the
same rectangle for direct references. Timing, frame count and release indices
are unchanged. This includes idle/extinguish slots 1 and 3 and any other exact
repeats; distinct anchors or metadata prevent sharing.

## 10. Item serving compositions (TR-041; D-141, D-145)

The `tabao-rush-items` set declares these frame metadata keys for preservation by
`pipeline.py`. They describe how to draw a serving; the game reader is a track-T
follow-up. They are not additional recipe rules. Ready food can be placed in any
accepted container, including a wrong recipe.

| Field | Meaning and selection |
|---|---|
| `composition` | Ordered portion layers for a fixed `dish-…-plated` reference. Use the dish's recipe container as the base. This is the canonical reference for composition validation. |
| `servedComposition` | On a completed dish, draw `container` first, then select `variants[servedDrink]` using the **actual** served kopi or teh. `ingredient: "servedDrink"` names that simulation selector, not a literal ingredient. Kaya toast and kopi-teh require this selection; never fall back to the fixed kopi reference for teh. |
| `contentCompositions` | On a clean or dirty container, a map from ingredient ID to replacement layers. For that ingredient, draw these layers **instead of** its generic portion. Plate kopi/teh use a final-size side cup followed by its matching liquid, so neither becomes a bare puddle. |
| `portionScales` | Dimensionless scale for a generic ingredient portion in this container, used only when there is no content override. Plate food is normally 1, bowl food 0.70, cup food 0.36. Bowl broth/noodles and cup kopi/teh are authored to fit and use 1. |

All anchors are **pixels in the original, untrimmed 89 × 89 PNG canvas**. The
source frame anchor is [44.5, 44.5]; +X is right, +Y is down. A layer's explicit
`anchor` is its destination in the container canvas. Otherwise `slot` selects a
named destination from the base container's `anchors`. Sort layers by increasing
`order` and alpha-composite back to front. Each layer has its own optional
`scale`, default **1**; composition layers do not implicitly inherit
`portionScales`. An explicit anchor takes precedence over a slot.

For generic contents, select `portion-<ingredient>-<appearance>` (including bread's
spread history), its named container anchor and its `portionScales` value. For a
content override, use the override's layers and explicit/default layer scales.
For a completed served variant, use that variant's base container and layers;
do not also draw the fixed dish or duplicate its generic contents. For other
completed dishes, the fixed reference or its equivalent ordered composition is
available. Dirty containers retain the same content-placement contract.

For source point **p**, destination anchor **a**, source anchor **s** and scale
**k**, the placement is **a + k × (p − s)**, in pixels. Scale is uniform about the
source anchor **before** translation, never about the trim rectangle or canvas
corner. Atlas `trim` and `rect` are storage details; reconstruct their source
position before applying this transform. Lower-detail atlas coordinates are
halved but the intended full-resolution TV geometry remains the same.
`halfRule` halves a frame's `anchor` and named `anchors`; it does **not** halve
explicit anchors nested inside `contentCompositions` or `servedComposition`
metadata. A reader using half-detail source coordinates must halve those explicit
anchors itself before applying the placement transform.

The Blender portion table is in world units, with 120 px/world unit at 1080p and
the DESIGN §4.6 camera. Its projected slot is
`[44.5 + round(120*x), 44.5 - round(120*(y*sin(60°) + z*0.5))]`.
`PORTIONS`' authored model scale is already baked into its PNG: do not multiply
it again in game code. In particular the side-cup model's 0.68 is baked at final
size, outlined there and composed at scale **1**. The generic 0.36 cup food scale
is an additional container transform. Every `bakedOutline` frame must retain
unit composition scale (§8), including in generic slots and served variants.

Broth portions now include their own ceramic rim: even a wrong plate serving has
liquid enclosed by a rim; the laksa recipe remains bowl-based. The rim is geometry,
not baked raster ink, so generic cup/bowl scaling is permitted. Validation checks
all accepted generic portions, overrides and served variants against the clean
container's opaque interior excluding ink, allowing at most two offending pixels
per layer. A render must pass containment, composition colour/visibility, frame
edge and silhouette checks before visual review. Recorded footprints describe the
committed PNGs. After every render, refresh them with:

`python3 tools/assets/pipeline.py --refresh-item-metadata`

This mode reads all item PNGs, recomputes container/portion footprints and each
frame's `bakedOutline` flag (alpha ≥128, ink RGB 43,33,24 within ±2), then writes
only pipeline.json. It neither renders nor packs, and deliberately permits stale
render stamps so committed pixels can be repaired independently of source changes.

## 11. Item evidence sheets (TR-041)

After rendering and publishing the `items` job, run:

`python3 tools/assets/item_sheet.py round1`

This creates a **new** `uat/evidence/A-10-dish-polish/round1/` directory; existing
runs are refused. Stale renders are refused using the pipeline's content stamp.
It writes labelled 1920 × 1080 PNG pages on light marble (`#EFEAE2`) and dark kopi
counter tones (`#6B4426`), each with one faint speckle treatment. These are
controlled contrast backgrounds from DESIGN §4.2, not a claim to reproduce every
lit counter in a level. Pages cover every fixed dish, portion and container,
separate loose-items and icons pages, all served-drink variants, and each ready food in plate, bowl and cup compositions.
Thus the 0.36 cup contents, plate broth rim and both plate drinks can be inspected.

View each `*-1x-*.png` at **100%**, one image pixel per display pixel: an item
canvas occupies 89 × 89 pixels at the 1080p TV design scale (120 px/world unit);
order icons retain their native 55 × 55 pixel canvas.
`*-4x-*.png` magnifies the exact same pixels by nearest neighbour to 356 × 356;
icons become 220 × 220; it does not rerender or improve details. Do not fit either page to the window
when judging size. `sheet.json` records every case, page, source SHA-256 and render
digest. Its visual review state starts as pending. Review all pages at both scales,
then record findings alongside them; generating sheets alone is not a visual pass.

Turnip render options (TR-041; D-145): `items.py` alone reads
`KAKI_TURNIP_STYLE=tan|cream|lilac`; default is `cream`, chosen in D-173. The switch is outside the render stamp, so `pipeline.py --render` and `--check-stale` refuse any value but `cream`; the other options are for scratch renders by calling Blender directly, and the switch goes in a later art pass. Tan retains the round-2
face. Cream uses an off-white cut face, warm-beige sides and a darker edge. Lilac
adds a muted purple skin band on one side of the cream face. The authored colour
smoke check requires side/ceramic contrast >2:1 and edge/face >1.5:1; the pale top
is intentionally exempt. Palette tokens are declared in items.py. These material
ratios do not establish rendered readability. Render all three options into
scratch directories for Randy's artifact; `--out` supports scratch output without
publishing source PNGs. The default render and its rendered checks remain the gate.
