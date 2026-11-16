# @kaki/netcode

Injected transport for NET-001, NET-002, NET-005 and PERF-010. Production imports only
`@kaki/protocol`. Clock, scheduler, socket, peer factory and retry randomness are injectable.

Host pairing creates a room or reattaches with stored credentials. `onPairingState` reports
connecting, connected, reconnecting and gone. Backoff starts at 250 ms, doubles to 10 seconds,
then applies 0.75–1.25 jitter. Browser WebSocket hides HTTP upgrade status: supply
`upgradeStatus(url)` in the adapter to resolve upgrade failures; 404 stops retries and reports
gone. Without that adapter, initial repeated upgrade failures report socket-unavailable.
Phone upgrade failures retry four times before reporting socket-closed. Both sockets ping
at 10-second intervals and fail a socket when its next interval has no pong.

Signalling sends use a FIFO token bucket: burst 40, refill 25/second, including keep-alives.
Accepted sends queue during reconnect, retain order and are discarded only on explicit stop.
Host transport exposes typed `send(HostSignal)` for close-room, drop and relay, `refreshIce()`,
`iceExpiresAt` (monotonic milliseconds), and `refreshIceIfExpired()`. Fresh grants apply to
subsequent peers. `stop()` only disposes local resources; use close-room to end the room.

Healthy data channels survive host signalling reattach and phone signalling close. Repeated
peer-joined only rebuilds an unfinished peer. A second offer creates a fresh phone peer if
the old one already has a remote description. An unfinished peer closes after 15 seconds or
peer-left. Phone `onSignallingError` reports socket loss independently of healthy data links.
Final room errors still close peers. One rejected ICE candidate is ignored; candidates-done
never calls addIceCandidate(null).

The host creates kaki-input (unordered, no retransmits) and kaki-control (ordered/reliable).
`onPeer` supplies a peer; state/link/control callbacks carry connection ids. Under D-076,
resume's seatToken is the stable identity, supplied as `Identity.deviceId` to the room-state
hook. The historical field name does not imply another device id. Room state must validate
the seat token against its seats before accepting a resume. `bindIdentity(seatToken)` lets
the trusted adapter bind an already assigned seat. Unbound hello callbacks have null identity.

Bind `createHostInput(buffer, seat)` to the accepted peer, using the sim-core buffer configured
with seqModulus 65536 and staleAfterSteps 15. Input is decoded once, then expanded oldest
first with protocol expandInput. Malformed frames cannot change the buffer. Pause/resume
fences require a reliable acknowledgement with nextSequence captured by the phone; the
protocol still needs that acknowledgement and a current-pause nonce. Never use the host's
last received sequence as a resume fence.

The phone input sender sends touch changes immediately, caps at 120 Hz with deferred ticks,
and schedules held/release ticks against absolute 60 Hz deadlines. Eight previous masks
recover taps through loss/reorder. Nine release frames precede silence. It reuses state,
history and preallocated wire buffers; send must copy borrowed bytes synchronously. The
local wire writer is pinned to protocol send-rule/decoder tests. F-08 must measure actual GC;
expandInput still allocates on receipt.

Channel adapters expose bufferedAmount and onerror. Input above 1024 queued bytes is skipped
as stale; control sends above 16384 bytes return false, with controlBufferedAmount exposed
for retry. Control revisions are cached only on successful sends. Per-peer receive buckets
bound input to burst 240/refill 180 per second and control to burst 240/refill 60 per second,
before decoding. Channel errors close the peer.

Startup pings are spaced 60 ms apart (12 total), then one per second. RTT median/p95 uses
60 samples: approximately the last minute after startup. Loss uses 128 sent sequence positions
(about 2.1 seconds of continuous 60 Hz input), repaired by reorder; legitimate silence adds
no positions. Weak means p95 >100 ms or loss >10%; recovery requires three healthy 1-second
reports below 70 ms and 3%. Recovery therefore also waits for old samples to leave these
windows. Relay selection overrides quality. getStats runs until the path is known and on
connection-state changes. These are lobby indicators, not touch-to-step budget evidence.

Tests never write files. The reviewer harness uses apps/signal's real pure core through a
test-only workspace dependency, plus upgrade checks and scriptable signalling/control delay.
Real browsers, TURN, radio loss and iPhone/Android same-Wi-Fi p95 ≤50 ms remain F-07/F-08 UAT.
