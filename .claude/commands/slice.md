---
description: Run one slice through the full loop — plan, code, verify, UAT with screenshots, review, close
argument-hint: "[requirement IDs or a short goal; empty = next in roadmap order]"
---

Run one slice of Kaki Arcade through the loop in `docs/WORKFLOW.md`. Target: $ARGUMENTS

1. **Orient.** Read `docs/STATUS.md`, `docs/ROADMAP.md` and `docs/TRACEABILITY.md`. If no target
   was given, choose the next unstarted requirement IDs in the current milestone.
   If the design gate (`docs/DESIGN.md` §5) is not closed and the target involves UI or game
   code, stop and say so.
2. **Plan.** Write `docs/slices/NNN-short-name.md` (goal, requirement IDs, acceptance
   statements, UAT script, out of scope). Mark the IDs `in progress` in `docs/TRACEABILITY.md`.
   If the slice needs anything the PRD does not say, add it to `docs/OPEN-QUESTIONS.md` and stop.
3. **Code.** Build only what the slice note says, with unit tests for rules.
4. **Verify.** Run `pnpm verify`. Fix until it passes. Never skip or loosen a check.
5. **Test.** Use the `uat-runner` agent for the slice. Then open the screenshots yourself as
   well; you are accountable for what they show.
6. **Review.** Use the `reviewer` agent, giving it the slice note path and evidence folder only.
7. **Loop.** If UAT or review found anything, go back to step 3. Repeat until both are clean.
   After three rounds without converging, stop and report to Randy.
8. **Close.** Update `docs/TRACEABILITY.md`, `docs/STATUS.md` and `CHANGELOG.md`, then commit
   with a Conventional Commits message naming the requirement IDs.
9. **Report** in a few lines: what now works, the evidence folder, the performance numbers, and
   whether a human gate has been reached.
