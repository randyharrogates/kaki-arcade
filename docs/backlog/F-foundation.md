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
| F-02 | Protocol: every phone, host and pairing-server message with validators | NET-001, NET-005 | F-01 | 1 | merged |
| F-03 | Simulation core: fixed timestep loop, seeded random numbers, snapshot helpers, input buffer | PLAT-032 | F-01 | 1 | merged |
| F-04 | Game interface: `GameModule` types with settings schema, team support, controller layout schema and private view schema, plus the conformance kit every game must pass | PLAT-030, PLAT-031, PLAT-032, PLAT-025 | F-03 | 1 | merged |
| F-05 | Game dev harness: run any `GameModule` headless or on a bare dev page with scripted or keyboard controllers, so games are built without the console | PLAT-030, NFR-TEST | F-04 | 1 | todo |
| F-06 | Design tokens and motion helpers in `packages/ui`, taken from `DESIGN.md` §4 | NN-5, NFR-DES | G-06 | 2 | merged |

## Carried from reviews

- **F-03b (small, sim-core):** when a tick would latch a press or release already pending for
  that button in this step, defer that tick and the rest of the slot's ticks until after the
  next `sample()`, so two fast taps delivered together after a loss both count (F-02 review 3).
- **F-03c (small, sim-core or C-04):** after a silence release, do not raise `pressed` for a
  button until a tick shows it up, so a link delay spike cannot repeat a tap (F-02 review 3).
- **Resume barrier (C-04):** ignore input frames after a pause until one sent after the phone
  acknowledged the resume (F-03 review 3).
- **Root lint:** purity restrictions for `packages/sim-core` and game rules folders; durations
  and easings only from tokens outside `packages/ui`.
- **F-06b fonts:** bundle DM Serif Display 400, DM Sans 400/500/700 and JetBrains Mono 500/700
  as Latin-subset woff2 (SIL OFL), with metric-matched fallback faces (`size-adjust`,
  `ascent-override`) and preloading before any round; the phone loads only what it shows. Every
  F-06 screenshot uses fallback fonts.
- **F-06c:** known contrast failures still pinned in `contrast.test.ts` after D-056: secondary
  text where it crosses a terrazzo speck (3.03 to 3.73), and seat badge fills 3, 4, 6, 7 and 8
  against marble (1.57 to 2.95; each badge keeps its white ring). No disabled-state token yet.
  Clip-mode `expand` must be measured on the TV before full-screen use.
- **From F-04:** F-08 measures allocation per step (the kit only reports step time). The kit
  cannot detect a leak on steps where a game declares no secret, or a game rule such as a
  lock-out waiting on a disconnected player: each game tests those itself. For Rabakz: a wrong
  press inside the 0.25 s window is that player's answer, and Skip in the step that closes the
  window must not wipe the winners. At C-10 add a test that the kit's button table equals the
  protocol's bit order.
