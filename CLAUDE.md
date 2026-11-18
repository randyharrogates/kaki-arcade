# CLAUDE.md — Kaki Arcade

A browser games platform: one big screen shows the game, phones are the controllers, up to 8
players. v1 ships three original games, **Tabao Rush** (co-op hawker-centre cooking),
**Peek Poker** (memory poker) and **Rabakz** (trivia night). Owner: Randy.

**New to this repo? Read `docs/HANDOFF.md` first**: it carries the planning context, Randy's
own words, environment facts and the first task.

Read before any work: `docs/PRD.md`, `docs/WORKFLOW.md`, `docs/PLAN.md`, `docs/STATUS.md`. Read before any UI
or art work: `docs/DESIGN.md`. This file is the short binding version; the docs hold the detail.

## Rules that never bend

1. **The PRD is the scope.** Build nothing that has no requirement ID. Only Randy changes
   `docs/PRD.md`, `docs/DESIGN.md` §1 to §4 or a budget in `docs/PERFORMANCE.md`. If the work
   needs something they do not say, stop and add it to `docs/OPEN-QUESTIONS.md`.
2. **Track everything.** Every requirement has a row in `docs/TRACEABILITY.md`. Update it,
   `docs/STATUS.md` and `CHANGELOG.md` in the same slice as the change. A row is `done` only
   with code, an automated test, UAT evidence you have looked at, and a clean review.
3. **Work in the loop.** Plan → code → verify → test (UAT with screenshots) → review → back to
   code until review is clean → close. Details in `docs/WORKFLOW.md`. Start with `/slice`.
4. **Look, don't infer.** Open every UAT screenshot and frame strip before saying something
   works. A passing script is not a pass.
5. **The design gate comes first.** Nothing visible (shell UI, game screens, controller styling,
   final art) until Randy has chosen from every board in `docs/DESIGN.md` §5; code that draws
   nothing may proceed (PRD NN-6 as amended). Boards are published as artifacts with options, including a
   golden-ratio variant.
   **Every design or graphics choice is put to Randy as an artifact**, at the gate and at any
   time after it: real rendered or built options side by side, never a description alone. Each
   option states its cost against `docs/PERFORMANCE.md` (no lag is allowed), and an option that
   cannot meet a budget is marked as such. Record the choice in `docs/DECISIONS.md`.
6. **No lag.** The budgets in `docs/PERFORMANCE.md` are requirements. `pnpm verify` fails when
   one is exceeded. Fix the cause; never loosen a threshold.
7. **Originality.** Tabao Rush is an original game. Do not copy the name, characters, art,
   music, levels or look of any existing game. Peek Poker has no betting or real-money element.
8. **Claude leads and reviews; Codex implements.** Claude plans, briefs, integrates and merges.
   Implementation is done by Codex only (Randy, 2026-11-16, D-055), one issue each, in git
   worktrees, under the lane rules and the loop. Every issue is reviewed by a Claude reviewer,
   UAT is run and looked at by Claude, and only the integrator merges. The integrator may make
   a small fix directly at merge. Codex also does image generation (`AGENTS.md`). If you are an
   issue agent: stay inside the paths your issue owns, never edit the shared trackers, the PRD,
   the contracts or the lockfile, and never merge (`docs/PLAN.md` §5).
9. **Stop at human gates.** The design gate, the end of each milestone, anything that costs
   money, publishes publicly or touches DNS, and any spike result that contradicts the plan.

## Design rules (Randy's standing rules — binding for interface and gameplay)

Full text and the review checklist are in `docs/DESIGN.md`. In brief:

**Golden ratio**
- Spacing only from **5 · 8 · 13 · 21 · 34 · 55 · 89 px**.
- Primary : secondary splits **1.618 : 1**; media panels 1.618 : 1; design boards 1440 × 890.
- Fixed device sizes stay as they are; apply the ratio inside them.
- When offering design options, include a golden-ratio variant and say which proportions use it.

**No flat backgrounds**
- No plain flat fills on heroes, cards or empty areas. **One** subtle, low-contrast treatment
  per surface (textures, grainy or stippled gradients, dot or blueprint grids, contour lines,
  halftone, and the rest of the menu in `docs/DESIGN.md` §2). Never stack several.
- Check contrast in light and dark.

**Motion**
- Do: ease-out entrances · ease-in-out moves · menus 150–250 ms · stagger rows 30 ms · press
  scale 0.97 · popovers from 0.95 · stretch moving thumbs ~12% · arcs · a pulse to confirm
  success · enter from and exit to the trigger · exits ~20% shorter · overlap old and new
  states · masks for reveals · crossfade for icon swaps (no blur, D-056) · rubber-band past bounds ·
  expand the **same** object for detail views.
- Don't: bounce or spring overshoot · tween while a control is held or dragged (track 1:1).
- Respect `prefers-reduced-motion`: drop the motion, keep the state change.
- In gameplay: a controlled cook follows the stick directly, nothing wobbles or overshoots,
  thrown and dealt objects travel on arcs. See the table in `docs/DESIGN.md` §3.

Use design tokens from `packages/ui` only. No one-off colours, spacing values or timings.

## Architecture rules

- **Host is authoritative.** The big screen's browser runs the simulation. Phones send inputs
  and receive only their controller layout and private view.
- **Simulation is pure.** `step(state, inputs, dt)` is deterministic: no DOM, network, timers
  or `Math.random`. Randomness comes from the seed.
- **Games are modules** behind the interface in `docs/ARCHITECTURE.md` §3. No game-specific
  code in `packages/platform`, `packages/netcode` or `packages/controller-kit`.
- **Secrets stay private.** Nothing a player must not see appears in `publicView` or on
  another phone before the rules reveal it.
- **Pairing server carries no gameplay.** It introduces devices, mints relay credentials and
  enforces limits.
- **Nothing loads during play.** All assets for a round are ready before it starts.
- If code must differ from `docs/ARCHITECTURE.md`, change the doc in the same slice and log why.

## Art

Blender, pre-rendered to sprites and baked backgrounds, driven by scripts in `tools/blender/`
(`docs/ART-PIPELINE.md`). Every asset is reproducible from a script and a source file.
`assets/dist/` is generated; never hand-edit it.

## Commands

Not all exist yet; they are created in M2 and M3. Keep this list true.

| Command | Does |
|---|---|
| `pnpm dev` | Host, controller and local pairing server (works today; `KAKI_HOST=<LAN IP>` for phones) |
| `pnpm verify` | Workspace check, typecheck, ESLint, design lint, unit tests (including the performance-harness smoke), build with transfer-size budgets, trace check (works today; D-100) |
| `pnpm uat -- <slice>` | Playwright UAT (works today); output in `uat/evidence/<slice>/auto/` or `--out <name>`; replaces marked run folders only; `--host-browser chromium\|chrome\|webkit` and `--phone-browser chromium\|webkit` pick the engines (default Chromium; phones keep the legacy iPhone emulation unless `--phone-browser` is given; WebKit phones cannot connect locally, D-212); automated completion awaits visual review |
| `pnpm perf` | Performance harness (works today). `pnpm perf -- controller` checks the production controller cold-start budget in headless Chromium; failure blocks closure (D-148). Bare: seeded-bot simulations of every installed game at 1, 4 and 8 players; each game's eight-player step is assessed against PERF-040 from at least 10,000 samples over complete matches on successive seeds from 808, and a fail, too few samples, a module that cannot seat eight players or detected contention exits non-zero (D-227, D-277); 1 and 4 players are diagnostic. `pnpm perf -- <scenario> [--phones 1\|4\|8] [--headless] [--build production] [--host-browser chromium\|chrome] [--slice <name>] [--out <name>]` runs a browser scenario from `uat/perf/` (headed Chromium by default). Milestone PERF-001 runs use `--build production --host-browser chrome`; PERF-001 is assessed only when macOS reports every online display at the same rate within 59.94–60.06 Hz at the start and end of the round, and a Chromium pass counts for slice gates only (D-249, D-277). A `hostPage` scenario opens a dev page with no phones and still writes to `perf-<phones>`. Output in marked run folders `uat/evidence/simulation/perf/` or `uat/evidence/<scenario>/perf-<phones>/`. Run on a quiet machine before any slice that draws a game screen closes; a failure blocks the slice (D-100) |
| `pnpm assets` | Render and pack art from Blender sources |
| `python3 tools/trace_check.py` | Check the PRD against `docs/TRACEABILITY.md` (works today) |
| `tools/agents/memcheck.sh <agent\|uat\|render\|perf>` | Check free memory before starting any concurrent job (works today) |
| `tools/agents/worktree.sh <ID> <slug>` | Create an issue's git worktree and print its ports (works today) |

## Working conventions

- TypeScript, strict. pnpm workspace. Layout in `docs/ARCHITECTURE.md` §2.
- Conventional Commits naming the requirement IDs, for example
  `feat(platform): room creation and QR join (PLAT-001, PLAT-002)`.
- British English in docs and UI copy. UI copy is plain and names things by what players see.
- Prefer small, tested modules. No dependency is added without a line in `docs/DECISIONS.md`.
- Private repo under `randyharrogates`. Do not make it public, deploy, or change DNS without
  Randy saying so. Commit locally; **do not push until the whole of v1 is done** (D-033).

## Where things are

| File | What |
|---|---|
| `docs/PRD.md` | Requirements with IDs (the scope) |
| `docs/games/tabao-rush.md`, `docs/games/peek-poker.md`, `docs/games/rabakz.md` | Game rules with IDs |
| `docs/PLAN.md` | How concurrent agents and worktrees build v1: tracks, waves, roles, rules |
| `docs/backlog/` | Stories and issues per track |
| `docs/TRACEABILITY.md` | Requirement → status → code → tests → evidence |
| `docs/STATUS.md` | What actually works today |
| `docs/ROADMAP.md` | Milestones and their order |
| `docs/WORKFLOW.md` | The loop and human gates |
| `docs/UAT.md` | How UAT with screenshots is run |
| `docs/DESIGN.md` | Design rules, the design gate, review checklist |
| `docs/ART-PIPELINE.md` | Blender process |
| `docs/PERFORMANCE.md` | Budgets and how they are met |
| `docs/ARCHITECTURE.md` | Structure, game interface, networking |
| `docs/DECISIONS.md` | Append-only decision log |
| `docs/OPEN-QUESTIONS.md` | Waiting on Randy; unconfirmed assumptions |
| `docs/HANDOFF.md` | Planning context, Randy's words, environment facts, first task |
