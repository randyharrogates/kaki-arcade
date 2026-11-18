# Round 9 checks — RZ-003, RZ-005

Only the four authorised check commands were used. No browser assertions or UAT
were run; Chromium is unavailable at PLAYWRIGHT_BROWSERS_PATH=/nonexistent.

| Check | One-minute load before start | Result |
| --- | --- | --- |
| Vitest, before CSS edit | 2.42 | 726 passed; six browser launch failures |
| Vitest, after CSS edit | 4.12 | 726 passed; six browser launch failures |
| TypeScript build | 6.22 | Passed |
| ESLint | 5.49 | Failed: diagnostic console statement; removed |
| ESLint, corrected | 5.19 | Passed |
| Design lint | 4.86 | Passed, 422 files |

Vitest command: `PLAYWRIGHT_BROWSERS_PATH=/nonexistent VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz apps/web/src`.
Other commands: `pnpm exec tsc -b tsconfig.build.json`,
`pnpm exec eslint games/rabakz apps/web/src --max-warnings 0`,
`pnpm run lint:design`.

Browser tests **not run**: Overlap, PeekPoker, host-keyboard, layout-fixtures,
rabakz-phone and team-polish. All six stop at Chromium launch. The pre-edit
invocation cannot establish a failing layout assertion. The exact Mentsuyu bank
question and explicit top-strip regression assertion were added subsequently;
the integrator must demonstrate red/green against the previous CSS externally.

Calculated capacity for a leader's answer labels at the 21 px step (not measured
span widths):

| Viewport | Question | Answered / Locked in | Locked out | Scoreboard |
| --- | --- | --- | --- | --- |
| 667 × 375 | 205 px | 205 px | 205 px | No answers |
| 844 × 390 | 293.5 px | 293.5 px | 293.5 px | No answers |
| 932 × 430 | 337.5 px | 337.5 px | 337.5 px | No answers |

Grid width = viewport width − 26 − 123. Each column is (grid width − 8)/2.
Subtract 10 px padding, 6 px border, 21 px shape and 13 px shape gap.
Button heights are 102.5 / 110 / 130 px with the fixture's 68 px shell header.
Actual spans shrink to their rendered text; their widths remain unmeasured.

Longest alphabetic word found: Somatosensation, 15 letters (tied). Longest
whitespace-delimited token: Cretaceous-Paleogene, 19 characters. Both are bank
derived fixtures alongside long phrases. Wasabi / Mentsuyu / Karashi / Ponzu is
tested separately so long phrases cannot mask the original narrow-side case by
triggering the pre-existing fallback.
