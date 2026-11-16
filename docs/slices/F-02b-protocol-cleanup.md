# F-02b — Protocol clean-up

## Goal

Align the protocol with positional buttons and HTTP creation / upgrade authentication.
Requirements: CTRL-001, CTRL-003, NET-002, NET-005, PLAT-001, PLAT-009, DATA-005.
Decisions: D-047, D-062, D-063, D-066.

## Acceptance and evidence plan

- All twelve button bits stay fixed; a platform test compares every game bit to the wire mask.
- Only join is an opening socket message; retired and unknown types use invalid-message handling.
- Host subprotocol helpers preserve upgrade authentication and created remains the first reply.
- Opening deadlines emit opening-timeout; clients are instructed to treat it as terminal.
- Existing signal tests and server-message decoder property checks pass, along with pnpm verify.

No player-visible change: save automated output under uat/evidence/F-02b-protocol-cleanup/.
No UI, dependencies, deployment, tracker edits or changes outside the assigned lane.

## Close-out

- CTRL-001, CTRL-003, NET-005: `packages/protocol/src/input.ts` uses positional face names.
  The original wire bits remain 0–11. `button-protocol.test.ts` in the platform game folder
  compares every position against the protocol mask and asserts the fixed sequence of masks.
  The input loss and byte-level wire tests retain their original expectations.
- NET-002, PLAT-001, PLAT-009, DATA-005: `signal.ts` exposes only `join` as an opening message,
  preserves `created.hostToken` and `created.reopened`, and exports `SIGNAL_SUBPROTOCOL`,
  `HOST_SUBPROTOCOL_PREFIX`, `buildHostSubprotocols` and `parseHostSubprotocols`.
  The adapter uses the shared parser and selected subprotocol. Parsing requires exactly one valid host credential and exactly one base protocol, allowing unrelated offers;
  the server still compares the secret before acceptance. Helpers validate TOKEN_PATTERN (16–128 URL-safe characters); real host tokens remain accepted.
- Retired messages now use ordinary invalid-message handling: opening sockets get
  `bad-message` and close; established sockets get `bad-message` and remain connected.
  Repeated `join` retains its existing `not-allowed` and close behaviour.
- NET-002, DATA-005: the opening deadline emits `opening-timeout` both from alarms and lazily
  before events. The protocol header and README document it beside the terminal codes.
  Adapter deadline tests, protocol decoder tests and the server-message property test cover it.
- The focused run passed 78 tests, including all existing signal tests and the decoder property
  test. Evidence: `uat/evidence/F-02b-protocol-cleanup/focused.log`.
- No dependencies requested. No UI or real edge test applies to this pure contract follow-up.

### Protocol version

Retained `PROTOCOL_VERSION = 1`, `kaki.v1`, and private package version `0.0.0`.
Nothing is deployed and no client exists. Version 1 freezes at the first deploy; this
clean-up establishes that initial contract without a version bump.

## Requests

- Integrator: add `opening-timeout` beside `not-allowed` and `bad-message` in
  `docs/ARCHITECTURE.md` §5's terminal error wording and carry the tracker close-out.
- The historical F-02 slice note still describes socket creation and reattachment messages;
  mark those sections superseded by F-02b if historical notes should carry current guidance.
- Only Randy may amend PRD CTRL-001's old letter-button wording; D-047 and D-062 already
  establish the positional implementation used here.
- Source/comment audit found no remaining live letter face-button identifiers. Platform layout
  tests intentionally contain invalid letter-name fixtures and arbitrary labels; sim-core tests
  use generic bit aliases. These are not live face-button names and are outside the test lane.
- An initial verify run exposed an over-broad test expectation edit, which was corrected.
  Default parallel runs then hit existing 5-second test timeouts; `verify-timeouts.log`
  records one run. The final `pnpm verify` passed every stage: 52 files, 1,901 tests passed,
  one existing skipped test. The temporary evidence-local shell override has been removed.
  No timeout, assertion, budget or repository config was changed.
  Evidence: `uat/evidence/F-02b-protocol-cleanup/verify.log`.

### Handoff constraint

Branch: `issue/F-02b-protocol-cleanup`. The implementation is committed. Review-fix round 1
is left in the working tree as requested. No push, deployment, Wrangler process or Cloudflare
request was made.

### Review-fix round 1

- Updated both retired-message smoke expectations to bad-message with close assertions intact;
  the step label and PASS text describe both create and reopen. Read against the core
  invalid-opening test and adapter role tests; no Wrangler run was attempted.
- Host helpers enforce one base protocol, one credential and TOKEN_PATTERN. Builder throws
  TypeError for invalid tokens. Tests cover missing and duplicate offers, empty/short/long
  tokens, invalid characters, accepted boundary lengths and unrelated extra offers.
- Reverted pure wrapping changes throughout the issue's source and tests, including comment
  indentation, and deleted verify-shell.sh.
- Verification for this round: VITEST_MAX_WORKERS=2 pnpm verify passed every stage:
  52 files, 1,915 tests passed and one existing skipped test. Evidence in
  uat/evidence/F-02b-protocol-cleanup/verify-round-1.log.
- Requests: no new requests; earlier integrator documentation requests still apply.
