# A-10 round 3 source checks — TR-041; D-145

All five authorised commands passed. The 1-minute load reported by `uptime`
was below 8 immediately before each command. No memcheck, Blender, render,
full verify, whole-suite Vitest, UAT, perf, install, commit or merge was run.

| Command | Load | Result |
|---|---:|---|
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | 2.33 | PASS — 64 tests |
| `python3 -m unittest discover -s tools/blender -p 'test_*.py'` | 2.25 | PASS — 15 tests |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/items.test.ts tools/assets` | 2.28 | PASS — 3 files, 11 tests |
| `pnpm exec eslint tools --max-warnings 0` | 2.34 | PASS |
| `pnpm run lint:design` | 2.97 | PASS — 408 files |

Full output is in the adjacent round3-*.log files. An earlier asset-suite run
(load 2.57) caught a local variable collision in the newly added edge bands;
renaming that local fixed both errors before the passing run recorded here.

`python3 tools/assets/pipeline.py --refresh-item-metadata` also succeeded against
the committed PNGs. Exactly the seven stale footprint records changed; existing
bakedOutline flags already matched the pixels. No PNG was modified.
The refresh regression verifies repair and idempotence. The committed icon smoke
check covers all 21 pairs (<0.75). Projected chicken rice / rojak IoU is 0.706197;
rojak projected shares are 0.079697, 0.191007, 0.062535 and 0.130979.
These are smoke checks. Round-3 rendering, rendered checks, options artifact,
visual review and atlas budgets remain integrator work.
