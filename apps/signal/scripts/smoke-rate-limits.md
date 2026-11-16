# C-03 local smoke and deploy checklist (DATA-005, D-081)

The builder has not started Wrangler or contacted Cloudflare. Run the smoke steps locally
first, before considering any edge deploy. Use the assigned worktree ports, disabled telemetry,
local bindings and a private local ADMISSION_SECRET of at least 32 random characters, as in
smoke-restart.md. Run smoke.mjs against that already-running local instance. Confirm that the
local runtime preserves its synthetic documentation-range CF-Connecting-IP headers; otherwise
use an isolated local test adapter. Public clients cannot choose their edge identity this way.

Local checks:

1. Run smoke.mjs: handshake, relays, normalised codes, reloads, replacement, pings, flood limits,
   creation burst eight, pacing, real failed guesses and abandoned openings. Honour Retry-After.
   Refused requests never add failures. A per-room pending refusal must not block the host or
   a different room. The opening deadline is three seconds; existing receive timeouts remain.
2. Send join immediately on open. Pair eight phones plus token retries and host reload, using
   host burst 40 then 25/s with 12 candidates and done each way (224 relayed frames). Repeat
   for three rooms. No honest 429/rate-limited error.
3. Fill 16 unidentified slots with multiple clients. The 17th closes the oldest with
   opening-timeout and is accepted. Authenticated hosts remain unaffected. Confirm a valid
   join rejected by eight occupied seats does not count as a failure.
4. Exhaust creation and pending leases across a ten-minute HMAC boundary; the overlapping key
   preserves limits. IPv6 interface rotation within a /64 shares a counter; different /64s
   share the second /48 failure counter. Mapped IPv6 shares the IPv4 key. Missing/garbage
   addresses return 400 without a limiter or room lookup.
5. Evict/restart an idle limiter: its counters reset, with no storage reads, writes or alarms.
   Existing room state still survives its ordinary restart. Check early close, timeout and
   error callbacks; failed/hung limiter feedback must not stall a room. Creation and joins
   with an unavailable limiter return 503, CORS and Retry-After 5.
6. Test with and without a fake/optional EDGE_LIMIT binding. Its first refusal and subsequent
   isolate-cached refusals make no limiter call. A cached failure must reveal nothing about
   whether a code exists. Clock rollback must not advertise more than 60 s (600 for creation).

Deploy checklist (reviewer wording retained):

- secret
- binding
- migration
- Paid plan and billing alert
- logging off
- IPv4/IPv6 behaviour of CF-Connecting-IP on the edge
- DNS route
- privacy page wording
- run the smoke steps locally first

Details for integration: provision ADMISSION_SECRET privately and ADMISSION in every target
environment. EDGE_LIMIT is optional; its ratelimits entry uses namespace 1001, limit 240/60 s
and the same canonical rotating client key. Confirm the namespace choice before deployment;
removing the optional binding leaves admission enforcement intact. With nothing deployed,
v2-admission is folded into v1: RoomObject remains new_sqlite_classes and the memory-only
AdmissionObject is new_classes (no SQLite storage required). Confirm the Paid plan and a
billing alert before enabling it. Keep logs, Tail, exports and proxy request recording off,
especially headers and credentials. Confirm edge-supplied IPv4, IPv6 and mapped-address
behaviour and forwarding spoof resistance; no missing-address fallback exists. Approve the
DNS route and privacy wording describing short-lived rotating opaque keys in limiter memory,
without client-address storage. Confirm hot-shard latency, hibernation attachments, canonical
ping auto-response, server close completion and three-second deadlines on the real edge.

Offline call measurements are in uat/evidence/C-03-rate-limits/costs.txt. They are counts,
not a billing quote: account-wide request allowances, WebSocket billing rules and duration
still need checking before deploy. A limiter is not a monthly spending cap.
