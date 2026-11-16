# C-06 review round 4 — PLAT-005

PASS: `pnpm verify` exits 0; 30 test files and 1,550 tests pass. Full output is in
`verify-review-4.log`. The nickname suite has 249 BLOCK cases, 340 PASS cases and one
normalisation test. All 126 names in the supplied probe are asserted; its array is smaller
than the brief's stated 130. Existing deterministic golden checks pass unchanged.

The filter now limits cross-token roots to matches spanning a short token, keeps the shit
gap exception, checks maximal single-letter runs, and treats porn/phuk as whole tokens.
Protected stems excuse only their own root match; additional roots still block. Chi bai is
an explicit phrase. Room and leader code were not changed.

Conflicts: the explicit Grandmother Fu PASS needs a narrow motherf-only override of the
short-token rule. Existing blow job BLOCK becomes PASS under the ordinary-token rule.
Chi Bai follows the explicit instruction to move it from PASS to BLOCK. See the slice note
for final rules, counts and accepted gaps. No browser UAT or independent review is claimed.

Formatting: changed source and slice-note lines are at most 100 characters; indentation
uses two spaces. `git diff --check` passes. Changes are left uncommitted for the integrator.
