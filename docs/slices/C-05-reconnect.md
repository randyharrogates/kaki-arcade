# C-05 reconnect

Goal: injected phone persistence/retry and host room/session persistence, without rendering.
Requirements: PLAT-007, PLAT-009; related PLAT-008, NET-005, DATA-001–005.

Acceptance: same-seat return inside the inclusive two-minute hold; automatic pairing after
reload; authenticated replacement; host reload restores room identity and the last results;
transient failures preserve retryable recovery; bounded persistence outside simulation steps.
Headless evidence uses fake storage/clocks, real reducers and simulated netcode. No visible UI
is built. Out of scope: screens, protocol/server/game contracts, trackers and dependencies.

D-086 governs this implementation. PLAT-009 is read per D-086 a: host reload loses the running
match for all three games, restores the room, seats, names, colours, teams, leader and last
finished match results, and returns to the lobby. OQ-031 is open: interrupted Peek Poker and
Rabakz totals are not retained by the current contract. GameModule.save is device progress
passed to context.saved, not a resumable live match. No private simulation state is persisted.

## Implementation

The platform reconnect entry exports injected storage, phone recovery, host restore and
checkpoints, game capture guards and the authenticated room adapter. Storage validation
helpers remain internal. No browser globals or simulation-step hooks are used.

D-086 b–h: format version 1 uses kaki.phone-reconnect.v1 (2 KiB) and
kaki.host-reconnect.v1 (64 KiB). Only the last results are retained. Writes drop optional
results, then selection before abandoning a capture; failed writes/capture preserve the last
good snapshot. Normal checkpoints coalesce at one second; pending writes flush on page exit
and re-arm on pageshow. sessionStorage survives a reload and reopen-closed-tab but not a new
tab. Credentials never enter URLs or diagnostics.

Host restore waits 15 seconds for matching authenticated created/reopened. Timeout/network
failure returns `{ retryable: true }`, retaining the snapshot; the shell can call restoreHost
again. Definitive room-not-found, room-expired, not-allowed or bad-token errors, mismatched
code/secret, reopened:false and invalid/stale snapshots clear it. The shell passes a server
error as a string or an Error with code/message equal to the server reason. Pending and late
sockets are stopped. Success has retryable:false. The 12-hour lifetime remains authoritative.
Clocks tolerate up to five seconds of skew and restore clamps to max(now, writtenAt).

Each phone's original drop time survives host reload; connected seats start their hold at
restore. The room reducer prunes expired holds and applies its own leader restoration rule.
Phone attempts have 15-second deadlines, with 250 ms doubling retries capped at eight seconds.
After the hold, hold-over exposes rejoin() and retains slow eight-second retries until a
server answer. Resume and hello remain distinct; a lobby broadcast cannot turn a failed
resume send into a fresh join. A newly entered normalised code wins over another room's
stored seat and nickname. Explicit rejoin discards the old seat and asks for a fresh one.

## Shell wiring required

Phone: sessionStorage, pagehide to sleep, pageshow and online to wake, explicit exit to leave,
dial wraps the phone transport, initial only for a fresh join, never log the seat message.
Host: seat tokens from crypto.getRandomValues with at least 128 bits, register the socket stop
before awaiting created, buffer peers and controls until restore returns, checkpoint on room
changes, pause, results and selection, flush on pagehide and hidden, handle not-allowed from a
second host tab. Forward pageshow to the checkpoint lifecycle callback to re-arm exit capture.
The shell supplies a stable clock, transport callbacks and authenticated input binding.

## Close-out

| Requirement | Code / tests | Evidence |
|---|---|---|
| PLAT-007 / PLAT-008 | phone.ts, phone-store.ts, host-room.ts; reconnect.test.ts and review.test.ts: inclusive hold, automatic retry, expiry/rejoin, precedence, replacement, paused/team recovery | uat/evidence/C-05-reconnect/review-tests.txt |
| PLAT-009 | host-store.ts; host-store.test.ts and review.test.ts: authentication, retryable timeout/network, original drop times, last results, bounded capture, clock skew, repeated exit flush; three game reconnect tests | Same test output and verify.txt |
| NET-005 | Authenticated room binding, sequence-zero input and private/layout refresh in reconnect.test.ts | verify.txt |
| DATA-001/002/003/005 | strict bounded JSON, no private state, capture guards, denied storage and checkpoint tests | verify.txt and storage-limits.json |

The 16 reviewer cases are ported to review.test.ts as assertions of D-086 behaviour.
Independent review and browser/device UAT remain with the integrator; this slice renders
nothing. No dependencies, deployment, merge, push or repository settings changed.

## Requests

- A proper shared test-fixture entry point for cross-package tests (netcode simulation and
  signal core), with integrator-owned package exports/references.
- ARCHITECTURE section 5 Reconnect needs updating; the integrator does it.

Final verification: `VITEST_MAX_WORKERS=2 pnpm verify` passed: 98 test files, 2,482 tests passed and one existing skip. Workspace checks, TypeScript, ESLint, design lint, build/budget checks and trace checks all passed (152 requirements). `git diff --check` passed. Full output: `uat/evidence/C-05-reconnect/verify.txt`.
