# T-07-tv-renderer UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- T-07-tv-renderer --phones 1 --max-mb 40 --timeout-min 20 --out round5`
Commit: `8292b5e37b601673739467dc49452ae674084428`
Viewports: 1920×1080, 1280×720, 1080×1080

| Timing | ms | Status |
|---|---:|---|
| 1 cooks at 1920 | 2834.3 | completed |
| 1 cooks at 1280 | 1868.7 | completed |
| 8 cooks at 1920 | 2506.4 | completed |
| 8 cooks at 1280 | 1839.0 | completed |
| Burning station label | 576.1 | completed |
| Mid-clip actions at their stations | 7944.7 | completed |
| Normal entrance at pinned render times | 2926.6 | completed |
| Normal serve at pinned render times | 2905.7 | completed |
| Normal done at pinned render times | 3419.8 | completed |
| Normal exit at pinned render times | 3819.9 | completed |
| Reduced entrance at pinned render times | 3873.7 | completed |
| Reduced serve at pinned render times | 4055.1 | completed |
| Reduced done at pinned render times | 4496.5 | completed |
| Reduced exit at pinned render times | 4445.6 | completed |
| Throw landing and cook walk | 12290.4 | completed |
| Registry to production MountedScreen readiness without a phone | 3524.1 | completed |
| Letterbox portrait window | 1372.7 | completed |

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
| ![82-host-production-mounted-ready.jpg](82-host-production-mounted-ready.jpg) | | |
| ![83-host-letterboxed.jpg](83-host-letterboxed.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![21-strip-entrance.jpg](21-strip-entrance.jpg) | | |
| ![27-strip-serve.jpg](27-strip-serve.jpg) | | |
| ![33-strip-done.jpg](33-strip-done.jpg) | | |
| ![39-strip-exit.jpg](39-strip-exit.jpg) | | |
| ![45-strip-reduced-entrance.jpg](45-strip-reduced-entrance.jpg) | | |
| ![51-strip-reduced-serve.jpg](51-strip-reduced-serve.jpg) | | |
| ![57-strip-reduced-done.jpg](57-strip-reduced-done.jpg) | | |
| ![63-strip-reduced-exit.jpg](63-strip-reduced-exit.jpg) | | |
| ![72-strip-throw.jpg](72-strip-throw.jpg) | | |
| ![81-strip-walk.jpg](81-strip-walk.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
