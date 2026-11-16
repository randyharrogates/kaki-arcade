# S-01 — Network spike

Throwaway code. Nothing here is imported by the product. It answers one question with
numbers: can up to 8 phones drive a host page over WebRTC data channels inside the input-delay
budgets (PERF-010 direct p95 ≤ 50 ms, PERF-011 relayed p95 ≤ 120 ms)?

No npm dependencies. Ports: web **4550**, signalling **4551**, headless Chrome's debugging
port **4553** (unattended run only).

| File | What |
|---|---|
| `signal-server.mjs` | Pairing only: room code, forwards offers, answers and candidates, refuses a ninth phone. Hand-written WebSocket on `node:http`. Refuses anything that is not an SDP or a candidate. |
| `web-server.mjs` | Serves `public/` and passes `/sig` through to the signalling server, so a phone needs one address. |
| `public/host.html` | The big screen: room code, join link, one dot per phone, live numbers per phone. |
| `public/phone.html` | The controller: a touch stick and one button. `?bot=1` moves in a circle by itself. |
| `run.mjs` | The unattended run: 1, 4 and 8 emulated phones, results and screenshots to `uat/evidence/S-01-network-spike/`. |

## 1. The unattended run (already done; loopback only)

```sh
node spikes/s01-network/run.mjs            # about 4 minutes
node spikes/s01-network/run.mjs --quick    # 5 s per scenario, to check it still works
```

It starts both servers and a headless Chrome, all bound to 127.0.0.1, and stops them at the
end. Results: `uat/evidence/S-01-network-spike/results.json` and `REPORT.md` beside it.

## 2. Randy: real iPhone and Android on the same Wi-Fi (about 5 minutes)

This is the part that is **not proven yet**. The unattended run has no radio in it.

**Does this need HTTPS?** Not expected to. WebRTC data channels and pointer events work on a
plain `http://` page in Safari and Chrome; it is the camera, microphone, motion sensors and
wake lock that need HTTPS, and this spike uses none of them (those are S-05). If a phone
shows "This browser has no WebRTC on this page", or sits on "Joining…" for more than ten
seconds, use the HTTPS route in section 3 and tell Claude which phone it was.

1. Put the Mac, the iPhone and the Android phone on the same Wi-Fi. Not a guest network:
   guest networks usually stop devices seeing each other.
2. In one terminal, from the repo root:
   ```sh
   node spikes/s01-network/signal-server.mjs --port 4551
   ```
3. In a second terminal (`--lan` makes the pages reachable from the Wi-Fi; without it only
   this Mac can open them):
   ```sh
   node spikes/s01-network/web-server.mjs --port 4550 --signal-port 4551 --lan
   ```
   It prints the host address, for example `http://192.168.82.18:4550/host.html`. (The Mac's
   address was 192.168.82.18 when this was written; `ipconfig getifaddr en0` shows today's.)
   If macOS asks whether `node` may accept incoming connections, allow it.
4. On the Mac, open **Chrome** at `http://localhost:4550/host.html`. Keep that tab in front:
   a hidden tab is slowed down by the browser and the numbers become meaningless.
5. The page shows a room code and a join link such as
   `http://192.168.82.18:4550/phone.html?room=ABCD`. Type that link into Safari on the iPhone
   and Chrome on the Android phone (or open `…/phone.html` and enter the code).
6. Turn each phone sideways. Drag the stick on the left; press **A** on the right. Each phone's
   dot should follow the stick with no visible lag, and a ring appears round the dot while A
   is held.
7. Play with both phones for **60 seconds**, stick held and moving most of the time. Then read
   the table on the host page and send Claude a screenshot of it, or these per phone:
   - **Path** (should say `direct`)
   - **Touch → sim step** p50, p95, p99 (the budget is p95 ≤ 50)
   - **Send → received** p95, **Lost**, **Late**, **Ping**
8. Worth two more minutes each, because they are what will go wrong at a party:
   - Walk to the far side of the flat with one phone and watch p95 and Lost.
   - Fill the room: next to the two real phones open six bots in Mac browser tabs
     (`http://localhost:4550/phone.html?room=ABCD&bot=1`; give each its own window so none is
     hidden) and see whether the real phones' numbers move.
   - Try `&eager=1` on the end of a phone's link. It sends on the touch itself instead of
     waiting for the next 1/60 s tick; the unattended run says this takes about 8 ms off.
   - Lock a phone and unlock it: does the dot come back, or does the page need a reload?
9. Stop both terminals with Ctrl-C when done.

What a pass looks like: both phones `direct`, p95 at or under 50 ms across the 60 seconds,
Lost a handful at most. Anything else is a finding, not a failure of the test: note it.

Known unknown: with no STUN server configured, browsers hide their local address behind a
`.local` name. Chrome on the Mac resolves an iPhone's and the reverse normally works on a home
network, but if one phone never connects while the other does, that is the first suspect.
Adding `&stun=stun:stun.cloudflare.com:3478` to **both** the host and the phone link works
round it (it contacts Cloudflare's public STUN server: free, no account).

## 3. Prepared, NOT run: HTTPS through a Cloudflare quick tunnel

**Not run by Claude.** A quick tunnel gives the Mac's port 4550 a public `https://` address
that anyone with the link can open for as long as it runs. That is Randy's call.

`cloudflared` is installed (`/opt/homebrew/bin/cloudflared`, checked 2026-11-16). A quick
tunnel needs no account and costs nothing.

1. Start both servers as in section 2 (`--lan` is not needed for this route: the tunnel
   connects to localhost).
2. In a third terminal:
   ```sh
   cloudflared tunnel --url http://localhost:4550
   ```
   It prints an address like `https://some-random-words.trycloudflare.com`.
3. On the Mac open `https://some-random-words.trycloudflare.com/host.html`. The join link the
   page shows now uses that address; open it on the phones.
4. Only the pages and the pairing messages go through the tunnel. The game traffic still goes
   phone to Mac over the Wi-Fi, and the Path column should still say `direct`. That is the
   thing to check: it is how the real product will behave (HTTPS page, direct link).
5. Ctrl-C the tunnel as soon as you are finished. The address stops working at once.

One port is enough because the web server passes `/sig` through to the signalling server.

## 4. Prepared, NOT run: one run forced through a TURN relay (PERF-011)

**Not run by Claude.** It needs relay credentials, which need a Cloudflare account action, and
it sends traffic to an outside service. Cloudflare's relay is free for the first 1,000 GB a
month (`docs/ARCHITECTURE.md` §6); a ten-minute test uses a few megabytes.

1. In the Cloudflare dashboard: **Realtime → TURN Server → Create** a TURN key. Note the
   **Turn Token ID** and the **API Token**. (Menu names as of late 2026; check the current
   docs at https://developers.cloudflare.com/realtime/turn/ if they have moved.)
2. Ask for short-lived credentials (one hour):
   ```sh
   curl -s -X POST \
     -H "Authorization: Bearer <API_TOKEN>" -H "Content-Type: application/json" \
     -d '{"ttl": 3600}' \
     https://rtc.live.cloudflare.com/v1/turn/keys/<TURN_TOKEN_ID>/credentials/generate-ice-servers
   ```
   The reply holds a `username` and a `credential`.
3. Start the servers and, for a phone on mobile data, the tunnel from section 3. Open the host
   page with the relay added (one line; the username and credential must be URL-encoded if
   they contain `+`, `/` or `=`):
   ```
   <host address>/host.html?turn=turn:turn.cloudflare.com:3478%3Ftransport%3Dudp&turnUser=<username>&turnPass=<credential>&relay=1
   ```
   `relay=1` on the host puts `relay=1` in the join link, so every **phone** is forced through
   the relay while the host still offers all its addresses: the usual real case (one side
   relayed). `relay=both` forces the host through the relay too, the worst case.
4. Join with the phones from the link shown. The Path column must say **`relayed`** (that
   label is what PLAT-010 will show players). Play for 60 seconds and record the same numbers
   as section 2. Budget: p95 ≤ 120 ms.
5. The most honest version of this test is a phone on **mobile data** with Wi-Fi off, through
   the tunnel link: that is the situation the relay exists for.
6. The credentials sit in the page address for this spike only. They expire after the hour;
   delete the TURN key afterwards if you do not want to keep it. The product will hand them
   out from the pairing server instead (NET-003, NET-004).

## 5. What the numbers mean

- **Touch → sim step** is the budget figure: phone clock time of the touch event to the host
  clock time of the 60 Hz simulation step that applies it. Phone clocks are mapped to the host
  clock by ping/pong, keeping the lowest round trip of the last 16 pings.
- **Send → received** is the network alone.
- **Lost** are sequence numbers that never arrived; **Late** arrived after a newer one and
  were ignored. Neither stalls anything: the input channel is unordered with no retransmits.
- A phone sends its whole input state at 60 Hz while anything is held, "all released" three
  times on letting go, then a 5 Hz keep-alive (spike only, so loss stays countable).
