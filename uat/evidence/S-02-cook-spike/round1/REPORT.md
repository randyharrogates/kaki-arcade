# S-02 cook spike: round 1 evidence

Rendered by the integrator with Blender 5.2.3 (`blender -b --factory-startup -P tools/blender/cook.py -- --out assets/src/tabao-rush/cook-spike`)
after Codex round 2 and two integrator fixes in Blender (Codex cannot run it): round 1's sun shadow
ran off the frame (now a baked contact shadow only), and the hand-entered head anchors in
pipeline.json did not match the rig (the render now writes the measured anchors; 104 updated).

## Measured
- 208 frames at 160 × 160: idle 4 + walk 8 frames × 8 directions, body + apron/cap mask each, and
  one head × 8 directions + its mask.
- Render: 59.2 s per character (body, masks and head), 107.8 s including validation.
- Walk checks on the evaluated pose: planted-foot slide 0.00001 px, foot lift 4.8 px, head-anchor
  bob 0.72 px between frames; no clipped frame (every alpha 2 px inside).
- Pack: one atlas 2020 × 692, 623,216 B transferred, 5,591,360 B decoded (PERF-023/024 passed).

## Projection to the full cook set (A-02, A-03)
The slice note's full v1 scope is 1,280 frames including masks (nine actions × 8 frames × 8
directions, body and mask, plus eight heads), 6.15 × this spike's 208. The pipeline trims frames to
their ink, so the spike averages 26,880 decoded bytes per frame, not the 102,400 of a full 160²
frame. Scaling the measured atlas: about 3.8 MB transferred of the 8 MB level budget (PERF-023)
and about 34 MB decoded of 256 MB (PERF-024). Decoded memory has ample margin; transfer is the
tighter budget, since the cooks alone would take almost half the level's 8 MB. Recommendation for
A-02: pack the apron/cap masks as single-channel images (they carry only coverage) and check
whether some actions can share frames, before adding food and kitchen art to the level.

## Integrator's look (2026-11-18)
Opened contact-sheet.png (top: idle in the 8 directions with a red apron tint; bottom: the walk
facing south with a blue tint), walk-east.png and board1C-reference.jpg.
- Tinting works on the apron and cap mask; heads sit on the body anchors in every direction; the
  direction order runs s, se, e, ne, n, nw, w, sw.
- The view matches board 1 option C as decided in D-044 (matte, daylight, 60°): seen mostly from above, cap and hair
  dominant, small body.
- Finding for A-02: from 60° the walk barely reads (arms close to the body, legs mostly hidden);
  the full cycle needs a larger arm swing and visible stepping to read at TV size.
| Image | What it shows | Looked at by |
|---|---|---|
| contact-sheet.png | idle × 8 directions, walk south, tinted masks, heads on anchors | Claude (integrator) |
| walk-east.png | the walk cycle facing east | Claude (integrator) |
| board1C-reference.jpg | the decided board 1C frame for comparison | Claude (integrator) |
