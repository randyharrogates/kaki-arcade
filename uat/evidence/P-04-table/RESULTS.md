# P-04 allowed checks

2026-11-18, branch `issue/P-04-table`. No visual acceptance is claimed.
One-minute load was below 8 immediately before every test/typecheck command.

| Command | Result | Log |
| --- | --- | --- |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/peek-poker apps/web` | Exit 1: 497 passed, 1 browser-launch failure; 40 files passed, 1 failed. All four P-04 view-model tests passed. | `tests.txt` |
| `pnpm exec tsc -b tsconfig.build.json` | Exit 0, no diagnostics | `typecheck.txt` |
| `pnpm exec eslint games/peek-poker apps/web uat` | Exit 0, no diagnostics | `eslint.txt` |
| `pnpm run lint:design` | Exit 0, 387 files scanned | `design-lint.txt` |

The existing `apps/web/src/Overlap.dom.test.ts` cannot launch Chromium here:
`base/apple/mach_port_rendezvous_mac.cc:159`, `bootstrap_check_in … Permission denied (1100)`.
This is not a passing browser check. The integrator must rerun it outside the sandbox.

The worktree has no `assets/dist`. No asset build, UAT, perf, Blender, install,
memcheck, whole-suite tests or `pnpm verify` ran. Screenshots and frame strips
must be generated and inspected by the integrator using the new scripts.
