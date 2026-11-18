# X-01-landing UAT evidence

Round 1 automated execution passed. Visual review: Claude reviewer, 2026-11-18 (X-01 review 1). Superseded by round2/.

Command: `node tools/uat/run.mjs -- X-01-landing --out round1`
Commit: `9fd54a6260fa11d47cdfdc4ceeb5ec18422715a0`
Viewports: 1920×1080, 1280×720, 390×844

| Timing | ms | Status |
|---|---:|---|
| Landing and keyboard at 1920 × 1080 | 1177.6 | completed |
| Landing and keyboard at 1280 × 720 | 719.5 | completed |
| Landing and keyboard at 390 × 844 | 652.6 | completed |
| Enter on Host a game opens the room screen | 1291.9 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-landing-1920-host.jpg](01-host-landing-1920-host.jpg) | Landing on load. Ring on Host a game; one primary panel button; Put this on your TV is a secondary text link; no horizontal scroll. | Claude reviewer, 2026-11-18 |
| ![02-host-landing-1920-ArrowDown-1.jpg](02-host-landing-1920-ArrowDown-1.jpg) | Ring on Put this on your TV after ArrowDown. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![03-host-landing-1920-ArrowDown-2.jpg](03-host-landing-1920-ArrowDown-2.jpg) | Ring on Privacy after ArrowDown. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![04-host-landing-1920-ArrowDown-3.jpg](04-host-landing-1920-ArrowDown-3.jpg) | Ring on Credits after ArrowDown. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![05-host-landing-1920-ArrowRight-1.jpg](05-host-landing-1920-ArrowRight-1.jpg) | Ring on Put this on your TV after ArrowRight. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![06-host-landing-1920-ArrowRight-2.jpg](06-host-landing-1920-ArrowRight-2.jpg) | Ring on Privacy after ArrowRight. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![07-host-landing-1920-ArrowRight-3.jpg](07-host-landing-1920-ArrowRight-3.jpg) | Ring on Credits after ArrowRight. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![08-host-landing-1280-host.jpg](08-host-landing-1280-host.jpg) | Landing on load. Ring on Host a game; one primary panel button; Put this on your TV is a secondary text link; no horizontal scroll. | Claude reviewer, 2026-11-18 |
| ![09-host-landing-1280-ArrowDown-1.jpg](09-host-landing-1280-ArrowDown-1.jpg) | Ring on Put this on your TV after ArrowDown. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![10-host-landing-1280-ArrowDown-2.jpg](10-host-landing-1280-ArrowDown-2.jpg) | Ring on Privacy after ArrowDown. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![11-host-landing-1280-ArrowDown-3.jpg](11-host-landing-1280-ArrowDown-3.jpg) | Ring on Credits after ArrowDown. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![12-host-landing-1280-ArrowRight-1.jpg](12-host-landing-1280-ArrowRight-1.jpg) | Ring on Put this on your TV after ArrowRight. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![13-host-landing-1280-ArrowRight-2.jpg](13-host-landing-1280-ArrowRight-2.jpg) | Ring on Privacy after ArrowRight. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![14-host-landing-1280-ArrowRight-3.jpg](14-host-landing-1280-ArrowRight-3.jpg) | Ring on Credits after ArrowRight. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![15-host-landing-390-host.jpg](15-host-landing-390-host.jpg) | Landing on load. Ring on Host a game; one primary panel button; Put this on your TV is a secondary text link; no horizontal scroll. | Claude reviewer, 2026-11-18 |
| ![16-host-landing-390-ArrowDown-1.jpg](16-host-landing-390-ArrowDown-1.jpg) | Ring on Put this on your TV after ArrowDown. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![17-host-landing-390-ArrowDown-2.jpg](17-host-landing-390-ArrowDown-2.jpg) | Ring on Privacy after ArrowDown. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![18-host-landing-390-ArrowDown-3.jpg](18-host-landing-390-ArrowDown-3.jpg) | Ring on Credits after ArrowDown. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![19-host-landing-390-ArrowRight-1.jpg](19-host-landing-390-ArrowRight-1.jpg) | Ring on Put this on your TV after ArrowRight. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![20-host-landing-390-ArrowRight-2.jpg](20-host-landing-390-ArrowRight-2.jpg) | Ring on Privacy after ArrowRight. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![21-host-landing-390-ArrowRight-3.jpg](21-host-landing-390-ArrowRight-3.jpg) | Ring on Credits after ArrowRight. Down and Right sets are identical. | Claude reviewer, 2026-11-18 |
| ![22-host-host-room-after-enter.jpg](22-host-host-room-after-enter.jpg) | Lobby (room code M6TJ 5ZQP) after Enter on the focused Host a game. | Claude reviewer, 2026-11-18 |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Landing has one primary action, secondary TV link and no horizontal scroll at all three widths | Pass | 01, 08, 15 |
| Down and Right reach the links in reading order with visible focus | Pass | 02–07, 09–14, 16–21 |
| Enter on Host a game opens the lobby | Pass | 22 |
