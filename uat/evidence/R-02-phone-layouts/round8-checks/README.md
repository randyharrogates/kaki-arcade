# R-02 round 8 checks — RZ-003 / RZ-005

Each check started only after `uptime` showed one-minute load below 8.
Final command results:

| Command | Load | Result | Log |
| --- | ---: | --- | --- |
| `PLAYWRIGHT_BROWSERS_PATH=/nonexistent VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz apps/web/src` | 6.80 | exit 1: 726 passed; six browser tests not run | `vitest.log` |
| `pnpm exec tsc -b tsconfig.build.json` | 6.38 | exit 0 | `tsc.log` |
| `pnpm exec eslint games/rabakz apps/web/src --max-warnings 0` | 7.12 | exit 0 | `eslint.log` |
| `pnpm run lint:design` | 7.73 | exit 0: 422 files | `design.log` |

Vitest's six failures occur at Chromium launch: the executable does not exist
under `/nonexistent`. Browser assertions did not execute in Overlap.dom,
PeekPoker.dom, host-keyboard.dom, layout-fixtures, rabakz-phone.dom and
team-polish tests. These are **not run**, not browser passes.

The new pure regression exercises all five existing DOM-test status labels
with long options at 667×375, 844×390 and 932×430. It requires a fitting panel
for each, and requires the horizontal fallback for both locked states at 667.
Existing test expectations and selectors were not changed.

Earlier checks: initial Vitest (load 2.50) and TypeScript (3.03) passed their
executable checks; strengthened Vitest (6.91) also passed executable checks.
Initial ESLint (7.26) found one unnecessary optional chain in the new test;
it was removed before the successful final ESLint. Initial design lint (7.91)
passed. Final Vitest includes the additional Right/Wrong/Skipped cases.

Calculated widths, not browser measurements:

| Viewport | Three-block strip: each block | Status content after pill padding | Answer grid | 21 px answer label capacity | Choosing score strip |
| --- | ---: | ---: | ---: | ---: | ---: |
| 667×375 | 205 | 163 | 518 | 206.5 | 641 |
| 844×390 | 264 | 222 | 695 | 295 | 818 |
| 932×430 | 293.33 | 251.33 | 783 | 339 | 906 |

Strip height: 55 px. Three-block width is `(viewport − 26 − 2×13) / 3`.
Status pill keeps 21 px padding on both sides. Answer grid width reserves
26 px margins, 89 px Skip and 34 px clearance. Its label capacity is
`(grid − 13) / 2 − 21 − 13 − 2×5 − 2×1`. Choosing score and private locked
status occur in different states and do not compete for width.

No verify, UAT, perf, install, node_modules linking or commit was run.
Browser fit and contrast still require the integrator's Chromium execution.
