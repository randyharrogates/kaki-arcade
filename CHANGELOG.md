# Changelog

Newest first. One entry per closed slice, naming the requirement IDs.

## 2026-11-16 — R-11: Open Trivia Database import

- 2,342 imported questions across ten categories with licence credit, an all-ages screen and
  text corrections; hard questions added to games, comics and anime. Three review rounds.
  (RZ-021, RZ-023, RZ-024 in progress)

## 2026-11-16 — F-06: design tokens and motion helpers

- `packages/ui`: tokens, four themes, motion helpers, generated `tokens.css` and specimen page.
  Review fixes: per-frame helpers allocate nothing; a press shows at once. Seven contrast and
  type rulings applied (D-056). Started by a Claude builder, finished by Codex.
  (NN-5, NFR-DES, PERF-012 in progress)

## 2026-11-16 — A-01: asset pipeline

- `tools/assets`: atlas packer, manifest and budget check behind `pnpm assets`; verify now packs
  `assets/src` and fails over budget. Built by Codex, two Claude review rounds. Synthetic frames
  only so far. (PERF-023, PERF-024 in progress)

## 2026-11-16 — F-02: protocol

- `packages/protocol`: signalling, control-channel and input messages with validators; input
  frames carry recent button history instead of timed repeats (no added delay; 21 ms thumb to
  simulation step at the 95th percentile in review); nickname rules; data-channel constants.
  Three review rounds. `ARCHITECTURE.md` §5 rewritten to match. (NET-001, NET-005 in progress)

## 2026-11-16 — R-12: Singapore question pack

- 305 original Singapore questions (food, places, history, life, nature, arts and sport), all
  four-option, romanised names only, each with a source note. One independent editorial review;
  facts not yet checked against sources. (RZ-021 and RZ-024 in progress)

## 2026-11-16 — Design gate closed

- Boards 4 (phone controller) and 5 (motion) decided; `DESIGN.md` §4 locked (D-047 to D-051).
  Visible work may begin. (NN-6)

## 2026-11-16 — F-03: simulation core

- `packages/sim-core`: seeded generator with pinned known answers, fixed-timestep driver with a
  catch-up cap, input buffer with edge latching, snapshot/hash/freeze/encode helpers, record and
  replay. Three review rounds; evidence in `uat/evidence/F-03-sim-core/` (no screen involved).
  (PLAT-032 in progress until the games pass the F-04 conformance kit)

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
