# Kaki Arcade — UAT

How step 3 of the loop (`WORKFLOW.md`) is carried out. UAT proves a requirement from the
player's side: what is on the TV and what is on the phone.

## 1. Setup

- **Tool:** Playwright (Chromium for the loop; WebKit and Firefox added for release checks).
- **Devices in one run:** one **host** browser context at 1920 × 1080, plus 1 to 8 **phone**
  contexts with mobile emulation in landscape (default 844 × 390, touch enabled).
- **Real pairing:** phone contexts join through the real join link and a locally running
  pairing server (`wrangler dev`), using real WebRTC between contexts. No mocked transport in
  UAT.
- **Scripted thumbs:** a helper drives the controller with real pointer events (press, hold,
  drag the stick along a path, multi-touch), so the kit itself is under test.
- **Deterministic games:** UAT starts games with a fixed seed so screenshots are comparable
  between runs.
- **Local stack by hand:** `pnpm dev` starts the web app and the local pairing server and
  prints the Host, Phone and Pairing addresses. For phones on the same network run
  `KAKI_HOST=<laptop LAN IP> pnpm dev`; `KAKI_HOST` must be an IP literal (hostnames are
  refused), and with `0.0.0.0` the advertised address may be a VPN or Docker interface, so
  pass the LAN IP. Ports: `KAKI_PORT_WEB`, `KAKI_PORT_SIGNAL`. To test a pairing-server
  outage run `KAKI_DEV_KEEP=1 pnpm dev` and stop the printed Pairing process group with
  `/bin/kill -TERM -- -<PID>`; the web app stays up. Plain HTTP on a LAN does not prove
  secure-context features such as wake lock.

## 2. Evidence

Saved under `uat/evidence/NNN-slice-name/`:

| File | Content |
|---|---|
| `01-host-<step>.png`, `01-phone1-<step>.png`, … | Step-numbered screenshots of the big screen and phones |
| `strip-<name>.png` | Frame strips for anything animated: 6 to 12 frames side by side |
| `perf.json` | Frame-time and input-delay percentiles for the run |
| `REPORT.md` | Each acceptance statement → pass/fail → the screenshot that shows it |

Evidence is committed. It is the record that a requirement was seen working.

## 3. Looking is mandatory

A green Playwright run only proves the script did not throw. For every slice:

1. Claude opens each screenshot and frame strip.
2. Claude checks it against the acceptance statements **and** the checklist in `DESIGN.md` §6.
3. Dense areas are cropped and enlarged before judging: HUD text, order cards, controller
   labels.
4. Anything wrong in a picture is a failure even when every assertion passed.

## 4. What every UAT script covers

- The happy path of the slice's requirements.
- At least one awkward path: a phone that reloads mid-step, a ninth joiner, a timer expiring
  with no input, two players doing the same thing at once.
- The same step at 1 player and at 8 players where player count changes layout.
- Reduced motion on, for any slice that adds motion.

## 5. Real-device checks (milestones)

Emulation cannot prove touch feel, sensors or the TV. At the end of each milestone Randy and
Claude run the checklist below on real hardware and record results in `STATUS.md`.

- [ ] iPhone (Safari): join by QR, controller fills the screen, no scroll or zoom, screen stays awake.
- [ ] Android phone (Chrome): same, plus vibration feedback.
- [ ] Stick and two buttons held together respond on both phones.
- [ ] Motion permission prompt and the button fallback (iPhone).
- [ ] Laptop on HDMI to the TV in Game Mode: 8 phones joined, a full round, no visible lag.
- [ ] TCL Q65 browser: lobby loads, benchmark chooses a detail mode, PERF-002 numbers recorded.
- [ ] Phone on mobile data: joins through the relay and is marked as relayed.
- [ ] Host reload mid-session: phones recover (PLAT-009).

## 6. Requirement coverage

Each UAT spec file names the requirement IDs it proves in its header. `tools/trace_check.py`
reads those headers, so a `done` row in `TRACEABILITY.md` without a spec naming its ID fails
verify.
