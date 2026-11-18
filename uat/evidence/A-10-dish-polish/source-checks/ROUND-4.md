# A-10 round 4 source checks — TR-041; D-145

Only the five authorised check commands were used. Each was started after a fresh
`uptime` reading with 1-minute load <8. No memcheck, Blender, render, full verify,
whole-suite Vitest, UAT, perf, install, generated PNG edit, commit or merge was run.

| Command | Load before final run | Result |
|---|---:|---|
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | 4.76 | PASS: 68 tests, 24.173s |
| `python3 -m unittest discover -s tools/blender -p 'test_*.py'` | 5.75 | PASS: 15 tests, 1.174s |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/items.test.ts tools/assets` | 5.14 | PASS: 3 files, 11 tests, 36.59s |
| `pnpm exec eslint tools --max-warnings 0` | 7.11 | PASS: exit 0, no diagnostics |
| `pnpm run lint:design` | 6.80 | PASS: 408 files |

Final logs: `round4-assets.txt`, `round4-blender.txt`, `round4-vitest.txt`.
Lint logs: `round4-eslint.txt`, `round4-design.txt`. All five final commands exited 0.

## Regression evidence

The first assets-suite run before any geometry change ran the new positive guard
on round-3 chicken and failed:

```text
FAIL: test_all_dish_portions_break_composition_with_margin
(dish='chicken-rice', food='chicken')
AssertionError: 6.8267066766691675 not greater than 7.5
```

The final passing test `test_round3_chicken_fails_new_mean_difference_guard`
reconstructs round-3 geometry and scale, including its .018 skin band, and asserts
that the same positive >7.5 guard raises AssertionError. Baseline drop difference
is 6.826707; minimum shift difference is 5.015254. The baseline has insufficient
mean-channel margin even though flat authored colours predict rejection through
the fraction-over-40 gate. This is deliberately a stronger smoke check, not a
claim to reproduce the failed rendered score.

Development runs found and corrected a missing ribbon-capture default, container
anchor drift (anchors restored), and doubled-width ribbon projection. The first
Vitest attempt also hit its nested Python-suite 60s timeout while that suite was
still failing and running concurrently. The final targeted Vitest run passes
with corrected projection and without a concurrent Python suite.

## Final predictions

Difference = maximum mean absolute RGBA channel on the production 0–255 scale.
All drops >7.5; all four 10px shifts >6; all visible shares >5%.

| Dish | Portion | Visible share | Drop difference | Minimum 10px shift difference |
|---|---|---:|---:|---:|
| chicken-rice | rice | 19.95% | 13.968 | 7.247 |
| chicken-rice | chicken | 16.71% | 16.070 | 12.995 |
| chicken-rice | cucumber | 8.31% | 10.131 | 11.812 |
| char-kway-teow | kway-teow | 33.15% | 60.305 | 49.609 |
| satay | cucumber | 7.48% | 9.558 | 10.596 |
| satay | satay | 25.29% | 34.623 | 20.110 |
| laksa | laksa-broth | 49.22% | 65.739 | 40.976 |
| laksa | noodles | 20.47% | 13.208 | 13.402 |
| rojak | pineapple | 7.95% | 12.542 | 12.656 |
| rojak | turnip | 19.05% | 16.144 | 15.059 |
| rojak | cucumber | 6.24% | 7.894 | 8.306 |
| rojak | rojak-dressing | 13.06% | 16.795 | 18.815 |
| kaya-toast | bread | 19.05% | 28.566 | 16.202 |
| kaya-toast | drink-side | 16.26% | 12.243 | 15.415 |
| kopi-teh | kopi | 54.52% | 93.374 | 66.847 |

All 21 projected icon pairs <0.75; closest chicken rice / char kway teow =
0.7457072771872445. All 21 committed-pixel icon pairs also pass. Chicken box/band
corners remain within the 0.31-world-unit plate footprint.

Flat-colour predictions omit lighting/bevel/ink and approximate intra-portion
depth; container bases are ellipses, portion vessels/icons use lathe hulls. Fresh
render validation and 1× visual review remain the integrator's work. Integrator
commands are in the slice note's Round 4, including the selected turnip environment
and a fresh `round4` sheet directory.
