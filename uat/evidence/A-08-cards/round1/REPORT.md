# A-08 cards — evidence (integrator, 2026-11-17)

Stage 1 (options): board rendered by tools/blender/board_cards.py, published to Randy as
https://claude.ai/artifact/8TSLSGhH5LdE2EvdxfyjQy (options-board.png). Choice B "TV first",
D-133 (Claude, pending Randy).
Stage 2 (final set): `blender -b --factory-startup -P tools/blender/cards.py -- --out
assets/src/peek-poker/cards` (79 s, all self-checks passed: 52 faces, no ink overlaps, corner
clearance >= 0.05 card units, flip widths 150 / 108.7 / 3.75 / 108.7 / 150 px), then
`python3 tools/assets/pipeline.py`: one atlas 1926 × 1100, 711 120 bytes full, 8 474 400 bytes
decoded; PERF-023/024 passed (pack.log).
Integrator's look:
- atlas-faces.jpg (round 2 pack on baize): all 52 faces, A-K in four suits; large rank over a
  large suit, two-way corner indices, suits distinct by shape and colour (black spade, red heart,
  blue diamond, green club); original flat court marks for J, Q, K; nothing touches.
- flip-strip.jpg (round 3 pack): back, then face 0°, 45° (about 71 % wide), edge-on, 135° (back
  side, darker as it turns from the light), 180° back. The face frames are plain on purpose; P-04
  draws the face over them (docs/slices/A-08-cards.md).
- An earlier pack had the 45° and 135° frames almost full width (easing applied before angle
  sampling); fixed and now checked by the script.
| Image | What it shows | Looked at by |
|---|---|---|
| options-board.png | stage-1 options A, B, C | Claude (integrator) |
| atlas-faces.jpg | 52 faces in style B | Claude (integrator) |
| flip-strip.jpg | back and five flip frames in order | Claude (integrator) |
