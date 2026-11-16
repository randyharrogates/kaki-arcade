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

`pnpm assets` runs the Blender scripts for anything whose source changed, packs atlases, writes
the asset manifest the game loads from, and prints the size of every atlas against
PERF-023 and PERF-024. Rendering is slow compared with code, so it is not part of `pnpm verify`;
the manifest's sizes are.

## 6. Where Codex comes in

Per PRD NN-9, Codex is used only where Claude cannot do the job. Expected cases: generated
raster images such as landing-page illustration, texture images for materials, or painted
backdrops. Each use is recorded in `DECISIONS.md` with the prompt and where the output went.
Models, rigs, animation scripts and all code are Claude's.

## 7. Source files

The scripts in `tools/blender/` are the source. **`.blend` files are not committed and Git LFS
is not used** (Randy, 2026-11-16, D-054): a script may save a `.blend` for inspection, but it
is git-ignored and can be deleted at any time. Small hand-made inputs a script needs (a
texture, a reference image) go under `assets/src/` as ordinary files and count towards the
repository size, so keep them small.
