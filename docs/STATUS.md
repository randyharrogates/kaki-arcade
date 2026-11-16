# Kaki Arcade — Status

What actually works today. Kept honest: if it has not been seen working in UAT, it is not
listed as working. Updated in the same slice as any change (`WORKFLOW.md` step 5).

**Last updated:** 2026-11-16 · **Milestone:** M0 complete. **Build started 2026-11-16 on Randy's go (D-043):** Wave 0 running. Design gate: boards 0, 0B, 1A, 2 and 2B done; 1, 3, 4 and 5 to come.

## Works

- Repository, requirements, design rules, architecture, build loop and tracking docs.
- `docs/HANDOFF.md`: full context from the planning conversation for the build session.
- `python3 tools/trace_check.py`: 152 requirements tracked (PRD v1.1), check passes.
- The build plan for concurrent agents (`PLAN.md`) and the backlog of 97 issues across 10
  tracks (`backlog/`): written, **awaiting Randy's confirmation**.
- Blender 5.2 LTS runs headlessly on the dev Mac; `tools/blender/sample_stall.py` renders the
  sample stall scene in about ten seconds.

- **Workspace (F-01, merged 2026-11-16):** pnpm workspace with nine empty packages wired in
  their dependency order; strict TypeScript; ESLint; a design lint for off-scale spacing and
  raw colours; Vitest (135 tests, all on the two lint tools); `pnpm verify` passes from a clean
  checkout and was shown to fail on a type error, a lint error, a design-lint finding, a failing
  test, a trace failure and an unregistered package. No game or screen code yet.

- **Network spike (S-01, in progress):** `spikes/s01-network/` connects up to 8 phones to a host
  page over WebRTC and measures input delay. Run on one Mac with emulated phones only: 8 scripted
  phones p95 27 ms, no loss, host at 60 fps. Not yet tried on real phones, over real Wi-Fi or
  through a relay; one touch-driven emulated phone was over budget (OQ-028). Not reviewed.

## Does not exist yet

- Any application code: no host page, controller, pairing server or game (the packages are empty stubs).
- `pnpm uat`, `pnpm perf`, `pnpm assets`, `pnpm dev` (later issues).
- Design tokens: `DESIGN.md` §4.2 to §4.6 are pending the design gate.

## Design gate

| Board | Status |
|---|---|
| 0 Art finish | Done: route D (Blender) |
| 0B End-goal vision | Published 2026-11-16 for Randy to see before the build starts |
| 1A Modelling approach | Done: chunky toy, scripted, one body with 8 heads (D-037) |
| 1 3D art style | Done: C, matte finish, daylight, camera at 60° (D-044) |
| 2 Visual identity | Done: C Marble table as the general rule (D-042) |
| 2B A theme for each game | Done: R1 Bandung, K1 Green baize, T1 Order chit (D-043) |
| 3 Big-screen layouts | Done: 1B, 2A, 3A, 4B, 5A; versus interactions rotate (D-046) |
| 4 Phone controller | Published 2026-11-16, awaiting Randy's choice |
| 5 Motion | Pending |

## Performance numbers

None measured yet. First numbers come from the M2 spikes.

| Date | Slice | Players | Frame p95 (laptop) | Frame p95 (TV) | Input p95 (direct) |
|---|---|---|---|---|---|

## Real-device checks

None run yet (`UAT.md` §5).

## Known gaps and risks

- Performance budgets are targets, not measurements, until M2.
- Whether the TCL Q65's own browser can run the game is unknown (REL-005).
- Names are not checked for trademarks (OQ-001).
- Boards 1, 3, 4 and 5 still need Randy's choices; nothing visible is built before them.
