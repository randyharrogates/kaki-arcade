# Kaki Arcade — Status

What actually works today. Kept honest: if it has not been seen working in UAT, it is not
listed as working. Updated in the same slice as any change (`WORKFLOW.md` step 5).

**Last updated:** 2026-11-15 · **Milestone:** M0 complete, M1 (design gate) next.

## Works

- Repository, requirements, design rules, architecture, build loop and tracking docs.
- `docs/HANDOFF.md`: full context from the planning conversation for the build session.
- `python3 tools/trace_check.py`: 118 requirements tracked, check passes.
- Blender 5.2 LTS runs headlessly on the dev Mac; `tools/blender/sample_stall.py` renders the
  sample stall scene in about ten seconds.

## Does not exist yet

- Any application code: no host page, controller, pairing server or game.
- `pnpm` workspace, `pnpm verify`, `pnpm uat`, `pnpm perf`, `pnpm assets` (created in M2 and M3).
- Design tokens: `DESIGN.md` §4.2 to §4.6 are pending the design gate.

## Design gate

| Board | Status |
|---|---|
| 0 Art finish | Done: route D (Blender) |
| 1 3D art style | Pending |
| 2 Visual identity | Pending |
| 3 Big-screen layouts | Pending |
| 4 Phone controller | Pending |
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
- `leeseidon.com` DNS provider not confirmed (OQ-004).
