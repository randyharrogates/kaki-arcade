# C-04 — Netcode

Goal: browser-independent pairing and WebRTC transport for NET-001, NET-002, NET-005 and
PERF-010, on issue/C-04-netcode. Lane: packages/netcode, this note and C-04 evidence only.
The initial build, review-fix round 1 and lockfile follow-up are committed.
Review-fix round 2 is committed; review-fix round 3 remains in the tree as requested.
D-076 was read from the integrator checkout; its local copy predates that decision.

## Review-fix round 1

| Item | Implementation and automated evidence |
|---|---|
| 1 | Healthy host peers ignore repeated peer-joined after reattach (R2). |
| 2 | Phone socket loss preserves open data channels (R3); optional onSignallingError reports socket loss separately. |
| 3 | A new offer after remote SDP retires the phone PC and creates another (R7). |
| 4 | FIFO signalling bucket, burst 40/refill 25 per second, uses injected clock. Eight phones at 40 ms intervals, 10 candidates each: no server rate closes; all answer (R19). |
| 5 | Unfinished peers expire after 15 seconds and close on peer-left (R4 and timeout test). |
| 6 | Both sockets ping every 10 seconds; absent pong at next interval triggers host retry or phone report. Half-open tests use real core. |
| 7 | Connecting/connected/reconnecting/gone events, injected random jitter; injected upgradeStatus adapter resolves HTTP 404 and stops retries. Browser WebSocket alone hides HTTP status. |
| 8 | Four jittered phone upgrade retries; opening-socket cap test pairs six simultaneous scans (R18). |
| 9 | Individual ICE rejection ignored; null candidates never forwarded (R8 and updated R1 expectation). |
| 10 | Typed host send covers close-room/drop/relay; refreshIce and refreshIceIfExpired expose credential renewal and monotonic expiry. |
| 11 | Host decodes once, passes WireInput to receiver.receiveInput; test makes the old decode entry throw. |
| 12 | Stats stop once path known, repeat on state change; 12 pings spaced 60 ms. RTT window 60 samples; loss window 128 sequence positions; silence creates no loss. Recovery needs three 1-second healthy reports after windows clear. |
| 13 | Channel bufferedAmount/onerror; input skips above 1024 bytes; control returns false above 16384 and exposes queued bytes. |
| 14 | Absolute 60 Hz scheduling tested with callbacks 3 ms late; per-peer input/control flood buckets run before decoding. |
| 15 | Resume seatToken supplies stable Identity.deviceId under D-076. This historical field name requires no separate device id; room state validates the token. |
| 16 | Hostile-frame test asserts buffer unchanged. Real-core reviewer tests ported; signalling and control delay modelled. Reusable wire bytes remove per-tick Uint8Array allocation (R17); tests never write files. |

The test-only @kaki/signal workspace dependency and test project reference are allowed by the
workspace check. No runtime dependency, lockfile, shared tracker, contract or check changed.
The original R1 expected a null candidate; it now correctly expects only the four actual
candidates, following item 9. Logging-only scan cases now assert zero rate-limited closes.
The pacing tests allow the queue time to drain before asserting completed negotiation.

## Review-fix round 2

1. Phone negotiation deadlines start at the first offer. A synchronous offer-seen flag
   replaces missing, closed or previously offered peers before asynchronous SDP work (V4,
   V8; strict host-blip variations V1/V1b/V2).
2. Closed/departed peers discard their queued signalling; socket failure clears obsolete
   signalling before reattachment (V7 asserts no further sends and no peer-not-found).
3. Queue heads prioritise offers/answers over candidates and rotate peers while preserving
   each peer's order. V6 enforces the eighth offer within 300 ms; V5 checks all eight pairs.
4. A back-pressure skip preserves sequence/history, pending blips and the release counter.
   Nine released frames still leave after draining; V14 checks frames directly plus fuzz.
5. Host and phone automatically request fresh ICE before negotiation with an expired grant,
   deferring work until the reply. TTL zero uses infinite expiry (asserting V12 variants).
6. Tap-survivor captures now copy borrowed bytes; hostile-frame checks deep-copy the sample.
7. Reviewer variations are ported to `packages/netcode/src/review-r2.test.ts`; unused harness
   helpers and console diagnostics removed, assertions retained and strengthened. V17 also
   asserts independent copied captures.

## Review-fix round 3

- Host and phone ICE renewal release queued negotiation after 3 seconds on the injected
  scheduler, or immediately on a nonfatal error reply. They use the existing grant for that
  attempt without extending its expiry; later negotiations can request renewal again.
  Stop cancels the timer and terminal transports cannot create peers from a late timeout.
- Phone negotiation deadline reports `negotiation-timeout` through onError after closing.
- Connection-level queue entries (ping/relay) have no peer tag; phone signalling retains its
  own peer tag. Discarding a peer preserves connection-level traffic.
- Ported W1–W10 into `packages/netcode/src/review-r3.test.ts`, removed diagnostics and unused
  harness code. W2 asserts the error/closed reports; W8 asserts no late tap; W9 asserts a
  peer and answer within 3.1 seconds, then connected paired fake channels.
- Added host refresh-error, phone refresh-timeout/error and queued ping/relay regressions.
  All 14 round-3 tests and all 107 netcode tests pass, including existing V and R suites.
  Full `VITEST_MAX_WORKERS=2 pnpm verify` passes: 59 files, 2,096 tests, one existing skip.
  Evidence: `uat/evidence/C-04-netcode/tests-r3.txt` and `verify-r3.txt`.
- No browser UAT or independent review claimed in this round. No dependencies, checks,
  budgets, contracts, shared trackers, node_modules, manifests or lockfile changed.

## Close-out

NET-001: typed controls, token identity, bounded receive/back-pressure and real authoritative
buffer tests. NET-002: pairing, lifecycle, ICE and relay commands, retry/keep-alive, eight-phone
real-core tests. NET-005: loss/reorder/history, resume fence hooks, hostile frames, allocation
and absolute tick tests. PERF-010: immediate input reaches the authoritative buffer with zero
added simulation steps; this does not establish real Wi-Fi p95 ≤50 ms.

**107 netcode tests pass; round-3 verify passes: 59 files, 2,096 tests, one existing skip.**
Earlier validation and output: [report](../../uat/evidence/C-04-netcode/REPORT.md),
[tests](../../uat/evidence/C-04-netcode/tests.txt), [verify](../../uat/evidence/C-04-netcode/verify.txt).
Independent review and integration remain with Claude. No commit/push/merge in this round.

## Browser UAT still required

F-07/F-08: actual browser upgrade/status adapter, SCTP and trickle, Safari/Chrome, TURN path,
background throttling, host reload/phone sleep, eight-phone teardown, real iPhone/Android
same-Wi-Fi touch-to-step p95 ≤50 ms, GC and transfer budgets. No screenshots or real-device
pass claimed. Screens/games, deployment and C-05 persistence remain outside this slice.

Additional browser and real-phone checklist from round 2 (pending):

- Renegotiate a strict real peer connection after a host socket blip and after host reload.
- Join a phone while the host is away for more than 15 seconds, then attach the host.
- Exercise bufferedAmount back-pressure on a real data channel and verify release frames.
- Confirm the upgrade-status probe returns 404 for an expired room.
- Check keep-alive under hidden-tab throttling and iOS screen lock.
- Measure QR-scan-to-seated time with eight phones joining at once.

## Requests

- Define the reliable resume acknowledgement carrying a current-pause nonce and nextInputSeq;
  C-10 must match the nonce before invoking acknowledgeResume. Existing resume is seat return.
- Consider an expandInput API that fills a reused buffer when F-08 measures allocation/GC.

- C-05’s reducer must verify the seat token before accepting a resume as an identity. The
  transport’s resume identity hook is unverified until that validation succeeds.
