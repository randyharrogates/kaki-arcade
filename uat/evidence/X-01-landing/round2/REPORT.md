# X-01-landing UAT evidence

Automated execution passed. Visual review: Claude reviewer, 2026-11-18 (X-01 review 2).

Command: `node tools/uat/run.mjs -- X-01-landing --out round2`
Commit: `a6252d0230a52f0d364073375d8464b9b0018fd5`
Viewports: 1920×1080, 1280×720, 390×844

| Timing | ms | Status |
|---|---:|---|
| Landing and keyboard at 1920 × 1080 | 1504.6 | completed |
| Landing and keyboard at 1280 × 720 | 670.5 | completed |
| Landing and keyboard at 390 × 844 | 667.4 | completed |
| Enter on Host a game opens the room screen | 1286.7 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-landing-1920-host.jpg](01-host-landing-1920-host.jpg) | The landing on load at 1920. The ring is on Host a game; one primary panel button; Put this on your TV is a secondary text link; no horizontal scroll. | Claude reviewer, 2026-11-18 |
| ![02-host-landing-1920-host-after-lost-focus.jpg](02-host-landing-1920-host-after-lost-focus.jpg) | At 1920, after a click on the picture left the page body focused, ArrowDown brought the ring back to Host a game. | Claude reviewer, 2026-11-18 |
| ![03-host-landing-1920-ArrowDown-1.jpg](03-host-landing-1920-ArrowDown-1.jpg) | At 1920, after ArrowDown 1: the ring is on Put this on your TV. | Claude reviewer, 2026-11-18 |
| ![04-host-landing-1920-ArrowDown-2.jpg](04-host-landing-1920-ArrowDown-2.jpg) | At 1920, after ArrowDown 2: the ring is on Privacy. | Claude reviewer, 2026-11-18 |
| ![05-host-landing-1920-ArrowDown-3.jpg](05-host-landing-1920-ArrowDown-3.jpg) | At 1920, after ArrowDown 3: the ring is on Credits. | Claude reviewer, 2026-11-18 |
| ![06-host-landing-1920-ArrowRight-1.jpg](06-host-landing-1920-ArrowRight-1.jpg) | At 1920, after ArrowRight 1: the ring is on Put this on your TV. | Claude reviewer, 2026-11-18 |
| ![07-host-landing-1920-ArrowRight-2.jpg](07-host-landing-1920-ArrowRight-2.jpg) | At 1920, after ArrowRight 2: the ring is on Privacy. | Claude reviewer, 2026-11-18 |
| ![08-host-landing-1920-ArrowRight-3.jpg](08-host-landing-1920-ArrowRight-3.jpg) | At 1920, after ArrowRight 3: the ring is on Credits. | Claude reviewer, 2026-11-18 |
| ![09-host-landing-1280-host.jpg](09-host-landing-1280-host.jpg) | The landing on load at 1280. The ring is on Host a game; one primary panel button; Put this on your TV is a secondary text link; no horizontal scroll. | Claude reviewer, 2026-11-18 |
| ![10-host-landing-1280-ArrowDown-1.jpg](10-host-landing-1280-ArrowDown-1.jpg) | At 1280, after ArrowDown 1: the ring is on Put this on your TV. | Claude reviewer, 2026-11-18 |
| ![11-host-landing-1280-ArrowDown-2.jpg](11-host-landing-1280-ArrowDown-2.jpg) | At 1280, after ArrowDown 2: the ring is on Privacy. | Claude reviewer, 2026-11-18 |
| ![12-host-landing-1280-ArrowDown-3.jpg](12-host-landing-1280-ArrowDown-3.jpg) | At 1280, after ArrowDown 3: the ring is on Credits. | Claude reviewer, 2026-11-18 |
| ![13-host-landing-1280-ArrowRight-1.jpg](13-host-landing-1280-ArrowRight-1.jpg) | At 1280, after ArrowRight 1: the ring is on Put this on your TV. | Claude reviewer, 2026-11-18 |
| ![14-host-landing-1280-ArrowRight-2.jpg](14-host-landing-1280-ArrowRight-2.jpg) | At 1280, after ArrowRight 2: the ring is on Privacy. | Claude reviewer, 2026-11-18 |
| ![15-host-landing-1280-ArrowRight-3.jpg](15-host-landing-1280-ArrowRight-3.jpg) | At 1280, after ArrowRight 3: the ring is on Credits. | Claude reviewer, 2026-11-18 |
| ![16-host-landing-390-host.jpg](16-host-landing-390-host.jpg) | The landing on load at 390. No ring (no mount focus on the phone layout); ArrowDown then focuses Host a game. | Claude reviewer, 2026-11-18 |
| ![17-host-landing-390-ArrowDown-1.jpg](17-host-landing-390-ArrowDown-1.jpg) | At 390, after ArrowDown 1: the ring is on Put this on your TV. | Claude reviewer, 2026-11-18 |
| ![18-host-landing-390-ArrowDown-2.jpg](18-host-landing-390-ArrowDown-2.jpg) | At 390, after ArrowDown 2: the ring is on Privacy. | Claude reviewer, 2026-11-18 |
| ![19-host-landing-390-ArrowDown-3.jpg](19-host-landing-390-ArrowDown-3.jpg) | At 390, after ArrowDown 3: the ring is on Credits. | Claude reviewer, 2026-11-18 |
| ![20-host-landing-390-ArrowRight-1.jpg](20-host-landing-390-ArrowRight-1.jpg) | At 390, after ArrowRight 1: the ring is on Put this on your TV. | Claude reviewer, 2026-11-18 |
| ![21-host-landing-390-ArrowRight-2.jpg](21-host-landing-390-ArrowRight-2.jpg) | At 390, after ArrowRight 2: the ring is on Privacy. | Claude reviewer, 2026-11-18 |
| ![22-host-landing-390-ArrowRight-3.jpg](22-host-landing-390-ArrowRight-3.jpg) | At 390, after ArrowRight 3: the ring is on Credits. | Claude reviewer, 2026-11-18 |
| ![23-host-host-room-after-enter.jpg](23-host-host-room-after-enter.jpg) | The lobby (room code R83R SGC7) after Enter on the focused Host a game. | Claude reviewer, 2026-11-18 |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| One primary action, a secondary TV link, no horizontal scroll at all three widths | Pass | 01, 09, 16 |
| Focus lost at 1920: an arrow returns it to Host a game | Pass | 02 |
| Down and Right reach the links in reading order with visible focus | Pass | 03–08, 10–15, 17–22 |
| No focus on load at phone width | Pass | 16 |
| Enter on Host a game opens the lobby | Pass | 23 |
