# A-07 implementation checks

Round-3 rendered evidence is committed in `rendered/`. The integrator and the round-4 reviewer
looked at every image. The implementation log below is historical.

- Blender pure suite: 17 tests passed; pre-launch 1-minute load 7.328.
- Assets suite first run: 71 tests, one failure in existing cook round-membership
  expectation after adding effects; new effect wiring test passed. Updated that
  expectation to include the required new set; rerun recorded below.
- ESLint tools: passed; pre-launch load 7.207. Final repeat below.
- Freshness: exit 1, pre-launch load 7.207. Exact output:

```text
cards: fresh: content stamp matches and all outputs exist
items: stale: content stamp differs
cook-body-idle: fresh: content stamp matches and all outputs exist
cook-body-walk: fresh: content stamp matches and all outputs exist
cook-body-carry-walk: fresh: content stamp matches and all outputs exist
cook-body-chop: fresh: content stamp matches and all outputs exist
cook-body-stir: fresh: content stamp matches and all outputs exist
cook-body-wash: fresh: content stamp matches and all outputs exist
cook-body-serve: fresh: content stamp matches and all outputs exist
cook-body-throw: fresh: content stamp matches and all outputs exist
cook-body-extinguish: fresh: content stamp matches and all outputs exist
cook-head-cap: fresh: content stamp matches and all outputs exist
effect-steam: stale: missing output steam-0.png
effect-sparks: stale: missing output sparks-0.png
effect-fire: stale: missing output fire-0.png
effect-spray: stale: missing output spray-0.png
effect-shadow: stale: missing output shadow-0.png
```

Missing jobs are expected. Items still hashes the changed pipeline config on this
branch. No stamp migration or stamping-code changes were made.

Final assets rerun: **71 passed** in 41.587 s; pre-launch load 7.168.
Final ESLint repeat: **passed**, pre-launch load 7.512.
All four allowed checks were launched below the 1-minute load threshold of 8.

## Round 2 — rendered fire revision

All five jobs (`effect-steam`, `effect-sparks`, `effect-fire`, `effect-spray`,
`effect-shadow`) were re-rendered. Fire pixels changed to pointed tongues; the
other effects' source pixels, modes and sizes are identical to round 1. Non-fire
source bytes differ only in Blender's Date/RenderTime PNG text chunks; the 24
non-fire review images are byte-identical. The six fire review images were replaced.

The integrator and round-2 reviewer looked at the rendered images. The reviewer
found fire readable at 3 m, at half detail and in greyscale, with a smooth loop
and no overshoot. Frame 0's left tip was partly hidden. Steam/spray on light
marble and shadow grain remain carried findings; in-game placement is T-07 work.

Round-2 freshness: all five effect jobs fresh; items alone stale with
`content stamp differs` on the branch and merged tree. Effects atlas measured
37,510 B transferred / 174,240 B decoded full, and 14,378 B / 43,560 B half.
These are round-2 measurements, to be remeasured after merging and rendering.

Permitted implementation checks: assets 71 passed, Blender pure suite 19 passed,
Vitest 41 files / 578 tests passed (pre-launch loads 2.57 / 2.54 / 2.45).
Rendering was subsequently done by the integrator, not the implementation agent.

## Round 3 — rendered and reviewed

Code: the items stamp hashes only its own set and job; the four effect geometry tests run under
Vitest; Cycles seed 0; fire phase shifted so frame 0 shows all three tips; Blender's Date and
RenderTime PNG text is dropped.

The integrator rendered effect-steam, effect-sparks, effect-fire, effect-spray, effect-shadow and
items with Blender, one at a time, then packed and rebuilt the strips (the strip script refuses an
existing folder, so it was rerun into a fresh one).

- Fire: frames 0–3 are pixel-identical to round-2 frames 2, 3, 0, 1 (phase offset only; the seed
  changed nothing). Frame 0 shows all three tips and the gold core. Feet fixed (x 21–74, bottom
  row 80). Changed alpha per step 374.6 / 246.2 / 340.7 / wrap 276.7: no pop. GIF 4 × 120 ms,
  loops. No overshoot.
- Steam, sparks, spray, shadow: source pixels identical to round 2; bytes 67 B smaller (Date and
  RenderTime removed). Their 24 review images and four GIFs are byte-identical to round 2.
  Cycles timing text remains in the PNGs, so a re-render can still change bytes (A-07b).
- Items: 62 of 63 PNGs pixel-identical; container-plate-dirty differs at one pixel by one level
  (render-validation luminanceVariance moved in the 8th decimal). Not visible; carried to A-01c.
- Freshness on the merged tree: --check-stale exits 0, all 17 jobs fresh. Assets suite 76 OK;
  effect geometry 4 OK.
- Pack: effects atlas 37,818 B / 174,240 B decoded full (66×660), 13,846 B / 43,560 B half.
  tabao-rush round 2,060,398 B + 355,179 B manifest (PERF-023 8 MB), 51,004,512 B decoded
  (PERF-024 256 MB).
- Looked at: all 30 images in rendered/, every GIF frame, the packed atlases, and a 3 m and
  greyscale simulation. Fire reads as fire at 3 m, at half detail and in greyscale, on both
  counters. Sparks read on the dark counter but are hard to see on the light one (best contrast
  about 1.9 : 1; nearly gone in greyscale at 3 m). Steam and spray are faint on light; the shadow
  is grainy. These go to A-07b (unlit sparks with an edge-red rim, 6×8 px; full PNG text strip;
  shadow grain), rendered once, before T-07 draws effects.
- Not proven here: in-game placement, fire on station art, spray at eight nozzle directions,
  playback (T-07).

Implementation checks (round 3) (pre-launch one-minute load from `uptime`):
- Assets: **72 passed**, 83.228 s, load **6.38**; `test_cook_body` passed.
  Initial run at **6.18** found an empty-config fixture in
  `test_pipeline.PipelineTests.test_items_render_contract`; updated that fixture
  to supply the items job/set, then reran successfully.
- Effect geometry: **4 passed**, load **5.78**.
- ESLint `tools/assets --max-warnings 0`: **passed**, load **5.58**.
- Vitest `tools/assets` with requested environment: **2 files / 6 tests passed**,
  25.96 s, load **5.23** (includes the assets suite and four effect geometry tests).
