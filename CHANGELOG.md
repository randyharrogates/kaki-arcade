# Changelog

Newest first. One entry per closed slice, naming the requirement IDs.

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
