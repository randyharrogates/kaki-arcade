# C-06 pure room-state evidence

PASS — full `pnpm verify`: 26 files, 903 tests; workspace, typecheck, ESLint, design lint, build and trace check pass. See `verify.log`.

PASS — targeted room tests: see `tests.log` for complete requirement-ID test names.

| Acceptance | Result | Evidence |
|---|---|---|
| Eight players, ninth refused clearly, freed seat reused | PASS | PLAT-003 tests in tests.log |
| Protocol nickname limit, romanised names, unique names, fixed seat colours, valid protocol notices | PASS | PLAT-004 tests in tests.log |
| Whole-word filter, substitutions, innocent-word examples, replacement notification | PASS | PLAT-005 tests in tests.log |
| First player leads; leave/drop hands over, no disconnected leader | PASS | PLAT-006 test and seeded sequence test |
| Lobby/results joins; running joins follow explicit game policy | PASS | PLAT-008 test |
| Same seat restored within two minutes; reserved capacity and expiry | PASS | PLAT-007 tests |
| JSON serialisation, deterministic long sequences, invariants, malformed events refused | PASS | seeded sequence and malformed event tests |

No UI, DOM, transport, storage or timer was built. No visual screenshots apply. PLAT-007/009 are supported by pure state only, not claimed complete end to end. Independent Claude review and integration remain pending. No dependencies added, installation run, commit, push or shared tracker edit.

## Review round 1

Automated pure-code evidence: `verify-review-1.log`. Final `pnpm verify` exits 0:
26 test files, 973 tests pass; workspace, typecheck, ESLint, design lint, build and trace pass.
Reviewer attacks A1–A18 are adapted into room.test.ts with the D-060 exception for standalone
`dick`. Added 2,500-transition independent deterministic replay with pinned SHA-256,
safe-name invariants, all requested evasion/allow names, clock clamping, leader grace,
restore, channel replacement, device deduplication, lazy expiry and token-free public JSON.
No screenshots apply to this pure module. Independent review remains pending.
