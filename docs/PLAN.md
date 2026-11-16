# Kaki Arcade — Build Plan (concurrent agents, git worktrees)

**Status: agreed by Randy; build started 2026-11-16 on his go (D-043).** His standing orders for
the build: Claude only, Codex for image generation only; concurrent sub-agents where they help;
check free memory before every sub-agent; run every issue through the loop; a 10-minute watch
that no sub-process is stuck; keep going until v1 is playable.

How v1 gets built: the three games, the controller and the console are broken into stories and
issues in `docs/backlog/`, and several Claude agents work issues at the same time, each in its
own git worktree, until everything in `docs/TRACEABILITY.md` is `done`.

`ROADMAP.md` says what is demonstrated and when Randy is asked. `WORKFLOW.md` is the loop every
issue goes round. This file is how many of those loops run side by side without colliding.

## 1. Tracks

Work is split so that tracks touch different folders and meet only at contracts.

| Track | Backlog file | What it is | Folders it owns |
|---|---|---|---|
| **G** Design gate | `backlog/G-design-gate.md` | Boards 1 to 5, chosen by Randy | `docs/design-gate/`, `tools/blender/board*` |
| **S** Spikes | `backlog/S-spikes.md` | Throwaway proofs with measured numbers | `spikes/` |
| **F** Foundation | `backlog/F-foundation.md` | Workspace, checks, contracts, test harnesses | repo root config, `packages/protocol`, `packages/sim-core`, `packages/platform/src/game`, `packages/ui`, `uat/lib`, `tools/perf` |
| **C** Console | `backlog/C-console.md` | Rooms, pairing, lobby, picker, teams, sessions | `apps/signal`, `apps/web`, `packages/netcode`, `packages/platform` |
| **K** Controller | `backlog/K-controller.md` | The phone controller kit | `packages/controller-kit` |
| **R** Rabakz | `backlog/R-rabakz.md` | Trivia game and its question bank | `games/rabakz`, `content/rabakz` |
| **P** Peek Poker | `backlog/P-peek-poker.md` | Memory poker game | `games/peek-poker` |
| **T** Tabao Rush | `backlog/T-tabao-rush.md` | Cooking game | `games/tabao-rush` |
| **A** Art | `backlog/A-art.md` | Blender pipeline and every sprite | `tools/blender`, `assets/` |
| **X** Release | `backlog/X-release.md` | Public pages, limits, deploy, soak | `apps/web/src/pages`, deploy config |

## 2. What lets tracks run at once: contracts first

Three contracts are written before any track that depends on them starts, and are then changed
only by the integrator (§4):

1. **Game interface** (`packages/platform/src/game`, issue F-04): the `GameModule` type from
   `ARCHITECTURE.md` §3, extended with a settings schema and team support, plus a
   **conformance kit** every game must pass: same seed and inputs give the same state, the
   public view serialises, and nothing from a private view appears in the public view.
2. **Protocol** (`packages/protocol`, F-02): every message between phone, host and pairing
   server, with validators.
3. **Controller layout schema** (part of F-04): how a game names the kit parts it wants.
   Games write to the schema; the kit renders it. Neither imports the other.

With those in place a game is built and tested against the **game dev harness** (F-05) without
the console existing, the console is built against a **test game** without any real game
existing, and the kit is built against layout fixtures.

After the design gate a fourth contract appears: **design tokens** (`packages/ui`, F-06).

## 3. Waves

A wave is a set of issues with no unmet dependencies. Issues inside a wave run concurrently.

| Wave | Opens when | Runs concurrently |
|---|---|---|
| **0 Decide and prove** | Plan confirmed | Gate boards G-01 to G-05 (with Randy, one at a time) · spikes S-01, S-03, S-05 · F-01 workspace · F-09 agent tooling · Q question-bank import (R-10, R-11) |
| **1 Contracts and rules** | F-01 done | F-02, F-03, F-04, F-05, F-07, F-08 · then, with no screen involved: R-01, P-01, P-02, T-01 to T-06 (pure rules) · C-01 to C-06 (pairing server, netcode, room state) · A-01 pipeline tooling · S-02 once board 1 is chosen |
| **2 Everything visible** | Design gate closed (G-06) | F-06 tokens · C-07 to C-14 · all of K · R-02 to R-06 · P-03 to P-05 · T-07 to T-10 · A-02 to A-08 |
| **3 Whole-game integration** | Console M3 demo passed | Each game end to end in the real console (R-08, P-07, T-17) · T-11 to T-16 content, bots, versus · R-07, T-15 sound |
| **4 Release** | All three games demonstrated | X-01 to X-09 |

Wave 1 starts rules, netcode and the pairing server, none of which draws anything, while the
boards are still being chosen. Randy allowed this on 2026-11-16 (D-039, PRD NN-6 as amended):
the gate holds back everything visible, not code that draws nothing.

The spikes can change the plan (renderer, TV route, art cost). Anything a spike could overturn
is not started before that spike reports: T-07 waits for S-04, A-02 waits for S-02.

## 4. Roles

- **Integrator** — the main Claude session, on `main` in the primary checkout. The only one
  that talks to Randy, opens gates, changes a contract, adds a dependency, merges, edits
  the shared trackers, and runs performance measurements. Holds the plan.
- **Issue agent** — one Claude agent per issue, in its own worktree and branch. Builds exactly
  one issue through the loop and hands back a branch and a slice note. Never merges.
- **`uat-runner` and `reviewer`** — the existing agents (`.claude/agents/`), run per issue with
  a fresh context, inside that issue's worktree.

Per `CLAUDE.md` rule 8 every agent is Claude. Codex is used only for image generation.

## 5. Worktree rules

- One issue, one branch, one worktree: branch `issue/<ID>-<slug>`, worktree
  `../kaki-arcade-wt/<ID>` (or the Agent tool's own worktree isolation). Branch from current
  `main`.
- **Stay in your lane.** An issue lists the paths it owns. The agent edits only those, plus its
  slice note `docs/slices/<ID>-<slug>.md` and its evidence folder `uat/evidence/<ID>-<slug>/`.
- **Never edit in an issue branch:** `docs/PRD.md`, game specs, `docs/DESIGN.md`,
  `docs/PERFORMANCE.md`, `docs/TRACEABILITY.md`, `docs/STATUS.md`, `CHANGELOG.md`,
  `docs/DECISIONS.md`, `docs/backlog/`, root config, `pnpm-lock.yaml`, or another track's
  folder. These are where concurrent branches would collide.
- **Need something outside your lane?** Write it under "Requests" in the slice note and stop
  that part: a contract change, a new dependency, a fix in another track, a requirement the
  PRD does not state. The integrator makes the change on `main`; the agent rebases.
- **Ports.** Each worktree runs its own dev server and pairing server on ports derived from the
  issue (a helper from F-09 prints them), so parallel UAT runs do not clash.
- **Heavy jobs take turns.** One Blender render job at a time, and one `pnpm perf` run at a
  time with nothing else running: frame-time numbers taken on a busy machine are not evidence.
  Per-issue UAT may run in parallel; the performance column in `STATUS.md` is filled only from
  the integrator's quiet-machine runs.
- **Check memory before every start (Randy, D-039).** Before launching an agent, a UAT run, a
  render or a performance run, the integrator checks free memory (`memory_pressure` and
  `vm_stat`). Start only when memory pressure is normal and there is room for the job: about
  2 GB for a code agent with its dev servers, 3 GB for a UAT run with 9 browser contexts, 4 GB
  for a Blender render. If there is not, wait for a running job to finish; never start anyway.
- **How many at once.** Up to 4 issue agents on this Mac (M3, 16 GB) when memory allows, fewer
  while a render or a performance run is going. More agents than that cost more in merge
  friction than they save.

## 6. The loop, per issue

`WORKFLOW.md` steps 0 to 4 run inside the worktree, unchanged: plan (slice note) → code →
`pnpm verify` → UAT with screenshots the agent has looked at → `reviewer` until clean. A slice
is an issue. Step 5 (close) is split:

1. **Agent hands back:** branch name, slice note with a filled "Close-out" block (requirement
   IDs with code paths, test names and evidence links, plus any Requests), and the evidence
   folder. Three review rounds without converging: stop and report.
2. **Integrator merges:** rebase on `main`, run `pnpm verify` on the result, open the evidence
   and look, squash-merge with a Conventional Commit naming the issue and requirement IDs, then
   update `TRACEABILITY.md`, `STATUS.md`, `CHANGELOG.md` and the backlog status in the same
   commit. Merge in dependency order.
3. **After each batch of merges:** an integration UAT across tracks on `main` (a full room
   session: host, phones, each finished game), and a quiet-machine `pnpm perf`.

Nothing is pushed to GitHub until the whole of v1 is done (D-033). Commits stay local.

## 7. Where Randy is asked

Unchanged from `WORKFLOW.md`: every design board, the end of each milestone in `ROADMAP.md`,
any change to the PRD, design rules or a budget, anything that costs money, publishes or
touches DNS, and a spike result that contradicts the plan. Under D-022 any design or graphics
choice that comes up mid-build is put to him as an artifact with real options. Between gates
the agents keep going on every issue that does not depend on his answer.

## 8. Done

v1 is done when every MUST and SHOULD row in `TRACEABILITY.md` is `done` (or Randy has ruled
on a `not met`), the 30-minute 8-player session passes (NFR-REL), the real-device checklist in
`UAT.md` §5 has been run with Randy's players, and Randy has said go for the public release.
