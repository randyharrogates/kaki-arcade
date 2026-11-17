# S-02 — shared cook rig spike

Requirements: NN-4, TR-060 (idle/walk subset), PERF-023, PERF-024.
Decision: D-044, board 1 option C. Branch: `issue/S-02-cook-spike`.

## Purpose and implementation

This spike proves a shared chunky toy cook rig, separate registered head and player-colour
masks before A-02 builds the complete character/action set. It covers idle and walk, one
cap head and eight directions; the remaining TR-060 actions and seven heads are outside scope.

The eight-bone rig parents the body and head meshes to hips, spine, legs, arms, head and
head socket. Geometry, joints and socket derive from `K.PROPS['toy']`, with height set to
1.5 tiles to match board 1C. An orthographic camera looks down at 60°, at 120 px per tile,
with the shared matte lighting. Direction order is s, se, e, ne, n, nw, w, sw, in 45° steps.

Idle has four samples of torso breathing with a stationary socket. Walk has eight samples,
a 0.48-tile stride, 0.12-tile peak foot lift, spine bob and opposing arm swing. The in-place
stance foot compensates for gameplay root travel. Playback must advance with travelled
distance: at 3 tiles/s this stride requires 50 samples/s.

An analytic soft contact disk on Z=0 is baked behind body and intact reference renders.
Its radius is 0.35 times height (0.525 tiles), with maximum alpha 0.30. Heads and masks
contain no contact shadow; runtime needs no lighting or blur.

Outputs comprise 96 body frames (idle/walk × eight directions), eight head frames and
104 matching apron/cap colour masks, totalling 208 images. Masks use white/black emission
under Standard with no look, retaining mesh occlusion and restoring body view settings.
The renderer uses a 256 × 256 staging canvas, then crops all outputs identically to the
smallest shared square enclosing alpha > 1/255 with two pixels per edge. Anchors move by
the same crop offset. Saved pixels are revalidated and hashed. Frames publish before all
208 body/head/mask anchors are written back to repository-root `pipeline.json`; outputs
are then touched to avoid immediately staling the render job. Missing or extra frame IDs fail.

## Checks

The height check measures the world-space bounding box of the evaluated, posed body and head
meshes at idle frame 0. kalib's 1.5 tiles (board 1C) runs from the sole to the top of the head,
and the cap shell adds a constant 0.0494 tiles above it, so the check requires the whole mesh to
measure 1.53 to 1.565 tiles (about 1% either way of 1.5494); it measures 1.5494 tiles. The reviewer's
own vertex measurement found the bare head top at 1.5000 and the sole at 0.0012. It does not reuse the scale expression.

Saved frames require more than 16 occupied pixels, two-pixel clipping margins and alpha
variation > 0.1. Every mask must reach alpha >= 0.99. Mask containment permits at most
16/255 excess alpha at any pixel and at most eight pixels per mask exceeding the surface
by more than 4/255. Head masks compare with head alpha; body masks compare with alpha
retained before the contact shadow is baked. Independently rendered antialiased edges
can differ by a few levels. Body/head composition requires IoU >= 0.95 and silhouette
distance <= 2 px in both directions. Dark opaque body cavities differing from the intact
reference must be covered by opaque head pixels.

`--check-only` builds the rig without rendering or publishing, exercises metadata coverage,
and validates the existing body/head/mask files and head-mask containment. Existing body
frames do not retain pre-shadow alpha, so only body-mask containment is skipped, explicitly
reported in its JSON output. Full rendering retains that alpha in memory for the comparison.
The asset regression suite checks recorded anchor equality, write-back, frame coverage and
publication ordering.

## Accepted measurements and evidence

The accepted render/pack measurements supplied by the integrator are:

- Frame: 192 × 192 px; height: 1.5 tiles to the top of the head (1.5494 tiles with the cap).
- Foot slide: 0.000015 px; maximum anchor jump: 1.08 px; foot lift: 7.2 px.
- Mask alpha maximum: 255; worst mask spill: 8/255 on a few pixels; idle drift: 0.
- Anchors: 208 of 208 equal; minimum composition IoU: 0.991.
- Atlas: 1724 × 1746; full: 1,188,502 B; half: 395,922 B;
  decoded: 12,040,416 B.
- Rendering: 94.2 s per character; 187.6 s total including validation.

Evidence lives under `uat/evidence/S-02-cook-spike/`. `round1/` is superseded evidence
(160 px frames and untinted caps). `round2/` is the board-size render evidence assembled
by the integrator, who opened every image in it, as did the reviewer. Round names: `round1` and
`round2` are evidence folders; the code went through four review rounds, and round 4 changed only
checks and notes, so the round-2 frames still stand.

## A-02 requests and known limits

Projecting 94.2 s per 104-image character to all 1,280 frames gives about 1,150 s, above
the pipeline's 300 s per-job timeout. A-02 must split rendering jobs per character or action.
Projected storage is about 7.3 MB lossless as packed, or 2.8 MB with lossy WebP q90 and
`exact=True` for exact colour, per D-142 and D-144. Encoding that choice belongs to A-02.
Against the budgets: 2.8 MB is 35% of PERF-023's 8 MB level download, leaving 5.2 MB for the
kitchen, food and screen art. Decoded memory scales the same way: 12,040,416 B × 1,280 / 208 is
about 74 MB of PERF-024's 256 MB, and is the same for every storage choice.

The body-mask containment check against the body before its shadow has never run: check-only
cannot reach the pre-shadow alpha. A-02's first full render is its gate, and a failure there
(most likely the apron crescents on e, w, ne and nw) is expected work for A-02, not a surprise.

Walk reads weakly at 1×. Shoes and the contact shadow nearly vanish on a dark floor;
A-02 or level art must address readability. Apron masks are mostly occluded from n/ne/nw,
so the cap carries player colour; heads without caps need an accent (TR-064).

## Validation

- `python3 -m py_compile tools/blender/cook.py` — passed.
- `python3 -m unittest discover -s tools/assets -p "test_*.py"` — passed, 14 tests.
- `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` — passed, one file / two tests.
- `blender -b --factory-startup -P tools/blender/cook.py -- --check-only` — passed (integrator,
  outside the Codex sandbox, where Blender crashes with exit 139): 208 existing frames checked,
  height 1.5494 tiles, body-mask containment skipped. Output in
  `uat/evidence/S-02-cook-spike/round2/check-only.txt`.

## Close-out

Reserved for the integrator's acceptance and independent review.
