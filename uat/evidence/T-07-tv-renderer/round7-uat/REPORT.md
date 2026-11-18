# T-07-tv-renderer UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- T-07-tv-renderer --out round7-uat --max-mb 40 --timeout-min 20`
Commit: `5b2c353af946de5c6a286ce92fa3ab4587bf9bd3`
Viewports: 1920×1080, 1280×720, 1080×1080

| Timing | ms | Status |
|---|---:|---|
| 1 cooks at 1920 | 1981.6 | completed |
| 1 cooks at 1280 | 1305.4 | completed |
| 8 cooks at 1920 | 1349.9 | completed |
| 8 cooks at 1280 | 1366.7 | completed |
| Six cards in one row and last-quarter warning triangle | 434.0 | completed |
| HUD drawn width and Rack column | 847.3 | completed |
| Burning station label | 320.3 | completed |
| Mid-clip actions at their stations | 4126.8 | completed |
| Normal entrance at pinned render times | 1464.1 | completed |
| Normal serve at pinned render times | 2149.0 | completed |
| Normal done at pinned render times | 1987.5 | completed |
| Normal exit at pinned render times | 2037.7 | completed |
| Reduced entrance at pinned render times | 1969.2 | completed |
| Reduced serve at pinned render times | 2039.7 | completed |
| Reduced done at pinned render times | 1839.8 | completed |
| Reduced exit at pinned render times | 1982.6 | completed |
| Throw landing and cook walk | 6173.9 | completed |
| Registry to production MountedScreen readiness without a phone | 1893.9 | completed |
| Letterbox portrait window | 630.0 | completed |

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
| ![06-host-hud-score-width.jpg](06-host-hud-score-width.jpg) | | |
| ![07-host-rack-column.jpg](07-host-rack-column.jpg) | | |
| ![08-host-burning-label.jpg](08-host-burning-label.jpg) | | |
| ![09-host-action-idle.jpg](09-host-action-idle.jpg) | | |
| ![10-host-action-walk.jpg](10-host-action-walk.jpg) | | |
| ![11-host-action-carry-walk.jpg](11-host-action-carry-walk.jpg) | | |
| ![12-host-action-chop.jpg](12-host-action-chop.jpg) | | |
| ![13-host-action-stir.jpg](13-host-action-stir.jpg) | | |
| ![14-host-action-wash.jpg](14-host-action-wash.jpg) | | |
| ![15-host-action-serve.jpg](15-host-action-serve.jpg) | | |
| ![16-host-action-throw.jpg](16-host-action-throw.jpg) | | |
| ![17-host-action-extinguish.jpg](17-host-action-extinguish.jpg) | | |
| ![18-host-action-rejection.jpg](18-host-action-rejection.jpg) | | |
| ![85-host-production-mounted-ready.jpg](85-host-production-mounted-ready.jpg) | | |
| ![86-host-letterboxed.jpg](86-host-letterboxed.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![24-strip-entrance.jpg](24-strip-entrance.jpg) | | |
| ![30-strip-serve.jpg](30-strip-serve.jpg) | | |
| ![36-strip-done.jpg](36-strip-done.jpg) | | |
| ![42-strip-exit.jpg](42-strip-exit.jpg) | | |
| ![48-strip-reduced-entrance.jpg](48-strip-reduced-entrance.jpg) | | |
| ![54-strip-reduced-serve.jpg](54-strip-reduced-serve.jpg) | | |
| ![60-strip-reduced-done.jpg](60-strip-reduced-done.jpg) | | |
| ![66-strip-reduced-exit.jpg](66-strip-reduced-exit.jpg) | | |
| ![75-strip-throw.jpg](75-strip-throw.jpg) | | |
| ![84-strip-walk.jpg](84-strip-walk.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
