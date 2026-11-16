---
description: Integrator command — run one or more backlog issues through the loop with issue-builder agents in git worktrees, then review and merge
argument-hint: "[issue IDs, e.g. C-01 C-04 R-01; empty = everything unblocked in the current wave]"
---

You are the integrator (`docs/PLAN.md` §4). Target: $ARGUMENTS

1. **Orient.** Read `docs/STATUS.md`, `docs/PLAN.md` §3 and the backlog files. If no target was
   given, list the issues whose dependencies have all merged and that the design gate allows.
2. **Memory.** Before each start run `tools/agents/memcheck.sh agent` (or `uat`, `render`,
   `perf`). If it says wait, wait for a running job; never start anyway. At most 4 agents.
3. **Start.** For each issue: `tools/agents/worktree.sh <ID> <slug>`, mark it `doing` in its
   backlog file, then launch an `issue-builder` agent with the issue ID, worktree path and ports.
4. **Review.** When an agent hands back: open its evidence yourself, then run the `reviewer`
   agent in that worktree with the slice note path and evidence folder only. Any finding goes
   back to the same agent. Three rounds without converging: stop and tell Randy.
5. **Merge**, in dependency order: rebase on `main`, `pnpm verify` on the result, squash-merge
   with a Conventional Commit naming the issue and requirement IDs, and in the same commit
   update `docs/TRACEABILITY.md`, `docs/STATUS.md`, `CHANGELOG.md`, the backlog status, and
   `docs/DECISIONS.md` for every dependency added. Remove the worktree.
6. **After a batch:** integration UAT on `main` and a quiet-machine `pnpm perf` once they exist.
7. **Gates.** Stop for Randy at every design board, milestone demo, and anything that costs
   money, deploys or touches DNS. Any design or graphics choice goes to him as an artifact.
8. **Report** in a few lines: merged, running, blocked and on what.
