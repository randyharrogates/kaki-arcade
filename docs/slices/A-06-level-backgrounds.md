# A-06 — level backgrounds, round 2

Requirements: TR-050, TR-057; D-281. Implements only the two existing catalogue
levels (kopitiam-first-shift, zi-char-test-kitchen). No host or simulation changes.

The source exporter executes the TypeScript catalogue and recipes using Node's
native type stripping. Its resolver maps the platform import to the actual pure
platform types module and resolves local TypeScript extensions. Regenerate with
`node tools/assets/export_levels.mjs`; `--check` checks without writing. The
pipeline extension registers these generated sources and checks them before
render/stale/pack; Vitest compares their data directly with the catalogue.

`levels.py` imports A-05 geometry verbatim, rotates its south-facing local front
to the anchor's facing, and leaves roots at floor height. Counter surrounds do
not lift the bodies and are omitted for low bodies. The carried extinguisher is
excluded from bakes; only its counter is drawn.
Food, fire, smoke, progress and cues are not added. A-05's static plates in
plating, dish-rack and return-counter remain baked exactly as A-05 draws them;
the crate's existing neutral contents likewise remain part of its geometry.
Runtime integration must skip the station ids in `manifest.levelBackgrounds[id].bakedBodies`.
Until that later issue, the host keeps its existing placeholder path.

Each JSON keeps the catalogue collision unchanged. Exported collision maps turn
anchor tiles into counters, matching their physical occupancy; all spawns are
floor. Anchors include all tile centres, stations and spawns at 1080p, plus camera
parameters. Grid south maps to Blender -Y. T-07 places cards at y=881–1025 and
time/score/stars at y=923–1025. The floor top ends at y=826; the slab's front edge shows to about y=835, about 46 px above the cards.
For six rows the floor centre is 514.24 and Y0=-0.2478829869 world tiles.
The camera stays at 60°, 120 px/tile (16-world-unit frame width), without zooming.
The pure tests check the whole footprint and a conservative 1.3-tile prop height
against the 55 px safe margins and HUD. Blender uses sin(60°); DESIGN/host round
it to .866, a subpixel difference across these levels.

The kopitiam has a light marble floor; zi char a warmer cream floor. Terrazzo
uses jade trim, tile uses A-05 wood #C7A16A. Golden uses terrazzo with band
cream upper height : jade lower band height = 1.618 : 1 within the counter front.
No border is drawn on floor tiles. Each scene surface has one
subtle treatment; shared bodies retain A-05 matte materials. Lights are kalib's
day rig. The six jobs read no pipeline settings: hashes cover the level JSON,
levels.py, station_geometry.py, kalib.py and job arguments only. Choosing a shipped
look changes its set's folder/look in pipeline.levels.json, not the render jobs.

Backgrounds use a dedicated exact-size packing path, represented as ordinary
single-frame pages in round budgets and as level-background lookup entries.
Full and half are lossy q90 WebP, 1920×1080 and 960×540. Anchors and collision
files are content-hashed preload files in each level's round, alongside existing
Tabao Rush sets. Board alternatives are never preloaded into shipped rounds.

## Round 2 review fixes

Requirements: TR-050, TR-057 (also TR-010 item ownership).
Static A-05 fixture metadata now controls both rendering and bakedBodies;
carried/consumable item bodies are excluded, leaving the extinguisher counter.
Low structural bodies have no surround. Level rounds inherit the complete
Tabao Rush round, including step icons. Packed anchor/collision references name
hashed runtime files. Tests compare exported walkable tiles with compileLevel,
check render-input mutations and gate the level projection suite through Vitest.
Terrazzo and golden share three chip sizes and muted palette tones.
Jade is `VENUE_JADE` (#5E9C84) in `tools/blender/levels.py`, outside
`station_geometry.PALETTE`, so station stamps are unchanged.
Golden splits the counter front within its 0.60 height:
cream upper section : jade lower band = 1.618 : 1; there is no floor border.

## Close-out (superseded by Round 3 / integrator renders)

Code and tests only this round. No Blender, renders, production packs, verify,
UAT, perf, installs or commits run. Sparse checkout settings unchanged.
Synthetic temporary test images exercise pack mechanics; no visual acceptance
or real-render texture/budget result is claimed. Existing board images and costs
remain round 1 evidence and are explicitly labelled pending regeneration.

## Requests (superseded by Round 3 / integrator renders)

Integrator: render all six jobs sequentially using pipeline.py --render --only
"level-<level>-<look>" --no-pack; then pack with pipeline.py, regenerate the board
with level_board.py and run pipeline.py --check-stale. Measure empty floor in
each terrazzo/golden background using level_floor.py with --crop 800 450 1100 550;
the required standard deviation is 3–9 greyscale levels on 0–255. Inspect at 1×
on TV, body silhouettes, counter split, HUD clearance and the complete round
budgets. Shared station_geometry.py palette changes also invalidate station
renders: refresh any jobs reported stale before expecting the suite to pass.

## Round 2 permitted check results

All checks ran sequentially, with a 600-second limit on each long-running
command; no timeout was reached. pnpm commands used
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false.

- `python3 -m unittest discover -s tools/assets -p 'test_level*.py'`: 4 passed.
- `python3 -m unittest discover -s tools/blender -p 'test_levels.py'`: 4 passed.
- **Superseded by Round 3 / integrator renders:** Requested Vitest command (VITEST_MAX_WORKERS=2): 87 passed, 1 failed across
  6 files (48.68 s). The Python assets child ran 112 tests, with 1 failure and
  1 skip; failure is `test_retired_jobs_and_stamp_changes`, identifying
  `station-chop: content stamp differs`. Shared palette edits invalidate station
  stamps; level stamps also need integrator rendering. No freshness bypass or
  stamp rewrite was used. All six new collision comparisons passed.
- `pnpm exec tsc -b tsconfig.build.json`, then `--clean`: passed. The exporter
  uses an extensionless dynamic import through its existing Node resolver,
  avoiding TS5097 on the prior literal `.ts` import. Initial path error in the new collision test was fixed and its
  six cases passed on rerun.
- `pnpm exec eslint tools games/tabao-rush/src/levels --max-warnings 0`: passed.
- **Superseded by Round 3 / integrator renders:** No production `--check-stale` or floor measurement was run this round; those
  require the integrator's new renders.

## Round 3 / integrator renders

Integrator evidence supplied for commit `80993a7a`: all six renders refreshed.
Jade is local to levels.py; A-05 station bodies and stamps are unchanged.
`pipeline.py --check-stale` was clean: 6 level and 15 station jobs fresh.
The tools/assets Python suite reported 112 OK.

Empty-floor standard deviation, measured with `level_floor.py --crop 800 450 1100 550`:

| Venue | Terrazzo | Golden | Tile |
|---|---:|---:|---:|
| Kopitiam | 4.778 | 4.780 | 2.364 |
| Zi char | 4.354 | 4.354 | 1.510 |

The 3–9 band gates terrazzo and golden only.
Kopitiam round: 2,528,142 / 8,000,000 B sent and
63,745,680 / 256,000,000 B decoded. Zi char round:
2,570,664 / 8,000,000 B sent and 63,745,680 / 256,000,000 B decoded
(round-5 renders; packed manifest).

Round 3 adds a committed-render speckle regression test and an inset steel top
inside the trim edge of counters without a baked body. No Blender or renders
run here. The integrator rerendered in round 5 (e6799b68); the figures above are from
those renders.
See `uat/evidence/A-06-level-backgrounds/REPORT.md`. Host drawing (T-17), the
3 m check and Randy's venue choice remain pending.

### Round 3 review-fix check results

- `python3 -m unittest discover -s tools/assets`: 113 run, 112 passed,
  1 failed (`test_retired_jobs_and_stamp_changes`: content stamp differs for
  `level-kopitiam-first-shift-terrazzo`). The countertop source change requires
  integrator rerendering; no stamp was rewritten.
- `python3 -m unittest discover -s tools/assets -p 'test_level_pipeline.py'`:
  5 passed, including all four committed speckled floors and the flat-floor check.
- `python3 -m unittest discover -s tools/blender -p 'test_levels.py'`: 4 passed.
- Vitest collision-export test: 6 passed; `VITEST_MAX_WORKERS=2`, 600-second
  timeout, completed in 375 ms.
- `tsc -b tsconfig.build.json`, then `--clean`: passed.

All pnpm commands used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`.
No Blender, renders, installs, verify, UAT or commits were run.
