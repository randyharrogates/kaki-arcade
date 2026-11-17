# A-04 round 12 — automated checks (TR-040, TR-041)

All seven authorised checks passed; uptime was below 8 before each started.
Footprint records match committed PNGs, containment passes, and outline flags
match committed pixel ink. Direct Python invocation includes all 25 tests.
No rendering, browser, UAT, memcheck, installation, full verify, commit or merge
was performed. Visual approval remains with the integrator under D-145.

| Command | Result | Pre-start 1-minute load |
|---|---|---|
| `python3 -m py_compile tools/blender/items.py tools/assets/pipeline.py tools/assets/test_pipeline.py` | Passed, exit 0 | 4.96 |
| `python3 -m unittest discover -s tools/assets -p "test_*.py"` | Passed, 25 tests, exit 0 | 4.96 |
| `python3 tools/assets/test_pipeline.py` | Passed, 25 tests, exit 0 | 5.02 |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/items.test.ts tools/assets games/tabao-rush/src/rules` | Passed, 263 tests in 19 files, 212.72 s, exit 0 | 7.59 |
| `pnpm exec tsc -b tsconfig.build.json` | Passed, exit 0 | 6.91 |
| `pnpm exec eslint tools/items.test.ts tools/assets games/tabao-rush/src/rules` | Passed, exit 0 | 6.92 |
| `pnpm run lint:design` | Passed, 377 files scanned, exit 0 | 6.85 |
