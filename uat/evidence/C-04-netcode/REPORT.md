# C-04 netcode — review-fix round 1

Branch: issue/C-04-netcode. The initial build is committed; this review-fix round is left
in the tree at the user's request. No push, merge, contract, lockfile or tracker change.

The reviewer file is ported to packages/netcode/src/review.test.ts. It drives the real pure
pairing core, with the upgrade checks modelled by its wrapper. A test-only workspace
reference passes the existing workspace guard. Tests write no files. Signalling and reliable
control delays are modelled. Native WebRTC is still outside this deterministic proof.

R1–R19 pass, including six additional R19 scan parameter cases. R1's candidate count was
corrected to exclude null end-of-candidates per review item 9. R19 is strengthened to 10
candidates per phone, eight joins 40 ms apart, completed SDP and open paired fake channels,
with zero rate-limited closes. Pacing assertions allow the FIFO time to drain.

| Review items | Evidence |
|---|---|
| 1–3 | R2 host reattach preserves healthy PCs; R3 phone socket close preserves channels; R7 second host offer replaces phone PC. |
| 4–5 | R5/R19 real server rate bucket, R4 peer-left, 15-second unfinished-peer timeout test. |
| 6–8 | Real-core keep-alive pong/half-open tests; 404 gone and deterministic jitter tests; R6 initial upgrade failures and R18 retry under opening-socket cap. |
| 9–10 | R8 rejected ICE candidate; null omitted; typed drop/relay/close-room test and expiry API. |
| 11–12 | Receiver decode entry deliberately throws; known-path stats call count; 60 ms ping spacing with 20 ms delayed RTT; R15/R16 loss/window maths. |
| 13–14 | Congested input skipped, exposed control bufferedAmount and false send; channel error teardown; both frame flood bounds; late callback absolute tick test. |
| 15–16 | Resume seat token reaches identity hook; hostile frames leave buffer unchanged; R17 counts zero per-tick Uint8Array creation; protocol byte equivalence and delay tests. |

**70 netcode tests pass. Full verify: 57 files pass, 2,059 tests pass, one existing skip;**
**workspace, typecheck, lint, design lint, build and trace pass.**

Exact latest results are in [tests.txt](tests.txt) and [verify.txt](verify.txt).
The full verify uses VITEST_MAX_WORKERS=2. PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false prevents
pnpm from attempting a network reinstall: this worktree lacks installed tool links, so local
node_modules links point to the integrator checkout's existing tool installation. The normal
verify scripts, checks, thresholds and time limits are unchanged.

No screenshots, browsers, real socket upgrade/status probe, SCTP, TURN or real phones were
used. F-07 must validate native browser adapters and host reload/phone sleep; F-08 must measure
GC and real iPhone/Android same-Wi-Fi touch-to-step p95 ≤50 ms. The build's no-bundles hook
cannot establish transfer budgets. Independent review and integration remain with Claude.

Open requests: resume acknowledgement on the wire with a current-pause nonce and nextInputSeq;
consider expandInput into a reused buffer when F-08 measures allocation. D-076 uses the seat
token as identity; no separate device id or encoder contract change is requested.

## Review-fix round 2

The initial implementation, round 1 and lockfile follow-up were committed before this round.
Round 2 is left uncommitted. No package.json, node_modules, lockfile, shared tracker or contract
was edited.

Reviewer variations are ported in `packages/netcode/src/review-r2.test.ts`. V1–V16 pass,
alongside V1b and V17; R1–R19 continue to pass. Netcode now has 93 passing tests. Imported
unused helpers/console output were removed; V11's assertions retained. V4 also checks no
negotiation errors, V6 asserts at most 300 ms, V7 asserts zero subsequent sends, V12 asserts
fresh ICE configurations for both roles and zero-TTL grants, and V14 counts nine release
frames after back-pressure drains. The tap-survivor and hostile-input snapshots are copied.

The slice note records all seven review items, C-05's required seat-token validation, and
six additional pending browser/real-phone checklist entries. No native browser or real-phone
pass is claimed. See tests.txt and verify.txt for command results.

Round 2 full verification: `VITEST_MAX_WORKERS=2 pnpm verify` exits 0. Workspace,
typecheck, ESLint, design lint, unit tests, build and trace all pass: 58 test files,
2,082 passing tests and one existing skip. Build reports no bundles or source asset sets yet;
trace reports 152 requirements and passes. Checks and time limits are unchanged.

## Review-fix round 3

Automated evidence only; browser UAT and independent review remain with Claude.

- W1–W10 pass; W9 negotiates within 3.1 seconds using the old grant after a lost renewal,
  then fake paired channels report connected on both transports.
- Four additional cases pass: host renewal error, phone renewal timeout/error, queued
  keep-alive and relay surviving peer discard. W2 checks the timeout error and closed state.
- Existing V and R suites pass; 107 netcode tests total.
- Full verify passes: 59 files, 2,096 tests passed, one existing skip; build/budget and trace
  checks pass. See `tests-r3.txt` and `verify-r3.txt`.
