# T-10 round 2b checks

The user explicitly removed the load gate for this round: no `top`, raw-load or effective-load sampling was used. Checks ran serially, with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false` on every pnpm invocation and `VITEST_MAX_WORKERS=2` on every Vitest invocation.

## Fixes

Preserved the prior round-2 fixes: guarded leader/other phone aliases in the UAT closures, typed the outgoing heading query, and moved the Vite-based DOM test into apps/web/src with corrected imports and typed callbacks. Preserved the integrator edits; did not edit Peek Poker or Rabakz.

The first full Vitest run found three failures. Tutorial layout revisions now retain the cook-picker exit revision throughout all lessons, rather than incrementing for cosmetic step/highlight changes; this preserves in-flight taps and keeps revisions monotonic. The TV renderer calls the tutorial DOM updater only during tutorial or its exit, and its allocation guard recognises this phase guard. The Play again settings assertion now includes the generic firstInRoom argument.

ESLint found six issues. Replaced inline Tutorial import types with type-only imports, removed redundant optional access and a meaningless void expression, and made the UAT browser callback return unknown before casting the result to the public View type outside the callback.

## Results

- Focused regression run: 3 files, 17 tests passed (tutorial conformance, renderer, Play again).
- Full requested Vitest run: passed, 144 test files; 2,122 tests passed and 1 skipped (2,123 total). The initial full run found three failures, and the intermediate run found only the revision regression; the final full run passed after the monotonic revision fix.
- `pnpm exec tsc -b tsconfig.build.json`: passed, including all UAT slices; repeated after lint fixes and passed. Removed emitted outputs using `tsc -b tsconfig.build.json --clean` after each successful build.
- Requested ESLint paths, `--max-warnings 0`: passed after fixes.
- `pnpm run lint:design`: passed, 528 files scanned.
- `python3 tools/trace_check.py`: passed, 154 requirements.

No commit, push, verify, UAT, DOM tests or performance run was made, per the briefs. DOM/UAT and visual review remain with the integrator.
