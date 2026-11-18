# R-06 round 4 checks

2026-11-18. Only the requested checks were run. No verify, UAT, perf, install, node_modules linking or commit.

- Vitest: `PLAYWRIGHT_BROWSERS_PATH=/nonexistent VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src games/rabakz content/rabakz`. Final run started at one-minute load 4.54. 1,015 non-browser tests pass, including cached setup → two Starts with recent ids/updated best, unreadable-read/recovered-write protection, and single-save results-triggering quit. Twelve browser tests are **not run**: Chromium is unavailable at /nonexistent; the test runner reports launch failures. Therefore the command exits 1.
- TypeScript: `pnpm exec tsc -b tsconfig.build.json` passes, final run started at load 4.89. An intermediate test-fixture readonly-meta error was corrected by accepting the minimum-player count in the fixture constructor. No emitted .js/.js.map/.d.ts files were found beside sources.
- ESLint: `pnpm exec eslint apps/web/src games/rabakz content/rabakz uat/slices/R-06-solo-best.mjs --max-warnings 0` passes, final run started at load 4.74. One earlier invocation was mistakenly started at load 8.04, contrary to the requested limit; this was reported and rerun below 8.
- Design lint: `pnpm run lint:design` passes (451 files), started at load 4.96.

First review was read in full before the changes. Existing round3 stills predate the merged Start path. Round4 UAT and perf are not run; the new strip code and four-digit header fit still need execution and visual review outside this sandbox. No report acceptance is claimed. The pre-C-17 multiplayer scenario can occupy three seats despite its legacy two-player labels.
