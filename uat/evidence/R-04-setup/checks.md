# R-04 Round I check evidence — 2026-11-18

Final permitted Vitest command:

`VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/game-setup apps/web/src/phone apps/web/src/picker games/rabakz packages/platform/src/game`

Result: **562 passed, 1 skipped; 2 browser launch failures**, 42 files passed and 2 failed. Both Vite fixtures built. Chromium stopped before DOM measurements with `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`. No computed-style, layout, screenshot or visual pass is claimed. Initial run found one stale capitalisation expectation; corrected before the final run.

- `pnpm exec tsc -b tsconfig.build.json`: passed.
- `pnpm exec eslint apps/web/src games/rabakz uat/slices/R-04-setup.mjs --max-warnings 0`: passed, zero warnings.
- `pnpm run lint:design`: passed, 409 files scanned.

Test preflight one-minute loads: 4.65, 5.16. Typecheck preflights: 4.40, mistakenly 8.58, then conforming repeats at 7.23 and 6.98 (the latter after consolidating the footer). The above-threshold invocation is a recorded process error.

UAT was updated but was not authorised to run. The integrator must execute and inspect both phone sizes, both TV sizes, long summaries/refusals, watcher, blocked Start, Done and team confirmation outside this sandbox. No new screenshots were generated. See the Round I slice note for itemised changes and remaining validation.
