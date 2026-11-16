# C-06 review round 3 — pure-state evidence

Requirements: PLAT-003/004/005/006/007/008/009.

- Filter: 454 unique named vocabulary assertions include every name/evasion from fresh and
  earlier reviewer probes, previous regressions and round-3 outcomes. Explicit final rules
  supersede contradictory old probe labels; the slice note records those differences.
- Names: exact spelling, identity folding, collision handling, invalid inputs and private
  replacement/suffix notices remain covered. Full folding table reduced to tested needs.
- Seats and leader: prior capacity, permissions, channel replacement and disconnect tests
  retained, with repeated probes consolidated.
- Restore: 20-second deadline boundaries for previously connected and already dropped
  leaders; later resumes do not reset it; lowest connected seat wins. Fresh stall probes,
  slow-return repro, seat expiry and empty restore are assertions.
- Invariants: two deterministic 2,500-event runs check immutable input, safe unique names,
  seats, colours and leadership; the existing final-state hash remains unchanged.
- Formatting: every package source line is at most 100 characters with two-space indentation.

Full verification passed: 30 test files, 1,415 tests, typecheck, ESLint, design lint, build
and trace check. Full command and result: see verify-review-3.log. No visual output exists in this slice;
no browser, transport, physical-phone or persistence integration UAT is claimed.
Changes remain in the working tree for independent integrator review and commit.
