# T-10 round 3 checks

Preserved all round 1–2b work, including the integrator's DOM build stubs for phone-browser.ts, phone-demo.ts and controller-images.ts.

The generic header action now uses the existing Menu pill treatment inside an absolute 144 × 55 px touch target beside Menu. Horizontal padding reserves its space; the existing 34 px grid row is unchanged. No face minimum or layout threshold changed.

Added a TR-055 unit contract in phone-message.test.ts for the common row, horizontal-only leader override and out-of-flow 55 px action target. The existing tutorial DOM test now compares leader and non-leader header heights at each phone size and step, and checks the skip target is at least 44 px in both dimensions. DOM execution remains with the integrator.

Checks run serially without load gating, with PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false and VITEST_MAX_WORKERS=2 for Vitest. 
## Results

- Full requested Vitest run: passed, 144 files; 2,123 tests passed, 1 skipped (2,124 total). The initial run found only a parser bug in the new CSS contract test: it included a preceding comment as part of the selector. Stripping comments fixed the test; its focused rerun passed all 4 cases, then the full rerun passed in 404.35 seconds.
- `pnpm exec tsc -b tsconfig.build.json`: passed, including UAT slices. Emitted files removed with `tsc -b tsconfig.build.json --clean`.
- Requested ESLint paths with `--max-warnings 0`: passed.
- `pnpm run lint:design`: passed, 528 files scanned.
- `python3 tools/trace_check.py`: passed, 154 requirements.
- `git diff --check`: passed.

No commit, verify, Chromium/DOM, UAT or performance run. The integrator reruns the DOM test and performs visual review.
