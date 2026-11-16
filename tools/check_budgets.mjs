#!/usr/bin/env node
// Bundle size budget check (PERF-020, PERF-022). A no-op hook until the first issue that
// produces a bundle replaces it with the real check. `pnpm build` already calls it.
console.log('no bundles yet');
process.exit(0);
