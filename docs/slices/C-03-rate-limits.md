# C-03 — Pairing server rate limits, review-fix round 4

DATA-005, with DATA-001–004 privacy constraints. Implements D-084 read in full from the main
checkout's docs/DECISIONS.md, narrowing D-083 eviction and edge keying. D-083 replaces
D-081 b/c and extends a; the remaining D-081 rules stand. No protocol, shell, dependency, tracker or deployment changes.

## Implementation and limits

| Scope | Limit |
|---|---|
| IPv4 address / IPv6 /64 creation | 8 burst, 1/minute |
| IPv6 /48 creation | 64 burst, 1/second, checked first |
| IPv4 address / IPv6 /64 attempts | 96 burst, 2/second |
| IPv6 /48 attempts | 1,536 burst, 32/second, checked first |
| Ordinary failures | 16 tolerance, 32 cap; quiet decay 1/minute |
| /48 failures | 128 tolerance, 256 cap |
| Back-off | 1, 2, 4, 8, 16, 32, 60 seconds; refusals never extend it |
| Pending ordinary phones | 12/room, 17 total including probes; reduced by confirmed failures |
| Pending /48 | 129 total including probes; reduced by confirmed failures |
| Opening pool | 16; join deadline 3 seconds |
| Socket messages | 60 burst, 30/second |
| Counter retention / HMAC rotation | 10 minutes / overlapping 10-minute epochs |
| Limiter memory | 16 shards × 1,024 entries, plus 64 overflow buckets per shard |

Eviction uses one rule: settle expired leases into failures before considering an entry;
require zero failures after quiet-time decay, no leases, live probes or block, and a full
creation meter refilled to now. Select the least recently seen eligible entry. Attempt-meter
balance does not affect eligibility. A same-clock eligibility index preserves this order,
including when a clean entry is accessed or inserted. Otherwise use 64 key-bit overflow
buckets with ordinary budgets, including for /48 keys. Expired unresolved guesses become
failures when noticed, independently of whether a disconnected request's Worker continues.

A newcomer may replace only an opening with the same opaque client key or one silent for at
least 1.5 seconds. Otherwise HTTP 429 occurs before WebSocket allocation and is refunded.
Replacement charges the old owner once. Opening client keys and admission tickets remain in
memory; neither room storage nor socket attachments contain those keys. Idle object eviction
may lose feedback, whose ten-second lease then expires under D-081e/D-083.

Multi-key admission checks /48 before /64 and stops at first refusal, refunding earlier leases.
Finish resolves every key. Worker caches admission-meter /48 refusals across /64 subnets.
EDGE_LIMIT uses the first-seen IPv4 address or IPv6 /64 HMAC; its 60-second refusal
cache covers only that client key, across routes. Room opening-pool HTTP 429 passes through
the room's Retry-After (1 second) with CORS and is not cached. AdmissionObject writes no
storage; both classes use new_sqlite_classes in the
undeployed v1 migration. Optional EDGE_LIMIT is explicitly declared in dev too.

D-084 accepts two trade-offs: a housemate or stranger sharing the same address can push out
an honest phone's fresh opening, since they could already take its seats; and one abuser
with several /64s in a carrier's /48 can keep that /48's joins backed off.

## Measured costs

Offline adapter measurements count real limiter and room calls, with no Cloudflare contact.

| Operation | IPv4 limiter calls | IPv6 limiter calls | Room work |
|---|---:|---:|---|
| Cached refusal / edge refusal | 0 | 0 | None |
| Wrong-code guess | 4 | 8 | 1 fetch |
| Create + host + eight joined phones | 38 | 76 | 10 fetches + 8 join events |
| First /48 creation refusal | — | 1 | None |

IPv6 session: 4 creation calls + 8 host calls + 8×8 phone calls. Limiter storage reads,
writes and alarms remain zero. Partial reservations can add rollback calls. These measurements
are call counts, not currency or runtime-duration estimates; Paid-plan billing and real duration
must be checked before deploy. G1 and R18 measure 81 failed guesses/client/simulated hour.

Reviewer cost estimates: holding a room's opening pool full costs about 11 charged failures
a second; keeping a shard unevictable costs about 1,024 fresh failures a minute.

## Close-out

DATA-005 changes are in apps/signal/src/core/admission.ts and worker.ts, with the edge
binding documented in apps/signal/wrangler.jsonc. All round-3 reviewer cases E1–E6 and P2–P3
are ported into apps/signal/src/review3.test.ts. P3 now explicitly asserts the accepted
same-address push-out. Extra tests cover quiet-decayed eviction with depleted attempts,
same-clock LRU maintenance, ordinary /48 overflow budgets, /64-only edge refusal caching,
and uncached room Retry-After forwarding. Existing full-meter LRU and million-creator tests
now assert D-084 eligibility and protected depleted creation, respectively.

E1–E6, P1–P3, G1–G6 and R01–R18 pass. E2 admits 72 unresolved guesses per simulated hour
under churn; G1/R18 remain 81 confirmed failures per simulated hour. No check or existing
time limit was changed. Evidence is under uat/evidence/C-03-rate-limits/: verify.txt,
review-tests.txt, costs.txt and REPORT.md. No Wrangler or Cloudflare contact occurred.
pnpm verify passed: 81 files, 2,383 tests passed and one pre-existing skipped test; build
and trace check passed. Local runtime smoke and independent Claude review remain integration work.

## Requests

Deploy checklist (nine points):

1. Provision ADMISSION_SECRET separately in every environment.
2. Confirm the migration class type: RoomObject and AdmissionObject are new_sqlite_classes.
3. Confirm the ratelimits namespace id 1001 and 240/60-second setting, including dev.
4. Check Paid-plan costs, actual durations/WebSocket billing and set a billing alert.
5. Keep logging off, including headers containing host credentials.
6. Validate CF-Connecting-IP IPv4/IPv6 behaviour on the real edge.
7. Confirm the DNS route with Randy before publishing.
8. Run apps/signal/scripts/smoke-rate-limits.md locally first.
9. Confirm on the real edge whether a client disconnecting cancels the Worker before it records a result.

Netcode should retry once on opening-timeout and honour Retry-After on room creation.
The shell needs a host kick that blocks rejoining (R06 records the residual seat-filling risk).
The integrator owns architecture, traceability and decision updates, privacy page wording,
local smoke, edge validation and deployment approval.

## Round 4 Close-out — DATA-005

The failing smoke assertion was a script error: `step()` selects a fresh address, and the
integrator's per-opening labels called it twelve times and once more for the rejection.
Those were thirteen different clients, so admission was correct. Before that edit, the
attempt scenario's address and room leftovers could instead refuse an early opening.
Progress labels now explicitly preserve the client inside the pending scenario. Each C-03
scenario allocates its own room and starts with fresh addresses; no C-03 scenario uses the
preceding full-room fixture. The abandonment retry waits 10.5 seconds after the opening
timeouts to clear the ten-second cached lease refusal, then uses the five remaining
provisional charges, rather than incorrectly expecting another twelve.

D-081 provisional charging is intentional: unresolved openings across rooms initially stop
at 17 (failure budget 16 plus one), then decrease with confirmed failures. The old 48-total
and /48 768-total branches were unreachable. PENDING_TOTAL is now 17 and supplies the
ordinary provisional allowance; /48 continues to use its failure budget plus one (129).
The dead separate lease-total branch is removed. No admission limit is weakened.
D-083 replacement operates only after Worker admission: a client holding twelve leases
cannot reach replacement; below twelve a full pool may replace its own opening and charges
that owner a failure. D-084 does not change that rule. Feedback is drained explicitly in
new Worker tests so asynchronous waitUntil settlement participates in assertions.

New Worker regressions replay eight seated phones with normalised codes, four waiting
phones, host reload, token replacement, 10,000 canonical runtime auto-responses and a
noncanonical ping flood, mixed upgrade/probe attempt exhaustion, a 3.5-second deadline,
twelve fixed-client openings, the thirteenth refusal before room lookup and another client's
token join. Separate regressions cover the full 16-opening pool with same-client replacement
and the cross-room 12 + 5 provisional ceiling, abandonment and one-trial recovery.
The runtime's canonical ping response is emulated using its registered auto-response pair;
no Wrangler server was started. Integrator reruns the real smoke.

Validation: `VITEST_MAX_WORKERS=2 pnpm verify` passed: 97 files, 2,513 tests passed,
one skipped; workspace, typecheck, lint, design lint, build and trace check passed. Full output
is in uat/evidence/C-03-rate-limits/verify-round4.txt. `node --check` and `git diff --check`
also passed. The Worker adapter file alone passes all 18 tests.

## Round 4 Requests

Rerun apps/signal/scripts/smoke.mjs against the local Wrangler server and review this round.

## Round 5 Close-out — DATA-005

The fault is admission-shard lifetime, not a lease refund. AdmissionObject previously held
its whole Admission instance only in an ordinary field and had no pending work to prevent
idle eviction. The installed Miniflare/workerd implementation documents ten-second idle
object eviction (miniflare/dist/src/index.js, preventEviction documentation). The Worker
refusal cache avoids further shard calls. The room reports twelve deadline failures at
three seconds through waitUntil; at fourteen seconds those shards have been idle for eleven
seconds, so their new instances have fresh counters. Probe A's requests at four seconds and
its next deadline reports at seven seconds keep the shards younger than ten seconds when
probed at fifteen seconds. Both supplied probe scripts were read; Wrangler was not started.

Checked every proposed candidate: per-room admission refusal adds no lease; multi-key and
/48-to-/64 rollback finish only the newly generated UUID; finish removes only that lease;
the Worker cache never intercepts room-to-admission feedback; deadline feedback is failed
unless a socket became a phone/host or received room-full; IDs use crypto.randomUUID.
None erases the twelve live leases. The cache exposes the idle-reset fault by removing
traffic, rather than swallowing finish calls.

The corrected Worker harness models idle shard eviction and waitUntil lifetime. Before the
production fix, the probe-B regression fails because the sixth opening at fourteen seconds
returns 101 instead of 429 (round5-before.txt). Previously the fake kept every AdmissionObject
alive indefinitely unless a test explicitly recreated it; it could not reproduce the real
idle reset. The room alarm runs at three seconds and its real admission feedback is drained
before advancing to fourteen seconds.

AdmissionObject now holds one pending timer/waitUntil task per shard through the existing
ten-minute retention window, renewing it when requests continue and releasing it after
quiet. Counters remain memory-only; no limiter storage, storage alarms, new dependency,
threshold change or weaker limit. Runtime/crash/deployment resets remain possible. The
compatibility date already exceeds the pending-I/O eviction-protection gate of 2026-10-01.

New Worker regressions cover probe B, room pool-full, edge, cached and /48 refusals, and
/48 provisional rollback on /64 refusal. Every case checks exactly five later admissions,
then refusal, and after deadline failures and back-off expiry exactly one trial followed by
refusal. Edge coverage uses a fresh Worker isolate after the edge refusal so its sixty-second
cache does not mask admission-counter assertions. /48 coverage exhausts the family attempt
meter through sibling /64 HTTP probes without adding failures to those counters. Lifecycle
tests check task release, renewal, one task per shard, and zero limiter storage/alarms.

The last smoke scenario creates its room from another address, uses its own fresh opening
client, asserts the sixth refusal, preserves the 10.5-second post-deadline idle window, and
waits 1.1 seconds after all five later deadline errors before its single back-off trial.
Existing test time limits and checks are unchanged. Evidence: round5-before.txt,
round5-tests.txt and round5-verify.txt under uat/evidence/C-03-rate-limits/.

## Round 5 Requests

Integrator: rerun local smoke and direct probes A/B, then independent review. The bounded
in-memory retention task keeps shards active for up to ten minutes after the last call,
changing duration billing compared with immediate idle eviction; measure this before deploy.
No account, deployment or Wrangler operation was performed in this round.

Runtime references (read-only):
https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/
https://developers.cloudflare.com/changelog/post/2026-10-01-pending-io-keep-alive/

Round 5 verification: `VITEST_MAX_WORKERS=2 pnpm verify` passed. Workspace, typecheck,
ESLint, design lint, all 97 test files (2,521 passed, one skipped), build and trace check
passed. Focused Worker suite: 26 tests passed. `node --check` of smoke.mjs and
`git diff --check` also passed. The real-runtime smoke remains unrun in this worktree.
