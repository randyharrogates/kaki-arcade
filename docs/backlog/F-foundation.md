# Track F — Foundation

The workspace, the automatic checks, the contracts every other track builds against, and the test harnesses. Contracts are changed only by the integrator once published (`../PLAN.md` §2).

**Owns:** repo root config, `packages/protocol`, `packages/sim-core`, `packages/platform/src/game`, `packages/ui`, `uat/lib`, `tools/perf`, `.claude/`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story F1 — Any agent can start an issue and know when it is finished



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| F-01 | pnpm workspace, strict TypeScript, lint (including the φ-scale spacing rule and no raw colours outside `packages/ui`), Vitest, and `pnpm verify` with the trace check wired in | NN-7, NN-8, NFR-TEST | — | 0 | merged |
| F-09 | Agent tooling: an issue-builder agent definition, an `/issue` command, and a helper that creates the worktree and prints its ports | NN-8 | — | 0 | merged |
| F-07 | UAT harness: Playwright host plus N phone contexts with real pairing, scripted thumbs, screenshot and frame-strip helpers, `pnpm uat` | NFR-TEST | F-01 | 1 | todo |
| F-08 | Performance harness: scripted controllers at 1, 4 and 8 players, frame-time and input-delay percentiles, budget check, `pnpm perf` | NFR-PERF, PERF-001, PERF-010 | F-01, F-03 | 1 | todo |

## Story F2 — Tracks meet at contracts, not at each other's code



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| F-02 | Protocol: every phone, host and pairing-server message with validators | NET-001, NET-005 | F-01 | 1 | doing |
| F-03 | Simulation core: fixed timestep loop, seeded random numbers, snapshot helpers, input buffer | PLAT-032 | F-01 | 1 | merged |
| F-04 | Game interface: `GameModule` types with settings schema, team support, controller layout schema and private view schema, plus the conformance kit every game must pass | PLAT-030, PLAT-031, PLAT-032, PLAT-025 | F-03 | 1 | todo |
| F-05 | Game dev harness: run any `GameModule` headless or on a bare dev page with scripted or keyboard controllers, so games are built without the console | PLAT-030, NFR-TEST | F-04 | 1 | todo |
| F-06 | Design tokens and motion helpers in `packages/ui`, taken from `DESIGN.md` §4 | NN-5, NFR-DES | G-06 | 2 | todo |
