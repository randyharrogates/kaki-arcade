# S-01 network spike — UAT report

Run: `node spikes/s01-network/run.mjs` on 2026-11-16, Apple M3 16 GB, Chrome 157 headless,
Node 24.21. Output in `run-output.txt`, numbers in `results.json`. Every image below was
opened and looked at. A first run showed two faults in the pictures (the phone's room-code
form was visible and pushed the stick half off the screen; the touch-driven phone was
labelled "bot1"); both were fixed and the whole run repeated. These files are the second run.

**All of this is emulated phones on loopback: the same Mac, no radio, no router, no phone
CPU. It is a best case. It does not prove PERF-010 or PERF-011.**

## Acceptance statements

| # | Statement | Result | Shown by |
|---|---|---|---|
| 1 | Host creates a room, shows code and link, accepts up to 8 phones, unordered no-retransmit input channel plus reliable control channel | pass | `03-host-8-phones.png` (code YMLW, link, "8 of 8 phones"); channel settings in `spikes/s01-network/public/host.js` `addPeer` |
| 2 | One coloured dot per phone, moved by its stick; 8 move at once | pass | `strip-host-8-dots.png` (8 frames over 2.6 s, every dot in a new place each frame, trails curve), `03-host-8-phones.png` |
| 3 | Live per-phone delay p50/p95/p99, loss, direct or relayed | pass | `03-host-8-phones.png` table; `08-host-touch-phone.png` shows the red "over 50" verdict working |
| 4 | Phone: touch stick, one button, fixed-rate sequenced sends, `?bot=1` | pass | `04-phone1-bot.png`, `07-phone1-touch-held.png` (knob under the dragged touch point); 60/s in every 60 Hz row of `results.json` |
| 5 | Signalling only introduces devices; ninth phone refused | pass | `results.json` → `signallingServer` (40 joins, 160 SDP/candidate messages forwarded, 1 refused full, 1 refused wrong code); `05-phone9-refused.png` |
| 6 | 1, 4 and 8 phones for 30 s each to `results.json`, screenshot of 8 dots | pass | `results.json`, `01-host-1-phone.png`, `02-host-4-phones.png`, `03-host-8-phones.png` |
| 7 | Ninth joiner told why; wrong code refused; a phone that leaves frees its place; release leaves nothing held | pass | `results.json` → `checks`; `05-phone9-refused.png` ("Room is full (8 phones)."); `06-host-after-leave-and-rejoin.png` (place 8 now "rejoin"); stick reads 0,0 on the host after touch end |
| 8 | README steps for real phones, tunnel and relay | written, **not run** | `spikes/s01-network/README.md` §2 to §4 |
| 9 | Processes stopped, ports 4550–4559 free | pass | checked with `lsof` after the run |

## Numbers (touch → simulation step, milliseconds)

| Scenario | Samples | p50 | p95 | p99 | max | Network alone p95 | Lost | Late |
|---|---|---|---|---|---|---|---|---|
| 1 phone, scripted, 60 Hz, 30 s | 1,655 | 14.7 | **22.6** | 24.2 | 39.3 | 2.4 | 0 | 0 |
| 4 phones, scripted, 60 Hz, 30 s | 6,606 | 18.8 | **30.8** | 33.3 | 46.3 | 2.8 | 0 | 0 |
| 8 phones, scripted, 60 Hz, 30 s | 13,228 | 17.4 | **27.4** | 30.0 | 48.1 | 3.8 | 0 | 0 |
| 8 phones, scripted, 30 Hz, 15 s | 3,600 | 16.3 | 28.6 | 32.8 | 62.1 | 3.0 | 0 | 0 |
| 8 phones, scripted, 60 Hz + send on event, 15 s | 6,990 | 12.4 | 25.2 | 29.4 | 62.3 | 3.0 | 0 | 0 |
| 8 phones, scripted, 30 Hz + send on event, 15 s | 6,900 | 9.8 | 17.4 | 28.3 | 43.1 | 2.2 | 0 | 0 |
| 1 phone, **real touch events**, 60 Hz, 10 s | 506 | 38.4 | **54.4** | 54.9 | – | 2.4 | 0 | 0 |
| 1 phone, **real touch events**, 60 Hz + send on event, 10 s | 435 | 29.2 | **58.6** | 60.8 | – | 2.3 | 0 | 0 |

Other measurements: every path `direct` (host/host candidates, no ICE servers configured);
host 60 fps with frame p95 ≤ 18.2 ms in every scenario; pairing to connected 12 to 58 ms;
ping/pong clock estimate within 3.9 ms of the true offset (checkable only because both pages
share one machine clock); one phone at 60 Hz costs the host 4.56 kB/s in and 1.70 kB/s out at
the ICE layer; a closed phone was dropped by the host in 23 ms; no page errors.

## Against the budgets

| Budget | Verdict | Why |
|---|---|---|
| PERF-010, direct p95 ≤ 50 ms | **Not proven. Scripted phones: 22.6 to 30.8 ms, inside. Touch-driven emulated phone: 54.4 and 58.6 ms, outside.** | See below. Needs real phones. |
| PERF-011, relayed p95 ≤ 120 ms | **Not measured** | No relay run (needs credentials and Randy). |

## Read with care

- **Where the time goes.** Network 1 to 4 ms. Wait for the next 60 Hz send tick: 0 to 16.7 ms
  (removed by sending on the event). Wait for the host's next 60 Hz simulation step: 0 to
  16.7 ms. And, for real touch events only, the browser's own delivery of the event to the
  page: measured p50 18.8 ms, p95 34.7 ms in headless Chrome (`touchEventToHandlerMs`).
- **The touch-driven result is the important one and the least trustworthy one.** The 19 ms
  touch delivery may be an artefact of headless Chrome and DevTools-injected touches, or it
  may be what phones do (browsers hand touch-moves to the page once per frame). Scripted
  phones have none of it, which is why they look comfortable. Only a real phone settles this.
- **Send-on-event did not help the touch-driven p95, and that is an artefact.** All pages in
  one Chrome share one frame clock, so a touch delivered at the start of the phone's frame is
  sent at once and lands just after the host's step for that same frame, then waits a whole
  frame. Two real devices have independent clocks. With scripted events (not frame-locked) the
  gain shows: p50 17.4 → 12.4 ms at 60 Hz.
- **Maximums** up to 62 ms are single samples in 15 to 30 s on a shared, busy Mac (other agents
  were running). No conclusion is drawn from them.
- Zero loss and zero reordering say nothing about Wi-Fi. Loopback does not lose packets.

## Unproven until real phones are tried

1. Delay and loss over real Wi-Fi, with 8 radios sharing the air, and far from the router.
2. How long iPhone Safari and Android Chrome take to deliver a touch to the page.
3. Whether phones connect at all with no STUN server (local addresses hidden behind `.local`
   names), on plain HTTP and through the HTTPS tunnel.
4. iPhone Safari's data-channel behaviour: timer accuracy at 60 Hz, what happens on screen
   lock, low-power mode.
5. Anything relayed: PERF-011, the automatic fallback (NET-003), the "relayed" label on a real
   relayed path.
6. Stability beyond 30 s (PERF-030 is a 30-minute requirement).
