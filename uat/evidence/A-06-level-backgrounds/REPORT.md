# A-06 level backgrounds — evidence (round 5, 2026-11-19)

TR-050, TR-057. TR-052 is A-06b and T-14.

Renders at 1ebdec26 (committed e6799b68): all six level jobs rendered in Blender, packed, the board rebuilt, `pipeline.py --check-stale` clean (6 level and 15 station jobs fresh), `python3 -m unittest discover -s tools/assets` 113 OK, `pnpm verify` passed (verify5).

## Images and what each shows (looked at, 1× and enlarged)

- `assets/src/tabao-rush/levels/kopitiam-first-shift/terrazzo/background.png`: 9 × 6 kitchen centred left to right; light marble floor with a fine wood/steel/ink speckle; cream wall blocks at the four corners; north row of four free-standing crates, then chop, rice cooker, chop, drinks and plating on jade-trimmed counters; south row of serving, return counter, sink, bin and five dish racks. No cooks, food, items, cues or fire. Nothing in the HUD band below the kitchen.
- `…/kopitiam-first-shift/tile/background.png`: same layout; small square floor tiles with light joints; wood trim #C7A16A in place of jade.
- `…/kopitiam-first-shift/golden/background.png`: as Terrazzo; the counter-front jade band is about 3 px taller (cream : jade 1.618 : 1).
- `assets/src/tabao-rush/levels/zi-char-test-kitchen/terrazzo/background.png`: 15 × 6 kitchen across the frame; warmer cream floor with the same speckle; eleven crates and two chop stations on the north row; four dish racks down the west side; a dish rack and the empty extinguisher counter on the east side; the south row has chop, rice, wok, grill, pot, plating, drinks, serving, return counter, sink, bin and two dish racks. The extinguisher counter shows an inset steel top inside its jade edge, matching the station tops; the extinguisher itself is not baked.
- `…/zi-char-test-kitchen/tile/background.png` and `…/golden/background.png`: the same differences as in the kopitiam.
- `assets/src/tabao-rush/level-board/kopitiam-first-shift-board.png`, `…/zi-char-test-kitchen-board.png`: the three looks side by side with the costs below; the captions match the renders.
- Six half-size previews `assets/src/tabao-rush/level-board/<level>-<look>.webp`, 960 × 540 each, the same scenes with no visible artefacts.

Each surface has one treatment: floor speckle (Terrazzo, Golden) or tile joints (Tile); grain on the backdrop, walls and counters. Station bodies are A-05's, unchanged. Crates have no counter surround. The plates in plating, dish racks and the return counter are part of A-05's static bodies and are baked (OQ-055). In zi char the south-west wall hides the lower quarter of the fourth west dish rack, as the 60° camera puts it; the plate is still readable.

## Measurements

Empty floor, `level_floor.py --crop 800 450 1100 550`, greyscale standard deviation (band 3–9 gates Terrazzo and Golden):

| Venue | Terrazzo | Golden | Tile |
|---|---:|---:|---:|
| Kopitiam | 4.778 | 4.780 | 2.363 |
| Zi char | 4.354 | 4.354 | 1.510 |

Backdrop beside the kopitiam 1.39, below the kitchen 2.77; a wall top 0.67.

Golden against Terrazzo: 3,320 (kopitiam) and 3,809 (zi char) pixels differ by more than 12 levels, all in the counter-front band.

The floor top ends at y=826; the slab's front edge shows to about y=835, about 46 px above the HUD cards at y=881. The whole kitchen lies inside the 55 px screen margins.

## Budgets (PERF-023 / PERF-024)

| Background | Full sent | Half sent | Decoded full / half |
|---|---:|---:|---:|
| Kopitiam Terrazzo (shipped) | 87,116 | 30,236 | 8,294,400 / 2,073,600 |
| Kopitiam Tile | 34,820 | 13,930 | same |
| Kopitiam Golden | 87,142 | 30,464 | same |
| Zi char Terrazzo (shipped) | 124,412 | 42,248 | same |
| Zi char Tile | 55,220 | 22,104 | same |
| Zi char Golden | 123,754 | 42,326 | same |

| Round | Sent / 8,000,000 | Decoded / 256,000,000 |
|---|---:|---:|
| kopitiam-first-shift | 2,528,142 | 63,745,680 |
| zi-char-test-kitchen | 2,570,664 | 63,745,680 |

Tile and Golden are never preloaded.

## Tests

`tools/assets/test_level_pipeline.py` (packing, hashed data files, bakedBodies, shared round sets, floor band on the committed renders), `tools/blender/test_levels.py` through `tools/assets/pipeline.test.ts` (projection, collision, frame fit, static bodies, golden split), `games/tabao-rush/src/levels/collision-export.test.ts` (walkable tiles equal compileLevel), `tools/assets/level-export.test.ts` (sources equal the catalogue).

## Not yet

- Drawn by the host (T-17): the TV still shows its placeholder floor.
- 3 m TV check.
- Randy's venue choice (board https://claude.ai/artifact/P83XXGhgt7WvVbrHAuzzYX, version 5); Terrazzo ships by default (D-292).
