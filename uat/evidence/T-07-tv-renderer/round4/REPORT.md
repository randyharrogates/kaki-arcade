# T-07-tv-renderer UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- T-07-tv-renderer --phones 1 --max-mb 30 --out round4`
Commit: `4c447d1c9218c9ee8854b276f36a64f0ff15669f`
Viewports: 1920×1080, 1280×720, 1080×1080

| Timing | ms | Status |
|---|---:|---|
| 1 cooks at 1920 | 4869.7 | completed |
| 1 cooks at 1280 | 3242.1 | completed |
| 8 cooks at 1920 | 3255.6 | completed |
| 8 cooks at 1280 | 3265.8 | completed |
| Burning station label | 870.5 | completed |
| Mid-clip actions at their stations | 9135.3 | completed |
| entrance through completion | 4703.1 | completed |
| serve through completion | 5335.9 | completed |
| done through completion | 5390.7 | completed |
| throw through completion | 4434.1 | completed |
| walk through completion | 4604.2 | completed |
| Reduced motion entrance and confirmation pulses | 6705.5 | completed |
| Registry to production MountedScreen readiness without a phone | 3053.9 | completed |
| Letterbox portrait window | 1118.0 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-1-cooks-1920-showcase.jpg](01-host-1-cooks-1920-showcase.jpg) | | |
| ![02-host-1-cooks-1280-showcase.jpg](02-host-1-cooks-1280-showcase.jpg) | | |
| ![03-host-8-cooks-1920-showcase.jpg](03-host-8-cooks-1920-showcase.jpg) | | |
| ![04-host-8-cooks-1280-showcase.jpg](04-host-8-cooks-1280-showcase.jpg) | | |
| ![05-host-burning-label.jpg](05-host-burning-label.jpg) | | |
| ![06-host-action-idle.jpg](06-host-action-idle.jpg) | | |
| ![07-host-action-walk.jpg](07-host-action-walk.jpg) | | |
| ![08-host-action-carry-walk.jpg](08-host-action-carry-walk.jpg) | | |
| ![09-host-action-chop.jpg](09-host-action-chop.jpg) | | |
| ![10-host-action-stir.jpg](10-host-action-stir.jpg) | | |
| ![11-host-action-wash.jpg](11-host-action-wash.jpg) | | |
| ![12-host-action-serve.jpg](12-host-action-serve.jpg) | | |
| ![13-host-action-throw.jpg](13-host-action-throw.jpg) | | |
| ![14-host-action-extinguish.jpg](14-host-action-extinguish.jpg) | | |
| ![15-host-action-rejection.jpg](15-host-action-rejection.jpg) | | |
| ![76-host-production-mounted-ready.jpg](76-host-production-mounted-ready.jpg) | | |
| ![77-host-letterboxed.jpg](77-host-letterboxed.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![24-strip-entrance.jpg](24-strip-entrance.jpg) | | |
| ![33-strip-serve.jpg](33-strip-serve.jpg) | | |
| ![42-strip-done.jpg](42-strip-done.jpg) | | |
| ![51-strip-throw.jpg](51-strip-throw.jpg) | | |
| ![60-strip-walk.jpg](60-strip-walk.jpg) | | |
| ![65-strip-reduced-entrance.jpg](65-strip-reduced-entrance.jpg) | | |
| ![70-strip-reduced-serve.jpg](70-strip-reduced-serve.jpg) | | |
| ![75-strip-reduced-done.jpg](75-strip-reduced-done.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
