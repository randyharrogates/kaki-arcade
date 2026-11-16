# Slice S-01 — Network spike

Issue S-01 in `docs/backlog/S-spikes.md`, wave 0. Branch `issue/S-01-network-spike`.
Throwaway code in `spikes/s01-network/`; nothing in the product imports it.

## Goal

Prove with numbers, before the real netcode (C-04) is written, that phones can drive a host
page over WebRTC data channels inside the input-delay budgets, and say plainly what the
numbers do not yet prove.

## Requirement IDs

| ID | Covered here | Which part |
|---|---|---|
| NN-3 | partly | Input delay measured against the budgets on emulated phones. Not proven on real phones. |
| PERF-010 | measured on loopback only | Touch → simulation step p95 for 1, 4 and 8 emulated phones. **Not proven**: needs real phones on real Wi-Fi (README §2). |
| PERF-011 | not measured | The relayed/direct label and the relay settings are built; the relay run needs credentials and Randy (README §4). |
| NET-002 | demonstrated | Phones connect to the host directly over WebRTC data channels; the signalling server forwards only SDP and candidates and refuses anything else. |
| NET-003 | prepared, not run | TURN can be added and forced by URL parameter; the host labels a relayed path. Automatic fallback is not shown until a relay run happens. |

## Acceptance

1. The host page creates a room, shows a join code and link, and accepts up to 8 phones over
   WebRTC, each with an unordered no-retransmit input channel and a reliable control channel.
2. Each phone has one coloured dot on the host that its stick moves; 8 dots move at once.
3. The host shows live, per phone: touch → sim-step delay p50/p95/p99, send → received
   p50/p95/p99, packets lost, and direct or relayed.
4. The phone page has a touch stick and one button, sends sequenced input state at a fixed
   rate, and has a scripted mode (`?bot=1`).
5. The signalling server only introduces devices: it carries no gameplay and refuses a ninth
   phone.
6. One command runs 1, 4 and 8 emulated phones for 30 s each and writes percentiles to
   `uat/evidence/S-01-network-spike/results.json` with a screenshot of 8 dots moving.
7. Awkward paths: a ninth joiner is refused and told why; a wrong code is refused; a phone
   that closes its page loses its dot and its place can be taken; releasing the stick leaves
   nothing held on the host.
8. The README gives Randy exact steps for real phones, and prepared-but-not-run steps for the
   HTTPS tunnel and the relay run.
9. Every process is stopped and ports 4550 to 4559 are free at hand-back.

## UAT

`node spikes/s01-network/run.mjs`: both servers and one headless Chrome on 127.0.0.1; the
host at 1920 × 1080 and each phone in its own browser context at 844 × 390 with touch, joined
through the real join link and real WebRTC between contexts (no mocked transport). Playwright
is not installed yet, so Chrome is driven over the DevTools protocol directly. Evidence and
the per-statement verdicts are in `uat/evidence/S-01-network-spike/REPORT.md`.

## Out of scope

Real phones, the tunnel and the relay run (Randy, README §2 to §4). Reconnect and seat tokens
(PLAT-007, PLAT-009). Wake lock, motion, fullscreen, vibration (S-05). The product protocol
and netcode (F-02, C-04). Visual design: this is a diagnostic page with placeholder styling,
made before the design tokens exist.

## Results

Numbers are in `uat/evidence/S-01-network-spike/REPORT.md` and `results.json`, with the
budget table, what is unproven, and the recommendation for C-04. The short version:

- **The network is not the problem on loopback** (send → received p95 about 2 to 4 ms, no
  loss, no reordering, all paths direct, host steady at 60 fps with 8 phones).
- **The budget is mostly spent before and after the network.** Scripted phones at a fixed
  60 Hz give touch → step p95 of 22.6 (1 phone), 30.8 (4) and 27.4 ms (8), of which the network is about 3: the rest
  is waiting for the next send tick (up to 16.7 ms) and for the next simulation step (up to
  16.7 ms).
- **With real touch events the emulated phone is over the limit: p95 54 to 59 ms against 50.**
  The extra is the browser taking about 19 ms (p50), 35 ms (p95) to hand a touch-move to the
  page. Whether
  a real iPhone or Android does the same cannot be told from an emulation, and it decides
  whether PERF-010 as worded ("from the touch event") is reachable with headroom for Wi-Fi.
  **This is flagged for Randy as a possible contradiction of the plan** (CLAUDE.md rule 9);
  it needs the ten-minute real-phone run before C-04 is designed in detail.

## Recommendation for the real netcode (C-04)

From what was measured; items marked (real phones) must be rechecked after README §2.

- **Channels.** Input: `ordered: false, maxRetransmits: 0`, binary. Control: a second channel,
  ordered and reliable, for join, lock-in, pause, layout and private views. Both created by
  the host in its offer. This worked for 8 phones with no loss or reordering and connected in
  under 60 ms on loopback.
- **Send policy: on the event, plus a tick.** Send the full input state at once when a touch
  event changes it (rate-capped at about 120 a second), and keep a fixed tick while anything
  is held so a lost packet heals. A fixed tick alone costs up to 16.7 ms at 60 Hz for nothing.
  With send-on-event the tick can drop to **30 Hz**: 8 phones at 30 Hz + event measured p50
  9.8, p95 17.4 ms against p50 17.4, p95 27.4 ms for a plain 60 Hz tick, at 6.7 kB/s against
  4.6 kB/s per phone. If relay data matters more than 8 ms, plain 30 Hz measured p95 28.6 ms
  at 2.3 kB/s. (real phones)
- **Release.** "All released" three times, as `ARCHITECTURE.md` §5 says; the host saw 0,0
  after every release here. Drop the 5 Hz idle keep-alive this spike used, or keep one a
  second on the control channel for liveness.
- **Message size.** The spike sent 24 bytes because it carries two 8-byte timestamps for
  measuring. The product needs about 8: type (1), sequence u16 with wrap-aware compare (2),
  stick x and y as int8 (2), buttons (1), event time u16 in ms, wrapped (2). Size barely
  matters: per-packet overhead (DTLS, SCTP, UDP, IP) is about 80 bytes, so **rate decides
  data use, not payload**.
- **Sequence handling.** Keep the newest sequence, ignore anything older, count gaps as loss.
  Never queue: apply the latest state at the next step.
- **Clock sync.** Ping/pong on the *unreliable* channel (a retransmit would poison the
  sample), `offset = (t0 + t1) / 2 − phoneTime`, keep the sample with the lowest round trip
  of the last 16; 12 quick pings at 250 ms on connect, then one a second to follow drift. On
  one machine this stayed within 3.9 ms of the true offset. Use `performance.now()` on both
  sides and `event.timeStamp` for the touch time. It is only needed for measuring PERF-010 and
  011 in the field; nothing in the simulation should depend on phone clocks.
- **Host step.** Up to 16.7 ms of every input's delay is waiting for the next 60 Hz step.
  If real phones show touch delivery near what the emulation showed, C-04 and the platform
  loop should consider draining input and stepping when a packet arrives (still fixed-dt
  steps, just not tied to the display frame) or a 120 Hz input step. Do not decide this until
  the real-phone numbers exist.
- **Direct or relayed.** Read `getStats()`: the transport's selected candidate pair, relayed
  if either candidate's type is `relay`. Once a second is plenty.
- **Pairing.** The phone can close its pairing socket as soon as the control channel opens;
  the host keeps its own open and tells the server when a phone's link dies so the place is
  freed. The 8-phone limit belongs on the server, with the host as a second check.
- **ICE servers.** None were configured here and local paths were found, but only on one
  machine. Expect to need at least STUN in the product for phones whose `.local` names do not
  resolve. (real phones)

## Close-out

| ID | Code | Tests | Evidence |
|---|---|---|---|
| NN-3, PERF-010 | `spikes/s01-network/public/host.js` (measurement, 60 Hz step), `public/phone.js` (timestamps, send policy), `run.mjs` | none automated in `pnpm verify` (throwaway spike; the run script is the test) | `uat/evidence/S-01-network-spike/results.json`, `REPORT.md`, `01`–`03`, `08`, `strip-host-8-dots.png`. Loopback only: the row stays `todo`/`doing`, not `done`. |
| PERF-011 | `public/common.js` `iceConfig`, `public/host.js` `readLink` (relayed label) | none | none: not run. README §4. |
| NET-002 | `spikes/s01-network/signal-server.mjs`, `public/host.js`, `public/phone.js` | none | `results.json` → `allPathsDirect`, `signallingServer.refusedPayload`, `checks`; `03-host-8-phones.png` |
| NET-003 | `public/common.js` `iceConfig` | none | none: not run. README §4. |

No requirement can be marked `done` from this slice: it is a spike, and its real-device half
is still to do.

**Dependencies requested:** none. Nothing was added to `package.json` or the lockfile.

**Requests** (outside this lane):

1. **Randy, about 10 minutes:** README §2 with the real iPhone and Android on the home Wi-Fi,
   and send the host table. Then, if he chooses, §3 (tunnel) and §4 (relay). S-01 cannot close
   and S-04/C-04 should not fix their designs without the §2 numbers.
2. **Integrator → `docs/OPEN-QUESTIONS.md`:** where does PERF-010's clock start? As worded it
   starts at the touch event, so it includes the phone browser's own delivery time (measured
   here in emulation at about 19 ms p50, unknown on real phones) and up to one 16.7 ms wait
   for the simulation step. If real phones show the same, 50 ms leaves almost nothing for
   Wi-Fi. Options for Randy once real numbers exist: keep the budget and accept the design
   constraints in the recommendation (send on the event, step the simulation on input
   arrival or at 120 Hz), or restate the budget. Only Randy changes a budget.
3. **Integrator → `docs/HANDOFF.md` estimate:** a phone sending 24-byte inputs at 60 Hz
   measured about 4.6 kB/s at the ICE layer (about 6.2 kB/s with IP and UDP headers), which is
   about 22 MB an hour while the stick is held, against the "roughly 10 MB an hour" behind the
   800 GB relay limit (NET-004). A 10-byte product message would save about 0.8 kB/s; most of
   the cost is per-packet overhead, so the lever is send rate, not message size.
4. **Integrator → `STATUS.md`, `TRACEABILITY.md`, `DECISIONS.md`, backlog:** record the
   loopback numbers as loopback numbers. S-01 stays `doing` until the real-phone run.
5. **F-07 (UAT harness):** headless Chrome needs `--disable-background-timer-throttling
   --disable-backgrounding-occluded-windows --disable-renderer-backgrounding`, and each phone
   in its own browser context, for nine pages to keep 60 Hz timers and frames. Also: pages in
   one Chrome share one frame clock, which locks the phone's touch delivery to the host's
   step and hides nothing but does distort the phase (REPORT.md, "Read with care").
