# Changelog

Newest first. One entry per closed slice, naming the requirement IDs.

## 2026-11-16 — R-10: Rabakz question schema, build and selector

- `content/rabakz`: schema and validator, deterministic build to content-hashed chunks, seeded
  selector for 10, 30 or 50 questions with difficulty mixes and a recently-used list, a public
  question type without the answer, and a stats report against the bank targets. Two review
  rounds; evidence in `uat/evidence/R-10-question-schema/` (no screen involved). (RZ-020 partial,
  RZ-022 partial until the full bank passes)

## 2026-11-16 — S-01: network spike, first half

- `spikes/s01-network/`: host page, phone page, pairing server and an unattended run with 1, 4
  and 8 emulated phones; evidence in `uat/evidence/S-01-network-spike/`. Loopback numbers only;
  the real-phone and relay runs wait for Randy (OQ-028). (NN-3, PERF-010, PERF-011, NET-002,
  NET-003: none met yet)

## 2026-11-16 — F-01: workspace and `pnpm verify`

- pnpm workspace, strict TypeScript with project references, ESLint, Vitest, a workspace guard
  (`tools/check_workspace.mjs`), a design lint (`tools/lint_design.mjs`) and `pnpm verify`.
  Nine stub packages wired in dependency order. Two review rounds; evidence in
  `uat/evidence/F-01-workspace/` (no screen involved). (NN-7, NN-8, NFR-TEST)

## 2026-11-16 — F-09: agent tooling

- `issue-builder` agent, `/issue` integrator command, `tools/agents/worktree.sh` (worktree and
  ports per issue) and `tools/agents/memcheck.sh` (memory check before any concurrent job).
  No screen involved; checked by running both scripts. (NN-8)

## 2026-11-16 — Planning: PRD v1.1, third game, concurrent build plan

- Design board 1A (modelling approach) published and decided: chunky toy cooks, scripted, one
  body with 8 heads. Sources in `docs/design-gate/` and `tools/blender/board1a_*`.
- Rule: every design or graphics choice goes to Randy as an artifact (D-022).
- PRD v1.1: **Rabakz** trivia game (RZ-001 to RZ-034), teams (PLAT-025), throwing and fires
  (TR-009, TR-010), no scrolling (TR-057), interacting versus kitchens (TR-058), 8 unique cook
  characters (TR-064), Peek Poker speed rule and 3/5/7 rounds. 152 requirements tracked.
- `docs/PLAN.md` and `docs/backlog/`: tracks, waves, worktree rules and 97 issues for building
  with concurrent agents. Proposed, awaiting Randy. (NN-6, NN-7, NN-8)

## 2026-11-15 — M0: repository and planning docs

- PRD with 118 tracked requirements, game specs for Tabao Rush and Peek Poker.
- Design rules (golden ratio, motion, no flat backgrounds) and the design gate.
- Architecture, performance budgets, Blender art pipeline.
- The build loop, UAT method, reviewer and UAT agents, `/slice` command.
- Traceability tracker and `tools/trace_check.py`.
- Art finish comparison board and the first Blender sample scene. (NN-6 board 0, NN-7, NN-8)
