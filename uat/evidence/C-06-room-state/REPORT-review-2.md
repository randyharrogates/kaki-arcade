# C-06 review round 2 evidence

`pnpm verify` passed on the uncommitted round-2 implementation: 27 test files,
1,271 tests, workspace check, typecheck, ESLint, design lint, build and trace check.
The build reports no bundles or asset sets yet; no bundle-performance result is claimed.
See `verify-review-2.log` for the complete output.

- PLAT-003/004/005: reviewer vocabulary probes are individually named parameterised tests;
  exact stored Unicode spelling, independent uniqueness/filter normalisations, full-fold
  examples, allowed names, blocked evasions and eight null-name defaults pass.
- PLAT-004: suffix and blocked-replacement semantics have separate assertions.
- PLAT-006/007/009: slow restored leader, hold expiry, pruning already expired seats,
  preserved remaining holds, explicit leave, device transfer and old-device steal-back pass.
- PLAT-003/004: seated-connection join is unchanged; forged rename and leave are refused.
- PLAT-008: results-phase admission is restored and passes.
- Determinism: two independent 2,500-event runs preserve input state and room invariants.
  Final SHA-256: `9ed19a1b312bb103c36f4fb6b8dc88e2ee6a569d26784d57a5185af13a22ecaa`.
- Static inspection: no line exceeds 100 characters in `packages/platform/src/room/`;
  `git diff --check` passes. No dependencies or shared trackers changed.

Expectations follow the round-2 rulings. In particular, CB alone is permitted while c b is
blocked; multi-letter fragments are not concatenated; Babi Guling is permitted; Pussycat,
Hitlerite, Kanina Lim and the other explicitly disallowed names are blocked. Cunthia and
Ass. Prof remain blocked under the required cunt root and ass whole token respectively.

This is pure-code evidence. No browser screenshots, transport integration, real-device UAT,
independent review or merge is claimed. Known vocabulary, Unicode-version and contextual
limitations are recorded in the slice note. Team/quality remain inert hooks for C-11/C-07.
