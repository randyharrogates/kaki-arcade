# C-15 validation

| Check | Result |
| --- | --- |
| Browser tests (12 apps/web Chromium tests, two workers), round 10 | 12 passed; `phone-coverage.dom.test.ts` also passed 3 runs in a row on its own |
| apps/web unit tests after merging main | 516 passed (round 9); Codex round 10: 504 non-browser passed |
| TypeScript build check, ESLint, design lint | Passed |
| Eight-phone UAT `round6-p8/` (round 10 code) | Passed; every still and strip looked at by the integrator (REPORT.md); still 63 showed a browser focus ring |
| Veil focus-ring fix at merge, `phone-coverage.dom.test.ts` | Passed; the fresh-page check (key press, no pointer input) fails with `outline auto` when the CSS rule is removed |
| Eight-phone UAT `round7-p8/` (with the fix) | Steps up to D-099 passed; D-099 failed after its captures on an unexpected host ERR_CONNECTION_RESET (C-15f), and the failure shots then exceeded the 12 MB cap; 62–63 looked at, no ring; D-099 rests on round6-p8 (REPORT.md) |
| PERF-020 controller cold start, production build at round 10 (`pnpm perf -- controller --out perf-controller-r10`; copy in `perf-r10-startup.json`) | median 171 ms against the 2,000 ms budget (5 runs, CPU 4×), commit 9fddef11 |

`perf-1/` (165 ms) is the pre-merge measurement. Rounds 1 to 3's validation notes are superseded; see README.md.
