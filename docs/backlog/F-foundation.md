# Track F — Foundation

The workspace, the automatic checks, the contracts every other track builds against, and the test harnesses. Contracts are changed only by the integrator once published (`../PLAN.md` §2).

**Owns:** repo root config, `packages/protocol`, `packages/sim-core`, `packages/platform/src/game`, `packages/ui`, `uat/lib`, `tools/perf`, `.claude/`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story F1 — Any agent can start an issue and know when it is finished



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| F-01 | pnpm workspace, strict TypeScript, lint (including the φ-scale spacing rule and no raw colours outside `packages/ui`), Vitest, and `pnpm verify` with the trace check wired in | NN-7, NN-8, NFR-TEST | — | 0 | merged |
| F-09 | Agent tooling: an issue-builder agent definition, an `/issue` command, and a helper that creates the worktree and prints its ports | NN-8 | — | 0 | merged |
| F-07 | UAT harness: Playwright host plus N phone contexts with real pairing, scripted thumbs, screenshot and frame-strip helpers, `pnpm uat` | NFR-TEST | F-01 | 1 | merged |
| F-08 | Performance harness: scripted controllers at 1, 4 and 8 players, frame-time and input-delay percentiles, budget check, `pnpm perf` | NFR-PERF, PERF-001, PERF-010 | F-01, F-03 | 1 | done (harness; budgets assessed from T-07 on) |
| F-10 | PERF-040 assessment in bare `pnpm perf` (blocking); a branded-Chrome channel option for assessed milestone PERF-001 runs; the 60 Hz guard: PERF-001 is assessed only when the system reports a 60 Hz display mode, recorded in `perf.json` (D-227, D-249) | PERF-040, PERF-001 | F-08 | 3 | done (merged 2026-11-19; D-277; PERF-040 quiet run owed) |
| F-11 | Shared UAT helpers in `tools/uat` (`until` with the paused clock, press until pressed, Ready all, a genuinely new room, settle animations before stills, exactly one match), R-19 and T-10 scripts moved onto them, `UAT.md` helper list (D-313) | NFR-TEST | F-05 | 2 | in progress |

## Story F2 — Tracks meet at contracts, not at each other's code



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| F-02 | Protocol: every phone, host and pairing-server message with validators | NET-001, NET-005 | F-01 | 1 | merged |
| F-03 | Simulation core: fixed timestep loop, seeded random numbers, snapshot helpers, input buffer | PLAT-032 | F-01 | 1 | merged |
| F-04 | Game interface: `GameModule` types with settings schema, team support, controller layout schema and private view schema, plus the conformance kit every game must pass | PLAT-030, PLAT-031, PLAT-032, PLAT-025 | F-03 | 1 | merged |
| F-05 | Game dev harness: run any `GameModule` headless or on a bare dev page with scripted or keyboard controllers, so games are built without the console | PLAT-030, NFR-TEST | F-04 | 1 | merged |
| F-06 | Design tokens and motion helpers in `packages/ui`, taken from `DESIGN.md` §4 | NN-5, NFR-DES | G-06 | 2 | merged |

## Carried from reviews

- **F-03b and F-03c:** merged 2026-11-16 (duplicate edges deferred; no repeat tap after
  silence; D-068).
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
- **F-05b:** the bare dev page with keyboard controllers, once a game has a big-screen view
  (D-075).
- **F-05c (from the F-05 review):** compact input encoding for recordings (a bot-driven
  8-player Tabao Rush round is about 12 MB; steady inputs about 16 KB). Bisection with a
  reference reports `exact: true` at the checkpoint end when the refined search finds no
  difference (`match.ts` around 333-347). A disconnected leader stays leader in the harness;
  the room hands over after its grace period. `evenIfRefused` on held inputs is cleaned at
  step time and never reaches the game. `step()` refuses after the match is over although the
  contract lets a game be stepped after the end.

- **Found at R-05 (2026-11-17): the token fonts are not shipped.** DESIGN §4 names DM Serif
  Display, DM Sans and JetBrains Mono, and `packages/ui/tokens.css` names them first in each
  stack, but no font file or `@font-face` exists anywhere, so every screen so far is drawn in
  system fallbacks (Georgia or Iowan for headings, system sans, SF Mono). Ship the three faces
  once from `packages/ui` (licences recorded, woff2 subsets, preloaded before any round so
  nothing loads during play, PERF-020 and PERF-022 transfer sizes measured), and re-photograph
  the lobby, picker and Rabakz screens, whose text fitting was measured with fallbacks. Games
  must not ship their own copies. Needs a DECISIONS line for the font files.
- **From F-08 (performance harness), due before T-07.** Launch the host in its own browser
  instance for frame-budget runs (the first phone opening in the same Chromium is the prime
  suspect for a 1,027 ms first frame in the integrator's first lobby run; it did not recur).
  A module-provided performance data fixture to replace the Rabakz import in
  `tools/perf/headless.ts`. Offer real Chrome (`channel: 'chrome'`): PERF-001 says Chrome.
  Each T-, P-, R- and K-track screen adds a scenario in `uat/perf/` and wires the dev-only
  timing hook (touch, receipt, applied, visible feedback). A real Tabao Rush browser round
  needs garbage-collection tracing; long tasks are not proof. Not run yet: 1 and 4 phones,
  `--headless`, `--build production`, a quiet-machine repeat. Still open from F-04, C-04 and
  C-10: the input buffer's bytes per step under a real session (bots bypass `expandInput`).
- **From F-07 (UAT harness).** Every later slice gets a script in `uat/slices/`. Not proven:
  `--headed`, `--keep`, `--frames` and the thumb helper in a real browser (K-07 is the first
  user of thumbs). A dev-only `&changeAfter=<ms>` on the host demo would let strips load already
  slowed; today the lobby script settles, slows, then waits for the fixed 2 s change. Codex
  cannot run a browser, so each harness or script change needs an integrator run: budget for
  it. A DOM render test for views (the phone route, the Rabakz screen) is still missing: three
  screens have shipped faults that only a browser showed.