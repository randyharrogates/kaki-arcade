# Kaki Arcade — The Build Loop

All work happens in **slices** that go round one loop (PRD NN-8):

```
        ┌──────────────────────────────────────────────────────┐
        ▼                                                      │
  0 PLAN ──▶ 1 CODE ──▶ 2 VERIFY ──▶ 3 TEST (UAT) ──▶ 4 REVIEW ─┤ findings? back to CODE
                                                               │
                                                     clean ──▶ 5 CLOSE ──▶ next slice
```

A slice is small enough to finish in one sitting: a handful of requirement IDs, one visible
outcome. If a slice cannot be demonstrated with screenshots, it is too abstract; if it needs
more than about ten files, it is too big.

Start a slice with the `/slice` command (`.claude/commands/slice.md`).

**Slices run concurrently.** A slice is one issue from `backlog/`, worked by one agent in its
own git worktree. Steps 0 to 4 below happen in that worktree; step 5 is done by the integrator
on `main`, who is the only one to merge and to edit the shared trackers. The rules that keep
parallel slices from colliding are in `PLAN.md` §4 to §6 and override this file where they
differ.

---

## 0. Plan

1. Pick the next requirement IDs from `TRACEABILITY.md`, following `ROADMAP.md` order.
   **The critical path comes first** (D-313): the issues that unblock the most remaining work
   (today Tabao Rush: T-17, then T-11 with A-06b, then T-12) take the first free Codex slot.
   Polish and follow-ups fill only slots the critical path cannot use.
2. Create `docs/slices/NNN-short-name.md` with:
   - **Goal** in one sentence.
   - **Requirement IDs** covered (and any only partly covered, saying which part).
   - **Acceptance:** what must be true, as checkable statements.
   - **UAT script:** the steps and the screenshots that will prove it.
   - **Out of scope** for this slice.
3. Set those IDs to `in progress` in `TRACEABILITY.md`.

No code is written for a requirement that is not in the PRD. If the work needs something the
PRD does not say, stop and add it to `OPEN-QUESTIONS.md` for Randy.

## 1. Code

- Build only what the slice note says.
- Game rules go in pure simulation modules with unit tests written alongside.
- UI uses tokens from `packages/ui` only (`DESIGN.md` §4). No one-off colours, spacing or
  timings.
- Keep `ARCHITECTURE.md` true: if the code must differ from it, change the doc in the same
  slice and log why in `DECISIONS.md`.

## 2. Verify

Run `pnpm verify`. It must pass completely before UAT:

| Check | Fails when |
|---|---|
| Workspace check | A package is not registered for type-checking, or a workspace dependency has no project reference |
| Typecheck | Any TypeScript error |
| Lint | Any ESLint error or warning |
| Design lint | A spacing value off the φ scale, or a raw colour literal outside `packages/ui` (code that cannot draw is exempt; see `PLAN.md` §5) |
| Unit tests | Any failure; simulation determinism test fails |
| Build | Bundle fails or exceeds PERF-020 / PERF-022 size budgets (the size check starts with the first bundle; until then it is a no-op hook) |
| Trace check | `tools/trace_check.py` finds a PRD ID missing from `TRACEABILITY.md`, or a `done` row without code, test and evidence |
| Performance | `pnpm perf` exceeds a budget in `PERFORMANCE.md` (from the slice where the harness exists) |

A failing check is fixed, never skipped or loosened. Changing a threshold is a PRD-level
decision for Randy.

**Per-slice and full verify (D-313).** A slice branch runs every check above, but its unit
tests only for the areas it touches since `main`: each changed game plus `apps/web`; a change
under `packages/`, `apps/`, `tools/` or a root config runs the whole suite. The full
`pnpm verify` runs on `main` after each batch of merges and before a milestone closes, and a
failure there is fixed before the next batch merges. A full verify does not run beside more
than one Codex round: their own test runs starve its slow tests into timeouts.

**Merging in batches (D-313).** Open branches take `main` once per batch of merges (or when
they need something that just landed), not after every single merge, and the batch is
type-checked with `tsconfig.build.json` before any check is queued.

## 3. Test (UAT with screenshots)

Follow `UAT.md`. In short:

1. Run the slice's Playwright UAT script: one host browser plus as many phone browsers as the
   slice needs, real pairing, real inputs.
2. Screenshots are saved to `uat/evidence/NNN-short-name/` with step-numbered names, for the
   big screen and for at least one phone.
3. **Claude opens and looks at every screenshot.** A passing script is not a pass; the picture
   is. Measurements around a thing are not the same as looking at it.
4. For anything that moves, capture a frame strip (several frames side by side).
5. Write `uat/evidence/NNN-short-name/REPORT.md`: each acceptance statement, pass or fail, and
   the screenshot that shows it.

## 4. Review

Run the `reviewer` agent (`.claude/agents/reviewer.md`) with a fresh context. It is given the
slice note, the diff and the evidence folder, **not** Claude's own summary. It checks:

- Each requirement ID against the PRD wording, not against the slice note's paraphrase.
- Every screenshot against the checklist in `DESIGN.md` §6.
- Performance numbers against `PERFORMANCE.md`.
- Architecture rules: pure simulation, no secrets in public views, no game-specific code in
  the platform.
- Scope: nothing built that no requirement asks for.

Findings come back ranked. **Any finding sends the slice back to step 1.** The loop repeats
until review is clean. If three rounds do not converge, stop and raise it with Randy.

## 5. Close

Only when verify, UAT and review are all clean:

1. `TRACEABILITY.md`: set status, fill code paths, test names and evidence links. Paths and
   names only: no prose in the cells.
2. `STATUS.md`: update what works, performance numbers and known gaps. One short bullet per
   feature (at most three lines), kept to what a player can do today; the detail lives in the
   slice note and the CHANGELOG.
3. `CHANGELOG.md`: one entry.
4. `DECISIONS.md`, when the slice decided something: what was decided and why, in at most
   five lines; evidence and review detail stay in the slice note.
5. Commit with a Conventional Commits message that names the requirement IDs.
6. If the slice completes a milestone, stop for Randy's demo before starting the next
   milestone.

---

## Human gates

Claude runs the loop on its own inside a milestone. It stops for Randy at:

| Gate | Why |
|---|---|
| The design gate (`DESIGN.md` §5) | Randy chooses from artifact boards before any UI or game code |
| End of each milestone | Demo, and go or no-go for the next |
| Any change to `PRD.md`, `DESIGN.md` §1 to §4 or a `PERFORMANCE.md` budget | Randy owns requirements |
| Anything that costs money, publishes publicly, or touches DNS | Outward and hard to undo |
| A spike result that contradicts the plan | The plan changes, so the owner decides |

## Definition of done for a requirement

A row in `TRACEABILITY.md` is `done` only when it has: code paths, at least one automated test,
UAT evidence that Claude has looked at, and a clean review. Anything less is `in progress` or
`partial`, with the gap stated.
