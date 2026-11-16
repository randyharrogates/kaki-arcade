# C-03 DATA-005 review-fix round 3 evidence

D-084 was read in full from the main checkout's decision log. Offline tests use real Worker,
AdmissionObject and RoomObject code with fake transports/storage. No Wrangler or Cloudflare
contact occurred. No UI changed; screenshots do not apply.

| Review | Result |
|---|---|
| E1 | Offender retains failure history after expired block and 2,048 churned guesses |
| E2 | 72 unresolved guesses/client/simulated hour under 1,024-key churn per cycle (previously 6,120) |
| E3 | One-failure shard uses ordinary overflow and admits an honest phone |
| E4 | Depleted creators remain protected; honest newcomer uses overflow |
| E5 | 64 ordinary overflow buckets; diagnostic drains all with 620 keys / 10,540 failures |
| E6 | University /48: 300 rooms and 2,400 joins over 10 minutes, zero refusals |
| P2 | Fresh honest opening survives 200 other-client newcomers |
| P3 | Same-address housemate can replace a 1 ms-old opening, as accepted in D-084 |
| P1 | Honest opening survives sixteen newcomers within 85 ms |
| G1 | 81 failed guesses/client/simulated hour, below 200 |
| G2 | Honest join and creation admitted after churn; no shared generous overflow |
| G3 | 17 unresolved guesses maximum for a new ordinary key |
| G4 | Creation remains depleted after churn: Retry-After 60 |
| G5 | Blocked offender survives clean churn |
| G6 | No duplicate/unearned refund; dropped lease becomes one failure at 10 seconds |
| R01–R18 | All pass; R04 waits the ruled 1.5 seconds, R05 uses distinct pool owners |
| Blocked-only overflow | 64 key-bit buckets, normal guess budgets, separate bucket still admits |
| /48 creation | 64 burst then one/second; first refusal costs one call, next subnet uses cache |
| Replaced owner | Exactly one failure; no client key in stored room state |
| Same-client opening | Immediate replacement allowed; unrelated fresh newcomer refused |

Focused result: 189 tests passed in nine files (review-tests.txt).
Costs: wrong guess IPv4 4 / IPv6 8 limiter calls plus one room fetch. Honest session
(create, host, eight joined phones) IPv4 38 / IPv6 76 limiter calls, ten room fetches and
eight join events. Cached and edge refusals cost zero limiter calls. Limiter storage reads,
writes and alarms remain zero. See costs.txt. These are call counts, not currency estimates;
actual duration, WebSocket billing and Paid-plan allowance remain deploy checks.

Additional D-084 tests cover quiet-decayed eligibility with depleted attempt tokens, LRU
ordering through same-clock clean accesses and insertions, ordinary /48 overflow budgets,
/64-only edge keys and refusal caching, and uncached room-pool Retry-After 1 forwarding.

D-084 also accepts an abuser with several /64s backing off a carrier's /48. Reviewer costs:
about 11 charged failures/second to hold a room pool full; about 1,024 fresh failures/minute
to keep a shard unevictable. The slice's nine-point deploy checklist includes observing
whether a client disconnect cancels the Worker before it records a result. Lease expiry
settlement is independent of that runtime behaviour.

Full workspace verification passed: 81 files, 2,383 tests passed and one pre-existing
skipped test; build and trace check passed. Full output is saved in verify.txt. No check or existing time limit
was changed. Local runtime smoke, edge verification, deployment/account work and independent
Claude review remain integrator steps. No Wrangler or Cloudflare contact occurred.
