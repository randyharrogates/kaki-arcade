# C-14-unsupported-browser UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Visual review recorded below for all 22 stills (opened in contact sheets).

Command: `node tools/uat/run.mjs -- C-14-unsupported-browser --out x05-chromium`
Commit: `9e56fd4f5d4196e10d7e1fadbe62513cbcb4419d`
Provenance: re-run on clean tree `9e56fd4f` by the integrator, replacing the older run and its provenance. All 22 steps completed; run.json has `errors: []`. Development build only; the `productionChecks` selector edit has not been run under `--production`.

Viewports: 1280×720, 390×844, 320×568, 1920×1080

| Timing | ms | Status |
|---|---:|---|
| Unsupported demo landing-1280 | 685.1 | completed |
| Normal route landing-1280 | 169.9 | completed |
| Unsupported demo host-1280 | 133.4 | completed |
| Normal route host-1280 | 1250.4 | completed |
| Unsupported demo play-1280 | 134.0 | completed |
| Normal route play-1280 | 132.5 | completed |
| Unsupported demo landing-390 | 128.4 | completed |
| Normal route landing-390 | 130.7 | completed |
| Unsupported demo host-390 | 130.2 | completed |
| Normal route host-390 | 1063.5 | completed |
| Unsupported demo play-390 | 129.7 | completed |
| Normal route play-390 | 130.7 | completed |
| Unsupported demo landing-320 | 129.3 | completed |
| Normal route landing-320 | 129.3 | completed |
| Unsupported demo host-320 | 127.5 | completed |
| Normal route host-320 | 1061.5 | completed |
| Unsupported demo play-320 | 127.8 | completed |
| Normal route play-320 | 127.5 | completed |
| Delayed demo chunk keeps the static message hidden | 3543.8 | completed |
| Real missing WebSocket / | 162.2 | completed |
| Real missing WebSocket /host | 130.4 | completed |
| Real missing WebSocket /play | 128.6 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-unsupported-landing-1280.jpg](01-host-unsupported-landing-1280.jpg) | 1280px landing: unsupported-browser message, advice to use up-to-date Chrome, Edge or Safari on a computer; missing direct connections between devices and screen animations. Text wraps within the viewport. | Claude, integrator review, 2026-11-18 |
| ![02-host-normal-landing-1280.jpg](02-host-normal-landing-1280.jpg) | 1280px landing: Kaki Arcade, Host a game, game names, Put this on your TV, Privacy and Credits; no unsupported message. Illustration visible beside the copy. | Claude, integrator review, 2026-11-18 |
| ![03-host-unsupported-host-1280.jpg](03-host-unsupported-host-1280.jpg) | 1280px host: unsupported-browser message, advice to use up-to-date Chrome, Edge or Safari on a computer; missing direct connections between devices and screen animations. Text wraps within the viewport. | Claude, integrator review, 2026-11-18 |
| ![04-host-normal-host-1280.jpg](04-host-normal-host-1280.jpg) | 1280px host: full lobby with QR code, room code SHRG B7VW, 0 of 8 players and eight empty seats; no Loading… placeholder or unsupported message. | Claude, integrator review, 2026-11-18 |
| ![05-host-unsupported-play-1280.jpg](05-host-unsupported-play-1280.jpg) | 1280px play: unsupported-browser message, advice to use up-to-date Safari on iPhone or Chrome on Android; missing direct connections between devices and screen animations. Text wraps within the viewport. | Claude, integrator review, 2026-11-18 |
| ![06-host-normal-play-1280.jpg](06-host-normal-play-1280.jpg) | 1280px play: join card with Room code and Your name fields, helper text and Join button; no unsupported message. | Claude, integrator review, 2026-11-18 |
| ![07-host-unsupported-landing-390.jpg](07-host-unsupported-landing-390.jpg) | 390px landing: unsupported-browser message, advice to use up-to-date Chrome, Edge or Safari on a computer; missing direct connections between devices and screen animations. Text wraps within the viewport. | Claude, integrator review, 2026-11-18 |
| ![08-host-normal-landing-390.jpg](08-host-normal-landing-390.jpg) | 390px landing: Kaki Arcade, Host a game, game names, Put this on your TV, Privacy and Credits; no unsupported message. | Claude, integrator review, 2026-11-18 |
| ![09-host-unsupported-host-390.jpg](09-host-unsupported-host-390.jpg) | 390px host: unsupported-browser message, advice to use up-to-date Chrome, Edge or Safari on a computer; missing direct connections between devices and screen animations. Text wraps within the viewport. | Claude, integrator review, 2026-11-18 |
| ![10-host-normal-host-390.jpg](10-host-normal-host-390.jpg) | 390px host: full lobby with QR code, room code SHRG B7VW, 0 of 8 players and eight empty seats; no Loading… placeholder or unsupported message. Lobby is scaled down across the narrow viewport. | Claude, integrator review, 2026-11-18 |
| ![11-host-unsupported-play-390.jpg](11-host-unsupported-play-390.jpg) | 390px play: unsupported-browser message, advice to use up-to-date Safari on iPhone or Chrome on Android; missing direct connections between devices and screen animations. Text wraps within the viewport. | Claude, integrator review, 2026-11-18 |
| ![12-host-normal-play-390.jpg](12-host-normal-play-390.jpg) | 390px play: join card with Room code and Your name fields, helper text and Join button; no unsupported message. | Claude, integrator review, 2026-11-18 |
| ![13-host-unsupported-landing-320.jpg](13-host-unsupported-landing-320.jpg) | 320px landing: unsupported-browser message, advice to use up-to-date Chrome, Edge or Safari on a computer; missing direct connections between devices and screen animations. Text wraps within the viewport. | Claude, integrator review, 2026-11-18 |
| ![14-host-normal-landing-320.jpg](14-host-normal-landing-320.jpg) | 320px landing: Kaki Arcade, Host a game, game names, Put this on your TV, Privacy and Credits; no unsupported message. Title wraps onto two lines; footer reaches the bottom edge. | Claude, integrator review, 2026-11-18 |
| ![15-host-unsupported-host-320.jpg](15-host-unsupported-host-320.jpg) | 320px host: unsupported-browser message, advice to use up-to-date Chrome, Edge or Safari on a computer; missing direct connections between devices and screen animations. Text wraps within the viewport. | Claude, integrator review, 2026-11-18 |
| ![16-host-normal-host-320.jpg](16-host-normal-host-320.jpg) | 320px host: full lobby with QR code, room code SHRG B7VW, 0 of 8 players and eight empty seats; no Loading… placeholder or unsupported message. Lobby is scaled down across the narrow viewport. | Claude, integrator review, 2026-11-18 |
| ![17-host-unsupported-play-320.jpg](17-host-unsupported-play-320.jpg) | 320px play: unsupported-browser message, advice to use up-to-date Safari on iPhone or Chrome on Android; missing direct connections between devices and screen animations. Text wraps within the viewport. | Claude, integrator review, 2026-11-18 |
| ![18-host-normal-play-320.jpg](18-host-normal-play-320.jpg) | 320px play: join card with Room code and Your name fields, helper text and Join button; no unsupported message. | Claude, integrator review, 2026-11-18 |
| ![19-page-delayed-demo.jpg](19-page-delayed-demo.jpg) | Delayed demo: final unsupported message with computer-browser advice and missing direct connections between devices and screen animations. This still shows the final state; the delay assertion is in run.json. | Claude, integrator review, 2026-11-18 |
| ![20-page-real-missing-websocket-landing.jpg](20-page-real-missing-websocket-landing.jpg) | Real missing WebSocket on /: unsupported message with computer-browser advice and “Missing: live connections”. | Claude, integrator review, 2026-11-18 |
| ![21-page-real-missing-websocket-host.jpg](21-page-real-missing-websocket-host.jpg) | Real missing WebSocket on /host: unsupported message with computer-browser advice and “Missing: live connections”. | Claude, integrator review, 2026-11-18 |
| ![22-page-real-missing-websocket-play.jpg](22-page-real-missing-websocket-play.jpg) | Real missing WebSocket on /play: unsupported message with phone-browser advice and “Missing: live connections”. | Claude, integrator review, 2026-11-18 |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| REL-006: simulated missing features show readable route-appropriate guidance at all three widths | Pass (development build) | 01, 03, 05, 07, 09, 11, 13, 15, 17 |
| Supported routes render without the unsupported message; host waits for the lobby | Pass (development build) | 02, 04, 06, 08, 10, 12, 14, 16, 18 |
| Delayed demo reaches its final message; real missing WebSocket reports live connections | Pass (development build) | 19–22; run.json delay assertion and errors: [] |
| REL-006 overall coverage | In progress | Firefox, real old browsers and WebKit production remain untested; productionChecks selector edit not run under --production |
