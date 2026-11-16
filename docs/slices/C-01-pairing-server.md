# C-01 Pairing server

Goal: introduce devices with a hibernating room object; never carry gameplay.
Requirements: PLAT-001 (server portion), PLAT-009 (signalling reload), NET-002,
DATA-001–003 and DATA-005 (server portion). DATA-004 privacy page is outside this lane.
Acceptance: random safe codes; authenticated host replacement; bounded opening sockets and phones;
role-validated isolated forwarding; socket abuse caps; exact origin checks; idle/absolute wipe.
Out of scope: C-02 TURN, C-03 cross-room/IP limits, UI, deployment and dependencies.

## Implementation and routes

D-063 governs creation/lifetime; D-065 governs codes and D-066 governs host admission.
POST `/rooms` creates the room and returns `created` JSON with hostToken. OPTIONS supplies CORS.
Socket create/reopen receive not-allowed; opening sockets and host create close, while host reopen
keeps its authenticated socket open.
The host keeps its signalling socket for the room lifetime. GET `/rooms/:code/host` must offer
`kaki.v1` and `kaki.host.<hostToken>`. The adapter compares the secret before accepting; missing
or wrong credentials return HTTP 401 with no socket. The response selects only `kaki.v1`.
Accepted attachments immediately have role host; the connect event carries authenticatedHost.
The first authenticated host receives `created` with reopened false; subsequent hosts receive
true, replace the previous host (close reason `replaced`) and replay live peers. Socket created
messages include hostToken for compatibility with the unchanged protocol decoder. `/phone` offers only `kaki.v1` and requires `join` within ten seconds.

Room codes are returned as eight raw uppercase characters. Routes and opening messages accept
lower case and strip spaces/hyphens, so `bcdf-2345` and `BCDF 2345` select `BCDF2345`. Codes are
displayed as two groups of four (XXXX-XXXX); grouping is a UI responsibility. Protocol validation
still runs after bounded-input normalisation.
The host may drop a peer or close the room. Binary, oversized, malformed and gameplay frames are
refused. Ordinary frames consume a burst of 60, replenished at 30/second; exhaustion sends
`rate-limited` then closes. Exact `SIGNAL_PING_TEXT` receives `SIGNAL_PONG_TEXT` through the runtime
hibernation auto-response, without waking or consuming a bucket. The 10,000-ping throttle smoke
therefore deliberately uses equivalent, noncanonical JSON. Canonical keep-alives are exempt.

There are at most eight identified phones, one authenticated host and four unidentified
phone sockets. There is no unidentified host reservation and no capacity eviction path.
Hosts are admitted regardless of phone caps. Excess unidentified phones return HTTP 429 before
acceptance; missing/expired rooms return HTTP 404. A matching live phone roomToken replaces that
transport even in a full room, issuing a fresh token. C-05 owns seat restoration.

Every adapter apply reconciles attachments/live sockets with stored membership in both directions.
Missing transports use the ordinary disconnect transition, including host-presence/peer-left
notifications; orphan transports get an error and close. Unknown message senders also close.
Removed ids cannot receive later forwards. Callbacks/storage/effects are serialised with
blockConcurrencyWhile. Opening deadlines run lazily on every event and through alarms. The alarm
is the earliest opening deadline, ten minutes after the final socket closes, or twelve hours
from room creation. A ghost discovered after an unobserved runtime restart is considered closed
when reconciliation observes it; its exact earlier transport-close timestamp is unavailable.
Expiry and host close-room delete the record and explicitly delete the alarm.

## Stored data (DATA-001–003)

One `room` record: code, host secret, creation/empty timestamps, expiry and host-opened flags;
current sockets' random ids, roles, room tokens, opening timestamps.
Socket attachments hold the random id and admission role (host or opening). The runtime holds the alarm timestamp and the
fixed ping/pong auto-response pair. Token buckets and the loaded room cache live only in memory;
buckets may reset after hibernation. Membership/lifecycle changes persist the room; ordinary
forwarding, malformed-message errors and rate-accounting do not write the room record. A wake
loads it once and reads the alarm once. Subsequent frames need no persistent reads or writes.
Host secrets use equal-length XOR-accumulation comparisons. Tokens have 32 URL-safe characters,
192 random bits. No IP, origin, nickname, score, settings, SDP, ICE candidate, gameplay payload
or telemetry is stored or logged by this implementation. Platform logging policy is separate.

## Room-code arithmetic (DATA-005)

The alphabet `23456789BCDFGHJKMNPQRSTVWXYZ` has 28 characters. Raw space is
28^8 = **377,801,998,336**, about **38.46 bits**, before filtering. Bytes >=252 are discarded before
modulo 28. Rejection sampling of whole codes remains uniform over the accepted set. The expanded
substring screen rejects raw words and normalised look-alikes (including V→U and 6/9→G).
It is a finite curated screen, not a guarantee against every rude phrase or language.

The reproducible prefix-DP count in `uat/evidence/C-01-pairing-server/code-space.py` gives
**361,866,010,493 accepted codes**, with 15,935,987,843 rejected by the current screen. This replaces the
previous unsupported 80%-remaining estimate. At an assumed one failed join per minute per source,
a twelve-hour room permits 720 guesses: at most 720/N = **1.98968673e-9** for a chosen live room.
Against 10,000 live rooms the union bound is **0.0000198968673 (0.00198968673%)**. Distributed sources multiply
the bound. These figures explicitly depend on C-03 enforcing join limits, including wrong-code
lookups and an aggregate abuse policy; C-01 alone does not make guessing impractical or fulfil
that portion of DATA-005. Atomic room initialisation prevents overwriting a live collision.

## Review round 1

| Item | Resolution and evidence |
|---|---|
| M1 | Pre-accept HTTP 429/404; orphan/unknown-message error and close. Adapter admission tests. |
| M2 | Bidirectional reconciliation before every transition; simulated restart and close-effect tests. |
| M3 | Ten-second phone opening deadline; cap four; authenticated host admission; earliest-alarm tests. |
| M4 | HTTP POST creation, socket create not-allowed, persisted first-host flag; adapter tests. |
| M5 | Named ten-minute idle/twelve-hour absolute constants; last-close, host-alive and wipe tests. |
| M6 | Raw eight-character codes; route/message normalisation; generation and Worker route tests; DP above. |
| S1 | Equal-length secret XOR comparison; invalid-token and replacement coverage. |
| S2 | Runtime ping/pong auto-response; memory buckets/cache; no per-frame persistent I/O test. |
| S3 | Expanded one-entry-per-line rude screen, V/U and 6/9/G mapping; 24-case substring table. |
| S4 | Hand-made state/socket/storage/attachment fake; adapter tests; populated cross-room isolation. |
| S4 invariants | Seeded sequences assert phones <=8, unidentified phone routes <=4, host routes <=1, no later sends to removed ids. |
| S5 | POST, created/joined replies and relay all use the single iceGrant() seam. |
| S6 | Matching live phone token replaces that phone at capacity; adapter and smoke coverage. |
| S7 | Local origins only in env.dev; absent configuration fails closed; Worker origin table tests. |
| S8 | Host upgrades authenticate before accept; phone openings require join; mismatch test. |
| S9 | Refused accepted sockets receive protocol error naming the reason before close. |
| S10 partial | Extended smoke maps a1/a2/a5/a6; a3/a4 manual restart; canonical-ping caveat below. |

Read all supplied a1–a6 scripts and their helper. Smoke includes exact-origin cases, create refusal,
wrong secret, wrong room, spoofed fields, malformed/binary/nested/1 MB frames, eleven silent
attempts, thirty excess HTTP refusals, host recovery, opening timeout, full room, host replay,
live phone replacement, code normalisation and 10,000 noncanonical pings. Manual a3/a4 restart
remains an integrator check, as requested. Exact SIGNAL_PING_TEXT frames are auto-responded without
JavaScript by S2, so they cannot also consume the core rate bucket. Smoke explicitly exercises
10,000 canonical auto-responses and then 10,000 noncanonical pings that must be throttled. This exemption is intended: the auto-response never wakes the object or consumes its bucket.
Every noncanonical frame reaches bucket accounting before decoding, including malformed JSON,
binary, oversized, invalid protocol and equivalent ping JSON; adapter tests cover these cases.
All apps/signal source/config/script lines are <=110
characters; statements occupy separate lines. No dependencies added or installed.

## Security follow-up 2 (D-066)

Removed the reserved unidentified host and eviction paths. A pre-upgrade constant-time secret
comparison authenticates the host; 1,000 wrong upgrades in the adapter test allocate no sockets
and preserve eight live phones plus four silent phones. Tests check host attachment role,
selected subprotocol, first/replacement flags, peer replay, replacement close reason, header credential
non-disclosure, retired messages, and full-character secret comparison on early/late mismatches.
The final fix restores hostToken in authenticated socket replies and uses AnySignal directly.
No contract file was edited.

Smoke now supplies and checks subprotocols, expects HTTP 401 for missing/wrong host credentials,
and checks that spoofed peer is discarded while the host receives the assigned phone id.
Every logical step prints STEP; FAIL includes the current step. Reviewed remaining queue order:
reload sends host-presence true to each phone; token replacement then sends not-allowed and close
to the old phone. Canonical pings bypass the bucket; noncanonical pings consume it. The real
smoke uses three rejected upgrades to stay within the silent-phone deadline; the deterministic
adapter regression covers 1,000. Manual restart instructions use upgrade authentication.

Runtime smoke is unverified in this sandbox: the prerequisite memory check cannot read sysctl
(Operation not permitted). Actual workerd frame-size handling, alarm delivery timing and the
10,000-frame flood remain runtime checks for the integrator; expected messages match core code.

## Final small fix pass and deployment notes

Restored hostToken on authenticated host created frames. Seeded event runs validate every send
with decodeToHostSignal or decodeToPhoneSignal for its recipient, including created and opening
errors; a deterministic prefix covers every server message kind before the random suffix.
Host reopen is refused with not-allowed without closing the authenticated socket. Event handlers
are split into named functions with explicit transition context. Only an evicted host receives
close reason replaced; expired openings and other removals receive Signalling ended.

Production (the default Wrangler environment) explicitly disables observability logs. Request
headers must never be logged: Sec-WebSocket-Protocol carries the host secret. No deployment ran.
The opening deadline retains bad-message because the protocol has no timeout code; see Requests.
The second reviewer passed the real local runtime except for the findings addressed in this pass;
this pass validates with deterministic tests and workspace verification.

## Close-out

Final small fix pass: `pnpm verify` passed (31 files, 1,034 tests; build and trace passed).
Verification output: `uat/evidence/C-01-pairing-server/verify.txt`.
Core/adapter/Worker tests cover PLAT-001, PLAT-009, NET-002, DATA-001–003 and the local DATA-005
controls. Follow-up regression evidence includes pre-accept authentication, no header credential disclosure,
constant-time comparison use, 1,000 rejected host attempts with a saturated room, and forwarding
after authenticated recovery. Smoke syntax and diff whitespace checks passed.

Branch: `issue/C-01-pairing-server`. Changes remain in the working tree, uncommitted as requested.
No dependencies, contracts, shared trackers or lockfiles changed. Runtime smoke and abrupt-restart
UAT remain integrator checks: the sandbox denies the required memory probe's sysctl access.
No runtime smoke pass, deployment or Cloudflare contact is claimed. Independent review remains
with the integrator. See REPORT.md for earlier runtime limitations.

## Requests

- Integrator: update `docs/ARCHITECTURE.md` §5 for D-066: host authentication through offered
  `kaki.v1` and `kaki.host.<hostToken>` subprotocols before accept; HTTP 401 without a socket for
  missing/wrong secrets; select only kaki.v1; no unidentified host or eviction; immediate host
  attachment, replacement reason `replaced`, first-host reopened false then true, and peer replay.
  Phone upgrades offer kaki.v1 only, with four unidentified slots and ten-second deadline.
  Preserve D-063 POST creation/lifetime and D-065 eight-character XXXX-XXXX display/normalisation.
- F-02b integrator: retire CreateRoom/ReopenRoom socket shapes and update authenticated-upgrade
  documentation. Keep RoomCreated.hostToken in HTTP and authenticated socket replies until a
  coordinated contract/client change. Add a timeout error code: none of the existing codes fits
  the opening deadline, so C-01 retains bad-message.
- C-04: treat not-allowed and bad-message as terminal errors. After host replacement or an opening
  deadline, do not wait for a close event: local workerd sends the close frame but does not shut
  down TCP until the client closes. Clients must close their own transport on those errors.
- Integrator: change the root ESLint ignore to **/.wrangler/**; root configuration is outside
  this issue's lane.
- Integrator: run local only with `WRANGLER_SEND_METRICS=false pnpm --filter @kaki/signal dev --port 5093`,
  then `KAKI_PORT_SIGNAL=5093 node apps/signal/scripts/smoke.mjs`; perform scripts/smoke-restart.md.
  The dev environment now explicitly includes its Durable Object binding and local origin list.
- C-02: replace iceGrant(); C-03: implement pre-allocation creation/join limits and aggregate
  abuse policy. The arithmetic above is conditional on those controls and is not a security claim.
- C-05: use replacement roomToken for signalling reload; persistent seat identity remains its task.
- Integrator: configure production origins explicitly; run independent review and real runtime UAT.
  DATA-004 privacy page, QR/UI, WebRTC, deployment and platform logging policy remain outside lane.
