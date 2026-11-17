# A-04 round 11 — TR-040/TR-041

Automated checks only; no render, browser or UAT was run.

Each command started after uptime reported a 1-minute load below 8:

| Command | Load before start | Result |
| --- | --- | --- |
| `python3 -m py_compile tools/blender/items.py tools/assets/pipeline.py` | 3.87 | exit 0 |
| `python3 -m unittest discover -s tools/assets -p "test_*.py"` | 3.64 | exit 0; 23 tests passed |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/items.test.ts tools/assets games/tabao-rush/src/rules` | 6.64 | exit 0; 19 files, 262 tests passed; 189.07 s |
| `pnpm exec tsc -b tsconfig.build.json` | 6.13 | exit 0 |
| `pnpm exec eslint tools/items.test.ts tools/assets` | 6.10 | exit 0 |

The first targeted Vitest run (load 3.39) exited 1: 261 tests passed,
and the wrapper failed because it expected `Ran 21 tests` while Python reported
23 passing tests. The wrapper now requires a positive count while retaining
successful process exit and OK assertions. The full authorised targeted command
was rerun successfully after waiting for load to fall below 8.

The fixture includes transitive frame references from fixed compositions,
content overrides and served variants. Missing references now raise a ValueError
naming the owner and missing frame. A regression test covers each of those three
composition paths. Existing baked-outline scale rejection remains in place.

No memory check, full verify, install, dependency changes, commit or merge.

## Integrator's look (2026-11-18)

Full check after merging main: first run failed one test (conformance-attacks "round 3 permits
needless private revisions"), which passed 3 of 3 alone in this worktree and on main; the rerun
passed: 178 files, 3,600 tests, every budget, trace check. Opened a04-cups-1x.png and
a04-cups-4x.png (side cup clean, kopi and teh portions, plated kaya toast, on the counter tone):
the side cup's outline is now continuous at its final size (round 9 showed a dotted outline from
scaling); the served kaya toast shows the cup and its drink in the side slot. Dish polish stays
with A-10 (D-145).
