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
Choose a limit from a representative measured frame time × total frames (including masks),
plus scene setup, file publication and a margin for machine load. A-02's nine cook actions ×
eight directions will need a measured larger limit or separate jobs. Each job requires a unique
`id` and its own declared outputs; multiple jobs may use the same script. 300 seconds is not a
target for the whole body render.

Freshness uses SHA-256 of the script, every declared input and extra input (paths and bytes),
and arguments, rather than modification times. A small JSON stamp named
`.<id>.render-stamp.json` sits beside the first declared output (for example
`assets/src/peek-poker/cards/.cards.render-stamp.json`). Commit it with the rendered
sources. It is written only after successful rendering and presence of every declared output;
post-render input bytes are hashed because cook publishes anchor metadata to its config.
Missing outputs, missing/invalid stamps or differing hashes make a job stale. Existing outputs
without stamps rerender once; checkouts that only change timestamps do not invalidate stamps.
All declared inputs remain significant, including the full pipeline config when declared.
A job declaring the whole `pipeline.json` becomes stale whenever any art issue edits that file.
Duplicate ids and colliding stamp paths are rejected before rendering.

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
