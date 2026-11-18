# A-10 — TR-041 source checks

All five authorised checks pass on the final source. Each started after `uptime`
reported a 1-minute load below 8. No memcheck command was run.

| Command | Pre-start 1-minute load | Result |
|---|---|---|
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | 3.95 | Exit 0; 41 tests, 9.631 s |
| `python3 -m py_compile tools/blender/items.py` | 3.08 | Exit 0 |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/items.test.ts tools/assets` | 3.15 | Exit 0; 2 files, 9 tests, 9.95 s (includes Python discovery wrapper) |
| `pnpm exec eslint tools --max-warnings 0` | 3.61 | Exit 0; no warnings |
| `pnpm run lint:design` | 3.15 | Exit 0; 400 files scanned |

Earlier intermediate runs also passed (39 Python tests before adding final sheet
inventory/staleness checks; then 41; targeted Vitest 9/9). No failing run occurred.

New pure checks cover rojak ingredient/dough diversity, mound bounds and broad
sauce patches, turnip dimensions and material contrast, chicken fan geometry and
skin/cut faces, broth rim closure and bowl recipe selection, ready-food material
contrast against ceramic, simplified noodles, both drink highlights, sheet case
coverage, composition placement, exact 1×/4× pixel extents and stale-render refusal.
Existing TR-040/TR-041 reachable-art coverage remains passing.

Historical A-04 round-11 1×/4× cup evidence and both round-11/12 reports were
inspected as context. No new Blender render, art PNG, evidence-sheet run, browser,
UAT or visual acceptance is claimed. `items` is stale; the integrator must render,
refresh pixel footprints, inspect fresh checks/sheets and measure atlas budgets.
No full verify, full-suite Vitest, perf, install, dependency addition, source-asset
edit, commit or merge was performed.
