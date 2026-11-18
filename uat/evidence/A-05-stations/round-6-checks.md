# Round 6 code checks (TR-030, TR-031, TR-010)

No rendering, packing, strips generation, verify, UAT, perf, Vitest, install,
node_modules linking or commit was performed. All launches below were under load 8.

| Permitted check | 1-minute load at launch | Result |
| --- | --- | --- |
| Blender unittest discovery, first run | 7.36 | 31 tests; one new overstrict sparks assertion failed, then corrected to exact A-07 boxes |
| Assets unittest discovery, first run | 6.05 | 86 tests; 41 failures including subtests, stale-render causes below |
| Blender unittest discovery, second run | 5.48 | 31 passed |
| pipeline.py --check-stale | 7.61 | exit 1; all 15 station jobs stale, all other jobs fresh |
| Assets unittest discovery, final run | 7.88 | 86 tests; 41 failures including subtests; round-6-assets-tests.log |
| Blender unittest discovery, final run | 6.72 | 31 passed |

Render-dependent failures:
- test_committed_plaque_ink_at_all_four_edge_midpoints: 31 edge subtests fail on round-5 drawn/phi cue PNGs.
- test_committed_smoke_rises_grows_and_changes_visibly: old smoke has insufficient travel.
- test_committed_working_sheets_retain_visible_unclipped_steam: eight kind/theme subtests fail on old sheets.
- test_cook_body.CookDecisionJobTests.test_retired_jobs_and_stamp_changes: this existing test requires every non-cook render job to be fresh, so stale station jobs fail it.

Stale jobs (content stamp differs): station-chop, station-wok, station-pot,
station-grill, station-rice, station-drinks, station-plating, station-sink,
station-bin, station-serving, station-dish-rack, station-return-counter,
station-ingredient-crate, station-overlays, station-phi.

Render each using `python3 tools/assets/pipeline.py --render --only <job> --no-pack`.
After all jobs, pack with `python3 tools/assets/pipeline.py`, then generate strips:

```sh
python3 tools/assets/station_strips.py --fire assets/src/tabao-rush/effects/fire/fire-0.png --steam assets/src/tabao-rush/effects/steam/steam-1.png --out uat/evidence/A-05-stations/rendered
```

Static working sheets deliberately use A-07 steam frame 1. Its alpha >8 has 165
pixels outside the bar/plaque boxes; frame 0 has only 125, even unclipped.
All four steam and sparks source boxes are tested at the real effect anchor.
No round-6 visual pass or measured render/pack results are claimed.
