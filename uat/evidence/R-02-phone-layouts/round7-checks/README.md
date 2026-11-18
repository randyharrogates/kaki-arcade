# R-02 round 7 checks

All starts had one-minute uptime load below 8.

- `PLAYWRIGHT_BROWSERS_PATH=/nonexistent VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz apps/web/src`: exit 1, 725 passed; six browser tests not run (Chromium unavailable). Final start load 3.35; initial start 3.04.
- `pnpm exec tsc -b tsconfig.build.json`: exit 0, final start load 3.35; initial start 2.96.
- `pnpm exec eslint games/rabakz apps/web/src uat/slices --max-warnings 0`: exit 0, load 4.10.
- `pnpm run lint:design`: exit 0, 422 files, load 4.10.

No browser assertions or UAT executed. Grid label capacities, assuming 13 px gap:
667 × 375: 206.5 px; 844 × 390: 295 px; 932 × 430: 339 px.
These are calculated available widths, not measured rendered span widths.
