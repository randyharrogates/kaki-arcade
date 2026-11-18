# T-07-tv-renderer UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- T-07-tv-renderer --phones 1 --max-mb 40 --timeout-min 20 --out round6`
Commit: `7bfb90531e32aba3e8d8c26fd798d664b1c123c5`
Viewports: 1920×1080, 1280×720, 1080×1080

| Timing | ms | Status |
|---|---:|---|
| 1 cooks at 1920 | 3698.7 | completed |
| 1 cooks at 1280 | 2747.3 | completed |
| 8 cooks at 1920 | 2637.6 | completed |
| 8 cooks at 1280 | 2515.9 | completed |
| Six cards in one row and last-quarter warning triangle | 797.5 | completed |
| Burning station label | 809.7 | completed |
| Mid-clip actions at their stations | 8806.3 | completed |
| Normal entrance at pinned render times | 3322.2 | completed |
| Normal serve at pinned render times | 3179.9 | completed |
| Normal done at pinned render times | 2742.8 | completed |
| Normal exit at pinned render times | 2614.6 | completed |
| Reduced entrance at pinned render times | 2498.9 | completed |
| Reduced serve at pinned render times | 2495.1 | completed |
| Reduced done at pinned render times | 2325.9 | completed |
| Reduced exit at pinned render times | 2492.2 | completed |
| Throw landing and cook walk | 7285.5 | completed |
| Registry to production MountedScreen readiness without a phone | 2254.3 | completed |
| Letterbox portrait window | 1042.4 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-1-cooks-1920-showcase.jpg](01-host-1-cooks-1920-showcase.jpg) | | |
| ![02-host-1-cooks-1280-showcase.jpg](02-host-1-cooks-1280-showcase.jpg) | | |
| ![03-host-8-cooks-1920-showcase.jpg](03-host-8-cooks-1920-showcase.jpg) | | |
| ![04-host-8-cooks-1280-showcase.jpg](04-host-8-cooks-1280-showcase.jpg) | | |
| ![05-host-six-card-row-last-quarter-triangle.jpg](05-host-six-card-row-last-quarter-triangle.jpg) | | |
| ![06-host-burning-label.jpg](06-host-burning-label.jpg) | | |
| ![07-host-action-idle.jpg](07-host-action-idle.jpg) | | |
| ![08-host-action-walk.jpg](08-host-action-walk.jpg) | | |
| ![09-host-action-carry-walk.jpg](09-host-action-carry-walk.jpg) | | |
| ![10-host-action-chop.jpg](10-host-action-chop.jpg) | | |
| ![11-host-action-stir.jpg](11-host-action-stir.jpg) | | |
| ![12-host-action-wash.jpg](12-host-action-wash.jpg) | | |
| ![13-host-action-serve.jpg](13-host-action-serve.jpg) | | |
| ![14-host-action-throw.jpg](14-host-action-throw.jpg) | | |
| ![15-host-action-extinguish.jpg](15-host-action-extinguish.jpg) | | |
| ![16-host-action-rejection.jpg](16-host-action-rejection.jpg) | | |
| ![83-host-production-mounted-ready.jpg](83-host-production-mounted-ready.jpg) | | |
| ![84-host-letterboxed.jpg](84-host-letterboxed.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![22-strip-entrance.jpg](22-strip-entrance.jpg) | | |
| ![28-strip-serve.jpg](28-strip-serve.jpg) | | |
| ![34-strip-done.jpg](34-strip-done.jpg) | | |
| ![40-strip-exit.jpg](40-strip-exit.jpg) | | |
| ![46-strip-reduced-entrance.jpg](46-strip-reduced-entrance.jpg) | | |
| ![52-strip-reduced-serve.jpg](52-strip-reduced-serve.jpg) | | |
| ![58-strip-reduced-done.jpg](58-strip-reduced-done.jpg) | | |
| ![64-strip-reduced-exit.jpg](64-strip-reduced-exit.jpg) | | |
| ![73-strip-throw.jpg](73-strip-throw.jpg) | | |
| ![82-strip-walk.jpg](82-strip-walk.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
