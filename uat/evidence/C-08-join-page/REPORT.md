# C-08 — Evidence report

Round 2 repairs implement D-095. The integrator's committed round2 captures below document the round 1 repairs and remaining findings; that section is preserved verbatim. This pass adds automated regression evidence. Fresh captures of this pass could not be made: Vite listen at ::1:5188 failed with EPERM, and installed Chrome launched through Playwright aborted with SIGABRT. No fresh visual pass is claimed.

## Automated evidence — current round 2

- Probe A is ported into phone-integration.test.ts: after a channel is lost during a signalling outage, the running phone resumes the same seat/name automatically when signalling returns, before reload.
- Probe B is ported into phone.test.ts and the production-transport fixture: while renaming, an adversarial different-code Join is inert; Save name sends set-name only; validation, host refusal and Cancel retain the seat, stored identity and dial count.
- The fixture runs separately for room-not-found, room-expired and not-allowed delivered through real fixture sockets while channels are open. Netcode unit tests independently assert the channels remain connected. Platform unit tests assert unchanged states/storage before and after seating and terminal handling when the channel is closed.
- Platform tests cover the admission-wait addition to the negotiation deadline and the D-095 1–30 s retry pacing. Browser tests cap Retry-After at 30 s, including negative, invalid, past-date and timer-overflow headers.
- Budget tests reject Ah Boy/H7KQ9MXR demo markers and a public file that exceeds the unchanged 300,000-byte controller gzip budget. The controller counts the complete deploy, including copied public files. Built CSS is scanned for British-spelled properties; custom properties/values are permitted.
- Launcher lifecycle tests cover localhost, 127.0.0.1, a LAN IP and explicit 0.0.0.0 binding, advertised phone URLs, keeping Web alive after Pairing exits, and cleanup on SIGINT. Mock children exercise process lifecycle without a listening server.
- Focused reconnect/phone pass: 139 tests across 7 files. Focused netcode/fixture pass: 44 tests across 2 files (before the final pacing adjustment). These are simulated RTC tests, not real devices.

Current production bundle: host **132,117 bytes raw / 46,202 bytes gzip** (limit 1,500,000); controller and deploy **132,117 bytes raw / 46,202 bytes gzip** (controller limit 300,000). The controller includes the whole shared entry and copied public output. Production demo-marker and built-CSS scans pass. Typecheck, focused UI ESLint, launcher syntax and git diff --check also pass. Historical round 1 sizes are not the current build. The complete verify tail is recorded below after the final run.

## Coverage still required

- Fresh 844×390 landscape screenshots and no-scroll measurements for every state with the keyboard closed; 390×844 portrait, keyboard-open, safe areas and full-name card rendering.
- Host 720p capture proving three-line nicknames and their fixed status slot never touch; inspect all phone/host screenshots and transition frame strips.
- Real-path rename form focus/Cancel/refusals, persistent live-region behaviour with a screen reader, header ellipsis, reduced motion and touch targets.
- Real Wrangler/LAN listener test, eight real phones during signalling expiry/refusals, unattended recovery, Safari/Firefox and wake lock where supported.
- PERF-020 interactivity ≤2 s, PERF-021 QR-to-seat ≤5 s, real network latency/relay and quiet-machine performance. No fresh timing or frame evidence is claimed.
- Host-side D-095 f handling remains in C-10/C-15.

## Round 2 final verification

`VITEST_MAX_WORKERS=2 pnpm verify` passed (exit 0): 128 files, **2,952 passed / 1 existing skipped**, 264.84 s. Workspace check, typecheck, ESLint, design lint (252 files; no new exemptions), production build, all unchanged budgets and trace check passed. The final explicit rename focus callback also passed typecheck and focused UI ESLint; the full run's build includes it. No package manifests, lockfile or dependencies changed.

```text
Test Files  128 passed (128)
     Tests  2952 passed | 1 skipped (2953)
  Duration  264.84s
PERF-022 host: 132117 bytes raw, 46202 bytes gzip / 1500000
PERF-020 controller (shared entry): 132117 bytes raw, 46202 bytes gzip / 300000
PERF-022 deploy: 132117 bytes raw, 46202 bytes gzip / 1500000
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 76 in progress, 1 later, 75 not started
trace check passed
```

## Integrator's browser evidence (Chromium through Playwright, 2026-11-17)

`pnpm dev` (with `KAKI_DEV_KEEP=1` for the outage) started the web app and the local pairing
server. One browser held the host page at 1920×1080 and up to nine phone tabs at 390×844,
joining through the real pairing server and real WebRTC data channels. Every file below was
opened and looked at. `round1/` is the first run, before fix round 1, and shows the two
faults it found (the TV showing "Seat N" for real players; every phone dropped by a
pairing-server outage).

| File (in `round2/`) | Viewport | What it shows |
|---|---|---|
| `c08-20-phone-entry.png` | 390×844 | Entry form on its panel, code filled from the link |
| `c08-21-host-eight-real-players.png` | 1920×1080 | Eight real players by name, in seat order and colour, all Good; a 12-character Chinese name on three lines |
| `c08-22-phone-lobby-leader.png` | 390×844 | Seat 1, "You're the leader", Connected with its icon |
| `c08-23-phone-lobby-long-name.png` | 390×844 | The longest name pushes the connection label to a second row |
| `c08-24-host-server-down-phones-stay.png` | 1920×1080 | 25 s after the pairing server alone was stopped: chip "Reconnecting", all eight seats still Good |
| `c08-25-phone-during-outage-after-rename.png`, `c08-26-host-outage-after-rename.png` | both | A rename made on a phone during the outage ("Arjun Two") reached the TV |
| `c08-27-phone-change-name.png` | 390×844 | Change name reuses the join form: heading "Join the room on the TV", an editable room code and a "Join" button (wording to fix) |

Measured in this run (desktop Chromium on the same machine, not phones): Join pressed to
"You're in" 464 to 484 ms for each of eight phones (PERF-021 allows 5 s from scan). In round 1:
a ninth phone was told the room is full; a phone reload returned to its seat; closing the host
page showed "Host disconnected" on the phone within 0.5 s and all eight phones rejoined their
seats when it returned (one background tab took about 10 s). Those round 1 flows were not
rerun after the fix round.

Not covered: real phones and a real TV (PERF-020, PERF-021 on devices), Safari and Firefox,
landscape, the on-screen keyboard, the demo states one by one, reduced motion.

## Round 3 evidence (2026-11-17, after fix round 2; supersedes round 2 where they overlap)

Same set-up as before: `KAKI_DEV_KEEP=1 pnpm dev`, one Chromium, host at 1920×1080, phones at
390×844 and one at 844×390, real pairing and real data channels. Every file was opened.

| File (in `round3/`) | Viewport | What it shows |
|---|---|---|
| `c08-30-landscape-entry.png` | 844×390 | Entry form in the board's sideways split; no scrolling |
| `c08-31-landscape-lobby.png` | 844×390 | Seat card left, message and actions right |
| `c08-33-rename-screen.png` | 390×844 | "Change your name": the name only, focused and pre-filled, "Save name" and "Cancel"; no room code |
| `c08-32-duplicate-name.png` | 390×844 | A second "Arjun" becomes "Arjun 2" with a notice. **Fault:** the notice text appears twice |
| `c08-34-ninth-room-full.png` | 390×844 | "This room is full" with one action and no empty badge |
| `c08-36-phone-lobby.png` | 390×844 | Seated phone. **Fault:** in the lobby it says "Watch the TV." where it should say it is waiting for the leader to pick a game |
| `c08-37-phone-host-disconnected.png`, `c08-38-landscape-host-disconnected.png` | both | Host page closed: warning triangle and underlined "Disconnected", "Host disconnected" |
| `c08-35-host-eight-players.png`, `c08-39-host-after-reopen.png` | 1920×1080 | Eight players by name; after the host page was closed and reopened all eight are back in their seats |
| `c08-40-host-outage-eight-connected.png` | 1920×1080 | 22 s after the pairing server alone was stopped: chip "Reconnecting", eight seats Good, and a rename made during the outage ("Wei Jie 99") on the TV |

Also seen in text, not photographed: Cancel on the rename screen returns to the lobby with the
name unchanged; Save changes it on the phone and the TV; a phone reload returns to seat 4.

Not covered: real phones and a real TV, Safari and Firefox, the on-screen keyboard, reduced
motion, the demo states one by one, a mid-game joiner (no game can start yet).

## Round 4: every phone state, after fix round 3 (2026-11-17)

`round4-states/c08-50-<state>.jpg`, 390×844, from `/play?demo=<state>` on the dev build (demo
data, no pairing server). All 22 were opened. The two faults from round 3 are fixed: the lobby
says "Waiting for the leader to pick a game." and the name-taken notice appears once. Seen and
left for the reviewer to judge: the seat-expired, waiting-for-lobby, cannot-connect and
out-of-date states still show the header and card for seat 3 (a phone in those states may have
no seat); "Can't reach the room. We'll keep trying." is set as a two-sentence heading with no
body line; the left state shows a "Disconnected" header above the join form.
The real-pairing flows of round 3 were not rerun after fix round 3 (a copy and CSS change).

## Round 5: rename while the host disconnects, and names under reduced motion (2026-11-17, after fix round 4)

`KAKI_DEV_KEEP=1 pnpm dev`, real pairing, host 1920×1080 with reduced motion on, two phones at
390×844. Files in `round5/`; all four were opened.

| File | What it shows |
|---|---|
| `c08-60-host-reduced-motion-two-joined.png` | With reduced motion on, both joined players show by name ("Mei Ling", "Arjun"), not "Seat N" |
| `c08-61-rename-then-host-disconnected.png` | The rename screen was open when the host page was closed: the phone left the rename screen and shows "Host disconnected" |
| `c08-62-back-in-lobby.png` | Host reopened: the phone is back in the lobby as seat 1, name unchanged |
| `c08-63-host-after-return.png` | The TV after reopening: both players in their seats |

Found during this run: the launcher now defaults to 127.0.0.1, and a host page opened at
`http://localhost:5150/host` is refused by the pairing server (403 on creating a room, shown as
"Cannot reach the pairing server"). The page works at `http://127.0.0.1:5150/host`. The launcher
prints the addresses, but Vite cleared the terminal. Fixed at merge: both loopback spellings are
allowed when the host is 127.0.0.1, and the terminal is no longer cleared.
The eight-phone flows of round 3 were not rerun after fix round 4.
