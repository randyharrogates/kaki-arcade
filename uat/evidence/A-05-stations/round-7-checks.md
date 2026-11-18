# Round 7 checks

Python: existing 3.11.5 with Pillow; default shim lacks Pillow. No installation.

## python3 -m unittest discover -s tools/blender -p test_*.py

Launch load: 2.06298828125; exit: 1

```text
.........................F.....
======================================================================
FAIL: test_effect_boxes_clear_plaque_for_every_burnable_kind (test_station_geometry.StationGeometryTests.test_effect_boxes_clear_plaque_for_every_burnable_kind)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/randy/projects/personal/web-apps/kaki-arcade-wt/A-05/tools/blender/test_station_geometry.py", line 125, in test_effect_boxes_clear_plaque_for_every_burnable_kind
    self.assertEqual(bounds, expected[file.stem], (kind,file))
AssertionError: Tuples differ: (82.0, 52.0, 106.0, 74.0) != (83, 54, 105, 72)

First differing element 0:
82.0
83

- (82.0, 52.0, 106.0, 74.0)
+ (83, 54, 105, 72) : ('chop', PosixPath('/Users/randy/projects/personal/web-apps/kaki-arcade-wt/A-05/assets/src/tabao-rush/effects/sparks/sparks-2.png'))

----------------------------------------------------------------------
Ran 31 tests in 1.637s

FAILED (failures=1)
FACE CHECK back.png: coverage=0.740 mean=0.465 std=0.239
FACE CHECK back.png: coverage=0.740 mean=0.430 std=0.250
FACE CHECK back.png: coverage=0.740 mean=0.454 std=0.249
FACE CHECK paper.png: coverage=0.740 mean=0.967 std=0.017
FACE CHECK paper.png: coverage=0.740 mean=0.967 std=0.017
FACE CHECK paper.png: coverage=0.740 mean=0.969 std=0.000

```

## python3 -m unittest discover -s tools/assets -p test_*.py

Launch load: 2.06298828125; exit: 1

```text
....F..............................................................................FFFFFFFF......
======================================================================
FAIL: test_retired_jobs_and_stamp_changes (test_cook_body.CookDecisionJobTests.test_retired_jobs_and_stamp_changes)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/randy/projects/personal/web-apps/kaki-arcade-wt/A-05/tools/assets/test_cook_body.py", line 138, in test_retired_jobs_and_stamp_changes
    self.assertIsNone(p.stale_reason(outputs, stamp, digest))
AssertionError: 'content stamp differs' is not None

======================================================================
FAIL: test_committed_working_sheets_retain_visible_unclipped_steam (test_stations.StationCommittedPixelTests.test_committed_working_sheets_retain_visible_unclipped_steam) (kind='wok', theme='light')
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/randy/projects/personal/web-apps/kaki-arcade-wt/A-05/tools/assets/test_stations.py", line 198, in test_committed_working_sheets_retain_visible_unclipped_steam
    self.assertGreaterEqual(visible,floors[kind],'Regenerate working sheets after rendering: visible steam pixels')
AssertionError: 0 not greater than or equal to 110 : Regenerate working sheets after rendering: visible steam pixels

======================================================================
FAIL: test_committed_working_sheets_retain_visible_unclipped_steam (test_stations.StationCommittedPixelTests.test_committed_working_sheets_retain_visible_unclipped_steam) (kind='pot', theme='light')
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/randy/projects/personal/web-apps/kaki-arcade-wt/A-05/tools/assets/test_stations.py", line 198, in test_committed_working_sheets_retain_visible_unclipped_steam
    self.assertGreaterEqual(visible,floors[kind],'Regenerate working sheets after rendering: visible steam pixels')
AssertionError: 2 not greater than or equal to 165 : Regenerate working sheets after rendering: visible steam pixels

======================================================================
FAIL: test_committed_working_sheets_retain_visible_unclipped_steam (test_stations.StationCommittedPixelTests.test_committed_working_sheets_retain_visible_unclipped_steam) (kind='grill', theme='light')
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/randy/projects/personal/web-apps/kaki-arcade-wt/A-05/tools/assets/test_stations.py", line 198, in test_committed_working_sheets_retain_visible_unclipped_steam
    self.assertGreaterEqual(visible,floors[kind],'Regenerate working sheets after rendering: visible steam pixels')
AssertionError: 1 not greater than or equal to 145 : Regenerate working sheets after rendering: visible steam pixels

======================================================================
FAIL: test_committed_working_sheets_retain_visible_unclipped_steam (test_stations.StationCommittedPixelTests.test_committed_working_sheets_retain_visible_unclipped_steam) (kind='rice', theme='light')
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/randy/projects/personal/web-apps/kaki-arcade-wt/A-05/tools/assets/test_stations.py", line 198, in test_committed_working_sheets_retain_visible_unclipped_steam
    self.assertGreaterEqual(visible,floors[kind],'Regenerate working sheets after rendering: visible steam pixels')
AssertionError: 1 not greater than or equal to 175 : Regenerate working sheets after rendering: visible steam pixels

======================================================================
FAIL: test_committed_working_sheets_retain_visible_unclipped_steam (test_stations.StationCommittedPixelTests.test_committed_working_sheets_retain_visible_unclipped_steam) (kind='wok', theme='dark')
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/randy/projects/personal/web-apps/kaki-arcade-wt/A-05/tools/assets/test_stations.py", line 198, in test_committed_working_sheets_retain_visible_unclipped_steam
    self.assertGreaterEqual(visible,floors[kind],'Regenerate working sheets after rendering: visible steam pixels')
AssertionError: 0 not greater than or equal to 110 : Regenerate working sheets after rendering: visible steam pixels

======================================================================
FAIL: test_committed_working_sheets_retain_visible_unclipped_steam (test_stations.StationCommittedPixelTests.test_committed_working_sheets_retain_visible_unclipped_steam) (kind='pot', theme='dark')
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/randy/projects/personal/web-apps/kaki-arcade-wt/A-05/tools/assets/test_stations.py", line 198, in test_committed_working_sheets_retain_visible_unclipped_steam
    self.assertGreaterEqual(visible,floors[kind],'Regenerate working sheets after rendering: visible steam pixels')
AssertionError: 2 not greater than or equal to 165 : Regenerate working sheets after rendering: visible steam pixels

======================================================================
FAIL: test_committed_working_sheets_retain_visible_unclipped_steam (test_stations.StationCommittedPixelTests.test_committed_working_sheets_retain_visible_unclipped_steam) (kind='grill', theme='dark')
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/randy/projects/personal/web-apps/kaki-arcade-wt/A-05/tools/assets/test_stations.py", line 198, in test_committed_working_sheets_retain_visible_unclipped_steam
    self.assertGreaterEqual(visible,floors[kind],'Regenerate working sheets after rendering: visible steam pixels')
AssertionError: 1 not greater than or equal to 145 : Regenerate working sheets after rendering: visible steam pixels

======================================================================
FAIL: test_committed_working_sheets_retain_visible_unclipped_steam (test_stations.StationCommittedPixelTests.test_committed_working_sheets_retain_visible_unclipped_steam) (kind='rice', theme='dark')
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/randy/projects/personal/web-apps/kaki-arcade-wt/A-05/tools/assets/test_stations.py", line 198, in test_committed_working_sheets_retain_visible_unclipped_steam
    self.assertGreaterEqual(visible,floors[kind],'Regenerate working sheets after rendering: visible steam pixels')
AssertionError: 1 not greater than or equal to 175 : Regenerate working sheets after rendering: visible steam pixels

----------------------------------------------------------------------
Ran 90 tests in 29.283s

FAILED (failures=9)
tabao-rush-cook-body-0: 20×40, waste 36.0%, 98 bytes, 3200 decoded
tabao-rush-cook-heads-0: 20×40, waste 36.0%, 98 bytes, 3200 decoded
PERF-023/024 passed: 2 atlases; manifest 2091 bytes
q90 cook difference: {'rgbMae': 1.9173932318604996, 'alphaMax': 0}
Predicted composition chicken-rice [{'food': 'rice', 'share': 0.19954988747186797, 'drop': 13.9679919979995, 'shiftMin': 7.2470617654413605}, {'food': 'chicken', 'share': 0.16711990497624407, 'drop': 16.069767441860463, 'shiftMin': 12.994998749687422}, {'food': 'cucumber', 'share': 0.08311452863215804, 'drop': 10.130782695673918, 'shiftMin': 11.81245311327832}]
Predicted composition char-kway-teow [{'food': 'kway-teow', 'share': 0.331451713785339, 'drop': 60.304728546409805, 'shiftMin': 49.608956717538156}]
Predicted composition satay [{'food': 'cucumber', 'share': 0.07480327254559081, 'drop': 9.55783162628029, 'shiftMin': 10.595553334998751}, {'food': 'satay', 'share': 0.2529040719460405, 'drop': 34.62253310017487, 'shiftMin': 20.11016737446915}]
Predicted composition laksa [{'food': 'laksa-broth', 'share': 0.4922303473491773, 'drop': 65.73857404021938, 'shiftMin': 40.97592931139549}, {'food': 'noodles', 'share': 0.20473415600243755, 'drop': 13.207800121876904, 'shiftMin': 13.401584399756246}]
Predicted composition rojak [{'food': 'pineapple', 'share': 0.07947299324831208, 'drop': 12.5423855963991, 'shiftMin': 12.655663915978995}, {'food': 'turnip', 'share': 0.19046949237309327, 'drop': 16.14403600900225, 'shiftMin': 15.058764691172794}, {'food': 'cucumber', 'share': 0.06235933983495874, 'drop': 7.894473618404601, 'shiftMin': 8.306076519129782}, {'food': 'rojak-dressing', 'share': 0.1306107776944236, 'drop': 16.794948737184296, 'shiftMin': 18.81495373843461}]
Predicted composition kaya-toast [{'food': 'bread', 'share': 0.19054916187140356, 'drop': 28.56617463097323, 'shiftMin': 16.20215161371028}, {'food': 'drink-side', 'share': 0.16257505629221916, 'drop': 12.243432574430823, 'shiftMin': 15.415061295971979}]
Predicted composition kopi-teh [{'food': 'kopi', 'share': 0.5451914514692787, 'drop': 93.3739982190561, 'shiftMin': 66.84683882457702}]
Projected closest icons: (0.7457072771872445, 'chicken-rice', 'char-kway-teow')
Chicken rice / rojak predicted icon IoU: 0.714176
Rojak projected visible shares: [0.079697, 0.191007, 0.062535, 0.130979]
Round 3 chicken prediction {'food': 'chicken', 'share': 0.08802200550137534, 'drop': 6.8267066766691675, 'shiftMin': 5.015253813453364, 'scores': [{'meanAbsoluteRGBA': [1.188797199299825, 4.231307826956739, 6.8267066766691675, 0.0], 'fractionOver40': 0.08177044261065267, 'passes': False}, {'meanAbsoluteRGBA': [1.2300575143785946, 3.744936234058515, 5.89697424356089, 0.012003000750187547], 'fractionOver40': 0.06726681670417604, 'passes': False}, {'meanAbsoluteRGBA': [1.259064766191548, 3.291572893223306, 5.015253813453364, 0.0], 'fractionOver40': 0.05476369092273068, 'passes': False}, {'meanAbsoluteRGBA': [1.703675918979745, 5.371842960740185, 8.502125531382847, 0.0], 'fractionOver40': 0.09927481870467617, 'passes': False}, {'meanAbsoluteRGBA': [2.0305076269067266, 7.195798949737434, 11.59964991247812, 0.0], 'fractionOver40': 0.1385346336584146, 'passes': False}]}
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1050 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 4688 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 64×64, waste 37.5%, 512 bytes, 16384 decoded
diagnostic-walk-1: 64×64, waste 41.4%, 562 bytes, 16384 decoded
diagnostic-walk-2: 64×64, waste 60.2%, 368 bytes, 16384 decoded
PERF-023/024 passed: 3 atlases; manifest 5770 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
repeat-0: 20×40, waste 36.0%, 38 bytes, 3200 decoded
PERF-023/024 passed: 1 atlases; manifest 1330 bytes
repeat-0: 20×20, waste 36.0%, 38 bytes, 1600 decoded
repeat-1: 20×20, waste 36.0%, 38 bytes, 1600 decoded
PERF-023/024 passed: 2 atlases; manifest 1638 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 32×32, waste 59.4%, 336 bytes, 4096 decoded
PERF-023/024 passed: 1 atlases; manifest 1122 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
solid-0: 12×12, waste 55.6%, 38 bytes, 576 decoded
PERF-023/024 passed: 1 atlases; manifest 1024 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
edges-0: 8×16, waste 75.0%, 62 bytes, 512 decoded
PERF-023/024 passed: 1 atlases; manifest 1108 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 64×64, waste 37.5%, 512 bytes, 16384 decoded
diagnostic-walk-1: 64×64, waste 41.4%, 562 bytes, 16384 decoded
diagnostic-walk-2: 64×64, waste 60.2%, 368 bytes, 16384 decoded
PERF-023/024 passed: 3 atlases; manifest 5770 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
items-0: 94×470, waste 8.3%, 46 bytes, 176720 decoded
PERF-023/024 passed: 1 atlases; manifest 3737 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
cook-0-body: 30×30, waste 24.9%, 62 bytes, 3600 decoded
cook-0-mask: 30×30, waste 24.9%, 60 bytes, 3600 decoded
PERF-023/024 passed: 2 atlases; manifest 6721 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
odd-0: 38×38, waste 19.9%, 38 bytes, 5776 decoded
PERF-023/024 passed: 1 atlases; manifest 1021 bytes
odd-0: 1926×1086, waste 0.6%, 130 bytes, 8366544 decoded
PERF-023/024 passed: 1 atlases; manifest 1064 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
tiles-0: 84×84, waste 9.3%, 44 bytes, 28224 decoded
PERF-023/024 passed: 1 atlases; manifest 7584 bytes
tiles-0: 304×304, waste 2.6%, 46 bytes, 369664 decoded
PERF-023/024 passed: 1 atlases; manifest 2237 bytes
tiles-0: 304×304, waste 2.6%, 46 bytes, 369664 decoded
PERF-023/024 passed: 1 atlases; manifest 2419 bytes
diagnostic-walk-0: 512×32, waste 59.8%, 1038 bytes, 65536 decoded
PERF-023/024 passed: 1 atlases; manifest 5054 bytes
items: migrated verified committed render stamp; no rendering or packing
tabao-rush-stations-0: 784×1568, waste 7.0%, 590 bytes, 4917248 decoded
PERF-023/024 passed: 1 atlases; manifest 13407 bytes

```

## python3 tools/assets/pipeline.py --check-stale

Launch load: 3.42236328125; exit: 1

```text
cards: fresh: content stamp matches and all outputs exist
items: fresh: content stamp matches and all outputs exist
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
effect-steam: fresh: content stamp matches and all outputs exist
effect-sparks: fresh: content stamp matches and all outputs exist
effect-fire: fresh: content stamp matches and all outputs exist
effect-spray: fresh: content stamp matches and all outputs exist
effect-shadow: fresh: content stamp matches and all outputs exist
station-chop: stale: content stamp differs
station-wok: stale: content stamp differs
station-pot: stale: content stamp differs
station-grill: stale: content stamp differs
station-rice: stale: content stamp differs
station-drinks: stale: content stamp differs
station-plating: stale: content stamp differs
station-sink: stale: content stamp differs
station-bin: stale: content stamp differs
station-serving: stale: content stamp differs
station-dish-rack: stale: content stamp differs
station-return-counter: stale: content stamp differs
station-ingredient-crate: stale: content stamp differs
station-overlays: stale: content stamp differs
station-phi: stale: content stamp differs

```

## Blender rerun after merged-effect box correction

Launch load: 4.22509765625; exit: 0

```text
...............................
----------------------------------------------------------------------
Ran 31 tests in 1.929s

OK
FACE CHECK back.png: coverage=0.740 mean=0.465 std=0.239
FACE CHECK back.png: coverage=0.740 mean=0.430 std=0.250
FACE CHECK back.png: coverage=0.740 mean=0.454 std=0.249
FACE CHECK paper.png: coverage=0.740 mean=0.967 std=0.017
FACE CHECK paper.png: coverage=0.740 mean=0.967 std=0.017
FACE CHECK paper.png: coverage=0.740 mean=0.969 std=0.000
```

## Integrator render and review steps

All 15 jobs are stale because both shared station sources are fingerprint inputs.
station-phi remains board-only, excluded from the runtime atlas. Run individually:

```sh
python3 tools/assets/pipeline.py --render --only station-chop --no-pack
python3 tools/assets/pipeline.py --render --only station-wok --no-pack
python3 tools/assets/pipeline.py --render --only station-pot --no-pack
python3 tools/assets/pipeline.py --render --only station-grill --no-pack
python3 tools/assets/pipeline.py --render --only station-rice --no-pack
python3 tools/assets/pipeline.py --render --only station-drinks --no-pack
python3 tools/assets/pipeline.py --render --only station-plating --no-pack
python3 tools/assets/pipeline.py --render --only station-sink --no-pack
python3 tools/assets/pipeline.py --render --only station-bin --no-pack
python3 tools/assets/pipeline.py --render --only station-serving --no-pack
python3 tools/assets/pipeline.py --render --only station-dish-rack --no-pack
python3 tools/assets/pipeline.py --render --only station-return-counter --no-pack
python3 tools/assets/pipeline.py --render --only station-ingredient-crate --no-pack
python3 tools/assets/pipeline.py --render --only station-overlays --no-pack
python3 tools/assets/pipeline.py --render --only station-phi --no-pack
python3 tools/assets/pipeline.py
python3 tools/assets/station_strips.py --fire assets/src/tabao-rush/effects/fire/fire-0.png --steam assets/src/tabao-rush/effects/steam/steam-3.png --out uat/evidence/A-05-stations/rendered
```

Review solid/outlined gold cells in greyscale at TV and half size, all refreshed
sheets and choice-3 labels, and reduced motion. Fill station page bytes, round
totals and progress-sheet evidence; review 8 remains pending.
